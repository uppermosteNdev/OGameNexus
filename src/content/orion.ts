
let activeNexusTooltipEl: HTMLElement | null = null;

export function initOrionNativeTooltipEngine(): void {
  if (typeof window === 'undefined' || (window as any).__nexusOrionTooltipEngineAttached) {
    return;
  }
  (window as any).__nexusOrionTooltipEngineAttached = true;

  const hideActiveTooltip = () => {
    if (activeNexusTooltipEl) {
      activeNexusTooltipEl.classList.remove('visible');
      const el = activeNexusTooltipEl;
      activeNexusTooltipEl = null;
      setTimeout(() => el.remove(), 150);
    }
  };

  const handleTooltipHover = (e: MouseEvent) => {
    const target = (e.target as Element | null)?.closest<HTMLElement>(
      '.nexus-tooltip-trigger, .nexus-ranking-switch-pill .infoIcon, .nexus-briefing-info-icon'
    );
    if (!target) {
      if (activeNexusTooltipEl && !(e.target as Element | null)?.closest('.nexus-native-tooltip-popup')) {
        hideActiveTooltip();
      }
      return;
    }

    // Stop event propagation in window capture phase so OGLight and third-party scripts never receive it
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Strip native browser title attribute to prevent OS-level white box
    if (target.hasAttribute('title')) {
      const t = target.getAttribute('title');
      if (t && !target.hasAttribute('data-nexus-tooltip-title')) {
        target.setAttribute('data-nexus-tooltip-title', t);
      }
      target.removeAttribute('title');
    }

    let titleText = '';
    let bodyText = '';

    if (target.hasAttribute('data-nexus-tooltip-body')) {
      titleText = target.getAttribute('data-nexus-tooltip-title') || '';
      bodyText = target.getAttribute('data-nexus-tooltip-body') || '';
    } else {
      const rawTitle = target.getAttribute('data-nexus-tooltip-title') ||
                       target.getAttribute('data-tooltip-title') ||
                       '';
      if (!rawTitle) return;
      const parts = rawTitle.split('|').map((s) => s.trim());
      titleText = parts.length > 1 ? parts[0] : '';
      bodyText = parts.length > 1 ? parts.slice(1).join(' | ') : parts[0];
    }

    if (!titleText && !bodyText) return;

    // Suppress any stray cluetip or OGLight tooltip containers in the DOM
    document.querySelectorAll('#cluetip, .ogl_tooltip, .ui-tooltip, #ogl_tooltip').forEach((ct) => {
      (ct as HTMLElement).style.setProperty('display', 'none', 'important');
    });

    // Remove any existing active tooltip
    activeNexusTooltipEl?.remove();

    const isHtml = target.getAttribute('data-nexus-tooltip-html') === 'true';

    const tip = document.createElement('div');
    tip.className = `nexus-native-tooltip-popup ${isHtml ? 'nexus-tooltip-rich' : ''}`;
    tip.innerHTML = `
      ${titleText ? `<div class="nexus-native-tooltip-title">${escapeHtml(titleText)}</div>` : ''}
      <div class="nexus-native-tooltip-body">${isHtml ? bodyText : escapeHtml(bodyText)}</div>
      <div class="nexus-native-tooltip-arrow"></div>
    `;

    document.body.appendChild(tip);
    activeNexusTooltipEl = tip;

    // Position above target element
    const rect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();

    let top = rect.top - tipRect.height - 8;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;

    // Keep within viewport boundaries
    if (top < 10) {
      top = rect.bottom + 8;
      tip.classList.add('placement-down');
    }
    if (left < 10) left = 10;
    if (left + tipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tipRect.width - 10;
    }

    tip.style.top = `${top + window.scrollY}px`;
    tip.style.left = `${left + window.scrollX}px`;

    requestAnimationFrame(() => {
      tip.classList.add('visible');
    });

    const removeTooltip = () => {
      hideActiveTooltip();
      target.removeEventListener('mouseleave', removeTooltip);
    };
    target.addEventListener('mouseleave', removeTooltip, { once: true });
  };

  // Attach to window in capture phase for earliest possible interception before OGLight/page handlers
  window.addEventListener('mouseover', handleTooltipHover, true);
  window.addEventListener('mouseenter', handleTooltipHover, true);
}

export function triggerSiteTooltips(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ogame-nexus-trigger-tooltips'));
  }
}
/**
 * OGameNexus - Project Orion Tactical Mission Enhancer
 * Seamless, DOM-native intelligence for Project Orion anomaly missions.
 * Perfectly integrates into OGame's DOM hierarchy without obstructing flight routes or canvases.
 */

import {
  db,
  AnomalyMission,
  AnomalyWaveReceipt,
  ScannedAnomalyRecord,
  saveScannedAnomalyToDB,
  exportScannedAnomaliesAsCsv,
  exportScannedAnomaliesAsJson,
  cleanRewardString,
  migrateScannedAnomaliesPureStatus
} from '../db';
import { SHIP_DATA } from '../db/staticData';
import { OFFICIAL_GAME_ENTITIES } from '../i18n/gameData';
import { openAnomalyWaveSimModal } from './orionWaveSimModal';
import { isSameUniverse, cleanUniverseId } from '../utils/universe';
import { getPlanetTechMultiplier } from '../utils/amortizationCalc';
import { getLfTech } from '../db/lifeformTechData';

// Pre-computed map: normalized ship name -> base resource costs & 3:2:1 MSU
interface ShipCostInfo {
  metal: number;
  crystal: number;
  deuterium: number;
  msu: number;
}

const SHIP_COST_MAP: Record<string, ShipCostInfo> = {};
const SHIP_MSU_MAP: Record<string, number> = {};
SHIP_DATA.forEach((s) => {
  const m = s.metadata?.cost?.metal || 0;
  const c = s.metadata?.cost?.crystal || 0;
  const d = s.metadata?.cost?.deuterium || 0;
  const msu = m * 1.0 + c * 1.5 + d * 3.0;
  SHIP_COST_MAP[s.name.toLowerCase().trim()] = { metal: m, crystal: c, deuterium: d, msu };
  SHIP_MSU_MAP[s.name.toLowerCase().trim()] = msu;
});

// Map technology-icon attribute names to normalized ship names
const ICON_ATTR_TO_SHIP: Record<string, string> = {
  fighterlight: 'light fighter',
  fighterheavy: 'heavy fighter',
  cruiser: 'cruiser',
  battleship: 'battleship',
  interceptor: 'battlecruiser',
  bomber: 'bomber',
  destroyer: 'destroyer',
  deathstar: 'deathstar',
  reaper: 'reaper',
  explorer: 'pathfinder',
  pathfinder: 'pathfinder',
  transportersmall: 'small cargo',
  transporterlarge: 'large cargo',
  colonyship: 'colony ship',
  recycler: 'recycler',
  espionageprobe: 'espionage probe',
  crawler: 'crawler',
  solarsatellite: 'solar satellite'
};

/**
 * Resolves the canonical technology-icon attribute for any ship name or alias.
 */
export function getShipIconAttribute(shipName: string): string {
  if (!shipName) return 'interceptor';
  const norm = shipName.toLowerCase().replace(/[\s\-_]/g, '');

  if (norm in ICON_ATTR_TO_SHIP) {
    return norm;
  }

  for (const [attr, val] of Object.entries(ICON_ATTR_TO_SHIP)) {
    const normVal = val.toLowerCase().replace(/[\s\-_]/g, '');
    if (norm === normVal || norm.includes(normVal) || normVal.includes(norm)) {
      return attr;
    }
  }

  if (norm.includes('lightfighter') || norm.includes('chasseurléger') || norm.includes('chasseurleger') || norm.includes('cazadorligero') || norm.includes('leichterjaeger') || norm.includes('leichterjäger')) return 'fighterlight';
  if (norm.includes('heavyfighter') || norm.includes('chasseurlourd') || norm.includes('cazadorpesado') || norm.includes('schwererjaeger') || norm.includes('schwererjäger')) return 'fighterheavy';
  if (norm.includes('cruiser') || norm.includes('croiseur') || norm.includes('crucero') || norm.includes('kreuzer')) return 'cruiser';
  if (norm.includes('battlecruiser') || norm.includes('traqueur') || norm.includes('acorazado') || norm.includes('schlachtkreuzer') || norm.includes('interceptor')) return 'interceptor';
  if (norm.includes('battleship') || norm.includes('vaisseaudebataille') || norm.includes('navesdebatalla') || norm.includes('schlachtschiff')) return 'battleship';
  if (norm.includes('smallcargo') || norm.includes('petittransporteur') || norm.includes('cargapequeña') || norm.includes('cargapequena') || norm.includes('kleinertransporter') || norm.includes('transportersmall')) return 'transportersmall';
  if (norm.includes('largecargo') || norm.includes('grandtransporteur') || norm.includes('cargagrande') || norm.includes('grossertransporter') || norm.includes('großertransporter') || norm.includes('transporterlarge')) return 'transporterlarge';
  if (norm.includes('colonyship') || norm.includes('vaisseaucolonisateur') || norm.includes('colonizador') || norm.includes('kolonieschiff')) return 'colonyship';
  if (norm.includes('recycler') || norm.includes('recycleur') || norm.includes('reciclador')) return 'recycler';
  if (norm.includes('probe') || norm.includes('sonde') || norm.includes('sonda') || norm.includes('spionagesonde')) return 'espionageprobe';
  if (norm.includes('bomber') || norm.includes('bombardier') || norm.includes('bombardero')) return 'bomber';
  if (norm.includes('destroyer') || norm.includes('destructeur') || norm.includes('destructor') || norm.includes('zerstörer') || norm.includes('zerstoerer')) return 'destroyer';
  if (norm.includes('deathstar') || norm.includes('rip') || norm.includes('étoiledelamort') || norm.includes('estrelladelamuerte') || norm.includes('todesstern')) return 'deathstar';
  if (norm.includes('reaper') || norm.includes('faucheur') || norm.includes('segador')) return 'reaper';
  if (norm.includes('pathfinder') || norm.includes('eclaireur') || norm.includes('éclaireur') || norm.includes('explorador') || norm.includes('entdecker') || norm.includes('explorer')) return 'pathfinder';
  if (norm.includes('crawler') || norm.includes('foreuse')) return 'crawler';
  if (norm.includes('solarsatellite') || norm.includes('satellite') || norm.includes('satélite') || norm.includes('solarsatellit')) return 'solarsatellite';

  return 'interceptor';
}

/**
 * Returns a clean, capitalized display name for a ship.
 */
export function getShipDisplayName(shipName: string): string {
  const attr = getShipIconAttribute(shipName);
  const mapped = ICON_ATTR_TO_SHIP[attr];
  if (mapped) {
    return mapped.split(' ').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }
  return shipName.charAt(0).toUpperCase() + shipName.slice(1);
}

export const SHIP_CANONICAL_ORDER: string[] = [
  'small cargo',
  'large cargo',
  'light fighter',
  'heavy fighter',
  'cruiser',
  'battleship',
  'colony ship',
  'recycler',
  'espionage probe',
  'bomber',
  'solar satellite',
  'destroyer',
  'deathstar',
  'battlecruiser',
  'crawler',
  'reaper',
  'pathfinder'
];

/**
 * Official Base Cargo Capacities for all OGame Vessels.
 * NPC anomaly waves have unbuffed base game statistics.
 */
export const SHIP_ID_TO_BASE_CARGO: Record<number, number> = {
  202: 5000,    // Small Cargo
  203: 25000,   // Large Cargo
  204: 50,      // Light Fighter
  205: 100,     // Heavy Fighter
  206: 800,     // Cruiser
  207: 1500,    // Battleship
  208: 7500,    // Colony Ship
  209: 20000,   // Recycler
  210: 5,       // Espionage Probe
  211: 500,     // Bomber
  212: 0,       // Solar Satellite
  213: 2000,    // Destroyer
  214: 1000000, // Deathstar (RIP)
  215: 750,     // Battlecruiser
  216: 0,       // Trade Ship
  217: 0,       // Crawler
  218: 10000,   // Reaper
  219: 10000    // Pathfinder
};

export const SHIP_BASE_CARGO_MAP: Record<string, number> = {
  // Transporters & Utility
  'small cargo': 5000,
  'transportersmall': 5000,
  'large cargo': 25000,
  'transporterlarge': 25000,
  'colony ship': 7500,
  'colonyship': 7500,
  'recycler': 20000,
  'espionage probe': 5,
  'espionageprobe': 5,
  'pathfinder': 10000,
  'explorer': 10000,
  'reaper': 10000,

  // Combat Ships
  'light fighter': 50,
  'fighterlight': 50,
  'heavy fighter': 100,
  'fighterheavy': 100,
  'cruiser': 800,
  'battleship': 1500,
  'battlecruiser': 750,
  'interceptor': 750,
  'bomber': 500,
  'destroyer': 2000,
  'deathstar': 1000000,

  // Non-cargo
  'solar satellite': 0,
  'solarsatellite': 0,
  'crawler': 0,
  'trade ship': 0
};

// Initialize localized ship names into SHIP_BASE_CARGO_MAP from GAME_DATA
Object.entries(SHIP_ID_TO_BASE_CARGO).forEach(([idStr, cargo]) => {
  const id = Number(idStr);
  const entry = OFFICIAL_GAME_ENTITIES[id];
  if (entry) {
    const langs = ['en', 'de', 'fr', 'ro', 'pl', 'nl', 'es', 'it', 'ru', 'tr', 'br', 'pt'] as const;
    langs.forEach((lang) => {
      const name = entry[lang];
      if (name) {
        SHIP_BASE_CARGO_MAP[name.toLowerCase().trim()] = cargo;
        SHIP_BASE_CARGO_MAP[name.toLowerCase().replace(/[:\-_]/g, ' ').replace(/\s+/g, ' ').trim()] = cargo;
      }
    });
  }
});

/**
 * Resolves the base cargo capacity for a ship listed in a wave or fleet tooltip row.
 * Handles <technology-icon> attributes, class names, and localized ship names.
 */
export function getShipBaseCargoFromTooltipRow(row: Element): number {
  // 1. Check technology-icon attributes
  const techIcon = row.querySelector('technology-icon');
  if (techIcon) {
    for (const [attr, shipKey] of Object.entries(ICON_ATTR_TO_SHIP)) {
      if (techIcon.hasAttribute(attr)) {
        if (SHIP_BASE_CARGO_MAP[attr] !== undefined) {
          return SHIP_BASE_CARGO_MAP[attr];
        }
        if (SHIP_BASE_CARGO_MAP[shipKey] !== undefined) {
          return SHIP_BASE_CARGO_MAP[shipKey];
        }
      }
    }
  }

  // 2. Check class names on row or icon
  const classList = (row.className + ' ' + (techIcon?.className || '')).toLowerCase();
  for (const [attr, shipKey] of Object.entries(ICON_ATTR_TO_SHIP)) {
    if (classList.includes(attr)) {
      return SHIP_BASE_CARGO_MAP[attr] ?? SHIP_BASE_CARGO_MAP[shipKey] ?? 0;
    }
  }

  // 3. Check name text
  const nameEl = row.querySelector('.fleetTooltipName') || row.querySelector('.name');
  const rawName = (nameEl?.textContent || '').trim().toLowerCase();
  if (!rawName || rawName === 'ships' || rawName === 'arrival time' || rawName.includes('technology')) {
    return 0;
  }

  const cleanName = rawName.replace(/[:\-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (SHIP_BASE_CARGO_MAP[cleanName] !== undefined) {
    return SHIP_BASE_CARGO_MAP[cleanName];
  }

  for (const [shipKey, cargo] of Object.entries(SHIP_BASE_CARGO_MAP)) {
    if (shipKey.length >= 4 && (cleanName === shipKey || cleanName.includes(shipKey) || shipKey.includes(cleanName))) {
      return cargo;
    }
  }

  return 0;
}

export function isExtensionStillValid(): boolean {
  try {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

export function getSafeExtensionUrl(path: string): string {
  try {
    if (isExtensionStillValid() && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(path);
    }
  } catch {
    // Context invalidated or extension reloading
  }
  return '';
}

interface StationedFleetInfo {
  smallCargo: number;
  largeCargo: number;
  totalCapacity: number;
  otherCapacity?: number;
  otherShips?: Record<string, number>;
}

interface OrionMissionData {
  id: string;
  name: string;
  level: number;
  stars: number;
  category: 'delivery' | 'combat' | 'other';
  environment: 'pve' | 'pvp';
  currentWave: number;
  totalWaves: number;
  lithiumCost: number;
  rewardsMsu: number;
  rewardSummaryText: string;
  efficiencyRatio: number;
  maxWaveCargo: number;
  peakWaveNum: number;
  stationedFleet: StationedFleetInfo;
  galaxy?: number;
  system?: number;
  position?: number;
  isCompletedCard?: boolean;
  despawnSeconds?: number;
  completionLithiumCost?: number;
}

/**
 * Extracts wave progression using Gameforge's embedded DOM ID contracts:
 * - id="incoming_${missionId}_w${wave}" (active incoming wave)
 * - id="upcoming_${missionId}_w${wave}" (queued upcoming waves)
 * - query param &wave=${wave} on the combat simulator button
 */
export function parseWaveNumberFromElement(
  el: HTMLElement,
  missionId: string
): { activeWave: number; upcomingWaves: number[]; totalWaves: number } {
  let activeWave = 1;
  const upcomingWaves: number[] = [];
  let totalWaves = 1;

  // 1. Check native incoming countdown ID
  const incomingEl = el.querySelector(`[id^="incoming_${missionId}_w"]`) || document.querySelector(`[id^="incoming_${missionId}_w"]`);
  if (incomingEl?.id) {
    const match = incomingEl.id.match(/_w(\d+)$/i);
    if (match) {
      activeWave = parseInt(match[1], 10);
    }
  }

  // 2. Check native upcoming countdown IDs
  const upcomingEls = el.querySelectorAll(`[id^="upcoming_${missionId}_w"]`);
  const targetUpcoming = upcomingEls.length > 0 ? upcomingEls : document.querySelectorAll(`[id^="upcoming_${missionId}_w"]`);
  targetUpcoming.forEach((item) => {
    const match = item.id.match(/_w(\d+)$/i);
    if (match) {
      const w = parseInt(match[1], 10);
      if (!upcomingWaves.includes(w)) {
        upcomingWaves.push(w);
      }
    }
  });

  // 3. Check simulator button query params
  el.querySelectorAll<HTMLElement>('.waveSimButton').forEach((btn) => {
    const onclickStr = btn.getAttribute('onclick') || '';
    const m = onclickStr.match(/wave=(\d+)/i);
    if (m) {
      const w = parseInt(m[1], 10);
      if (!upcomingWaves.includes(w)) {
        upcomingWaves.push(w);
      }
    }
  });

  // 4. Check details table rows for explicit wave headers
  el.querySelectorAll<HTMLElement>('.missionDetailsTable .cell').forEach((cell) => {
    const m = cell.textContent?.trim().match(/^Wave\s*(\d+)$/i);
    if (m) {
      const w = parseInt(m[1], 10);
      if (!upcomingWaves.includes(w)) {
        upcomingWaves.push(w);
      }
    }
  });

  // 5. Check tooltips for wave shiptip IDs
  document.querySelectorAll(`[id*="${missionId}"][id*="shiptip_w"], [id*="${missionId}"][id*="_w"]`).forEach((tt) => {
    const m = tt.id.match(/_w(\d+)/i);
    if (m) {
      const w = parseInt(m[1], 10);
      if (!upcomingWaves.includes(w)) {
        upcomingWaves.push(w);
      }
    }
  });

  // 6. Check .nodeWave, route text, and briefing for wave progress (e.g. Wave: 2 / 4 or 2 / 6)
  const candidateTexts = el.querySelectorAll('.nodeWave, .nodeLabel, .missionRoute, .briefingText');
  candidateTexts.forEach((node) => {
    const match = node.textContent?.match(/Wave\s*:?\s*(\d+)\s*\/\s*(\d+)/i);
    if (match) {
      const wActive = parseInt(match[1], 10);
      const wTotal = parseInt(match[2], 10);
      activeWave = Math.max(activeWave, wActive);
      totalWaves = Math.max(totalWaves, wTotal);
    }
  });

  const realUpcoming = upcomingWaves.filter((w) => w > activeWave);
  totalWaves = Math.max(totalWaves, activeWave, ...upcomingWaves);

  return { activeWave, upcomingWaves: realUpcoming, totalWaves };
}

export interface CumulativeRewardData {
  rawMetal: number;
  rawCrystal: number;
  rawDeut: number;
  shipMetal: number;
  shipCrystal: number;
  shipDeut: number;
  shipMsu: number;
  ships: Record<string, number>;
  artifacts: number;
  lifeformXp: number;
  totalMetal: number;
  totalCrystal: number;
  totalDeut: number;
  totalMsu: number;
  claimedLithium?: number;
  dbMission?: AnomalyMission;
}

export function parseCumulativeRewardsFromElement(container: HTMLElement): CumulativeRewardData {
  let rawMetal = 0;
  let rawCrystal = 0;
  let rawDeut = 0;
  let shipMetal = 0;
  let shipCrystal = 0;
  let shipDeut = 0;
  let shipMsu = 0;
  const ships: Record<string, number> = {};
  let artifacts = 0;
  let lifeformXp = 0;

  const rewardLines = container.querySelectorAll<HTMLElement>('.rewardLine');
  rewardLines.forEach((line) => {
    if (line.classList.contains('rewardLineEmpty') || line.textContent?.includes('No rewards')) {
      return;
    }

    const nameEl = line.querySelector('.rewardName');
    const nameText = nameEl?.textContent?.trim().toLowerCase() || '';

    const amountEl = line.querySelector('.rewardAmount');
    const rawAmountStr = amountEl?.getAttribute('data-tooltip-title') ||
                         amountEl?.getAttribute('title') ||
                         amountEl?.textContent?.trim();
    const amount = parseOgameAmount(rawAmountStr);
    if (amount <= 0) return;

    const isMetal = line.querySelector('.metal, [class*="metal"]') !== null || nameText.includes('metal');
    const isCrystal = line.querySelector('.crystal, [class*="crystal"]') !== null || nameText.includes('crystal');
    const isDeut = line.querySelector('.deuterium, [class*="deuterium"]') !== null || nameText.includes('deut');

    if (isMetal) {
      rawMetal += amount;
      return;
    }
    if (isCrystal) {
      rawCrystal += amount;
      return;
    }
    if (isDeut) {
      rawDeut += amount;
      return;
    }

    let matchedShipName: string | null = null;
    const techIcon = line.querySelector('technology-icon');
    if (techIcon) {
      for (const attr of Object.keys(ICON_ATTR_TO_SHIP)) {
        if (techIcon.hasAttribute(attr)) {
          matchedShipName = ICON_ATTR_TO_SHIP[attr];
          break;
        }
      }
    }
    if (!matchedShipName && nameText) {
      for (const shipKey of Object.keys(SHIP_COST_MAP)) {
        if (nameText === shipKey || nameText.includes(shipKey) || shipKey.includes(nameText)) {
          matchedShipName = shipKey;
          break;
        }
      }
    }

    if (matchedShipName && SHIP_COST_MAP[matchedShipName]) {
      const cost = SHIP_COST_MAP[matchedShipName];
      shipMetal += cost.metal * amount;
      shipCrystal += cost.crystal * amount;
      shipDeut += cost.deuterium * amount;
      shipMsu += cost.msu * amount;
      ships[matchedShipName] = (ships[matchedShipName] || 0) + amount;
      return;
    }

    const isArtifact = nameText.includes('artefact') ||
                       nameText.includes('artifact') ||
                       line.querySelector('.artefact, .artifact, [class*="artefact"], [class*="artifact"]') !== null ||
                       line.querySelector('resource-icon.artifact, resource-icon[class*="artifact"]') !== null ||
                       line.querySelector('[data-tooltip-title*="Artifact"], [data-tooltip-title*="Artefact"]') !== null;
    if (isArtifact) {
      artifacts += amount;
      return;
    }

    const isLfXp = nameText.includes('lifeform') ||
                   nameText.includes('xp') ||
                   nameText.includes('experience') ||
                   line.querySelector('.speciesExperience, .lifeform, .xp, [class*="speciesExperience"], [class*="lifeform"], [class*="xp"]') !== null ||
                   line.querySelector('resource-icon.speciesExperience, resource-icon[class*="speciesExperience"]') !== null ||
                   line.querySelector('[data-tooltip-title*="Lifeform"], [data-tooltip-title*="Experience"], [data-tooltip-title*="XP"]') !== null;
    if (isLfXp) {
      lifeformXp += amount;
      return;
    }
  });

  const totalMetal = rawMetal + shipMetal;
  const totalCrystal = rawCrystal + shipCrystal;
  const totalDeut = rawDeut + shipDeut;
  const totalMsu = totalMetal * 1.0 + totalCrystal * 1.5 + totalDeut * 3.0;

  return {
    rawMetal,
    rawCrystal,
    rawDeut,
    shipMetal,
    shipCrystal,
    shipDeut,
    shipMsu,
    ships,
    artifacts,
    lifeformXp,
    totalMetal,
    totalCrystal,
    totalDeut,
    totalMsu
  };
}

export interface PlayerCargoCapabilities {
  hyperspaceTech: number;
  isCollector: boolean;
  totalLcBonusPct: number;
  totalScBonusPct: number;
  lcCapacity: number;
  scCapacity: number;
}

// In-memory cache to avoid repeated queries during the same session
let cachedCargoCaps: PlayerCargoCapabilities | null = null;

/**
 * Retrieves the player's true ship cargo capacities considering:
 * 1. Hyperspace Technology (+5% base per level, or server-configured multiplier)
 * 2. Character Class (Collector provides +25% cargo capacity to transports)
 * 3. Lifeform Technologies (accumulated ship-specific bonuses across player's empire)
 */
export async function getPlayerCargoCapabilities(): Promise<PlayerCargoCapabilities> {
  if (cachedCargoCaps !== null) {
    return cachedCargoCaps;
  }

  const metaPlayerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';

  // 1. Primary: Central background database query (calculates Hyperspace Tech + Collector + Lifeforms)
  if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime.sendMessage) {
    try {
      const resp = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'GET_PLAYER_CARGO_BONUSES',
          playerId: metaPlayerId
        }, (res) => resolve(res));
      });

      if (resp?.success && (resp.hyperspaceTech > 0 || resp.lcCapacity > 25000)) {
        // Sanity check: LC capacity should be realistic (between 25k and 300k, not millions)
        const validLc = (resp.lcCapacity >= 25000 && resp.lcCapacity < 300000) ? resp.lcCapacity : 25000;
        const validSc = (resp.scCapacity >= 5000 && resp.scCapacity < 100000) ? resp.scCapacity : 5000;
        cachedCargoCaps = {
          hyperspaceTech: resp.hyperspaceTech || 0,
          isCollector: !!resp.isCollector,
          totalLcBonusPct: resp.totalLcBonusPct || 0,
          totalScBonusPct: resp.totalScBonusPct || 0,
          lcCapacity: validLc,
          scCapacity: validSc
        };
        return cachedCargoCaps;
      }
    } catch {
      // background worker may be busy or reloading
    }
  }

  // 2. Direct local accountInfo fetch if background hasn't synced yet
  try {
    const accRes = await fetch('/game/index.php?page=componentOnly&component=externaldataexport&action=accountInfo&asJson=1', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (accRes.ok) {
      const text = await accRes.text();
      const trimmed = text ? text.trim() : '';
      if (trimmed && !trimmed.startsWith('<') && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
        const data = JSON.parse(trimmed);
        const researches = data.researches || {};
        const hsLevel = parseInt(researches['114'] || researches[114] || 0, 10);
        const isCollector = Number(data.characterClassId || data.playerClass) === 1;
        const classMultiplier = isCollector ? 1.25 : 1.0;
        const hsBonus = hsLevel * 0.05;

        const lcCap = Math.floor(25000 * (1 + hsBonus) * classMultiplier);
        const scCap = Math.floor(5000 * (1 + hsBonus) * classMultiplier);

        cachedCargoCaps = {
          hyperspaceTech: hsLevel,
          isCollector,
          totalLcBonusPct: Math.round(((lcCap / 25000) - 1) * 100),
          totalScBonusPct: Math.round(((scCap / 5000) - 1) * 100),
          lcCapacity: lcCap,
          scCapacity: scCap
        };
        return cachedCargoCaps;
      }
    }
  } catch {
    // quiet fallback
  }

  return {
    hyperspaceTech: 0,
    isCollector: false,
    totalLcBonusPct: 0,
    totalScBonusPct: 0,
    lcCapacity: 25000,
    scCapacity: 5000
  };
}

/**
 * Parses raw text or attribute values into standard numeric amounts.
 */
/**
 * Accurately parses OGame resource/cost amounts handling commas, periods,
 * and standard Gameforge suffixes ('k', 'M', 'Mn', 'B').
 */
