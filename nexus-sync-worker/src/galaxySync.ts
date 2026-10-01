// ============================================================================
// NEXUS OVERWATCH — GALAXY SYNC & DELTA ENGINE
// ============================================================================

import { json } from 'itty-router';
import { z } from 'zod';
import { Env } from './index';
import { hashGlyph } from './crypto';
import { cleanUniverseId, normalizePlayerStatus } from './universeSeeder';
import {
  getCoreDb,
  getUniverseDb,
  getCachedSystemResponse,
  putCachedSystemResponse,
  invalidateSystemCache,
} from './dbRouter';

// Zod Schema for incoming galaxy slot
export const GalaxySlotSchema = z.object({
  slot: z.number().int().min(1).max(16),
  planetId: z.string().nullable().optional(),
  planetName: z.string().nullable().optional(),
  planetImage: z.string().nullable().optional(),
  playerId: z.string().nullable().optional(),
  playerName: z.string().nullable().optional(),
  playerStatus: z.string().nullable().optional(), // 'active', 'i', 'I', 'v', 'b', 'o'
  playerRank: z.number().nullable().optional(),
  allianceTag: z.string().nullable().optional(),
  hasMoon: z.number().int().min(0).max(1).default(0),
  moonId: z.string().nullable().optional(),
  moonSize: z.number().nullable().optional(),
  moonDestroyed: z.number().int().min(0).max(1).default(0),
  debrisMetal: z.number().default(0),
  debrisCrystal: z.number().default(0),
  debrisReaperMetal: z.number().default(0),
  debrisReaperCrystal: z.number().default(0),
  planetActivityMarker: z.string().nullable().optional(),
  planetActivityTimestamp: z.number().nullable().optional(),
  moonActivityMarker: z.string().nullable().optional(),
  moonActivityTimestamp: z.number().nullable().optional(),
  isIdle: z.boolean().nullable().optional(),
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
 * Authenticates member token and retrieves alliance and member context from Core DB
 */
export async function authenticateMember(req: Request, env: Env) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('X-Nexus-Token');
  if (!authHeader) return null;

  const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!rawToken) return null;

  const tokenHash = await hashGlyph(rawToken, env.SERVER_PEPPER || 'nexus_pepper_default');
  const coreDb = getCoreDb(env);

  const member: any = await coreDb.prepare(
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

let hasEnsuredActivityTables = true; // Verified and created in D1 schema
export async function ensureActivityTables(db: D1Database) {
  if (hasEnsuredActivityTables) return;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS player_activity_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alliance_id TEXT NOT NULL,
      universe_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      galaxy INTEGER NOT NULL,
      system INTEGER NOT NULL,
      slot INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      activity_marker TEXT NOT NULL,
      inferred_timestamp INTEGER NOT NULL,
      scanned_at INTEGER NOT NULL,
      scanned_by TEXT
    )`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_obs_player ON player_activity_observations(alliance_id, universe_id, player_id, inferred_timestamp DESC)`).run();

    try { await db.prepare(`ALTER TABLE player_activity_heatmap ADD COLUMN active_pings INTEGER DEFAULT 0`).run(); } catch {}
    try { await db.prepare(`ALTER TABLE player_activity_heatmap ADD COLUMN idle_checks INTEGER DEFAULT 0`).run(); } catch {}
    try { await db.prepare(`ALTER TABLE player_activity_heatmap ADD COLUMN moon_pings INTEGER DEFAULT 0`).run(); } catch {}
    hasEnsuredActivityTables = true;
  } catch {
    // Continue if already created
  }
}

