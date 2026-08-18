import { Planet, Account, ImportExportInfo, Expedition, ActiveResearchInfo } from '../../db';
import { AssistantNotification, AssistantSettings, SnoozeRecord, DiscoveredDebrisField } from './types';
import { getStoredImportExportInfo } from './importExport';
import { getPlanetTechMultiplier, rankAmortizationItems, AmortizationType, DEFAULT_RATES, formatROI, getItemIcon } from '../../utils/amortizationCalc';
import { getStoredFleetMovements, countActiveMissions, FleetMovementsData } from '../fleetMovement';
import { SHIP_DATA } from '../../db/staticData';
import { getProductionBoosters } from '../../utils/items';
import { getStoredPlayerInventory } from '../inventory';
import { getStoredProductionQueue } from '../productionQueue';

const DEFAULT_SETTINGS: AssistantSettings = {
  enabled: true,
  snoozedRules: {},
  thresholds: {
    storageOverflowHours: 3,
    minFleetSaveMsu: 1000000,
    minFleetSaveShips: 20,
    officerExpiryHours: 12,
    minDebrisMsu: 1000000,
    artifactsWarningThreshold: 3000,
    maxExpoDepletionPct: 10
  }
};

// --- Snooze Management ---

export async function getAssistantSettings(): Promise<AssistantSettings> {
  try {
    const data = await chrome.storage.local.get(['nexus_assistant_settings', 'globalSettings']);
    let enabled = true;
    if (data?.nexus_assistant_settings?.enabled !== undefined) {
      enabled = data.nexus_assistant_settings.enabled !== false;
    } else if (data?.globalSettings?.enableNexusOverseer !== undefined) {
      enabled = data.globalSettings.enableNexusOverseer !== false;
    }

    if (data && data.nexus_assistant_settings) {
      return {
        ...DEFAULT_SETTINGS,
        ...data.nexus_assistant_settings,
        enabled,
        thresholds: {
          ...DEFAULT_SETTINGS.thresholds,
          ...(data.nexus_assistant_settings.thresholds || {})
        }
      };
    } else {
      return {
        ...DEFAULT_SETTINGS,
        enabled
      };
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.error('OGame Nexus: Error reading assistant settings', e);
    }
  }
  return DEFAULT_SETTINGS;
}

export async function saveAssistantSettings(settings: AssistantSettings): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ 'nexus_assistant_settings': settings });
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.error('OGame Nexus: Error saving assistant settings', e);
    }
  }
}

export async function snoozeNotification(
  target: AssistantNotification | string,
  type: 'forever' | 'until',
  hours = 24
): Promise<void> {
  const settings = await getAssistantSettings();
  const id = typeof target === 'string' ? target : target.id;
  const record: SnoozeRecord = {
    type,
    untilTimestamp: type === 'until' ? Date.now() + hours * 3600 * 1000 : undefined,
    snoozedAt: Date.now(),
    title: typeof target === 'object' ? target.title : undefined,
    icon: typeof target === 'object' ? target.icon : undefined,
    planetName: typeof target === 'object' ? target.planetName : undefined,
    planetImgUrl: typeof target === 'object' ? target.planetImgUrl : undefined,
    coords: typeof target === 'object' ? target.coords : undefined,
    ruleId: typeof target === 'object' ? target.ruleId : undefined
  };
  settings.snoozedRules[id] = record;
  await saveAssistantSettings(settings);
}

export function formatFriendlyRuleName(id: string, record?: SnoozeRecord): { title: string; icon: string; coords?: string; planetName?: string; planetImgUrl?: string } {
  if (record && record.title) {
    return {
      title: record.title,
      icon: record.icon || '🛡️',
      coords: record.coords,
      planetName: record.planetName,
      planetImgUrl: record.planetImgUrl
    };
  }

  // Fallback parsing for legacy snoozed IDs
  if (id.startsWith('energy_deficit_')) {
    return { title: 'Energy Deficit Alert', icon: '⚡' };
  }
  if (id.startsWith('storage_overflow_')) {
    const parts = id.split('_');
    const resKey = parts[3];
    let icon = 'icons/resources/metal_storage_large.jpg';
    if (resKey === 'crystal') icon = 'icons/resources/crystal_storage_large.jpg';
    if (resKey === 'deuterium') icon = 'icons/resources/deuterium_storage_large.jpg';
    const res = resKey ? `${resKey.charAt(0).toUpperCase() + resKey.slice(1)} Storage Alert` : 'Storage Alert';
    return { title: res, icon };
  }
  if (id === 'fleet_save_reminder') {
    return { title: 'Fleet Save Reminder', icon: '🔔' };
  }
  if (id === 'officer_geologist_inactive') {
    return { title: 'Geologist Officer Alert', icon: '⚠️' };
  }
  if (id === 'idle_expedition_slots') {
    return { title: 'Idle Expedition Slots', icon: '🧭' };
  }
  if (id === 'today_expedition_yield_summary') {
    return { title: "Expedition Yield Summary", icon: '📊' };
  }
  if (id === 'top_expedition_find_today') {
    return { title: 'Top Expedition Find Today', icon: '✨' };
  }
  if (id === 'expedition_depletion_warning' || id === 'expedition_depletion') {
    return { title: 'Expedition System Depletion Warning', icon: '🧭' };
  }
  if (id.startsWith('crawler_deficit_') || id === 'crawler_deficit') {
    return { title: 'Crawler Saturation Shortage', icon: 'icons/ships/crawler-large.jpg' };
  }

  return { title: id.replace(/_/g, ' ').toUpperCase(), icon: '🛡️' };
}

export async function unsnoozeNotification(id: string): Promise<void> {
  const settings = await getAssistantSettings();
  delete settings.snoozedRules[id];
  await saveAssistantSettings(settings);
}

export function isNotificationSnoozed(id: string, settings: AssistantSettings): boolean {
  const record = settings.snoozedRules[id];
  if (!record) return false;
  if (record.type === 'forever') return true;
  if (record.type === 'until' && record.untilTimestamp) {
    if (Date.now() < record.untilTimestamp) {
      return true;
    }
  }
  return false;
}

// --- Helpers ---

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
  return Math.floor(num).toLocaleString();
}

function formatHoursToTime(hours: number): string {
  if (hours <= 0) return 'NOW (Full)';
  const totalMinutes = Math.floor(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatDurationLabel(hours: number): string {
  if (hours <= 0) return 'Expired';
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = Math.round(hours % 24);
    return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
  }
  return formatHoursToTime(hours);
}

// --- Background Data Fetcher Bridge ---

function fetchAssistantData(playerId: string): Promise<{ planets: Planet[]; account: Account | undefined; todayExpeditions: any[] }> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: "GET_ASSISTANT_DATA", playerId }, (res) => {
          if (chrome.runtime.lastError) {
            const err = chrome.runtime.lastError;
            const msg = err?.message || '';
            if (!msg.includes('Extension context invalidated') && !msg.includes('Receiving end does not exist')) {
              console.warn('OGame Nexus Overseer: Message error fetching data', err);
            }
            resolve({ planets: [], account: undefined, todayExpeditions: [] });
            return;
          }
          if (res && res.success) {
            resolve({ planets: res.planets || [], account: res.account, todayExpeditions: res.todayExpeditions || [] });
          } else {
            resolve({ planets: [], account: undefined, todayExpeditions: [] });
          }
        });
      } catch (e: any) {
        if (!e?.message?.includes('Extension context invalidated')) {
          console.warn('OGame Nexus Overseer: Extension context error', e);
        }
        resolve({ planets: [], account: undefined, todayExpeditions: [] });
      }
    } else {
      resolve({ planets: [], account: undefined, todayExpeditions: [] });
    }
  });
}

// --- Rules Evaluator Pipeline ---

