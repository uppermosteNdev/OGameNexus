// ============================================================================
// NEXUS OVERWATCH — PERSONAL VAULT CLOUDFLARE R2 SYNC ENGINE
// High-capacity, zero-latency multi-device sync for historical archives:
// expeditions, combats, debris harvests, discoveries, costs planner, and raid radar.
// Backed by Cloudflare R2 object storage with native Web Streams gzip compression.
// Enforces a 2-minute (120-second) cooldown on upload/download operations.
// ============================================================================

import { json } from 'itty-router';
import { Env } from './index';
import { getUniverseDb } from './dbRouter';
import { cleanUniverseId } from './universeSeeder';
import { gzipCompress, gzipDecompress, PlayerVaultManifest } from './migrationR2';

export const VAULT_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes (120 seconds)

export function getSafePepper(pepper?: string): string {
  if (pepper && pepper !== 'CHANGE_ME_IN_CLOUDFLARE_SECRETS_OR_DEV_VARS') {
    return pepper;
  }
  return 'nexus_pepper_default';
}

export async function hashVaultKey(key: string, serverPepper?: string): Promise<string> {
  const clean = key.trim();
  const safePepper = getSafePepper(serverPepper);
  const data = new TextEncoder().encode(`NX_VAULT:${clean}:${safePepper}`);
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
];

let tablesEnsured = true;

