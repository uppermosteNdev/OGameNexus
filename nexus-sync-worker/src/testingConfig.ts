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