export async function evaluateAllNotifications(playerId: string): Promise<AssistantNotification[]> {
  const settings = await getAssistantSettings();
  const { planets, account, todayExpeditions } = await fetchAssistantData(playerId);

  const effectiveAccount: Account = account || {
    playerId: playerId || 'unknown',
    playerName: 'Commander',
    universe: '',
    universeName: '',
    serverUrl: '',
    lastSeen: Date.now()
  };

  const notifications: AssistantNotification[] = [];

  // ==========================================
  // CATEGORY: 🚨 CRITICAL WARNINGS
  // ==========================================

  // 1. Energy Deficits on Planets
  const energyNotes = evaluateEnergyDeficit(planets, settings);
  notifications.push(...energyNotes);

  // 2. Storage Capacity Alerts
  const storageNotes = evaluateStorageOverflow(planets, effectiveAccount, settings);
  notifications.push(...storageNotes);

  // 3. Expired Officer Alerts
  const officerNotes = evaluateOfficers(effectiveAccount, planets, settings);
  notifications.push(...officerNotes);

  // 4. Idle Expedition Slots Warning (calculated from live fleetMovements storage)
  const fleetMovements = await getStoredFleetMovements();
  const expeditionSlotNotes = evaluateExpeditionSlots(effectiveAccount, planets, settings, fleetMovements);
  notifications.push(...expeditionSlotNotes);

  // 5. Lifeform Artefact Storage Limit Alerts (>= 3000 almost full, >= 3600 full)
  const artifactNotes = await evaluateArtifacts(effectiveAccount, settings);
  notifications.push(...artifactNotes);

  // 6. Expedition System Depletion Warning (past 4 hours > 10% non-pristine)
  const expoDepletionNotes = evaluateExpeditionDepletion(todayExpeditions, settings);
  notifications.push(...expoDepletionNotes);

  // ==========================================
  // CATEGORY: ⏳ LOGISTICS
  // ==========================================

  // Crawler Saturation Deficit on Planets
  const crawlerNotes = evaluateCrawlerDeficit(planets, effectiveAccount, settings);
  notifications.push(...crawlerNotes);

  // ==========================================
  // CATEGORY: 🔔 REMINDERS
  // ==========================================

  // 1. Idle Empire Research Lab
  const idleResearchNotes = await evaluateIdleResearch(effectiveAccount, planets, settings);
  notifications.push(...idleResearchNotes);

  // 2. Fleet Save Reminder (Single empire-wide alert)
  const fleetSaveNotes = evaluateFleetSave(planets, settings);
  notifications.push(...fleetSaveNotes);

  // ==========================================
  // CATEGORY: 📦 TRADER & INTEL
  // ==========================================

  // Daily Import/Export Container
  const importExportNotes = await evaluateImportExport(effectiveAccount, settings);
  notifications.push(...importExportNotes);

  // Optimal Amortization Upgrade Recommendation
  const amortizationNotes = evaluateAmortization(planets, effectiveAccount, settings);
  notifications.push(...amortizationNotes);

  // Galaxy Debris Field Opportunities (scanned via Galaxy view)
  const debrisNotes = await evaluateDebrisOpportunities(settings);
  notifications.push(...debrisNotes);

  // Today's Expedition Yield Summary (Intel)
  const todayExpoNotes = evaluateTodayExpeditionYield(todayExpeditions, settings);
  notifications.push(...todayExpoNotes);

  // Top 3 Expedition Finds Today (Intel)
  const topFindNotes = evaluateTopExpeditionFinds(todayExpeditions, settings);
  notifications.push(...topFindNotes);

  // Production Booster Gap Advisor (Matches stored inventory boosters with highest-level unboosted mines)
  const boosterGapNotes = await evaluateProductionBoosterGaps(planets, effectiveAccount, settings);
  notifications.push(...boosterGapNotes);

  // Filter out any snoozed / muted notifications
  const activeNotifications = notifications.filter(n => !isNotificationSnoozed(n.id, settings));

  // Sort: Danger (Critical) first, then Warning, then Info, then Success
  const severityOrder: Record<string, number> = { danger: 0, warning: 1, info: 2, success: 3 };
  activeNotifications.sort((a, b) => {
    const diff = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
    if (diff !== 0) return diff;
    return b.timestamp - a.timestamp;
  });

  return activeNotifications;
}

// ==========================================================================
// RULE 1: Fleet Save Reminder (Single Global Empire-wide Alert)
// ==========================================================================
interface TopFleetLocation {
  id: string;
  name: string;
  coords?: string;
  msu: number;
  ships: number;
  imgUrl?: string;
}

function evaluateFleetSave(planets: Planet[], settings: AssistantSettings): AssistantNotification[] {
  const minMsu = settings.thresholds.minFleetSaveMsu || 1000000;
  const minShips = settings.thresholds.minFleetSaveShips || 20;

  let totalExposedShips = 0;
  let totalExposedMsu = 0;
  let exposedLocationsCount = 0;
  let topLocation: TopFleetLocation | null = null;

  for (const p of planets) {
    let shipsOnPlanet = 0;
    if (p.ships && typeof p.ships === 'object') {
      Object.entries(p.ships).forEach(([shipId, count]) => {
        const id = parseInt(shipId, 10);
        // Exclude solar satellites (212) and crawlers (217)
        if (id !== 212 && id !== 217 && count > 0) {
          shipsOnPlanet += Number(count);
        }
      });
    }

    const metal = Number(p.metal || 0);
    const crystal = Number(p.crystal || 0);
    const deut = Number(p.deuterium || 0);
    const resMsu = metal + crystal * 1.5 + deut * 3;

    if (shipsOnPlanet >= minShips || resMsu >= minMsu) {
      totalExposedShips += shipsOnPlanet;
      totalExposedMsu += resMsu;
      exposedLocationsCount++;

      const loc: TopFleetLocation = {
        id: p.id,
        name: p.name || (p.type === 'moon' ? 'Moon' : 'Planet'),
        coords: p.coords,
        msu: resMsu,
        ships: shipsOnPlanet,
        imgUrl: p.imgUrl
      };

      if (!topLocation || resMsu > topLocation.msu || (resMsu === topLocation.msu && shipsOnPlanet > topLocation.ships)) {
        topLocation = loc;
      }
    }
  }

  if (exposedLocationsCount === 0) return [];

  const topLocText = topLocation ? `${topLocation.name} [${topLocation.coords}]` : 'your colonies';

  return [{
    id: 'fleet_save_reminder',
    ruleId: 'fleet_save',
    category: 'reminder',
    severity: 'warning',
    icon: '🔔',
    iconTooltip: 'Fleet Movement & Safety Reminder',
    badgeText: 'REMINDER',
    title: 'Fleet Save Reminder',
    message: `Don't forget to fleet save! You have ${formatNumber(totalExposedShips)} stationary ships and ${formatNumber(totalExposedMsu)} MSU sitting exposed across ${exposedLocationsCount} location(s) (highest at ${topLocText}). Dispatch your assets safely before logging off!`,
    shortMessage: 'Fleet Save!',
    timestamp: Date.now(),
    planetId: topLocation?.id,
    planetName: topLocation?.name,
    planetImgUrl: topLocation?.imgUrl,
    coords: topLocation?.coords,
    actionLabel: 'Fleet Dispatch',
    actionUrl: `/game/index.php?page=ingame&component=fleetdispatch${topLocation ? `&cp=${topLocation.id}` : ''}`,
    meta: { totalExposedShips, totalExposedMsu, exposedLocationsCount, topLocation }
  }];
}

// ==========================================================================
// RULE 2: Energy Deficit on Planets
// ==========================================================================
function evaluateEnergyDeficit(planets: Planet[], settings: AssistantSettings): AssistantNotification[] {
  const results: AssistantNotification[] = [];

  planets.forEach(p => {
    // Only planets have solar production / energy deficits (moons don't produce mine energy)
    if (p.type === 'moon') return;

    const rawEnergy = p.energy !== undefined && p.energy !== null
      ? p.energy
      : (p.resources?.energy !== undefined && p.resources?.energy !== null ? p.resources.energy : 0);
    const energyVal = Number(rawEnergy);

    if (energyVal < 0) {
      const deficit = Math.abs(energyVal);
      const pName = p.name || 'Planet';
      const tempMax = Number(p.tempMax !== undefined && p.tempMax !== null && !isNaN(Number(p.tempMax)) ? p.tempMax : 30);
      const satEnergy = Math.max(1, Math.floor((tempMax + 140) / 6));
      const satCount = Math.ceil(deficit / satEnergy);
      const id = `energy_deficit_${p.id}`;

      results.push({
        id,
        ruleId: 'energy_deficit',
        category: 'critical',
        severity: deficit >= 1000 ? 'danger' : 'warning',
        icon: '⚡',
        iconTooltip: 'Energy Deficit & Solar Grid',
        badgeText: 'WARNING',
        title: `Energy Deficit on ${pName} [${p.coords}]`,
        message: `⚡ Energy Deficit: ${pName} [${p.coords}] has -${formatNumber(deficit)} negative energy, impacting the production rate of the planet. Build Solar Satellites / Fusion Reactors / Solar Plants or adjust Mine output percentages to restore full production balance!`,
        shortMessage: `${pName} has negative energy!`,
        timestamp: Date.now(),
        planetId: p.id,
        planetName: pName,
        planetImgUrl: p.imgUrl,
        coords: p.coords,
        actionLabel: 'Fix Energy',
        actionUrl: `/game/index.php?page=ingame&component=supplies&cp=${p.id}`,
        meta: { deficit, satCount, satEnergy }
      });
    }
  });

  return results;
}

function calculateStorageCapacity(level: number, hasTraderAlliance?: boolean): number {
  const lvl = Math.max(0, level || 0);
  const baseCapacity = 5000 * Math.floor(2.5 * Math.exp((20 / 33) * lvl));
  if (hasTraderAlliance && lvl > 0) {
    return Math.floor(baseCapacity * 1.10);
  }
  return baseCapacity;
}

