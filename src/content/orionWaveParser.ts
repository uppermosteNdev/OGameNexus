/**
 * Anomaly Combat Wave & Stationed Fleet DOM Parser
 * Extracts enemy waves, techs, compositions, and stationed warships directly from OGame Missions DOM.
 */

import { db } from '../db';
import { UNITS } from '../utils/combatSim/constants';

export interface AnomalyCombatWave {
  waveNumber: number;
  coords: string;
  arrivalSeconds?: number;
  arrivalFormatted?: string;
  techs: {
    weapons: number;
    shielding: number;
    armour: number;
  };
  ships: Record<number, number>; // techId -> count
  totalShips: number;
}

export const CANONICAL_WARSHIP_IDS = [
  206, // Cruiser
  207, // Battleship
  215, // Battlecruiser
  211, // Bomber
  213, // Destroyer
  214, // Deathstar
  218, // Reaper
  219  // Pathfinder
] as const;

export type CanonicalWarshipId = typeof CANONICAL_WARSHIP_IDS[number];

export const WARSHIP_METADATA: Record<CanonicalWarshipId, { name: string; iconAttr: string; role: string }> = {
  206: { name: 'Cruiser', iconAttr: 'cruiser', role: 'Anti-LF Swarm' },
  207: { name: 'Battleship', iconAttr: 'battleship', role: 'Heavy Gunner' },
  215: { name: 'Battlecruiser', iconAttr: 'interceptor', role: 'Capital Hunter' },
  211: { name: 'Bomber', iconAttr: 'bomber', role: 'Shield Crusher' },
  213: { name: 'Destroyer', iconAttr: 'destroyer', role: 'Anti-BC & Armor' },
  214: { name: 'Deathstar', iconAttr: 'deathstar', role: 'Superheavy Base' },
  218: { name: 'Reaper', iconAttr: 'reaper', role: 'Debris Harvester' },
  219: { name: 'Pathfinder', iconAttr: 'explorer', role: 'Scout Vanguard' },
};

export interface PlayerCombatProfile {
  weapons: number;
  shielding: number;
  armour: number;
  hyperspaceTech: number;
  playerClass: number;
  allianceClass: number;
  isGeneral: boolean;
  baseWeapons: number;
  baseShielding: number;
  baseArmour: number;
}

/**
 * Normalizes numbers extracted from DOM strings.
 */
function cleanNumber(str: string | null | undefined): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Maps a ship name or icon attribute to an OGame Unit ID.
 */
export function resolveShipId(identifier: string): number | null {
  const norm = identifier.toLowerCase().replace(/[\s\-_]/g, '');

  if (norm.includes('fighterlight') || norm.includes('lightfighter') || norm.includes('chasseurleger') || norm.includes('cazadorligero') || norm.includes('leichterjaeger')) return 204;
  if (norm.includes('fighterheavy') || norm.includes('heavyfighter') || norm.includes('chasseurlourd') || norm.includes('cazadorpesado') || norm.includes('schwererjaeger')) return 205;
  if (norm.includes('cruiser') || norm.includes('croiseur') || norm.includes('crucero') || norm.includes('kreuzer')) return 206;
  if (norm.includes('interceptor') || norm.includes('battlecruiser') || norm.includes('traqueur') || norm.includes('acorazado') || norm.includes('schlachtkreuzer')) return 215;
  if (norm.includes('battleship') || norm.includes('vaisseaudebataille') || norm.includes('navesdebatalla') || norm.includes('schlachtschiff')) return 207;
  if (norm.includes('bomber') || norm.includes('bombardier') || norm.includes('bombardero')) return 211;
  if (norm.includes('destroyer') || norm.includes('destructeur') || norm.includes('destructor') || norm.includes('zerstoerer') || norm.includes('zerstörer')) return 213;
  if (norm.includes('deathstar') || norm.includes('etoiledelamort') || norm.includes('estrelladelamuerte') || norm.includes('todesstern') || norm.includes('rip')) return 214;
  if (norm.includes('reaper') || norm.includes('faucheur') || norm.includes('segador')) return 218;
  if (norm.includes('explorer') || norm.includes('pathfinder') || norm.includes('eclaireur') || norm.includes('explorador')) return 219;
  if (norm.includes('transportersmall') || norm.includes('smallcargo') || norm.includes('petittransporteur') || norm.includes('cargapequena') || norm.includes('kleinertransporter')) return 202;
  if (norm.includes('transporterlarge') || norm.includes('largecargo') || norm.includes('grandtransporteur') || norm.includes('cargagrande') || norm.includes('grossertransporter')) return 203;
  if (norm.includes('colonyship') || norm.includes('vaisseaucolonisateur') || norm.includes('colonizador') || norm.includes('kolonieschiff')) return 208;
  if (norm.includes('recycler') || norm.includes('recycleur') || norm.includes('reciclador')) return 209;
  if (norm.includes('espionageprobe') || norm.includes('sonde') || norm.includes('sonda') || norm.includes('spionagesonde')) return 210;

  // Numerical check
  const num = parseInt(norm, 10);
  if (!isNaN(num) && UNITS[num]) return num;

  return null;
}

