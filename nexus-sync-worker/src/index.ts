import { AutoRouter, cors, json } from 'itty-router';
import { z } from 'zod';
import { generateAllianceGlyph, validateAllianceGlyph, hashGlyph, generateAuthToken, computeHmacSignature, timingSafeEqual } from './crypto';
import { handleGalaxySync, handleGetPlayerActivity, handleGetGalaxyEvents, handleGetSystem, handleSearchPlayers, authenticateMember } from './galaxySync';
import { handleShareSpyReport, handleGetSpyReports } from './spyReports';
import { handleEmpireSync, handleGetEmpireRoster, handleGetEmpireMember } from './empireSync';
import { handleVaultSend, handleVaultFetch, handleVaultSummary, hashVaultKey } from './personalVault';
import { handleInactiveScout } from './inactiveScout';
import { isUniverseSeeded, seedUniverseFromOfficialAPI, syncDailyPlayersAndAlliances, cleanUniverseId, ensureBaselinePlanetsMigrated } from './universeSeeder';
import { getCoreDb, getUniverseDb } from './dbRouter';
import {
  CLOUDFLARE_TESTER_WHITELIST,
  CLOUDFLARE_ENFORCE_TESTING_GATE,
  CLOUDFLARE_TESTER_PASSKEY,
} from './testingConfig';

export interface Env {
  DB: D1Database;
  CORE_DB?: D1Database;
  ENVIRONMENT: string;
  SERVER_PEPPER: string;
  EXTENSION_SECRET?: string;
  [key: string]: any;
}

const { preflight, corsify } = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Nexus-Glyph',
    'X-Nexus-Token',
    'X-Nexus-Vault-Key',
    'X-Nexus-Client-Key',
    'X-Nexus-Timestamp',
    'X-Nexus-Signature',
    'X-Nexus-Master-Admin',
  ],
});

const router = AutoRouter<any>({
  before: [
    preflight,
    (async (req: any, env: any) => {
      const url = new URL(req.url);
      const path = url.pathname;

      // Allow public root and health check
      if (path === '/' || path === '/api/health') {
        return;
      }

      // 1. Block direct browser navigation (address bar URL visits)
      const secFetchDest = req.headers.get('Sec-Fetch-Dest');
      const secFetchMode = req.headers.get('Sec-Fetch-Mode');
      if (secFetchDest === 'document' || secFetchMode === 'navigate') {
        return json(
          { error: 'Access denied: Direct browser navigation is forbidden' },
          { status: 403 }
        );
      }

      // 2. Validate Extension HMAC Signature & Client Secret
      const clientKey = req.headers.get('X-Nexus-Client-Key');
      const timestampStr = req.headers.get('X-Nexus-Timestamp');
      const signature = req.headers.get('X-Nexus-Signature');
      const expectedSecret = env.EXTENSION_SECRET || 'nx_sec_9a7b4c2e8f103d5ae8b4f1a2c9d7e5b3';

      if (!clientKey || clientKey !== expectedSecret) {
        return json(
          { error: 'Access denied: Valid Nexus Extension authorization required' },
          { status: 403 }
        );
      }

      if (!timestampStr || !signature) {
        return json(
          { error: 'Access denied: Missing request authentication signature' },
          { status: 403 }
        );
      }

      const reqTime = parseInt(timestampStr, 10);
      const now = Date.now();
      // Allow 5 minutes validity window to prevent replay attacks while tolerating clock drift
      if (isNaN(reqTime) || Math.abs(now - reqTime) > 300000) {
        return json(
          { error: 'Access denied: Request signature expired (anti-replay check failed)' },
          { status: 403 }
        );
      }

      const message = `${req.method.toUpperCase()}:${path}:${timestampStr}`;
      const expectedSig = await computeHmacSignature(message, expectedSecret);
      if (!timingSafeEqual(signature, expectedSig)) {
        return json(
          { error: 'Access denied: Invalid request signature' },
          { status: 403 }
        );
      }
    }) as any,
  ],
  finally: [corsify],
});

// ============================================================================
// 1. ROOT & HEALTH CHECK
// ============================================================================
router.get('/', () => {
  return json({
    status: 'online',
    service: 'OGame Nexus Overwatch Edge API',
    version: '1.0.0',
    description: 'Central Cloudflare Worker & D1 Database backend for OGame Nexus Overwatch & Personal Vault',
    health: '/api/health',
    endpoints: {
      health: '/api/health',
      testingGate: '/api/v1/testing-gate/check',
      vaultSummary: '/api/v1/vault/summary',
      vaultFetch: '/api/v1/vault/fetch',
      vaultSend: '/api/v1/vault/send',
      inactiveScout: '/api/v1/tools/inactive-scout',
      galaxySync: '/api/v1/galaxy/sync',
      empireSync: '/api/v1/empire/sync',
      spyReports: '/api/v1/intel/spy-report',
    },
    timestamp: Date.now(),
  });
});

router.get('/api/health', () => {
  return json({
    status: 'ok',
    service: 'Nexus Overwatch Edge API',
    version: '1.0.0',
    timestamp: Date.now(),
  });
});

// ============================================================================
// 1B. CLOSED TESTING GATE — DYNAMIC ACCESS VERIFICATION (Cloudflare-Managed)
// ============================================================================
router.get('/api/v1/testing-gate/check', async (req: Request, env: Env) => {
  try {
    const url = new URL(req.url);
    const playerId = url.searchParams.get('playerId')?.trim();
    const universeId = url.searchParams.get('universeId') || url.searchParams.get('universe');
    const passkey = url.searchParams.get('passkey')?.trim();

    if (!CLOUDFLARE_ENFORCE_TESTING_GATE) {
      return json({ isTester: true, enforceGate: false, reason: 'gate_disabled' });
    }

    // Check passkey
    if (passkey && passkey.toUpperCase() === CLOUDFLARE_TESTER_PASSKEY.toUpperCase()) {
      return json({ isTester: true, enforceGate: true, reason: 'passkey_authorized' });
    }

    if (!playerId) {
      return json({ isTester: false, enforceGate: true, reason: 'missing_player_id' });
    }

    const cleanUni = universeId ? cleanUniverseId(universeId) : null;

    // 1. Check code-level whitelist in testingConfig.ts (matches playerId AND universeId)
    const inCodeWhitelist = CLOUDFLARE_TESTER_WHITELIST.find(t => {
      if (String(t.playerId).trim() !== playerId) return false;
      if (!t.universeId || t.universeId === '*') return true;
      if (!cleanUni) return true;
      return cleanUniverseId(t.universeId) === cleanUni;
    });

    if (inCodeWhitelist) {
      return json({
        isTester: true,
        enforceGate: true,
        reason: 'code_whitelist',
        tester: inCodeWhitelist,
      });
    }

    // 2. Check D1 overwatch_testers table (matches playerId AND universeId)
    try {
      const d1Tester: any = await env.DB.prepare(
        `SELECT player_id, universe_id, player_name, note, is_active
         FROM overwatch_testers
         WHERE player_id = ? AND (universe_id = ? OR universe_id = '*' OR universe_id IS NULL) AND is_active = 1`
      )
        .bind(playerId, cleanUni || '*')
        .first();

      if (d1Tester) {
        return json({
          isTester: true,
          enforceGate: true,
          reason: 'd1_whitelist',
          tester: {
            playerId: d1Tester.player_id,
            universeId: d1Tester.universe_id,
            playerName: d1Tester.player_name,
            note: d1Tester.note,
          },
        });
      }
    } catch {
      // Table may not have been created yet, ignore
    }

    return json({ isTester: false, enforceGate: true, reason: 'not_whitelisted' });
  } catch (err: any) {
    return json({ isTester: false, enforceGate: true, error: err?.message }, { status: 500 });
  }
});

