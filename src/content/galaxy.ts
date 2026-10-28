import { SpiedPlanet, TacticalNote, TacticalNoteTag, TacticalNoteEntry } from '../db';
import { cleanUniverseId } from '../utils/universe';
import { DiscoveredDebrisField } from './assistant/types';
import { debouncedRefreshAssistantBar } from './assistant/assistantBar';
import { getStoredOverwatchConfig } from '../utils/overwatchApi';

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
        Spy this planet 2 times in an interval of at least 2 seconds in order to estimate production. More spies will increase confidence.
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
          // If already viewing this galaxy and system, execute applyGalaxyRings immediately
          const gInput = document.querySelector('input#galaxy_input') as HTMLInputElement | null;
          const sInput = document.querySelector('input#system_input') as HTMLInputElement | null;
          if (gInput && sInput) {
            const curG = parseInt(gInput.value, 10);
            const curS = parseInt(sInput.value, 10);
            if (curG === parts[0] && curS === parts[1]) {
              applyGalaxyRings();
            }
          }
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

/**
 * Extracts the true Galaxy and System coordinates from DOM row elements via consensus voting.
 * This is crucial because extension automations and rapid user scrolling update <input> values
 * hundreds of milliseconds before OGame's AJAX finishes replacing the galaxy table rows.
 */
export function getDOMConsensusCoordinates(rows: NodeListOf<Element> | Element[]): { galaxy: number; system: number } | null {
  if (!rows || rows.length === 0) return null;

  const votes = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowHtml = row.innerHTML || '';

    // 1. Tooltip / Header coordinates like [2:198:1] or [2:250:10]
    const headerMatches = rowHtml.match(/\[(\d+):(\d+):\d+\]/g);
    if (headerMatches) {
      for (const m of headerMatches) {
        const parts = m.slice(1, -1).split(':');
        const g = parseInt(parts[0], 10);
        const s = parseInt(parts[1], 10);
        if (!isNaN(g) && !isNaN(s) && g > 0 && s > 0) {
          const key = `${g}:${s}`;
          votes.set(key, (votes.get(key) || 0) + 1);
        }
      }
    }

    // 2. Fleet dispatch links (e.g. component=fleetdispatch&galaxy=2&system=198&position=1)
    const dispatchMatches = rowHtml.match(/(?:galaxy|&amp;galaxy)=(\d+)&(?:amp;)?(?:system)=(\d+)/g);
    if (dispatchMatches) {
      for (const dm of dispatchMatches) {
        const m = dm.match(/galaxy=(\d+).*?system=(\d+)/);
        if (m) {
          const g = parseInt(m[1], 10);
          const s = parseInt(m[2], 10);
          if (!isNaN(g) && !isNaN(s) && g > 0 && s > 0) {
            const key = `${g}:${s}`;
            votes.set(key, (votes.get(key) || 0) + 1);
          }
        }
      }
    }

    // 3. Spy links (data-spy-coords="2:198:1:1")
    const spyLink = row.querySelector('[data-spy-coords]');
    if (spyLink) {
      const coordsStr = spyLink.getAttribute('data-spy-coords') || '';
      const parts = coordsStr.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
        const key = `${parts[0]}:${parts[1]}`;
        votes.set(key, (votes.get(key) || 0) + 1);
      }
    }

    // 4. Onclick actions: sendShips(mission, galaxy, system, position, ...) or {'galaxy': G, 'system': S}
    const actionEl = row.querySelector('[onclick*="discoverPlanet"], [onclick*="movePlanet"], [onclick*="sendShips"]');
    if (actionEl) {
      const onclickStr = actionEl.getAttribute('onclick') || '';
      const match = onclickStr.match(/'galaxy':\s*(\d+),\s*'system':\s*(\d+)/) ||
                    onclickStr.match(/sendShips\(\s*\d+,\s*(\d+),\s*(\d+)/);
      if (match) {
        const g = parseInt(match[1], 10);
        const s = parseInt(match[2], 10);
        if (!isNaN(g) && !isNaN(s) && g > 0 && s > 0) {
          const key = `${g}:${s}`;
          votes.set(key, (votes.get(key) || 0) + 1);
        }
      }
    }
  }

  if (votes.size === 0) return null;

  let maxVotes = -1;
  let winner: { galaxy: number; system: number } | null = null;
  for (const [key, count] of votes.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      const [g, s] = key.split(':').map(Number);
      winner = { galaxy: g, system: s };
    }
  }

  return winner;
}

/**
 * Verifies that the OGame Galaxy DOM has genuinely settled and belongs to target coordinates.
 * Prevents transient/stale DOM from being scraped during rapid user scrolling.
 */
export function isGalaxyDOMFullySettled(targetGalaxy: number, targetSystem: number, rows: NodeListOf<Element> | Element[]): boolean {
  if (!rows || rows.length < 15) return false;

  // 1. Check if galaxyLoading indicator is active or displays old coordinates
  const loadingEl = document.getElementById('galaxyLoading');
  if (loadingEl) {
    const isVisible = window.getComputedStyle(loadingEl).display !== 'none' && loadingEl.style.display !== 'none';
    if (isVisible) return false;

    const currentPos = loadingEl.getAttribute('data-currentposition');
    if (currentPos) {
      const parts = currentPos.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        if (parts[0] !== targetGalaxy || parts[1] !== targetSystem) {
          return false;
        }
      }
    }
  }

  // 2. Cross-verify via consensus coordinates extracted directly from DOM row elements
  const consensus = getDOMConsensusCoordinates(rows);
  if (consensus) {
    if (consensus.galaxy !== targetGalaxy || consensus.system !== targetSystem) {
      return false; // Row elements belong to a different/stale system!
    }
    return true;
  }

  // Fallback: If no action/dispatch links were present (e.g. empty solar system), verify input values match
  const gInput = document.querySelector('input#galaxy_input') as HTMLInputElement | null;
  const sInput = document.querySelector('input#system_input') as HTMLInputElement | null;
  if (gInput && sInput) {
    const curG = parseInt(gInput.value, 10);
    const curS = parseInt(sInput.value, 10);
    if (curG !== targetGalaxy || curS !== targetSystem) {
      return false;
    }
  }

  return true;
}

/**
 * Rocksolid parser for player status (v, I, i, b, n, o, active) from OGame galaxy row.
 * Immune to DOM injection from other extensions (OGLight, AGR, Infinity, PTRE) and independent of locale.
 */
export function extractPlayerStatusFromRow(playerCell: Element, row: Element): {
  tags: string[];
  statusString: string;
  isVacation: boolean;
  isLongInactive: boolean;
  isShortInactive: boolean;
  isBanned: boolean;
  isNoob: boolean;
  isOutlaw: boolean;
  isActive: boolean;
} {
  const allowedStatus = new Set(['v', 'I', 'i', 'b', 'n', 'o']);

  // Step A: Check OGLight data-status-tag first
  const statusTagEl = playerCell.querySelector('[data-status-tag]');
  const directTag = statusTagEl?.getAttribute('data-status-tag')?.trim();

  let tags: string[] = [];

  if (directTag) {
    tags = directTag
      .split(',')
      .map(t => t.trim())
      .filter(t => allowedStatus.has(t));
  } else {
    // Step B: Check <pre> tag specifically.
    // OGame only renders a <pre> tag inside .cellPlayerName if status abbreviations exist.
    const preEl = playerCell.querySelector('pre');
    if (preEl) {
      const preText = preEl.textContent || '';
      const preClasses = Array.from(preEl.querySelectorAll('[class*="status_abbr_"]'))
        .map(s => s.className)
        .join(' ');

      // Vacation (v)
      const hasV = preClasses.includes('status_abbr_vacation') ||
                   row.classList.contains('vacation_filter') ||
                   /\bv\b/i.test(preText);

      // Inactive: Long inactive 28d (I) vs Short inactive 7d (i)
      // Note: 'I' is case-sensitive capital I in OGame
      const hasI = preClasses.includes('status_abbr_longinactive') ||
                   /\bI\b/.test(preText) ||
                   preText.includes('28');

      const hasIshort = !hasI && (
        preClasses.includes('status_abbr_inactive') ||
        /\bi\b/.test(preText) ||
        preText.includes('7')
      );

      // Banned (b)
      const hasB = preClasses.includes('status_abbr_banned') ||
                   row.classList.contains('banned_filter') ||
                   /\bb\b/i.test(preText);

      // Newbie (n)
      const hasN = preClasses.includes('status_abbr_noob') ||
                   row.classList.contains('newbie_filter') ||
                   /\bn\b/i.test(preText);

      // Outlaw (o)
      const hasO = preClasses.includes('status_abbr_outlaw') ||
                   /\bo\b/i.test(preText);

      if (hasV) tags.push('v');
      if (hasI) tags.push('I');
      else if (hasIshort) tags.push('i');
      if (hasB) tags.push('b');
      if (hasN) tags.push('n');
      if (hasO) tags.push('o');
    } else {
      // No <pre> tag -> player has no status abbreviation (active player).
      // Check row filter classes as a strict fallback
      if (row.classList.contains('vacation_filter')) {
        tags.push('v');
      } else if (row.classList.contains('banned_filter')) {
        tags.push('b');
      } else if (row.classList.contains('inactive_filter')) {
        tags.push('i');
      } else if (row.classList.contains('newbie_filter')) {
        tags.push('n');
      }
    }
  }

  const isVacation = tags.includes('v');
  const isLongInactive = tags.includes('I');
  const isShortInactive = tags.includes('i');
  const isBanned = tags.includes('b');
  const isNoob = tags.includes('n');
  const isOutlaw = tags.includes('o');
  const isActive = tags.length === 0;
  const statusString = tags.length > 0 ? tags.join(',') : 'active';

  return {
    tags,
    statusString,
    isVacation,
    isLongInactive,
    isShortInactive,
    isBanned,
    isNoob,
    isOutlaw,
    isActive,
  };
}


