/**
 * Nexus Battlesim: Orion Anomaly Wave Simulator Modal
 * Provides an interactive, multi-wave sequential attrition combat simulator
 * directly inside OGame's Anomaly Missions tab.
 *
 * Impeccable Tactical Command Bridge Layout:
 * - Dedicated Combat Tech Comparison Strip (Player vs Hostiles with <technology-icon>)
 * - Top: War Fleet 2x4 Warship Configuration Grid
 * - Bottom Split:
 *     - Left Half: Stacked Hostile Waves Cards with radar hover inspection
 *     - Right Half: Own Fleet Casualties per each wave with progressive attrition
 */

import {
  extractAnomalyCombatWaves,
  extractStationedWarships,
  getPlayerCombatProfile,
  loadPlayerPlanetsList,
  AnomalyCombatWave,
  CANONICAL_WARSHIP_IDS,
  CanonicalWarshipId,
  WARSHIP_METADATA,
  PlayerCombatProfile,
  StationedPlanetFleet
} from './orionWaveParser';
import { NexuSimEngine } from '../utils/combatSim/engine';
import { FleetParty, ServerSettings } from '../utils/combatSim/types';
import { UNITS } from '../utils/combatSim/constants';
import { dispatchMultiFleetToAnomaly } from './orion';

/**
 * Universal metadata map for all potential enemy wave units
 * ensuring accurate <technology-icon> rendering for non-canonical ships like Light/Heavy Fighters.
 */
const ALL_SHIP_METADATA: Record<number, { name: string; iconAttr: string; role: string }> = {
  202: { name: 'Small Cargo', iconAttr: 'transportersmall', role: 'Cargo' },
  203: { name: 'Large Cargo', iconAttr: 'transporterlarge', role: 'Heavy Cargo' },
  204: { name: 'Light Fighter', iconAttr: 'fighterlight', role: 'Swarm Fighter' },
  205: { name: 'Heavy Fighter', iconAttr: 'fighterheavy', role: 'Heavy Escort' },
  206: { name: 'Cruiser', iconAttr: 'cruiser', role: 'Anti-LF Swarm' },
  207: { name: 'Battleship', iconAttr: 'battleship', role: 'Heavy Gunner' },
  208: { name: 'Colony Ship', iconAttr: 'colonyship', role: 'Colonizer' },
  209: { name: 'Recycler', iconAttr: 'recycler', role: 'Debris Collector' },
  210: { name: 'Espionage Probe', iconAttr: 'espionageprobe', role: 'Recon' },
  211: { name: 'Bomber', iconAttr: 'bomber', role: 'Shield Crusher' },
  212: { name: 'Solar Satellite', iconAttr: 'solarsatellite', role: 'Energy' },
  213: { name: 'Destroyer', iconAttr: 'destroyer', role: 'Anti-BC & Armor' },
  214: { name: 'Deathstar', iconAttr: 'deathstar', role: 'Superheavy Base' },
  215: { name: 'Battlecruiser', iconAttr: 'interceptor', role: 'Capital Hunter' },
  218: { name: 'Reaper', iconAttr: 'reaper', role: 'Debris Harvester' },
  219: { name: 'Pathfinder', iconAttr: 'explorer', role: 'Scout Vanguard' }
};

function getShipMetadata(id: number): { name: string; iconAttr: string; role: string } {
  return ALL_SHIP_METADATA[id] || {
    name: UNITS[id]?.name || `Ship ${id}`,
    iconAttr: 'cruiser',
    role: ''
  };
}

interface WaveSimResult {
  waveNumber: number;
  winRateAtk: number;
  winRateDef: number;
  winRateDraw: number;
  avgRounds: number;
  outcome: 'victory' | 'defeat' | 'draw' | 'unreached';
  initialAttackerShips: Record<number, number>;
  remainingAttackerShips: Record<number, number>;
  lostAttackerShips: Record<number, number>;
  lostDefenderShips: Record<number, number>;
  attackerLossMsu: number;
  defenderLossMsu: number;
  debrisMsu: number;
  reaperHarvestMsu: number;
  totalInitialShips: number;
  totalRemainingShips: number;
}

interface MultiWaveSimulationSummary {
  wavesCleared: number;
  totalWaves: number;
  allCleared: boolean;
  defeatedAtWave: number | null;
  totalAttackerLossMsu: number;
  totalDefenderLossMsu: number;
  totalDebrisMsu: number;
  totalReaperHarvestMsu: number;
  finalSurvivingShips: Record<number, number>;
  totalFinalSurvivingCount: number;
  waveResults: WaveSimResult[];
}

const STORAGE_KEY_FLEET = 'nexus_anomaly_sim_fleet';
const STORAGE_KEY_ITERATIONS = 'nexus_anomaly_sim_iterations';
const STORAGE_KEY_PLAYER_TECHS = 'nexus_anomaly_sim_player_techs';
const STORAGE_KEY_ENEMY_TECHS = 'nexus_anomaly_sim_enemy_techs';

let activeModalOverlay: HTMLElement | null = null;
let activeInspectTooltip: HTMLElement | null = null;

/**
 * Normalizes numbers extracted from input strings.
 */
function cleanNumber(str: string | null | undefined): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format numbers cleanly for UI display (e.g. 1.2M, 450k, 12,500).
 */
