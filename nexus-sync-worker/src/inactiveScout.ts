// ============================================================================
// NEXUS OVERWATCH — INACTIVE TARGET SCOUT ENGINE
// ============================================================================
// Compares official universe baseline planets against player's synced Raid Radar
// to detect unscouted, high-value inactive farming targets in the universe.
// Integrates official Gameforge highscore ranks for optimal target prioritization.

import { json } from 'itty-router';
import { Env } from './index';
import { cleanUniverseId } from './universeSeeder';
import { getUniverseDb } from './dbRouter';

interface HighscoreEntry {
  rank: number;
  score: number;
}

// In-memory 1-hour cache for universe highscores (strictly bounded)
const MAX_HIGHSCORE_CACHE_ENTRIES = 10;
const HIGHSCORE_CACHE = new Map<string, { timestamp: number; map: Map<string, HighscoreEntry> }>();
const HIGHSCORE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function setBoundedHighscoreCache(universeId: string, data: { timestamp: number; map: Map<string, HighscoreEntry> }) {
  if (HIGHSCORE_CACHE.size >= MAX_HIGHSCORE_CACHE_ENTRIES) {
    const oldestKey = HIGHSCORE_CACHE.keys().next().value;
    if (oldestKey) HIGHSCORE_CACHE.delete(oldestKey);
  }
  HIGHSCORE_CACHE.set(universeId, data);
}

// In-memory 5-minute cache for baseline inactive targets (strictly bounded)
const MAX_BASELINE_CACHE_ENTRIES = 15;
interface CachedBaseline {
  timestamp: number;
  galaxies: number;
  targets: any[];
}
const BASELINE_CACHE = new Map<string, CachedBaseline>();
const BASELINE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function setBoundedBaselineCache(key: string, data: CachedBaseline) {
  if (BASELINE_CACHE.size >= MAX_BASELINE_CACHE_ENTRIES) {
    const oldestKey = BASELINE_CACHE.keys().next().value;
    if (oldestKey) BASELINE_CACHE.delete(oldestKey);
  }
  BASELINE_CACHE.set(key, data);
}

/**
 * Fetch and parse player highscores from official Gameforge API
 */
