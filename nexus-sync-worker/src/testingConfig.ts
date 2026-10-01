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
  // Example entries (or dynamically add to D1 overwatch_testers table):
  // { playerId: '123456', universeId: 's199-en', playerName: 'Leader', note: 'Alliance Leader / Admin' },
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
