import { ProductionQueueItem, EmpireProductionQueueData, ProductionQueueType } from '../db';

/**
 * Fetches and parses all active in-progress production queues across the empire
 * (Base Buildings, Lifeform Buildings, Lifeform Researches, Shipyards, and Global Research)
 * via OGame's AJAX production queue endpoint.
 *
 * @param playerId Target player ID
 * @param ignoreDelay If true, bypasses the 1-minute automated throttle (used for manual sync / re-scan)
 */
export async function fetchEmpireProductionQueue(
  playerId?: string,
  ignoreDelay = false
): Promise<EmpireProductionQueueData | null> {
  const targetPlayerId = playerId || document.querySelector("meta[name='ogame-player-id']")?.getAttribute("content") || '';
  if (!targetPlayerId) return null;

  const storageKey = `nexus_production_queue_${targetPlayerId}`;

  // 1-minute throttle for automated syncs
  if (!ignoreDelay && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const stored = await chrome.storage.local.get(storageKey);
      const existing = stored?.[storageKey] as EmpireProductionQueueData | undefined;
      if (existing && existing.lastUpdated && (Date.now() - existing.lastUpdated < 60000)) {
        return existing;
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/game/index.php?page=ajax&component=productionqueue&ajax=1', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    if (!res.ok) {
      console.warn(`[OGame Nexus] Failed to fetch production queue (HTTP ${res.status})`);
      return null;
    }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

const OGAME_TECH_TOKENS: Record<string, number> = {
  // Mines & Facilities
  'metalmine': 1, 'supply1': 1,
  'crystalmine': 2, 'supply2': 2,
  'deuteriumsynthesizer': 3, 'deuteriummine': 3, 'supply3': 3,
  'solarplant': 4, 'fusionplant': 12, 'fusionreactor': 12,
  'roboticsfactory': 14, 'nanitefactory': 15, 'shipyard': 21,
  'metalstorage': 22, 'crystalstorage': 23, 'deuteriumstorage': 24, 'deuteriumtank': 24,
  'researchlaboratory': 31, 'researchlab': 31, 'terraformer': 33, 'alliancedepot': 34,
  'spacedock': 36, 'lunarbase': 41, 'sensorphalanx': 42, 'jumpgate': 43, 'missilesilo': 44,

  // Research
  'espionagetechnology': 106, 'computertechnology': 108, 'weaponstechnology': 109,
  'shieldingtechnology': 110, 'armourtechnology': 111, 'energytechnology': 113,
  'hyperspacetechnology': 114, 'combustiondrive': 115, 'impulsedrive': 117,
  'hyperspacedrive': 118, 'lasertechnology': 120, 'iontechnology': 121,
  'plasmatechnology': 122, 'intergalacticresearchnetwork': 123, 'astrophysics': 124,
  'gravitontechnology': 199,

  // Ships
  'smallcargo': 202, 'largecargo': 203, 'lightfighter': 204, 'heavyfighter': 205,
  'cruiser': 206, 'battleship': 207, 'colonyship': 208, 'recycler': 209,
  'espionageprobe': 210, 'bomber': 211, 'solarsatellite': 212, 'destroyer': 213,
  'deathstar': 214, 'battlecruiser': 215, 'crawler': 217, 'reaper': 218, 'pathfinder': 219,

  // Defense
  'rocketlauncher': 401, 'lightlaser': 402, 'heavylaser': 403, 'gausscannon': 404,
  'ioncannon': 405, 'plasmaturret': 406, 'smallshielddome': 407, 'largeshielddome': 408,
  'antiballisticmissile': 502, 'antiballisticmissiles': 502,
  'interplanetarymissile': 503, 'interplanetarymissiles': 503
};

    // Build planet coordinate/name map from sidebar if available
    const planetMap: Record<string, { name: string; coords: string }> = {};
    document.querySelectorAll('#planetList .smallplanet, .smallplanet').forEach(el => {
      const pId = el.id?.replace(/\D/g, '') || el.getAttribute('data-planet-id')?.replace(/\D/g, '');
      const name = el.querySelector('.planet-name')?.textContent?.trim() || 'Planet';
      const coords = el.querySelector('.planet-koords')?.textContent?.trim() || '';
      if (pId) {
        planetMap[pId] = { name, coords };
      }
    });

    const items: ProductionQueueItem[] = [];
    let hasActiveResearch = false;

    // Parse all active production items
    doc.querySelectorAll('time[data-end], .countdown[data-end]').forEach(timeEl => {
      const cls = timeEl.className || '';
      const prodEl = timeEl.closest('.production') || timeEl.closest('.productionDetails') || timeEl.parentElement;
      const parentQueue = timeEl.closest('.singleQueue');
      const parentPlanet = timeEl.closest('.planetQueues');

      // Extract Planet Info & Planet ID
      const planetNameFromDoc = parentPlanet?.querySelector('.planetName')?.textContent?.trim() || '';
      const coordsFromDoc = parentPlanet?.querySelector('.planetCoods')?.textContent?.trim() || '';
      const targetUrl = parentQueue?.getAttribute('data-target-url') || '';
      let planetId = targetUrl.match(/cp=(\d+)/)?.[1] || '';
      if (!planetId && cls) {
        const idMatch = cls.match(/\d+/);
        if (idMatch) planetId = idMatch[0];
      }

      // Extract Universal Tech ID from <technology-icon>
      const iconEl = prodEl?.querySelector('technology-icon') || prodEl?.querySelector('.productionIcon *');
      const iconHtml = iconEl ? iconEl.outerHTML : (prodEl?.querySelector('.productionIcon')?.outerHTML || '');
      
      let techId: number | undefined = undefined;
      const lfTechMatch = iconHtml.match(/lifeformtech(\d+)/i);
      const lfBuildMatch = iconHtml.match(/lifeformbuilding(\d+)/i);
      const standardTechMatch = iconHtml.match(/(?:^|\s|["'_])tech(\d+)/i);

      if (lfTechMatch) {
        techId = parseInt(lfTechMatch[1], 10);
      } else if (lfBuildMatch) {
        techId = parseInt(lfBuildMatch[1], 10);
      } else if (standardTechMatch) {
        techId = parseInt(standardTechMatch[1], 10);
      } else {
        const attrTokens = (iconHtml.toLowerCase().match(/[a-z0-9]+/g) || []);
        for (const token of attrTokens) {
          if (OGAME_TECH_TOKENS[token] !== undefined) {
            techId = OGAME_TECH_TOKENS[token];
            break;
          }
        }
      }

      // Extract Name
      const nameEl = prodEl?.querySelector('.productionName');
      let name = '';
      if (nameEl) {
        const clone = nameEl.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.productionLevel, span').forEach(s => s.remove());
        name = clone.textContent?.trim() || '';
      }
      if (!name) {
        name = prodEl?.querySelector('.productionName')?.childNodes[0]?.textContent?.trim() || 'Unknown';
      }

      // Extract Level
      const levelRaw = prodEl?.querySelector('.productionLevel')?.textContent?.trim() || '';
      const levelNum = parseInt(levelRaw.replace(/\D/g, ''), 10);
      const level = !isNaN(levelNum) ? levelNum : undefined;
      const levelText = levelRaw || (level !== undefined ? `Lvl ${level}` : undefined);

      // Extract Timestamp
      const endSec = parseInt(timeEl.getAttribute('data-end') || '0', 10);
      const endTimestamp = endSec > 0 ? endSec * 1000 : 0;

      // Extract Queue Type & Category
      let type: ProductionQueueType = 'building';
      let typeLabel = 'Base Building';
      const lowerCls = cls.toLowerCase();

      if (lowerCls.includes('lifeformresearch') || (techId && techId > 10000 && String(techId)[2] === '2')) {
        type = 'lifeform_research';
        typeLabel = 'LF Research';
      } else if (lowerCls.includes('lifeformbuilding') || (techId && techId > 10000 && String(techId)[2] === '1')) {
        type = 'lifeform_building';
        typeLabel = 'LF Building';
      } else if (lowerCls.includes('ship_2nd')) {
        type = 'mecha_shipyard';
        typeLabel = 'Mecha Shipyard';
      } else if (lowerCls.includes('ship') || (techId && techId >= 200 && techId < 300)) {
        type = 'shipyard';
        typeLabel = 'Shipyard';
      } else if (lowerCls.includes('research') || (techId && techId >= 100 && techId < 200)) {
        type = 'research';
        typeLabel = 'Research';
        hasActiveResearch = true;
        planetId = 'global';
      } else if (lowerCls.includes('building') || (techId && techId >= 1 && techId < 100)) {
        type = 'building';
        typeLabel = 'Base Building';
      }

      if (!planetId) {
        planetId = (type === 'research' ? 'global' : 'unknown');
      }

      const planetInfo = planetMap[planetId];
      const finalCoords = coordsFromDoc || planetInfo?.coords;
      const finalPlanetName = planetNameFromDoc || planetInfo?.name;

      items.push({
        type,
        typeLabel,
        planetId,
        planetName: finalPlanetName,
        coords: finalCoords,
        itemName: name,
        level,
        levelText,
        endTimestamp,
        techId
      });
    });

    // Sort by soonest completion
    items.sort((a, b) => a.endTimestamp - b.endTimestamp);

    // Calculate server time offset to ensure countdowns match OGame's clock down to the exact second
    let serverTimeOffset = 0;
    try {
      const dateHeader = res.headers.get('date');
      if (dateHeader) {
        const serverMs = Date.parse(dateHeader);
        if (!isNaN(serverMs) && serverMs > 0) {
          serverTimeOffset = serverMs - Date.now();
        }
      }
      if (!serverTimeOffset) {
        const metaTs = document.querySelector("meta[name='ogame-timestamp']")?.getAttribute("content");
        if (metaTs) {
          const metaMs = Number(metaTs) * 1000;
          if (!isNaN(metaMs) && metaMs > 0) {
            serverTimeOffset = metaMs - Date.now();
          }
        }
      }
    } catch (e) {}

    const queueData: EmpireProductionQueueData = {
      items,
      lastUpdated: Date.now(),
      hasActiveResearch,
      serverTimeOffset
    };

    // Save to local storage (both global and player-specific keys)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        'nexus_production_queue': queueData,
        'nexus_production_queue_time': Date.now(),
        'nexus_server_time_offset': serverTimeOffset,
        [storageKey]: queueData
      });
    }

    // Notify background script
    if (targetPlayerId && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'UPDATE_PRODUCTION_QUEUE',
          playerId: targetPlayerId,
          productionQueue: queueData
        }, () => {});
      } catch (e) {}
    }

    console.log(`[OGame Nexus] Empire Production Queue updated: ${items.length} in-progress items tracked.`);

    return queueData;
  } catch (err: any) {
    if (!err?.message?.includes('Extension context invalidated')) {
      console.error('[OGame Nexus] Error during fetchEmpireProductionQueue', err);
    }
    return null;
  }
}

/**
 * Retrieves the cached production queue data for the player from local storage.
 */
export async function getStoredProductionQueue(playerId?: string): Promise<EmpireProductionQueueData | null> {
  const targetPlayerId = playerId || document.querySelector("meta[name='ogame-player-id']")?.getAttribute("content") || '';

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage && chrome.storage.local) {
      const storageKey = targetPlayerId ? `nexus_production_queue_${targetPlayerId}` : 'nexus_production_queue';
      const result = await chrome.storage.local.get(storageKey);
      if (result && result[storageKey]) {
        return result[storageKey] as EmpireProductionQueueData;
      }
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.error('[OGame Nexus] Error reading stored production queue', e);
    }
  }

  return null;
}