// ============================================================================
// NEXUS GALAXY TACTICAL DOSSIERS & INTERACTIVE NUMBERING COLUMN
// ============================================================================

let tacticalNotesCache: TacticalNote[] = [];
let isTacticalNotesLoading = false;
let isTacticalNotesLoaded = false;

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function getNoteEntries(note?: TacticalNote): TacticalNoteEntry[] {
  if (!note) return [];
  if (Array.isArray(note.entries) && note.entries.length > 0) {
    return note.entries;
  }
  if (note.text && note.text.trim()) {
    return [{
      id: `legacy_${note.createdAt || note.updatedAt || Date.now()}`,
      text: note.text.trim(),
      tag: note.tag || '',
      timestamp: note.createdAt || note.updatedAt || Date.now()
    }];
  }
  return [];
}

function formatNoteTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Today ${timeStr}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${timeStr}`;
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
}

export function reloadTacticalNotesCache(onDone?: () => void) {
  if (isTacticalNotesLoading) return;
  isTacticalNotesLoading = true;
  const rawUni = document.querySelector('meta[name="ogame-universe"]')?.getAttribute("content") || "unknown";
  const universe = cleanUniverseId(rawUni);

  if (!isContextValid()) {
    isTacticalNotesLoading = false;
    return;
  }

  chrome.runtime.sendMessage({ type: "GET_ALL_TACTICAL_NOTES", data: { universe } }, (response) => {
    isTacticalNotesLoading = false;
    if (chrome.runtime.lastError) return;
    if (response && response.success) {
      tacticalNotesCache = response.notes || [];
      isTacticalNotesLoaded = true;
      const gInput = document.querySelector('input#galaxy_input') as HTMLInputElement | null;
      const sInput = document.querySelector('input#system_input') as HTMLInputElement | null;
      const rows = document.querySelectorAll('.galaxyRow.ctContentRow');
      if (gInput && sInput && rows.length >= 15) {
        const g = parseInt(gInput.value, 10);
        const s = parseInt(sInput.value, 10);
        if (!isNaN(g) && !isNaN(s)) {
          applyTacticalSlotEnhancements(g, s, rows);
        }
      }
      onDone?.();
    }
  });
}

function findTacticalNotesForSlot(coords: string, playerId?: string, playerName?: string) {
  const coordNote = tacticalNotesCache.find(n => n.targetType === 'coordinate' && n.targetId === coords);
  let playerNote: TacticalNote | undefined;
  if (playerId || playerName) {
    const cleanPlayer = (playerName || '').toLowerCase().trim();
    const cleanPid = String(playerId || '').trim();
    playerNote = tacticalNotesCache.find(n => {
      if (n.targetType !== 'player') return false;
      if (cleanPid && n.targetId === cleanPid) return true;
      if (cleanPlayer && n.targetId.toLowerCase().trim() === cleanPlayer) return true;
      if (cleanPlayer && n.playerName && n.playerName.toLowerCase().trim() === cleanPlayer) return true;
      return false;
    });
  }
  return {
    coordNote,
    playerNote,
    activeNote: coordNote || playerNote
  };
}

interface TacticalSlotContext {
  galaxy: number;
  system: number;
  position: number;
  coords: string;
  playerId: string;
  playerName: string;
  allianceTag: string;
  isSlotEmpty: boolean;
}

function applyTacticalSlotEnhancements(galaxy: number, system: number, rows: NodeListOf<Element>) {
  if (!isTacticalNotesLoaded && !isTacticalNotesLoading) {
    reloadTacticalNotesCache();
  }

  // Enhance "Planet" header column with sleek note affordance and tooltip
  const headCell = document.querySelector('.galaxyRow.ctGalaxyHead .galaxyCell.span1-2') as HTMLElement | null;
  if (headCell && !headCell.hasAttribute('data-nexus-note-hint')) {
    headCell.setAttribute('data-nexus-note-hint', 'true');
    headCell.setAttribute('title', 'Planet & Slot Numbers: Click any slot number below to add or view notes');
  }

  rows.forEach(row => {
    const posCell = row.querySelector('.cellPosition') as HTMLElement | null;
    const playerCell = row.querySelector('.cellPlayerName') as HTMLElement | null;
    if (!posCell) return;

    const position = parseInt(posCell.textContent?.trim() || '', 10);
    if (isNaN(position) || position <= 0 || position > 16) return;

    const targetCoords = `${galaxy}:${system}:${position}`;

    // Extract occupant details
    let playerId = '';
    let playerName = '';
    let allianceTag = '';
    const isSlotEmpty = row.classList.contains('empty_filter') && !row.querySelector('.microplanet') && !row.querySelector('.cellPlanetName')?.textContent?.trim();

    if (playerCell) {
      const pIdAttr = playerCell.querySelector('[data-playerid]')?.getAttribute('data-playerid') ||
                      playerCell.querySelector('[data-player-id]')?.getAttribute('data-player-id') ||
                      playerCell.querySelector('[data-uid]')?.getAttribute('data-uid');
      if (pIdAttr) {
        playerId = pIdAttr;
      } else {
        const pRel = playerCell.querySelector('span[rel^="player"]')?.getAttribute('rel');
        const match = pRel?.match(/player(\d+)/i);
        if (match) playerId = match[1];
      }

      const pNameEl = playerCell.querySelector('.playerName, .playername, span[rel^="player"]');
      if (pNameEl) {
        const directClean = extractDirectText(pNameEl).replace(/\s*\([viInob, ]+\)\s*/gi, '').trim();
        if (directClean && !directClean.startsWith('#')) {
          playerName = directClean;
        }
      }
      if (!playerName) {
        const clone = playerCell.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.htmlTooltip, .ogl_ranking, .rank, .honorRank, .ogl_tagPicker, .ogl_flagPicker, pre, script, style').forEach(el => el.remove());
        const clean = clone.textContent?.trim().replace(/\s+/g, ' ') || '';
        const sanitized = clean.replace(/\([^)]*\)/g, '').replace(/#\d+/g, '').trim();
        if (sanitized && !sanitized.startsWith('#')) {
          playerName = sanitized;
        }
      }
    }

    const allyCell = row.querySelector('.cellAlliance') as HTMLElement | null;
    if (allyCell) {
      const allySpan = allyCell.querySelector('span');
      if (allySpan) {
        allianceTag = extractDirectText(allySpan).trim();
      }
    }

    const { coordNote, playerNote, activeNote } = findTacticalNotesForSlot(targetCoords, playerId, playerName);

    // Apply high-end interactive affordances to the slot number
    posCell.classList.add('nexus-tactical-slot');
    posCell.classList.remove('has-tactical-note', 'tag-threat', 'tag-farm', 'tag-ally', 'tag-moonkill', 'tag-intel', 'tag-custom');

    if (activeNote) {
      posCell.classList.add('has-tactical-note');
      const activeTag = activeNote.tag || (activeNote.entries && activeNote.entries[0]?.tag) || '';
      if (activeTag) {
        posCell.classList.add(`tag-${activeTag}`);
      }
      const tagLabel = activeTag ? activeTag.toUpperCase() : 'NOTES';
      const targetLabel = activeNote.targetType === 'player' ? `👤 ${activeNote.playerName || playerName || 'Player'}` : `🪐 [${targetCoords}]`;
      const entries = getNoteEntries(activeNote);
      const countLabel = entries.length > 1 ? ` (${entries.length} notes)` : '';
      const latestText = entries.length > 0 ? entries[0].text : (activeNote.text || '');
      const snippet = latestText ? `\n"${latestText.slice(0, 75)}${latestText.length > 75 ? '...' : ''}"` : '';
      posCell.setAttribute('title', `[${tagLabel}] ${targetLabel}${countLabel}${snippet}\nClick to view notes & add entries`);
    } else {
      posCell.setAttribute('title', `Slot ${position} [${targetCoords}]: Click to add notes`);
    }

    // Attach click handler for modal
    const oldClick = (posCell as any)._ogNexusSlotClick;
    if (oldClick) {
      posCell.removeEventListener('click', oldClick);
    }
    const onSlotClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openTacticalDossierModal({
        galaxy,
        system,
        position,
        coords: targetCoords,
        playerId,
        playerName,
        allianceTag,
        isSlotEmpty
      });
    };
    posCell.addEventListener('click', onSlotClick);
    (posCell as any)._ogNexusSlotClick = onSlotClick;
  });
}

function openTacticalDossierModal(ctx: TacticalSlotContext) {
  let overlay = document.getElementById('nexus-tactical-dossier-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'nexus-tactical-dossier-overlay';
    overlay.className = 'nexus-dossier-overlay';
    // Append directly to documentElement to avoid any body margins/overflow bounds
    document.documentElement.appendChild(overlay);
  }

  const { coordNote, playerNote } = findTacticalNotesForSlot(ctx.coords, ctx.playerId, ctx.playerName);
  
  // Decide default scope: if coordNote exists, use 'coordinate'. Else if playerNote exists, use 'player'.
  let activeScope: 'coordinate' | 'player' = 'coordinate';
  if (coordNote) {
    activeScope = 'coordinate';
  } else if (playerNote && ctx.playerName) {
    activeScope = 'player';
  } else {
    activeScope = 'coordinate';
  }

  const rawUni = document.querySelector('meta[name="ogame-universe"]')?.getAttribute("content") || "unknown";
  const universe = cleanUniverseId(rawUni);

  const getTargetKey = (scope: 'coordinate' | 'player'): string => {
    return scope === 'coordinate' ? `coord:${universe}:${ctx.coords}` : `player:${universe}:${ctx.playerId || ctx.playerName.toLowerCase()}`;
  };

  const getCurrentNoteForScope = (scope: 'coordinate' | 'player'): TacticalNote | undefined => {
    const key = getTargetKey(scope);
    return tacticalNotesCache.find(n => n.noteKey === key);
  };

  interface DisplayNoteEntry extends TacticalNoteEntry {
    sourceNoteKey: string;
    sourceTargetType: 'coordinate' | 'player';
  }

  let currentNote = getCurrentNoteForScope(activeScope);
  let currentTag: TacticalNoteTag = currentNote?.tag || '';
  let editingEntryId: string | null = null;
  let editingSourceKey: string | null = null;

  overlay.innerHTML = `
    <div class="nexus-dossier-shell" onclick="event.stopPropagation()">
      <div class="nexus-dossier-core">
        <div class="nexus-dossier-ambient"></div>
        
        <!-- Header -->
        <div class="nexus-dossier-header">
          <div>
            <div class="nexus-dossier-eyebrow">Player Briefing</div>
            <h3 class="nexus-dossier-title">
              Slot ${ctx.position} • <span class="target-highlight">[${ctx.coords}]</span>
            </h3>
            <div class="nexus-dossier-subtitle">
              ${ctx.playerName ? `<span>Player: <strong style="color:#e2e8f0">${ctx.playerName}</strong></span>` : '<span style="color:#64748b">Uncolonized Coordinate</span>'}
              ${ctx.allianceTag ? `<span style="color:#38bdf8">[${ctx.allianceTag}]</span>` : ''}
            </div>
          </div>
          <button type="button" class="nexus-dossier-close-btn" id="nexus-dossier-close" title="Close">✕</button>
        </div>

        <!-- Scope Switcher -->
        <div class="nexus-scope-bar">
          <button type="button" class="nexus-scope-tab ${activeScope === 'coordinate' ? 'active' : ''}" id="nexus-scope-coord">
            🪐 Coordinate [${ctx.coords}]
          </button>
          <button type="button" class="nexus-scope-tab ${activeScope === 'player' ? 'active' : ''}" id="nexus-scope-player" ${!ctx.playerName ? 'disabled title="No player occupies this slot"' : ''}>
            👤 Player: ${ctx.playerName || '(None)'}
          </button>
        </div>

        <!-- Types (1-Line Layout) -->
        <div class="nexus-tags-section">
          <div class="nexus-tags-label">Type</div>
          <div class="nexus-tags-grid">
            <button type="button" class="nexus-tag-btn tag-threat ${currentTag === 'threat' ? 'active' : ''}" data-tag="threat">
              <span class="tag-dot"></span>
              <span class="tag-main">Threat</span>
              <span class="tag-sub">Hostile</span>
            </button>
            <button type="button" class="nexus-tag-btn tag-farm ${currentTag === 'farm' ? 'active' : ''}" data-tag="farm">
              <span class="tag-dot"></span>
              <span class="tag-main">Prime</span>
              <span class="tag-sub">Farm</span>
            </button>
            <button type="button" class="nexus-tag-btn tag-ally ${currentTag === 'ally' ? 'active' : ''}" data-tag="ally">
              <span class="tag-dot"></span>
              <span class="tag-main">Ally</span>
              <span class="tag-sub">Trade</span>
            </button>
            <button type="button" class="nexus-tag-btn tag-moonkill ${currentTag === 'moonkill' ? 'active' : ''}" data-tag="moonkill">
              <span class="tag-dot"></span>
              <span class="tag-main">Moonkill</span>
              <span class="tag-sub">Target</span>
            </button>
            <button type="button" class="nexus-tag-btn tag-intel ${currentTag === 'intel' ? 'active' : ''}" data-tag="intel">
              <span class="tag-dot"></span>
              <span class="tag-main">Intel</span>
              <span class="tag-sub">Watch</span>
            </button>
            <button type="button" class="nexus-tag-btn tag-custom ${currentTag === 'custom' ? 'active' : ''}" data-tag="custom">
              <span class="tag-dot"></span>
              <span class="tag-main">Custom</span>
              <span class="tag-sub">General</span>
            </button>
          </div>
        </div>

        <!-- Recorded Notes (3 Per Line Grid) -->
        <div class="nexus-entries-section">
          <div class="nexus-entries-header">
            <span class="nexus-entries-label">
              <span>Recorded Notes</span>
              <span id="nexus-entries-count" style="color:#00f2ff; font-weight:800;"></span>
            </span>
            <span style="font-size:9.5px; color:#64748b;">Click any note to read/edit</span>
          </div>
          <div class="nexus-entries-container" id="nexus-entries-list">
            <!-- Dynamic note cards injected here -->
          </div>
        </div>

        <!-- Note Composer -->
        <div class="nexus-composer-section">
          <div class="nexus-composer-header">
            <span class="nexus-composer-label" id="nexus-composer-title">+ Add Note</span>
            <span style="font-size:10px; color:#64748b;">Press Enter to save</span>
          </div>
          <textarea
            class="nexus-note-textarea"
            id="nexus-dossier-textarea"
            placeholder="Write a note (fleet, defense, schedule, trade)..."
          ></textarea>
          <div class="nexus-composer-actions">
            <button type="button" class="nexus-btn-add-entry" id="nexus-btn-add-entry">
              + Add Note
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="nexus-dossier-footer">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div class="nexus-dossier-status-pill" id="nexus-dossier-status">
              ✓ Saved locally
            </div>
            <div class="nexus-dossier-vault-hint">
              <span>🔒 Vault sync available in Overwatch</span>
            </div>
          </div>

          <div class="nexus-dossier-actions">
            <button type="button" class="nexus-btn-delete" id="nexus-dossier-clear-all" style="display:none;">
              Clear All Notes
            </button>
            <button type="button" class="nexus-btn-primary" id="nexus-dossier-done">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Animate in
  requestAnimationFrame(() => {
    overlay?.classList.add('visible');
  });

  const textarea = overlay.querySelector('#nexus-dossier-textarea') as HTMLTextAreaElement;
  const statusEl = overlay.querySelector('#nexus-dossier-status') as HTMLElement;
  const clearAllBtn = overlay.querySelector('#nexus-dossier-clear-all') as HTMLElement;
  const addEntryBtn = overlay.querySelector('#nexus-btn-add-entry') as HTMLElement;
  const doneBtn = overlay.querySelector('#nexus-dossier-done') as HTMLElement;
  const closeBtn = overlay.querySelector('#nexus-dossier-close') as HTMLElement;
  const tabCoord = overlay.querySelector('#nexus-scope-coord') as HTMLElement;
  const tabPlayer = overlay.querySelector('#nexus-scope-player') as HTMLElement;
  const tagBtns = overlay.querySelectorAll('.nexus-tag-btn');
  const entriesList = overlay.querySelector('#nexus-entries-list') as HTMLElement;
  const entriesCount = overlay.querySelector('#nexus-entries-count') as HTMLElement;
  const composerTitle = overlay.querySelector('#nexus-composer-title') as HTMLElement;

  const resetComposer = () => {
    editingEntryId = null;
    editingSourceKey = null;
    textarea.value = '';
    composerTitle.innerHTML = '+ Add Note';
    addEntryBtn.textContent = '+ Add Note';
    if (entriesList) {
      entriesList.querySelectorAll('.nexus-entry-card').forEach(c => c.classList.remove('is-editing'));
    }
  };

  // Collect display entries based on active scope
  const getDisplayEntries = (): DisplayNoteEntry[] => {
    if (activeScope === 'coordinate') {
      currentNote = getCurrentNoteForScope('coordinate');
      const base = getNoteEntries(currentNote);
      return base.map(e => ({
        ...e,
        coords: e.coords || ctx.coords,
        sourceNoteKey: currentNote?.noteKey || getTargetKey('coordinate'),
        sourceTargetType: 'coordinate'
      }));
    } else {
      // Player tab: show ALL notes related to this player regardless of coordinate!
      currentNote = getCurrentNoteForScope('player');

      // 1. Direct player note entries (no coordinate, just player emoji)
      const playerEntries: DisplayNoteEntry[] = getNoteEntries(currentNote).map(e => ({
        ...e,
        coords: undefined, // Player notes have no coords
        sourceNoteKey: currentNote?.noteKey || getTargetKey('player'),
        sourceTargetType: 'player'
      }));

      // 2. All coordinate notes for this player across universe
      const relatedCoordNotes = tacticalNotesCache.filter(n =>
        n.targetType === 'coordinate' && (
          (ctx.playerId && n.playerId && n.playerId === ctx.playerId) ||
          (ctx.playerName && n.playerName && n.playerName.toLowerCase() === ctx.playerName.toLowerCase()) ||
          (ctx.playerName && n.coords === ctx.coords)
        )
      );

      const coordEntries: DisplayNoteEntry[] = [];
      relatedCoordNotes.forEach(cn => {
        getNoteEntries(cn).forEach(e => {
          coordEntries.push({
            ...e,
            coords: e.coords || cn.coords || cn.targetId,
            sourceNoteKey: cn.noteKey,
            sourceTargetType: 'coordinate'
          });
        });
      });

      // Deduplicate by entry id
      const seen = new Set<string>();
      const combined: DisplayNoteEntry[] = [];
      [...playerEntries, ...coordEntries].forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          combined.push(item);
        }
      });

      // Sort newest first
      combined.sort((a, b) => b.timestamp - a.timestamp);
      return combined;
    }
  };

  let activeDisplayEntries: DisplayNoteEntry[] = [];

  // Render the past notes grid (3 per line)
  const renderTimeline = () => {
    activeDisplayEntries = getDisplayEntries();

    if (entriesCount) {
      entriesCount.textContent = activeDisplayEntries.length > 0 ? `(${activeDisplayEntries.length})` : '';
    }

    if (clearAllBtn) {
      clearAllBtn.style.display = activeDisplayEntries.length > 0 ? 'inline-block' : 'none';
    }

    if (!entriesList) return;

    if (activeDisplayEntries.length === 0) {
      entriesList.innerHTML = `
        <div class="nexus-entries-empty">
          No notes recorded yet for this ${activeScope === 'coordinate' ? 'coordinate' : 'player'}.<br/>
          Write below and press Enter or click <strong>+ Add Note</strong>.
        </div>
      `;
      return;
    }

    entriesList.innerHTML = activeDisplayEntries.map(entry => {
      const tagHtml = entry.tag ? `
        <span class="nexus-entry-tag-badge badge-${entry.tag}">
          <span class="dot"></span>${entry.tag}
        </span>
      ` : '';

      const coordHtml = entry.coords ? `
        <span class="nexus-entry-coord-pill" title="Recorded at [${escapeHtml(entry.coords)}]">
          🪐 [${escapeHtml(entry.coords)}]
        </span>
      ` : `
        <span class="nexus-entry-coord-pill is-player" title="Recorded for player ${escapeHtml(ctx.playerName || 'Player')}">
          👤
        </span>
      `;

      const isEditingClass = editingEntryId === entry.id ? 'is-editing' : '';

      return `
        <div class="nexus-entry-card ${isEditingClass}" data-entry-id="${entry.id}" data-source-key="${entry.sourceNoteKey}">
          <div class="nexus-entry-header">
            <div class="nexus-entry-badge-wrap">
              ${tagHtml}
              ${coordHtml}
            </div>
            <button type="button" class="nexus-entry-del-btn" data-delete-id="${entry.id}" data-source-key="${entry.sourceNoteKey}" title="Delete this note">✕</button>
          </div>
          <div class="nexus-entry-text" title="${escapeHtml(entry.text)}">${escapeHtml(entry.text)}</div>
          <div class="nexus-entry-footer">
            <span class="nexus-entry-time">${formatNoteTime(entry.timestamp)}</span>
            <span class="nexus-entry-click-hint">Edit ✎</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers (edit/read or delete)
    entriesList.querySelectorAll('.nexus-entry-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const delBtnClicked = target.closest('.nexus-entry-del-btn') as HTMLElement | null;
        if (delBtnClicked) {
          e.stopPropagation();
          const idToDelete = delBtnClicked.getAttribute('data-delete-id');
          const sourceKey = delBtnClicked.getAttribute('data-source-key');
          if (idToDelete && sourceKey) {
            deleteSingleEntry(idToDelete, sourceKey);
          }
          return;
        }

        // Card clicked to read/edit
        const entryId = card.getAttribute('data-entry-id');
        const entry = activeDisplayEntries.find(x => x.id === entryId);
        if (!entry) return;

        editingEntryId = entry.id;
        editingSourceKey = entry.sourceNoteKey;
        textarea.value = entry.text;
        currentTag = entry.tag || '';
        updateTagButtonsUI();

        const locHint = entry.coords ? `[${entry.coords}]` : `👤 ${ctx.playerName || 'Player'}`;
        composerTitle.innerHTML = `<span style="color:#00f2ff">Editing Note</span> <span style="font-size:9.5px; color:#64748b;">(${locHint} • ${formatNoteTime(entry.timestamp)})</span> <button type="button" id="nexus-cancel-edit-btn" style="background:none; border:none; color:#00f2ff; cursor:pointer; font-size:10.5px; margin-left:6px; text-decoration:underline;">(Cancel)</button>`;
        const cancelBtn = overlay.querySelector('#nexus-cancel-edit-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', (ce) => {
            ce.stopPropagation();
            resetComposer();
          });
        }

        addEntryBtn.textContent = 'Save Edit';

        entriesList.querySelectorAll('.nexus-entry-card').forEach(c => {
          if (c.getAttribute('data-entry-id') === entry.id) {
            c.classList.add('is-editing');
          } else {
            c.classList.remove('is-editing');
          }
        });

        textarea.focus();
      });
    });
  };

  const updateTagButtonsUI = () => {
    tagBtns.forEach(b => {
      const tag = b.getAttribute('data-tag');
      if (tag === currentTag) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  };

  // Persist specific TacticalNote object
  const persistSpecificNote = (noteToSave: TacticalNote, onDone?: () => void) => {
    if (statusEl) statusEl.innerHTML = `<span style="color:#00f2ff">● Saving...</span>`;

    chrome.runtime.sendMessage({ type: "SAVE_TACTICAL_NOTE", data: { note: noteToSave } }, (resp) => {
      if (resp && resp.success) {
        const idx = tacticalNotesCache.findIndex(n => n.noteKey === noteToSave.noteKey);
        if (idx >= 0) {
          tacticalNotesCache[idx] = noteToSave;
        } else {
          tacticalNotesCache.push(noteToSave);
        }
        applyGalaxyRings();
        renderTimeline();
        if (statusEl) statusEl.innerHTML = `<span style="color:#10b981">✓ Saved locally</span>`;
      } else {
        if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444">Error saving</span>`;
      }
      onDone?.();
    });
  };

  // Add new note entry or save existing edit
  const submitComposerEntry = () => {
    const textVal = textarea.value.trim();
    if (!textVal) return;

    if (editingEntryId && editingSourceKey) {
      // Saving edit to existing entry
      const sourceNote = tacticalNotesCache.find(n => n.noteKey === editingSourceKey);
      if (sourceNote) {
        const existingEntries = getNoteEntries(sourceNote);
        const updatedEntries = existingEntries.map(e => {
          if (e.id === editingEntryId) {
            return {
              ...e,
              text: textVal,
              tag: currentTag,
              timestamp: Date.now()
            };
          }
          return e;
        });

        const updatedNote: TacticalNote = {
          ...sourceNote,
          tag: currentTag || updatedEntries[0]?.tag || '',
          text: updatedEntries[0]?.text || textVal,
          entries: updatedEntries,
          updatedAt: Date.now()
        };

        resetComposer();
        persistSpecificNote(updatedNote, () => {
          textarea.focus();
        });
        return;
      }
    }

    // Brand new entry
    // Requirement 3: when creating a Player tab note, don't record coordinate, just a player emoji!
    // Requirement 1: for coordinate tab note, record coordinate!
    const newEntryCoords = activeScope === 'coordinate' ? ctx.coords : undefined;

    const newEntry: TacticalNoteEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: textVal,
      tag: currentTag,
      timestamp: Date.now(),
      coords: newEntryCoords
    };

    const targetKey = getTargetKey(activeScope);
    const targetNote = tacticalNotesCache.find(n => n.noteKey === targetKey);
    const existingEntries = getNoteEntries(targetNote);
    const updatedEntries = [newEntry, ...existingEntries];

    const noteToSave: TacticalNote = {
      noteKey: targetKey,
      universe,
      targetType: activeScope,
      targetId: activeScope === 'coordinate' ? ctx.coords : (ctx.playerId || ctx.playerName.toLowerCase()),
      coords: activeScope === 'coordinate' ? ctx.coords : undefined,
      playerId: ctx.playerId || undefined,
      playerName: ctx.playerName || undefined,
      allianceTag: ctx.allianceTag || undefined,
      tag: currentTag || updatedEntries[0]?.tag || '',
      text: textVal,
      entries: updatedEntries,
      updatedAt: Date.now(),
      createdAt: targetNote?.createdAt || Date.now()
    };

    resetComposer();
    persistSpecificNote(noteToSave, () => {
      textarea.focus();
    });
  };

  // Delete an individual entry
  const deleteSingleEntry = (entryId: string, sourceKey: string) => {
    if (editingEntryId === entryId) {
      resetComposer();
    }
    const sourceNote = tacticalNotesCache.find(n => n.noteKey === sourceKey);
    if (!sourceNote) return;

    const existingEntries = getNoteEntries(sourceNote);
    const remaining = existingEntries.filter(e => e.id !== entryId);

    if (remaining.length === 0) {
      chrome.runtime.sendMessage({ type: "DELETE_TACTICAL_NOTE", data: { noteKey: sourceKey } }, () => {
        tacticalNotesCache = tacticalNotesCache.filter(n => n.noteKey !== sourceKey);
        applyGalaxyRings();
        renderTimeline();
        if (statusEl) statusEl.innerHTML = `<span style="color:#64748b">Note deleted</span>`;
      });
    } else {
      const updatedNote: TacticalNote = {
        ...sourceNote,
        entries: remaining,
        text: remaining[0].text,
        tag: remaining[0].tag || currentTag || '',
        updatedAt: Date.now()
      };
      persistSpecificNote(updatedNote);
    }
  };

  // Clear all notes for active scope
  clearAllBtn.addEventListener('click', () => {
    resetComposer();
    const targetKey = getTargetKey(activeScope);
    chrome.runtime.sendMessage({ type: "DELETE_TACTICAL_NOTE", data: { noteKey: targetKey } }, () => {
      tacticalNotesCache = tacticalNotesCache.filter(n => n.noteKey !== targetKey);
      applyGalaxyRings();
      renderTimeline();
      if (statusEl) statusEl.innerHTML = `<span style="color:#64748b">Notes cleared</span>`;
    });
  });

  // Type button clicks (sets classification for target & new entries)
  tagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const clickedTag = btn.getAttribute('data-tag') as TacticalNoteTag;
      if (currentTag === clickedTag) {
        currentTag = ''; // Toggle off
      } else {
        currentTag = clickedTag;
      }
      updateTagButtonsUI();

      // If a note already exists for active scope, update its primary tag immediately
      const activeNote = getCurrentNoteForScope(activeScope);
      if (activeNote) {
        const noteToSave: TacticalNote = {
          ...activeNote,
          tag: currentTag,
          updatedAt: Date.now()
        };
        persistSpecificNote(noteToSave);
      }
    });
  });

  // Add entry button click
  addEntryBtn.addEventListener('click', submitComposerEntry);

  // Keyboard shortcut: Enter or Ctrl+Enter in textarea adds/updates the note
  textarea.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (!e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitComposerEntry();
    }
  });

  // Scope switcher
  const switchScope = (newScope: 'coordinate' | 'player') => {
    if (newScope === activeScope) return;
    if (newScope === 'player' && !ctx.playerName) return;

    resetComposer();

    activeScope = newScope;
    if (activeScope === 'coordinate') {
      tabCoord.classList.add('active');
      tabPlayer.classList.remove('active');
    } else {
      tabPlayer.classList.add('active');
      tabCoord.classList.remove('active');
    }

    currentNote = getCurrentNoteForScope(activeScope);
    currentTag = currentNote?.tag || '';
    updateTagButtonsUI();
    renderTimeline();
    textarea.value = '';
    textarea.focus();
  };

  tabCoord.addEventListener('click', () => switchScope('coordinate'));
  tabPlayer.addEventListener('click', () => switchScope('player'));

  // Close handlers
  const closeModal = () => {
    if (textarea.value.trim() && !editingEntryId) {
      submitComposerEntry();
    }
    overlay?.classList.remove('visible');
    document.removeEventListener('keydown', onKeyDown);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  doneBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  };

  // Initial render
  renderTimeline();
  updateTagButtonsUI();
  setTimeout(() => textarea?.focus(), 60);
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

  // Precaution: Ensure the rendered DOM rows genuinely belong to the active galaxy & system
  if (!isGalaxyDOMFullySettled(galaxy, system, rows)) {
    return;
  }

  // Scan and persist galaxy debris field opportunities (including Slot 16 Deep Space)
  const allDebrisRows = document.querySelectorAll('.galaxyRow.ctContentRow, .expeditionDebrisSlotBoxRow, #galaxyRow16');
  scanGalaxyDebrisFields(galaxy, system, allDebrisRows);

  // Sync scanned system to Nexus Overwatch (debounced + verified DOM settlement to prevent stale data on fast scrolling)
  scheduleGalaxySyncToOverwatch(galaxy, system);

  // Enhance slot numbers with subtle tactical indicators & dossier popovers
  applyTacticalSlotEnhancements(galaxy, system, rows);

  const ownCoordsList = getOwnCoordinatesList();
  const keysToDelete: string[] = [];
  const coordsToDelete: string[] = [];
  const universe = document.querySelector('meta[name="ogame-universe"]')?.getAttribute("content") || "unknown";

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

    const targetCoords = `${galaxy}:${system}:${position}`;
    const isOwn = ownCoordsList.includes(targetCoords);

    // Look for any cached spied planets at this slot
    const cachedPlanets = spiedPlanetsCache.filter(p => p.coords === targetCoords);

    const playerText = playerCell?.textContent?.trim() || "";
    const isEmptyFilter = row.classList.contains('empty_filter');
    const hasMicroplanet = !!row.querySelector('.microplanet');
    const planetNameCell = row.querySelector('.cellPlanetName');
    const planetNameText = planetNameCell?.textContent?.trim() || "";

    // Check for destroyed planet indicators (only if no active player text is present)
    const hasDestroyedText = !!(
      (planetNameText && /^(destroyed planet|zerstörter planet|planeta destruido|planète détruite|pianeta distrutto)/i.test(planetNameText))
    );
    const hasDestroyedIcon = !playerText && !!(
      row.querySelector('.cellPlanet img[src*="destroyed"], .cellPlanet img[src*="zerstoert"], .cellPlanet .planet-destroyed')
    );
    const isDestroyed = hasDestroyedText || hasDestroyedIcon;

    // Check if slot is empty (OGame's empty_filter, or completely blank player/planet cells)
    const isSlotEmpty = (isEmptyFilter && !playerText) || (!playerText && !hasMicroplanet && !planetNameText);

    // If occupied, check if a DIFFERENT player colonized this slot (old occupant replaced)
    let isDifferentPlayer = false;
    if (!isSlotEmpty && !isDestroyed && playerText && cachedPlanets.length > 0) {
      const rowPlayerId = playerCell.querySelector('[data-playerid]')?.getAttribute('data-playerid') ||
                          playerCell.querySelector('[data-player-id]')?.getAttribute('data-player-id') ||
                          playerCell.querySelector('[data-uid]')?.getAttribute('data-uid');
      const pNameEl = playerCell.querySelector('.playerName, .playername, span[rel^="player"]');
      let rowPlayerName = pNameEl ? extractDirectText(pNameEl) : playerText;
      rowPlayerName = rowPlayerName.replace(/\s*\([viInob, ]+\)\s*/gi, '').replace(/#\d+/g, '').trim();

      // Check if none of the cached records belong to this new occupant
      let matchedAny = false;
      for (const cp of cachedPlanets) {
        const cpPlayerId = cp.playerId ? String(cp.playerId).trim() : null;
        const cpPlayerName = cp.playerName ? cp.playerName.toLowerCase().trim() : null;
        const idMatches = !!(cpPlayerId && rowPlayerId && cpPlayerId === String(rowPlayerId).trim());
        const nameMatches = !!(cpPlayerName && rowPlayerName && cpPlayerName === rowPlayerName.toLowerCase());
        if (idMatches || nameMatches) {
          matchedAny = true;
          break;
        }
      }
      if (!matchedAny) {
        isDifferentPlayer = true;
      }
    }

    // PURGE CONDITION: If slot was spied before, but is now empty, destroyed, or replaced by another player
    if (!isOwn && cachedPlanets.length > 0 && (isSlotEmpty || isDestroyed || isDifferentPlayer)) {
      console.log(`OGame Nexus: Detected obsolete target at ${targetCoords} (empty=${isSlotEmpty}, destroyed=${isDestroyed}, replaced=${isDifferentPlayer}). Purging from Raid Radar/Helper.`);
      cachedPlanets.forEach(cp => {
        if (cp.planetKey && !keysToDelete.includes(cp.planetKey)) {
          keysToDelete.push(cp.planetKey);
        }
      });
      if (!coordsToDelete.includes(targetCoords)) {
        coordsToDelete.push(targetCoords);
      }
      // Remove immediately from memory cache to avoid laggy UI
      spiedPlanetsCache = spiedPlanetsCache.filter(p => p.coords !== targetCoords);
    }

    // If slot is empty or destroyed, do not process inactive styling
    if (isSlotEmpty || isDestroyed) {
      return;
    }

    // If the same player is still here, synchronize playerStatus in cache if needed
    if (!isOwn && cachedPlanets.length > 0 && !isDifferentPlayer) {
      const parsed = extractPlayerStatusFromRow(playerCell, row);

      const updatedStatus: string[] = [];
      if (parsed.isVacation) {
        updatedStatus.push('vacation');
        const hadPriorLong = cachedPlanets.some(p => p.playerStatus?.includes('longinactive'));
        const hadPriorInactive = cachedPlanets.some(p => p.playerStatus?.includes('inactive'));
        if (parsed.isLongInactive || hadPriorLong) updatedStatus.push('longinactive');
        else if (parsed.isShortInactive || hadPriorInactive) updatedStatus.push('inactive');
      } else {
        if (parsed.isLongInactive) updatedStatus.push('longinactive');
        else if (parsed.isShortInactive) updatedStatus.push('inactive');
      }
      if (updatedStatus.length === 0) updatedStatus.push('active');

      cachedPlanets.forEach(cp => {
        cp.playerStatus = updatedStatus;
      });
    }

    // Check if the player cell actually has inactive markers and is not in vacation mode
    const isInactive = row.classList.contains('inactive_filter') && !row.classList.contains('vacation_filter');
    if (!isInactive) return;

    // Search spied planets in our in-memory cache
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
    const onMouseEnter = (e: MouseEvent) => {
      // Re-lookup dynamically from latest cache at hover time to avoid stale closure references
      const currentPlanet = spiedPlanetsCache.find(p => p.coords === targetCoords);
      handleMouseEnter(currentPlanet || targetCoords, e);
    };
    playerCell.addEventListener('mouseenter', onMouseEnter);
    playerCell.addEventListener('mouseleave', handleMouseLeave);

    // Save reference on node for clean unbinding
    (playerCell as any)._ogNexusMouseEnter = onMouseEnter;
  });

  // Dispatch batch deletion to background IndexedDB if any obsolete targets were detected
  if (keysToDelete.length > 0 || coordsToDelete.length > 0) {
    chrome.runtime.sendMessage({
      type: "DELETE_SPIED_PLANETS",
      data: { planetKeys: keysToDelete, coordsList: coordsToDelete, universe }
    }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.success) {
        console.log(`OGame Nexus: DB successfully deleted ${keysToDelete.length} obsolete target(s).`);
      }
    });

    // Refresh Raid Helper sidebar immediately
    const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      updateSidebarData(true);
    }
  }

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