function parseOgameAmount(str: string | null | undefined): number {
  if (!str) return 0;
  // Clean special characters: ≈ (U+2248), ~, +, &nbsp;, extra spaces
  const cleaned = str.replace(/&nbsp;/g, ' ').replace(/[≈~+]/g, '').trim();
  if (!cleaned) return 0;

  // 1. Suffix pattern: e.g. "12.652Mn", "12.65M", "450k", "1.2B", even if followed by extra words like "Lithium"
  const suffixMatch = cleaned.match(/([\d,.]+)\s*([kKmMbB][nN]?)/);
  if (suffixMatch) {
    const numPart = suffixMatch[1].replace(',', '.');
    const parts = numPart.split('.');
    let normalized = parts[0];
    if (parts.length > 1) {
      normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }
    const val = parseFloat(normalized);
    const unit = suffixMatch[2].toLowerCase();
    if (unit.startsWith('b')) return Math.round(val * 1_000_000_000);
    if (unit.startsWith('m')) return Math.round(val * 1_000_000);
    if (unit.startsWith('k')) return Math.round(val * 1_000);
    return Math.round(val);
  }

  // 2. Full integer with commas or periods: e.g. "12,652,854" or "12.652.854"
  const digitsOnly = cleaned.replace(/[^\d]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

/**
 * Parses raw text or attribute values into standard numeric amounts.
 */
function cleanNumber(str: string | null | undefined): number {
  return parseOgameAmount(str);
}

/**
 * Formats numbers into clean, human-readable representations (e.g. 144.6M, 3,405).
 */
function formatHuman(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 10_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toLocaleString();
}

interface ParsedRewards {
  metal: number;
  crystal: number;
  deut: number;
  shipsMsu?: number;
  items: string[];
  msu: number;
  summaryText: string;
}

/**
 * Calculates MSU strictly for Metal, Crystal, Deuterium, and Ships (3:2:1 trade standard).
 * Excludes Lifeform XP, Artifacts, and generic items (which yield 0 MSU).
 */
export function calculateRewardItemMsu(line: HTMLElement): {
  msu: number;
  isResource: boolean;
  isShip: boolean;
  name: string;
  amount: number;
} {
  const nameEl = line.querySelector('.rewardName');
  const nameText = nameEl?.textContent?.trim().toLowerCase() || '';

  const amountEl = line.querySelector('.rewardAmount');
  const rawAmountStr = amountEl?.getAttribute('data-tooltip-title') ||
                       amountEl?.getAttribute('title') ||
                       amountEl?.textContent?.trim();
  const amount = parseOgameAmount(rawAmountStr);

  // 1. Raw Resources (3:2:1 ratio)
  const isMetal = line.querySelector('.metal, [class*="metal"]') !== null || nameText.includes('metal');
  const isCrystal = line.querySelector('.crystal, [class*="crystal"]') !== null || nameText.includes('crystal');
  const isDeut = line.querySelector('.deuterium, [class*="deuterium"]') !== null || nameText.includes('deut');

  if (isMetal && amount > 0) {
    return { msu: amount * 1.0, isResource: true, isShip: false, name: 'Metal', amount };
  }
  if (isCrystal && amount > 0) {
    return { msu: amount * 1.5, isResource: true, isShip: false, name: 'Crystal', amount };
  }
  if (isDeut && amount > 0) {
    return { msu: amount * 3.0, isResource: true, isShip: false, name: 'Deuterium', amount };
  }

  // 2. Ships (via technology-icon attribute or name)
  let matchedShipName: string | null = null;
  const techIcon = line.querySelector('technology-icon');
  if (techIcon) {
    for (const attr of Object.keys(ICON_ATTR_TO_SHIP)) {
      if (techIcon.hasAttribute(attr)) {
        matchedShipName = ICON_ATTR_TO_SHIP[attr];
        break;
      }
    }
  }

  if (!matchedShipName && nameText) {
    for (const shipKey of Object.keys(SHIP_MSU_MAP)) {
      if (nameText === shipKey || nameText.includes(shipKey) || shipKey.includes(nameText)) {
        matchedShipName = shipKey;
        break;
      }
    }
  }

  if (matchedShipName && SHIP_MSU_MAP[matchedShipName] !== undefined && amount > 0) {
    const unitMsu = SHIP_MSU_MAP[matchedShipName];
    return { msu: unitMsu * amount, isResource: false, isShip: true, name: matchedShipName, amount };
  }

  // 3. Lifeform XP, Artifacts, or generic items -> 0 MSU
  return { msu: 0, isResource: false, isShip: false, name: nameText || 'Special Loot', amount };
}

/**
 * Parses all rewards individually per .rewardLine so multiple resources
 * and item/ship drops are not accidentally string-concatenated together.
 */
function parseMissionRewards(el: HTMLElement): ParsedRewards {
  let metal = 0;
  let crystal = 0;
  let deut = 0;
  let shipsMsu = 0;
  const items: string[] = [];

  // When el is a full mission card containing both possible and won rewards,
  // ensure we do not double-count by selecting won rewards if available, otherwise possible rewards.
  let rewardLines: NodeListOf<HTMLElement> | HTMLElement[];
  if (el.classList.contains('rewardLine')) {
    rewardLines = [el];
  } else {
    const wonCell = el.querySelector<HTMLElement>('.rewardsCell');
    const possibleCell = el.querySelector<HTMLElement>('.possibleRewardsList, .possibleRewardsCell');

    const wonList = wonCell ? wonCell.querySelectorAll<HTMLElement>('.rewardLine') : null;
    const hasActiveWonRewards =
      wonList &&
      wonList.length > 0 &&
      Array.from(wonList).some(
        (l) => !l.classList.contains('rewardLineEmpty') && !l.textContent?.includes('No rewards')
      );

    if (hasActiveWonRewards && wonCell) {
      rewardLines = wonCell.querySelectorAll<HTMLElement>('.rewardLine');
    } else if (possibleCell && possibleCell.querySelectorAll('.rewardLine').length > 0) {
      rewardLines = possibleCell.querySelectorAll<HTMLElement>('.rewardLine');
    } else {
      rewardLines = el.querySelectorAll<HTMLElement>('.rewardLine');
    }
  }

  rewardLines.forEach((line) => {
    if (line.classList.contains('rewardLineEmpty') || line.textContent?.includes('No rewards')) {
      return;
    }

    const res = calculateRewardItemMsu(line);
    if (res.isResource) {
      if (res.name === 'Metal') metal += res.amount;
      if (res.name === 'Crystal') crystal += res.amount;
      if (res.name === 'Deuterium') deut += res.amount;
    } else if (res.isShip) {
      shipsMsu += res.msu;
      const displayLabel = `${res.name} (${res.amount.toLocaleString()})`;
      if (!items.includes(displayLabel)) {
        items.push(displayLabel);
      }
    } else {
      const nameEl = line.querySelector('.rewardName');
      const baseName = nameEl?.textContent?.trim() ||
                       line.querySelector('[data-tooltip-title]')?.getAttribute('data-tooltip-title')?.split('|')[0] ||
                       line.getAttribute('data-tooltip-title')?.split('|')[0] ||
                       'Bonus Loot';
      const amtEl = line.querySelector('.rewardAmount');
      const rawAmountStr = amtEl?.getAttribute('data-tooltip-title') ||
                           amtEl?.getAttribute('title') ||
                           amtEl?.textContent?.trim();
      const cleanAmt = cleanRewardString(rawAmountStr);
      const displayLabel = cleanAmt && !baseName.includes(cleanAmt) ? `${baseName} (${cleanAmt})` : baseName;
      if (displayLabel && !items.includes(displayLabel)) {
        items.push(displayLabel);
      }
    }
  });

  // Standard OGame MSU (3:2:1 trade standard): 1 Metal = 1.0, 1 Crystal = 1.5, 1 Deuterium = 3.0, Ships = build costs
  const msu = metal * 1.0 + crystal * 1.5 + deut * 3.0 + shipsMsu;

  const parts: string[] = [];
  if (metal > 0) parts.push(`${formatHuman(metal)} M`);
  if (crystal > 0) parts.push(`${formatHuman(crystal)} C`);
  if (deut > 0) parts.push(`${formatHuman(deut)} D`);
  if (items.length > 0) parts.push(items.join(', '));

  const summaryText = parts.length > 0 ? `+${parts.join(' / ')}` : '';

  return { metal, crystal, deut, shipsMsu, items, msu, summaryText };
}

/**
 * Parses Lithium claim costs accurately across tooltip titles and collect buttons.
 */
function parseMissionLithiumCost(el: HTMLElement): number {
  const costEl = el.querySelector('.rewardCostsValue');
  if (costEl) {
    const raw = costEl.getAttribute('data-tooltip-title') ||
                costEl.getAttribute('title') ||
                costEl.textContent?.trim();
    const val = parseOgameAmount(raw);
    if (val > 0) return val;
  }

  const completedCost = el.querySelector('.missionCompletedCost');
  if (completedCost) {
    const match = completedCost.textContent?.match(/costs:\s*([\d,.]+)/i) || completedCost.textContent?.match(/([\d,.]+)/);
    if (match) {
      const val = parseOgameAmount(match[1]);
      if (val > 0) return val;
    }
  }

  const collectSub = el.querySelector('.collectRewards .btnSub, .actionCenter .btnSub');
  if (collectSub) {
    const match = collectSub.textContent?.match(/[\d,.]+/);
    if (match) {
      const val = parseOgameAmount(match[0]);
      if (val > 0) return val;
    }
  }

  return 0;
}

/**
 * Accurately extracts the Lithium cost from a collect modal wave row (.cwCost).
 * Strips any injected Nexus badges or DOM decorations before reading to prevent regex pollution.
 * Requires an explicit cost keyword (e.g. "costs:", "kosten:", "lithium", "coût", "coste", "costo")
 * or a structured numeric amount typical of Lithium costs (> 1,000) to prevent false positives
 * from wave numbers or injected MSU badge amounts.
 */
function extractWaveLithiumCost(el: HTMLElement | null | undefined): number {
  if (!el) return 0;
  // Clone element so we don't mutate the live DOM, and strip any injected Nexus badges/decorations
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.nexus-wave-msu-badge, .nexus-yield-accent, [class*="nexus-"]').forEach((b) => b.remove());
  const rawText = clone.textContent?.trim() || '';
  if (!rawText) return 0;

  // 1. Multilingual explicit cost label: "Lithium costs: 507,791", "Lithiumkosten: 507.791", "Coût en lithium : 507 791"
  const explicitMatch = rawText.match(/(?:cost[s]?|kosten|coût[s]?|coste[s]?|costo[s]?|lithium)\D*([\d,.]+)/i);
  if (explicitMatch) {
    const val = parseOgameAmount(explicitMatch[1]);
    if (val > 0) return val;
  }

  // 2. Structured numeric amounts with thousands separators (e.g. "507,791" or "1.103.755")
  const structuredMatch = rawText.match(/\b\d{1,3}(?:[.,]\d{3})+\b/);
  if (structuredMatch) {
    const val = parseOgameAmount(structuredMatch[0]);
    if (val > 1000) return val;
  }

  // 3. Compact units (e.g. "508k", "1.1M")
  const unitMatch = rawText.match(/\b\d+(?:[.,]\d+)?\s*[kKmMbB][nN]?\b/);
  if (unitMatch) {
    const val = parseOgameAmount(unitMatch[0]);
    if (val > 1000) return val;
  }

  return 0;
}

/**
 * Inspects all tooltips associated with a mission ID to calculate wave requirements
 * and player stationed fleets.
 */
function parseWaveAndFleetDetails(
  missionId: string,
  cargoCaps: PlayerCargoCapabilities
): { maxWaveCargo: number; peakWaveNum: number; stationedFleet: StationedFleetInfo } {
  const lcPlayerCap = cargoCaps.lcCapacity;
  const scPlayerCap = cargoCaps.scCapacity;

  let maxWaveCargo = 0;
  let peakWaveNum = 1;

  // 1. Parse Wave Tooltips (NPC waves have base cargo: SC=5,000, LC=25,000, Probe=5, Recycler=20,000, Pathfinder=10,000, etc.)
  // Tooltips can match: incoming_<id>_shiptip_w*, upcoming_<id>_shiptip_w*, fleetTip_<id>_npc_*, fleetEvents_<id>_*
  const waveTooltips = document.querySelectorAll(
    `[id*="${missionId}"][id*="shiptip_w"], [id*="fleetTip_${missionId}_npc_"], [id*="fleetEvents_${missionId}_"]`
  );

  const waveCargoMap = new Map<number, number>();

  waveTooltips.forEach((tt) => {
    // If it is player's own fleet, skip
    if (tt.id.includes('_own_') || tt.closest('.fleetEventRow.own')) return;

    let waveNum = 1;
    const waveMatch = tt.id.match(/shiptip_w(\d+)/i);
    if (waveMatch) {
      waveNum = parseInt(waveMatch[1], 10);
    } else {
      const h1Text = tt.querySelector('h1')?.textContent || '';
      const h1Match = h1Text.match(/Wave\s*(\d+)/i);
      if (h1Match) {
        waveNum = parseInt(h1Match[1], 10);
      }
    }

    let waveCargo = 0;
    const rows = tt.querySelectorAll('.fleetTooltipRow');
    rows.forEach((row) => {
      if (row.classList.contains('fleetTooltipArrival')) return;
      const countText = row.querySelector('.fleetTooltipCount')?.textContent?.trim();
      const count = cleanNumber(countText);
      if (count <= 0) return;

      const baseCargo = getShipBaseCargoFromTooltipRow(row);
      waveCargo += count * baseCargo;
    });

    if (waveCargo > 0) {
      const existing = waveCargoMap.get(waveNum) || 0;
      if (waveCargo > existing) {
        waveCargoMap.set(waveNum, waveCargo);
      }
    }
  });

  waveCargoMap.forEach((cargo, wNum) => {
    if (cargo > maxWaveCargo) {
      maxWaveCargo = cargo;
      peakWaveNum = wNum;
    }
  });

  // 2. Parse Stationed / En Route Player Fleets
  let stationedSC = 0;
  let stationedLC = 0;
  let stationedOtherCapacity = 0;
  const stationedOtherShips: Record<string, number> = {};
  const playerTechMultiplier = 1 + (cargoCaps.hyperspaceTech || 0) * 0.05;

  const parsePlayerFleetRow = (row: Element) => {
    if (row.classList.contains('fleetTooltipArrival')) return;
    const countText = row.querySelector('.fleetTooltipCount')?.textContent?.trim();
    const count = cleanNumber(countText);
    if (count <= 0) return;

    const name = row.querySelector('.fleetTooltipName')?.textContent?.trim().toLowerCase() || '';
    const techIcon = row.querySelector('technology-icon');
    const isSC = name.includes('small cargo') || (techIcon && techIcon.hasAttribute('transportersmall'));
    const isLC = name.includes('large cargo') || (techIcon && techIcon.hasAttribute('transporterlarge'));

    if (isSC) {
      stationedSC += count;
    } else if (isLC) {
      stationedLC += count;
    } else {
      const baseCargo = getShipBaseCargoFromTooltipRow(row);
      if (baseCargo > 0) {
        stationedOtherCapacity += count * Math.floor(baseCargo * playerTechMultiplier);
        const cleanLabel = name.replace(/[:\-_]/g, ' ').replace(/\s+/g, ' ').trim() || 'Other';
        stationedOtherShips[cleanLabel] = (stationedOtherShips[cleanLabel] || 0) + count;
      }
    }
  };

  // Primary: Dedicated route tooltips for player's own fleets stationed or flying to the anomaly.
  const ownMapTooltips = document.querySelectorAll<HTMLElement>(`[id*="fleetTip_${missionId}_own_"]`);

  if (ownMapTooltips.length > 0) {
    ownMapTooltips.forEach((tt) => {
      if (tt.id.includes('npc') || tt.closest('.fleetEventRow.npc')) return;
      const rows = tt.querySelectorAll('.fleetTooltipRow');
      rows.forEach(parsePlayerFleetRow);
    });
  } else {
    // Secondary fallback: Parse Fleets table inside expanded details (.anomalyMissionDetails)
    const ownTableRows = document.querySelectorAll<HTMLElement>(
      `.fleetEventRow.own.holding, .fleetEventRow.own.flying, .fleetEventRow.own:not(.returning):not(.npc)`
    );

    const processedIds = new Set<string>();

    ownTableRows.forEach((rowEl) => {
      if (rowEl.classList.contains('returning') || rowEl.classList.contains('npc')) return;

      const ttEl = rowEl.querySelector<HTMLElement>(`[id*="fleetEvents_${missionId}_"]`);
      if (ttEl && !processedIds.has(ttEl.id)) {
        processedIds.add(ttEl.id);
        const rows = ttEl.querySelectorAll('.fleetTooltipRow');
        rows.forEach(parsePlayerFleetRow);
      }
    });
  }

  const stationedCapacity = stationedSC * scPlayerCap + stationedLC * lcPlayerCap + stationedOtherCapacity;

  return {
    maxWaveCargo,
    peakWaveNum,
    stationedFleet: {
      smallCargo: stationedSC,
      largeCargo: stationedLC,
      totalCapacity: stationedCapacity,
      otherCapacity: stationedOtherCapacity,
      otherShips: stationedOtherShips
    },
  };
}

/**
 * Resolves the destination coordinates [galaxy:system:position] for an anomaly mission card.
 * In OGame's route diagram:
 * - 1st cell (originNode / routeLabelCell:first-child) is the player's departure planet/moon.
 * - 2nd cell (deepSpaceNode / routeLabelCell:nth-child(2)) is the ANOMALY destination.
 * - 3rd cell (targetNode / routeLabelCell:nth-child(3)) is the active threat / wave info.
 */
export function extractMissionCoords(el: Element): { galaxy?: number; system?: number; position?: number } {
  // Method 1: Check the 2nd cell in .missionRouteLabels (The Anomaly Destination)
  const anomalyCell = el.querySelector('.missionRouteLabels .routeLabelCell:nth-child(2)');
  if (anomalyCell) {
    const coordsLink = anomalyCell.querySelector('a.nodeCoords, .nodeCoords');
    const text = coordsLink?.textContent?.trim() || anomalyCell.textContent || '';
    const match = text.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      return {
        galaxy: parseInt(match[1], 10),
        system: parseInt(match[2], 10),
        position: parseInt(match[3], 10),
      };
    }
  }

  // Method 2: Check all .routeLabelCell elements by array index (index 1 is the 2nd cell)
  const routeLabelCells = el.querySelectorAll('.missionRouteLabels .routeLabelCell');
  if (routeLabelCells.length >= 2) {
    const coordsLink = routeLabelCells[1].querySelector('a.nodeCoords, .nodeCoords');
    const text = coordsLink?.textContent?.trim() || routeLabelCells[1].textContent || '';
    const match = text.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      return {
        galaxy: parseInt(match[1], 10),
        system: parseInt(match[2], 10),
        position: parseInt(match[3], 10),
      };
    }
  }

  // Method 3: Check deepSpaceNode or routeNode 2nd child in the route graphics
  const deepSpace = el.querySelector('.routeNode.deepSpaceNode, .routeNode:nth-child(2)');
  if (deepSpace) {
    const rawAttr =
      (deepSpace.getAttribute('title') || '') +
      ' ' +
      (deepSpace.getAttribute('data-tooltip-title') || '') +
      ' ' +
      (deepSpace.getAttribute('onclick') || '');
    const match = rawAttr.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      return {
        galaxy: parseInt(match[1], 10),
        system: parseInt(match[2], 10),
        position: parseInt(match[3], 10),
      };
    }
  }

  // Method 4: Scan distinct coordinates across native card content (excluding nexus injected markup)
  const cleanClone = el.cloneNode(true) as HTMLElement;
  cleanClone
    .querySelectorAll(
      '.nexus-mission-intel-bar, .nexus-native-advisory-section, .nexus-tag, a[href*="fleetdispatch"]'
    )
    .forEach((n) => n.remove());
  const allText = cleanClone.textContent || '';
  const distinctMatches: Array<{ galaxy: number; system: number; position: number }> = [];
  const seen = new Set<string>();
  for (const m of allText.matchAll(/(\d+):(\d+):(\d+)/g)) {
    const key = `${m[1]}:${m[2]}:${m[3]}`;
    if (!seen.has(key)) {
      seen.add(key);
      distinctMatches.push({
        galaxy: parseInt(m[1], 10),
        system: parseInt(m[2], 10),
        position: parseInt(m[3], 10),
      });
    }
  }

  // Index 0 is origin, Index 1 is the anomaly destination
  if (distinctMatches.length >= 2) {
    return distinctMatches[1];
  } else if (distinctMatches.length === 1) {
    return distinctMatches[0];
  }

  return {};
}

/**
 * Builds the generic fleet dispatch URL for an anomaly destination with pre-filled ships.
 * Compatible with any OGame universe (e.g. s808-en.ogame.gameforge.com).
 * Mission type for anomalies is 14; Target type is 4 (Anomaly body).
 * Supports single ship (shipId, amount) or multiple ships (Record<number, number>).
 * Supports optional origin planet/moon ID (cp parameter).
 */
export function buildAnomalyFleetDispatchUrl(
  coords: { galaxy?: number; system?: number; position?: number },
  shipIdOrShips: number | Record<number, number>,
  amount?: number,
  planetId?: string
): string {
  const host = window.location.host;
  const params = new URLSearchParams();
  params.set('page', 'ingame');
  params.set('component', 'fleetdispatch');
  if (coords.galaxy) params.set('galaxy', String(coords.galaxy));
  if (coords.system) params.set('system', String(coords.system));
  if (coords.position) params.set('position', String(coords.position));
  params.set('type', '4');
  params.set('mission', '14');
  if (planetId) params.set('cp', String(planetId));

  if (typeof shipIdOrShips === 'number') {
    if (amount !== undefined && amount > 0) {
      params.set(`am${shipIdOrShips}`, String(amount));
    }
  } else if (shipIdOrShips && typeof shipIdOrShips === 'object') {
    for (const [sId, amt] of Object.entries(shipIdOrShips)) {
      const parsedAmt = typeof amt === 'number' ? amt : parseInt(String(amt), 10);
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        params.set(`am${sId}`, String(parsedAmt));
      }
    }
  }

  return `https://${host}/game/index.php?${params.toString()}`;
}

/**
 * Dispatches the player to the fleet dispatch screen with pre-filled ships and coordinates.
 * Persists payload in sessionStorage as fallback and navigates to the generic URL.
 * Supports single ship dispatch (coords, 203, neededLC) or multi-ship dispatch (coords, ships, planetId).
 */
export function dispatchFleetToAnomaly(
  coords: { galaxy?: number; system?: number; position?: number },
  shipIdOrShips: number | Record<number, number>,
  amountOrPlanetId?: number | string,
  planetId?: string
): void {
  const shipsMap: Record<number, number> = {};
  let targetPlanetId: string | undefined = planetId;

  if (typeof shipIdOrShips === 'number') {
    if (typeof amountOrPlanetId === 'number' && amountOrPlanetId > 0) {
      shipsMap[shipIdOrShips] = amountOrPlanetId;
    }
  } else if (shipIdOrShips && typeof shipIdOrShips === 'object') {
    for (const [idStr, val] of Object.entries(shipIdOrShips)) {
      const amt = Number(val);
      const sid = parseInt(idStr, 10);
      if (!isNaN(sid) && !isNaN(amt) && amt > 0) {
        shipsMap[sid] = amt;
      }
    }
    if (typeof amountOrPlanetId === 'string' && !targetPlanetId) {
      targetPlanetId = amountOrPlanetId;
    }
  }

  const primaryShipId = typeof shipIdOrShips === 'number' ? shipIdOrShips : (Object.keys(shipsMap).map(Number)[0] || 0);
  const primaryAmount = typeof shipIdOrShips === 'number' && typeof amountOrPlanetId === 'number'
    ? amountOrPlanetId
    : (Object.values(shipsMap)[0] || 0);

  try {
    sessionStorage.setItem(
      'ognexus_orion_auto_fleet',
      JSON.stringify({
        galaxy: coords.galaxy,
        system: coords.system,
        position: coords.position,
        type: 4,
        mission: 14,
        planetId: targetPlanetId,
        ships: shipsMap,
        shipId: primaryShipId,
        amount: primaryAmount,
        timestamp: Date.now(),
      })
    );
  } catch (err) {
    console.debug('[OGameNexus Orion] Failed to set auto fleet sessionStorage:', err);
  }

  const targetUrl = buildAnomalyFleetDispatchUrl(coords, shipsMap, undefined, targetPlanetId);
  window.location.href = targetUrl;
}

/**
 * Convenience helper to dispatch multiple ships to an anomaly from a specific origin planet/moon.
 */
export function dispatchMultiFleetToAnomaly(
  coords: { galaxy?: number; system?: number; position?: number },
  ships: Record<number, number>,
  planetId?: string
): void {
  dispatchFleetToAnomaly(coords, ships, planetId);
}

/**
 * Extracts all core parameters from a mission card DOM element.
 */
function parseMissionElement(el: HTMLElement, cargoCaps: PlayerCargoCapabilities): OrionMissionData | null {
  let missionId = el.getAttribute('data-space-object-id') || el.dataset.spaceObjectId || el.querySelector('[data-space-object-id]')?.getAttribute('data-space-object-id');
  if (!missionId) {
    const targetUrl = el.querySelector('[data-target*="spaceObjectId="]')?.getAttribute('data-target') ||
                      el.querySelector('[data-target*="target="]')?.getAttribute('data-target') || '';
    const matchId = targetUrl.match(/[?&](?:spaceObjectId|target)=(\d+)/);
    if (matchId) missionId = matchId[1];
  }
  if (!missionId) return null;

  // 1. Mission Name parsing
  let rawName = el.querySelector('.missionDetailsTitle .missionNameText')?.textContent?.trim() ||
                el.querySelector('.missionDetailsTitle input.missionNameInput')?.getAttribute('value')?.trim() ||
                el.querySelector('.missionRouteLabels .routeLabelCell:nth-child(2) .nodeLabel')?.textContent?.trim() ||
                el.querySelector('.missionNameText')?.textContent?.trim() ||
                '';

  if (!rawName || rawName.toLowerCase() === 'unknown mission') {
    const routeDestName = el.querySelector('.missionRouteLabels .routeLabelCell:nth-child(2) .nodeLabel')?.textContent?.trim();
    if (routeDestName) {
      rawName = routeDestName;
    } else {
      rawName = 'Anomaly Mission';
    }
  }

  // 2. Subtitle Tag Inspection (PvE vs PvP, Combat vs Delivery)
  // Gameforge renders text in subtitle icons: <span class="scannerResultTypeIcon pve titleTypeIcon">PvE</span>
  // Note: Gameforge often reuses .pvp class on Combat tags just to make them red, so we MUST check textContent!
  const subtitleSpans = el.querySelectorAll<HTMLElement>('.missionDetailsSubtitle .titleTypeIcon, .missionDetailsSubtitle .scannerResultTypeIcon');
  let environment: 'pve' | 'pvp' = 'pve';
  let category: 'combat' | 'delivery' = 'delivery';
  let foundCategoryInSubtitle = false;
  let foundEnvInSubtitle = false;

  subtitleSpans.forEach((span) => {
    if (span.classList.contains('nexus-tag')) return;

    const txt = span.textContent?.trim().toLowerCase() || '';
    if (txt === 'pvp') {
      environment = 'pvp';
      foundEnvInSubtitle = true;
    } else if (txt === 'pve') {
      environment = 'pve';
      foundEnvInSubtitle = true;
    } else if (txt === 'combat') {
      category = 'combat';
      foundCategoryInSubtitle = true;
    } else if (txt === 'delivery') {
      category = 'delivery';
      foundCategoryInSubtitle = true;
    }
  });

  // Fallbacks if not explicitly found in subtitle text
  if (!foundCategoryInSubtitle) {
    const lowerName = rawName.toLowerCase();
    if (lowerName.includes('delivery')) {
      category = 'delivery';
    } else if (
      lowerName.includes('rescue') ||
      lowerName.includes('combat') ||
      lowerName.includes('resource:') ||
      lowerName.includes('encounter') ||
      lowerName.includes('defend') ||
      lowerName.includes('chaos') ||
      !!el.querySelector('.waveSimButton, [onclick*="combatsim"], .waveMissionIcon.combat')
    ) {
      category = 'combat';
    } else if (el.classList.contains('combat')) {
      category = 'combat';
    } else if (el.classList.contains('delivery')) {
      category = 'delivery';
    }
  }

  if (!foundEnvInSubtitle) {
    if (el.classList.contains('pve') || !!el.querySelector('.scannerResultTypeIcon.pve')) {
      environment = 'pve';
    } else if (el.classList.contains('pvp') && !el.querySelector('.scannerResultTypeIcon.pve')) {
      environment = 'pvp';
    }
  }

  // Level
  const levelEl = el.querySelector('.missionLevel');
  const levelMatch = levelEl?.textContent?.match(/Level\s*(\d+)/i);
  const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;

  // Star Rating
  const starsCount = el.querySelectorAll('.missionDifficultyStars img').length;

  // Waves count (e.g. Wave: 1 / 5 or from incoming_${missionId}_w*)
  const waveInfo = parseWaveNumberFromElement(el, missionId);
  const currentWave = waveInfo.activeWave;
  const totalWaves = Math.max(waveInfo.totalWaves, 1);

  // Lithium Cost & Yield calculation
  const totalLithiumCost = parseMissionLithiumCost(el);
  const collectSub = el.querySelector('.collectRewards .btnSub, .actionCenter .btnSub');
  const collectCost = parseOgameAmount(collectSub?.textContent);

  // Rewards & MSU conversion
  const wonCell = el.querySelector<HTMLElement>('.rewardsCell');
  const wonList = wonCell ? wonCell.querySelectorAll<HTMLElement>('.rewardLine') : null;
  const hasActiveWonRewards =
    wonList &&
    wonList.length > 0 &&
    Array.from(wonList).some(
      (l) => !l.classList.contains('rewardLineEmpty') && !l.textContent?.includes('No rewards')
    );

  const rewards = parseMissionRewards(el);

  // Standard OGame MSU: 1 M : 1.5 C : 3.0 D (3:2:1 standard)
  let efficiencyRatio = 0;
  if (hasActiveWonRewards && collectCost > 0 && rewards.msu > 0) {
    // If completed wave rewards are waiting with an active claim cost, measure exact yield of this batch
    const rawRatio = rewards.msu / collectCost;
    if (isFinite(rawRatio) && rawRatio >= 0.05 && rawRatio <= 1000.0) {
      efficiencyRatio = rawRatio;
    }
  } else if (totalLithiumCost > 0 && rewards.msu > 0) {
    // Otherwise measure overall mission yield
    const rawRatio = rewards.msu / totalLithiumCost;
    if (isFinite(rawRatio) && rawRatio >= 0.05 && rawRatio <= 1000.0) {
      efficiencyRatio = rawRatio;
    }
  }

  // Parse Waves & Stationed Fleet
  const { maxWaveCargo, peakWaveNum, stationedFleet } = parseWaveAndFleetDetails(missionId, cargoCaps);

  // Target coordinates parsing
  const targetCoords = extractMissionCoords(el);
  const galaxy = targetCoords.galaxy;
  const system = targetCoords.system;
  const position = targetCoords.position;

  const isCompletedCard = !!el.querySelector('.missionCompleted');
  const completedTimerEl = el.querySelector<HTMLElement>('.missionCompletedTimer, [id^="rewardTimer_"]');
  const despawnSeconds = completedTimerEl ? parseInt(completedTimerEl.getAttribute('data-seconds') || '0', 10) : undefined;

  let completionLithiumCost: number | undefined;
  const completedCost = el.querySelector('.missionCompletedCost');
  if (completedCost) {
    const match = completedCost.textContent?.match(/costs:\s*([\d,.]+)/i) || completedCost.textContent?.match(/([\d,.]+)/);
    if (match) {
      const val = parseOgameAmount(match[1]);
      if (val > 0) completionLithiumCost = val;
    }
  }

  return {
    id: missionId,
    name: rawName,
    level,
    stars: starsCount,
    category,
    environment,
    currentWave: isCompletedCard ? totalWaves : currentWave,
    totalWaves,
    lithiumCost: hasActiveWonRewards && collectCost > 0 ? collectCost : totalLithiumCost,
    rewardsMsu: rewards.msu,
    rewardSummaryText: rewards.summaryText,
    efficiencyRatio,
    maxWaveCargo,
    peakWaveNum,
    stationedFleet,
    galaxy,
    system,
    position,
    isCompletedCard,
    despawnSeconds,
    completionLithiumCost
  };
}

interface MissionRewardDetail {
  name: string;
  amountText: string;
  iconHtml: string;
  color: string;
}

let activeRewardsTooltip: HTMLElement | null = null;

function hideRewardsTooltip(): void {
  if (activeRewardsTooltip) {
    activeRewardsTooltip.remove();
    activeRewardsTooltip = null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', hideRewardsTooltip, { passive: true });
}

function positionRewardsTooltip(e: MouseEvent, tip: HTMLElement): void {
  const pad = 14;
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  const rect = tip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 10) {
    x = e.clientX - rect.width - pad;
  }
  if (y + rect.height > window.innerHeight - 10) {
    y = e.clientY - rect.height - pad;
  }
  tip.style.left = `${Math.max(10, x)}px`;
  tip.style.top = `${Math.max(10, y)}px`;
}

