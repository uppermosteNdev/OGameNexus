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
CREATE INDEX IF NOT EXISTS idx_members_player ON alliance_members(player_id);

-- ALLIANCE JOIN REQUESTS & ACCESS CLEARANCE QUEUE
CREATE TABLE IF NOT EXISTS alliance_join_requests (
    request_id TEXT PRIMARY KEY,
    alliance_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    ogame_alliance_tag TEXT,
    ogame_alliance_id TEXT,
    universe_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',              -- 'pending', 'approved', 'denied'
    suggested_role TEXT DEFAULT 'member',       -- 'member', 'visitor'
    assigned_role TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(alliance_id, player_id),
    FOREIGN KEY (alliance_id) REFERENCES alliances(alliance_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_join_requests_ally ON alliance_join_requests(alliance_id, status);

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
    updated_at INTEGER NOT NULL,
    universe_xml_timestamp INTEGER,            -- Gameforge universe.xml root timestamp (ms)
    next_universe_xml_at INTEGER,              -- When Gameforge cache expires (7d + 1s, ms)
    players_xml_timestamp INTEGER,             -- Gameforge players.xml root timestamp (ms)
    next_players_xml_at INTEGER,               -- When Gameforge players.xml expires (24h + 1s, ms)
    last_forced_seed_at INTEGER                -- Enforces 24h admin cooldown on forced re-seeds
);

-- 2. SPARSE UNIVERSE TOPOLOGY & ALLIANCE INTEL ISOLATION

-- 2A. OFFICIAL GAMEFORGE BASELINE (Public Server Topology from universe.xml + players.xml)
-- Sparse: Stores ONLY colonized planets and moons (3,000-5,000 rows per universe).
CREATE TABLE IF NOT EXISTS universe_baseline_planets (
    universe_id TEXT NOT NULL,                  -- e.g. "s267-en"
    galaxy INTEGER NOT NULL,                    -- 1 to 9
    system INTEGER NOT NULL,                    -- 1 to 499
    slot INTEGER NOT NULL,                      -- 1 to 15
    planet_id TEXT,
    planet_name TEXT,
    player_id TEXT,
    player_name TEXT,
    player_status TEXT,                         -- 'active', 'i', 'I', 'v', 'b', 'o'
    alliance_tag TEXT,
    has_moon INTEGER DEFAULT 0,                 -- 0 or 1
    moon_id TEXT,
    moon_size INTEGER,
    last_updated_at INTEGER NOT NULL,
    last_changed_at INTEGER,
    PRIMARY KEY (universe_id, galaxy, system, slot)
);
CREATE INDEX IF NOT EXISTS idx_baseline_coords ON universe_baseline_planets(universe_id, galaxy, system);
CREATE INDEX IF NOT EXISTS idx_baseline_player ON universe_baseline_planets(universe_id, player_id);
CREATE INDEX IF NOT EXISTS idx_baseline_status ON universe_baseline_planets(universe_id, player_status);
CREATE INDEX IF NOT EXISTS idx_baseline_player_name ON universe_baseline_planets(universe_id, player_name);

-- 2B. ALLIANCE SURVEY REGISTRY (Tracks which systems this alliance has scouted)
CREATE TABLE IF NOT EXISTS alliance_scanned_systems (
    alliance_id TEXT NOT NULL,
    universe_id TEXT NOT NULL,
    galaxy INTEGER NOT NULL,
    system INTEGER NOT NULL,
    scanned_at INTEGER NOT NULL,
    scanned_by TEXT NOT NULL,                   -- Player name who contributed the scan
    PRIMARY KEY (alliance_id, universe_id, galaxy, system)
);
CREATE INDEX IF NOT EXISTS idx_ally_scanned_sys ON alliance_scanned_systems(alliance_id, universe_id);

-- 2C. ALLIANCE PRIVATE GALAXY SLOTS (Sparse: only occupied planets, moons, or debris fields)
CREATE TABLE IF NOT EXISTS alliance_galaxy_slots (
    alliance_id TEXT NOT NULL,                  -- Strict Alliance Isolation
    universe_id TEXT NOT NULL,                  -- e.g. "s267-en"
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
    last_changed_at INTEGER,                    -- Timestamp when slot data actually changed
    data_hash TEXT,
    PRIMARY KEY (alliance_id, universe_id, galaxy, system, slot)
);
CREATE INDEX IF NOT EXISTS idx_ally_slots_coords ON alliance_galaxy_slots(alliance_id, universe_id, galaxy, system);
CREATE INDEX IF NOT EXISTS idx_ally_slots_player ON alliance_galaxy_slots(alliance_id, universe_id, player_id);
CREATE INDEX IF NOT EXISTS idx_ally_slots_status ON alliance_galaxy_slots(alliance_id, universe_id, player_status);

-- HISTORICAL DELTA AUDIT TRAIL (Relocations, Moons, Colonizations)
-- Scoped to alliance_id (or 'public' for official Gameforge XML updates)
CREATE TABLE IF NOT EXISTS universe_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    alliance_id TEXT NOT NULL,                  -- Strict Alliance Isolation ('public' for server news)
    universe_id TEXT NOT NULL,
    galaxy INTEGER NOT NULL,
    system INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    event_type TEXT NOT NULL,                   -- 'colonized', 'abandoned', 'relocated', 'moon_spawned', 'moon_destroyed', 'status_changed', 'player_renamed'
    player_id TEXT,
    player_name TEXT,
    detected_by TEXT,                           -- 'Gameforge XML', 'Gameforge Sync', or player_name (e.g. 'ScoutPilot')
    old_state_json TEXT,                        -- Previous slot data
    new_state_json TEXT,                        -- New slot data
    detected_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_ally_time ON universe_events(alliance_id, universe_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_player ON universe_events(alliance_id, universe_id, player_id);

-- 3. 24/7 ACTIVITY PROFILES & SLEEP CYCLE MATRIX (Alliance-Isolated Intel)
CREATE TABLE IF NOT EXISTS player_activity_heatmap (
    alliance_id TEXT NOT NULL,                  -- Strict Alliance Isolation
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,               -- 0 (Sun) to 6 (Sat)
    hour_of_day INTEGER NOT NULL,               -- 0 to 23
    activity_score INTEGER DEFAULT 1,          -- Weighted observation count
    active_pings INTEGER DEFAULT 0,            -- Number of times seen active (* or min timer)
    idle_checks INTEGER DEFAULT 0,             -- Number of times scanned and verified idle (no timer)
    moon_pings INTEGER DEFAULT 0,              -- Detections specifically on moon
    last_seen_at INTEGER NOT NULL,
    PRIMARY KEY (alliance_id, universe_id, player_id, day_of_week, hour_of_day)
);
CREATE INDEX IF NOT EXISTS idx_heatmap_ally_player ON player_activity_heatmap(alliance_id, universe_id, player_id);

-- Granular observation stream (Last 50-100 activity pings per player)
CREATE TABLE IF NOT EXISTS player_activity_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alliance_id TEXT NOT NULL,
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    galaxy INTEGER NOT NULL,
    system INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    target_type TEXT NOT NULL,                  -- 'planet' | 'moon'
    activity_marker TEXT NOT NULL,              -- '*', '15m', '35m', etc.
    inferred_timestamp INTEGER NOT NULL,
    scanned_at INTEGER NOT NULL,
    scanned_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_obs_player ON player_activity_observations(alliance_id, universe_id, player_id, inferred_timestamp DESC);

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
CREATE INDEX IF NOT EXISTS idx_spy_alliance_uni_coords ON spy_reports(alliance_id, universe_id, coords, is_moon);
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

-- 6. ALLIANCE EMPIRE SYNC (Member Empire, Mine Levels, Facilities, Lifeforms, Fleet, Research)
CREATE TABLE IF NOT EXISTS alliance_empires (
    alliance_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    player_class INTEGER,                       -- 1: Collector, 2: Warrior, 3: Discoverer
    alliance_class INTEGER,                     -- 0: None, 1: Trader, 2: Researcher, 3: Warrior
    total_score INTEGER DEFAULT 0,
    economy_score INTEGER DEFAULT 0,
    military_score INTEGER DEFAULT 0,
    research_score INTEGER DEFAULT 0,
    planet_count INTEGER DEFAULT 0,
    moon_count INTEGER DEFAULT 0,
    total_mines INTEGER DEFAULT 0,
    total_ships INTEGER DEFAULT 0,
    total_fleet_msu INTEGER DEFAULT 0,
    avatar_url TEXT,
    avg_metal_mine REAL DEFAULT 0,
    avg_crystal_mine REAL DEFAULT 0,
    avg_deut_mine REAL DEFAULT 0,
    total_metal_hourly INTEGER DEFAULT 0,
    total_crystal_hourly INTEGER DEFAULT 0,
    total_deut_hourly INTEGER DEFAULT 0,
    data_hash TEXT NOT NULL,
    empire_json TEXT NOT NULL,                   -- Full JSON payload: planets, facilities, mines, fleet, research, LF
    last_synced_at INTEGER NOT NULL,
    PRIMARY KEY (alliance_id, player_id),
    FOREIGN KEY (alliance_id) REFERENCES alliances(alliance_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_empires_ally ON alliance_empires(alliance_id);

-- 7. OVERWATCH CLOSED TESTING ACCESS CONTROL
CREATE TABLE IF NOT EXISTS overwatch_testers (
    player_id TEXT NOT NULL,
    universe_id TEXT NOT NULL DEFAULT '*',
    player_name TEXT,
    note TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (player_id, universe_id)
);

-- 8. PERSONAL VAULT — CREDENTIALS & MULTI-DEVICE PAIRING
CREATE TABLE IF NOT EXISTS personal_vault_credentials (
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    vault_key_hash TEXT NOT NULL,
    device_label TEXT,
    total_syncs INTEGER DEFAULT 0,
    last_sent_at INTEGER,
    last_fetched_at INTEGER,
    last_full_resync_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (universe_id, player_id)
);

-- 9. PERSONAL VAULT — EXPEDITIONS ARCHIVE
CREATE TABLE IF NOT EXISTS personal_vault_expeditions (
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    coords TEXT NOT NULL,
    depletion INTEGER DEFAULT 0,
    size INTEGER DEFAULT 0,
    result TEXT NOT NULL,
    result_details_json TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (universe_id, player_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_vault_exp_time ON personal_vault_expeditions(universe_id, player_id, timestamp);

-- 10. PERSONAL VAULT — COMBAT REPORTS ARCHIVE
CREATE TABLE IF NOT EXISTS personal_vault_combats (
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    coords TEXT NOT NULL,
    winner TEXT NOT NULL,
    loot_metal INTEGER DEFAULT 0,
    loot_crystal INTEGER DEFAULT 0,
    loot_deut INTEGER DEFAULT 0,
    loot_food INTEGER DEFAULT 0,
    debris_metal INTEGER DEFAULT 0,
    debris_crystal INTEGER DEFAULT 0,
    debris_deut INTEGER DEFAULT 0,
    attacker_losses INTEGER DEFAULT 0,
    defender_losses INTEGER DEFAULT 0,
    attacker_name TEXT,
    defender_name TEXT,
    my_losses INTEGER DEFAULT 0,
    is_acs INTEGER DEFAULT 0,
    is_expedition INTEGER DEFAULT 0,
    expedition_attack_type TEXT,
    summary_json TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (universe_id, player_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_vault_com_time ON personal_vault_combats(universe_id, player_id, timestamp);

-- 11. PERSONAL VAULT — DEBRIS HARVESTS ARCHIVE
CREATE TABLE IF NOT EXISTS personal_vault_harvests (
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    harvest_key TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    coords TEXT NOT NULL,
    metal INTEGER DEFAULT 0,
    crystal INTEGER DEFAULT 0,
    deut INTEGER DEFAULT 0,
    recycler_amount INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (universe_id, player_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_vault_harv_time ON personal_vault_harvests(universe_id, player_id, timestamp);

-- 12. PERSONAL VAULT — LIFEFORM DISCOVERIES ARCHIVE
CREATE TABLE IF NOT EXISTS personal_vault_discoveries (
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    coords TEXT NOT NULL,
    lifeform INTEGER,
    discovery_type TEXT NOT NULL,
    lifeform_exp INTEGER DEFAULT 0,
    artifacts_found INTEGER DEFAULT 0,
    artifact_size TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (universe_id, player_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_vault_disc_time ON personal_vault_discoveries(universe_id, player_id, timestamp);

-- 13. PERSONAL VAULT — COSTS PLANNER QUEUES (TODO PROJECTS)
CREATE TABLE IF NOT EXISTS personal_vault_planner (
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    project_key TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    target_level INTEGER NOT NULL,
    planet_id TEXT,
    planet_name TEXT,
    coords TEXT,
    cost_metal INTEGER DEFAULT 0,
    cost_crystal INTEGER DEFAULT 0,
    cost_deut INTEGER DEFAULT 0,
    msu_cost INTEGER DEFAULT 0,
    prod_delta_metal INTEGER DEFAULT 0,
    prod_delta_crystal INTEGER DEFAULT 0,
    prod_delta_deut INTEGER DEFAULT 0,
    roi_hours REAL DEFAULT 0,
    timestamp INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (universe_id, player_id, project_key)
);

-- 14. PERSONAL VAULT — RAID RADAR TARGETS
CREATE TABLE IF NOT EXISTS personal_vault_radar (
    universe_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    planet_id TEXT NOT NULL,
    planet_key TEXT NOT NULL,
    target_player_id TEXT,
    target_player_name TEXT,
    coords TEXT NOT NULL,
    metal_per_hour INTEGER DEFAULT 0,
    crystal_per_hour INTEGER DEFAULT 0,
    deut_per_hour INTEGER DEFAULT 0,
    production_msu_per_hour REAL DEFAULT 0,
    last_spied_metal INTEGER DEFAULT 0,
    last_spied_crystal INTEGER DEFAULT 0,
    last_spied_deut INTEGER DEFAULT 0,
    last_spied_timestamp INTEGER DEFAULT 0,
    player_status_json TEXT DEFAULT '[]',
    last_hash_code TEXT,
    spy_count INTEGER DEFAULT 0,
    confidence INTEGER DEFAULT 0,
    loot_percentage INTEGER DEFAULT 50,
    capacities_json TEXT DEFAULT '{}',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (universe_id, player_id, coords)
);
CREATE INDEX IF NOT EXISTS idx_vault_radar_coords ON personal_vault_radar(universe_id, player_id, coords);



