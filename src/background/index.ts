import { db } from "../db";
import { parseProduction, parseOverview, parsePlayerDataXml, parseSupplies, parseResearches, parseLifeformResearch, parseLifeformBuildings, parseLifeformBonuses, parseServerDataXml } from "./scrapers";
import { LIFEFORM_BUILDING_DATA } from "../db/staticData";
import { AMORTIZATION_TABLE, calculateEmpireProduction } from "../utils/amortizationCalc";

function cleanObject(obj: any) {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach(key => cleaned[key] === undefined && delete cleaned[key]);
    return cleaned;
}

function mergeLifeformBuildings(existing: any[], incoming: any[]) {
    const result = [...existing];
    incoming.forEach(nb => {
        // Find name from static data if missing
        if (!nb.name) {
            const staticData = LIFEFORM_BUILDING_DATA.find(sb => sb.id === nb.id);
            if (staticData) nb.name = staticData.name;
        }

        const idx = result.findIndex(eb => eb.id === nb.id);
        if (idx !== -1) {
            result[idx] = {
                ...result[idx],
                name: nb.name || result[idx].name,
                level: nb.level
            };
        } else {
            result.push(nb);
        }
    });
    return result;
}

function mergeLifeformSetup(existing: any[], incoming: any[], fromEmpire: boolean = false) {
    const result = [...existing];
    incoming.forEach(ns => {
        if (fromEmpire) {
            // When scraping from Empire, we get ALL tech levels (up to 72). 
            // We ONLY want to update the level if this specific tech is CURRENTLY the active one in the slot.
            // We absolutely DO NOT want to overwrite the active selection (selectedTechId) with another species' tech just because they share a slot.
            const idx = result.findIndex(es => es.slotNumber === ns.slotNumber && es.selectedTechId === ns.selectedTechId);
            if (idx !== -1) {
                result[idx].level = ns.level;
            }
        } else {
            // Normal behavior (from lfresearch page where we only get the active setup)
            // Find existing by slot if provided, or by techId
            const idx = result.findIndex(es =>
                (ns.slotNumber > 0 && es.slotNumber === ns.slotNumber) ||
                (ns.slotNumber === 0 && es.selectedTechId === ns.selectedTechId)
            );

            if (idx !== -1) {
                // Keep slot number if existing has it and incoming doesn't
                const slotNumber = ns.slotNumber > 0 ? ns.slotNumber : result[idx].slotNumber;

                result[idx] = {
                    ...result[idx],
                    slotNumber,
                    selectedTechId: ns.selectedTechId,
                    level: ns.level
                };
            } else {
                result.push(ns);
            }
        }
    });
    return result;
}

