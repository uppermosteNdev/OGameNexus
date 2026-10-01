// ============================================================================
// NEXUS OVERWATCH — PERSONAL VAULT CROSS-DEVICE SYNC ENGINE
// Enables seamless multi-terminal synchronization (PC, Laptop, Tablet, Mobile)
// for historical expeditions, combats, harvests, discoveries, planner & radar.
// ============================================================================

import { json } from 'itty-router';
import { Env } from './index';
import { getUniverseDb } from './dbRouter';
import { cleanUniverseId } from './universeSeeder';

export async function hashVaultKey(key: string, serverPepper: string): Promise<string> {
  const clean = key.trim();
  const data = new TextEncoder().encode(`NX_VAULT:${clean}:${serverPepper}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const TABLE_DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS personal_vault_credentials (
      universe_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      vault_key_hash TEXT NOT NULL,
      device_label TEXT,
      total_syncs INTEGER DEFAULT 0,
      last_sent_at INTEGER,
      last_fetched_at INTEGER,
      last_full_resync_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (universe_id, player_id)
  );`,
  `CREATE TABLE IF NOT EXISTS personal_vault_expeditions (
      universe_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      coords TEXT NOT NULL,
      depletion INTEGER DEFAULT 0,
      size INTEGER DEFAULT 0,
      result TEXT NOT NULL,
      result_details_json TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (universe_id, player_id, message_id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_vault_exp_time ON personal_vault_expeditions(universe_id, player_id, timestamp);`,
  `CREATE TABLE IF NOT EXISTS personal_vault_combats (
      universe_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      coords TEXT NOT NULL,
      winner TEXT NOT NULL,
      loot_metal INTEGER DEFAULT 0,
      loot_crystal INTEGER DEFAULT 0,
      loot_deut INTEGER DEFAULT 0,
      loot_food INTEGER DEFAULT 0,
      debris_metal INTEGER DEFAULT 0,
      debris_crystal INTEGER DEFAULT 0,
      debris_deut INTEGER DEFAULT 0,
      attacker_losses INTEGER DEFAULT 0,
      defender_losses INTEGER DEFAULT 0,
      attacker_name TEXT,
      defender_name TEXT,
      my_losses INTEGER DEFAULT 0,
      is_acs INTEGER DEFAULT 0,
      is_expedition INTEGER DEFAULT 0,
      expedition_attack_type TEXT,
      summary_json TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (universe_id, player_id, message_id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_vault_com_time ON personal_vault_combats(universe_id, player_id, timestamp);`,
  `CREATE TABLE IF NOT EXISTS personal_vault_harvests (
      universe_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      harvest_key TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      coords TEXT NOT NULL,
      metal INTEGER DEFAULT 0,
      crystal INTEGER DEFAULT 0,
      deut INTEGER DEFAULT 0,
      recycler_amount INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (universe_id, player_id, message_id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_vault_harv_time ON personal_vault_harvests(universe_id, player_id, timestamp);`,
  `CREATE TABLE IF NOT EXISTS personal_vault_discoveries (
      universe_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      coords TEXT NOT NULL,
      lifeform INTEGER,
      discovery_type TEXT NOT NULL,
      lifeform_exp INTEGER DEFAULT 0,
      artifacts_found INTEGER DEFAULT 0,
      artifact_size TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (universe_id, player_id, message_id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_vault_disc_time ON personal_vault_discoveries(universe_id, player_id, timestamp);`,
  `CREATE TABLE IF NOT EXISTS personal_vault_planner (
      universe_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      project_key TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      target_level INTEGER NOT NULL,
      planet_id TEXT,
      planet_name TEXT,
      coords TEXT,
      cost_metal INTEGER DEFAULT 0,
      cost_crystal INTEGER DEFAULT 0,
      cost_deut INTEGER DEFAULT 0,
      msu_cost INTEGER DEFAULT 0,
      prod_delta_metal INTEGER DEFAULT 0,
      prod_delta_crystal INTEGER DEFAULT 0,
      prod_delta_deut INTEGER DEFAULT 0,
      roi_hours REAL DEFAULT 0,
      timestamp INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (universe_id, player_id, project_key)
  );`,
  `CREATE TABLE IF NOT EXISTS personal_vault_radar (
      universe_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      planet_id TEXT NOT NULL,
      planet_key TEXT NOT NULL,
      target_player_id TEXT,
      target_player_name TEXT,
      coords TEXT NOT NULL,
      metal_per_hour INTEGER DEFAULT 0,
      crystal_per_hour INTEGER DEFAULT 0,
      deut_per_hour INTEGER DEFAULT 0,
      production_msu_per_hour REAL DEFAULT 0,
      last_spied_metal INTEGER DEFAULT 0,
      last_spied_crystal INTEGER DEFAULT 0,
      last_spied_deut INTEGER DEFAULT 0,
      last_spied_timestamp INTEGER DEFAULT 0,
      player_status_json TEXT DEFAULT '[]',
      last_hash_code TEXT,
      spy_count INTEGER DEFAULT 0,
      confidence INTEGER DEFAULT 0,
      loot_percentage INTEGER DEFAULT 50,
      capacities_json TEXT DEFAULT '{}',
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (universe_id, player_id, coords)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_vault_radar_coords ON personal_vault_radar(universe_id, player_id, coords);`
];

let tablesEnsured = true; // All tables verified and created in D1 migration

/**
 * Ensures all Personal Vault SQLite tables and indices exist in D1.
 * Executes all statements in a single batch (consuming only 1 subrequest).
 */
export async function ensurePersonalVaultTables(db: D1Database): Promise<void> {
  if (tablesEnsured) return;
  try {
    const stmts = TABLE_DDL_STATEMENTS.map(sql => db.prepare(sql));
    await db.batch(stmts);
    try {
      await db.prepare('ALTER TABLE personal_vault_credentials ADD COLUMN last_full_resync_at INTEGER').run();
    } catch {}
    tablesEnsured = true;
  } catch (err: any) {
    console.error('[PersonalVault] Error executing table migration statements:', err.message);
  }
}

interface VaultCredentialsResult {
  valid: boolean;
  isNew: boolean;
  lastFullResyncAt?: number | null;
  lastSentAt?: number | null;
  notFound?: boolean;
  error?: string;
}

/**
 * Authenticates or auto-registers the player's personal vault key on first use.
 */
async function authenticateVault(
  db: D1Database,
  universeId: string,
  playerId: string,
  vaultKey: string,
  serverPepper: string,
  deviceLabel?: string
): Promise<VaultCredentialsResult> {
  if (!vaultKey || typeof vaultKey !== 'string' || vaultKey.trim().length < 6) {
    return { valid: false, isNew: false, error: 'Vault key must be at least 6 characters' };
  }

  const keyHash = await hashVaultKey(vaultKey, serverPepper);
  const now = Date.now();

  const existing = await db
    .prepare('SELECT vault_key_hash, last_full_resync_at, last_sent_at FROM personal_vault_credentials WHERE universe_id = ? AND player_id = ?')
    .bind(universeId, playerId)
    .first<{ vault_key_hash: string; last_full_resync_at?: number | null; last_sent_at?: number | null }>();

  if (!existing) {
    // Phase 4.2: Guard against arbitrary vault registration: verify player exists in universe baseline
    const playerCheck = await db
      .prepare('SELECT 1 FROM universe_baseline_planets WHERE universe_id = ? AND player_id = ? LIMIT 1')
      .bind(universeId, playerId)
      .first();

    if (!playerCheck) {
      return {
        valid: false,
        isNew: false,
        notFound: true,
        error: 'Player ID not found in active universe baseline. Please ensure your player ID is correct and active.',
      };
    }

    // First device connecting: register the vault key
    await db
      .prepare(`
        INSERT INTO personal_vault_credentials (
          universe_id, player_id, vault_key_hash, device_label, total_syncs, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, ?, ?)
      `)
      .bind(universeId, playerId, keyHash, deviceLabel || 'Primary Device', now, now)
      .run();

    return { valid: true, isNew: true, lastFullResyncAt: null, lastSentAt: null };
  }

  if (existing.vault_key_hash !== keyHash) {
    return { valid: false, isNew: false, error: 'Invalid Vault Key for this account. Check your device pairing key.' };
  }

  return {
    valid: true,
    isNew: false,
    lastFullResyncAt: existing.last_full_resync_at || null,
    lastSentAt: existing.last_sent_at || null,
  };
}

/**
 * Helper to execute an array of D1 prepared statements in chunks of up to 100 statements.
 * Uses atomic db.batch to minimize Cloudflare Worker subrequests.
 */
async function executeBatchStatements(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  const CHUNK_SIZE = 100;
  for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    const chunk = statements.slice(i, i + CHUNK_SIZE);
    if (chunk.length > 0) {
      await db.batch(chunk);
    }
  }
}

