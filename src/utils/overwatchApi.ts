// ============================================================================
// NEXUS OVERWATCH — CENTRALIZED API CLIENT & HEALTH ENGINE
// ============================================================================

export const DEFAULT_OVERWATCH_API_URL = 'https://nexus-sync-worker.nexus-overwatch.workers.dev';

/**
 * Dynamically resolves the active Overwatch Edge API endpoint.
 * Supports custom deployment URLs configured by user/alliance in storage,
 * falling back to the standard local dev / edge endpoint.
 */
export async function getOverwatchApiUrl(): Promise<string> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const res = await chrome.storage.local.get(['nexus_overwatch_config', 'nexus_overwatch_api_url']);
      if (res?.nexus_overwatch_api_url && typeof res.nexus_overwatch_api_url === 'string') {
        const clean = res.nexus_overwatch_api_url.trim().replace(/\/+$/, '');
        if (clean && !clean.includes(':8787')) return clean;
      }
      if (res?.nexus_overwatch_config?.customApiUrl && typeof res.nexus_overwatch_config.customApiUrl === 'string') {
        const clean = res.nexus_overwatch_config.customApiUrl.trim().replace(/\/+$/, '');
        if (clean && !clean.includes(':8787')) return clean;
      }
    } catch {
      // Storage unavailable or context invalidated, fallback to default
    }
  }
  return DEFAULT_OVERWATCH_API_URL;
}
export const NEXUS_EXTENSION_SECRET = 'nx_sec_9a7b4c2e8f103d5ae8b4f1a2c9d7e5b3';

/**
 * Computes an HMAC-SHA256 signature for authenticating API calls to Cloudflare Overwatch Edge.
 */
