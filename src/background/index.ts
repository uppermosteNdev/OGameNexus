import { db, getTacticalNotesForUniverse, saveTacticalNoteToDB, deleteTacticalNoteFromDB, TacticalNote, AnomalyDebrisReceipt } from "../db";
import { parsePlayerDataXml, parseServerDataXml } from "./scrapers";
import { LIFEFORM_BUILDING_DATA, SHIP_DATA } from "../db/staticData";
import { LIFEFORM_TECH_DATA, getLfTech, isLifeformBuilding } from "../db/lifeformTechData";
import { AMORTIZATION_TABLE, calculateEmpireProduction, calculateMSU, DEFAULT_RATES, Cost, getPlanetTechMultiplier } from "../utils/amortizationCalc";
import { calculateDynamicLifeformOverview } from "../db/lfBonusOverviewEngine";
import { sanitizeActiveItem } from "../utils/items";
import { getOverwatchApiUrl, fetchOverwatch, getStoredOverwatchConfig } from "../utils/overwatchApi";
import { cleanUniverseId, isSameUniverse } from "../utils/universe";
import { calculateAccountResearchScore } from "../utils/researchTimeCalc";
import { fetchPlayerHighscores } from "../utils/ogameHighscores";
import { recalculateAnomalyMissionLosses, recalculateAllAnomalyMissionLosses } from "../utils/anomalyCombat";
import { IS_EXTENSION_DISABLED } from "../config/killSwitch";

// Auto-heal / normalize any legacy or uncleaned debris harvests on extension launch
async function normalizeDebrisHarvestsOnStartup() {
    try {
        const all = await db.debrisHarvests.toArray();
        if (all.length === 0) return;
        const accounts = await db.accounts.toArray();
        const universeAccountMap = new Map<string, any[]>();
        accounts.forEach(acc => {
            const u = cleanUniverseId(acc.universe || '');
            if (!universeAccountMap.has(u)) universeAccountMap.set(u, []);
            universeAccountMap.get(u)!.push(acc);
        });
        const updates: any[] = [];
        const oldKeysToDelete: string[] = [];

        for (const h of all) {
            const cleanUni = cleanUniverseId(h.universe);
            const strPid = String(h.playerId || '').trim();
            const cleanKey = `${cleanUni}_${h.messageId}`;
            
            let needsUpdate = false;
            if (h.universe !== cleanUni || String(h.playerId) !== strPid) {
                needsUpdate = true;
            }
            if (h.harvestKey && h.harvestKey !== cleanKey) {
                oldKeysToDelete.push(h.harvestKey);
                needsUpdate = true;
            }
            if (needsUpdate) {
                updates.push({
                    ...h,
                    universe: cleanUni,
                    playerId: strPid,
                    harvestKey: cleanKey
                });
            }
        }

        if (updates.length > 0) {
            await db.debrisHarvests.bulkPut(updates);
            if (oldKeysToDelete.length > 0) {
                await db.debrisHarvests.bulkDelete(oldKeysToDelete);
            }
            console.log(`OGame Nexus: Normalized ${updates.length} debris harvests to standard universe format.`);
        }
    } catch (e) {
        console.warn('OGame Nexus: Note during debris normalization', e);
    }
}
if (!IS_EXTENSION_DISABLED) {
    normalizeDebrisHarvestsOnStartup();
}

// Auto-heal / normalize any legacy or uncleaned spied planets on extension launch
async function normalizeSpiedPlanetsOnStartup() {
    try {
        const all = await db.spiedPlanets.toArray();
        if (all.length === 0) return;
        const accounts = await db.accounts.toArray();
        const universeAccountMap = new Map<string, any[]>();
        accounts.forEach(acc => {
            const u = cleanUniverseId(acc.universe || '');
            if (!universeAccountMap.has(u)) universeAccountMap.set(u, []);
            universeAccountMap.get(u)!.push(acc);
        });
        const updates: any[] = [];
        const oldKeysToDelete: string[] = [];

        for (const p of all) {
            const cleanUni = cleanUniverseId(p.universe);
            const candidates = universeAccountMap.get(cleanUni) || [];
            let resolvedPid: string | undefined = p.userPlayerId;
            if (!resolvedPid || resolvedPid === 'unknown') {
                if (candidates.length === 1) {
                    resolvedPid = candidates[0].playerId;
                } else if (candidates.length > 1) {
                    // When multiple accounts exist on this universe, NEVER arbitrarily assign
                    // unassigned targets to one account, as this causes cross-account target leakage!
                    resolvedPid = undefined;
                }
            }

            const cleanKey = resolvedPid
                ? `${cleanUni}_${resolvedPid}_${p.planetId || p.coords}`
                : `${cleanUni}_${p.planetId || p.coords}`;

            let needsUpdate = false;
            if (p.universe !== cleanUni || (p.userPlayerId !== resolvedPid && Boolean(resolvedPid))) {
                needsUpdate = true;
            }
            if (p.planetKey && p.planetKey !== cleanKey) {
                oldKeysToDelete.push(p.planetKey);
                needsUpdate = true;
            }
            if (needsUpdate) {
                updates.push({
                    ...p,
                    universe: cleanUni,
                    userPlayerId: resolvedPid || p.userPlayerId,
                    planetKey: cleanKey
                });
            }
        }

        if (updates.length > 0) {
            await db.spiedPlanets.bulkPut(updates);
            if (oldKeysToDelete.length > 0) {
                await db.spiedPlanets.bulkDelete(oldKeysToDelete);
            }
            console.log(`OGame Nexus: Normalized ${updates.length} spied planets to standard universe format.`);
        }
    } catch (e) {
        console.warn('OGame Nexus: Note during spied planets normalization', e);
    }
}
if (!IS_EXTENSION_DISABLED) {
    normalizeSpiedPlanetsOnStartup();
    recalculateAllAnomalyMissionLosses();
}

function cleanObject(obj: any) {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach(key => cleaned[key] === undefined && delete cleaned[key]);
    return cleaned;
}

const expoAveragesCache = new Map<string, { data: any; calculatedAt: number }>();
const EXPO_AVERAGES_CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL

function mergeLifeformBuildings(existing: any[], incoming: any[], activeLifeformId?: number) {
    if (activeLifeformId === 0) {
        return [];
    }

    const safeExisting = Array.isArray(existing) ? existing : [];
    const safeIncoming = Array.isArray(incoming) ? incoming : [];

    const speciesPrefix = activeLifeformId ? `1${activeLifeformId}1` : null;

    const buildingMap = new Map<number, { id: number; name?: string; level: number }>();

    safeExisting.forEach(eb => {
        if (!eb || !isLifeformBuilding(eb.id)) return;
        if (speciesPrefix && !eb.id.toString().startsWith(speciesPrefix)) return;
        
        let name = eb.name;
        if (!name) {
            const staticData = LIFEFORM_BUILDING_DATA.find(sb => sb.id === eb.id);
            if (staticData) name = staticData.name;
        }
        buildingMap.set(eb.id, { id: eb.id, name, level: eb.level });
    });

    safeIncoming.forEach(nb => {
        if (!nb || !isLifeformBuilding(nb.id)) return;
        if (speciesPrefix && !nb.id.toString().startsWith(speciesPrefix)) return;

        let name = nb.name;
        if (!name) {
            const staticData = LIFEFORM_BUILDING_DATA.find(sb => sb.id === nb.id);
            if (staticData) name = staticData.name;
        }

        const current = buildingMap.get(nb.id);
        if (current && current.level > 0 && nb.level === 0) return;
        buildingMap.set(nb.id, { id: nb.id, name: name || current?.name, level: nb.level });
    });

    return Array.from(buildingMap.values()).sort((a, b) => a.id - b.id);
}

function mergeControlCenterBuildings(existing: any[], incoming: any[]) {
    const safeExisting = Array.isArray(existing) ? existing : [];
    const safeIncoming = Array.isArray(incoming) ? incoming : [];

    const map = new Map<number, { id: number; name?: string; level: number }>();
    safeExisting.forEach(b => {
        if (!b || !b.id) return;
        map.set(Number(b.id), { id: Number(b.id), name: b.name, level: Number(b.level || 0) });
    });

    safeIncoming.forEach(b => {
        if (!b || !b.id) return;
        const id = Number(b.id);
        const cur = map.get(id);
        const newLevel = Number(b.level || 0);
        if (cur && cur.level > 0 && newLevel === 0) return;
        map.set(id, {
            id,
            name: b.name || cur?.name,
            level: Math.max(cur?.level || 0, newLevel)
        });
    });

    return Array.from(map.values()).sort((a, b) => a.id - b.id);
}

function mergeLifeformSetup(existing: any[], incoming: any[], fromEmpire: boolean = false) {
    const safeExisting = Array.isArray(existing) ? existing : [];
    const safeIncoming = Array.isArray(incoming) ? incoming : [];

    const slotMap = new Map<number, { slotNumber: number; selectedTechId: number | null; level: number }>();

    safeExisting.forEach(es => {
        if (!es) return;
        const techObj = getLfTech(es.selectedTechId);
        if (!techObj) return;
        const mappedTechId = techObj.id;
        const slotNum = es.slotNumber > 0 ? es.slotNumber : Math.floor((techObj.id - 1) / 4) + 1;
        if (slotNum >= 1 && slotNum <= 18) {
            const current = slotMap.get(slotNum);
            if (current && current.level > 0 && es.level === 0) return;
            slotMap.set(slotNum, { slotNumber: slotNum, selectedTechId: mappedTechId, level: es.level });
        }
    });

    safeIncoming.forEach(ns => {
        if (!ns) return;
        const techObj = getLfTech(ns.selectedTechId);
        if (!techObj) return;
        const mappedTechId = techObj.id;
        const slotNum = ns.slotNumber > 0 ? ns.slotNumber : Math.floor((techObj.id - 1) / 4) + 1;
        if (slotNum >= 1 && slotNum <= 18) {
            const current = slotMap.get(slotNum);
            if (current && current.level > 0 && ns.level === 0) return;
            slotMap.set(slotNum, { slotNumber: slotNum, selectedTechId: mappedTechId, level: ns.level });
        }
    });

    return Array.from(slotMap.values()).sort((a, b) => a.slotNumber - b.slotNumber);
}



async function fetchServerData(universe: string) {
    const domain = universe.includes('.') ? universe : `${universe}.ogame.gameforge.com`;
    const url = `https://${domain}/api/serverData.xml`;
    // console.log(`Background: Fetching Server Data from ${url}`);
    try {
        const response = await fetch(url);
        const xml = await response.text();
        return parseServerDataXml(xml);
    } catch (err) {
        console.error(`Background: Error fetching server data for ${universe}`, err);
        return null;
    }
}

let lastBackgroundScan = 0;
// Tracking serializing mutexes to prevent concurrent duplicate inserts
let expeditionTrackingLock: Promise<any> = Promise.resolve();
let lifeformTrackingLock: Promise<any> = Promise.resolve();
let combatTrackingLock: Promise<any> = Promise.resolve();
async function computeFastHash(str: string): Promise<string> {
    try {
        const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return (hash >>> 0).toString(16);
    }
}

