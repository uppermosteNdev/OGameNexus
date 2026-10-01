// ============================================================================
// NEXUS OVERWATCH — CLOSED TESTING WHITELIST CONFIGURATION (CLOUDFLARE SYNCED)
// ============================================================================

import { getOverwatchApiUrl } from '../utils/overwatchApi';

export interface OverwatchTester {
  playerId: string;    // OGame Player ID (REQUIRED, e.g. '123456')
  universeId?: string; // OGame Universe ID (e.g. 's199-en', or '*' for all; defaults to '*')
  playerName?: string; // Optional reference name for your own notes (e.g. 'AllianceLeader')
  note?: string;       // Optional descriptive note (e.g. 'Alliance Leader', 'Mate 1')
}

/**
 * Local fallback whitelist for Nexus Overwatch.
 * Primary authorization is checked directly against Cloudflare.
 */
export const OVERWATCH_TESTER_WHITELIST: OverwatchTester[] = [
  // Local fallback entry (optional — active testers can be synced via Cloudflare D1 overwatch_testers)
  // { playerId: '123456', universeId: 's199-en', playerName: 'Leader', note: 'Alliance Leader / Admin' },
];

/**
 * Master switch: If true, testing gate is enforced for non-whitelisted players.
 * If false, open to everyone in the alliance.
 */
export const OVERWATCH_ENFORCE_TESTING_GATE = true;

/**
 * Secret override passkey that allows any player to manually unlock
 * testing mode from the UI without needing a new version build.
 */
export const OVERWATCH_TESTER_PASSKEY = 'CHANGE_ME_SECRET_PASSKEY';

function cleanUni(raw?: string | null): string {
  if (!raw) return '*';
  let clean = raw.trim().toLowerCase();
  clean = clean.replace(/\.ogame\.gameforge\.com.*$/, '');
  clean = clean.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (/^\d+-[a-z]+$/.test(clean)) clean = 's' + clean;
  return clean;
}

/**
 * Syncs tester authorization status directly with Cloudflare backend.
 * Calls /api/v1/testing-gate/check?playerId=...&universeId=...
 * Caches the response locally and dispatches 'nexus_overwatch_tester_updated'.
 */
export async function syncOverwatchTesterStatusWithCloudflare(
  playerId?: string | number | null,
  universeId?: string | null
): Promise<boolean | null> {
  if (!playerId) return null;
  const cleanPid = String(playerId).trim();
  const activeUni = cleanUni(universeId);
  const cacheKey = `${activeUni}:${cleanPid}`;

  try {
    const baseUrl = await getOverwatchApiUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const queryParams = new URLSearchParams({
      playerId: cleanPid,
      universeId: activeUni !== '*' ? activeUni : '',
    });

    const res = await fetch(`${baseUrl}/api/v1/testing-gate/check?${queryParams.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      const isTester = Boolean(data?.isTester);
      try {
        localStorage.setItem('nexus_overwatch_remote_checked_key', cacheKey);
        localStorage.setItem('nexus_overwatch_remote_is_tester', isTester ? 'true' : 'false');
        localStorage.setItem('nexus_overwatch_remote_last_check', String(Date.now()));
        if (typeof data?.enforceGate === 'boolean') {
          localStorage.setItem('nexus_overwatch_remote_enforce_gate', data.enforceGate ? 'true' : 'false');
        }
      } catch { }

      window.dispatchEvent(new Event('nexus_overwatch_tester_updated'));
      return isTester;
    }
  } catch {
    // Network offline / Cloudflare unreachable; fall back to local/cached status
  }
  return null;
}

/**
 * Helper to check whether an account has tester authorization.
 * Checks Cloudflare remote verified status, passkey, and local fallback
 * matching both player ID AND universe ID.
 */
export function isOverwatchTester(
  account?: { playerId?: string | number | null; universe?: string | null; playerName?: string | null } | null,
  savedUnlockedPasskey?: string | null
): boolean {
  // Check if Cloudflare master switch disabled the gate
  try {
    const remoteEnforce = localStorage.getItem('nexus_overwatch_remote_enforce_gate');
    if (remoteEnforce === 'false') return true;
  } catch { }

  if (!OVERWATCH_ENFORCE_TESTING_GATE) return true;

  // Check saved passkey unlock
  if (savedUnlockedPasskey && savedUnlockedPasskey.trim().toUpperCase() === OVERWATCH_TESTER_PASSKEY.trim().toUpperCase()) {
    return true;
  }

  if (!account || !account.playerId) return false;

  const currentPid = String(account.playerId).trim();
  const currentUni = cleanUni(account.universe);
  const cacheKey = `${currentUni}:${currentPid}`;

  // 1. Check Cloudflare remote verified status from cache
  try {
    const cachedKey = localStorage.getItem('nexus_overwatch_remote_checked_key');
    const cachedResult = localStorage.getItem('nexus_overwatch_remote_is_tester');
    if (cachedKey === cacheKey && cachedResult !== null) {
      if (cachedResult === 'true') return true;
      if (cachedResult === 'false') {
        // If explicitly denied by Cloudflare, return false unless on local emergency leader list
        const inLocalEmergency = OVERWATCH_TESTER_WHITELIST.some(t => {
          if (String(t.playerId).trim() !== currentPid) return false;
          if (!t.universeId || t.universeId === '*') return true;
          return cleanUni(t.universeId) === currentUni;
        });
        return inLocalEmergency;
      }
    }
  } catch { }

  // 2. Local fallback list
  return OVERWATCH_TESTER_WHITELIST.some(tester => {
    if (String(tester.playerId).trim() !== currentPid) return false;
    if (!tester.universeId || tester.universeId === '*') return true;
    return cleanUni(tester.universeId) === currentUni;
  });
}



