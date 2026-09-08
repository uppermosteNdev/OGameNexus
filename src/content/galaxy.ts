import { SpiedPlanet } from '../db';
import { DiscoveredDebrisField } from './assistant/types';
import { debouncedRefreshAssistantBar } from './assistant/assistantBar';

function isContextValid(): boolean {
  try {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

function getOwnCoordinatesList(): string[] {
  const coords: string[] = [];
  const coordsNodes = document.querySelectorAll("#planetList .planet-koords");
  coordsNodes.forEach(node => {
    const text = node.textContent?.trim() || "";
    const clean = text.replace(/[\[\]]/g, "");
    if (clean && clean !== "0:0:0" && !coords.includes(clean)) {
      coords.push(clean);
    }
  });
  return coords;
}

function getOwnSystemsInGalaxy(galaxy: number): number[] {
  const ownCoords = getOwnCoordinatesList();
  const systems: number[] = [];
  ownCoords.forEach(coords => {
    const parts = coords.split(':').map(Number);
    if (parts.length === 3 && parts[0] === galaxy) {
      if (!systems.includes(parts[1])) {
        systems.push(parts[1]);
      }
    }
  });
  return systems;
}

function getFlyingEspionageCoords(): string[] {
  const coords: string[] = [];
  const eventContent = document.getElementById('eventContent');
  if (!eventContent) return coords;

  const rows = eventContent.querySelectorAll('tr.eventFleet[data-mission-type="6"]');
  const ownCoords = getOwnCoordinatesList();

  rows.forEach(row => {
    // Only check if it's our own fleet
    const missionFleetImg = row.querySelector('td.missionFleet img');
    if (missionFleetImg) {
      const tooltipTitle = missionFleetImg.getAttribute('data-tooltip-title') || '';
      const isOwn = /Own fleet|Eigene Flotte|Flotte personnelle|Flota propia|Flotta propria|Własna flota|Frota própria|Kendi filon|Kendi Filom|Собственный флот|Eigen vloot|Saját flotta|Vlastní flotila|Vlastná flotila|Egen flåde|Egen flotta|Oma laivasto|Vlastita flota|Flota proprie/i.test(tooltipTitle);
      if (!isOwn) return;
    }

    const text = row.textContent || "";
    const matches = text.match(/\d+:\d+:\d+/g);
    if (matches) {
      matches.forEach(match => {
        if (!ownCoords.includes(match) && !coords.includes(match)) {
          coords.push(match);
        }
      });
    }
  });
  return coords;
}

function getRecentlySpied(): Record<string, number> {
  try {
    const data = localStorage.getItem('og-nexus-recently-spied');
    if (!data) return {};
    const parsed = JSON.parse(data);
    const now = Date.now();
    const clean: Record<string, number> = {};
    for (const [coords, ts] of Object.entries(parsed)) {
      if (typeof ts === 'number' && now - ts < 15 * 60 * 1000) {
        clean[coords] = ts;
      }
    }
    return clean;
  } catch (e) {
    return {};
  }
}

function markAsRecentlySpied(coords: string) {
  const spied = getRecentlySpied();
  spied[coords] = Date.now();
  try {
    localStorage.setItem('og-nexus-recently-spied', JSON.stringify(spied));
  } catch (e) {}
  
  // Refresh sidebar if it is currently open
  const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
  if (sidebar && sidebar.classList.contains('open')) {
    updateSidebarData();
  }
}


function getEspionageStatus(coords: string, flyingCoords: string[], recentlySpied: Record<string, number>): { text: string; className: string; tooltip: string } {
  if (flyingCoords.includes(coords) || recentlySpied[coords]) {
    let tooltipText = 'Spied in the last 15 minutes';
    if (flyingCoords.includes(coords)) {
      tooltipText = 'Espionage fleet in transit';
    } else {
      const elapsedMs = Date.now() - recentlySpied[coords];
      const minutesAgo = Math.floor(elapsedMs / 60000);
      tooltipText = `Spied ${minutesAgo}m ago`;
    }
    return {
      text: '✓',
      className: 'spy-status-spied',
      tooltip: tooltipText
    };
  }

  return {
    text: '',
    className: '',
    tooltip: ''
  };
}


// Configurable Galaxy highlight intervals (MSU/h) with defaults
let galaxyIntervals = {
  t0: 10000,
  t1: 250000,
  t2: 500000,
  t3: 1000000
};

const formatCompactInterval = (num: number): string => {
  if (num >= 1000000) {
    const val = num / 1000000;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + 'M';
  }
  if (num >= 1000) {
    const val = num / 1000;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + 'k';
  }
  return Math.floor(num).toString();
};

const formatCompactIntervalText = (num: number): string => {
  return formatCompactInterval(num);
};

const onStorageChanged = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
  if (areaName === 'local' && changes.galaxyIntervals) {
    galaxyIntervals = { ...galaxyIntervals, ...changes.galaxyIntervals.newValue };
    updateSummaryBarLabels();
    applyGalaxyRings();
  }
};

function updateSummaryBarLabels() {
  const bar = document.getElementById('og-nexus-galaxy-summary-bar');
  if (!bar) return;

  const dotGroups = bar.querySelectorAll('.og-nexus-galaxy-summary-dot-group');
  if (dotGroups.length === 5) {
    dotGroups[0].setAttribute('title', `> ${formatCompactInterval(galaxyIntervals.t3)} MSU/h`);
    dotGroups[1].setAttribute('title', `> ${formatCompactInterval(galaxyIntervals.t2)} MSU/h`);
    dotGroups[2].setAttribute('title', `> ${formatCompactInterval(galaxyIntervals.t1)} MSU/h`);
    dotGroups[3].setAttribute('title', `${formatCompactInterval(galaxyIntervals.t0)} - ${formatCompactInterval(galaxyIntervals.t1)} MSU/h`);
    dotGroups[4].setAttribute('title', `< ${formatCompactInterval(galaxyIntervals.t0)} MSU/h (or unspied)`);
  }

  const lblG4 = document.getElementById('og-nexus-lbl-g4');
  const lblG3 = document.getElementById('og-nexus-lbl-g3');
  const lblG2 = document.getElementById('og-nexus-lbl-g2');
  const lblG1 = document.getElementById('og-nexus-lbl-g1');
  const lblG0 = document.getElementById('og-nexus-lbl-g0');
  if (lblG4) lblG4.textContent = `> ${formatCompactIntervalText(galaxyIntervals.t3)} MSU/h`;
  if (lblG3) lblG3.textContent = `> ${formatCompactIntervalText(galaxyIntervals.t2)} MSU/h`;
  if (lblG2) lblG2.textContent = `> ${formatCompactIntervalText(galaxyIntervals.t1)} MSU/h`;
  if (lblG1) lblG1.textContent = `${formatCompactIntervalText(galaxyIntervals.t0)} - ${formatCompactIntervalText(galaxyIntervals.t1)} MSU/h`;
  if (lblG0) lblG0.textContent = `< ${formatCompactIntervalText(galaxyIntervals.t0)} MSU/h (or unspied)`;

  const chkG4 = document.getElementById('og-nexus-chk-lbl-g4');
  const chkG3 = document.getElementById('og-nexus-chk-lbl-g3');
  const chkG2 = document.getElementById('og-nexus-chk-lbl-g2');
  const chkG1 = document.getElementById('og-nexus-chk-lbl-g1');
  const chkG0 = document.getElementById('og-nexus-chk-lbl-g0');
  if (chkG4) chkG4.textContent = `> ${formatCompactIntervalText(galaxyIntervals.t3)} MSU/h`;
  if (chkG3) chkG3.textContent = `> ${formatCompactIntervalText(galaxyIntervals.t2)} MSU/h`;
  if (chkG2) chkG2.textContent = `> ${formatCompactIntervalText(galaxyIntervals.t1)} MSU/h`;
  if (chkG1) chkG1.textContent = `${formatCompactIntervalText(galaxyIntervals.t0)} - ${formatCompactIntervalText(galaxyIntervals.t1)} MSU/h`;
  if (chkG0) chkG0.textContent = `< ${formatCompactIntervalText(galaxyIntervals.t0)} (or unspied)`;
}

let spiedPlanetsCache: SpiedPlanet[] = [];
let isCacheLoaded = false;
let isLoadingCache = false;
let tooltipElement: HTMLElement | null = null;
let currentHoveredPlanet: SpiedPlanet | string | null = null;
let lastGalaxy: number | null = null;
let lastSystem: number | null = null;

let sidebarCurrentPage = 1;
let sidebarSortMode: 'none' | 'desc' | 'asc' = 'none';
let selectedGalaxyTab = 1;
let sidebarGalaxiesCount = 9;
let lastSidebarStateKey = '';

// Helpers to format numbers
const formatCompactNumber = (num: number): string => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.floor(num).toLocaleString();
};

const formatAbbreviatedRate = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.floor(num).toString();
};

