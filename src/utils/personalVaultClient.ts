// ============================================================================
// NEXUS OVERWATCH — PERSONAL VAULT CLIENT ENGINE
// Handles multi-device state synchronization between local Dexie and Cloudflare D1.
// Strictly non-destructive, enforces highest-production rule for Raid Radar.
// Robust batching with live progress reporting for massive historical archives.
// ============================================================================

import { db, Expedition, CombatReport, DebrisHarvest, LifeformDiscovery, TodoProject, SpiedPlanet } from '../db';
import { getOverwatchApiUrl, fetchOverwatch } from './overwatchApi';
import { cleanUniverseId, isSameUniverse } from './universe';

const VAULT_KEY_PREFIX = 'nexus_vault_key_';

/**
 * Generates a high-entropy Crockford-style Vault Key:
 * Format: NX-VLT-XXXX-XXXX-XXXX
 */
export function generateNewVaultKey(): string {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  let str = '';
  for (let i = 0; i < 12; i++) {
    str += chars[array[i] % chars.length];
  }
  return `NX-VLT-${str.slice(0, 4)}-${str.slice(4, 8)}-${str.slice(8, 12)}`;
}

/**
 * Retrieves the stored vault key for this player and universe.
 */
export async function getStoredVaultKey(universe: string, playerId: string): Promise<string> {
  const storageKey = `${VAULT_KEY_PREFIX}${universe}_${playerId}`;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const res = await chrome.storage.local.get([storageKey]);
      if (res?.[storageKey] && typeof res[storageKey] === 'string') {
        return res[storageKey];
      }
    } catch {
      // Storage unavailable, check localStorage
    }
  }

  try {
    const val = localStorage.getItem(storageKey);
    if (val) return val;
  } catch {}

  // If no key found, auto-generate a new one and persist it
  const newKey = generateNewVaultKey();
  await saveStoredVaultKey(universe, playerId, newKey);
  return newKey;
}

/**
 * Saves or updates the stored vault key for this player and universe.
 */
export async function saveStoredVaultKey(universe: string, playerId: string, key: string): Promise<void> {
  const storageKey = `${VAULT_KEY_PREFIX}${universe}_${playerId}`;
  const cleanKey = key.trim();

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      await chrome.storage.local.set({ [storageKey]: cleanKey });
    } catch {}
  }

  try {
    localStorage.setItem(storageKey, cleanKey);
  } catch {}
}

export interface VaultTelemetryCounts {
  expeditions: number;
  combats: number;
  harvests: number;
  discoveries: number;
  planner: number;
  radar: number;
}

export interface VaultMaxTimestamps {
  expeditions: number;
  combats: number;
  harvests: number;
  discoveries: number;
  radar?: number;
}

export interface VaultSummaryResponse {
  success: boolean;
  vaultRegistered: boolean;
  counts: VaultTelemetryCounts;
  maxTimestamps?: VaultMaxTimestamps;
  totalSyncs: number;
  lastSentAt: number | null;
  lastFetchedAt: number | null;
  lastFullResyncAt?: number | null;
  canFullResync?: boolean;
  fullResyncCooldownMs?: number;
  error?: string;
}

/**
 * Fetches lightweight summary telemetry from the Cloudflare edge for this player's Personal Vault.
 */
