// ============================================================================
// NEXUS OVERWATCH — OFFICIAL GAMEFORGE HIGHSCORE ENGINE
// Fetches, parses, and caches official Gameforge highscores via JSON API routes:
// - Category 1, Type 0: Total Score & Rank
// - Category 1, Type 1: Economy Score & Rank
// - Category 1, Type 2: Research Score & Rank
// - Category 1, Type 3: Military Score, Rank & Ship Count
// ============================================================================

import { cleanUniverseId } from './universe';

export interface HighscoreRecord {
  rank: number;
  score: number;
  ships?: number;
}

export interface PlayerHighscores {
  totalScore?: number;
  totalRank?: number;
  economyScore?: number;
  economyRank?: number;
  researchScore?: number;
  researchRank?: number;
  militaryScore?: number;
  militaryRank?: number;
  ships?: number;
}

const HIGHSCORE_MEM_CACHE = new Map<string, { timestamp: number; map: Map<string, HighscoreRecord> }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute memory cache
const MAX_CACHE_ENTRIES = 20;

function setBoundedCache(key: string, data: { timestamp: number; map: Map<string, HighscoreRecord> }) {
  if (HIGHSCORE_MEM_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = HIGHSCORE_MEM_CACHE.keys().next().value;
    if (oldestKey) HIGHSCORE_MEM_CACHE.delete(oldestKey);
  }
  HIGHSCORE_MEM_CACHE.set(key, data);
}

/**
 * Fetches universe highscore map for a specific highscore type:
 * 0 = Total, 1 = Economy, 2 = Research, 3 = Military
 */
export async function fetchUniverseHighscores(
  universeId: string,
  type: number = 0
): Promise<Map<string, HighscoreRecord>> {
  const uId = cleanUniverseId(universeId);
  if (!uId) return new Map();

  const cacheKey = `${uId}_type_${type}`;
  const cached = HIGHSCORE_MEM_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.map;
  }

  const map = new Map<string, HighscoreRecord>();

  try {
    const url = `https://${uId}.ogame.gameforge.com/api/highscore.xml?category=1&type=${type}&toJson=1`;
    const res = await fetch(url);
    if (res.ok) {
      const data: any = await res.json();
      const rawPlayers = data?.player || [];
      const playerList = Array.isArray(rawPlayers) ? rawPlayers : [rawPlayers];

      for (const item of playerList) {
        const attr = item?.['@attributes'] || item;
        if (attr?.id) {
          const id = String(attr.id);
          const score = parseInt(String(attr.score || '0'), 10);
          const rank = parseInt(String(attr.position || '0'), 10);
          const ships = attr.ships !== undefined ? parseInt(String(attr.ships || '0'), 10) : undefined;

          map.set(id, {
            rank: isNaN(rank) ? 0 : rank,
            score: isNaN(score) ? 0 : score,
            ships: ships !== undefined && !isNaN(ships) ? ships : undefined,
          });
        }
      }

      setBoundedCache(cacheKey, { timestamp: Date.now(), map });
    }
  } catch (err) {
    console.warn(`[HighscoreEngine] Failed to fetch highscores (type ${type}) for ${uId}:`, err);
  }

  return map;
}

/**
 * Fetches highscores for a specific player across Economy (type 1) and Military (type 3).
 * Optionally also checks Total (type 0) if fetchTotal is true.
 */
export async function fetchPlayerHighscores(
  universeId: string,
  playerId: string,
  fetchTotal: boolean = false
): Promise<PlayerHighscores> {
  const promises: [
    Promise<Map<string, HighscoreRecord>>,
    Promise<Map<string, HighscoreRecord>>,
    Promise<Map<string, HighscoreRecord> | null>
  ] = [
    fetchUniverseHighscores(universeId, 1),
    fetchUniverseHighscores(universeId, 3),
    fetchTotal ? fetchUniverseHighscores(universeId, 0) : Promise.resolve(null),
  ];

  const [ecoMap, milMap, totalMap] = await Promise.all(promises);

  const pIdStr = String(playerId);
  const eco = ecoMap.get(pIdStr);
  const mil = milMap.get(pIdStr);
  const tot = totalMap ? totalMap.get(pIdStr) : undefined;

  return {
    totalScore: tot?.score,
    totalRank: tot?.rank,
    economyScore: eco?.score,
    economyRank: eco?.rank,
    militaryScore: mil?.score,
    militaryRank: mil?.rank,
    ships: mil?.ships,
  };
}