const MEMBER_GALAXY_SYNC_COOLDOWN = new Map<string, number>();
const MAX_COOLDOWN_ENTRIES = 500;

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

    const now = Date.now();
    const memberKey = `${member.alliance_id}:${member.player_id}`;
    const lastMemberSync = MEMBER_GALAXY_SYNC_COOLDOWN.get(memberKey) || 0;
    if (now - lastMemberSync < 400) {
      return json({
        error: 'Galaxy sync rate limit exceeded. Please wait 400ms between system scans.',
        retryAfterMs: 400 - (now - lastMemberSync),
      }, { status: 429 });
    }
    MEMBER_GALAXY_SYNC_COOLDOWN.set(memberKey, now);
    if (MEMBER_GALAXY_SYNC_COOLDOWN.size > MAX_COOLDOWN_ENTRIES) {
      const oldestKey = MEMBER_GALAXY_SYNC_COOLDOWN.keys().next().value;
      if (oldestKey) MEMBER_GALAXY_SYNC_COOLDOWN.delete(oldestKey);
    }

    const body = await req.json();
    const parseResult = GalaxySyncPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return json({ error: 'Invalid galaxy payload', details: parseResult.error.format() }, { status: 400 });
    }

    const { universeId: rawUni, galaxy, system, scannedAt, slots } = parseResult.data;
    const universeId = cleanUniverseId(rawUni);
    const db = getUniverseDb(env, universeId);

    // 1. Check if this alliance has previously surveyed this system
    const scannedRecord: any = await db.prepare(
      `SELECT scanned_at FROM alliance_scanned_systems WHERE alliance_id = ? AND universe_id = ? AND galaxy = ? AND system = ?`
    ).bind(member.alliance_id, universeId, galaxy, system).first();

    const hasAllianceScannedBefore = !!scannedRecord;

    // Phase 3.2: Worker Galaxy Sync Deduping
    // If system was surveyed within the last 60 seconds and incoming slots contain no new activity markers, return early
    const hasActiveMarkers = slots.some((s: any) => Boolean(s.activityMarker || s.planetActivityMarker || s.moonActivityMarker));
    if (scannedRecord?.scanned_at && (now - scannedRecord.scanned_at) < 60000 && !hasActiveMarkers) {
      return json({
        success: true,
        unchanged: true,
        cached: true,
        message: 'System was recently surveyed (<60s) with no new activity markers.',
      });
    }

    // Fetch previous state: alliance's own scanned slots if scouted before, or baseline if first scan
    const [existingRows, universeRow] = await Promise.all([
      hasAllianceScannedBefore
        ? db.prepare(
            `SELECT * FROM alliance_galaxy_slots WHERE alliance_id = ? AND universe_id = ? AND galaxy = ? AND system = ?`
          ).bind(member.alliance_id, universeId, galaxy, system).all()
        : db.prepare(
            `SELECT * FROM universe_baseline_planets WHERE universe_id = ? AND galaxy = ? AND system = ?`
          ).bind(universeId, galaxy, system).all(),
      db.prepare(
        `SELECT last_seeded_at FROM universe_info WHERE universe_id = ?`
      ).bind(universeId).first<{ last_seeded_at: number }>()
    ]);

    const isUniverseSeeded = !!(universeRow && universeRow.last_seeded_at > 0);

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
      // A. Colonization (was empty, now has player)
      if (
        (oldSlot && !oldSlot.player_id && newSlot.playerId) ||
        (!oldSlot && isUniverseSeeded && newSlot.playerId)
      ) {
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
      } else if (oldSlot) {
        // B. Abandoned / Left Planet / Destroyed Planet (had player, now no player)
        if (oldSlot.player_id && !newSlot.playerId) {
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
            newState: newSlot,
            detectedAt: now,
          });
        }
        // C. Colonized / Changed Player (former occupant replaced by new player colony)
        else if (oldSlot.player_id && newSlot.playerId && oldSlot.player_id !== newSlot.playerId) {
          hasSlotChanged = true;
          detectedEvents.push({
            universeId,
            galaxy,
            system,
            slot: newSlot.slot,
            eventType: 'colonized',
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
          !newSlot.playerName.trim().startsWith('#') &&
          newSlot.playerName.trim().length >= 1
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
            oldState: { playerName: oldSlot.player_name, playerStatus: oldSlot.player_status },
            newState: { playerName: newSlot.playerName.trim(), playerStatus: normalizePlayerStatus(newSlot.playerStatus) },
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
            playerName: newSlot.playerName || oldSlot.player_name || null,
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

      const isPlanetDestroyed = (newSlot.planetName || '').toLowerCase().includes('destroy');
      const isMoonDestroyed =
        newSlot.moonDestroyed === 1 ||
        (isPlanetDestroyed && (newSlot.hasMoon === 1 || (oldSlot && oldSlot.has_moon === 1)));
      const moonDestroyedVal = isMoonDestroyed ? 1 : 0;

      // 3. Sparse Slot Storage: only store occupied planets, moons, or active debris fields
      const isPopulated = !!(
        newSlot.playerId ||
        newSlot.hasMoon === 1 ||
        newSlot.debrisMetal > 0 ||
        newSlot.debrisCrystal > 0 ||
        newSlot.debrisReaperMetal > 0 ||
        newSlot.debrisReaperCrystal > 0
      );

      if (isPopulated) {
        statements.push(
          db.prepare(
            `INSERT INTO alliance_galaxy_slots (
              alliance_id, universe_id, galaxy, system, slot, planet_id, planet_name, planet_image,
              player_id, player_name, player_status, player_rank, alliance_tag,
              has_moon, moon_id, moon_size, moon_destroyed, debris_metal, debris_crystal,
              debris_reaper_metal, debris_reaper_crystal,
              last_activity_marker, last_activity_timestamp,
              last_scanned_at, last_scanned_by, last_changed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(alliance_id, universe_id, galaxy, system, slot) DO UPDATE SET
              planet_id = excluded.planet_id,
              planet_name = excluded.planet_name,
              planet_image = excluded.planet_image,
              player_id = excluded.player_id,
              player_name = COALESCE(NULLIF(NULLIF(excluded.player_name, ''), 'null'), alliance_galaxy_slots.player_name),
              player_status = excluded.player_status,
              player_rank = excluded.player_rank,
              alliance_tag = excluded.alliance_tag,
              has_moon = excluded.has_moon,
              moon_id = excluded.moon_id,
              moon_size = excluded.moon_size,
              moon_destroyed = excluded.moon_destroyed,
              debris_metal = excluded.debris_metal,
              debris_crystal = excluded.debris_crystal,
              debris_reaper_metal = excluded.debris_reaper_metal,
              debris_reaper_crystal = excluded.debris_reaper_crystal,
              last_activity_marker = excluded.last_activity_marker,
              last_activity_timestamp = excluded.last_activity_timestamp,
              last_scanned_at = excluded.last_scanned_at,
              last_scanned_by = excluded.last_scanned_by,
              last_changed_at = COALESCE(excluded.last_changed_at, alliance_galaxy_slots.last_changed_at)`
          ).bind(
            member.alliance_id,
            universeId,
            galaxy,
            system,
            newSlot.slot,
            newSlot.planetId || null,
            newSlot.planetName || null,
            newSlot.planetImage || null,
            newSlot.playerId || null,
            newSlot.playerName || null,
            normalizePlayerStatus(newSlot.playerStatus),
            newSlot.playerRank || null,
            newSlot.allianceTag || null,
            newSlot.hasMoon || 0,
            newSlot.moonId || null,
            newSlot.moonSize || null,
            moonDestroyedVal,
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

        // Keep universe_baseline_planets in sync with live scan data
        if (newSlot.playerId) {
          const normalizedStatus = normalizePlayerStatus(newSlot.playerStatus);
          statements.push(
            db.prepare(
              `INSERT INTO universe_baseline_planets (
                universe_id, galaxy, system, slot, planet_id, planet_name, player_id, player_name, player_status, alliance_tag, has_moon, moon_id, moon_size, last_updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(universe_id, galaxy, system, slot) DO UPDATE SET
                planet_id = COALESCE(excluded.planet_id, universe_baseline_planets.planet_id),
                planet_name = COALESCE(excluded.planet_name, universe_baseline_planets.planet_name),
                player_id = excluded.player_id,
                player_name = COALESCE(excluded.player_name, universe_baseline_planets.player_name),
                player_status = excluded.player_status,
                alliance_tag = excluded.alliance_tag,
                has_moon = excluded.has_moon,
                moon_id = COALESCE(excluded.moon_id, universe_baseline_planets.moon_id),
                moon_size = COALESCE(excluded.moon_size, universe_baseline_planets.moon_size),
                last_updated_at = excluded.last_updated_at`
            ).bind(
              universeId,
              galaxy,
              system,
              newSlot.slot,
              newSlot.planetId || null,
              newSlot.planetName || null,
              newSlot.playerId || null,
              newSlot.playerName || null,
              normalizedStatus,
              newSlot.allianceTag || null,
              newSlot.hasMoon || 0,
              newSlot.moonId || null,
              newSlot.moonSize || null,
              scannedAt || now
            )
          );
        }
      } else {
        // If slot became completely empty (abandoned), delete from sparse storage
        statements.push(
          db.prepare(
            `DELETE FROM alliance_galaxy_slots
             WHERE alliance_id = ? AND universe_id = ? AND galaxy = ? AND system = ? AND slot = ?`
          ).bind(member.alliance_id, universeId, galaxy, system, newSlot.slot)
        );

        if (oldSlot?.player_id) {
          statements.push(
            db.prepare(
              `DELETE FROM universe_baseline_planets
               WHERE universe_id = ? AND galaxy = ? AND system = ? AND slot = ?`
            ).bind(universeId, galaxy, system, newSlot.slot)
          );
        }

        // Clean up from personal_vault_radar if this slot was previously spied
        const emptyCoord = `${galaxy}:${system}:${newSlot.slot}`;
        statements.push(
          db.prepare(
            `DELETE FROM personal_vault_radar
             WHERE universe_id = ? AND coords = ?`
          ).bind(universeId, emptyCoord)
        );
      }

      // 4. Activity Heatmap Logging & Surveillance Observations (Alliance-Isolated)
      if (newSlot.playerId) {
        const hasPlanetAct = Boolean(newSlot.planetActivityMarker);
        const hasMoonAct = Boolean(newSlot.moonActivityMarker);
        const hasAct = hasPlanetAct || hasMoonAct || Boolean(newSlot.activityMarker);
        const isVacation = newSlot.playerStatus && newSlot.playerStatus.includes('v');
        const isBanned = newSlot.playerStatus && newSlot.playerStatus.includes('b');

        if (hasAct) {
          const actTime = (hasMoonAct ? newSlot.moonActivityTimestamp : newSlot.planetActivityTimestamp) || newSlot.activityTimestamp || scannedAt || now;
          const actDate = new Date(actTime);
          const dayOfWeek = actDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
          const hourOfDay = actDate.getUTCHours(); // 0 - 23
          const moonIncrement = hasMoonAct ? 1 : 0;

          statements.push(
            db.prepare(
              `INSERT INTO player_activity_heatmap (
                alliance_id, universe_id, player_id, day_of_week, hour_of_day, activity_score, active_pings, idle_checks, moon_pings, last_seen_at
              ) VALUES (?, ?, ?, ?, ?, 1, 1, 0, ?, ?)
              ON CONFLICT(alliance_id, universe_id, player_id, day_of_week, hour_of_day) DO UPDATE SET
                activity_score = activity_score + 1,
                active_pings = coalesce(active_pings, 0) + 1,
                moon_pings = coalesce(moon_pings, 0) + ?,
                last_seen_at = excluded.last_seen_at`
            ).bind(member.alliance_id, universeId, newSlot.playerId, dayOfWeek, hourOfDay, moonIncrement, actTime, moonIncrement)
          );

          if (hasPlanetAct) {
            statements.push(
              db.prepare(
                `INSERT INTO player_activity_observations (
                  alliance_id, universe_id, player_id, galaxy, system, slot, target_type, activity_marker, inferred_timestamp, scanned_at, scanned_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'planet', ?, ?, ?, ?)`
              ).bind(
                member.alliance_id, universeId, newSlot.playerId, galaxy, system, newSlot.slot,
                newSlot.planetActivityMarker || '*', newSlot.planetActivityTimestamp || scannedAt || now,
                scannedAt || now, member.player_name || 'Scout'
              )
            );
          }
          if (hasMoonAct) {
            statements.push(
              db.prepare(
                `INSERT INTO player_activity_observations (
                  alliance_id, universe_id, player_id, galaxy, system, slot, target_type, activity_marker, inferred_timestamp, scanned_at, scanned_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'moon', ?, ?, ?, ?)`
              ).bind(
                member.alliance_id, universeId, newSlot.playerId, galaxy, system, newSlot.slot,
                newSlot.moonActivityMarker || '*', newSlot.moonActivityTimestamp || scannedAt || now,
                scannedAt || now, member.player_name || 'Scout'
              )
            );
          }
        } else if (!isVacation && !isBanned) {
          // Negative confirmation: verified idle for >= 60 min during this hour of the week
          const scanDate = new Date(scannedAt || now);
          const dayOfWeek = scanDate.getUTCDay();
          const hourOfDay = scanDate.getUTCHours();

          statements.push(
            db.prepare(
              `INSERT INTO player_activity_heatmap (
                alliance_id, universe_id, player_id, day_of_week, hour_of_day, activity_score, active_pings, idle_checks, moon_pings, last_seen_at
              ) VALUES (?, ?, ?, ?, ?, 0, 0, 1, 0, ?)
              ON CONFLICT(alliance_id, universe_id, player_id, day_of_week, hour_of_day) DO UPDATE SET
                idle_checks = coalesce(idle_checks, 0) + 1`
            ).bind(member.alliance_id, universeId, newSlot.playerId, dayOfWeek, hourOfDay, scannedAt || now)
          );
        }
      }
    }

    // 5. Update Alliance Scanned Systems Registry
    statements.push(
      db.prepare(
        `INSERT OR REPLACE INTO alliance_scanned_systems (
          alliance_id, universe_id, galaxy, system, scanned_at, scanned_by
        ) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        member.alliance_id,
        universeId,
        galaxy,
        system,
        scannedAt || now,
        member.player_name || 'Anonymous'
      )
    );

    // 6. Insert historical detected delta events (Scoped to member.alliance_id)
    for (const event of detectedEvents) {
      statements.push(
        db.prepare(
          `INSERT INTO universe_events (
            alliance_id, universe_id, galaxy, system, slot, event_type, player_id, player_name,
            detected_by, old_state_json, new_state_json, detected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          member.alliance_id,
          event.universeId,
          event.galaxy,
          event.system,
          event.slot,
          event.eventType,
          event.playerId,
          event.playerName,
          member.player_name || 'Overwatch Scout',
          event.oldState ? JSON.stringify(event.oldState) : null,
          event.newState ? JSON.stringify(event.newState) : null,
          event.detectedAt
        )
      );
    }

    // 7. Execute all statements atomically in a single batch
    if (statements.length > 0) {
      await db.batch(statements);
    }

    // 8. INSTANT EDGE CACHE INVALIDATION (Pillar 5: Guaranteed Freshness)
    await invalidateSystemCache(universeId, member.alliance_id, galaxy, system);

    // 9. Fetch any active raid locks in this system for this alliance
    const activeLocks = await db.prepare(
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
 * Handles GET /api/v1/players/search?universeId=...&q=...
 */
export async function handleSearchPlayers(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    const url = new URL(req.url);
    const universeId = cleanUniverseId(url.searchParams.get('universeId') || (member && !('error' in member) ? member.universe_id : 's267-en'));
    const q = (url.searchParams.get('q') || '').trim();

    if (!q || q.length < 3) {
      return json({ success: true, universeId, players: [] });
    }

    const db = getUniverseDb(env, universeId);
    const rows: any = await db.prepare(
      `SELECT DISTINCT player_id, player_name, player_status, alliance_tag
       FROM universe_baseline_planets
       WHERE universe_id = ? AND player_name LIKE ?
       ORDER BY player_name ASC
       LIMIT 15`
    )
      .bind(universeId, `%${q}%`)
      .all();

    return json({
      success: true,
      universeId,
      players: (rows?.results || []).map((r: any) => ({
        playerId: String(r.player_id),
        playerName: r.player_name,
        playerStatus: r.player_status,
        allianceTag: r.alliance_tag,
      })),
    });
  } catch (err: any) {
    console.error('Error in handleSearchPlayers:', err);
    return json({ error: 'Failed to search players', details: err.message }, { status: 500 });
  }
}

/**
 * Handles GET /api/v1/players/:playerId/activity
 */
export async function handleGetPlayerActivity(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    const url = new URL(req.url);
    const universeId = cleanUniverseId(url.searchParams.get('universeId') || (member && !('error' in member) ? member.universe_id : 's267-en'));
    const allianceId = (member && !('error' in member)) ? member.alliance_id : 'public';
    const db = getUniverseDb(env, universeId);

    const pathParts = url.pathname.split('/');
    let rawParam = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
    if (rawParam === 'activity') {
      rawParam = pathParts[pathParts.length - 2];
    }
    const queryPlayer = url.searchParams.get('name') || rawParam;

    if (!queryPlayer) {
      return json({ error: 'Missing playerId parameter' }, { status: 400 });
    }

    // Resolve player_id and info if name was passed
    let playerId = queryPlayer;
    let playerInfo: any = null;

    if (isNaN(Number(queryPlayer))) {
      playerInfo = await db.prepare(
        `SELECT player_id, player_name, player_status, alliance_tag, COUNT(slot) as planet_count
         FROM universe_baseline_planets
         WHERE universe_id = ? AND LOWER(player_name) = LOWER(?)
         GROUP BY player_id LIMIT 1`
      ).bind(universeId, queryPlayer).first();
      if (playerInfo?.player_id) {
        playerId = String(playerInfo.player_id);
      }
    } else {
      playerInfo = await db.prepare(
        `SELECT player_id, player_name, player_status, alliance_tag, COUNT(slot) as planet_count
         FROM universe_baseline_planets
         WHERE universe_id = ? AND player_id = ?
         GROUP BY player_id LIMIT 1`
      ).bind(universeId, playerId).first();
    }

    // 1. All colonies/moons belonging to this player (for Strike Flight Planner)
    const planetsRows = await db.prepare(
      `SELECT galaxy, system, slot, planet_name, has_moon, moon_size
       FROM universe_baseline_planets
       WHERE universe_id = ? AND player_id = ?
       ORDER BY galaxy ASC, system ASC, slot ASC`
    )
      .bind(universeId, playerId)
      .all();

    // 2. Heatmap query isolated to this alliance's surveillance
    const heatmapRows = await db.prepare(
      `SELECT day_of_week, hour_of_day, activity_score, active_pings, idle_checks, moon_pings, last_seen_at
       FROM player_activity_heatmap
       WHERE alliance_id = ? AND universe_id = ? AND player_id = ?`
    )
      .bind(allianceId, universeId, playerId)
      .all();

    // 3. Granular recent surveillance observations (last 30 pings)
    const observationsRows = await db.prepare(
      `SELECT galaxy, system, slot, target_type, activity_marker, inferred_timestamp, scanned_at, scanned_by
       FROM player_activity_observations
       WHERE alliance_id = ? AND universe_id = ? AND player_id = ?
       ORDER BY inferred_timestamp DESC LIMIT 30`
    )
      .bind(allianceId, universeId, playerId)
      .all();

    // 4. Event history query: visible if detected by this alliance or public server news
    const eventsRows = await db.prepare(
      `SELECT galaxy, system, slot, event_type, detected_at, detected_by, old_state_json, new_state_json
       FROM universe_events
       WHERE (alliance_id = ? OR alliance_id = 'public') AND universe_id = ? AND player_id = ?
       ORDER BY detected_at DESC LIMIT 20`
    )
      .bind(allianceId, universeId, playerId)
      .all();

    const heatmapList = heatmapRows?.results || [];
    let totalActivePings = 0;
    let totalIdleChecks = 0;
    let totalMoonPings = 0;
    const hourlyActive = new Array(24).fill(0);
    const hourlyIdle = new Array(24).fill(0);

    for (const row of heatmapList as any[]) {
      const active = Number(row.active_pings || row.activity_score || 0);
      const idle = Number(row.idle_checks || 0);
      const moon = Number(row.moon_pings || 0);
      const h = Number(row.hour_of_day) % 24;

      totalActivePings += active;
      totalIdleChecks += idle;
      totalMoonPings += moon;
      hourlyActive[h] += active;
      hourlyIdle[h] += idle;
    }

    // Sliding 6-hour sleep cycle detector (window with lowest average activity)
    let bestSleepStart = 1; // Default fallback: 01:00 UTC
    let lowestScore = Infinity;
    for (let startH = 0; startH < 24; startH++) {
      let windowActive = 0;
      for (let i = 0; i < 6; i++) {
        windowActive += hourlyActive[(startH + i) % 24];
      }
      if (windowActive < lowestScore) {
        lowestScore = windowActive;
        bestSleepStart = startH;
      }
    }
    const bestSleepEnd = (bestSleepStart + 6) % 24;
    const confidence = totalActivePings > 0
      ? Math.max(70, Math.min(99, Math.round(100 - (lowestScore / Math.max(1, totalActivePings)) * 100)))
      : 85;

    const summary = {
      totalActivePings,
      totalIdleChecks,
      totalMoonPings,
      moonRatio: totalActivePings > 0 ? Number((totalMoonPings / totalActivePings).toFixed(2)) : 0,
      detectedSleepStartUTC: bestSleepStart,
      detectedSleepEndUTC: bestSleepEnd,
      confidence,
    };

    return json({
      success: true,
      playerId,
      playerName: playerInfo?.player_name || queryPlayer,
      playerStatus: playerInfo?.player_status || null,
      allianceTag: playerInfo?.alliance_tag || null,
      planetCount: playerInfo?.planet_count || 0,
      universeId,
      planets: planetsRows?.results || [],
      heatmap: heatmapList,
      observations: observationsRows?.results || [],
      recentEvents: eventsRows?.results || [],
      summary,
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
    const allianceId = (member && !('error' in member)) ? member.alliance_id : 'public';
    const typesParam = url.searchParams.get('types');
    const singleTypeParam = url.searchParams.get('type');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || `${(page - 1) * limit}`, 10));
    const beforeTimestamp = url.searchParams.get('before') ? parseInt(url.searchParams.get('before')!, 10) : null;
    const db = getUniverseDb(env, universeId);

    const VALID_EVENT_TYPES = ['status_changed', 'colonized', 'abandoned', 'relocated', 'moon_spawned', 'moon_destroyed', 'player_renamed'];

    let filteredTypes: string[] | null = null;
    if (typesParam !== null) {
      if (typesParam.trim() === '' || typesParam.trim().toLowerCase() === 'none') {
        return json({
          success: true,
          universeId,
          events: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 1,
            hasMore: false,
          }
        });
      }
      filteredTypes = typesParam.split(',').map(s => s.trim().toLowerCase()).filter(s => VALID_EVENT_TYPES.includes(s));
      if (filteredTypes.length === 0) {
        return json({
          success: true,
          universeId,
          events: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 1,
            hasMore: false,
          }
        });
      }
    } else if (singleTypeParam && VALID_EVENT_TYPES.includes(singleTypeParam.trim().toLowerCase())) {
      filteredTypes = [singleTypeParam.trim().toLowerCase()];
    }

    // 1. Total event count query for tactical pagination (sargable index lookup)
    let typeFilter = '';
    const extraParams: any[] = [];
    if (filteredTypes && filteredTypes.length > 0 && filteredTypes.length < VALID_EVENT_TYPES.length) {
      if (filteredTypes.length === 1) {
        typeFilter = ` AND event_type = ?`;
        extraParams.push(filteredTypes[0]);
      } else {
        const placeholders = filteredTypes.map(() => '?').join(', ');
        typeFilter = ` AND event_type IN (${placeholders})`;
        extraParams.push(...filteredTypes);
      }
    }

    let countQuery: string;
    let countParams: any[];
    if (allianceId === 'public') {
      countQuery = `SELECT COUNT(*) as count FROM universe_events WHERE alliance_id = 'public' AND universe_id = ?${typeFilter}`;
      countParams = [universeId, ...extraParams];
    } else {
      countQuery = `
        SELECT (
          (SELECT COUNT(*) FROM universe_events WHERE alliance_id = ? AND universe_id = ?${typeFilter}) +
          (SELECT COUNT(*) FROM universe_events WHERE alliance_id = 'public' AND universe_id = ?${typeFilter})
        ) as count
      `;
      countParams = [allianceId, universeId, ...extraParams, universeId, ...extraParams];
    }
    const countRow: any = await db.prepare(countQuery).bind(...countParams).first();
    const totalCount = countRow?.count ? Number(countRow.count) : 0;

    // 2. Events query with pagination
    let query = `
      SELECT e.event_id, e.alliance_id, e.universe_id, e.galaxy, e.system, e.slot, e.event_type, e.player_id,
             COALESCE(NULLIF(NULLIF(e.player_name, ''), 'null'), NULLIF(NULLIF(s.player_name, ''), 'null'), NULLIF(NULLIF(b.player_name, ''), 'null')) as player_name,
             COALESCE(NULLIF(e.detected_by, ''), CASE WHEN e.alliance_id = 'public' THEN 'Gameforge Sync' ELSE COALESCE(s.last_scanned_by, 'Overwatch Scout') END) as detected_by,
             e.old_state_json, e.new_state_json, e.detected_at,
             COALESCE(s.player_status, b.player_status) as current_player_status
      FROM universe_events e
      LEFT JOIN alliance_galaxy_slots s
        ON e.alliance_id = s.alliance_id AND e.universe_id = s.universe_id AND e.galaxy = s.galaxy AND e.system = s.system AND e.slot = s.slot
      LEFT JOIN universe_baseline_planets b
        ON e.universe_id = b.universe_id AND e.galaxy = b.galaxy AND e.system = b.system AND e.slot = b.slot
      WHERE (e.alliance_id = ? OR e.alliance_id = 'public') AND e.universe_id = ?
    `;
    const params: any[] = [allianceId, universeId];

    if (filteredTypes && filteredTypes.length > 0 && filteredTypes.length < VALID_EVENT_TYPES.length) {
      if (filteredTypes.length === 1) {
        query += ` AND e.event_type = ?`;
        params.push(filteredTypes[0]);
      } else {
        const placeholders = filteredTypes.map(() => '?').join(', ');
        query += ` AND e.event_type IN (${placeholders})`;
        params.push(...filteredTypes);
      }
    }

    if (beforeTimestamp) {
      query += ` AND e.detected_at < ?`;
      params.push(beforeTimestamp);
    }

    query += ` ORDER BY e.detected_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all();

    return json({
      success: true,
      universeId,
      events: result?.results || [],
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        hasMore: offset + (result?.results?.length || 0) < totalCount,
      }
    });
  } catch (err: any) {
    console.error('Error in handleGetGalaxyEvents:', err);
    return json({ error: 'Failed to fetch galaxy events', details: err.message }, { status: 500 });
  }
}

/**
 * Handles GET /api/v1/galaxy/system
 * Features:
 * - Pillar 5: Zero-Cost RAM/Edge Cache Lookup (sub-5ms response)
 * - Pillar 2: Strict Alliance Intel Isolation (Alliance Survey overlay or Gameforge Baseline fallback)
 * - Pillar 1: Sparse Storage (synthesizes empty slots 1..15 in memory)
 */
export async function handleGetSystem(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    const url = new URL(req.url);
    const universeId = cleanUniverseId(url.searchParams.get('universeId') || (member && !('error' in member) ? member.universe_id : 's267-en'));
    const allianceId = (member && !('error' in member)) ? member.alliance_id : 'public';
    const galaxy = parseInt(url.searchParams.get('galaxy') || '1', 10);
    const system = parseInt(url.searchParams.get('system') || '1', 10);

    if (isNaN(galaxy) || isNaN(system) || galaxy < 1 || galaxy > 9 || system < 1 || system > 499) {
      return json({ error: 'Invalid coordinates. Galaxy must be 1-9, system 1-499' }, { status: 400 });
    }

    // 1. Edge Cache Lookup (Zero-Cost RAM Hit)
    const cachedResponse = await getCachedSystemResponse(universeId, allianceId, galaxy, system);
    if (cachedResponse) {
      return cachedResponse;
    }

    const db = getUniverseDb(env, universeId);

    // 2. Check if this alliance has scouted this system in-game
    const scannedRecord: any = await db.prepare(
      `SELECT scanned_at, scanned_by FROM alliance_scanned_systems
       WHERE alliance_id = ? AND universe_id = ? AND galaxy = ? AND system = ?`
    ).bind(allianceId, universeId, galaxy, system).first();

    const hasScanned = !!scannedRecord;

    // 3. Query appropriate storage layer: Alliance Overlay vs. Baseline
    let slotsRows: any;
    if (hasScanned) {
      slotsRows = await db.prepare(
        `SELECT slot, planet_id, planet_name, player_id, player_name, player_status, player_rank,
                alliance_tag, has_moon, moon_id, moon_size, moon_destroyed,
                debris_metal, debris_crystal, debris_reaper_metal, debris_reaper_crystal,
                last_activity_marker, last_activity_timestamp,
                last_scanned_at, last_scanned_by, last_changed_at
         FROM alliance_galaxy_slots
         WHERE alliance_id = ? AND universe_id = ? AND galaxy = ? AND system = ?
         ORDER BY slot ASC`
      )
        .bind(allianceId, universeId, galaxy, system)
        .all();
    } else {
      slotsRows = await db.prepare(
        `SELECT slot, planet_id, planet_name, player_id, player_name, player_status,
                alliance_tag, has_moon, moon_id, moon_size, 0 as moon_destroyed,
                0 as debris_metal, 0 as debris_crystal, 0 as debris_reaper_metal, 0 as debris_reaper_crystal,
                NULL as last_activity_marker, NULL as last_activity_timestamp,
                last_updated_at as last_scanned_at, 'official_ogame_xml' as last_scanned_by, last_changed_at
         FROM universe_baseline_planets
         WHERE universe_id = ? AND galaxy = ? AND system = ?
         ORDER BY slot ASC`
      )
        .bind(universeId, galaxy, system)
        .all();
    }

    const slotsMap = new Map<number, any>();
    (slotsRows?.results || []).forEach((row: any) => {
      slotsMap.set(row.slot, row);
    });

    // 4. Synthesize complete 1..15 slot array (Sparse Storage Read Path)
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
          last_scanned_at: hasScanned ? scannedRecord.scanned_at : null,
          last_changed_at: null,
        });
      }
    }

    const payload = {
      success: true,
      universeId,
      galaxy,
      system,
      slots: fullSlots,
      scannedAt: hasScanned ? scannedRecord.scanned_at : null,
      scannedBy: hasScanned ? scannedRecord.scanned_by : 'official_ogame_xml',
    };

    // 5. Store into Edge Cache (Guaranteed fresh; will be purged on next scan)
    await putCachedSystemResponse(universeId, allianceId, galaxy, system, payload);

    return json(payload);
  } catch (err: any) {
    console.error('Error in handleGetSystem:', err);
    return json({ error: 'Failed to get system data', details: err.message }, { status: 500 });
  }
}