export function parseMSUInput(val: string): number {
  if (!val) return 0;
  let clean = val.trim().replace(/,/g, '').toLowerCase();
  clean = clean.replace(/msu(\/h)?/g, '').replace(/res/g, '').trim();
  if (!clean || clean === 'none' || clean === 'off' || clean === 'unlimited') return 0;
  
  if (clean.endsWith('b') || clean.endsWith('g')) {
    const num = parseFloat(clean.slice(0, -1));
    return isNaN(num) ? 0 : Math.min(1000000000, Math.max(0, num * 1000000000));
  }
  if (clean.endsWith('m') || clean.endsWith('kk')) {
    const num = parseFloat(clean.slice(0, -1));
    return isNaN(num) ? 0 : Math.min(1000000000, Math.max(0, num * 1000000));
  }
  if (clean.endsWith('k')) {
    const num = parseFloat(clean.slice(0, -1));
    return isNaN(num) ? 0 : Math.min(1000000000, Math.max(0, num * 1000));
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.min(1000000000, Math.max(0, num));
}

export function sliderPosToMSU(pos: number): number {
  if (pos <= 0) return 0;
  if (pos >= 1000) return 1000000000;
  // Non-linear cubic power curve: increases at a higher rate up to 1B
  const raw = 1000000000 * Math.pow(pos / 1000, 3);
  
  if (raw < 100000) {
    return Math.round(raw / 10000) * 10000; // Snap to 10k
  } else if (raw < 1000000) {
    return Math.round(raw / 50000) * 50000; // Snap to 50k
  } else if (raw < 10000000) {
    return Math.round(raw / 250000) * 250000; // Snap to 250k
  } else if (raw < 100000000) {
    return Math.round(raw / 1000000) * 1000000; // Snap to 1M
  } else {
    return Math.round(raw / 10000000) * 10000000; // Snap to 10M
  }
}

export function msuToSliderPos(msu: number): number {
  if (msu <= 0) return 0;
  if (msu >= 1000000000) return 1000;
  const fraction = Math.cbrt(msu / 1000000000);
  return Math.min(1000, Math.max(0, Math.round(fraction * 1000)));
}

export function calculatePlanetPredictedMSU(planet: SpiedPlanet): number {
  if (!planet) return 0;
  const now = Date.now() / 1000;
  const dT = Math.max(0, now - (planet.lastSpiedTimestamp || 0)) / 3600; // hours elapsed

  const metalAccumulated = (planet.metalPerHour || 0) * dT;
  const crystalAccumulated = (planet.crystalPerHour || 0) * dT;
  const deuteriumAccumulated = (planet.deuteriumPerHour || 0) * dT;

  const metalCap = planet.metalCapacity !== undefined && planet.metalCapacity !== null ? planet.metalCapacity : Infinity;
  const crystalCap = planet.crystalCapacity !== undefined && planet.crystalCapacity !== null ? planet.crystalCapacity : Infinity;
  const deuteriumCap = planet.deuteriumCapacity !== undefined && planet.deuteriumCapacity !== null ? planet.deuteriumCapacity : Infinity;

  const metalTotal = Math.max(planet.lastSpiedMetal || 0, Math.min(metalCap, (planet.lastSpiedMetal || 0) + metalAccumulated));
  const crystalTotal = Math.max(planet.lastSpiedCrystal || 0, Math.min(crystalCap, (planet.lastSpiedCrystal || 0) + crystalAccumulated));
  const deuteriumTotal = Math.max(planet.lastSpiedDeuterium || 0, Math.min(deuteriumCap, (planet.lastSpiedDeuterium || 0) + deuteriumAccumulated));
  return metalTotal + crystalTotal * 1.5 + deuteriumTotal * 3.0;
}

// Tooltip helpers
function createTooltipElement() {
  if (tooltipElement) return;
  tooltipElement = document.createElement('div');
  tooltipElement.className = 'og-nexus-galaxy-tooltip';
  document.body.appendChild(tooltipElement);
}

function updateTooltipPosition(e: MouseEvent) {
  if (!tooltipElement) return;
  const tooltipWidth = 280;
  const tooltipHeight = 120;

  let left = e.clientX + 15;
  let top = e.clientY + 15;

  // Viewport constraints check
  if (left + tooltipWidth > window.innerWidth) {
    left = e.clientX - tooltipWidth - 15;
  }
  if (top + tooltipHeight > window.innerHeight) {
    top = e.clientY - tooltipHeight - 15;
  }

  tooltipElement.style.left = `${left}px`;
  tooltipElement.style.top = `${top}px`;
}

function getConfidenceBadgeColor(conf: number): string {
  if (conf >= 80) return '#22c55e'; // Green
  if (conf >= 40) return '#38bdf8'; // Sky Blue
  return '#e6953c'; // Orange/Amber
}

function getConfidenceBadgeBg(conf: number): string {
  if (conf >= 80) return 'rgba(34, 197, 94, 0.15)';
  if (conf >= 40) return 'rgba(56, 189, 248, 0.15)';
  return 'rgba(230, 149, 60, 0.15)';
}

function updateTooltipContent(planetOrCoords: SpiedPlanet | string) {
  if (!tooltipElement) return;

  if (typeof planetOrCoords === 'string' || (planetOrCoords.spyCount || 0) <= 1) {
    const coords = typeof planetOrCoords === 'string' ? planetOrCoords : planetOrCoords.coords;
    const ringColor = '#64748b'; // Gray for unspied or single spied
    const badgeText = typeof planetOrCoords === 'string' ? 'NO DATA' : '1 SPY';

    tooltipElement.innerHTML = `
      <div class="og-nexus-galaxy-tooltip-header">
        <span class="og-nexus-galaxy-tooltip-coords" style="color: ${ringColor};">[${coords}]</span>
        <span class="og-nexus-galaxy-tooltip-confidence" style="color: #64748b; background: rgba(100, 116, 139, 0.15); border: 1px solid rgba(100, 116, 139, 0.3);">
          ${badgeText}
        </span>
      </div>
      <div class="og-nexus-galaxy-tooltip-prompt" style="color: #cbd5e1; font-size: 11px; line-height: 1.5; padding: 10px; font-weight: 500; text-align: center; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 8px; margin-top: 4px;">
        Spy this planet 2 times in an interval of at least 10 seconds in order to estimate production. More spies will increase confidence.
      </div>
    `;
    return;
  }

  const planet = planetOrCoords;

  // Projections
  const now = Date.now() / 1000;
  const dT = Math.max(0, now - planet.lastSpiedTimestamp) / 3600; // hours elapsed

  const metalAccumulated = planet.metalPerHour * dT;
  const crystalAccumulated = planet.crystalPerHour * dT;
  const deuteriumAccumulated = planet.deuteriumPerHour * dT;

  const metalCap = planet.metalCapacity !== undefined && planet.metalCapacity !== null ? planet.metalCapacity : Infinity;
  const crystalCap = planet.crystalCapacity !== undefined && planet.crystalCapacity !== null ? planet.crystalCapacity : Infinity;
  const deuteriumCap = planet.deuteriumCapacity !== undefined && planet.deuteriumCapacity !== null ? planet.deuteriumCapacity : Infinity;

  const metalTotal = Math.max(planet.lastSpiedMetal, Math.min(metalCap, planet.lastSpiedMetal + metalAccumulated));
  const crystalTotal = Math.max(planet.lastSpiedCrystal, Math.min(crystalCap, planet.lastSpiedCrystal + crystalAccumulated));
  const deuteriumTotal = Math.max(planet.lastSpiedDeuterium, Math.min(deuteriumCap, planet.lastSpiedDeuterium + deuteriumAccumulated));
  const totalMSU = metalTotal + crystalTotal * 1.5 + deuteriumTotal * 3.0;
  const msuPerHour = planet.metalPerHour + planet.crystalPerHour * 1.5 + planet.deuteriumPerHour * 3.0;

  const ringColor = getRingColor(msuPerHour);
  const confColor = getConfidenceBadgeColor(planet.confidence);
  const confBg = getConfidenceBadgeBg(planet.confidence);

  // Human readable age of last spy
  const ageSeconds = Math.max(0, (Date.now() / 1000) - planet.lastSpiedTimestamp);
  let ageText = "Just now";
  if (ageSeconds >= 86400) ageText = `${Math.floor(ageSeconds / 86400)}d ago`;
  else if (ageSeconds >= 3600) ageText = `${Math.floor(ageSeconds / 3600)}h ago`;
  else if (ageSeconds >= 60) ageText = `${Math.floor(ageSeconds / 60)}m ago`;
  else ageText = `${Math.floor(ageSeconds)}s ago`;

  tooltipElement.innerHTML = `
    <div class="og-nexus-galaxy-tooltip-header">
      <span class="og-nexus-galaxy-tooltip-coords" style="color: ${ringColor};">[${planet.coords}]</span>
      <span class="og-nexus-galaxy-tooltip-confidence" style="color: ${confColor}; background: ${confBg}; border: 1px solid ${confColor}30;">
        ${planet.confidence}% CONFIDENCE
      </span>
    </div>
    
    <div class="og-nexus-galaxy-tooltip-columns">
      <div class="og-nexus-galaxy-tooltip-column">
        <div class="og-nexus-galaxy-tooltip-section-title">Production</div>
        <div class="og-nexus-galaxy-tooltip-resource-row">
          <span class="og-nexus-galaxy-tooltip-resource-m">Metal:</span>
          <span class="og-nexus-galaxy-tooltip-resource-rate">+${formatAbbreviatedRate(planet.metalPerHour)}/h</span>
        </div>
        <div class="og-nexus-galaxy-tooltip-resource-row">
          <span class="og-nexus-galaxy-tooltip-resource-c">Crystal:</span>
          <span class="og-nexus-galaxy-tooltip-resource-rate">+${formatAbbreviatedRate(planet.crystalPerHour)}/h</span>
        </div>
        <div class="og-nexus-galaxy-tooltip-resource-row">
          <span class="og-nexus-galaxy-tooltip-resource-d">Deut:</span>
          <span class="og-nexus-galaxy-tooltip-resource-rate">+${formatAbbreviatedRate(planet.deuteriumPerHour)}/h</span>
        </div>
      </div>
      
      <div class="og-nexus-galaxy-tooltip-column">
        <div class="og-nexus-galaxy-tooltip-section-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Est. Resources</span>
          <span class="og-nexus-galaxy-tooltip-estimated-age">${ageText}</span>
        </div>
        <div class="og-nexus-galaxy-tooltip-resource-row">
          <span class="og-nexus-galaxy-tooltip-resource-m">Metal:</span>
          <span class="og-nexus-galaxy-tooltip-resource-rate">${formatCompactNumber(metalTotal)}</span>
        </div>
        <div class="og-nexus-galaxy-tooltip-resource-row">
          <span class="og-nexus-galaxy-tooltip-resource-c">Crystal:</span>
          <span class="og-nexus-galaxy-tooltip-resource-rate">${formatCompactNumber(crystalTotal)}</span>
        </div>
        <div class="og-nexus-galaxy-tooltip-resource-row">
          <span class="og-nexus-galaxy-tooltip-resource-d">Deut:</span>
          <span class="og-nexus-galaxy-tooltip-resource-rate">${formatCompactNumber(deuteriumTotal)}</span>
        </div>
      </div>
    </div>
    
    <div class="og-nexus-galaxy-tooltip-msu-footer">
      <div class="og-nexus-galaxy-tooltip-msu-col">
        <span class="og-nexus-galaxy-tooltip-msu-label" style="color: ${ringColor};">MSU Prod:</span>
        <span class="og-nexus-galaxy-tooltip-msu-value" style="color: ${ringColor};">+${formatAbbreviatedRate(msuPerHour)}/h</span>
      </div>
      <div class="og-nexus-galaxy-tooltip-msu-col">
        <span class="og-nexus-galaxy-tooltip-msu-label" style="color: ${ringColor};">MSU Res:</span>
        <span class="og-nexus-galaxy-tooltip-msu-value" style="color: ${ringColor};">${formatCompactNumber(totalMSU)}</span>
      </div>
    </div>
  `;
}

// Hover event handlers
function handleMouseEnter(planetOrCoords: SpiedPlanet | string, e: MouseEvent) {
  currentHoveredPlanet = planetOrCoords;
  createTooltipElement();
  if (tooltipElement) {
    updateTooltipContent(planetOrCoords);
    updateTooltipPosition(e);
    tooltipElement.classList.add('visible');
  }
}

function handleMouseMove(e: MouseEvent) {
  if (tooltipElement && tooltipElement.classList.contains('visible')) {
    updateTooltipPosition(e);
  }
}

function handleMouseLeave() {
  currentHoveredPlanet = null;
  if (tooltipElement) {
    tooltipElement.classList.remove('visible');
  }
}

// Real-time ticking updates for tooltip resources
let tickInterval: number | null = null;
function startTooltipTick() {
  if (tickInterval) return;
  tickInterval = window.setInterval(() => {
    if (currentHoveredPlanet && tooltipElement && tooltipElement.classList.contains('visible')) {
      updateTooltipContent(currentHoveredPlanet);
    }
  }, 1000);
}

function stopTooltipTick() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

// Helper to determine ring color
function getRingColor(msuPerHour: number): string {
  if (msuPerHour < galaxyIntervals.t0) return '#64748b';    // Group 0: < t0 (Gray)
  if (msuPerHour > galaxyIntervals.t3) return '#ec4899'; // Group 4: > t3 (Hot Pink)
  if (msuPerHour > galaxyIntervals.t2) return '#f59e0b';  // Group 3: > t2 (Amber/Orange)
  if (msuPerHour > galaxyIntervals.t1) return '#10b981';  // Group 2: > t1 (Emerald Green)
  return '#38bdf8';                                      // Group 1: Sky Blue
}

function parseCoords(coordsStr: string) {
  try {
    const parts = coordsStr.replace(/[\[\]]/g, '').split(':').map(Number);
    return {
      galaxy: parts[0] || 0,
      system: parts[1] || 0,
      position: parts[2] || 0
    };
  } catch (e) {
    return { galaxy: 0, system: 0, position: 0 };
  }
}

function parseCoordsVal(coordsStr: string): number {

  try {
    const parts = coordsStr.replace(/[\[\]]/g, '').split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 1000000 + parts[1] * 1000 + parts[2];
    }
  } catch (e) {}
  return 0;
}