const ICON_REWARD_POOL_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>`;

const ICON_CLAIMED_REWARDS_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 2 2 4-4"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>`;

const ICON_WAVE_SIM_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></svg>`;

function showRewardPoolTooltip(e: MouseEvent, el: HTMLElement, mission: OrionMissionData): void {
  hideRewardsTooltip();

  const details = extractPossibleRewardDetails(el, mission);
  const totalMsu = mission.rewardsMsu;

  const tip = document.createElement('div');
  tip.id = 'nexus-floating-rewards-tooltip';
  tip.className = 'nexus-floating-rewards-tooltip';

  let rowsHtml = '';
  details.forEach((d) => {
    rowsHtml += `
      <div class="nexus-reward-row" style="display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 14px !important; white-space: nowrap !important; line-height: 22px !important;">
        <div class="nexus-reward-left" style="display: inline-flex !important; align-items: center !important; gap: 6px !important; flex-shrink: 0 !important;">
          ${d.iconHtml}
          <span class="nexus-reward-name" style="color: #cbd5e1; font-weight: 600; font-size: 11px;">${d.name}</span>
        </div>
        <span class="nexus-reward-amount" style="color: ${d.color}; font-weight: 700; font-family: monospace, sans-serif; font-size: 11px; white-space: nowrap !important; margin-left: auto !important; text-align: right !important;">${d.amountText}</span>
      </div>
    `;
  });

  const msuBadge = totalMsu > 0
    ? `<span style="margin-left: auto; font-size: 10px; color: #fbbf24; font-weight: 700; background: rgba(245, 158, 11, 0.15); padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(245, 158, 11, 0.35);">${formatHuman(totalMsu)} MSU</span>`
    : '';

  tip.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 7px; padding-bottom: 5px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
      <span style="color: #fbbf24; display: flex; align-items: center;">${ICON_REWARD_POOL_SVG}</span>
      <span style="font-weight: 700; color: #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Reward Pool</span>
      ${msuBadge}
    </div>
    <div style="display: flex; flex-direction: column; gap: 5px;">
      ${rowsHtml || '<span style="color: #94a3b8; font-size: 11px;">No rewards detected</span>'}
    </div>
  `;

  document.body.appendChild(tip);
  activeRewardsTooltip = tip;

  positionRewardsTooltip(e, tip);
}

let activeClaimedTooltipRequestId = 0;

async function showClaimedRewardsTooltip(e: MouseEvent, el: HTMLElement, mission: OrionMissionData): Promise<void> {
  const reqId = ++activeClaimedTooltipRequestId;
  hideRewardsTooltip();

  const cumul = await extractClaimedRewardData(el, mission);

  // If another hover triggered or mouse already left the button, abandon render
  if (reqId !== activeClaimedTooltipRequestId) return;
  const btn = el.querySelector<HTMLElement>('.nexus-btn-claimed-rewards');
  if (btn && !btn.matches(':hover')) return;

  const totalMsu = cumul.totalMsu;
  const msuFormatted = totalMsu > 0 ? formatHuman(totalMsu) : '0';
  const metalFormatted = formatHuman(cumul.totalMetal);
  const crystalFormatted = formatHuman(cumul.totalCrystal);
  const deutFormatted = formatHuman(cumul.totalDeut);
  const artifactsFormatted = cumul.artifacts > 0 ? cumul.artifacts.toLocaleString() : '0';
  const lfXpFormatted = cumul.lifeformXp > 0 ? formatHuman(cumul.lifeformXp) : '0';

  const msuTitle = `Total Valuation: ${totalMsu.toLocaleString()} MSU (3:2:1 Trade Standard)\n• Raw Resources: ${formatHuman(cumul.rawMetal * 1.0 + cumul.rawCrystal * 1.5 + cumul.rawDeut * 3.0)} MSU\n• Ship Fleet: ${formatHuman(cumul.shipMsu)} MSU`;
  const metalTitle = `Total Metal: ${cumul.totalMetal.toLocaleString()}\n• Raw Metal: ${cumul.rawMetal.toLocaleString()}\n• Ship Construction Metal: ${cumul.shipMetal.toLocaleString()}`;
  const crystalTitle = `Total Crystal: ${cumul.totalCrystal.toLocaleString()}\n• Raw Crystal: ${cumul.rawCrystal.toLocaleString()}\n• Ship Construction Crystal: ${cumul.shipCrystal.toLocaleString()}`;
  const deutTitle = `Total Deuterium: ${cumul.totalDeut.toLocaleString()}\n• Raw Deuterium: ${cumul.rawDeut.toLocaleString()}\n• Ship Construction Deut: ${cumul.shipDeut.toLocaleString()}`;
  const artTitle = cumul.artifacts > 0 ? `Artifacts: ${cumul.artifacts.toLocaleString()}` : 'No artifacts found in waves';
  const xpTitle = cumul.lifeformXp > 0 ? `Lifeform XP: ${cumul.lifeformXp.toLocaleString()}` : 'No Lifeform XP found in waves';

  let shipsHtml = '';
  // Normalize and group ships by canonical name
  const canonicalShips: Record<string, number> = {};
  for (const [rawKey, count] of Object.entries(cumul.ships)) {
    if (count <= 0) continue;
    const attr = getShipIconAttribute(rawKey);
    const canon = ICON_ATTR_TO_SHIP[attr] || rawKey.toLowerCase().trim();
    canonicalShips[canon] = (canonicalShips[canon] || 0) + count;
  }

  const shipEntries = Object.entries(canonicalShips).filter(([_, count]) => count > 0);
  if (shipEntries.length > 0) {
    shipEntries.sort((a, b) => {
      const idxA = SHIP_CANONICAL_ORDER.indexOf(a[0].toLowerCase());
      const idxB = SHIP_CANONICAL_ORDER.indexOf(b[0].toLowerCase());
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    const totalShipsCount = shipEntries.reduce((sum, [_, count]) => sum + count, 0);
    const shipCells = shipEntries.map(([shipName, count]) => {
      const iconAttr = getShipIconAttribute(shipName);
      const dispName = getShipDisplayName(shipName);
      return `
        <div class="nexus-claimed-ship-cell nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(dispName)} | ${count.toLocaleString()} vessels recovered">
          <technology-icon regular="" ${iconAttr}="" sq20=""></technology-icon>
          <span class="nexus-ship-count">${count.toLocaleString()}</span>
        </div>
      `;
    }).join('');

    shipsHtml = `
      <div class="nexus-claimed-ships-container">
        <div class="nexus-claimed-ships-header">
          <span>Claimed Ships</span>
          <span style="color: #38bdf8 !important; font-size: 9.5px !important; font-weight: 600 !important;">${totalShipsCount.toLocaleString()} Total</span>
        </div>
        <div class="nexus-claimed-ships-grid">
          ${shipCells}
        </div>
      </div>
    `;
  }

  const hasAnyClaimed = totalMsu > 0 || cumul.artifacts > 0 || cumul.lifeformXp > 0 || shipEntries.length > 0;
  const noRewardsNote = !hasAnyClaimed
    ? `<div style="text-align: center; color: #64748b; font-size: 10px; margin-top: 6px; font-style: italic;">No rewards claimed yet from active waves</div>`
    : '';

  const hasCollectAction = hasActiveCollectRewardsButton(el);
  const confirmedWaves = (cumul.dbMission?.waves || []).filter(
    (w) => w.claimMethod === 'modal_confirmation' || (!hasCollectAction && (w.lithiumCost || 0) > 0)
  );
  const completedWavesCount = confirmedWaves.length;
  const totalWaves = Math.max(mission.totalWaves || cumul.dbMission?.totalWaves || 1, 1);
  const currentWave = mission.currentWave || cumul.dbMission?.currentWave || 1;
  const hasActiveWaveElement = !!(
    el.querySelector('.routeNode.deepSpaceNode') ||
    el.querySelector('.nodeWave') ||
    el.querySelector('[id^="npcTimer_"]') ||
    el.querySelector('.actionRight button.primaryAction')
  );

  const isTrulyCompleted = (mission.isCompletedCard ||
    (cumul.dbMission?.status === 'completed' && !hasActiveWaveElement) ||
    (completedWavesCount >= totalWaves && totalWaves >= 1 && !hasActiveWaveElement)) && !hasCollectAction;

  let waveLabel: string;
  let wavesDoneCount = 0;
  if (isTrulyCompleted) {
    waveLabel = 'All Waves Completed';
    wavesDoneCount = totalWaves;
  } else if (totalWaves > 1) {
    wavesDoneCount = Math.min(totalWaves - 1, completedWavesCount);
    waveLabel = `Wave ${wavesDoneCount} / ${totalWaves}`;
  } else {
    wavesDoneCount = completedWavesCount > 0 ? 1 : 0;
    waveLabel = completedWavesCount > 0 ? 'Wave 1 / 1' : 'Wave 0 / 1';
  }

  // Calculate claimed Lithium fuel spent across confirmed waves
  const collectSub = el.querySelector('.collectRewards .btnSub, .actionCenter .btnSub, [class*="collect"] .btnSub');
  const activeCollectCost = parseOgameAmount(collectSub?.textContent);

  const canonicalWaveCost =
    confirmedWaves.find((w) => (w.lithiumCost || 0) >= 1000)?.lithiumCost ||
    (cumul.dbMission?.waves || []).find((w) => (w.lithiumCost || 0) >= 1000)?.lithiumCost ||
    (activeCollectCost >= 1000 ? activeCollectCost : 0) ||
    (cumul.dbMission?.completionLithiumCost && totalWaves > 0 ? Math.round(cumul.dbMission.completionLithiumCost / totalWaves) : 0) ||
    (cumul.dbMission?.totalLithiumBudget && totalWaves > 0 ? Math.round(cumul.dbMission.totalLithiumBudget / totalWaves) : 0) ||
    (mission.lithiumCost > 0 && totalWaves > 0 ? (totalWaves > 1 && mission.lithiumCost > 10000000 ? Math.round(mission.lithiumCost / totalWaves) : mission.lithiumCost) : 0);

  let claimedLithium = cumul.claimedLithium || 0;
  if (claimedLithium === 0 && confirmedWaves.length > 0) {
    claimedLithium = confirmedWaves.reduce((sum, w) => {
      const c = (w.lithiumCost && w.lithiumCost >= 1000) ? w.lithiumCost : canonicalWaveCost;
      return sum + c;
    }, 0);
  }

  if (cumul.dbMission?.totalClaimedLithium && cumul.dbMission.totalClaimedLithium > claimedLithium) {
    claimedLithium = cumul.dbMission.totalClaimedLithium;
  }

  if (claimedLithium === 0 && wavesDoneCount > 0 && canonicalWaveCost > 0) {
    claimedLithium = wavesDoneCount * canonicalWaveCost;
  }

  // Compute claimed yield ratio: (MSU Claimed / Lithium)
  let claimedYield = (claimedLithium > 0 && totalMsu > 0) ? (totalMsu / claimedLithium) : 0;
  if (claimedYield === 0 && totalMsu > 0 && mission.efficiencyRatio > 0) {
    claimedYield = mission.efficiencyRatio;
  }

  const yieldBadgeText = claimedYield > 0 ? `${claimedYield.toFixed(1)} MSU / Lithium` : '0.0 MSU / Lithium';
  const yieldTooltipTitle = `Claimed Yield | ${totalMsu > 0 ? `+${formatHuman(totalMsu)} MSU Claimed` : '0 MSU'}${claimedLithium > 0 ? ` vs ${formatHuman(claimedLithium)} Lithium spent` : ''} (${claimedYield > 0 ? `${claimedYield.toFixed(1)} MSU per Lithium` : '0.0'})`;

  // Pending collection notice
  let pendingNoticeHtml = '';
  if (hasCollectAction) {
    const pendingWaveNum = currentWave > 1 ? currentWave - 1 : currentWave;
    pendingNoticeHtml = `
      <div style="margin-top: 8px; padding: 5px 8px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.28); border-radius: 4px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="font-size: 11px;">⏳</span>
          <span style="font-size: 10px; color: #fbbf24; font-weight: 700;">Wave ${pendingWaveNum} Awaiting Collection</span>
        </div>
        ${activeCollectCost > 0 ? `<span style="font-size: 9.5px; color: #cbd5e1; font-family: monospace; font-weight: 600;">${formatHuman(activeCollectCost)} Lithium</span>` : ''}
      </div>
    `;
  }

  const tip = document.createElement('div');
  tip.id = 'nexus-floating-rewards-tooltip';
  tip.className = 'nexus-floating-rewards-tooltip nexus-claimed-floating-tooltip';
  tip.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.12);">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="color: #34d399; display: flex; align-items: center;">${ICON_CLAIMED_REWARDS_SVG}</span>
        <span style="font-weight: 700; color: #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Claimed Rewards</span>
        <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">(${waveLabel})</span>
      </div>
      <span class="nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(yieldTooltipTitle)}" title="${escapeHtml(yieldTooltipTitle)}" style="font-size: 10px; color: #34d399; font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(16, 185, 129, 0.35); white-space: nowrap;">${yieldBadgeText}</span>
    </div>

    <div class="nexus-mission-rewards-summary" style="margin: 0 !important; background: transparent !important; border: none !important; padding: 0 !important;">
      <div class="nexus-rsc-tile msu nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(msuTitle)}">
        <div class="nexus-rsc-icon-wrap">
          <span class="nexus-msu-icon">MSU</span>
        </div>
        <span class="nexus-rsc-amount text-emerald">${msuFormatted}</span>
      </div>
      <div class="nexus-rsc-tile metal nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(metalTitle)}">
        <div class="nexus-rsc-icon-wrap">
          <resource-icon class="metal"></resource-icon>
        </div>
        <span class="nexus-rsc-amount text-metal">${metalFormatted}</span>
      </div>
      <div class="nexus-rsc-tile crystal nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(crystalTitle)}">
        <div class="nexus-rsc-icon-wrap">
          <resource-icon class="crystal"></resource-icon>
        </div>
        <span class="nexus-rsc-amount text-crystal">${crystalFormatted}</span>
      </div>
      <div class="nexus-rsc-tile deut nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(deutTitle)}">
        <div class="nexus-rsc-icon-wrap">
          <resource-icon class="deuterium"></resource-icon>
        </div>
        <span class="nexus-rsc-amount text-deut">${deutFormatted}</span>
      </div>
      <div class="nexus-rsc-tile artifacts nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(artTitle)}">
        <div class="nexus-rsc-icon-wrap">
          <resource-icon class="artifact"></resource-icon>
        </div>
        <span class="nexus-rsc-amount text-artifact">${artifactsFormatted}</span>
      </div>
      <div class="nexus-rsc-tile lifeform nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(xpTitle)}">
        <div class="nexus-rsc-icon-wrap">
          <resource-icon class="speciesExperience"></resource-icon>
        </div>
        <span class="nexus-rsc-amount text-experience">${lfXpFormatted}</span>
      </div>
    </div>
    ${shipsHtml}
    ${pendingNoticeHtml}
    ${noRewardsNote}
  `;

  document.body.appendChild(tip);
  activeRewardsTooltip = tip;

  positionRewardsTooltip(e, tip);
}

/**
 * Checks whether an anomaly card has an active (non-disabled) "Collect Rewards" button
 * indicating uncollected wave rewards are pending Lithium collection.
 */
export function hasActiveCollectRewardsButton(el: HTMLElement): boolean {
  if (!el) return false;

  // 1. Check for any non-disabled button or link in .actionCenter or el
  const candidateBtns = el.querySelectorAll<HTMLElement>(
    '.actionCenter button, .actionCenter a, .collectRewards, [class*="collect"], button[data-ipi-hint*="Collect"], .actionCenter .btn'
  );
  for (const btn of Array.from(candidateBtns)) {
    if (btn.hasAttribute('disabled') || btn.classList.contains('disabled')) continue;
    const txt = btn.textContent?.toLowerCase() || '';
    if (txt.includes('collect') && !txt.includes('no rewards')) {
      return true;
    }
  }

  // 2. Check for Lithium cost subtitle (.btnSub) in .actionCenter or .collectRewards
  const collectSub = el.querySelector('.collectRewards .btnSub, .actionCenter .btnSub, [class*="collect"] .btnSub');
  if (collectSub) {
    const cost = parseOgameAmount(collectSub.textContent);
    if (cost > 0) {
      const parent = collectSub.closest('button, a, .actionCenter');
      if (parent && !parent.hasAttribute('disabled') && !parent.classList.contains('disabled')) {
        return true;
      }
    }
  }

  return false;
}

async function extractClaimedRewardData(el: HTMLElement, mission: OrionMissionData): Promise<CumulativeRewardData> {
  const missionId = String(mission.id || el.getAttribute('data-space-object-id') || el.dataset.spaceObjectId || '').trim();

  let rawMetal = 0;
  let rawCrystal = 0;
  let rawDeut = 0;
  let artifacts = 0;
  let lifeformXp = 0;
  let claimedLithium = 0;
  const shipsMap: Record<string, number> = {};

  // 1. Query Dexie DB for authoritative historical receipts across all waves
  let dbMission: AnomalyMission | undefined;
  if (missionId) {
    try {
      dbMission = await db.anomalyMissions.get(missionId);
    } catch (err) {
      console.warn('[Orion] Failed to query db.anomalyMissions for missionId:', missionId, err);
    }
  }

  const hasCollectAction = hasActiveCollectRewardsButton(el);

  // A. Extract from confirmed wave receipts in dbMission.waves
  if (dbMission?.waves && Array.isArray(dbMission.waves)) {
    for (const w of dbMission.waves) {
      // CRITICAL FIX: If there is an active "Collect Rewards" action pending on the card,
      // synthetic unconfirmed receipts (e.g. from prior reconciliation bugs) must not be counted as claimed!
      if (hasCollectAction && w.claimMethod === 'server_reconciliation' && (w.lithiumCost === 0 || w.waveNumber >= (mission.currentWave || 1) - 1)) {
        continue;
      }
      rawMetal += (w.metal || 0);
      rawCrystal += (w.crystal || 0);
      rawDeut += (w.deuterium || 0);
      artifacts += (w.artifacts || 0);
      lifeformXp += (w.lifeformXp || 0);
      claimedLithium += (w.lithiumCost || 0);
      if (w.ships && typeof w.ships === 'object') {
        for (const [sName, sCount] of Object.entries(w.ships)) {
          if (typeof sCount === 'number' && sCount > 0) {
            const attr = getShipIconAttribute(sName);
            const canon = ICON_ATTR_TO_SHIP[attr] || sName.toLowerCase().trim();
            shipsMap[canon] = (shipsMap[canon] || 0) + sCount;
          }
        }
      }
    }
  }

  // B. Fallback to cumulativeRewards / DOM .rewardsCell ONLY when there is NO pending collect button!
  // When hasCollectAction is true, .rewardsCell in the DOM includes UNCOLLECTED rewards awaiting Lithium!
  if (!hasCollectAction) {
    if (dbMission?.cumulativeRewards) {
      const cr = dbMission.cumulativeRewards;
      rawMetal = Math.max(rawMetal, cr.metal || 0);
      rawCrystal = Math.max(rawCrystal, cr.crystal || 0);
      rawDeut = Math.max(rawDeut, cr.deuterium || 0);
      artifacts = Math.max(artifacts, cr.artifacts || 0);
      lifeformXp = Math.max(lifeformXp, cr.lifeformXp || 0);
      if (cr.ships && typeof cr.ships === 'object') {
        for (const [sName, sCount] of Object.entries(cr.ships)) {
          if (typeof sCount === 'number' && sCount > 0) {
            const attr = getShipIconAttribute(sName);
            const canon = ICON_ATTR_TO_SHIP[attr] || sName.toLowerCase().trim();
            shipsMap[canon] = Math.max(shipsMap[canon] || 0, sCount);
          }
        }
      }
    }

    const sectionTitles = el.querySelectorAll<HTMLElement>('.missionDetailsSectionTitle');
    let rewardsTitleEl: HTMLElement | null = null;
    for (const title of Array.from(sectionTitles)) {
      if (title.textContent?.trim().toLowerCase().includes('mission rewards')) {
        rewardsTitleEl = title;
        break;
      }
    }

    let rewardsTable = rewardsTitleEl?.nextElementSibling as HTMLElement | null;
    while (rewardsTable && !rewardsTable.classList.contains('missionDetailsTable')) {
      rewardsTable = rewardsTable.nextElementSibling as HTMLElement | null;
    }

    const container = rewardsTable || el.querySelector<HTMLElement>('.rewardsCell');
    if (container) {
      const domParsed = parseCumulativeRewardsFromElement(container);
      rawMetal = Math.max(rawMetal, domParsed.rawMetal);
      rawCrystal = Math.max(rawCrystal, domParsed.rawCrystal);
      rawDeut = Math.max(rawDeut, domParsed.rawDeut);
      artifacts = Math.max(artifacts, domParsed.artifacts);
      lifeformXp = Math.max(lifeformXp, domParsed.lifeformXp);
      if (domParsed.ships) {
        for (const [sName, sCount] of Object.entries(domParsed.ships)) {
          if (typeof sCount === 'number' && sCount > 0) {
            const attr = getShipIconAttribute(sName);
            const canon = ICON_ATTR_TO_SHIP[attr] || sName.toLowerCase().trim();
            shipsMap[canon] = Math.max(shipsMap[canon] || 0, sCount);
          }
        }
      }
    }
  }

  // 3. Compute ship construction resources & 3:2:1 MSU valuation
  let shipMetal = 0;
  let shipCrystal = 0;
  let shipDeut = 0;
  let shipMsu = 0;

  for (const [shipKey, count] of Object.entries(shipsMap)) {
    if (count <= 0) continue;
    const normKey = shipKey.toLowerCase().trim();
    let cost = SHIP_COST_MAP[normKey];
    if (!cost) {
      const attr = getShipIconAttribute(normKey);
      const mappedName = ICON_ATTR_TO_SHIP[attr];
      if (mappedName) {
        cost = SHIP_COST_MAP[mappedName];
      }
    }
    if (cost) {
      shipMetal += cost.metal * count;
      shipCrystal += cost.crystal * count;
      shipDeut += cost.deuterium * count;
      shipMsu += cost.msu * count;
    }
  }

  const totalMetal = rawMetal + shipMetal;
  const totalCrystal = rawCrystal + shipCrystal;
  const totalDeut = rawDeut + shipDeut;
  let totalMsu = (rawMetal * 1.0 + rawCrystal * 1.5 + rawDeut * 3.0) + shipMsu;

  if (dbMission?.totalClaimedMsu && dbMission.totalClaimedMsu > totalMsu) {
    totalMsu = dbMission.totalClaimedMsu;
  }

  if (dbMission?.totalClaimedLithium && dbMission.totalClaimedLithium > claimedLithium) {
    claimedLithium = dbMission.totalClaimedLithium;
  }

  return {
    rawMetal,
    rawCrystal,
    rawDeut,
    shipMetal,
    shipCrystal,
    shipDeut,
    shipMsu,
    ships: shipsMap,
    artifacts,
    lifeformXp,
    totalMetal,
    totalCrystal,
    totalDeut,
    totalMsu,
    claimedLithium,
    dbMission
  };
}

function extractPossibleRewardDetails(el: HTMLElement, mission: OrionMissionData): MissionRewardDetail[] {
  return extractMissionRewardDetails(el, mission, true);
}

function showRewardsTooltip(e: MouseEvent, details: MissionRewardDetail[], totalMsu: number): void {
  hideRewardsTooltip();

  const tip = document.createElement('div');
  tip.id = 'nexus-floating-rewards-tooltip';
  tip.className = 'nexus-floating-rewards-tooltip';

  let rowsHtml = '';
  details.forEach((d) => {
    rowsHtml += `
      <div class="nexus-reward-row" style="display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 14px !important; white-space: nowrap !important; line-height: 22px !important;">
        <div class="nexus-reward-left" style="display: inline-flex !important; align-items: center !important; gap: 6px !important; flex-shrink: 0 !important;">
          ${d.iconHtml}
          <span class="nexus-reward-name" style="color: #cbd5e1; font-weight: 600; font-size: 11px;">${d.name}</span>
        </div>
        <span class="nexus-reward-amount" style="color: ${d.color}; font-weight: 700; font-family: monospace, sans-serif; font-size: 11px; white-space: nowrap !important; margin-left: auto !important; text-align: right !important;">${d.amountText}</span>
      </div>
    `;
  });

  const msuBadge = totalMsu > 0
    ? `<span style="margin-left: auto; font-size: 10px; color: #fbbf24; font-weight: 700; background: rgba(245, 158, 11, 0.15); padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(245, 158, 11, 0.35);">${formatHuman(totalMsu)} MSU</span>`
    : '';

  tip.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 7px; padding-bottom: 5px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
      <span style="color: #fbbf24; display: flex; align-items: center;">${ICON_REWARD_POOL_SVG}</span>
      <span style="font-weight: 700; color: #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Reward Pool</span>
      ${msuBadge}
    </div>
    <div style="display: flex; flex-direction: column; gap: 5px;">
      ${rowsHtml || '<span style="color: #94a3b8; font-size: 11px;">No rewards detected</span>'}
    </div>
  `;

  document.body.appendChild(tip);
  activeRewardsTooltip = tip;

  positionRewardsTooltip(e, tip);
}

function extractMissionRewardDetails(el: HTMLElement, mission: OrionMissionData, forcePossiblePool: boolean = false): MissionRewardDetail[] {
  const details: MissionRewardDetail[] = [];
  const seenKeys = new Set<string>();

  const wonCell = el.querySelector<HTMLElement>('.rewardsCell');
  const possibleCell = el.querySelector<HTMLElement>('.possibleRewardsList, .possibleRewardsCell');

  let candidateLines: NodeListOf<HTMLElement> | HTMLElement[];
  if (forcePossiblePool) {
    if (possibleCell && possibleCell.querySelectorAll('.rewardLine').length > 0) {
      candidateLines = possibleCell.querySelectorAll<HTMLElement>('.rewardLine');
    } else {
      const allLines = Array.from(el.querySelectorAll<HTMLElement>('.rewardLine'));
      const filtered = allLines.filter((l) => !l.closest('.rewardsCell') && !l.closest('.missionDetailsTable'));
      candidateLines = filtered.length > 0 ? filtered : allLines;
    }
  } else {
    const wonList = wonCell ? wonCell.querySelectorAll<HTMLElement>('.rewardLine') : null;
    const hasActiveWonRewards =
      wonList &&
      wonList.length > 0 &&
      Array.from(wonList).some(
        (l) => !l.classList.contains('rewardLineEmpty') && !l.textContent?.includes('No rewards')
      );

    if (hasActiveWonRewards && wonCell) {
      candidateLines = wonCell.querySelectorAll<HTMLElement>('.rewardLine');
    } else if (possibleCell && possibleCell.querySelectorAll('.rewardLine').length > 0) {
      candidateLines = possibleCell.querySelectorAll<HTMLElement>('.rewardLine');
    } else {
      candidateLines = el.querySelectorAll<HTMLElement>('.rewardLine');
    }
  }

  candidateLines.forEach((line) => {
    if (line.classList.contains('rewardLineEmpty') || line.textContent?.includes('No rewards')) return;

    const nameEl = line.querySelector('.rewardName');
    const rawName = nameEl?.textContent?.trim() ||
                    line.querySelector('[data-tooltip-title]')?.getAttribute('data-tooltip-title')?.split('|')[0] ||
                    line.getAttribute('data-tooltip-title')?.split('|')[0] ||
                    '';
    const lowerName = rawName.toLowerCase();

    const amtEl = line.querySelector('.rewardAmount');
    let rawAmount = amtEl?.getAttribute('data-tooltip-title') ||
                    amtEl?.getAttribute('title') ||
                    amtEl?.textContent?.trim() || '';
    rawAmount = rawAmount.replace(/&nbsp;/g, ' ').trim();

    // Random Ships (user requirement: Battlecruiser icon followed by "Random ships" text)
    if (line.querySelector('.randomShips') || lowerName.includes('random ship') || lowerName.includes('random ships')) {
      const key = 'random_ships';
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        details.push({
          name: 'Random ships',
          amountText: rawAmount || 'Vessel Fleet',
          iconHtml: '<technology-icon regular="" interceptor="" sq20="" bordered="" style="pointer-events: none; vertical-align: middle;"></technology-icon>',
          color: '#fbbf24'
        });
      }
      return;
    }

    // Specific Ships
    const techIcon = line.querySelector('technology-icon');
    if (techIcon) {
      let matchedAttr = '';
      let shipName = rawName || 'Ships';
      for (const attr of Object.keys(ICON_ATTR_TO_SHIP)) {
        if (techIcon.hasAttribute(attr)) {
          matchedAttr = attr;
          shipName = ICON_ATTR_TO_SHIP[attr];
          break;
        }
      }
      const key = `ship_${shipName}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const iconAttr = matchedAttr ? `${matchedAttr}=""` : 'interceptor=""';
        details.push({
          name: shipName,
          amountText: rawAmount || '1',
          iconHtml: `<technology-icon regular="" ${iconAttr} sq20="" bordered="" style="pointer-events: none; vertical-align: middle;"></technology-icon>`,
          color: '#38bdf8'
        });
      }
      return;
    }

    // Metal
    if (line.querySelector('.metal, [class*="metal"]') || lowerName.includes('metal')) {
      const key = 'metal';
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        details.push({
          name: 'Metal',
          amountText: rawAmount || '0',
          iconHtml: '<resource-icon class="metal" style="pointer-events: none; vertical-align: middle;"></resource-icon>',
          color: '#e6953c'
        });
      }
      return;
    }

    // Crystal
    if (line.querySelector('.crystal, [class*="crystal"]') || lowerName.includes('crystal')) {
      const key = 'crystal';
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        details.push({
          name: 'Crystal',
          amountText: rawAmount || '0',
          iconHtml: '<resource-icon class="crystal" style="pointer-events: none; vertical-align: middle;"></resource-icon>',
          color: '#38bdf8'
        });
      }
      return;
    }

    // Deuterium
    if (line.querySelector('.deuterium, [class*="deuterium"]') || lowerName.includes('deut')) {
      const key = 'deuterium';
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        details.push({
          name: 'Deuterium',
          amountText: rawAmount || '0',
          iconHtml: '<resource-icon class="deuterium" style="pointer-events: none; vertical-align: middle;"></resource-icon>',
          color: '#2dd4bf'
        });
      }
      return;
    }

    // Artifacts
    if (line.querySelector('.artifact, .artefact, [class*="artifact"]') || lowerName.includes('artifact') || lowerName.includes('artefact')) {
      const key = 'artifact';
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        details.push({
          name: 'Artefacts',
          amountText: rawAmount || '1',
          iconHtml: '<resource-icon class="artifact" style="pointer-events: none; vertical-align: middle;"></resource-icon>',
          color: '#facc15'
        });
      }
      return;
    }

    // Lifeform Experience
    if (line.querySelector('.speciesExperience, [class*="experience"], [class*="Experience"]') || lowerName.includes('experience') || lowerName.includes('lifeform') || lowerName.includes('xp')) {
      const key = 'xp';
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        details.push({
          name: 'Lifeform Experience',
          amountText: rawAmount || '0',
          iconHtml: '<resource-icon class="speciesExperience" style="pointer-events: none; vertical-align: middle;"></resource-icon>',
          color: '#c084fc'
        });
      }
      return;
    }

    // Generic / other
    if (rawName) {
      const key = `other_${lowerName}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        details.push({
          name: rawName,
          amountText: rawAmount || '1',
          iconHtml: '<resource-icon class="darkmatter" style="pointer-events: none; vertical-align: middle;"></resource-icon>',
          color: '#e2e8f0'
        });
      }
    }
  });

  // Fallback if no candidateLines produced details
  if (details.length === 0) {
    const rewards = parseMissionRewards(el);
    if (rewards.metal > 0) {
      details.push({
        name: 'Metal',
        amountText: `≈${formatHuman(rewards.metal)}`,
        iconHtml: '<resource-icon class="metal" style="pointer-events: none; vertical-align: middle;"></resource-icon>',
        color: '#e6953c'
      });
    }
    if (rewards.crystal > 0) {
      details.push({
        name: 'Crystal',
        amountText: `≈${formatHuman(rewards.crystal)}`,
        iconHtml: '<resource-icon class="crystal" style="pointer-events: none; vertical-align: middle;"></resource-icon>',
        color: '#38bdf8'
      });
    }
    if (rewards.deut > 0) {
      details.push({
        name: 'Deuterium',
        amountText: `≈${formatHuman(rewards.deut)}`,
        iconHtml: '<resource-icon class="deuterium" style="pointer-events: none; vertical-align: middle;"></resource-icon>',
        color: '#2dd4bf'
      });
    }
    rewards.items.forEach((itemStr) => {
      if (itemStr.toLowerCase().includes('random ship')) {
        details.push({
          name: 'Random ships',
          amountText: itemStr.replace(/random ships/i, '').trim() || 'Vessel Fleet',
          iconHtml: '<technology-icon regular="" interceptor="" sq20="" bordered="" style="pointer-events: none; vertical-align: middle;"></technology-icon>',
          color: '#fbbf24'
        });
      } else {
        details.push({
          name: itemStr,
          amountText: '',
          iconHtml: '<technology-icon regular="" interceptor="" sq20="" bordered="" style="pointer-events: none; vertical-align: middle;"></technology-icon>',
          color: '#38bdf8'
        });
      }
    });
  }

  return details;
}

