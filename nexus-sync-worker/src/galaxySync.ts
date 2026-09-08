// ============================================================================
// NEXUS OVERWATCH — GALAXY SYNC & DELTA ENGINE
// ============================================================================

import { json } from 'itty-router';
import { z } from 'zod';
import { Env } from './index';
import { hashGlyph } from './crypto';
import { cleanUniverseId, normalizePlayerStatus } from './universeSeeder';

// Zod Schema for incoming galaxy slot
export const GalaxySlotSchema = z.object({
  slot: z.number().int().min(1).max(16),
  planetName: z.string().nullable().optional(),
  planetImage: z.string().nullable().optional(),
  playerId: z.string().nullable().optional(),
  playerName: z.string().nullable().optional(),
  playerStatus: z.string().nullable().optional(), // 'active', 'i', 'I', 'v', 'b', 'o'
  playerRank: z.number().nullable().optional(),
  allianceTag: z.string().nullable().optional(),
  hasMoon: z.number().int().min(0).max(1).default(0),
  moonSize: z.number().nullable().optional(),
  debrisMetal: z.number().default(0),
  debrisCrystal: z.number().default(0),
  debrisReaperMetal: z.number().default(0),
  debrisReaperCrystal: z.number().default(0),
  activityMarker: z.string().nullable().optional(), // '*', '15m', '35m', etc.
  activityTimestamp: z.number().nullable().optional(),
});

// Zod Schema for the full system payload
export const GalaxySyncPayloadSchema = z.object({
  universeId: z.string().min(3).max(30),
  galaxy: z.number().int().min(1).max(9),
  system: z.number().int().min(1).max(499),
  scannedAt: z.number(),
  slots: z.array(GalaxySlotSchema).min(1).max(16),
});

export type GalaxySyncPayload = z.infer<typeof GalaxySyncPayloadSchema>;

export interface DetectedEvent {
  universeId: string;
  galaxy: number;
  system: number;
  slot: number;
  eventType: 'colonized' | 'abandoned' | 'relocated' | 'moon_spawned' | 'moon_destroyed' | 'status_changed' | 'player_renamed';
  playerId: string | null;
  playerName: string | null;
  oldState: any;
  newState: any;
  detectedAt: number;
}

/**
 * Authenticates member token and retrieves alliance and member context
 */
export async function authenticateMember(req: Request, env: Env) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('X-Nexus-Token');
  if (!authHeader) return null;

  const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!rawToken) return null;

  const tokenHash = await hashGlyph(rawToken, env.SERVER_PEPPER || 'nexus_pepper_default');

  const member: any = await env.DB.prepare(
    `SELECT m.alliance_id, m.player_id, m.player_name, m.role, m.permissions_json,
            a.alliance_name, a.alliance_tag, a.universe_id, a.subscription_status, a.subscription_expires_at
     FROM alliance_members m
     JOIN alliances a ON m.alliance_id = a.alliance_id
     WHERE m.auth_token_hash = ?`
  )
    .bind(tokenHash)
    .first();

  if (!member) return null;

  const now = Date.now();
  if (member.subscription_status !== 'active' && member.subscription_expires_at < now) {
    return { error: 'subscription_expired' };
  }

  return member;
}

/**
 * Handles POST /api/v1/galaxy/sync
 */