function navigateToSystem(galaxy: number, system: number) {
  window.dispatchEvent(new CustomEvent('ogame-nexus-navigate-galaxy', {
    detail: { galaxy, system }
  }));
}

function openIntelSidebar() {
  sessionStorage.setItem('og-nexus-intel-sidebar-open', 'true');
  const universe = document.querySelector('meta[name="ogame-universe"]')?.getAttribute("content") || "unknown";

  if (!isContextValid()) {
    console.warn("OGame Nexus: Extension context invalidated. Please reload the page.");
    return;
  }

  // Ensure sidebar element exists
  let sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'og-nexus-galaxy-intel-sidebar';
    sidebar.className = 'og-nexus-galaxy-intel-sidebar';
    document.body.appendChild(sidebar);
  }

  // Trigger open class
  sidebar.classList.add('open');

  // Determine G of current planet/view
  const galaxyInput = document.getElementById('galaxy_input') as HTMLInputElement | null;
  selectedGalaxyTab = galaxyInput ? (parseInt(galaxyInput.value, 10) || 1) : 1;
  sidebarCurrentPage = 1;
  sidebarSortMode = 'desc';
  lastSidebarStateKey = ''; // Force initial update

  // Build basic layout once
  buildSidebarLayout(sidebar);

  // Load cache and render content
  try {
    chrome.runtime.sendMessage({ type: "GET_ALL_SPIED_PLANETS", data: { universe } }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("OGame Nexus: Extension context invalidated. Please reload the page.");
        return;
      }
      if (response && response.success) {
        spiedPlanetsCache = response.planets || [];
        sidebarGalaxiesCount = response.galaxies || 9;
      }
      // Re-create tabs container dynamically based on galaxies count
      rebuildGTabs(sidebar);
      
      // Update contents
      updateSidebarData();
    });
  } catch (e) {
    console.warn("OGame Nexus: Extension context invalidated during message dispatch. Please reload the page.", e);
  }
}

function closeIntelSidebar() {
  const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
  }
  sessionStorage.setItem('og-nexus-intel-sidebar-open', 'false');
}

function buildSidebarLayout(sidebar: HTMLElement) {
  if (sidebar.querySelector('.og-nexus-intel-sidebar-header')) return;

  const savedRange = sessionStorage.getItem('og-nexus-intel-max-range');
  const maxRange = savedRange ? parseInt(savedRange, 10) : 500;
  const rangeDisplay = maxRange === 500 ? 'Unlimited' : `${maxRange} sys`;

  const savedMinMsu = parseFloat(localStorage.getItem('og-nexus-intel-min-msu') || '0') || 0;
  const initialSliderPos = msuToSliderPos(savedMinMsu);
  const initialMsuText = savedMinMsu > 0 ? `${formatCompactNumber(savedMinMsu)} MSU` : 'None';

  sidebar.innerHTML = `
    <div class="og-nexus-intel-sidebar-header">
      <h2 class="og-nexus-intel-sidebar-title">Raid Helper</h2>
      <button class="og-nexus-intel-close-btn" id="og-nexus-intel-close-btn">&times;</button>
    </div>
    
    <div class="og-nexus-intel-sidebar-body">
      <div id="og-nexus-intel-tabs-wrapper"></div>
      
      <div class="og-nexus-intel-range-container">
        <div class="og-nexus-intel-range-header">
          <span class="range-label">Max range from own planets:</span>
          <span class="range-value" id="og-nexus-intel-range-val">${rangeDisplay}</span>
        </div>
        <input type="range" id="og-nexus-intel-range-slider" min="1" max="500" value="${maxRange}" class="og-nexus-intel-range-slider">
        <div id="og-nexus-intel-range-warning-wrapper"></div>

        <div class="og-nexus-intel-min-msu-wrapper">
          <div class="og-nexus-intel-range-header">
            <span class="range-label">Min predicted Resource MSU on planet:</span>
            <input type="text" id="og-nexus-intel-min-msu-input" class="og-nexus-intel-editable-val" value="${initialMsuText}" title="Click to edit exact MSU threshold (e.g. 500k, 15M, 1B)" autocomplete="off" />
          </div>
          <input type="range" id="og-nexus-intel-min-msu-slider" min="0" max="1000" value="${initialSliderPos}" class="og-nexus-intel-range-slider">
        </div>
      </div>

      <table class="og-nexus-intel-table">
        <thead>
          <tr>
            <th>Player</th>
            <th style="width: 45px; text-align: center;">Spy</th>
            <th>Coordinates</th>
            <th id="og-nexus-intel-sort-prod" class="sortable-header">Production ↕</th>
          </tr>
        </thead>
        <tbody id="og-nexus-intel-tbody">
          <tr>
            <td colspan="4" class="og-nexus-intel-no-data">Loading Raid Radar cache...</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="og-nexus-intel-sidebar-footer">
      <div id="og-nexus-intel-pagination-wrapper"></div>
      <div class="og-nexus-intel-total-count" id="og-nexus-intel-total-count-lbl">Total targets tracked: 0</div>
    </div>
  `;

  // Attach event listeners
  sidebar.querySelector('#og-nexus-intel-close-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeIntelSidebar();
  });

  sidebar.querySelector('#og-nexus-intel-sort-prod')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (sidebarSortMode === 'none') {
      sidebarSortMode = 'desc';
    } else if (sidebarSortMode === 'desc') {
      sidebarSortMode = 'asc';
    } else {
      sidebarSortMode = 'none';
    }
    updateSidebarData(true); // Force update since sort mode changed
  });

  const slider = sidebar.querySelector('#og-nexus-intel-range-slider') as HTMLInputElement | null;
  slider?.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    sessionStorage.setItem('og-nexus-intel-max-range', String(val));
    const label = sidebar.querySelector('#og-nexus-intel-range-val');
    if (label) {
      label.textContent = val === 500 ? 'Unlimited' : `${val} sys`;
    }
    updateSidebarData();
  });

  const minMsuSlider = sidebar.querySelector('#og-nexus-intel-min-msu-slider') as HTMLInputElement | null;
  const minMsuInput = sidebar.querySelector('#og-nexus-intel-min-msu-input') as HTMLInputElement | null;

  minMsuSlider?.addEventListener('input', (e) => {
    const pos = parseInt((e.target as HTMLInputElement).value, 10);
    const msuVal = sliderPosToMSU(pos);
    localStorage.setItem('og-nexus-intel-min-msu', String(msuVal));
    if (minMsuInput && document.activeElement !== minMsuInput) {
      minMsuInput.value = msuVal > 0 ? `${formatCompactNumber(msuVal)} MSU` : 'None';
    }
    updateSidebarData();
    applyGalaxyRings();
  });

  minMsuInput?.addEventListener('input', (e) => {
    const rawVal = (e.target as HTMLInputElement).value;
    const msuVal = parseMSUInput(rawVal);
    localStorage.setItem('og-nexus-intel-min-msu', String(msuVal));
    if (minMsuSlider) {
      minMsuSlider.value = String(msuToSliderPos(msuVal));
    }
    updateSidebarData();
    applyGalaxyRings();
  });

  minMsuInput?.addEventListener('blur', () => {
    const saved = parseFloat(localStorage.getItem('og-nexus-intel-min-msu') || '0') || 0;
    if (minMsuInput) {
      minMsuInput.value = saved > 0 ? `${formatCompactNumber(saved)} MSU` : 'None';
    }
  });

  minMsuInput?.addEventListener('focus', () => {
    const saved = parseFloat(localStorage.getItem('og-nexus-intel-min-msu') || '0') || 0;
    if (minMsuInput && saved > 0) {
      minMsuInput.select();
    }
  });

  // Delegated click event listener for coordinates links inside tbody
  const tbody = sidebar.querySelector('#og-nexus-intel-tbody');
  tbody?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest('.og-nexus-intel-row');
    if (row && row.classList.contains('og-nexus-intel-row-disabled')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const link = target.closest('.og-nexus-intel-coords-link');
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      const coordsAttr = link.getAttribute('data-coords');
      if (coordsAttr) {
        const parts = coordsAttr.split(':').map(Number);
        if (parts.length === 3) {
          navigateToSystem(parts[0], parts[1]);
        }
      }
    }
  });
}