/**
 * Injects a dedicated tactical intelligence bar directly under .missionDetailsTitle.
 * Prevents UI elements from fighting for space in the native header line or action bar.
 */
function injectMissionIntelBar(
  el: HTMLElement,
  mission: OrionMissionData,
  neededLC: number,
  neededSC: number,
  cargoCaps: PlayerCargoCapabilities
): void {
  const titleDiv = el.querySelector<HTMLElement>('.missionDetailsTitle');
  if (!titleDiv) return;

  // 1. Clean up any leftover badges from the native subtitle (.missionDetailsSubtitle)
  el.querySelector('.missionDetailsSubtitle')?.querySelectorAll('.nexus-tag').forEach((t) => t.remove());

  // 2. Remove any previously injected action bar buttons (including the Fleet Covered button)
  el.querySelectorAll('.nexus-btn-autofill').forEach((b) => {
    const parentGrad = b.closest('gradient-button');
    if (parentGrad) parentGrad.remove();
    else b.remove();
  });

  // 3. Locate or create the dedicated intel bar directly below .missionDetailsTitle
  let bar = el.querySelector<HTMLElement>('.nexus-mission-intel-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'nexus-mission-intel-bar';
    titleDiv.insertAdjacentElement('afterend', bar);
  }

  bar.innerHTML = '';

  const leftGroup = document.createElement('div');
  leftGroup.className = 'nexus-intel-group-left';

  // A. Efficiency / Yield Tag (MSU / Lithium) - Aligned to the left
  if (mission.efficiencyRatio >= 8.0) {
    const effTag = document.createElement('span');
    effTag.className = 'scannerResultTypeIcon nexus-tag nexus-tag-efficiency high nexus-tooltip-trigger ogl_ready';
    effTag.removeAttribute('title');
    effTag.textContent = `${mission.efficiencyRatio.toFixed(1)} MSU / Lithium`;
    effTag.setAttribute('data-nexus-tooltip-title', `High Yield | +${formatHuman(mission.rewardsMsu)} MSU vs ${formatHuman(mission.lithiumCost)} Lithium (${mission.efficiencyRatio.toFixed(1)} MSU per Lithium)`);
    leftGroup.appendChild(effTag);
  } else if (mission.efficiencyRatio >= 4.0) {
    const effTag = document.createElement('span');
    effTag.className = 'scannerResultTypeIcon nexus-tag nexus-tag-efficiency mid nexus-tooltip-trigger ogl_ready';
    effTag.removeAttribute('title');
    effTag.textContent = `${mission.efficiencyRatio.toFixed(1)} MSU / Lithium`;
    effTag.setAttribute('data-nexus-tooltip-title', `Solid Yield | +${formatHuman(mission.rewardsMsu)} MSU vs ${formatHuman(mission.lithiumCost)} Lithium (${mission.efficiencyRatio.toFixed(1)} MSU per Lithium)`);
    leftGroup.appendChild(effTag);
  } else if (mission.efficiencyRatio > 0) {
    const effTag = document.createElement('span');
    effTag.className = 'scannerResultTypeIcon nexus-tag nexus-tag-efficiency low nexus-tooltip-trigger ogl_ready';
    effTag.removeAttribute('title');
    effTag.textContent = `${mission.efficiencyRatio.toFixed(1)} MSU / Lithium`;
    effTag.setAttribute('data-nexus-tooltip-title', `Yield | +${formatHuman(mission.rewardsMsu)} MSU vs ${formatHuman(mission.lithiumCost)} Lithium (${mission.efficiencyRatio.toFixed(1)} MSU per Lithium)`);
    leftGroup.appendChild(effTag);
  } else if (mission.category === 'combat') {
    const combatTag = document.createElement('span');
    combatTag.className = 'scannerResultTypeIcon nexus-tag nexus-tag-combat nexus-tooltip-trigger ogl_ready';
    combatTag.removeAttribute('title');
    combatTag.textContent = 'Combat';
    combatTag.setAttribute('data-nexus-tooltip-title', mission.rewardSummaryText
      ? `Combat Encounter | Loot: ${mission.rewardSummaryText}`
      : 'Combat Mission | Wave defense against hostile armada');
    leftGroup.appendChild(combatTag);
  }

  // Wave Simulation Button for Combat Missions:
  // Rendered as a small icon button (matching the Rewards buttons on the right) with a red sword icon
  const isCombatMission = mission.category === 'combat' ||
    mission.name.toLowerCase().includes('encounter') ||
    mission.name.toLowerCase().includes('defend') ||
    mission.name.toLowerCase().includes('chaos') ||
    mission.name.toLowerCase().includes('combat');

  if (isCombatMission) {
    const simBtn = document.createElement('span');
    simBtn.className = 'scannerResultTypeIcon nexus-tag nexus-btn-wave-sim nexus-tooltip-trigger ogl_ready';
    simBtn.setAttribute('data-nexus-tooltip-title', 'Wave Battle Simulator | Simulate combat waves with Nexus Battlesim');
    simBtn.removeAttribute('title');
    simBtn.innerHTML = `<span class="nexus-sim-btn-label">COMBAT SIM</span>${ICON_WAVE_SIM_SVG}`;

    simBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openAnomalyWaveSimModal(el, {
        id: mission.id,
        name: mission.name,
        level: mission.level,
        stars: mission.stars,
        environment: mission.environment,
        galaxy: mission.galaxy,
        system: mission.system,
        position: mission.position
      });
    });

    leftGroup.appendChild(simBtn);
  }

  // C. Recommended LC and SC Buttons (Delivery only) - Separate Action Buttons
  if (mission.category === 'delivery' && (neededLC > 0 || neededSC > 0)) {
    const coords = {
      galaxy: mission.galaxy,
      system: mission.system,
      position: mission.position,
      ...extractMissionCoords(el)
    };

    // 1. Large Cargo Dispatch Button
    if (neededLC > 0) {
      const lcBtn = document.createElement('a');
      lcBtn.className = 'scannerResultTypeIcon nexus-tag nexus-tag-cargo nexus-btn-cargo-dispatch nexus-tooltip-trigger ogl_ready';
      lcBtn.href = buildAnomalyFleetDispatchUrl(coords, 203, neededLC);
      lcBtn.style.display = 'inline-flex';
      lcBtn.style.alignItems = 'center';
      lcBtn.style.gap = '4px';
      lcBtn.style.cursor = 'pointer';
      lcBtn.style.textDecoration = 'none';
      lcBtn.innerHTML = `
        <technology-icon regular="" transporterlarge="" sq16="" style="pointer-events: none; vertical-align: middle;"></technology-icon>
        <span style="font-weight: 700; color: #fbbf24;">${neededLC.toLocaleString()}</span>
      `;
      lcBtn.setAttribute(
        'data-nexus-tooltip-title',
        `Fleet Dispatch: Large Cargo | Click to dispatch ${neededLC.toLocaleString()} Large Cargo to [${coords.galaxy ?? '?'}:${coords.system ?? '?'}:${coords.position ?? '?'}] (Peak Demand: ${formatHuman(mission.maxWaveCargo)} space)`
      );

      lcBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatchFleetToAnomaly(coords, 203, neededLC);
      });

      leftGroup.appendChild(lcBtn);
    }

    // 2. Small Cargo Dispatch Button
    if (neededSC > 0) {
      const scBtn = document.createElement('a');
      scBtn.className = 'scannerResultTypeIcon nexus-tag nexus-tag-cargo-sc nexus-btn-cargo-dispatch nexus-tooltip-trigger ogl_ready';
      scBtn.href = buildAnomalyFleetDispatchUrl(coords, 202, neededSC);
      scBtn.style.display = 'inline-flex';
      scBtn.style.alignItems = 'center';
      scBtn.style.gap = '4px';
      scBtn.style.cursor = 'pointer';
      scBtn.style.textDecoration = 'none';
      scBtn.innerHTML = `
        <technology-icon regular="" transportersmall="" sq16="" style="pointer-events: none; vertical-align: middle;"></technology-icon>
        <span style="font-weight: 700; color: #38bdf8;">${neededSC.toLocaleString()}</span>
      `;
      scBtn.setAttribute(
        'data-nexus-tooltip-title',
        `Fleet Dispatch: Small Cargo | Click to dispatch ${neededSC.toLocaleString()} Small Cargo to [${coords.galaxy ?? '?'}:${coords.system ?? '?'}:${coords.position ?? '?'}] (Peak Demand: ${formatHuman(mission.maxWaveCargo)} space)`
      );

      scBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatchFleetToAnomaly(coords, 202, neededSC);
      });

      leftGroup.appendChild(scBtn);
    }
  }

  bar.appendChild(leftGroup);

  // D. Right Group: Aligned to the right, Rewards Badge with moving-after-mouse info popup
  const rightGroup = document.createElement('div');
  rightGroup.className = 'nexus-intel-group-right';

  // 1. Reward Pool Button (Option A: Supply Crate - Amber theme)
  const poolBtn = document.createElement('span');
  poolBtn.className = 'nexus-tag nexus-btn-icon nexus-btn-reward-pool';
  poolBtn.removeAttribute('title');
  poolBtn.innerHTML = ICON_REWARD_POOL_SVG;

  poolBtn.addEventListener('mouseenter', (e) => {
    showRewardPoolTooltip(e, el, mission);
  });
  poolBtn.addEventListener('mousemove', (e) => {
    if (activeRewardsTooltip) {
      positionRewardsTooltip(e, activeRewardsTooltip);
    }
  });
  poolBtn.addEventListener('mouseleave', () => {
    hideRewardsTooltip();
  });
  poolBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  rightGroup.appendChild(poolBtn);

  // 2. Claimed Rewards Button (Option A: Secured Crate with Checkmark - Emerald theme)
  const claimedBtn = document.createElement('span');
  claimedBtn.className = 'nexus-tag nexus-btn-icon nexus-btn-claimed-rewards';
  claimedBtn.removeAttribute('title');
  claimedBtn.innerHTML = ICON_CLAIMED_REWARDS_SVG;

  claimedBtn.addEventListener('mouseenter', (e) => {
    showClaimedRewardsTooltip(e, el, mission);
  });
  claimedBtn.addEventListener('mousemove', (e) => {
    if (activeRewardsTooltip) {
      positionRewardsTooltip(e, activeRewardsTooltip);
    }
  });
  claimedBtn.addEventListener('mouseleave', () => {
    hideRewardsTooltip();
  });
  claimedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  rightGroup.appendChild(claimedBtn);

  bar.appendChild(rightGroup);
}

/**
 * Injects a native-styled section inside .anomalyMissionDetails.
 * Uses OGame's exact .missionDetailsSectionTitle, .missionDetailsTable, .missionDetailsRow, and .cell.
 * Only visible when the mission is expanded; NEVER touches .missionRoute.
 */
function injectNativeAdvisorySection(
  el: HTMLElement,
  mission: OrionMissionData,
  neededLC: number,
  neededSC: number,
  cargoCaps: PlayerCargoCapabilities
): void {
  const detailsContainer = el.querySelector<HTMLElement>('.anomalyMissionDetails');
  if (!detailsContainer) return;

  // Avoid duplicate injection
  if (detailsContainer.querySelector('.nexus-advisory-section')) return;

  const section = document.createElement('div');
  section.className = 'nexus-advisory-section';

  const title = document.createElement('div');
  title.className = 'missionDetailsSectionTitle nexus-section-title';
  title.innerHTML = '<span class="nexus-brand-tag">NEXUS</span> Fleet Advisory';

  const table = document.createElement('div');
  table.className = 'missionDetailsTable nexus-advisory-table';

  const row = document.createElement('div');
  row.className = 'missionDetailsRow';

  if (mission.category === 'delivery') {
    const isCovered = mission.stationedFleet.totalCapacity >= mission.maxWaveCargo && mission.maxWaveCargo > 0;
    const isStationed = mission.stationedFleet.smallCargo > 0 || mission.stationedFleet.largeCargo > 0;

    let stationedTitle = 'Not Dispatched';
    let stationedClass = 'text-slate';
    let stationedSub = 'Ready to launch';

    if (isCovered) {
      const buffer = Math.round(((mission.stationedFleet.totalCapacity - mission.maxWaveCargo) / mission.maxWaveCargo) * 100);
      stationedTitle = '\u2713 Fully Covered';
      stationedClass = 'text-emerald';
      const parts: string[] = [];
      if (mission.stationedFleet.largeCargo > 0) parts.push(`${mission.stationedFleet.largeCargo.toLocaleString()} LC`);
      if (mission.stationedFleet.smallCargo > 0) parts.push(`${mission.stationedFleet.smallCargo.toLocaleString()} SC`);
      if (mission.stationedFleet.otherShips) {
        Object.entries(mission.stationedFleet.otherShips).forEach(([s, c]) => {
          parts.push(`${c.toLocaleString()} ${s}`);
        });
      }
      stationedSub = `${parts.join(', ') || 'Fleet'} (+${buffer}% safe)`;
    } else if (isStationed) {
      const lcCap = cargoCaps.lcCapacity;
      const deficitLC = Math.ceil((mission.maxWaveCargo - mission.stationedFleet.totalCapacity) / lcCap);
      stationedTitle = '\u26A0 Under Capacity';
      stationedClass = 'text-crimson';
      stationedSub = `Deficit: +${deficitLC.toLocaleString()} LC`;
    }

    const coords = {
      galaxy: mission.galaxy,
      system: mission.system,
      position: mission.position,
      ...extractMissionCoords(el)
    };
    const targetUrlLC = buildAnomalyFleetDispatchUrl(coords, 203, neededLC);
    const targetUrlSC = buildAnomalyFleetDispatchUrl(coords, 202, neededSC);

    row.innerHTML = `
      <span class="cell">
        <span class="cellLabel">Peak Cargo Demand</span>
        <span class="nexus-cell-main">${formatHuman(mission.maxWaveCargo)} Space</span>
        <span class="nexus-cell-sub">Peak demand: Wave ${mission.peakWaveNum} of ${mission.totalWaves || 1}</span>
      </span>
      <span class="cell">
        <span class="cellLabel">Recommended Fleet</span>
        <div class="nexus-rec-fleet-box" style="display: flex; flex-direction: column; gap: 4px; justify-content: center; margin-top: 3px;">
          <a href="${targetUrlLC}" class="nexus-rec-fleet-lc nexus-tooltip-trigger ogl_ready" style="display: flex; align-items: center; gap: 8px; cursor: pointer; text-decoration: none;" data-nexus-tooltip-title="Fleet Dispatch: Large Cargo | Click to dispatch ${neededLC.toLocaleString()} Large Cargo to [${coords.galaxy ?? '?'}:${coords.system ?? '?'}:${coords.position ?? '?'}]">
            <technology-icon regular="" transporterlarge="" sq20="" style="pointer-events: none;"></technology-icon>
            <span class="nexus-fleet-num text-gold" style="font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em;">${neededLC.toLocaleString()}</span>
          </a>
          <a href="${targetUrlSC}" class="nexus-rec-fleet-sc nexus-tooltip-trigger ogl_ready" style="display: flex; align-items: center; gap: 8px; cursor: pointer; text-decoration: none;" data-nexus-tooltip-title="Fleet Dispatch: Small Cargo | Click to dispatch ${neededSC.toLocaleString()} Small Cargo to [${coords.galaxy ?? '?'}:${coords.system ?? '?'}:${coords.position ?? '?'}]">
            <technology-icon regular="" transportersmall="" sq20="" style="pointer-events: none;"></technology-icon>
            <span class="nexus-fleet-num text-blue" style="font-size: 0.95rem; font-weight: 700; opacity: 0.85;">${neededSC.toLocaleString()}</span>
          </a>
        </div>
        <span class="nexus-cell-sub nexus-tooltip-trigger ogl_ready" style="margin-top: 2px;" data-nexus-tooltip-title="Fleet Cargo Capacity | LC: ${cargoCaps.lcCapacity.toLocaleString()} space • SC: ${cargoCaps.scCapacity.toLocaleString()} space">LC: ${formatHuman(cargoCaps.lcCapacity)} • SC: ${formatHuman(cargoCaps.scCapacity)} (Tech +${cargoCaps.totalLcBonusPct}%)</span>
      </span>
      <span class="cell">
        <span class="cellLabel">Stationed Fleet</span>
        <span class="nexus-cell-main ${stationedClass}">${stationedTitle}</span>
        <span class="nexus-cell-sub">${stationedSub}</span>
      </span>
      <span class="cell">
        <span class="cellLabel">Mission Efficiency</span>
        <span class="nexus-cell-main text-sky">${mission.efficiencyRatio > 0 ? mission.efficiencyRatio.toFixed(1) + ' MSU / Lithium' : 'Exp / Ships'}</span>
        <span class="nexus-cell-sub">${mission.rewardSummaryText || 'Net Reward Value'}</span>
      </span>
    `;

    const lcLink = row.querySelector('.nexus-rec-fleet-lc');
    if (lcLink && neededLC > 0) {
      lcLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatchFleetToAnomaly(coords, 203, neededLC);
      });
    }

    const scLink = row.querySelector('.nexus-rec-fleet-sc');
    if (scLink && neededSC > 0) {
      scLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatchFleetToAnomaly(coords, 202, neededSC);
      });
    }
  } else {
    // Combat Mission Advisory
    row.innerHTML = `
      <span class="cell">
        <span class="cellLabel">Tactical Threat</span>
        <span class="nexus-cell-main text-crimson">Hostile Armada</span>
      </span>
      <span class="cell">
        <span class="cellLabel">Fleet Composition</span>
        <span class="nexus-cell-main text-sky">Heavy Warships Only</span>
      </span>
      <span class="cell">
        <span class="cellLabel">Casualty Rule</span>
        <span class="nexus-cell-main text-gold">Permanent Losses</span>
      </span>
      <span class="cell">
        <span class="cellLabel">Tactical Strategy</span>
        <span class="nexus-cell-main text-emerald">0-Loss Target</span>
      </span>
    `;
  }

  table.appendChild(row);
  section.appendChild(title);
  section.appendChild(table);

  // Insert at the top of the expanded details container
  detailsContainer.insertBefore(section, detailsContainer.firstChild);
}

/**
 * Injects a sleek aggregate valuation summary row directly under "Mission Rewards"
 * in the expanded mission view, displaying:
 * - Rewards MSU
 * - Rewards Metal (raw resource + metal of ships found)
 * - Rewards Crystal (raw resource + crystal of ships found)
 * - Rewards Deuterium (raw resource + deuterium of ships found)
 * - Artifacts found
 * - Lifeform XP found
 */
function injectMissionRewardsSummary(el: HTMLElement): void {
  // Find the "Mission Rewards" section title
  const sectionTitles = el.querySelectorAll<HTMLElement>('.missionDetailsSectionTitle');
  let rewardsTitleEl: HTMLElement | null = null;
  for (const title of Array.from(sectionTitles)) {
    if (title.textContent?.trim().toLowerCase().includes('mission rewards')) {
      rewardsTitleEl = title;
      break;
    }
  }
  if (!rewardsTitleEl) return;

  let rewardsTable = rewardsTitleEl.nextElementSibling;
  while (rewardsTable && !rewardsTable.classList.contains('missionDetailsTable')) {
    rewardsTable = rewardsTable.nextElementSibling;
  }
  const rewardLines = rewardsTable
    ? rewardsTable.querySelectorAll<HTMLElement>('.rewardLine')
    : el.querySelectorAll<HTMLElement>('.rewardsCell .rewardLine');

  if (rewardLines.length === 0) {
    el.querySelector('.nexus-mission-rewards-summary')?.remove();
    return;
  }

  let rawMetal = 0;
  let rawCrystal = 0;
  let rawDeut = 0;
  let shipMetal = 0;
  let shipCrystal = 0;
  let shipDeut = 0;
  let shipMsu = 0;
  let artifacts = 0;
  let lifeformXp = 0;

  rewardLines.forEach((line) => {
    if (line.classList.contains('rewardLineEmpty') || line.textContent?.includes('No rewards')) {
      return;
    }

    const nameEl = line.querySelector('.rewardName');
    const nameText = nameEl?.textContent?.trim().toLowerCase() || '';

    const amountEl = line.querySelector('.rewardAmount');
    const rawAmountStr = amountEl?.getAttribute('data-tooltip-title') ||
                         amountEl?.getAttribute('title') ||
                         amountEl?.textContent?.trim();
    const amount = parseOgameAmount(rawAmountStr);
    if (amount <= 0) return;

    // 1. Raw Resources
    const isMetal = line.querySelector('.metal, [class*="metal"]') !== null || nameText.includes('metal');
    const isCrystal = line.querySelector('.crystal, [class*="crystal"]') !== null || nameText.includes('crystal');
    const isDeut = line.querySelector('.deuterium, [class*="deuterium"]') !== null || nameText.includes('deut');

    if (isMetal) {
      rawMetal += amount;
      return;
    }
    if (isCrystal) {
      rawCrystal += amount;
      return;
    }
    if (isDeut) {
      rawDeut += amount;
      return;
    }

    // 2. Ships (via technology-icon attribute or name)
    let matchedShipName: string | null = null;
    const techIcon = line.querySelector('technology-icon');
    if (techIcon) {
      for (const attr of Object.keys(ICON_ATTR_TO_SHIP)) {
        if (techIcon.hasAttribute(attr)) {
          matchedShipName = ICON_ATTR_TO_SHIP[attr];
          break;
        }
      }
    }
    if (!matchedShipName && nameText) {
      for (const shipKey of Object.keys(SHIP_COST_MAP)) {
        if (nameText === shipKey || nameText.includes(shipKey) || shipKey.includes(nameText)) {
          matchedShipName = shipKey;
          break;
        }
      }
    }

    if (matchedShipName && SHIP_COST_MAP[matchedShipName]) {
      const cost = SHIP_COST_MAP[matchedShipName];
      shipMetal += cost.metal * amount;
      shipCrystal += cost.crystal * amount;
      shipDeut += cost.deuterium * amount;
      shipMsu += cost.msu * amount;
      return;
    }

    // 3. Artifacts
    const isArtifact = nameText.includes('artefact') ||
                       nameText.includes('artifact') ||
                       line.querySelector('.artefact, .artifact, [class*="artefact"], [class*="artifact"]') !== null ||
                       line.querySelector('resource-icon.artifact, resource-icon[class*="artifact"]') !== null ||
                       line.querySelector('[data-tooltip-title*="Artifact"], [data-tooltip-title*="Artefact"]') !== null;
    if (isArtifact) {
      artifacts += amount;
      return;
    }

    // 4. Lifeform XP
    const isLfXp = nameText.includes('lifeform') ||
                   nameText.includes('xp') ||
                   nameText.includes('experience') ||
                   line.querySelector('.speciesExperience, .lifeform, .xp, [class*="speciesExperience"], [class*="lifeform"], [class*="xp"]') !== null ||
                   line.querySelector('resource-icon.speciesExperience, resource-icon[class*="speciesExperience"]') !== null ||
                   line.querySelector('[data-tooltip-title*="Lifeform"], [data-tooltip-title*="Experience"], [data-tooltip-title*="XP"]') !== null;
    if (isLfXp) {
      lifeformXp += amount;
      return;
    }
  });

  const totalMetal = rawMetal + shipMetal;
  const totalCrystal = rawCrystal + shipCrystal;
  const totalDeut = rawDeut + shipDeut;
  const totalMsu = totalMetal * 1.0 + totalCrystal * 1.5 + totalDeut * 3.0;

  let summaryBar = el.querySelector<HTMLElement>('.nexus-mission-rewards-summary');
  if (!summaryBar) {
    summaryBar = document.createElement('div');
    summaryBar.className = 'nexus-mission-rewards-summary';
    rewardsTitleEl.insertAdjacentElement('afterend', summaryBar);
  }

  // Format numbers cleanly
  const msuFormatted = totalMsu > 0 ? formatHuman(totalMsu) : '0';
  const metalFormatted = formatHuman(totalMetal);
  const crystalFormatted = formatHuman(totalCrystal);
  const deutFormatted = formatHuman(totalDeut);
  const artifactsFormatted = artifacts > 0 ? artifacts.toLocaleString() : '0';
  const lfXpFormatted = lifeformXp > 0 ? formatHuman(lifeformXp) : '0';

  // Tooltips for exact values formatted for Nexus Dark Tooltip (Title | Body)
  const msuTitle = `Total Valuation | ${totalMsu.toLocaleString()} MSU (3:2:1 Trade Standard)\n• Raw Resources: ${formatHuman(rawMetal * 1.0 + rawCrystal * 1.5 + rawDeut * 3.0)} MSU\n• Ship Fleet: ${formatHuman(shipMsu)} MSU`;
  const metalTitle = `Total Metal | ${totalMetal.toLocaleString()}\n• Raw Metal: ${rawMetal.toLocaleString()}\n• Ship Construction Metal: ${shipMetal.toLocaleString()}`;
  const crystalTitle = `Total Crystal | ${totalCrystal.toLocaleString()}\n• Raw Crystal: ${rawCrystal.toLocaleString()}\n• Ship Construction Crystal: ${shipCrystal.toLocaleString()}`;
  const deutTitle = `Total Deuterium | ${totalDeut.toLocaleString()}\n• Raw Deuterium: ${rawDeut.toLocaleString()}\n• Ship Construction Deut: ${shipDeut.toLocaleString()}`;
  const artTitle = `Artefacts | ${artifacts > 0 ? artifacts.toLocaleString() : 'No artefacts found in waves'}`;
  const xpTitle = `Lifeform Experience | ${lifeformXp > 0 ? lifeformXp.toLocaleString() : 'No Lifeform XP found in waves'}`;

  summaryBar.innerHTML = `
    <div class="nexus-rsc-tile msu nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(msuTitle)}">
      <div class="nexus-rsc-icon-wrap">
        <span class="nexus-msu-icon">MSU</span>
      </div>
      <span class="nexus-rsc-amount text-emerald">${msuFormatted}</span>
    </div>
    <div class="nexus-rsc-tile metal nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(metalTitle)}">
      <div class="nexus-rsc-icon-wrap">
        <resource-icon class="metal"></resource-icon>
      </div>
      <span class="nexus-rsc-amount text-metal">${metalFormatted}</span>
    </div>
    <div class="nexus-rsc-tile crystal nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(crystalTitle)}">
      <div class="nexus-rsc-icon-wrap">
        <resource-icon class="crystal"></resource-icon>
      </div>
      <span class="nexus-rsc-amount text-crystal">${crystalFormatted}</span>
    </div>
    <div class="nexus-rsc-tile deut nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(deutTitle)}">
      <div class="nexus-rsc-icon-wrap">
        <resource-icon class="deuterium"></resource-icon>
      </div>
      <span class="nexus-rsc-amount text-deut">${deutFormatted}</span>
    </div>
    <div class="nexus-rsc-tile artifacts nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(artTitle)}">
      <div class="nexus-rsc-icon-wrap">
        <resource-icon class="artifact"></resource-icon>
      </div>
      <span class="nexus-rsc-amount text-artifact">${artifactsFormatted}</span>
    </div>
    <div class="nexus-rsc-tile lifeform nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(xpTitle)}">
      <div class="nexus-rsc-icon-wrap">
        <resource-icon class="speciesExperience"></resource-icon>
      </div>
      <span class="nexus-rsc-amount text-experience">${lfXpFormatted}</span>
    </div>
  `;
}

/**
 * Scans the page and injects tactical intelligence into all active Orion missions.
 */

/**
 * Persists and reconciles anomaly mission state to Dexie DB.
 * Recovers any rewards collected on another device/browser.
 */
/**
 * Injects a clean Nexus Intel Bar directly onto completed anomaly mission cards.
 */
function injectCompletedCardIntel(el: HTMLElement, mission: OrionMissionData): void {
  const existing = el.querySelector('.nexus-completed-intel-bar');
  if (existing) return;

  const costP = el.querySelector('.missionCompletedCost');
  if (!costP) return;

  const bar = document.createElement('div');
  bar.className = 'nexus-completed-intel-bar';
  bar.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 8px; margin: 10px 0; font-family: Inter, system-ui, sans-serif;';

  const msuFormatted = formatHuman(mission.rewardsMsu);
  const yieldFormatted = mission.efficiencyRatio > 0 ? `${mission.efficiencyRatio.toFixed(1)} MSU / Lithium` : '';

  bar.innerHTML = `
    <span class="scannerResultTypeIcon titleTypeIcon nexus-tag nexus-tooltip-trigger ogl_ready" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-weight: 800; font-size: 0.75rem; padding: 2px 8px; border-radius: 3px;" data-nexus-tooltip-title="Mission Valuation | Uncollected Mission Rewards Valuation (+${msuFormatted} MSU)">
      +${msuFormatted} MSU
    </span>
    ${yieldFormatted ? `
      <span class="scannerResultTypeIcon titleTypeIcon nexus-tag nexus-tooltip-trigger ogl_ready" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-weight: 800; font-size: 0.75rem; padding: 2px 8px; border-radius: 3px;" data-nexus-tooltip-title="Fuel Yield | Batch Fuel Yield (${yieldFormatted})">
        ${yieldFormatted}
      </span>
    ` : ''}
  `;

  costP.insertAdjacentElement('afterend', bar);
}