export async function handleGalaxySync(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    if (!member) {
      return json({ error: 'Unauthorized: Invalid or missing token.' }, { status: 401 });
    }
    if ('error' in member && member.error === 'subscription_expired') {
      return json({ error: 'Alliance subscription has expired.' }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = GalaxySyncPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return json({ error: 'Invalid galaxy payload', details: parseResult.error.format() }, { status: 400 });
    }

    const { universeId: rawUni, galaxy, system, scannedAt, slots } = parseResult.data;
    const universeId = cleanUniverseId(rawUni);
    const now = Date.now();

    // 1. Fetch current database state for this galaxy system
    const existingRows = await env.DB.prepare(
      `SELECT * FROM universe_slots WHERE universe_id = ? AND galaxy = ? AND system = ?`
    )
      .bind(universeId, galaxy, system)
      .all();

    const existingMap = new Map<number, any>();
    if (existingRows && existingRows.results) {
      existingRows.results.forEach((row: any) => {
        existingMap.set(row.slot, row);
      });
    }

    const statements: D1PreparedStatement[] = [];
    const detectedEvents: DetectedEvent[] = [];

    // 2. Diff incoming slots against existing slots
    for (const newSlot of slots) {
      const oldSlot = existingMap.get(newSlot.slot);

      let hasSlotChanged = false;

      // --- CHANGE DETECTION RULES ---
      if (oldSlot) {
        // A. Colonization (was empty, now has player)
        if (!oldSlot.player_id && newSlot.playerId) {
          hasSlotChanged = true;
          detectedEvents.push({
            universeId,
            galaxy,
            system,
            slot: newSlot.slot,
            eventType: 'colonized',
            playerId: newSlot.playerId,
            playerName: newSlot.playerName || null,
            oldState: null,
            newState: newSlot,
            detectedAt: now,
          });
        }
        // B. Abandoned / Deleted (had player, now completely empty slot)
        else if (oldSlot.player_id && !newSlot.playerId && !newSlot.planetName) {
          hasSlotChanged = true;
          detectedEvents.push({
            universeId,
            galaxy,
            system,
            slot: newSlot.slot,
            eventType: 'abandoned',
            playerId: oldSlot.player_id,
            playerName: oldSlot.player_name,
            oldState: oldSlot,
            newState: null,
            detectedAt: now,
          });
        }
        // C. Relocated / Changed Player
        else if (oldSlot.player_id && newSlot.playerId && oldSlot.player_id !== newSlot.playerId) {
          hasSlotChanged = true;
          detectedEvents.push({
            universeId,
            galaxy,
            system,
            slot: newSlot.slot,
            eventType: 'relocated',
            playerId: newSlot.playerId,
            playerName: newSlot.playerName || null,
            oldState: oldSlot,
            newState: newSlot,
            detectedAt: now,
          });
        }
        // D. Player Name Changed (reject pure rank numbers or empty strings)
        else if (
          oldSlot.player_id &&
          newSlot.playerId &&
          oldSlot.player_id === newSlot.playerId &&
          oldSlot.player_name &&
          newSlot.playerName &&
          oldSlot.player_name.trim() !== newSlot.playerName.trim() &&
          !/^\d+$/.test(newSlot.playerName.trim()) && // Ignore numbers which are highscore ranks
          newSlot.playerName.trim().length > 1
        ) {
          hasSlotChanged = true;
          detectedEvents.push({
            universeId,
            galaxy,
            system,
            slot: newSlot.slot,
            eventType: 'player_renamed',
            playerId: newSlot.playerId,
            playerName: newSlot.playerName.trim(),
            oldState: { playerName: oldSlot.player_name },
            newState: { playerName: newSlot.playerName.trim() },
            detectedAt: now,
          });
        }

        // E. Moon Spawned
        if ((!oldSlot.has_moon || oldSlot.has_moon === 0) && newSlot.hasMoon === 1) {
          hasSlotChanged = true;
          detectedEvents.push({
            universeId,
            galaxy,
            system,
            slot: newSlot.slot,
            eventType: 'moon_spawned',
            playerId: newSlot.playerId || null,
            playerName: newSlot.playerName || null,
            oldState: { hasMoon: 0 },
            newState: { hasMoon: 1, moonSize: newSlot.moonSize },
            detectedAt: now,
          });
        }
        // F. Moon Destroyed
        else if (oldSlot.has_moon === 1 && newSlot.hasMoon === 0 && oldSlot.player_id) {
          hasSlotChanged = true;
          detectedEvents.push({
            universeId,
            galaxy,
            system,
            slot: newSlot.slot,
            eventType: 'moon_destroyed',
            playerId: oldSlot.player_id,
            playerName: oldSlot.player_name,
            oldState: { hasMoon: 1, moonSize: oldSlot.moon_size },
            newState: { hasMoon: 0 },
            detectedAt: now,
          });
        }

        // G. Status Changed (e.g. active to inactive or vacation, or multiple tags like "v,I")
        const oldStatusNorm = normalizePlayerStatus(oldSlot.player_status);
        const newStatusNorm = normalizePlayerStatus(newSlot.playerStatus);

        if (
          oldSlot.player_id &&
          newSlot.playerId &&
          oldStatusNorm !== newStatusNorm
        ) {
          hasSlotChanged = true;
          detectedEvents.push({
            universeId,
            galaxy,
            system,
            slot: newSlot.slot,
            eventType: 'status_changed',
            playerId: newSlot.playerId,
            playerName: newSlot.playerName || null,
            oldState: { playerStatus: oldStatusNorm },
            newState: { playerStatus: newStatusNorm },
            detectedAt: now,
          });
        }

        // H. Planet Name Changed
        if (oldSlot.planet_name && newSlot.planetName && oldSlot.planet_name.trim() !== newSlot.planetName.trim()) {
          hasSlotChanged = true;
        }

        // I. Alliance Tag Changed
        if ((oldSlot.alliance_tag || newSlot.allianceTag) && oldSlot.alliance_tag !== newSlot.allianceTag) {
          hasSlotChanged = true;
        }
      }

      const slotLastChangedAt = hasSlotChanged
        ? now
        : (oldSlot ? (oldSlot.last_changed_at || null) : null);

      // Upsert universe slot row
      statements.push(
        env.DB.prepare(
          `INSERT INTO universe_slots (
            universe_id, galaxy, system, slot, planet_name, planet_image,
            player_id, player_name, player_status, player_rank, alliance_tag,
            has_moon, moon_size, debris_metal, debris_crystal,
            debris_reaper_metal, debris_reaper_crystal,
            last_activity_marker, last_activity_timestamp,
            last_scanned_at, last_scanned_by, last_changed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(universe_id, galaxy, system, slot) DO UPDATE SET
            planet_name = excluded.planet_name,
            planet_image = excluded.planet_image,
            player_id = excluded.player_id,
            player_name = excluded.player_name,
            player_status = excluded.player_status,
            player_rank = excluded.player_rank,
            alliance_tag = excluded.alliance_tag,
            has_moon = excluded.has_moon,
            moon_size = excluded.moon_size,
            debris_metal = excluded.debris_metal,
            debris_crystal = excluded.debris_crystal,
            debris_reaper_metal = excluded.debris_reaper_metal,
            debris_reaper_crystal = excluded.debris_reaper_crystal,
            last_activity_marker = excluded.last_activity_marker,
            last_activity_timestamp = excluded.last_activity_timestamp,
            last_scanned_at = excluded.last_scanned_at,
            last_scanned_by = excluded.last_scanned_by,
            last_changed_at = COALESCE(excluded.last_changed_at, universe_slots.last_changed_at)`
        ).bind(
          universeId,
          galaxy,
          system,
          newSlot.slot,
          newSlot.planetName || null,
          newSlot.planetImage || null,
          newSlot.playerId || null,
          newSlot.playerName || null,
          normalizePlayerStatus(newSlot.playerStatus),
          newSlot.playerRank || null,
          newSlot.allianceTag || null,
          newSlot.hasMoon || 0,
          newSlot.moonSize || null,
          newSlot.debrisMetal || 0,
          newSlot.debrisCrystal || 0,
          newSlot.debrisReaperMetal || 0,
          newSlot.debrisReaperCrystal || 0,
          newSlot.activityMarker || null,
          newSlot.activityTimestamp || null,
          scannedAt || now,
          member.player_name || 'Anonymous',
          slotLastChangedAt
        )
      );

      // 3. Activity Heatmap Logging
      if (newSlot.playerId && (newSlot.activityMarker || newSlot.activityTimestamp)) {
        const actTime = newSlot.activityTimestamp || scannedAt || now;
        const actDate = new Date(actTime);
        const dayOfWeek = actDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
        const hourOfDay = actDate.getUTCHours(); // 0 - 23

        statements.push(
          env.DB.prepare(
            `INSERT INTO player_activity_heatmap (
              universe_id, player_id, day_of_week, hour_of_day, activity_score, last_seen_at
            ) VALUES (?, ?, ?, ?, 1, ?)
            ON CONFLICT(universe_id, player_id, day_of_week, hour_of_day) DO UPDATE SET
              activity_score = activity_score + 1,
              last_seen_at = excluded.last_seen_at`
          ).bind(universeId, newSlot.playerId, dayOfWeek, hourOfDay, actTime)
        );
      }
    }

    // 4. Insert historical detected delta events
    for (const event of detectedEvents) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO universe_events (
            universe_id, galaxy, system, slot, event_type, player_id, player_name,
            old_state_json, new_state_json, detected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          event.universeId,
          event.galaxy,
          event.system,
          event.slot,
          event.eventType,
          event.playerId,
          event.playerName,
          event.oldState ? JSON.stringify(event.oldState) : null,
          event.newState ? JSON.stringify(event.newState) : null,
          event.detectedAt
        )
      );
    }

    // 5. Execute all statements atomically in a single batch
    if (statements.length > 0) {
      await env.DB.batch(statements);
    }

    // 6. Fetch any active raid locks in this system for this alliance
    const activeLocks = await env.DB.prepare(
      `SELECT coords, target_type, locked_by, eta_timestamp, expires_at
       FROM raid_locks
       WHERE universe_id = ? AND alliance_id = ? AND coords LIKE ? AND expires_at > ?`
    )
      .bind(universeId, member.alliance_id, `${galaxy}:${system}:%`, now)
      .all();

    return json({
      success: true,
      scannedSystem: `${galaxy}:${system}`,
      slotsUpdated: slots.length,
      eventsDetected: detectedEvents.length,
      events: detectedEvents,
      activeLocks: activeLocks?.results || [],
    });
  } catch (err: any) {
    console.error('Error in handleGalaxySync:', err);
    return json({ error: 'Failed to process galaxy sync', details: err.message }, { status: 500 });
  }
}