export async function fetchVaultSummary(universe: string, playerId: string, vaultKey: string): Promise<VaultSummaryResponse> {
  const baseUrl = await getOverwatchApiUrl();
  try {
    const url = new URL(`${baseUrl}/api/v1/vault/summary`);
    url.searchParams.set('universeId', universe);
    url.searchParams.set('playerId', playerId);
    url.searchParams.set('vaultKey', vaultKey);

    const res = await fetchOverwatch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Nexus-Vault-Key': vaultKey,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        vaultRegistered: false,
        counts: { expeditions: 0, combats: 0, harvests: 0, discoveries: 0, planner: 0, radar: 0 },
        totalSyncs: 0,
        lastSentAt: null,
        lastFetchedAt: null,
        error: (err as any).error || `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      vaultRegistered: false,
      counts: { expeditions: 0, combats: 0, harvests: 0, discoveries: 0, planner: 0, radar: 0 },
      totalSyncs: 0,
      lastSentAt: null,
      lastFetchedAt: null,
      error: err.message || 'Failed to connect to Personal Vault server',
    };
  }
}

export interface VaultProgressUpdate {
  stage: string;
  current: number;
  total: number;
  percent: number;
}

export interface VaultSendResult {
  success: boolean;
  saved?: VaultTelemetryCounts;
  totalLocal?: VaultTelemetryCounts;
  isDelta?: boolean;
  lastSentAt?: number;
  error?: string;
}

/**
 * Collects local device data (stripping flavor text and massive raw DOM payloads)
 * and sends it to the Cloudflare Personal Vault edge in manageable chunks with live progress.
 * Supports intelligent Delta Sync: skips unchanged records to save bandwidth & Cloudflare D1 write quotas.
 */
export async function sendLocalDataToVault(
  universe: string,
  playerId: string,
  vaultKey: string,
  deviceLabel: string = 'Local Terminal',
  onProgress?: (progress: VaultProgressUpdate) => void,
  options?: { forceFullResync?: boolean }
): Promise<VaultSendResult> {
  const baseUrl = await getOverwatchApiUrl();
  try {
    // 1. Gather local Dexie records for this player / universe
    onProgress?.({ stage: 'Reading local database records...', current: 0, total: 100, percent: 3 });
    const pidStr = String(playerId || '').trim();
    const pidNum = Number(pidStr);
    const pidVariants: any[] = [pidStr];
    if (!isNaN(pidNum) && String(pidNum) === pidStr) {
      pidVariants.push(pidNum);
    }

    const [
      localExpeditions,
      localCombats,
      localHarvests,
      localDiscoveries,
      allProjects,
      allSpiedPlanets,
      cartSetting,
    ] = await Promise.all([
      db.expeditions.where('playerId').anyOf(pidVariants).toArray(),
      db.combatReports.where('playerId').anyOf(pidVariants).toArray(),
      db.debrisHarvests.where('playerId').anyOf(pidVariants).toArray(),
      db.lifeformDiscoveries.where('playerId').anyOf(pidVariants).toArray(),
      db.todoProjects.toArray(),
      db.spiedPlanets.toArray(),
      pidStr ? db.settings.get('costs_planner_cart_' + pidStr) : Promise.resolve(null),
    ]);

    const filteredProjects = allProjects.filter(p => !p.playerId || String(p.playerId).trim() === pidStr);
    const localRadar = allSpiedPlanets.filter(p => isSameUniverse(p.universe, universe));

    // Also check if cartSetting was empty but there's any costs_planner_cart_ setting
    let cartItems: any[] = [];
    if (Array.isArray((cartSetting as any)?.cartItems)) {
      cartItems = (cartSetting as any).cartItems;
    } else {
      const allSettings = await db.settings.toArray();
      const found = allSettings.find(s => String(s.id).startsWith('costs_planner_cart_'));
      if (found && Array.isArray((found as any)?.cartItems)) {
        cartItems = (found as any).cartItems;
      }
    }

    // 2. Compact payloads (Strip unnecessary bulk)
    const compactedExpeditions = localExpeditions.map(e => ({
      messageId: e.messageId,
      timestamp: e.timestamp,
      coords: e.coords,
      depletion: e.depletion,
      size: e.size,
      result: e.result,
      resultDetails: e.resultDetails,
    }));

    const compactedCombats = localCombats.map(c => ({
      messageId: c.messageId,
      timestamp: c.timestamp,
      coords: c.coords,
      winner: c.winner,
      loot: c.loot,
      debris: c.debris,
      attackerLosses: c.attackerLosses,
      defenderLosses: c.defenderLosses,
      attackerName: c.attackerName,
      defenderName: c.defenderName,
      myLosses: c.myLosses,
      isAcs: c.isAcs,
      isExpedition: c.isExpedition,
      expeditionAttackType: c.expeditionAttackType,
      honor: c.honor,
      moonChance: c.moonChance,
    }));

    const cleanUni = cleanUniverseId(universe);
    const compactedHarvests = localHarvests.map(h => {
      const msgId = String(h.messageId || (h.harvestKey ? h.harvestKey.replace(/^.+?_/, '') : '') || `${h.coords}_${h.timestamp}`);
      return {
        harvestKey: `${cleanUni}_${msgId}`,
        messageId: msgId,
        timestamp: h.timestamp,
        coords: h.coords,
        recycledResources: h.recycledResources,
        recyclerAmount: h.recyclerAmount,
      };
    });

    const compactedDiscoveries = localDiscoveries.map(d => ({
      messageId: d.messageId,
      timestamp: d.timestamp,
      coords: d.coords,
      lifeform: d.lifeform,
      discoveryType: d.discoveryType,
      lifeformGainedExperience: d.lifeformGainedExperience,
      artifactsFound: d.artifactsFound,
      artifactSize: d.artifactSize,
    }));

    const compactedTodos = filteredProjects.map(p => ({
      projectKey: p.projectKey,
      name: p.name,
      type: p.type,
      targetLevel: p.targetLevel,
      planetId: p.planetId,
      planetName: p.planetName,
      coords: p.coords,
      cost: p.cost,
      msuCost: p.msuCost,
      prodDelta: p.prodDelta,
      roiHours: p.roiHours,
      timestamp: p.timestamp,
    }));

    const compactedCart = cartItems.map(c => {
      const metal = Number(c.cost?.metal || 0);
      const crystal = Number(c.cost?.crystal || 0);
      const deut = Number(c.cost?.deuterium || 0);
      const msu = Math.round(metal + crystal * 1.5 + deut * 3);
      const safeId = c.id || `${c.planetId || 'global'}_${c.category}_${c.itemName}`;
      return {
        projectKey: `cart_${encodeURIComponent(safeId)}`,
        name: c.itemName || 'Project',
        type: `cart:${c.category || 'Mines'}:${c.itemId || 0}:${c.currentLevel || 0}:${c.quantity || 1}`,
        targetLevel: Number(c.targetLevel || 1),
        planetId: c.planetId ? String(c.planetId) : null,
        planetName: c.planetName ? String(c.planetName) : null,
        coords: c.coords ? String(c.coords) : null,
        cost: { metal, crystal, deuterium: deut },
        msuCost: msu,
        prodDelta: { metal: 0, crystal: 0, deuterium: 0 },
        roiHours: 0,
        timestamp: Date.now(),
      };
    });

    const compactedPlanner = [...compactedTodos, ...compactedCart];

    const compactedRadar = localRadar.map(r => ({
      planetKey: r.planetKey || `${cleanUni}_${r.planetId || r.coords}`,
      planetId: r.planetId || r.coords,
      playerId: r.playerId,
      playerName: r.playerName,
      coords: r.coords,
      metalPerHour: r.metalPerHour,
      crystalPerHour: r.crystalPerHour,
      deuteriumPerHour: r.deuteriumPerHour,
      lastSpiedMetal: r.lastSpiedMetal,
      lastSpiedCrystal: r.lastSpiedCrystal,
      lastSpiedDeuterium: r.lastSpiedDeuterium,
      lastSpiedTimestamp: r.lastSpiedTimestamp,
      playerStatus: r.playerStatus,
      lastHashCode: r.lastHashCode,
      spyCount: r.spyCount,
      confidence: r.confidence,
      lootPercentage: r.lootPercentage,
      metalCapacity: r.metalCapacity,
      crystalCapacity: r.crystalCapacity,
      deuteriumCapacity: r.deuteriumCapacity,
      metalStorageLevel: r.metalStorageLevel,
      crystalStorageLevel: r.crystalStorageLevel,
      deuteriumStorageLevel: r.deuteriumStorageLevel,
    }));

    // 3. Inspect cloud vault telemetry for smart Delta Sync
    onProgress?.({ stage: 'Checking cloud vault status & deltas...', current: 0, total: 100, percent: 6 });
    let summary: VaultSummaryResponse | null = null;
    if (!options?.forceFullResync) {
      try {
        summary = await fetchVaultSummary(cleanUni, playerId, vaultKey);
      } catch (err) {
        console.warn('[PersonalVault] Failed to retrieve summary for delta sync:', err);
      }
    }

    const serverCounts = summary?.vaultRegistered ? summary.counts : null;
    const serverMaxTimes = summary?.vaultRegistered ? summary.maxTimestamps : null;
    let isDeltaSyncActive = false;

    // 1. Delta filter for expeditions
    let expeditionsToSend = compactedExpeditions;
    if (summary?.vaultRegistered && !options?.forceFullResync) {
      const serverCount = Number(serverCounts?.expeditions || 0);
      const maxTime = Number(serverMaxTimes?.expeditions || 0);

      if (maxTime > 0) {
        expeditionsToSend = compactedExpeditions.filter(e => Number(e.timestamp || 0) > maxTime);
        isDeltaSyncActive = true;
      } else if (serverCount > 0 && compactedExpeditions.length <= serverCount) {
        expeditionsToSend = [];
        isDeltaSyncActive = true;
      } else if (serverCount > 0 && compactedExpeditions.length > serverCount) {
        expeditionsToSend = compactedExpeditions.slice(serverCount);
        isDeltaSyncActive = true;
      }
    }

    // 2. Delta filter for combats
    let combatsToSend = compactedCombats;
    if (summary?.vaultRegistered && !options?.forceFullResync) {
      const serverCount = Number(serverCounts?.combats || 0);
      const maxTime = Number(serverMaxTimes?.combats || 0);

      if (maxTime > 0) {
        combatsToSend = compactedCombats.filter(c => Number(c.timestamp || 0) > maxTime);
        isDeltaSyncActive = true;
      } else if (serverCount > 0 && compactedCombats.length <= serverCount) {
        combatsToSend = [];
        isDeltaSyncActive = true;
      } else if (serverCount > 0 && compactedCombats.length > serverCount) {
        combatsToSend = compactedCombats.slice(serverCount);
        isDeltaSyncActive = true;
      }
    }

    // 3. Delta filter for harvests
    let harvestsToSend = compactedHarvests;
    if (summary?.vaultRegistered && !options?.forceFullResync) {
      const serverCount = Number(serverCounts?.harvests || 0);
      const maxTime = Number(serverMaxTimes?.harvests || 0);

      if (maxTime > 0) {
        harvestsToSend = compactedHarvests.filter(h => Number(h.timestamp || 0) > maxTime);
        isDeltaSyncActive = true;
      } else if (serverCount > 0 && compactedHarvests.length <= serverCount) {
        harvestsToSend = [];
        isDeltaSyncActive = true;
      } else if (serverCount > 0 && compactedHarvests.length > serverCount) {
        harvestsToSend = compactedHarvests.slice(serverCount);
        isDeltaSyncActive = true;
      }
    }

    // 4. Delta filter for discoveries
    let discoveriesToSend = compactedDiscoveries;
    if (summary?.vaultRegistered && !options?.forceFullResync) {
      const serverCount = Number(serverCounts?.discoveries || 0);
      const maxTime = Number(serverMaxTimes?.discoveries || 0);

      if (maxTime > 0) {
        discoveriesToSend = compactedDiscoveries.filter(d => Number(d.timestamp || 0) > maxTime);
        isDeltaSyncActive = true;
      } else if (serverCount > 0 && compactedDiscoveries.length <= serverCount) {
        discoveriesToSend = [];
        isDeltaSyncActive = true;
      } else if (serverCount > 0 && compactedDiscoveries.length > serverCount) {
        discoveriesToSend = compactedDiscoveries.slice(serverCount);
        isDeltaSyncActive = true;
      }
    }

    console.log('[PersonalVault] Delta sync assessment:', {
      vaultRegistered: summary?.vaultRegistered,
      serverCounts,
      serverMaxTimes,
      forceFullResync: options?.forceFullResync,
      toSend: {
        expeditions: expeditionsToSend.length,
        combats: combatsToSend.length,
        harvests: harvestsToSend.length,
        discoveries: discoveriesToSend.length,
        planner: compactedPlanner.length,
        radar: compactedRadar.length,
      }
    });

    const plannerToSend = compactedPlanner;
    const radarToSend = compactedRadar;

    const totalItemsToSend =
      expeditionsToSend.length +
      combatsToSend.length +
      harvestsToSend.length +
      discoveriesToSend.length +
      plannerToSend.length +
      radarToSend.length;

    let itemsProcessed = 0;
    const syncSessionId = `sync_${playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Helper to send a single batch payload
    const sendBatch = async (batchPayload: any) => {
      const res = await fetchOverwatch(`${baseUrl}/api/v1/vault/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nexus-Vault-Key': vaultKey,
        },
        body: JSON.stringify({
          universeId: cleanUni,
          playerId,
          vaultKey,
          deviceLabel,
          syncSessionId,
          isFullResync: Boolean(options?.forceFullResync),
          ...batchPayload,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    };

    // 1. Send Expeditions in chunks of 500 (strictly within Cloudflare worker limits)
    const EXP_CHUNK_SIZE = 500;
    if (expeditionsToSend.length > 0) {
      for (let i = 0; i < expeditionsToSend.length; i += EXP_CHUNK_SIZE) {
        const chunk = expeditionsToSend.slice(i, i + EXP_CHUNK_SIZE);
        await sendBatch({ expeditions: chunk });
        itemsProcessed += chunk.length;
        onProgress?.({
          stage: `Uploading Expeditions (${itemsProcessed.toLocaleString()} / ${expeditionsToSend.length.toLocaleString()})...`,
          current: itemsProcessed,
          total: Math.max(1, totalItemsToSend),
          percent: Math.min(99, Math.round((itemsProcessed / Math.max(1, totalItemsToSend)) * 100)),
        });
      }
    } else if (compactedExpeditions.length > 0) {
      onProgress?.({
        stage: `Expeditions in sync (${compactedExpeditions.length.toLocaleString()} verified)`,
        current: itemsProcessed,
        total: Math.max(1, totalItemsToSend),
        percent: 25,
      });
    }

    // 2. Send Combats in chunks of 500
    const COM_CHUNK_SIZE = 500;
    if (combatsToSend.length > 0) {
      for (let i = 0; i < combatsToSend.length; i += COM_CHUNK_SIZE) {
        const chunk = combatsToSend.slice(i, i + COM_CHUNK_SIZE);
        await sendBatch({ combats: chunk });
        itemsProcessed += chunk.length;
        onProgress?.({
          stage: `Uploading Combats (${(i + chunk.length).toLocaleString()} / ${combatsToSend.length.toLocaleString()})...`,
          current: itemsProcessed,
          total: Math.max(1, totalItemsToSend),
          percent: Math.min(99, Math.round((itemsProcessed / Math.max(1, totalItemsToSend)) * 100)),
        });
      }
    } else if (compactedCombats.length > 0) {
      onProgress?.({
        stage: `Combats in sync (${compactedCombats.length.toLocaleString()} verified)`,
        current: itemsProcessed,
        total: Math.max(1, totalItemsToSend),
        percent: 45,
      });
    }

    // 3. Send Lifeform Discoveries in chunks of 500
    const DISC_CHUNK_SIZE = 500;
    if (discoveriesToSend.length > 0) {
      for (let i = 0; i < discoveriesToSend.length; i += DISC_CHUNK_SIZE) {
        const chunk = discoveriesToSend.slice(i, i + DISC_CHUNK_SIZE);
        await sendBatch({ discoveries: chunk });
        itemsProcessed += chunk.length;
        onProgress?.({
          stage: `Uploading Lifeform Discoveries (${(i + chunk.length).toLocaleString()} / ${discoveriesToSend.length.toLocaleString()})...`,
          current: itemsProcessed,
          total: Math.max(1, totalItemsToSend),
          percent: Math.min(99, Math.round((itemsProcessed / Math.max(1, totalItemsToSend)) * 100)),
        });
      }
    } else if (compactedDiscoveries.length > 0) {
      onProgress?.({
        stage: `Discoveries in sync (${compactedDiscoveries.length.toLocaleString()} verified)`,
        current: itemsProcessed,
        total: Math.max(1, totalItemsToSend),
        percent: 65,
      });
    }

    // 4. Send Debris Harvests in chunks of 500
    const HARV_CHUNK_SIZE = 500;
    if (harvestsToSend.length > 0) {
      for (let i = 0; i < harvestsToSend.length; i += HARV_CHUNK_SIZE) {
        const chunk = harvestsToSend.slice(i, i + HARV_CHUNK_SIZE);
        await sendBatch({ harvests: chunk });
        itemsProcessed += chunk.length;
        onProgress?.({
          stage: `Uploading Debris Harvests (${(i + chunk.length).toLocaleString()} / ${harvestsToSend.length.toLocaleString()})...`,
          current: itemsProcessed,
          total: Math.max(1, totalItemsToSend),
          percent: Math.min(99, Math.round((itemsProcessed / Math.max(1, totalItemsToSend)) * 100)),
        });
      }
    } else if (compactedHarvests.length > 0) {
      onProgress?.({
        stage: `Debris Harvests in sync (${compactedHarvests.length.toLocaleString()} verified)`,
        current: itemsProcessed,
        total: Math.max(1, totalItemsToSend),
        percent: 80,
      });
    }

    // 5. Send Radar Targets (in chunks of 250) and Planner Queues
    const RADAR_CHUNK_SIZE = 250;
    if (radarToSend.length > 0) {
      for (let i = 0; i < radarToSend.length; i += RADAR_CHUNK_SIZE) {
        const radarChunk = radarToSend.slice(i, i + RADAR_CHUNK_SIZE);
        await sendBatch({
          radarTargets: radarChunk,
          plannerProjects: i === 0 ? plannerToSend : [],
        });
        itemsProcessed += radarChunk.length + (i === 0 ? plannerToSend.length : 0);
        onProgress?.({
          stage: `Merging Radar Targets (${(i + radarChunk.length).toLocaleString()} / ${radarToSend.length.toLocaleString()})...`,
          current: itemsProcessed,
          total: Math.max(1, totalItemsToSend),
          percent: Math.min(99, Math.round((itemsProcessed / Math.max(1, totalItemsToSend)) * 100)),
        });
      }
    } else if (plannerToSend.length > 0) {
      await sendBatch({
        plannerProjects: plannerToSend,
      });
      itemsProcessed += plannerToSend.length;
      onProgress?.({
        stage: 'Costs Planner Queues in sync',
        current: itemsProcessed,
        total: Math.max(1, totalItemsToSend),
        percent: 95,
      });
    } else if (compactedRadar.length > 0) {
      onProgress?.({
        stage: `Radar Targets in sync (${compactedRadar.length.toLocaleString()} verified)`,
        current: itemsProcessed,
        total: Math.max(1, totalItemsToSend),
        percent: 95,
      });
    }

    if (totalItemsToSend === 0) {
      // Empty sync handshake to update sync timestamp and credentials
      await sendBatch({});
    }

    onProgress?.({
      stage: 'Synchronization Complete',
      current: totalItemsToSend,
      total: Math.max(1, totalItemsToSend),
      percent: 100,
    });

    return {
      success: true,
      isDelta: isDeltaSyncActive,
      saved: {
        expeditions: expeditionsToSend.length,
        combats: combatsToSend.length,
        harvests: harvestsToSend.length,
        discoveries: discoveriesToSend.length,
        planner: plannerToSend.length,
        radar: radarToSend.length,
      },
      totalLocal: {
        expeditions: compactedExpeditions.length,
        combats: compactedCombats.length,
        harvests: compactedHarvests.length,
        discoveries: compactedDiscoveries.length,
        planner: compactedPlanner.length,
        radar: compactedRadar.length,
      },
      lastSentAt: Date.now(),
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send data to Personal Vault' };
  }
}

export interface VaultFetchResult {
  success: boolean;
  hydrated?: VaultTelemetryCounts;
  lastFetchedAt?: number;
  error?: string;
}

/**
 * Fetches the source of truth from Cloudflare Personal Vault and hydrates local Dexie.
 * Enforces:
 * 1. Non-destructive merge (never wipes local entries).
 * 2. Highest production MSU/hour rule for Raid Radar coordinates.
 * 3. Latest timestamp rule for scanned resource values.
 */
export async function fetchVaultDataToLocal(
  universe: string,
  playerId: string,
  vaultKey: string,
  onProgress?: (progress: VaultProgressUpdate) => void,
  options?: { forceFullDownload?: boolean }
): Promise<VaultFetchResult> {
  const baseUrl = await getOverwatchApiUrl();
  try {
    onProgress?.({ stage: 'Connecting to Cloudflare Personal Vault...', current: 0, total: 100, percent: 10 });
    const url = new URL(`${baseUrl}/api/v1/vault/fetch`);
    url.searchParams.set('universeId', universe);
    url.searchParams.set('playerId', playerId);
    url.searchParams.set('vaultKey', vaultKey);

    const pidStr = String(playerId || '').trim();
    const pidNum = Number(pidStr);
    const pidVariants: any[] = [pidStr];
    if (!isNaN(pidNum) && String(pidNum) === pidStr) {
      pidVariants.push(pidNum);
    }

    if (!options?.forceFullDownload) {
      // Fast delta query: inspect local latest timestamps accurately
      const getMaxTimestamp = async (table: any): Promise<number> => {
        try {
          const items = await table.where('playerId').anyOf(pidVariants).toArray();
          if (!items || items.length === 0) return 0;
          let max = 0;
          for (const item of items) {
            const t = Number(item.timestamp || 0);
            if (t > max) max = t;
          }
          return max;
        } catch {
          return 0;
        }
      };

      const [maxExp, maxCom, maxHarv, maxDisc] = await Promise.all([
        getMaxTimestamp(db.expeditions),
        getMaxTimestamp(db.combatReports),
        getMaxTimestamp(db.debrisHarvests),
        getMaxTimestamp(db.lifeformDiscoveries),
      ]);

      if (maxExp > 0) url.searchParams.set('sinceExpTimestamp', String(maxExp));
      if (maxCom > 0) url.searchParams.set('sinceComTimestamp', String(maxCom));
      if (maxHarv > 0) url.searchParams.set('sinceHarvTimestamp', String(maxHarv));
      if (maxDisc > 0) url.searchParams.set('sinceDiscTimestamp', String(maxDisc));
    } else {
      url.searchParams.set('forceFullDownload', '1');
      url.searchParams.set('isFullResync', '1');
    }

    const res = await fetchOverwatch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Nexus-Vault-Key': vaultKey,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: (err as any).error || `HTTP ${res.status}: ${res.statusText}` };
    }

    onProgress?.({ stage: 'Parsing cloud archive payload...', current: 20, total: 100, percent: 25 });
    const data = await res.json();
    let expeditions: Expedition[] = data.expeditions || [];
    const combats: CombatReport[] = data.combats || [];
    const harvests: DebrisHarvest[] = data.harvests || [];
    const discoveries: LifeformDiscovery[] = data.discoveries || [];
    const plannerProjects: TodoProject[] = data.plannerProjects || [];
    const incomingRadar: SpiedPlanet[] = data.radarTargets || [];

    // Helper to bulkPut in batches to avoid locking the IndexedDB thread
    const chunkedBulkPut = async <T>(table: any, items: T[], batchSize = 1000, label = 'records') => {
      for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        await table.bulkPut(chunk);
        await new Promise(resolve => setTimeout(resolve, 0)); // yield thread
      }
    };

    // Save standard append-only tables
    let totalExpHydrated = expeditions.length;
    if (expeditions.length > 0) {
      onProgress?.({ stage: `Downloading ${expeditions.length.toLocaleString()} Expeditions...`, current: 30, total: 100, percent: 40 });
      await chunkedBulkPut(db.expeditions, expeditions, 1000, 'expeditions');
    }

    // Handle cursor pagination for large initial expedition downloads
    let hasMoreExp = Boolean(data.hasMoreExpeditions);
    let nextExpTimestamp = data.nextExpTimestamp;

    while (hasMoreExp && nextExpTimestamp) {
      onProgress?.({
        stage: `Downloading additional Expeditions (${totalExpHydrated.toLocaleString()} archived)...`,
        current: totalExpHydrated,
        total: 100,
        percent: 45,
      });

      const nextUrl = new URL(`${baseUrl}/api/v1/vault/fetch`);
      nextUrl.searchParams.set('universeId', universe);
      nextUrl.searchParams.set('playerId', playerId);
      nextUrl.searchParams.set('vaultKey', vaultKey);
      nextUrl.searchParams.set('sinceExpTimestamp', String(nextExpTimestamp));
      nextUrl.searchParams.set('sinceComTimestamp', '9999999999999');
      nextUrl.searchParams.set('sinceHarvTimestamp', '9999999999999');
      nextUrl.searchParams.set('sinceDiscTimestamp', '9999999999999');

      const nextRes = await fetchOverwatch(nextUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'X-Nexus-Vault-Key': vaultKey },
      });
      if (!nextRes.ok) break;

      const nextData = await nextRes.json();
      const pageExp: Expedition[] = nextData.expeditions || [];
      if (pageExp.length === 0) break;

      await chunkedBulkPut(db.expeditions, pageExp, 1000, 'expeditions');
      totalExpHydrated += pageExp.length;
      hasMoreExp = Boolean(nextData.hasMoreExpeditions);
      nextExpTimestamp = nextData.nextExpTimestamp;
    }

    if (combats.length > 0) {
      onProgress?.({ stage: `Downloading ${combats.length.toLocaleString()} Combats...`, current: 50, total: 100, percent: 60 });
      await chunkedBulkPut(db.combatReports, combats, 1000, 'combats');
    }

    if (harvests.length > 0) {
      const cleanUni = cleanUniverseId(universe);
      const mappedHarvests: DebrisHarvest[] = harvests.map((h: any) => {
        const msgId = String(h.messageId || (h.harvestKey ? h.harvestKey.replace(/^.+?_/, '') : '') || `${h.coords}_${h.timestamp}`);
        return {
          harvestKey: `${cleanUni}_${msgId}`,
          messageId: msgId,
          playerId: String(playerId),
          universe: cleanUni,
          timestamp: Number(h.timestamp || Date.now()),
          coords: String(h.coords || ''),
          recycledResources: h.recycledResources || {
            metal: Number(h.metal || 0),
            crystal: Number(h.crystal || 0),
            deuterium: Number(h.deut || 0),
          },
          recyclerAmount: Number(h.recyclerAmount || 0),
          tracked: true,
        };
      });
      await chunkedBulkPut(db.debrisHarvests, mappedHarvests, 500, 'harvests');
    }

    if (discoveries.length > 0) {
      onProgress?.({ stage: `Downloading ${discoveries.length.toLocaleString()} Lifeform Discoveries...`, current: 70, total: 100, percent: 75 });
      await chunkedBulkPut(db.lifeformDiscoveries, discoveries, 1000, 'discoveries');
    }

    if (plannerProjects.length > 0) {
      const todoItems: TodoProject[] = [];
      const incomingCartItems: any[] = [];

      for (const p of plannerProjects) {
        if (String(p.projectKey).startsWith('cart_') || String(p.type).startsWith('cart:')) {
          // Reconstruct CartItem
          const parts = String(p.type).split(':');
          const category = parts[1] || 'Mines';
          const itemId = Number(parts[2] || 0);
          const currentLevel = Number(parts[3] || 0);
          const quantity = parts[4] ? Number(parts[4]) : undefined;
          const rawId = String(p.projectKey).replace(/^cart_/, '');
          let decodedId = rawId;
          try {
            decodedId = decodeURIComponent(rawId);
          } catch {
            decodedId = rawId;
          }

          incomingCartItems.push({
            id: decodedId || `${p.planetId || 'global'}_${category}_${p.name}`,
            planetId: p.planetId || '',
            planetName: p.planetName || '',
            coords: p.coords || '',
            category,
            itemId,
            itemName: p.name,
            currentLevel,
            targetLevel: p.targetLevel || 1,
            quantity,
            cost: {
              metal: Number(p.cost?.metal || 0),
              crystal: Number(p.cost?.crystal || 0),
              deuterium: Number(p.cost?.deuterium || 0),
            },
          });
        } else {
          todoItems.push(p);
        }
      }

      // Restore TodoProjects
      for (const p of todoItems) {
        const existing = await db.todoProjects.where('projectKey').equals(p.projectKey).first();
        if (existing) {
          await db.todoProjects.update(existing.id!, {
            name: p.name,
            type: p.type,
            targetLevel: p.targetLevel,
            planetId: p.planetId,
            planetName: p.planetName,
            coords: p.coords,
            cost: p.cost,
            msuCost: p.msuCost,
            prodDelta: p.prodDelta,
            roiHours: p.roiHours,
            timestamp: p.timestamp,
          });
        } else {
          await db.todoProjects.add(p);
        }
      }

      // Restore Costs Planner Cart items into db.settings
      if (incomingCartItems.length > 0) {
        const pidStr = String(playerId || '').trim();
        const cartKey = 'costs_planner_cart_' + pidStr;
        const currentSetting = await db.settings.get(cartKey);
        const existingCart: any[] = Array.isArray((currentSetting as any)?.cartItems)
          ? (currentSetting as any).cartItems
          : [];

        const mergedCart = [...existingCart];
        for (const inc of incomingCartItems) {
          const matchIdx = mergedCart.findIndex(c =>
            c.id === inc.id ||
            (c.category === inc.category && c.planetId === inc.planetId && c.itemName === inc.itemName)
          );
          if (matchIdx >= 0) {
            mergedCart[matchIdx] = {
              ...mergedCart[matchIdx],
              ...inc,
            };
          } else {
            mergedCart.push(inc);
          }
        }

        await db.settings.put({
          id: cartKey,
          cartItems: mergedCart,
        } as any);
      }
    }

    // Hydrate Raid Radar with smart highest-production resolution using bulkPut
    onProgress?.({ stage: 'Merging Raid Radar Targets...', current: 85, total: 100, percent: 85 });
    let radarUpdatedCount = 0;
    const allLocalRadar = await db.spiedPlanets.toArray();
    const existingLocalRadar = allLocalRadar.filter(p => isSameUniverse(p.universe, universe));
    const localRadarMap = new Map<string, SpiedPlanet>();
    for (const r of existingLocalRadar) {
      if (r.coords) {
        localRadarMap.set(r.coords, r);
      }
    }

    const cleanUni = cleanUniverseId(universe);
    const resolvedRadarPlanets: SpiedPlanet[] = [];
    const obsoleteRadarKeys: string[] = [];

    for (const incoming of incomingRadar) {
      if (!incoming.coords) continue;
      const targetPlanetKey = incoming.planetKey && incoming.planetKey.startsWith(`${cleanUni}_`)
        ? incoming.planetKey
        : `${cleanUni}_${incoming.planetId || incoming.coords}`;

      const incomingNormalized: SpiedPlanet = {
        ...incoming,
        universe: cleanUni,
        planetKey: targetPlanetKey,
      };

      const local = localRadarMap.get(incoming.coords);

      if (!local) {
        resolvedRadarPlanets.push(incomingNormalized);
        radarUpdatedCount++;
      } else {
        const incomingMsuPerHour = (incoming.metalPerHour || 0) + 1.5 * (incoming.crystalPerHour || 0) + 3.0 * (incoming.deuteriumPerHour || 0);
        const localMsuPerHour = (local.metalPerHour || 0) + 1.5 * (local.crystalPerHour || 0) + 3.0 * (local.deuteriumPerHour || 0);

        const takeIncomingProduction = incomingMsuPerHour > localMsuPerHour;
        const resolvedMetalPerHour = takeIncomingProduction ? incoming.metalPerHour : local.metalPerHour;
        const resolvedCrystalPerHour = takeIncomingProduction ? incoming.crystalPerHour : local.crystalPerHour;
        const resolvedDeutPerHour = takeIncomingProduction ? incoming.deuteriumPerHour : local.deuteriumPerHour;

        const takeIncomingResources = (incoming.lastSpiedTimestamp || 0) >= (local.lastSpiedTimestamp || 0);
        const resolvedSpiedMetal = takeIncomingResources ? incoming.lastSpiedMetal : local.lastSpiedMetal;
        const resolvedSpiedCrystal = takeIncomingResources ? incoming.lastSpiedCrystal : local.lastSpiedCrystal;
        const resolvedSpiedDeut = takeIncomingResources ? incoming.lastSpiedDeuterium : local.lastSpiedDeuterium;
        const resolvedTimestamp = takeIncomingResources ? incoming.lastSpiedTimestamp : local.lastSpiedTimestamp;
        const resolvedHashCode = takeIncomingResources ? (incoming.lastHashCode || local.lastHashCode) : local.lastHashCode;
        const resolvedLootPct = takeIncomingResources ? (incoming.lootPercentage || local.lootPercentage) : local.lootPercentage;

        const resolvedMetalCap = (incoming.metalCapacity && incoming.metalCapacity > 0) ? incoming.metalCapacity : local.metalCapacity;
        const resolvedCrystalCap = (incoming.crystalCapacity && incoming.crystalCapacity > 0) ? incoming.crystalCapacity : local.crystalCapacity;
        const resolvedDeutCap = (incoming.deuteriumCapacity && incoming.deuteriumCapacity > 0) ? incoming.deuteriumCapacity : local.deuteriumCapacity;

        if (local.planetKey && local.planetKey !== targetPlanetKey) {
          obsoleteRadarKeys.push(local.planetKey);
        }

        resolvedRadarPlanets.push({
          ...local,
          planetKey: targetPlanetKey,
          universe: cleanUni,
          metalPerHour: resolvedMetalPerHour,
          crystalPerHour: resolvedCrystalPerHour,
          deuteriumPerHour: resolvedDeutPerHour,
          lastSpiedMetal: resolvedSpiedMetal,
          lastSpiedCrystal: resolvedSpiedCrystal,
          lastSpiedDeuterium: resolvedSpiedDeut,
          lastSpiedTimestamp: resolvedTimestamp,
          lastHashCode: resolvedHashCode,
          lootPercentage: resolvedLootPct,
          metalCapacity: resolvedMetalCap,
          crystalCapacity: resolvedCrystalCap,
          deuteriumCapacity: resolvedDeutCap,
          spyCount: Math.max(local.spyCount || 0, incoming.spyCount || 0),
          confidence: Math.max(local.confidence || 0, incoming.confidence || 0),
          playerName: incoming.playerName || local.playerName,
          playerStatus: (incoming.playerStatus && incoming.playerStatus.length > 0) ? incoming.playerStatus : local.playerStatus,
        });
        radarUpdatedCount++;
      }
    }

    if (obsoleteRadarKeys.length > 0) {
      await db.spiedPlanets.bulkDelete(obsoleteRadarKeys);
    }
    if (resolvedRadarPlanets.length > 0) {
      await chunkedBulkPut(db.spiedPlanets, resolvedRadarPlanets, 500, 'radar');
    }

    onProgress?.({ stage: 'Download Complete', current: 100, total: 100, percent: 100 });

    return {
      success: true,
      hydrated: {
        expeditions: totalExpHydrated,
        combats: combats.length,
        harvests: harvests.length,
        discoveries: discoveries.length,
        planner: plannerProjects.length,
        radar: radarUpdatedCount,
      },
      lastFetchedAt: data.lastFetchedAt || Date.now(),
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to download data from Personal Vault' };
  }
}