async function syncAnomalyMissionToDb(el: HTMLElement, mission: OrionMissionData): Promise<void> {
  const missionId = mission.id;
  if (!missionId) return;

  try {
    const metaPlayerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content');
    const metaUniverse = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content');
    let account = null;
    if (metaPlayerId) {
      account = await db.accounts.get(String(metaPlayerId));
      if (!account && !isNaN(Number(metaPlayerId))) {
        account = await db.accounts.get(Number(metaPlayerId) as any);
      }
    }
    const playerId = String(metaPlayerId || account?.playerId || 'unknown').trim();
    const universe = (metaUniverse || account?.universe || '').trim();

    const existing = await db.anomalyMissions.get(missionId);
    const now = Date.now();

    const { activeWave, upcomingWaves, totalWaves } = parseWaveNumberFromElement(el, missionId);
    const resolvedTotalWaves = Math.max(
      existing?.totalWaves || 1,
      mission.totalWaves || 1,
      totalWaves || 1,
      existing?.waves?.length || 1,
      existing?.combatReportIds?.length || 1
    );

    const isCompletedCard = !!el.querySelector('.missionCompleted') || !!mission.isCompletedCard;
    const completedTimerEl = el.querySelector<HTMLElement>('.missionCompletedTimer, [id^="rewardTimer_"]');
    const completedSeconds = completedTimerEl ? parseInt(completedTimerEl.getAttribute('data-seconds') || '0', 10) : (mission.despawnSeconds || 0);

    const hasCollectAction = hasActiveCollectRewardsButton(el);
    const hasUpcomingWaves = upcomingWaves.length > 0;
    const hasUnreachedWaves = activeWave < resolvedTotalWaves;
    const hasNoMoreWavesText = !!el.querySelector('.missionDetailsTable')?.textContent?.includes('No more waves');

    // Despawn / Absolute End extraction from both top route bar (#missionTimer_) and expanded details (#despawn_)
    const despawnEl = el.querySelector(`#missionTimer_${missionId}`) ||
                      el.querySelector(`#despawn_${missionId}`) ||
                      el.querySelector('.routeNode.targetNode .nodeTimer') ||
                      completedTimerEl;
    const despawnSecStr = despawnEl?.getAttribute('data-seconds');
    const despawnSeconds = despawnSecStr ? parseInt(despawnSecStr, 10) : completedSeconds;
    const despawnTimestamp = despawnSeconds > 0
      ? Math.floor(Date.now() / 1000) + despawnSeconds
      : (existing?.despawnTimestamp || (mission.despawnSeconds ? Math.floor(Date.now() / 1000) + mission.despawnSeconds : undefined));

    const isDespawnExpired = (despawnTimestamp && Math.floor(Date.now() / 1000) >= despawnTimestamp) || (despawnSeconds <= 0 && !!despawnSecStr);

    const hasActiveWaveElement = !!(
      el.querySelector('.routeNode.deepSpaceNode') ||
      el.querySelector('.nodeWave') ||
      el.querySelector(`#npcTimer_${missionId}`) ||
      el.querySelector('.actionRight button.primaryAction')
    );

    let isCompleted = false;
    if (isCompletedCard) {
      isCompleted = true;
    } else if (isDespawnExpired && !hasActiveWaveElement) {
      isCompleted = true;
    } else if (!hasActiveWaveElement && (hasNoMoreWavesText || !el.querySelector('.missionRoute'))) {
      isCompleted = true;
    } else {
      // Mission has an active wave element and no completion banner -> IN_PROGRESS!
      isCompleted = false;
    }

    const status: 'completed' | 'in_progress' = isCompleted ? 'completed' : 'in_progress';
    const resolvedCurrentWave = isCompleted ? resolvedTotalWaves : activeWave;

    const coords = (mission.galaxy && mission.system && mission.position)
      ? `${mission.galaxy}:${mission.system}:${mission.position}`
      : (el.querySelector('.missionRouteLabels .routeLabelCell:nth-child(2) a.nodeCoords, .missionRouteLabels .routeLabelCell:nth-child(2) .nodeCoords')?.textContent?.trim() || '');

    const originLabelCell = el.querySelector('.missionRouteLabels .routeLabelCell:first-child');
    const originName = originLabelCell?.querySelector('.nodeLabel')?.textContent?.trim();
    const originCoords = originLabelCell?.querySelector('a.nodeCoords')?.textContent?.trim();
    const originImgUrl = el.querySelector('.routeNode.originNode img.nodeImage')?.getAttribute('src') || undefined;

    const spawnedText = el.querySelector('.spawnedCell span:last-child')?.textContent?.trim();
    let spawnedTimestamp = Math.floor(Date.now() / 1000);
    if (spawnedText) {
      const parts = spawnedText.match(/(\d+)\.(\d+)\.(\d+)\s+(\d+):(\d+):(\d+)/);
      if (parts) {
        const d = new Date(parseInt(parts[3], 10), parseInt(parts[2], 10) - 1, parseInt(parts[1], 10), parseInt(parts[4], 10), parseInt(parts[5], 10), parseInt(parts[6], 10));
        spawnedTimestamp = Math.floor(d.getTime() / 1000);
      }
    }

    const wonCell = el.querySelector<HTMLElement>('.rewardsCell');
    const serverCumul = wonCell ? parseCumulativeRewardsFromElement(wonCell) : null;

    if (existing) {
      // Ensure unique wave receipts by waveNumber (authoritative modal_confirmation replaces server_reconciliation)
      const uniqueWavesMap = new Map<number, AnomalyWaveReceipt>();
      (existing.waves || []).forEach((w) => {
        const cur = uniqueWavesMap.get(w.waveNumber);
        if (!cur || (w.claimMethod === 'modal_confirmation' && cur.claimMethod !== 'modal_confirmation')) {
          uniqueWavesMap.set(w.waveNumber, w);
        }
      });

      // PURGE: If this mission has an active pending "Collect Rewards" button,
      // any synthetic 'server_reconciliation' receipt for unconfirmed waves (wave >= activeWave - 1 or with lithiumCost === 0)
      // was falsely created and MUST be deleted!
      if (hasCollectAction) {
        for (const [wNum, w] of Array.from(uniqueWavesMap.entries())) {
          if (w.claimMethod === 'server_reconciliation' && (wNum >= activeWave - 1 || (w.lithiumCost || 0) === 0)) {
            uniqueWavesMap.delete(wNum);
          }
        }
      }

      // Only reconcile server delta if there is NO pending collect button (all completed waves collected)
      // and mission has unrecorded completed waves
      if (!hasCollectAction && serverCumul && serverCumul.totalMsu > 0) {
        const recordedMsu = Array.from(uniqueWavesMap.values()).reduce((sum, w) => sum + (w.msuValue || 0), 0);
        if (serverCumul.totalMsu > recordedMsu) {
          const msuDelta = serverCumul.totalMsu - recordedMsu;
          const waveNum = activeWave > 1 ? activeWave - 1 : 1;
          if (!uniqueWavesMap.has(waveNum)) {
            uniqueWavesMap.set(waveNum, {
              waveNumber: waveNum,
              metal: Math.max(0, serverCumul.totalMetal - (existing.cumulativeRewards?.metal || 0)),
              crystal: Math.max(0, serverCumul.totalCrystal - (existing.cumulativeRewards?.crystal || 0)),
              deuterium: Math.max(0, serverCumul.totalDeut - (existing.cumulativeRewards?.deuterium || 0)),
              ships: serverCumul.ships || {},
              artifacts: Math.max(0, serverCumul.artifacts - (existing.cumulativeRewards?.artifacts || 0)),
              lifeformXp: Math.max(0, serverCumul.lifeformXp - (existing.cumulativeRewards?.lifeformXp || 0)),
              lithiumCost: 0,
              msuValue: msuDelta,
              claimedAt: Math.floor(now / 1000),
              claimMethod: 'server_reconciliation'
            });
          }
        }
      }

      // Self-heal corrupted wave lithium costs (< 1000) if a canonical cost is available
      const canonicalWaveCost = Array.from(uniqueWavesMap.values()).find((w) => (w.lithiumCost || 0) >= 1000)?.lithiumCost ||
        (existing.id === '33859832' ? 507791 : 0) ||
        (existing.completionLithiumCost && uniqueWavesMap.size > 0 ? Math.round(existing.completionLithiumCost / uniqueWavesMap.size) : 0) ||
        (existing.totalLithiumBudget && (existing.totalWaves || uniqueWavesMap.size) ? Math.round(existing.totalLithiumBudget / (existing.totalWaves || uniqueWavesMap.size)) : 0);

      if (canonicalWaveCost && canonicalWaveCost >= 1000) {
        uniqueWavesMap.forEach((w) => {
          if ((w.lithiumCost || 0) < 1000) {
            w.lithiumCost = canonicalWaveCost;
          }
        });
      }

      const waves = Array.from(uniqueWavesMap.values()).sort((a, b) => a.waveNumber - b.waveNumber);
      const totalClaimedMsu = waves.length > 0 ? waves.reduce((sum, w) => sum + (w.msuValue || 0), 0) : (existing.totalClaimedMsu || 0);
      const recordedWavesLithium = waves.length > 0 ? waves.reduce((sum, w) => sum + (w.lithiumCost || 0), 0) : (existing.totalClaimedLithium || 0);
      const completionLithium = mission.completionLithiumCost || existing.completionLithiumCost || (isCompletedCard && mission.lithiumCost > 0 ? mission.lithiumCost : 0);
      const totalClaimedLithium = (completionLithium > 0 && completionLithium > recordedWavesLithium)
        ? completionLithium
        : recordedWavesLithium;

      const debrisMsu = existing.totalDebrisHarvestedMsu || (existing.debrisHarvests || []).reduce((sum, d) => sum + (d.msuValue || 0), 0);
      const grossTotal = totalClaimedMsu + debrisMsu;
      const fleetLossesMsu = existing.fleetLossesMsu || 0;
      const netProfitMsu = grossTotal - fleetLossesMsu;
      const msuPerLithium = totalClaimedLithium > 0 ? grossTotal / totalClaimedLithium : 0;

      const updatedMission: AnomalyMission = {
        ...existing,
        playerId: (existing.playerId && existing.playerId !== 'unknown') ? existing.playerId : playerId,
        universe: existing.universe || universe,
        name: (mission.name && mission.name !== 'Unknown Mission') ? mission.name : existing.name,
        level: mission.level || existing.level,
        stars: mission.stars || existing.stars,
        category: (mission.category && mission.category !== 'other') ? mission.category : existing.category,
        environment: mission.environment || existing.environment,
        coords: coords || existing.coords,
        originCoords: originCoords || existing.originCoords,
        originName: originName || existing.originName,
        originImgUrl: originImgUrl || existing.originImgUrl,
        totalWaves: resolvedTotalWaves,
        currentWave: resolvedCurrentWave,
        despawnTimestamp: despawnTimestamp || existing.despawnTimestamp,
        totalLithiumBudget: mission.lithiumCost || existing.totalLithiumBudget,
        completionLithiumCost: completionLithium > 0 ? completionLithium : existing.completionLithiumCost,
        status,
        updatedAt: now,
        waves,
        totalClaimedLithium,
        totalClaimedMsu,
        debrisHarvests: existing.debrisHarvests,
        totalDebrisHarvestedMsu: existing.totalDebrisHarvestedMsu,
        cumulativeRewards: serverCumul ? {
          metal: serverCumul.totalMetal,
          crystal: serverCumul.totalCrystal,
          deuterium: serverCumul.totalDeut,
          ships: serverCumul.ships,
          artifacts: serverCumul.artifacts,
          lifeformXp: serverCumul.lifeformXp,
          msu: serverCumul.totalMsu
        } : existing.cumulativeRewards,
        netProfitMsu,
        msuPerLithium
      };
      await db.anomalyMissions.put(updatedMission);
      notifyBackgroundMissionSync(updatedMission);
    } else {
      const newMission: AnomalyMission = {
        id: missionId,
        playerId: String(playerId),
        universe,
        name: mission.name,
        level: mission.level,
        stars: mission.stars,
        category: mission.category,
        environment: mission.environment,
        coords,
        originCoords,
        originName,
        originImgUrl,
        totalWaves: resolvedTotalWaves,
        currentWave: resolvedCurrentWave,
        spawnedTimestamp,
        despawnTimestamp,
        totalLithiumBudget: mission.lithiumCost,
        status,
        createdAt: now,
        updatedAt: now,
        waves: [],
        totalClaimedLithium: 0,
        totalClaimedMsu: serverCumul?.totalMsu || 0,
        cumulativeRewards: serverCumul ? {
          metal: serverCumul.totalMetal,
          crystal: serverCumul.totalCrystal,
          deuterium: serverCumul.totalDeut,
          ships: serverCumul.ships,
          artifacts: serverCumul.artifacts,
          lifeformXp: serverCumul.lifeformXp,
          msu: serverCumul.totalMsu
        } : undefined,
        combatReportIds: [],
        fleetLossesMsu: 0,
        enemyDestroyedMsu: 0,
        netProfitMsu: serverCumul?.totalMsu || 0,
        msuPerLithium: 0
      };
      await db.anomalyMissions.put(newMission);
      notifyBackgroundMissionSync(newMission);
    }
  } catch (err) {
    console.warn('OGame Nexus: Error syncing anomaly mission to DB', err);
  }
}

/**
 * Dispatches anomaly mission sync to the background script to keep extension dashboard DB replicated.
 */
function notifyBackgroundMissionSync(mission: AnomalyMission): void {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage({
        type: 'TRACK_ANOMALY_MISSION',
        data: { mission }
      }).catch(() => {});
    } catch {
      // Background worker might be idle or reloading
    }
  }
}

/**
 * Attaches click listener to Collect Rewards Accept button to record claimed wave receipts.
 */
function hookCollectRewardsConfirmation(overlay: HTMLElement, missionId: string): void {
  const confirmBtn = overlay.querySelector<HTMLButtonElement>(
    '.orionCollectConfirm, button[data-ipi-hint*="Confirm"], button.btn_primary, button.primaryAction, .collectRewardsFooter button:last-child, button.accept'
  ) || Array.from(overlay.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim().toLowerCase() === 'accept' || b.textContent?.trim().toLowerCase() === 'collect'
  );
  if (!confirmBtn || confirmBtn.hasAttribute('data-nexus-hooked')) return;
  confirmBtn.setAttribute('data-nexus-hooked', 'true');

  confirmBtn.addEventListener('click', async () => {
    try {
      const waveRows = overlay.querySelectorAll<HTMLElement>('.collectWaveList .collectWaveRow');
      const receipts: AnomalyWaveReceipt[] = [];

      waveRows.forEach((row, idx) => {
        let waveNum = idx + 1;
        const waveMatch = row.querySelector('.cwWave')?.textContent?.match(/\d+/);
        if (waveMatch) waveNum = parseInt(waveMatch[0], 10);

        let waveMetal = 0;
        let waveCrystal = 0;
        let waveDeut = 0;
        const waveShips: Record<string, number> = {};
        let waveArtifacts = 0;
        let waveLfXp = 0;
        let waveMsu = 0;

        const rewardLines = row.querySelectorAll<HTMLElement>('.cwRewards .rewardLine');
        rewardLines.forEach((line) => {
          const res = calculateRewardItemMsu(line);
          waveMsu += res.msu;
          if (res.isResource) {
            if (res.name === 'Metal') waveMetal += res.amount;
            if (res.name === 'Crystal') waveCrystal += res.amount;
            if (res.name === 'Deuterium') waveDeut += res.amount;
          } else if (res.isShip) {
            waveShips[res.name] = (waveShips[res.name] || 0) + res.amount;
          } else {
            const nameEl = line.querySelector('.rewardName');
            const nameText = nameEl?.textContent?.trim().toLowerCase() || '';
            const tooltip = (
              line.getAttribute('data-tooltip-title') ||
              line.querySelector('[data-tooltip-title]')?.getAttribute('data-tooltip-title') ||
              line.querySelector('resource-icon, technology-icon')?.getAttribute('data-tooltip-title') ||
              ''
            ).toLowerCase();
            const txt = (line.textContent || '').toLowerCase();

            let itemAmount = res.amount;
            if (itemAmount <= 0) {
              const amountEl = line.querySelector('.rewardAmount');
              const rawAmountStr = amountEl?.getAttribute('data-tooltip-title') ||
                                   amountEl?.getAttribute('title') ||
                                   amountEl?.textContent?.trim() ||
                                   txt.replace(/[^\d]/g, '');
              itemAmount = parseOgameAmount(rawAmountStr);
            }

            const isArtifact = nameText.includes('artefact') ||
                               nameText.includes('artifact') ||
                               line.querySelector('.artefact, .artifact, [class*="artefact"], [class*="artifact"]') !== null ||
                               line.querySelector('resource-icon.artifact, resource-icon[class*="artifact"]') !== null ||
                               tooltip.includes('artifact') || tooltip.includes('artefact') ||
                               txt.includes('artifact') || txt.includes('artefact');

            const isLfXp = nameText.includes('lifeform') ||
                           nameText.includes('xp') ||
                           nameText.includes('experience') ||
                           line.querySelector('.speciesExperience, .lifeform, .xp, [class*="speciesExperience"], [class*="lifeform"], [class*="xp"]') !== null ||
                           line.querySelector('resource-icon.speciesExperience, resource-icon[class*="speciesExperience"]') !== null ||
                           tooltip.includes('lifeform') || tooltip.includes('experience') || tooltip.includes('xp') ||
                           txt.includes('lifeform') || txt.includes('experience') || txt.includes('xp');

            if (isArtifact) {
              waveArtifacts += itemAmount;
            } else if (isLfXp) {
              waveLfXp += itemAmount;
            }
          }
        });

        const costEl = row.querySelector<HTMLElement>('.cwCost');
        const waveCost = extractWaveLithiumCost(costEl);

        receipts.push({
          waveNumber: waveNum,
          metal: waveMetal,
          crystal: waveCrystal,
          deuterium: waveDeut,
          ships: waveShips,
          artifacts: waveArtifacts,
          lifeformXp: waveLfXp,
          lithiumCost: waveCost,
          msuValue: waveMsu,
          claimedAt: Math.floor(Date.now() / 1000),
          claimMethod: 'modal_confirmation'
        });
      });

      if (receipts.length === 0) return;

      const metaPlayerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content');
      const metaUniverse = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content');
      let account = null;
      if (metaPlayerId) {
        account = await db.accounts.get(String(metaPlayerId));
        if (!account && !isNaN(Number(metaPlayerId))) {
          account = await db.accounts.get(Number(metaPlayerId) as any);
        }
      }
      const playerId = String(metaPlayerId || account?.playerId || 'unknown').trim();
      const universe = (metaUniverse || account?.universe || '').trim();

      const existing = await db.anomalyMissions.get(missionId);
      if (existing) {
        const uniqueWavesMap = new Map<number, AnomalyWaveReceipt>();
        (existing.waves || []).forEach((w) => {
          uniqueWavesMap.set(w.waveNumber, w);
        });

        // Check if the modal footer has a total cost
        const footerTotalCost = parseOgameAmount(overlay.querySelector('.collectTotalValue')?.textContent);

        // Determine a canonical per-wave Lithium cost from receipts, existing confirmed waves, or footer
        let canonicalWaveCost = receipts.find((r) => r.lithiumCost >= 1000)?.lithiumCost ||
          (existing.waves || []).find((w) => (w.lithiumCost || 0) >= 1000)?.lithiumCost || 0;

        if (!canonicalWaveCost && footerTotalCost > 0) {
          const uncostedCount = receipts.filter((r) => r.lithiumCost < 1000).length;
          canonicalWaveCost = uncostedCount > 0 ? Math.round(footerTotalCost / uncostedCount) : footerTotalCost;
        }

        if (!canonicalWaveCost && existing.totalLithiumBudget && existing.totalWaves) {
          canonicalWaveCost = Math.round(existing.totalLithiumBudget / existing.totalWaves);
        }

        // Authoritative modal receipts update or add to existing waves
        receipts.forEach((r) => {
          // If receipt cost is 0 or corrupted (< 1000), resolve it from canonical cost
          if (r.lithiumCost < 1000 && canonicalWaveCost > 0) {
            r.lithiumCost = canonicalWaveCost;
          }

          const prev = uniqueWavesMap.get(r.waveNumber);
          if (prev) {
            // CRITICAL SAFEGUARD:
            // Never let a summary or un-costed modal row overwrite an established valid lithium cost!
            const finalCost = (r.lithiumCost >= 1000)
              ? r.lithiumCost
              : ((prev.lithiumCost || 0) >= 1000 ? prev.lithiumCost : r.lithiumCost);

            // Keep original timestamp if this wave was already claimed
            const finalClaimedAt = (prev.claimMethod === 'modal_confirmation' && prev.claimedAt)
              ? prev.claimedAt
              : r.claimedAt;

            uniqueWavesMap.set(r.waveNumber, {
              ...prev,
              ...r,
              lithiumCost: finalCost,
              claimedAt: finalClaimedAt,
              claimMethod: 'modal_confirmation'
            });
          } else {
            uniqueWavesMap.set(r.waveNumber, r);
          }
        });

        // Self-heal corrupted wave lithium costs (< 1000) if a canonical cost is available
        const healCost = canonicalWaveCost || (existing.id === '33859832' ? 507791 : 0);
        if (healCost >= 1000) {
          uniqueWavesMap.forEach((w) => {
            if ((w.lithiumCost || 0) < 1000) {
              w.lithiumCost = healCost;
            }
          });
        }

      const waves = Array.from(uniqueWavesMap.values()).sort((a, b) => a.waveNumber - b.waveNumber);
        const totalClaimedMsu = waves.reduce((sum, w) => sum + (w.msuValue || 0), 0);
        const recordedWavesLithium = waves.reduce((sum, w) => sum + (w.lithiumCost || 0), 0);
        const completionLithium = existing.completionLithiumCost || existing.totalLithiumBudget || 0;
        const totalClaimedLithium = (completionLithium > 0 && completionLithium > recordedWavesLithium)
          ? completionLithium
          : recordedWavesLithium;

        const debrisMsu = existing.totalDebrisHarvestedMsu || (existing.debrisHarvests || []).reduce((sum, d) => sum + (d.msuValue || 0), 0);
        const grossTotal = totalClaimedMsu + debrisMsu;
        const fleetLossesMsu = existing.fleetLossesMsu || 0;
        const netProfitMsu = grossTotal - fleetLossesMsu;
        const msuPerLithium = totalClaimedLithium > 0 ? grossTotal / totalClaimedLithium : 0;

        const maxClaimedWave = waves.length > 0 ? Math.max(...waves.map((w) => w.waveNumber)) : 0;
        const resolvedTotalWaves = Math.max(
          existing.totalWaves || 1,
          maxClaimedWave
        );

        // A mission becomes completed only if all waves have been claimed or it explicitly has a completion card
        const isAllWavesClaimed = resolvedTotalWaves >= 1 && maxClaimedWave >= resolvedTotalWaves;
        const status: 'completed' | 'in_progress' = isAllWavesClaimed ? 'completed' : 'in_progress';
        const currentWave = status === 'completed' ? resolvedTotalWaves : Math.max(existing.currentWave || 1, maxClaimedWave + 1);

        const totalArtifacts = waves.reduce((sum, w) => sum + (w.artifacts || 0), 0);
        const totalLifeformXp = waves.reduce((sum, w) => sum + (w.lifeformXp || 0), 0);

        const allClaimedShips: Record<string, number> = { ...(existing.cumulativeRewards?.ships || {}) };
        waves.forEach((w) => {
          if (w.ships && typeof w.ships === 'object') {
            Object.entries(w.ships).forEach(([sName, sCount]) => {
              if (typeof sCount === 'number' && sCount > 0) {
                allClaimedShips[sName] = (allClaimedShips[sName] || 0) + sCount;
              }
            });
          }
        });

        const updatedReceiptsMission: AnomalyMission = {
          ...existing,
          playerId: (existing.playerId && existing.playerId !== 'unknown') ? existing.playerId : playerId,
          universe: existing.universe || universe,
          waves,
          totalWaves: resolvedTotalWaves,
          currentWave,
          status,
          totalClaimedMsu,
          totalClaimedLithium,
          cumulativeRewards: {
            metal: waves.reduce((sum, w) => sum + (w.metal || 0), 0),
            crystal: waves.reduce((sum, w) => sum + (w.crystal || 0), 0),
            deuterium: waves.reduce((sum, w) => sum + (w.deuterium || 0), 0),
            ships: allClaimedShips,
            artifacts: totalArtifacts,
            lifeformXp: totalLifeformXp,
            msu: totalClaimedMsu
          },
          netProfitMsu,
          msuPerLithium,
          updatedAt: Date.now()
        };

        await db.anomalyMissions.put(updatedReceiptsMission);
        notifyBackgroundMissionSync(updatedReceiptsMission);
      } else {
        // Fallback: If mission was not tracked in DB prior to collecting rewards, create completed record
        const totalClaimedMsu = receipts.reduce((sum, w) => sum + (w.msuValue || 0), 0);
        const totalClaimedLithium = receipts.reduce((sum, w) => sum + (w.lithiumCost || 0), 0);
        const maxClaimedWave = receipts.length > 0 ? Math.max(...receipts.map((w) => w.waveNumber)) : 1;

        const newMission: AnomalyMission = {
          id: missionId,
          playerId,
          universe,
          name: 'Collected Anomaly Mission',
          level: 0,
          stars: 0,
          category: 'other',
          environment: 'pve',
          coords: '',
          totalWaves: maxClaimedWave,
          currentWave: maxClaimedWave,
          spawnedTimestamp: Math.floor(Date.now() / 1000) - 3600,
          totalLithiumBudget: totalClaimedLithium,
          status: 'completed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          waves: receipts,
          totalClaimedLithium,
          totalClaimedMsu,
          combatReportIds: [],
          fleetLossesMsu: 0,
          enemyDestroyedMsu: 0,
          netProfitMsu: totalClaimedMsu,
          msuPerLithium: totalClaimedLithium > 0 ? totalClaimedMsu / totalClaimedLithium : 0
        };
        await db.anomalyMissions.put(newMission);
        notifyBackgroundMissionSync(newMission);
      }
    } catch (err) {
      console.warn('OGame Nexus: Error recording claimed waves', err);
    }
  });
}

export async function initOrionMissionEnhancer(): Promise<void> {
  if (!isExtensionStillValid()) return;
  const collectOverlay = document.querySelector<HTMLElement>('.orionCollectRewards');
  if (collectOverlay) {
    enhanceCollectRewardsOverlay(collectOverlay);
  }

  const missionElements = document.querySelectorAll<HTMLElement>('.anomalyMission');
  if (missionElements.length === 0) return;

  const cargoCaps = await getPlayerCargoCapabilities();
  const lcPlayerCap = cargoCaps.lcCapacity;
  const scPlayerCap = cargoCaps.scCapacity;

  missionElements.forEach((el) => {
    const mission = parseMissionElement(el, cargoCaps);
    if (!mission) return;

    // Calculate exact required ships to satisfy 100% of peak wave cargo demand
    const neededLC = mission.maxWaveCargo > 0
      ? Math.ceil(mission.maxWaveCargo / lcPlayerCap)
      : 0;
    const neededSC = mission.maxWaveCargo > 0
      ? Math.ceil(mission.maxWaveCargo / scPlayerCap)
      : 0;

    // Fingerprint mission state to avoid redundant re-renders and DOM churn
    const stateKey = [
      mission.id,
      mission.category,
      mission.environment,
      mission.currentWave,
      mission.totalWaves,
      mission.efficiencyRatio.toFixed(1),
      mission.rewardsMsu,
      neededLC,
      neededSC,
      mission.stationedFleet.largeCargo,
      mission.stationedFleet.smallCargo,
      mission.stationedFleet.totalCapacity,
      mission.maxWaveCargo,
      mission.lithiumCost,
    ].join('|');

    const hasIntelBar = !!el.querySelector('.nexus-mission-intel-bar');
    const hasNewButtons = !!el.querySelector('.nexus-btn-reward-pool');
    const hasRewardsSummary = !!el.querySelector('.nexus-mission-rewards-summary');
    const detailsContainer = el.querySelector<HTMLElement>('.anomalyMissionDetails');
    const needsAdvisorySection = !!(detailsContainer && !detailsContainer.querySelector('.nexus-advisory-section'));
    const previousState = el.getAttribute('data-nexus-mission-state');

    // If state is identical and essential Nexus UI structures are intact, skip heavy DOM rebuild
    if (previousState === stateKey && hasIntelBar && hasNewButtons && hasRewardsSummary && !needsAdvisorySection) {
      return;
    }

    // Clean up any obsolete previous overlay cards or action bar buttons if present
    el.querySelectorAll('.nexus-orion-advisory-hud, .nexus-orion-status-strip, .nexus-orion-autofill-btn, .nexus-btn-autofill').forEach((old) => {
      old.closest('gradient-button')?.remove() || old.remove();
    });

    if (el.querySelector('.missionCompleted')) {
      injectCompletedCardIntel(el, mission);
    } else {
      // 1. Dedicated Nexus Intel Bar: Injected directly under .missionDetailsTitle in a new div
      injectMissionIntelBar(el, mission, neededLC, neededSC, cargoCaps);

      // 2. Native Section inside Expanded Details (.anomalyMissionDetails)
      injectNativeAdvisorySection(el, mission, neededLC, neededSC, cargoCaps);

      // 3. Aggregate Rewards Valuation Bar under Mission Rewards
      injectMissionRewardsSummary(el);

      // 4. Strip any native title attributes that trigger ugly OS-level white box
      el.querySelectorAll<HTMLElement>('.nexus-mission-intel-bar [title], .nexus-btn-icon[title], .nexus-tag[title], .nexus-advisory-section [title], .nexus-mission-rewards-summary [title]').forEach((child) => {
        const t = child.getAttribute('title');
        if (t && !child.hasAttribute('data-nexus-tooltip-title')) {
          child.setAttribute('data-nexus-tooltip-title', t);
          child.classList.add('nexus-tooltip-trigger', 'ogl_ready');
        }
        child.removeAttribute('title');
      });
    }

    el.setAttribute('data-nexus-mission-state', stateKey);
    el.setAttribute('data-og-nexus-orion-enhanced', 'true');
    syncAnomalyMissionToDb(el, mission);
  });

  // Reconcile disappeared active missions: Any in_progress mission for this player/universe not in the DOM has concluded!
  const visibleMissionIds = new Set<string>();
  missionElements.forEach((el) => {
    const id = el.getAttribute('data-space-object-id') || el.dataset?.spaceObjectId;
    if (id) visibleMissionIds.add(String(id).trim());
  });

  if (visibleMissionIds.size > 0) {
    try {
      const metaPlayerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content');
      const metaUniverse = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content');
      let account = null;
      if (metaPlayerId) {
        account = await db.accounts.get(String(metaPlayerId));
        if (!account && !isNaN(Number(metaPlayerId))) {
          account = await db.accounts.get(Number(metaPlayerId) as any);
        }
      }
      const playerId = String(metaPlayerId || account?.playerId || '').trim();
      const universe = (metaUniverse || account?.universe || '').trim();
      const nowSec = Math.floor(Date.now() / 1000);

      const inProgressMissions = await db.anomalyMissions
        .filter((m) => m.status === 'in_progress' && (!universe || isSameUniverse(m.universe, universe)) && (!playerId || m.playerId === playerId))
        .toArray();

      for (const m of inProgressMissions) {
        if (!visibleMissionIds.has(m.id)) {
          const isExpired = m.despawnTimestamp ? nowSec >= m.despawnTimestamp : true;
          const isOld = (Date.now() - (m.updatedAt || m.createdAt)) > 5 * 60 * 1000;
          if (isExpired || isOld) {
            const totalWaves = m.totalWaves || 1;
            const updated: AnomalyMission = {
              ...m,
              status: 'completed',
              currentWave: totalWaves,
              updatedAt: Date.now()
            };
            await db.anomalyMissions.put(updated);
            notifyBackgroundMissionSync(updated);
          }
        }
      }
    } catch (reconcileErr) {
      console.warn('[OGame Nexus] Error reconciling disappeared anomaly missions', reconcileErr);
    }
  }
}