interface ActiveSyncSession {
  sessionId: string;
  playerId: string;
  startedAt: number;
  lastChunkAt: number;
}
const ACTIVE_SYNC_SESSIONS = new Map<string, ActiveSyncSession>();

// ============================================================================
// 1. VAULT SEND (PUSH LOCAL DATA TO CLOUD)
// ============================================================================
export async function handleVaultSend(req: Request, env: Env): Promise<Response> {
  try {
    // Reject payloads exceeding 2MB body limit
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 2 * 1024 * 1024) {
      return json({ error: 'Payload Too Large: Vault sync request cannot exceed 2MB' }, { status: 413 });
    }

    const body: any = await req.json();
    const rawUniverse = body.universeId || body.universe;
    const rawPlayerId = body.playerId;
    const vaultKey = body.vaultKey || req.headers.get('X-Nexus-Vault-Key');
    const deviceLabel = body.deviceLabel || 'Unknown Terminal';

    if (!rawUniverse || !rawPlayerId || !vaultKey) {
      return json({ error: 'Missing universeId, playerId, or vaultKey' }, { status: 400 });
    }

    const universeId = cleanUniverseId(String(rawUniverse));
    const playerId = String(rawPlayerId).trim();
    const db = getUniverseDb(env, universeId);

    const auth = await authenticateVault(db, universeId, playerId, vaultKey, env.SERVER_PEPPER, deviceLabel);
    if (!auth.valid) {
      if (auth.notFound) {
        return json({ error: auth.error || 'Player not found in active universe' }, { status: 404 });
      }
      return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    const syncSessionId = body.syncSessionId ? String(body.syncSessionId).trim() : null;
    const sessionKey = `${universeId}:${playerId}`;
    const activeSession = syncSessionId ? ACTIVE_SYNC_SESSIONS.get(sessionKey) : null;
    const isContinuingSession = Boolean(
      activeSession &&
      syncSessionId &&
      activeSession.sessionId === syncSessionId &&
      (now - activeSession.startedAt) < 60000
    );

    // Enforce 5-second write cooldown on initiating NEW sync sessions.
    // If request belongs to the same ongoing sync session (within 60s), allow sequential batch chunks.
    if (!isContinuingSession && auth.lastSentAt && (now - auth.lastSentAt) < 5000) {
      const waitMs = 5000 - (now - auth.lastSentAt);
      return json({
        error: `Sync rate limit exceeded. Please wait ${Math.ceil(waitMs / 1000)}s between sync calls.`,
        retryAfterMs: waitMs,
      }, { status: 429 });
    }

    if (syncSessionId) {
      ACTIVE_SYNC_SESSIONS.set(sessionKey, {
        sessionId: syncSessionId,
        playerId,
        startedAt: activeSession?.sessionId === syncSessionId ? activeSession.startedAt : now,
        lastChunkAt: now,
      });
      if (ACTIVE_SYNC_SESSIONS.size > 200) {
        const oldest = ACTIVE_SYNC_SESSIONS.keys().next().value;
        if (oldest) ACTIVE_SYNC_SESSIONS.delete(oldest);
      }
    }

    const isFullResync = Boolean(body.isFullResync);
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Enforce 24-hour rate limit on Force Full Resync (Cloudflare D1 quota protection)
    if (isFullResync && !auth.isNew && auth.lastFullResyncAt) {
      const lastFull = Number(auth.lastFullResyncAt);
      const elapsed = now - lastFull;
      if (lastFull > 0 && elapsed < ONE_DAY_MS) {
        const remainingHours = Math.ceil((ONE_DAY_MS - elapsed) / (60 * 60 * 1000));
        return json({
          error: `Force Full Resync is limited to once every 24 hours to protect Cloudflare resources. Next full resync available in ~${remainingHours}h. (Smart Delta Sync is always unlimited).`,
          cooldownRemainingMs: ONE_DAY_MS - elapsed,
          lastFullResyncAt: lastFull,
        }, { status: 429 });
      }
    }

    // Phase 1.2: Enforce batch caps: max 500 items per array, max 1000 items total
    const expeditions: any[] = Array.isArray(body.expeditions) ? body.expeditions : [];
    const combats: any[] = Array.isArray(body.combats) ? body.combats : [];
    const harvests: any[] = Array.isArray(body.harvests) ? body.harvests : [];
    const discoveries: any[] = Array.isArray(body.discoveries) ? body.discoveries : [];
    const plannerProjects: any[] = Array.isArray(body.plannerProjects) ? body.plannerProjects : [];
    const radarTargets: any[] = Array.isArray(body.radarTargets) ? body.radarTargets : [];

    const MAX_ARRAY_LEN = 500;
    if (
      expeditions.length > MAX_ARRAY_LEN ||
      combats.length > MAX_ARRAY_LEN ||
      harvests.length > MAX_ARRAY_LEN ||
      discoveries.length > MAX_ARRAY_LEN ||
      plannerProjects.length > MAX_ARRAY_LEN ||
      radarTargets.length > MAX_ARRAY_LEN
    ) {
      return json({
        error: `Payload batch size exceeds maximum allowed limit of ${MAX_ARRAY_LEN} items per category. Please sync in smaller batches.`
      }, { status: 413 });
    }

    const totalItems = expeditions.length + combats.length + harvests.length + discoveries.length + plannerProjects.length + radarTargets.length;
    if (totalItems > 1000) {
      return json({
        error: `Total payload items (${totalItems}) exceeds maximum allowed limit of 1000 items per request.`
      }, { status: 413 });
    }

    const statements: D1PreparedStatement[] = [];

    // --- A. Expeditions (Append-only / Idempotent) ---
    for (const exp of expeditions) {
      if (!exp.messageId || !exp.timestamp) continue;
      const detailsJson = exp.resultDetails ? JSON.stringify(exp.resultDetails) : null;
      statements.push(
        db.prepare(`
          INSERT OR IGNORE INTO personal_vault_expeditions (
            universe_id, player_id, message_id, timestamp, coords, depletion, size, result, result_details_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          universeId,
          playerId,
          String(exp.messageId),
          Number(exp.timestamp),
          String(exp.coords || ''),
          Number(exp.depletion || 0),
          Number(exp.size || 0),
          String(exp.result || 'unknown'),
          detailsJson,
          now
        )
      );
    }

    // --- B. Combat Reports (Append-only / Idempotent) ---
    for (const com of combats) {
      if (!com.messageId || !com.timestamp) continue;
      const loot = com.loot || {};
      const debris = com.debris || {};
      const summaryPayload = {
        attackerLosses: com.attackerLosses || 0,
        defenderLosses: com.defenderLosses || 0,
        honor: com.honor,
        moonChance: com.moonChance,
      };
      statements.push(
        db.prepare(`
          INSERT OR IGNORE INTO personal_vault_combats (
            universe_id, player_id, message_id, timestamp, coords, winner,
            loot_metal, loot_crystal, loot_deut, loot_food,
            debris_metal, debris_crystal, debris_deut,
            attacker_losses, defender_losses, attacker_name, defender_name,
            my_losses, is_acs, is_expedition, expedition_attack_type, summary_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          universeId,
          playerId,
          String(com.messageId),
          Number(com.timestamp),
          String(com.coords || ''),
          String(com.winner || 'none'),
          Number(loot.metal || 0),
          Number(loot.crystal || 0),
          Number(loot.deuterium || 0),
          Number(loot.food || 0),
          Number(debris.metal || 0),
          Number(debris.crystal || 0),
          Number(debris.deuterium || 0),
          Number(com.attackerLosses || 0),
          Number(com.defenderLosses || 0),
          com.attackerName || null,
          com.defenderName || null,
          Number(com.myLosses || 0),
          com.isAcs ? 1 : 0,
          com.isExpedition ? 1 : 0,
          com.expeditionAttackType || null,
          JSON.stringify(summaryPayload),
          now
        )
      );
    }

    // --- C. Debris Harvests (Append-only / Idempotent) ---
    for (const h of harvests) {
      const msgId = String(h.messageId || h.harvestKey || `${h.coords}_${h.timestamp}`);
      const cleanKey = `${universeId}_${msgId}`;
      const res = h.recycledResources || {};
      statements.push(
        db.prepare(`
          INSERT INTO personal_vault_harvests (
            universe_id, player_id, message_id, harvest_key, timestamp, coords,
            metal, crystal, deut, recycler_amount, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(universe_id, player_id, message_id) DO UPDATE SET
            harvest_key = excluded.harvest_key,
            timestamp = excluded.timestamp,
            coords = excluded.coords,
            metal = excluded.metal,
            crystal = excluded.crystal,
            deut = excluded.deut,
            recycler_amount = excluded.recycler_amount
        `).bind(
          universeId,
          playerId,
          msgId,
          cleanKey,
          Number(h.timestamp || now),
          String(h.coords || ''),
          Number(res.metal || 0),
          Number(res.crystal || 0),
          Number(res.deuterium || 0),
          Number(h.recyclerAmount || 0),
          now
        )
      );
    }

    // --- D. Lifeform Discoveries (Append-only / Idempotent) ---
    for (const d of discoveries) {
      if (!d.messageId) continue;
      statements.push(
        db.prepare(`
          INSERT OR IGNORE INTO personal_vault_discoveries (
            universe_id, player_id, message_id, timestamp, coords, lifeform,
            discovery_type, lifeform_exp, artifacts_found, artifact_size, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          universeId,
          playerId,
          String(d.messageId),
          Number(d.timestamp || now),
          String(d.coords || ''),
          d.lifeform !== undefined ? Number(d.lifeform) : null,
          String(d.discoveryType || 'unknown'),
          Number(d.lifeformGainedExperience || 0),
          Number(d.artifactsFound || 0),
          d.artifactSize ? String(d.artifactSize) : null,
          now
        )
      );
    }

    // --- E. Costs Planner Queues (Upsert) ---
    for (const p of plannerProjects) {
      if (!p.projectKey) continue;
      const cost = p.cost || {};
      const prodDelta = p.prodDelta || {};
      statements.push(
        db.prepare(`
          INSERT INTO personal_vault_planner (
            universe_id, player_id, project_key, name, type, target_level,
            planet_id, planet_name, coords, cost_metal, cost_crystal, cost_deut,
            msu_cost, prod_delta_metal, prod_delta_crystal, prod_delta_deut,
            roi_hours, timestamp, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(universe_id, player_id, project_key) DO UPDATE SET
            name = excluded.name,
            target_level = excluded.target_level,
            cost_metal = excluded.cost_metal,
            cost_crystal = excluded.cost_crystal,
            cost_deut = excluded.cost_deut,
            msu_cost = excluded.msu_cost,
            prod_delta_metal = excluded.prod_delta_metal,
            prod_delta_crystal = excluded.prod_delta_crystal,
            prod_delta_deut = excluded.prod_delta_deut,
            roi_hours = excluded.roi_hours,
            timestamp = excluded.timestamp
        `).bind(
          universeId,
          playerId,
          String(p.projectKey),
          String(p.name || 'Project'),
          String(p.type || 'building'),
          Number(p.targetLevel || 1),
          p.planetId || null,
          p.planetName || null,
          p.coords || null,
          Number(cost.metal || 0),
          Number(cost.crystal || 0),
          Number(cost.deuterium || 0),
          Number(p.msuCost || 0),
          Number(prodDelta.metal || 0),
          Number(prodDelta.crystal || 0),
          Number(prodDelta.deuterium || 0),
          Number(p.roiHours || 0),
          Number(p.timestamp || now),
          now
        )
      );
    }

    // --- F. Raid Radar Targets (Highest Production Rule & Safe Non-Destructive Merge via single batched UPSERT) ---
    let radarMergedCount = 0;

    for (const r of radarTargets) {
      if (!r.coords || typeof r.coords !== 'string') continue;
      const coords = r.coords.replace(/[\[\]\s]/g, '').trim();
      if (!coords) continue;

      const incomingMetalPerHour = Number(r.metalPerHour || 0);
      const incomingCrystalPerHour = Number(r.crystalPerHour || 0);
      const incomingDeutPerHour = Number(r.deuteriumPerHour || 0);
      const incomingProdMsu = incomingMetalPerHour + 1.5 * incomingCrystalPerHour + 3.0 * incomingDeutPerHour;

      const incomingLastSpiedTimestamp = Number(r.lastSpiedTimestamp || 0);
      const incomingLastSpiedMetal = Number(r.lastSpiedMetal || 0);
      const incomingLastSpiedCrystal = Number(r.lastSpiedCrystal || 0);
      const incomingLastSpiedDeut = Number(r.lastSpiedDeuterium || 0);

      const incomingCapacities = {
        metalCapacity: r.metalCapacity,
        crystalCapacity: r.crystalCapacity,
        deuteriumCapacity: r.deuteriumCapacity,
        metalStorageLevel: r.metalStorageLevel,
        crystalStorageLevel: r.crystalStorageLevel,
        deuteriumStorageLevel: r.deuteriumStorageLevel,
      };

      statements.push(
        db.prepare(`
          INSERT INTO personal_vault_radar (
            universe_id, player_id, planet_id, planet_key, target_player_id, target_player_name,
            coords, metal_per_hour, crystal_per_hour, deut_per_hour, production_msu_per_hour,
            last_spied_metal, last_spied_crystal, last_spied_deut, last_spied_timestamp,
            player_status_json, last_hash_code, spy_count, confidence, loot_percentage,
            capacities_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(universe_id, player_id, coords) DO UPDATE SET
            planet_id = excluded.planet_id,
            planet_key = excluded.planet_key,
            target_player_id = COALESCE(excluded.target_player_id, personal_vault_radar.target_player_id),
            target_player_name = CASE WHEN excluded.target_player_name IS NOT NULL AND excluded.target_player_name != 'Unknown' THEN excluded.target_player_name ELSE personal_vault_radar.target_player_name END,
            metal_per_hour = CASE WHEN excluded.production_msu_per_hour > personal_vault_radar.production_msu_per_hour THEN excluded.metal_per_hour ELSE personal_vault_radar.metal_per_hour END,
            crystal_per_hour = CASE WHEN excluded.production_msu_per_hour > personal_vault_radar.production_msu_per_hour THEN excluded.crystal_per_hour ELSE personal_vault_radar.crystal_per_hour END,
            deut_per_hour = CASE WHEN excluded.production_msu_per_hour > personal_vault_radar.production_msu_per_hour THEN excluded.deut_per_hour ELSE personal_vault_radar.deut_per_hour END,
            production_msu_per_hour = MAX(excluded.production_msu_per_hour, personal_vault_radar.production_msu_per_hour),
            last_spied_metal = CASE WHEN excluded.last_spied_timestamp >= personal_vault_radar.last_spied_timestamp THEN excluded.last_spied_metal ELSE personal_vault_radar.last_spied_metal END,
            last_spied_crystal = CASE WHEN excluded.last_spied_timestamp >= personal_vault_radar.last_spied_timestamp THEN excluded.last_spied_crystal ELSE personal_vault_radar.last_spied_crystal END,
            last_spied_deut = CASE WHEN excluded.last_spied_timestamp >= personal_vault_radar.last_spied_timestamp THEN excluded.last_spied_deut ELSE personal_vault_radar.last_spied_deut END,
            last_hash_code = CASE WHEN excluded.last_spied_timestamp >= personal_vault_radar.last_spied_timestamp THEN COALESCE(excluded.last_hash_code, personal_vault_radar.last_hash_code) ELSE personal_vault_radar.last_hash_code END,
            loot_percentage = CASE WHEN excluded.last_spied_timestamp >= personal_vault_radar.last_spied_timestamp THEN COALESCE(excluded.loot_percentage, personal_vault_radar.loot_percentage) ELSE personal_vault_radar.loot_percentage END,
            capacities_json = CASE WHEN excluded.last_spied_timestamp >= personal_vault_radar.last_spied_timestamp AND excluded.capacities_json != '{}' THEN excluded.capacities_json ELSE personal_vault_radar.capacities_json END,
            player_status_json = CASE WHEN excluded.player_status_json != '[]' THEN excluded.player_status_json ELSE personal_vault_radar.player_status_json END,
            last_spied_timestamp = MAX(excluded.last_spied_timestamp, personal_vault_radar.last_spied_timestamp),
            spy_count = MAX(excluded.spy_count, personal_vault_radar.spy_count),
            confidence = MAX(excluded.confidence, personal_vault_radar.confidence),
            updated_at = excluded.updated_at
        `).bind(
          universeId,
          playerId,
          String(r.planetId || ''),
          String(r.planetKey || `${universeId}_${r.planetId || coords}`),
          r.playerId ? String(r.playerId) : null,
          r.playerName || 'Unknown',
          coords,
          incomingMetalPerHour,
          incomingCrystalPerHour,
          incomingDeutPerHour,
          incomingProdMsu,
          incomingLastSpiedMetal,
          incomingLastSpiedCrystal,
          incomingLastSpiedDeut,
          incomingLastSpiedTimestamp,
          JSON.stringify(r.playerStatus || []),
          r.lastHashCode || null,
          Number(r.spyCount || 1),
          Number(r.confidence || 50),
          Number(r.lootPercentage || 50),
          JSON.stringify(incomingCapacities),
          now
        )
      );
      radarMergedCount++;
    }

    // Execute all prepared statements in efficient batches
    if (statements.length > 0) {
      await executeBatchStatements(db, statements);
    }

    // Update vault credentials telemetry
    if (isFullResync) {
      await db
        .prepare(`
          UPDATE personal_vault_credentials SET
            total_syncs = total_syncs + 1,
            last_sent_at = ?,
            last_full_resync_at = ?,
            device_label = ?,
            updated_at = ?
          WHERE universe_id = ? AND player_id = ?
        `)
        .bind(now, now, deviceLabel, now, universeId, playerId)
        .run();
    } else {
      await db
        .prepare(`
          UPDATE personal_vault_credentials SET
            total_syncs = total_syncs + 1,
            last_sent_at = ?,
            device_label = ?,
            updated_at = ?
          WHERE universe_id = ? AND player_id = ?
        `)
        .bind(now, deviceLabel, now, universeId, playerId)
        .run();
    }

    return json({
      success: true,
      message: 'Personal Vault successfully updated',
      saved: {
        expeditions: expeditions.length,
        combats: combats.length,
        harvests: harvests.length,
        discoveries: discoveries.length,
        planner: plannerProjects.length,
        radar: radarMergedCount,
      },
      lastSentAt: now,
    });
  } catch (err: any) {
    return json({ error: err.message || 'Failed to send data to Personal Vault' }, { status: 500 });
  }
}

// ============================================================================
// 2. VAULT FETCH (PULL SOURCE OF TRUTH FROM CLOUD)
// ============================================================================
export async function handleVaultFetch(req: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(req.url);
    const rawUniverse = url.searchParams.get('universeId') || url.searchParams.get('universe');
    const rawPlayerId = url.searchParams.get('playerId');
    const vaultKey = url.searchParams.get('vaultKey') || req.headers.get('X-Nexus-Vault-Key');
    const sinceTimestamp = Number(url.searchParams.get('sinceTimestamp') || 0);
    const sinceExp = Number(url.searchParams.get('sinceExpTimestamp') || sinceTimestamp || 0);
    const sinceCom = Number(url.searchParams.get('sinceComTimestamp') || sinceTimestamp || 0);
    const sinceHarv = Number(url.searchParams.get('sinceHarvTimestamp') || sinceTimestamp || 0);
    const sinceDisc = Number(url.searchParams.get('sinceDiscTimestamp') || sinceTimestamp || 0);
    const sinceRadar = Number(url.searchParams.get('sinceRadarTimestamp') || 0);
    const limitExp = Math.min(Number(url.searchParams.get('limitExp') || 10000), 20000);

    if (!rawUniverse || !rawPlayerId || !vaultKey) {
      return json({ error: 'Missing universeId, playerId, or vaultKey' }, { status: 400 });
    }

    const universeId = cleanUniverseId(String(rawUniverse));
    const playerId = String(rawPlayerId).trim();
    const db = getUniverseDb(env, universeId);

    const auth = await authenticateVault(db, universeId, playerId, vaultKey, env.SERVER_PEPPER);
    if (!auth.valid) {
      if (auth.notFound) {
        return json({ error: auth.error || 'Player not found in active universe' }, { status: 404 });
      }
      return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    const isExplicitFullDownload = url.searchParams.get('isFullResync') === '1' || url.searchParams.get('forceFullDownload') === '1';
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Enforce 24-hour rate limit ONLY on explicit Force Full Download (Cloudflare D1 quota protection).
    // Smart Delta Sync and initial device downloads are always permitted.
    if (isExplicitFullDownload && !auth.isNew && auth.lastFullResyncAt) {
      const lastFull = Number(auth.lastFullResyncAt);
      const elapsed = now - lastFull;
      if (lastFull > 0 && elapsed < ONE_DAY_MS) {
        const remainingHours = Math.ceil((ONE_DAY_MS - elapsed) / (60 * 60 * 1000));
        return json({
          error: `Force Full Download is limited to once every 24 hours to protect Cloudflare resources. Next full download available in ~${remainingHours}h. (Smart Delta Sync is always unlimited).`,
          cooldownRemainingMs: ONE_DAY_MS - elapsed,
          lastFullResyncAt: lastFull,
        }, { status: 429 });
      }
    }

    // Expeditions (support granular sinceExp filter & cursor pagination)
    const expQuery = sinceExp > 0
      ? db
          .prepare(`
            SELECT message_id as messageId, timestamp, coords, depletion, size, result, result_details_json
            FROM personal_vault_expeditions
            WHERE universe_id = ? AND player_id = ? AND timestamp > ?
            ORDER BY timestamp ASC
            LIMIT ?
          `)
          .bind(universeId, playerId, sinceExp, limitExp)
      : db
          .prepare(`
            SELECT message_id as messageId, timestamp, coords, depletion, size, result, result_details_json
            FROM personal_vault_expeditions
            WHERE universe_id = ? AND player_id = ?
            ORDER BY timestamp ASC
            LIMIT ?
          `)
          .bind(universeId, playerId, limitExp);

    const expeditions = await expQuery.all();
    const expResults: any[] = expeditions.results || [];
    const hasMoreExpeditions = expResults.length >= limitExp;
    const nextExpTimestamp = expResults.length > 0 ? Number(expResults[expResults.length - 1].timestamp) : null;

    // Combats (support granular sinceCom filter with LIMIT 5000)
    const comQuery = sinceCom > 0
      ? db
          .prepare(`
            SELECT message_id as messageId, timestamp, coords, winner,
                   loot_metal, loot_crystal, loot_deut, loot_food,
                   debris_metal, debris_crystal, debris_deut,
                   attacker_losses, defender_losses, attacker_name, defender_name,
                   my_losses, is_acs, is_expedition, expedition_attack_type, summary_json
            FROM personal_vault_combats
            WHERE universe_id = ? AND player_id = ? AND timestamp > ?
            ORDER BY timestamp ASC
            LIMIT 5000
          `)
          .bind(universeId, playerId, sinceCom)
      : db
          .prepare(`
            SELECT message_id as messageId, timestamp, coords, winner,
                   loot_metal, loot_crystal, loot_deut, loot_food,
                   debris_metal, debris_crystal, debris_deut,
                   attacker_losses, defender_losses, attacker_name, defender_name,
                   my_losses, is_acs, is_expedition, expedition_attack_type, summary_json
            FROM personal_vault_combats
            WHERE universe_id = ? AND player_id = ?
            ORDER BY timestamp ASC
            LIMIT 5000
          `)
          .bind(universeId, playerId);
    const combats = await comQuery.all();

    // Harvests (support granular sinceHarv filter with LIMIT 5000)
    const harvQuery = sinceHarv > 0
      ? db
          .prepare(`
            SELECT harvest_key as harvestKey, message_id as messageId, timestamp, coords,
                   metal, crystal, deut, recycler_amount as recyclerAmount
            FROM personal_vault_harvests
            WHERE universe_id = ? AND player_id = ? AND timestamp > ?
            ORDER BY timestamp ASC
            LIMIT 5000
          `)
          .bind(universeId, playerId, sinceHarv)
      : db
          .prepare(`
            SELECT harvest_key as harvestKey, message_id as messageId, timestamp, coords,
                   metal, crystal, deut, recycler_amount as recyclerAmount
            FROM personal_vault_harvests
            WHERE universe_id = ? AND player_id = ?
            ORDER BY timestamp ASC
            LIMIT 5000
          `)
          .bind(universeId, playerId);
    const harvests = await harvQuery.all();

    // Discoveries (support granular sinceDisc filter with LIMIT 5000)
    const discQuery = sinceDisc > 0
      ? db
          .prepare(`
            SELECT message_id as messageId, timestamp, coords, lifeform,
                   discovery_type as discoveryType, lifeform_exp as lifeformGainedExperience,
                   artifacts_found as artifactsFound, artifact_size as artifactSize
            FROM personal_vault_discoveries
            WHERE universe_id = ? AND player_id = ? AND timestamp > ?
            ORDER BY timestamp ASC
            LIMIT 5000
          `)
          .bind(universeId, playerId, sinceDisc)
      : db
          .prepare(`
            SELECT message_id as messageId, timestamp, coords, lifeform,
                   discovery_type as discoveryType, lifeform_exp as lifeformGainedExperience,
                   artifacts_found as artifactsFound, artifact_size as artifactSize
            FROM personal_vault_discoveries
            WHERE universe_id = ? AND player_id = ?
            ORDER BY timestamp ASC
            LIMIT 5000
          `)
          .bind(universeId, playerId);
    const discoveries = await discQuery.all();

    // Planner (LIMIT 500)
    const planner = await db
      .prepare(`
        SELECT project_key as projectKey, name, type, target_level as targetLevel,
               planet_id as planetId, planet_name as planetName, coords,
               cost_metal, cost_crystal, cost_deut, msu_cost as msuCost,
               prod_delta_metal, prod_delta_crystal, prod_delta_deut,
               roi_hours as roiHours, timestamp
        FROM personal_vault_planner
        WHERE universe_id = ? AND player_id = ?
        LIMIT 500
      `)
      .bind(universeId, playerId)
      .all();

    // Radar Targets (support sinceRadarTimestamp filter with LIMIT 5000)
    const radarQuery = sinceRadar > 0
      ? db
          .prepare(`
            SELECT planet_id as planetId, planet_key as planetKey,
                   target_player_id as playerId, target_player_name as playerName,
                   coords, metal_per_hour as metalPerHour, crystal_per_hour as crystalPerHour,
                   deut_per_hour as deuteriumPerHour, production_msu_per_hour as productionMsuPerHour,
                   last_spied_metal as lastSpiedMetal, last_spied_crystal as lastSpiedCrystal,
                   last_spied_deut as lastSpiedDeuterium, last_spied_timestamp as lastSpiedTimestamp,
                   player_status_json, last_hash_code as lastHashCode, spy_count as spyCount,
                   confidence, loot_percentage as lootPercentage, capacities_json
            FROM personal_vault_radar
            WHERE universe_id = ? AND player_id = ? AND updated_at > ?
            LIMIT 5000
          `)
          .bind(universeId, playerId, sinceRadar)
      : db
          .prepare(`
            SELECT planet_id as planetId, planet_key as planetKey,
                   target_player_id as playerId, target_player_name as playerName,
                   coords, metal_per_hour as metalPerHour, crystal_per_hour as crystalPerHour,
                   deut_per_hour as deuteriumPerHour, production_msu_per_hour as productionMsuPerHour,
                   last_spied_metal as lastSpiedMetal, last_spied_crystal as lastSpiedCrystal,
                   last_spied_deut as lastSpiedDeuterium, last_spied_timestamp as lastSpiedTimestamp,
                   player_status_json, last_hash_code as lastHashCode, spy_count as spyCount,
                   confidence, loot_percentage as lootPercentage, capacities_json
            FROM personal_vault_radar
            WHERE universe_id = ? AND player_id = ?
            LIMIT 5000
          `)
          .bind(universeId, playerId);
    const radar = await radarQuery.all();

    // Update last_fetched_at (and last_full_resync_at ONLY if explicit force full download)
    if (isExplicitFullDownload) {
      await db
        .prepare('UPDATE personal_vault_credentials SET last_fetched_at = ?, last_full_resync_at = ?, updated_at = ? WHERE universe_id = ? AND player_id = ?')
        .bind(now, now, now, universeId, playerId)
        .run();
    } else {
      await db
        .prepare('UPDATE personal_vault_credentials SET last_fetched_at = ?, updated_at = ? WHERE universe_id = ? AND player_id = ?')
        .bind(now, now, universeId, playerId)
        .run();
    }

    // Format results to match client interfaces
    const formattedExpeditions = expResults.map((e: any) => ({
      messageId: e.messageId,
      playerId,
      timestamp: e.timestamp,
      coords: e.coords,
      depletion: e.depletion,
      size: e.size,
      result: e.result,
      resultDetails: e.result_details_json ? JSON.parse(e.result_details_json) : undefined,
      tracked: true,
    }));

    const formattedCombats = (combats.results || []).map((c: any) => {
      const summary = c.summary_json ? JSON.parse(c.summary_json) : {};
      return {
        messageId: c.messageId,
        playerId,
        timestamp: c.timestamp,
        coords: c.coords,
        winner: c.winner,
        loot: {
          metal: c.loot_metal,
          crystal: c.loot_crystal,
          deuterium: c.loot_deut,
          food: c.loot_food,
        },
        debris: {
          metal: c.debris_metal,
          crystal: c.debris_crystal,
          deuterium: c.debris_deut,
        },
        attackerLosses: c.attacker_losses,
        defenderLosses: c.defenderLosses || c.defender_losses,
        attackerName: c.attacker_name,
        defenderName: c.defender_name,
        myLosses: c.my_losses,
        isAcs: c.is_acs === 1,
        isExpedition: c.is_expedition === 1,
        expeditionAttackType: c.expedition_attack_type,
        honor: summary.honor,
        moonChance: summary.moonChance,
        tracked: true,
      };
    });

    const formattedHarvests = (harvests.results || []).map((h: any) => ({
      harvestKey: h.harvestKey,
      messageId: h.messageId,
      playerId,
      timestamp: h.timestamp,
      coords: h.coords,
      recycledResources: {
        metal: h.metal,
        crystal: h.crystal,
        deuterium: h.deut,
      },
      recyclerAmount: h.recyclerAmount,
      tracked: true,
      universe: universeId,
    }));

    const formattedDiscoveries = (discoveries.results || []).map((d: any) => ({
      messageId: d.messageId,
      playerId,
      timestamp: d.timestamp,
      coords: d.coords,
      lifeform: d.lifeform !== null ? d.lifeform : undefined,
      discoveryType: d.discoveryType,
      lifeformGainedExperience: d.lifeformGainedExperience,
      artifactsFound: d.artifactsFound,
      artifactSize: d.artifactSize,
      tracked: true,
    }));

    const formattedPlanner = (planner.results || []).map((p: any) => ({
      projectKey: p.projectKey,
      playerId,
      name: p.name,
      type: p.type,
      targetLevel: p.targetLevel,
      planetId: p.planetId,
      planetName: p.planetName,
      coords: p.coords,
      cost: {
        metal: p.cost_metal,
        crystal: p.cost_crystal,
        deuterium: p.cost_deut,
      },
      msuCost: p.msuCost,
      prodDelta: {
        metal: p.prod_delta_metal,
        crystal: p.prod_delta_crystal,
        deuterium: p.prod_delta_deut,
      },
      roiHours: p.roiHours,
      timestamp: p.timestamp,
    }));

    const formattedRadar = (radar.results || []).map((r: any) => {
      let playerStatus: string[] = [];
      try {
        playerStatus = r.player_status_json ? JSON.parse(r.player_status_json) : [];
      } catch {}

      let caps: any = {};
      try {
        caps = r.capacities_json ? JSON.parse(r.capacities_json) : {};
      } catch {}

      return {
        planetKey: r.planetKey || `${universeId}_${r.planetId}`,
        planetId: r.planetId,
        playerId: r.playerId || '',
        userPlayerId: playerId,
        universe: universeId,
        playerName: r.playerName || 'Unknown',
        coords: r.coords,
        metalPerHour: r.metalPerHour,
        crystalPerHour: r.crystalPerHour,
        deuteriumPerHour: r.deuteriumPerHour,
        lastSpiedMetal: r.lastSpiedMetal,
        lastSpiedCrystal: r.lastSpiedCrystal,
        lastSpiedDeuterium: r.lastSpiedDeuterium,
        lastSpiedTimestamp: r.lastSpiedTimestamp,
        playerStatus,
        lastHashCode: r.lastHashCode || '',
        spyCount: r.spyCount || 1,
        confidence: r.confidence || 50,
        lootPercentage: r.lootPercentage || 50,
        metalStorageLevel: caps.metalStorageLevel,
        crystalStorageLevel: caps.crystalStorageLevel,
        deuteriumStorageLevel: caps.deuteriumStorageLevel,
        metalCapacity: caps.metalCapacity,
        crystalCapacity: caps.crystalCapacity,
        deuteriumCapacity: caps.deuteriumCapacity,
      };
    });

    return json({
      success: true,
      expeditions: formattedExpeditions,
      combats: formattedCombats,
      harvests: formattedHarvests,
      discoveries: formattedDiscoveries,
      plannerProjects: formattedPlanner,
      radarTargets: formattedRadar,
      hasMoreExpeditions,
      nextExpTimestamp,
      lastFetchedAt: now,
    });
  } catch (err: any) {
    return json({ error: err.message || 'Failed to fetch Personal Vault data' }, { status: 500 });
  }
}

// ============================================================================
// 3. VAULT SUMMARY & TELEMETRY (QUICK COUNT STATUS)
// ============================================================================
export async function handleVaultSummary(req: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(req.url);
    const rawUniverse = url.searchParams.get('universeId') || url.searchParams.get('universe');
    const rawPlayerId = url.searchParams.get('playerId');
    const vaultKey = url.searchParams.get('vaultKey') || req.headers.get('X-Nexus-Vault-Key');

    if (!rawUniverse || !rawPlayerId) {
      return json({ error: 'Missing universeId or playerId' }, { status: 400 });
    }

    const universeId = cleanUniverseId(String(rawUniverse));
    const playerId = String(rawPlayerId).trim();
    const db = getUniverseDb(env, universeId);

    // Auto-create Personal Vault tables if they don't exist yet
    await ensurePersonalVaultTables(db);

    const creds = await db
      .prepare('SELECT vault_key_hash, total_syncs, last_sent_at, last_fetched_at, last_full_resync_at FROM personal_vault_credentials WHERE universe_id = ? AND player_id = ?')
      .bind(universeId, playerId)
      .first<any>();

    if (!creds) {
      return json({
        success: true,
        vaultRegistered: false,
        counts: {
          expeditions: 0,
          combats: 0,
          harvests: 0,
          discoveries: 0,
          planner: 0,
          radar: 0,
        },
        maxTimestamps: {
          expeditions: 0,
          combats: 0,
          harvests: 0,
          discoveries: 0,
          radar: 0,
        },
        totalSyncs: 0,
        lastSentAt: null,
        lastFetchedAt: null,
        lastFullResyncAt: null,
        canFullResync: true,
        fullResyncCooldownMs: 0,
      });
    }

    // Enforce mandatory Personal Vault authentication key
    if (!vaultKey) {
      return json({ error: 'Vault authentication key required' }, { status: 401 });
    }

    const keyHash = await hashVaultKey(vaultKey, env.SERVER_PEPPER);
    if (creds.vault_key_hash !== keyHash) {
      return json({ error: 'Invalid Vault Key for this account' }, { status: 401 });
    }

    const summaryBatch = await db.batch([
      db.prepare('SELECT COUNT(*) as count, MAX(timestamp) as maxTime FROM personal_vault_expeditions WHERE universe_id = ? AND player_id = ?').bind(universeId, playerId),
      db.prepare('SELECT COUNT(*) as count, MAX(timestamp) as maxTime FROM personal_vault_combats WHERE universe_id = ? AND player_id = ?').bind(universeId, playerId),
      db.prepare('SELECT COUNT(*) as count, MAX(timestamp) as maxTime FROM personal_vault_harvests WHERE universe_id = ? AND player_id = ?').bind(universeId, playerId),
      db.prepare('SELECT COUNT(*) as count, MAX(timestamp) as maxTime FROM personal_vault_discoveries WHERE universe_id = ? AND player_id = ?').bind(universeId, playerId),
      db.prepare('SELECT COUNT(*) as count FROM personal_vault_planner WHERE universe_id = ? AND player_id = ?').bind(universeId, playerId),
      db.prepare('SELECT COUNT(*) as count, MAX(updated_at) as maxUpdated FROM personal_vault_radar WHERE universe_id = ? AND player_id = ?').bind(universeId, playerId),
    ]);

    const expSummary = summaryBatch[0].results?.[0] as { count: number; maxTime: number | null } | undefined;
    const comSummary = summaryBatch[1].results?.[0] as { count: number; maxTime: number | null } | undefined;
    const harvSummary = summaryBatch[2].results?.[0] as { count: number; maxTime: number | null } | undefined;
    const discSummary = summaryBatch[3].results?.[0] as { count: number; maxTime: number | null } | undefined;
    const planCount = summaryBatch[4].results?.[0] as { count: number } | undefined;
    const radarSummary = summaryBatch[5].results?.[0] as { count: number; maxUpdated: number | null } | undefined;

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const lastFull = Number(creds.last_full_resync_at || 0);
    const elapsed = now - lastFull;
    const canFullResync = lastFull === 0 || elapsed >= ONE_DAY_MS;
    const fullResyncCooldownMs = canFullResync ? 0 : Math.max(0, ONE_DAY_MS - elapsed);

    return json({
      success: true,
      vaultRegistered: true,
      counts: {
        expeditions: expSummary?.count || 0,
        combats: comSummary?.count || 0,
        harvests: harvSummary?.count || 0,
        discoveries: discSummary?.count || 0,
        planner: planCount?.count || 0,
        radar: radarSummary?.count || 0,
      },
      maxTimestamps: {
        expeditions: expSummary?.maxTime || 0,
        combats: comSummary?.maxTime || 0,
        harvests: harvSummary?.maxTime || 0,
        discoveries: discSummary?.maxTime || 0,
        radar: radarSummary?.maxUpdated || 0,
      },
      totalSyncs: creds.total_syncs || 0,
      lastSentAt: creds.last_sent_at || null,
      lastFetchedAt: creds.last_fetched_at || null,
      lastFullResyncAt: creds.last_full_resync_at || null,
      canFullResync,
      fullResyncCooldownMs,
    });
  } catch (err: any) {
    return json({ error: err.message || 'Failed to fetch Personal Vault summary' }, { status: 500 });
  }
}
