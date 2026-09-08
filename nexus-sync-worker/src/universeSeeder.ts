// ============================================================================
// NEXUS OVERWATCH — OFFICIAL OGAME XML/JSON UNIVERSE SEEDER
// Endpoints:
// 1. https://{universeId}.ogame.gameforge.com/api/serverData.xml?toJson=1
// 2. https://{universeId}.ogame.gameforge.com/api/alliances.xml?toJson=1
// 3. https://{universeId}.ogame.gameforge.com/api/players.xml?toJson=1
// 4. https://{universeId}.ogame.gameforge.com/api/universe.xml?toJson=1
// ============================================================================

import { Env } from './index';

export function cleanUniverseId(raw: string): string {
  if (!raw) return 's267-en';
  let clean = raw.trim().toLowerCase();
  clean = clean.replace(/\.ogame\.gameforge\.com.*$/, '');
  clean = clean.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (/^\d+-[a-z]+$/.test(clean)) {
    clean = 's' + clean;
  }
  return clean;
}

export function normalizePlayerStatus(raw?: string | null): string {
  if (!raw || raw === 'active') return 'active';
  const clean = raw.trim();
  const tags = new Set<string>();

  if (clean.includes(',')) {
    clean.split(',').forEach(t => {
      const part = t.trim();
      if (part === 'v' || part === 'I' || part === 'i' || part === 'b') {
        tags.add(part);
      }
    });
  } else {
    for (const ch of clean) {
      if (ch === 'v' || ch === 'I' || ch === 'i' || ch === 'b') {
        tags.add(ch);
      }
    }
  }

  if (tags.size === 0) return 'active';

  const ordered: string[] = [];
  if (tags.has('v')) ordered.push('v');
  if (tags.has('I')) ordered.push('I');
  else if (tags.has('i')) ordered.push('i');
  if (tags.has('b')) ordered.push('b');

  return ordered.join(',');
}

interface ParsedAlliance {
  id: string;
  name: string;
  tag: string;
}

interface ParsedPlayer {
  id: string;
  name: string;
  status: string;
  allianceId: string | null;
}

interface ParsedPlanet {
  id: string;
  playerId: string;
  name: string;
  coords: string; // e.g. "5:474:5"
  galaxy: number;
  system: number;
  slot: number;
  hasMoon: boolean;
  moonId?: string;
  moonName?: string;
  moonSize?: number;
}