async function getUniverseHighscores(universeId: string): Promise<Map<string, HighscoreEntry>> {
  const cached = HIGHSCORE_CACHE.get(universeId);
  if (cached && Date.now() - cached.timestamp < HIGHSCORE_CACHE_TTL_MS) {
    return cached.map;
  }

  const map = new Map<string, HighscoreEntry>();

  try {
    const url = `https://${universeId}.ogame.gameforge.com/api/highscore.xml?category=1&type=0&toJson=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OGameNexus-Sync/1.2.5' },
    });

    if (res.ok) {
      const data: any = await res.json();
      const rawPlayers = data?.player || [];
      const playerList = Array.isArray(rawPlayers) ? rawPlayers : [rawPlayers];

      for (const item of playerList) {
        const attr = item?.['@attributes'] || item;
        if (attr?.id) {
          map.set(String(attr.id), {
            rank: parseInt(String(attr.position || '0'), 10),
            score: parseInt(String(attr.score || '0'), 10),
          });
        }
      }

      setBoundedHighscoreCache(universeId, {
        timestamp: Date.now(),
        map,
      });
    }
  } catch (err) {
    console.warn(`[InactiveScout] Failed to fetch highscores for ${universeId}:`, err);
  }

  return map;
}

/**
 * GET /api/v1/tools/inactive-scout
 * Query Params:
 *  - universeId (e.g. "s199-en")
 *  - playerId (e.g. "123456")
 *  - excludeVacation ("true" | "false", default: "true")
 *  - galaxy (optional 1-9)
 */
export async function handleInactiveScout(req: Request, env: Env) {
  try {
    const url = new URL(req.url);
    const universeId = cleanUniverseId(url.searchParams.get('universeId') || 's267-en');
    const playerId = (url.searchParams.get('playerId') || '').trim();
    const excludeVacation = url.searchParams.get('excludeVacation') !== 'false';
    const galaxyParam = url.searchParams.get('galaxy');
    let galaxyFilter: number | null = null;
    if (galaxyParam) {
      const parsed = parseInt(galaxyParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 9) {
        galaxyFilter = parsed;
      }
    }

    if (!/^s\d+-[a-z]+$/.test(universeId)) {
      return json({ error: 'Invalid universe format. Expected format: s<number>-<lang>, e.g. s267-en.' }, { status: 400 });
    }

    const db = getUniverseDb(env, universeId);
    const now = Date.now();

    // 1. Fetch Universe Info for total galaxies
    let universeGalaxies = 5;
    try {
      const info = await db
        .prepare('SELECT galaxies FROM universe_info WHERE universe_id = ?')
        .bind(universeId)
        .first<{ galaxies: number }>();
      if (info?.galaxies && Number(info.galaxies) > 0) {
        universeGalaxies = Number(info.galaxies);
      }
    } catch (e) {
      console.warn('[InactiveScout] Could not query universe_info:', e);
    }

    // 2. Retrieve or compute baseline inactive targets from 5-minute bounded memory cache
    const cacheKey = `${universeId}:${excludeVacation}:${galaxyFilter || 'all'}`;
    let baselineTargets: any[] = [];
    const cachedBaseline = BASELINE_CACHE.get(cacheKey);

    if (cachedBaseline && (now - cachedBaseline.timestamp) < BASELINE_CACHE_TTL_MS) {
      baselineTargets = cachedBaseline.targets;
    } else {
      // Query canonical universe_baseline_planets directly using idx_baseline_status
      let query = `
        SELECT 
          galaxy, system, slot,
          planet_id as planetId,
          planet_name as planetName,
          player_id as playerId,
          player_name as playerName,
          player_status as playerStatus,
          alliance_tag as allianceTag,
          has_moon as hasMoon,
          moon_size as moonSize,
          last_updated_at as lastUpdatedAt
        FROM universe_baseline_planets
        WHERE universe_id = ?
          AND player_id IS NOT NULL
          AND player_id != ''
          AND (player_status GLOB '*i*' OR player_status GLOB '*I*')
      `;

      const bindings: any[] = [universeId];

      if (excludeVacation) {
        query += ` AND (player_status NOT GLOB '*v*')`;
      }

      if (galaxyFilter !== null) {
        query += ` AND galaxy = ?`;
        bindings.push(galaxyFilter);
      }

      query += ` ORDER BY galaxy ASC, system ASC, slot ASC`;

      const result: any = await db.prepare(query).bind(...bindings).all();
      baselineTargets = result.results || [];

      setBoundedBaselineCache(cacheKey, {
        timestamp: now,
        galaxies: universeGalaxies,
        targets: baselineTargets,
      });
    }

    // 3. Concurrently fetch highscore map and the user's specific radar overlay (indexed by universe_id, player_id)
    const [highscoreMap, userRadarResult] = await Promise.all([
      getUniverseHighscores(universeId),
      playerId
        ? db
            .prepare(`
              SELECT coords, planet_id as planetId,
                     production_msu_per_hour as radarProductionMsu,
                     last_spied_timestamp as radarLastSpied
              FROM personal_vault_radar
              WHERE universe_id = ? AND player_id = ?
            `)
            .bind(universeId, playerId)
            .all()
        : Promise.resolve({ results: [] }),
    ]);

    // Build index lookup map for user's personal radar targets
    const radarByCoords = new Map<string, any>();
    const radarByPlanetId = new Map<string, any>();
    const userRadarRows: any[] = (userRadarResult as any)?.results || [];

    for (const r of userRadarRows) {
      if (r.coords) {
        // Coords are guaranteed clean "G:S:P"
        const cleanCoords = String(r.coords).replace(/[\[\]\s]/g, '').trim();
        radarByCoords.set(cleanCoords, r);
      }
      if (r.planetId && r.planetId !== '0') {
        radarByPlanetId.set(String(r.planetId), r);
      }
    }

    // 4. Overlay user's radar coverage onto cached baseline targets
    let totalInactives = 0;
    let coveredCount = 0;
    let uncoveredCount = 0;

    const targets = baselineTargets.map((r: any) => {
      totalInactives++;
      const targetCoords = `${r.galaxy}:${r.system}:${r.slot}`;
      const radar = (r.planetId && radarByPlanetId.get(String(r.planetId))) || radarByCoords.get(targetCoords);
      const isCovered = Boolean(radar);

      if (isCovered) {
        coveredCount++;
      } else {
        uncoveredCount++;
      }

      const hs = highscoreMap.get(String(r.playerId));
      return {
        galaxy: Number(r.galaxy),
        system: Number(r.system),
        slot: Number(r.slot),
        coords: targetCoords,
        planetId: r.planetId,
        planetName: r.planetName || 'Homeworld',
        playerId: r.playerId,
        playerName: r.playerName || 'Commander',
        playerStatus: r.playerStatus,
        allianceTag: r.allianceTag && r.allianceTag !== 'null' ? r.allianceTag : null,
        hasMoon: Boolean(r.hasMoon),
        moonSize: r.moonSize ? Number(r.moonSize) : null,
        lastUpdatedAt: r.lastUpdatedAt,
        isCovered,
        radarProductionMsu: radar?.radarProductionMsu || 0,
        radarLastSpied: radar?.radarLastSpied || 0,
        playerRank: hs ? hs.rank : null,
        playerScore: hs ? hs.score : null,
      };
    });

    const coverageRate = totalInactives > 0 ? Math.round((coveredCount / totalInactives) * 1000) / 10 : 0;

    return json({
      success: true,
      universeId,
      galaxies: universeGalaxies,
      stats: {
        totalInactives,
        covered: coveredCount,
        uncovered: uncoveredCount,
        coverageRate,
      },
      targets,
    });
  } catch (err: any) {
    console.error('Error in inactive scout:', err);
    return json({ error: 'Failed to scout inactives', details: err.message }, { status: 500 });
  }
}