router.get('/api/v1/testing-gate/config', async (req: Request, env: Env) => {
  try {
    let d1Testers: any[] = [];
    try {
      const res = await env.DB.prepare(
        `SELECT player_id, universe_id, player_name, note, is_active FROM overwatch_testers WHERE is_active = 1`
      ).all();
      d1Testers = res.results || [];
    } catch { }

    const combinedMap = new Map<string, any>();
    for (const t of CLOUDFLARE_TESTER_WHITELIST) {
      const key = `${t.universeId || '*'}:${String(t.playerId).trim()}`;
      combinedMap.set(key, t);
    }
    for (const d of d1Testers) {
      const key = `${d.universe_id || '*'}:${String(d.player_id).trim()}`;
      combinedMap.set(key, {
        playerId: d.player_id,
        universeId: d.universe_id,
        playerName: d.player_name,
        note: d.note,
      });
    }

    return json({
      enforceGate: CLOUDFLARE_ENFORCE_TESTING_GATE,
      testers: Array.from(combinedMap.values()),
      count: combinedMap.size,
      updatedAt: Date.now(),
    });
  } catch (err: any) {
    return json({ error: err?.message }, { status: 500 });
  }
});


// ============================================================================
// 2. CREATE ALLIANCE & GENERATE GLYPH (Admin Endpoint)
// ============================================================================
const CreateAllianceSchema = z.object({
  ogameAllianceId: z.string().min(1).max(30), // In-game alliance ID e.g. "500078"
  allianceDisplayName: z.string().min(2).max(50), // Custom display name in Overwatch
  allianceTag: z.string().min(1).max(10), // Official in-game tag e.g. "LoW"
  universeId: z.string().min(3).max(60), // e.g. "s267-en"
  adminPlayerId: z.string().min(1).max(30),
  adminPlayerName: z.string().min(1).max(50),
});