// ==========================================================================
// RULE 3: Storage Capacity Overflow Alert
// ==========================================================================
function evaluateStorageOverflow(planets: Planet[], account: Account, settings: AssistantSettings): AssistantNotification[] {
  const results: AssistantNotification[] = [];
  const overflowThresholdHours = settings.thresholds.storageOverflowHours || 3;
  const hasTraderAlliance = account.allianceClass === 2 || account.allianceClass === 1;

  const getPlanetCap = (storedCap?: number, level?: number) => {
    if (level !== undefined && level > 0) {
      return calculateStorageCapacity(level, hasTraderAlliance);
    }
    if (storedCap !== undefined && storedCap > 0) {
      return storedCap;
    }
    return 100000;
  };

  // Find optimal target planet with lowest fullness for suggestions
  const planetFillScores = planets
    .filter(pl => pl.type === 'planet')
    .map(pl => {
      const mCap = getPlanetCap(pl.metalCapacity, pl.metalStorage);
      const cCap = getPlanetCap(pl.crystalCapacity, pl.crystalStorage);
      const dCap = getPlanetCap(pl.deuteriumCapacity, pl.deuteriumStorage);
      const mRatio = mCap ? (pl.metal || 0) / mCap : 0;
      const cRatio = cCap ? (pl.crystal || 0) / cCap : 0;
      const dRatio = dCap ? (pl.deuterium || 0) / dCap : 0;
      return { planet: pl, avgFill: (mRatio + cRatio + dRatio) / 3 };
    })
    .sort((a, b) => a.avgFill - b.avgFill);

  planets.forEach(p => {
    // Only check storage overflow on planets (skip moons)
    if (p.type === 'moon') return;

    const pName = p.name || 'Planet';
    const metalCap = getPlanetCap(p.metalCapacity, p.metalStorage);
    const crystalCap = getPlanetCap(p.crystalCapacity, p.crystalStorage);
    const deutCap = getPlanetCap(p.deuteriumCapacity, p.deuteriumStorage);

    const resources = [
      { key: 'metal', name: 'Metal', current: Number(p.metal || 0), cap: metalCap, prod: Number(p.production?.metal || 0) },
      { key: 'crystal', name: 'Crystal', current: Number(p.crystal || 0), cap: crystalCap, prod: Number(p.production?.crystal || 0) },
      { key: 'deuterium', name: 'Deuterium', current: Number(p.deuterium || 0), cap: deutCap, prod: Number(p.production?.deuterium || 0) }
    ];

    resources.forEach(res => {
      if (res.cap <= 0 || res.prod <= 0) return;

      const remainingCap = res.cap - res.current;
      const hoursToOverflow = remainingCap <= 0 ? 0 : remainingCap / res.prod;

      if (hoursToOverflow <= overflowThresholdHours) {
        const id = `storage_overflow_${p.id}_${res.key}`;
        const isFull = hoursToOverflow <= 0;
        const timeStr = formatHoursToTime(hoursToOverflow);
        const severity = isFull || hoursToOverflow <= 1 ? 'danger' : 'warning';

        let storageIcon = 'icons/resources/metal_storage_large.jpg';
        let storageTooltip = 'Metal Storage';
        if (res.key === 'crystal') {
          storageIcon = 'icons/resources/crystal_storage_large.jpg';
          storageTooltip = 'Crystal Storage';
        } else if (res.key === 'deuterium') {
          storageIcon = 'icons/resources/deuterium_storage_large.jpg';
          storageTooltip = 'Deuterium Tank';
        }

        results.push({
          id,
          ruleId: 'storage_overflow',
          category: 'logistics',
          severity,
          icon: storageIcon,
          iconTooltip: storageTooltip,
          badgeText: 'LOGISTICS',
          title: `Storage Alert: ${res.name} on ${pName}`,
          message: `${res.name} storage on ${pName} [${p.coords}] ${isFull ? 'is completely FULL and production is blocked!' : `will overflow in ${timeStr}.`} Consider spending/transporting resources or building more storage.`,
          shortMessage: isFull ? `${res.name} storage full on ${pName}!` : `${res.name} storage overflow on ${pName}!`,
          timestamp: Date.now(),
          planetId: p.id,
          planetName: pName,
          planetImgUrl: p.imgUrl,
          coords: p.coords,
          actionLabel: `Go to Planet`,
          actionUrl: `/game/index.php?page=ingame&component=overview&cp=${p.id}`,
          meta: { resource: res.key, hoursToOverflow, current: res.current, cap: res.cap }
        });
      }
    });
  });

  return results;
}

// ==========================================================================
// RULE 4: Officer Expiration Alert (<= 12h) & Inactive Geologist
// ==========================================================================
function evaluateOfficers(account: Account, planets: Planet[], settings: AssistantSettings): AssistantNotification[] {
  const results: AssistantNotification[] = [];

  // 1. Check for officers expiring in less than 12 hours
  const officers = account.officersDetails || {};
  const expiringOfficers: { name: string; hoursRemaining: number; label: string }[] = [];
  const thresholdHours = settings.thresholds.officerExpiryHours || 12;

  const officerDefs: { key: string; name: string; hasFlag?: boolean }[] = [
    { key: 'commander', name: 'Commander', hasFlag: account.hasCommander },
    { key: 'admiral', name: 'Admiral', hasFlag: account.hasAdmiral },
    { key: 'engineer', name: 'Engineer', hasFlag: account.hasEngineer },
    { key: 'geologist', name: 'Geologist', hasFlag: account.hasGeologist },
    { key: 'technocrat', name: 'Technocrat', hasFlag: account.hasTechnocrat }
  ];

  officerDefs.forEach(off => {
    const detail = officers[off.key];
    const isActive = detail ? detail.active : off.hasFlag;
    if (isActive && detail && typeof detail.hoursRemaining === 'number') {
      if (detail.hoursRemaining > 0 && detail.hoursRemaining <= thresholdHours) {
        const timeLabel = formatDurationLabel(detail.hoursRemaining);
        expiringOfficers.push({
          name: off.name,
          hoursRemaining: detail.hoursRemaining,
          label: `${off.name} (${timeLabel})`
        });
      }
    }
  });

  if (expiringOfficers.length > 0) {
    const minHours = Math.min(...expiringOfficers.map(o => o.hoursRemaining));
    const minTimeStr = formatDurationLabel(minHours);
    const namesList = expiringOfficers.map(o => o.name).join(', ');
    const labelsList = expiringOfficers.map(o => o.label).join(', ');

    results.push({
      id: 'officers_expiring_soon',
      ruleId: 'officer_expiring',
      category: 'critical',
      severity: 'warning',
      icon: '⏱️',
      iconTooltip: 'Officers Mess & Automation Expiry',
      badgeText: 'WARNING',
      title: expiringOfficers.length === 1 ? `${expiringOfficers[0].name} Expiring Soon` : `${expiringOfficers.length} Officers Expiring Soon`,
      message: `⏱️ Officer Alert: ${labelsList} will expire in less than ${thresholdHours} hours! Renew in the Officer's Mess to maintain queue automation, resource boosters, and fleet capacities.`,
      shortMessage: expiringOfficers.length === 1 ? `${expiringOfficers[0].name} expires in ${minTimeStr}!` : `${namesList} expire in <${thresholdHours}h!`,
      timestamp: Date.now(),
      actionLabel: "Officer's Mess",
      actionUrl: `/game/index.php?page=ingame&component=officersmess`,
      meta: { expiringOfficers, minHours, thresholdHours }
    });
  }

  // 2. Inactive Geologist lost booster check
  let dailyBaseMsu = 0;
  planets.forEach(p => {
    if (p.type === 'planet') {
      const metalProd = Number(p.production?.metal || 0);
      const crystalProd = Number(p.production?.crystal || 0);
      const deutProd = Number(p.production?.deuterium || 0);
      dailyBaseMsu += (metalProd + crystalProd * 1.5 + deutProd * 3) * 24;
    }
  });

  const hasGeologist = account.hasGeologist === true;
  if (!hasGeologist && dailyBaseMsu > 0) {
    const lostDailyMsu = Math.round(dailyBaseMsu * 0.10); // 10% lost booster output
    const id = 'officer_geologist_inactive';

    results.push({
      id,
      ruleId: 'officer_alert',
      category: 'critical',
      severity: 'warning',
      icon: '⚠️',
      iconTooltip: 'Geologist Officer Inactive (+10% Mine Boost Missing)',
      badgeText: 'WARNING',
      title: 'Geologist Officer Inactive',
      message: `⚠️ Geologist Expired: Your active +10% mine booster is inactive. Daily empire production dropped by -${formatNumber(lostDailyMsu)} MSU. Renew Geologist to immediately unlock the +10% production boost across all planets!`,
      shortMessage: 'Geologist Officer Expired!',
      timestamp: Date.now(),
      actionLabel: 'Renew Geologist',
      actionUrl: `/game/index.php?page=ingame&component=officersmess`,
      meta: { lostDailyMsu }
    });
  }

  return results;
}