function rebuildGTabs(sidebar: HTMLElement) {
  const wrapper = sidebar.querySelector('#og-nexus-intel-tabs-wrapper');
  if (!wrapper) return;

  let tabsHTML = '<div class="og-nexus-intel-tabs-container">';
  for (let g = 1; g <= sidebarGalaxiesCount; g++) {
    const isActive = g === selectedGalaxyTab;
    tabsHTML += `
      <button class="og-nexus-intel-tab-btn ${isActive ? 'active' : ''}" data-galaxy="${g}" type="button">
        G${g}
      </button>
    `;
  }
  tabsHTML += '</div>';
  wrapper.innerHTML = tabsHTML;

  // Bind tab buttons click
  wrapper.querySelectorAll('.og-nexus-intel-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const g = parseInt(btn.getAttribute('data-galaxy') || '1', 10);
      selectedGalaxyTab = g;
      sidebarCurrentPage = 1; // Reset page on tab change
      
      // Update active classes immediately
      wrapper.querySelectorAll('.og-nexus-intel-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      updateSidebarData();
    });
  });
}

function getSidebarStateKey(): string {
  const savedRange = sessionStorage.getItem('og-nexus-intel-max-range');
  const maxRange = savedRange ? parseInt(savedRange, 10) : 500;
  const minMsu = localStorage.getItem('og-nexus-intel-min-msu') || '0';
  
  const flying = getFlyingEspionageCoords().join(',');
  const recently = Object.entries(getRecentlySpied())
    .map(([coords, ts]) => `${coords}:${ts}`)
    .join(',');
  return `${selectedGalaxyTab}|${sidebarCurrentPage}|${sidebarSortMode}|${maxRange}|${minMsu}|${flying}|${recently}`;
}

function updateSidebarData(force = false) {
  const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
  if (!sidebar) return;

  const stateKey = getSidebarStateKey();
  if (!force && stateKey === lastSidebarStateKey) {
    return; // Skip update if no data/state changed
  }
  lastSidebarStateKey = stateKey;

  const tbody = sidebar.querySelector('#og-nexus-intel-tbody');
  if (!tbody) return;

  // Retrieve current slider value
  const savedRange = sessionStorage.getItem('og-nexus-intel-max-range');
  const maxRange = savedRange ? parseInt(savedRange, 10) : 500;

  const ownSystems = getOwnSystemsInGalaxy(selectedGalaxyTab);

  // Update warning under range slider
  const warningWrapper = sidebar.querySelector('#og-nexus-intel-range-warning-wrapper');
  if (warningWrapper) {
    if (ownSystems.length === 0 && maxRange < 500) {
      warningWrapper.innerHTML = `<div class="og-nexus-intel-range-warning">⚠️ No owned planets in G${selectedGalaxyTab}</div>`;
    } else {
      warningWrapper.innerHTML = '';
    }
  }

  // Filter inactive and longinactive targets, selected G tab, and range
  const filteredTargets = spiedPlanetsCache.filter(p => {
    const isInactive = p.playerStatus && (p.playerStatus.includes('inactive') || p.playerStatus.includes('longinactive'));
    if (!isInactive) return false;
    
    const targetCoords = parseCoords(p.coords);
    if (targetCoords.galaxy !== selectedGalaxyTab) return false;

    // Range filter
    if (maxRange < 500) {
      if (ownSystems.length === 0) return false;
      let minDistance = Infinity;
      ownSystems.forEach(sys => {
        const dist = Math.abs(sys - targetCoords.system);
        if (dist < minDistance) {
          minDistance = dist;
        }
      });
      if (minDistance > maxRange) return false;
    }

    return true;
  });

  // Sort
  const sortedTargets = [...filteredTargets];
  if (sidebarSortMode === 'desc') {
    sortedTargets.sort((a, b) => {
      const prodA = a.metalPerHour + a.crystalPerHour * 1.5 + a.deuteriumPerHour * 3.0;
      const prodB = b.metalPerHour + b.crystalPerHour * 1.5 + b.deuteriumPerHour * 3.0;
      if (prodB !== prodA) return prodB - prodA;
      return parseCoordsVal(a.coords) - parseCoordsVal(b.coords);
    });
  } else if (sidebarSortMode === 'asc') {
    sortedTargets.sort((a, b) => {
      const prodA = a.metalPerHour + a.crystalPerHour * 1.5 + a.deuteriumPerHour * 3.0;
      const prodB = b.metalPerHour + b.crystalPerHour * 1.5 + b.deuteriumPerHour * 3.0;
      if (prodA !== prodB) return prodA - prodB;
      return parseCoordsVal(a.coords) - parseCoordsVal(b.coords);
    });
  } else {
    sortedTargets.sort((a, b) => {
      return parseCoordsVal(a.coords) - parseCoordsVal(b.coords);
    });
  }

  // Paginate (20 targets per page)
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(sortedTargets.length / ITEMS_PER_PAGE) || 1;
  if (sidebarCurrentPage > totalPages) {
    sidebarCurrentPage = totalPages;
  }
  if (sidebarCurrentPage < 1) {
    sidebarCurrentPage = 1;
  }
  const startIndex = (sidebarCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTargets = sortedTargets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Table rows HTML
  let rowsHTML = '';
  if (paginatedTargets.length === 0) {
    rowsHTML = `
      <tr>
        <td colspan="4" class="og-nexus-intel-no-data">No inactive targets spied in range for G${selectedGalaxyTab}.</td>
      </tr>
    `;
  } else {
    const flyingCoords = getFlyingEspionageCoords();
    const recentlySpied = getRecentlySpied();
    const savedMinMsu = parseFloat(localStorage.getItem('og-nexus-intel-min-msu') || '0') || 0;

    paginatedTargets.forEach(target => {
      const prodMSU = target.metalPerHour + target.crystalPerHour * 1.5 + target.deuteriumPerHour * 3.0;
      const formattedProd = formatCompactNumber(prodMSU);
      const isLong = target.playerStatus.includes('longinactive');
      const espionageStatus = getEspionageStatus(target.coords, flyingCoords, recentlySpied);
      
      const predictedMSU = calculatePlanetPredictedMSU(target);
      const isBelowMinMSU = savedMinMsu > 0 && predictedMSU < savedMinMsu;
      const rowDisabledClass = isBelowMinMSU ? 'og-nexus-intel-row-disabled' : '';
      const tooltipDisabledInfo = isBelowMinMSU 
        ? `title="Predicted Resource MSU on planet (${formatCompactNumber(predictedMSU)}) is below minimum threshold (${formatCompactNumber(savedMinMsu)})"` 
        : '';

      rowsHTML += `
        <tr class="og-nexus-intel-row ${rowDisabledClass}" ${tooltipDisabledInfo}>
          <td class="og-nexus-intel-cell-player">
            <span class="og-nexus-intel-player-name" title="${target.playerName}">${target.playerName}</span>
            <span class="og-nexus-intel-player-status ${isLong ? 'status-long-inactive' : 'status-inactive'}">
              ${isLong ? 'I' : 'i'}
            </span>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <span class="${espionageStatus.className}" title="${espionageStatus.tooltip}">
              ${espionageStatus.text}
            </span>
          </td>
          <td class="og-nexus-intel-cell-coords">
            <a href="#" class="og-nexus-intel-coords-link" data-coords="${target.coords}" ${isBelowMinMSU ? 'tabindex="-1"' : ''}>[${target.coords}]</a>
          </td>
          <td class="og-nexus-intel-cell-prod" style="color: ${getRingColor(prodMSU)}; text-shadow: 0 0 3px ${getRingColor(prodMSU)}40;">
            ${formattedProd}<span class="msu-unit">MSU/h</span>
          </td>
        </tr>
      `;
    });
  }
  tbody.innerHTML = rowsHTML;

  // Update sort header text and direction indicator
  const sortHeader = sidebar.querySelector('#og-nexus-intel-sort-prod');
  if (sortHeader) {
    let sortIcon = '↕';
    if (sidebarSortMode === 'desc') sortIcon = '↓';
    else if (sidebarSortMode === 'asc') sortIcon = '↑';
    sortHeader.textContent = `Production ${sortIcon}`;
  }

  // Update total counts label
  const totalCountLbl = sidebar.querySelector('#og-nexus-intel-total-count-lbl');
  if (totalCountLbl) {
    totalCountLbl.textContent = `Total targets tracked in G${selectedGalaxyTab}: ${sortedTargets.length}`;
  }

  // Build and render pagination wrapper
  const pagWrapper = sidebar.querySelector('#og-nexus-intel-pagination-wrapper');
  if (pagWrapper) {
    if (totalPages > 1) {
      pagWrapper.innerHTML = `
        <div class="og-nexus-intel-pagination">
          <button class="og-nexus-intel-page-btn" id="og-nexus-intel-prev-btn" ${sidebarCurrentPage === 1 ? 'disabled' : ''}>&laquo; Prev</button>
          <span class="og-nexus-intel-page-info">Page ${sidebarCurrentPage} of ${totalPages}</span>
          <button class="og-nexus-intel-page-btn" id="og-nexus-intel-next-btn" ${sidebarCurrentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>
        </div>
      `;
      // Attach pagination click handlers
      pagWrapper.querySelector('#og-nexus-intel-prev-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (sidebarCurrentPage > 1) {
          sidebarCurrentPage--;
          updateSidebarData();
        }
      });
      pagWrapper.querySelector('#og-nexus-intel-next-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (sidebarCurrentPage < totalPages) {
          sidebarCurrentPage++;
          updateSidebarData();
        }
      });
    } else {
      pagWrapper.innerHTML = '';
    }
  }
}