router.post('/api/v1/alliances/create', async (req: Request, env: Env) => {
  try {
    const body = await req.json();
    const parsed = CreateAllianceSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { ogameAllianceId, allianceDisplayName, allianceTag, universeId: rawUni, adminPlayerId, adminPlayerName } = parsed.data;
    const universeId = cleanUniverseId(rawUni);

    if (!/^s\d+-[a-z]+$/.test(universeId)) {
      return json({ error: 'Invalid universe format. Expected format: s<number>-<lang>, e.g. s267-en.' }, { status: 400 });
    }

    // Verify adminPlayerId exists in active universe baseline
    const playerCheck: any = await env.DB.prepare(
      `SELECT 1 FROM universe_baseline_planets WHERE universe_id = ? AND player_id = ? LIMIT 1`
    ).bind(universeId, adminPlayerId).first();

    if (!playerCheck) {
      const alreadySeeded = await isUniverseSeeded(universeId, env);
      if (!alreadySeeded) {
        await seedUniverseFromOfficialAPI(universeId, env);
        const recheck: any = await env.DB.prepare(
          `SELECT 1 FROM universe_baseline_planets WHERE universe_id = ? AND player_id = ? LIMIT 1`
        ).bind(universeId, adminPlayerId).first();
        if (!recheck) {
          return json({ error: 'Player ID not found in active universe baseline. Only real active commanders can establish an Overwatch network.' }, { status: 404 });
        }
      } else {
        return json({ error: 'Player ID not found in active universe baseline. Only real active commanders can establish an Overwatch network.' }, { status: 404 });
      }
    }

    // Check if this player has already created an Overwatch instance in this universe
    const existingPlayerAlly: any = await env.DB.prepare(
      `SELECT alliance_id, alliance_name, alliance_tag, glyph_code
       FROM alliances
       WHERE universe_id = ? AND admin_player_id = ?`
    )
      .bind(universeId, adminPlayerId)
      .first();

    if (existingPlayerAlly) {
      return json(
        {
          error: `You have already created an Overwatch instance ("${existingPlayerAlly.alliance_name}" [${existingPlayerAlly.alliance_tag}]) in universe ${universeId}. Each player is limited to creating 1 Overwatch alliance per universe.`,
          allianceId: existingPlayerAlly.alliance_id,
          glyphCode: existingPlayerAlly.glyph_code,
        },
        { status: 409 }
      );
    }

    // Generate unique high-volume cryptographic Glyph
    const glyphCode = generateAllianceGlyph();
    const glyphHash = await hashGlyph(glyphCode, env.SERVER_PEPPER || 'nexus_pepper_default');
    const allianceId = crypto.randomUUID();
    const now = Date.now();
    // 30 days free beta subscription by default
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000;

    // Insert Alliance into D1
    await env.DB.prepare(
      `INSERT INTO alliances (
        alliance_id, ogame_alliance_id, glyph_code, glyph_hash, alliance_name, alliance_tag,
        universe_id, admin_player_id, subscription_tier, subscription_status,
        subscription_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        allianceId,
        ogameAllianceId,
        glyphCode,
        glyphHash,
        allianceDisplayName,
        allianceTag,
        universeId,
        adminPlayerId,
        'free_beta',
        'active',
        expiresAt,
        now,
        now
      )
      .run();

    // Create Admin Member Record
    const adminToken = generateAuthToken();
    const adminTokenHash = await hashGlyph(adminToken, env.SERVER_PEPPER || 'nexus_pepper_default');

    await env.DB.prepare(
      `INSERT INTO alliance_members (
        alliance_id, player_id, player_name, auth_token_hash, role,
        permissions_json, client_version, last_sync_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        allianceId,
        adminPlayerId,
        adminPlayerName,
        adminTokenHash,
        'admin',
        JSON.stringify({ shareSpy: true, shareGalaxy: true, shareLocks: true }),
        '1.2.0',
        now
      )
      .run();

    // Check if universe needs initial seeding from official OGame XML API
    let seeded = false;
    try {
      const alreadySeeded = await isUniverseSeeded(universeId, env);
      if (!alreadySeeded) {
        console.log(`[Alliances] Universe ${universeId} not seeded. Fetching official Gameforge XML baseline...`);
        await seedUniverseFromOfficialAPI(universeId, env);
        seeded = true;
      }
    } catch (seedErr: any) {
      console.warn(`[Alliances] Non-blocking seed warning for ${universeId}:`, seedErr.message);
    }

    return json({
      success: true,
      allianceId,
      glyphCode, // Return the raw Glyph to the Admin to share
      authToken: adminToken,
      expiresAt,
      universeSeeded: seeded,
      message: 'Alliance created successfully! Share your Alliance Glyph with members.',
    });
  } catch (err: any) {
    console.error('Error creating alliance:', err);
    return json({ error: 'Failed to create alliance', details: err.message }, { status: 500 });
  }
});

// Detect active alliance network for in-game squad
router.get('/api/v1/alliances/detect', async (req: Request, env: Env) => {
  try {
    const url = new URL(req.url);
    const universeId = cleanUniverseId(url.searchParams.get('universeId') || 's267-en');
    const ogameAllianceId = url.searchParams.get('ogameAllianceId') || '';
    const allianceTag = url.searchParams.get('allianceTag') || '';
    const playerId = url.searchParams.get('playerId') || '';

    let alliance: any = null;

    // Priority 1: Check if this specific player created an alliance in this universe (Founder session)
    if (playerId) {
      alliance = await env.DB.prepare(
        `SELECT alliance_id, ogame_alliance_id, glyph_code, alliance_name, alliance_tag,
                universe_id, admin_player_id, subscription_status, subscription_expires_at
         FROM alliances
         WHERE universe_id = ? AND admin_player_id = ?
         LIMIT 1`
      )
        .bind(universeId, playerId)
        .first();
    }

    // Priority 2: Check if this player is already an approved member of an alliance in this universe
    if (!alliance && playerId) {
      alliance = await env.DB.prepare(
        `SELECT a.alliance_id, a.ogame_alliance_id, a.glyph_code, a.alliance_name, a.alliance_tag,
                a.universe_id, a.admin_player_id, a.subscription_status, a.subscription_expires_at,
                m.role as member_role
         FROM alliance_members m
         JOIN alliances a ON m.alliance_id = a.alliance_id
         WHERE a.universe_id = ? AND m.player_id = ?
         LIMIT 1`
      )
        .bind(universeId, playerId)
        .first();
    }

    // Priority 3: Fall back to existing alliance for this in-game squad (for squad discovery / join)
    if (!alliance && ogameAllianceId && ogameAllianceId !== '0') {
      alliance = await env.DB.prepare(
        `SELECT alliance_id, ogame_alliance_id, glyph_code, alliance_name, alliance_tag,
                universe_id, admin_player_id, subscription_status, subscription_expires_at
         FROM alliances
         WHERE universe_id = ? AND ogame_alliance_id = ?
         ORDER BY created_at ASC LIMIT 1`
      )
        .bind(universeId, ogameAllianceId)
        .first();
    }

    if (!alliance && allianceTag) {
      alliance = await env.DB.prepare(
        `SELECT alliance_id, ogame_alliance_id, glyph_code, alliance_name, alliance_tag,
                universe_id, admin_player_id, subscription_status, subscription_expires_at
         FROM alliances
         WHERE universe_id = ? AND LOWER(alliance_tag) = LOWER(?)
         ORDER BY created_at ASC LIMIT 1`
      )
        .bind(universeId, allianceTag)
        .first();
    }

    if (!alliance) {
      return json({
        exists: false,
        universeId,
        ogameAllianceId,
        allianceTag,
      });
    }

    const isFounder = Boolean(playerId && alliance.admin_player_id && String(alliance.admin_player_id) === String(playerId));

    // Get admin member display name
    const adminMember: any = await env.DB.prepare(
      `SELECT player_name FROM alliance_members WHERE alliance_id = ? AND role = 'admin' LIMIT 1`
    ).bind(alliance.alliance_id).first();

    // Count active members
    const memberCountRow: any = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM alliance_members WHERE alliance_id = ?`
    ).bind(alliance.alliance_id).first();

    // Query all distinct Overwatch networks created for this in-game alliance
    let otherAlliances: any[] = [];
    if (ogameAllianceId && ogameAllianceId !== '0') {
      try {
        const others = await env.DB.prepare(
          `SELECT a.alliance_id, a.alliance_name, a.alliance_tag, a.admin_player_id,
                  (SELECT player_name FROM alliance_members WHERE alliance_id = a.alliance_id AND role = 'admin' LIMIT 1) as admin_player_name,
                  (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.alliance_id) as member_count
           FROM alliances a
           WHERE a.universe_id = ? AND a.ogame_alliance_id = ?
           ORDER BY a.created_at ASC`
        ).bind(universeId, ogameAllianceId).all();
        otherAlliances = (others.results || []).map((o: any) => ({
          allianceId: o.alliance_id,
          allianceName: o.alliance_name,
          allianceTag: o.alliance_tag,
          adminPlayerId: o.admin_player_id,
          adminPlayerName: o.admin_player_name || 'Commander',
          memberCount: o.member_count || 1,
        }));
      } catch { }
    }

    return json({
      exists: true,
      isFounder,
      role: isFounder ? 'admin' : (alliance.member_role || 'member'),
      allianceId: alliance.alliance_id,
      allianceName: alliance.alliance_name,
      allianceTag: alliance.alliance_tag,
      ogameAllianceId: alliance.ogame_alliance_id,
      universeId: alliance.universe_id,
      adminPlayerId: alliance.admin_player_id,
      adminPlayerName: adminMember?.player_name || 'Alliance Commander',
      memberCount: memberCountRow?.count || 1,
      // Keep glyph_code strictly confidential from unauthenticated detect calls
      glyphCode: undefined,
      expiresAt: alliance.subscription_expires_at,
      existingAlliances: otherAlliances,
    });
  } catch (err: any) {
    console.error('Error detecting alliance:', err);
    return json({ error: 'Failed to detect alliance status', details: err.message }, { status: 500 });
  }
});

// Reconnect/Resume founder session securely with cryptographic verification
router.post('/api/v1/alliances/reconnect', async (req: Request, env: Env) => {
  try {
    const body: any = await req.json();
    const universeId = cleanUniverseId(body.universeId || 's267-en');
    const allianceId = body.allianceId;
    const playerId = body.playerId;
    const playerName = body.playerName || 'Commander';
    const vaultKey = body.vaultKey || req.headers.get('X-Nexus-Vault-Key');
    const glyphCode = body.glyphCode || req.headers.get('X-Nexus-Glyph');
    const authHeader = req.headers.get('Authorization') || req.headers.get('X-Nexus-Token');

    if (!allianceId || !playerId) {
      return json({ error: 'allianceId and playerId required' }, { status: 400 });
    }

    const alliance: any = await env.DB.prepare(
      `SELECT * FROM alliances WHERE alliance_id = ? AND universe_id = ?`
    ).bind(allianceId, universeId).first();

    if (!alliance) {
      return json({ error: 'Alliance not found' }, { status: 404 });
    }

    if (String(alliance.admin_player_id) !== String(playerId)) {
      return json({ error: 'Unauthorized: only the alliance founder can reconnect.' }, { status: 403 });
    }

    // Verify founder identity using one of the verifiable credentials:
    // 1. Vault Key matching personal_vault_credentials.vault_key_hash
    // 2. Glyph Code matching alliance.glyph_hash
    // 3. Existing valid admin session token
    let isAuthenticated = false;

    if (authHeader) {
      const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (rawToken) {
        const tokenHash = await hashGlyph(rawToken, env.SERVER_PEPPER || 'nexus_pepper_default');
        const adminCheck: any = await env.DB.prepare(
          `SELECT 1 FROM alliance_members WHERE alliance_id = ? AND player_id = ? AND auth_token_hash = ? AND role = 'admin'`
        ).bind(allianceId, playerId, tokenHash).first();
        if (adminCheck) isAuthenticated = true;
      }
    }

    if (!isAuthenticated && glyphCode) {
      const cleanGlyph = String(glyphCode).trim().toUpperCase();
      const testHash = await hashGlyph(cleanGlyph, env.SERVER_PEPPER || 'nexus_pepper_default');
      if (testHash === alliance.glyph_hash) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated && vaultKey) {
      const keyHash = await hashVaultKey(String(vaultKey).trim(), env.SERVER_PEPPER || 'nexus_pepper_default');
      const vaultCheck: any = await env.DB.prepare(
        `SELECT 1 FROM personal_vault_credentials WHERE universe_id = ? AND player_id = ? AND vault_key_hash = ?`
      ).bind(universeId, playerId, keyHash).first();
      if (vaultCheck) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return json({
        error: 'Authentication required: Please provide your Vault Key or Alliance Glyph to verify ownership of this founder account.',
        requiresAuth: true,
      }, { status: 401 });
    }

    // Generate fresh auth token
    const authToken = generateAuthToken();
    const tokenHash = await hashGlyph(authToken, env.SERVER_PEPPER || 'nexus_pepper_default');
    const now = Date.now();

    await env.DB.prepare(
      `INSERT INTO alliance_members (
        alliance_id, player_id, player_name, auth_token_hash, role,
        permissions_json, client_version, last_sync_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(alliance_id, player_id) DO UPDATE SET
        player_name = excluded.player_name,
        auth_token_hash = excluded.auth_token_hash,
        role = 'admin',
        last_sync_at = excluded.last_sync_at`
    )
      .bind(
        alliance.alliance_id,
        playerId,
        playerName,
        tokenHash,
        'admin',
        JSON.stringify({ shareSpy: true, shareGalaxy: true, shareLocks: true }),
        '1.2.0',
        now
      )
      .run();

    return json({
      success: true,
      allianceId: alliance.alliance_id,
      allianceName: alliance.alliance_name,
      allianceTag: alliance.alliance_tag,
      universeId: alliance.universe_id,
      glyphCode: alliance.glyph_code,
      authToken,
      role: 'admin',
      expiresAt: alliance.subscription_expires_at,
      message: `Welcome back, Commander ${playerName}!`,
    });
  } catch (err: any) {
    console.error('Error reconnecting alliance:', err);
    return json({ error: 'Failed to reconnect alliance', details: err.message }, { status: 500 });
  }
});

// ============================================================================
// 3. JOIN ALLIANCE VIA GLYPH (Member Endpoint)
// ============================================================================
const JoinAllianceSchema = z.object({
  glyphCode: z.string().min(10).max(30),
  playerId: z.string().min(1).max(30),
  playerName: z.string().min(1).max(50),
  applicantUniverseId: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
  clientVersion: z.string().optional(),
  ogameAllianceId: z.string().optional(),
  ogameAllianceTag: z.string().optional(),
});

router.post('/api/v1/auth/join', async (req: Request, env: Env) => {
  try {
    const body = await req.json();
    const parsed = JoinAllianceSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { glyphCode, playerId, playerName, applicantUniverseId, permissions, clientVersion, ogameAllianceId, ogameAllianceTag } = parsed.data;

    // Validate Glyph format & checksum
    if (!validateAllianceGlyph(glyphCode)) {
      return json({ error: 'Invalid or malformed Alliance Glyph code.' }, { status: 400 });
    }

    const glyphHash = await hashGlyph(glyphCode, env.SERVER_PEPPER || 'nexus_pepper_default');

    // Query alliance by glyph_hash
    const alliance: any = await env.DB.prepare(
      `SELECT alliance_id, admin_player_id, alliance_name, alliance_tag, ogame_alliance_id, universe_id, subscription_status, subscription_expires_at
       FROM alliances WHERE glyph_hash = ?`
    )
      .bind(glyphHash)
      .first();

    if (!alliance) {
      return json({ error: 'Alliance Glyph not found or has been revoked.' }, { status: 404 });
    }

    // Verify universe isolation: prevent cross-joining from different universes
    if (applicantUniverseId && alliance.universe_id) {
      const cleanApplicantUni = cleanUniverseId(applicantUniverseId);
      const cleanAllianceUni = cleanUniverseId(alliance.universe_id);
      if (cleanApplicantUni !== cleanAllianceUni) {
        return json(
          {
            error: `Universe mismatch: This Alliance Overwatch was created for universe [${cleanAllianceUni}], but your active session is in [${cleanApplicantUni}]. Cross-universe joins are prohibited.`,
          },
          { status: 400 }
        );
      }
    }

    // Check subscription active status
    const now = Date.now();
    if (alliance.subscription_status !== 'active' && alliance.subscription_expires_at < now) {
      return json(
        { error: 'Alliance subscription has expired. Please contact your alliance admin.' },
        { status: 403 }
      );
    }

    // Verify applicant playerId exists in active universe baseline
    const playerCheck: any = await env.DB.prepare(
      `SELECT 1 FROM universe_baseline_planets WHERE universe_id = ? AND player_id = ? LIMIT 1`
    ).bind(alliance.universe_id, playerId).first();

    if (!playerCheck) {
      return json({ error: 'Player ID not found in active universe baseline. Only real active commanders can join an Overwatch network.' }, { status: 404 });
    }

    const isCreator = alliance.admin_player_id && String(alliance.admin_player_id) === String(playerId);

    // If founder, immediately issue admin session
    if (isCreator) {
      const authToken = generateAuthToken();
      const tokenHash = await hashGlyph(authToken, env.SERVER_PEPPER || 'nexus_pepper_default');

      await env.DB.prepare(
        `INSERT INTO alliance_members (
          alliance_id, player_id, player_name, auth_token_hash, role,
          permissions_json, client_version, last_sync_at
        ) VALUES (?, ?, ?, ?, 'admin', ?, ?, ?)
        ON CONFLICT(alliance_id, player_id) DO UPDATE SET
          player_name = excluded.player_name,
          auth_token_hash = excluded.auth_token_hash,
          role = 'admin',
          last_sync_at = excluded.last_sync_at`
      )
        .bind(
          alliance.alliance_id,
          playerId,
          playerName,
          tokenHash,
          JSON.stringify(permissions || { shareSpy: true, shareGalaxy: true, shareLocks: true }),
          clientVersion || '1.2.0',
          now
        )
        .run();

      return json({
        success: true,
        status: 'approved',
        allianceId: alliance.alliance_id,
        allianceName: alliance.alliance_name,
        allianceTag: alliance.alliance_tag,
        universeId: alliance.universe_id,
        authToken,
        role: 'admin',
        message: `Welcome back, Commander!`,
      });
    }

    // Check if player is already an approved member
    const existingMember: any = await env.DB.prepare(
      `SELECT role, permissions_json FROM alliance_members WHERE alliance_id = ? AND player_id = ?`
    ).bind(alliance.alliance_id, playerId).first();

    if (existingMember) {
      const authToken = generateAuthToken();
      const tokenHash = await hashGlyph(authToken, env.SERVER_PEPPER || 'nexus_pepper_default');

      await env.DB.prepare(
        `UPDATE alliance_members SET auth_token_hash = ?, last_sync_at = ? WHERE alliance_id = ? AND player_id = ?`
      ).bind(tokenHash, now, alliance.alliance_id, playerId).run();

      return json({
        success: true,
        status: 'approved',
        allianceId: alliance.alliance_id,
        allianceName: alliance.alliance_name,
        allianceTag: alliance.alliance_tag,
        universeId: alliance.universe_id,
        authToken,
        role: existingMember.role || 'member',
        message: `Welcome back to ${alliance.alliance_name} [${alliance.alliance_tag}]!`,
      });
    }

    // Check if previously denied
    const deniedReq: any = await env.DB.prepare(
      `SELECT status FROM alliance_join_requests WHERE alliance_id = ? AND player_id = ? AND status = 'denied'`
    ).bind(alliance.alliance_id, playerId).first();

    if (deniedReq) {
      return json({
        success: false,
        status: 'denied',
        error: 'Your join request was declined by the alliance Commander.',
      }, { status: 403 });
    }

    // Insert or update pending join request
    const isSameAlly = Boolean(alliance.ogame_alliance_id && String(alliance.ogame_alliance_id) === String(ogameAllianceId));
    const suggestedRole = isSameAlly ? 'member' : 'visitor';
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await env.DB.prepare(
      `INSERT INTO alliance_join_requests (
        request_id, alliance_id, player_id, player_name, ogame_alliance_tag,
        ogame_alliance_id, universe_id, status, suggested_role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      ON CONFLICT(alliance_id, player_id) DO UPDATE SET
        player_name = excluded.player_name,
        ogame_alliance_tag = excluded.ogame_alliance_tag,
        status = 'pending',
        updated_at = excluded.updated_at`
    ).bind(
      requestId,
      alliance.alliance_id,
      playerId,
      playerName,
      ogameAllianceTag || null,
      ogameAllianceId || null,
      alliance.universe_id,
      suggestedRole,
      now,
      now
    ).run();

    return json({
      success: true,
      status: 'pending',
      allianceId: alliance.alliance_id,
      allianceName: alliance.alliance_name,
      allianceTag: alliance.alliance_tag,
      suggestedRole,
      message: 'Join request transmitted to Commander. Awaiting clearance.',
    });
  } catch (err: any) {
    console.error('Error joining alliance:', err);
    return json({ error: 'Failed to join alliance', details: err.message }, { status: 500 });
  }
});

// Check join status for an applicant
router.get('/api/v1/auth/status', async (req: Request, env: Env) => {
  try {
    const url = new URL(req.url);
    const allianceId = url.searchParams.get('allianceId');
    const playerId = url.searchParams.get('playerId');
    const universeId = url.searchParams.get('universeId');
    const glyphCode = url.searchParams.get('glyph') || url.searchParams.get('glyphCode');

    if (!playerId) {
      return json({ error: 'playerId required' }, { status: 400 });
    }

    let targetAllianceId = allianceId;

    // If allianceId not specified, lookup from active membership or join request
    if (!targetAllianceId) {
      const activeMember: any = await env.DB.prepare(
        `SELECT m.alliance_id FROM alliance_members m
         JOIN alliances a ON m.alliance_id = a.alliance_id
         WHERE m.player_id = ? ${universeId ? 'AND a.universe_id = ?' : ''}
         ORDER BY m.last_sync_at DESC LIMIT 1`
      ).bind(...(universeId ? [playerId, universeId] : [playerId])).first();

      if (activeMember) {
        targetAllianceId = activeMember.alliance_id;
      } else {
        const pendingReq: any = await env.DB.prepare(
          `SELECT r.alliance_id FROM alliance_join_requests r
           JOIN alliances a ON r.alliance_id = a.alliance_id
           WHERE r.player_id = ? ${universeId ? 'AND r.universe_id = ?' : ''}
           ORDER BY r.updated_at DESC LIMIT 1`
        ).bind(...(universeId ? [playerId, universeId] : [playerId])).first();

        if (pendingReq) {
          targetAllianceId = pendingReq.alliance_id;
        }
      }
    }

    if (!targetAllianceId) {
      return json({ success: true, status: 'idle' });
    }

    // Fetch alliance details
    const alliance: any = await env.DB.prepare(
      `SELECT alliance_id, alliance_name, alliance_tag, universe_id, glyph_hash FROM alliances WHERE alliance_id = ?`
    ).bind(targetAllianceId).first();

    if (!alliance) {
      return json({ success: true, status: 'idle' });
    }

    // Check if approved in members
    const member: any = await env.DB.prepare(
      `SELECT role, last_sync_at FROM alliance_members WHERE alliance_id = ? AND player_id = ?`
    ).bind(targetAllianceId, playerId).first();

    if (member) {
      let authToken: string | undefined = undefined;
      // If glyphCode provided, verify and issue a fresh session token
      if (glyphCode) {
        const glyphHash = await hashGlyph(glyphCode.trim().toUpperCase(), env.SERVER_PEPPER || 'nexus_pepper_default');
        if (glyphHash === alliance.glyph_hash) {
          authToken = generateAuthToken();
          const tokenHash = await hashGlyph(authToken, env.SERVER_PEPPER || 'nexus_pepper_default');
          await env.DB.prepare(
            `UPDATE alliance_members SET auth_token_hash = ?, last_sync_at = ? WHERE alliance_id = ? AND player_id = ?`
          ).bind(tokenHash, Date.now(), targetAllianceId, playerId).run();
        }
      }

      return json({
        success: true,
        status: 'approved',
        role: member.role,
        allianceId: alliance.alliance_id,
        allianceName: alliance.alliance_name,
        allianceTag: alliance.alliance_tag,
        universeId: alliance.universe_id,
        authToken,
      });
    }

    // Check join request
    const joinReq: any = await env.DB.prepare(
      `SELECT status, assigned_role, suggested_role FROM alliance_join_requests WHERE alliance_id = ? AND player_id = ?`
    ).bind(targetAllianceId, playerId).first();

    if (joinReq) {
      return json({
        success: true,
        status: joinReq.status,
        role: joinReq.assigned_role || joinReq.suggested_role,
        allianceId: alliance.alliance_id,
        allianceName: alliance.alliance_name,
        allianceTag: alliance.alliance_tag,
        universeId: alliance.universe_id,
      });
    }

    return json({ success: true, status: 'idle' });
  } catch (err: any) {
    return json({ error: 'Failed to check status', details: err.message }, { status: 500 });
  }
});

// Admin: List pending join requests
router.get('/api/v1/alliances/requests', async (req: Request, env: Env) => {
  try {
    const member = await authenticateMember(req, env);
    if (!member) return json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    if ('error' in member && member.error === 'subscription_expired') return json({ error: 'Alliance subscription expired' }, { status: 403 });
    if (member.role !== 'admin') return json({ error: 'Forbidden: Admin access required.' }, { status: 403 });

    const url = new URL(req.url);
    const allianceId = url.searchParams.get('allianceId') || member.alliance_id;
    if (member.alliance_id !== allianceId) {
      return json({ error: 'Forbidden: Cannot access requests for another alliance.' }, { status: 403 });
    }

    const requests: any = await env.DB.prepare(
      `SELECT request_id, alliance_id, player_id, player_name, ogame_alliance_tag,
              ogame_alliance_id, universe_id, status, suggested_role, assigned_role, created_at, updated_at
       FROM alliance_join_requests
       WHERE alliance_id = ? AND status = 'pending'
       ORDER BY created_at DESC`
    ).bind(allianceId).all();

    return json({ success: true, requests: requests.results || [] });
  } catch (err: any) {
    return json({ error: 'Failed to fetch join requests', details: err.message }, { status: 500 });
  }
});

// Admin: Approve join request & assign role (member or visitor)
router.post('/api/v1/alliances/requests/approve', async (req: Request, env: Env) => {
  try {
    const member = await authenticateMember(req, env);
    if (!member) return json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    if ('error' in member && member.error === 'subscription_expired') return json({ error: 'Alliance subscription expired' }, { status: 403 });
    if (member.role !== 'admin') return json({ error: 'Forbidden: Admin access required.' }, { status: 403 });

    const body: any = await req.json();
    let allianceId = body.allianceId || member.alliance_id;
    let playerId = body.playerId;
    const requestId = body.requestId;
    const assignedRole = body.assignedRole === 'visitor' ? 'visitor' : 'member';

    // Support lookup by requestId if playerId is not directly supplied
    if (requestId && !playerId) {
      const foundReq: any = await env.DB.prepare(
        `SELECT alliance_id, player_id FROM alliance_join_requests WHERE request_id = ?`
      ).bind(requestId).first();
      if (foundReq) {
        allianceId = foundReq.alliance_id;
        playerId = foundReq.player_id;
      }
    }

    if (!allianceId || !playerId) {
      return json({ error: 'allianceId and playerId (or valid requestId) required' }, { status: 400 });
    }

    if (member.alliance_id !== allianceId) {
      return json({ error: 'Forbidden: Cannot approve requests for another alliance.' }, { status: 403 });
    }

    const validRole = assignedRole;
    const now = Date.now();

    // 1. Update request status
    await env.DB.prepare(
      `UPDATE alliance_join_requests SET status = 'approved', assigned_role = ?, updated_at = ?
       WHERE alliance_id = ? AND player_id = ?`
    ).bind(validRole, now, allianceId, playerId).run();

    // 2. Fetch applicant name
    const reqRow: any = await env.DB.prepare(
      `SELECT player_name FROM alliance_join_requests WHERE alliance_id = ? AND player_id = ?`
    ).bind(allianceId, playerId).first();

    // 3. Insert or update alliance_members
    const authToken = generateAuthToken();
    const tokenHash = await hashGlyph(authToken, env.SERVER_PEPPER || 'nexus_pepper_default');

    await env.DB.prepare(
      `INSERT INTO alliance_members (
        alliance_id, player_id, player_name, auth_token_hash, role,
        permissions_json, client_version, last_sync_at
      ) VALUES (?, ?, ?, ?, ?, ?, '1.2.0', ?)
      ON CONFLICT(alliance_id, player_id) DO UPDATE SET
        role = excluded.role,
        last_sync_at = excluded.last_sync_at`
    ).bind(
      allianceId,
      playerId,
      reqRow?.player_name || 'Squadmate',
      tokenHash,
      validRole,
      JSON.stringify({ shareSpy: true, shareGalaxy: true, shareLocks: true }),
      now
    ).run();

    return json({ success: true, playerId, assignedRole: validRole });
  } catch (err: any) {
    return json({ error: 'Failed to approve join request', details: err.message }, { status: 500 });
  }
});

// Admin: Deny join request
router.post('/api/v1/alliances/requests/deny', async (req: Request, env: Env) => {
  try {
    const member = await authenticateMember(req, env);
    if (!member) return json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    if ('error' in member && member.error === 'subscription_expired') return json({ error: 'Alliance subscription expired' }, { status: 403 });
    if (member.role !== 'admin') return json({ error: 'Forbidden: Admin access required.' }, { status: 403 });

    const body: any = await req.json();
    let allianceId = body.allianceId || member.alliance_id;
    let playerId = body.playerId;
    const requestId = body.requestId;

    if (requestId && !playerId) {
      const foundReq: any = await env.DB.prepare(
        `SELECT alliance_id, player_id FROM alliance_join_requests WHERE request_id = ?`
      ).bind(requestId).first();
      if (foundReq) {
        allianceId = foundReq.alliance_id;
        playerId = foundReq.player_id;
      }
    }

    if (!allianceId || !playerId) {
      return json({ error: 'allianceId and playerId (or valid requestId) required' }, { status: 400 });
    }

    if (member.alliance_id !== allianceId) {
      return json({ error: 'Forbidden: Cannot deny requests for another alliance.' }, { status: 403 });
    }

    const now = Date.now();
    await env.DB.prepare(
      `UPDATE alliance_join_requests SET status = 'denied', updated_at = ?
       WHERE alliance_id = ? AND player_id = ?`
    ).bind(now, allianceId, playerId).run();

    return json({ success: true, playerId });
  } catch (err: any) {
    return json({ error: 'Failed to deny join request', details: err.message }, { status: 500 });
  }
});

// Admin & Members: Active roster
router.get('/api/v1/alliances/roster', async (req: Request, env: Env) => {
  try {
    const member = await authenticateMember(req, env);
    if (!member) return json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    if ('error' in member && member.error === 'subscription_expired') return json({ error: 'Alliance subscription expired' }, { status: 403 });

    const url = new URL(req.url);
    const allianceId = url.searchParams.get('allianceId') || member.alliance_id;
    if (member.alliance_id !== allianceId) {
      return json({ error: 'Forbidden: Cannot view roster of another alliance.' }, { status: 403 });
    }

    const members: any = await env.DB.prepare(
      `SELECT player_id, player_name, role, last_sync_at
       FROM alliance_members
       WHERE alliance_id = ?
       ORDER BY role = 'admin' DESC, role = 'member' DESC, last_sync_at DESC`
    ).bind(allianceId).all();

    const formattedRoster = (members.results || []).map((m: any) => ({
      playerId: m.player_id,
      player_id: m.player_id,
      playerName: m.player_name,
      player_name: m.player_name,
      role: m.role,
      lastSyncAt: m.last_sync_at,
      last_sync_at: m.last_sync_at,
    }));

    return json({ success: true, roster: formattedRoster });
  } catch (err: any) {
    return json({ error: 'Failed to fetch roster', details: err.message }, { status: 500 });
  }
});

// Admin: Get and update role permissions matrix
router.get('/api/v1/alliances/permissions', async (req: Request, env: Env) => {
  try {
    const member = await authenticateMember(req, env);
    if (!member) return json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    if ('error' in member && member.error === 'subscription_expired') return json({ error: 'Alliance subscription expired' }, { status: 403 });

    const url = new URL(req.url);
    const allianceId = url.searchParams.get('allianceId') || member.alliance_id;
    if (member.alliance_id !== allianceId) {
      return json({ error: 'Forbidden: Cannot view permissions for another alliance.' }, { status: 403 });
    }

    const alliance: any = await env.DB.prepare(
      `SELECT settings_json FROM alliances WHERE alliance_id = ?`
    ).bind(allianceId).first();

    let settings: any = {};
    try {
      settings = JSON.parse(alliance?.settings_json || '{}');
    } catch {}

    const permissions = settings.rolePermissions || {
      member: {
        viewScrapes: true,
        viewSpyVault: true,
        viewRaidLocks: true,
        setRaidLocks: true,
        viewHeatmaps: true,
        broadcastAlerts: false,
      },
      visitor: {
        viewScrapes: true,
        viewSpyVault: true,
        viewRaidLocks: true,
        setRaidLocks: false,
        viewHeatmaps: false,
        broadcastAlerts: false,
      },
    };

    return json({ success: true, permissions });
  } catch (err: any) {
    return json({ error: 'Failed to fetch permissions', details: err.message }, { status: 500 });
  }
});

router.post('/api/v1/alliances/permissions', async (req: Request, env: Env) => {
  try {
    const member = await authenticateMember(req, env);
    if (!member) return json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    if ('error' in member && member.error === 'subscription_expired') return json({ error: 'Alliance subscription expired' }, { status: 403 });
    if (member.role !== 'admin') return json({ error: 'Forbidden: Admin access required.' }, { status: 403 });

    const body: any = await req.json();
    const allianceId = body.allianceId || member.alliance_id;
    const permissions = body.permissions;
    if (!allianceId || !permissions) return json({ error: 'allianceId and permissions required' }, { status: 400 });

    if (member.alliance_id !== allianceId) {
      return json({ error: 'Forbidden: Cannot modify permissions for another alliance.' }, { status: 403 });
    }

    const alliance: any = await env.DB.prepare(
      `SELECT settings_json FROM alliances WHERE alliance_id = ?`
    ).bind(allianceId).first();

    let settings: any = {};
    try {
      settings = JSON.parse(alliance?.settings_json || '{}');
    } catch {}

    settings.rolePermissions = permissions;
    const updatedSettings = JSON.stringify(settings);
    const now = Date.now();

    await env.DB.prepare(
      `UPDATE alliances SET settings_json = ?, updated_at = ? WHERE alliance_id = ?`
    ).bind(updatedSettings, now, allianceId).run();

    return json({ success: true, permissions });
  } catch (err: any) {
    return json({ error: 'Failed to update permissions', details: err.message }, { status: 500 });
  }
});

// ============================================================================
// 4. UNIVERSE SEEDER (Official OGame API)
// ============================================================================
router.post('/api/v1/universe/seed', async (req: Request, env: Env) => {
  try {
    const body: any = await req.json().catch(() => ({}));
    const universeId = cleanUniverseId(body.universeId || 's267-en');
    const force = Boolean(body.force || body.overwrite);

    // If force is requested, require MASTER_ADMIN_SECRET and enforce 24h cooldown
    if (force) {
      const adminSecretHeader = req.headers.get('X-Nexus-Master-Admin');
      if (!env.MASTER_ADMIN_SECRET || !adminSecretHeader || adminSecretHeader !== env.MASTER_ADMIN_SECRET) {
        return json({ error: 'Unauthorized: Master admin secret required for forced universe re-seeding.' }, { status: 403 });
      }

      // Check 24h cooldown for forced seed
      const info: any = await env.DB.prepare(
        `SELECT last_forced_seed_at FROM universe_info WHERE universe_id = ?`
      ).bind(universeId).first().catch(() => null);

      const now = Date.now();
      if (info?.last_forced_seed_at && (now - info.last_forced_seed_at) < 86400000) {
        const remainingHours = Math.ceil((86400000 - (now - info.last_forced_seed_at)) / 3600000);
        return json({
          error: `Forced seed rate limit exceeded. Please wait ${remainingHours} hours before forcing another re-seed.`,
          nextAllowedAt: info.last_forced_seed_at + 86400000,
        }, { status: 429 });
      }
    } else {
      // Standard call: strictly enforce Gameforge 7-day cache
      const info: any = await env.DB.prepare(
        `SELECT next_universe_xml_at, universe_xml_timestamp FROM universe_info WHERE universe_id = ?`
      ).bind(universeId).first();

      if (info && info.next_universe_xml_at && Date.now() < info.next_universe_xml_at) {
        return json({
          success: true,
          cached: true,
          message: 'Gameforge universe.xml has not refreshed yet (7-day on-demand cycle). Baseline data is already up to date with official Gameforge dump.',
          universeId,
          universeXmlTimestamp: info.universe_xml_timestamp,
          nextUniverseXmlAt: info.next_universe_xml_at,
        });
      }
    }

    const stats = await seedUniverseFromOfficialAPI(universeId, env);

    if (force) {
      await env.DB.prepare(
        `UPDATE universe_info SET last_forced_seed_at = ? WHERE universe_id = ?`
      ).bind(Date.now(), universeId).run().catch(() => {});
    }

    return json({ success: true, cached: false, universeId, stats });
  } catch (err: any) {
    console.error('Error in universe seeding:', err);
    return json({ error: 'Failed to seed universe', details: err.message }, { status: 500 });
  }
});

router.get('/api/v1/universe/:universeId/status', async (req: Request, env: Env) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const rawUniverseId = pathParts[pathParts.length - 2] || 's267-en';
    const universeId = cleanUniverseId(rawUniverseId);

    if (!/^s\d+-[a-z]+$/.test(universeId)) {
      return json({ error: 'Invalid universeId format. Expected format: s<number>-<lang>, e.g. s267-en' }, { status: 400 });
    }

    const db = getUniverseDb(env, universeId);

    // Auto-migrate legacy universe_slots data if needed
    await ensureBaselinePlanetsMigrated(universeId, env);

    let planetCount: any = await db.prepare(
      `SELECT COUNT(*) as count FROM universe_baseline_planets WHERE universe_id = ?`
    ).bind(universeId).first();

    // If universe has 0 planets, auto-seed it from official OGame XML (with 1-hour backoff if unreachable)
    if (!planetCount || planetCount.count === 0) {
      const existingInfo: any = await db.prepare(
        `SELECT last_seeded_at, updated_at FROM universe_info WHERE universe_id = ?`
      ).bind(universeId).first().catch(() => null);

      const now = Date.now();
      const lastAttempt = existingInfo?.updated_at || 0;
      if (now - lastAttempt > 3600000) {
        try {
          console.log(`[UniverseStatus] Auto-seeding ${universeId}...`);
          await seedUniverseFromOfficialAPI(universeId, env);
          planetCount = await db.prepare(
            `SELECT COUNT(*) as count FROM universe_baseline_planets WHERE universe_id = ?`
          ).bind(universeId).first();
        } catch (seedErr: any) {
          console.warn(`[UniverseStatus] Seed warning:`, seedErr.message);
          await db.prepare(
            `INSERT INTO universe_info (universe_id, last_seeded_at, updated_at) VALUES (?, 0, ?)
             ON CONFLICT(universe_id) DO UPDATE SET updated_at = excluded.updated_at`
          ).bind(universeId, now).run().catch(() => {});
        }
      }
    }

    const moonCount: any = await db.prepare(
      `SELECT COUNT(*) as count FROM universe_baseline_planets WHERE universe_id = ? AND has_moon = 1`
    ).bind(universeId).first();

    const eventCount: any = await db.prepare(
      `SELECT COUNT(*) as count FROM universe_events WHERE universe_id = ?`
    ).bind(universeId).first();

    let info: any = await db.prepare(
      `SELECT * FROM universe_info WHERE universe_id = ?`
    ).bind(universeId).first();

    // Auto-fetch official Gameforge serverData settings if incomplete or unseeded
    if (!info || !info.server_name || !info.galaxies) {
      try {
        const sdRes = await fetch(`https://${universeId}.ogame.gameforge.com/api/serverData.xml?toJson=1`, {
          headers: { 'User-Agent': 'OGameNexus-Sync/1.2.5' },
        });
        if (sdRes.ok) {
          const sd: any = await sdRes.json();
          const sName = sd?.name || 'Universe';
          const sNum = parseInt(sd?.number || '0', 10);
          const lang = sd?.language || 'en';
          const gals = parseInt(sd?.galaxies || '5', 10);
          const sys = parseInt(sd?.systems || '499', 10);
          const spd = parseInt(sd?.speed || '1', 10);
          const spdFleet = parseInt(sd?.speedFleet || '1', 10);
          const df = parseFloat(sd?.debrisFactor || '0.3');
          await db.prepare(`
            INSERT INTO universe_info (
              universe_id, server_name, server_number, language, galaxies, systems,
              speed, speed_fleet, debris_factor, last_seeded_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(universe_id) DO UPDATE SET
              server_name = excluded.server_name,
              server_number = excluded.server_number,
              language = excluded.language,
              galaxies = excluded.galaxies,
              systems = excluded.systems,
              speed = excluded.speed,
              speed_fleet = excluded.speed_fleet,
              debris_factor = excluded.debris_factor,
              updated_at = excluded.updated_at
          `).bind(universeId, sName, sNum, lang, gals, sys, spd, spdFleet, df, Date.now(), Date.now()).run();

          info = await db.prepare(`SELECT * FROM universe_info WHERE universe_id = ?`).bind(universeId).first();
        }
      } catch (autoSdErr: any) {
        console.warn(`[UniverseStatus] Auto-sync serverData warning:`, autoSdErr?.message);
      }
    }

    // Auto-update immediately when fresh universe.xml is available from Gameforge
    if (info?.next_universe_xml_at && Date.now() >= info.next_universe_xml_at) {
      try {
        console.log(`[UniverseStatus] Fresh Gameforge universe.xml available for ${universeId}. Auto-syncing...`);
        await seedUniverseFromOfficialAPI(universeId, env);
        info = await db.prepare(
          `SELECT * FROM universe_info WHERE universe_id = ?`
        ).bind(universeId).first();
      } catch (autoSeedErr: any) {
        console.warn(`[UniverseStatus] Auto-sync warning:`, autoSeedErr.message);
      }
    }

    return json({
      success: true,
      universeId,
      isSeeded: (planetCount?.count || 0) > 0,
      totalPlanets: planetCount?.count || 0,
      totalMoons: moonCount?.count || 0,
      totalEvents: eventCount?.count || 0,
      serverName: info?.server_name || 'Universe',
      galaxies: info?.galaxies || 5,
      systems: info?.systems || 499,
      speed: info?.speed || 1,
      speedFleet: info?.speed_fleet || 1,
      debrisFactor: info?.debris_factor || 0.3,
      universeXmlTimestamp: info?.universe_xml_timestamp || null,
      nextUniverseXmlAt: info?.next_universe_xml_at || null,
      playersXmlTimestamp: info?.players_xml_timestamp || null,
      nextPlayersXmlAt: info?.next_players_xml_at || null,
    });
  } catch (err: any) {
    return json({ error: 'Failed to get universe status', details: err.message }, { status: 500 });
  }
});

