// ============================================================================
// NEXUS OVERWATCH — ALLIANCE TOP/FLOP ROUTE HANDLERS
// ============================================================================

import { json } from 'itty-router';
import { Env, getPepper, getCandidatePeppers } from './index';
import { getUniverseDb } from './dbRouter';
import { timingSafeEqual } from './crypto';
import { isValidMasterAdminRequest } from './migrationR2';
import { authenticateMember } from './galaxySync';
import {
  ensureTopFlopTables,
  calculateAllianceTopFlop,
  calculate24hAllianceTopFlop,
  autoSeedAllianceHourlySnapshots,
  generateTopFlopSvg,
  renderTopFlopPng,
  fetchLogoAsDataUri,
  getNexusLogoDataUri,
  fetchGameforgeUniverseData,
  AllianceTopFlopData,
} from './allianceTopFlop';

// Strict Discord webhook validation regex (blocks SSRF / arbitrary proxy abuse)
const DISCORD_WEBHOOK_REGEX = /^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;
const MANUAL_ACTION_COOLDOWN_MS = 15_000; // 15 seconds between manual generate/test calls

export function isValidDiscordWebhookUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return DISCORD_WEBHOOK_REGEX.test(url.trim());
}

export function maskDiscordWebhookUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  const match = clean.match(/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  const [, webhookId, token] = match;
  const tail = token.length > 4 ? token.slice(-4) : '••••';
  return `https://discord.com/api/webhooks/${webhookId}/••••••••${tail}`;
}

function sanitizePresetForResponse(row: any): any {
  if (!row || typeof row !== 'object') return row;
  const { discord_webhook_url, edit_token_hash, ...safeRest } = row;
  const hasWebhook = Boolean(discord_webhook_url && String(discord_webhook_url).trim().length > 0);
  return {
    ...safeRest,
    // Never leak raw webhook secret or edit token hash over GET endpoints
    discord_webhook_url: null,
    hasWebhook,
    maskedWebhookUrl: hasWebhook ? maskDiscordWebhookUrl(discord_webhook_url) : null,
    hasEditToken: Boolean(edit_token_hash),
  };
}

function generateEditToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `tfk_${hex}`;
}

async function hashTopFlopToken(token: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`topflop_edit:${token.trim()}:${pepper}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function validateImageBytes(bytes: Uint8Array, declaredContentType?: string): { valid: boolean; mime: string; error?: string } {
  const allowedMimes = new Set(['image/png', 'image/jpeg', 'image/webp']);
  const cleanDeclared = (declaredContentType || 'image/png').trim().toLowerCase().split(';')[0];
  if (declaredContentType && !allowedMimes.has(cleanDeclared)) {
    return { valid: false, mime: '', error: 'Invalid content type. Only PNG, JPEG, and WebP images are permitted.' };
  }
  if (!bytes || bytes.length < 12) {
    return { valid: false, mime: '', error: 'Image buffer is empty or corrupted.' };
  }

  // PNG magic: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    return { valid: true, mime: 'image/png' };
  }
  // JPEG magic: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, mime: 'image/jpeg' };
  }
  // WebP magic: RIFF....WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { valid: true, mime: 'image/webp' };
  }

  return { valid: false, mime: '', error: 'Unsupported or invalid image binary. Only valid PNG, JPEG, or WebP files are accepted.' };
}

interface TopFlopAuthResult {
  authorized: boolean;
  status?: number;
  error?: string;
  method?: 'master_admin' | 'overwatch_member' | 'edit_token' | 'bootstrap' | 'legacy_rollout';
  existingRow?: any;
  newlyIssuedToken?: string;
  newTokenHash?: string;
}

async function authorizeTopFlopMutation(
  req: Request,
  env: Env,
  db: D1Database,
  universeId: string,
  allianceId: string,
  playerId: string,
  supportsEditToken: boolean
): Promise<TopFlopAuthResult> {
  const configId = `${universeId}_${allianceId}_${playerId}`;
  const existingRow: any = await db.prepare(`
    SELECT config_id, ogame_alliance_id, alliance_tag, player_id, player_name,
           scheduled_utc_hour, theme, custom_logo_url, custom_title, category,
           discord_webhook_url, webhook_post_hour, edit_token_hash, last_manual_action_at
    FROM alliance_topflop_configs
    WHERE config_id = ?
    LIMIT 1
  `).bind(configId).first();

  // 1. Master Admin override
  if (isValidMasterAdminRequest(req, env)) {
    return { authorized: true, method: 'master_admin', existingRow };
  }

  // 2. Overwatch Alliance Member / Admin token check
  const authHeader = req.headers.get('Authorization') || req.headers.get('X-Nexus-Token');
  if (authHeader && (authHeader.startsWith('Bearer ') || authHeader.length > 10)) {
    try {
      const member: any = await authenticateMember(req, env);
      if (member && !member.error) {
        const memberUni = cleanUni(member.universe_id || '');
        const matchesUni = memberUni === universeId;
        const matchesAlly =
          (member.ogame_alliance_id && String(member.ogame_alliance_id).trim() === String(allianceId).trim()) ||
          (member.alliance_tag && String(member.alliance_tag).trim().toUpperCase() === String(allianceId).trim().toUpperCase());
        const role = String(member.role || '').toLowerCase();
        const isAllianceAdmin = role === 'admin' || role === 'founder' || role === 'officer';
        const isOwnMemberConfig = role === 'member' && String(member.player_id).trim() === String(playerId).trim();

        if (matchesUni && matchesAlly && (isAllianceAdmin || isOwnMemberConfig)) {
          return { authorized: true, method: 'overwatch_member', existingRow };
        }
      }
    } catch {
      // Fall through to Edit Token check if Overwatch token wasn't valid for this alliance
    }
  }

  // 3. Per-config X-TopFlop-Token check
  const reqToken = (req.headers.get('X-TopFlop-Token') || req.headers.get('x-topflop-token') || '').trim();
  const strictMode = String(env?.STRICT_TOPFLOP_AUTH || '').toLowerCase() === 'true';

  if (existingRow?.edit_token_hash) {
    if (reqToken) {
      const peppers = getCandidatePeppers(env);
      for (const pepper of peppers) {
        const candidateHash = await hashTopFlopToken(reqToken, pepper);
        if (timingSafeEqual(candidateHash, String(existingRow.edit_token_hash))) {
          return { authorized: true, method: 'edit_token', existingRow };
        }
      }
      return {
        authorized: false,
        status: 403,
        error: 'Invalid Top/Flop Edit Key for this configuration. Paste the Edit Key from your original browser or sign in via Overwatch Alliance.',
      };
    }

    if (strictMode) {
      return {
        authorized: false,
        status: 403,
        error: 'Top/Flop Edit Key or Overwatch Alliance authorization required to modify this preset.',
      };
    }

    // Even in rollout mode, once a preset has been locked with an edit_token_hash, protect it!
    return {
      authorized: false,
      status: 403,
      error: 'This Top/Flop preset is protected by an Edit Key. Paste your Edit Key or connect Overwatch Alliance to edit it.',
    };
  }

  // 4. First-time creation or legacy preset without an edit_token_hash yet
  // If an old extension calls during rollout transition without supporting edit tokens, allow without minting
  if (!strictMode && !supportsEditToken && !reqToken) {
    return { authorized: true, method: 'legacy_rollout', existingRow };
  }

  // Verify alliance membership via official Gameforge public API before issuing a new edit_token
  try {
    const gfData = await fetchGameforgeUniverseData(universeId, 1, 0);
    let targetAlliance = gfData.alliancesMap.get(String(allianceId).trim());
    if (!targetAlliance) {
      const upper = String(allianceId).trim().toUpperCase();
      for (const a of gfData.alliancesMap.values()) {
        if (a.tag.toUpperCase() === upper) {
          targetAlliance = a;
          break;
        }
      }
    }

    const pInfo = gfData.playersMap.get(String(playerId).trim());
    const isVerifiedMember = Boolean(
      targetAlliance &&
      (targetAlliance.memberIds.includes(String(playerId).trim()) ||
        (pInfo?.allianceId && String(pInfo.allianceId) === String(targetAlliance.id)))
    );

    if (!isVerifiedMember) {
      return {
        authorized: false,
        status: 403,
        error: `Player #${playerId} could not be verified as a member of alliance ${allianceId} in ${universeId}.`,
      };
    }
  } catch (verifyErr: any) {
    // If Gameforge API is temporarily unavailable (e.g. hourly lobby redirect), refuse to issue an unverified lock
    if (strictMode) {
      return {
        authorized: false,
        status: 503,
        error: 'Unable to verify alliance membership with OGame API right now. Please retry in a minute.',
      };
    }
    // During soft rollout, fall back gracefully without locking the row
    return { authorized: true, method: 'legacy_rollout', existingRow };
  }

  const newlyIssuedToken = generateEditToken();
  const newTokenHash = await hashTopFlopToken(newlyIssuedToken, getPepper(env));
  return {
    authorized: true,
    method: 'bootstrap',
    existingRow,
    newlyIssuedToken,
    newTokenHash,
  };
}