export async function isUniverseSeeded(rawUniverseId: string, env: Env): Promise<boolean> {
  const universeId = cleanUniverseId(rawUniverseId);
  const result: any = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM universe_slots WHERE universe_id = ?`
  )
    .bind(universeId)
    .first();

  return (result?.count || 0) > 0;
}

export async function seedUniverseFromOfficialAPI(rawUniverseId: string, env: Env): Promise<{
  success: boolean;
  universeId: string;
  serverName: string;
  galaxies: number;
  systems: number;
  planetsCount: number;
  playersCount: number;
  alliancesCount: number;
  moonsCount: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  const universeId = cleanUniverseId(rawUniverseId);
  const baseUrl = `https://${universeId}.ogame.gameforge.com/api`;

  console.log(`[UniverseSeeder] Starting official Gameforge seed for ${universeId} (${baseUrl})...`);

  // 1. Fetch all 4 endpoints concurrently (serverData, alliances, players, universe)
  const [serverDataRes, alliancesRes, playersRes, universeRes] = await Promise.all([
    fetch(`${baseUrl}/serverData.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.4' } }),
    fetch(`${baseUrl}/alliances.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.4' } }),
    fetch(`${baseUrl}/players.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.4' } }),
    fetch(`${baseUrl}/universe.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.4' } }),
  ]);

  if (!universeRes.ok || !playersRes.ok) {
    throw new Error(`Failed to fetch official API from ${baseUrl}. Status: ${universeRes.status}/${playersRes.status}`);
  }

  const serverData: any = serverDataRes.ok ? await serverDataRes.json() : {};
  const alliancesData: any = alliancesRes.ok ? await alliancesRes.json() : {};
  const playersData: any = await playersRes.json();
  const universeData: any = await universeRes.json();

  // 2. Parse Server Data Settings
  const serverName = serverData?.name || 'Unknown';
  const serverNumber = parseInt(serverData?.number || '0', 10);
  const language = serverData?.language || 'en';
  const galaxies = parseInt(serverData?.galaxies || '9', 10);
  const systems = parseInt(serverData?.systems || '499', 10);
  const speed = parseInt(serverData?.speed || '1', 10);
  const speedFleet = parseInt(serverData?.speedFleet || '1', 10);
  const debrisFactor = parseFloat(serverData?.debrisFactor || '0.3');

  // Insert or update universe_info
  await env.DB.prepare(
    `INSERT OR REPLACE INTO universe_info (
      universe_id, server_name, server_number, language, galaxies, systems,
      speed, speed_fleet, debris_factor, last_seeded_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      universeId,
      serverName,
      serverNumber,
      language,
      galaxies,
      systems,
      speed,
      speedFleet,
      debrisFactor,
      Date.now(),
      Date.now()
    )
    .run();

  // 3. Build Alliances Lookup Map
  const alliancesMap = new Map<string, ParsedAlliance>();
  const rawAlliances = alliancesData?.alliance || [];
  const allyList = Array.isArray(rawAlliances) ? rawAlliances : [rawAlliances];

  for (const item of allyList) {
    const attr = item?.['@attributes'] || item;
    if (attr?.id) {
      alliancesMap.set(String(attr.id), {
        id: String(attr.id),
        name: String(attr.name || ''),
        tag: String(attr.tag || ''),
      });
    }
  }

  // 4. Build Players Lookup Map
  const playersMap = new Map<string, ParsedPlayer>();
  const rawPlayers = playersData?.player || [];
  const playerList = Array.isArray(rawPlayers) ? rawPlayers : [rawPlayers];

  for (const item of playerList) {
    const attr = item?.['@attributes'] || item;
    if (attr?.id) {
      playersMap.set(String(attr.id), {
        id: String(attr.id),
        name: String(attr.name || ''),
        status: normalizePlayerStatus(attr.status),
        allianceId: attr.alliance ? String(attr.alliance) : null,
      });
    }
  }

  // 5. Parse Universe Planets & Moons
  const rawPlanets = universeData?.planet || [];
  const planetList = Array.isArray(rawPlanets) ? rawPlanets : [rawPlanets];
  const parsedPlanets: ParsedPlanet[] = [];
  let moonsCount = 0;

  for (const item of planetList) {
    const attr = item?.['@attributes'] || item;
    if (!attr?.coords) continue;

    const [gStr, sStr, pStr] = String(attr.coords).split(':');
    const galaxy = parseInt(gStr, 10);
    const system = parseInt(sStr, 10);
    const slot = parseInt(pStr, 10);

    if (isNaN(galaxy) || isNaN(system) || isNaN(slot)) continue;

    let hasMoon = false;
    let moonId: string | undefined;
    let moonName: string | undefined;
    let moonSize: number | undefined;

    if (item?.moon) {
      const moonAttr = item.moon?.['@attributes'] || item.moon;
      hasMoon = true;
      moonsCount++;
      moonId = moonAttr?.id ? String(moonAttr.id) : undefined;
      moonName = moonAttr?.name ? String(moonAttr.name) : 'Moon';
      moonSize = moonAttr?.size ? parseInt(String(moonAttr.size), 10) : undefined;
    }

    parsedPlanets.push({
      id: String(attr.id || ''),
      playerId: String(attr.player || ''),
      name: String(attr.name || 'Planet'),
      coords: String(attr.coords),
      galaxy,
      system,
      slot,
      hasMoon,
      moonId,
      moonName,
      moonSize,
    });
  }

  // 6. Fetch existing slots for diffing & change detection (if already seeded)
  const existingRows = await env.DB.prepare(
    `SELECT universe_id, galaxy, system, slot, planet_id, planet_name, player_id, player_name, player_status, alliance_tag, has_moon, moon_size, last_changed_at
     FROM universe_slots
     WHERE universe_id = ?`
  )
    .bind(universeId)
    .all();

  const existingMap = new Map<string, any>();
  const isInitialSeed = !existingRows?.results || existingRows.results.length === 0;

  if (!isInitialSeed && existingRows.results) {
    existingRows.results.forEach((r: any) => {
      existingMap.set(`${r.galaxy}:${r.system}:${r.slot}`, r);
    });
  }

  const now = Date.now();
  const detectedEvents: any[] = [];
  const statements: any[] = [];

  const insertQuery = `
    INSERT OR REPLACE INTO universe_slots (
      universe_id, galaxy, system, slot,
      planet_id, planet_name,
      player_id, player_name, player_status, alliance_tag,
      has_moon, moon_size, moon_destroyed,
      last_scanned_at, last_scanned_by, last_changed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // 7. Diff each incoming planet against existing state
  const incomingKeys = new Set<string>();

  for (const p of parsedPlanets) {
    const key = `${p.galaxy}:${p.system}:${p.slot}`;
    incomingKeys.add(key);

    const player = playersMap.get(p.playerId);
    const playerName = player?.name || 'Unknown';
    const playerStatus = player?.status || 'active';
    const alliance = player?.allianceId ? alliancesMap.get(player.allianceId) : null;
    const allianceTag = alliance?.tag || null;

    const oldSlot = existingMap.get(key);
    let hasChanged = false;

    if (!isInitialSeed && oldSlot) {
      // A. Player changed (colonized, abandoned, relocated)
      if (oldSlot.player_id !== p.playerId) {
        hasChanged = true;
        if (!oldSlot.player_id && p.playerId) {
          detectedEvents.push({
            eventType: 'colonized',
            galaxy: p.galaxy,
            system: p.system,
            slot: p.slot,
            playerId: p.playerId,
            playerName,
            oldState: null,
            newState: { playerId: p.playerId, playerName, planetName: p.name },
          });
        } else if (oldSlot.player_id && !p.playerId) {
          detectedEvents.push({
            eventType: 'abandoned',
            galaxy: p.galaxy,
            system: p.system,
            slot: p.slot,
            playerId: oldSlot.player_id,
            playerName: oldSlot.player_name,
            oldState: oldSlot,
            newState: null,
          });
        } else {
          detectedEvents.push({
            eventType: 'relocated',
            galaxy: p.galaxy,
            system: p.system,
            slot: p.slot,
            playerId: p.playerId,
            playerName,
            oldState: oldSlot,
            newState: { playerId: p.playerId, playerName, planetName: p.name },
          });
        }
      }

      // B. Player renamed in players.xml
      if (
        oldSlot.player_id === p.playerId &&
        oldSlot.player_name &&
        playerName &&
        oldSlot.player_name.trim() !== playerName.trim() &&
        !/^\d+$/.test(playerName.trim())
      ) {
        hasChanged = true;
        detectedEvents.push({
          eventType: 'player_renamed',
          galaxy: p.galaxy,
          system: p.system,
          slot: p.slot,
          playerId: p.playerId,
          playerName: playerName.trim(),
          oldState: { playerName: oldSlot.player_name },
          newState: { playerName: playerName.trim() },
        });
      }

      // C. Player status changed in players.xml (e.g. active -> (i), (v), (b), or multiple tags like "v,I")
      const oldStatusNorm = normalizePlayerStatus(oldSlot.player_status);
      const newStatusNorm = normalizePlayerStatus(playerStatus);

      if (
        oldSlot.player_id &&
        p.playerId &&
        oldStatusNorm !== newStatusNorm
      ) {
        hasChanged = true;
        detectedEvents.push({
          eventType: 'status_changed',
          galaxy: p.galaxy,
          system: p.system,
          slot: p.slot,
          playerId: p.playerId,
          playerName,
          oldState: { playerStatus: oldStatusNorm },
          newState: { playerStatus: newStatusNorm },
        });
      }

      // D. Moon spawned in universe.xml
      if ((!oldSlot.has_moon || oldSlot.has_moon === 0) && p.hasMoon) {
        hasChanged = true;
        detectedEvents.push({
          eventType: 'moon_spawned',
          galaxy: p.galaxy,
          system: p.system,
          slot: p.slot,
          playerId: p.playerId,
          playerName,
          oldState: { hasMoon: 0 },
          newState: { hasMoon: 1, moonSize: p.moonSize },
        });
      }
      // E. Moon destroyed in universe.xml
      else if (oldSlot.has_moon === 1 && !p.hasMoon && oldSlot.player_id) {
        hasChanged = true;
        detectedEvents.push({
          eventType: 'moon_destroyed',
          galaxy: p.galaxy,
          system: p.system,
          slot: p.slot,
          playerId: oldSlot.player_id,
          playerName: oldSlot.player_name,
          oldState: { hasMoon: 1, moonSize: oldSlot.moon_size },
          newState: { hasMoon: 0 },
        });
      }

      // F. Planet renamed
      if (oldSlot.planet_name && p.name && oldSlot.planet_name.trim() !== p.name.trim()) {
        hasChanged = true;
      }

      // G. Alliance tag changed in alliances.xml
      if ((oldSlot.alliance_tag || allianceTag) && oldSlot.alliance_tag !== allianceTag) {
        hasChanged = true;
      }
    }

    const slotLastChangedAt = hasChanged
      ? now
      : (oldSlot ? (oldSlot.last_changed_at || null) : null);

    statements.push(
      env.DB.prepare(insertQuery).bind(
        universeId,
        p.galaxy,
        p.system,
        p.slot,
        p.id,
        p.name,
        p.playerId,
        playerName,
        playerStatus,
        allianceTag,
        p.hasMoon ? 1 : 0,
        p.moonSize || null,
        0,
        now,
        'official_ogame_xml',
        slotLastChangedAt
      )
    );
  }

  // 8. Handle deleted/abandoned planets (existed in DB, but missing in incoming universe.xml)
  if (!isInitialSeed) {
    for (const [key, oldSlot] of existingMap.entries()) {
      if (!incomingKeys.has(key) && oldSlot.player_id) {
        const [g, s, p] = key.split(':').map(Number);
        detectedEvents.push({
          eventType: 'abandoned',
          playerId: oldSlot.player_id,
          playerName: oldSlot.player_name,
          oldState: oldSlot,
          newState: null,
          galaxy: g,
          system: s,
          slot: p,
        });

        statements.push(
          env.DB.prepare(`
            UPDATE universe_slots SET
              planet_id = NULL, planet_name = NULL, player_id = NULL, player_name = NULL,
              player_status = NULL, alliance_tag = NULL, has_moon = 0, moon_size = NULL,
              last_scanned_at = ?, last_scanned_by = 'official_ogame_xml', last_changed_at = ?
            WHERE universe_id = ? AND galaxy = ? AND system = ? AND slot = ?
          `).bind(now, now, universeId, g, s, p)
        );
      }
    }
  }

  // 9. Record detected events into universe_events for Live Galaxy Feed
  for (const evt of detectedEvents) {
    const g = evt.galaxy !== undefined ? evt.galaxy : (evt.newState?.galaxy || 1);
    const s = evt.system !== undefined ? evt.system : (evt.newState?.system || 1);
    const sl = evt.slot !== undefined ? evt.slot : (evt.newState?.slot || 1);

    statements.push(
      env.DB.prepare(
        `INSERT INTO universe_events (
          universe_id, galaxy, system, slot, event_type, player_id, player_name,
          old_state_json, new_state_json, detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        universeId,
        g,
        s,
        sl,
        evt.eventType,
        evt.playerId || null,
        evt.playerName || null,
        evt.oldState ? JSON.stringify(evt.oldState) : null,
        evt.newState ? JSON.stringify(evt.newState) : null,
        now
      )
    );
  }

  // 10. Execute in D1 batches of 100
  const CHUNK_SIZE = 100;
  for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    const chunk = statements.slice(i, i + CHUNK_SIZE);
    await env.DB.batch(chunk);
  }

  const durationMs = Date.now() - startTime;
  console.log(`[UniverseSeeder] Seeded ${parsedPlanets.length} planets, ${moonsCount} moons, ${detectedEvents.length} events logged in ${durationMs}ms for ${universeId}`);

  return {
    success: true,
    universeId,
    serverName,
    galaxies,
    systems,
    planetsCount: parsedPlanets.length,
    playersCount: playersMap.size,
    alliancesCount: alliancesMap.size,
    moonsCount,
    durationMs,
  };
}