// ============================================================================
// 5. GALAXY INGEST & DELTA ENGINE
// ============================================================================
router.post('/api/v1/galaxy/sync', handleGalaxySync);
router.get('/api/v1/galaxy/events', handleGetGalaxyEvents);
router.get('/api/v1/galaxy/system', handleGetSystem);
router.get('/api/v1/players/search', handleSearchPlayers);
router.get('/api/v1/players/:playerId/activity', handleGetPlayerActivity);

// ============================================================================
// 6. SHARED ESPIONAGE VAULT
// ============================================================================
router.post('/api/v1/spy/share', handleShareSpyReport);
router.get('/api/v1/spy/reports', handleGetSpyReports);

// ============================================================================
// 7. ALLIANCE EMPIRE SYNC & ROSTER
// ============================================================================
router.post('/api/v1/overwatch/empire/sync', handleEmpireSync);
router.get('/api/v1/overwatch/empire/roster', handleGetEmpireRoster);
router.get('/api/v1/overwatch/empire/member', handleGetEmpireMember);

// ============================================================================
// 8. PERSONAL VAULT — CROSS-DEVICE SYNC ENGINE
// ============================================================================
router.post('/api/v1/vault/send', handleVaultSend);
router.get('/api/v1/vault/fetch', handleVaultFetch);
router.get('/api/v1/vault/summary', handleVaultSummary);