/**
 * Extracts all enemy waves from the mission DOM element.
 */
export function extractAnomalyCombatWaves(
  missionEl: HTMLElement,
  missionId: string,
  missionLevel: number = 0,
  defaultCoords: string = '1:1:1'
): AnomalyCombatWave[] {
  const wavesMap = new Map<number, AnomalyCombatWave>();

  // Attempt to scrape any hostile combat techs present in the mission element or tooltips
  let scrapedHostileTechs: { weapons?: number; shielding?: number; armour?: number } = {};
  try {
    missionEl.querySelectorAll('.fleetTooltipRow, .missionDetailsRow, li, tr').forEach((el) => {
      const text = el.textContent || '';
      const wMatch = text.match(/weapons?(?:\s*technology)?[:\s]+(\d+)/i);
      if (wMatch) scrapedHostileTechs.weapons = parseInt(wMatch[1], 10);
      const sMatch = text.match(/shield(?:ing)?(?:\s*technology)?[:\s]+(\d+)/i);
      if (sMatch) scrapedHostileTechs.shielding = parseInt(sMatch[1], 10);
      const aMatch = text.match(/armou?r(?:\s*technology)?[:\s]+(\d+)/i);
      if (aMatch) scrapedHostileTechs.armour = parseInt(aMatch[1], 10);

      const wepIcon = el.querySelector('technology-icon[weaponstechnology]');
      if (wepIcon) {
        const val = cleanNumber(el.querySelector('.value, strong, .level, .fleetTooltipCount')?.textContent);
        if (val > 0) scrapedHostileTechs.weapons = val;
      }
      const shdIcon = el.querySelector('technology-icon[shieldingtechnology]');
      if (shdIcon) {
        const val = cleanNumber(el.querySelector('.value, strong, .level, .fleetTooltipCount')?.textContent);
        if (val > 0) scrapedHostileTechs.shielding = val;
      }
      const armIcon = el.querySelector('technology-icon[armourtechnology], technology-icon[armortechnology]');
      if (armIcon) {
        const val = cleanNumber(el.querySelector('.value, strong, .level, .fleetTooltipCount')?.textContent);
        if (val > 0) scrapedHostileTechs.armour = val;
      }
    });
  } catch {
    // Ignore
  }

  let savedEnemyTechs: { weapons?: number; shielding?: number; armour?: number } = {};
  try {
    const raw = localStorage.getItem('nexus_anomaly_sim_enemy_techs');
    if (raw) savedEnemyTechs = JSON.parse(raw);
  } catch {
    // Ignore
  }

  const defaultTech = Math.max(10, Math.floor(missionLevel / 25));
  const fallbackWep = savedEnemyTechs.weapons || scrapedHostileTechs.weapons || defaultTech;
  const fallbackShd = savedEnemyTechs.shielding || scrapedHostileTechs.shielding || defaultTech;
  const fallbackArm = savedEnemyTechs.armour || scrapedHostileTechs.armour || defaultTech;

  // 1. Check for wave combat sim API buttons (Gameforge embed or data attributes)
  const apiButtons = missionEl.querySelectorAll<HTMLElement>(
    '.waveSimButton, .waveApiButton, [data-api-combat], [onclick*="combatsim"], a[href*="simData"]'
  );

  apiButtons.forEach((btn, idx) => {
    try {
      let dataJson: any = null;
      const rawData = btn.getAttribute('data-api-combat') || btn.getAttribute('data-combatsim');
      if (rawData) {
        dataJson = JSON.parse(rawData);
      } else {
        const onclick = btn.getAttribute('onclick') || '';
        const match = onclick.match(/combatsim\((.*?)\)/);
        if (match && match[1]) {
          dataJson = JSON.parse(match[1]);
        }
      }

      if (dataJson) {
        const waveNum = dataJson.wave || idx + 1;
        const coords = dataJson.coords || defaultCoords;
        const researches = dataJson.researches || {};
        const ships: Record<number, number> = {};
        let totalShips = 0;

        if (dataJson.ships && typeof dataJson.ships === 'object') {
          for (const [idStr, sVal] of Object.entries(dataJson.ships)) {
            const shipId = parseInt(idStr, 10);
            const amount = typeof sVal === 'number' ? sVal : (typeof sVal === 'object' && sVal !== null ? (sVal as any).amount || 0 : 0);
            if (shipId && amount > 0) {
              ships[shipId] = amount;
              totalShips += amount;
            }
          }
        }

        wavesMap.set(waveNum, {
          waveNumber: waveNum,
          coords,
          techs: {
            weapons: researches['109'] || researches.weapons || fallbackWep,
            shielding: researches['110'] || researches.shielding || fallbackShd,
            armour: researches['111'] || researches.armour || fallbackArm
          },
          ships,
          totalShips
        });
      }
    } catch {
      // Ignore JSON parse errors and proceed to tooltip inspection
    }
  });

  // 2. Parse wave tooltips in the DOM:
  // e.g. [id*="${missionId}"][id*="shiptip_w"], [id*="fleetTip_${missionId}_npc_"], [id*="fleetEvents_${missionId}_"]
  const waveTooltips = document.querySelectorAll<HTMLElement>(
    `[id*="${missionId}"][id*="shiptip_w"], [id*="fleetTip_${missionId}_npc_"], [id*="fleetEvents_${missionId}_"]`
  );

  waveTooltips.forEach((tt) => {
    // Exclude player's own fleets
    if (tt.id.includes('_own_') || tt.closest('.fleetEventRow.own')) return;

    let waveNum = 1;
    const waveMatch = tt.id.match(/shiptip_w(\d+)/i) || tt.id.match(/_w(\d+)/i);
    if (waveMatch) {
      waveNum = parseInt(waveMatch[1], 10);
    } else {
      const h1Text = tt.querySelector('h1')?.textContent || '';
      const h1Match = h1Text.match(/Wave\s*(\d+)/i);
      if (h1Match) waveNum = parseInt(h1Match[1], 10);
    }

    const ships: Record<number, number> = {};
    let totalShips = 0;
    let arrivalText = '';

    const arrivalRow = tt.querySelector('.fleetTooltipArrival');
    if (arrivalRow) {
      arrivalText = arrivalRow.textContent?.replace(/[()]/g, '').trim() || '';
    }

    const rows = tt.querySelectorAll('.fleetTooltipRow');
    rows.forEach((row) => {
      if (row.classList.contains('fleetTooltipArrival')) return;

      const countText = row.querySelector('.fleetTooltipCount')?.textContent?.trim();
      const count = cleanNumber(countText);
      if (count <= 0) return;

      // Extract ship type from technology-icon or name
      const icon = row.querySelector('technology-icon');
      let shipId: number | null = null;

      if (icon) {
        for (const attr of icon.getAttributeNames()) {
          const matched = resolveShipId(attr);
          if (matched) {
            shipId = matched;
            break;
          }
        }
      }

      if (!shipId) {
        const nameText = row.querySelector('.fleetTooltipName')?.textContent?.trim() || '';
        shipId = resolveShipId(nameText);
      }

      if (shipId) {
        ships[shipId] = (ships[shipId] || 0) + count;
        totalShips += count;
      }
    });

    if (totalShips > 0) {
      const existing = wavesMap.get(waveNum);
      const defaultTech = Math.max(10, Math.floor(missionLevel / 25));
      if (!existing || totalShips > existing.totalShips) {
        wavesMap.set(waveNum, {
          waveNumber: waveNum,
          coords: defaultCoords,
          arrivalFormatted: arrivalText || existing?.arrivalFormatted,
          techs: existing?.techs || {
            weapons: fallbackWep,
            shielding: fallbackShd,
            armour: fallbackArm
          },
          ships,
          totalShips
        });
      }
    }
  });

  // 3. Fallback: If no waves found, inspect .missionDetailsTable rows directly
  if (wavesMap.size === 0) {
    const tableRows = missionEl.querySelectorAll('.missionDetailsTable .missionDetailsRow');
    let waveIdx = 1;
    tableRows.forEach((row) => {
      const label = row.querySelector('.cellLabel')?.textContent || '';
      if (/wave/i.test(label)) {
        const count = cleanNumber(row.querySelector('.nexus-cell-main, .cell')?.textContent);
        if (count > 0) {
          const defaultTech = Math.max(10, Math.floor(missionLevel / 25));
          wavesMap.set(waveIdx, {
            waveNumber: waveIdx,
            coords: defaultCoords,
            techs: { weapons: defaultTech, shielding: defaultTech, armour: defaultTech },
            ships: { 204: count }, // default to Light Fighters screen if unresolvable
            totalShips: count
          });
          waveIdx++;
        }
      }
    });
  }

  return Array.from(wavesMap.values()).sort((a, b) => a.waveNumber - b.waveNumber);
}