export async function ensurePersonalVaultTables(db: D1Database): Promise<void> {
  if (tablesEnsured) return;
  try {
    const stmts = TABLE_DDL_STATEMENTS.map(sql => db.prepare(sql));
    await db.batch(stmts);
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
  lastFetchedAt?: number | null;
  notFound?: boolean;
  error?: string;
}

/**
 * Authenticates or auto-registers the player's personal vault key on first use.
 * Authentication credentials remain in D1 for fast sub-millisecond key verification.
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
    .prepare('SELECT vault_key_hash, last_full_resync_at, last_sent_at, last_fetched_at FROM personal_vault_credentials WHERE universe_id = ? AND player_id = ?')
    .bind(universeId, playerId)
    .first<{ vault_key_hash: string; last_full_resync_at?: number | null; last_sent_at?: number | null; last_fetched_at?: number | null }>();

  if (!existing) {
    // Verify player exists in universe baseline before registering new vault
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

    return { valid: true, isNew: true, lastFullResyncAt: null, lastSentAt: null, lastFetchedAt: null };
  }

  const candidatePeppers = Array.from(new Set([
    'nexus_overwatch_secret_pepper_2026',
    serverPepper,
    'nexus_pepper_default',
  ])).filter(p => p && p !== 'CHANGE_ME_IN_CLOUDFLARE_SECRETS_OR_DEV_VARS') as string[];

  let matchedHash: string | null = null;
  for (const p of candidatePeppers) {
    const testHash = await hashVaultKey(vaultKey, p);
    if (existing.vault_key_hash === testHash) {
      matchedHash = testHash;
      break;
    }
  }

  if (!matchedHash) {
    return { valid: false, isNew: false, error: 'Invalid Vault Key for this account. Check your device pairing key.' };
  }

  return {
    valid: true,
    isNew: false,
    lastFullResyncAt: existing.last_full_resync_at || null,
    lastSentAt: existing.last_sent_at || null,
    lastFetchedAt: existing.last_fetched_at || null,
  };
}

/**
 * Helper to fetch and decompress a category from R2 bucket.
 */
async function getR2Category(bucket: R2Bucket, prefix: string, catName: string): Promise<any[]> {
  try {
    const obj = await bucket.get(`${prefix}/${catName}.json.gz`);
    if (!obj) return [];
    const buf = await obj.arrayBuffer();
    const jsonStr = await gzipDecompress(buf);
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    console.warn(`[PersonalVault] Warning loading ${prefix}/${catName}.json.gz:`, err.message);
    return [];
  }
}

/**
 * Helper to compress and write a category to R2 bucket.
 */
async function putR2Category(
  bucket: R2Bucket,
  prefix: string,
  catName: string,
  data: any[],
  universeId: string,
  playerId: string
): Promise<number> {
  const jsonStr = JSON.stringify(data);
  const compressed = await gzipCompress(jsonStr);
  await bucket.put(`${prefix}/${catName}.json.gz`, compressed, {
    httpMetadata: {
      contentType: 'application/gzip',
      contentEncoding: 'gzip',
    },
    customMetadata: {
      category: catName,
      recordCount: String(data.length),
      universeId,
      playerId,
      timestamp: String(Date.now()),
    },
  });
  return compressed.byteLength;
}

/**
 * Merges two SpiedPlanet records applying highest production rule and latest timestamp rule.
 */
function mergeRadarTarget(existing: any, incoming: any): any {
  const incomingMetal = Number(incoming.metalPerHour || 0);
  const incomingCrystal = Number(incoming.crystalPerHour || 0);
  const incomingDeut = Number(incoming.deuteriumPerHour || 0);
  const incomingMsu = incomingMetal + 1.5 * incomingCrystal + 3.0 * incomingDeut;

  const existingMetal = Number(existing.metalPerHour || 0);
  const existingCrystal = Number(existing.crystalPerHour || 0);
  const existingDeut = Number(existing.deuteriumPerHour || 0);
  const existingMsu = Number(existing.productionMsuPerHour || (existingMetal + 1.5 * existingCrystal + 3.0 * existingDeut));

  const incomingTime = Number(incoming.lastSpiedTimestamp || 0);
  const existingTime = Number(existing.lastSpiedTimestamp || 0);
  const useIncomingScans = incomingTime >= existingTime;
  const useIncomingProd = incomingMsu >= existingMsu;

  return {
    ...existing,
    ...incoming,
    metalPerHour: useIncomingProd ? incomingMetal : existingMetal,
    crystalPerHour: useIncomingProd ? incomingCrystal : existingCrystal,
    deuteriumPerHour: useIncomingProd ? incomingDeut : existingDeut,
    productionMsuPerHour: Math.max(incomingMsu, existingMsu),
    lastSpiedMetal: useIncomingScans ? incoming.lastSpiedMetal : existing.lastSpiedMetal,
    lastSpiedCrystal: useIncomingScans ? incoming.lastSpiedCrystal : existing.lastSpiedCrystal,
    lastSpiedDeuterium: useIncomingScans ? incoming.lastSpiedDeuterium : existing.lastSpiedDeuterium,
    lastSpiedTimestamp: Math.max(incomingTime, existingTime),
    lastHashCode: useIncomingScans ? (incoming.lastHashCode || existing.lastHashCode) : existing.lastHashCode,
    lootPercentage: useIncomingScans ? (incoming.lootPercentage ?? existing.lootPercentage) : existing.lootPercentage,
    spyCount: Math.max(Number(incoming.spyCount || 1), Number(existing.spyCount || 1)),
    confidence: Math.max(Number(incoming.confidence || 50), Number(existing.confidence || 50)),
    playerStatus: (incoming.playerStatus && incoming.playerStatus.length > 0) ? incoming.playerStatus : (existing.playerStatus || []),
  };
}

// ============================================================================
// 1. VAULT SEND (PUSH LOCAL DATA TO CLOUDFLARE R2)
// ============================================================================
export async function handleVaultSend(req: Request, env: Env): Promise<Response> {
  try {
    if (!env.VAULT_BUCKET) {
      return json({ error: 'Server configuration error: VAULT_BUCKET is not bound.' }, { status: 500 });
    }

    // Inspect content encoding / compression
    const isCompressed = req.headers.get('x-vault-compression') === 'gzip' ||
      req.headers.get('content-encoding') === 'gzip' ||
      req.headers.get('content-type') === 'application/octet-stream';

    let body: any;
    if (isCompressed) {
      const buf = await req.arrayBuffer();
      const text = await gzipDecompress(buf);
      body = JSON.parse(text);
    } else {
      body = await req.json();
    }

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

    // Enforce 2-minute (120-second) cooldown on upload
    if (auth.lastSentAt && (now - auth.lastSentAt) < VAULT_COOLDOWN_MS) {
      const waitMs = VAULT_COOLDOWN_MS - (now - auth.lastSentAt);
      const remainingSec = Math.ceil(waitMs / 1000);
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      return json({
        error: `Upload cooldown active. Please wait ${timeStr} before uploading again.`,
        cooldownRemainingMs: waitMs,
        retryAfterMs: waitMs,
      }, { status: 429 });
    }

    const prefix = `vaults/${universeId}/${playerId}`;
    const isFullResync = Boolean(body.isFullResync);

    // Incoming payloads
    const incomingExpeditions: any[] = Array.isArray(body.expeditions) ? body.expeditions : [];
    const incomingCombats: any[] = Array.isArray(body.combats) ? body.combats : [];
    const incomingHarvests: any[] = Array.isArray(body.harvests) ? body.harvests : [];
    const incomingDiscoveries: any[] = Array.isArray(body.discoveries) ? body.discoveries : [];
    const incomingPlanner: any[] = Array.isArray(body.plannerProjects) ? body.plannerProjects : [];
    const incomingRadar: any[] = Array.isArray(body.radarTargets) ? body.radarTargets : [];
    const incomingNotes: any[] = Array.isArray(body.tacticalNotes) ? body.tacticalNotes : [];

    // Read existing categories from R2 for non-destructive merge (or full replacement if isFullResync)
    const [existingExp, existingCom, existingHarv, existingDisc, existingPlan, existingRadar, existingNotes] = await Promise.all([
      isFullResync ? Promise.resolve([]) : getR2Category(env.VAULT_BUCKET, prefix, 'expeditions'),
      isFullResync ? Promise.resolve([]) : getR2Category(env.VAULT_BUCKET, prefix, 'combats'),
      isFullResync ? Promise.resolve([]) : getR2Category(env.VAULT_BUCKET, prefix, 'harvests'),
      isFullResync ? Promise.resolve([]) : getR2Category(env.VAULT_BUCKET, prefix, 'discoveries'),
      isFullResync ? Promise.resolve([]) : getR2Category(env.VAULT_BUCKET, prefix, 'planner'),
      isFullResync ? Promise.resolve([]) : getR2Category(env.VAULT_BUCKET, prefix, 'radar'),
      isFullResync ? Promise.resolve([]) : getR2Category(env.VAULT_BUCKET, prefix, 'notes'),
    ]);

    // 1. Merge Expeditions (by messageId)
    const expMap = new Map<string, any>();
    for (const e of existingExp) if (e.messageId) expMap.set(String(e.messageId), e);
    for (const e of incomingExpeditions) if (e.messageId) expMap.set(String(e.messageId), { ...e, playerId, tracked: true });
    const mergedExpeditions = Array.from(expMap.values()).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));

    // 2. Merge Combats (by messageId)
    const comMap = new Map<string, any>();
    for (const c of existingCom) if (c.messageId) comMap.set(String(c.messageId), c);
    for (const c of incomingCombats) if (c.messageId) comMap.set(String(c.messageId), { ...c, playerId, tracked: true });
    const mergedCombats = Array.from(comMap.values()).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));

    // 3. Merge Harvests (by messageId / harvestKey)
    const harvMap = new Map<string, any>();
    for (const h of existingHarv) {
      const key = String(h.harvestKey || h.messageId || `${h.coords}_${h.timestamp}`);
      harvMap.set(key, h);
    }
    for (const h of incomingHarvests) {
      const key = String(h.harvestKey || h.messageId || `${h.coords}_${h.timestamp}`);
      harvMap.set(key, { ...h, playerId, tracked: true, universe: universeId });
    }
    const mergedHarvests = Array.from(harvMap.values()).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));

    // 4. Merge Discoveries (by messageId)
    const discMap = new Map<string, any>();
    for (const d of existingDisc) if (d.messageId) discMap.set(String(d.messageId), d);
    for (const d of incomingDiscoveries) if (d.messageId) discMap.set(String(d.messageId), { ...d, playerId, tracked: true });
    const mergedDiscoveries = Array.from(discMap.values()).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));

    // 5. Planner Sync: The client sends its complete active planner/cart state.
    // When plannerProjects array is explicitly sent in the payload, update to client's current state.
    let mergedPlanner: any[];
    if (Array.isArray(body.plannerProjects)) {
      mergedPlanner = incomingPlanner.map(p => ({ ...p, playerId }));
    } else {
      mergedPlanner = existingPlan;
    }

    // 6. Merge Radar Targets (by coords, applying Highest Production & Latest Timestamp Rules)
    const radarMap = new Map<string, any>();
    for (const r of existingRadar) {
      const coords = String(r.coords || '').replace(/[\[\]\s]/g, '').trim();
      if (coords) radarMap.set(coords, r);
    }
    for (const r of incomingRadar) {
      const coords = String(r.coords || '').replace(/[\[\]\s]/g, '').trim();
      if (!coords) continue;
      const existing = radarMap.get(coords);
      if (existing) {
        radarMap.set(coords, mergeRadarTarget(existing, r));
      } else {
        radarMap.set(coords, { ...r, universe: universeId, userPlayerId: playerId });
      }
    }
    const mergedRadar = Array.from(radarMap.values());

    // 7. Merge Tactical Notes (by noteKey, preserving latest updatedAt)
    const notesMap = new Map<string, any>();
    for (const n of existingNotes) if (n.noteKey) notesMap.set(String(n.noteKey), n);
    for (const n of incomingNotes) {
      if (!n.noteKey) continue;
      const existing = notesMap.get(String(n.noteKey));
      if (!existing || Number(n.updatedAt || 0) >= Number(existing.updatedAt || 0)) {
        notesMap.set(String(n.noteKey), { ...n, universe: universeId });
      }
    }
    const mergedNotes = Array.from(notesMap.values());

    // Write all updated categories to Cloudflare R2 with native gzip compression in parallel
    const [expSize, comSize, harvSize, discSize, planSize, radarSize, notesSize] = await Promise.all([
      putR2Category(env.VAULT_BUCKET, prefix, 'expeditions', mergedExpeditions, universeId, playerId),
      putR2Category(env.VAULT_BUCKET, prefix, 'combats', mergedCombats, universeId, playerId),
      putR2Category(env.VAULT_BUCKET, prefix, 'harvests', mergedHarvests, universeId, playerId),
      putR2Category(env.VAULT_BUCKET, prefix, 'discoveries', mergedDiscoveries, universeId, playerId),
      putR2Category(env.VAULT_BUCKET, prefix, 'planner', mergedPlanner, universeId, playerId),
      putR2Category(env.VAULT_BUCKET, prefix, 'radar', mergedRadar, universeId, playerId),
      putR2Category(env.VAULT_BUCKET, prefix, 'notes', mergedNotes, universeId, playerId),
    ]);

    // Calculate max timestamps
    const getMaxT = (items: any[], field = 'timestamp') => {
      let max = 0;
      for (const item of items) {
        const t = Number(item[field] || 0);
        if (t > max) max = t;
      }
      return max;
    };

    const maxTimestamps = {
      expeditions: getMaxT(mergedExpeditions, 'timestamp'),
      combats: getMaxT(mergedCombats, 'timestamp'),
      harvests: getMaxT(mergedHarvests, 'timestamp'),
      discoveries: getMaxT(mergedDiscoveries, 'timestamp'),
      radar: getMaxT(mergedRadar, 'lastSpiedTimestamp'),
    };

    const counts = {
      expeditions: mergedExpeditions.length,
      combats: mergedCombats.length,
      harvests: mergedHarvests.length,
      discoveries: mergedDiscoveries.length,
      planner: mergedPlanner.length,
      radar: mergedRadar.length,
      notes: mergedNotes.length,
    };

    // Write updated manifest to R2
    const manifest: PlayerVaultManifest = {
      version: 1,
      universeId,
      playerId,
      counts,
      maxTimestamps,
      compressedSizesBytes: {
        expeditions: expSize,
        combats: comSize,
        harvests: harvSize,
        discoveries: discSize,
        planner: planSize,
        radar: radarSize,
      },
      lastSentAt: now,
      lastFetchedAt: auth.lastFetchedAt || null,
      migratedAt: now,
      integrityVerified: true,
    };

    await env.VAULT_BUCKET.put(`${prefix}/manifest.json`, JSON.stringify(manifest, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });

    // Update D1 credentials telemetry (1 fast row write)
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

    return json({
      success: true,
      message: 'Personal Vault successfully updated in Cloudflare R2',
      saved: {
        expeditions: incomingExpeditions.length,
        combats: incomingCombats.length,
        harvests: incomingHarvests.length,
        discoveries: incomingDiscoveries.length,
        planner: incomingPlanner.length,
        radar: incomingRadar.length,
        notes: incomingNotes.length,
      },
      totalInVault: counts,
      lastSentAt: now,
      cooldownSeconds: 120,
    });
  } catch (err: any) {
    console.error('[VaultSend] Error:', err);
    return json({ error: err.message || 'Failed to send data to Personal Vault' }, { status: 500 });
  }
}