function createSummaryBarElement(): HTMLElement {
  const bar = document.createElement('div');
  bar.id = 'og-nexus-galaxy-summary-bar';
  bar.className = 'og-nexus-galaxy-summary-bar';

  // Read initial states
  const showG4 = localStorage.getItem('og-nexus-gal-show-g4') !== 'false';
  const showG3 = localStorage.getItem('og-nexus-gal-show-g3') !== 'false';
  const showG2 = localStorage.getItem('og-nexus-gal-show-g2') !== 'false';
  const showG1 = localStorage.getItem('og-nexus-gal-show-g1') !== 'false';
  const showG0 = localStorage.getItem('og-nexus-gal-show-g0') !== 'false';
  const isExpanded = localStorage.getItem('og-nexus-gal-expanded') === 'true';

  if (isExpanded) {
    bar.classList.add('expanded');
  }

  bar.innerHTML = `
    <div class="og-nexus-galaxy-summary-header">
      <div class="og-nexus-galaxy-summary-left">
        <span class="og-nexus-galaxy-summary-title">System Inactives</span>
        <div class="og-nexus-galaxy-summary-counts">
          <div class="og-nexus-galaxy-summary-dot-group" title="&gt; ${formatCompactInterval(galaxyIntervals.t3)} MSU/h">
            <div class="og-nexus-galaxy-summary-dot" style="background: #ec4899; box-shadow: 0 0 4px #ec4899;"></div>
            <span class="og-nexus-galaxy-summary-count-val" id="og-nexus-val-g4">0</span>
          </div>
          <div class="og-nexus-galaxy-summary-dot-group" title="&gt; ${formatCompactInterval(galaxyIntervals.t2)} MSU/h">
            <div class="og-nexus-galaxy-summary-dot" style="background: #f59e0b; box-shadow: 0 0 4px #f59e0b;"></div>
            <span class="og-nexus-galaxy-summary-count-val" id="og-nexus-val-g3">0</span>
          </div>
          <div class="og-nexus-galaxy-summary-dot-group" title="&gt; ${formatCompactInterval(galaxyIntervals.t1)} MSU/h">
            <div class="og-nexus-galaxy-summary-dot" style="background: #10b981; box-shadow: 0 0 4px #10b981;"></div>
            <span class="og-nexus-galaxy-summary-count-val" id="og-nexus-val-g2">0</span>
          </div>
          <div class="og-nexus-galaxy-summary-dot-group" title="${formatCompactInterval(galaxyIntervals.t0)} - ${formatCompactInterval(galaxyIntervals.t1)} MSU/h">
            <div class="og-nexus-galaxy-summary-dot" style="background: #38bdf8; box-shadow: 0 0 4px #38bdf8;"></div>
            <span class="og-nexus-galaxy-summary-count-val" id="og-nexus-val-g1">0</span>
          </div>
          <div class="og-nexus-galaxy-summary-dot-group" title="&lt; ${formatCompactInterval(galaxyIntervals.t0)} MSU/h (or unspied)">
            <div class="og-nexus-galaxy-summary-dot" style="background: #64748b; box-shadow: 0 0 4px #64748b;"></div>
            <span class="og-nexus-galaxy-summary-count-val" id="og-nexus-val-g0">0</span>
          </div>
        </div>
        
        <div class="og-nexus-galaxy-info-trigger">
          i
          <div class="og-nexus-galaxy-legend-tooltip" id="og-nexus-legend-tooltip">
            <div class="og-nexus-galaxy-legend-row">
              <div class="og-nexus-galaxy-summary-dot" style="background: #ec4899; box-shadow: 0 0 4px #ec4899;"></div>
              <span id="og-nexus-lbl-g4">&gt; ${formatCompactInterval(galaxyIntervals.t3)} MSU/h</span>
            </div>
            <div class="og-nexus-galaxy-legend-row">
              <div class="og-nexus-galaxy-summary-dot" style="background: #f59e0b; box-shadow: 0 0 4px #f59e0b;"></div>
              <span id="og-nexus-lbl-g3">&gt; ${formatCompactInterval(galaxyIntervals.t2)} MSU/h</span>
            </div>
            <div class="og-nexus-galaxy-legend-row">
              <div class="og-nexus-galaxy-summary-dot" style="background: #10b981; box-shadow: 0 0 4px #10b981;"></div>
              <span id="og-nexus-lbl-g2">&gt; ${formatCompactInterval(galaxyIntervals.t1)} MSU/h</span>
            </div>
            <div class="og-nexus-galaxy-legend-row">
              <div class="og-nexus-galaxy-summary-dot" style="background: #38bdf8; box-shadow: 0 0 4px #38bdf8;"></div>
              <span id="og-nexus-lbl-g1">${formatCompactInterval(galaxyIntervals.t0)} - ${formatCompactInterval(galaxyIntervals.t1)} MSU/h</span>
            </div>
            <div class="og-nexus-galaxy-legend-row">
              <div class="og-nexus-galaxy-summary-dot" style="background: #64748b; box-shadow: 0 0 4px #64748b;"></div>
              <span id="og-nexus-lbl-g0">&lt; ${formatCompactInterval(galaxyIntervals.t0)} MSU/h (or unspied)</span>
            </div>
          </div>
        </div>
      </div>
      
      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="og-nexus-galaxy-intel-btn" id="og-nexus-galaxy-intel-btn" type="button">Raid Helper</button>
        <div class="og-nexus-galaxy-settings-toggle" id="og-nexus-galaxy-settings-toggle" title="Toggle settings">
          <svg viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </div>
      </div>

    </div>
    
    <div class="og-nexus-galaxy-settings-panel">
      <span class="og-nexus-galaxy-settings-title">Highlight Filters (configurable inside Raid Radar)</span>
      <div class="og-nexus-galaxy-checkbox-grid">
        <label class="og-nexus-galaxy-checkbox-label">
          <input type="checkbox" id="og-nexus-chk-g4" ${showG4 ? 'checked' : ''}>
          <span style="color: #ec4899;" id="og-nexus-chk-lbl-g4">&gt; ${formatCompactInterval(galaxyIntervals.t3)} MSU/h</span>
        </label>
        <label class="og-nexus-galaxy-checkbox-label">
          <input type="checkbox" id="og-nexus-chk-g3" ${showG3 ? 'checked' : ''}>
          <span style="color: #f59e0b;" id="og-nexus-chk-lbl-g3">&gt; ${formatCompactInterval(galaxyIntervals.t2)} MSU/h</span>
        </label>
        <label class="og-nexus-galaxy-checkbox-label">
          <input type="checkbox" id="og-nexus-chk-g2" ${showG2 ? 'checked' : ''}>
          <span style="color: #10b981;" id="og-nexus-chk-lbl-g2">&gt; ${formatCompactInterval(galaxyIntervals.t1)} MSU/h</span>
        </label>
        <label class="og-nexus-galaxy-checkbox-label">
          <input type="checkbox" id="og-nexus-chk-g1" ${showG1 ? 'checked' : ''}>
          <span style="color: #38bdf8;" id="og-nexus-chk-lbl-g1">${formatCompactInterval(galaxyIntervals.t0)} - ${formatCompactInterval(galaxyIntervals.t1)} MSU/h</span>
        </label>
        <label class="og-nexus-galaxy-checkbox-label">
          <input type="checkbox" id="og-nexus-chk-g0" ${showG0 ? 'checked' : ''}>
          <span style="color: #94a3b8;" id="og-nexus-chk-lbl-g0">&lt; ${formatCompactInterval(galaxyIntervals.t0)} (or unspied)</span>
        </label>
      </div>
    </div>
  `;

  // Attach event listener for expansion toggle
  const toggle = bar.querySelector('#og-nexus-galaxy-settings-toggle');
  toggle?.addEventListener('click', () => {
    bar.classList.toggle('expanded');
    localStorage.setItem('og-nexus-gal-expanded', bar.classList.contains('expanded') ? 'true' : 'false');
  });

  // Attach event listener for Raid Helper button
  const intelBtn = bar.querySelector('#og-nexus-galaxy-intel-btn');
  intelBtn?.addEventListener('click', () => {
    openIntelSidebar();
  });

  // Attach checkbox change listeners
  const setupCheckbox = (id: string, storageKey: string) => {
    const chk = bar.querySelector(`#${id}`) as HTMLInputElement | null;
    chk?.addEventListener('change', () => {
      localStorage.setItem(storageKey, chk.checked ? 'true' : 'false');
      applyGalaxyRings(); // Refresh the row opacities immediately
    });
  };

  setupCheckbox('og-nexus-chk-g4', 'og-nexus-gal-show-g4');
  setupCheckbox('og-nexus-chk-g3', 'og-nexus-gal-show-g3');
  setupCheckbox('og-nexus-chk-g2', 'og-nexus-gal-show-g2');
  setupCheckbox('og-nexus-chk-g1', 'og-nexus-gal-show-g1');
  setupCheckbox('og-nexus-chk-g0', 'og-nexus-gal-show-g0');

  return bar;
}

