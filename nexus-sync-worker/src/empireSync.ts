// ============================================================================
// NEXUS OVERWATCH — ALLIANCE EMPIRE SYNC & AGGREGATION
// ============================================================================

import { json } from 'itty-router';
import { z } from 'zod';
import { Env } from './index';
import { authenticateMember } from './galaxySync';
import { getUniverseHighscores } from './inactiveScout';

export const SyncEmpirePayloadSchema = z.object({
  playerId: z.string().optional(),
  playerName: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  playerClass: z.number().int().optional().default(0),
  allianceClass: z.number().int().optional().default(0),
  totalScore: z.number().default(0),
  economyScore: z.number().default(0),
  militaryScore: z.number().default(0),
  researchScore: z.number().default(0),
  summary: z.object({
    planetCount: z.number().default(0),
    moonCount: z.number().default(0),
    totalMines: z.number().default(0),
    totalShips: z.number().default(0),
    totalFleetMsu: z.number().optional().default(0),
    avgMetalMine: z.number().default(0),
    avgCrystalMine: z.number().default(0),
    avgDeutMine: z.number().default(0),
    totalMetalHourly: z.number().optional().default(0),
    totalCrystalHourly: z.number().optional().default(0),
    totalDeutHourly: z.number().optional().default(0),
  }),
  dataHash: z.string().min(1),
  empire: z.any(), // Structured planets, facilities, research, lifeform tech setups
});

export type SyncEmpirePayload = z.infer<typeof SyncEmpirePayloadSchema>;

const SHIP_MSU_COSTS: Record<number, number> = {
  202: 5000,
  203: 15000,
  204: 4500,
  205: 12000,
  206: 36500,
  207: 67500,
  208: 70000,
  209: 25000,
  210: 1500,
  211: 132500,
  212: 4500,
  213: 180000,
  214: 14000000,
  215: 135000,
  217: 8000,
  218: 227500,
  219: 54500,
};

function calculateFleetMsuFromPlanets(planets: any[]): number {
  if (!Array.isArray(planets)) return 0;
  let totalMsu = 0;
  planets.forEach(p => {
    if (p && p.ships) {
      Object.entries(p.ships).forEach(([shipId, count]) => {
        const c = Number(count) || 0;
        if (c > 0) {
          const cost = SHIP_MSU_COSTS[Number(shipId)] || 0;
          totalMsu += c * cost;
        }
      });
    }
  });
  return totalMsu;
}

const WORKER_STANDARD_RESEARCHES: Record<number, { m: number; c: number; d: number; factor: number }> = {
  115: { m: 400, c: 0, d: 600, factor: 2 },         // Combustion Drive
  117: { m: 2000, c: 4000, d: 600, factor: 2 },      // Impulse Drive
  118: { m: 10000, c: 20000, d: 6000, factor: 2 },   // Hyperspace Drive
  120: { m: 200, c: 100, d: 0, factor: 2 },          // Laser Tech
  121: { m: 1000, c: 300, d: 100, factor: 2 },       // Ion Tech
  113: { m: 0, c: 800, d: 400, factor: 2 },          // Energy Tech
  114: { m: 0, c: 4000, d: 2000, factor: 2 },        // Hyperspace Tech
  122: { m: 2000, c: 4000, d: 1000, factor: 2 },     // Plasma Tech
  106: { m: 200, c: 1000, d: 200, factor: 2 },       // Espionage Tech
  108: { m: 0, c: 400, d: 600, factor: 2 },          // Computer Tech
  109: { m: 800, c: 200, d: 0, factor: 2 },          // Weapons Tech
  110: { m: 200, c: 600, d: 0, factor: 2 },          // Shielding Tech
  111: { m: 1000, c: 0, d: 0, factor: 2 },          // Armour Tech
  124: { m: 4000, c: 8000, d: 4000, factor: 1.75 },  // Astrophysics
  123: { m: 240000, c: 400000, d: 160000, factor: 2 }, // IRN
  199: { m: 0, c: 0, d: 0, factor: 3 }               // Graviton
};

export function calculateWorkerResearchScore(researches?: Array<{ id: number; level: number }>): number {
  if (!researches || !Array.isArray(researches)) return 0;
  let totalResources = 0;
  for (const r of researches) {
    const lvl = Number(r.level) || 0;
    if (lvl <= 0) continue;
    const def = WORKER_STANDARD_RESEARCHES[Number(r.id)];
    if (!def) continue;

    if (Number(r.id) === 124) {
      for (let l = 1; l <= lvl; l++) {
        const f = Math.pow(1.75, l - 1);
        const m = Math.round((def.m * f) / 100) * 100;
        const c = Math.round((def.c * f) / 100) * 100;
        const d = Math.round((def.d * f) / 100) * 100;
        totalResources += (m + c + d);
      }
    } else if (def.factor === 2) {
      const sumFactor = Math.pow(2, lvl) - 1;
      totalResources += (def.m + def.c + def.d) * sumFactor;
    }
  }
  return Math.floor(totalResources / 1000);
}

/**
 * Handles POST /api/v1/overwatch/empire/sync
 * Securely syncs and aggregates a member's empire into Cloudflare D1.
 */