// ============================================================================
// 2. VAULT FETCH (PULL SOURCE OF TRUTH FROM CLOUDFLARE R2)
// ============================================================================
export async function handleVaultFetch(req: Request, env: Env): Promise<Response> {
  try {
    if (!env.VAULT_BUCKET) {
      return json({ error: 'Server configuration error: VAULT_BUCKET is not bound.' }, { status: 500 });
    }

    const url = new URL(req.url);
    const rawUniverse = url.searchParams.get('universeId') || url.searchParams.get('universe');
    const rawPlayerId = url.searchParams.get('playerId');
    const vaultKey = url.searchParams.get('vaultKey') || req.headers.get('X-Nexus-Vault-Key');

    const sinceExp = Number(url.searchParams.get('sinceExpTimestamp') || url.searchParams.get('sinceTimestamp') || 0);
    const sinceCom = Number(url.searchParams.get('sinceComTimestamp') || url.searchParams.get('sinceTimestamp') || 0);
    const sinceHarv = Number(url.searchParams.get('sinceHarvTimestamp') || url.searchParams.get('sinceTimestamp') || 0);
    const sinceDisc = Number(url.searchParams.get('sinceDiscTimestamp') || url.searchParams.get('sinceTimestamp') || 0);
    const isExplicitFullDownload = url.searchParams.get('isFullResync') === '1' || url.searchParams.get('forceFullDownload') === '1';

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

    // Enforce 2-minute (120-second) cooldown on download
    if (auth.lastFetchedAt && (now - auth.lastFetchedAt) < VAULT_COOLDOWN_MS) {
      const waitMs = VAULT_COOLDOWN_MS - (now - auth.lastFetchedAt);
      const remainingSec = Math.ceil(waitMs / 1000);
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      return json({
        error: `Download cooldown active. Please wait ${timeStr} before downloading again.`,
        cooldownRemainingMs: waitMs,
        retryAfterMs: waitMs,
      }, { status: 429 });
    }

    const prefix = `vaults/${universeId}/${playerId}`;

    // Read all categories from R2 in parallel
    const [rawExpeditions, rawCombats, rawHarvests, rawDiscoveries, rawPlanner, rawRadar, rawNotes] = await Promise.all([
      getR2Category(env.VAULT_BUCKET, prefix, 'expeditions'),
      getR2Category(env.VAULT_BUCKET, prefix, 'combats'),
      getR2Category(env.VAULT_BUCKET, prefix, 'harvests'),
      getR2Category(env.VAULT_BUCKET, prefix, 'discoveries'),
      getR2Category(env.VAULT_BUCKET, prefix, 'planner'),
      getR2Category(env.VAULT_BUCKET, prefix, 'radar'),
      getR2Category(env.VAULT_BUCKET, prefix, 'notes'),
    ]);

    // Apply granular delta filtering if not an explicit full download
    const expeditions = (!isExplicitFullDownload && sinceExp > 0)
      ? rawExpeditions.filter(e => Number(e.timestamp || 0) > sinceExp)
      : rawExpeditions;

    const combats = (!isExplicitFullDownload && sinceCom > 0)
      ? rawCombats.filter(c => Number(c.timestamp || 0) > sinceCom)
      : rawCombats;

    const harvests = (!isExplicitFullDownload && sinceHarv > 0)
      ? rawHarvests.filter(h => Number(h.timestamp || 0) > sinceHarv)
      : rawHarvests;

    const discoveries = (!isExplicitFullDownload && sinceDisc > 0)
      ? rawDiscoveries.filter(d => Number(d.timestamp || 0) > sinceDisc)
      : rawDiscoveries;

    const plannerProjects = rawPlanner;
    const radarTargets = rawRadar;
    const tacticalNotes = rawNotes;

    // Update last_fetched_at in D1
    await db
      .prepare('UPDATE personal_vault_credentials SET last_fetched_at = ?, updated_at = ? WHERE universe_id = ? AND player_id = ?')
      .bind(now, now, universeId, playerId)
      .run();

    const responsePayload = {
      success: true,
      expeditions,
      combats,
      harvests,
      discoveries,
      plannerProjects,
      radarTargets,
      tacticalNotes,
      hasMoreExpeditions: false,
      lastFetchedAt: now,
      cooldownSeconds: 120,
    };

    // Support client-side stream compression if requested
    const clientWantsGzip = req.headers.get('x-vault-compression') === 'gzip' ||
      (req.headers.get('accept-encoding') || '').includes('gzip');

    if (clientWantsGzip) {
      const jsonStr = JSON.stringify(responsePayload);
      const compressed = await gzipCompress(jsonStr);
      return new Response(compressed, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
          'X-Vault-Compression': 'gzip',
        },
      });
    }

    return json(responsePayload);
  } catch (err: any) {
    console.error('[VaultFetch] Error:', err);
    return json({ error: err.message || 'Failed to fetch Personal Vault data' }, { status: 500 });
  }
}