function checkManualActionCooldown(existingRow: any): { ok: boolean; retryAfterSeconds?: number } {
  const lastAt = Number(existingRow?.last_manual_action_at || 0);
  if (!lastAt) return { ok: true };
  const elapsed = Date.now() - lastAt;
  if (elapsed < MANUAL_ACTION_COOLDOWN_MS) {
    return { ok: false, retryAfterSeconds: Math.ceil((MANUAL_ACTION_COOLDOWN_MS - elapsed) / 1000) };
  }
  return { ok: true };
}

// Helper to sanitize universe ID
function cleanUni(raw: string): string {
  if (!raw) return 's267-en';
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').split('.')[0];
}

// Helper to extract custom background image from serialized theme
function extractBgUrl(theme?: string | null): string | null {
  if (!theme || typeof theme !== 'string' || !theme.startsWith('{')) return null;
  try {
    const p = JSON.parse(theme);
    return (p.bgImageUrl && typeof p.bgImageUrl === 'string' && p.bgImageUrl.trim().length > 0) ? p.bgImageUrl.trim() : null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// 0. STATUS & INSPECTION ENDPOINT (Admin-Only: Inspect D1 & R2 State)
// ----------------------------------------------------------------------------
export async function handleTopFlopStatus(req: any, env: Env): Promise<Response> {
  if (!isValidMasterAdminRequest(req, env)) {
    return json({ error: 'Unauthorized: Master admin secret required.' }, { status: 403 });
  }
  try {
    const db = env.CORE_DB || env.DB;
    await ensureTopFlopTables(db);

    const { results: presets } = await db.prepare('SELECT * FROM alliance_topflop_configs').all();
    const { results: snapshots } = await db.prepare(
      'SELECT universe_id, ogame_alliance_id, hour_utc, member_count, recorded_at FROM alliance_hourly_snapshots ORDER BY recorded_at DESC LIMIT 20'
    ).all();

    let r2Objects: any[] = [];
    if (env.VAULT_BUCKET) {
      const list = await env.VAULT_BUCKET.list({ prefix: 'topflop/' });
      r2Objects = (list.objects || []).map((o: any) => ({
        key: o.key,
        size: o.size,
        uploaded: o.uploaded,
      }));
    }

    return json({
      status: 'ok',
      worker: 'nexus-sync-worker',
      d1: {
        presetsCount: presets?.length || 0,
        presets: (presets || []).map(sanitizePresetForResponse),
        snapshotsCount: snapshots?.length || 0,
        snapshots: snapshots || [],
      },
      r2: {
        objectsCount: r2Objects.length,
        objects: r2Objects,
      },
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to inspect status' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// 1. PUBLIC DISCORD IMAGE ENDPOINT
// ----------------------------------------------------------------------------
export async function handleGetTopFlopImage(req: any, env: Env): Promise<Response> {
  try {
    const { universe, alliance, player } = req.params;
    const universeId = cleanUni(universe);
    const rawAlliance = (alliance || '').trim();
    const rawPlayer = (player || 'default').trim().replace(/\.png$/i, '');

    const db = getUniverseDb(env, universeId);
    await ensureTopFlopTables(db);

    // Resolve numeric alliance ID if an alliance tag was passed (e.g. "LoW" -> "500078")
    let allianceId = rawAlliance;
    let allianceTag = rawAlliance;

    let configRow: any = null;
    if (rawPlayer && rawPlayer !== 'default') {
      configRow = await db.prepare(`
        SELECT ogame_alliance_id, alliance_tag, scheduled_utc_hour, theme, custom_title, custom_logo_url, category
        FROM alliance_topflop_configs
        WHERE universe_id = ? AND (ogame_alliance_id = ? OR UPPER(alliance_tag) = UPPER(?)) AND player_id = ?
        LIMIT 1
      `).bind(universeId, rawAlliance, rawAlliance, rawPlayer).first();
    }

    if (!configRow) {
      configRow = await db.prepare(`
        SELECT ogame_alliance_id, alliance_tag, scheduled_utc_hour, theme, custom_title, custom_logo_url, category
        FROM alliance_topflop_configs
        WHERE universe_id = ? AND (ogame_alliance_id = ? OR UPPER(alliance_tag) = UPPER(?))
        ORDER BY is_default DESC, updated_at DESC LIMIT 1
      `).bind(universeId, rawAlliance, rawAlliance).first();
    }

    if (configRow) {
      allianceId = configRow.ogame_alliance_id;
      allianceTag = configRow.alliance_tag;
    }

    const url = new URL(req.url);
    const paramType = url.searchParams.get('type') || url.searchParams.get('category');
    const cat = paramType !== null ? parseInt(paramType, 10) : (configRow?.category || 0);

    // Canonical R2 key (per category)
    const r2Key = cat === 0
      ? `topflop/${universeId}/${allianceId}/${rawPlayer}/topflop.png`
      : `topflop/${universeId}/${allianceId}/${rawPlayer}/topflop_cat${cat}.png`;

    const isForce = url.searchParams.get('force') === '1' || url.searchParams.has('t');

    // 1. Check if frozen daily image already exists in R2
    if (env.VAULT_BUCKET && !isForce) {
      const existing = await env.VAULT_BUCKET.get(r2Key);
      if (existing) {
        return new Response(existing.body, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=60, s-maxage=300, must-revalidate',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // 2. Not cached or forced: Render using frozen daily report data (scores locked!)
    const schedHour = configRow?.scheduled_utc_hour ?? 0;
    const theme = configRow?.theme || 'tactical';
    const title = configRow?.custom_title || 'Top / Flop of the day';

    const tfData = await calculate24hAllianceTopFlop(db, universeId, allianceId, schedHour, cat, false);
    const effectiveLogoUrl = (configRow?.custom_logo_url && configRow.custom_logo_url.trim().length > 0)
      ? configRow.custom_logo_url.trim()
      : (tfData.customLogoUrl || null);
    const embeddedLogoDataUri = await fetchLogoAsDataUri(effectiveLogoUrl, env.VAULT_BUCKET);
    const embeddedBgDataUri = await fetchLogoAsDataUri(extractBgUrl(theme), env.VAULT_BUCKET);
    const embeddedNexusLogoDataUri = await getNexusLogoDataUri(env.VAULT_BUCKET);
    const svg = generateTopFlopSvg(tfData, theme, title, embeddedLogoDataUri, embeddedBgDataUri, embeddedNexusLogoDataUri);
    const pngBuffer = await renderTopFlopPng(svg, env.VAULT_BUCKET);

    // 3. Save to R2
    if (env.VAULT_BUCKET) {
      await env.VAULT_BUCKET.put(r2Key, pngBuffer, {
        httpMetadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=60, s-maxage=300, must-revalidate',
        },
        customMetadata: {
          universe: universeId,
          allianceId,
          playerId: rawPlayer,
          generatedAt: String(Date.now()),
        },
      });

      // Also mirror to alliance tag alias if available
      if (allianceTag && allianceTag !== allianceId) {
        const tagKey = cat === 0
          ? `topflop/${universeId}/${allianceTag}/${rawPlayer}/topflop.png`
          : `topflop/${universeId}/${allianceTag}/${rawPlayer}/topflop_cat${cat}.png`;
        await env.VAULT_BUCKET.put(tagKey, pngBuffer, {
          httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=300, s-maxage=86400' },
        });
      }
    }

    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('Error generating TopFlop image:', err);
    return new Response(`Error generating TopFlop: ${err?.message || 'Internal error'}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// ----------------------------------------------------------------------------
// 2. ALLIANCE PRESETS API (GET /api/topflop/presets)
// ----------------------------------------------------------------------------
export async function handleGetTopFlopPresets(req: any, env: Env): Promise<Response> {
  try {
    const url = new URL(req.url);
    const universeId = cleanUni(url.searchParams.get('universe') || '');
    const allianceId = (url.searchParams.get('allianceId') || '').trim();

    if (!universeId || !allianceId) {
      return json({ error: 'universe and allianceId query parameters required' }, { status: 400 });
    }

    const db = getUniverseDb(env, universeId);
    await ensureTopFlopTables(db);

    // 1. Fetch configured presets for this alliance
    const { results: presets } = await db.prepare(`
      SELECT * FROM alliance_topflop_configs
      WHERE universe_id = ? AND (ogame_alliance_id = ? OR UPPER(alliance_tag) = UPPER(?))
      ORDER BY is_default DESC, updated_at DESC
    `).bind(universeId, allianceId, allianceId).all();

    // 2. Fetch frozen daily TopFlop data for the alliance
    let liveData: AllianceTopFlopData | null = null;
    try {
      const targetHour = presets && presets.length > 0 ? (presets[0] as any).scheduled_utc_hour : 0;
      liveData = await calculate24hAllianceTopFlop(db, universeId, allianceId, targetHour, 0, false);
    } catch (e: any) {
      console.warn('Could not calculate daily TopFlop during preset fetch:', e?.message);
    }

    return json({
      success: true,
      universeId,
      allianceId,
      presets: (presets || []).map(sanitizePresetForResponse),
      defaultAllianceLogo: liveData?.customLogoUrl || null,
      liveData,
      currentUtcHour: new Date().getUTCHours(),
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to fetch TopFlop presets' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// 3. CREATE OR UPDATE PRESET API (POST /api/topflop/preset)
// ----------------------------------------------------------------------------
export async function handleSaveTopFlopPreset(req: any, env: Env): Promise<Response> {
  try {
    const body = await req.json();
    const {
      universeId: rawUni,
      allianceId: rawAllianceId,
      allianceTag,
      configName,
      playerId: rawPlayerId,
      playerName,
      scheduledUtcHour = 0,
      theme = 'tactical',
      customLogoUrl = null,
      customTitle = 'Top / Flop of the day',
      category = 0,
      isDefault = 0,
      discordWebhookUrl = null,
      clearWebhook = false,
      webhookPostHour = 0,
      supportsEditToken = false,
    } = body;

    const universeId = cleanUni(rawUni);
    const allianceId = String(rawAllianceId || '').trim();
    const playerId = String(rawPlayerId || '').trim();
    if (!universeId || !allianceId || !playerId) {
      return json({ error: 'Missing universeId, allianceId, or playerId' }, { status: 400 });
    }

    const db = getUniverseDb(env, universeId);
    await ensureTopFlopTables(db);

    const auth = await authorizeTopFlopMutation(
      req,
      env,
      db,
      universeId,
      allianceId,
      playerId,
      Boolean(supportsEditToken)
    );
    if (!auth.authorized) {
      return json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 403 });
    }

    const rawWebhook = typeof discordWebhookUrl === 'string' ? discordWebhookUrl.trim() : '';
    if (rawWebhook && !isValidDiscordWebhookUrl(rawWebhook)) {
      return json(
        { error: 'Invalid Discord webhook URL. Expected https://discord.com/api/webhooks/<id>/<token>.' },
        { status: 400 }
      );
    }

    // Preserve existing stored webhook unless explicitly cleared or replaced with a valid new URL
    const resolvedWebhookUrl = clearWebhook
      ? null
      : (rawWebhook ? rawWebhook : (auth.existingRow?.discord_webhook_url ?? null));

    const configId = `${universeId}_${allianceId}_${playerId}`;
    const now = Date.now();

    await db.prepare(`
      INSERT INTO alliance_topflop_configs (
        config_id, universe_id, ogame_alliance_id, alliance_tag, config_name,
        player_id, player_name, scheduled_utc_hour, theme, custom_logo_url,
        custom_title, category, is_default, discord_webhook_url, webhook_post_hour,
        edit_token_hash, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(config_id) DO UPDATE SET
        alliance_tag = excluded.alliance_tag,
        config_name = excluded.config_name,
        player_name = excluded.player_name,
        scheduled_utc_hour = excluded.scheduled_utc_hour,
        theme = excluded.theme,
        custom_logo_url = excluded.custom_logo_url,
        custom_title = excluded.custom_title,
        category = excluded.category,
        is_default = excluded.is_default,
        discord_webhook_url = excluded.discord_webhook_url,
        webhook_post_hour = excluded.webhook_post_hour,
        edit_token_hash = COALESCE(alliance_topflop_configs.edit_token_hash, excluded.edit_token_hash),
        updated_at = excluded.updated_at
    `).bind(
      configId,
      universeId,
      allianceId,
      allianceTag || '',
      configName || `${playerName}'s Preset`,
      playerId,
      playerName || `Player #${playerId}`,
      parseInt(String(scheduledUtcHour), 10) || 0,
      theme,
      customLogoUrl,
      customTitle,
      parseInt(String(category), 10) || 0,
      isDefault ? 1 : 0,
      resolvedWebhookUrl,
      parseInt(String(webhookPostHour), 10) || 0,
      auth.newTokenHash || null,
      now
    ).run();

    const publicUrl = `https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/${universeId}/${allianceId}/${playerId}/topflop.png`;

    return json({
      success: true,
      configId,
      publicUrl,
      hasWebhook: Boolean(resolvedWebhookUrl),
      maskedWebhookUrl: maskDiscordWebhookUrl(resolvedWebhookUrl),
      ...(auth.newlyIssuedToken ? { editToken: auth.newlyIssuedToken } : {}),
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to save preset' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// 4. ON-DEMAND GENERATE NOW API (POST /api/topflop/generate-now)
// ----------------------------------------------------------------------------
export async function handleGenerateTopFlopNow(req: any, env: Env): Promise<Response> {
  try {
    const body = await req.json();
    const {
      universeId: rawUni,
      allianceId: rawAllianceId,
      playerId: rawPlayerId,
      theme = 'tactical',
      customTitle,
      customLogoUrl,
      category = 0,
      clearWebhook = false,
      supportsEditToken = false,
    } = body;
    const universeId = cleanUni(rawUni);
    const allianceId = String(rawAllianceId || '').trim();
    const playerId = String(rawPlayerId || '').trim();

    if (!universeId || !allianceId || !playerId) {
      return json({ error: 'Missing universeId, allianceId, or playerId' }, { status: 400 });
    }

    const db = getUniverseDb(env, universeId);
    await ensureTopFlopTables(db);

    const auth = await authorizeTopFlopMutation(
      req,
      env,
      db,
      universeId,
      allianceId,
      playerId,
      Boolean(supportsEditToken)
    );
    if (!auth.authorized) {
      return json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 403 });
    }

    if (auth.method !== 'master_admin') {
      const cooldown = checkManualActionCooldown(auth.existingRow);
      if (!cooldown.ok) {
        return json(
          { error: `Please wait ${cooldown.retryAfterSeconds}s before generating again.`, retryAfterSeconds: cooldown.retryAfterSeconds },
          { status: 429 }
        );
      }
    }

    const rawWebhook = typeof body.discordWebhookUrl === 'string' ? body.discordWebhookUrl.trim() : '';
    if (rawWebhook && !isValidDiscordWebhookUrl(rawWebhook)) {
      return json(
        { error: 'Invalid Discord webhook URL. Expected https://discord.com/api/webhooks/<id>/<token>.' },
        { status: 400 }
      );
    }

    const resolvedWebhookUrl = clearWebhook
      ? null
      : (rawWebhook ? rawWebhook : (auth.existingRow?.discord_webhook_url ?? null));

    const oldTargetHour = auth.existingRow?.scheduled_utc_hour ?? 0;
    const targetHour = body.scheduledUtcHour !== undefined
      ? parseInt(String(body.scheduledUtcHour), 10)
      : oldTargetHour;

    // If cut-off hour was changed mid-day, compute fresh 24h delta for the new cut-off.
    // If cut-off did not change, reuse frozen daily report data from alliance_daily_topflop.
    const cutOffChanged = body.scheduledUtcHour !== undefined && targetHour !== oldTargetHour;
    const tfData = await calculate24hAllianceTopFlop(db, universeId, allianceId, targetHour, category, cutOffChanged);
    const effectiveLogoUrl = (customLogoUrl && customLogoUrl.trim().length > 0)
      ? customLogoUrl.trim()
      : (tfData.customLogoUrl || null);
    const embeddedLogoDataUri = await fetchLogoAsDataUri(effectiveLogoUrl, env.VAULT_BUCKET);
    const embeddedBgDataUri = await fetchLogoAsDataUri(extractBgUrl(theme), env.VAULT_BUCKET);
    const embeddedNexusLogoDataUri = await getNexusLogoDataUri(env.VAULT_BUCKET);
    const svg = generateTopFlopSvg(tfData, theme, customTitle, embeddedLogoDataUri, embeddedBgDataUri, embeddedNexusLogoDataUri);
    const pngBuffer = await renderTopFlopPng(svg, env.VAULT_BUCKET);

    const r2Key = category && category !== 0
      ? `topflop/${universeId}/${allianceId}/${playerId}/topflop_cat${category}.png`
      : `topflop/${universeId}/${allianceId}/${playerId}/topflop.png`;

    if (env.VAULT_BUCKET) {
      await env.VAULT_BUCKET.put(r2Key, pngBuffer, {
        httpMetadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=60, s-maxage=300, must-revalidate',
        },
        customMetadata: {
          universe: universeId,
          allianceId,
          playerId,
          generatedAt: String(Date.now()),
        },
      });
    }

    // Save/Update config in D1 so D1 stays permanently in sync with current customization
    const configId = `${universeId}_${allianceId}_${playerId}`;
    const now = Date.now();
    await db.prepare(`
      INSERT INTO alliance_topflop_configs (
        config_id, universe_id, ogame_alliance_id, alliance_tag, config_name,
        player_id, player_name, scheduled_utc_hour, theme, custom_logo_url,
        custom_title, category, is_default, discord_webhook_url, webhook_post_hour,
        edit_token_hash, last_manual_action_at, last_generated_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(config_id) DO UPDATE SET
        theme = excluded.theme,
        custom_title = excluded.custom_title,
        custom_logo_url = excluded.custom_logo_url,
        category = excluded.category,
        scheduled_utc_hour = excluded.scheduled_utc_hour,
        config_name = COALESCE(excluded.config_name, alliance_topflop_configs.config_name),
        discord_webhook_url = excluded.discord_webhook_url,
        webhook_post_hour = COALESCE(excluded.webhook_post_hour, alliance_topflop_configs.webhook_post_hour),
        edit_token_hash = COALESCE(alliance_topflop_configs.edit_token_hash, excluded.edit_token_hash),
        last_manual_action_at = excluded.last_manual_action_at,
        last_generated_at = excluded.last_generated_at,
        updated_at = excluded.updated_at
    `).bind(
      configId,
      universeId,
      allianceId,
      body.allianceTag || '',
      body.configName || 'Daily Standings',
      playerId,
      body.playerName || `Player #${playerId}`,
      targetHour,
      theme,
      customLogoUrl ? customLogoUrl.trim() : null,
      customTitle || 'Top / Flop of the day',
      category,
      1,
      resolvedWebhookUrl,
      body.webhookPostHour !== undefined ? parseInt(String(body.webhookPostHour), 10) : (auth.existingRow?.webhook_post_hour ?? 0),
      auth.newTokenHash || null,
      now,
      now,
      now
    ).run();

    const publicUrl = `https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/${universeId}/${allianceId}/${playerId}/topflop.png`;

    return json({
      success: true,
      publicUrl,
      tfData,
      generatedAt: now,
      hasWebhook: Boolean(resolvedWebhookUrl),
      maskedWebhookUrl: maskDiscordWebhookUrl(resolvedWebhookUrl),
      ...(auth.newlyIssuedToken ? { editToken: auth.newlyIssuedToken } : {}),
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to generate TopFlop now' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// 4B. DISCORD WEBHOOK DISPATCHER & TESTER
// ----------------------------------------------------------------------------
export async function dispatchDiscordWebhook(
  webhookUrl: string,
  universeId: string,
  allianceId: string,
  playerId: string,
  category: number,
  env: Env,
  imageUrl?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const cleanUrl = (webhookUrl || '').trim();
    if (!isValidDiscordWebhookUrl(cleanUrl)) {
      return { success: false, error: 'Invalid Discord webhook URL. Expected https://discord.com/api/webhooks/<id>/<token>.' };
    }

    const effectiveImageUrl = imageUrl || `https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/${universeId}/${allianceId}/${playerId}/topflop.png`;

    // 1. Attempt to load the PNG directly from R2 to send as a native file attachment.
    // Uploading as a direct attachment eliminates Discord's gray embed container frame completely!
    let imageArrayBuffer: ArrayBuffer | null = null;
    if (env?.VAULT_BUCKET) {
      const r2Key = category && category !== 0
        ? `topflop/${universeId}/${allianceId}/${playerId}/topflop_cat${category}.png`
        : `topflop/${universeId}/${allianceId}/${playerId}/topflop.png`;
      let obj = await env.VAULT_BUCKET.get(r2Key);
      if (!obj) {
        obj = await env.VAULT_BUCKET.get(`topflop/${universeId}/${allianceId}/topflop.png`);
      }
      if (obj) {
        imageArrayBuffer = await obj.arrayBuffer();
      }
    }

    // 2. If image binary is available from R2, send native multipart/form-data file attachment
    if (imageArrayBuffer && imageArrayBuffer.byteLength > 0) {
      const form = new FormData();
      form.append('payload_json', JSON.stringify({
        username: 'NexusBot',
        avatar_url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/nexus_logo.png',
      }));
      form.append('files[0]', new Blob([imageArrayBuffer], { type: 'image/png' }), 'topflop.png');

      const res = await fetch(cleanUrl, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, status: res.status, error: `Discord rejected webhook (${res.status}): ${errText}` };
      }

      return { success: true, status: res.status };
    }

    // 3. Fallback to embed if R2 object is not yet written
    const payload = {
      username: 'NexusBot',
      avatar_url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/nexus_logo.png',
      embeds: [
        {
          image: {
            url: effectiveImageUrl,
          },
        },
      ],
    };

    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, status: res.status, error: `Discord rejected webhook (${res.status}): ${errText}` };
    }

    return { success: true, status: res.status };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed connecting to Discord webhook' };
  }
}

export async function handleTestDiscordWebhook(req: any, env: Env): Promise<Response> {
  try {
    const body = await req.json();
    const {
      webhookUrl,
      webhookPostHour = 0,
      universeId: rawUni,
      allianceId: rawAllianceId,
      playerId: rawPlayerId,
      category = 0,
      supportsEditToken = false,
    } = body;
    const universeId = cleanUni(rawUni);
    const allianceId = String(rawAllianceId || '').trim();
    const playerId = String(rawPlayerId || '').trim();

    if (!universeId || !allianceId || !playerId) {
      return json({ error: 'Missing universeId, allianceId, or playerId' }, { status: 400 });
    }

    const db = getUniverseDb(env, universeId);
    await ensureTopFlopTables(db);

    const auth = await authorizeTopFlopMutation(
      req,
      env,
      db,
      universeId,
      allianceId,
      playerId,
      Boolean(supportsEditToken)
    );
    if (!auth.authorized) {
      return json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 403 });
    }

    if (auth.method !== 'master_admin') {
      const cooldown = checkManualActionCooldown(auth.existingRow);
      if (!cooldown.ok) {
        return json(
          { error: `Please wait ${cooldown.retryAfterSeconds}s before testing again.`, retryAfterSeconds: cooldown.retryAfterSeconds },
          { status: 429 }
        );
      }
    }

    // Use newly submitted URL if provided; otherwise allow testing the already-saved webhook in D1
    const rawWebhook = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
    const targetWebhook = rawWebhook || String(auth.existingRow?.discord_webhook_url || '').trim();

    if (!targetWebhook) {
      return json({ error: 'Missing Discord webhook URL. Please paste a webhook URL first.' }, { status: 400 });
    }
    if (!isValidDiscordWebhookUrl(targetWebhook)) {
      return json(
        { error: 'Invalid Discord webhook URL. Expected https://discord.com/api/webhooks/<id>/<token>.' },
        { status: 400 }
      );
    }

    const configRow = auth.existingRow;
    const allyTag = configRow?.alliance_tag || 'ALLIANCE';
    const effectiveCategory = category ?? (configRow?.category || 0);

    const imageUrl = `https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/${universeId}/${allianceId}/${playerId}/topflop.png?t=${Date.now()}`;
    const result = await dispatchDiscordWebhook(targetWebhook, universeId, allianceId, playerId, effectiveCategory, env, imageUrl);

    if (!result.success) {
      return json({ error: result.error || 'Failed sending test message to Discord' }, { status: 400 });
    }

    const configId = `${universeId}_${allianceId}_${playerId}`;
    const now = Date.now();
    await db.prepare(`
      INSERT INTO alliance_topflop_configs (
        config_id, universe_id, ogame_alliance_id, alliance_tag, config_name,
        player_id, player_name, scheduled_utc_hour, theme, custom_logo_url,
        custom_title, category, is_default, discord_webhook_url, webhook_post_hour,
        edit_token_hash, last_manual_action_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(config_id) DO UPDATE SET
        discord_webhook_url = excluded.discord_webhook_url,
        webhook_post_hour = excluded.webhook_post_hour,
        edit_token_hash = COALESCE(alliance_topflop_configs.edit_token_hash, excluded.edit_token_hash),
        last_manual_action_at = excluded.last_manual_action_at,
        updated_at = excluded.updated_at
    `).bind(
      configId,
      universeId,
      allianceId,
      allyTag,
      `${allyTag} Daily Top/Flop`,
      playerId,
      configRow?.player_name || `Player #${playerId}`,
      configRow?.scheduled_utc_hour ?? 0,
      configRow?.theme || 'tactical',
      configRow?.custom_logo_url || null,
      configRow?.custom_title || 'Top / Flop of the day',
      effectiveCategory,
      1,
      targetWebhook,
      parseInt(String(webhookPostHour), 10) || 0,
      auth.newTokenHash || null,
      now,
      now
    ).run();

    return json({
      success: true,
      message: 'Test message sent to Discord and settings saved!',
      saved: true,
      hasWebhook: true,
      maskedWebhookUrl: maskDiscordWebhookUrl(targetWebhook),
      ...(auth.newlyIssuedToken ? { editToken: auth.newlyIssuedToken } : {}),
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to dispatch test message' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// 5. SCHEDULED TOP/FLOP CRON RUNNER (Runs Every 5 Minutes via Cloudflare Cron)
// Actively records hourly ring buffer snapshots and generates frozen daily Top/Flop PNGs
// ----------------------------------------------------------------------------
export async function handleScheduledTopFlopCron(env: Env): Promise<void> {
  try {
    const now = new Date();
    const currentUtcHour = now.getUTCHours();
    const currentUtcMinute = now.getUTCMinutes();
    const coreDb = env.CORE_DB || env.DB;
    await ensureTopFlopTables(coreDb);

    // ========================================================================
    // Step 1: Check for Cut-Off Hours & Finalize Daily 24h Top/Flop Reports
    // Gameforge finishes publishing updated highscores by :03-:05 past the hour.
    // Daily finalization executes at :05 past the hour (:05 to :14 window)
    // BEFORE the baseline in the ring buffer is overwritten.
    // ========================================================================
    if (currentUtcMinute >= 5 && currentUtcMinute < 15) {
      const { results: scheduledConfigs } = await coreDb.prepare(`
        SELECT config_id, universe_id, ogame_alliance_id, alliance_tag, player_id, scheduled_utc_hour, theme, custom_title, custom_logo_url, category, last_generated_at
        FROM alliance_topflop_configs
        WHERE scheduled_utc_hour = ?
      `).bind(currentUtcHour).all();

      if (scheduledConfigs && scheduledConfigs.length > 0) {
        for (const config of scheduledConfigs as any[]) {
          const lastGen = config.last_generated_at || 0;
          // Skip if already generated within the past 45 minutes
          if (Date.now() - lastGen < 45 * 60 * 1000) {
            continue;
          }

          try {
            const uId = cleanUni(config.universe_id);
            const aId = String(config.ogame_alliance_id).trim();
            const pId = config.player_id;
            const targetDb = getUniverseDb(env, uId);
            const cat = config.category || 0;

            // 1. Calculate true 24-hour delta (forceRefresh = true, so slot H before update is compared to fresh Gameforge)
            const tfData = await calculate24hAllianceTopFlop(targetDb, uId, aId, currentUtcHour, cat, true);

            // 2. Render SVG -> PNG
            const effectiveLogoUrl = (config.custom_logo_url && config.custom_logo_url.trim().length > 0)
              ? config.custom_logo_url.trim()
              : (tfData.customLogoUrl || null);
            const embeddedLogoDataUri = await fetchLogoAsDataUri(effectiveLogoUrl, env.VAULT_BUCKET);
            const embeddedBgDataUri = await fetchLogoAsDataUri(extractBgUrl(config.theme), env.VAULT_BUCKET);
            const embeddedNexusLogoDataUri = await getNexusLogoDataUri(env.VAULT_BUCKET);
            const svg = generateTopFlopSvg(tfData, config.theme || 'tactical', config.custom_title, embeddedLogoDataUri, embeddedBgDataUri, embeddedNexusLogoDataUri);
            const pngBuffer = await renderTopFlopPng(svg, env.VAULT_BUCKET);

            // 3. Save frozen image to Cloudflare R2
            const r2Key = cat === 0
              ? `topflop/${uId}/${aId}/${pId}/topflop.png`
              : `topflop/${uId}/${aId}/${pId}/topflop_cat${cat}.png`;

            if (env.VAULT_BUCKET) {
              await env.VAULT_BUCKET.put(r2Key, pngBuffer, {
                httpMetadata: {
                  contentType: 'image/png',
                  cacheControl: 'public, max-age=300, s-maxage=86400',
                },
                customMetadata: {
                  universe: uId,
                  allianceId: aId,
                  playerId: pId,
                  generatedAt: String(Date.now()),
                },
              });

              if (config.alliance_tag && config.alliance_tag !== aId) {
                const tagKey = cat === 0
                  ? `topflop/${uId}/${config.alliance_tag}/${pId}/topflop.png`
                  : `topflop/${uId}/${config.alliance_tag}/${pId}/topflop_cat${cat}.png`;
                await env.VAULT_BUCKET.put(tagKey, pngBuffer, {
                  httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=300, s-maxage=86400' },
                });
              }
            }

            // 4. Mark config updated
            await targetDb.prepare(`
              UPDATE alliance_topflop_configs
              SET last_generated_at = ?
              WHERE config_id = ?
            `).bind(Date.now(), config.config_id).run();

            console.log(`[TopFlopCron] Daily 24h Top/Flop successfully generated & frozen for ${config.config_id} at cut-off ${currentUtcHour}:05 UTC`);
          } catch (itemErr: any) {
            console.warn(`[TopFlopCron] Error generating daily report for ${config.config_id}:`, itemErr?.message);
          }
        }
      }
    }

    // ========================================================================
    // Step 1B: Check for Automated Discord Webhook Dispatches
    // Executes at :05 past the hour for all configs matching webhook_post_hour
    // ========================================================================
    if (currentUtcMinute >= 5 && currentUtcMinute < 15) {
      const { results: webhookConfigs } = await coreDb.prepare(`
        SELECT config_id, universe_id, ogame_alliance_id, alliance_tag, player_id,
               discord_webhook_url, webhook_post_hour, category, last_webhook_sent_at
        FROM alliance_topflop_configs
        WHERE discord_webhook_url IS NOT NULL
          AND LENGTH(TRIM(discord_webhook_url)) > 0
          AND webhook_post_hour = ?
      `).bind(currentUtcHour).all();

      if (webhookConfigs && webhookConfigs.length > 0) {
        for (const config of webhookConfigs as any[]) {
          const lastSent = config.last_webhook_sent_at || 0;
          if (Date.now() - lastSent < 45 * 60 * 1000) {
            continue; // Already dispatched in this 45-minute window
          }

          try {
            const uId = cleanUni(config.universe_id);
            const aId = String(config.ogame_alliance_id).trim();
            const pId = config.player_id;
            const targetDb = getUniverseDb(env, uId);
            const cat = config.category || 0;
            const webhookUrl = config.discord_webhook_url.trim();

            const imageUrl = `https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/${uId}/${aId}/${pId}/topflop.png?t=${Date.now()}`;
            const dispatchResult = await dispatchDiscordWebhook(webhookUrl, uId, aId, pId, cat, env, imageUrl);

            if (dispatchResult.success) {
              await targetDb.prepare(`
                UPDATE alliance_topflop_configs
                SET last_webhook_sent_at = ?
                WHERE config_id = ?
              `).bind(Date.now(), config.config_id).run();
              console.log(`[TopFlopCron] Successfully dispatched automated Discord webhook for ${config.config_id} at hour ${currentUtcHour}:05 UTC`);
            } else {
              console.warn(`[TopFlopCron] Discord webhook error for ${config.config_id}:`, dispatchResult.error);
            }
          } catch (whErr: any) {
            console.warn(`[TopFlopCron] Exception dispatching webhook for ${config.config_id}:`, whErr?.message);
          }
        }
      }
    }

    // ========================================================================
    // Step 2: Record Hourly Snapshot into the 24-Hour Ring Buffer
    // Ensures ring buffer always has 24 rolling hourly slots with prev_scores_json
    // ========================================================================
    const { results: distinctAlliances } = await coreDb.prepare(`
      SELECT DISTINCT universe_id, ogame_alliance_id
      FROM alliance_topflop_configs
    `).all();

    if (distinctAlliances && distinctAlliances.length > 0) {
      for (const row of distinctAlliances as any[]) {
        try {
          const uId = cleanUni(row.universe_id);
          const aId = String(row.ogame_alliance_id).trim();
          const targetDb = getUniverseDb(env, uId);
          await ensureTopFlopTables(targetDb);

          // Check if this hour slot was already recorded recently (< 50 minutes ago)
          const existingSlot: any = await targetDb.prepare(`
            SELECT scores_json, recorded_at FROM alliance_hourly_snapshots
            WHERE universe_id = ? AND ogame_alliance_id = ? AND hour_utc = ?
          `).bind(uId, aId, currentUtcHour).first();

          const lastRecordedAt = existingSlot?.recorded_at || 0;
          const isFresh = (Date.now() - lastRecordedAt) < 50 * 60 * 1000;

          if (!isFresh) {
            const gfData = await fetchGameforgeUniverseData(uId, 1, 0);
            const targetAlliance = gfData.alliancesMap.get(aId);

            if (targetAlliance) {
              const currentMemberScores: Record<string, number> = {};
              for (const memberId of targetAlliance.memberIds) {
                currentMemberScores[memberId] = gfData.scoresMap.get(memberId) || 0;
              }

              // Overwrite this hour's slot, preserving previous snapshot as prev_scores_json
              const prevScores = existingSlot?.scores_json || null;
              await targetDb.prepare(`
                INSERT INTO alliance_hourly_snapshots (universe_id, ogame_alliance_id, hour_utc, recorded_at, member_count, scores_json, prev_scores_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(universe_id, ogame_alliance_id, hour_utc) DO UPDATE SET
                  recorded_at = excluded.recorded_at,
                  member_count = excluded.member_count,
                  prev_scores_json = COALESCE(alliance_hourly_snapshots.scores_json, excluded.prev_scores_json),
                  scores_json = excluded.scores_json
              `).bind(
                uId,
                aId,
                currentUtcHour,
                Date.now(),
                targetAlliance.memberIds.length,
                JSON.stringify(currentMemberScores),
                prevScores
              ).run();
              console.log(`[TopFlopCron] Hourly snapshot updated for ${uId} alliance ${aId} at hour ${currentUtcHour}:00 UTC`);
            }
          }
        } catch (snapErr: any) {
          console.warn(`[TopFlopCron] Failed recording hourly snapshot for ${row.universe_id}/${row.ogame_alliance_id}:`, snapErr?.message);
        }
      }
    }
  } catch (err: any) {
    console.error('[TopFlopCron] Fatal scheduled run error:', err);
  }
}

// ----------------------------------------------------------------------------
// 6. BACKFILL ALLIANCE HOURLY SNAPSHOTS (Test Data Population)
// Populates 24-hour ring buffer where every player has between 0.2% and 0.3%
// less points each hour going back into the past.
// ----------------------------------------------------------------------------
export async function handleBackfillHourlySnapshots(req: any, env: Env): Promise<Response> {
  if (!isValidMasterAdminRequest(req, env)) {
    return json({ error: 'Unauthorized: Master admin secret required.' }, { status: 403 });
  }
  try {
    const url = new URL(req.url);
    const universeId = cleanUni(url.searchParams.get('universe') || 's267-en');
    const allianceId = (url.searchParams.get('allianceId') || '500078').trim();

    const db = getUniverseDb(env, universeId);
    await ensureTopFlopTables(db);

    const gfData = await fetchGameforgeUniverseData(universeId, 1, 0);
    const targetAlliance = gfData.alliancesMap.get(allianceId);
    if (!targetAlliance) {
      return json({ error: `Alliance ${allianceId} not found in ${universeId}` }, { status: 404 });
    }

    const currentMemberScores: Record<string, number> = {};
    for (const memberId of targetAlliance.memberIds) {
      currentMemberScores[memberId] = gfData.scoresMap.get(memberId) || 0;
    }

    const now = new Date();
    const currentUtcHour = now.getUTCHours();

    await autoSeedAllianceHourlySnapshots(
      db,
      universeId,
      allianceId,
      targetAlliance,
      currentMemberScores,
      currentUtcHour
    );

    return json({
      success: true,
      universeId,
      allianceId,
      allianceTag: targetAlliance.tag,
      currentUtcHour,
      populatedHoursCount: 24,
      decayFormula: 'Between 0.2% and 0.3% per player per hour going into the past (Approach A: Realistic Auto-Seeding)',
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to backfill snapshots' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// 7. PERSONAL LOGO UPLOAD API (POST /api/topflop/upload-logo)
// Uploads custom alliance logo to Cloudflare R2 into the player's personal vault.
// Replaces any previous logo for this player. Enforces max 1MB size limit.
// ----------------------------------------------------------------------------
export async function handleUploadTopFlopLogo(req: any, env: Env): Promise<Response> {
  try {
    if (!env.VAULT_BUCKET) {
      return json({ error: 'R2 Vault bucket not configured on worker' }, { status: 500 });
    }

    const body = await req.json();
    const {
      universeId: rawUni,
      allianceId: rawAllianceId,
      playerId,
      imageBase64,
      contentType = 'image/png',
      supportsEditToken = false,
    } = body;
    const universeId = cleanUni(rawUni);
    const allianceId = String(rawAllianceId || '').trim();
    const cleanPlayerId = (playerId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');

    if (!cleanPlayerId || !allianceId) {
      return json({ error: 'Missing or invalid allianceId or playerId' }, { status: 400 });
    }
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return json({ error: 'Missing imageBase64 data' }, { status: 400 });
    }

    const db = getUniverseDb(env, universeId);
    await ensureTopFlopTables(db);
    const auth = await authorizeTopFlopMutation(
      req,
      env,
      db,
      universeId,
      allianceId,
      cleanPlayerId,
      Boolean(supportsEditToken)
    );
    if (!auth.authorized) {
      return json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 403 });
    }

    // Strip data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

    // Convert base64 to binary buffer
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;

    // Strict 1MB size limit (1,048,576 bytes)
    const MAX_SIZE = 1048576;
    if (len > MAX_SIZE) {
      return json({
        error: `Uploaded logo exceeds the 1MB limit (size: ${(len / 1024 / 1024).toFixed(2)} MB). Please upload an image under 1MB.`
      }, { status: 400 });
    }

    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Strict MIME whitelist + binary magic-byte validation (blocks HTML/SVG XSS uploads)
    const imgValidation = validateImageBytes(bytes, contentType);
    if (!imgValidation.valid) {
      return json({ error: imgValidation.error || 'Invalid image file' }, { status: 400 });
    }

    // Save to player's personal vault in R2, overwriting any previous upload
    const key = `topflop/vault/${cleanPlayerId}/custom_logo.png`;
    await env.VAULT_BUCKET.put(key, bytes, {
      httpMetadata: {
        contentType: imgValidation.mime,
        cacheControl: 'public, max-age=60, s-maxage=300, must-revalidate',
      },
      customMetadata: {
        universe: universeId,
        playerId: cleanPlayerId,
        uploadedAt: String(Date.now()),
      },
    });

    const logoUrl = `https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/vault/${cleanPlayerId}/custom_logo.png?t=${Date.now()}`;

    if (auth.newTokenHash) {
      const configId = `${universeId}_${allianceId}_${cleanPlayerId}`;
      await db.prepare(`
        UPDATE alliance_topflop_configs
        SET edit_token_hash = COALESCE(edit_token_hash, ?), updated_at = ?
        WHERE config_id = ?
      `).bind(auth.newTokenHash, Date.now(), configId).run();
    }

    return json({
      success: true,
      playerId: cleanPlayerId,
      logoUrl,
      sizeBytes: len,
      ...(auth.newlyIssuedToken ? { editToken: auth.newlyIssuedToken } : {}),
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to upload logo' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// 8. ASSET SERVING ENDPOINT (GET /topflop/assets/*)
// Serves pre-uploaded backgrounds and branding assets with aggressive caching
// ----------------------------------------------------------------------------
export async function handleGetTopFlopAsset(req: any, env: Env): Promise<Response> {
  try {
    if (!env.VAULT_BUCKET) return new Response('R2 not configured', { status: 500 });
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/topflop\/assets\//, '');
    if (!path || path.includes('..') || path.includes('\\')) return new Response('Not found', { status: 404 });

    const key = `topflop/assets/${path}`;
    const obj = await env.VAULT_BUCKET.get(key);
    if (!obj) return new Response('Asset not found', { status: 404 });

    const mime = path.endsWith('.jpg') || path.endsWith('.jpeg')
      ? 'image/jpeg'
      : (path.endsWith('.webp') ? 'image/webp' : (path.endsWith('.svg') ? 'image/svg+xml' : 'image/png'));

    return new Response(obj.body, {
      headers: {
        'Content-Type': mime,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response('Error retrieving asset', { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// 9. VAULT SERVING ENDPOINT (GET /topflop/vault/*)
// Serves personal player vault images
// ----------------------------------------------------------------------------
export async function handleGetTopFlopVaultImage(req: any, env: Env): Promise<Response> {
  try {
    if (!env.VAULT_BUCKET) return new Response('R2 not configured', { status: 500 });
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/topflop\/vault\//, '');
    if (!path || path.includes('..') || path.includes('\\')) return new Response('Not found', { status: 404 });

    const key = `topflop/vault/${path}`;
    const obj = await env.VAULT_BUCKET.get(key);
    if (!obj) return new Response('Image not found', { status: 404 });

    const rawMime = (obj.httpMetadata?.contentType || 'image/png').toLowerCase().split(';')[0];
    const safeMime = (rawMime === 'image/png' || rawMime === 'image/jpeg' || rawMime === 'image/webp')
      ? rawMime
      : 'image/png';
    return new Response(obj.body, {
      headers: {
        'Content-Type': safeMime,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=120, s-maxage=600, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response('Error retrieving vault image', { status: 500 });
  }
}