export function applyGalaxyRings() {
  const galaxyInput = document.querySelector('input#galaxy_input') as HTMLInputElement | null;
  const systemInput = document.querySelector('input#system_input') as HTMLInputElement | null;
  if (!galaxyInput || !systemInput) return;

  const galaxy = parseInt(galaxyInput.value, 10);
  const system = parseInt(systemInput.value, 10);
  if (isNaN(galaxy) || isNaN(system)) return;

  // Precaution: Ensure the galaxy page is not actively loading
  const loadingEl = document.getElementById("galaxyLoading");
  if (loadingEl) {
    const isLoaded = window.getComputedStyle(loadingEl).display === "none" || loadingEl.style.display === "none";
    if (!isLoaded) return;

    const currentPos = loadingEl.getAttribute("data-currentposition");
    if (currentPos) {
      const parts = currentPos.split(":");
      if (parts.length === 2) {
        const posGalaxy = parseInt(parts[0], 10);
        const posSystem = parseInt(parts[1], 10);
        if (posGalaxy !== galaxy || posSystem !== system) return;
      }
    }
  }

  // If system or galaxy changed, hide any active tooltip
  if (lastGalaxy !== null && lastSystem !== null && (lastGalaxy !== galaxy || lastSystem !== system)) {
    handleMouseLeave();
  }
  lastGalaxy = galaxy;
  lastSystem = system;

  // Read current checkbox filter settings for the 5 highlight groups (Tiers 0 to 4 based on production)
  const showGroup4 = localStorage.getItem('og-nexus-gal-show-g4') !== 'false';
  const showGroup3 = localStorage.getItem('og-nexus-gal-show-g3') !== 'false';
  const showGroup2 = localStorage.getItem('og-nexus-gal-show-g2') !== 'false';
  const showGroup1 = localStorage.getItem('og-nexus-gal-show-g1') !== 'false';
  const showGroup0 = localStorage.getItem('og-nexus-gal-show-g0') !== 'false';

  let countGroup4 = 0;
  let countGroup3 = 0;
  let countGroup2 = 0;
  let countGroup1 = 0;
  let countGroup0 = 0;

  const rows = document.querySelectorAll('.galaxyRow.ctContentRow');
  if (rows.length < 15) return; // Precaution: Ensure system table is fully loaded with all 15 coordinate slots + deep space

  // Scan and persist galaxy debris field opportunities (including Slot 16 Deep Space)
  const allDebrisRows = document.querySelectorAll('.galaxyRow.ctContentRow, .expeditionDebrisSlotBoxRow, #galaxyRow16');
  scanGalaxyDebrisFields(galaxy, system, allDebrisRows);

  // Sync scanned system to Nexus Overwatch (debounced + verified DOM settlement to prevent stale data on fast scrolling)
  scheduleGalaxySyncToOverwatch(galaxy, system);

  rows.forEach(row => {
    const posCell = row.querySelector('.cellPosition');
    const playerCell = row.querySelector('.cellPlayerName') as HTMLElement | null;
    if (!posCell || !playerCell) return;

    const position = parseInt(posCell.textContent || '', 10);
    if (isNaN(position)) return;

    const rowEl = row as HTMLElement;

    // Reset styles
    playerCell.style.boxShadow = '';
    rowEl.style.opacity = '';

    // Remove previous listeners if row was re-bound
    const oldMouseEnter = (playerCell as any)._ogNexusMouseEnter;
    if (oldMouseEnter) {
      playerCell.removeEventListener('mouseenter', oldMouseEnter);
      playerCell.removeEventListener('mouseleave', handleMouseLeave);
      (playerCell as any)._ogNexusMouseEnter = null;
    }

    // Soft-delete/remove inactive planets that are now empty slots in galaxy view
    const playerText = playerCell?.textContent?.trim() || "";
    if (row.classList.contains('empty_filter') && !playerText) {
      const targetCoords = `${galaxy}:${system}:${position}`;
      const cachedPlanet = spiedPlanetsCache.find(p => p.coords === targetCoords);
      if (cachedPlanet) {
        chrome.runtime.sendMessage({
          type: "DELETE_SPIED_PLANET",
          data: { planetKey: cachedPlanet.planetKey }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("OGame Nexus: Extension context invalidated during DELETE_SPIED_PLANET sendMessage.");
            return;
          }
          if (response && response.success) {
            // Update local cache to prevent redundant deletion calls
            spiedPlanetsCache = spiedPlanetsCache.filter(p => p.planetKey !== cachedPlanet.planetKey);
            // Refresh sidebar if it is currently open
            const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
            if (sidebar && sidebar.classList.contains('open')) {
              updateSidebarData(true);
            }
          } else {
            console.error(`OGame Nexus: Failed to delete spied planet at ${targetCoords}:`, response?.error);
          }
        });
      }
      return;
    }

    // Check if the player cell actually has inactive markers and is not in vacation mode
    const isInactive = row.classList.contains('inactive_filter') && !row.classList.contains('vacation_filter');
    if (!isInactive) return;

    // Search spied planets in our in-memory cache
    const targetCoords = `${galaxy}:${system}:${position}`;
    const planet = spiedPlanetsCache.find(p => p.coords === targetCoords);

    // Calculate MSU/h production (default to 0 if not spied yet, leading to gray lateral)
    const msuPerHour = planet ? (planet.metalPerHour + planet.crystalPerHour * 1.5 + planet.deuteriumPerHour * 3.0) : 0;

    // Determine group
    let group = 0;
    if (!planet || msuPerHour < galaxyIntervals.t0) {
      group = 0;
      countGroup0++;
    } else if (msuPerHour > galaxyIntervals.t3) {
      group = 4;
      countGroup4++;
    } else if (msuPerHour > galaxyIntervals.t2) {
      group = 3;
      countGroup3++;
    } else if (msuPerHour > galaxyIntervals.t1) {
      group = 2;
      countGroup2++;
    } else {
      group = 1;
      countGroup1++;
    }

    // Determine if we should show/hide
    let shouldShow = true;
    if (group === 4) shouldShow = showGroup4;
    else if (group === 3) shouldShow = showGroup3;
    else if (group === 2) shouldShow = showGroup2;
    else if (group === 1) shouldShow = showGroup1;
    else shouldShow = showGroup0;

    // Minimum predicted Resource MSU on inactive planets filter
    const minMsu = parseFloat(localStorage.getItem('og-nexus-intel-min-msu') || '0') || 0;
    if (minMsu > 0) {
      const predMsu = planet ? calculatePlanetPredictedMSU(planet) : 0;
      if (predMsu < minMsu) {
        shouldShow = false;
      }
    }

    if (!shouldShow) {
      rowEl.style.opacity = '0.35';
      rowEl.style.transition = 'opacity 0.2s ease';
    } else {
      rowEl.style.opacity = '';
      rowEl.style.transition = 'opacity 0.2s ease';
    }

    const ringColor = getRingColor(msuPerHour);

    // Apply color-coded left lateral border (using inset shadow to prevent cell sizing shift)
    playerCell.style.boxShadow = `inset 3px 0 0 ${ringColor}`;

    // Wire hover listener for all inactive players (spied or unspied)
    const onMouseEnter = (e: MouseEvent) => handleMouseEnter(planet || targetCoords, e);
    playerCell.addEventListener('mouseenter', onMouseEnter);
    playerCell.addEventListener('mouseleave', handleMouseLeave);

    // Save reference on node for clean unbinding
    (playerCell as any)._ogNexusMouseEnter = onMouseEnter;
  });

  // Update UI counts
  const valG4 = document.getElementById('og-nexus-val-g4');
  const valG3 = document.getElementById('og-nexus-val-g3');
  const valG2 = document.getElementById('og-nexus-val-g2');
  const valG1 = document.getElementById('og-nexus-val-g1');
  const valG0 = document.getElementById('og-nexus-val-g0');
  if (valG4) valG4.textContent = String(countGroup4);
  if (valG3) valG3.textContent = String(countGroup3);
  if (valG2) valG2.textContent = String(countGroup2);
  if (valG1) valG1.textContent = String(countGroup1);
  if (valG0) valG0.textContent = String(countGroup0);
}

export function initGalaxyView() {
  const galaxyComponent = document.querySelector('#galaxycomponent');
  if (!galaxyComponent) return;

  // Scan flying espionage missions and record them as recently spied
  const flyingCoords = getFlyingEspionageCoords();
  const recentlySpied = getRecentlySpied();
  let updatedAny = false;
  flyingCoords.forEach(coords => {
    if (!recentlySpied[coords]) {
      recentlySpied[coords] = Date.now();
      updatedAny = true;
    }
  });
  if (updatedAny) {
    try {
      localStorage.setItem('og-nexus-recently-spied', JSON.stringify(recentlySpied));
    } catch (e) {}
  }

  const summaryBarExists = !!document.getElementById('og-nexus-galaxy-summary-bar');

  if (!summaryBarExists) {
    if (!isContextValid()) {
      console.warn("OGame Nexus: Extension context invalidated. Please reload the page.");
      return;
    }

    try {
      // This is the FIRST time we are initializing this Galaxy view session
      // Load intervals
      chrome.storage.local.get('galaxyIntervals', (result) => {
        if (chrome.runtime.lastError) {
          console.warn("OGame Nexus: Extension context invalidated during storage access. Please reload the page.");
          return;
        }
        if (result && result.galaxyIntervals) {
          galaxyIntervals = { ...galaxyIntervals, ...result.galaxyIntervals };
        }

        if (isCacheLoaded) {
          // Cache is already loaded, setup summary bar immediately
          if (!document.getElementById('og-nexus-galaxy-summary-bar')) {
            const summaryBar = createSummaryBarElement();
            galaxyComponent.appendChild(summaryBar);
          }
          applyGalaxyRings();
          if (sessionStorage.getItem('og-nexus-intel-sidebar-open') === 'true') {
            const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
            if (!sidebar || !sidebar.classList.contains('open')) {
              openIntelSidebar();
            }
          }
        } else if (!isLoadingCache) {
          // Load cache first
          isLoadingCache = true;
          const universe = document.querySelector('meta[name="ogame-universe"]')?.getAttribute("content") || "unknown";
          
          if (!isContextValid()) {
            isLoadingCache = false;
            console.warn("OGame Nexus: Extension context invalidated before cache request.");
            return;
          }

          chrome.runtime.sendMessage({ type: "GET_ALL_SPIED_PLANETS", data: { universe } }, (response) => {
            isLoadingCache = false;
            if (chrome.runtime.lastError) {
              console.warn("OGame Nexus: Extension context invalidated during cache request callback. Please reload the page.");
              return;
            }
            if (response && response.success) {
              spiedPlanetsCache = response.planets || [];
              isCacheLoaded = true;

              if (!document.getElementById('og-nexus-galaxy-summary-bar')) {
                const summaryBar = createSummaryBarElement();
                galaxyComponent.appendChild(summaryBar);
              }
              applyGalaxyRings();
              if (sessionStorage.getItem('og-nexus-intel-sidebar-open') === 'true') {
                const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
                if (!sidebar || !sidebar.classList.contains('open')) {
                  openIntelSidebar();
                }
              }
            }
          });
        }
      });
    } catch (e) {
      console.warn("OGame Nexus: Extension context invalidated during initialization setup. Please reload the page.", e);
      return;
    }

    // Add document-level listeners for dynamic positioning
    document.removeEventListener('mousemove', handleMouseMove); // Prevent duplicates
    document.addEventListener('mousemove', handleMouseMove);
    
    startTooltipTick();

    // Register storage listener for real-time reactivity
    try {
      chrome.storage.onChanged.removeListener(onStorageChanged);
      chrome.storage.onChanged.addListener(onStorageChanged);
    } catch (e) {
      console.warn("OGame Nexus: Failed to register storage listener due to context invalidation.", e);
    }
  } else {
    // Already initialized, just process DOM rows (idempotent and fast)
    applyGalaxyRings();
  }

  // Refresh live espionage/range tracking status if sidebar is currently open
  const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
  if (sidebar && sidebar.classList.contains('open')) {
    updateSidebarData();
  }
}

export function cleanupGalaxyView() {
  // Clean up cache
  spiedPlanetsCache = [];
  isCacheLoaded = false;
  lastGalaxy = null;
  lastSystem = null;
  lastSidebarStateKey = '';

  // Clean up listeners
  document.removeEventListener('mousemove', handleMouseMove);
  stopTooltipTick();

  if (isContextValid()) {
    try {
      chrome.storage.onChanged.removeListener(onStorageChanged);
    } catch (e) {
      // Ignored
    }
  }

  // Remove tooltip from DOM
  if (tooltipElement) {
    tooltipElement.remove();
    tooltipElement = null;
  }

  // Remove summary bar from DOM
  const summaryBar = document.getElementById('og-nexus-galaxy-summary-bar');
  if (summaryBar) {
    summaryBar.remove();
  }

  // Remove sidebar from DOM
  const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
  if (sidebar) {
    sidebar.remove();
  }

  // Close sidebar state if navigating away
  sessionStorage.setItem('og-nexus-intel-sidebar-open', 'false');
}

// ==========================================================================
// Galaxy Debris Field Opportunity Scanner (1-hour TTL + Live Invalidation)
// ==========================================================================