// ============================================================================
// 8B. TACTICAL TOOLS — INACTIVE TARGET SCOUT
// ============================================================================
router.get('/api/v1/tools/inactive-scout', handleInactiveScout);

// ============================================================================
// 9. DEBUG & INTERROGATION (Dump local D1 data as JSON)
// ============================================================================
router.get('/api/v1/debug/dump', async (req: Request, env: Env) => {
  const adminSecretHeader = req.headers.get('X-Nexus-Master-Admin');
  if (!env.MASTER_ADMIN_SECRET || !adminSecretHeader || adminSecretHeader !== env.MASTER_ADMIN_SECRET) {
    return json({ error: 'Unauthorized: Master admin secret required for database interrogation.' }, { status: 403 });
  }
  try {
    const url = new URL(req.url);
    const tableParam = url.searchParams.get('table');

    const ALLOWED_DEBUG_TABLES = new Set([
      'alliances',
      'alliance_members',
      'alliance_join_requests',
      'universe_info',
      'overwatch_testers',
      'personal_vault_credentials',
      'raid_locks',
    ]);

    // If specific table requested:
    if (tableParam) {
      if (!ALLOWED_DEBUG_TABLES.has(tableParam)) {
        return json({ error: 'Invalid or restricted table name' }, { status: 400 });
      }
      const rows: any = await env.DB.prepare(`SELECT * FROM ${tableParam} LIMIT 100`).all();
      return json({ success: true, table: tableParam, count: rows.results?.length || 0, data: rows.results || [] });
    }

    return json({
      success: true,
      timestamp: Date.now(),
      allowedTables: Array.from(ALLOWED_DEBUG_TABLES),
      message: 'Specify ?table=<name> to inspect individual table data in non-production environments.'
    });
  } catch (err: any) {
    return json({ error: 'Failed to dump database', details: err.message }, { status: 500 });
  }
});