export async function handleEmpireSync(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    if (!member) {
      return json({ error: 'Unauthorized: Invalid or missing token.' }, { status: 401 });
    }
    if ('error' in member && member.error === 'subscription_expired') {
      return json({ error: 'Alliance subscription has expired.' }, { status: 403 });
    }

    // Check member's granular privacy toggles
    let permissions: any = {};
    try {
      permissions = JSON.parse(member.permissions_json || '{}');
    } catch (e) {}

    if (permissions.shareEmpire === false) {
      return json({ error: 'Member privacy setting prohibits sharing empire with alliance.' }, { status: 403 });
    }

    // Reject payloads exceeding 500KB
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 500 * 1024) {
      return json({ error: 'Payload Too Large: Empire sync request cannot exceed 500KB' }, { status: 413 });
    }

    const body = await req.json();
    const parseResult = SyncEmpirePayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return json({ error: 'Invalid empire payload', details: parseResult.error.format() }, { status: 400 });
    }

    const data = parseResult.data;
    const now = Date.now();
    const allianceId = member.alliance_id;
    const playerId = member.player_id; // Always bind to authenticated member

    // Strict multi-account security: prevent a client from uploading telemetry for an account different from the authenticated token
    if (data.playerId && String(data.playerId) !== String(member.player_id)) {
      return json({ error: 'Player ID mismatch: Authentication token does not belong to the payload player.' }, { status: 403 });
    }

    const playerName = member.player_name || data.playerName || 'Commander';

    // If alliance_members had a default or placeholder name, update it with the provided real player name
    if (data.playerName && (!member.player_name || member.player_name === 'Squadmate' || member.player_name === 'Commander')) {
      await env.DB.prepare(
        `UPDATE alliance_members SET player_name = ? WHERE alliance_id = ? AND player_id = ?`
      ).bind(data.playerName, allianceId, playerId).run();
    }

    // Check existing record for write cooldown (5 seconds minimum interval)
    const existing = await env.DB.prepare(
      `SELECT data_hash, last_synced_at FROM alliance_empires WHERE alliance_id = ? AND player_id = ?`
    ).bind(allianceId, playerId).first<{ data_hash: string; last_synced_at: number }>();

    if (existing?.last_synced_at && (now - existing.last_synced_at) < 5000) {
      const waitMs = 5000 - (now - existing.last_synced_at);
      return json({
        error: `Sync rate limit exceeded. Please wait ${Math.ceil(waitMs / 1000)}s between empire syncs.`,
        retryAfterMs: waitMs,
      }, { status: 429 });
    }

    let totalFleetMsu = data.summary.totalFleetMsu || 0;
    if (totalFleetMsu === 0 && data.empire?.planets) {
      totalFleetMsu = calculateFleetMsuFromPlanets(data.empire.planets);
    }
    let totalScore = data.totalScore || 0;
    let economyScore = data.economyScore || 0;
    let militaryScore = data.militaryScore || 0;

    if (member.universe_id) {
      try {
        const [hsMap, ecoMap, milMap] = await Promise.all([
          getUniverseHighscores(member.universe_id, 0),
          getUniverseHighscores(member.universe_id, 1),
          getUniverseHighscores(member.universe_id, 3),
        ]);

        const pIdStr = String(playerId);
        const hs = hsMap?.get(pIdStr);
        if (hs && hs.score > 0) totalScore = hs.score;

        const hsEco = ecoMap?.get(pIdStr);
        if (hsEco && hsEco.score > 0) economyScore = hsEco.score;

        const hsMil = milMap?.get(pIdStr);
        if (hsMil && hsMil.score > 0) militaryScore = hsMil.score;
      } catch (e) {}
    }

    const avatarUrl = data.avatarUrl || null;

    if (existing && existing.data_hash === data.dataHash) {
      // Touch last_synced_at without expensive json rewrite, and update total_fleet_msu / avatar_url / total_score / economy_score / military_score
      await env.DB.prepare(
        `UPDATE alliance_empires 
         SET last_synced_at = ?,
             total_fleet_msu = CASE WHEN (total_fleet_msu IS NULL OR total_fleet_msu = 0) THEN ? ELSE total_fleet_msu END,
             total_score = COALESCE(NULLIF(?, 0), total_score),
             economy_score = COALESCE(NULLIF(?, 0), economy_score),
             military_score = COALESCE(NULLIF(?, 0), military_score),
             avatar_url = COALESCE(avatar_url, ?)
         WHERE alliance_id = ? AND player_id = ?`
      ).bind(now, totalFleetMsu, totalScore, economyScore, militaryScore, avatarUrl, allianceId, playerId).run();

      return json({ success: true, updated: false, unchanged: true, syncedAt: now });
    }
    const empireJsonStr = JSON.stringify(data.empire);
    let finalResearchScore = data.researchScore || 0;
    if (data.empire?.researches) {
      const calcR = calculateWorkerResearchScore(data.empire.researches);
      if (calcR > 0) finalResearchScore = Math.max(finalResearchScore, calcR);
    }

    await env.DB.prepare(
      `INSERT INTO alliance_empires (
        alliance_id, player_id, player_name, player_class, alliance_class,
        total_score, economy_score, military_score, research_score,
        planet_count, moon_count, total_mines, total_ships, total_fleet_msu,
        avatar_url, avg_metal_mine, avg_crystal_mine, avg_deut_mine,
        total_metal_hourly, total_crystal_hourly, total_deut_hourly,
        data_hash, empire_json, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(alliance_id, player_id) DO UPDATE SET
        player_name = excluded.player_name,
        player_class = excluded.player_class,
        alliance_class = excluded.alliance_class,
        total_score = CASE WHEN (excluded.total_score > 0) THEN excluded.total_score ELSE alliance_empires.total_score END,
        economy_score = CASE WHEN (excluded.economy_score > 0) THEN excluded.economy_score ELSE alliance_empires.economy_score END,
        military_score = CASE WHEN (excluded.military_score > 0) THEN excluded.military_score ELSE alliance_empires.military_score END,
        research_score = CASE WHEN (excluded.research_score > 0) THEN excluded.research_score ELSE alliance_empires.research_score END,
        planet_count = excluded.planet_count,
        moon_count = excluded.moon_count,
        total_mines = excluded.total_mines,
        total_ships = excluded.total_ships,
        total_fleet_msu = excluded.total_fleet_msu,
        avatar_url = excluded.avatar_url,
        avg_metal_mine = excluded.avg_metal_mine,
        avg_crystal_mine = excluded.avg_crystal_mine,
        avg_deut_mine = excluded.avg_deut_mine,
        total_metal_hourly = excluded.total_metal_hourly,
        total_crystal_hourly = excluded.total_crystal_hourly,
        total_deut_hourly = excluded.total_deut_hourly,
        data_hash = excluded.data_hash,
        empire_json = excluded.empire_json,
        last_synced_at = excluded.last_synced_at`
    ).bind(
      allianceId,
      playerId,
      playerName,
      data.playerClass,
      data.allianceClass,
      totalScore,
      economyScore,
      militaryScore,
      finalResearchScore,
      data.summary.planetCount,
      data.summary.moonCount,
      data.summary.totalMines,
      data.summary.totalShips,
      totalFleetMsu,
      avatarUrl,
      data.summary.avgMetalMine,
      data.summary.avgCrystalMine,
      data.summary.avgDeutMine,
      data.summary.totalMetalHourly || 0,
      data.summary.totalCrystalHourly || 0,
      data.summary.totalDeutHourly || 0,
      data.dataHash,
      empireJsonStr,
      now
    ).run();

    return json({ success: true, updated: true, syncedAt: now });
  } catch (err: any) {
    console.error('Error syncing empire:', err);
    return json({ error: 'Failed to sync empire', details: err?.message }, { status: 500 });
  }
}