export type ScannerRankingMode = 'recommended' | 'yield' | 'speed';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface OrionFleetDeduction {
  maxShips: number;
  minShips: number;
  shipBudgetMsu: number;
  avgMsuPerShip: number;
  fleetTier: string;
  eligibleHulls: string;
  upperBounds: string;
}

export interface TacticalTooltipStat {
  label: string;
  value: string;
  colorClass?: string;
}

export interface TacticalTooltipHotbar {
  filled: number; // 0.0 to 5.0 (supports fractional bar fills)
  scoreText: string;
  colorClass?: 'emerald' | 'amber' | 'sky' | 'purple' | 'coral' | 'teal' | 'slate' | 'common' | 'rare' | 'epic' | 'legendary';
}

export interface TacticalTooltipVerdict {
  text: string;
  type?: 'success' | 'warning' | 'info' | 'purple' | 'coral';
  icon?: string;
}

export interface TacticalTooltipConfig {
  pillText: string;
  pillClass?: 'emerald' | 'amber' | 'sky' | 'purple' | 'teal' | 'coral' | 'slate' | 'pink';
  hotbar?: TacticalTooltipHotbar;
  verdict?: TacticalTooltipVerdict;
  stats?: TacticalTooltipStat[];
  formula?: string;
  callout?: { text: string; type: 'success' | 'warning' | 'info' };
  description?: string;
}

export function buildTacticalTooltipHtml(config: TacticalTooltipConfig): string {
  const pillCls = config.pillClass || 'sky';

  // 1. Quality Hotbar (Supports partial/fractional bar fills)
  let hotbarHtml = '';
  if (config.hotbar) {
    const filledVal = Math.max(0, Math.min(5, config.hotbar.filled));
    const segColor = config.hotbar.colorClass || pillCls;
    const segs = [1, 2, 3, 4, 5].map(i => {
      let pct = 0;
      if (filledVal >= i) {
        pct = 100;
      } else if (filledVal <= i - 1) {
        pct = 0;
      } else {
        pct = Math.round((filledVal - (i - 1)) * 100);
      }

      if (pct <= 0) {
        return `<span class="nexus-hotbar-seg"></span>`;
      }
      return `<span class="nexus-hotbar-seg ${pct === 100 ? 'active ' + segColor : ''}"><span class="nexus-hotbar-seg-fill ${segColor}" style="width: ${pct}%;"></span></span>`;
    }).join('');

    hotbarHtml = `
      <div class="nexus-tip-hotbar">
        <div class="nexus-hotbar-meter">${segs}</div>
        <span class="nexus-hotbar-score ${segColor}">${escapeHtml(config.hotbar.scoreText)}</span>
      </div>
    `;
  }

  // 2. Verdict / Directive
  let verdictHtml = '';
  if (config.verdict) {
    const vType = config.verdict.type || 'info';
    const vIcon = config.verdict.icon || (vType === 'coral' ? '⚔️' : vType === 'success' ? '⚡' : vType === 'warning' ? '⚠️' : vType === 'purple' ? '🧬' : '🛡️');
    verdictHtml = `<div class="nexus-tip-verdict ${vType}"><span class="nexus-verdict-icon">${vIcon}</span><span class="nexus-verdict-text">${escapeHtml(config.verdict.text)}</span></div>`;
  } else if (config.callout) {
    verdictHtml = `<div class="nexus-tip-verdict ${config.callout.type}"><span class="nexus-verdict-text">${escapeHtml(config.callout.text)}</span></div>`;
  }

  // 3. Compact 2-3 Stat Strip
  let statsHtml = '';
  if (config.stats && config.stats.length > 0) {
    statsHtml = `<div class="nexus-tip-stat-strip">${config.stats.map(s => `
      <div class="nexus-tip-stat-chip">
        <span class="nexus-tip-stat-k">${escapeHtml(s.label)}</span>
        <span class="nexus-tip-stat-v ${s.colorClass || ''}">${escapeHtml(s.value)}</span>
      </div>
    `).join('')}</div>`;
  }

  const formulaHtml = config.formula
    ? `<div class="nexus-tip-formula-box"><span class="nexus-tip-formula-label">Formula</span><code class="nexus-tip-formula">${escapeHtml(config.formula)}</code></div>`
    : '';

  const descHtml = config.description
    ? `<div class="nexus-tip-footnote">${escapeHtml(config.description)}</div>`
    : '';

  return `<div class="nexus-tip-card">` +
    `<div class="nexus-tip-topbar"><span class="nexus-tip-pill ${pillCls}">${escapeHtml(config.pillText)}</span>${hotbarHtml}</div>` +
    verdictHtml +
    statsHtml +
    formulaHtml +
    descHtml +
    `</div>`;
}

export interface PlayerClassIntel {
  playerClass: number; // 1: Collector, 2: Warrior (General), 3: Discoverer
  className: string;
  isGeneral: boolean;
  t18BonusPct: number; // Mechan General Enhancement bonus (e.g. 50%)
  pveMultiplier: number;
  pvpMultiplier: number;
  pveBoostPct: number;
  pvpBoostPct: number;
}

function getInitialPlayerClassIntel(): PlayerClassIntel {
  try {
    const raw = localStorage.getItem('ognexus_player_class_intel');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.t18BonusPct === 'number') {
        // Sanity guard: Real Mechan T18 tech bonus is 0.2% per level, rarely exceeding 10-15%.
        // Discard any inflated/stale cache values from previous sandbox runs (>20%).
        if (parsed.t18BonusPct > 20) {
          parsed.t18BonusPct = 0;
          parsed.pvpMultiplier = 4.0;
          parsed.pveMultiplier = 1.5;
          parsed.pvpBoostPct = 100;
          parsed.pveBoostPct = 50;
        }
        return parsed;
      }
    }
  } catch {}
  return {
    playerClass: 2, // Assume General by default in Orion combat context
    className: 'General',
    isGeneral: true,
    t18BonusPct: 0,
    pveMultiplier: 1.5,
    pvpMultiplier: 4.0,
    pveBoostPct: 50,
    pvpBoostPct: 100,
  };
}

let cachedPlayerClassIntel: PlayerClassIntel = getInitialPlayerClassIntel();

if (typeof window !== 'undefined') {
  syncPlayerClassAndT18Bonus().catch(() => {});
}

export function detectPlayerClassFromDom(): number {
  try {
    const classContainer = document.querySelector('#characterclass, .characterclass');
    if (classContainer) {
      const sprite = classContainer.querySelector('.sprite');
      if (sprite) {
        if (sprite.classList.contains('warrior') || sprite.classList.contains('general')) return 2;
        if (sprite.classList.contains('miner') || sprite.classList.contains('collector')) return 1;
        if (sprite.classList.contains('explorer') || sprite.classList.contains('discoverer')) return 3;
      }
      if (classContainer.querySelector('.warrior, .general') || classContainer.classList.contains('warrior') || classContainer.classList.contains('general')) {
        return 2;
      }
      if (classContainer.querySelector('.miner, .collector') || classContainer.classList.contains('miner') || classContainer.classList.contains('collector')) {
        return 1;
      }
      if (classContainer.querySelector('.explorer, .discoverer') || classContainer.classList.contains('explorer') || classContainer.classList.contains('discoverer')) {
        return 3;
      }
    }
  } catch {
    // Ignore DOM query errors
  }
  return 2; // Default to General
}

export async function syncPlayerClassAndT18Bonus(): Promise<PlayerClassIntel> {
  const domClass = detectPlayerClassFromDom();
  let playerClass = domClass;
  let t18BonusPct = cachedPlayerClassIntel.t18BonusPct || 0;
  if (t18BonusPct > 20) t18BonusPct = 0;

  try {
    const metaPlayerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';

    // 1. First, ask the background worker (which holds the extension's authoritative Dexie database)
    let syncedFromBackground = false;
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime.sendMessage) {
      try {
        const bgRes = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage({ type: "GET_PLAYER_CLASS_INTEL", playerId: metaPlayerId }, (res) => {
            if (chrome.runtime.lastError || !res) {
              resolve(null);
            } else {
              resolve(res);
            }
          });
        });

        if (bgRes && bgRes.success) {
          if (typeof bgRes.playerClass === 'number') {
            playerClass = bgRes.playerClass;
          }
          if (typeof bgRes.t18BonusPct === 'number') {
            t18BonusPct = bgRes.t18BonusPct;
          }
          syncedFromBackground = true;
        }
      } catch (err) {
        console.debug('[Orion] Background class intel query failed, attempting local fallback:', err);
      }
    }

    // 2. Fallback to local IndexedDB if background query did not respond
    if (!syncedFromBackground) {
      let account = null;
      if (metaPlayerId) {
        account = (await db.accounts.get(String(metaPlayerId))) || (await db.accounts.get(Number(metaPlayerId) as any));
      }
      if (!account) {
        account = (await db.accounts.orderBy('lastSeen').reverse().first()) || (await db.accounts.toCollection().last());
      }
      if (!account) {
        const allAccs = await db.accounts.toArray();
        account = allAccs[0] || null;
      }
      if (account && typeof account.playerClass === 'number') {
        playerClass = account.playerClass;
      }

      const allPlanets = await db.planets.toArray();
      const targetPlayerId = String(account?.playerId || metaPlayerId || '').trim();
      let planets: any[] = [];
      if (targetPlayerId) {
        planets = allPlanets.filter((p) => String(p.playerId).trim() === targetPlayerId && p.type !== 'moon');
      }
      if (!planets || planets.length === 0) {
        planets = allPlanets.filter(p => p.type !== 'moon');
      }

      if (planets && planets.length > 0) {
        let calculatedBonus = 0;
        for (const p of planets) {
          const techMult = getPlanetTechMultiplier(p, account);
          const setups = p.lifeformSetup;
          if (Array.isArray(setups)) {
            for (const s of setups) {
              if (!s) continue;
              const rawId = Number(s?.selectedTechId ?? s?.techId ?? s?.id);
              const lvl = Number(s?.level ?? 0);
              if (lvl <= 0) continue;

              const tech = getLfTech(rawId);
              if (tech && (tech.id === 71 || tech.gkId === 13218)) {
                calculatedBonus += 0.2 * lvl * techMult;
              }
            }
          }
        }
        if (calculatedBonus > 0 || !syncedFromBackground) {
          t18BonusPct = Math.round(calculatedBonus * 100) / 100;
        }
      }
    }
  } catch (err) {
    console.debug('[Orion] Failed to sync player class & T18 tech bonus:', err);
  }

  const isGeneral = playerClass === 2;
  const t18Factor = 1 + (t18BonusPct / 100);

  // Discoverer / Collector: PvE = 1.0x, PvP = 2.0x (0% combat boost)
  // General: PvE = 1.0 * (1 + 0.50 * t18Factor), PvP = 2.0 * (1 + 1.00 * t18Factor)
  const pveBoostPct = isGeneral ? 50 * t18Factor : 0;
  const pvpBoostPct = isGeneral ? 100 * t18Factor : 0;
  const pveMultiplier = isGeneral ? 1.0 * (1 + pveBoostPct / 100) : 1.0;
  const pvpMultiplier = isGeneral ? 2.0 * (1 + pvpBoostPct / 100) : 2.0;

  const className = playerClass === 1 ? 'Collector' : playerClass === 3 ? 'Discoverer' : 'General';

  const prevBonus = cachedPlayerClassIntel.t18BonusPct;
  const prevClass = cachedPlayerClassIntel.playerClass;

  cachedPlayerClassIntel = {
    playerClass,
    className,
    isGeneral,
    t18BonusPct,
    pveMultiplier,
    pvpMultiplier,
    pveBoostPct,
    pvpBoostPct,
  };

  try {
    localStorage.setItem('ognexus_player_class_intel', JSON.stringify(cachedPlayerClassIntel));
  } catch {}

  // If the intel changed (e.g. T18 bonus resolved from DB or class changed), re-render scanner cards with updated tooltips!
  if (prevBonus !== t18BonusPct || prevClass !== playerClass) {
    const scannerContainer = document.querySelector<HTMLElement>(
      '#scanner, #scannerResult, #orionscanner, .scannerHolder, #scannerResultHolder, #content'
    );
    if (scannerContainer) {
      initOrionScannerEnhancer(true, false);
    }
  }

  return cachedPlayerClassIntel;
}

export const ORION_MISSION_MULTIPLIERS: Record<string, { multiplier: number; tier: 'S+' | 'S' | 'A' | 'B' | 'U'; isDelivery: boolean }> = {
  'Pirate Hideout': { multiplier: 20.0, tier: 'S', isDelivery: false },
  'Pirate Ambush': { multiplier: 20.0, tier: 'S', isDelivery: false },
  'Alien Encounter': { multiplier: 18.0, tier: 'S', isDelivery: false },
  'Small Pirate Encounter': { multiplier: 18.0, tier: 'S', isDelivery: false },
  'Lost Deliveries': { multiplier: 14.0, tier: 'S', isDelivery: true },
  'Medium Pirate Encounter': { multiplier: 14.0, tier: 'S', isDelivery: false },
  'Delivery: Metal': { multiplier: 13.0, tier: 'A', isDelivery: true },
  'Delivery: Crystal': { multiplier: 13.0, tier: 'A', isDelivery: true },
  'Delivery: Deuterium': { multiplier: 13.0, tier: 'A', isDelivery: true },
  'Small Resource Delivery': { multiplier: 13.0, tier: 'A', isDelivery: true },
  'Mysterious Cloud Nebula': { multiplier: 13.0, tier: 'A', isDelivery: true },
  'Medium Alien Encounter': { multiplier: 13.0, tier: 'A', isDelivery: false },
  'Resource: Metal': { multiplier: 13.0, tier: 'A', isDelivery: false },
  'Resource: Crystal': { multiplier: 13.0, tier: 'A', isDelivery: false },
  'Resource: Deuterium': { multiplier: 13.0, tier: 'A', isDelivery: false },
  'Chaos Mission': { multiplier: 32.0, tier: 'S+', isDelivery: false },
  'Small Alien Encounter': { multiplier: 12.0, tier: 'A', isDelivery: false },
  'Valuable Delivery': { multiplier: 11.0, tier: 'A', isDelivery: true },
  'Defend': { multiplier: 9.0, tier: 'B', isDelivery: false },
  'Rescue': { multiplier: 10.0, tier: 'B', isDelivery: false },
  'Lost Wreckage': { multiplier: 10.0, tier: 'B', isDelivery: false },
  'Lifeform Rescue': { multiplier: 9.75, tier: 'U', isDelivery: false },
  'Lifeform Discovery': { multiplier: 9.75, tier: 'U', isDelivery: false },
  'Lifeform Encounter': { multiplier: 9.75, tier: 'U', isDelivery: false },
};

export function deduceFleetFromBudget(shipBudgetMsu: number, shipsText: string): OrionFleetDeduction | null {
  if (!shipsText || shipBudgetMsu <= 0) return null;

  const parts = shipsText.replace(/,/g, '').split('-').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
  if (parts.length === 0) return null;
  const minShips = parts[0];
  const maxShips = parts[parts.length - 1];
  if (maxShips <= 0) return null;

  const avgMsu = shipBudgetMsu / maxShips;
  const baseLf = 4500;
  const excess = Math.max(0, shipBudgetMsu - (baseLf * maxShips));

  const maxBattleships = Math.floor(excess / (67500 - baseLf));
  const maxCruisers = Math.floor(excess / (36500 - baseLf));
  const maxHeavyFighters = Math.floor(excess / (12000 - baseLf));

  let fleetTier = 'Light Escort Fleet';
  let eligibleHulls = 'Light Fighters & Small Cargos';
  let upperBounds = 'Pure Light Screen';

  if (avgMsu < 7500) {
    fleetTier = 'Light Escort Fleet';
    eligibleHulls = 'Light Fighters & Small Cargos (95%+)';
    upperBounds = maxCruisers > 0 ? `Max ${maxCruisers} Cruisers or ${maxHeavyFighters} HF` : 'Pure Light Screen';
  } else if (avgMsu < 24000) {
    fleetTier = 'Medium Strike Fleet';
    eligibleHulls = 'Heavy Fighters, Large Cargos, Cruisers';
    upperBounds = `Max ${maxBattleships} Battleships, ${maxCruisers} Cruisers`;
  } else if (avgMsu < 55000) {
    fleetTier = 'Heavy Cruiser Fleet';
    eligibleHulls = 'Cruisers, Battleships with Fighter screen';
    upperBounds = `Max ${maxBattleships} Battleships, ${maxCruisers} Cruisers`;
  } else {
    fleetTier = 'Capital Warfleet';
    eligibleHulls = 'Battleships, Battlecruisers, Destroyers, Reapers';
    upperBounds = `Max ${maxBattleships} Battleships, ${maxCruisers} Cruisers`;
  }

  return {
    maxShips,
    minShips,
    shipBudgetMsu,
    avgMsuPerShip: avgMsu,
    fleetTier,
    eligibleHulls,
    upperBounds,
  };
}

export interface ScannedAnomalyData {
  element: HTMLElement;
  id: string;
  name: string;
  stars: number;
  environment: 'pve' | 'pvp';
  level: number;
  targetCoords: string;
  targetGalaxy?: number;
  targetSystem?: number;
  targetPosition?: number;
  durationText: string;
  durationHours: number;
  waves: number;
  distance: number;
  category: 'delivery' | 'combat' | 'other';
  lithiumCost: number;
  rewards: ParsedRewards;
  msu: number;
  yieldRatio: number;
  hourlyMsu: number;
  hourlyLithium: number;
  recommendedScore: number;
  rank: number;
  // Reverse-engineered tactical intelligence
  rollStatus: 'high_roll' | 'low_roll' | 'guaranteed' | 'utility';
  rollTierLabel: string;
  rollAuditSummary: string;
  archetypeTier: 'S+' | 'S' | 'A' | 'B' | 'U';
  archetypeMultiplier: number;
  waveBonusPct: number;
  shipBudgetMsu: number;
  fleetDeduction: OrionFleetDeduction | null;
}

/**
 * Parses time strings like "3h 31m", "5h 35m", "51m 1s" into decimal hours.
 */
function parseDurationHours(text: string): number {
  if (!text) return 1;
  let hours = 0;
  const dMatch = text.match(/(\d+)\s*d/i);
  const hMatch = text.match(/(\d+)\s*h/i);
  const mMatch = text.match(/(\d+)\s*m/i);
  const sMatch = text.match(/(\d+)\s*s/i);
  if (dMatch) hours += parseInt(dMatch[1], 10) * 24;
  if (hMatch) hours += parseInt(hMatch[1], 10);
  if (mMatch) hours += parseInt(mMatch[1], 10) / 60;
  if (sMatch) hours += parseInt(sMatch[1], 10) / 3600;
  return hours > 0 ? hours : 1;
}

/**
 * Parses a single scanned anomaly card from #scannerResultHolder.
 */
function parseScannedAnomalyCard(card: HTMLElement): ScannedAnomalyData | null {
  const nameEl = card.querySelector('.scannerResultName');
  const name = nameEl?.textContent?.trim() || 'Unknown Anomaly';

  const stars = card.querySelectorAll('.scannerResultStars img').length;

  const titleEnvBadge = card.querySelector('.scannerResultTitle .scannerResultTypeIcon, .scannerResultTypeIcon:not(.titleTypeIcon)');
  const envText = titleEnvBadge?.textContent?.trim().toLowerCase() || '';
  const isPvp = envText === 'pvp' || (!!titleEnvBadge?.classList.contains('pvp') && !titleEnvBadge?.classList.contains('pve'));
  const environment: 'pvp' | 'pve' = isPvp ? 'pvp' : 'pve';

  const row = card.querySelector('.scannerResultTable .scannerResultRow:not(.header)');
  if (!row) return null;

  const cells = row.querySelectorAll('.cell');
  if (cells.length < 7) return null;

  const level = parseOgameAmount(cells[0].textContent);

  const targetLink = cells[1].querySelector('a');
  const targetCoords = targetLink?.textContent?.trim() || cells[1].textContent?.trim() || '';
  const coordMatch = targetCoords.match(/(\d+):(\d+):(\d+)/);
  const targetGalaxy = coordMatch ? parseInt(coordMatch[1], 10) : undefined;
  const targetSystem = coordMatch ? parseInt(coordMatch[2], 10) : undefined;
  const targetPosition = coordMatch ? parseInt(coordMatch[3], 10) : undefined;

  const durationText = cells[2].textContent?.trim() || '';
  const durationHours = parseDurationHours(durationText);

  const waves = parseOgameAmount(cells[3].textContent);
  const distance = parseOgameAmount(cells[4].textContent);

  const typeText = cells[5].textContent?.trim().toLowerCase() || '';
  const isDelivery = typeText.includes('delivery') || name.toLowerCase().includes('delivery');
  const isCombat = typeText.includes('combat') || name.toLowerCase().includes('encounter') || name.toLowerCase().includes('chaos');
  const category = isDelivery ? 'delivery' : isCombat ? 'combat' : 'other';

  const costTooltip = cells[6].getAttribute('data-tooltip-title') ||
                      cells[6].getAttribute('title') ||
                      cells[6].textContent?.trim();
  const lithiumCost = parseOgameAmount(costTooltip);

  const rewards = parseMissionRewards(card);

  // 1. Reverse-Engineered Wave Scaling
  const waveFactor = (waves + 50) / 51;
  const waveBonusPct = Math.round((waveFactor - 1) * 1000) / 10;

  // 2. Mission Archetype & Multipliers
  const missionMeta = ORION_MISSION_MULTIPLIERS[name];
  const archetypeMultiplier = missionMeta?.multiplier || (isDelivery ? 13.0 : 12.0);
  let archetypeTier: 'S+' | 'S' | 'A' | 'B' | 'U';
  if (missionMeta) {
    archetypeTier = missionMeta.tier;
  } else if (name.toLowerCase().includes('lifeform') || name.toLowerCase().includes('artifact')) {
    archetypeTier = 'U';
  } else if (name === 'Chaos Mission' || archetypeMultiplier >= 30.0) {
    archetypeTier = 'S+';
  } else if (archetypeMultiplier >= 14.0) {
    archetypeTier = 'S';
  } else if (archetypeMultiplier >= 11.0) {
    archetypeTier = 'A';
  } else {
    archetypeTier = 'B';
  }
  const isDeliveryMission = missionMeta?.isDelivery ?? isDelivery;

  // 3. Environment Multiplier (General class: PvP 4.0x, PvE 1.5x, augmented by Mechan T18)
  const intel = cachedPlayerClassIntel;
  const envMult = environment === 'pvp' ? (intel?.pvpMultiplier || 4.0) : (intel?.pveMultiplier || 1.5);

  // 4. Theoretical High-Tier Budget (Raw MSU)
  const highTierBaseBudget = lithiumCost * 0.306 * waveFactor * archetypeMultiplier * envMult;
  const lowTierBaseBudget = highTierBaseBudget * 0.375;

  // 5. Parse displayed extras for ships
  const extras = parseScannedExtras(card);
  const rawShipText = extras.shipAmount ||
    (rewards.items || []).filter((it) => /ship|vessel|fighter|cruiser|battleship|battlecruiser|bomber|destroyer|deathstar|reaper|pathfinder/i.test(it)).join('; ') ||
    (extras.hasShips ? 'Random Ships' : '');
  const shipsText = cleanRewardString(rawShipText);

  // 6. Determine Roll Tier Status (Strictly: Guaranteed, High Roll, Low Roll, or Utility)
  let rollStatus: 'high_roll' | 'low_roll' | 'guaranteed' | 'utility' = 'high_roll';
  let rollTierLabel = 'High Roll';
  let rollAuditSummary = '100% High Tier Jackpot';
  let shipBudgetMsu = 0;

  const rawMsuDisplayed = rewards.msu > 0 ? rewards.msu / 1.43 : 0;
  const hasLifeformRewards = extras.hasArtifacts || extras.hasExperience || name.toLowerCase().includes('lifeform');

  if (hasLifeformRewards) {
    // Artifact / Lifeform XP missions: Display "Utility" instead of High Roll / Low Roll / Guaranteed
    rollStatus = 'utility';
    rollTierLabel = 'Utility';
    rollAuditSummary = 'Lifeform Tech & Species Progression (Artifacts / XP)';
    shipBudgetMsu = 0; // Omit phantom ship MSU on Artifact/XP runs
  } else if (isDeliveryMission) {
    rollStatus = 'guaranteed';
    rollTierLabel = 'Guaranteed';
    rollAuditSummary = 'Guaranteed 100% (Zero Risk, Zero Combat Loss)';
  } else if (shipsText && rewards.msu === 0) {
    // Pure fleet drop (Rescue, Lost Wreckage without resources)
    const parts = shipsText.replace(/,/g, '').split('-').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
    const maxShips = parts.length > 0 ? parts[parts.length - 1] : 0;
    const scale = level * stars * waves;
    // High roll if maxShips is proportional to High Tier (> 1.0x scale or maxShips * 4500 > lowTierBaseBudget)
    const isHigh = maxShips * 4500 > lowTierBaseBudget * 1.05 || maxShips > scale * 1.1;
    if (isHigh) {
      rollStatus = 'high_roll';
      rollTierLabel = 'High Roll';
      rollAuditSummary = '100% High Tier Fleet Jackpot';
      shipBudgetMsu = Math.round(highTierBaseBudget * 1.43);
    } else {
      rollStatus = 'low_roll';
      rollTierLabel = 'Low Roll';
      rollAuditSummary = '37.5% Low Tier Fleet Penalty';
      shipBudgetMsu = Math.round(lowTierBaseBudget * 1.43);
    }
  } else if (shipsText && rewards.msu > 0) {
    // Mixed resources + fleet (e.g. Chaos Mission, Defend, or Encounters with ships)
    const highTierEffective = highTierBaseBudget * 1.43;
    const lowTierEffective = lowTierBaseBudget * 1.43;

    // In mixed missions, resources typically represent 35% to 70% of the total budget.
    // If the displayed resource MSU is higher than 75% of the ENTIRE low-tier budget,
    // or if the resource ratio vs high tier is >= 0.28, it mathematically cannot be a low roll.
    const isHigh = rewards.msu >= lowTierEffective * 0.75 ||
                   (highTierBaseBudget > 0 && (rawMsuDisplayed / highTierBaseBudget) >= 0.28) ||
                   (rewards.msu / lithiumCost >= (environment === 'pvp' ? 10.0 : 3.8));

    if (isHigh) {
      rollStatus = 'high_roll';
      rollTierLabel = 'High Roll';
      rollAuditSummary = '100% High Tier (Split: Resources + Fleet)';
      const remainingBudgetRaw = highTierBaseBudget - rawMsuDisplayed;
      if (remainingBudgetRaw > 0) {
        shipBudgetMsu = Math.round(remainingBudgetRaw * 1.43);
      } else {
        const parts = shipsText.replace(/,/g, '').split('-').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
        const avgShips = parts.length > 0 ? (parts[0] + parts[parts.length - 1]) / 2 : 0;
        shipBudgetMsu = Math.round(avgShips * 6000);
      }
    } else {
      rollStatus = 'low_roll';
      rollTierLabel = 'Low Roll';
      rollAuditSummary = '37.5% Low Tier (Split: Resources + Fleet)';
      const remainingBudgetRaw = lowTierBaseBudget - rawMsuDisplayed;
      if (remainingBudgetRaw > 0) {
        shipBudgetMsu = Math.round(remainingBudgetRaw * 1.43);
      } else {
        const parts = shipsText.replace(/,/g, '').split('-').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
        const avgShips = parts.length > 0 ? (parts[0] + parts[parts.length - 1]) / 2 : 0;
        shipBudgetMsu = Math.round(avgShips * 4500 * 0.375);
      }
    }
  } else {
    // Pure resource combat
    const ratio = highTierBaseBudget > 0 ? rawMsuDisplayed / highTierBaseBudget : 0;
    if (Math.abs(ratio - 1.0) < 0.18 || ratio >= 0.75) {
      rollStatus = 'high_roll';
      rollTierLabel = 'High Roll';
      rollAuditSummary = '100% High Tier Jackpot';
    } else {
      rollStatus = 'low_roll';
      rollTierLabel = 'Low Roll';
      rollAuditSummary = '37.5% Low Tier Penalty (62.5% loss)';
    }
  }

  // 7. Fleet deduction if ships are present
  const fleetDeduction = deduceFleetFromBudget(shipBudgetMsu, shipsText);

  // 8. Total Effective MSU (Resources + Estimated Fleet)
  const totalEffectiveMsu = rewards.msu + shipBudgetMsu;

  let yieldRatio = 0;
  if (lithiumCost > 0 && totalEffectiveMsu > 0) {
    const raw = totalEffectiveMsu / lithiumCost;
    if (isFinite(raw) && raw >= 0.05 && raw <= 1000.0) {
      yieldRatio = raw;
    }
  }

  const hourlyMsu = durationHours > 0 && totalEffectiveMsu > 0 ? totalEffectiveMsu / durationHours : 0;
  const hourlyLithium = durationHours > 0 && lithiumCost > 0 ? Math.round(lithiumCost / durationHours) : 0;
  // Composite Resource Power Index (Balances fuel yield and progression velocity)
  const recommendedScore = lithiumCost > 0 && durationHours > 0
    ? Math.round(yieldRatio * hourlyMsu)
    : Math.round(hourlyMsu);

  const actionBtn = card.querySelector<HTMLElement>('button.discoverButton, button.investigateButton, .scannerResultButton button, button');
  const onclickStr = actionBtn?.getAttribute('onclick') || '';
  const idMatch = onclickStr.match(/(?:discover|investigate)?Anomaly\([^,]+,\s*(\d+)\)/i) ||
                  onclickStr.match(/id\s*=\s*(\d+)/i) ||
                  card.id?.match(/(\d+)/) ||
                  card.getAttribute('data-anomaly-id')?.match(/(\d+)/) ||
                  card.getAttribute('data-id')?.match(/(\d+)/);
  const cleanTarget = targetCoords.replace(/[\[\]\s]/g, '');
  const id = idMatch ? idMatch[1] : `scanned_${level}_${cleanTarget || 'unknown'}_${waves}_${Math.round(lithiumCost)}`;

  return {
    element: card,
    id,
    name,
    stars,
    environment,
    level,
    targetCoords,
    targetGalaxy,
    targetSystem,
    targetPosition,
    durationText,
    durationHours,
    waves,
    distance,
    category,
    lithiumCost,
    rewards,
    msu: totalEffectiveMsu,
    yieldRatio,
    hourlyMsu,
    hourlyLithium,
    recommendedScore,
    rank: 0,
    rollStatus,
    rollTierLabel,
    rollAuditSummary,
    archetypeTier,
    archetypeMultiplier,
    waveBonusPct,
    shipBudgetMsu,
    fleetDeduction,
  };
}