// Fallback 404 handler
router.all('*', () => json({ error: 'Endpoint not found' }, { status: 404 }));

// ============================================================================
// 7. SCHEDULED CRON ENGINE (Pillar 4: Staggered Queue Dispatch)
// Fires every 5 min (288 runs/day). In each run, processes exactly 1 due universe,
// guaranteeing ~1-2s execution without exceeding subrequest or CPU time limits across 100+ universes.
// ============================================================================
async function handleScheduledUniverseSync(env: Env) {
  try {
    const coreDb = getCoreDb(env);
    const now = Date.now();

    // 0. Periodic Database Maintenance & Garbage Collection
    // Purges expired locks, trims observation streams, and bounds historical events.
    try {
      await Promise.allSettled([
        env.DB.prepare('DELETE FROM raid_locks WHERE expires_at < ?').bind(now).run(),
        env.DB.prepare('DELETE FROM player_activity_observations WHERE scanned_at < ?').bind(now - 14 * 86400000).run(),
        env.DB.prepare('DELETE FROM universe_events WHERE detected_at < ?').bind(now - 30 * 86400000).run(),
        env.DB.prepare('DELETE FROM spy_reports WHERE report_timestamp < ?').bind(now - 30 * 86400000).run(),
      ]);
    } catch (gcErr) {
      console.warn('[ScheduledSync] Retention cleanup notice:', gcErr);
    }

    // Query for the single highest-urgency universe due for an update:
    // Priority 1: Weekly universe.xml expired
    // Priority 2: Daily players.xml expired
    const dueUniverse: any = await coreDb.prepare(
      `SELECT universe_id, next_universe_xml_at, next_players_xml_at, last_seeded_at
       FROM universe_info
       WHERE next_universe_xml_at <= ? OR next_players_xml_at <= ?
       ORDER BY
         CASE
           WHEN next_universe_xml_at <= ? THEN 1
           WHEN next_players_xml_at <= ? THEN 2
           ELSE 3
         END ASC,
         COALESCE(next_universe_xml_at, next_players_xml_at, 0) ASC
       LIMIT 1`
    ).bind(now, now, now, now).first();

    if (!dueUniverse) {
      console.log('[ScheduledSync] Staggered dispatcher: No universes currently due for sync.');
      return;
    }

    const universeId = dueUniverse.universe_id;
    const nextWeeklyDump = dueUniverse.next_universe_xml_at || 0;
    const nextDailyDump = dueUniverse.next_players_xml_at || 0;

    console.log(`[ScheduledSync] Dispatching sync for due universe: ${universeId}...`);

    if (now >= nextWeeklyDump) {
      console.log(`[ScheduledSync] Gameforge weekly cache expired for ${universeId}. Triggering baseline seed...`);
      try {
        await seedUniverseFromOfficialAPI(universeId, env);
        console.log(`[ScheduledSync] Successfully refreshed weekly baseline dump for ${universeId}`);
      } catch (err: any) {
        console.error(`[ScheduledSync] Error seeding baseline for ${universeId}:`, err);
        // Backoff by 15 min on error to prevent blocking other universes
        const db = getUniverseDb(env, universeId);
        await db.prepare(
          `UPDATE universe_info SET next_universe_xml_at = ? WHERE universe_id = ?`
        ).bind(now + 15 * 60 * 1000, universeId).run();
      }
    } else if (now >= nextDailyDump) {
      console.log(`[ScheduledSync] Daily players/alliances update available for ${universeId}. Refreshing...`);
      try {
        await syncDailyPlayersAndAlliances(universeId, env);
        console.log(`[ScheduledSync] Successfully synced daily players for ${universeId}`);
      } catch (err: any) {
        console.error(`[ScheduledSync] Error syncing daily players for ${universeId}:`, err);
        // Backoff by 15 min on error to prevent blocking other universes
        const db = getUniverseDb(env, universeId);
        await db.prepare(
          `UPDATE universe_info SET next_players_xml_at = ? WHERE universe_id = ?`
        ).bind(now + 15 * 60 * 1000, universeId).run();
      }
    }
  } catch (cronErr) {
    console.error('[ScheduledSync] Staggered dispatcher cron error:', cronErr);
  }
}

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    router.fetch(request, env, ctx).catch(err => {
      console.error('Unhandled edge error:', err);
      return json({ error: 'Internal edge server error', details: err.message }, { status: 500 });
    }),
  async scheduled(event: any, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduledUniverseSync(env));
  },
};