// ============================================================================
// 3. VAULT SUMMARY & TELEMETRY (INSTANT MANIFEST READ)
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

    await ensurePersonalVaultTables(db);

    const creds = await db
      .prepare('SELECT vault_key_hash, total_syncs, last_sent_at, last_fetched_at FROM personal_vault_credentials WHERE universe_id = ? AND player_id = ?')
      .bind(universeId, playerId)
      .first<any>();

    if (!creds) {
      return json({
        success: true,
        vaultRegistered: false,
        counts: { expeditions: 0, combats: 0, harvests: 0, discoveries: 0, planner: 0, radar: 0 },
        maxTimestamps: { expeditions: 0, combats: 0, harvests: 0, discoveries: 0, radar: 0 },
        totalSyncs: 0,
        lastSentAt: null,
        lastFetchedAt: null,
        canSend: true,
        canFetch: true,
        sendCooldownMs: 0,
        fetchCooldownMs: 0,
        cooldownSeconds: 120,
      });
    }

    if (!vaultKey) {
      return json({ error: 'Vault authentication key required' }, { status: 401 });
    }

    const candidatePeppers = Array.from(new Set([
      'nexus_overwatch_secret_pepper_2026',
      env.SERVER_PEPPER,
      'nexus_pepper_default',
    ])).filter(p => p && p !== 'CHANGE_ME_IN_CLOUDFLARE_SECRETS_OR_DEV_VARS') as string[];

    let keyMatched = false;
    for (const p of candidatePeppers) {
      const testHash = await hashVaultKey(vaultKey, p);
      if (creds.vault_key_hash === testHash) {
        keyMatched = true;
        break;
      }
    }

    if (!keyMatched) {
      return json({ error: 'Invalid Vault Key for this account' }, { status: 401 });
    }

    // Read manifest directly from R2 (instant single-key read, consuming 0 D1 row scans)
    const prefix = `vaults/${universeId}/${playerId}`;
    let manifest: PlayerVaultManifest | null = null;

    if (env.VAULT_BUCKET) {
      try {
        const manifestObj = await env.VAULT_BUCKET.get(`${prefix}/manifest.json`);
        if (manifestObj) {
          const text = await manifestObj.text();
          manifest = JSON.parse(text);
        }
      } catch (err: any) {
        console.warn('[PersonalVault] Warning reading manifest:', err.message);
      }
    }

    const now = Date.now();
    const lastSent = creds.last_sent_at ? Number(creds.last_sent_at) : null;
    const lastFetched = creds.last_fetched_at ? Number(creds.last_fetched_at) : null;
    const sendCooldownMs = lastSent ? Math.max(0, VAULT_COOLDOWN_MS - (now - lastSent)) : 0;
    const fetchCooldownMs = lastFetched ? Math.max(0, VAULT_COOLDOWN_MS - (now - lastFetched)) : 0;

    return json({
      success: true,
      vaultRegistered: true,
      counts: manifest?.counts || { expeditions: 0, combats: 0, harvests: 0, discoveries: 0, planner: 0, radar: 0 },
      maxTimestamps: manifest?.maxTimestamps || { expeditions: 0, combats: 0, harvests: 0, discoveries: 0, radar: 0 },
      totalSyncs: creds.total_syncs || 0,
      lastSentAt: lastSent,
      lastFetchedAt: lastFetched,
      canSend: sendCooldownMs === 0,
      canFetch: fetchCooldownMs === 0,
      sendCooldownMs,
      fetchCooldownMs,
      canFullResync: sendCooldownMs === 0,
      fullResyncCooldownMs: sendCooldownMs,
      cooldownSeconds: 120,
      storageBackend: 'Cloudflare R2 (Standard)',
    });
  } catch (err: any) {
    return json({ error: err.message || 'Failed to fetch Personal Vault summary' }, { status: 500 });
  }
}