export async function autoSyncEmpireToOverwatch(playerId: string, force = false) {
    try {
        const account = await db.accounts.get(playerId) || (typeof playerId === 'string' ? await db.accounts.get(Number(playerId)) : await db.accounts.get(String(playerId)));
        if (!account) return { success: false, reason: 'no_account' };

        const cleanUni = cleanUniverseId(account.universe);
        const pId = String(account.playerId).trim();
        const config = await getStoredOverwatchConfig(cleanUni, pId);

        const syncKey = `last_overwatch_empire_sync_${cleanUni}_${pId}`;
        const sharingKey = `nexus_overwatch_empire_sharing_${cleanUni}_${pId}`;
        const store = await chrome.storage.local.get([syncKey, 'last_overwatch_empire_sync', sharingKey, 'nexus_overwatch_empire_sharing']);

        const empireSharing = config?.empireSharing || store[sharingKey] || store.nexus_overwatch_empire_sharing || {
            acknowledged: false,
            mines: true,
            facilities: true,
            research: true,
            lifeformBuildings: true,
            lifeformBonuses: true,
            lifeformResearchSetups: true,
            fleet: true,
            defence: true,
        };

        if (!config || !config.allianceId || !config.authToken || config.permissions?.shareEmpire === false || empireSharing.acknowledged !== true) {
            return { success: false, reason: 'unauthorized_or_disabled' };
        }

        // STRICT MULTI-ACCOUNT & UNIVERSE ISOLATION:
        // Never sync an account to an Overwatch grid belonging to a different universe or a different player!
        if (config.universeId && account.universe && cleanUniverseId(config.universeId) !== cleanUniverseId(account.universe)) {
            console.warn(`OGame Nexus: Skipping empire sync for ${account.playerName} (${account.playerId}) - universe mismatch with active Overwatch grid (${account.universe} vs ${config.universeId})`);
            return { success: false, reason: 'universe_mismatch' };
        }
        if (config.playerId && String(account.playerId) !== String(config.playerId)) {
            console.warn(`OGame Nexus: Skipping empire sync for ${account.playerName} (${account.playerId}) - player ID mismatch with active Overwatch grid member (${account.playerId} vs ${config.playerId})`);
            return { success: false, reason: 'player_id_mismatch' };
        }

        let planets = await db.planets.where('playerId').equals(playerId).toArray();
        if (!planets || planets.length === 0) {
            planets = await db.planets.where('playerId').equals(String(playerId)).toArray();
        }
        if (!planets || planets.length === 0) {
            planets = await db.planets.where('playerId').equals(Number(playerId)).toArray();
        }
        if (!planets || planets.length === 0) return { success: false, reason: 'no_planets' };

        const planetEntities = planets.filter(p => p.type === 'planet');
        const moonEntities = planets.filter(p => p.type === 'moon');

        const shareMines = empireSharing.mines !== false;
        const shareFacilities = empireSharing.facilities !== false;
        const shareResearch = empireSharing.research !== false;
        const shareLfBuildings = empireSharing.lifeformBuildings !== false;
        const shareLfBonuses = empireSharing.lifeformBonuses !== false;
        const shareLfSetups = empireSharing.lifeformResearchSetups !== false;
        const shareFleet = empireSharing.fleet !== false;
        const shareDefence = empireSharing.defence !== false;

        let totalMines = 0;
        let metalMineSum = 0;
        let crystalMineSum = 0;
        let deutMineSum = 0;
        let totalShips = 0;
        let totalFleetMsu = 0;
        let totalMetalHourly = 0;
        let totalCrystalHourly = 0;
        let totalDeutHourly = 0;

        const SHIP_MSU_COSTS: Record<number, number> = {
            202: 2000 + 2000 * 1.5, // 5,000 (Small Cargo)
            203: 6000 + 6000 * 1.5, // 15,000 (Large Cargo)
            204: 3000 + 1000 * 1.5, // 4,500 (Light Fighter)
            205: 6000 + 4000 * 1.5, // 12,000 (Heavy Fighter)
            206: 20000 + 7000 * 1.5 + 2000 * 3, // 36,500 (Cruiser)
            207: 45000 + 15000 * 1.5, // 67,500 (Battleship)
            208: 10000 + 20000 * 1.5 + 10000 * 3, // 70,000 (Colony Ship)
            209: 10000 + 6000 * 1.5 + 2000 * 3, // 25,000 (Recycler)
            210: 0 + 1000 * 1.5, // 1,500 (Espionage Probe)
            211: 50000 + 25000 * 1.5 + 15000 * 3, // 132,500 (Bomber)
            212: 0 + 2000 * 1.5 + 500 * 3, // 4,500 (Solar Satellite)
            213: 60000 + 50000 * 1.5 + 15000 * 3, // 180,000 (Destroyer)
            214: 5000000 + 4000000 * 1.5 + 1000000 * 3, // 14,000,000 (Deathstar)
            215: 30000 + 40000 * 1.5 + 15000 * 3, // 135,000 (Battlecruiser)
            217: 2000 + 2000 * 1.5 + 1000 * 3, // 8,000 (Crawler)
            218: 85000 + 55000 * 1.5 + 20000 * 3, // 227,500 (Reaper)
            219: 8000 + 15000 * 1.5 + 8000 * 3, // 54,500 (Pathfinder)
        };

        if (shareMines) {
            planetEntities.forEach(p => {
                const mm = p.metalMine || 0;
                const cm = p.crystalMine || 0;
                const dm = p.deuteriumMine || 0;
                totalMines += (mm + cm + dm);
                metalMineSum += mm;
                crystalMineSum += cm;
                deutMineSum += dm;

                if (p.production) {
                    totalMetalHourly += Math.floor(p.production.metal || 0);
                    totalCrystalHourly += Math.floor(p.production.crystal || 0);
                    totalDeutHourly += Math.floor(p.production.deuterium || 0);
                }
            });

            // Always calculate comprehensive production via amortization engine
            // (including full Lifeform tech tree setups, Crawlers, Plasma, Officers, and Boosters)
            try {
                const calcResults = calculateEmpireProduction({ account, planets });
                if (calcResults && calcResults.planets) {
                    let calcMetalHourly = 0;
                    let calcCrystalHourly = 0;
                    let calcDeutHourly = 0;
                    planetEntities.forEach(p => {
                        const prod = calcResults.planets[p.id]?.total;
                        if (prod) {
                            calcMetalHourly += Math.floor(prod.metal || 0);
                            calcCrystalHourly += Math.floor(prod.crystal || 0);
                            calcDeutHourly += Math.floor(prod.deuterium || 0);
                            if (!p.production || ((prod.metal || 0) > (p.production.metal || 0))) {
                                p.production = {
                                    metal: Math.floor(prod.metal || 0),
                                    crystal: Math.floor(prod.crystal || 0),
                                    deuterium: Math.floor(prod.deuterium || 0),
                                    lastUpdated: Date.now()
                                };
                            }
                        }
                    });
                    totalMetalHourly = Math.max(totalMetalHourly, calcMetalHourly);
                    totalCrystalHourly = Math.max(totalCrystalHourly, calcCrystalHourly);
                    totalDeutHourly = Math.max(totalDeutHourly, calcDeutHourly);
                }
            } catch (err) {
                console.warn("OGame Nexus: Error calculating empire production in autoSyncEmpireToOverwatch:", err);
            }
        }

        if (shareFleet) {
            planets.forEach(p => {
                if (p.ships) {
                    Object.entries(p.ships).forEach(([shipId, count]: [string, any]) => {
                        const c = Number(count) || 0;
                        if (c > 0) {
                            totalShips += c;
                            const idNum = Number(shipId);
                            const msuPerShip = SHIP_MSU_COSTS[idNum] || 0;
                            totalFleetMsu += c * msuPerShip;
                        }
                    });
                }
            });
        }

        const pCount = planetEntities.length;
        const avgMetalMine = (shareMines && pCount > 0) ? parseFloat((metalMineSum / pCount).toFixed(1)) : 0;
        const avgCrystalMine = (shareMines && pCount > 0) ? parseFloat((crystalMineSum / pCount).toFixed(1)) : 0;
        const avgDeutMine = (shareMines && pCount > 0) ? parseFloat((deutMineSum / pCount).toFixed(1)) : 0;

        const cleanPlanets = planets.map(p => ({
            id: p.id,
            name: p.name,
            coords: p.coords,
            type: p.type,
            imgUrl: p.imgUrl,
            fieldsUsed: p.fieldsUsed,
            fieldsTotal: p.fieldsTotal,
            tempMin: p.tempMin,
            tempMax: p.tempMax,
            metalMine: shareMines ? p.metalMine : 0,
            crystalMine: shareMines ? p.crystalMine : 0,
            deuteriumMine: shareMines ? p.deuteriumMine : 0,
            solarPlant: shareMines ? p.solarPlant : 0,
            fusionReactor: shareMines ? p.fusionReactor : 0,
            solarSatellites: shareMines ? p.solarSatellites : 0,
            crawlers: shareMines ? p.crawlers : 0,
            metalStorage: shareMines ? p.metalStorage : 0,
            crystalStorage: shareMines ? p.crystalStorage : 0,
            deuteriumStorage: shareMines ? p.deuteriumStorage : 0,
            roboticsFactory: shareFacilities ? p.roboticsFactory : 0,
            shipyard: shareFacilities ? p.shipyard : 0,
            researchLab: shareFacilities ? p.researchLab : 0,
            allianceDepot: shareFacilities ? p.allianceDepot : 0,
            missileSilo: shareFacilities ? p.missileSilo : 0,
            naniteFactory: shareFacilities ? p.naniteFactory : 0,
            terraformer: shareFacilities ? p.terraformer : 0,
            spaceDock: shareFacilities ? p.spaceDock : 0,
            lunarBase: shareFacilities ? p.lunarBase : 0,
            sensorPhalanx: shareFacilities ? p.sensorPhalanx : 0,
            jumpGate: shareFacilities ? p.jumpGate : 0,
            lifeformId: p.lifeformId,
            lifeformSetup: shareLfSetups ? (p.lifeformSetup || []) : [],
            lifeformBuildings: shareLfBuildings ? (p.lifeformBuildings || []) : [],
            ships: shareFleet ? (p.ships || {}) : {},
            defenses: shareDefence ? (p.defenses || {}) : {},
            production: shareMines ? p.production : (p.production ? { metal: 0, crystal: 0, deuterium: 0, lastUpdated: p.production.lastUpdated } : undefined)
        }));

        const empirePayload = {
            planets: cleanPlanets,
            researches: shareResearch ? (account.researches || []) : [],
            lifeformExperience: shareLfBonuses ? (account.lifeformExperience || []) : []
        };

        const dataHash = await computeFastHash(JSON.stringify({
            totalMines,
            totalShips,
            totalFleetMsu,
            totalMetalHourly,
            totalCrystalHourly,
            totalDeutHourly,
            pCount,
            avatarUrl: account.avatarUrl || null,
            cleanPlanets,
            researches: empirePayload.researches,
            lifeformExperience: empirePayload.lifeformExperience,
            empireSharing
        }));

        const lastSync = store[syncKey] || store.last_overwatch_empire_sync;
        const now = Date.now();
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 hours minimum delay between automatic empire syncs when data is unchanged
        const MIN_CHANGE_INTERVAL_MS = 30 * 1000; // 30 seconds debounce between automatic empire syncs when data has changed

        // Intelligent auto-sync throttle:
        // 1. Force sync (manual button click or critical action) always proceeds immediately.
        // 2. If no previous sync exists, proceed immediately.
        // 3. If data hash has CHANGED: allow sync after 30s debounce to avoid spamming while actively navigating pages.
        // 4. If data hash is UNCHANGED: throttle to 2 hours as a background heartbeat refresh.
        if (!force && lastSync?.timestamp) {
            const timeSinceLast = now - lastSync.timestamp;
            const isDataUnchanged = Boolean(lastSync.hash && lastSync.hash === dataHash);

            if (isDataUnchanged && timeSinceLast < TWO_HOURS_MS) {
                return { success: true, skipped: true, reason: 'unchanged_throttled_2h' };
            }
            if (!isDataUnchanged && timeSinceLast < MIN_CHANGE_INTERVAL_MS) {
                return { success: true, skipped: true, reason: 'debounced_30s' };
            }
        }

        let resolvedTotalScore = account.score || 0;
        let resolvedEconomyScore = account.economyScore || 0;
        let resolvedMilitaryScore = account.militaryScore || 0;
        let resolvedShipCount = account.shipCount || 0;

        const uId = cleanUniverseId(account.universe || config.universeId);
        if (uId) {
            try {
                const hs = await fetchPlayerHighscores(uId, playerId, true);
                const updates: any = {};
                if (hs.totalScore && hs.totalScore > 0 && hs.totalScore !== resolvedTotalScore) {
                    resolvedTotalScore = hs.totalScore;
                    updates.score = resolvedTotalScore;
                    if (hs.totalRank) updates.rank = hs.totalRank;
                }
                if (hs.economyScore && hs.economyScore > 0 && hs.economyScore !== resolvedEconomyScore) {
                    resolvedEconomyScore = hs.economyScore;
                    updates.economyScore = resolvedEconomyScore;
                    if (hs.economyRank) updates.economyRank = hs.economyRank;
                }
                if (hs.militaryScore && hs.militaryScore > 0 && hs.militaryScore !== resolvedMilitaryScore) {
                    resolvedMilitaryScore = hs.militaryScore;
                    updates.militaryScore = resolvedMilitaryScore;
                    if (hs.militaryRank) updates.militaryRank = hs.militaryRank;
                }
                if (hs.ships && hs.ships > 0 && hs.ships !== resolvedShipCount) {
                    resolvedShipCount = hs.ships;
                    updates.shipCount = resolvedShipCount;
                }
                if (Object.keys(updates).length > 0) {
                    await db.accounts.update(account.playerId, updates).catch(() => {});
                }
            } catch (e) {}
        }

        const calculatedResearchScore = calculateAccountResearchScore(account.researches || []);
        const resolvedResearchScore = Math.max(account.researchScore || 0, calculatedResearchScore);
        if (resolvedResearchScore > (account.researchScore || 0)) {
            await db.accounts.update(account.playerId, { researchScore: resolvedResearchScore }).catch(() => {});
        }

        const payload = {
            playerId: playerId,
            playerName: account.playerName || (account as any).name || 'Commander',
            avatarUrl: account.avatarUrl || null,
            playerClass: account.playerClass,
            allianceClass: account.allianceClass,
            totalScore: resolvedTotalScore,
            economyScore: shareMines ? resolvedEconomyScore : 0,
            militaryScore: shareFleet ? resolvedMilitaryScore : 0,
            researchScore: shareResearch ? resolvedResearchScore : 0,
            summary: {
                planetCount: pCount,
                moonCount: moonEntities.length,
                totalMines,
                totalShips,
                totalFleetMsu,
                avgMetalMine,
                avgCrystalMine,
                avgDeutMine,
                totalMetalHourly,
                totalCrystalHourly,
                totalDeutHourly
            },
            dataHash,
            empire: empirePayload
        };

        const apiUrl = await getOverwatchApiUrl();
        const res = await fetchOverwatch(`${apiUrl}/api/v1/overwatch/empire/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.authToken}`,
            },
            body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (res.ok && result.success) {
            await chrome.storage.local.set({
                [syncKey]: { timestamp: now, hash: dataHash },
                last_overwatch_empire_sync: { timestamp: now, hash: dataHash }
            });
        }
        return { success: res.ok, result };
    } catch (err: any) {
        console.warn("OGame Nexus: Error auto-syncing empire to Overwatch:", err);
        return { success: false, error: err?.message };
    }
}

async function syncData(data: any) {
    const { account, planets, overview, supplies, facilities, production, activePlanetId, lifeformId, researches, lifeformSetup, lifeformExperience, lifeformBuildings, empire } = data;
    if (account) {
        // Merge incoming account data with potentially existing stats from overview
        const existing = await db.accounts.get(account.playerId);

        // Security: Standard Research levels can only go up. Compare and keep max.
        let mergedResearches = existing?.researches || [];
        if (researches && researches.length > 0) {
            const newResearches = [...mergedResearches];
            researches.forEach((nr: { id: number, level: number }) => {
                const idx = newResearches.findIndex(r => r.id === nr.id);
                if (idx >= 0) {
                    newResearches[idx].level = Math.max(newResearches[idx].level, nr.level);
                } else if (nr.level > 0) {
                    newResearches.push(nr);
                }
            });
            mergedResearches = newResearches;
        }

        // Fetch Server Data if needed (generic based on universe field)
        let serverData = {};
        if (account.universe) {
            const scraped = await fetchServerData(account.universe);
            if (scraped) serverData = scraped;
        }

        let rawLfExp = (lifeformExperience && (Array.isArray(lifeformExperience) ? lifeformExperience.length > 0 : Object.keys(lifeformExperience).length > 0)) 
            ? lifeformExperience 
            : existing?.lifeformExperience;
        let mergedLifeformExp: any[] = [];
        if (Array.isArray(rawLfExp)) {
            mergedLifeformExp = rawLfExp.map((s: any) => ({
                id: Number(s.id),
                lifeformId: Number(s.lifeformId || (s.id > 700 ? s.id - 700 : s.id)),
                level: Number(s.level || 0),
                bonus: Number(s.bonus || 0),
                currentExp: Number(s.currentExp !== undefined ? s.currentExp : (s.xp || 0)),
                nextLevelExp: Number(s.nextLevelExp !== undefined ? s.nextLevelExp : (s.xpToNextLevel || 100)),
                xp: Number(s.xp !== undefined ? s.xp : (s.currentExp || 0)),
                xpToNextLevel: Number(s.xpToNextLevel !== undefined ? s.xpToNextLevel : (s.nextLevelExp || 100))
            }));
        } else if (rawLfExp && typeof rawLfExp === 'object') {
            mergedLifeformExp = Object.entries(rawLfExp).map(([id, val]: [string, any]) => {
                const specId = parseInt(id);
                const lifeformId = specId > 700 ? specId - 700 : specId;
                if (typeof val === 'object' && val !== null) {
                    return { id: specId, lifeformId, ...val };
                }
                return { id: specId, lifeformId, level: Number(val) };
            });
        }

        await db.accounts.put(cleanObject({
            ...existing,
            ...account,
            ...serverData,
            ...(overview?.accountData || {}),
            researches: mergedResearches,
            activeResearch: data.activeResearch !== undefined ? data.activeResearch : (account as any)?.activeResearch ?? existing?.activeResearch,
            lifeformExperience: mergedLifeformExp,
            artifacts: (account as any).artifacts ?? existing?.artifacts,
            artifactsLastUpdated: (account as any).artifactsLastUpdated ?? existing?.artifactsLastUpdated,
            inventory: (account as any).inventory ?? existing?.inventory,
            inventoryLastUpdated: (account as any).inventoryLastUpdated ?? existing?.inventoryLastUpdated,
            lastSeen: Date.now()
        }));
    }
}