async function fetchPlanetProduction(serverUrl: string, planetId: string) {
    const url = `${serverUrl}/game/index.php?page=ingame&component=resourcesettings&cp=${planetId}`;
    try {
        const response = await fetch(url);
        const html = await response.text();
        return parseProduction(html);
    } catch (err) {
        console.error(`Background: Error fetching production for planet ${planetId}`, err);
        return null;
    }
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "OPEN_DASHBOARD") {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    }

    if (message.type === "FETCH_LATEST_CAPACITIES") {
        const { planetId } = message;
        (async () => {
            try {
                const planet = await db.planets.get(planetId);
                const account = await db.accounts.get(planet?.playerId || "");
                if (planet && account?.serverUrl) {
                    const scraped = await fetchPlanetProduction(account.serverUrl, planetId);
                    if (scraped) {
                        await db.planets.update(planetId, {
                            metalCapacity: scraped.metalCapacity,
                            crystalCapacity: scraped.crystalCapacity,
                            deuteriumCapacity: scraped.deuteriumCapacity,
                            production: {
                                metal: scraped.metal,
                                crystal: scraped.crystal,
                                deuterium: scraped.deuterium,
                                lastUpdated: scraped.lastUpdated
                            }
                        });
                        sendResponse({ success: true });
                        return;
                    }
                }
                sendResponse({ success: false });
            } catch (err) {
                console.error("OGame Nexus: Error in FETCH_LATEST_CAPACITIES", err);
                sendResponse({ success: false });
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
                    const incomingResearches = researches || (empire?.research ? Object.entries(empire.research).map(([id, level]) => ({ id: parseInt(id), level })) : null);

                    if (incomingResearches) {
                        const newResearches = [...mergedResearches];
                        incomingResearches.forEach((nr: any) => {
                            const idx = newResearches.findIndex((er: any) => er.id === nr.id);
                            if (idx !== -1) {
                                // Trust incoming if > 0 to resolve concatenation bugs
                                const finalLevel = nr.level > 0 ? nr.level : newResearches[idx].level;
                                newResearches[idx] = { ...newResearches[idx], level: finalLevel };
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

                    await db.accounts.put(cleanObject({
                        ...existing,
                        ...account,
                        ...serverData,
                        ...(overview?.accountData || {}),
                        researches: mergedResearches,
                        ...(lifeformExperience ? { lifeformExperience } : {}),
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
                            const empirePlanet = empire?.planets?.find((ep: any) => ep.id === p.id);

                            const updateData: any = cleanObject({
                                ...p,
                                ...empirePlanet,
                                playerId: account.playerId,
                                ...(isMainPlanet ? {
                                    ...(overview?.planetData || {}),
                                    ...supplies,
                                    ...(facilities ? {
                                        facilities,
                                        // Also map array back to individual fields for compatibility
                                        roboticsFactory: facilities.find((f: any) => f.id === 14)?.level,
                                        shipyard: facilities.find((f: any) => f.id === 21)?.level,
                                        researchLab: facilities.find((f: any) => f.id === 31)?.level,
                                        allianceDepot: facilities.find((f: any) => f.id === 34)?.level,
                                        missileSilo: facilities.find((f: any) => f.id === 44)?.level,
                                        naniteFactory: facilities.find((f: any) => f.id === 15)?.level,
                                        terraformer: facilities.find((f: any) => f.id === 33)?.level,
                                        spaceDock: facilities.find((f: any) => f.id === 36)?.level,
                                        lunarBase: facilities.find((f: any) => f.id === 41)?.level,
                                        sensorPhalanx: facilities.find((f: any) => f.id === 42)?.level,
                                        jumpGate: facilities.find((f: any) => f.id === 43)?.level
                                    } : {}),
                                    lifeformId: lifeformId || overview?.planetData?.lifeformId || empirePlanet?.lifeformId || existing?.lifeformId,

                                    // Security: LF Tech levels can only go up. Merge incoming with existing.
                                    lifeformSetup: mergeLifeformSetup(existing?.lifeformSetup || [], lifeformSetup || empirePlanet?.lifeformSetup || [], !lifeformSetup && !!empirePlanet?.lifeformSetup),

                                    // Merge Buildings: Keep all, update levels for those found on the page
                                    lifeformBuildings: mergeLifeformBuildings(existing?.lifeformBuildings || [], lifeformBuildings || empirePlanet?.lifeformBuildings || []),

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
                                    ships: empirePlanet?.ships || existing?.ships,
                                    defenses: empirePlanet?.defenses || existing?.defenses,
                                    lifeformBuildings: mergeLifeformBuildings(existing?.lifeformBuildings || [], empirePlanet?.lifeformBuildings || []),
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
                        }

                        // Fetch the fully merged and updated list of planets to compute accurate global production
                        const updatedPlanets = await db.planets.where('playerId').equals(account.playerId).toArray();
                        const updatedAccount = await db.accounts.get(account.playerId);
                        if (updatedAccount) {
                            // Expired items check: filter out any activeItems that have already expired
                            const now = Date.now();
                            for (const pl of updatedPlanets) {
                                if (pl.activeItems && pl.activeItems.length > 0) {
                                    const activeCount = pl.activeItems.length;
                                    const remainingItems = pl.activeItems.filter(item => !item.expiryTimestamp || item.expiryTimestamp > now);
                                    
                                    // If any items were removed, re-calculate the cumulative boosters object
                                    if (remainingItems.length < activeCount) {
                                        const boosters = { metal: 0, crystal: 0, deuterium: 0 };
                                        remainingItems.forEach(item => {
                                            if (item.bonus && item.bonus > 0) {
                                                if (item.type === 'metal') boosters.metal += item.bonus;
                                                else if (item.type === 'crystal') boosters.crystal += item.bonus;
                                                else if (item.type === 'deuterium') boosters.deuterium += item.bonus;
                                                else if (item.type === 'resource') {
                                                    boosters.metal += item.bonus;
                                                    boosters.crystal += item.bonus;
                                                    boosters.deuterium += item.bonus;
                                                }
                                            }
                                        });
                                        pl.activeItems = remainingItems;
                                        pl.boosters = boosters;
                                        // Save corrected boosters/items in DB
                                        await db.planets.update(pl.id, { activeItems: pl.activeItems, boosters: pl.boosters });
                                    }
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
                        // Check if the old record was scraped without details
                        if (!existing.resultDetails && exp.resultDetails) {
                            existing.resultDetails = exp.resultDetails;
                            toUpdate.push(existing);
                        }
                        finalResults.push(existing);
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

                const totals = { metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, artifacts: 0, items: 0 };
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
                        finalResults.push(existing);
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
        })();
        return true;
    }

    if (message.type === "GET_ALL_ANALYTICS") {
        const playerId = String(message.playerId || message.data?.playerId || '').trim();
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
                    .filter(d => String(d.playerId).trim() === playerId)
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
        const { harvests, playerId } = message.data;
        (async () => {
            try {
                const messageIds = harvests.map((d: any) => d.messageId);
                const existingHarvests = await db.debrisHarvests.bulkGet(messageIds);
                const newHarvests: any[] = [];
                const finalResults: any[] = [];

                harvests.forEach((harvest: any, index: number) => {
                    const existing = existingHarvests[index];
                    if (!existing) {
                        const newEntry = { ...harvest, tracked: true, playerId };
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
                                const matchingPlanets = await db.spiedPlanets.where('coords').equals(combat.coords).toArray();
                                if (matchingPlanets.length > 0) {
                                    const spiedPlanet = matchingPlanets[0];
                                    // Only reduce if the combat report is newer than our last spied/reduced state
                                    if (combat.timestamp > spiedPlanet.lastSpiedTimestamp) {
                                        const dT = (combat.timestamp - spiedPlanet.lastSpiedTimestamp) / 3600; // in hours
                                        const metalAccumulated = spiedPlanet.metalPerHour * dT;
                                        const crystalAccumulated = spiedPlanet.crystalPerHour * dT;
                                        const deuteriumAccumulated = spiedPlanet.deuteriumPerHour * dT;

                                        const metalCap = spiedPlanet.metalCapacity || 10000;
                                        const crystalCap = spiedPlanet.crystalCapacity || 10000;
                                        const deuteriumCap = spiedPlanet.deuteriumCapacity || 10000;

                                        // Total resources accumulated on the planet right before plundering
                                        const metalTotalAtCombat = Math.max(spiedPlanet.lastSpiedMetal, Math.min(metalCap, spiedPlanet.lastSpiedMetal + metalAccumulated));
                                        const crystalTotalAtCombat = Math.max(spiedPlanet.lastSpiedCrystal, Math.min(crystalCap, spiedPlanet.lastSpiedCrystal + crystalAccumulated));
                                        const deuteriumTotalAtCombat = Math.max(spiedPlanet.lastSpiedDeuterium, Math.min(deuteriumCap, spiedPlanet.lastSpiedDeuterium + deuteriumAccumulated));

                                        // Discoverer (class 3) plunders 75% leaving 25%. Others plunder 50% leaving 50%.
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
        const { espionageReports, playerId } = message.data;
        (async () => {
            try {
                const finalResults: any[] = [];

                for (const report of espionageReports) {
                    const existing = await db.spiedPlanets.get(report.planetId);

                    if (!existing) {
                        // First spy report: create baseline
                        const hasTraderClass = report.hasTraderClass || false;
                        const metalStorageLevel = report.metalStorageLevel || 0;
                        const crystalStorageLevel = report.crystalStorageLevel || 0;
                        const deuteriumStorageLevel = report.deuteriumStorageLevel || 0;

                        const newPlanet = {
                            planetId: report.planetId,
                            playerId: report.playerId,
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
                            metalCapacity: calculateStorageCapacity(metalStorageLevel, hasTraderClass),
                            crystalCapacity: calculateStorageCapacity(crystalStorageLevel, hasTraderClass),
                            deuteriumCapacity: calculateStorageCapacity(deuteriumStorageLevel, hasTraderClass)
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

                        if (dT >= 0.0333) { // Avoid noise/division by zero (minimum 2 minutes)
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
                        const metalStorageLevel = report.metalStorageLevel !== undefined ? report.metalStorageLevel : (existing.metalStorageLevel || 0);
                        const crystalStorageLevel = report.crystalStorageLevel !== undefined ? report.crystalStorageLevel : (existing.crystalStorageLevel || 0);
                        const deuteriumStorageLevel = report.deuteriumStorageLevel !== undefined ? report.deuteriumStorageLevel : (existing.deuteriumStorageLevel || 0);

                        await db.spiedPlanets.put({
                            ...existing,
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
                            metalCapacity: calculateStorageCapacity(metalStorageLevel, hasTraderClass),
                            crystalCapacity: calculateStorageCapacity(crystalStorageLevel, hasTraderClass),
                            deuteriumCapacity: calculateStorageCapacity(deuteriumStorageLevel, hasTraderClass)
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
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