/**
 * Extracts player's warships stationed at or en route to the anomaly mission.
 * Strictly returns counts for the 8 canonical warships.
 */
export function extractStationedWarships(missionId: string): Record<CanonicalWarshipId, number> {
  const result: Record<CanonicalWarshipId, number> = {
    206: 0,
    207: 0,
    215: 0,
    211: 0,
    213: 0,
    214: 0,
    218: 0,
    219: 0
  };

  const parsePlayerRow = (row: Element) => {
    if (row.classList.contains('fleetTooltipArrival')) return;
    const countText = row.querySelector('.fleetTooltipCount')?.textContent?.trim();
    const count = cleanNumber(countText);
    if (count <= 0) return;

    let shipId: number | null = null;
    const icon = row.querySelector('technology-icon');
    if (icon) {
      for (const attr of icon.getAttributeNames()) {
        const matched = resolveShipId(attr);
        if (matched && CANONICAL_WARSHIP_IDS.includes(matched as CanonicalWarshipId)) {
          shipId = matched;
          break;
        }
      }
    }

    if (!shipId) {
      const name = row.querySelector('.fleetTooltipName')?.textContent?.trim() || '';
      const matched = resolveShipId(name);
      if (matched && CANONICAL_WARSHIP_IDS.includes(matched as CanonicalWarshipId)) {
        shipId = matched;
      }
    }

    if (shipId && CANONICAL_WARSHIP_IDS.includes(shipId as CanonicalWarshipId)) {
      result[shipId as CanonicalWarshipId] += count;
    }
  };

  // Check map tooltips
  const ownTooltips = document.querySelectorAll<HTMLElement>(`[id*="fleetTip_${missionId}_own_"]`);
  if (ownTooltips.length > 0) {
    ownTooltips.forEach((tt) => {
      if (tt.id.includes('npc') || tt.closest('.fleetEventRow.npc')) return;
      const rows = tt.querySelectorAll('.fleetTooltipRow');
      rows.forEach(parsePlayerRow);
    });
  }

  // Check expanded table holding rows
  const ownHoldingRows = document.querySelectorAll<HTMLElement>(
    `.fleetEventRow.own.holding, .fleetEventRow.own.flying, .fleetEventRow.own:not(.returning):not(.npc)`
  );
  const processedIds = new Set<string>();

  ownHoldingRows.forEach((rowEl) => {
    if (rowEl.classList.contains('returning') || rowEl.classList.contains('npc')) return;
    const ttEl = rowEl.querySelector<HTMLElement>(`[id*="fleetEvents_${missionId}_"]`);
    if (ttEl && !processedIds.has(ttEl.id)) {
      processedIds.add(ttEl.id);
      const rows = ttEl.querySelectorAll('.fleetTooltipRow');
      rows.forEach(parsePlayerRow);
    }
  });

  return result;
}