if (!IS_EXTENSION_DISABLED) {
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "OPEN_DASHBOARD") {
        (async () => {
            const playerId = message.playerId;
            const universe = message.universe;
            const cleanUni = universe ? cleanUniverseId(universe) : '';

            // 1. Update lastSeen in database for this account so it immediately becomes the most recent
            if (playerId) {
                try {
                    await db.accounts.update(playerId, { lastSeen: Date.now() });
                } catch (e) {
                    console.warn('OGame Nexus: Error updating account lastSeen on OPEN_DASHBOARD', e);
                }
            }

            // 2. Prepare query string
            const params = new URLSearchParams();
            if (message.view) params.set('view', message.view);
            if (cleanUni) params.set('universe', cleanUni);
            if (playerId) params.set('player', String(playerId));
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const targetUrl = chrome.runtime.getURL(`dashboard.html${queryString}`);

            // 3. Find if any dashboard tab is already open
            try {
                const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('dashboard.html*') });
                if (tabs && tabs.length > 0) {
                    const existingTab = tabs[0];
                    if (existingTab.id) {
                        // Switch tab to the requested account
                        await chrome.tabs.update(existingTab.id, { url: targetUrl, active: true });
                        if (existingTab.windowId) {
                            await chrome.windows.update(existingTab.windowId, { focused: true });
                        }
                        // Send direct message so open dashboard switches account instantly even without reload
                        try {
                            chrome.tabs.sendMessage(existingTab.id, {
                                type: 'SWITCH_ACCOUNT',
                                playerId,
                                universe
                            });
                        } catch {}
                        return;
                    }
                }
            } catch (err) {
                console.warn('OGame Nexus: Error querying existing dashboard tabs:', err);
            }

            // Otherwise, open a new dashboard tab
            chrome.tabs.create({ url: targetUrl });
        })();
    }

    if (message.type === "OVERWATCH_SYNC_GALAXY" || message.action === "OVERWATCH_SYNC_GALAXY") {
        (async () => {
            try {
                const config = await getStoredOverwatchConfig(message.data?.universeId, message.data?.ownPlayerId);
                if (!config || !config.allianceId || !config.authToken || config.permissions?.shareGalaxy === false) {
                    sendResponse({ success: false, reason: "unauthorized_or_sharing_disabled" });
                    return;
                }

                const apiUrl = await getOverwatchApiUrl();
                const res = await fetchOverwatch(`${apiUrl}/api/v1/galaxy/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.authToken}`,
                    },
                    body: JSON.stringify(message.data),
                });
                const result = await res.json();
                sendResponse({ success: res.ok, result });
            } catch (err: any) {
                console.warn("OGame Nexus: Failed to relay Overwatch galaxy telemetry:", err);
                sendResponse({ success: false, error: err?.message });
            }
        })();
        return true;
    }

    if (message.type === "OVERWATCH_FORCE_SYNC_EMPIRE" || message.action === "OVERWATCH_FORCE_SYNC_EMPIRE") {
        (async () => {
            try {
                const playerId = message.playerId || message.data?.playerId;
                if (!playerId) {
                    sendResponse({ success: false, error: "Missing playerId" });
                    return;
                }
                const res = await autoSyncEmpireToOverwatch(playerId, true);
                sendResponse(res);
            } catch (err: any) {
                sendResponse({ success: false, error: err?.message });
            }
        })();
        return true;
    }

    if (message.type === "OVERWATCH_AUTO_SYNC_EMPIRE" || message.action === "OVERWATCH_AUTO_SYNC_EMPIRE") {
        (async () => {
            try {
                const playerId = message.playerId || message.data?.playerId;
                if (!playerId) {
                    sendResponse({ success: false, error: "Missing playerId" });
                    return;
                }
                const res = await autoSyncEmpireToOverwatch(playerId, false);
                sendResponse(res);
            } catch (err: any) {
                sendResponse({ success: false, error: err?.message });
            }
        })();
        return true;
    }

    if (message.type === "UPDATE_FLYING_RESOURCES") {
        const { playerId, flyingResources } = message;
        (async () => {
            try {
                const existing = await db.accounts.get(playerId);
                if (existing) {
                    await db.accounts.update(playerId, { flyingResources });
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: "Account not found" });
                }
            } catch (err) {
                console.error("OGame Nexus: Error in UPDATE_FLYING_RESOURCES", err);
                sendResponse({ success: false });
            }
        })();
        return true;
    }

    if (message.type === "UPDATE_PLAYER_INVENTORY") {
        const { playerId, inventory, timestamp } = message;
        (async () => {
            try {
                const existing = await db.accounts.get(playerId);
                if (existing) {
                    await db.accounts.update(playerId, {
                        inventory,
                        inventoryLastUpdated: timestamp || Date.now()
                    });
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: "Account not found" });
                }
            } catch (err) {
                console.error("OGame Nexus: Error in UPDATE_PLAYER_INVENTORY", err);
                sendResponse({ success: false });
            }
        })();
        return true;
    }

    if (message.type === "UPDATE_PRODUCTION_QUEUE") {
        const { playerId, productionQueue } = message;
        (async () => {
            try {
                const existing = await db.accounts.get(playerId);
                if (existing) {
                    await db.accounts.update(playerId, {
                        productionQueue
                    });
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: "Account not found" });
                }
            } catch (err) {
                console.error("OGame Nexus: Error in UPDATE_PRODUCTION_QUEUE", err);
                sendResponse({ success: false });
            }
        })();
        return true;
    }

    if (message.type === "GET_PLAYER_INVENTORY") {
        const { playerId } = message;
        (async () => {
            try {
                const account = await db.accounts.get(playerId);
                sendResponse({ success: true, inventory: account?.inventory || [] });
            } catch (err) {
                console.error("OGame Nexus: Error in GET_PLAYER_INVENTORY", err);
                sendResponse({ success: false, inventory: [] });
            }
        })();
        return true;
    }

    if (message.type === "SYNC_SESSION") {
        const { account, planets, overview, supplies, facilities, controlCenterBuildings, production, activePlanetId, lifeformId, researches, lifeformSetup, lifeformExperience, lifeformBuildings, empire } = message.data;
        const syncData = async () => {
            try {
                if (account) {
                    // Merge incoming account data with potentially existing stats from overview
                    const existing = await db.accounts.get(account.playerId);

                    // Security: Standard Research levels can only go up. Compare and keep max.
                    let mergedResearches = existing?.researches || [];
                    if (researches && researches.length > 0) {
                        const newResearches = [...mergedResearches];
                        researches.forEach((nr: { id: number, level: number }) => {
                            const idx = newResearches.findIndex(r => r.id === nr.id);
                            if (idx >= 0) {
                                newResearches[idx].level = Math.max(newResearches[idx].level, nr.level);
                            } else if (nr.level > 0) {
                                newResearches.push(nr);
                            }
                        });
                        mergedResearches = newResearches;
                    }

                    // Fetch Server Data if needed (generic based on universe field)
                    let serverData = {};
                    if (account.universe) {
                        const scraped = await fetchServerData(account.universe);
                        if (scraped) serverData = scraped;
                    }

                    let rawLfExp = (lifeformExperience && (Array.isArray(lifeformExperience) ? lifeformExperience.length > 0 : Object.keys(lifeformExperience).length > 0)) 
                        ? lifeformExperience 
                        : existing?.lifeformExperience;
                    let mergedLifeformExp: any[] = [];
                    if (Array.isArray(rawLfExp)) {
                        mergedLifeformExp = rawLfExp.map((s: any) => ({
                            id: Number(s.id),
                            lifeformId: Number(s.lifeformId || (s.id > 700 ? s.id - 700 : s.id)),
                            level: Number(s.level || 0),
                            bonus: Number(s.bonus || 0),
                            currentExp: Number(s.currentExp !== undefined ? s.currentExp : (s.xp || 0)),
                            nextLevelExp: Number(s.nextLevelExp !== undefined ? s.nextLevelExp : (s.xpToNextLevel || 100)),
                            xp: Number(s.xp !== undefined ? s.xp : (s.currentExp || 0)),
                            xpToNextLevel: Number(s.xpToNextLevel !== undefined ? s.xpToNextLevel : (s.nextLevelExp || 100))
                        }));
                    } else if (rawLfExp && typeof rawLfExp === 'object') {
                        mergedLifeformExp = Object.entries(rawLfExp).map(([id, val]: [string, any]) => {
                            const specId = parseInt(id);
                            const lifeformId = specId > 700 ? specId - 700 : specId;
                            if (typeof val === 'object' && val !== null) {
                                return { id: specId, lifeformId, ...val };
                            }
                            return { id: specId, lifeformId, level: Number(val) };
                        });
                    }

                    await db.accounts.put(cleanObject({
                        ...existing,
                        ...account,
                        ...serverData,
                        ...(overview?.accountData || {}),
                        researches: mergedResearches,
                        activeResearch: message.data.activeResearch !== undefined ? message.data.activeResearch : (account as any)?.activeResearch ?? existing?.activeResearch,
                        lifeformExperience: mergedLifeformExp,
                        artifacts: (account as any).artifacts ?? existing?.artifacts,
                        artifactsLastUpdated: (account as any).artifactsLastUpdated ?? existing?.artifactsLastUpdated,
                        inventory: (account as any).inventory ?? existing?.inventory,
                        inventoryLastUpdated: (account as any).inventoryLastUpdated ?? existing?.inventoryLastUpdated,
                        lastSeen: Date.now()
                    }));
                }

                if (planets && planets.length > 0 && account?.playerId) {
                    await db.transaction('rw', [db.planets, db.accounts], async () => {
                        const existingPlanets = await db.planets.where('playerId').equals(account.playerId).toArray();

                        // Purge any existing invalid/placeholder planets (coords '0:0:0' or empty coords) from the database
                        const invalidPlanetIds = existingPlanets.filter(p => !p.coords || p.coords === "0:0:0" || p.coords.includes("0:0:0")).map(p => p.id);
                        if (invalidPlanetIds.length > 0) {
                            console.log(`OGame Nexus: Purging invalid planets from database: ${invalidPlanetIds.join(', ')}`);
                            await db.planets.bulkDelete(invalidPlanetIds);
                            // Remove them from local copy to keep tracking list clean
                            for (let i = existingPlanets.length - 1; i >= 0; i--) {
                                if (invalidPlanetIds.includes(existingPlanets[i].id)) {
                                    existingPlanets.splice(i, 1);
                                }
                            }
                        }

                        for (const p of planets) {
                            const existing = existingPlanets.find(ep => ep.id === p.id);
                            const isMainPlanet = activePlanetId === p.id;
                            
                            let empirePlanet: any = undefined;
                            if (empire && empire.planets) {
                                if (Array.isArray(empire.planets)) {
                                    empirePlanet = empire.planets.find((ep: any) => String(ep.id) === String(p.id));
                                } else if (typeof empire.planets === 'object') {
                                    empirePlanet = empire.planets[p.id] || Object.values(empire.planets).find((ep: any) => ep && String((ep as any).id) === String(p.id));
                                }
                            }

                            const resolvedLifeformId = isMainPlanet
                                ? (lifeformId ?? overview?.planetData?.lifeformId ?? existing?.lifeformId)
                                : existing?.lifeformId;

                            const resolvedName = (p.name && p.name !== 'Planet' && p.name !== 'Moon')
                                ? p.name
                                : (empirePlanet?.name && empirePlanet.name !== 'Planet' && empirePlanet.name !== 'Moon'
                                    ? empirePlanet.name
                                    : (existing?.name || p.name || (p.type === 'moon' ? 'Moon' : 'Planet')));

                            const resolvedActiveItems = ((): any[] => {
                                const now = Date.now();
                                const filterValid = (arr: any[] | undefined) => Array.isArray(arr) ? arr.filter(i => !i.expiryTimestamp || i.expiryTimestamp > now) : [];

                                let items: any[] = [];
                                if (Array.isArray(p.activeItems)) {
                                    items = filterValid(p.activeItems);
                                } else if (isMainPlanet && Array.isArray(overview?.planetData?.activeItems)) {
                                    items = filterValid(overview.planetData.activeItems);
                                } else if (Array.isArray(empirePlanet?.activeItems)) {
                                    items = filterValid(empirePlanet.activeItems);
                                } else if (Array.isArray(existing?.activeItems)) {
                                    items = filterValid(existing.activeItems);
                                }

                                // Enrich active items with iconUrl & rarityClass from overview activeItemsMap (parsed from overview active items bar HTML)
                                const activeItemsMap = overview?.activeItemsMap || overview?.planetData?.activeItemsMap;
                                const serverUrl = account?.serverUrl || '';
                                if (activeItemsMap && Array.isArray(items)) {
                                    items = items.map(item => {
                                        const uuid = item.itemUuid || item.ref || item.id;
                                        if (uuid && activeItemsMap[uuid]) {
                                            const info = activeItemsMap[uuid];
                                            const fullImgUrl = info.iconUrl.startsWith('http') ? info.iconUrl : (serverUrl ? `${serverUrl.replace(/\/$/, '')}${info.iconUrl}` : info.iconUrl);
                                            return {
                                                ...item,
                                                iconUrl: fullImgUrl,
                                                rarityClass: info.rarityClass || (item.rarity ? `r_${item.rarity}` : 'r_common')
                                            };
                                        }
                                        return item;
                                    });
                                }

                                // Deduplicate items of same type on the planet (keeping higher bonus / later expiry)
                                const itemMap = new Map<string, any>();
                                items.forEach(rawItem => {
                                    const item = sanitizeActiveItem(rawItem);
                                    const title = (item.title || item.name || '').toLowerCase();
                                    let key = item.ref || item.itemUuid || item.id || title;
                                    if (title.includes('expedition resource booster')) {
                                        key = 'expedition_resource_booster';
                                    }
                                    const existingItem = itemMap.get(key);
                                    if (!existingItem || (item.bonus || 0) > (existingItem.bonus || 0) || ((item.bonus || 0) === (existingItem.bonus || 0) && (item.expiryTimestamp || 0) > (existingItem.expiryTimestamp || 0))) {
                                        itemMap.set(key, item);
                                    }
                                });

                                return Array.from(itemMap.values());
                            })();

                            const safeFacilities = Array.isArray(facilities) ? facilities : undefined;
                            const safeControlCenterBuildings = Array.isArray(controlCenterBuildings) ? controlCenterBuildings : undefined;

                            const updateData: any = cleanObject({
                                ...p,
                                ...empirePlanet,
                                playerId: account.playerId,
                                name: resolvedName,
                                activeItems: resolvedActiveItems,
                                resources: empirePlanet?.resources || existing?.resources,
                                productionSettings: (isMainPlanet && production?.productionSettings) ? production.productionSettings : (empirePlanet?.productionSettings || existing?.productionSettings),
                                ...(isMainPlanet ? {
                                    ...(overview?.planetData || {}),
                                    ...supplies,
                                    name: resolvedName,
                                    activeItems: resolvedActiveItems,
                                    ...(safeFacilities ? {
                                        facilities: safeFacilities,
                                        // Also map array back to individual fields for compatibility
                                        roboticsFactory: safeFacilities.find((f: any) => f.id === 14)?.level,
                                        shipyard: safeFacilities.find((f: any) => f.id === 21)?.level,
                                        researchLab: safeFacilities.find((f: any) => f.id === 31)?.level,
                                        allianceDepot: safeFacilities.find((f: any) => f.id === 34)?.level,
                                        missileSilo: safeFacilities.find((f: any) => f.id === 44)?.level,
                                        naniteFactory: safeFacilities.find((f: any) => f.id === 15)?.level,
                                        terraformer: safeFacilities.find((f: any) => f.id === 33)?.level,
                                        spaceDock: safeFacilities.find((f: any) => f.id === 36)?.level,
                                        lunarBase: safeFacilities.find((f: any) => f.id === 41)?.level,
                                        sensorPhalanx: safeFacilities.find((f: any) => f.id === 42)?.level,
                                        jumpGate: safeFacilities.find((f: any) => f.id === 43)?.level,
                                        iaScanner: safeFacilities.find((f: any) => f.id === 45)?.level ?? empirePlanet?.iaScanner ?? existing?.iaScanner
                                    } : {
                                        facilities: empirePlanet?.facilities || existing?.facilities,
                                        iaScanner: empirePlanet?.iaScanner ?? existing?.iaScanner
                                    }),
                                    controlCenterBuildings: safeControlCenterBuildings
                                        ? mergeControlCenterBuildings(empirePlanet?.controlCenterBuildings || existing?.controlCenterBuildings || [], safeControlCenterBuildings)
                                        : (empirePlanet?.controlCenterBuildings ?? existing?.controlCenterBuildings),
                                    crawlers: supplies?.crawlers !== undefined ? supplies.crawlers : (empirePlanet?.crawlers !== undefined ? empirePlanet.crawlers : (empirePlanet?.ships?.[217] ?? (empirePlanet?.ships as any)?.[`217`] ?? existing?.ships?.[217] ?? (existing?.ships as any)?.[`217`] ?? existing?.crawlers ?? 0)),
                                    lifeformId: resolvedLifeformId,
                                    ships: (empirePlanet?.ships && typeof empirePlanet.ships === 'object' && Object.keys(empirePlanet.ships).length > 0) ? empirePlanet.ships : existing?.ships,
                                    defenses: (empirePlanet?.defenses && typeof empirePlanet.defenses === 'object' && Object.keys(empirePlanet.defenses).length > 0) ? empirePlanet.defenses : existing?.defenses,

                                    // Security: LF Tech levels can only go up. Merge incoming with existing.
                                    lifeformSetup: mergeLifeformSetup(existing?.lifeformSetup || [], lifeformSetup || empirePlanet?.lifeformSetup || [], !lifeformSetup && !!empirePlanet?.lifeformSetup),

                                    // Merge Buildings: Keep all, update levels for those found on the page
                                    lifeformBuildings: mergeLifeformBuildings(existing?.lifeformBuildings || [], lifeformBuildings || empirePlanet?.lifeformBuildings || [], resolvedLifeformId),

                                    ...(production && (production.metal > 0 || production.crystal > 0 || production.deuterium > 0) ? {
                                        production: {
                                            metal: production.metal,
                                            crystal: production.crystal,
                                            deuterium: production.deuterium,
                                            lastUpdated: production.lastUpdated
                                        },
                                        metalCapacity: production.metalCapacity,
                                        crystalCapacity: production.crystalCapacity,
                                        deuteriumCapacity: production.deuteriumCapacity
                                    } : {})
                                } : {
                                    // Even if not the active planet, if we have empire data for it, merge it
                                    name: resolvedName,
                                    activeItems: resolvedActiveItems,
                                    lifeformId: resolvedLifeformId,
                                    crawlers: empirePlanet?.crawlers !== undefined ? empirePlanet.crawlers : (empirePlanet?.ships?.[217] ?? (empirePlanet?.ships as any)?.[`217`] ?? existing?.ships?.[217] ?? (existing?.ships as any)?.[`217`] ?? existing?.crawlers ?? 0),
                                    ships: (empirePlanet?.ships && typeof empirePlanet.ships === 'object' && Object.keys(empirePlanet.ships).length > 0) ? empirePlanet.ships : existing?.ships,
                                    defenses: (empirePlanet?.defenses && typeof empirePlanet.defenses === 'object' && Object.keys(empirePlanet.defenses).length > 0) ? empirePlanet.defenses : existing?.defenses,
                                    facilities: empirePlanet?.facilities || existing?.facilities,
                                    iaScanner: empirePlanet?.iaScanner ?? existing?.iaScanner,
                                    controlCenterBuildings: empirePlanet?.controlCenterBuildings ?? existing?.controlCenterBuildings,
                                    lifeformBuildings: mergeLifeformBuildings(existing?.lifeformBuildings || [], empirePlanet?.lifeformBuildings || [], resolvedLifeformId),
                                    lifeformSetup: mergeLifeformSetup(existing?.lifeformSetup || [], empirePlanet?.lifeformSetup || [], true),
                                })
                            });

                            if (existing) {
                                // Dirty checking to prevent duplicate planet writes
                                let isDirty = false;
                                for (const key of Object.keys(updateData)) {
                                    const val1 = updateData[key];
                                    const val2 = (existing as any)[key];
                                    if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null) {
                                        if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                                            isDirty = true;
                                            break;
                                        }
                                    } else if (val1 !== val2) {
                                        isDirty = true;
                                        break;
                                    }
                                }
                                if (isDirty) {
                                    await db.planets.update(p.id, updateData);
                                }
                            } else {
                                await db.planets.put({
                                    ...updateData,
                                    sandboxSetup: [], // Initialize new planets with empty sandbox
                                    lifeformSetup: []
                                });
                            }

                            console.log(
                                `%c[OGame Nexus Sync] Synced Planet "${resolvedName}" (${p.coords || existing?.coords}):`,
                                'color: #00f2ff; font-weight: bold; font-size: 11px;',
                                {
                                    planetId: p.id,
                                    name: resolvedName,
                                    coords: p.coords || existing?.coords,
                                    lifeformId: resolvedLifeformId,
                                    lifeformSetup: updateData.lifeformSetup,
                                    lifeformBuildings: updateData.lifeformBuildings,
                                    activeItems: resolvedActiveItems,
                                    production: updateData.production,
                                    resources: updateData.resources
                                }
                            );
                        }

                        // Fetch the fully merged and updated list of planets to compute accurate global production
                        const updatedPlanets = await db.planets.where('playerId').equals(account.playerId).toArray();
                        const updatedAccount = await db.accounts.get(account.playerId);
                        if (updatedAccount) {
                            // Expired items check: filter out any activeItems that have already expired
                            const now = Date.now();
                            for (const pl of updatedPlanets) {
                                if (pl.activeItems && pl.activeItems.length > 0) {
                                    const itemMap = new Map<string, any>();
                                    pl.activeItems.forEach(rawItem => {
                                        if (rawItem.expiryTimestamp && rawItem.expiryTimestamp <= now) return;
                                        const item = sanitizeActiveItem(rawItem);
                                        const title = (item.title || item.name || '').toLowerCase();
                                        let key = item.ref || item.itemUuid || item.id || title;
                                        if (title.includes('expedition resource booster')) {
                                            key = 'expedition_resource_booster';
                                        }
                                        const existingItem = itemMap.get(key);
                                        if (!existingItem || (item.bonus || 0) > (existingItem.bonus || 0) || ((item.bonus || 0) === (existingItem.bonus || 0) && (item.expiryTimestamp || 0) > (existingItem.expiryTimestamp || 0))) {
                                            itemMap.set(key, item);
                                        }
                                    });
                                    const sanitized = Array.from(itemMap.values());
                                    pl.activeItems = sanitized;
                                    await db.planets.update(pl.id, { activeItems: pl.activeItems });
                                }
                            }

                            // Calculate production offline using updated global database values
                            const productionResults = calculateEmpireProduction({
                                account: updatedAccount,
                                planets: updatedPlanets
                            });

                            for (const pl of updatedPlanets) {
                                const prod = productionResults.planets[pl.id]?.total;
                                if (prod) {
                                    const newMetal = Math.floor(prod.metal);
                                    const newCrystal = Math.floor(prod.crystal);
                                    const newDeuterium = Math.floor(prod.deuterium);
                                    const existingProd = pl.production;

                                    if (!existingProd ||
                                        existingProd.metal !== newMetal ||
                                        existingProd.crystal !== newCrystal ||
                                        existingProd.deuterium !== newDeuterium) {
                                        await db.planets.update(pl.id, {
                                            production: {
                                                metal: newMetal,
                                                crystal: newCrystal,
                                                deuterium: newDeuterium,
                                                lastUpdated: Date.now()
                                            }
                                        });
                                    }
                                }
                            }
                        }

                        // Handle destroyed planets - ONLY if we actually have a valid list to compare against
                        // Crucially, ONLY do this if we have the official sidebar list (isFullPlanetList)
                        if (message.data.isFullPlanetList) {
                            const visibleIds = planets.map((p: any) => p.id);
                            const destroyedIds = existingPlanets.filter(p => !visibleIds.includes(p.id)).map(p => p.id);
                            if (destroyedIds.length > 0) await db.planets.bulkDelete(destroyedIds);
                        }
                    });

                    // Auto-sync empire to Overwatch Alliance Hub (non-blocking)
                    autoSyncEmpireToOverwatch(account.playerId).catch(e => {
                        console.warn("OGame Nexus: Auto empire sync error:", e);
                    });
                }
            } catch (err) {
                console.error("OGame Nexus: Background sync error", err);
            }
        };
        syncData();
    }

    if (message.type === "TRACK_EXPEDITIONS") {
        const { expeditions, playerId } = message.data;
        (async () => {
            expeditionTrackingLock = expeditionTrackingLock.then(async () => {
                try {
                    const messageIds = expeditions.map((e: any) => e.messageId);
                    const existingExpeditions = await db.expeditions.bulkGet(messageIds);
                    const newExpeditions: any[] = [];
                    const finalResults: any[] = [];
                    const toUpdate: any[] = [];

                    expeditions.forEach((exp: any, index: number) => {
                        const existing = existingExpeditions[index];
                        if (!existing) {
                            const newEntry = { ...exp, tracked: true, playerId };
                            newExpeditions.push(newEntry);
                            finalResults.push({ ...newEntry, isNew: true });
                        } else {
                            if (!existing.resultDetails && exp.resultDetails) {
                                existing.resultDetails = exp.resultDetails;
                                toUpdate.push(existing);
                            }
                            finalResults.push({ ...existing, isNew: false });
                        }
                    });

                    if (newExpeditions.length > 0) {
                        await db.expeditions.bulkPut(newExpeditions);
                    }
                    if (toUpdate.length > 0) {
                        await db.expeditions.bulkPut(toUpdate);
                    }

                    sendResponse({ success: true, data: finalResults, newCount: newExpeditions.length });
                } catch (err) {
                    console.error("OGame Nexus: Expedition tracking error", err);
                    sendResponse({ success: false, error: String(err) });
                }
            }).catch(err => {
                console.error("OGame Nexus: Expedition lock error", err);
                sendResponse({ success: false, error: String(err) });
            });
            await expeditionTrackingLock;
        })();
        return true;
    }

    if (message.type === "GET_TODAY_EXPEDITION_STATS") {
        const playerId = String(message.data.playerId).trim();
        (async () => {
            try {
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

                const [todayExpeditions, todayLifeforms] = await Promise.all([
                    db.expeditions
                        .where('timestamp')
                        .aboveOrEqual(startOfDay)
                        .filter(exp => String(exp.playerId).trim() === playerId)
                        .toArray(),
                    db.lifeformDiscoveries
                        .where('timestamp')
                        .aboveOrEqual(startOfDay)
                        .filter(disc => String(disc.playerId).trim() === playerId)
                        .toArray()
                ]);

                const totals = { 
                    metal: 0, 
                    crystal: 0, 
                    deuterium: 0, 
                    darkMatter: 0, 
                    artifacts: 0, 
                    items: 0,
                    traders: 0,
                    delays: 0,
                    speedups: 0,
                    navigations: 0,
                    pirates: 0,
                    aliens: 0,
                    blackHoles: 0
                };
                todayExpeditions.forEach(exp => {
                    const type = (exp.result || '').toLowerCase();
                    if (type === 'resources' || type === 'ressources') {
                        totals.metal += exp.resultDetails?.metal || 0;
                        totals.crystal += exp.resultDetails?.crystal || 0;
                        totals.deuterium += exp.resultDetails?.deuterium || 0;
                    } else if (type === 'dark-matter' || type === 'darkmatter') {
                        totals.darkMatter += exp.resultDetails?.darkMatter || exp.resultDetails?.darkmatter || 0;
                    } else if (type === 'item' || type === 'items') {
                        if (Array.isArray(exp.resultDetails)) {
                            totals.items += exp.resultDetails.reduce((acc: number, i: any) => acc + (i.amount || 0), 0);
                        } else {
                            totals.items += 1;
                        }
                    } else if (type === 'trader' || type === 'merchant') {
                        totals.traders += 1;
                    } else if (type === 'delay') {
                        totals.delays += 1;
                    } else if (type === 'speedup') {
                        totals.speedups += 1;
                    } else if (type === 'navigation' || type === 'early') {
                        const details = exp.resultDetails || {};
                        const isDelay = (details.returnTimeAbsoluteIncreaseHours || 0) > 0 || (details.returnTimeMultiplier !== undefined && details.returnTimeMultiplier >= 1) || details.type === 'delay';
                        const isSpeedup = (details.returnTimeAbsoluteDecreaseHours || 0) > 0 || (details.returnTimeMultiplier !== undefined && details.returnTimeMultiplier < 1) || details.type === 'speedup';
                        if (isDelay) totals.delays += 1;
                        else if (isSpeedup) totals.speedups += 1;
                        else totals.navigations += 1;
                    } else if (type === 'combatpirates' || type === 'pirates') {
                        totals.pirates += 1;
                    } else if (type === 'combataliens' || type === 'aliens') {
                        totals.aliens += 1;
                    } else if (type === 'fleetloss' || type === 'fleetlost') {
                        totals.blackHoles += 1;
                    }
                });

                todayLifeforms.forEach(disc => {
                    if (disc.discoveryType === 'artifacts') {
                        totals.artifacts += disc.artifactsFound || 0;
                    }
                });

                sendResponse({ success: true, totals });
            } catch (err) {
                console.error("OGame Nexus: Error getting today stats", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_TODAY_COMBAT_STATS") {
        const playerId = String(message.data.playerId).trim();
        (async () => {
            try {
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

                const todayCombats = await db.combatReports
                    .where('timestamp')
                    .aboveOrEqual(startOfDay)
                    .filter(c => String(c.playerId).trim() === playerId)
                    .toArray();

                const account = await db.accounts.get(playerId);
                const playerName = account?.playerName?.toLowerCase() || '';

                const totals = { metal: 0, crystal: 0, deuterium: 0, damageDealt: 0, debrisGenerated: 0 };
                todayCombats.forEach(combat => {
                    if (combat.isExpedition) return;

                    const isAttacker = combat.attackerName && combat.attackerName.toLowerCase() === playerName;
                    if (isAttacker) {
                        totals.damageDealt += combat.defenderLosses || 0;
                        totals.metal += combat.loot?.metal || 0;
                        totals.crystal += combat.loot?.crystal || 0;
                        totals.deuterium += combat.loot?.deuterium || 0;
                    }
                    totals.debrisGenerated += (combat.debris?.metal || 0) + (combat.debris?.crystal || 0) + (combat.debris?.deuterium || 0);
                });

                sendResponse({ success: true, totals });
            } catch (err) {
                console.error("OGame Nexus: Error getting today combat stats", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_RECENT_EXPEDITIONS") {
        const playerId = String(message.data.playerId).trim();
        const limit = message.data.limit || 20;
        (async () => {
            try {
                const [recentExp, recentLf] = await Promise.all([
                    db.expeditions
                        .where('playerId')
                        .equals(playerId)
                        .toArray(),
                    db.lifeformDiscoveries
                        .where('playerId')
                        .equals(playerId)
                        .toArray()
                ]);

                // Merge and tag both datasets
                const merged = [
                    ...recentExp.map(e => ({ ...e, type: 'expedition' })),
                    ...recentLf.map(l => ({ ...l, type: 'lifeform' }))
                ];

                merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                const sliced = merged.slice(0, limit);
                sendResponse({ success: true, expeditions: sliced });
            } catch (err) {
                console.error("OGame Nexus: Error getting recent expeditions", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

        if (message.type === "TRACK_LIFEFORMS") {
        const { discoveries, playerId } = message.data;
        (async () => {
            lifeformTrackingLock = lifeformTrackingLock.then(async () => {
                try {
                    const messageIds = discoveries.map((d: any) => d.messageId);
                    const existingDiscoveries = await db.lifeformDiscoveries.bulkGet(messageIds);
                    const newDiscoveries: any[] = [];
                    const finalResults: any[] = [];

                    discoveries.forEach((disc: any, index: number) => {
                        const existing = existingDiscoveries[index];
                        if (!existing) {
                            const newEntry = { ...disc, tracked: true, playerId };
                            newDiscoveries.push(newEntry);
                            finalResults.push({ ...newEntry, isNew: true });
                        } else {
                            finalResults.push({ ...existing, isNew: false });
                        }
                    });

                    if (newDiscoveries.length > 0) {
                        await db.lifeformDiscoveries.bulkPut(newDiscoveries);
                    }

                    sendResponse({ success: true, data: finalResults, newCount: newDiscoveries.length });
                } catch (err) {
                    console.error("OGame Nexus: Lifeform tracking error", err);
                    sendResponse({ success: false, error: String(err) });
                }
            }).catch(err => {
                console.error("OGame Nexus: Lifeform lock error", err);
                sendResponse({ success: false, error: String(err) });
            });
            await lifeformTrackingLock;
        })();
        return true;
    }

    if (message.type === "GET_ALL_ANALYTICS") {
        const playerId = String(message.playerId || message.data?.playerId || '').trim();
        const universe = String(message.universe || message.data?.universe || '').trim();
        (async () => {
            try {
                const results = await db.expeditions
                    .filter(exp => String(exp.playerId).trim() === playerId)
                    .toArray();
                const lifeforms = await db.lifeformDiscoveries
                    .filter(lf => String(lf.playerId).trim() === playerId)
                    .toArray();
                const allCombats = await db.combatReports.toArray();
                const combats = allCombats.filter(c => {
                    if (!c.playerId) {
                        c.playerId = playerId;
                        db.combatReports.put(c);
                        return true;
                    }
                    return String(c.playerId).trim() === playerId;
                });
                const debrisHarvests = await db.debrisHarvests
                    .filter(d => String(d.playerId).trim() === playerId && isSameUniverse(d.universe, universe))
                    .toArray();
                sendResponse({ success: true, expeditions: results, lifeforms, combats, debrisHarvests });
            } catch (err) {
                console.error("OGame Nexus: Error fetching analytics", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_ALL_EXPEDITIONS") {
        const playerId = String(message.playerId || message.data?.playerId || '').trim();
        (async () => {
            try {
                const results = await db.expeditions
                    .filter(exp => String(exp.playerId).trim() === playerId)
                    .toArray();
                const lifeforms = await db.lifeformDiscoveries
                    .filter(lf => String(lf.playerId).trim() === playerId)
                    .toArray();
                sendResponse({ success: true, expeditions: results, lifeforms });
            } catch (err) {
                console.error("OGame Nexus: Error fetching expeditions", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_TOTAL_SHIPS") {
        const playerId = String(message.playerId || '').trim();
        (async () => {
            try {
                const planets = await db.planets.where('playerId').equals(playerId).toArray();
                let total = 0;
                planets.forEach(p => {
                    if (p.ships) {
                        Object.values(p.ships).forEach(count => {
                            total += Number(count) || 0;
                        });
                    }
                });
                sendResponse({ success: true, totalShips: total });
            } catch (err) {
                console.error("OGame Nexus: Error getting total ships", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "TRACK_DEBRIS") {
        const { harvests, playerId, universe } = message.data;
        (async () => {
            try {
                const cleanUni = cleanUniverseId(universe);
                const strPid = String(playerId || '').trim();

                const cleanKeys = harvests.map((d: any) => `${cleanUni}_${d.messageId}`);
                const rawKeys = harvests.map((d: any) => `${universe}_${d.messageId}`);

                const [existingClean, existingRaw] = await Promise.all([
                    db.debrisHarvests.bulkGet(cleanKeys),
                    db.debrisHarvests.bulkGet(rawKeys)
                ]);

                const newHarvests: any[] = [];
                const finalResults: any[] = [];
 
                harvests.forEach((harvest: any, index: number) => {
                    const existing = existingClean[index] || existingRaw[index];
                    const cleanKey = cleanKeys[index];
                    if (!existing) {
                        const newEntry = {
                            ...harvest,
                            harvestKey: cleanKey,
                            universe: cleanUni,
                            tracked: true,
                            playerId: strPid
                        };
                        newHarvests.push(newEntry);
                        finalResults.push({ ...newEntry, isNew: true });
                    } else {
                        // Ensure existing record uses standard clean key and universe format
                        if (existing.universe !== cleanUni || String(existing.playerId) !== strPid) {
                            existing.universe = cleanUni;
                            existing.playerId = strPid;
                            existing.harvestKey = cleanKey;
                            newHarvests.push(existing);
                        }
                        finalResults.push(existing);
                    }
                });
 
                if (newHarvests.length > 0) {
                    await db.debrisHarvests.bulkPut(newHarvests);
                }

                // Correlate Reaper Debris harvests with active/recorded Project Orion Anomaly Missions
                for (const harvest of harvests) {
                    if (!harvest.isReaperHarvest) continue;
                    try {
                        const cleanCoords = harvest.coords ? harvest.coords.replace(/[\[\]]/g, '').trim() : '';
                        const harvestTs = typeof harvest.timestamp === 'number' ? harvest.timestamp : parseInt(harvest.timestamp, 10);
                        if (!cleanCoords || !harvestTs) continue;

                        const allMissions = await db.anomalyMissions.toArray();
                        const candidate = allMissions.find((m) => {
                            const mCoords = m.coords ? m.coords.replace(/[\[\]]/g, '').trim() : '';
                            if (mCoords !== cleanCoords) return false;
                            const mStart = (m.spawnedTimestamp || (m.createdAt > 1e11 ? Math.floor(m.createdAt / 1000) : m.createdAt)) - 7200;
                            const mEnd = (m.despawnTimestamp || (m.updatedAt > 1e11 ? Math.floor(m.updatedAt / 1000) : m.updatedAt)) + 14400;
                            return harvestTs >= mStart && harvestTs <= mEnd;
                        });

                        if (candidate) {
                            const currentHarvests = candidate.debrisHarvests || [];
                            if (!currentHarvests.some((dh) => dh.messageId === harvest.messageId)) {
                                const res = harvest.recycledResources || {};
                                const m = res.metal || 0;
                                const c = res.crystal || 0;
                                const d = res.deuterium || 0;
                                const msuVal = Math.round(m + c * 1.5 + d * 3);

                                const newReceipt: AnomalyDebrisReceipt = {
                                    messageId: harvest.messageId,
                                    timestamp: harvestTs,
                                    reaperCount: harvest.reaperCount || 1,
                                    cargoCapacity: harvest.totalCapacity || 19000,
                                    metal: m,
                                    crystal: c,
                                    deuterium: d,
                                    msuValue: msuVal
                                };

                                const updatedDebris = [...currentHarvests, newReceipt];
                                const totalDebrisHarvestedMsu = updatedDebris.reduce((sum, dh) => sum + (dh.msuValue || 0), 0);
                                const grossWithoutDebris = candidate.totalClaimedMsu || 0;
                                const grossTotal = grossWithoutDebris + totalDebrisHarvestedMsu;
                                const losses = candidate.fleetLossesMsu || 0;
                                const netProfitMsu = grossTotal - losses;
                                const lithiumSpent = candidate.totalClaimedLithium || 0;
                                const msuPerLithium = lithiumSpent > 0 ? grossTotal / lithiumSpent : 0;

                                await db.anomalyMissions.update(candidate.id, {
                                    debrisHarvests: updatedDebris,
                                    totalDebrisHarvestedMsu,
                                    netProfitMsu,
                                    msuPerLithium
                                });
                                console.log(`[OGame Nexus] Correlated Reaper Debris #${harvest.messageId} (+${msuVal.toLocaleString()} MSU) to Anomaly Mission #${candidate.id}`);
                            }
                        }
                    } catch (e) {
                        console.warn('[OGame Nexus] Failed to correlate reaper debris harvest:', e);
                    }
                }
 
                sendResponse({ success: true, data: finalResults, newCount: newHarvests.length });
            } catch (err) {
                console.error("OGame Nexus: Debris tracking error", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "FETCH_COMBAT_REPORT") {
        const { apiKey } = message;
        fetch(`https://ogapi.faw-kes.de/v1/report/${apiKey}/1`)
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.type === "GET_EMPIRE_PRODUCTION_DATA") {
        (async () => {
            try {
                let playerId = String(message.playerId || '').trim();
                if (!playerId) {
                    const lastAccount = await db.accounts.orderBy('lastSeen').reverse().first();
                    playerId = lastAccount?.playerId || "";
                }
                const planets = await db.planets.where('playerId').equals(playerId).toArray();
                const account = await db.accounts.get(playerId);
                sendResponse({ success: true, planets, account });
            } catch (err) {
                console.error("OGame Nexus: Error fetching empire production data", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_PLAYER_CLASS_INTEL") {
        (async () => {
            try {
                let playerId = String(message.playerId || '').trim();
                let account = null;
                if (playerId) {
                    account = (await db.accounts.get(playerId)) || (await db.accounts.get(Number(playerId) as any));
                }
                if (!account) {
                    account = (await db.accounts.orderBy('lastSeen').reverse().first()) || (await db.accounts.toCollection().last());
                }
                if (!account) {
                    const allAccs = await db.accounts.toArray();
                    account = allAccs[0] || null;
                }

                const targetPlayerId = String(account?.playerId || playerId || '').trim();
                let planets: any[] = [];
                if (targetPlayerId) {
                    planets = await db.planets.where('playerId').equals(targetPlayerId).toArray();
                    if (planets.length === 0 && !isNaN(Number(targetPlayerId))) {
                        planets = await db.planets.where('playerId').equals(Number(targetPlayerId) as any).toArray();
                    }
                }
                if (planets.length === 0) {
                    const allPlanets = await db.planets.toArray();
                    planets = targetPlayerId ? allPlanets.filter(p => String(p.playerId) === targetPlayerId) : allPlanets;
                    if (planets.length === 0) {
                        planets = allPlanets;
                    }
                }
                const cleanPlanets = planets.filter(p => p.type !== 'moon').map(p => ({ ...p, type: 'planet' }));

                let t18BonusPct = 0;
                if (cleanPlanets.length > 0) {
                    try {
                        const lfOverview = calculateDynamicLifeformOverview({
                            empire: {
                                planets: cleanPlanets,
                                lifeformExperience: account?.lifeformExperience || []
                            }
                        } as any);
                        const genClass = lfOverview?.characterClasses?.find(c => c.name === 'General');
                        if (genClass?.total) {
                            const parsed = parseFloat(genClass.total.replace('%', '').trim());
                            if (!isNaN(parsed) && isFinite(parsed)) {
                                t18BonusPct = parsed;
                            }
                        }
                    } catch (e) {
                        console.error("OGame Nexus: Error calculating dynamic lifeform overview for player class intel", e);
                    }

                    // Fallback to direct calculation if lfOverview was 0 or had an issue
                    if (t18BonusPct === 0) {
                        for (const p of cleanPlanets) {
                            const techMult = getPlanetTechMultiplier(p, account);
                            const setups = p.lifeformSetup;
                            if (Array.isArray(setups)) {
                                for (const s of setups) {
                                    if (!s) continue;
                                    const rawId = Number(s?.selectedTechId ?? s?.techId ?? s?.id);
                                    const lvl = Number(s?.level ?? 0);
                                    if (lvl <= 0) continue;

                                    const tech = getLfTech(rawId);
                                    // Strictly Mechan General Enhancement (ID 71, Game ID 13218)
                                    if (tech && (tech.id === 71 || tech.gkId === 13218)) {
                                        t18BonusPct += 0.2 * lvl * techMult;
                                    }
                                }
                            }
                        }
                    }
                }
                t18BonusPct = Math.round(t18BonusPct * 100) / 100;

                const playerClass = (account && typeof account.playerClass === 'number') ? account.playerClass : 2;

                sendResponse({ success: true, playerClass, t18BonusPct });
            } catch (err) {
                console.error("OGame Nexus: Error calculating player class intel in background", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_ASSISTANT_DATA") {
        (async () => {
            try {
                let playerId = String(message.playerId || '').trim();
                let account = playerId ? await db.accounts.get(playerId) : undefined;
                if (!account && playerId && !isNaN(Number(playerId))) {
                    account = await db.accounts.get(Number(playerId) as any);
                }
                if (!account) {
                    account = await db.accounts.orderBy('lastSeen').reverse().first() || await db.accounts.toCollection().last();
                }
                const targetPlayerId = account?.playerId || playerId;

                if (account && account.hasAnomalies === undefined && targetPlayerId) {
                    try {
                        const playerKey = `ognexus_has_anomalies_${targetPlayerId}`;
                        const sRes = await chrome.storage.local.get([playerKey, 'ognexus_has_anomalies']);
                        if (sRes[playerKey] !== undefined) {
                            account.hasAnomalies = Boolean(sRes[playerKey]);
                        } else if (sRes['ognexus_has_anomalies'] !== undefined) {
                            account.hasAnomalies = Boolean(sRes['ognexus_has_anomalies']);
                        }
                    } catch (e) {}
                }

                let planets = targetPlayerId
                    ? await db.planets.where('playerId').equals(targetPlayerId).toArray()
                    : [];

                if (planets.length === 0 && targetPlayerId && !isNaN(Number(targetPlayerId))) {
                    planets = await db.planets.where('playerId').equals(Number(targetPlayerId) as any).toArray();
                }
                if (planets.length === 0) {
                    const allPlanets = await db.planets.toArray();
                    if (targetPlayerId) {
                        const filtered = allPlanets.filter(p => String(p.playerId) === String(targetPlayerId));
                        if (filtered.length > 0) planets = filtered;
                    }
                    if (planets.length === 0) {
                        planets = allPlanets;
                    }
                }
                // Fetch Today's and Recent 4h Expeditions for Intel Analytics & Depletion rules
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
                const fourHoursAgo = (Date.now() - 4 * 3600 * 1000) / 1000;
                const minTimestamp = Math.min(startOfDay, fourHoursAgo);

                let todayExpeditions: any[] = [];
                if (targetPlayerId) {
                    todayExpeditions = await db.expeditions
                        .where('timestamp')
                        .aboveOrEqual(minTimestamp)
                        .filter(exp => String(exp.playerId).trim() === String(targetPlayerId).trim())
                        .toArray();
                }

                let todoProjects: any[] = [];
                if (targetPlayerId) {
                    todoProjects = await db.todoProjects
                        .filter(t => t.playerId === targetPlayerId || !!(t.planetId && planets.some(p => p.id === t.planetId)))
                        .toArray();
                } else {
                    todoProjects = await db.todoProjects.toArray();
                }

                // Fetch conversion rates
                const conversionRates = (await db.settings.get('conversion_rates')) || DEFAULT_RATES;

                // Calculate 60-day expedition averages for ROI calculations (cached in memory)
                let expoAverages: any = undefined;
                if (targetPlayerId) {
                    const cached = expoAveragesCache.get(targetPlayerId);
                    if (cached && (Date.now() - cached.calculatedAt < EXPO_AVERAGES_CACHE_TTL)) {
                        expoAverages = cached.data;
                    } else {
                        const nowTs = Date.now();
                        const start60d = Math.floor((nowTs - (60 * 24 * 60 * 60 * 1000)) / 1000);
                        const end60d = Math.floor(nowTs / 1000);

                        const expoItems = await db.expeditions
                            .where('timestamp')
                            .between(start60d, end60d)
                            .filter(exp => String(exp.playerId).trim() === String(targetPlayerId).trim())
                            .toArray();

                        if (expoItems.length > 0) {
                            const shipCosts: Record<number, any> = {};
                            SHIP_DATA.forEach(s => shipCosts[s.id] = s.metadata?.cost);

                            const dailyYields: Record<number, { res: Cost, ships: Cost }> = {};
                            expoItems.forEach(item => {
                                const dayKey = Math.floor(item.timestamp / (24 * 3600));
                                if (!dailyYields[dayKey]) {
                                    dailyYields[dayKey] = {
                                        res: { metal: 0, crystal: 0, deuterium: 0 },
                                        ships: { metal: 0, crystal: 0, deuterium: 0 }
                                    };
                                }

                                const resType = (item.result || '').toLowerCase().trim();
                                const details = item.resultDetails || {};

                                if (resType === 'resources' || resType === 'ressources') {
                                    dailyYields[dayKey].res.metal += Number(details.metal) || 0;
                                    dailyYields[dayKey].res.crystal += Number(details.crystal) || 0;
                                    dailyYields[dayKey].res.deuterium += Number(details.deuterium) || 0;
                                } else if (resType === 'shipwrecks' || resType === 'technologiesgained' || resType === 'ships') {
                                    Object.entries(details).forEach(([id, data]: [string, any]) => {
                                        const sid = parseInt(id);
                                        const cost = shipCosts[sid];
                                        if (cost) {
                                            const amount = typeof data === 'object' ? (data.amount || 0) : (Number(data) || 0);
                                            if (amount > 0) {
                                                dailyYields[dayKey].ships.metal += (Number(cost.metal) || 0) * amount;
                                                dailyYields[dayKey].ships.crystal += (Number(cost.crystal) || 0) * amount;
                                                dailyYields[dayKey].ships.deuterium += (Number(cost.deuterium) || 0) * amount;
                                            }
                                        }
                                    });
                                }
                            });

                            const allDays = Object.values(dailyYields);
                            const sortedResDays = [...allDays].sort((a, b) =>
                                calculateMSU(b.res, conversionRates) - calculateMSU(a.res, conversionRates)
                            ).slice(0, 7);

                            const sortedShipDays = [...allDays].sort((a, b) =>
                                calculateMSU(b.ships, conversionRates) - calculateMSU(a.ships, conversionRates)
                            ).slice(0, 7);

                            let resM = 0, resC = 0, resD = 0;
                            sortedResDays.forEach(day => {
                                resM += day.res.metal;
                                resC += day.res.crystal;
                                resD += day.res.deuterium;
                            });

                            let shipM = 0, shipC = 0, shipD = 0;
                            sortedShipDays.forEach(day => {
                                shipM += day.ships.metal;
                                shipC += day.ships.crystal;
                                shipD += day.ships.deuterium;
                            });

                            const resHours = (sortedResDays.length || 1) * 24;
                            const shipHours = (sortedShipDays.length || 1) * 24;

                            expoAverages = {
                                resources: { metal: resM / resHours, crystal: resC / resHours, deuterium: resD / resHours },
                                ships: { metal: shipM / shipHours, crystal: shipC / shipHours, deuterium: shipD / shipHours },
                                totals: {
                                    resources: { metal: resM, crystal: resC, deuterium: resD },
                                    ships: { metal: shipM, crystal: shipC, deuterium: shipD }
                                }
                            };

                            expoAveragesCache.set(targetPlayerId, { data: expoAverages, calculatedAt: Date.now() });
                        }
                    }
                }

                sendResponse({ success: true, planets, account, todayExpeditions, todoProjects, expoAverages, rates: conversionRates });
            } catch (err) {
                console.error("OGame Nexus: Error fetching assistant data", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "UPDATE_IMPORT_EXPORT_INFO") {
        (async () => {
            try {
                const { playerId, info } = message;
                if (playerId && info) {
                    const acc = await db.accounts.get(playerId);
                    if (acc) {
                        await db.accounts.update(playerId, { importExport: info });
                    }
                }
                sendResponse({ success: true });
            } catch (err) {
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "UPDATE_ARTIFACTS") {
        (async () => {
            try {
                const playerId = String(message.playerId || '').trim();
                const artifacts = Number(message.artifacts);
                if (playerId && !isNaN(artifacts)) {
                    let account = await db.accounts.get(playerId);
                    if (!account && !isNaN(Number(playerId))) {
                        account = await db.accounts.get(Number(playerId) as any);
                    }
                    if (account) {
                        await db.accounts.update(account.playerId, {
                            artifacts,
                            artifactsLastUpdated: Date.now()
                        });
                        console.log(`[OGame Nexus] Updated Artifacts for ${account.playerName || playerId}: ${artifacts}/3600`);
                    }
                }
                sendResponse({ success: true });
            } catch (err) {
                console.error("OGame Nexus: Error updating artifacts", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_PLAYER_CARGO_BONUSES") {
        (async () => {
            try {
                let playerId = String(message.playerId || '').trim();
                let account = playerId ? await db.accounts.get(playerId) : undefined;
                if (!account && playerId && !isNaN(Number(playerId))) {
                    account = await db.accounts.get(Number(playerId) as any);
                }
                if (!account) {
                    account = await db.accounts.orderBy('lastSeen').reverse().first() || await db.accounts.toCollection().last();
                }

                let hyperspaceTechLevel = 0;
                if (account?.researches) {
                    if (Array.isArray(account.researches)) {
                        const hs = account.researches.find((r: any) => r && (r.id === 114 || r.techId === 114));
                        if (hs && typeof hs.level === 'number') hyperspaceTechLevel = hs.level;
                    } else if (typeof account.researches === 'object') {
                        const val = (account.researches as any)['114'] ?? (account.researches as any)[114];
                        if (typeof val === 'number') hyperspaceTechLevel = val;
                    }
                }
                if (hyperspaceTechLevel === 0 && (account as any)?.empire?.researches) {
                    const empRes = (account as any).empire.researches;
                    if (Array.isArray(empRes)) {
                        const hs = empRes.find((r: any) => r && (r.id === 114 || r.techId === 114));
                        if (hs && typeof hs.level === 'number') hyperspaceTechLevel = hs.level;
                    } else if (typeof empRes === 'object') {
                        const val = empRes['114'] ?? empRes[114];
                        if (typeof val === 'number') hyperspaceTechLevel = val;
                    }
                }

                const isCollector = Number(account?.playerClass || (account as any)?.characterClassId) === 1;
                let collectorBonus = isCollector ? 0.25 : 0;

                // OGame XML API stores cargoHyperspaceTechMultiplier as an integer percentage (e.g. 5 for 5%)
                let hsMultiplier = account?.cargoHyperspaceTechMultiplier ?? 5;
                if (hsMultiplier > 1) {
                    hsMultiplier = hsMultiplier / 100;
                } else if (hsMultiplier <= 0) {
                    hsMultiplier = 0.05;
                }
                const hsBonus = hyperspaceTechLevel * hsMultiplier;

                let scLfBonusPct = 0;
                let lcLfBonusPct = 0;

                const targetPlayerId = String(account?.playerId || playerId || '').trim();
                let planets = targetPlayerId
                    ? await db.planets.where('playerId').equals(targetPlayerId).toArray()
                    : [];
                if (planets.length === 0) {
                    planets = await db.planets.toArray();
                }

                if (planets.length > 0) {
                    try {
                        const lfOverview = calculateDynamicLifeformOverview({
                            empire: {
                                planets,
                                lifeformExperience: account?.lifeformExperience || []
                            }
                        } as any);

                        const scShip = lfOverview?.ships?.find(s => s.name === 'Small Cargo');
                        const lcShip = lfOverview?.ships?.find(s => s.name === 'Large Cargo');

                        if (scShip?.cargo && scShip.cargo !== '-') {
                            const parsed = parseFloat(scShip.cargo.replace('%', '').trim());
                            if (!isNaN(parsed) && isFinite(parsed)) scLfBonusPct = parsed / 100;
                        }
                        if (lcShip?.cargo && lcShip.cargo !== '-') {
                            const parsed = parseFloat(lcShip.cargo.replace('%', '').trim());
                            if (!isNaN(parsed) && isFinite(parsed)) lcLfBonusPct = parsed / 100;
                        }

                        // Also account for lifeform amplification on the Collector Expanded Cargo Bays perk if active
                        if (isCollector) {
                            const colClass = lfOverview?.characterClasses?.find(c => c.name === 'Collector');
                            const cargoPerk = colClass?.perks?.find(p => p.name === 'Expanded Cargo Bays');
                            if (cargoPerk?.incBonus) {
                                const parsedPerk = parseFloat(cargoPerk.incBonus.replace('%', '').trim());
                                if (!isNaN(parsedPerk) && parsedPerk > 0) {
                                    collectorBonus = parsedPerk / 100;
                                }
                            }
                        }
                    } catch (lfErr) {
                        console.warn("OGame Nexus: Error computing LF cargo bonus", lfErr);
                    }
                }

                // In OGame, the class bonus on transporters is a multiplicative factor: (1 + HyperspaceTech + LFShipTech) * (1 + CollectorBonus)
                const classMultiplier = isCollector ? (1 + collectorBonus) : 1.0;
                const scCapacity = Math.floor(5000 * (1 + hsBonus + scLfBonusPct) * classMultiplier);
                const lcCapacity = Math.floor(25000 * (1 + hsBonus + lcLfBonusPct) * classMultiplier);

                const totalScBonusPct = Math.round(((scCapacity / 5000) - 1) * 100);
                const totalLcBonusPct = Math.round(((lcCapacity / 25000) - 1) * 100);

                sendResponse({
                    success: true,
                    hyperspaceTech: hyperspaceTechLevel,
                    isCollector,
                    collectorBonusPct: Math.round(collectorBonus * 100),
                    hsBonusPct: Math.round(hsBonus * 100),
                    scLfBonusPct: Math.round(scLfBonusPct * 1000) / 10,
                    lcLfBonusPct: Math.round(lcLfBonusPct * 1000) / 10,
                    totalScBonusPct,
                    totalLcBonusPct,
                    scCapacity,
                    lcCapacity
                });
            } catch (err) {
                console.error("OGame Nexus: Error in GET_PLAYER_CARGO_BONUSES", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_AMORTIZATION_TODOS") {
        (async () => {
            try {
                let playerId = String(message.playerId || '').trim();
                if (!playerId) {
                    const lastAccount = await db.accounts.orderBy('lastSeen').reverse().first();
                    playerId = lastAccount?.playerId || "";
                }

                const planets = await db.planets.where('playerId').equals(playerId).toArray();
                const planetIds = planets.map(p => p.id);
                const account = await db.accounts.get(playerId);

                const todos = await db.todoProjects
                    .filter(t => t.playerId === playerId || !!(t.planetId && planetIds.includes(t.planetId)))
                    .toArray();

                const toDelete: number[] = [];
                for (const todo of todos) {
                    let currentLevel = 0;
                    let typeNum = parseInt(todo.type);
                    if (isNaN(typeNum)) {
                        if (todo.type === "Mines") typeNum = 1;
                        else if (todo.type === "LifeformProductionBuildings") typeNum = 2;
                        else if (todo.type === "LifeformResearchBuildings") typeNum = 3;
                        else if (todo.type === "LifeformProductionResearches") typeNum = 4;
                        else if (todo.type === "LifeformExpeditionResearches") typeNum = 5;
                        else if (todo.type === "PlasmaTechnology") typeNum = 6;
                    }

                    if (typeNum === 1) { // Mines
                        const planet = planets.find(p => String(p.id) === String(todo.planetId));
                        if (planet) {
                            if (todo.name.includes("Metal Mine")) currentLevel = planet.metalMine || 0;
                            else if (todo.name.includes("Crystal Mine")) currentLevel = planet.crystalMine || 0;
                            else if (todo.name.includes("Deuterium")) currentLevel = planet.deuteriumMine || 0;
                        }
                    } else if (typeNum === 2 || typeNum === 3) { // LF Buildings
                        const planet = planets.find(p => String(p.id) === String(todo.planetId));
                        const entry = AMORTIZATION_TABLE.find(e => e.name === todo.name);
                        if (planet && entry?.id) {
                            const b = planet.lifeformBuildings?.find(lb => Number(lb.id) === Number(entry.id));
                            currentLevel = b?.level || 0;
                        }
                    } else if (typeNum === 4 || typeNum === 5) { // LF Techs
                        const planet = planets.find(p => String(p.id) === String(todo.planetId));
                        const entry = AMORTIZATION_TABLE.find(e => e.name === todo.name);
                        if (planet && entry?.id) {
                            const t = planet.lifeformSetup?.find(lt => Number(lt.selectedTechId) === Number(entry.id));
                            currentLevel = t?.level || 0;
                        }
                    } else if (typeNum === 6) { // Plasma
                        const res = account?.researches?.find(r => r.id === 122);
                        currentLevel = res?.level || 0;
                    } else if (typeNum === 7 || (todo.name && todo.name.toLowerCase().includes('astrophysics'))) { // Astrophysics
                        const res = account?.researches?.find(r => r.id === 124);
                        currentLevel = res?.level || 0;
                    }

                    if (currentLevel >= todo.targetLevel) {
                        toDelete.push(todo.id!);
                    }
                }

                if (toDelete.length > 0) {
                    await db.todoProjects.bulkDelete(toDelete);
                }

                const finalTodos = await db.todoProjects
                    .filter(t => (t.playerId === playerId || !!(t.planetId && planetIds.includes(t.planetId))) && !toDelete.includes(t.id!))
                    .toArray();
                finalTodos.sort((a, b) => (a.roiHours || 0) - (b.roiHours || 0));

                const formatted = finalTodos.map(t => {
                    const planet = planets.find(p => p.id === t.planetId);
                    return {
                        ...t,
                        roiDays: Math.ceil((t.roiHours || 0) / 24),
                        planetImg: planet?.imgUrl,
                        planetName: planet?.name || t.planetName
                    };
                });
                sendResponse({ success: true, todos: formatted });
            } catch (err) {
                console.error("OGame Nexus: Error getting todos", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "REMOVE_AMORTIZATION_TODO") {
        (async () => {
            try {
                await db.todoProjects.delete(message.id);
                sendResponse({ success: true });
            } catch (err) {
                console.error("OGame Nexus: Error deleting todo", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

        if (message.type === "TRACK_COMBATS") {
        const { combats, playerId } = message.data;
        (async () => {
            combatTrackingLock = combatTrackingLock.then(async () => {
                try {
                    const messageIds = combats.map((c: any) => c.messageId);
                    const existingCombats = await db.combatReports.bulkGet(messageIds);
                    const newCombats: any[] = [];
                    const finalResults: any[] = [];

                    combats.forEach((combat: any, index: number) => {
                        const existing = existingCombats[index];
                        if (!existing) {
                            const newEntry = { ...combat, playerId, isNew: true };
                            newCombats.push(newEntry);
                            finalResults.push(newEntry);
                        } else {
                            finalResults.push({ ...existing, isNew: false });
                        }
                    });

                    if (newCombats.length > 0) {
                        await db.combatReports.bulkAdd(newCombats);

                        const account = await db.accounts.get(playerId);

                        // Correlate Anomaly Combats with db.anomalyMissions (Project Orion)
                        for (const combat of newCombats) {
                            if (combat.isAnomaly && combat.anomalyId) {
                                try {
                                    const missionIdStr = String(combat.anomalyId);
                                    const existingMission = await db.anomalyMissions.get(missionIdStr);

                                    if (existingMission) {
                                        const reportIds = existingMission.combatReportIds || [];
                                        if (!reportIds.includes(combat.messageId)) {
                                            reportIds.push(combat.messageId);
                                            const newTotalWaves = Math.max(existingMission.totalWaves || 1, reportIds.length);
                                            await db.anomalyMissions.update(missionIdStr, {
                                                combatReportIds: reportIds,
                                                totalWaves: newTotalWaves,
                                                currentWave: existingMission.status === 'completed' ? newTotalWaves : Math.max(existingMission.currentWave || 1, reportIds.length),
                                                category: 'combat',
                                                updatedAt: Date.now()
                                            });
                                        }
                                        await recalculateAnomalyMissionLosses(missionIdStr, playerId);
                                    } else {
                                        const isRescue = combat.anomalyName?.toLowerCase().includes('rescue');
                                        await db.anomalyMissions.put({
                                            id: missionIdStr,
                                            playerId: String(playerId),
                                            universe: account?.universe || '',
                                            name: combat.anomalyName || 'Anomaly Mission',
                                            level: 0,
                                            stars: 0,
                                            category: 'combat',
                                            environment: isRescue ? 'pve' : 'pve',
                                            coords: combat.coords || '',
                                            totalWaves: 1,
                                            currentWave: 1,
                                            spawnedTimestamp: combat.timestamp,
                                            totalLithiumBudget: 0,
                                            status: 'in_progress',
                                            createdAt: combat.timestamp * 1000,
                                            updatedAt: Date.now(),
                                            waves: [],
                                            totalClaimedLithium: 0,
                                            totalClaimedMsu: 0,
                                            combatReportIds: [combat.messageId],
                                            fleetLossesMsu: 0,
                                            enemyDestroyedMsu: 0,
                                            netProfitMsu: 0,
                                            msuPerLithium: 0
                                        });
                                        await recalculateAnomalyMissionLosses(missionIdStr, playerId);
                                    }
                                } catch (anomalyErr) {
                                    console.warn("OGame Nexus: Failed to correlate anomaly combat", anomalyErr);
                                }
                            }
                        }

                        // Apply real-time plundering reductions to tracked Raid Radar planets
                        if (account) {
                            for (const combat of newCombats) {
                                if (combat.attackerName && combat.attackerName.toLowerCase() === account.playerName.toLowerCase()) {
                                    const matchingPlanets = await db.spiedPlanets
                                        .where('coords')
                                        .equals(combat.coords)
                                        .filter(p => isSameUniverse(p.universe, account.universe) && (!p.userPlayerId || p.userPlayerId === account.playerId))
                                        .toArray();
                                    if (matchingPlanets.length > 0) {
                                        const spiedPlanet = matchingPlanets[0];
                                        if (combat.timestamp > spiedPlanet.lastSpiedTimestamp) {
                                            const dT = (combat.timestamp - spiedPlanet.lastSpiedTimestamp) / 3600;
                                            const metalAccumulated = spiedPlanet.metalPerHour * dT;
                                            const crystalAccumulated = spiedPlanet.crystalPerHour * dT;
                                            const deuteriumAccumulated = spiedPlanet.deuteriumPerHour * dT;

                                            const metalCap = spiedPlanet.metalCapacity !== undefined ? spiedPlanet.metalCapacity : Infinity;
                                            const crystalCap = spiedPlanet.crystalCapacity !== undefined ? spiedPlanet.crystalCapacity : Infinity;
                                            const deuteriumCap = spiedPlanet.deuteriumCapacity !== undefined ? spiedPlanet.deuteriumCapacity : Infinity;

                                            const metalTotalAtCombat = Math.max(spiedPlanet.lastSpiedMetal, Math.min(metalCap, spiedPlanet.lastSpiedMetal + metalAccumulated));
                                            const crystalTotalAtCombat = Math.max(spiedPlanet.lastSpiedCrystal, Math.min(crystalCap, spiedPlanet.lastSpiedCrystal + crystalAccumulated));
                                            const deuteriumTotalAtCombat = Math.max(spiedPlanet.lastSpiedDeuterium, Math.min(deuteriumCap, spiedPlanet.lastSpiedDeuterium + deuteriumAccumulated));

                                            const isDiscoverer = account.playerClass === 3;
                                            const reductionFactor = isDiscoverer ? 0.25 : 0.50;

                                            await db.spiedPlanets.put({
                                                ...spiedPlanet,
                                                lastSpiedMetal: Math.floor(metalTotalAtCombat * reductionFactor),
                                                lastSpiedCrystal: Math.floor(crystalTotalAtCombat * reductionFactor),
                                                lastSpiedDeuterium: Math.floor(deuteriumTotalAtCombat * reductionFactor),
                                                lastSpiedTimestamp: combat.timestamp
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    sendResponse({ success: true, data: finalResults, newCount: newCombats.length });
                } catch (err) {
                    console.error("OGame Nexus: Error tracking combats", err);
                    sendResponse({ success: false, error: String(err) });
                }
            }).catch(err => {
                console.error("OGame Nexus: Combat lock error", err);
                sendResponse({ success: false, error: String(err) });
            });
            await combatTrackingLock;
        })();
        return true;
    }

function calculateStorageCapacity(level: number, hasTraderClass?: boolean): number {
    const lvl = Math.max(0, level || 0);
    const baseCapacity = 5000 * Math.floor(2.5 * Math.exp((20 / 33) * lvl));
    if (hasTraderClass && lvl > 0) {
        return Math.floor(baseCapacity * 1.10);
    }
    return baseCapacity;
}

    if (message.type === "TRACK_ESPIONAGE") {
        const { espionageReports, userPlayerId, universe: rawUniverse } = message.data;
        const universe = cleanUniverseId(rawUniverse);
        (async () => {
            try {
                const finalResults: any[] = [];

                // Sort reports chronologically (oldest to newest) to ensure baselines are processed before consecutive deltas
                const sortedReports = [...(espionageReports || [])].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

                for (const report of sortedReports) {
                    const planetKey = userPlayerId
                        ? `${universe}_${userPlayerId}_${report.planetId}`
                        : `${universe}_${report.planetId}`;
                    let existing = await db.spiedPlanets.get(planetKey);
                    if (!existing && userPlayerId) {
                        existing = await db.spiedPlanets
                            .where('userPlayerId')
                            .equals(userPlayerId)
                            .filter(p => p.planetId === report.planetId || (Boolean(p.coords) && p.coords === report.coords))
                            .first();
                        if (existing && existing.planetKey !== planetKey) {
                            await db.spiedPlanets.delete(existing.planetKey);
                        }
                    }
                    if (!existing) {
                        const legacyKey = `${universe}_${report.planetId}`;
                        const legacy = await db.spiedPlanets.get(legacyKey);
                        if (legacy && (!legacy.userPlayerId || legacy.userPlayerId === userPlayerId)) {
                            existing = legacy;
                            await db.spiedPlanets.delete(legacyKey);
                        }
                    }
                    if (!existing && rawUniverse && rawUniverse !== universe) {
                        existing = await db.spiedPlanets.get(`${rawUniverse}_${report.planetId}`);
                        if (existing) {
                            await db.spiedPlanets.delete(`${rawUniverse}_${report.planetId}`);
                        }
                    }

                    if (!existing) {
                        // First spy report: create baseline
                        const hasTraderClass = report.hasTraderClass || false;
                        const metalStorageLevel = report.metalStorageLevel;
                        const crystalStorageLevel = report.crystalStorageLevel;
                        const deuteriumStorageLevel = report.deuteriumStorageLevel;

                        const newPlanet = {
                            planetKey,
                            planetId: report.planetId,
                            playerId: report.playerId, // target player ID
                            userPlayerId,
                            universe,
                            playerName: report.playerName,
                            coords: report.coords,
                            metalPerHour: 0,
                            crystalPerHour: 0,
                            deuteriumPerHour: 0,
                            lastSpiedMetal: report.metal,
                            lastSpiedCrystal: report.crystal,
                            lastSpiedDeuterium: report.deuterium,
                            lastSpiedTimestamp: report.timestamp,
                            playerStatus: report.playerStatus,
                            lastHashCode: report.hashcode,
                            spyCount: 1,
                            confidence: 0,
                            lootPercentage: report.lootPercentage || 50,
                            hasTraderClass,
                            metalStorageLevel,
                            crystalStorageLevel,
                            deuteriumStorageLevel,
                            metalCapacity: metalStorageLevel !== undefined ? calculateStorageCapacity(metalStorageLevel, hasTraderClass) : undefined,
                            crystalCapacity: crystalStorageLevel !== undefined ? calculateStorageCapacity(crystalStorageLevel, hasTraderClass) : undefined,
                            deuteriumCapacity: deuteriumStorageLevel !== undefined ? calculateStorageCapacity(deuteriumStorageLevel, hasTraderClass) : undefined
                        };
                        await db.spiedPlanets.put(newPlanet);
                        finalResults.push({
                            messageId: report.messageId,
                            planetId: report.planetId,
                            isNew: true,
                            metal: report.metal,
                            crystal: report.crystal,
                            deuterium: report.deuterium
                        });
                    } else if (report.timestamp > existing.lastSpiedTimestamp) {
                        // Consecutive report (newer): Calculate delta against previous spied state
                        const dT = (report.timestamp - existing.lastSpiedTimestamp) / 3600; // in hours
                        
                        let newMetalRate = existing.metalPerHour;
                        let newCrystalRate = existing.crystalPerHour;
                        let newDeuteriumRate = existing.deuteriumPerHour;
                        let newSpyCount = existing.spyCount;
                        let confidence = existing.confidence;

                        if (dT >= 1.8 / 3600) { // Avoid noise/division by zero (minimum 2 seconds)
                            const rateM = Math.max(0, (report.metal - existing.lastSpiedMetal) / dT);
                            const rateC = Math.max(0, (report.crystal - existing.lastSpiedCrystal) / dT);
                            const rateD = Math.max(0, (report.deuterium - existing.lastSpiedDeuterium) / dT);

                            // Update running maximum rates if new calculation is higher
                            newMetalRate = Math.max(existing.metalPerHour, rateM);
                            newCrystalRate = Math.max(existing.crystalPerHour, rateC);
                            newDeuteriumRate = Math.max(existing.deuteriumPerHour, rateD);

                            newSpyCount = existing.spyCount + 1;
                            
                            // Confidence levels based on spy count
                            if (newSpyCount === 2) confidence = 30;
                            else if (newSpyCount === 3) confidence = 60;
                            else if (newSpyCount === 4) confidence = 85;
                            else if (newSpyCount >= 5) confidence = 100;
                        }

                        const hasTraderClass = report.hasTraderClass !== undefined ? report.hasTraderClass : (existing.hasTraderClass || false);
                        const metalStorageLevel = report.metalStorageLevel !== undefined ? report.metalStorageLevel : existing.metalStorageLevel;
                        const crystalStorageLevel = report.crystalStorageLevel !== undefined ? report.crystalStorageLevel : existing.crystalStorageLevel;
                        const deuteriumStorageLevel = report.deuteriumStorageLevel !== undefined ? report.deuteriumStorageLevel : existing.deuteriumStorageLevel;

                        await db.spiedPlanets.put({
                            ...existing,
                            planetKey,
                            userPlayerId,
                            universe,
                            playerName: report.playerName, // Keep player name updated
                            playerStatus: report.playerStatus,
                            metalPerHour: newMetalRate,
                            crystalPerHour: newCrystalRate,
                            deuteriumPerHour: newDeuteriumRate,
                            lastSpiedMetal: report.metal,
                            lastSpiedCrystal: report.crystal,
                            lastSpiedDeuterium: report.deuterium,
                            lastSpiedTimestamp: report.timestamp,
                            lastHashCode: report.hashcode,
                            spyCount: newSpyCount,
                            confidence,
                            lootPercentage: report.lootPercentage || existing.lootPercentage || 50,
                            hasTraderClass,
                            metalStorageLevel,
                            crystalStorageLevel,
                            deuteriumStorageLevel,
                            metalCapacity: metalStorageLevel !== undefined ? calculateStorageCapacity(metalStorageLevel, hasTraderClass) : undefined,
                            crystalCapacity: crystalStorageLevel !== undefined ? calculateStorageCapacity(crystalStorageLevel, hasTraderClass) : undefined,
                            deuteriumCapacity: deuteriumStorageLevel !== undefined ? calculateStorageCapacity(deuteriumStorageLevel, hasTraderClass) : undefined
                        });

                        finalResults.push({
                            messageId: report.messageId,
                            planetId: report.planetId,
                            isNew: true,
                            metal: report.metal,
                            crystal: report.crystal,
                            deuterium: report.deuterium
                        });
                    } else if (report.timestamp < existing.lastSpiedTimestamp && existing.spyCount <= 1) {
                        // Older report discovered after newer report (e.g. scrolling down newest-to-oldest)
                        const dT = (existing.lastSpiedTimestamp - report.timestamp) / 3600; // in hours
                        
                        let newMetalRate = existing.metalPerHour;
                        let newCrystalRate = existing.crystalPerHour;
                        let newDeuteriumRate = existing.deuteriumPerHour;
                        let newSpyCount = existing.spyCount;
                        let confidence = existing.confidence;

                        if (dT >= 1.8 / 3600) {
                            const rateM = Math.max(0, (existing.lastSpiedMetal - report.metal) / dT);
                            const rateC = Math.max(0, (existing.lastSpiedCrystal - report.crystal) / dT);
                            const rateD = Math.max(0, (existing.lastSpiedDeuterium - report.deuterium) / dT);

                            newMetalRate = Math.max(existing.metalPerHour, rateM);
                            newCrystalRate = Math.max(existing.crystalPerHour, rateC);
                            newDeuteriumRate = Math.max(existing.deuteriumPerHour, rateD);

                            newSpyCount = 2;
                            confidence = 30;
                        }

                        await db.spiedPlanets.put({
                            ...existing,
                            metalPerHour: newMetalRate,
                            crystalPerHour: newCrystalRate,
                            deuteriumPerHour: newDeuteriumRate,
                            spyCount: newSpyCount,
                            confidence
                        });

                        finalResults.push({
                            messageId: report.messageId,
                            planetId: report.planetId,
                            isNew: true,
                            metal: report.metal,
                            crystal: report.crystal,
                            deuterium: report.deuterium
                        });
                    } else {
                        // Already spied or older message processed out-of-order
                        finalResults.push({
                            messageId: report.messageId,
                            planetId: report.planetId,
                            isNew: false,
                            metal: report.metal,
                            crystal: report.crystal,
                            deuterium: report.deuterium
                        });
                    }
                }

                // Broadcast update so open Galaxy views can refresh cache immediately
                if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                            if (tab.id) {
                                chrome.tabs.sendMessage(tab.id, { type: "SPIED_PLANETS_UPDATED" }).catch(() => {});
                            }
                        });
                    });
                }

                sendResponse({ success: true, data: finalResults });
            } catch (err) {
                console.error("OGame Nexus: Error tracking espionage reports", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "DEBUG_DELETE_LAST_40_EXPEDITIONS") {
        const pId = String(message.playerId || '').trim();
        (async () => {
            try {
                const getLatestIds = async (table: any, limit: number) => {
                    const items = await table.where('playerId').equals(pId).toArray();
                    items.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
                    return items.slice(0, limit).map((i: any) => i.messageId);
                };

                const expIds = await getLatestIds(db.expeditions, 40);
                const lfIds = await getLatestIds(db.lifeformDiscoveries, 40);
                const dIds = await getLatestIds(db.debrisHarvests, 40);

                if (expIds.length > 0) await db.expeditions.bulkDelete(expIds);
                if (lfIds.length > 0) await db.lifeformDiscoveries.bulkDelete(lfIds);
                if (dIds.length > 0) await db.debrisHarvests.bulkDelete(dIds);

                const total = expIds.length + lfIds.length + dIds.length;
                sendResponse({ success: true, count: total });
            } catch (err) {
                console.error("OGame Nexus: Debug delete error", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_ALL_SPIED_PLANETS") {
        const { universe, playerId } = message.data || {};
        (async () => {
            try {
                let planets: any[] = [];
                const all = await db.spiedPlanets.toArray();
                if (universe && universe !== 'unknown') {
                    planets = all.filter(p => isSameUniverse(p.universe, universe) && (!playerId || p.userPlayerId === playerId));
                } else {
                    planets = all.filter(p => !playerId || p.userPlayerId === playerId);
                }
                const activeAccount = playerId
                    ? ((await db.accounts.get(playerId)) || (await db.accounts.orderBy('lastSeen').reverse().first()))
                    : await db.accounts.orderBy('lastSeen').reverse().first();
                const galaxies = activeAccount?.galaxies || 9;
                sendResponse({ success: true, planets, galaxies });
            } catch (err) {
                console.error("OGame Nexus: Error in GET_ALL_SPIED_PLANETS", err);
                sendResponse({ success: false, planets: [], galaxies: 9 });
            }
        })();
        return true;
    }

    if (message.type === "DELETE_SPIED_PLANET" || message.type === "DELETE_SPIED_PLANETS") {
        const { planetKey, planetKeys, coords, coordsList, universe, playerId, userPlayerId } = message.data || {};
        const targetPid = userPlayerId || playerId;
        (async () => {
            try {
                const keysToDelete = new Set<string>();
                if (planetKey) keysToDelete.add(planetKey);
                if (Array.isArray(planetKeys)) {
                    planetKeys.forEach((k: any) => { if (k && typeof k === 'string') keysToDelete.add(k); });
                }

                const coordsToCheck = new Set<string>();
                const normalizeCoord = (c: any) => String(c || '').replace(/[\[\]\s]/g, '').trim();
                if (coords) {
                    const clean = normalizeCoord(coords);
                    if (clean) coordsToCheck.add(clean);
                }
                if (Array.isArray(coordsList)) {
                    coordsList.forEach((c: any) => {
                        const clean = normalizeCoord(c);
                        if (clean) coordsToCheck.add(clean);
                    });
                }

                if (coordsToCheck.size > 0) {
                    const allPlanets = await db.spiedPlanets.toArray();
                    for (const p of allPlanets) {
                        const pCoord = normalizeCoord(p.coords);
                        if (pCoord && coordsToCheck.has(pCoord)) {
                            if (!universe || isSameUniverse(p.universe, universe)) {
                                // If a coordinate is physically empty/destroyed in this universe,
                                // purge it regardless of which account originally stored it!
                                keysToDelete.add(p.planetKey);
                            }
                        }
                    }
                }

                if (keysToDelete.size > 0) {
                    await db.spiedPlanets.bulkDelete(Array.from(keysToDelete));
                    console.log(`OGame Nexus: Successfully deleted ${keysToDelete.size} non-existent spied target(s) from local DB.`);

                    // Broadcast update to all tabs so open Galaxy views and Raid Radar refresh immediately
                    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
                        chrome.tabs.query({}, (tabs) => {
                            tabs.forEach(tab => {
                                if (tab.id) {
                                    chrome.tabs.sendMessage(tab.id, { type: "SPIED_PLANETS_UPDATED" }).catch(() => {});
                                }
                            });
                        });
                    }
                }

                sendResponse({ success: true, deletedCount: keysToDelete.size });
            } catch (err) {
                console.error("OGame Nexus: Error in DELETE_SPIED_PLANET", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "GET_ALL_TACTICAL_NOTES") {
        const { universe, playerId } = message.data || {};
        (async () => {
            try {
                const notes = await getTacticalNotesForUniverse(universe || '');
                sendResponse({ success: true, notes });
            } catch (err) {
                console.error("OGame Nexus: Error in GET_ALL_TACTICAL_NOTES", err);
                sendResponse({ success: false, notes: [], error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "SAVE_TACTICAL_NOTE") {
        const { note } = message.data || {};
        (async () => {
            try {
                if (!note || !note.noteKey) {
                    throw new Error("Invalid note payload");
                }
                const savedKey = await saveTacticalNoteToDB(note);
                if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                            if (tab.id) {
                                chrome.tabs.sendMessage(tab.id, { type: "TACTICAL_NOTE_SAVED", note }).catch(() => {});
                            }
                        });
                    });
                }
                sendResponse({ success: true, noteKey: savedKey });
            } catch (err) {
                console.error("OGame Nexus: Error in SAVE_TACTICAL_NOTE", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "DELETE_TACTICAL_NOTE") {
        const { noteKey } = message.data || {};
        (async () => {
            try {
                if (noteKey) {
                    await deleteTacticalNoteFromDB(noteKey);
                    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
                        chrome.tabs.query({}, (tabs) => {
                            tabs.forEach(tab => {
                                if (tab.id) {
                                    chrome.tabs.sendMessage(tab.id, { type: "TACTICAL_NOTE_DELETED", noteKey }).catch(() => {});
                                }
                            });
                        });
                    }
                }
                sendResponse({ success: true });
            } catch (err) {
                console.error("OGame Nexus: Error in DELETE_TACTICAL_NOTE", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }

    if (message.type === "TRACK_ANOMALY_MISSION") {
        const { mission } = message.data || {};
        (async () => {
            try {
                if (mission?.id) {
                    const missionIdStr = String(mission.id);
                    const existing = await db.anomalyMissions.get(missionIdStr);
                    if (existing) {
                        const waveMap = new Map<number, any>();
                        (existing.waves || []).forEach((w: any) => waveMap.set(w.waveNumber, w));
                        (mission.waves || []).forEach((w: any) => {
                            const cur = waveMap.get(w.waveNumber);
                            if (!cur || w.claimMethod === 'modal_confirmation') {
                                waveMap.set(w.waveNumber, w);
                            }
                        });
                        const mergedWaves = Array.from(waveMap.values()).sort((a: any, b: any) => a.waveNumber - b.waveNumber);
                        const mergedCombatIds = Array.from(new Set([...(existing.combatReportIds || []), ...(mission.combatReportIds || [])]));
                        const totalWaves = Math.max(existing.totalWaves || 1, mission.totalWaves || 1, mergedWaves.length, mergedCombatIds.length);
                        const isCompleted = mission.status === 'completed' || (existing.status === 'completed' && mission.status !== 'in_progress');
                        const currentWave = isCompleted ? totalWaves : (mission.currentWave || existing.currentWave || 1);
                        const fleetLossesMsu = Math.max(existing.fleetLossesMsu || 0, mission.fleetLossesMsu || 0);
                        const totalClaimedMsu = mergedWaves.length > 0
                            ? mergedWaves.reduce((sum: number, w: any) => sum + (w.msuValue || 0), 0)
                            : (mission.totalClaimedMsu || existing.totalClaimedMsu || 0);
                        const wavesLithium = mergedWaves.length > 0
                            ? mergedWaves.reduce((sum: number, w: any) => sum + (w.lithiumCost || 0), 0)
                            : (mission.totalClaimedLithium || existing.totalClaimedLithium || 0);
                        const completionLithium = mission.completionLithiumCost || existing.completionLithiumCost || 0;
                        const totalClaimedLithium = (completionLithium > 0 && completionLithium > wavesLithium)
                            ? completionLithium
                            : wavesLithium;
                        const debrisHarvests = existing.debrisHarvests || mission.debrisHarvests || [];
                        const totalDebrisHarvestedMsu = existing.totalDebrisHarvestedMsu || mission.totalDebrisHarvestedMsu || debrisHarvests.reduce((sum: number, d: any) => sum + (d.msuValue || 0), 0);
                        const grossTotal = totalClaimedMsu + totalDebrisHarvestedMsu;
                        const netProfitMsu = grossTotal - fleetLossesMsu;
                        const msuPerLithium = totalClaimedLithium > 0 ? grossTotal / totalClaimedLithium : 0;

                        await db.anomalyMissions.put({
                            ...existing,
                            ...mission,
                            id: missionIdStr,
                            playerId: (mission.playerId && mission.playerId !== 'unknown') ? mission.playerId : (existing.playerId || ''),
                            universe: mission.universe || existing.universe || '',
                            name: (mission.name && mission.name !== 'Unknown Mission') ? mission.name : existing.name,
                            category: (mission.category && mission.category !== 'other') ? mission.category : existing.category,
                            environment: mission.environment || existing.environment,
                            combatReportIds: mergedCombatIds,
                            waves: mergedWaves,
                            totalWaves,
                            currentWave,
                            status: isCompleted ? 'completed' : 'in_progress',
                            totalClaimedMsu,
                            totalClaimedLithium,
                            completionLithiumCost: completionLithium > 0 ? completionLithium : existing.completionLithiumCost,
                            debrisHarvests,
                            totalDebrisHarvestedMsu,
                            netProfitMsu,
                            msuPerLithium,
                            fleetLossesMsu,
                            enemyDestroyedMsu: Math.max(existing.enemyDestroyedMsu || 0, mission.enemyDestroyedMsu || 0),
                            updatedAt: Date.now()
                        });
                        if (mergedCombatIds.length > 0) {
                            await recalculateAnomalyMissionLosses(missionIdStr, mission.playerId || existing.playerId);
                        }
                    } else {
                        await db.anomalyMissions.put(mission);
                        if (mission.combatReportIds && mission.combatReportIds.length > 0) {
                            await recalculateAnomalyMissionLosses(missionIdStr, mission.playerId);
                        }
                    }
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: "Missing mission id" });
                }
            } catch (err) {
                console.error("OGame Nexus: Error in TRACK_ANOMALY_MISSION", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }
});
}

if (typeof chrome !== 'undefined' && chrome.action) {
    if (IS_EXTENSION_DISABLED) {
        chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
        chrome.action.setBadgeText({ text: 'OFF' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

chrome.action.onClicked.addListener(async (tab) => {
    let query = '';
    try {
        if (tab?.id && tab.url && (tab.url.includes('ogame.gameforge.com') || tab.url.includes('/game/index.php'))) {
            const resp = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_PLAYER_INFO" }).catch(() => null);
            if (resp?.playerId && resp?.universe) {
                query = `?universe=${cleanUniverseId(resp.universe)}&player=${resp.playerId}`;
            }
        }
    } catch {}
    chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard.html${query}`) });
});

if (typeof chrome !== 'undefined' && chrome.commands) {
    chrome.commands.onCommand.addListener((command) => {
        if (command === "open_dashboard") {
            chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
        }
    });
}


// ----------------------------------------------------------------------------
// COMPLIANCE: CLEAR ALL BACKGROUND ALARMS (NO AUTOMATED REPETITIVE TIMERS)
// ----------------------------------------------------------------------------
if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.clearAll();
}
