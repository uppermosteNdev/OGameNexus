import { db } from "../db";
import { parseOverview, parsePlayerDataXml, parseSupplies, parseResearches, parseLifeformResearch, parseLifeformBuildings, parseLifeformBonuses, parseServerDataXml } from "./scrapers";
import { LIFEFORM_BUILDING_DATA, SHIP_DATA } from "../db/staticData";
import { LIFEFORM_TECH_DATA, getLfTech, isLifeformBuilding } from "../db/lifeformTechData";
import { AMORTIZATION_TABLE, calculateEmpireProduction, calculateMSU, DEFAULT_RATES, Cost } from "../utils/amortizationCalc";
import { sanitizeActiveItem } from "../utils/items";

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

async function fetchPlanetSupplies(serverUrl: string, planetId: string) {
    const url = `${serverUrl}/game/index.php?page=ingame&component=supplies&cp=${planetId}`;
    try {
        const response = await fetch(url);
        const html = await response.text();
        return parseSupplies(html);
    } catch (err) {
        console.error(`Background: Error fetching supplies for planet ${planetId}`, err);
        return null;
    }
}
async function fetchPlanetOverview(serverUrl: string, planetId: string) {
    const url = `${serverUrl}/game/index.php?page=ingame&component=overview&cp=${planetId}`;
    try {
        const response = await fetch(url);
        const html = await response.text();
        return parseOverview(html);
    } catch (err) {
        console.error(`Background: Error fetching overview for planet ${planetId}`, err);
        return null;
    }
}

async function fetchPlanetResearch(serverUrl: string, planetId: string) {
    const url = `${serverUrl}/game/index.php?page=ingame&component=research&cp=${planetId}`;
    try {
        const response = await fetch(url);
        const html = await response.text();
        return parseResearches(html);
    } catch (err) {
        console.error(`Background: Error fetching researches for planet ${planetId}`, err);
        return null;
    }
}

async function fetchPlanetLifeformResearch(serverUrl: string, planetId: string) {
    const url = `${serverUrl}/game/index.php?page=ingame&component=lfresearch&cp=${planetId}`;
    try {
        const response = await fetch(url);
        const html = await response.text();
        return parseLifeformResearch(html);
    } catch (err) {
        console.error(`Background: Error fetching LF research for planet ${planetId}`, err);
        return null;
    }
}

async function fetchPlanetLifeformBuildings(serverUrl: string, planetId: string) {
    const url = `${serverUrl}/game/index.php?page=ingame&component=lfbuildings&cp=${planetId}`;
    try {
        const response = await fetch(url);
        const html = await response.text();
        return parseLifeformBuildings(html);
    } catch (err) {
        console.error(`Background: Error fetching LF buildings for planet ${planetId}`, err);
        return null;
    }
}

async function fetchPlanetLifeformBonuses(serverUrl: string, planetId: string) {
    const url = `${serverUrl}/game/index.php?page=ingame&component=lfbonuses&cp=${planetId}`;
    try {
        const response = await fetch(url);
        const html = await response.text();
        return parseLifeformBonuses(html);
    } catch (err) {
        console.error(`Background: Error fetching LF bonuses for planet ${planetId}`, err);
        return null;
    }
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
let debrisTrackingLock: Promise<any> = Promise.resolve();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "OPEN_DASHBOARD") {
        const view = message.view ? `?view=${encodeURIComponent(message.view)}` : '';
        chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard.html${view}`) });
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
        const { account, planets, overview, supplies, facilities, production, activePlanetId, lifeformId, researches, lifeformSetup, lifeformExperience, lifeformBuildings, empire } = message.data;
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
                                        jumpGate: safeFacilities.find((f: any) => f.id === 43)?.level
                                    } : {}),
                                    crawlers: supplies?.crawlers !== undefined ? supplies.crawlers : (empirePlanet?.crawlers !== undefined ? empirePlanet.crawlers : (empirePlanet?.ships?.[217] ?? (empirePlanet?.ships as any)?.[`217`] ?? existing?.ships?.[217] ?? (existing?.ships as any)?.[`217`] ?? existing?.crawlers ?? 0)),
                                    lifeformId: resolvedLifeformId,

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
                                    ships: empirePlanet?.ships || existing?.ships,
                                    defenses: empirePlanet?.defenses || existing?.defenses,
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
                    .filter(d => String(d.playerId).trim() === playerId && (!universe || d.universe === universe))
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
                const harvestKeys = harvests.map((d: any) => `${universe}_${d.messageId}`);
                const existingHarvests = await db.debrisHarvests.bulkGet(harvestKeys);
                const newHarvests: any[] = [];
                const finalResults: any[] = [];
 
                harvests.forEach((harvest: any, index: number) => {
                    const existing = existingHarvests[index];
                    const harvestKey = harvestKeys[index];
                    if (!existing) {
                        const newEntry = { ...harvest, harvestKey, universe, tracked: true, playerId };
                        newHarvests.push(newEntry);
                        finalResults.push({ ...newEntry, isNew: true });
                    } else {
                        finalResults.push(existing);
                    }
                });
 
                if (newHarvests.length > 0) {
                    await db.debrisHarvests.bulkPut(newHarvests);
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

                        // Apply real-time plundering reductions to tracked Raid Radar planets
                        const account = await db.accounts.get(playerId);
                        if (account) {
                            for (const combat of newCombats) {
                                if (combat.attackerName && combat.attackerName.toLowerCase() === account.playerName.toLowerCase()) {
                                    const matchingPlanets = await db.spiedPlanets
                                        .where('coords')
                                        .equals(combat.coords)
                                        .filter(p => p.universe === account.universe)
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
        const { espionageReports, userPlayerId, universe } = message.data;
        (async () => {
            try {
                const finalResults: any[] = [];

                for (const report of espionageReports) {
                    const planetKey = `${universe}_${report.planetId}`;
                    const existing = await db.spiedPlanets.get(planetKey);

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
                        // Consecutive report: Calculate delta against previous spied state
                        const dT = (report.timestamp - existing.lastSpiedTimestamp) / 3600; // in hours
                        
                        let newMetalRate = existing.metalPerHour;
                        let newCrystalRate = existing.crystalPerHour;
                        let newDeuteriumRate = existing.deuteriumPerHour;
                        let newSpyCount = existing.spyCount;
                        let confidence = existing.confidence;

                        if (dT >= 9 / 3600) { // Avoid noise/division by zero (minimum 9 seconds)
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
        const { universe } = message.data || {};
        (async () => {
            try {
                let planets;
                if (universe) {
                    planets = await db.spiedPlanets.where('universe').equals(universe).toArray();
                } else {
                    planets = await db.spiedPlanets.toArray();
                }
                const activeAccount = await db.accounts.orderBy('lastSeen').reverse().first();
                const galaxies = activeAccount?.galaxies || 9;
                sendResponse({ success: true, planets, galaxies });
            } catch (err) {
                console.error("OGame Nexus: Error in GET_ALL_SPIED_PLANETS", err);
                sendResponse({ success: false, planets: [], galaxies: 9 });
            }
        })();
        return true;
    }

    if (message.type === "DELETE_SPIED_PLANET") {
        const { planetKey } = message.data || {};
        (async () => {
            try {
                if (planetKey) {
                    await db.spiedPlanets.delete(planetKey);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: "Missing planetKey" });
                }
            } catch (err) {
                console.error("OGame Nexus: Error in DELETE_SPIED_PLANET", err);
                sendResponse({ success: false, error: String(err) });
            }
        })();
        return true;
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
