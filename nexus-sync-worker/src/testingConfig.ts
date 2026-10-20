// ============================================================================
// NEXUS OVERWATCH — CLOUDFLARE CLOSED TESTING WHITELIST CONFIGURATION
// ============================================================================

export interface CloudflareTester {
  playerId: string;    // OGame Player ID (e.g. '123456')
  universeId?: string; // OGame Universe ID (e.g. 's199-en', or '*' for all universes; defaults to '*')
  playerName?: string; // Optional reference name (e.g. 'AllianceLeader')
  note?: string;       // Optional descriptive note
}

/**
 * Cloudflare-hosted master whitelist for Nexus Overwatch closed testing.
 * When you want to add or remove members, you can update this list or insert rows
 * into the D1 `overwatch_testers` table without needing any code changes.
 */
export const CLOUDFLARE_TESTER_WHITELIST: CloudflareTester[] = [
  { playerId: '108895', universeId: 's267-en', playerName: 'Vendetta', note: 'Alliance Leader / Admin' },
  { playerId: '100642', universeId: 's267-en', playerName: 'LazyOldWoman', note: 'Closed Beta Tester' },
  { playerId: '100714', universeId: 's267-en', playerName: 'GrumpyTeapot', note: 'Closed Beta Tester' },
  { playerId: '104382', universeId: 's267-en', playerName: 'Zagls', note: 'Closed Beta Tester' },
  { playerId: '109986', universeId: 's267-en', playerName: 'BloodyMiner', note: 'Closed Beta Tester' },
  { playerId: '100647', universeId: 's267-en', playerName: 'Imp', note: 'Closed Beta Tester' },
  { playerId: '108484', universeId: 's267-en', playerName: 'LordVader', note: 'Closed Beta Tester' },
];

/**
 * Master gate switch hosted on Cloudflare.
 * If true, non-whitelisted players are locked out.
 * If set to false, Overwatch opens to everyone in the alliance.
 */
export const CLOUDFLARE_ENFORCE_TESTING_GATE = true;

/**
 * Cloudflare override passkey allowing manual unlocking from the UI.
 */
export const CLOUDFLARE_TESTER_PASSKEY = 'CHANGE_ME_SECRET_PASSKEY';