export async function signOverwatchRequest(method: string, path: string): Promise<{
  timestamp: string;
  signature: string;
  clientKey: string;
}> {
  const timestamp = Date.now().toString();
  const message = `${method.toUpperCase()}:${path}:${timestamp}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(NEXUS_EXTENSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    timestamp,
    signature,
    clientKey: NEXUS_EXTENSION_SECRET,
  };
}

/**
 * Centralized authenticated fetch wrapper for all Nexus Overwatch edge requests.
 * Automatically computes and attaches HMAC signatures, timestamps, and client keys.
 */
export async function fetchOverwatch(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = await getOverwatchApiUrl();
  const rawUrl = typeof input === 'string' ? input : input.toString();
  const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  const urlObj = new URL(fullUrl);
  const method = (init?.method || 'GET').toUpperCase();

  const { timestamp, signature, clientKey } = await signOverwatchRequest(method, urlObj.pathname);

  const headers = new Headers(init?.headers || {});
  headers.set('X-Nexus-Client-Key', clientKey);
  headers.set('X-Nexus-Timestamp', timestamp);
  headers.set('X-Nexus-Signature', signature);

  return fetch(fullUrl, {
    ...init,
    headers,
  });
}

/**
 * Transparent fetch interceptor: ensures all fetch calls targeting the Overwatch Edge API
 * automatically carry HMAC signatures, timestamps, and client keys without manual header wiring.
 */
if (typeof globalThis !== 'undefined' && !(globalThis as any).__nexusOverwatchFetchPatched) {
  (globalThis as any).__nexusOverwatchFetchPatched = true;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const rawUrl = typeof input === 'string'
      ? input
      : (input instanceof URL ? input.toString() : (input && 'url' in input ? (input as Request).url : ''));

    if (rawUrl && (rawUrl.includes('.workers.dev') || rawUrl.includes(':8787'))) {
      try {
        const urlObj = new URL(rawUrl);
        const method = (init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
        const { timestamp, signature, clientKey } = await signOverwatchRequest(method, urlObj.pathname);

        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));
        headers.set('X-Nexus-Client-Key', clientKey);
        headers.set('X-Nexus-Timestamp', timestamp);
        headers.set('X-Nexus-Signature', signature);

        return originalFetch(input, {
          ...init,
          headers,
        });
      } catch (err) {
        console.warn('Overwatch fetch signing error, falling back to standard fetch:', err);
      }
    }

    return originalFetch(input, init);
  };
}

export interface OverwatchHealthResult {
  online: boolean;
  latencyMs: number | null;
  service?: string;
  version?: string;
  error?: string;
}

/**
 * Pings the Overwatch backend /api/health endpoint and calculates network latency.
 */
export async function checkOverwatchHealth(customUrl?: string): Promise<OverwatchHealthResult> {
  const baseUrl = customUrl || (await getOverwatchApiUrl());
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Math.max(1, Math.round(performance.now() - start));

    if (!res.ok) {
      return {
        online: false,
        latencyMs: null,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      online: data?.status === 'ok',
      latencyMs,
      service: data?.service,
      version: data?.version,
    };
  } catch (err: any) {
    return {
      online: false,
      latencyMs: null,
      error: err?.name === 'AbortError' ? 'Connection timed out (4s)' : (err?.message || 'Network unreachable'),
    };
  }
}

const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function calculateGlyphChecksum(str: string): string {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const val = CROCKFORD_ALPHABET.indexOf(str[i]);
    if (val !== -1) {
      sum = (sum * 37 + val) % 1024;
    }
  }
  const c1 = CROCKFORD_ALPHABET[Math.floor(sum / 32) % 32];
  const c2 = CROCKFORD_ALPHABET[sum % 32];
  return `${c1}${c2}`;
}

/**
 * Validates the format and Crockford Base32 checksum of an Alliance Invite Glyph.
 */
export function validateAllianceGlyph(glyph: string): boolean {
  if (!glyph || typeof glyph !== 'string') return false;
  const clean = glyph.toUpperCase().trim().replace(/[^0-9A-Z]/g, '');

  if (!clean.startsWith('NXOW') || clean.length !== 20) return false;

  const contentAndCheck = clean.slice(4); // 16 chars
  const content = contentAndCheck.slice(0, 14);
  const providedCheck = contentAndCheck.slice(14, 16);

  for (const c of contentAndCheck) {
    if (!CROCKFORD_ALPHABET.includes(c)) return false;
  }

  const expectedCheck = calculateGlyphChecksum(content);
  return providedCheck === expectedCheck;
}

export interface PlayerActivityHeatmapPoint {
  day_of_week: number; // 0 (Sun) - 6 (Sat)
  hour_of_day: number; // 0 - 23
  activity_score: number;
  active_pings?: number;
  idle_checks?: number;
  moon_pings?: number;
  last_seen_at?: number;
}

export interface PlayerActivityObservation {
  galaxy: number;
  system: number;
  slot: number;
  target_type: 'planet' | 'moon';
  activity_marker: string;
  inferred_timestamp: number;
  scanned_at: number;
  scanned_by: string;
}

export interface PlayerColonyCoord {
  galaxy: number;
  system: number;
  slot: number;
  planet_name: string | null;
  has_moon: number;
  moon_size: number | null;
}

export interface PlayerActivitySummary {
  totalActivePings: number;
  totalIdleChecks: number;
  totalMoonPings: number;
  moonRatio: number;
  detectedSleepStartUTC: number;
  detectedSleepEndUTC: number;
  confidence: number;
}

export interface PlayerActivityResponse {
  success: boolean;
  playerId: string;
  playerName: string;
  playerStatus: string | null;
  allianceTag: string | null;
  planetCount: number;
  universeId: string;
  planets: PlayerColonyCoord[];
  heatmap: PlayerActivityHeatmapPoint[];
  observations: PlayerActivityObservation[];
  recentEvents: any[];
  summary: PlayerActivitySummary;
  error?: string;
}

/**
 * Retrieves comprehensive activity intelligence for a player from Overwatch backend.
 */
export async function fetchPlayerActivityIntelligence(
  universeId: string,
  playerIdentifier: string,
  authToken?: string
): Promise<PlayerActivityResponse | null> {
  try {
    const apiUrl = await getOverwatchApiUrl();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const res = await fetchOverwatch(
      `${apiUrl}/api/v1/players/${encodeURIComponent(playerIdentifier)}/activity?universeId=${encodeURIComponent(universeId)}&name=${encodeURIComponent(playerIdentifier)}`,
      { headers }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('fetchPlayerActivityIntelligence network error:', err);
    return null;
  }
}