/**
 * Handles GET /api/v1/players/:playerId/activity
 */
export async function handleGetPlayerActivity(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    if (!member) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const playerId = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
    const universeId = url.searchParams.get('universeId') || member.universe_id;

    if (!playerId) {
      return json({ error: 'Missing playerId parameter' }, { status: 400 });
    }

    const heatmapRows = await env.DB.prepare(
      `SELECT day_of_week, hour_of_day, activity_score, last_seen_at
       FROM player_activity_heatmap
       WHERE universe_id = ? AND player_id = ?`
    )
      .bind(universeId, playerId)
      .all();

    const eventsRows = await env.DB.prepare(
      `SELECT galaxy, system, slot, event_type, detected_at, old_state_json, new_state_json
       FROM universe_events
       WHERE universe_id = ? AND player_id = ?
       ORDER BY detected_at DESC LIMIT 20`
    )
      .bind(universeId, playerId)
      .all();

    return json({
      success: true,
      playerId,
      universeId,
      heatmap: heatmapRows?.results || [],
      recentEvents: eventsRows?.results || [],
    });
  } catch (err: any) {
    console.error('Error in handleGetPlayerActivity:', err);
    return json({ error: 'Failed to get player activity', details: err.message }, { status: 500 });
  }
}

/**
 * Handles GET /api/v1/galaxy/events
 */