/**
 * Queries the extension background script to retrieve the active player's Account record
 * from the extension's IndexedDB database.
 */
export async function fetchAccountFromBackground(playerId?: string): Promise<any> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        return resolve(null);
      }
      chrome.runtime.sendMessage({ type: 'GET_ASSISTANT_DATA', playerId }, (res) => {
        if (res && res.success && res.account) {
          resolve(res.account);
        } else {
          // Fallback to empire production query
          chrome.runtime.sendMessage({ type: 'GET_EMPIRE_PRODUCTION_DATA', playerId }, (res2) => {
            if (res2 && res2.success && res2.account) {
              resolve(res2.account);
            } else {
              resolve(null);
            }
          });
        }
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Attempts to scrape live research tech levels directly from the DOM if present on the page.
 */
export function scrapePageResearchTechs(): { weapons?: number; shielding?: number; armour?: number; hyperspaceTech?: number } {
  const result: { weapons?: number; shielding?: number; armour?: number; hyperspaceTech?: number } = {};
  try {
    document.querySelectorAll('[data-technology], .researchArt, li.technology').forEach((el) => {
      const techId = el.getAttribute('data-technology');
      const lvlEl = el.querySelector('.level, .stockAmount, .number');
      const lvl = cleanNumber(lvlEl?.textContent);
      if (lvl > 0) {
        if (techId === '109') result.weapons = lvl;
        else if (techId === '110') result.shielding = lvl;
        else if (techId === '111') result.armour = lvl;
        else if (techId === '114') result.hyperspaceTech = lvl;
      }
    });
  } catch {}
  return result;
}

/**
 * Robustly detects active player character class (1: Collector, 2: General/Warrior, 3: Discoverer).
 * Inspects background Account record, DOM elements, sprites, tooltips, and document body.
 */
export function extractPlayerClass(account?: any): number {
  // 1. Check account record from Dexie / background
  if (account) {
    const rawClass = account.playerClass ?? account.characterClass ?? account.characterClassId;
    if (rawClass !== undefined && rawClass !== null) {
      if (typeof rawClass === 'number' && rawClass >= 1 && rawClass <= 3) {
        return rawClass;
      }
      const norm = String(rawClass).toLowerCase();
      if (norm.includes('2') || norm.includes('warrior') || norm.includes('general') || norm.includes('général') || norm.includes('generał') || norm.includes('generale') || norm.includes('генерал')) {
        return 2;
      }
      if (norm.includes('1') || norm.includes('miner') || norm.includes('collector') || norm.includes('collecteur') || norm.includes('zbieracz') || norm.includes('коллекционер')) {
        return 1;
      }
      if (norm.includes('3') || norm.includes('explorer') || norm.includes('discoverer') || norm.includes('explorateur') || norm.includes('odkrywca') || norm.includes('первооткрыватель')) {
        return 3;
      }
    }
  }

  // 2. Direct DOM inspection in live OGame page
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

      const tooltipTitle = (classContainer.querySelector('a')?.getAttribute('data-tooltip-title') || classContainer.textContent || '').toLowerCase();
      if (tooltipTitle.includes('warrior') || tooltipTitle.includes('general') || tooltipTitle.includes('général') || tooltipTitle.includes('generał') || tooltipTitle.includes('generale') || tooltipTitle.includes('генерал')) {
        return 2;
      }
      if (tooltipTitle.includes('miner') || tooltipTitle.includes('collector') || tooltipTitle.includes('collecteur') || tooltipTitle.includes('zbieracz') || tooltipTitle.includes('коллекционер')) {
        return 1;
      }
      if (tooltipTitle.includes('explorer') || tooltipTitle.includes('discoverer') || tooltipTitle.includes('explorateur') || tooltipTitle.includes('odkrywca') || tooltipTitle.includes('первооткрыватель')) {
        return 3;
      }
    }

    // 3. Body class list
    if (document.body && document.body.className) {
      const bClass = document.body.className.toLowerCase();
      if (bClass.includes('warrior') || bClass.includes('general')) return 2;
      if (bClass.includes('miner') || bClass.includes('collector')) return 1;
      if (bClass.includes('explorer') || bClass.includes('discoverer')) return 3;
    }
  } catch {
    // Ignore DOM extraction errors
  }

  return 0;
}