/**
 * Handles GET /api/v1/overwatch/empire/roster
 * Returns the lightweight alliance member summary roster + alliance aggregates.
 */
export async function handleGetEmpireRoster(req: Request, env: Env, ctx?: ExecutionContext) {
  try {
    const member = await authenticateMember(req, env);
    if (!member) {
      return json({ error: 'Unauthorized: Invalid or missing token.' }, { status: 401 });
    }
    if ('error' in member && member.error === 'subscription_expired') {
      return json({ error: 'Alliance subscription has expired.' }, { status: 403 });
    }

    const allianceId = member.alliance_id;

    // Fetch all members of this alliance
    const membersQuery = await env.DB.prepare(
      `SELECT player_id, player_name, role, client_version, last_sync_at, permissions_json
       FROM alliance_members
       WHERE alliance_id = ?
       ORDER BY player_name ASC`
    ).bind(allianceId).all();

    // Fetch all synced empires for this alliance
    const empiresQuery = await env.DB.prepare(
      `SELECT 
        player_id, player_name, player_class, alliance_class,
        total_score, economy_score, military_score, research_score,
        planet_count, moon_count, total_mines, total_ships, total_fleet_msu, avatar_url,
        avg_metal_mine, avg_crystal_mine, avg_deut_mine,
        total_metal_hourly, total_crystal_hourly, total_deut_hourly,
        last_synced_at
       FROM alliance_empires
       WHERE alliance_id = ?
       ORDER BY total_score DESC`
    ).bind(allianceId).all();

    const empireMap = new Map<string, any>();
    if (empiresQuery?.results) {
      empiresQuery.results.forEach((row: any) => {
        empireMap.set(row.player_id, row);
      });
    }

    // Auto-resolve / synchronize official Gameforge highscores (total, economy, military) for all roster members
    if (member.universe_id) {
      try {
        const [hsMap, ecoMap, milMap] = await Promise.all([
          getUniverseHighscores(member.universe_id, 0),
          getUniverseHighscores(member.universe_id, 1),
          getUniverseHighscores(member.universe_id, 3),
        ]);

        for (const [pid, emp] of empireMap.entries()) {
          let updated = false;
          const pIdStr = String(pid);
          if (hsMap) {
            const hs = hsMap.get(pIdStr);
            if (hs && hs.score > 0 && emp.total_score !== hs.score) {
              emp.total_score = hs.score;
              updated = true;
            }
          }
          if (ecoMap) {
            const hsEco = ecoMap.get(pIdStr);
            if (hsEco && hsEco.score > 0 && emp.economy_score !== hsEco.score) {
              emp.economy_score = hsEco.score;
              updated = true;
            }
          }
          if (milMap) {
            const hsMil = milMap.get(pIdStr);
            if (hsMil && hsMil.score > 0 && emp.military_score !== hsMil.score) {
              emp.military_score = hsMil.score;
              updated = true;
            }
          }

          if (updated) {
            const bgUpdate = env.DB.prepare(
              `UPDATE alliance_empires 
               SET total_score = ?,
                   economy_score = ?,
                   military_score = ?
               WHERE alliance_id = ? AND player_id = ?`
            ).bind(emp.total_score || 0, emp.economy_score || 0, emp.military_score || 0, allianceId, pid).run().catch(e => console.error('[EmpireSync] Backfill score error:', e));

            if (ctx && typeof ctx.waitUntil === 'function') {
              ctx.waitUntil(bgUpdate);
            } else {
              await bgUpdate;
            }
          }
        }
      } catch (err) {
        console.error('[EmpireSync] Failed to auto-resolve highscores in roster:', err);
      }
    }

    let totalProductionMetal = 0;
    let totalProductionCrystal = 0;
    let totalProductionDeut = 0;
    let totalPlanets = 0;
    let totalMoons = 0;
    let totalFleetShips = 0;
    let totalMinesSum = 0;
    let topMiner = { name: '-', totalMines: 0 };
    let topFleeter = { name: '-', fleetMsu: 0, totalShips: 0 };
    let topResearcher = { name: '-', researchScore: 0 };

    const seenPlayers = new Set<string>();
    const roster = (membersQuery?.results || []).map((m: any) => {
      seenPlayers.add(String(m.player_id));
      const emp = empireMap.get(m.player_id);
      let isEmpireShared = true;
      try {
        const perms = JSON.parse(m.permissions_json || '{}');
        if (perms.shareEmpire === false) isEmpireShared = false;
      } catch (e) {}

      let resolvedRScore = 0;
      if (emp && isEmpireShared) {
        totalProductionMetal += (emp.total_metal_hourly || 0);
        totalProductionCrystal += (emp.total_crystal_hourly || 0);
        totalProductionDeut += (emp.total_deut_hourly || 0);
        totalPlanets += (emp.planet_count || 0);
        totalMoons += (emp.moon_count || 0);
        totalFleetShips += (emp.total_ships || 0);
        totalMinesSum += (emp.total_mines || 0);

        if ((emp.total_mines || 0) > topMiner.totalMines) {
          topMiner = { name: emp.player_name, totalMines: emp.total_mines };
        }
        const playerFleetMsu = emp.total_fleet_msu || 0;
        if (playerFleetMsu > topFleeter.fleetMsu || (topFleeter.fleetMsu === 0 && (emp.total_ships || 0) > topFleeter.totalShips)) {
          topFleeter = { name: emp.player_name, fleetMsu: playerFleetMsu, totalShips: emp.total_ships || 0 };
        }
        resolvedRScore = emp.research_score || 0;
        if (resolvedRScore === 0 && emp.empire_json) {
          try {
            const parsed = typeof emp.empire_json === 'string' ? JSON.parse(emp.empire_json) : emp.empire_json;
            if (parsed?.researches) {
              resolvedRScore = calculateWorkerResearchScore(parsed.researches);
            }
          } catch (e) {}
        }
        if (resolvedRScore > topResearcher.researchScore) {
          topResearcher = { name: emp.player_name, researchScore: resolvedRScore };
        }
      }

      return {
        playerId: m.player_id,
        playerName: m.player_name,
        role: m.role,
        avatarUrl: emp && isEmpireShared ? emp.avatar_url : null,
        isEmpireShared,
        hasSyncedEmpire: !!emp && isEmpireShared,
        playerClass: emp && isEmpireShared ? emp.player_class : null,
        allianceClass: emp && isEmpireShared ? emp.alliance_class : null,
        totalScore: emp && isEmpireShared ? (emp.total_score || 0) : 0,
        economyScore: emp && isEmpireShared ? (emp.economy_score || 0) : 0,
        militaryScore: emp && isEmpireShared ? (emp.military_score || 0) : 0,
        researchScore: resolvedRScore,
        planetCount: emp && isEmpireShared ? (emp.planet_count || 0) : 0,
        moonCount: emp && isEmpireShared ? (emp.moon_count || 0) : 0,
        totalMines: emp && isEmpireShared ? (emp.total_mines || 0) : 0,
        totalShips: emp && isEmpireShared ? (emp.total_ships || 0) : 0,
        totalFleetMsu: emp && isEmpireShared ? (emp.total_fleet_msu || 0) : 0,
        avgMetalMine: emp && isEmpireShared ? (emp.avg_metal_mine || 0) : 0,
        avgCrystalMine: emp && isEmpireShared ? (emp.avg_crystal_mine || 0) : 0,
        avgDeutMine: emp && isEmpireShared ? (emp.avg_deut_mine || 0) : 0,
        totalMetalHourly: emp && isEmpireShared ? (emp.total_metal_hourly || 0) : 0,
        totalCrystalHourly: emp && isEmpireShared ? (emp.total_crystal_hourly || 0) : 0,
        totalDeutHourly: emp && isEmpireShared ? (emp.total_deut_hourly || 0) : 0,
        lastEmpireSyncAt: emp && isEmpireShared ? emp.last_synced_at : null,
        lastSyncedAt: emp && isEmpireShared ? emp.last_synced_at : null,
        empire: emp && isEmpireShared ? {
          avatarUrl: emp.avatar_url,
          playerClass: emp.player_class,
          allianceClass: emp.alliance_class,
          totalScore: emp.total_score,
          economyScore: emp.economy_score,
          militaryScore: emp.military_score,
          researchScore: resolvedRScore,
          planetCount: emp.planet_count,
          moonCount: emp.moon_count,
          totalMines: emp.total_mines,
          totalShips: emp.total_ships,
          totalFleetMsu: emp.total_fleet_msu || 0,
          avgMetalMine: emp.avg_metal_mine,
          avgCrystalMine: emp.avg_crystal_mine,
          avgDeutMine: emp.avg_deut_mine,
          totalMetalHourly: emp.total_metal_hourly,
          totalCrystalHourly: emp.total_crystal_hourly,
          totalDeutHourly: emp.total_deut_hourly,
          lastSyncedAt: emp.last_synced_at,
        } : null,
      };
    });

    // In case an empire was synced by an approved member not in membersQuery
    empireMap.forEach((emp, empPlayerId) => {
      if (!seenPlayers.has(String(empPlayerId))) {
        totalProductionMetal += (emp.total_metal_hourly || 0);
        totalProductionCrystal += (emp.total_crystal_hourly || 0);
        totalProductionDeut += (emp.total_deut_hourly || 0);
        totalPlanets += (emp.planet_count || 0);
        totalMoons += (emp.moon_count || 0);
        totalFleetShips += (emp.total_ships || 0);
        totalMinesSum += (emp.total_mines || 0);

        if ((emp.total_mines || 0) > topMiner.totalMines) {
          topMiner = { name: emp.player_name, totalMines: emp.total_mines };
        }
        const playerFleetMsu = emp.total_fleet_msu || 0;
        if (playerFleetMsu > topFleeter.fleetMsu || (topFleeter.fleetMsu === 0 && (emp.total_ships || 0) > topFleeter.totalShips)) {
          topFleeter = { name: emp.player_name, fleetMsu: playerFleetMsu, totalShips: emp.total_ships || 0 };
        }
        let fallbackRScore = emp.research_score || 0;
        if (fallbackRScore === 0 && emp.empire_json) {
          try {
            const parsed = typeof emp.empire_json === 'string' ? JSON.parse(emp.empire_json) : emp.empire_json;
            if (parsed?.researches) {
              fallbackRScore = calculateWorkerResearchScore(parsed.researches);
            }
          } catch (e) {}
        }
        if (fallbackRScore > topResearcher.researchScore) {
          topResearcher = { name: emp.player_name, researchScore: fallbackRScore };
        }

        roster.push({
          playerId: emp.player_id,
          playerName: emp.player_name,
          role: 'member',
          avatarUrl: emp.avatar_url,
          isEmpireShared: true,
          hasSyncedEmpire: true,
          playerClass: emp.player_class,
          allianceClass: emp.alliance_class,
          totalScore: emp.total_score || 0,
          economyScore: emp.economy_score || 0,
          militaryScore: emp.military_score || 0,
          researchScore: fallbackRScore,
          planetCount: emp.planet_count || 0,
          moonCount: emp.moon_count || 0,
          totalMines: emp.total_mines || 0,
          totalShips: emp.total_ships || 0,
          totalFleetMsu: emp.total_fleet_msu || 0,
          avgMetalMine: emp.avg_metal_mine || 0,
          avgCrystalMine: emp.avg_crystal_mine || 0,
          avgDeutMine: emp.avg_deut_mine || 0,
          totalMetalHourly: emp.total_metal_hourly || 0,
          totalCrystalHourly: emp.total_crystal_hourly || 0,
          totalDeutHourly: emp.total_deut_hourly || 0,
          lastEmpireSyncAt: emp.last_synced_at,
          lastSyncedAt: emp.last_synced_at,
          empire: {
            avatarUrl: emp.avatar_url,
            playerClass: emp.player_class,
            allianceClass: emp.alliance_class,
            totalScore: emp.total_score,
            economyScore: emp.economy_score,
            militaryScore: emp.military_score,
            researchScore: fallbackRScore,
            planetCount: emp.planet_count,
            moonCount: emp.moon_count,
            totalMines: emp.total_mines,
            totalShips: emp.total_ships,
            totalFleetMsu: emp.total_fleet_msu || 0,
            avgMetalMine: emp.avg_metal_mine,
            avgCrystalMine: emp.avg_crystal_mine,
            avgDeutMine: emp.avg_deut_mine,
            totalMetalHourly: emp.total_metal_hourly,
            totalCrystalHourly: emp.total_crystal_hourly,
            totalDeutHourly: emp.total_deut_hourly,
            lastSyncedAt: emp.last_synced_at,
          },
        });
      }
    });

    const syncedCount = roster.filter(r => r.hasSyncedEmpire).length;
    const totalProductionMSU = Math.round(totalProductionMetal + totalProductionCrystal * 1.5 + totalProductionDeut * 3);

    const allianceTotals = {
      totalMembers: roster.length,
      syncedEmpiresCount: syncedCount,
      totalPlanets,
      totalMoons,
      totalColonies: totalPlanets + totalMoons,
      totalFleetShips,
      totalMines: totalMinesSum,
      totalProductionMetal,
      totalProductionCrystal,
      totalProductionDeut,
      totalProductionMSU,
      topMiner,
      topFleeter,
      topResearcher,
    };

    return json({
      success: true,
      allianceId,
      totalMembers: roster.length,
      syncedMembersCount: syncedCount,
      allianceTotals,
      aggregates: {
        totalProductionMetal,
        totalProductionCrystal,
        totalProductionDeut,
        totalMsuHourly: totalProductionMSU,
        totalPlanets,
        totalMoons,
        totalColonies: totalPlanets + totalMoons,
        totalFleetShips,
        averageMinesPerPlayer: syncedCount > 0 ? Math.round(totalMinesSum / syncedCount) : 0,
        topMiner,
        topFleeter,
        topResearcher,
      },
      roster,
    });
  } catch (err: any) {
    console.error('Error fetching empire roster:', err);
    return json({ error: 'Failed to fetch empire roster', details: err?.message }, { status: 500 });
  }
}