export async function handleGetGalaxyEvents(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    const url = new URL(req.url);
    const universeId = cleanUniverseId(url.searchParams.get('universeId') || (member && !('error' in member) ? member.universe_id : 's267-en'));
    const eventType = url.searchParams.get('type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    let query = `
      SELECT event_id, universe_id, galaxy, system, slot, event_type, player_id, player_name,
             old_state_json, new_state_json, detected_at
      FROM universe_events
      WHERE universe_id = ?
    `;
    const params: any[] = [universeId];

    if (eventType) {
      query += ` AND event_type = ?`;
      params.push(eventType);
    }

    query += ` ORDER BY detected_at DESC LIMIT ?`;
    params.push(limit);

    const result = await env.DB.prepare(query).bind(...params).all();

    return json({
      success: true,
      universeId,
      events: result?.results || [],
    });
  } catch (err: any) {
    console.error('Error in handleGetGalaxyEvents:', err);
    return json({ error: 'Failed to fetch galaxy events', details: err.message }, { status: 500 });
  }
}

/**
 * Handles GET /api/v1/galaxy/system
 */
export async function handleGetSystem(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    const url = new URL(req.url);
    const universeId = cleanUniverseId(url.searchParams.get('universeId') || (member && !('error' in member) ? member.universe_id : 's267-en'));
    const galaxy = parseInt(url.searchParams.get('galaxy') || '1', 10);
    const system = parseInt(url.searchParams.get('system') || '1', 10);

    if (isNaN(galaxy) || isNaN(system) || galaxy < 1 || galaxy > 9 || system < 1 || system > 499) {
      return json({ error: 'Invalid coordinates. Galaxy must be 1-9, system 1-499' }, { status: 400 });
    }

    const slotsRows = await env.DB.prepare(
      `SELECT slot, planet_id, planet_name, player_id, player_name, player_status, player_rank,
              alliance_tag, has_moon, moon_id, moon_size, moon_destroyed,
              debris_metal, debris_crystal, last_activity_marker, last_activity_timestamp,
              last_scanned_at, last_scanned_by, last_changed_at
       FROM universe_slots
       WHERE universe_id = ? AND galaxy = ? AND system = ?
       ORDER BY slot ASC`
    )
      .bind(universeId, galaxy, system)
      .all();

    const slotsMap = new Map<number, any>();
    (slotsRows?.results || []).forEach((row: any) => {
      slotsMap.set(row.slot, row);
    });

    const fullSlots = [];
    for (let slot = 1; slot <= 15; slot++) {
      if (slotsMap.has(slot)) {
        fullSlots.push(slotsMap.get(slot));
      } else {
        fullSlots.push({
          slot,
          planet_name: null,
          player_name: null,
          player_id: null,
          player_status: null,
          alliance_tag: null,
          has_moon: 0,
          moon_size: null,
          debris_metal: 0,
          debris_crystal: 0,
          last_activity_marker: null,
          last_scanned_at: null,
          last_changed_at: null,
        });
      }
    }

    return json({
      success: true,
      universeId,
      galaxy,
      system,
      slots: fullSlots,
    });
  } catch (err: any) {
    console.error('Error in handleGetSystem:', err);
    return json({ error: 'Failed to get system data', details: err.message }, { status: 500 });
  }
}