/**
 * Loads player's research technologies and character classes.
 * Queries background extension DB first, falls back to DOM scraping and Dexie DB,
 * applies General class combat tech bonus (+2 to Weapons, Shielding, and Armour),
 * and merges with user overrides stored in localStorage.
 */
export async function getPlayerCombatProfile(): Promise<PlayerCombatProfile> {
  const metaPlayerId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content');
  const metaUniverse = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content');

  // 1. Fetch account record from background worker
  let account: any = await fetchAccountFromBackground(metaPlayerId || undefined);

  // 2. Fallback to Dexie DB if background message was not available
  if (!account) {
    try {
      if (metaPlayerId) {
        account = await db.accounts.get(String(metaPlayerId));
        if (!account && !isNaN(Number(metaPlayerId))) {
          account = await db.accounts.get(Number(metaPlayerId) as any);
        }
      }
      if (!account && metaUniverse) {
        account = await db.accounts.where('universe').equalsIgnoreCase(metaUniverse).first();
      }
      if (!account) {
        const allAccounts = await db.accounts.toArray();
        account = allAccounts.find((a) => a.researches && a.researches.length > 0) || allAccounts[0];
      }
    } catch (err) {
      console.warn('[OrionWaveParser] Fallback Dexie query failed:', err);
    }
  }

  let baseWeapons = 15;
  let baseShielding = 15;
  let baseArmour = 15;
  let hyperspaceTech = 10;

  // Extract from Account researches
  if (account?.researches) {
    if (Array.isArray(account.researches)) {
      for (const r of account.researches) {
        const id = Number(r.id);
        const lvl = Number(r.level) || 0;
        if (id === 109 && lvl > 0) baseWeapons = lvl;
        else if (id === 110 && lvl > 0) baseShielding = lvl;
        else if (id === 111 && lvl > 0) baseArmour = lvl;
        else if (id === 114 && lvl > 0) hyperspaceTech = lvl;
      }
    } else if (typeof account.researches === 'object') {
      const obj = account.researches as Record<string, number>;
      if (obj['109']) baseWeapons = Number(obj['109']);
      if (obj['110']) baseShielding = Number(obj['110']);
      if (obj['111']) baseArmour = Number(obj['111']);
      if (obj['114']) hyperspaceTech = Number(obj['114']);
    }
  }

  // Check live page DOM for any visible research levels
  const domTechs = scrapePageResearchTechs();
  if (domTechs.weapons && domTechs.weapons > 0) baseWeapons = domTechs.weapons;
  if (domTechs.shielding && domTechs.shielding > 0) baseShielding = domTechs.shielding;
  if (domTechs.armour && domTechs.armour > 0) baseArmour = domTechs.armour;
  if (domTechs.hyperspaceTech && domTechs.hyperspaceTech > 0) hyperspaceTech = domTechs.hyperspaceTech;

  // Detect player class & apply General class bonus (+2 to combat research)
  const playerClass = extractPlayerClass(account);
  const isGeneral = playerClass === 2;
  const generalBonus = isGeneral ? 2 : 0;

  let weapons = baseWeapons + generalBonus;
  let shielding = baseShielding + generalBonus;
  let armour = baseArmour + generalBonus;

  // Load saved user overrides if any
  try {
    const saved = localStorage.getItem('nexus_anomaly_sim_player_techs');
    if (saved) {
      const p = JSON.parse(saved);
      if (p.weapons !== undefined && p.weapons > 0) {
        // If saved value matches the old unboosted base and player is General, apply General bonus
        weapons = (isGeneral && p.weapons === baseWeapons) ? p.weapons + generalBonus : p.weapons;
      }
      if (p.shielding !== undefined && p.shielding > 0) {
        shielding = (isGeneral && p.shielding === baseShielding) ? p.shielding + generalBonus : p.shielding;
      }
      if (p.armour !== undefined && p.armour > 0) {
        armour = (isGeneral && p.armour === baseArmour) ? p.armour + generalBonus : p.armour;
      }
      if (p.hyperspaceTech !== undefined && p.hyperspaceTech > 0) hyperspaceTech = p.hyperspaceTech;
    }
  } catch {
    // Ignore
  }

  return {
    weapons,
    shielding,
    armour,
    hyperspaceTech,
    playerClass,
    allianceClass: account?.allianceClass || 0,
    isGeneral,
    baseWeapons,
    baseShielding,
    baseArmour
  };
}
