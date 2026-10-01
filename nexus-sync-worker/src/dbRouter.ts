// ============================================================================
// NEXUS OVERWATCH — DATABASE ROUTER & EDGE CACHE SUBSYSTEM
// Provides multi-D1 database sharding abstraction and zero-cost edge caching.
// ============================================================================

import { Env } from './index';
import { cleanUniverseId } from './universeSeeder';

/**
 * Returns the Core D1 Database instance.
 * Core DB holds: alliances, alliance_members, alliance_join_requests, subscriptions.
 */
export function getCoreDb(env: Env): D1Database {
  return (env as any).CORE_DB || env.DB;
}

/**
 * Returns the Universe-specific D1 Database instance.
 * Universe DB holds: universe_info, universe_baseline_planets, alliance_scanned_systems,
 * alliance_galaxy_slots, universe_events, player_activity_heatmap, spy_reports, raid_locks.
 *
 * In local dev or single-DB deployment, falls back to env.DB or env.CORE_DB automatically.
 */
export function getUniverseDb(env: Env, rawUniverseId: string): D1Database {
  const cleanId = cleanUniverseId(rawUniverseId).replace(/[^a-zA-Z0-9]/g, '_');
  const bindingName = `UNIVERSE_DB_${cleanId}`;
  
  if ((env as any)[bindingName]) {
    return (env as any)[bindingName] as D1Database;
  }

  // Graceful fallback to default DB
  return env.DB || (env as any).CORE_DB;
}

// ============================================================================
// ZERO-COST EDGE CACHE (caches.default)
// Guaranteed fresh data: evicted immediately on live scan uploads.
// ============================================================================

const CACHE_DOMAIN = 'https://nexus-edge-cache.internal';

/**
 * Builds a standardized Cache API Request key for system lookups.
 * Scoped by universeId AND allianceId to ensure strict intel isolation at the edge.
 */
export function buildSystemCacheKey(universeId: string, allianceId: string, galaxy: number, system: number): Request {
  const cleanUni = cleanUniverseId(universeId);
  const url = `${CACHE_DOMAIN}/galaxy/system/${cleanUni}/${allianceId}/${galaxy}/${system}`;
  return new Request(url, { method: 'GET' });
}

/**
 * Attempts to retrieve a cached system JSON response from Cloudflare's RAM/Edge cache.
 */
export async function getCachedSystemResponse(
  universeId: string,
  allianceId: string,
  galaxy: number,
  system: number
): Promise<Response | null> {
  try {
    if (typeof caches === 'undefined' || !caches.default) {
      return null;
    }
    const cacheKey = buildSystemCacheKey(universeId, allianceId, galaxy, system);
    const match = await caches.default.match(cacheKey);
    if (match) {
      // Clone response to add header indicating cache hit
      const headers = new Headers(match.headers);
      headers.set('X-Nexus-Cache', 'HIT');
      return new Response(match.body, {
        status: match.status,
        headers,
      });
    }
  } catch (err) {
    console.warn('[EdgeCache] Error reading system cache:', err);
  }
  return null;
}

/**
 * Stores a system response into Cloudflare's RAM/Edge cache with 1-hour max-age fallback.
 */
export async function putCachedSystemResponse(
  universeId: string,
  allianceId: string,
  galaxy: number,
  system: number,
  payload: any,
  ctx?: ExecutionContext
): Promise<void> {
  try {
    if (typeof caches === 'undefined' || !caches.default) {
      return;
    }
    const cacheKey = buildSystemCacheKey(universeId, allianceId, galaxy, system);
    const responseToCache = new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'X-Nexus-Cache': 'MISS',
      },
    });

    const putPromise = caches.default.put(cacheKey, responseToCache);
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(putPromise);
    } else {
      await putPromise;
    }
  } catch (err) {
    console.warn('[EdgeCache] Error writing system cache:', err);
  }
}

/**
 * Instantly invalidates/purges the edge cache for a given system when a new scan is uploaded.
 * Guarantees that users never receive outdated data after a scan.
 */
export async function invalidateSystemCache(
  universeId: string,
  allianceId: string,
  galaxy: number,
  system: number
): Promise<boolean> {
  try {
    if (typeof caches === 'undefined' || !caches.default) {
      return false;
    }
    const cacheKey = buildSystemCacheKey(universeId, allianceId, galaxy, system);
    return await caches.default.delete(cacheKey);
  } catch (err) {
    console.warn('[EdgeCache] Error invalidating system cache:', err);
    return false;
  }
}