// ==========================================================================
// RULE 5: Empty / Idle Expedition Slots Alert
// ==========================================================================
function evaluateExpeditionSlots(
  account: Account,
  planets: Planet[],
  settings: AssistantSettings,
  fleetMovements?: FleetMovementsData | null
): AssistantNotification[] {
  const results: AssistantNotification[] = [];

  // 1. Base slots from Astrophysics (Tech 124): floor(sqrt(level))
  const astroLevel = account.researches?.find(r => r.id === 124)?.level || 0;
  const baseAstroSlots = Math.floor(Math.sqrt(astroLevel));

  // 2. Discoverer class bonus (+2 base) + Kaelesh T18 Discoverer Enhancement (Tech 14218 / 72)
  const isDiscoverer = Number(account.playerClass) === 3;
  let totalDiscovererEnhancementPercent = 0;

  planets.forEach(p => {
    if (p.type === 'planet') {
      const techMult = getPlanetTechMultiplier(p, account);
      let level = 0;
      if (Array.isArray(p.lifeformSetup)) {
        const item = p.lifeformSetup.find(x => x.selectedTechId === 72 || x.selectedTechId === 14218);
        if (item) level = Number(item.level || 0);
      }
      if (level > 0) {
        // Base 0.2% per level scaled by planet tech multiplier
        totalDiscovererEnhancementPercent += level * 0.2 * (techMult || 1.0);
      }
    }
  });

  // Calculate Discoverer slots: +2 base, and if T18 is >= 50% then 3, >= 100% then 4, etc.
  const discovererSlots = isDiscoverer ? (2 + Math.floor(totalDiscovererEnhancementPercent / 50)) : 0;

  // 3. Admiral bonus (+1 slot)
  const admiralSlots = account.hasAdmiral ? 1 : 0;

  // 4. Active slot boosters from active items (Bronze: +1, Silver: +2, Gold: +3, Platinum: +4) - Tiers Stack!
  const activeTiers = new Set<string>();
  let explicitBonus = 0;
  const allItems = [
    ...(Array.isArray(account.activeItems) ? account.activeItems : []),
    ...planets.flatMap(p => Array.isArray(p.activeItems) ? p.activeItems : [])
  ];
  const now = Date.now();
  allItems.forEach(item => {
    if (item.expiryTimestamp && item.expiryTimestamp <= now) return;
    const titleLow = (item.title || item.name || '').toLowerCase();
    const typeLow = (item.type || '').toLowerCase();
    const rarityLow = (item.rarity || '').toLowerCase();
    if (titleLow.includes('expedition slot') || typeLow === 'expedition_slots') {
      if (titleLow.includes('platinum') || rarityLow === 'epic') {
        activeTiers.add('platinum');
      } else if (titleLow.includes('gold') || rarityLow === 'rare') {
        activeTiers.add('gold');
      } else if (titleLow.includes('silver') || rarityLow === 'uncommon') {
        activeTiers.add('silver');
      } else if (titleLow.includes('bronze') || rarityLow === 'common') {
        activeTiers.add('bronze');
      } else if (Number(item.bonus) > 0) {
        explicitBonus = Math.max(explicitBonus, Number(item.bonus));
      }
    }
  });

  let maxItemBoosterSlots = explicitBonus;
  if (activeTiers.has('bronze')) maxItemBoosterSlots += 1;
  if (activeTiers.has('silver')) maxItemBoosterSlots += 2;
  if (activeTiers.has('gold')) maxItemBoosterSlots += 3;
  if (activeTiers.has('platinum')) maxItemBoosterSlots += 4;

  // Total Max Expedition Slots calculated from Account (Astro + Discoverer + Admiral + Items)
  const calculatedMaxSlots = baseAstroSlots + discovererSlots + admiralSlots + maxItemBoosterSlots;

  // 5. Active Expeditions and slots based on the latest source of truth:
  // Source 1: Live #slots from &component=fleetdispatch page DOM
  // Source 2: Background sync / event list from nexus_fleet_movements
  const dispatchSlots = fleetMovements?.dispatchSlots;
  const dispatchSlotsLastUpdated = dispatchSlots?.lastUpdated || 0;
  const fleetMovementsLastUpdated = fleetMovements?.lastUpdated || 0;

  let activeExpeditions = 0;
  let maxSlots = calculatedMaxSlots;

  if (dispatchSlots && dispatchSlotsLastUpdated >= fleetMovementsLastUpdated) {
    // 1. Live fleetdispatch DOM (#slots) is the latest source of truth!
    activeExpeditions = dispatchSlots.usedExpeditionSlots;
    if (dispatchSlots.totalExpeditionSlots > 0) {
      maxSlots = dispatchSlots.totalExpeditionSlots;
    }
  } else if (fleetMovements && Array.isArray(fleetMovements.fleets) && fleetMovements.fleets.length > 0) {
    // 2. Background sync / event list is the latest source of truth!
    activeExpeditions = countActiveMissions(fleetMovements.fleets, 15);
  } else if (dispatchSlots) {
    // Fallback to dispatchSlots if available
    activeExpeditions = dispatchSlots.usedExpeditionSlots;
    if (dispatchSlots.totalExpeditionSlots > 0) {
      maxSlots = dispatchSlots.totalExpeditionSlots;
    }
  } else if (fleetMovements?.summary?.expeditionCount !== undefined) {
    activeExpeditions = fleetMovements.summary.expeditionCount;
  }

  if (maxSlots <= 0) return results;

  const idleSlots = Math.max(0, maxSlots - activeExpeditions);

  if (idleSlots > 0) {
    const id = 'idle_expedition_slots';
    const breakdownParts = [`Astro: ${baseAstroSlots}`];
    if (discovererSlots > 0) {
      breakdownParts.push(`Discoverer: +${discovererSlots}${totalDiscovererEnhancementPercent >= 50 ? ` (T18: ${totalDiscovererEnhancementPercent.toFixed(1)}%)` : ''}`);
    }
    if (admiralSlots > 0) breakdownParts.push(`Admiral: +1`);
    if (maxItemBoosterSlots > 0) breakdownParts.push(`Items: +${maxItemBoosterSlots}`);

    results.push({
      id,
      ruleId: 'idle_expedition_slots',
      category: 'critical',
      severity: idleSlots >= 3 ? 'danger' : 'warning',
      icon: '🧭',
      iconTooltip: 'Expedition Dispatch Slots',
      badgeText: 'WARNING',
      title: `Expedition Slots (${activeExpeditions} / ${maxSlots} Filled)`,
      message: `🧭 Expedition Slots: You currently have ${activeExpeditions} of ${maxSlots} Expedition slots filled in flight (${idleSlots} idle slot${idleSlots > 1 ? 's' : ''} available). Breakdown: ${breakdownParts.join(', ')}. Launch expeditions now to maximize discoveries and fleet returns!`,
      shortMessage: `${idleSlots} idle Expedition slot${idleSlots > 1 ? 's' : ''}!`,
      timestamp: Date.now(),
      actionLabel: 'Launch Expeditions',
      actionUrl: `/game/index.php?page=ingame&component=fleetdispatch`,
      meta: { activeExpeditions, maxSlots, idleSlots, baseAstroSlots, discovererSlots, admiralSlots, maxItemBoosterSlots }
    });
  }

  return results;
}

