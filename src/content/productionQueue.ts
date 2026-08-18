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

    // Parse all countdown / data-end time elements
    doc.querySelectorAll('time[data-end], .countdown[data-end]').forEach(timeEl => {
      const cls = timeEl.className || '';
      const details = timeEl.closest('.productionDetails') || timeEl.closest('.production');

      // Extract Name
      const nameEl = details?.querySelector('.productionName');
      let name = '';
      if (nameEl) {
        const clone = nameEl.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.productionLevel, span').forEach(s => s.remove());
        name = clone.textContent?.trim() || '';
      }
      if (!name) {
        name = details?.querySelector('.productionName')?.childNodes[0]?.textContent?.trim() || 'Unknown';
      }

      // Extract Level
      const levelRaw = details?.querySelector('.productionLevel')?.textContent?.trim() || '';
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

      if (lowerCls.includes('lifeformresearch')) {
        type = 'lifeform_research';
        typeLabel = 'LF Research';
      } else if (lowerCls.includes('lifeformbuilding')) {
        type = 'lifeform_building';
        typeLabel = 'LF Building';
      } else if (lowerCls.includes('ship_2nd')) {
        type = 'mecha_shipyard';
        typeLabel = 'Mecha Shipyard';
      } else if (lowerCls.includes('ship')) {
        type = 'shipyard';
        typeLabel = 'Shipyard';
      } else if (lowerCls.includes('research')) {
        type = 'research';
        typeLabel = 'Research';
        hasActiveResearch = true;
      } else if (lowerCls.includes('building')) {
        type = 'building';
        typeLabel = 'Base Building';
      }

      // Extract Planet ID from class (e.g. Building33700826 -> 33700826)
      const idMatch = cls.match(/\d+/);
      const planetId = idMatch ? idMatch[0] : (type === 'research' ? 'global' : 'unknown');
      const planetInfo = planetMap[planetId];

      items.push({
        type,
        typeLabel,
        planetId,
        planetName: planetInfo?.name,
        coords: planetInfo?.coords,
        itemName: name,
        level,
        levelText,
        endTimestamp
      });
    });

    // Sort by soonest completion
    items.sort((a, b) => a.endTimestamp - b.endTimestamp);

    const queueData: EmpireProductionQueueData = {
      items,
      lastUpdated: Date.now(),
      hasActiveResearch
    };

    // Save to local storage (both global and player-specific keys)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        'nexus_production_queue': queueData,
        'nexus_production_queue_time': Date.now(),
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