/**
 * Reloads the spied planets cache directly from the background IndexedDB.
 */
export function reloadSpiedPlanetsCache(onDone?: () => void) {
  if (isLoadingCache) return;
  isLoadingCache = true;
  const universe = document.querySelector('meta[name="ogame-universe"]')?.getAttribute("content") || "unknown";

  if (!isContextValid()) {
    isLoadingCache = false;
    return;
  }

  chrome.runtime.sendMessage({ type: "GET_ALL_SPIED_PLANETS", data: { universe } }, (response) => {
    isLoadingCache = false;
    if (chrome.runtime.lastError) {
      console.warn("OGame Nexus: Extension context invalidated during cache reload.");
      return;
    }
    if (response && response.success) {
      spiedPlanetsCache = response.planets || [];
      isCacheLoaded = true;
      applyGalaxyRings();
      const sidebar = document.getElementById('og-nexus-galaxy-intel-sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        updateSidebarData();
      }
      onDone?.();
    }
  });
}

let hasRegisteredGalaxyGlobalListeners = false;
function registerGalaxyGlobalListeners() {
  if (hasRegisteredGalaxyGlobalListeners) return;
  hasRegisteredGalaxyGlobalListeners = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.querySelector('#galaxycomponent')) {
      reloadSpiedPlanetsCache();
    }
  });

  window.addEventListener('focus', () => {
    if (document.querySelector('#galaxycomponent')) {
      reloadSpiedPlanetsCache();
    }
  });

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === 'SPIED_PLANETS_UPDATED' && document.querySelector('#galaxycomponent')) {
        reloadSpiedPlanetsCache();
      }
      if ((msg?.type === 'TACTICAL_NOTE_SAVED' || msg?.type === 'TACTICAL_NOTE_DELETED') && document.querySelector('#galaxycomponent')) {
        reloadTacticalNotesCache();
      }
    });
  }
}