const DEBRIS_EXPIRY_MS = 60 * 60 * 1000; // 1 hour TTL

function parseDebrisAmount(text: string): number {
  if (!text) return 0;
  // Match digits with optional commas/dots: e.g. "Metal: 6,921,000" or "6.921.000"
  const cleaned = text.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

export async function scanGalaxyDebrisFields(galaxy: number, system: number, rows: NodeListOf<Element>) {
  if (!galaxy || !system || !rows || rows.length === 0) return;
  if (!isContextValid()) return;

  try {
    const storageKey = 'nexus_discovered_debris_fields';
    const store = await chrome.storage.local.get(storageKey);
    const existingMap: Record<string, DiscoveredDebrisField> = store[storageKey] || {};
    const now = Date.now();

    // 1. Prune expired entries across all galaxies (> 1 hour)
    let hasChanges = false;
    for (const [coords, item] of Object.entries(existingMap)) {
      if (!item || now >= item.expiresAt || now - item.timestamp > DEBRIS_EXPIRY_MS) {
        delete existingMap[coords];
        hasChanges = true;
      }
    }

    // Read configured threshold (default 1,000,000 MSU)
    const settingsKey = 'nexus_assistant_settings';
    const settingsStore = await chrome.storage.local.get(settingsKey);
    const minDebrisMsu = settingsStore[settingsKey]?.thresholds?.minDebrisMsu ?? 1000000;

    // Track all positions seen in this scan
    const inspectedPositions = new Set<number>();

    // 2. Scan every position in the current system (including slot 16)
    rows.forEach(row => {
      const posCell = row.querySelector('.cellPosition, .expeditionDebrisSlotBoxCell');
      let position = posCell ? parseInt(posCell.textContent || '', 10) : 0;
      if (isNaN(position) || position <= 0) {
        if (row.id === 'galaxyRow16' || row.classList.contains('expeditionDebrisSlotBoxRow')) {
          position = 16;
        }
      }
      if (isNaN(position) || position <= 0) return;

      inspectedPositions.add(position);

      const coords = `${galaxy}:${system}:${position}`;
      const debrisCell = row.querySelector('.cellDebris, #expeditionDebrisSlotDebrisContainer, #expeditionDebris') || row;

      let metal = 0;
      let crystal = 0;
      let deuterium = 0;
      let recyclersNeeded = 0;
      let hasDebris = false;

      if (debrisCell) {
        const microdebris = debrisCell.querySelector('.microdebris, #expeditionDebris, img[src*="debris"], img[src*="fa3e396b8af2ae31e28ef3b44eca91"]');
        const tooltipEl = debrisCell.querySelector('.galaxyTooltip, [id^="debris"]');

        if (microdebris || tooltipEl) {
          const links = (tooltipEl || debrisCell).querySelectorAll('.ListLinks li, .debris-content, .debris-recyclers');
          links.forEach(li => {
            const t = (li.textContent || '').toLowerCase();
            if (t.includes('metal')) {
              metal = parseDebrisAmount(t);
            } else if (t.includes('crystal') || t.includes('kristall') || t.includes('cristal')) {
              crystal = parseDebrisAmount(t);
            } else if (t.includes('deut')) {
              deuterium = parseDebrisAmount(t);
            } else if (t.includes('recycler') || t.includes('recy') || t.includes('pathfinder') || t.includes('pionier') || t.includes('éclaireur')) {
              recyclersNeeded = parseDebrisAmount(t);
            }
          });

          // Check onclick sendShips(8, g, s, p, 2, recyclers) fallback
          if (!recyclersNeeded) {
            const mineBtn = (tooltipEl || debrisCell).querySelector('a[onclick*="sendShips"]');
            if (mineBtn) {
              const onclickText = mineBtn.getAttribute('onclick') || '';
              const match = onclickText.match(/sendShips\s*\(\s*8\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*2\s*,\s*(\d+)\s*\)/i);
              if (match) {
                recyclersNeeded = parseInt(match[1], 10) || 0;
              }
            }
          }

          if (metal > 0 || crystal > 0 || deuterium > 0) {
            hasDebris = true;
          }
        }
      }

      const msu = metal + crystal * 1.5 + deuterium * 3.0;

      if (hasDebris && msu >= minDebrisMsu) {
        if (!recyclersNeeded) {
          recyclersNeeded = Math.ceil((metal + crystal + deuterium) / 25000);
        }

        const existing = existingMap[coords];
        const isDifferent = !existing || existing.metal !== metal || existing.crystal !== crystal || existing.deuterium !== deuterium;

        if (isDifferent) {
          existingMap[coords] = {
            coords,
            galaxy,
            system,
            position,
            metal,
            crystal,
            deuterium,
            msu,
            recyclersNeeded,
            timestamp: now,
            expiresAt: now + DEBRIS_EXPIRY_MS
          };
          hasChanges = true;
        }
      } else {
        // If debris is collected/missing or below threshold and was previously saved for this coords, remove it immediately
        if (existingMap[coords]) {
          delete existingMap[coords];
          hasChanges = true;
        }
      }
    });

    // 3. For any stored debris field in THIS system that was not found with qualifying debris in this scan, delete it!
    for (const [coords, item] of Object.entries(existingMap)) {
      if (item && item.galaxy === galaxy && item.system === system) {
        if (!inspectedPositions.has(item.position)) {
          delete existingMap[coords];
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await chrome.storage.local.set({ [storageKey]: existingMap });
      const playerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
      window.dispatchEvent(new CustomEvent('ogame-nexus-debris-fields-updated'));
      debouncedRefreshAssistantBar(playerId);
    }
  } catch (err) {
    console.error('OGame Nexus: Error scanning galaxy debris fields', err);
  }
}

// ==========================================================================
// Nexus Overwatch Galaxy Live Telemetry Sync (Passive & Zero-Lag)
// ==========================================================================

let lastOverwatchSyncCoords = '';
let lastOverwatchSyncTime = 0;

function extractDirectText(el: Element | null): string {
  if (!el) return '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() || '';
      if (text) return text;
    }
  }
  return '';
}

/**
 * Verifies that the OGame Galaxy DOM has genuinely settled and belongs to target coordinates.
 * Prevents transient/stale DOM from being scraped during rapid user scrolling.
 */
function isGalaxyDOMFullySettled(targetGalaxy: number, targetSystem: number, rows: NodeListOf<Element>): boolean {
  if (!rows || rows.length < 15) return false;

  // 1. Check if galaxyLoading indicator is active
  const loadingEl = document.getElementById('galaxyLoading');
  if (loadingEl) {
    const isVisible = window.getComputedStyle(loadingEl).display !== 'none' && loadingEl.style.display !== 'none';
    if (isVisible) return false;

    const currentPos = loadingEl.getAttribute('data-currentposition');
    if (currentPos) {
      const parts = currentPos.split(':').map(Number);
      if (parts.length === 2 && (parts[0] !== targetGalaxy || parts[1] !== targetSystem)) {
        return false; // Loading position doesn't match target
      }
    }
  }

  // 2. Cross-verify coordinates embedded in interactive row elements (spy links, discovery, colonize, move)
  let foundAnyCoords = false;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // A. Check data-spy-coords (e.g. "5:187:1:1")
    const spyLink = row.querySelector('[data-spy-coords]');
    if (spyLink) {
      const coordsStr = spyLink.getAttribute('data-spy-coords') || '';
      const parts = coordsStr.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        foundAnyCoords = true;
        if (parts[0] !== targetGalaxy || parts[1] !== targetSystem) {
          return false; // Row belongs to a different/stale system!
        }
      }
    }

    // B. Check onclick action strings (discoverPlanet, movePlanet, sendShips)
    const actionEl = row.querySelector('[onclick*="discoverPlanet"], [onclick*="movePlanet"], [onclick*="sendShips"]');
    if (actionEl) {
      const onclickStr = actionEl.getAttribute('onclick') || '';
      const match = onclickStr.match(/'galaxy':\s*(\d+),\s*'system':\s*(\d+)/) ||
                    onclickStr.match(/sendShips\(\s*\d+,\s*(\d+),\s*(\d+)/);
      if (match) {
        const rowG = parseInt(match[1], 10);
        const rowS = parseInt(match[2], 10);
        if (!isNaN(rowG) && !isNaN(rowS)) {
          foundAnyCoords = true;
          if (rowG !== targetGalaxy || rowS !== targetSystem) {
            return false; // Row belongs to a different/stale system!
          }
        }
      }
    }
  }

  return foundAnyCoords;
}

let galaxySyncDebounceTimer: any = null;

/**
 * Debounced dispatcher for Galaxy telemetry sync.
 * When users scroll rapidly, previous timers are cancelled so only the final settled system is synced.
 */
export function scheduleGalaxySyncToOverwatch(galaxy: number, system: number) {
  if (galaxySyncDebounceTimer) {
    clearTimeout(galaxySyncDebounceTimer);
    galaxySyncDebounceTimer = null;
  }

  galaxySyncDebounceTimer = setTimeout(() => {
    const gInput = document.querySelector('input#galaxy_input') as HTMLInputElement | null;
    const sInput = document.querySelector('input#system_input') as HTMLInputElement | null;
    const targetGalaxy = gInput ? parseInt(gInput.value, 10) : galaxy;
    const targetSystem = sInput ? parseInt(sInput.value, 10) : system;

    if (isNaN(targetGalaxy) || isNaN(targetSystem)) return;

    const currentRows = document.querySelectorAll('.galaxyRow.ctContentRow');
    if (isGalaxyDOMFullySettled(targetGalaxy, targetSystem, currentRows)) {
      syncGalaxyToOverwatch(targetGalaxy, targetSystem, currentRows);
    }
  }, 350);
}

