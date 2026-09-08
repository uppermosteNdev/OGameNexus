import { AutoRouter, cors, json } from 'itty-router';
import { z } from 'zod';
import { generateAllianceGlyph, validateAllianceGlyph, hashGlyph, generateAuthToken } from './crypto';
import { handleGalaxySync, handleGetPlayerActivity, handleGetGalaxyEvents, handleGetSystem } from './galaxySync';
import { handleShareSpyReport, handleGetSpyReports } from './spyReports';
import { isUniverseSeeded, seedUniverseFromOfficialAPI, cleanUniverseId } from './universeSeeder';

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  SERVER_PEPPER: string;
}

const { preflight, corsify } = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Nexus-Glyph', 'X-Nexus-Token'],
});

const router = AutoRouter({
  before: [preflight],
  finally: [corsify],
});

// ============================================================================
// 1. HEALTH CHECK
// ============================================================================
router.get('/api/health', () => {
  return json({
    status: 'ok',
    service: 'Nexus Overwatch Edge API',
    version: '1.0.0',
    timestamp: Date.now(),
  });
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

// ============================================================================
// 3. JOIN ALLIANCE VIA GLYPH (Member Endpoint)
// ============================================================================
const JoinAllianceSchema = z.object({
  glyphCode: z.string().min(10).max(30),
  playerId: z.string().min(1).max(30),
  playerName: z.string().min(1).max(50),
  permissions: z.record(z.boolean()).optional(),
  clientVersion: z.string().optional(),
});

router.post('/api/v1/auth/join', async (req: Request, env: Env) => {
  try {
    const body = await req.json();
    const parsed = JoinAllianceSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { glyphCode, playerId, playerName, permissions, clientVersion } = parsed.data;

    // Validate Glyph format & checksum
    if (!validateAllianceGlyph(glyphCode)) {
      return json({ error: 'Invalid or malformed Alliance Glyph code.' }, { status: 400 });
    }

    const glyphHash = await hashGlyph(glyphCode, env.SERVER_PEPPER || 'nexus_pepper_default');

    // Query alliance by glyph_hash
    const alliance: any = await env.DB.prepare(
      `SELECT alliance_id, alliance_name, alliance_tag, universe_id, subscription_status, subscription_expires_at
       FROM alliances WHERE glyph_hash = ?`
    )
      .bind(glyphHash)
      .first();

    if (!alliance) {
      return json({ error: 'Alliance Glyph not found or has been revoked.' }, { status: 404 });
    }

    // Check subscription active status
    const now = Date.now();
    if (alliance.subscription_status !== 'active' && alliance.subscription_expires_at < now) {
      return json(
        { error: 'Alliance subscription has expired. Please contact your alliance admin.' },
        { status: 403 }
      );
    }

    // Create or Update Member Session
    const authToken = generateAuthToken();
    const tokenHash = await hashGlyph(authToken, env.SERVER_PEPPER || 'nexus_pepper_default');

    await env.DB.prepare(
      `INSERT INTO alliance_members (
        alliance_id, player_id, player_name, auth_token_hash, role,
        permissions_json, client_version, last_sync_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(alliance_id, player_id) DO UPDATE SET
        player_name = excluded.player_name,
        auth_token_hash = excluded.auth_token_hash,
        permissions_json = excluded.permissions_json,
        client_version = excluded.client_version,
        last_sync_at = excluded.last_sync_at`
    )
      .bind(
        alliance.alliance_id,
        playerId,
        playerName,
        tokenHash,
        'member',
        JSON.stringify(permissions || { shareSpy: true, shareGalaxy: true, shareLocks: true }),
        clientVersion || '1.2.0',
        now
      )
      .run();

    return json({
      success: true,
      allianceId: alliance.alliance_id,
      allianceName: alliance.alliance_name,
      allianceTag: alliance.alliance_tag,
      universeId: alliance.universe_id,
      authToken,
      message: `Successfully connected to ${alliance.alliance_name} [${alliance.alliance_tag}]!`,
    });
  } catch (err: any) {
    console.error('Error joining alliance:', err);
    return json({ error: 'Failed to join alliance', details: err.message }, { status: 500 });
  }
});

// ============================================================================
// 4. UNIVERSE SEEDER (Official OGame API)
// ============================================================================
router.post('/api/v1/universe/seed', async (req: Request, env: Env) => {
  try {
    const body: any = await req.json().catch(() => ({}));
    const universeId = cleanUniverseId(body.universeId || 's267-en');
    const stats = await seedUniverseFromOfficialAPI(universeId, env);
    return json({ success: true, universeId, stats });
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

    let planetCount: any = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM universe_slots WHERE universe_id = ?`
    ).bind(universeId).first();

    // If universe has 0 planets, auto-seed it from official OGame XML
    if (!planetCount || planetCount.count === 0) {
      try {
        console.log(`[UniverseStatus] Auto-seeding ${universeId}...`);
        await seedUniverseFromOfficialAPI(universeId, env);
        planetCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM universe_slots WHERE universe_id = ?`
        ).bind(universeId).first();
      } catch (seedErr: any) {
        console.warn(`[UniverseStatus] Seed warning:`, seedErr.message);
      }
    }

    const moonCount: any = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM universe_slots WHERE universe_id = ? AND has_moon = 1`
    ).bind(universeId).first();

    const eventCount: any = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM universe_events WHERE universe_id = ?`
    ).bind(universeId).first();

    const info: any = await env.DB.prepare(
      `SELECT * FROM universe_info WHERE universe_id = ?`
    ).bind(universeId).first();

    return json({
      success: true,
      universeId,
      isSeeded: (planetCount?.count || 0) > 0,
      totalPlanets: planetCount?.count || 0,
      totalMoons: moonCount?.count || 0,
      totalEvents: eventCount?.count || 0,
      serverName: info?.server_name || 'Universe',
      galaxies: info?.galaxies || 9,
      systems: info?.systems || 499,
      speed: info?.speed || 1,
      speedFleet: info?.speed_fleet || 1,
      debrisFactor: info?.debris_factor || 0.3,
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
router.get('/api/v1/players/:playerId/activity', handleGetPlayerActivity);

// ============================================================================
// 6. SHARED ESPIONAGE VAULT
// ============================================================================
router.post('/api/v1/spy/share', handleShareSpyReport);
router.get('/api/v1/spy/reports', handleGetSpyReports);

// Fallback 404 handler
router.all('*', () => json({ error: 'Endpoint not found' }, { status: 404 }));

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    router.fetch(request, env, ctx).catch(err => {
      console.error('Unhandled edge error:', err);
      return json({ error: 'Internal edge server error', details: err.message }, { status: 500 });
    }),
};

