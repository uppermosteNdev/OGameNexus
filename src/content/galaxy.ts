import { SpiedPlanet } from '../db';

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

  const metalCap = planet.metalCapacity || 10000;
  const crystalCap = planet.crystalCapacity || 10000;
  const deuteriumCap = planet.deuteriumCapacity || 10000;

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
      
      <div class="og-nexus-galaxy-settings-toggle" id="og-nexus-galaxy-settings-toggle" title="Toggle settings">
        <svg viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
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

  // If system or galaxy changed, hide any active tooltip
  if (lastGalaxy !== null && lastSystem !== null && (lastGalaxy !== galaxy || lastSystem !== system)) {
    handleMouseLeave();
  }
  lastGalaxy = galaxy;
  lastSystem = system;

  // Read current checkbox filter settings
  const showG4 = localStorage.getItem('og-nexus-gal-show-g4') !== 'false';
  const showG3 = localStorage.getItem('og-nexus-gal-show-g3') !== 'false';
  const showG2 = localStorage.getItem('og-nexus-gal-show-g2') !== 'false';
  const showG1 = localStorage.getItem('og-nexus-gal-show-g1') !== 'false';
  const showG0 = localStorage.getItem('og-nexus-gal-show-g0') !== 'false';

  let countG4 = 0;
  let countG3 = 0;
  let countG2 = 0;
  let countG1 = 0;
  let countG0 = 0;

  const rows = document.querySelectorAll('.galaxyRow.ctContentRow');
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
      countG0++;
    } else if (msuPerHour > galaxyIntervals.t3) {
      group = 4;
      countG4++;
    } else if (msuPerHour > galaxyIntervals.t2) {
      group = 3;
      countG3++;
    } else if (msuPerHour > galaxyIntervals.t1) {
      group = 2;
      countG2++;
    } else {
      group = 1;
      countG1++;
    }

    // Determine if we should show/hide
    let shouldShow = true;
    if (group === 4) shouldShow = showG4;
    else if (group === 3) shouldShow = showG3;
    else if (group === 2) shouldShow = showG2;
    else if (group === 1) shouldShow = showG1;
    else shouldShow = showG0;

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
  if (valG4) valG4.textContent = String(countG4);
  if (valG3) valG3.textContent = String(countG3);
  if (valG2) valG2.textContent = String(countG2);
  if (valG1) valG1.textContent = String(countG1);
  if (valG0) valG0.textContent = String(countG0);
}

export function initGalaxyView() {
  // 1. Ensure cache is loaded
  chrome.storage.local.get('galaxyIntervals', (result) => {
    if (result && result.galaxyIntervals) {
      galaxyIntervals = { ...galaxyIntervals, ...result.galaxyIntervals };
    }

    if (!isCacheLoaded && !isLoadingCache) {
      isLoadingCache = true;
      chrome.runtime.sendMessage({ type: "GET_ALL_SPIED_PLANETS" }, (response) => {
        isLoadingCache = false;
        if (response && response.success) {
          spiedPlanetsCache = response.planets || [];
          isCacheLoaded = true;

          // Setup summary bar once cache loads
          const galaxyComponent = document.querySelector('#galaxycomponent');
          if (galaxyComponent && !document.getElementById('og-nexus-galaxy-summary-bar')) {
            const summaryBar = createSummaryBarElement();
            galaxyComponent.appendChild(summaryBar);
          }

          applyGalaxyRings(); // Apply immediately once cache loads
        }
      });
    }

    // Setup summary bar if cache was already loaded
    if (isCacheLoaded) {
      const galaxyComponent = document.querySelector('#galaxycomponent');
      if (galaxyComponent && !document.getElementById('og-nexus-galaxy-summary-bar')) {
        const summaryBar = createSummaryBarElement();
        galaxyComponent.appendChild(summaryBar);
      }
    }

    // Process DOM rows
    applyGalaxyRings();
  });

  // 2. Add document-level listeners for dynamic positioning
  document.removeEventListener('mousemove', handleMouseMove); // Prevent duplicates
  document.addEventListener('mousemove', handleMouseMove);
  startTooltipTick();

  // 3. Register storage listener for real-time reactivity
  chrome.storage.onChanged.removeListener(onStorageChanged);
  chrome.storage.onChanged.addListener(onStorageChanged);
}

export function cleanupGalaxyView() {
  // Clean up cache
  spiedPlanetsCache = [];
  isCacheLoaded = false;
  lastGalaxy = null;
  lastSystem = null;

  // Clean up listeners
  document.removeEventListener('mousemove', handleMouseMove);
  stopTooltipTick();
  chrome.storage.onChanged.removeListener(onStorageChanged);

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
}