// ==========================================================================
function isSameDay(t1: number, t2: number): boolean {
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

async function evaluateImportExport(account: Account, settings: AssistantSettings): Promise<AssistantNotification[]> {
  const results: AssistantNotification[] = [];
  let info = account.importExport;

  if (!info) {
    info = (await getStoredImportExportInfo()) || undefined;
  }

  // If no info or info is from a previous day, today's mystery container is available!
  let isAvailable = true;
  if (info && info.lastUpdated && isSameDay(info.lastUpdated, Date.now())) {
    // If recorded today: available if not bought or if item pending collection
    isAvailable = (!info.hasBought && !info.gotItem) || (info.offersLeft !== undefined && info.offersLeft > 0);
  }

  if (isAvailable) {
    const id = 'import_export_daily';
    const priceFormatted = info?.price ? formatNumber(info.price) : '';
    const priceText = priceFormatted ? ` (Price: ${priceFormatted} resources)` : '';
    const itemTitle = info?.name && info.name.trim() !== '' ? ` [${info.name}]` : '';

    results.push({
      id,
      ruleId: 'import_export',
      category: 'intel',
      severity: 'info',
      icon: '📦',
      iconTooltip: 'Import / Export Mystery Container',
      badgeText: 'INTEL',
      title: `Import/Export Container Ready${itemTitle}`,
      message: `Today's mystery container is ready at the Import/Export Trader${itemTitle}${priceText}. Claim today's booster item now!`,
      shortMessage: priceFormatted ? `Mystery Container (${priceFormatted})!` : 'Mystery Container ready!',
      timestamp: Date.now(),
      actionLabel: 'Open Import/Export',
      actionUrl: `/game/index.php?page=ingame&component=traderOverview#animation=false&page=traderImportExport`,
      meta: info
    });
  }

  return results;
}

// ==========================================================================
// RULE 7: Optimal Amortization Upgrade Recommendation
// ==========================================================================
function evaluateAmortization(planets: Planet[], account: Account, settings: AssistantSettings): AssistantNotification[] {
  const results: AssistantNotification[] = [];
  if (!planets || planets.length === 0) return results;

  try {
    const filters = {
      [AmortizationType.Mines]: true,
      [AmortizationType.LifeformProductionBuildings]: true,
      [AmortizationType.LifeformResearchBuildings]: true,
      [AmortizationType.LifeformProductionResearches]: true,
      [AmortizationType.LifeformExpeditionResearches]: true,
      [AmortizationType.PlasmaTechnology]: true
    };

    const items = rankAmortizationItems(planets, account, filters, DEFAULT_RATES, 1);
    if (!items || items.length === 0) return results;

    const topItem = items[0];
    const targetPlanet = planets.find(p => p.id === topItem.planetId);
    const planetName = targetPlanet ? (targetPlanet.name || 'Planet') : undefined;
    const coords = targetPlanet ? targetPlanet.coords : undefined;
    const planetImgUrl = targetPlanet ? targetPlanet.imgUrl : undefined;

    const nextLvl = topItem.currentLevel + 1;
    const roiStr = formatROI(topItem.roiHours);
    const msuIncFormatted = formatNumber(Math.round(topItem.productionIncrease * 24)); // Daily MSU boost
    const costMsuFormatted = formatNumber(Math.round(topItem.msuCost));

    let actionLabel: string | undefined = undefined;
    let actionUrl: string | undefined = undefined;

    if (topItem.type === AmortizationType.Mines) {
      if (topItem.planetId) {
        actionLabel = 'Resources';
        actionUrl = `/game/index.php?page=ingame&component=supplies&cp=${topItem.planetId}`;
      }
    } else if (
      topItem.type === AmortizationType.LifeformProductionBuildings ||
      topItem.type === AmortizationType.LifeformResearchBuildings
    ) {
      if (topItem.planetId) {
        actionLabel = 'Lifeform Buildings';
        actionUrl = `/game/index.php?page=ingame&component=lfbuildings&cp=${topItem.planetId}`;
      }
    } else if (
      topItem.type === AmortizationType.LifeformProductionResearches ||
      topItem.type === AmortizationType.LifeformExpeditionResearches
    ) {
      if (topItem.planetId) {
        actionLabel = 'Lifeform Research';
        actionUrl = `/game/index.php?page=ingame&component=lfresearch&cp=${topItem.planetId}`;
      }
    } else if (topItem.type === AmortizationType.PlasmaTechnology) {
      // Global research: NO button inside the modal
      actionLabel = undefined;
      actionUrl = undefined;
    }

    const locationText = (planetName && coords) ? ` on ${planetName} [${coords}]` : '';

    const itemIcon = getItemIcon(topItem) || '💡';

    results.push({
      id: `amortization_top_${topItem.name}_${topItem.planetId || 'empire'}_lvl${nextLvl}`,
      ruleId: 'amortization_recommendation',
      category: 'intel',
      severity: 'info',
      icon: itemIcon,
      iconTooltip: topItem.name,
      badgeText: 'INTEL',
      title: `Next Best Build: ${topItem.name} ${nextLvl}`,
      message: `💡 Amortization Recommendation: Upgrade ${topItem.name} to Level ${nextLvl}${locationText}. Payback: ${roiStr} (+${msuIncFormatted} MSU/day for ${costMsuFormatted} MSU).`,
      shortMessage: `Build ${topItem.name} ${nextLvl}${locationText ? ` on ${planetName}` : ''}!`,
      timestamp: Date.now(),
      planetId: topItem.planetId,
      planetName,
      planetImgUrl,
      coords,
      actionLabel,
      actionUrl,
      meta: { topItem, nextLvl, roiStr, msuCost: topItem.msuCost, prodIncrease: topItem.productionIncrease }
    });
  } catch (err: any) {
    if (!err?.message?.includes('Extension context invalidated')) {
      console.error('OGame Nexus: Error computing Amortization Overseer recommendation', err);
    }
  }

  return results;
}

// ==========================================================================
// RULE 8: Lifeform Artefact Storage Limit Alert (>= 3000 & >= 3600)
// ==========================================================================
async function evaluateArtifacts(account: Account, settings: AssistantSettings): Promise<AssistantNotification[]> {
  const results: AssistantNotification[] = [];
  let count = account.artifacts;

  if (typeof count !== 'number' && account.playerId) {
    try {
      const data = await chrome.storage.local.get(`nexus_artifacts_${account.playerId}`);
      if (typeof data?.[`nexus_artifacts_${account.playerId}`] === 'number') {
        count = data[`nexus_artifacts_${account.playerId}`];
      }
    } catch (e) {
      // Ignore
    }
  }

  if (typeof count !== 'number' || isNaN(count)) return results;

  const warnThreshold = settings.thresholds.artifactsWarningThreshold || 3000;

  if (count >= 3600) {
    results.push({
      id: 'artifacts_storage_full',
      ruleId: 'artifacts_limit',
      category: 'critical',
      severity: 'danger',
      icon: '🔮',
      iconTooltip: 'Lifeform Artefact Storage Full',
      badgeText: 'CRITICAL',
      title: `Artefact Storage Full (${count}/3,600)`,
      message: `🔮 Artefact Storage Full: You have reached the maximum storage capacity of 3,600 Artefacts (${count}/3,600). Lifeform exploration missions will NO LONGER yield any artefacts! Spend artefacts on Lifeform Research tech selections to free up space.`,
      shortMessage: `Artefact Storage Full (${count}/3,600)!`,
      timestamp: Date.now(),
      actionLabel: 'Lifeform Research',
      actionUrl: `/game/index.php?page=ingame&component=lfresearch`,
      meta: { artifacts: count, max: 3600, isFull: true }
    });
  } else if (count >= warnThreshold) {
    results.push({
      id: 'artifacts_storage_almost_full',
      ruleId: 'artifacts_limit',
      category: 'critical',
      severity: 'warning',
      icon: '🔮',
      iconTooltip: 'Lifeform Artefact Storage Limit',
      badgeText: 'WARNING',
      title: `Artefact Storage Almost Full (${count}/3,600)`,
      message: `🔮 Artefact Storage Almost Full: You have collected ${count}/3,600 Artefacts (${3600 - count} remaining until cap). Consider spending them on Lifeform Research tech selections before reaching the 3,600 cap.`,
      shortMessage: `Artefacts almost full (${count}/3,600)!`,
      timestamp: Date.now(),
      actionLabel: 'Lifeform Research',
      actionUrl: `/game/index.php?page=ingame&component=lfresearch`,
      meta: { artifacts: count, max: 3600, isFull: false }
    });
  }

  return results;
}

// ==========================================================================
// RULE 9: Galaxy Debris Field Opportunity Alerts
// ==========================================================================
async function evaluateDebrisOpportunities(settings: AssistantSettings): Promise<AssistantNotification[]> {
  const results: AssistantNotification[] = [];
  const storageKey = 'nexus_discovered_debris_fields';

  try {
    const store = await chrome.storage.local.get(storageKey);
    const debrisMap: Record<string, DiscoveredDebrisField> = store[storageKey] || {};
    const now = Date.now();
    const minDebrisMsu = settings.thresholds.minDebrisMsu || 1000000;

    const validDebris: DiscoveredDebrisField[] = [];
    let hasExpired = false;

    for (const [coords, d] of Object.entries(debrisMap)) {
      if (!d || now >= d.expiresAt || now - d.timestamp > 60 * 60 * 1000) {
        delete debrisMap[coords];
        hasExpired = true;
      } else if (d.msu >= minDebrisMsu) {
        validDebris.push(d);
      }
    }

    if (hasExpired) {
      await chrome.storage.local.set({ [storageKey]: debrisMap });
    }

    // Sort by highest MSU value first
    validDebris.sort((a, b) => b.msu - a.msu);

    validDebris.forEach(d => {
      const elapsedMins = Math.max(0, Math.floor((now - d.timestamp) / 60000));
      const remainingMins = Math.max(1, Math.ceil((d.expiresAt - now) / 60000));
      const timeAgoText = elapsedMins === 0 ? 'just now' : `${elapsedMins}m ago`;

      const msuFormatted = formatNumber(Math.round(d.msu));
      const metalFormatted = formatNumber(Math.round(d.metal));
      const crystalFormatted = formatNumber(Math.round(d.crystal));
      const deutFormatted = formatNumber(Math.round(d.deuterium));
      const recyclersFormatted = formatNumber(d.recyclersNeeded);

      const isHuge = d.msu >= 5000000;

      results.push({
        id: `debris_field_${d.galaxy}_${d.system}_${d.position}`,
        ruleId: 'debris_opportunity',
        category: 'intel',
        severity: isHuge ? 'warning' : 'info',
        icon: '☄️',
        iconTooltip: 'Harvestable Debris Field',
        badgeText: 'OPPORTUNITY',
        title: `Debris Field: [${d.coords}] (${msuFormatted} MSU)`,
        message: `☄️ Galaxy Opportunity: Debris field spotted at [${d.coords}] containing ${msuFormatted} MSU (${metalFormatted} Metal, ${crystalFormatted} Crystal, ${deutFormatted} Deut). Requires ${recyclersFormatted} Recyclers. Spotted ${timeAgoText}.`,
        shortMessage: `Debris [${d.coords}]: ${msuFormatted} MSU!`,
        timestamp: d.timestamp,
        coords: d.coords,
        actionLabel: 'View in Galaxy',
        actionUrl: `/game/index.php?page=ingame&component=galaxy&galaxy=${d.galaxy}&system=${d.system}`,
        meta: { ...d, remainingMins, elapsedMins }
      });
    });
  } catch (err: any) {
    if (!err?.message?.includes('Extension context invalidated')) {
      console.error('OGame Nexus: Error evaluating galaxy debris opportunities', err);
    }
  }

  return results;
}

// ==========================================================================
// HELPERS: Expedition Finding Scorer
// ==========================================================================
function calculateExpeditionFindMsu(exp: any): { msu: number; summaryText: string; metal: number; crystal: number; deuterium: number; dm: number; shipsText: string } {
  let metal = 0;
  let crystal = 0;
  let deuterium = 0;
  let dm = 0;
  let shipsText = '';
  const resultType = (exp.result || '').toLowerCase();

  if (resultType === 'ressources' || resultType === 'resources') {
    metal = Number(exp.resultDetails?.metal) || 0;
    crystal = Number(exp.resultDetails?.crystal) || 0;
    deuterium = Number(exp.resultDetails?.deuterium) || 0;
  } else if (resultType === 'shipwrecks') {
    const ships = Array.isArray(exp.resultDetails) ? exp.resultDetails : (exp.resultDetails?.ships || []);
    const parts: string[] = [];
    ships.forEach((s: any) => {
      const shipId = Number(s.id || s.technologyId);
      const amount = Number(s.amount || s.count) || 0;
      const shipInfo = SHIP_DATA.find(x => x.id === shipId);
      if (shipInfo && amount > 0) {
        const cost = shipInfo.metadata?.cost;
        if (cost) {
          metal += (cost.metal || 0) * amount;
          crystal += (cost.crystal || 0) * amount;
          deuterium += (cost.deuterium || 0) * amount;
        }
        parts.push(`${amount.toLocaleString('en-US')}x ${shipInfo.name}`);
      }
    });
    shipsText = parts.join(', ');
  } else if (resultType === 'darkmatter') {
    dm = Number(exp.resultDetails?.darkmatter || exp.resultDetails?.darkMatter) || 0;
  }

  const msu = metal + crystal * 1.5 + deuterium * 3.0;

  const resParts: string[] = [];
  if (metal > 0) resParts.push(`${formatNumber(metal)} Metal`);
  if (crystal > 0) resParts.push(`${formatNumber(crystal)} Crystal`);
  if (deuterium > 0) resParts.push(`${formatNumber(deuterium)} Deut`);
  if (dm > 0) resParts.push(`${formatNumber(dm)} Dark Matter`);
  if (shipsText) resParts.push(shipsText);

  return {
    msu,
    summaryText: resParts.join(', ') || 'Expedition Loot',
    metal,
    crystal,
    deuterium,
    dm,
    shipsText
  };
}

// ==========================================================================
// RULE 10: Today's Expedition Yield Summary (Matching At-A-Glance today MSU)
// ==========================================================================
function evaluateTodayExpeditionYield(todayExpeditions: any[], settings: AssistantSettings): AssistantNotification[] {
  const results: AssistantNotification[] = [];
  if (!todayExpeditions || todayExpeditions.length === 0) return results;

  let totalMetal = 0;
  let totalCrystal = 0;
  let totalDeuterium = 0;
  let totalDm = 0;

  todayExpeditions.forEach(exp => {
    const res = calculateExpeditionFindMsu(exp);
    totalMetal += res.metal;
    totalCrystal += res.crystal;
    totalDeuterium += res.deuterium;
    totalDm += res.dm;
  });

  const totalMsu = totalMetal + totalCrystal * 1.5 + totalDeuterium * 3.0;

  if (todayExpeditions.length > 0) {
    const msuFormatted = formatNumber(Math.round(totalMsu));
    const metalFormatted = formatNumber(Math.round(totalMetal));
    const crystalFormatted = formatNumber(Math.round(totalCrystal));
    const deutFormatted = formatNumber(Math.round(totalDeuterium));

    results.push({
      id: 'today_expedition_yield_summary',
      ruleId: 'today_expedition_yield',
      category: 'intel',
      severity: 'info',
      icon: '📊',
      iconTooltip: "Today's Expedition Intel & Yield",
      badgeText: 'EXPEDITIONS',
      title: `Expedition Yield: ${msuFormatted} MSU`,
      message: `📊 Today's Expedition Intelligence: Your expedition fleets have collected a total of ${msuFormatted} MSU (${metalFormatted} Metal, ${crystalFormatted} Crystal, ${deutFormatted} Deut) across ${todayExpeditions.length} missions today.`,
      shortMessage: `Expeditions: ${msuFormatted} MSU (${todayExpeditions.length} runs)`,
      timestamp: Date.now(),
      actionLabel: 'Nexus Terminal',
      actionUrl: '#open-nexus-terminal',
      meta: {
        totalMsu,
        totalMetal,
        totalCrystal,
        totalDeuterium,
        totalDm,
        missions: todayExpeditions.length
      }
    });
  }

  return results;
}

// ==========================================================================
// RULE 11: Top 3 Expedition Finds Today (Randomly selected from Top 3)
// ==========================================================================
function evaluateTopExpeditionFinds(todayExpeditions: any[], settings: AssistantSettings): AssistantNotification[] {
  const results: AssistantNotification[] = [];
  if (!todayExpeditions || todayExpeditions.length === 0) return results;

  const scoredFinds: { exp: any; msu: number; summaryText: string; timestamp: number; coords: string }[] = [];

  todayExpeditions.forEach(exp => {
    const res = calculateExpeditionFindMsu(exp);
    if (res.msu > 0) {
      scoredFinds.push({
        exp,
        msu: res.msu,
        summaryText: res.summaryText,
        timestamp: (exp.timestamp || 0) * 1000 || Date.now(),
        coords: exp.coords || 'Deep Space'
      });
    }
  });

  if (scoredFinds.length === 0) return results;

  // Sort by highest MSU find descending
  scoredFinds.sort((a, b) => b.msu - a.msu);

  // Take the Top 3
  const top3 = scoredFinds.slice(0, 3);
  if (top3.length === 0) return results;

  // Pick one randomly from Top 3
  const randomIndex = Math.floor(Math.random() * top3.length);
  const chosen = top3[randomIndex];
  const rankLabel = `#${randomIndex + 1} Best Expedition Find`;
  const msuFormatted = formatNumber(Math.round(chosen.msu));

  results.push({
    id: `top_expedition_find_today`,
    ruleId: 'top_expedition_find',
    category: 'intel',
    severity: 'info',
    icon: '✨',
    iconTooltip: 'Top Expedition Loot Recovery',
    badgeText: 'EXPEDITION',
    title: `Great find: +${msuFormatted} MSU`,
    message: `✨ ${rankLabel}: Expedition to [${chosen.coords}] recovered ${chosen.summaryText} (+${msuFormatted} MSU) today!`,
    shortMessage: `Great find [${chosen.coords}]: +${msuFormatted} MSU!`,
    timestamp: chosen.timestamp,
    coords: chosen.coords,
    planetName: 'Deep Space',
    meta: {
      msu: chosen.msu,
      summaryText: chosen.summaryText,
      rank: randomIndex + 1,
      totalTopCandidates: top3.length
    }
  });

  return results;
}

// ==========================================================================
// RULE 12: Expedition System Depletion Warning (Past 4 Hours)
// ==========================================================================
function evaluateExpeditionDepletion(expeditions: any[], settings: AssistantSettings): AssistantNotification[] {
  const results: AssistantNotification[] = [];
  if (!expeditions || expeditions.length === 0) return results;

  const nowSec = Date.now() / 1000;
  const fourHoursAgoSec = nowSec - 4 * 3600;

  // Filter expeditions within the past 4 hours
  const recentExpos = expeditions.filter(e => {
    const ts = Number(e.timestamp);
    return !isNaN(ts) && ts >= fourHoursAgoSec && ts <= nowSec + 300;
  });

  if (recentExpos.length < 3) return results; // Minimum 3 missions to establish a valid rate

  // Pristine = 1, Anything > 1 is depleted (Good=2, Moderate=3, High=4, Depleted=5)
  const depletedExpos = recentExpos.filter(e => {
    const dep = Number(e.depletion);
    return !isNaN(dep) && dep > 1;
  });

  const totalCount = recentExpos.length;
  const depletedCount = depletedExpos.length;
  const depletionRate = (depletedCount / totalCount) * 100;
  const maxThreshold = settings.thresholds.maxExpoDepletionPct ?? 10;

  if (depletionRate > maxThreshold) {
    const rateFormatted = Math.round(depletionRate);
    results.push({
      id: 'expedition_depletion_warning',
      ruleId: 'expedition_depletion',
      category: 'critical',
      severity: 'warning',
      icon: '🧭',
      iconTooltip: 'Sector Depletion Status',
      badgeText: 'DEPLETION',
      title: `Expedition Depletion (${rateFormatted}% in 4h)`,
      message: `🧭 Sector Depletion Warning: In the past 4 hours, ${depletedCount} of ${totalCount} expedition missions (${rateFormatted}%) encountered depleted sectors. Consider rerouting your expedition fleets to other systems to maximize rewards.`,
      shortMessage: `Expedition Depletion: ${rateFormatted}% non-pristine in 4h (${depletedCount}/${totalCount})!`,
      timestamp: Date.now(),
      actionLabel: 'Fleet Dispatch',
      actionUrl: `/game/index.php?page=ingame&component=fleetdispatch`,
      meta: {
        depletedCount,
        totalCount,
        depletionRate: rateFormatted,
        threshold: maxThreshold
      }
    });
  }

  return results;
}

// ==========================================================================
// RULE 13: Crawler Saturation Deficit (Logistics)
// ==========================================================================
function evaluateCrawlerDeficit(planets: Planet[], account: Account, settings: AssistantSettings): AssistantNotification[] {
  const results: AssistantNotification[] = [];
  if (!planets || planets.length === 0) return results;

  const isCollector = (account as any).characterClass === 1 || (account as any).characterClass === 'collector' || (account as any).playerClass === 1;
  const hasGeologist = Boolean(account.hasGeologist);
  // Base is 8 crawlers per total mine level, Collector with Geologist gets +10% (8.8)
  const crawlerFactor = (isCollector && hasGeologist) ? 8.8 : 8.0;

  planets.forEach(p => {
    // Only check planets (not moons)
    if (p.type === 'moon') return;

    const m = Number(p.metalMine || 0);
    const c = Number(p.crystalMine || 0);
    const d = Number(p.deuteriumMine || 0);
    const totalMineLevels = m + c + d;

    if (totalMineLevels === 0) return; // No mines on planet yet

    const maxCrawlers = Math.floor(totalMineLevels * crawlerFactor);
    const currentCrawlers = Number(p.crawlers || 0);

    if (currentCrawlers < maxCrawlers) {
      const missing = maxCrawlers - currentCrawlers;
      const isZero = currentCrawlers === 0;
      const coordsText = p.coords ? `[${p.coords}]` : '';

      results.push({
        id: `crawler_deficit_${p.id}`,
        ruleId: 'crawler_deficit',
        category: 'logistics',
        severity: isZero ? 'warning' : 'info',
        icon: 'icons/ships/crawler-large.jpg',
        iconTooltip: 'Crawler',
        badgeText: 'CRAWLERS',
        title: `Crawler Shortage: ${p.name || 'Planet'} ${coordsText}`.trim(),
        message: `Crawler Saturation Deficit: ${p.name || 'Planet'} ${coordsText} currently has ${currentCrawlers.toLocaleString('en-US')}/${maxCrawlers.toLocaleString('en-US')} usable Crawlers (${missing.toLocaleString('en-US')} missing). Constructing ${missing.toLocaleString('en-US')} additional Crawlers in the Shipyard will maximize your mines' production output.`.trim(),
        shortMessage: `Crawlers ${coordsText}: ${currentCrawlers}/${maxCrawlers} (${missing} missing)`.trim(),
        timestamp: Date.now(),
        planetId: String(p.id),
        planetName: p.name,
        planetImgUrl: p.imgUrl,
        coords: p.coords,
        actionLabel: 'Shipyard',
        actionUrl: `/game/index.php?page=ingame&component=shipyard&cp=${p.id}`,
        meta: {
          currentCrawlers,
          maxCrawlers,
          missing,
          totalMineLevels,
          crawlerFactor
        }
      });
    }
  });

  return results;
}

// ==========================================================================
// RULE 14: Production Booster Gap Optimizer (Independent Per-Mine Matching)
// ==========================================================================
async function evaluateProductionBoosterGaps(
  planets: Planet[],
  account: Account,
  settings: AssistantSettings
): Promise<AssistantNotification[]> {
  const results: AssistantNotification[] = [];

  try {
    const inventory = await getStoredPlayerInventory();
    if (!inventory || inventory.length === 0) return results;

    // Separate stored boosters by category
    const metalBoosters = inventory.filter(i => i.category === 'metal_booster');
    const crystalBoosters = inventory.filter(i => i.category === 'crystal_booster');
    const deutBoosters = inventory.filter(i => i.category === 'deut_booster');

    const totalMetalStock = metalBoosters.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalCrystalStock = crystalBoosters.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalDeutStock = deutBoosters.reduce((sum, i) => sum + (i.amount || 0), 0);

    const now = Date.now();

    // 1. Deuterium Booster Gaps
    if (totalDeutStock > 0) {
      const deutNames = Array.from(new Set(deutBoosters.map(b => b.name).filter(Boolean)));
      const deutTooltip = deutNames.join(', ') || 'Deuterium Booster';

      const unboostedDeutPlanets = planets
        .filter(p => p.type !== 'moon' && Number(p.deuteriumMine || 0) >= 1)
        .filter(p => {
          const active = getProductionBoosters(p.activeItems);
          return (active.deuterium || 0) === 0;
        })
        .sort((a, b) => Number(b.deuteriumMine || 0) - Number(a.deuteriumMine || 0));

      if (unboostedDeutPlanets.length > 0) {
        const top = unboostedDeutPlanets[0];
        const topLevel = top.deuteriumMine || 0;
        const topCoords = top.coords ? `[${top.coords}]` : '';
        const runnerUps = unboostedDeutPlanets.slice(1, 3);
        const runnerUpStr = runnerUps.length > 0
          ? `. Other unboosted: ` + runnerUps.map(p => `${p.name || 'Planet'} [${p.coords}] (Lvl ${p.deuteriumMine})`).join(', ')
          : '';

        results.push({
          id: 'booster_gap_deuterium',
          ruleId: 'production_booster_gap',
          category: 'intel',
          severity: 'info',
          icon: deutBoosters[0]?.iconUrl || 'icons/resources/deuterium-icon-medium.jpg',
          iconTooltip: deutTooltip,
          badgeText: 'BOOSTER',
          title: `Deuterium Booster Available (${totalDeutStock} in Stock)`,
          message: `You have ${totalDeutStock}x Deuterium Booster${totalDeutStock > 1 ? 's' : ''} in inventory, but ${unboostedDeutPlanets.length} planet${unboostedDeutPlanets.length > 1 ? 's have' : ' has'} no active booster! Best candidate: ${top.name || 'Planet'} ${topCoords} (Deut Synth Lvl ${topLevel})${runnerUpStr}.`,
          shortMessage: `${totalDeutStock}x Deut Booster${totalDeutStock > 1 ? 's' : ''}! Best: ${top.name || 'Planet'} ${topCoords} (Lvl ${topLevel})`,
          timestamp: now,
          planetId: String(top.id),
          planetName: top.name,
          planetImgUrl: top.imgUrl,
          coords: top.coords,
          actionLabel: `Open ${top.name || 'Planet'}`,
          actionUrl: `/game/index.php?page=ingame&component=supplies&cp=${top.id}`,
          meta: {
            resource: 'deuterium',
            totalStock: totalDeutStock,
            unboostedCount: unboostedDeutPlanets.length,
            topPlanetId: top.id,
            topMineLevel: topLevel
          }
        });
      }
    }

    // 2. Crystal Booster Gaps
    if (totalCrystalStock > 0) {
      const crystalNames = Array.from(new Set(crystalBoosters.map(b => b.name).filter(Boolean)));
      const crystalTooltip = crystalNames.join(', ') || 'Crystal Booster';

      const unboostedCrystalPlanets = planets
        .filter(p => p.type !== 'moon' && Number(p.crystalMine || 0) >= 1)
        .filter(p => {
          const active = getProductionBoosters(p.activeItems);
          return (active.crystal || 0) === 0;
        })
        .sort((a, b) => Number(b.crystalMine || 0) - Number(a.crystalMine || 0));

      if (unboostedCrystalPlanets.length > 0) {
        const top = unboostedCrystalPlanets[0];
        const topLevel = top.crystalMine || 0;
        const topCoords = top.coords ? `[${top.coords}]` : '';
        const runnerUps = unboostedCrystalPlanets.slice(1, 3);
        const runnerUpStr = runnerUps.length > 0
          ? `. Other unboosted: ` + runnerUps.map(p => `${p.name || 'Planet'} [${p.coords}] (Lvl ${p.crystalMine})`).join(', ')
          : '';

        results.push({
          id: 'booster_gap_crystal',
          ruleId: 'production_booster_gap',
          category: 'intel',
          severity: 'info',
          icon: crystalBoosters[0]?.iconUrl || 'icons/resources/crystal-icon-medium.jpg',
          iconTooltip: crystalTooltip,
          badgeText: 'BOOSTER',
          title: `Crystal Booster Available (${totalCrystalStock} in Stock)`,
          message: `You have ${totalCrystalStock}x Crystal Booster${totalCrystalStock > 1 ? 's' : ''} in inventory, but ${unboostedCrystalPlanets.length} planet${unboostedCrystalPlanets.length > 1 ? 's have' : ' has'} no active booster! Best candidate: ${top.name || 'Planet'} ${topCoords} (Crystal Mine Lvl ${topLevel})${runnerUpStr}.`,
          shortMessage: `${totalCrystalStock}x Crystal Booster${totalCrystalStock > 1 ? 's' : ''}! Best: ${top.name || 'Planet'} ${topCoords} (Lvl ${topLevel})`,
          timestamp: now,
          planetId: String(top.id),
          planetName: top.name,
          planetImgUrl: top.imgUrl,
          coords: top.coords,
          actionLabel: `Open ${top.name || 'Planet'}`,
          actionUrl: `/game/index.php?page=ingame&component=supplies&cp=${top.id}`,
          meta: {
            resource: 'crystal',
            totalStock: totalCrystalStock,
            unboostedCount: unboostedCrystalPlanets.length,
            topPlanetId: top.id,
            topMineLevel: topLevel
          }
        });
      }
    }

    // 3. Metal Booster Gaps
    if (totalMetalStock > 0) {
      const metalNames = Array.from(new Set(metalBoosters.map(b => b.name).filter(Boolean)));
      const metalTooltip = metalNames.join(', ') || 'Metal Booster';

      const unboostedMetalPlanets = planets
        .filter(p => p.type !== 'moon' && Number(p.metalMine || 0) >= 1)
        .filter(p => {
          const active = getProductionBoosters(p.activeItems);
          return (active.metal || 0) === 0;
        })
        .sort((a, b) => Number(b.metalMine || 0) - Number(a.metalMine || 0));

      if (unboostedMetalPlanets.length > 0) {
        const top = unboostedMetalPlanets[0];
        const topLevel = top.metalMine || 0;
        const topCoords = top.coords ? `[${top.coords}]` : '';
        const runnerUps = unboostedMetalPlanets.slice(1, 3);
        const runnerUpStr = runnerUps.length > 0
          ? `. Other unboosted: ` + runnerUps.map(p => `${p.name || 'Planet'} [${p.coords}] (Lvl ${p.metalMine})`).join(', ')
          : '';

        results.push({
          id: 'booster_gap_metal',
          ruleId: 'production_booster_gap',
          category: 'intel',
          severity: 'info',
          icon: metalBoosters[0]?.iconUrl || 'icons/resources/metal-icon-medium.jpg',
          iconTooltip: metalTooltip,
          badgeText: 'BOOSTER',
          title: `Metal Booster Available (${totalMetalStock} in Stock)`,
          message: `You have ${totalMetalStock}x Metal Booster${totalMetalStock > 1 ? 's' : ''} in inventory, but ${unboostedMetalPlanets.length} planet${unboostedMetalPlanets.length > 1 ? 's have' : ' has'} no active booster! Best candidate: ${top.name || 'Planet'} ${topCoords} (Metal Mine Lvl ${topLevel})${runnerUpStr}.`,
          shortMessage: `${totalMetalStock}x Metal Booster${totalMetalStock > 1 ? 's' : ''}! Best: ${top.name || 'Planet'} ${topCoords} (Lvl ${topLevel})`,
          timestamp: now,
          planetId: String(top.id),
          planetName: top.name,
          planetImgUrl: top.imgUrl,
          coords: top.coords,
          actionLabel: `Open ${top.name || 'Planet'}`,
          actionUrl: `/game/index.php?page=ingame&component=supplies&cp=${top.id}`,
          meta: {
            resource: 'metal',
            totalStock: totalMetalStock,
            unboostedCount: unboostedMetalPlanets.length,
            topPlanetId: top.id,
            topMineLevel: topLevel
          }
        });
      }
    }
  } catch (err: any) {
    if (!err?.message?.includes('Extension context invalidated')) {
      console.error('OGame Nexus: Error evaluating booster gaps', err);
    }
  }

  return results;
}

/**
 * Rule: Idle Empire Research Lab
 * Checks if the empire has research facilities (research lab >= 1 on at least one planet)
 * but currently has 0 active research in progress.
 */
async function evaluateIdleResearch(
  account: Account,
  planets: Planet[],
  settings: AssistantSettings
): Promise<AssistantNotification[]> {
  try {
    // Check if player has at least 1 research lab in the empire
    const hasLab = planets.some(p => (p.researchLab || 0) > 0);
    if (!hasLab) return [];

    // 1. Check production queue object first (most accurate and real-time across entire empire)
    const storedQueue = account.productionQueue || await getStoredProductionQueue(account.playerId);
    if (storedQueue) {
      if (storedQueue.hasActiveResearch) {
        const activeResearchItem = storedQueue.items?.find(i => i.type === 'research');
        if (!activeResearchItem || activeResearchItem.endTimestamp > Date.now()) {
          return []; // Active research is running!
        }
      } else if (storedQueue.items) {
        const activeResearchItem = storedQueue.items.find(i => i.type === 'research');
        if (activeResearchItem && activeResearchItem.endTimestamp > Date.now()) {
          return []; // Active research is running!
        }
      }
    }

    // 2. Fallback: Check activeResearch on account or chrome.storage.local
    let activeResearch: ActiveResearchInfo | null | undefined = account.activeResearch;

    if (activeResearch === undefined && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(`nexus_active_research_${account.playerId}`);
        if (stored && stored[`nexus_active_research_${account.playerId}`]) {
          activeResearch = stored[`nexus_active_research_${account.playerId}`];
        }
      } catch (e) {}
    }

    // If research is actively running and hasn't finished yet
    if (activeResearch) {
      if (activeResearch.completeTimestamp && activeResearch.completeTimestamp > Date.now()) {
        return [];
      }
      if (!activeResearch.completeTimestamp && (Date.now() - (activeResearch.lastUpdated || 0) < 300000)) {
        return [];
      }
    }

    // Compute smart next research tip (e.g. Next best Amortization tech or Plasma Tech / Astro / Energy Tech)
    let suggestionTip = '';
    try {
      const rawResearches: Record<number, number> = {};
      if (account.researches) {
        account.researches.forEach(r => { rawResearches[r.id] = r.level; });
      }
      const plasmaLevel = rawResearches[122] || 0;
      const astroLevel = rawResearches[124] || 0;
      const energyLevel = rawResearches[113] || 0;
      const irnLevel = rawResearches[123] || 0;

      if (plasmaLevel < 15) {
        suggestionTip = ` 💡 Next Tech: Plasma Technology (Level ${plasmaLevel + 1}) boosts empire-wide mine production.`;
      } else if (astroLevel % 2 === 0) {
        suggestionTip = ` 💡 Next Tech: Astrophysics (Level ${astroLevel + 1}) unlocks your next Colony slot.`;
      } else if (irnLevel < 5 && planets.length > 3) {
        suggestionTip = ` 💡 Next Tech: Intergalactic Research Network (Level ${irnLevel + 1}) links labs for faster research.`;
      }
    } catch (e) {}

    return [{
      id: 'idle_research_lab',
      ruleId: 'idle_research',
      category: 'reminder',
      severity: 'warning',
      icon: 'icons/facilities/research_lab_large.jpg',
      iconTooltip: 'Research Lab',
      badgeText: 'RESEARCH',
      title: 'Empire Research Lab Idle',
      message: `🔬 Research Lab Idle: No technology research is currently in progress across your empire! Laboratory uptime is sitting idle. Start your next tech upgrade to keep progression moving.${suggestionTip}`,
      shortMessage: 'Research Lab is idle!',
      actionLabel: 'Open Research',
      actionUrl: '/game/index.php?page=ingame&component=research',
      timestamp: Date.now()
    }];
  } catch (err: any) {
    if (!err?.message?.includes('Extension context invalidated')) {
      console.error('OGame Nexus: Error evaluating idle research', err);
    }
    return [];
  }
}