/**
 * Handles GET /api/v1/overwatch/empire/member?playerId=...
 * Fetches the full detailed empire payload for a single member on demand.
 */
export async function handleGetEmpireMember(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    if (!member) {
      return json({ error: 'Unauthorized: Invalid or missing token.' }, { status: 401 });
    }
    if ('error' in member && member.error === 'subscription_expired') {
      return json({ error: 'Alliance subscription has expired.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const targetPlayerId = url.searchParams.get('playerId');
    if (!targetPlayerId) {
      return json({ error: 'Missing playerId parameter' }, { status: 400 });
    }

    const allianceId = member.alliance_id;

    // Check target member's permissions
    const targetMember = await env.DB.prepare(
      `SELECT player_id, player_name, permissions_json FROM alliance_members WHERE alliance_id = ? AND player_id = ?`
    ).bind(allianceId, targetPlayerId).first<{ player_id: string; player_name: string; permissions_json: string }>();

    if (!targetMember) {
      return json({ error: 'Target player is not a member of this alliance' }, { status: 404 });
    }

    try {
      const perms = JSON.parse(targetMember.permissions_json || '{}');
      if (perms.shareEmpire === false) {
        return json({ error: 'This player has made their empire private' }, { status: 403 });
      }
    } catch (e) {}

    const empRow = await env.DB.prepare(
      `SELECT * FROM alliance_empires WHERE alliance_id = ? AND player_id = ?`
    ).bind(allianceId, targetPlayerId).first<any>();

    if (!empRow) {
      return json({ error: 'Empire data not yet synced for this member' }, { status: 404 });
    }

    let empireData: any = {};
    try {
      empireData = JSON.parse(empRow.empire_json);
    } catch (e) {
      empireData = {};
    }

    let resolvedTotalScore = empRow.total_score || 0;
    let resolvedEconomyScore = empRow.economy_score || 0;
    let resolvedMilitaryScore = empRow.military_score || 0;

    if (member.universe_id) {
      try {
        let updated = false;
        const [hsMap, ecoMap, milMap] = await Promise.all([
          getUniverseHighscores(member.universe_id, 0),
          getUniverseHighscores(member.universe_id, 1),
          getUniverseHighscores(member.universe_id, 3),
        ]);

        const pIdStr = String(targetPlayerId);
        if (hsMap) {
          const hs = hsMap.get(pIdStr);
          if (hs && hs.score > 0 && resolvedTotalScore !== hs.score) {
            resolvedTotalScore = hs.score;
            updated = true;
          }
        }
        if (ecoMap) {
          const hsEco = ecoMap.get(pIdStr);
          if (hsEco && hsEco.score > 0 && resolvedEconomyScore !== hsEco.score) {
            resolvedEconomyScore = hsEco.score;
            updated = true;
          }
        }
        if (milMap) {
          const hsMil = milMap.get(pIdStr);
          if (hsMil && hsMil.score > 0 && resolvedMilitaryScore !== hsMil.score) {
            resolvedMilitaryScore = hsMil.score;
            updated = true;
          }
        }

        if (updated) {
          env.DB.prepare(
            `UPDATE alliance_empires 
             SET total_score = ?,
                 economy_score = ?,
                 military_score = ?
             WHERE alliance_id = ? AND player_id = ?`
          ).bind(resolvedTotalScore, resolvedEconomyScore, resolvedMilitaryScore, allianceId, targetPlayerId).run().catch(e => console.error(e));
        }
      } catch (e) {}
    }

    let memberRScore = empRow.research_score || 0;
    if (memberRScore === 0 && empireData?.researches) {
      memberRScore = calculateWorkerResearchScore(empireData.researches);
    }

    return json({
      success: true,
      member: {
        playerId: empRow.player_id,
        playerName: targetMember.player_name || empRow.player_name,
        playerClass: empRow.player_class,
        allianceClass: empRow.alliance_class,
        avatarUrl: empRow.avatar_url,
        totalScore: resolvedTotalScore,
        economyScore: resolvedEconomyScore,
        militaryScore: resolvedMilitaryScore,
        researchScore: memberRScore,
        planetCount: empRow.planet_count,
        moonCount: empRow.moon_count,
        totalMines: empRow.total_mines,
        totalShips: empRow.total_ships,
        totalFleetMsu: empRow.total_fleet_msu || 0,
        avgMetalMine: empRow.avg_metal_mine,
        avgCrystalMine: empRow.avg_crystal_mine,
        avgDeutMine: empRow.avg_deut_mine,
        totalMetalHourly: empRow.total_metal_hourly,
        totalCrystalHourly: empRow.total_crystal_hourly,
        totalDeutHourly: empRow.total_deut_hourly,
        lastSyncedAt: empRow.last_synced_at,
        updatedAt: empRow.last_synced_at,
        empire: empireData,
      }
    });
  } catch (err: any) {
    console.error('Error fetching member empire:', err);
    return json({ error: 'Failed to fetch member empire', details: err?.message }, { status: 500 });
  }
}

/**
 * Handles GET /api/v1/overwatch/phalanx/coverage
 * Returns the aggregated alliance sensor phalanx moons, including Interplanetary Analysis Network
 * lifeform tech range boost calculations for every member.
 */
export async function handleGetPhalanxCoverage(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    if (!member) {
      return json({ error: 'Unauthorized: Invalid or missing token.' }, { status: 401 });
    }
    if ('error' in member && member.error === 'subscription_expired') {
      return json({ error: 'Alliance subscription has expired.' }, { status: 403 });
    }

    const allianceId = member.alliance_id;

    // Fetch members permissions
    const membersQuery = await env.DB.prepare(
      `SELECT player_id, player_name, role, permissions_json FROM alliance_members WHERE alliance_id = ?`
    ).bind(allianceId).all();

    const allowedMembersMap = new Map<string, { playerName: string; role: string }>();
    (membersQuery?.results || []).forEach((m: any) => {
      let isEmpireShared = true;
      try {
        const perms = JSON.parse(m.permissions_json || '{}');
        if (perms.shareEmpire === false) isEmpireShared = false;
      } catch (e) {}
      if (isEmpireShared) {
        allowedMembersMap.set(String(m.player_id), {
          playerName: m.player_name || 'Commander',
          role: m.role || 'member'
        });
      }
    });

    // Fetch all alliance empires
    const empiresQuery = await env.DB.prepare(
      `SELECT player_id, player_name, player_class, avatar_url, empire_json, last_synced_at
       FROM alliance_empires
       WHERE alliance_id = ?`
    ).bind(allianceId).all();

    const moons: Array<{
      id: string;
      name: string;
      coords: string;
      galaxy: number;
      system: number;
      position: number;
      phalanxLevel: number;
      baseRange: number;
      effectiveRange: number;
      ianLevel: number;
      ianBoostPercent: number;
      isDiscoverer: boolean;
      discovererClassBoostPercent: number;
      discovererPhalanxBoost: number;
      totalBoostPercent: number;
      playerId: string;
      playerName: string;
      playerRole: string;
      avatarUrl: string | null;
      lastSyncedAt: number | null;
    }> = [];

    const memberStats: Array<{
      playerId: string;
      playerName: string;
      avatarUrl: string | null;
      isDiscoverer: boolean;
      discovererClassBoostPercent: number;
      discovererPhalanxBoost: number;
      moonCount: number;
      phalanxCount: number;
      maxPhalanxLevel: number;
      ianLevel: number;
      ianBoostPercent: number;
    }> = [];

    (empiresQuery?.results || []).forEach((row: any) => {
      const pId = String(row.player_id);
      if (!allowedMembersMap.has(pId)) return;
      const memberInfo = allowedMembersMap.get(pId)!;

      let emp: any = {};
      try {
        emp = JSON.parse(row.empire_json || '{}');
      } catch (e) {
        return;
      }

      const planets: any[] = emp.planets || [];
      const expList: any[] = emp.lifeformExperience || [];

      // Determine if player is Discoverer (playerClass === 3)
      const pClassRaw = row.player_class ?? emp.playerClass ?? emp.player_class ?? 0;
      const isDiscoverer = Number(pClassRaw) === 3 || pClassRaw === 'discoverer' || pClassRaw === 'explorer';

      // 1. Calculate Lifeform Tech Bonuses:
      // - Interplanetary Analysis Network (gkId 14208 / id 32): base 0.6% per level
      // - Kaelesh Discoverer Enhancement (gkId 14218 / id 72): base 0.2% per level (Discoverer Class Boost)
      let totalIanLevel = 0;
      let totalIanBoostPercent = 0;
      let totalDiscovererClassBoostPercent = 0;

      planets.filter(p => p.type === 'planet').forEach(p => {
        let buildingBonus = 0;
        if (p.lifeformBuildings && Array.isArray(p.lifeformBuildings)) {
          const activePrefix = p.lifeformId ? `1${p.lifeformId}` : null;
          p.lifeformBuildings.forEach((b: any) => {
            if (activePrefix && !b.id.toString().startsWith(activePrefix)) return;
            if (b.id === 11111) buildingBonus += (b.level || 0) * 0.005;
            else if (b.id === 13107) buildingBonus += (b.level || 0) * 0.003;
            else if (b.id === 13111) buildingBonus += (b.level || 0) * 0.004;
          });
        }

        const expData = expList.find(e => e.lifeformId === p.lifeformId);
        const totalMultiplier = 1 + (expData?.level || 0) * 0.001 + buildingBonus;

        const setup: any[] = p.lifeformSetup || [];
        setup.forEach(slot => {
          if (!slot || !slot.selectedTechId) return;
          const techId = Number(slot.selectedTechId);
          if (techId === 14208 || techId === 32) {
            const level = Number(slot.level || 0);
            totalIanLevel += level;
            totalIanBoostPercent += 0.6 * level * totalMultiplier;
          } else if (techId === 14218 || techId === 72) {
            const level = Number(slot.level || 0);
            totalDiscovererClassBoostPercent += 0.2 * level * totalMultiplier;
          }
        });
      });

      totalIanBoostPercent = Math.round(totalIanBoostPercent * 100) / 100;
      totalDiscovererClassBoostPercent = Math.round(totalDiscovererClassBoostPercent * 100) / 100;

      // Discoverer Class Phalanx Boost:
      // Base bonus = 20% (if player has Discoverer class)
      // Boosted bonus = 20% * (1 + totalDiscovererClassBoostPercent / 100)
      const discovererPhalanxBoost = isDiscoverer
        ? Math.round(20 * (1 + totalDiscovererClassBoostPercent / 100) * 100) / 100
        : 0;

      const totalPhalanxBoostPercent = Math.round((totalIanBoostPercent + discovererPhalanxBoost) * 100) / 100;

      // 2. Extract Moons
      const memberMoons = planets.filter(p => p.type === 'moon');
      let memberPhalanxes = 0;
      let maxPhalanx = 0;

      memberMoons.forEach(m => {
        const coordsStr = String(m.coords || '').trim();
        const coordMatch = coordsStr.match(/(\d+)[:\.](\d+)[:\.](\d+)/);
        if (!coordMatch) return;

        const g = parseInt(coordMatch[1], 10);
        const s = parseInt(coordMatch[2], 10);
        const pos = parseInt(coordMatch[3], 10);
        const phalanxLevel = Number(m.sensorPhalanx || 0);

        if (phalanxLevel > 0) memberPhalanxes++;
        if (phalanxLevel > maxPhalanx) maxPhalanx = phalanxLevel;

        // OGame Sensor Phalanx formula:
        // Base range = L > 1 ? (L^2 - 1) : 0
        // Effective range combines both IAN and Discoverer class boosts:
        const baseRange = phalanxLevel > 1 ? (phalanxLevel * phalanxLevel - 1) : 0;
        const effectiveRange = phalanxLevel > 1
          ? Math.floor(baseRange * (1 + totalPhalanxBoostPercent / 100))
          : 0;

        moons.push({
          id: String(m.id || `${pId}-${g}-${s}`),
          name: m.name || `Moon [${g}:${s}:${pos}]`,
          coords: `[${g}:${s}:${pos}]`,
          galaxy: g,
          system: s,
          position: pos,
          phalanxLevel,
          baseRange,
          effectiveRange,
          ianLevel: totalIanLevel,
          ianBoostPercent: totalIanBoostPercent,
          isDiscoverer,
          discovererClassBoostPercent: totalDiscovererClassBoostPercent,
          discovererPhalanxBoost,
          totalBoostPercent: totalPhalanxBoostPercent,
          playerId: pId,
          playerName: memberInfo.playerName,
          playerRole: memberInfo.role,
          avatarUrl: row.avatar_url || null,
          lastSyncedAt: row.last_synced_at || null,
        });
      });

      memberStats.push({
        playerId: pId,
        playerName: memberInfo.playerName,
        avatarUrl: row.avatar_url || null,
        isDiscoverer,
        discovererClassBoostPercent: totalDiscovererClassBoostPercent,
        discovererPhalanxBoost,
        moonCount: memberMoons.length,
        phalanxCount: memberPhalanxes,
        maxPhalanxLevel: maxPhalanx,
        ianLevel: totalIanLevel,
        ianBoostPercent: totalIanBoostPercent,
      });
    });

    return json({
      success: true,
      allianceId,
      universeId: member.universe_id,
      moons,
      members: memberStats,
      generatedAt: Date.now(),
    });
  } catch (err: any) {
    console.error('Error fetching phalanx coverage:', err);
    return json({ error: 'Failed to fetch phalanx coverage', details: err?.message }, { status: 500 });
  }
}