export async function syncGalaxyToOverwatch(galaxy: number, system: number, rows: NodeListOf<Element>) {
  if (!rows || rows.length === 0) return;
  if (!isContextValid()) return;

  // Coordinate detection from inputs or row elements
  let targetGalaxy = galaxy;
  let targetSystem = system;

  if (!targetGalaxy || !targetSystem || isNaN(targetGalaxy) || isNaN(targetSystem)) {
    const gInput = document.querySelector('input#galaxy_input') as HTMLInputElement | null;
    const sInput = document.querySelector('input#system_input') as HTMLInputElement | null;
    if (gInput && sInput) {
      targetGalaxy = parseInt(gInput.value, 10);
      targetSystem = parseInt(sInput.value, 10);
    }
  }

  if (!targetGalaxy || !targetSystem || isNaN(targetGalaxy) || isNaN(targetSystem)) return;

  // Final sanity verification before extraction
  if (!isGalaxyDOMFullySettled(targetGalaxy, targetSystem, rows)) return;

  const currentCoords = `${targetGalaxy}:${targetSystem}`;
  const now = Date.now();
  // Debounce duplicate scans within 3 seconds
  if (currentCoords === lastOverwatchSyncCoords && now - lastOverwatchSyncTime < 3000) {
    return;
  }
  lastOverwatchSyncCoords = currentCoords;
  lastOverwatchSyncTime = now;

  try {
    const store = await chrome.storage.local.get(['nexus_overwatch_config']);
    const config = store.nexus_overwatch_config;
    if (!config || !config.allianceId || !config.authToken || config.permissions?.shareGalaxy === false) {
      return;
    }

    const universe = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content') || config.universeId || 's267-en';
    const ownPlayerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
    const ownPlayerName = document.querySelector('meta[name="ogame-player-name"]')?.getAttribute('content') || '';
    const ownAllianceTag = document.querySelector('meta[name="ogame-alliance-tag"]')?.getAttribute('content') ||
                           document.querySelector('meta[name="ogame-alliance-name"]')?.getAttribute('content') || '';
    const ownAllianceId = document.querySelector('meta[name="ogame-alliance-id"]')?.getAttribute('content') || '';

    const ownCoordsList = getOwnCoordinatesList();

    const slots: any[] = [];
    rows.forEach(row => {
      const posCell = row.querySelector('.cellPosition');
      let slot = posCell ? parseInt(posCell.textContent || '', 10) : 0;
      if (isNaN(slot) || slot <= 0) {
        const rowIdMatch = row.id?.match(/galaxyRow(\d+)/i);
        if (rowIdMatch) slot = parseInt(rowIdMatch[1], 10);
      }
      if (isNaN(slot) || slot <= 0 || slot > 16) return;

      const isEmpty = row.classList.contains('empty_filter');
      const slotCoord = `${targetGalaxy}:${targetSystem}:${slot}`;

      // A slot is ONLY own planet if its exact coordinates match the player's planet list
      const isOwnPlanet = ownCoordsList.includes(slotCoord);

      // 1. Planet ID & Name
      const microplanet = row.querySelector('.microplanet');
      const planetId = microplanet?.getAttribute('data-planet-id') || null;

      let planetName: string | null = null;
      const planetNameSpan = row.querySelector('.cellPlanetName span:not([class*="ogl_"])');
      if (planetNameSpan) {
        planetName = planetNameSpan.textContent?.trim() || null;
      } else if (microplanet) {
        const nameInTooltip = row.querySelector('.cellPlanet .spaceObjectName')?.textContent?.trim();
        if (nameInTooltip) planetName = nameInTooltip;
      }

      // If empty slot filter is on and no planet ID or name is found
      if (isEmpty || (!planetId && !planetName && !isOwnPlanet)) {
        planetName = null;
      }

      // 2. Moon Status & Size
      const micromoon = row.querySelector('.micromoon');
      const hasMoon = (micromoon || row.querySelector('.cellMoon [data-moon-id]')) ? 1 : 0;
      const moonId = micromoon?.getAttribute('data-moon-id') || null;
      let moonSize: number | null = null;

      if (hasMoon) {
        const moonSizeEl = row.querySelector('#moonsize');
        if (moonSizeEl) {
          const sizeParsed = parseInt(moonSizeEl.textContent?.replace(/\D/g, '') || '', 10);
          if (!isNaN(sizeParsed)) moonSize = sizeParsed;
        }
        if (!moonSize) {
          const moonTooltip = row.querySelector('.cellMoon')?.textContent || '';
          const sizeMatch = moonTooltip.match(/(\d+[\.,]?\d*)\s*(?:km|км)/i);
          if (sizeMatch) {
            moonSize = parseInt(sizeMatch[1].replace(/[^\d]/g, ''), 10) || 8000;
          }
        }
      }

      // 3. Player ID, Name, Status & Rank
      let playerId: string | null = null;
      let playerName: string | null = null;
      let playerStatus = 'active';
      let playerRank: number | null = null;

      if (planetName || planetId || isOwnPlanet) {
        const playerCell = row.querySelector('.cellPlayerName');
        if (playerCell) {
          // Player ID
          const directPlayerId = playerCell.querySelector('[data-playerid]')?.getAttribute('data-playerid') ||
                                 playerCell.querySelector('[data-uid]')?.getAttribute('data-uid');
          if (directPlayerId) {
            playerId = directPlayerId;
          } else {
            const playerRel = playerCell.querySelector('.playerName[rel], span[rel^="player"]')?.getAttribute('rel');
            if (playerRel) {
              const match = playerRel.match(/player(\d+)/i);
              if (match) playerId = match[1];
            }
          }

          // Player Name (extract direct text before nested tooltip div, never take pure rank numbers)
          const pNameEl = playerCell.querySelector('.playerName, .playername, span[class*="player"]');
          if (pNameEl) {
            const directText = extractDirectText(pNameEl);
            if (directText && !/^\d+$/.test(directText)) {
              playerName = directText;
            } else {
              const h1Name = pNameEl.querySelector('h1 .playerName, .htmlTooltip .playerName')?.textContent?.trim();
              if (h1Name && !/^\d+$/.test(h1Name)) {
                playerName = h1Name;
              }
            }
          }

          // Fallback for player name if empty or number
          if (!playerName || /^\d+$/.test(playerName)) {
            const clone = playerCell.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.htmlTooltip, .ogl_ranking, .rank, .honorRank, .ogl_tagPicker, .ogl_flagPicker, pre, script, style').forEach(el => el.remove());
            const clean = clone.textContent?.trim().replace(/\s+/g, ' ') || '';
            const sanitized = clean.replace(/\([^)]*\)/g, '').replace(/#\d+/g, '').trim();
            if (sanitized && !/^\d+$/.test(sanitized)) {
              playerName = sanitized;
            }
          }

          // Player Status (Primary source of truth: data-status-tag)
          const statusTagEl = playerCell.querySelector('[data-status-tag]');
          const directTag = statusTagEl?.getAttribute('data-status-tag')?.trim();

          // We only track objective universal player statuses: v (vacation), I (long inactive), i (inactive), b (banned)
          // Relative statuses like hp (honorable), bandit, outlaw depend on viewer score and are excluded
          const allowedStatus = new Set(['v', 'I', 'i', 'b']);

          if (directTag) {
            const parsedTags = directTag
              .split(',')
              .map(t => t.trim())
              .filter(t => allowedStatus.has(t));
            playerStatus = parsedTags.length > 0 ? parsedTags.join(',') : 'active';
          } else {
            // Fallback parsing if data-status-tag is absent
            const statusParts: string[] = [];
            const statusClasses = playerCell.className + ' ' + (playerCell.querySelector('span[class*="status_abbr_"]')?.className || '');
            if (statusClasses.includes('status_abbr_vacation') || playerCell.textContent?.includes('(v)')) statusParts.push('v');
            if (statusClasses.includes('status_abbr_longinactive') || playerCell.textContent?.includes('(I)')) statusParts.push('I');
            else if (statusClasses.includes('status_abbr_inactive') || playerCell.textContent?.includes('(i)')) statusParts.push('i');
            if (statusClasses.includes('status_abbr_banned') || playerCell.textContent?.includes('(b)')) statusParts.push('b');

            playerStatus = statusParts.length > 0 ? statusParts.join(',') : 'active';
          }

          // Player Rank
          const rankEl = playerCell.querySelector('.rank a, .ogl_ranking');
          if (rankEl) {
            const rankNum = parseInt(rankEl.textContent?.replace(/\D/g, '') || '', 10);
            if (!isNaN(rankNum)) playerRank = rankNum;
          }
        }

        // If this coordinate is the user's own planet and no foreign player was extracted
        if (isOwnPlanet && (!playerName || !playerId)) {
          playerId = ownPlayerId || playerId;
          playerName = ownPlayerName || playerName;
          playerStatus = 'active';
        }
      }

      // 4. Alliance Tag & ID
      let allianceTag: string | null = null;
      let allianceId: string | null = null;
      if (planetName || planetId || isOwnPlanet) {
        const allyCell = row.querySelector('.cellAlliance');
        if (allyCell) {
          const allySpan = allyCell.querySelector('span');
          if (allySpan) {
            allianceTag = extractDirectText(allySpan);
            const allyRel = allySpan.getAttribute('rel');
            if (allyRel) {
              const match = allyRel.match(/alliance(\d+)/i);
              if (match) allianceId = match[1];
            }
          }
        }

        if (isOwnPlanet && !allianceTag && (ownAllianceTag || ownAllianceId)) {
          allianceTag = ownAllianceTag || null;
          allianceId = ownAllianceId || null;
        }
      }

      // 5. Activity Marker
      let activityMarker: string | null = null;
      const actEl = row.querySelector('.activity, .minute15, .minute');
      if (actEl) {
        activityMarker = actEl.textContent?.trim() || '*';
      }

      // 6. Debris Field
      let debrisMetal = 0;
      let debrisCrystal = 0;
      const debrisCell = row.querySelector('.cellDebris');
      if (debrisCell) {
        const t = debrisCell.textContent || '';
        if (t.toLowerCase().includes('metal') || t.toLowerCase().includes('crystal')) {
          const metalMatch = t.match(/metal[:\s]*([\d,\.]+)/i);
          const crystalMatch = t.match(/crystal[:\s]*([\d,\.]+)/i);
          if (metalMatch) debrisMetal = parseInt(metalMatch[1].replace(/[^\d]/g, ''), 10) || 0;
          if (crystalMatch) debrisCrystal = parseInt(crystalMatch[1].replace(/[^\d]/g, ''), 10) || 0;
        }
      }

      slots.push({
        slot,
        planetId,
        planetName,
        playerId,
        playerName,
        playerStatus,
        playerRank,
        allianceTag,
        allianceId,
        hasMoon,
        moonId,
        moonSize,
        debrisMetal,
        debrisCrystal,
        activityMarker,
        activityTimestamp: activityMarker ? Date.now() : null,
      });
    });

    if (slots.length === 0) return;

    // Send payload quietly in background to Edge API
    const apiUrl = 'http://127.0.0.1:8787';
    fetch(`${apiUrl}/api/v1/galaxy/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.authToken}`,
      },
      body: JSON.stringify({
        universeId: universe,
        galaxy: targetGalaxy,
        system: targetSystem,
        scannedAt: Date.now(),
        slots,
      }),
    }).catch(() => {});
  } catch (e) {
    // Zero lag impact on OGame page
  }
}