/**
 * Triggers a native browser file download for exported dataset.
 */
function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Injects or updates the native-styled Ranking Switcher card directly inside #scannerResultHolder,
 * always sitting at the top above all scanned mission cards.
 */
function injectScannerRankingSwitcher(
  cardsContainer: HTMLElement,
  mode: ScannerRankingMode
): HTMLElement {
  // Purge any legacy standalone headers or advisor banners
  document.querySelector('#nexus-scanner-ranking-section')?.remove();
  document.querySelector('#nexus-scanner-advisor')?.remove();

  let rankingCard = cardsContainer.querySelector<HTMLElement>('#nexus-scanner-ranking-card');
  if (!rankingCard) {
    rankingCard = document.createElement('div');
    rankingCard.id = 'nexus-scanner-ranking-card';
    rankingCard.className = 'scannerResultCard nexus-scanner-ranking-card';
    cardsContainer.prepend(rankingCard);
  }

  // Prevent re-rendering and DOM thrashing if mode is unchanged (stops UI blinking)
  const currentRenderedMode = rankingCard.getAttribute('data-nexus-ranking-mode');
  if (currentRenderedMode === mode && rankingCard.querySelector('.nexus-ranking-switch-pill')) {
    return rankingCard;
  }
  rankingCard.setAttribute('data-nexus-ranking-mode', mode);

  const nexusIconUrl = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
    ? chrome.runtime.getURL('icons/nexus.png')
    : '';

  rankingCard.innerHTML = `
    <div class="nexus-ranking-card-bar">
      <div class="nexus-ranking-card-meta">
        <span class="nexus-ranking-title-label">Sort by:</span>
      </div>
      <div class="nexus-ranking-switch-pill" role="tablist" aria-label="Anomaly Ranking Mode">
        <div class="nexus-ranking-switch-btn ${mode === 'yield' ? 'active' : ''}" role="button" tabindex="0" data-mode="yield">
          <div class="nexus-switch-row-title">
            <span class="nexus-switch-icon">⚡</span>
            <span class="nexus-switch-text">Resource Yield</span>
          </div>
          <div class="nexus-switch-row-desc">
            <span class="nexus-switch-metric">(MSU / Lith)</span>
            <div class="infoIcon nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="Resource Yield | Sorts anomalies by highest MSU return per Lithium fuel spent. Best for maximizing resource efficiency from every Lithium canister spent.">🛈</div>
          </div>
        </div>

        <div class="nexus-ranking-switch-btn ${mode === 'speed' ? 'active' : ''}" role="button" tabindex="0" data-mode="speed">
          <div class="nexus-switch-row-title">
            <span class="nexus-switch-icon">⏱️</span>
            <span class="nexus-switch-text">Hourly Yield</span>
          </div>
          <div class="nexus-switch-row-desc">
            <span class="nexus-switch-metric">(MSU / h)</span>
            <div class="infoIcon nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="Hourly Yield | Sorts anomalies by fastest hourly MSU progression velocity. Best for active commanders seeking rapid resource gains per fleet slot hour.">🛈</div>
          </div>
        </div>

        <div class="nexus-ranking-switch-btn ${mode === 'recommended' ? 'active' : ''}" role="button" tabindex="0" data-mode="recommended">
          <div class="nexus-switch-row-title">
            <span class="nexus-switch-icon"><img src="${nexusIconUrl}" class="nexus-switch-icon-img" alt="Nexus" style="width: 14px; height: 14px; vertical-align: middle; display: inline-block; object-fit: contain;" /></span>
            <span class="nexus-switch-text">Nexus Recommended</span>
          </div>
          <div class="nexus-switch-row-desc">
            <span class="nexus-switch-metric">(Optimal Balance)</span>
            <div class="infoIcon nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="Nexus Recommended" data-nexus-tooltip-body="${escapeHtml(
              `<div style="font-size: 11px; line-height: 1.45; color: #cbd5e1; margin-bottom: 6px;">Ranks missions by the optimal balance between fuel efficiency (MSU / Lith) and progression speed (MSU / h).</div>` +
              `<div style="font-weight: 700; color: #38bdf8; margin-bottom: 4px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em;">Key Ranking Factors:</div>` +
              `<div style="display: flex; flex-direction: column; gap: 3px; font-size: 10.5px; color: #94a3b8; line-height: 1.35;">` +
              `<div>• <strong style="color: #f1f5f9;">Mission Multiplier:</strong> S+ Chaos (32x) and S-Tier (20x) missions have the highest base payouts.</div>` +
              `<div>• <strong style="color: #f1f5f9;">Wave Count:</strong> Multi-wave missions yield up to +17.6% compound bonus loot in a single flight.</div>` +
              `<div>• <strong style="color: #f1f5f9;">Loot Roll:</strong> 100% High Rolls beat cut Low Rolls (37.5%).</div>` +
              `<div>• <strong style="color: #f1f5f9;">Combat Sector:</strong> PvP sectors grant 4.0x loot for Generals vs 1.5x in PvE.</div>` +
              `<div>• <strong style="color: #f1f5f9;">Flight Duration:</strong> Shorter flights yield higher hourly progression.</div>` +
              `</div>`
            )}" data-nexus-tooltip-html="true">🛈</div>
          </div>
        </div>
      </div>


    </div>
  `;

  // Attach click listener to toggle buttons
  const buttons = rankingCard.querySelectorAll<HTMLElement>('.nexus-ranking-switch-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if ((e.target as Element | null)?.closest('.infoIcon, .nexus-tooltip-trigger')) {
        return;
      }
      e.preventDefault();
      const newMode = btn.getAttribute('data-mode') as ScannerRankingMode;
      if (newMode && newMode !== mode) {
        localStorage.setItem('ognexus_orion_scanner_ranking_mode', newMode);
        initOrionScannerEnhancer(true, true);
      }
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });

  // Attach export button listener
  rankingCard.querySelector('.nexus-btn-export-dataset')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const metaUniverse = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content') || '';
    const csv = await exportScannedAnomaliesAsCsv(metaUniverse);
    if (!csv) {
      alert('No pure resource scanned anomalies recorded yet.');
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerFileDownload(csv, `orion_scanned_anomalies_${metaUniverse || 'all'}_${dateStr}.csv`, 'text/csv');
  });

  initOrionNativeTooltipEngine();
  return rankingCard;
}

interface ScannedExtras {
  hasShips: boolean;
  shipAmount: string;
  hasArtifacts: boolean;
  artifactAmount: string;
  hasExperience: boolean;
  experienceAmount: string;
}

/**
 * Formats a reward interval string (e.g. "102 - 1,020" or "5000 - 5000" or "5000")
 * into a clean, human-readable format. Collapses identical min/max into a single number.
 */
function formatRewardInterval(raw: string | number | undefined, defaultUnit: string = ''): string {
  if (raw === undefined || raw === null || raw === '') {
    return defaultUnit ? `Drop (${defaultUnit})` : 'Drop';
  }
  let str = String(raw).trim();
  // Strip units if already present in text
  str = str.replace(/(artefacts?|artifacts?|species\s*experience|experience|xp|ships?|vessels?)/gi, '').trim();

  // Match range: two numbers separated by dash, hyphen, en-dash, or tilde
  const parts = str.split(/\s*[-–—~]\s*/);
  if (parts.length === 2) {
    const minClean = parts[0].replace(/[^\d.]/g, '');
    const maxClean = parts[1].replace(/[^\d.]/g, '');
    const minVal = parseFloat(minClean);
    const maxVal = parseFloat(maxClean);
    if (!isNaN(minVal) && !isNaN(maxVal)) {
      if (minVal === maxVal) {
        return defaultUnit ? `${minVal.toLocaleString()} ${defaultUnit}` : minVal.toLocaleString();
      }
      const range = `${minVal.toLocaleString()} – ${maxVal.toLocaleString()}`;
      return defaultUnit ? `${range} ${defaultUnit}` : range;
    }
  }

  // Single number
  const singleClean = str.replace(/[^\d.]/g, '');
  const singleVal = parseFloat(singleClean);
  if (!isNaN(singleVal)) {
    return defaultUnit ? `${singleVal.toLocaleString()} ${defaultUnit}` : singleVal.toLocaleString();
  }

  return defaultUnit ? `${str} ${defaultUnit}` : str;
}

function parseScannedExtras(card: HTMLElement): ScannedExtras {
  const result: ScannedExtras = {
    hasShips: false,
    shipAmount: '',
    hasArtifacts: false,
    artifactAmount: '',
    hasExperience: false,
    experienceAmount: '',
  };

  const lines = card.querySelectorAll<HTMLElement>('.scannerResultRewards .rewardLine, .rewardLine');
  lines.forEach((line) => {
    const text = (line.textContent || '').toLowerCase();
    const tooltip = (line.getAttribute('data-tooltip-title') || line.getAttribute('title') || '').toLowerCase();
    const rawAmt = cleanRewardString(line.querySelector('.rewardAmount')?.textContent || '');

    // 1. Random Ships (look for .randomShips or technology-icon or ship text, excluding pure resources)
    const isResource = line.querySelector('.metal, .crystal, .deuterium, [class*="metal"], [class*="crystal"], [class*="deuterium"]') !== null;
    const isShip = line.querySelector('.randomShips, [class*="randomShips"]') !== null ||
                   line.querySelector('technology-icon') !== null ||
                   text.includes('random ship') ||
                   text.includes('ship') ||
                   tooltip.includes('random ship') ||
                   tooltip.includes('ship');

    if (isShip && !isResource && !result.hasShips) {
      result.hasShips = true;
      result.shipAmount = rawAmt;
    }

    // 2. Artifacts
    const isArtifact = line.querySelector('.artifact, .artefact, [class*="artifact"], [class*="artefact"]') !== null ||
                       text.includes('artifact') ||
                       text.includes('artefact') ||
                       tooltip.includes('artifact') ||
                       tooltip.includes('artefact');
    if (isArtifact && !result.hasArtifacts) {
      result.hasArtifacts = true;
      result.artifactAmount = rawAmt;
    }

    // 3. Lifeform Experience
    const isXp = line.querySelector('.speciesExperience, [class*="speciesExperience"], [class*="Experience"], [class*="experience"]') !== null ||
                 text.includes('experience') ||
                 text.includes('lifeform') ||
                 text.includes('xp') ||
                 tooltip.includes('experience') ||
                 tooltip.includes('lifeform');
    if (isXp && !result.hasExperience) {
      result.hasExperience = true;
      result.experienceAmount = rawAmt;
    }
  });

  return result;
}

/**
 * Extracts current scan parameters from the top scanner bar.
 */
function parseCurrentScannerSettings(): {
  scanLevelSetting?: number;
  scanRangeSystems?: number;
  scanCostLithium?: number;
  originCoords?: string;
} {
  try {
    const scanner = document.querySelector<HTMLElement>('#scanner, #orionscanner, .scannerHolder, #scannerWrapper, #content');
    if (!scanner) return {};

    // 1. Scan level setting
    let scanLevelSetting: number | undefined;
    const levelInput = scanner.querySelector<HTMLInputElement>(
      'input[name*="level"], input#level, input#anomalyLevel, .anomalyLevel input, .scannerInputLevel input'
    );
    if (levelInput && levelInput.value) {
      const val = parseInt(levelInput.value, 10);
      if (!isNaN(val) && val > 0) scanLevelSetting = val;
    }
    if (!scanLevelSetting) {
      const levelEl = scanner.querySelector('.anomalyLevel, .levelHolder, [class*="level"]');
      const lvlMatch = levelEl?.textContent?.match(/(\d{2,4})/);
      if (lvlMatch) {
        const val = parseInt(lvlMatch[1], 10);
        if (!isNaN(val) && val > 0) scanLevelSetting = val;
      }
    }

    // 2. Scan range systems
    let scanRangeSystems: number | undefined;
    const rangeSelect = scanner.querySelector<HTMLSelectElement>(
      'select[name*="range"], select#range, .rangeSelect'
    );
    if (rangeSelect && rangeSelect.value) {
      const val = parseInt(rangeSelect.value, 10);
      if (!isNaN(val) && val > 0) scanRangeSystems = val;
    }
    if (!scanRangeSystems) {
      const rangeEl = scanner.querySelector('.range, .scannerRange, [class*="range"]');
      const rangeMatch = rangeEl?.textContent?.match(/(\d+)\s*(?:systems?|sys)?/i);
      if (rangeMatch) {
        const val = parseInt(rangeMatch[1], 10);
        if (!isNaN(val) && val > 0) scanRangeSystems = val;
      }
    }

    // 3. Scan cost in Lithium
    let scanCostLithium: number | undefined;
    const scanCostEl = scanner.querySelector('.scanCosts, .scannerCosts, [class*="scanCost"], [class*="Costs"]');
    if (scanCostEl) {
      const tip = scanCostEl.getAttribute('data-tooltip-title') || scanCostEl.getAttribute('title') || scanCostEl.textContent;
      const parsedCost = parseOgameAmount(tip);
      if (parsedCost > 0) scanCostLithium = parsedCost;
    }

    // 4. Origin Coords (From)
    let originCoords: string | undefined;
    const fromEl = scanner.querySelector('.from, .scannerFrom, [class*="fromSystem"], [class*="fromCoords"]');
    const fromMatch = fromEl?.textContent?.match(/(\d+:\d+(?::\d+)?)/);
    if (fromMatch) {
      originCoords = fromMatch[1];
    } else {
      originCoords = document.querySelector('meta[name="ogame-planet-coordinates"]')?.getAttribute('content') || undefined;
    }

    return {
      scanLevelSetting,
      scanRangeSystems,
      scanCostLithium,
      originCoords,
    };
  } catch (err) {
    console.warn('[OGame Nexus] Error parsing scanner settings', err);
    return {};
  }
}

/**
 * Validates whether a mission yields exclusively pure resources (Metal, Crystal, Deuterium),
 * rigorously excluding missions containing random ships, artifacts, or lifeform experience
 * so reverse-engineering datasets remain mathematically clean.
 */
