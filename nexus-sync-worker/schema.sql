-- ============================================================================
-- NEXUS OVERWATCH — HARDENED D1 SQL DATABASE SCHEMA
-- ============================================================================

-- 1. ALLIANCES & SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS alliances (
    alliance_id TEXT PRIMARY KEY,               -- UUID v4
    ogame_alliance_id TEXT NOT NULL,            -- In-game OGame alliance ID (e.g. "500078")
    glyph_code TEXT UNIQUE NOT NULL,            -- e.g. "NXOW-7K9M-X24Q-8WVT-9N3P"
    glyph_hash TEXT UNIQUE NOT NULL,            -- SHA-256(glyph_code + Pepper)
    alliance_name TEXT NOT NULL,                -- Custom Overwatch display name chosen by creator
    alliance_tag TEXT NOT NULL,                 -- Official in-game tag (e.g. "LoW")
    universe_id TEXT NOT NULL,                  -- e.g. "s267-en"
    admin_player_id TEXT NOT NULL,              -- OGame player ID of the admin
    subscription_tier TEXT DEFAULT 'free_beta', -- 'free_beta', 'commander_monthly', 'alliance_annual'
    subscription_status TEXT NOT NULL,         -- 'active', 'grace_period', 'cancelled', 'expired'
    subscription_expires_at INTEGER NOT NULL,   -- Unix timestamp in ms
    settings_json TEXT DEFAULT '{}',            -- Alliance configs (webhook URLs, default lock TTL, etc.)
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(universe_id, admin_player_id)
);
CREATE INDEX IF NOT EXISTS idx_alliances_universe ON alliances(universe_id);
CREATE INDEX IF NOT EXISTS idx_alliances_admin ON alliances(universe_id, admin_player_id);
CREATE INDEX IF NOT EXISTS idx_alliances_ogame_ally ON alliances(universe_id, ogame_alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliances_glyph_hash ON alliances(glyph_hash);

-- ALLIANCE MEMBERS & GRANULAR PRIVACY SETTINGS
CREATE TABLE IF NOT EXISTS alliance_members (
    alliance_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    auth_token_hash TEXT UNIQUE NOT NULL,       -- SHA-256 of member session token
    role TEXT DEFAULT 'member',                 -- 'admin', 'officer', 'member'
    permissions_json TEXT NOT NULL,             -- Member's privacy toggles (JSON string)
    client_version TEXT NOT NULL,               -- Nexus extension version (e.g. "1.2.0")
    last_sync_at INTEGER NOT NULL,
    PRIMARY KEY (alliance_id, player_id),
    FOREIGN KEY (alliance_id) REFERENCES alliances(alliance_id) ON DELETE CASCADE
);

-- UNIVERSE METADATA & SERVER SETTINGS (FROM serverData.xml)
CREATE TABLE IF NOT EXISTS universe_info (
    universe_id TEXT PRIMARY KEY,               -- e.g. "s267-en"
    server_name TEXT,                          -- e.g. "Lyra"
    server_number INTEGER,                     -- e.g. 267
    language TEXT,                             -- e.g. "en"
    galaxies INTEGER DEFAULT 9,                -- e.g. 5 or 9
    systems INTEGER DEFAULT 499,               -- e.g. 499
    speed INTEGER DEFAULT 1,                   -- e.g. 8
    speed_fleet INTEGER DEFAULT 1,             -- e.g. 8
    debris_factor REAL DEFAULT 0.3,            -- e.g. 0.5
    last_seeded_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 2. FULL UNIVERSE MATRIX (9 Galaxies x 499 Systems x 15 Slots)
CREATE TABLE IF NOT EXISTS universe_slots (
    universe_id TEXT NOT NULL,                  -- e.g. "s198-en"
    galaxy INTEGER NOT NULL,                    -- 1 to 9
    system INTEGER NOT NULL,                    -- 1 to 499
    slot INTEGER NOT NULL,                      -- 1 to 15
    planet_id TEXT,
    planet_name TEXT,
    planet_image TEXT,
    player_id TEXT,
    player_name TEXT,
    player_status TEXT,                         -- 'active', 'i', 'I', 'v', 'b', 'o'
    player_rank INTEGER,
    alliance_tag TEXT,
    has_moon INTEGER DEFAULT 0,                 -- 0 or 1
    moon_id TEXT,
    moon_size INTEGER,
    moon_destroyed INTEGER DEFAULT 0,           -- 0 or 1
    debris_metal INTEGER DEFAULT 0,
    debris_crystal INTEGER DEFAULT 0,
    debris_reaper_metal INTEGER DEFAULT 0,
    debris_reaper_crystal INTEGER DEFAULT 0,
    last_activity_marker TEXT,                  -- '*', '15m', '23m', etc.
    last_activity_timestamp INTEGER,
    last_scanned_at INTEGER NOT NULL,
    last_scanned_by TEXT,                       -- player_name who contributed the scrape
    last_changed_at INTEGER,                    -- Timestamp when slot data actually changed (null if unchanged baseline)
    data_hash TEXT,                             -- MD5/SHA256 of row content for fast change detection
    PRIMARY KEY (universe_id, galaxy, system, slot)
);
CREATE INDEX IF NOT EXISTS idx_universe_coords ON universe_slots(universe_id, galaxy, system);
CREATE INDEX IF NOT EXISTS idx_universe_player ON universe_slots(universe_id, player_id);
CREATE INDEX IF NOT EXISTS idx_universe_status ON universe_slots(universe_id, player_status);

-- HISTORICAL DELTA AUDIT TRAIL (Relocations, Moons, Colonizations)
CREATE TABLE IF NOT EXISTS universe_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    universe_id TEXT NOT NULL,
    galaxy INTEGER NOT NULL,
    system INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    event_type TEXT NOT NULL,                   -- 'colonized', 'abandoned', 'relocated', 'moon_spawned', 'moon_destroyed', 'status_changed', 'player_renamed'
    player_id TEXT,
    player_name TEXT,
    old_state_json TEXT,                        -- Previous slot data
    new_state_json TEXT,                        -- New slot data
    detected_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_universe_time ON universe_events(universe_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_player ON universe_events(universe_id, player_id);

-- 3. 24/7 ACTIVITY PROFILES & SLEEP CYCLE MATRIX
CREATE TABLE IF NOT EXISTS player_activity_heatmap (
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,               -- 0 (Sun) to 6 (Sat)
    hour_of_day INTEGER NOT NULL,               -- 0 to 23
    activity_score INTEGER DEFAULT 1,          -- Weighted observation count
    last_seen_at INTEGER NOT NULL,
    PRIMARY KEY (universe_id, player_id, day_of_week, hour_of_day)
);
CREATE INDEX IF NOT EXISTS idx_heatmap_player ON player_activity_heatmap(universe_id, player_id);

-- 4. SHARED ESPIONAGE DATABASE & ATOMIC RAID LOCKS
CREATE TABLE IF NOT EXISTS spy_reports (
    report_id TEXT PRIMARY KEY,                 -- OGame SR ID or SHA-256 hash
    alliance_id TEXT NOT NULL,
    universe_id TEXT NOT NULL,
    coords TEXT NOT NULL,                       -- "1:234:5"
    is_moon INTEGER DEFAULT 0,
    target_player_id TEXT,
    target_player_name TEXT,
    resources_metal INTEGER DEFAULT 0,
    resources_crystal INTEGER DEFAULT 0,
    resources_deuterium INTEGER DEFAULT 0,
    estimated_loot INTEGER DEFAULT 0,
    fleet_data_json TEXT,                       -- JSON string of ships detected
    defense_data_json TEXT,                     -- JSON string of defenses detected
    buildings_data_json TEXT,                   -- Mines, storages, shipyard
    tech_data_json TEXT,                        -- Weapon, Shield, Armor, LF Tech
    spied_by TEXT NOT NULL,
    report_timestamp INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (alliance_id) REFERENCES alliances(alliance_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_spy_alliance_coords ON spy_reports(alliance_id, coords);
CREATE INDEX IF NOT EXISTS idx_spy_target ON spy_reports(alliance_id, target_player_id);

-- ATOMIC RAID LOCKS (Prevents Friendly Fire & Duplicate Hits)
CREATE TABLE IF NOT EXISTS raid_locks (
    lock_id TEXT PRIMARY KEY,                   -- "s198-en:alliance_id:1:234:5:planet"
    universe_id TEXT NOT NULL,
    alliance_id TEXT NOT NULL,
    coords TEXT NOT NULL,                       -- "1:234:5"
    target_type TEXT DEFAULT 'planet',          -- 'planet' | 'moon' | 'debris'
    locked_by TEXT NOT NULL,                    -- player_name
    eta_timestamp INTEGER,                      -- fleet arrival time
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,                -- Auto-TTL (default 30 min)
    UNIQUE(universe_id, alliance_id, coords, target_type)
);

-- 5. FUTURE-PROOF EXTENSIBLE MODULE STORE (Polymorphic Payload Bus)
CREATE TABLE IF NOT EXISTS module_data (
    entry_id TEXT PRIMARY KEY,                  -- UUID
    module_name TEXT NOT NULL,                  -- e.g. 'acs_planner', 'trade_hub', 'fleet_watch'
    alliance_id TEXT NOT NULL,
    universe_id TEXT NOT NULL,
    entity_key TEXT NOT NULL,                   -- Sub-key (e.g. target coords, trade ID)
    payload_json TEXT NOT NULL,                 -- Extensible JSON data
    encrypted INTEGER DEFAULT 0,                -- 1 if encrypted with Glyph Key
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,                         -- Optional TTL
    FOREIGN KEY (alliance_id) REFERENCES alliances(alliance_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_module_lookup ON module_data(alliance_id, module_name, entity_key);
