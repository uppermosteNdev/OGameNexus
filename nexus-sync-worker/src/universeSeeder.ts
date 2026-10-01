// ============================================================================
// NEXUS OVERWATCH — OFFICIAL OGAME XML/JSON UNIVERSE SEEDER
// Endpoints:
// 1. https://{universeId}.ogame.gameforge.com/api/serverData.xml?toJson=1
// 2. https://{universeId}.ogame.gameforge.com/api/alliances.xml?toJson=1
// 3. https://{universeId}.ogame.gameforge.com/api/players.xml?toJson=1
// 4. https://{universeId}.ogame.gameforge.com/api/universe.xml?toJson=1
// ============================================================================

import { Env } from './index';
import { getUniverseDb } from './dbRouter';

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
  const db = getUniverseDb(env, universeId);
  const result: any = await db.prepare(
    `SELECT COUNT(*) as count FROM universe_baseline_planets WHERE universe_id = ?`
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
  eventsCount?: number;
  durationMs: number;
  universeXmlTimestamp: number;
  nextUniverseXmlAt: number;
  playersXmlTimestamp: number;
  nextPlayersXmlAt: number;
}> {
  const startTime = Date.now();
  const universeId = cleanUniverseId(rawUniverseId);
  const baseUrl = `https://${universeId}.ogame.gameforge.com/api`;

  console.log(`[UniverseSeeder] Starting official Gameforge seed for ${universeId} (${baseUrl})...`);

  // 1. Fetch all 4 endpoints concurrently (serverData, alliances, players, universe)
  const [serverDataRes, alliancesRes, playersRes, universeRes] = await Promise.all([
    fetch(`${baseUrl}/serverData.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.5' } }),
    fetch(`${baseUrl}/alliances.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.5' } }),
    fetch(`${baseUrl}/players.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.5' } }),
    fetch(`${baseUrl}/universe.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.5' } }),
  ]);

  if (!universeRes.ok || !playersRes.ok) {
    throw new Error(`Failed to fetch official API from ${baseUrl}. Status: ${universeRes.status}/${playersRes.status}`);
  }

  const serverData: any = serverDataRes.ok ? await serverDataRes.json() : {};
  const alliancesData: any = alliancesRes.ok ? await alliancesRes.json() : {};
  const playersData: any = await playersRes.json();
  const universeData: any = await universeRes.json();

  // 2. Parse Server Data Settings & Gameforge Timestamps
  const serverName = serverData?.name || 'Unknown';
  const serverNumber = parseInt(serverData?.number || '0', 10);
  const language = serverData?.language || 'en';
  const galaxies = parseInt(serverData?.galaxies || '9', 10);
  const systems = parseInt(serverData?.systems || '499', 10);
  const speed = parseInt(serverData?.speed || '1', 10);
  const speedFleet = parseInt(serverData?.speedFleet || '1', 10);
  const debrisFactor = parseFloat(serverData?.debrisFactor || '0.3');

  // Official Gameforge XML Timestamps
  const rawUniverseTs = universeData?.['@attributes']?.timestamp || universeData?.timestamp;
  const universeXmlTimestamp = rawUniverseTs ? parseInt(rawUniverseTs, 10) * 1000 : Date.now();
  const nextUniverseXmlAt = universeXmlTimestamp + (7 * 86400 * 1000) + 1000;

  const rawPlayersTs = playersData?.['@attributes']?.timestamp || playersData?.timestamp;
  const playersXmlTimestamp = rawPlayersTs ? parseInt(rawPlayersTs, 10) * 1000 : Date.now();
  const nextPlayersXmlAt = playersXmlTimestamp + (86400 * 1000) + 1000;

  const db = getUniverseDb(env, universeId);

  // Insert or update universe_info
  await db.prepare(
    `INSERT OR REPLACE INTO universe_info (
      universe_id, server_name, server_number, language, galaxies, systems,
      speed, speed_fleet, debris_factor, last_seeded_at, updated_at,
      universe_xml_timestamp, next_universe_xml_at, players_xml_timestamp, next_players_xml_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      Date.now(),
      universeXmlTimestamp,
      nextUniverseXmlAt,
      playersXmlTimestamp,
      nextPlayersXmlAt
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

  // 6. Fetch existing slots for diffing & change detection (sparse baseline)
  const existingRows = await db.prepare(
    `SELECT universe_id, galaxy, system, slot, planet_id, planet_name, player_id, player_name, player_status, alliance_tag, has_moon, moon_size, last_changed_at
     FROM universe_baseline_planets
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
    INSERT OR REPLACE INTO universe_baseline_planets (
      universe_id, galaxy, system, slot,
      planet_id, planet_name,
      player_id, player_name, player_status, alliance_tag,
      has_moon, moon_id, moon_size,
      last_updated_at, last_changed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // 7. Diff each incoming planet against existing state
  const incomingKeys = new Set<string>();

  for (const p of parsedPlanets) {
    const key = `${p.galaxy}:${p.system}:${p.slot}`;
    const player = playersMap.get(p.playerId);

    // If a planet in universe.xml references a player ID that no longer exists in players.xml,
    // that player's account was deleted in OGame. Do NOT treat as an active planet!
    // (Step 8 will cleanly detect it as abandoned/deleted and remove it from universe_baseline_planets).
    if (p.playerId && !player) {
      continue;
    }

    incomingKeys.add(key);

    const playerName = player?.name?.trim() || null;
    const playerStatus = normalizePlayerStatus(player?.status);
    const alliance = player?.allianceId ? alliancesMap.get(player.allianceId) : null;
    const allianceTag = alliance?.tag || null;

    const oldSlot = existingMap.get(key);
    let hasChanged = false;

    if (!isInitialSeed) {
      if (!oldSlot && p.playerId) {
        // Newly colonized planet (was uncolonized in previous seed)
        hasChanged = true;
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
      } else if (oldSlot) {
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
          player &&
          oldSlot.player_id === p.playerId &&
          oldSlot.player_name &&
          playerName &&
          playerName !== 'Unknown' &&
          oldSlot.player_name !== 'Unknown' &&
          oldSlot.player_name.trim() !== playerName.trim() &&
          !playerName.trim().startsWith('#')
        ) {
          hasChanged = true;
          detectedEvents.push({
            eventType: 'player_renamed',
            galaxy: p.galaxy,
            system: p.system,
            slot: p.slot,
            playerId: p.playerId,
            playerName: playerName.trim(),
            oldState: { playerName: oldSlot.player_name, playerStatus: oldSlot.player_status },
            newState: { playerName: playerName.trim(), playerStatus: normalizePlayerStatus(playerStatus) },
          });
        }

        // C. Player status changed in players.xml (e.g. active -> (i), (v), (b), or multiple tags like "v,I")
        const oldStatusNorm = normalizePlayerStatus(oldSlot.player_status);
        const newStatusNorm = normalizePlayerStatus(playerStatus);

        if (
          player &&
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
    }

    const slotLastChangedAt = hasChanged
      ? now
      : (oldSlot ? (oldSlot.last_changed_at || null) : null);

    statements.push(
      db.prepare(insertQuery).bind(
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
        p.moonId || null,
        p.moonSize || null,
        now,
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
          db.prepare(`
            DELETE FROM universe_baseline_planets
            WHERE universe_id = ? AND galaxy = ? AND system = ? AND slot = ?
          `).bind(universeId, g, s, p)
        );
      }
    }
  }

  // 9. Record detected events into universe_events for Live Galaxy Feed (Public Server Event)
  for (const evt of detectedEvents) {
    const g = evt.galaxy !== undefined ? evt.galaxy : (evt.newState?.galaxy || 1);
    const s = evt.system !== undefined ? evt.system : (evt.newState?.system || 1);
    const sl = evt.slot !== undefined ? evt.slot : (evt.newState?.slot || 1);

    statements.push(
      db.prepare(
        `INSERT INTO universe_events (
          alliance_id, universe_id, galaxy, system, slot, event_type, player_id, player_name,
          detected_by, old_state_json, new_state_json, detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        'public',
        universeId,
        g,
        s,
        sl,
        evt.eventType,
        evt.playerId || null,
        evt.playerName || null,
        'Gameforge XML',
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
    await db.batch(chunk);
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
    eventsCount: detectedEvents.length,
    durationMs,
    universeXmlTimestamp,
    nextUniverseXmlAt,
    playersXmlTimestamp,
    nextPlayersXmlAt,
  };
}

// ============================================================================
// DAILY PLAYERS & ALLIANCES SYNC (Gameforge 24h cycle)
// Updates player status (i, I, v, b, active) and tags for all occupied slots
// without re-seeding the entire 3,000+ planet topology.
// ============================================================================
export async function syncDailyPlayersAndAlliances(rawUniverseId: string, env: Env): Promise<{
  success: boolean;
  universeId: string;
  playersCount: number;
  slotsUpdated: number;
  statusEventsCount: number;
  durationMs: number;
  playersXmlTimestamp: number;
  nextPlayersXmlAt: number;
}> {
  const startTime = Date.now();
  const universeId = cleanUniverseId(rawUniverseId);
  const baseUrl = `https://${universeId}.ogame.gameforge.com/api`;

  console.log(`[DailySync] Starting daily players/alliances sync for ${universeId}...`);

  const [alliancesRes, playersRes] = await Promise.all([
    fetch(`${baseUrl}/alliances.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.5' } }),
    fetch(`${baseUrl}/players.xml?toJson=1`, { headers: { 'User-Agent': 'OGameNexus-Sync/1.2.5' } }),
  ]);

  if (!playersRes.ok) {
    throw new Error(`Failed to fetch players.xml from ${baseUrl}. Status: ${playersRes.status}`);
  }

  const alliancesData: any = alliancesRes.ok ? await alliancesRes.json() : {};
  const playersData: any = await playersRes.json();

  const rawPlayersTs = playersData?.['@attributes']?.timestamp || playersData?.timestamp;
  const playersXmlTimestamp = rawPlayersTs ? parseInt(rawPlayersTs, 10) * 1000 : Date.now();
  const nextPlayersXmlAt = playersXmlTimestamp + (86400 * 1000) + 1000;

  // 1. Build Alliances Map
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

  // 2. Build Players Map
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

  const db = getUniverseDb(env, universeId);

  // 3. Query all occupied slots
  const existingRows: any = await db.prepare(
    `SELECT galaxy, system, slot, player_id, player_name, player_status, alliance_tag
     FROM universe_baseline_planets
     WHERE universe_id = ? AND player_id IS NOT NULL`
  ).bind(universeId).all();

  const slots = existingRows?.results || [];
  const now = Date.now();
  const statements: any[] = [];
  let statusEventsCount = 0;

  for (const slot of slots) {
    const player = playersMap.get(slot.player_id);
    if (!player) {
      // The player's account was deleted/pruned in OGame (missing from players.xml)
      // Delete this abandoned planet from baseline and emit an 'abandoned' event
      statements.push(
        db.prepare(
          `DELETE FROM universe_baseline_planets
           WHERE universe_id = ? AND galaxy = ? AND system = ? AND slot = ?`
        ).bind(universeId, slot.galaxy, slot.system, slot.slot)
      );

      statements.push(
        db.prepare(
          `INSERT INTO universe_events (
             alliance_id, universe_id, galaxy, system, slot, event_type, player_id, player_name,
             detected_by, old_state_json, new_state_json, detected_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          'public',
          universeId, slot.galaxy, slot.system, slot.slot, 'abandoned',
          slot.player_id, slot.player_name,
          'Gameforge Sync',
          JSON.stringify({ playerStatus: slot.player_status, playerName: slot.player_name }),
          null,
          now
        )
      );
      continue;
    }

    const newPlayerName = player.name.trim();
    const newPlayerStatus = normalizePlayerStatus(player.status);
    const alliance = player.allianceId ? alliancesMap.get(player.allianceId) : null;
    const newAllianceTag = alliance?.tag || null;

    const oldStatusNorm = normalizePlayerStatus(slot.player_status);
    const nameChanged = slot.player_name && slot.player_name.trim() !== newPlayerName;
    const statusChanged = oldStatusNorm !== newPlayerStatus;
    const tagChanged = (slot.alliance_tag || newAllianceTag) && slot.alliance_tag !== newAllianceTag;

    if (nameChanged || statusChanged || tagChanged) {
      statements.push(
        db.prepare(
          `UPDATE universe_baseline_planets SET
             player_name = ?, player_status = ?, alliance_tag = ?,
             last_updated_at = ?, last_changed_at = ?
           WHERE universe_id = ? AND galaxy = ? AND system = ? AND slot = ?`
        ).bind(newPlayerName, newPlayerStatus, newAllianceTag, now, now, universeId, slot.galaxy, slot.system, slot.slot)
      );

      if (statusChanged) {
        statusEventsCount++;
        statements.push(
          db.prepare(
            `INSERT INTO universe_events (
               alliance_id, universe_id, galaxy, system, slot, event_type, player_id, player_name,
               detected_by, old_state_json, new_state_json, detected_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            'public',
            universeId, slot.galaxy, slot.system, slot.slot, 'status_changed',
            slot.player_id, newPlayerName,
            'Gameforge Sync',
            JSON.stringify({ playerStatus: oldStatusNorm }),
            JSON.stringify({ playerStatus: newPlayerStatus }),
            now
          )
        );
      }
    }
  }

  // 4. Update timestamps in universe_info
  statements.push(
    db.prepare(
      `UPDATE universe_info SET
         players_xml_timestamp = ?, next_players_xml_at = ?, updated_at = ?
       WHERE universe_id = ?`
    ).bind(playersXmlTimestamp, nextPlayersXmlAt, now, universeId)
  );

  // 5. Execute in D1 batches of 100
  const CHUNK_SIZE = 100;
  for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    await db.batch(statements.slice(i, i + CHUNK_SIZE));
  }

  const durationMs = Date.now() - startTime;
  console.log(`[DailySync] Completed for ${universeId}: ${statements.length} slots updated, ${statusEventsCount} status changes in ${durationMs}ms`);

  return {
    success: true,
    universeId,
    playersCount: playersMap.size,
    slotsUpdated: statements.length,
    statusEventsCount,
    durationMs,
    playersXmlTimestamp,
    nextPlayersXmlAt,
  };
}

/**
 * Migration helper: If universe_baseline_planets is empty but legacy universe_slots exists,
 * copies occupied planet rows over seamlessly to preserve local test data.
 */
export async function ensureBaselinePlanetsMigrated(rawUniverseId: string, env: Env): Promise<void> {
  const universeId = cleanUniverseId(rawUniverseId);
  const db = getUniverseDb(env, universeId);
  try {
    const baselineCount: any = await db.prepare(
      `SELECT COUNT(*) as count FROM universe_baseline_planets WHERE universe_id = ?`
    ).bind(universeId).first();

    if ((baselineCount?.count || 0) === 0) {
      const tableCheck: any = await db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='universe_slots'`
      ).first();

      if (tableCheck) {
        const legacyRows: any = await db.prepare(
          `SELECT COUNT(*) as count FROM universe_slots WHERE universe_id = ? AND player_id IS NOT NULL`
        ).bind(universeId).first();

        if ((legacyRows?.count || 0) > 0) {
          console.log(`[UniverseSeeder] Migrating ${legacyRows.count} legacy rows from universe_slots to universe_baseline_planets for ${universeId}...`);
          await db.prepare(`
            INSERT OR IGNORE INTO universe_baseline_planets (
              universe_id, galaxy, system, slot, planet_id, planet_name,
              player_id, player_name, player_status, alliance_tag,
              has_moon, moon_id, moon_size, last_updated_at, last_changed_at
            )
            SELECT
              universe_id, galaxy, system, slot, planet_id, planet_name,
              player_id, player_name, player_status, alliance_tag,
              has_moon, moon_id, moon_size, last_scanned_at, last_changed_at
            FROM universe_slots
            WHERE universe_id = ? AND player_id IS NOT NULL
          `).bind(universeId).run();
        }
      }
    }
  } catch (err) {
    console.warn('[UniverseSeeder] Migration check notice:', err);
  }
}