export function initGalaxyView() {
  const galaxyComponent = document.querySelector('#galaxycomponent');
  if (!galaxyComponent) return;

  registerGalaxyGlobalListeners();

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
    // Already initialized: ensure cache is loaded, otherwise process DOM rows
    if (!isCacheLoaded || spiedPlanetsCache.length === 0) {
      reloadSpiedPlanetsCache();
    } else {
      applyGalaxyRings();
    }
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
const recentlySyncedSystems = new Map<string, { timestamp: number; activitySignature: string }>();
const RECENTLY_SYNCED_TTL_MS = 3 * 60 * 1000; // 3 minutes

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
    const currentRows = document.querySelectorAll('.galaxyRow.ctContentRow');
    if (currentRows.length < 15) return;

    // Check DOM consensus coordinates first to ensure we sync actual rendered rows
    const consensus = getDOMConsensusCoordinates(currentRows);
    const gInput = document.querySelector('input#galaxy_input') as HTMLInputElement | null;
    const sInput = document.querySelector('input#system_input') as HTMLInputElement | null;
    const targetGalaxy = consensus?.galaxy ?? (gInput ? parseInt(gInput.value, 10) : galaxy);
    const targetSystem = consensus?.system ?? (sInput ? parseInt(sInput.value, 10) : system);

    if (isNaN(targetGalaxy) || isNaN(targetSystem)) return;

    if (isGalaxyDOMFullySettled(targetGalaxy, targetSystem, currentRows)) {
      syncGalaxyToOverwatch(targetGalaxy, targetSystem, currentRows);
    } else {
      // Retry once after 350ms in case DOM was mid-settle
      setTimeout(() => {
        const retryRows = document.querySelectorAll('.galaxyRow.ctContentRow');
        if (retryRows.length < 15) return;
        const retryConsensus = getDOMConsensusCoordinates(retryRows);
        const retryG = retryConsensus?.galaxy ?? (gInput ? parseInt(gInput.value, 10) : targetGalaxy);
        const retryS = retryConsensus?.system ?? (sInput ? parseInt(sInput.value, 10) : targetSystem);
        if (!isNaN(retryG) && !isNaN(retryS) && isGalaxyDOMFullySettled(retryG, retryS, retryRows)) {
          syncGalaxyToOverwatch(retryG, retryS, retryRows);
        }
      }, 350);
    }
  }, 600);
}