function formatAmount(val: number): string {
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (val >= 10_000) return (val / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return Math.round(val).toLocaleString();
}

/**
 * Computes MSU valuation for a set of ships (Standard 3:2:1).
 */
function computeFleetMsu(ships: Record<number, number>): number {
  let msu = 0;
  for (const [idStr, count] of Object.entries(ships)) {
    const id = parseInt(idStr, 10);
    const unit = UNITS[id];
    if (unit && count > 0) {
      msu += (unit.cost.metal * 1.0 + unit.cost.crystal * 1.5 + unit.cost.deuterium * 3.0) * count;
    }
  }
  return msu;
}

/**
 * Computes cargo capacity for a fleet given hyperspace tech.
 */
function computeFleetCargo(ships: Record<number, number>, hypTech: number): number {
  let cargo = 0;
  const factor = 1 + hypTech * 0.05;
  for (const [idStr, count] of Object.entries(ships)) {
    const id = parseInt(idStr, 10);
    const unit = UNITS[id];
    if (unit && count > 0) {
      cargo += Math.floor(unit.cargo * factor) * count;
    }
  }
  return cargo;
}

/**
 * Simulates a single wave encounter against the player's current surviving fleet.
 */
function simulateSingleWave(
  wave: AnomalyCombatWave,
  currentFleet: Record<number, number>,
  profile: PlayerCombatProfile,
  iterations: number,
  targetCoords: { galaxy: number; system: number; position: number }
): WaveSimResult {
  const initialShipCount = Object.values(currentFleet).reduce((a, b) => a + b, 0);

  const serverSettings: ServerSettings = {
    universeSpeedWar: 1,
    debrisFactor: 0.3,
    debrisFactorDef: 0,
    deuteriumInDebris: true,
    repairFactor: 0.7,
    lifeforms: false,
    rapidFire: true,
    galaxies: 9,
    systems: 499,
    donutGalaxy: true,
    donutSystem: true,
    combatDebrisFieldLimit: 0.25
  };

  const attackerParty: FleetParty = {
    id: 0,
    name: 'War Fleet',
    coords: targetCoords,
    // Note: profile.weapons/shielding/armour already include General class (+2) or custom overrides.
    // Setting playerClass: 0 prevents NexuSimEngine.calculateUnitStats from double-counting the +2 generalBonus.
    playerClass: 0,
    allianceClass: 0,
    techs: {
      weapons: profile.weapons,
      shielding: profile.shielding,
      armour: profile.armour,
      combustion: 0,
      impulse: 0,
      hyperspace: 0,
      hyperspaceTech: profile.hyperspaceTech
    },
    spaceDock: 0,
    nanoRepairBots: 0,
    engineer: false,
    lifeformBonuses: {
      globalWeapon: 0,
      globalShield: 0,
      globalArmour: 0,
      perShipWeapon: {},
      perShipShield: {},
      perShipArmour: {}
    },
    units: { ...currentFleet }
  };

  const defenderParty: FleetParty = {
    id: 1,
    name: `Wave ${wave.waveNumber} Hostiles`,
    coords: targetCoords,
    playerClass: 0,
    allianceClass: 0,
    techs: {
      weapons: wave.techs.weapons,
      shielding: wave.techs.shielding,
      armour: wave.techs.armour,
      combustion: 0,
      impulse: 0,
      hyperspace: 0,
      hyperspaceTech: 0
    },
    spaceDock: 0,
    nanoRepairBots: 0,
    engineer: false,
    lifeformBonuses: {
      globalWeapon: 0,
      globalShield: 0,
      globalArmour: 0,
      perShipWeapon: {},
      perShipShield: {},
      perShipArmour: {}
    },
    units: { ...wave.ships }
  };

  const runs = NexuSimEngine.runSimulations([attackerParty], [defenderParty], serverSettings, iterations);
  const agg = NexuSimEngine.processSimulationResults(
    runs,
    [attackerParty],
    [defenderParty],
    serverSettings,
    { metal: 0, crystal: 0, deuterium: 0 },
    50
  );

  const winAtk = agg.winRates.attackers;
  const winDef = agg.winRates.defenders;
  const winDraw = agg.winRates.draw;
  const avg = agg.scenarios.average;

  const lostAtk = avg.lostUnits.attackers || {};
  const lostDef = avg.lostUnits.defenders || {};
  const remainingAtk = avg.remainingUnits.attackers || {};

  const atkLossMsu = avg.losses.attackers.msu || 0;
  const defLossMsu = avg.losses.defenders.msu || 0;
  const debrisMsu = (avg.debris.metal * 1.0 + avg.debris.crystal * 1.5 + avg.debris.deuterium * 3.0);
  const reaperMsu = (avg.reaperHarvest.metal * 1.0 + avg.reaperHarvest.crystal * 1.5 + avg.reaperHarvest.deuterium * 3.0);
  const remainingCount = Object.values(remainingAtk).reduce((a, b) => a + b, 0);

  let outcome: 'victory' | 'defeat' | 'draw' = 'victory';
  if (winAtk >= 70) {
    outcome = 'victory';
  } else if (winDef >= 50 || remainingCount === 0) {
    outcome = 'defeat';
  } else {
    outcome = 'draw';
  }

  return {
    waveNumber: wave.waveNumber,
    winRateAtk: winAtk,
    winRateDef: winDef,
    winRateDraw: winDraw,
    avgRounds: Math.round(agg.averageRounds * 10) / 10,
    outcome,
    initialAttackerShips: { ...currentFleet },
    remainingAttackerShips: { ...remainingAtk },
    lostAttackerShips: lostAtk,
    lostDefenderShips: lostDef,
    attackerLossMsu: atkLossMsu,
    defenderLossMsu: defLossMsu,
    debrisMsu,
    reaperHarvestMsu: reaperMsu,
    totalInitialShips: initialShipCount,
    totalRemainingShips: remainingCount
  };
}

/**
 * Shows the mouse-following hover tooltip displaying all ships and stats of an enemy wave.
 */
function showWaveInspectTooltip(e: MouseEvent, wave: AnomalyCombatWave): void {
  hideWaveInspectTooltip();

  const tip = document.createElement('div');
  tip.id = 'nexus-wave-inspect-tooltip';
  tip.className = 'nexus-wave-inspect-tooltip';

  const waveMsu = computeFleetMsu(wave.ships);
  const totalShips = wave.totalShips;

  const shipEntries = Object.entries(wave.ships).filter(([_, count]) => count > 0);
  const shipRows = shipEntries.map(([sIdStr, count]) => {
    const sId = parseInt(sIdStr, 10);
    const meta = getShipMetadata(sId);
    return `
      <div class="nexus-tt-ship-item">
        <technology-icon regular="" ${meta.iconAttr}="" sq20=""></technology-icon>
        <div class="nexus-tt-ship-meta">
          <span class="nexus-tt-ship-name">${meta.name}</span>
          <span class="nexus-tt-ship-count">${count.toLocaleString()}</span>
        </div>
      </div>
    `;
  }).join('');

  tip.innerHTML = `
    <div class="nexus-tt-header">
      <div class="nexus-tt-title-wrap">
        <span class="nexus-tt-badge">Wave ${wave.waveNumber} Hostiles</span>
        <span class="nexus-tt-count">${totalShips.toLocaleString()} Vessels</span>
      </div>
      <span class="nexus-tt-msu">${formatAmount(waveMsu)} MSU</span>
    </div>
    <div class="nexus-tt-techs">
      <div class="nexus-tt-tech-pill" title="Weapons Technology">
        <technology-icon regular="" weaponstechnology="" sq20="" bordered="" class="tooltip" data-tooltip-title="Weapons Technology"></technology-icon>
        <span class="nexus-tt-tech-lvl">${wave.techs.weapons}</span>
      </div>
      <div class="nexus-tt-tech-pill" title="Shielding Technology">
        <technology-icon regular="" shieldingtechnology="" sq20="" bordered="" class="tooltip" data-tooltip-title="Shielding Technology"></technology-icon>
        <span class="nexus-tt-tech-lvl">${wave.techs.shielding}</span>
      </div>
      <div class="nexus-tt-tech-pill" title="Armour Technology">
        <technology-icon regular="" armortechnology="" sq20="" bordered="" class="tooltip" data-tooltip-title="Armour Technology"></technology-icon>
        <span class="nexus-tt-tech-lvl">${wave.techs.armour}</span>
      </div>
    </div>
    <div class="nexus-tt-grid">
      ${shipRows || '<span class="text-slate text-xs" style="grid-column: span 2; padding: 6px;">No ships detected</span>'}
    </div>
  `;

  document.body.appendChild(tip);
  activeInspectTooltip = tip;
  positionWaveInspectTooltip(e, tip);
}

function positionWaveInspectTooltip(e: MouseEvent, tip: HTMLElement): void {
  const pad = 14;
  const tipRect = tip.getBoundingClientRect();
  let x = e.clientX + pad;
  let y = e.clientY + pad;

  if (x + tipRect.width > window.innerWidth - 12) {
    x = e.clientX - tipRect.width - pad;
  }
  if (y + tipRect.height > window.innerHeight - 12) {
    y = e.clientY - tipRect.height - pad;
  }

  tip.style.left = `${Math.max(10, x)}px`;
  tip.style.top = `${Math.max(10, y)}px`;
}

function hideWaveInspectTooltip(): void {
  if (activeInspectTooltip) {
    activeInspectTooltip.remove();
    activeInspectTooltip = null;
  }
}

/**
 * Opens the Anomaly Wave Simulator modal for a mission element.
 */
export async function openAnomalyWaveSimModal(
  missionEl: HTMLElement,
  missionData: {
    id: string;
    name: string;
    level: number;
    stars: number;
    environment: 'pve' | 'pvp';
    galaxy?: number;
    system?: number;
    position?: number;
  }
): Promise<void> {
  // If modal already open, close it
  closeAnomalyWaveSimModal();

  const coordsStr = `${missionData.galaxy || 1}:${missionData.system || 1}:${missionData.position || 1}`;
  const waves = extractAnomalyCombatWaves(missionEl, missionData.id, missionData.level, coordsStr);
  const stationedWarships = extractStationedWarships(missionData.id);
  const [profile, planetsList] = await Promise.all([
    getPlayerCombatProfile(),
    loadPlayerPlanetsList()
  ]);
  let activePlanetId = planetsList.find((p) => p.isCurrent)?.id || planetsList[0]?.id || '';

  // Hostile combat techs (default to first wave's techs or saved in localStorage)
  const enemyTechs = {
    weapons: waves[0]?.techs.weapons || 15,
    shielding: waves[0]?.techs.shielding || 15,
    armour: waves[0]?.techs.armour || 15
  };
  try {
    const rawEnemy = localStorage.getItem(STORAGE_KEY_ENEMY_TECHS);
    if (rawEnemy) {
      const p = JSON.parse(rawEnemy);
      if (p.weapons) enemyTechs.weapons = p.weapons;
      if (p.shielding) enemyTechs.shielding = p.shielding;
      if (p.armour) enemyTechs.armour = p.armour;
      waves.forEach((w) => {
        w.techs = { ...enemyTechs };
      });
    }
  } catch {
    // Ignore
  }

  // Load saved warship configuration or initialize
  let savedFleet: Record<number, number> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FLEET);
    if (raw) savedFleet = JSON.parse(raw);
  } catch {
    savedFleet = {};
  }

  const initialPlanet = planetsList.find((p) => p.isCurrent) || planetsList[0];
  const totalSaved = Object.values(savedFleet).reduce((a, b) => a + b, 0);
  const totalAnomalyStationed = Object.values(stationedWarships).reduce((a, b) => a + b, 0);
  const defaultFleetSource = totalAnomalyStationed > 0 ? stationedWarships : (initialPlanet?.ships || {});
  const activeWarships: Record<CanonicalWarshipId, number> = {
    204: savedFleet[204] || (totalSaved === 0 ? defaultFleetSource[204] || 0 : 0),
    205: savedFleet[205] || (totalSaved === 0 ? defaultFleetSource[205] || 0 : 0),
    206: savedFleet[206] || (totalSaved === 0 ? defaultFleetSource[206] || 0 : 0),
    207: savedFleet[207] || (totalSaved === 0 ? defaultFleetSource[207] || 0 : 0),
    215: savedFleet[215] || (totalSaved === 0 ? defaultFleetSource[215] || 0 : 0),
    211: savedFleet[211] || (totalSaved === 0 ? defaultFleetSource[211] || 0 : 0),
    213: savedFleet[213] || (totalSaved === 0 ? defaultFleetSource[213] || 0 : 0),
    214: savedFleet[214] || (totalSaved === 0 ? defaultFleetSource[214] || 0 : 0),
    218: savedFleet[218] || (totalSaved === 0 ? defaultFleetSource[218] || 0 : 0),
    219: savedFleet[219] || (totalSaved === 0 ? defaultFleetSource[219] || 0 : 0)
  };

  // Iterations per wave (20 to 100, default 20)
  let activeIterations = 20;
  try {
    const savedIter = parseInt(localStorage.getItem(STORAGE_KEY_ITERATIONS) || '20', 10);
    if (!isNaN(savedIter) && savedIter >= 20 && savedIter <= 100) {
      activeIterations = savedIter;
    }
  } catch {
    activeIterations = 20;
  }

  let isSimulating = false;
  let activeSimWaveIndex = -1;
  let simulatedResults: WaveSimResult[] = [];
  let latestSummary: MultiWaveSimulationSummary | null = null;

  // Build Modal Overlay Container
  const overlay = document.createElement('div');
  overlay.id = 'nexus-wave-sim-overlay';
  overlay.className = 'nexus-wave-sim-overlay';

  const modal = document.createElement('div');
  modal.className = 'nexus-wave-sim-dialog';

  const render = () => {
    const prevWavesStack = modal.querySelector('.nexus-sim-waves-stack');
    const prevScrollTop = prevWavesStack ? prevWavesStack.scrollTop : 0;

    const totalInputShips = Object.values(activeWarships).reduce((a, b) => a + b, 0);
    const fleetMsu = computeFleetMsu(activeWarships);
    const fleetCargo = computeFleetCargo(activeWarships, profile.hyperspaceTech);
    const starsHtml = '★'.repeat(Math.max(1, missionData.stars || 1));

    const activePlanet = planetsList.find((p) => p.id === activePlanetId) || planetsList[0];

    // Group each planet's moon on the same line as its planet
    const planetMap = new Map<string, { planet?: StationedPlanetFleet; moon?: StationedPlanetFleet }>();
    planetsList.forEach((p) => {
      const existing = planetMap.get(p.coords) || {};
      if (p.type === 'moon') existing.moon = p;
      else existing.planet = p;
      planetMap.set(p.coords, existing);
    });

    const dropdownRowsHtml = Array.from(planetMap.entries()).map(([coords, group]) => {
      const p = group.planet;
      const m = group.moon;

      const pos = parseInt(coords.split(':')[2] || '1', 10) || 1;
      const safePos = Math.min(15, Math.max(1, pos));
      const defaultPlanetImg = typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL(`icons/overwatch/planet-slot-${safePos}.png`)
        : `/icons/overwatch/planet-slot-${safePos}.png`;
      const defaultMoonImg = typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL('icons/overwatch/moon.jpg')
        : '/icons/overwatch/moon.jpg';

      const pImg = p?.imgUrl || defaultPlanetImg;
      const mImg = m?.imgUrl || defaultMoonImg;

      const isPlanetSelected = p && p.id === activePlanet?.id;
      const isMoonSelected = m && m.id === activePlanet?.id;

      return `
        <div class="nexus-planet-dropdown-row">
          ${p ? `
            <div class="nexus-dropdown-item planet ${isPlanetSelected ? 'selected' : ''}" data-planet-id="${p.id}" title="Select Planet: ${p.name} [${p.coords}]">
              <div class="nexus-menu-thumb-wrap">
                <img src="${pImg}" class="nexus-menu-thumb-img" alt="" onerror="this.src='${defaultPlanetImg}'; this.onerror=null;" />
              </div>
              <div class="nexus-menu-meta">
                <span class="nexus-menu-name">${p.name}</span>
                <span class="nexus-menu-coords">[${p.coords}]</span>
              </div>
              <span class="nexus-menu-type-badge planet">PLANET</span>
            </div>
          ` : `<div class="nexus-dropdown-item empty"></div>`}

          ${m ? `
            <div class="nexus-dropdown-item moon ${isMoonSelected ? 'selected' : ''}" data-planet-id="${m.id}" title="Select Moon: ${m.name} [${m.coords}]">
              <div class="nexus-menu-thumb-wrap moon">
                <img src="${mImg}" class="nexus-menu-thumb-img" alt="" onerror="this.src='${defaultMoonImg}'; this.onerror=null;" />
              </div>
              <div class="nexus-menu-meta">
                <span class="nexus-menu-name">${m.name}</span>
                <span class="nexus-menu-coords">[${m.coords}]</span>
              </div>
              <span class="nexus-menu-type-badge moon">MOON</span>
            </div>
          ` : `
            <div class="nexus-dropdown-no-moon" title="No moon at this coordinate">
              <span>—</span>
            </div>
          `}
        </div>
      `;
    }).join('');

    const activePos = parseInt((activePlanet?.coords || '1:1:1').split(':')[2] || '1', 10) || 1;
    const safeActivePos = Math.min(15, Math.max(1, activePos));
    const activeDefaultImg = activePlanet?.type === 'moon'
      ? (typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/overwatch/moon.jpg') : '/icons/overwatch/moon.jpg')
      : (typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(`icons/overwatch/planet-slot-${safeActivePos}.png`) : `/icons/overwatch/planet-slot-${safeActivePos}.png`);
    const activeImgUrl = activePlanet?.imgUrl || activeDefaultImg;
    const currentPlanetTotalFleet = activePlanet ? Object.values(activePlanet.ships).reduce((a, b) => a + b, 0) : 0;
    const totalStationedAtAnomaly = Object.values(stationedWarships).reduce((a, b) => a + b, 0);

    const stationedMiniGridHtml = CANONICAL_WARSHIP_IDS.map((id) => {
      const meta = WARSHIP_METADATA[id];
      const count = activePlanet?.ships[id] || 0;
      const hasShips = count > 0;
      return `
        <div class="nexus-minigrid-cell ${hasShips ? 'has-ships' : 'zero'}" title="${meta.name}: ${count.toLocaleString()} on ${activePlanet?.name || 'body'} (${activePlanet?.type === 'moon' ? 'Moon' : 'Planet'}) (Click to load into War Fleet)" data-ship-id="${id}" data-count="${count}">
          <div class="nexus-minigrid-icon">
            <technology-icon regular="" ${meta.iconAttr}="" sq20=""></technology-icon>
          </div>
          <span class="minigrid-count">${hasShips ? formatAmount(count) : '0'}</span>
        </div>
      `;
    }).join('');

    // 1. Warship 2x5 Grid Cards (Top section)
    const warshipCardsHtml = CANONICAL_WARSHIP_IDS.map((id) => {
      const meta = WARSHIP_METADATA[id];
      const count = activeWarships[id] || 0;
      const isActive = count > 0;

      return `
        <div class="nexus-sim-warship-card ${isActive ? 'active' : 'idle'}" data-ship-id="${id}">
          <div class="nexus-sim-card-top">
            <div class="nexus-sim-ship-icon-frame">
              <technology-icon regular="" ${meta.iconAttr}="" sq24=""></technology-icon>
            </div>
            <div class="nexus-sim-ship-info">
              <span class="nexus-sim-ship-name">${meta.name}</span>
            </div>
          </div>

          <div class="nexus-sim-input-row">
            <input
              type="number"
              min="0"
              step="1"
              class="nexus-sim-ship-input"
              data-id="${id}"
              value="${count > 0 ? count : ''}"
              placeholder="0"
              ${isSimulating ? 'disabled' : ''}
            />
          </div>

          <div class="nexus-sim-quick-pills">
            <button type="button" class="nexus-pill-btn" data-action="add" data-id="${id}" data-val="100" ${isSimulating ? 'disabled' : ''}>+100</button>
            <button type="button" class="nexus-pill-btn" data-action="add" data-id="${id}" data-val="1000" ${isSimulating ? 'disabled' : ''}>+1k</button>
          </div>
        </div>
      `;
    }).join('');

    // 2. BOTTOM LEFT: Hostile Waves Stack
    let wavesHtml = '';
    if (waves.length === 0) {
      wavesHtml = `
        <div class="nexus-sim-empty-waves">
          <span>No hostile combat waves detected for this anomaly mission.</span>
        </div>
      `;
    } else {
      wavesHtml = waves.map((wave, idx) => {
        const isCurrentEngaging = isSimulating && activeSimWaveIndex === idx;
        const res = simulatedResults.find((r) => r.waveNumber === wave.waveNumber);
        const waveTotalShips = wave.totalShips;
        const waveMsu = computeFleetMsu(wave.ships);

        let statusBadge = '<span class="nexus-sim-wave-status ready">Ready</span>';
        let cardModifier = 'pending';

        if (isCurrentEngaging) {
          cardModifier = 'simulating';
          statusBadge = '<span class="nexus-sim-wave-status engaging"><span class="nexus-sim-pulse-dot"></span> Engaging</span>';
        } else if (res) {
          cardModifier = `completed ${res.outcome}`;
          if (res.outcome === 'unreached') {
            statusBadge = '<span class="nexus-sim-wave-status unreached">Unreached</span>';
          } else if (res.outcome === 'victory') {
            statusBadge = `<span class="nexus-sim-wave-status victory">${res.winRateAtk >= 99 ? '100% Win' : `${Math.round(res.winRateAtk)}% Win`} (${res.avgRounds} Rnd)</span>`;
          } else if (res.outcome === 'defeat') {
            statusBadge = `<span class="nexus-sim-wave-status defeat">Defeat (${res.avgRounds} Rnd)</span>`;
          } else {
            statusBadge = `<span class="nexus-sim-wave-status draw">Draw (${res.avgRounds} Rnd)</span>`;
          }
        }

        return `
          <div class="nexus-wave-card ${cardModifier}" data-wave-num="${wave.waveNumber}">
            <!-- Scanning Highlight Beam -->
            <div class="nexus-wave-scan-beam"></div>

            <div class="nexus-wave-card-header">
              <div class="nexus-wave-title-group">
                <span class="nexus-wave-num-badge">Wave ${wave.waveNumber}</span>
                ${wave.arrivalFormatted ? `<span class="nexus-wave-time">⏱ ${wave.arrivalFormatted}</span>` : ''}
              </div>
              ${statusBadge}
            </div>

            <!-- Hostile Fleet Hover Trigger: Mouse-following inspection -->
            <div class="nexus-wave-hostiles-bar">
              <div class="nexus-hostile-inspect-btn" data-wave-idx="${wave.waveNumber}">
                <div class="nexus-inspect-icon-wrap">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="22" y1="12" x2="18" y2="12"></line>
                    <line x1="6" y1="12" x2="2" y2="12"></line>
                    <line x1="12" y1="6" x2="12" y2="2"></line>
                    <line x1="12" y1="22" x2="12" y2="18"></line>
                  </svg>
                </div>
                <div class="nexus-hostile-info">
                  <span class="nexus-hostile-count">${waveTotalShips.toLocaleString()} Hostiles</span>
                  <span class="nexus-hostile-val">(${formatAmount(waveMsu)} MSU)</span>
                </div>
                <span class="nexus-hover-inspect-badge">Inspect</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. BOTTOM RIGHT: Own Fleet Casualties Per Wave (Appears when simulated)
    let casualtiesHtml = '';
    if (simulatedResults.length === 0) {
      casualtiesHtml = `
        <div class="nexus-casualties-idle-placeholder">
          <div class="idle-radar-frame">
            <div class="idle-radar-sweep"></div>
            <div class="idle-radar-reticle">
              <svg viewBox="0 0 44 44" width="40" height="40" fill="none">
                <circle cx="22" cy="22" r="20" stroke="rgba(56, 189, 248, 0.22)" stroke-width="1.2" stroke-dasharray="3 3"/>
                <circle cx="22" cy="22" r="13" stroke="rgba(56, 189, 248, 0.35)" stroke-width="1.2"/>
                <circle cx="22" cy="22" r="3.5" fill="#38bdf8" fill-opacity="0.85"/>
                <line x1="22" y1="2" x2="22" y2="42" stroke="rgba(56, 189, 248, 0.28)" stroke-width="1"/>
                <line x1="2" y1="22" x2="42" y2="22" stroke="rgba(56, 189, 248, 0.28)" stroke-width="1"/>
              </svg>
            </div>
          </div>
          <span class="idle-title">Tactical Standby</span>
          <span class="idle-sub">Click "Simulate" to calculate battle outcome, ship losses, and salvage yield across all hostile waves.</span>
        </div>
      `;
    } else {
      casualtiesHtml = simulatedResults.map((res) => {
        const lostEntries = Object.entries(res.lostAttackerShips).filter(([_, cnt]) => cnt > 0);
        const shipLossPills = lostEntries.map(([sIdStr, count]) => {
          const sId = parseInt(sIdStr, 10);
          const meta = getShipMetadata(sId);
          const rounded = Math.round(count);
          const displayCount = rounded > 0 ? `-${rounded.toLocaleString()}` : '< 1';
          return `
            <div class="nexus-loss-pill" title="${meta.name}: ${count < 1 ? count.toFixed(2) : rounded.toLocaleString()} destroyed on avg">
              <technology-icon regular="" ${meta.iconAttr}="" sq16=""></technology-icon>
              <span class="loss-count">${displayCount}</span>
              <span class="loss-name">${meta.name}</span>
            </div>
          `;
        }).join('');

        let statusBadge = '';
        if (res.outcome === 'unreached') {
          statusBadge = '<span class="nexus-casualty-status unreached">Unreached</span>';
        } else if (res.attackerLossMsu === 0) {
          statusBadge = '<span class="nexus-casualty-status flawless">0 Lost (Flawless)</span>';
        } else {
          statusBadge = `<span class="nexus-casualty-status lost">-${formatAmount(res.attackerLossMsu)} MSU</span>`;
        }

        return `
          <div class="nexus-casualty-wave-card ${res.outcome}">
            <div class="nexus-casualty-card-header">
              <span class="nexus-casualty-wave-title">Wave ${res.waveNumber} Losses</span>
              ${statusBadge}
            </div>

            ${res.outcome === 'unreached'
              ? '<div class="nexus-casualty-detail"><span class="text-slate text-xs">Fleet wiped out in prior wave</span></div>'
              : `
                <div class="nexus-casualty-detail">
                  ${shipLossPills || (res.attackerLossMsu > 0
                    ? `<span class="text-amber text-xs font-semibold">&lt; 1% fleet loss risk (~${formatAmount(res.attackerLossMsu)} MSU)</span>`
                    : '<span class="text-emerald text-xs font-semibold">No fleet losses</span>')}
                </div>
                <div class="nexus-casualty-footer">
                  <span class="text-slate text-xs">${res.winRateAtk >= 99 ? '100% Win' : `${Math.round(res.winRateAtk)}% Win`} (${res.avgRounds} Rnds)</span>
                  <span class="text-cyan text-xs font-bold">${res.totalRemainingShips.toLocaleString()} surviving</span>
                </div>
              `
            }
          </div>
        `;
      }).join('');
    }

    // Cumulative Totals Bar on Bottom Right
    let totalsBarHtml = '';
    if (latestSummary) {
      totalsBarHtml = `
        <div class="nexus-casualties-totals-bar">
          <div class="totals-col">
            <span class="tot-label">Total Losses</span>
            <span class="tot-val text-crimson">-${formatAmount(latestSummary.totalAttackerLossMsu)} MSU</span>
          </div>
          <div class="totals-col">
            <span class="tot-label">Enemy Losses</span>
            <span class="tot-val text-amber">+${formatAmount(latestSummary.totalDefenderLossMsu)} MSU</span>
          </div>
          <div class="totals-col">
            <span class="tot-label">Surviving Ships</span>
            <span class="tot-val text-emerald">${latestSummary.totalFinalSurvivingCount.toLocaleString()} Ships</span>
          </div>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="nexus-sim-header">
        <div class="nexus-sim-header-title-wrap">
          <div class="nexus-sim-swords-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline>
              <line x1="13" y1="19" x2="19" y2="13"></line>
              <line x1="16" y1="16" x2="20" y2="20"></line>
              <line x1="19" y1="21" x2="21" y2="19"></line>
              <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"></polyline>
              <line x1="5" y1="14" x2="9" y2="18"></line>
              <line x1="7" y1="17" x2="4" y2="20"></line>
              <line x1="3" y1="19" x2="5" y2="21"></line>
            </svg>
          </div>
          <div>
            <div class="nexus-sim-main-title">
              <span>${missionData.name}</span>
              <span class="nexus-sim-level-badge">Lvl ${missionData.level}</span>
              <span class="nexus-sim-stars">${starsHtml}</span>
              <span class="nexus-sim-env-badge ${missionData.environment}">${missionData.environment.toUpperCase()} COMBAT</span>
            </div>
            <div class="nexus-sim-subtitle">
              ${waves.length} Hostile Wave${waves.length === 1 ? '' : 's'} Detected • Wave Combat Simulator
            </div>
          </div>
        </div>

        <div class="nexus-sim-header-actions">
          <div class="nexus-sim-iter-control" title="Monte Carlo Simulation runs per wave (20 to 100)">
            <span class="iter-label">Simulations:</span>
            <input
              type="range"
              min="20"
              max="100"
              step="10"
              class="nexus-sim-iter-slider"
              value="${activeIterations}"
              ${isSimulating ? 'disabled' : ''}
            />
            <span class="iter-val">${activeIterations}</span>
          </div>

          <button type="button" class="nexus-sim-close-btn" title="Close Simulator (Esc)">✕</button>
        </div>
      </div>

      <!-- TOP COMMAND BAR: 75% Left (Planet Selection + 2x5 Grid) | 25% Right (3x2 Techs with VS) -->
      <div class="nexus-sim-top-bar">
        <!-- LEFT 75%: Planet Picker (Larger, on left, USE FLEET removed) + 2x5 Stationed Mini-Grid -->
        <div class="nexus-top-planet-section">
          <!-- Larger Planet/Moon Selection Widget with paired Moon on same line -->
          <div class="nexus-planet-picker-wrap">
            <div class="nexus-planet-selected-card" title="Click to switch planet or moon">
              <div class="nexus-planet-thumb-wrap">
                <img
                  src="${activeImgUrl}"
                  class="nexus-planet-thumb-img"
                  alt=""
                  onerror="this.src='${activeDefaultImg}'; this.onerror=null;"
                />
              </div>
              <div class="nexus-planet-card-info">
                <div class="nexus-planet-name-row">
                  <span class="nexus-planet-name">${activePlanet?.name || 'Planet'}</span>
                  <span class="nexus-planet-type-tag ${activePlanet?.type || 'planet'}">${activePlanet?.type === 'moon' ? 'MOON' : 'PLANET'}</span>
                </div>
                <span class="nexus-planet-coords">[${activePlanet?.coords || '1:1:1'}]</span>
              </div>
              <div class="nexus-dropdown-arrow-wrap">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>

            <!-- Custom Dropdown Menu with paired Planet + Moon on same line -->
            <div class="nexus-planet-dropdown-menu hidden">
              ${dropdownRowsHtml}
            </div>
          </div>

          <!-- Stationed Warships 2x5 Mini-Grid -->
          <div class="nexus-stationed-minigrid">
            ${stationedMiniGridHtml}
          </div>
        </div>

        <!-- RIGHT 25%: Combat Techs Comparison in 3x2 Matrix (Row 1: Player, Middle: VS, Row 2: Enemy) -->
        <div class="nexus-top-techs-section">
          <!-- Row 1: Player Techs (Green tint) -->
          <div class="nexus-tech-row player">
            <div class="nexus-tech-item player" title="Weapons Technology (+10% firepower/lvl)">
              <technology-icon regular="" weaponstechnology="" sq18="" bordered="" class="tooltip" data-tooltip-title="Weapons Technology"></technology-icon>
              <input
                type="number"
                min="0"
                max="40"
                step="1"
                class="nexus-tech-num-input player"
                data-side="player"
                data-tech="weapons"
                value="${profile.weapons}"
                ${isSimulating ? 'disabled' : ''}
              />
            </div>
            <div class="nexus-tech-item player" title="Shielding Technology (+10% shields/lvl)">
              <technology-icon regular="" shieldingtechnology="" sq18="" bordered="" class="tooltip" data-tooltip-title="Shielding Technology"></technology-icon>
              <input
                type="number"
                min="0"
                max="40"
                step="1"
                class="nexus-tech-num-input player"
                data-side="player"
                data-tech="shielding"
                value="${profile.shielding}"
                ${isSimulating ? 'disabled' : ''}
              />
            </div>
            <div class="nexus-tech-item player" title="Armour Technology (+10% hull/lvl)">
              <technology-icon regular="" armortechnology="" sq18="" bordered="" class="tooltip" data-tooltip-title="Armour Technology"></technology-icon>
              <input
                type="number"
                min="0"
                max="40"
                step="1"
                class="nexus-tech-num-input player"
                data-side="player"
                data-tech="armour"
                value="${profile.armour}"
                ${isSimulating ? 'disabled' : ''}
              />
            </div>
          </div>

          <!-- Middle: VS Divider Badge -->
          <div class="nexus-tech-vs-row">
            <div class="nexus-tech-vs-line"></div>
            <div class="nexus-tech-vs-badge">VS</div>
            <div class="nexus-tech-vs-line"></div>
          </div>

          <!-- Row 2: Enemy Techs (Red tint) -->
          <div class="nexus-tech-row enemy">
            <div class="nexus-tech-item enemy" title="Hostile Weapons Technology">
              <technology-icon regular="" weaponstechnology="" sq18="" bordered="" class="tooltip" data-tooltip-title="Weapons Technology"></technology-icon>
              <input
                type="number"
                min="0"
                max="40"
                step="1"
                class="nexus-tech-num-input enemy"
                data-side="enemy"
                data-tech="weapons"
                value="${enemyTechs.weapons}"
                ${isSimulating ? 'disabled' : ''}
              />
            </div>
            <div class="nexus-tech-item enemy" title="Hostile Shielding Technology">
              <technology-icon regular="" shieldingtechnology="" sq18="" bordered="" class="tooltip" data-tooltip-title="Shielding Technology"></technology-icon>
              <input
                type="number"
                min="0"
                max="40"
                step="1"
                class="nexus-tech-num-input enemy"
                data-side="enemy"
                data-tech="shielding"
                value="${enemyTechs.shielding}"
                ${isSimulating ? 'disabled' : ''}
              />
            </div>
            <div class="nexus-tech-item enemy" title="Hostile Armour Technology">
              <technology-icon regular="" armortechnology="" sq18="" bordered="" class="tooltip" data-tooltip-title="Armour Technology"></technology-icon>
              <input
                type="number"
                min="0"
                max="40"
                step="1"
                class="nexus-tech-num-input enemy"
                data-side="enemy"
                data-tech="armour"
                value="${enemyTechs.armour}"
                ${isSimulating ? 'disabled' : ''}
              />
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN BODY CONTAINER -->
      <div class="nexus-sim-body-container">
        <!-- TOP SECTION: War Fleet (2x4 Grid Across Full Width) -->
        <div class="nexus-sim-fleet-section">
          <div class="nexus-sim-section-header">
            <div class="nexus-sim-section-left">
              <span class="nexus-sim-section-title">War Fleet</span>
              <span class="nexus-sim-fleet-summary-pill">
                ${totalInputShips.toLocaleString()} Ships • ${formatAmount(fleetMsu)} MSU • ${formatAmount(fleetCargo)} Cargo
              </span>
            </div>
            <div class="nexus-sim-fleet-actions">
              ${totalStationedAtAnomaly > 0 ? `
                <button type="button" class="nexus-btn-autofill-anomaly highlight" title="Populate with warships stationed at this anomaly mission (${totalStationedAtAnomaly.toLocaleString()} ships)" ${isSimulating ? 'disabled' : ''}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>Stationed at Anomaly (${totalStationedAtAnomaly.toLocaleString()})</span>
                </button>
              ` : ''}
              <button type="button" class="nexus-btn-autofill-planet ${currentPlanetTotalFleet > 0 ? 'highlight' : ''}" title="Populate with warships from selected ${activePlanet?.type === 'moon' ? 'Moon' : 'Planet'} (${currentPlanetTotalFleet.toLocaleString()} ships)" ${isSimulating ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Load from ${activePlanet?.type === 'moon' ? 'Moon' : 'Planet'} (${currentPlanetTotalFleet.toLocaleString()})</span>
              </button>
              <button type="button" class="nexus-btn-clear" title="Clear all warship inputs" ${isSimulating ? 'disabled' : ''}>
                <span>Clear</span>
              </button>
            </div>
          </div>

          <!-- 2 Rows of 4 Cards -->
          <div class="nexus-sim-warships-grid">
            ${warshipCardsHtml}
          </div>
        </div>

        <!-- BOTTOM SECTION: Split into Hostile Waves (Left) & Own Fleet Casualties (Right) -->
        <div class="nexus-sim-bottom-split">
          <!-- LEFT HALF: Hostile Waves -->
          <div class="nexus-sim-bottom-left">
            <div class="nexus-sim-column-title-bar">
              <span class="nexus-column-title">Hostile Waves (${waves.length})</span>
              <span class="nexus-column-hint">Hover radar to inspect</span>
            </div>
            <div class="nexus-sim-waves-stack">
              ${wavesHtml}
            </div>
          </div>

          <!-- RIGHT HALF: Own Fleet Casualties Per Wave -->
          <div class="nexus-sim-bottom-right">
            <div class="nexus-sim-column-title-bar">
              <span class="nexus-column-title">Fleet Losses</span>
              <span class="nexus-column-hint">Losses per wave</span>
            </div>
            <div class="nexus-sim-casualties-stack">
              ${casualtiesHtml}
            </div>
            ${totalsBarHtml}
          </div>
        </div>
      </div>

      <div class="nexus-sim-footer">
        <div class="nexus-sim-footer-note">
          <span>* Surviving ships from each wave advance to fight the next wave.</span>
        </div>
        <div class="nexus-sim-footer-actions">
          <button type="button" class="nexus-sim-btn-secondary" id="nexus-sim-cancel-btn">Close</button>
          <button type="button" class="nexus-sim-btn-send-fleet" id="nexus-sim-send-fleet-btn" ${totalInputShips === 0 || isSimulating ? 'disabled' : ''} title="Send selected fleet to this Anomaly via Fleet Dispatch">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2L11 13"></path>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>Send fleet to Anomaly</span>
          </button>
          <button type="button" class="nexus-sim-btn-primary" id="nexus-sim-run-btn" ${totalInputShips === 0 || isSimulating ? 'disabled' : ''}>
            ${isSimulating ? `
              <span class="nexus-sim-spinner"></span>
              <span>Simulating Combat...</span>
            ` : `
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Simulate ${waves.length} Wave${waves.length === 1 ? '' : 's'} (${activeIterations} runs)</span>
            `}
          </button>
        </div>
      </div>
    `;

    wireEvents();

    const newStack = modal.querySelector<HTMLElement>('.nexus-sim-waves-stack');
    if (newStack && prevScrollTop > 0) {
      newStack.scrollTop = prevScrollTop;
    }

    if (activeSimWaveIndex >= 0 && waves[activeSimWaveIndex]) {
      const activeCard = modal.querySelector(`.nexus-wave-card[data-wave-num="${waves[activeSimWaveIndex].waveNumber}"]`);
      activeCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const wireEvents = () => {
    // Close button
    modal.querySelector('.nexus-sim-close-btn')?.addEventListener('click', closeAnomalyWaveSimModal);
    modal.querySelector('#nexus-sim-cancel-btn')?.addEventListener('click', closeAnomalyWaveSimModal);

    // Custom planet dropdown toggle
    const triggerCard = modal.querySelector<HTMLElement>('.nexus-planet-selected-card');
    const menuEl = modal.querySelector<HTMLElement>('.nexus-planet-dropdown-menu');
    const arrowEl = modal.querySelector<HTMLElement>('.nexus-dropdown-arrow-wrap');

    triggerCard?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menuEl) {
        const isHidden = menuEl.classList.contains('hidden');
        menuEl.classList.toggle('hidden', !isHidden);
        arrowEl?.classList.toggle('open', isHidden);
      }
    });

    // Custom dropdown item selection (planet or moon clicked on same line)
    modal.querySelectorAll<HTMLElement>('.nexus-dropdown-item[data-planet-id]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = item.dataset.planetId;
        if (pId) {
          activePlanetId = pId;
          menuEl?.classList.add('hidden');
          arrowEl?.classList.remove('open');
          render();
        }
      });
    });

    // Close custom dropdown on click outside
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuEl && !menuEl.classList.contains('hidden')) {
        if (!triggerCard?.contains(e.target as Node) && !menuEl.contains(e.target as Node)) {
          menuEl.classList.add('hidden');
          arrowEl?.classList.remove('open');
        }
      }
    };
    document.addEventListener('click', handleOutsideClick);

    // Click ship cell in 2x5 mini-grid to fill that ship into War Fleet
    modal.querySelectorAll<HTMLElement>('.nexus-minigrid-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        if (isSimulating) return;
        const id = parseInt(cell.dataset.shipId || '0', 10) as CanonicalWarshipId;
        const count = parseInt(cell.dataset.count || '0', 10);
        if (CANONICAL_WARSHIP_IDS.includes(id) && count > 0) {
          activeWarships[id] = count;
          persistFleet();
          latestSummary = null;
          simulatedResults = [];
          render();
        }
      });
    });

    // Iterations slider
    const slider = modal.querySelector<HTMLInputElement>('.nexus-sim-iter-slider');
    const iterValEl = modal.querySelector<HTMLElement>('.iter-val');
    slider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val)) {
        activeIterations = Math.max(20, Math.min(100, val));
        if (iterValEl) iterValEl.textContent = String(activeIterations);
        try {
          localStorage.setItem(STORAGE_KEY_ITERATIONS, String(activeIterations));
        } catch {
          // Ignore
        }
      }
    });

    // Tech inputs (Player and Enemy)
    modal.querySelectorAll<HTMLInputElement>('.nexus-tech-num-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const side = target.dataset.side;
        const tech = target.dataset.tech;
        const val = cleanNumber(target.value);

        if (side === 'player') {
          if (tech === 'weapons') profile.weapons = val;
          else if (tech === 'shielding') profile.shielding = val;
          else if (tech === 'armour') profile.armour = val;

          try {
            localStorage.setItem(STORAGE_KEY_PLAYER_TECHS, JSON.stringify({
              weapons: profile.weapons,
              shielding: profile.shielding,
              armour: profile.armour,
              hyperspaceTech: profile.hyperspaceTech
            }));
          } catch {
            // Ignore
          }
          latestSummary = null;
          simulatedResults = [];
        } else if (side === 'enemy') {
          if (tech === 'weapons') enemyTechs.weapons = val;
          else if (tech === 'shielding') enemyTechs.shielding = val;
          else if (tech === 'armour') enemyTechs.armour = val;

          waves.forEach((w) => {
            w.techs = { ...enemyTechs };
          });

          try {
            localStorage.setItem(STORAGE_KEY_ENEMY_TECHS, JSON.stringify(enemyTechs));
          } catch {
            // Ignore
          }
          latestSummary = null;
          simulatedResults = [];
        }
      });
    });

    // Auto-fill fleet from Anomaly
    modal.querySelector('.nexus-btn-autofill-anomaly')?.addEventListener('click', () => {
      if (isSimulating) return;
      CANONICAL_WARSHIP_IDS.forEach((id) => {
        activeWarships[id] = stationedWarships[id] || 0;
      });
      persistFleet();
      latestSummary = null;
      simulatedResults = [];
      render();
    });

    // Auto-fill fleet from selected Planet or Moon
    modal.querySelector('.nexus-btn-autofill-planet')?.addEventListener('click', () => {
      if (isSimulating) return;
      const currentSelected = planetsList.find((p) => p.id === activePlanetId) || planetsList[0];
      if (currentSelected) {
        CANONICAL_WARSHIP_IDS.forEach((id) => {
          activeWarships[id] = currentSelected.ships[id] || 0;
        });
        persistFleet();
        latestSummary = null;
        simulatedResults = [];
        render();
      }
    });

    // Clear fleet
    modal.querySelector('.nexus-btn-clear')?.addEventListener('click', () => {
      if (isSimulating) return;
      CANONICAL_WARSHIP_IDS.forEach((id) => {
        activeWarships[id] = 0;
      });
      persistFleet();
      latestSummary = null;
      simulatedResults = [];
      render();
    });

    // Input changes for warships
    modal.querySelectorAll<HTMLInputElement>('.nexus-sim-ship-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const id = parseInt((e.target as HTMLInputElement).dataset.id || '0', 10) as CanonicalWarshipId;
        const val = cleanNumber((e.target as HTMLInputElement).value);
        if (CANONICAL_WARSHIP_IDS.includes(id)) {
          activeWarships[id] = val;
          persistFleet();
          updateSummaryPill();

          const card = inp.closest('.nexus-sim-warship-card');
          if (card) {
            card.classList.toggle('active', val > 0);
            card.classList.toggle('idle', val === 0);
          }
        }
      });
    });

    // Quick add pills
    modal.querySelectorAll<HTMLButtonElement>('.nexus-pill-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (isSimulating) return;
        const target = e.currentTarget as HTMLButtonElement;
        const action = target.dataset.action;
        const id = parseInt(target.dataset.id || '0', 10) as CanonicalWarshipId;
        const val = parseInt(target.dataset.val || '0', 10);

        if (CANONICAL_WARSHIP_IDS.includes(id)) {
          if (action === 'add') {
            activeWarships[id] = (activeWarships[id] || 0) + val;
          } else if (action === 'set') {
            activeWarships[id] = val;
          }
          persistFleet();
          render();
        }
      });
    });


    // Mouse-following hover for hostile fleet inspect buttons
    modal.querySelectorAll<HTMLElement>('.nexus-hostile-inspect-btn').forEach((btn) => {
      const waveIdx = parseInt(btn.dataset.waveIdx || '1', 10);
      const wave = waves.find((w) => w.waveNumber === waveIdx);
      if (!wave) return;

      btn.addEventListener('mouseenter', (e) => {
        showWaveInspectTooltip(e, wave);
      });
      btn.addEventListener('mousemove', (e) => {
        if (activeInspectTooltip) {
          positionWaveInspectTooltip(e, activeInspectTooltip);
        }
      });
      btn.addEventListener('mouseleave', () => {
        hideWaveInspectTooltip();
      });
    });

    // Run simulation
    modal.querySelector('#nexus-sim-run-btn')?.addEventListener('click', () => {
      executeSimulation();
    });

    // Send fleet to Anomaly via Fleet Dispatch
    modal.querySelector('#nexus-sim-send-fleet-btn')?.addEventListener('click', () => {
      const totalInput = Object.values(activeWarships).reduce((a, b) => a + b, 0);
      if (totalInput === 0 || isSimulating) return;

      const selectedShips: Record<number, number> = {};
      for (const [sId, amt] of Object.entries(activeWarships)) {
        if (amt > 0) {
          selectedShips[Number(sId)] = amt;
        }
      }

      if (Object.keys(selectedShips).length === 0) return;

      persistFleet();

      const sendBtn = modal.querySelector<HTMLButtonElement>('#nexus-sim-send-fleet-btn');
      if (sendBtn) {
        sendBtn.innerHTML = `
          <span class="nexus-sim-spinner"></span>
          <span>Dispatching Fleet...</span>
        `;
        sendBtn.disabled = true;
      }

      const targetCoords = {
        galaxy: missionData.galaxy,
        system: missionData.system,
        position: missionData.position
      };

      dispatchMultiFleetToAnomaly(targetCoords, selectedShips, activePlanetId);
    });
  };

  const persistFleet = () => {
    try {
      localStorage.setItem(STORAGE_KEY_FLEET, JSON.stringify(activeWarships));
    } catch {
      // Ignore
    }
  };

  const updateSummaryPill = () => {
    const totalInputShips = Object.values(activeWarships).reduce((a, b) => a + b, 0);
    const fleetMsu = computeFleetMsu(activeWarships);
    const fleetCargo = computeFleetCargo(activeWarships, profile.hyperspaceTech);
    const pill = modal.querySelector('.nexus-sim-fleet-summary-pill');
    if (pill) {
      pill.textContent = `${totalInputShips.toLocaleString()} Ships • ${formatAmount(fleetMsu)} MSU • ${formatAmount(fleetCargo)} Cargo`;
    }
    const runBtn = modal.querySelector<HTMLButtonElement>('#nexus-sim-run-btn');
    if (runBtn && !isSimulating) {
      runBtn.disabled = totalInputShips === 0;
    }
    const sendFleetBtn = modal.querySelector<HTMLButtonElement>('#nexus-sim-send-fleet-btn');
    if (sendFleetBtn && !isSimulating) {
      sendFleetBtn.disabled = totalInputShips === 0;
    }
  };

  /**
   * Sequential multi-wave simulation with active step-by-step scanning highlight beam!
   */
  const executeSimulation = async () => {
    const totalInputShips = Object.values(activeWarships).reduce((a, b) => a + b, 0);
    if (totalInputShips === 0 || isSimulating) return;

    isSimulating = true;
    simulatedResults = [];
    latestSummary = null;
    activeSimWaveIndex = -1;
    render();

    let currentFleet: Record<number, number> = { ...activeWarships };
    let defeatedAtWave: number | null = null;
    let totalAttackerLossMsu = 0;
    let totalDefenderLossMsu = 0;
    let totalDebrisMsu = 0;
    let totalReaperHarvestMsu = 0;

    const targetCoords = {
      galaxy: missionData.galaxy || 1,
      system: missionData.system || 1,
      position: missionData.position || 1
    };

    for (let i = 0; i < waves.length; i++) {
      const wave = waves[i];
      activeSimWaveIndex = i;

      // Update UI with active wave highlighted
      render();

      // Tactile simulation beam delay so the player sees the scanning row engaging
      await new Promise((r) => setTimeout(r, 400));

      const initialShipCount = Object.values(currentFleet).reduce((a, b) => a + b, 0);

      if (initialShipCount <= 0 || defeatedAtWave !== null) {
        simulatedResults.push({
          waveNumber: wave.waveNumber,
          winRateAtk: 0,
          winRateDef: 100,
          winRateDraw: 0,
          avgRounds: 0,
          outcome: 'unreached',
          initialAttackerShips: { ...currentFleet },
          remainingAttackerShips: {},
          lostAttackerShips: {},
          lostDefenderShips: {},
          attackerLossMsu: 0,
          defenderLossMsu: 0,
          debrisMsu: 0,
          reaperHarvestMsu: 0,
          totalInitialShips: 0,
          totalRemainingShips: 0
        });
        continue;
      }

      const res = simulateSingleWave(wave, currentFleet, profile, activeIterations, targetCoords);
      simulatedResults.push(res);

      totalAttackerLossMsu += res.attackerLossMsu;
      totalDefenderLossMsu += res.defenderLossMsu;
      totalDebrisMsu += res.debrisMsu;
      totalReaperHarvestMsu += res.reaperHarvestMsu;

      currentFleet = { ...res.remainingAttackerShips };

      if (res.outcome === 'defeat') {
        if (defeatedAtWave === null) defeatedAtWave = wave.waveNumber;
      }

      // Re-render immediately so casualties for wave i appear on the right half in real time!
      render();
    }

    activeSimWaveIndex = -1;
    const wavesCleared = simulatedResults.filter((w) => w.outcome === 'victory').length;
    const totalFinalSurvivingCount = Object.values(currentFleet).reduce((a, b) => a + b, 0);

    latestSummary = {
      wavesCleared,
      totalWaves: waves.length,
      allCleared: wavesCleared === waves.length && defeatedAtWave === null,
      defeatedAtWave,
      totalAttackerLossMsu,
      totalDefenderLossMsu,
      totalDebrisMsu,
      totalReaperHarvestMsu,
      finalSurvivingShips: currentFleet,
      totalFinalSurvivingCount,
      waveResults: simulatedResults
    };

    isSimulating = false;
    render();
  };

  // Keyboard shortcut listener
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeAnomalyWaveSimModal();
    } else if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      executeSimulation();
    }
  };

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeAnomalyWaveSimModal();
    }
  });

  document.addEventListener('keydown', handleKeydown);
  (overlay as any)._keydownHandler = handleKeydown;

  document.body.appendChild(overlay);
  activeModalOverlay = overlay;

  render();
}

/**
 * Closes the active wave simulator modal.
 */
export function closeAnomalyWaveSimModal(): void {
  hideWaveInspectTooltip();
  if (activeModalOverlay) {
    if ((activeModalOverlay as any)._keydownHandler) {
      document.removeEventListener('keydown', (activeModalOverlay as any)._keydownHandler);
    }
    activeModalOverlay.remove();
    activeModalOverlay = null;
  }
}
