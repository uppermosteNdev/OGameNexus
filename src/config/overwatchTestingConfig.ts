// ============================================================================
// NEXUS OVERWATCH — CLOSED TESTING WHITELIST CONFIGURATION (CLOUDFLARE SYNCED)
// ============================================================================

import { getOverwatchApiUrl, fetchOverwatch } from '../utils/overwatchApi';

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
  // Original Beta Fleet
  { playerId: '108895', universeId: 's267-en', playerName: 'Vendetta', note: 'Alliance Leader / Admin' },
  { playerId: '100642', universeId: 's267-en', playerName: 'LazyOldWoman', note: 'Closed Beta Tester' },
  { playerId: '100714', universeId: 's267-en', playerName: 'GrumpyTeapot', note: 'Closed Beta Tester' },
  { playerId: '104382', universeId: 's267-en', playerName: 'Zagls', note: 'Closed Beta Tester' },
  { playerId: '109986', universeId: 's267-en', playerName: 'BloodyMiner', note: 'Closed Beta Tester' },
  { playerId: '100647', universeId: 's267-en', playerName: 'Imp', note: 'Closed Beta Tester' },
  { playerId: '108484', universeId: 's267-en', playerName: 'LordVader', note: 'Closed Beta Tester' },

  // Approved Closed Alpha Testers (Resilient In-Code Master Whitelist)
  { playerId: '106803', universeId: '*', playerName: 'Cookie', note: 'Approved closed alpha tester (s270-de)' },
  { playerId: '106855', universeId: '*', playerName: 'Hazelnuss', note: 'Approved closed alpha tester (s270-de)' },
  { playerId: '111177', universeId: '*', playerName: 'Vice Ferret', note: 'Approved closed alpha tester (s258-fr)' },
  { playerId: '100519', universeId: '*', playerName: 'tatayoyo', note: 'Approved closed alpha tester (s258-fr)' },
  { playerId: '112542', universeId: '*', playerName: 'Garbalaouel', note: 'Approved closed alpha tester (s263-fr)' },
  { playerId: '100382', universeId: '*', playerName: 'NOOBICYDE', note: 'Approved closed alpha tester (s263-fr)' },
  { playerId: '100204', universeId: '*', playerName: 'Zaraki Kenpachi', note: 'Approved closed alpha tester (s263-fr)' },
  { playerId: '112354', universeId: '*', playerName: 'ROBIN0S', note: 'Approved closed alpha tester (s263-fr)' },
  { playerId: '102436', universeId: '*', playerName: 'Chief Galaxy', note: 'Approved closed alpha tester (s278-en)' },
  { playerId: '100134', universeId: '*', playerName: 'Kloek8', note: 'Approved closed alpha tester (s185-nl)' },
  { playerId: '100206', universeId: '*', playerName: 'BirD', note: 'Approved closed alpha tester (s184-nl)' },
  { playerId: '100022', universeId: '*', playerName: 'BirD', note: 'Approved closed alpha tester (s185-nl)' },
  { playerId: '104928', universeId: '*', playerName: 'eL MerGu3zO reGGi4nO', note: 'Approved closed alpha tester (s263-fr)' },
  { playerId: '100215', universeId: '*', playerName: 'Blondie', note: 'Approved closed alpha tester (s185-nl)' },
  { playerId: '105507', universeId: '*', playerName: 'Strangelove', note: 'Approved closed alpha tester (s273-en)' },
  { playerId: '102114', universeId: '*', playerName: 'Rasteiro', note: 'Approved closed alpha tester (s166-pt)' },
  { playerId: '100214', universeId: '*', playerName: 'Kris7768', note: 'Approved closed alpha tester (s272-pl)' },
  { playerId: '100316', universeId: '*', playerName: 'Peaceful Warrior', note: 'Approved closed alpha tester (s272-pl)' },
  { playerId: '105212', universeId: '*', playerName: 'Constantine', note: 'Approved closed alpha tester (s272-pl)' },
  { playerId: '100077', universeId: '*', playerName: 'Bripaticus', note: 'Approved closed alpha tester (s265-us)' },
  { playerId: '100017', universeId: '*', playerName: 'Tier', note: 'Approved closed alpha tester (s279-it)' },
  { playerId: '100603', universeId: '*', playerName: 'John Constantine', note: 'Approved closed alpha tester (s178-pt)' },
  { playerId: '100011', universeId: '*', playerName: 'Hunt4Fun', note: 'Approved closed alpha tester (s263-tr)' },
  { playerId: '100482', universeId: '*', playerName: 'M A D', note: 'Approved closed alpha tester (s268-en)' },
  { playerId: '100177', universeId: '*', playerName: 'Darth', note: 'Approved closed alpha tester (s264-en)' },
  { playerId: '101899', universeId: '*', playerName: 'David Gobbins', note: 'Approved closed alpha tester (s272-es)' },
  { playerId: '100047', universeId: '*', playerName: 'Kloek8', note: 'Approved closed alpha tester (s186-nl)' },
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

export interface OverwatchAccessRequestPayload {
  playerId: string | number;
  playerName?: string;
  universeId: string;
  allianceTag?: string;
  description: string;
}

/**
 * Submits an access request to Cloudflare D1 so that admins can review it.
 */
export async function submitOverwatchAccessRequest(
  payload: OverwatchAccessRequestPayload
): Promise<{ success: boolean; message: string; discordPrompt?: string }> {
  const cleanPid = String(payload.playerId).trim();
  const activeUni = cleanUni(payload.universeId);

  try {
    const res = await fetchOverwatch('/api/v1/testing-gate/request-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: cleanPid,
        playerName: payload.playerName || 'Unknown Pilot',
        universeId: activeUni,
        allianceTag: payload.allianceTag || '',
        description: payload.description,
      }),
    });

    const data: any = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      try {
        localStorage.setItem(`nexus_overwatch_req_sent_${activeUni}_${cleanPid}`, JSON.stringify({
          sentAt: Date.now(),
          description: payload.description,
        }));
      } catch { }
      return {
        success: true,
        message: data?.message || 'Access request successfully registered with Cloudflare.',
        discordPrompt: data?.discordPrompt || 'https://discord.gg/Jm4haETTYp'
      };
    } else {
      return {
        success: false,
        message: data?.error || 'Failed to submit access request to Cloudflare.'
      };
    }
  } catch (err: any) {
    // In case of network error, still record locally for seamless UX
    try {
      localStorage.setItem(`nexus_overwatch_req_sent_${activeUni}_${cleanPid}`, JSON.stringify({
        sentAt: Date.now(),
        description: payload.description,
        offline: true,
      }));
    } catch { }
    return {
      success: false,
      message: err?.message || 'Failed to connect to Cloudflare edge. Please check internet connection.'
    };
  }
}

/**
 * Checks if current player has already submitted an access request.
 */
export function hasSubmittedAccessRequest(playerId?: string | number | null, universeId?: string | null): boolean {
  if (!playerId) return false;
  const cleanPid = String(playerId).trim();
  const activeUni = cleanUni(universeId);
  try {
    return localStorage.getItem(`nexus_overwatch_req_sent_${activeUni}_${cleanPid}`) !== null;
  } catch {
    return false;
  }
}