export async function syncGalaxyToOverwatch(galaxy: number, system: number, rows: NodeListOf<Element>) {
  if (!rows || rows.length === 0) return;
  if (!isContextValid()) return;

  // Derive coordinates: consensus from DOM rows takes precedence over stale input parameters
  const consensus = getDOMConsensusCoordinates(rows);
  let targetGalaxy = consensus?.galaxy ?? galaxy;
  let targetSystem = consensus?.system ?? system;

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
    const universe = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content') || 's267-en';
    const ownPlayerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
    const config = await getStoredOverwatchConfig(universe, ownPlayerId);
    if (!config || !config.allianceId || !config.authToken || config.permissions?.shareGalaxy === false) {
      return;
    }

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
      const planetNameCell = row.querySelector('.cellPlanetName');
      if (planetNameCell) {
        const planetNameSpan = planetNameCell.querySelector('span:not([class*="ogl_"])');
        if (planetNameSpan) {
          planetName = planetNameSpan.textContent?.trim() || null;
        }
        if (!planetName) {
          const clone = planetNameCell.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('[class*="ogl_"], script, style').forEach(el => el.remove());
          const directText = clone.textContent?.trim() || null;
          if (directText && directText !== 'Name') {
            planetName = directText;
          }
        }
      }
      if (!planetName && microplanet) {
        const nameInTooltip = row.querySelector('.cellPlanet .spaceObjectName')?.textContent?.trim();
        if (nameInTooltip) planetName = nameInTooltip;
      }

      // 2. Player ID, Name, Status & Rank - ALWAYS extracted directly from cellPlayerName
      let playerId: string | null = null;
      let playerName: string | null = null;
      let playerStatus = 'active';
      let playerRank: number | null = null;

      const playerCell = row.querySelector('.cellPlayerName');
      if (playerCell) {
        // Player ID (support native OGame, OGLight data-uid, and PTRE data-player-id)
        const directPlayerId = playerCell.querySelector('[data-playerid]')?.getAttribute('data-playerid') ||
                               playerCell.querySelector('[data-player-id]')?.getAttribute('data-player-id') ||
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

        // Player Name (support numeric names like "777", never take rank strings starting with #)
        const pNameEl = playerCell.querySelector('.playerName, .playername, span[rel^="player"]');
        if (pNameEl) {
          const rawDirect = extractDirectText(pNameEl);
          const directClean = rawDirect.replace(/\s*\([viInob, ]+\)\s*/gi, '').trim();
          if (directClean && !directClean.startsWith('#')) {
            playerName = directClean;
          } else {
            const h1Name = pNameEl.querySelector('h1 .playerName, .htmlTooltip .playerName')?.textContent?.trim();
            const h1Clean = (h1Name || '').replace(/\s*\([viInob, ]+\)\s*/gi, '').trim();
            if (h1Clean && !h1Clean.startsWith('#')) {
              playerName = h1Clean;
            }
          }
        }

        // Fallback for player name if empty (strip extension ranking badges and status elements)
        if (!playerName) {
          const clone = playerCell.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('.htmlTooltip, .ogl_ranking, .rank, .honorRank, .ogl_tagPicker, .ogl_flagPicker, .ago_galaxy_rank, [class*="ago_"], [class*="ptre"], pre, script, style').forEach(el => el.remove());
          const clean = clone.textContent?.trim().replace(/\s+/g, ' ') || '';
          const sanitized = clean.replace(/\([^)]*\)/g, '').replace(/#\d+/g, '').trim();
          if (sanitized && !sanitized.startsWith('#')) {
            playerName = sanitized;
          }
        }

        // Fallback for permanent admin accounts (Legor, GameAdmin, comagf, OGameTeam) without numeric tooltips
        if (!playerId && playerName) {
          const lower = playerName.toLowerCase().trim();
          if (['legor', 'gameadmin', 'ogameteam', 'comagf'].includes(lower)) {
            playerId = lower;
          }
        }

        // If player found, parse status and rank
        if (playerId || playerName) {
          const parsed = extractPlayerStatusFromRow(playerCell, row);
          playerStatus = parsed.statusString;

          // Player Rank (support native .rank a, OGLight .ogl_ranking, and AntiGameReborn .ago_galaxy_rank)
          const rankEl = playerCell.querySelector('.rank a, .ogl_ranking, .ago_galaxy_rank');
          if (rankEl) {
            const rankNum = parseInt(rankEl.textContent?.replace(/\D/g, '') || '', 10);
            if (!isNaN(rankNum)) playerRank = rankNum;
          }
        }
      }

      if (isOwnPlanet && (!playerName || !playerId)) {
        playerId = ownPlayerId || playerId;
        playerName = ownPlayerName || playerName;
        playerStatus = 'active';
      }

      // Check for destroyed planet indicators (ONLY valid if slot has NO real player)
      const hasRealPlayer = !!(playerId || playerName);
      const hasDestroyedText = !hasRealPlayer && !!(
        planetName && /^(destroyed planet|zerstörter planet|planeta destruido|planète détruite|pianeta distrutto)/i.test(planetName)
      );
      const hasDestroyedIcon = !hasRealPlayer && !!(
        row.querySelector('.cellPlanet img[src*="destroyed"], .cellPlanet img[src*="zerstoert"], .cellPlanet .planet-destroyed')
      );
      const isPlanetDestroyed = hasDestroyedText || hasDestroyedIcon;
      if (isPlanetDestroyed) {
        planetName = 'Destroyed planet';
        playerId = null;
        playerName = null;
      } else if (!planetName && hasRealPlayer) {
        // Fallback planet name if DOM span was momentarily omitted
        planetName = 'Colony';
      } else if (isEmpty || (!planetId && !planetName && !isOwnPlanet && !hasRealPlayer)) {
        planetName = null;
      }

      // 3. Moon Status & Size
      const moonCell = row.querySelector('.cellMoon');
      const micromoon = row.querySelector('.micromoon');
      const hasMoonElement = !!(
        micromoon ||
        moonCell?.querySelector('[data-moon-id]') ||
        moonCell?.querySelector('a[rel*="moon"], .micro-moon, .icon_moon, #moonsize') ||
        moonCell?.querySelector('img[src*="moon"]')
      );
      let moonSize: number | null = null;
      const moonSizeEl = row.querySelector('#moonsize') || moonCell?.querySelector('.moon_size, .size');
      if (moonSizeEl) {
        const sizeParsed = parseInt(moonSizeEl.textContent?.replace(/\D/g, '') || '', 10);
        if (!isNaN(sizeParsed) && sizeParsed > 0) moonSize = sizeParsed;
      }
      if (!moonSize && moonCell) {
        const moonTooltip = moonCell.textContent || '';
        const sizeMatch = moonTooltip.match(/(\d+[\.,]?\d*)\s*(?:km|км|k)/i);
        if (sizeMatch) {
          moonSize = parseInt(sizeMatch[1].replace(/[^\d]/g, ''), 10) || null;
          if (moonSize && moonSize < 100) moonSize = moonSize * 1000;
        }
      }

      const hasMoon = (hasMoonElement || (moonSize !== null && moonSize > 0)) ? 1 : 0;
      const moonId = micromoon?.getAttribute('data-moon-id') || moonCell?.querySelector('[data-moon-id]')?.getAttribute('data-moon-id') || null;

      // Moon is destroyed ONLY if there was a moon element and it specifically displays destroyed image/class (never match action buttons)
      const isMoonDestroyed = hasMoon === 1 && !!(
        moonCell?.querySelector('img[src*="destroyed"], img[src*="zerstoert"], .moon-destroyed')
      );
      const moonDestroyed = isMoonDestroyed ? 1 : 0;

      // 4. Alliance Tag & ID
      let allianceTag: string | null = null;
      let allianceId: string | null = null;
      if (!isPlanetDestroyed && (planetName || planetId || hasRealPlayer || isOwnPlanet)) {
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

      // 5. Activity Markers (Planet & Moon tracked separately for deep tactical analysis)
      const parseActivityElement = (cellEl: Element | null, isMoon = false): { marker: string; timestamp: number } | null => {
        if (!cellEl) return null;

        // Isolate the micro-container (microplanet or micromoon)
        const micro = cellEl.querySelector(isMoon ? '.micromoon' : '.microplanet') || cellEl;

        // Find activity element within micro, strictly ignoring any elements inside tooltips (.htmlTooltip, [id^="planet"], [id^="moon"])
        const candidates = micro.querySelectorAll('.activity, .minute15, .showMinutes');
        let actEl: Element | null = null;
        for (let i = 0; i < candidates.length; i++) {
          const el = candidates[i];
          // Ensure element is not part of an internal tooltip or modal
          if (!el.closest('.htmlTooltip, [id^="planet"], [id^="moon"]')) {
            actEl = el;
            break;
          }
        }

        if (!actEl) return null;

        // Check for 15-59 minutes of activity (class showMinutes or raw text digits)
        const rawText = (actEl.textContent || '').trim();
        const numMatch = rawText.match(/\b([1-5]\d)\b/);
        if (numMatch) {
          const mins = parseInt(numMatch[1], 10);
          if (mins >= 15 && mins <= 59) {
            return {
              marker: `${mins}m`,
              timestamp: now - (mins * 60 * 1000),
            };
          }
        }

        // Recent activity (<15m): either class minute15, or explicit '*' text, or empty content within .activity div
        if (actEl.classList.contains('minute15') || rawText === '*' || rawText === '') {
          return {
            marker: '*',
            timestamp: now,
          };
        }

        return null;
      };

      const planetAct = parseActivityElement(row.querySelector('.cellPlanet'), false);
      const moonAct = parseActivityElement(row.querySelector('.cellMoon'), true);

      const planetActivityMarker = planetAct?.marker || null;
      const planetActivityTimestamp = planetAct?.timestamp || null;
      const moonActivityMarker = moonAct?.marker || null;
      const moonActivityTimestamp = moonAct?.timestamp || null;

      // Consolidated marker prioritizing moon if present (since moon activity signifies fleet movement)
      const activityMarker = moonActivityMarker || planetActivityMarker || null;
      const activityTimestamp = moonActivityTimestamp || planetActivityTimestamp || null;
      const isIdle = !planetActivityMarker && !moonActivityMarker;

      // 6. Debris Field
      let debrisMetal = 0;
      let debrisCrystal = 0;
      const debrisCell = row.querySelector('.cellDebris');
      if (debrisCell) {
        // First check tooltip links or content within cell
        const tooltipEl = debrisCell.querySelector('.galaxyTooltip, [id^="debris"]');
        const searchRoot = tooltipEl || debrisCell;
        const links = searchRoot.querySelectorAll('.ListLinks li, .debris-content, .debris-recyclers');
        if (links && links.length > 0) {
          links.forEach(li => {
            const t = (li.textContent || '').toLowerCase();
            if (t.includes('metal') || t.includes('metall') || t.includes('métal')) {
              debrisMetal = parseDebrisAmount(t);
            } else if (t.includes('crystal') || t.includes('kristall') || t.includes('cristal')) {
              debrisCrystal = parseDebrisAmount(t);
            }
          });
        }

        // Fallback: match textContent with multilingual regex
        if (debrisMetal === 0 && debrisCrystal === 0) {
          const t = debrisCell.textContent || '';
          const metalMatch = t.match(/(?:metal|metall|m[ée]tal)[:\s]*([\d,\.]+)/i);
          const crystalMatch = t.match(/(?:crystal|kristall|cristal)[:\s]*([\d,\.]+)/i);
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
        moonDestroyed,
        debrisMetal,
        debrisCrystal,
        planetActivityMarker,
        planetActivityTimestamp,
        moonActivityMarker,
        moonActivityTimestamp,
        isIdle,
        activityMarker,
        activityTimestamp,
      });
    });

    if (slots.length === 0) return;

    // Compute signature to detect if activity, status, player, or debris changed
    const activitySignature = slots
      .map(s => `${s.slot}:${s.activityMarker || ''}:${s.playerStatus || ''}:${s.playerId || ''}:${s.debrisMetal > 0 || s.debrisCrystal > 0}`)
      .join('|');

    const cachedSync = recentlySyncedSystems.get(currentCoords);
    if (cachedSync && (now - cachedSync.timestamp < RECENTLY_SYNCED_TTL_MS) && cachedSync.activitySignature === activitySignature) {
      // System surveyed in last 3 minutes with zero activity changes: skip telemetry dispatch
      return;
    }

    recentlySyncedSystems.set(currentCoords, { timestamp: now, activitySignature });

    // Keep cache bounded
    if (recentlySyncedSystems.size > 200) {
      const cutoff = now - RECENTLY_SYNCED_TTL_MS;
      for (const [key, val] of recentlySyncedSystems.entries()) {
        if (val.timestamp < cutoff) recentlySyncedSystems.delete(key);
      }
    }

    // Relay payload to background service worker (bypasses page CSP and Mixed Content blocks)
    if (isContextValid()) {
      chrome.runtime.sendMessage({
        type: "OVERWATCH_SYNC_GALAXY",
        action: "OVERWATCH_SYNC_GALAXY",
        data: {
          universeId: universe,
          ownPlayerId: ownPlayerId,
          galaxy: targetGalaxy,
          system: targetSystem,
          scannedAt: Date.now(),
          slots,
        },
      }, () => {
        if (chrome.runtime.lastError) {
          // Extension reloaded or context invalidated quietly
        }
      });
    }
  } catch (e) {
    // Zero lag impact on OGame page
  }
}


