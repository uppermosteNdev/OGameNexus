// ============================================================================
// NEXUS OVERWATCH — CLIENT-SIDE UNIVERSE BASELINE CACHE ENGINE
// Manages local IndexedDB caching of official Gameforge universe topology (~85 KB gzipped)
// Enables 0ms instantaneous Universe Map navigation and offline galaxy exploration.
// ============================================================================

import { db, UniverseBaselineSlot, UniverseBaselineSystem } from '../db';
import { cleanUniverseId } from './universe';
import { fetchOverwatch } from './overwatchApi';

const CACHE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface BaselineSyncResult {
  updated: boolean;
  universeId: string;
  count?: number;
  etag?: string;
  error?: string;
}

/**
 * Checks with Cloudflare Edge CDN whether a new universe baseline exists using HTTP ETag.
 * If 304 Not Modified, avoids any data transfer.
 * If 200 OK, decompresses and stores all occupied solar systems in Dexie DB (Schema v39).
 */
export async function checkAndSyncUniverseBaseline(
  rawUniverseId: string,
  force = false
): Promise<BaselineSyncResult> {
  const universeId = cleanUniverseId(rawUniverseId);
  if (!universeId || universeId === 'unknown') {
    return { updated: false, universeId: 'unknown', error: 'Invalid universe ID' };
  }

  const storageKeyEtag = `nexus_baseline_etag_${universeId}`;
  const storageKeyLastChecked = `nexus_baseline_last_checked_${universeId}`;

  try {
    // 1. Check local throttling unless forced
    const stored = await chrome.storage.local.get([storageKeyEtag, storageKeyLastChecked]);
    const storedEtag: string | undefined = stored[storageKeyEtag];
    const lastChecked: number = stored[storageKeyLastChecked] || 0;
    const now = Date.now();

    if (!force && (now - lastChecked) < CACHE_CHECK_INTERVAL_MS) {
      // Check if we actually have data in Dexie for this universe
      const existingCount = await db.universeBaseline.where('universe').equals(universeId).count();
      if (existingCount > 0) {
        return { updated: false, universeId, count: existingCount, etag: storedEtag };
      }
    }

    // 2. Fetch baseline with conditional validation header
    const headers: Record<string, string> = {};
    if (storedEtag) {
      headers['If-None-Match'] = storedEtag;
    }

    const res = await fetchOverwatch(`/api/v1/universe/${universeId}/baseline`, {
      method: 'GET',
      headers,
    });

    if (res.status === 304) {
      // Server confirmed local cache is up-to-date!
      await chrome.storage.local.set({ [storageKeyLastChecked]: now });
      return { updated: false, universeId, etag: storedEtag };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { updated: false, universeId, error: `HTTP ${res.status}: ${errText}` };
    }

    // 3. Status 200 OK — parse payload (handles both browser auto-decompressed JSON and raw GZIP streams)
    const newEtag = res.headers.get('etag') || res.headers.get('ETag') || `"${now}"`;

    let data: any;
    try {
      const buffer = await res.arrayBuffer();
      const u8 = new Uint8Array(buffer);
      let text: string;

      // Check for GZIP magic header bytes: 0x1F (31), 0x8B (139)
      if (u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b) {
        if (typeof DecompressionStream !== 'undefined') {
          const stream = new Response(u8).body?.pipeThrough(new DecompressionStream('gzip'));
          if (!stream) throw new Error('DecompressionStream unavailable');
          text = await new Response(stream).text();
        } else {
          throw new Error('Browser lacks DecompressionStream support for GZIP payload');
        }
      } else {
        text = new TextDecoder().decode(u8);
      }

      data = JSON.parse(text);
    } catch (parseErr: any) {
      console.error(`[UniverseBaseline] Failed to parse baseline payload for ${universeId}:`, parseErr);
      return { updated: false, universeId, error: `Payload parse error: ${parseErr.message}` };
    }

    if (!data || !Array.isArray(data.planets)) {
      return { updated: false, universeId, error: 'Invalid baseline JSON payload received' };
    }

    // 4. Group incoming planets by galaxy:system
    const systemsMap = new Map<string, UniverseBaselineSlot[]>();
    for (const p of data.planets) {
      const g = Number(p.g);
      const s = Number(p.s);
      const slot = Number(p.slot);
      if (isNaN(g) || isNaN(s) || isNaN(slot)) continue;

      const key = `${g}:${s}`;
      let list = systemsMap.get(key);
      if (!list) {
        list = [];
        systemsMap.set(key, list);
      }

      list.push({
        slot,
        planetId: String(p.pid || ''),
        planetName: String(p.pname || 'Planet'),
        playerId: String(p.uid || ''),
        playerName: String(p.uname || 'Unknown'),
        playerStatus: String(p.status || 'active'),
        allianceTag: p.tag ? String(p.tag) : undefined,
        hasMoon: !!p.moon,
        moonId: p.mid ? String(p.mid) : undefined,
        moonSize: p.msize ? Number(p.msize) : undefined,
      });
    }

    // 5. Build synthesized UniverseBaselineSystem records (filling empty slots 1..15)
    const baselineSystems: UniverseBaselineSystem[] = [];
    for (const [key, slots] of systemsMap.entries()) {
      const [g, s] = key.split(':').map(Number);
      const slotMap = new Map<number, UniverseBaselineSlot>();
      slots.forEach(slotItem => slotMap.set(slotItem.slot, slotItem));

      const fullSlots: UniverseBaselineSlot[] = [];
      for (let sl = 1; sl <= 15; sl++) {
        if (slotMap.has(sl)) {
          fullSlots.push(slotMap.get(sl)!);
        } else {
          // Synthetic empty slot for zero-cost sparse rendering
          fullSlots.push({
            slot: sl,
            planetId: '',
            planetName: '',
            playerId: '',
            playerName: '',
            playerStatus: '',
            hasMoon: false,
          });
        }
      }

      baselineSystems.push({
        universe: universeId,
        galaxy: g,
        system: s,
        slots: fullSlots,
        lastUpdated: now,
      });
    }

    // 6. Bulk commit to Dexie in an atomic transaction
    await db.transaction('rw', db.universeBaseline, async () => {
      await db.universeBaseline.where('universe').equals(universeId).delete();
      await db.universeBaseline.bulkPut(baselineSystems);
    });

    // 7. Persist sync metadata
    await chrome.storage.local.set({
      [storageKeyEtag]: newEtag,
      [storageKeyLastChecked]: now,
    });

    console.log(`[UniverseBaseline] Cached ${baselineSystems.length} solar systems (${data.planets.length} occupied planets) in local Dexie for ${universeId}`);

    return {
      updated: true,
      universeId,
      count: baselineSystems.length,
      etag: newEtag,
    };
  } catch (err: any) {
    console.error(`[UniverseBaseline] Error syncing baseline for ${universeId}:`, err);
    return { updated: false, universeId, error: err?.message || 'Sync failed' };
  }
}

/**
 * Instant synchronous/0ms lookup of a solar system from local Dexie IndexedDB.
 */
export async function getBaselineSystem(
  rawUniverseId: string,
  galaxy: number,
  system: number
): Promise<UniverseBaselineSlot[] | null> {
  const universeId = cleanUniverseId(rawUniverseId);
  try {
    const record = await db.universeBaseline.get([universeId, galaxy, system]);
    return record?.slots || null;
  } catch (err) {
    console.warn(`[UniverseBaseline] Local lookup failed for [${universeId}:${galaxy}:${system}]:`, err);
    return null;
  }
}

/**
 * Checks if the given universe topology is currently cached locally.
 */
export async function isBaselineCached(rawUniverseId: string): Promise<boolean> {
  const universeId = cleanUniverseId(rawUniverseId);
  try {
    const count = await db.universeBaseline.where('universe').equals(universeId).count();
    return count > 0;
  } catch {
    return false;
  }
}
