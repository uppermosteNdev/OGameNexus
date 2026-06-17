import { SpiedPlanet } from '../db';

let spiedPlanetsCache: SpiedPlanet[] = [];
let isCacheLoaded = false;
let isLoadingCache = false;
let tooltipElement: HTMLElement | null = null;
let currentHoveredPlanet: SpiedPlanet | null = null;

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

function updateTooltipContent(planet: SpiedPlanet) {
  if (!tooltipElement) return;
  
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
      <span class="og-nexus-galaxy-tooltip-coords">[${planet.coords}]</span>
      <span class="og-nexus-galaxy-tooltip-confidence" style="color: ${confColor}; background: ${confBg}; border: 1px solid ${confColor}30;">
        ${planet.confidence}% Conf
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
          <span>Estimated</span>
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
        <span class="og-nexus-galaxy-tooltip-msu-label">MSU Prod:</span>
        <span class="og-nexus-galaxy-tooltip-msu-value">+${formatAbbreviatedRate(msuPerHour)}/h</span>
      </div>
      <div class="og-nexus-galaxy-tooltip-msu-col">
        <span class="og-nexus-galaxy-tooltip-msu-label">MSU Res:</span>
        <span class="og-nexus-galaxy-tooltip-msu-value">${formatCompactNumber(totalMSU)}</span>
      </div>
    </div>
  `;
}

// Hover event handlers
function handleMouseEnter(planet: SpiedPlanet, e: MouseEvent) {
  currentHoveredPlanet = planet;
  createTooltipElement();
  if (tooltipElement) {
    updateTooltipContent(planet);
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
  if (msuPerHour < 10000) return '#64748b';    // Group 0: < 10k MSU/h (Gray)
  if (msuPerHour > 1000000) return '#ec4899'; // Group 4: > 1 Million MSU/h (Hot Pink)
  if (msuPerHour > 500000) return '#f59e0b';  // Group 3: > 500k MSU/h (Amber/Orange)
  if (msuPerHour > 250000) return '#10b981';  // Group 2: > 250k MSU/h (Emerald Green)
  return '#38bdf8';                          // Group 1: <= 250k MSU/h (Sky Blue)
}

export function applyGalaxyRings() {
  const galaxyInput = document.querySelector('input#galaxy_input') as HTMLInputElement | null;
  const systemInput = document.querySelector('input#system_input') as HTMLInputElement | null;
  if (!galaxyInput || !systemInput) return;

  const galaxy = parseInt(galaxyInput.value, 10);
  const system = parseInt(systemInput.value, 10);
  if (isNaN(galaxy) || isNaN(system)) return;

  const rows = document.querySelectorAll('.galaxyRow.ctContentRow');
  rows.forEach(row => {
    const posCell = row.querySelector('.cellPosition');
    const playerCell = row.querySelector('.cellPlayerName') as HTMLElement | null;
    if (!posCell || !playerCell) return;

    const position = parseInt(posCell.textContent || '', 10);
    if (isNaN(position)) return;

    // Check if the player cell actually has inactive markers
    const isInactive = playerCell.querySelector('.status_abbr_inactive, .status_abbr_longinactive') !== null;
    
    // Clear any existing ring styling if present
    playerCell.style.boxShadow = '';
    
    // Remove previous listeners if row was re-bound
    const oldMouseEnter = (playerCell as any)._ogNexusMouseEnter;
    if (oldMouseEnter) {
      playerCell.removeEventListener('mouseenter', oldMouseEnter);
      playerCell.removeEventListener('mouseleave', handleMouseLeave);
      (playerCell as any)._ogNexusMouseEnter = null;
    }

    if (!isInactive) return;

    // Search spied planets in our in-memory cache
    const targetCoords = `${galaxy}:${system}:${position}`;
    const planet = spiedPlanetsCache.find(p => p.coords === targetCoords);

    // Calculate MSU/h production (default to 0 if not spied yet, leading to gray lateral)
    const msuPerHour = planet ? (planet.metalPerHour + planet.crystalPerHour * 1.5 + planet.deuteriumPerHour * 3.0) : 0;
    const ringColor = getRingColor(msuPerHour);

    // Apply color-coded left lateral border (using inset shadow to prevent cell sizing shift)
    playerCell.style.boxShadow = `inset 3px 0 0 ${ringColor}`;

    // Wire hover listener only if we have espionage data
    if (planet) {
      const onMouseEnter = (e: MouseEvent) => handleMouseEnter(planet, e);
      playerCell.addEventListener('mouseenter', onMouseEnter);
      playerCell.addEventListener('mouseleave', handleMouseLeave);
      
      // Save reference on node for clean unbinding
      (playerCell as any)._ogNexusMouseEnter = onMouseEnter;
    }
  });
}

export function initGalaxyView() {
  // 1. Ensure cache is loaded
  if (!isCacheLoaded && !isLoadingCache) {
    isLoadingCache = true;
    chrome.runtime.sendMessage({ type: "GET_ALL_SPIED_PLANETS" }, (response) => {
      isLoadingCache = false;
      if (response && response.success) {
        spiedPlanetsCache = response.planets || [];
        isCacheLoaded = true;
        applyGalaxyRings(); // Apply immediately once cache loads
      }
    });
  }

  // 2. Add document-level listeners for dynamic positioning
  document.removeEventListener('mousemove', handleMouseMove); // Prevent duplicates
  document.addEventListener('mousemove', handleMouseMove);
  startTooltipTick();

  // 3. Process DOM rows
  applyGalaxyRings();
}

export function cleanupGalaxyView() {
  // Clean up cache
  spiedPlanetsCache = [];
  isCacheLoaded = false;
  
  // Clean up listeners
  document.removeEventListener('mousemove', handleMouseMove);
  stopTooltipTick();

  // Remove tooltip from DOM
  if (tooltipElement) {
    tooltipElement.remove();
    tooltipElement = null;
  }
}
