// ============================================================================
// NEXUS OVERWATCH — ALLIANCE EMPIRE SYNC & AGGREGATION
// ============================================================================

import { json } from 'itty-router';
import { z } from 'zod';
import { Env } from './index';
import { authenticateMember } from './galaxySync';

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
    const playerName = data.playerName || member.player_name;

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
    const avatarUrl = data.avatarUrl || null;

    if (existing && existing.data_hash === data.dataHash) {
      // Touch last_synced_at without expensive json rewrite, and backfill total_fleet_msu / avatar_url if missing
      await env.DB.prepare(
        `UPDATE alliance_empires 
         SET last_synced_at = ?,
             total_fleet_msu = CASE WHEN (total_fleet_msu IS NULL OR total_fleet_msu = 0) THEN ? ELSE total_fleet_msu END,
             avatar_url = COALESCE(avatar_url, ?)
         WHERE alliance_id = ? AND player_id = ?`
      ).bind(now, totalFleetMsu, avatarUrl, allianceId, playerId).run();

      return json({ success: true, updated: false, unchanged: true, syncedAt: now });
    }
    const empireJsonStr = JSON.stringify(data.empire);

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
        total_score = excluded.total_score,
        economy_score = excluded.economy_score,
        military_score = excluded.military_score,
        research_score = excluded.research_score,
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
      data.totalScore,
      data.economyScore,
      data.militaryScore,
      data.researchScore,
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
export async function handleGetEmpireRoster(req: Request, env: Env) {
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
        if ((emp.research_score || 0) > topResearcher.researchScore) {
          topResearcher = { name: emp.player_name, researchScore: emp.research_score };
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
        researchScore: emp && isEmpireShared ? (emp.research_score || 0) : 0,
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
          researchScore: emp.research_score,
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
        if ((emp.research_score || 0) > topResearcher.researchScore) {
          topResearcher = { name: emp.player_name, researchScore: emp.research_score };
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
          researchScore: emp.research_score || 0,
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
            researchScore: emp.research_score,
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

    return json({
      success: true,
      member: {
        playerId: empRow.player_id,
        playerName: empRow.player_name,
        playerClass: empRow.player_class,
        allianceClass: empRow.alliance_class,
        avatarUrl: empRow.avatar_url,
        totalScore: empRow.total_score,
        economyScore: empRow.economy_score,
        militaryScore: empRow.military_score,
        researchScore: empRow.research_score,
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