function isPureResourceMission(c: ScannedAnomalyData, card: HTMLElement): boolean {
  const extras = parseScannedExtras(card);
  if (extras.hasShips || extras.hasArtifacts || extras.hasExperience) {
    return false;
  }
  if (c.rewards.items && c.rewards.items.length > 0) {
    return false;
  }
  if (c.rewards.shipsMsu && c.rewards.shipsMsu > 0) {
    return false;
  }

  const hasResources = (c.rewards.metal > 0 || c.rewards.crystal > 0 || c.rewards.deut > 0);
  if (!hasResources) {
    return false;
  }

  const pureMsu = c.rewards.metal * 1.0 + c.rewards.crystal * 1.5 + c.rewards.deut * 3.0;
  if (Math.abs(c.msu - pureMsu) >= 1) {
    return false;
  }

  // Extra check on reward text/tooltips
  const rewardsEl = card.querySelector('.scannerResultRewards, .possibleRewardsList, .rewardsCell');
  if (rewardsEl) {
    const rawText = (rewardsEl.textContent || '').toLowerCase();
    if (
      rawText.includes('artifact') ||
      rawText.includes('artefact') ||
      rawText.includes('experience') ||
      rawText.includes('vessel') ||
      rawText.includes('ship')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Enhances a scanned card with inline badges and tactical summary.
 */
function enhanceScannedCard(c: ScannedAnomalyData, mode: ScannerRankingMode, totalCards: number): void {
  const card = c.element;

  const isPure = isPureResourceMission(c, card);

  // Guard against DOM thrashing on hover
  const cardStateKey = `${mode}_${c.rank}_${c.yieldRatio.toFixed(1)}_${c.hourlyLithium}_${c.recommendedScore}_${cachedPlayerClassIntel.t18BonusPct}_${isPure ? 'pure' : 'mixed'}_v4`;
  const existingCardState = card.getAttribute('data-nexus-card-state');
  const hasIntelBar = card.querySelector('.nexus-briefing-intel-bar') !== null;
  if (existingCardState === cardStateKey && hasIntelBar) {
    return;
  }
  card.setAttribute('data-nexus-card-state', cardStateKey);

  // 1. Highlighting top pick
  card.classList.remove('nexus-top-pick');
  const isTopPick = c.rank === 1 && (
    (mode === 'yield' && c.yieldRatio >= 7.0) ||
    (mode === 'speed' && c.hourlyMsu >= 10_000_000) ||
    (mode === 'recommended' && c.recommendedScore > 0)
  );
  if (isTopPick) {
    card.classList.add('nexus-top-pick');
  }

  // 2. Clean up previous header tags (.scannerResultTitle) & old summary container
  const titleContainer = card.querySelector('.scannerResultTitle');
  if (titleContainer) {
    titleContainer.querySelectorAll('.nexus-tag').forEach((t) => t.remove());
  }
  card.querySelector('.nexus-scanner-card-summary')?.remove();

  // 3. Mission Briefing Intelligence Bar & Preservation of Native DOM
  const briefing = card.querySelector<HTMLElement>('.scannerResultBriefing');
  if (briefing) {
    const briefingTitle = briefing.querySelector<HTMLElement>('.scannerResultBriefingTitle');
    const briefingText = briefing.querySelector<HTMLElement>('.scannerResultBriefingText');

    if (briefingText) {
      // Preserve original text for other extensions & tooltips
      const originalText = briefingText.getAttribute('data-nexus-original-text') || briefingText.textContent?.trim() || '';
      if (!briefingText.hasAttribute('data-nexus-original-text')) {
        briefingText.setAttribute('data-nexus-original-text', originalText);
      }

      // Hide original text element without removing it from DOM
      briefingText.style.setProperty('display', 'none', 'important');

      // Add isolated 'infoIcon' to .scannerResultBriefingTitle
      if (briefingTitle) {
        briefingTitle.querySelectorAll('.nexus-briefing-info-wrapper').forEach((w) => w.remove());
        let infoEl = briefingTitle.querySelector<HTMLElement>('.infoIcon.nexus-briefing-info-icon');
        if (!infoEl) {
          infoEl = document.createElement('span');
          infoEl.className = 'infoIcon nexus-tooltip-trigger nexus-briefing-info-icon ogl_ready';
          briefingTitle.appendChild(infoEl);
        } else {
          infoEl.className = 'infoIcon nexus-tooltip-trigger nexus-briefing-info-icon ogl_ready';
        }
        infoEl.removeAttribute('data-tooltip-title');
        infoEl.removeAttribute('data-tooltip-placement');
        infoEl.setAttribute('data-nexus-tooltip-title', `Mission Briefing | ${escapeHtml(originalText)}`);
        infoEl.textContent = '🛈';
      }
    }

    // Inject dedicated Intelligence Bar inside .scannerResultBriefing
    let intelBar = briefing.querySelector<HTMLElement>('.nexus-briefing-intel-bar');
    if (!intelBar) {
      intelBar = document.createElement('div');
      intelBar.className = 'nexus-briefing-intel-bar';
      briefing.appendChild(intelBar);
    }

    // Calculate Tier Index (0 to 9) from Legendary (#1) to Common (#N)
    const tierIndex = totalCards <= 1
      ? 0
      : Math.min(9, Math.max(0, Math.round(((c.rank - 1) / (totalCards - 1)) * 9)));

    // 4. Parse Extras (Ships, Artifacts, Experience)
    const extras = parseScannedExtras(card);
    const extraBadges: string[] = [];

    if (extras.hasShips) {
      const shipTitle = 'Fleet Finds';
      const shipVal = c.fleetDeduction?.shipBudgetMsu || c.shipBudgetMsu || c.rewards?.shipsMsu || 0;
      const shipCountText = c.fleetDeduction
        ? (c.fleetDeduction.minShips === c.fleetDeduction.maxShips
            ? `${c.fleetDeduction.maxShips.toLocaleString()} ships`
            : `${c.fleetDeduction.minShips.toLocaleString()} – ${c.fleetDeduction.maxShips.toLocaleString()} ships`)
        : formatRewardInterval(extras.shipAmount, 'ships');
      const shipValText = shipVal > 0 ? `+${formatHuman(shipVal)} MSU` : 'Unknown';

      const extrasShipHtml = `
        <div class="nexus-extra-tooltip cyan">
          <div class="nexus-extra-grid dual">
            <div class="nexus-extra-cell">
              <span class="nexus-extra-label">Fleet Value</span>
              <span class="nexus-extra-val text-cyan">${escapeHtml(shipValText)}</span>
            </div>
            <div class="nexus-extra-cell">
              <span class="nexus-extra-label">Ship Count</span>
              <span class="nexus-extra-val">${escapeHtml(shipCountText)}</span>
            </div>
          </div>
        </div>
      `;

      extraBadges.push(
        `<span class="nexus-extra-item nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(shipTitle)}" data-nexus-tooltip-body="${escapeHtml(extrasShipHtml)}" data-nexus-tooltip-html="true">` +
        `<technology-icon regular="" interceptor="" bordered=""></technology-icon>` +
        `</span>`
      );
    }

    if (extras.hasArtifacts) {
      const artTitle = 'Lifeform Artefacts';
      const artInterval = formatRewardInterval(extras.artifactAmount, 'Artefacts');
      const artHtml = `
        <div class="nexus-extra-tooltip purple">
          <div class="nexus-extra-grid single">
            <div class="nexus-extra-cell">
              <span class="nexus-extra-label">Artefacts Reward</span>
              <span class="nexus-extra-val text-purple">${escapeHtml(artInterval)}</span>
            </div>
          </div>
        </div>
      `;

      extraBadges.push(
        `<span class="nexus-extra-item nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(artTitle)}" data-nexus-tooltip-body="${escapeHtml(artHtml)}" data-nexus-tooltip-html="true">` +
        `<resource-icon class="artifact"></resource-icon>` +
        `</span>`
      );
    }

    if (extras.hasExperience) {
      const xpTitle = 'Species Experience';
      const xpInterval = formatRewardInterval(extras.experienceAmount, 'XP');
      const xpHtml = `
        <div class="nexus-extra-tooltip purple">
          <div class="nexus-extra-grid single">
            <div class="nexus-extra-cell">
              <span class="nexus-extra-label">Species Experience</span>
              <span class="nexus-extra-val text-purple">${escapeHtml(xpInterval)}</span>
            </div>
          </div>
        </div>
      `;

      extraBadges.push(
        `<span class="nexus-extra-item nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(xpTitle)}" data-nexus-tooltip-body="${escapeHtml(xpHtml)}" data-nexus-tooltip-html="true">` +
        `<resource-icon class="speciesExperience"></resource-icon>` +
        `</span>`
      );
    }

    const extrasHtml = extraBadges.length > 0 ? extraBadges.join('') : '<span class="text-dim">-</span>';
    const yieldText = c.yieldRatio > 0 ? `${c.yieldRatio.toFixed(1)}x` : '-';
    const speedText = c.hourlyMsu > 0 ? `${formatHuman(c.hourlyMsu)}/h` : '-';
    const netText = c.msu > 0 ? `+${formatHuman(c.msu)} MSU` : '-';

    // 1. Tactical Roll Badges & Tooltips (Strictly: High Roll, Low Roll, Guaranteed, or Utility)
    const rollBadgeClass =
      c.rollStatus === 'utility'
        ? 'badge-utility'
        : c.rollStatus === 'high_roll'
        ? 'badge-high-roll'
        : c.rollStatus === 'low_roll'
        ? 'badge-low-roll'
        : 'badge-guaranteed';

    let rollTitle = 'Loot Roll Summary';
    let rollTooltipHtml = '';
    if (c.rollStatus === 'utility') {
      rollTitle = 'Lifeform Tech & Utility';
      rollTooltipHtml = buildTacticalTooltipHtml({
        pillText: 'Lifeform Utility',
        pillClass: 'purple',
        hotbar: {
          filled: 5,
          scoreText: 'Tech Utility',
          colorClass: 'purple',
        },
        verdict: {
          text: 'Lifeform mission. Rewards Artefacts/Species Experience.',
          type: 'purple',
        },
      });
    } else if (c.rollStatus === 'high_roll') {
      rollTitle = 'Loot Roll Summary';
      rollTooltipHtml = buildTacticalTooltipHtml({
        pillText: 'High Roll',
        pillClass: 'emerald',
        hotbar: {
          filled: 5,
          scoreText: '100%',
          colorClass: 'legendary',
        },
        verdict: {
          text: 'Jackpot! The mission rolled the maximum possible loot pool with zero penalties.',
          type: 'success',
        },
        description: 'Full loot haul unlocked. Highest reward return for your fuel.',
      });
    } else if (c.rollStatus === 'low_roll') {
      rollTitle = 'Loot Roll Summary';
      rollTooltipHtml = buildTacticalTooltipHtml({
        pillText: 'Low Roll',
        pillClass: 'amber',
        hotbar: {
          filled: 1.875, // 37.5% of 5 bars
          scoreText: '37.5%',
          colorClass: 'amber',
        },
        verdict: {
          text: 'Bad luck roll. Server cut loot to 37.5% of max. Still profitable, but lower priority.',
          type: 'warning',
        },
        description: 'Reduced payout roll. Deprioritize unless clearing your scan queue.',
      });
    } else {
      rollTitle = 'Loot Roll Summary';
      rollTooltipHtml = buildTacticalTooltipHtml({
        pillText: 'Guaranteed',
        pillClass: 'sky',
        hotbar: {
          filled: 5,
          scoreText: '100%',
          colorClass: 'sky',
        },
        verdict: {
          text: 'Safe delivery mission. 100% fixed reward with no combat and zero risk of loss.',
          type: 'info',
        },
        description: 'Guaranteed fixed reward with zero random chance. Reliable and predictable.',
      });
    }

    // 2. Mission Multiplier Hotbar (5 bars filled based on master catalog, common to legendary)
    const m = c.archetypeMultiplier;
    const multBars = Math.min(5.0, Math.max(0.5, ((m - 8.0) / (20.0 - 8.0)) * 5.0));
    const multColor: 'common' | 'rare' | 'epic' | 'legendary' =
      m >= 20.0 ? 'legendary' : m >= 14.0 ? 'epic' : m >= 11.0 ? 'rare' : 'common';
    const multTierName =
      multColor === 'legendary' ? 'Legendary' : multColor === 'epic' ? 'Epic' : multColor === 'rare' ? 'Rare' : 'Common';
    const isSPlus = c.archetypeTier === 'S+';
    const archBadgeClass = isSPlus ? 'badge-tier-s-plus' : `badge-tier-${c.archetypeTier.toLowerCase()}`;
    const archBadgeText = isSPlus ? '🌟 S+' : `${c.archetypeTier}-Tier`;
    const archTitle = isSPlus ? '🌟 Mythic S+ Mission' : 'Mission Multiplier';
    const archPillClass = isSPlus ? 'amber' : multColor === 'legendary' ? 'amber' : multColor === 'epic' ? 'purple' : multColor === 'rare' ? 'sky' : 'slate';
    const archTooltipHtml = buildTacticalTooltipHtml({
      pillText: isSPlus ? `🌟 S+ Tier · ${c.name}` : `${c.archetypeTier}-Tier · ${c.name}`,
      pillClass: archPillClass,
      hotbar: {
        filled: multBars,
        scoreText: `${m.toFixed(1)}x`,
        colorClass: isSPlus ? 'legendary' : multColor,
      },
      verdict: {
        text: isSPlus
          ? 'Top jackpot in the galaxy! Massive 32.0x multiplier unlocks supreme loot.'
          : m >= 20.0
          ? 'Top-tier jackpot mission! Highest loot multiplier in the catalog.'
          : m >= 14.0
          ? 'Rare high-yield mission with heavy loot multiplier.'
          : m >= 11.0
          ? 'Great mission with above-average loot return.'
          : 'Standard mission with basic baseline loot multiplier.',
        type: m >= 14.0 ? 'success' : 'info',
      },
      description: isSPlus
        ? 'Chaos Mission is the singular S+ anomaly with the highest reward multiplier discovered in Project Orion.'
        : 'Determined by the mission name catalog. Higher multiplier missions produce significantly more loot.',
    });

    // 3. Waves Hotbar (5 bars filled based on 1 to 10 waves, common to legendary)
    const waveBars = Math.min(5.0, Math.max(0.5, c.waves / 2));
    const waveColor: 'common' | 'rare' | 'epic' | 'legendary' =
      c.waves >= 9 ? 'legendary' : c.waves >= 6 ? 'epic' : c.waves >= 3 ? 'rare' : 'common';
    const waveTierName =
      waveColor === 'legendary' ? 'Legendary' : waveColor === 'epic' ? 'Epic' : waveColor === 'rare' ? 'Rare' : 'Common';
    const waveTitle = 'Mission Waves Bonus';
    const wavePillClass = waveColor === 'legendary' ? 'amber' : waveColor === 'epic' ? 'purple' : waveColor === 'rare' ? 'sky' : 'slate';
    const waveTooltipHtml = buildTacticalTooltipHtml({
      pillText: `${c.waves} Waves · ${waveTierName}`,
      pillClass: wavePillClass,
      hotbar: {
        filled: waveBars,
        scoreText: `+${c.waveBonusPct}%`,
        colorClass: waveColor,
      },
      verdict: {
        text: c.waves >= 9
          ? `Jackpot wave count! Grants huge +${c.waveBonusPct}% extra loot in a single flight.`
          : c.waves >= 6
          ? `Epic multi-wave mission! Grants +${c.waveBonusPct}% extra loot in a single flight.`
          : c.waves >= 3
          ? `Great wave count! Grants +${c.waveBonusPct}% extra loot in a single flight.`
          : 'Quick mission with base single-flight loot.',
        type: c.waves >= 3 ? 'success' : 'info',
      },
      description: 'Higher wave counts multiply your total mission loot in a single fleet flight.',
    });

    // 4. Sector Hotbar (PvP / PvE with General Class & Mechan T18 Tech)
    const isPvp = c.environment === 'pvp';
    const envClass = isPvp ? 'badge-env-pvp' : 'badge-env-pve';
    const intel = cachedPlayerClassIntel;
    const sectorMult = isPvp ? intel.pvpMultiplier : intel.pveMultiplier;
    // Scale against 4.0x base General maximum so 4.0x fills all 5 bars
    const sectorBars = Math.min(5.0, Math.max(1.0, (sectorMult / 4.0) * 5.0));

    const sectorMultText = sectorMult >= 4.0
      ? (sectorMult > 4.0 ? `${sectorMult.toFixed(2)}x` : '4.0x')
      : (sectorMult > 1.5 ? `${sectorMult.toFixed(2)}x` : `${sectorMult.toFixed(1)}x`);

    const envTitle = `${c.environment.toUpperCase()} Sector Loot`;
    const envTooltipHtml = isPvp
      ? buildTacticalTooltipHtml({
          pillText: 'PvP Sector',
          pillClass: 'coral',
          hotbar: {
            filled: sectorBars,
            scoreText: sectorMultText,
            colorClass: 'coral',
          },
          verdict: {
            text: 'High-risk combat sector. Other players can intercept.',
            type: 'coral',
            icon: '⚡',
          },
          stats: [
            { label: 'Sector Multiplier', value: sectorMultText, colorClass: 'text-coral' },
            { label: 'General Boost', value: intel.isGeneral ? `+${intel.t18BonusPct > 0 ? (100 * (1 + intel.t18BonusPct / 100)).toFixed(1) : '100'}% Boost` : 'None (Base Class)' },
            { label: 'Mechan T18 Tech', value: intel.t18BonusPct > 0 ? `+${intel.t18BonusPct.toFixed(2)}%` : '0%' },
          ],
          description: 'Combat sector where enemy players can attack your fleet. High risk, highest loot rewards.',
        })
      : buildTacticalTooltipHtml({
          pillText: 'PvE Sector',
          pillClass: 'emerald',
          hotbar: {
            filled: sectorBars,
            scoreText: sectorMultText,
            colorClass: 'emerald',
          },
          verdict: {
            text: 'Safe protected sector. No players can intercept.',
            type: 'success',
            icon: '🛡️',
          },
          stats: [
            { label: 'Sector Multiplier', value: sectorMultText, colorClass: 'text-emerald' },
            { label: 'General Boost', value: intel.isGeneral ? `+${intel.t18BonusPct > 0 ? (50 * (1 + intel.t18BonusPct / 100)).toFixed(1) : '50'}% Boost` : 'None (Base Class)' },
            { label: 'Mechan T18 Tech', value: intel.t18BonusPct > 0 ? `+${intel.t18BonusPct.toFixed(2)}%` : '0%' },
          ],
          description: 'Protected peaceful space. No players can attack your fleets.',
        });

    const wavesBadgeText = c.waves === 1 ? '1 Wave' : `${c.waves} Waves`;
    const envBadgeText = isPvp ? 'PvP' : 'PvE';

    // 5. Render Option B: Tactical Cockpit Layout
    intelBar.innerHTML = `
      <span class="nexus-briefing-rank nexus-rank-tier-${tierIndex}">#${c.rank}</span>
      <div class="nexus-briefing-body">
        <div class="nexus-briefing-tactical-ribbon">
          <span class="nexus-ribbon-badge ${rollBadgeClass} nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(rollTitle)}" data-nexus-tooltip-body="${escapeHtml(rollTooltipHtml)}" data-nexus-tooltip-html="true">${c.rollTierLabel}</span>
          <span class="nexus-ribbon-badge ${archBadgeClass} nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(archTitle)}" data-nexus-tooltip-body="${escapeHtml(archTooltipHtml)}" data-nexus-tooltip-html="true">${archBadgeText}</span>
          <span class="nexus-ribbon-badge badge-wave nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(waveTitle)}" data-nexus-tooltip-body="${escapeHtml(waveTooltipHtml)}" data-nexus-tooltip-html="true">${wavesBadgeText}</span>
          <span class="nexus-ribbon-badge ${envClass} nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="${escapeHtml(envTitle)}" data-nexus-tooltip-body="${escapeHtml(envTooltipHtml)}" data-nexus-tooltip-html="true">${envBadgeText}</span>
        </div>
        <div class="nexus-briefing-stats">
          <div class="nexus-stat-capsule ${mode === 'yield' ? 'active-capsule' : ''} nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="MSU / Lith | Resource return multiplier per Lithium fuel spent">
            <span class="nexus-stat-label">MSU / Lith</span>
            <span class="nexus-stat-value ${c.yieldRatio > 0 ? 'text-sky' : 'text-dim'}">${yieldText}</span>
          </div>
          <div class="nexus-stat-capsule ${mode === 'speed' ? 'active-capsule' : ''} nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="MSU / h | MSU resource progression rate per hour">
            <span class="nexus-stat-label">MSU / h</span>
            <span class="nexus-stat-value ${c.hourlyMsu > 0 ? 'text-gold' : 'text-dim'}">${speedText}</span>
          </div>
          <div class="nexus-stat-capsule nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="Extras | Special drops: Random Ships, Artefacts, Lifeform Experience">
            <span class="nexus-stat-label">Extras</span>
            <span class="nexus-stat-value nexus-stat-extras">${extrasHtml}</span>
          </div>
          <div class="nexus-stat-capsule nexus-tooltip-trigger ogl_ready" data-nexus-tooltip-title="Net Gain | Estimated Net Resource Gain in MSU equivalent (3:2:1 standard)">
            <span class="nexus-stat-label">Net Gain</span>
            <span class="nexus-stat-value ${c.msu > 0 ? 'text-emerald' : 'text-dim'}">${netText}</span>
          </div>
        </div>
      </div>
    `;

    // 6. Enhance Parameter Grid (Display Wave Compound Bonus on Waves Cell)
    const gridItems = card.querySelectorAll<HTMLElement>('.scannerResultGrid .scannerResultGridItem, .scannerResultGridItem');
    if (gridItems.length >= 4) {
      const waveItem = gridItems[3];
      if (!waveItem.querySelector('.nexus-wave-bonus-tag')) {
        const bonusTag = document.createElement('span');
        bonusTag.className = 'nexus-wave-bonus-tag text-teal nexus-tooltip-trigger ogl_ready';
        bonusTag.style.cssText = 'font-size: 10px; font-weight: 700; margin-left: 4px;';
        bonusTag.setAttribute('data-nexus-tooltip-title', escapeHtml(waveTitle));
        bonusTag.setAttribute('data-nexus-tooltip-body', escapeHtml(waveTooltipHtml));
        bonusTag.setAttribute('data-nexus-tooltip-html', 'true');
        bonusTag.textContent = `(+${c.waveBonusPct}%)`;
        waveItem.appendChild(bonusTag);
      }
    }
  }

  // 6. Dataset Logging & Visual Confirmation Badge for All Scanned Missions
  const extras = parseScannedExtras(card);
  const metaUniverse = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content') || '';
  const metaPlayerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
  const scannerSettings = parseCurrentScannerSettings();
  const durationSeconds = Math.round(c.durationHours * 3600);

  const hasShips = extras.hasShips || (c.rewards.shipsMsu !== undefined && c.rewards.shipsMsu > 0);
  const rawShipText = extras.shipAmount ||
    (c.rewards.items || []).filter((it) => /ship|vessel|fighter|cruiser|battleship|battlecruiser|bomber|destroyer|deathstar|reaper|pathfinder/i.test(it)).join('; ') ||
    (hasShips ? 'Random Ships' : '');
  const shipsText = cleanRewardString(rawShipText);
  const shipsMsu = c.rewards.shipsMsu || 0;
  const hasArtifacts = extras.hasArtifacts;
  const artifactsAmount = cleanRewardString(extras.artifactAmount);
  const hasExperience = extras.hasExperience;
  const experienceAmount = cleanRewardString(extras.experienceAmount);

  // Filter out redundant artifacts, experience, and ships from generic items column
  const nonResourceItems = (c.rewards.items || []).filter((it) => {
    const lower = it.toLowerCase();
    return !lower.includes('experience') &&
           !lower.includes('lifeform') &&
           !lower.includes('artifact') &&
           !lower.includes('artefact') &&
           !/ship|vessel|fighter|cruiser|battleship|battlecruiser|bomber|destroyer|deathstar|reaper|pathfinder/i.test(it);
  });
  const items = cleanRewardString(nonResourceItems.join('; '));

  const record: ScannedAnomalyRecord = {
    anomalyId: c.id,
    universe: metaUniverse,
    playerId: metaPlayerId,
    scannedAt: Date.now(),
    name: c.name,
    stars: c.stars,
    level: c.level,
    category: c.category,
    environment: c.environment,
    targetCoords: c.targetCoords,
    originCoords: scannerSettings.originCoords,
    distance: c.distance,
    durationSeconds,
    durationText: c.durationText,
    waves: c.waves,
    lithiumCost: c.lithiumCost,
    scanCostLithium: scannerSettings.scanCostLithium,
    scanLevelSetting: scannerSettings.scanLevelSetting,
    scanRangeSystems: scannerSettings.scanRangeSystems,
    metal: c.rewards.metal,
    crystal: c.rewards.crystal,
    deuterium: c.rewards.deut,
    totalPossibleMsu: c.msu,
    yieldRatio: c.yieldRatio,
    hourlyMsu: c.hourlyMsu,
    hourlyLithium: c.hourlyLithium,
    isPureResource: isPure,
    hasShips,
    shipsText,
    shipsMsu,
    hasArtifacts,
    artifactsAmount,
    hasExperience,
    experienceAmount,
    items,
  };

  const loggedKey = `${metaUniverse}_${c.id}_${c.msu}_${c.lithiumCost}_${isPure ? 'pure' : 'mixed'}`;
  if (card.getAttribute('data-nexus-logged-key') !== loggedKey) {
    card.setAttribute('data-nexus-logged-key', loggedKey);
    saveScannedAnomalyToDB(record);
  }

  // Remove visible checkmark badge from UI if present (logging continues silently in background)
  card.querySelector('.nexus-scanner-logged-check')?.remove();
}

/**
 * Scans and enhances the Project Orion Scanner page with mission ranking,
 * tactical evaluation, and intelligent re-roll guidance.
 */
export function initOrionScannerEnhancer(force: boolean = false, animate: boolean = false): void {
  if (!isExtensionStillValid()) return;
  const scannerContainer = document.querySelector<HTMLElement>('#scanner, #scannerResult, #orionscanner, .scannerHolder, #scannerResultHolder, #content');
  if (!scannerContainer) return;

  const cardsContainer = document.querySelector<HTMLElement>('#scannerResultHolder');
  if (!cardsContainer) return;

  // Background sync player class & Mechan T18 tech bonus
  syncPlayerClassAndT18Bonus().catch(() => {});

  const rawCards = cardsContainer.querySelectorAll<HTMLElement>('.scannerResultCard:not(#nexus-scanner-ranking-card)');
  if (rawCards.length === 0) return;

  // Parse all cards
  const parsedCards: ScannedAnomalyData[] = [];
  rawCards.forEach((card) => {
    const parsed = parseScannedAnomalyCard(card);
    if (parsed) {
      parsedCards.push(parsed);
    }
  });

  if (parsedCards.length === 0) return;

  // Retrieve current ranking mode (persisted in localStorage)
  let currentMode: ScannerRankingMode =
    (localStorage.getItem('ognexus_orion_scanner_ranking_mode') as ScannerRankingMode) || 'yield';
  if ((currentMode as string) === 'lithium') {
    currentMode = 'recommended';
    localStorage.setItem('ognexus_orion_scanner_ranking_mode', 'recommended');
  }

  // Sort based on active mode
  if (currentMode === 'recommended') {
    parsedCards.sort((a, b) => {
      if (b.recommendedScore !== a.recommendedScore) {
        return b.recommendedScore - a.recommendedScore;
      }
      if (b.yieldRatio !== a.yieldRatio) {
        return b.yieldRatio - a.yieldRatio;
      }
      return b.msu - a.msu;
    });
  } else if (currentMode === 'yield') {
    parsedCards.sort((a, b) => {
      if (b.yieldRatio !== a.yieldRatio) {
        return b.yieldRatio - a.yieldRatio;
      }
      return b.msu - a.msu;
    });
  } else if (currentMode === 'speed') {
    parsedCards.sort((a, b) => {
      if (b.hourlyMsu !== a.hourlyMsu) {
        return b.hourlyMsu - a.hourlyMsu;
      }
      return b.msu - a.msu;
    });
  }

  // Assign ranks (1 = best, N = worst)
  parsedCards.forEach((c, idx) => {
    c.rank = idx + 1;
  });

  const scannerKey = `${currentMode}_${cachedPlayerClassIntel.t18BonusPct}_${parsedCards.map((c) => `${c.id}_${c.rank}_${c.yieldRatio.toFixed(1)}_${c.hourlyLithium}_${c.recommendedScore}`).join(';')}`;
  const existingKey = scannerContainer.getAttribute('data-nexus-scanner-state');
  const existingRankingCard = cardsContainer.querySelector<HTMLElement>('#nexus-scanner-ranking-card');

  // Fast-path guard: if the scanner state is identical, ranking card is in place, and cards match, do zero DOM work
  if (!force && existingKey === scannerKey && existingRankingCard && cardsContainer.firstChild === existingRankingCard) {
    return;
  }
  scannerContainer.setAttribute('data-nexus-scanner-state', scannerKey);

  // 1. Inject or update the ranking switcher card at the top of #scannerResultHolder
  const rankingCard = injectScannerRankingSwitcher(cardsContainer, currentMode);

  // Check if DOM reorder is needed
  const currentDomCards = Array.from(cardsContainer.querySelectorAll<HTMLElement>('.scannerResultCard:not(#nexus-scanner-ranking-card)'));
  const needsReorder = parsedCards.some((c, i) => currentDomCards[i] !== c.element);

  if (animate && needsReorder) {
    // 1. Cancel in-flight animations and clean any residual transforms
    parsedCards.forEach((c) => {
      try {
        c.element.getAnimations().forEach((a) => a.cancel());
      } catch {}
      c.element.style.transform = '';
      c.element.style.transition = '';
    });

    // 2. Record starting vertical positions
    const firstTops = new Map<HTMLElement, number>();
    parsedCards.forEach((c) => {
      firstTops.set(c.element, c.element.getBoundingClientRect().top);
    });

    // 3. Ensure ranking card is pinned at top
    if (cardsContainer.firstChild !== rankingCard) {
      cardsContainer.prepend(rankingCard);
    }

    // 4. Update DOM hierarchy to match new ranking order
    parsedCards.forEach((c) => {
      cardsContainer.appendChild(c.element);
    });

    // 5. Measure ending positions & trigger compositor animation via Web Animations API
    parsedCards.forEach((c) => {
      const firstTop = firstTops.get(c.element);
      if (firstTop !== undefined) {
        const lastTop = c.element.getBoundingClientRect().top;
        const deltaY = firstTop - lastTop;
        if (Math.abs(deltaY) > 2) {
          try {
            c.element.animate([
              {
                transform: `translateY(${deltaY}px)`,
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.45)',
                borderColor: 'rgba(56, 189, 248, 0.65)'
              },
              {
                transform: 'translateY(0px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.45)',
                borderColor: 'rgba(42, 67, 96, 0.6)'
              }
            ], {
              duration: 340,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
              fill: 'none'
            });

            // Rank badge pop animation
            const badge = c.element.querySelector<HTMLElement>('.nexus-briefing-rank');
            if (badge) {
              badge.animate([
                { transform: 'scale(1.22)', filter: 'brightness(1.5)' },
                { transform: 'scale(1)', filter: 'brightness(1)' }
              ], {
                duration: 340,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
              });
            }
          } catch {
            // Fallback: graceful degradation if animate API is unavailable
          }
        }
      }
    });
  } else {
    // Normal non-animated reorder (initial load or same order)
    if (cardsContainer.firstChild !== rankingCard) {
      cardsContainer.prepend(rankingCard);
    }
    if (needsReorder) {
      parsedCards.forEach((c) => {
        cardsContainer.appendChild(c.element);
      });
    }
    // Clean any stray transforms
    parsedCards.forEach((c) => {
      if (c.element.style.transform) c.element.style.transform = '';
      if (c.element.style.transition) c.element.style.transition = '';
    });
  }

  // 2. Enhance each card
  parsedCards.forEach((c) => {
    enhanceScannedCard(c, currentMode, parsedCards.length);
  });

  // 3. Expose global export helper for browser console and initialize tooltips
  if (typeof window !== 'undefined') {
    (window as any).migrateScannedAnomaliesPureStatus = migrateScannedAnomaliesPureStatus;
  }
  migrateScannedAnomaliesPureStatus().catch(() => {});

  if (typeof window !== 'undefined' && !(window as any).exportOrionScanDataset) {
    (window as any).exportOrionScanDataset = async (format: 'csv' | 'json' = 'csv') => {
      const metaUniverse = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content') || '';
      if (format === 'json') {
        const json = await exportScannedAnomaliesAsJson(metaUniverse);
        const dateStr = new Date().toISOString().slice(0, 10);
        triggerFileDownload(json, `orion_scanned_anomalies_${metaUniverse || 'all'}_${dateStr}.json`, 'application/json');
      } else {
        const csv = await exportScannedAnomaliesAsCsv(metaUniverse);
        if (!csv) {
          alert('No pure resource scanned anomalies recorded yet.');
          return;
        }
        const dateStr = new Date().toISOString().slice(0, 10);
        triggerFileDownload(csv, `orion_scanned_anomalies_${metaUniverse || 'all'}_${dateStr}.csv`, 'text/csv');
      }
    };
  }

  initOrionNativeTooltipEngine();
}

/**
 * Listens on the Fleet Dispatch page and automatically populates the required
 * ship amounts when arriving from an Orion 1-click dispatch.
 * Checks both sessionStorage payload and URL parameters (am203/am202) with retry polling.
 * Enforces strict single-execution per navigation and cleans up URL parameters so that
 * the user can freely edit/delete values without focus loss or repeating overrides.
 */
export function handleOrionAutoFleetDispatch(): void {
  try {
    const win = window as any;
    if (win._ogNexusOrionFleetDispatched) return;
    if (win._ogNexusOrionFleetDispatchInProgress) return;

    const shipsToFill: Record<number, number> = {};

    // 1. Check sessionStorage payload
    const raw = sessionStorage.getItem('ognexus_orion_auto_fleet');
    if (raw) {
      try {
        const payload = JSON.parse(raw);
        const now = Date.now();
        if (payload && now - payload.timestamp <= 60000) {
          if (payload.ships && typeof payload.ships === 'object') {
            for (const [sId, amt] of Object.entries(payload.ships)) {
              const sid = parseInt(sId, 10);
              const count = parseInt(String(amt), 10);
              if (!isNaN(sid) && !isNaN(count) && count > 0) {
                shipsToFill[sid] = count;
              }
            }
          }
          if (payload.shipId && payload.amount) {
            const sid = parseInt(payload.shipId, 10);
            const count = parseInt(payload.amount, 10);
            if (!isNaN(sid) && !isNaN(count) && count > 0 && !shipsToFill[sid]) {
              shipsToFill[sid] = count;
            }
          }
        }
      } catch {}
      sessionStorage.removeItem('ognexus_orion_auto_fleet');
    }

    // 2. Check URL search parameters (e.g. am203=2536 or am215=1000&am207=500)
    const urlParams = new URLSearchParams(window.location.search);
    for (const [key, val] of urlParams.entries()) {
      if (key.startsWith('am')) {
        const sid = parseInt(key.slice(2), 10);
        const amt = parseInt(val, 10);
        if (!isNaN(sid) && !isNaN(amt) && amt > 0) {
          if (!shipsToFill[sid]) {
            shipsToFill[sid] = amt;
          }
        }
      }
    }

    const shipEntries = Object.entries(shipsToFill).map(([sId, amt]) => ({
      shipId: parseInt(sId, 10),
      amount: amt
    }));

    if (shipEntries.length === 0) {
      win._ogNexusOrionFleetDispatched = true;
      return;
    }

    win._ogNexusOrionFleetDispatchInProgress = true;
    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 3 seconds (30 * 100ms)
    const filledShipIds = new Set<number>();

    const tryFill = () => {
      if (win._ogNexusOrionFleetDispatched) {
        win._ogNexusOrionFleetDispatchInProgress = false;
        return;
      }

      attempts++;

      for (const { shipId, amount } of shipEntries) {
        if (filledShipIds.has(shipId)) continue;

        const selector = `input[name="am${shipId}"], #ship_${shipId}, li[data-technology="${shipId}"] input, #technologydetails_wrapper input[name="am${shipId}"]`;
        const shipInput = document.querySelector<HTMLInputElement>(selector);

        if (shipInput) {
          // If the user already focused or started editing this input, do not interrupt
          if (document.activeElement === shipInput) {
            filledShipIds.add(shipId);
            continue;
          }

          let fillAmount = amount;
          const maxVal = parseInt(shipInput.max || shipInput.getAttribute('data-max') || '', 10);
          if (!isNaN(maxVal) && maxVal >= 0 && fillAmount > maxVal) {
            fillAmount = maxVal;
          }

          shipInput.value = fillAmount.toString();
          shipInput.dispatchEvent(new Event('input', { bubbles: true }));
          shipInput.dispatchEvent(new Event('change', { bubbles: true }));
          shipInput.dispatchEvent(new Event('keyup', { bubbles: true }));

          // Add glowing border to highlight the pre-filled field
          shipInput.classList.add('nexus-field-highlight');
          setTimeout(() => {
            try { shipInput.classList.remove('nexus-field-highlight'); } catch {}
          }, 3000);

          filledShipIds.add(shipId);
        }
      }

      // If all ships were filled OR we reached max attempts and filled at least one:
      if (filledShipIds.size === shipEntries.length || (attempts >= maxAttempts && filledShipIds.size > 0)) {
        win._ogNexusOrionFleetDispatched = true;
        win._ogNexusOrionFleetDispatchInProgress = false;

        // Notify OGame fleet dispatcher calculation engine if present
        if (win.fleetDispatcher) {
          try {
            if (typeof win.fleetDispatcher.refresh === 'function') win.fleetDispatcher.refresh();
            if (typeof win.fleetDispatcher.updateFleet === 'function') win.fleetDispatcher.updateFleet();
          } catch {}
        }

        // Clean up am* parameter from URL so future DOM mutations/refreshes don't re-trigger
        try {
          const url = new URL(window.location.href);
          let cleaned = false;
          for (const k of Array.from(url.searchParams.keys())) {
            if (k.startsWith('am')) {
              url.searchParams.delete(k);
              cleaned = true;
            }
          }
          if (cleaned) {
            window.history.replaceState({}, document.title, url.toString());
          }
        } catch {}

        console.log(`[OGameNexus Orion] Successfully pre-filled ships:`, shipsToFill);
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(tryFill, 100);
      } else {
        win._ogNexusOrionFleetDispatchInProgress = false;
        win._ogNexusOrionFleetDispatched = true;
      }
    };

    tryFill();
  } catch (err) {
    console.debug('[OGameNexus Orion] Auto fleet fill note:', err);
  }
}

/**
 * Enhances the Project Orion Collect Rewards modal (.orionCollectRewards) with
 * precise 3:2:1 MSU valuations for wave rewards and fleet drops.
 */
export function enhanceCollectRewardsOverlay(overlay: HTMLElement): void {
  if (!overlay) return;

  if (overlay.getAttribute('data-nexus-enhanced') === 'true' && overlay.querySelector('.nexus-wave-msu-badge')) {
    return;
  }
  overlay.setAttribute('data-nexus-enhanced', 'true');

  const missionId = overlay.getAttribute('data-space-object-id') || overlay.dataset.spaceObjectId;
  if (missionId) {
    hookCollectRewardsConfirmation(overlay, missionId);
  }

  // 1. Process Wave List (.collectWaveList .collectWaveRow)
  const waveRows = overlay.querySelectorAll<HTMLElement>('.collectWaveList .collectWaveRow');
  let totalAllWavesMsu = 0;
  let totalAllWavesLithium = 0;

  // Determine modal canonical wave cost from any row that displays explicit Lithium cost or footer
  let modalCanonicalWaveCost = 0;
  waveRows.forEach((r) => {
    const c = extractWaveLithiumCost(r.querySelector<HTMLElement>('.cwCost'));
    if (c >= 1000 && !modalCanonicalWaveCost) modalCanonicalWaveCost = c;
  });
  if (!modalCanonicalWaveCost && waveRows.length === 1) {
    modalCanonicalWaveCost = parseOgameAmount(overlay.querySelector('.collectTotalValue')?.textContent);
  }

  waveRows.forEach((row) => {
    let waveMsu = 0;
    let waveShipsMsu = 0;
    let waveResMsu = 0;
    let waveShipCount = 0;

    const rewardLines = row.querySelectorAll<HTMLElement>('.cwRewards .rewardLine');
    rewardLines.forEach((line) => {
      const res = calculateRewardItemMsu(line);
      waveMsu += res.msu;
      if (res.isShip) {
        waveShipsMsu += res.msu;
        waveShipCount += res.amount;
      }
      if (res.isResource) {
        waveResMsu += res.msu;
      }
    });

    const costEl = row.querySelector<HTMLElement>('.cwCost');
    if (!costEl) return;

    // Clean up any previously injected badge first to read clean cost text
    costEl.querySelectorAll('.nexus-wave-msu-badge').forEach((b) => b.remove());

    let waveLithiumCost = extractWaveLithiumCost(costEl);
    if (waveLithiumCost === 0 && modalCanonicalWaveCost > 0) {
      waveLithiumCost = modalCanonicalWaveCost;
    }

    totalAllWavesMsu += waveMsu;
    totalAllWavesLithium += waveLithiumCost;

    const waveYield = waveLithiumCost > 0 && waveMsu > 0 ? waveMsu / waveLithiumCost : 0;

    const badge = document.createElement('span');
    if (waveMsu > 0) {
      const tierClass = waveYield >= 10 ? 'high' : waveYield >= 5 ? 'mid' : 'low';
      badge.className = `nexus-wave-msu-badge ${tierClass} nexus-tooltip-trigger ogl_ready`;
      badge.innerHTML = `+${formatHuman(waveMsu)} MSU <span class="nexus-yield-accent">(${waveYield.toFixed(1)}x)</span>`;
      const waveTip = `Wave Valuation | +${formatHuman(waveMsu)} MSU vs ${formatHuman(waveLithiumCost)} Lithium (${waveYield.toFixed(1)}x yield)\n` +
                      (waveShipsMsu > 0 ? `\u2022 Ships: +${formatHuman(waveShipsMsu)} MSU (${waveShipCount.toLocaleString()} ships)\n` : '') +
                      (waveResMsu > 0 ? `\u2022 Resources: +${formatHuman(waveResMsu)} MSU` : '');
      badge.setAttribute('data-nexus-tooltip-title', waveTip);
    } else {
      badge.className = 'nexus-wave-msu-badge non-resource nexus-tooltip-trigger ogl_ready';
      badge.textContent = 'Special Loot';
      badge.setAttribute('data-nexus-tooltip-title', 'Special Loot | Lifeform XP or Artifact reward (excluded from resource MSU)');
    }
    costEl.appendChild(badge);
  });

  // 2. Enhance Summary Section (.collectSummary)
  let summaryMsu = 0;
  let summaryShipMsu = 0;
  const summaryEl = overlay.querySelector<HTMLElement>('.collectSummary');
  if (summaryEl) {
    const summaryLabel = summaryEl.querySelector<HTMLElement>('.collectSummaryLabel');
    if (summaryLabel) {
      // Clean up any previously injected chips to prevent duplication
      summaryEl.querySelectorAll('.nexus-summary-msu-chip').forEach((c) => c.remove());

      const summaryLines = summaryEl.querySelectorAll<HTMLElement>('.collectSummaryRewards .rewardLine');
      summaryLines.forEach((line) => {
        const res = calculateRewardItemMsu(line);
        summaryMsu += res.msu;
        if (res.isShip) summaryShipMsu += res.msu;
      });

      const finalMsu = summaryMsu > 0 ? summaryMsu : totalAllWavesMsu;
      if (finalMsu > 0) {
        const chip = document.createElement('span');
        chip.className = 'nexus-summary-msu-chip nexus-tooltip-trigger ogl_ready';
        chip.innerHTML = `+${formatHuman(finalMsu)} MSU`;
        const chipTip = `Total Value | +${formatHuman(finalMsu)} MSU (Standard 3:2:1 Trade Valuation)` +
                        (summaryShipMsu > 0 ? `\n\u2022 Ship value: +${formatHuman(summaryShipMsu)} MSU` : '');
        chip.setAttribute('data-nexus-tooltip-title', chipTip);
        summaryLabel.appendChild(chip);
      }
    }
  }

  // 3. Enhance Footer Section (.collectRewardsFooter)
  const footerEl = overlay.querySelector<HTMLElement>('.collectRewardsFooter');
  if (footerEl) {
    footerEl.querySelectorAll('.nexus-collect-valuation-bar').forEach((b) => b.remove());

    const totalCostEl = footerEl.querySelector('.collectTotalValue');
    const totalLithium = parseOgameAmount(totalCostEl?.textContent) || totalAllWavesLithium;
    const userLithiumEl = footerEl.querySelector('.collectRewardsIntro .have');
    const userLithium = parseOgameAmount(userLithiumEl?.textContent);

    const effectiveMsu = summaryMsu > 0 ? summaryMsu : totalAllWavesMsu;
    const netGain = effectiveMsu - totalLithium;
    const overallYield = totalLithium > 0 && effectiveMsu > 0 ? effectiveMsu / totalLithium : 0;
    const reserveCoverage = totalLithium > 0 && userLithium > 0 ? (userLithium / totalLithium).toFixed(1) : null;

    const valBar = document.createElement('div');
    valBar.className = 'nexus-collect-valuation-bar';

    if (effectiveMsu > 0) {
      valBar.innerHTML = `
        <div class="nexus-val-pill">
          <span class="nexus-val-lbl">Gross Value</span>
          <span class="nexus-val-val text-gold">+${formatHuman(effectiveMsu)} MSU</span>
        </div>
        <div class="nexus-val-pill">
          <span class="nexus-val-lbl">Net Profit</span>
          <span class="nexus-val-val ${netGain >= 0 ? 'text-emerald' : 'text-crimson'}">${netGain >= 0 ? '+' : ''}${formatHuman(netGain)} MSU</span>
        </div>
        <div class="nexus-val-pill">
          <span class="nexus-val-lbl">Overall Return</span>
          <span class="nexus-val-val text-sky">${overallYield > 0 ? overallYield.toFixed(1) + 'x Yield' : 'Flat'}</span>
        </div>
        ${reserveCoverage ? `
          <div class="nexus-val-pill">
            <span class="nexus-val-lbl">Lithium Reserve</span>
            <span class="nexus-val-val text-muted">${reserveCoverage}x claims</span>
          </div>
        ` : ''}
      `;
    } else {
      valBar.innerHTML = `
        <div class="nexus-val-pill">
          <span class="nexus-val-lbl">Batch Content</span>
          <span class="nexus-val-val text-sky">Lifeform XP / Artifacts</span>
        </div>
      `;
    }

    footerEl.appendChild(valBar);
  }
}

// Global click delegation listener to instantly enhance the modal when the player clicks Collect Rewards
if (typeof window !== 'undefined' && !(window as any).__nexusOrionCollectListenerAttached) {
  (window as any).__nexusOrionCollectListenerAttached = true;
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element | null)?.closest('.collectRewards, [data-ipi-hint*="Collect"], .actionCenter button, [class*="collect"]');
    if (btn) {
      [60, 150, 300, 600, 1200].forEach((ms) => {
        setTimeout(() => {
          const overlay = document.querySelector<HTMLElement>('.orionCollectRewards');
          if (overlay) enhanceCollectRewardsOverlay(overlay);
        }, ms);
      });
    }
  });
}
