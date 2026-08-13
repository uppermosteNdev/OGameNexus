import { Planet, ActiveItem } from '../db';
import { LIFEFORM_TECH_DATA, getLfTech, isLifeformBuilding, isLifeformResearch } from '../db/lifeformTechData';
import { findItemByStyle, findItemByName, getLegacyTypeAndBonus, getItemIconUrl, sanitizeItemTitle } from '../utils/items';

function getEntityLevel(el: Element): number {
    const link = el.querySelector('a');
    // If there's an upgrade in progress, there are multiple links/texts. 
    // The first link contains the current level.
    const text = link ? link.textContent : el.textContent;
    return parseInt(text?.replace(/,/g, '').replace(/\./g, '') || '0');
}

export function scrapeEmpireData(): { planets: Partial<Planet>[], research: Record<number, number> } | null {
    // Try multiple possible containers
    const empire = document.querySelector('#empire') ||
        document.querySelector('#empireView') ||
        document.querySelector('.empireView') ||
        (document.querySelector('.planet') ? document.body : null);

    if (!empire || !empire.querySelector('.planet')) {
        return null;
    }

    const url = window.location.href;
    const isMoonView = url.includes('planetType=1');
    const planetType = isMoonView ? 'moon' : 'planet';

    console.log(`OGame Nexus: Scraping Empire page (${planetType}s)...`);

    const planetDivs = Array.from(empire.querySelectorAll('.planet:not(.summary)'));
    const planets: Partial<Planet>[] = [];
    const research: Record<number, number> = {};

    planetDivs.forEach((planetDiv) => {
        const planetId = planetDiv.id.replace('planet', '');
        if (!planetId) return;

        const planet: Partial<Planet> = {
            id: planetId,
            type: planetType,
            ships: {},
            defenses: {},
            lastUpdated: Date.now()
        };

        // Scrape Names and Coords
        const nameEl = planetDiv.querySelector('.planetname');
        if (nameEl) planet.name = nameEl.textContent?.trim();

        const coordsEl = planetDiv.querySelector('.coords a');
        if (coordsEl) {
            const coordsText = coordsEl.textContent?.trim();
            if (coordsText) planet.coords = coordsText.replace(/[\[\]]/g, '');
        }

        // Scrape current resources
        const metalEl = planetDiv.querySelector('.values.metal');
        if (metalEl) {
            planet.metal = getEntityLevel(metalEl);
        }
        const crystalEl = planetDiv.querySelector('.values.crystal');
        if (crystalEl) {
            planet.crystal = getEntityLevel(crystalEl);
        }
        const deuteriumEl = planetDiv.querySelector('.values.deuterium');
        if (deuteriumEl) {
            planet.deuterium = getEntityLevel(deuteriumEl);
        }

        // Scrape Buildings and Facilities
        const supplyValues = planetDiv.querySelectorAll('.values.supply div');
        supplyValues.forEach(val => {
            const techId = Array.from(val.classList).find(c => !isNaN(parseInt(c)));
            if (techId) {
                const level = getEntityLevel(val);
                mapTechToPlanet(planet, parseInt(techId), level);
            }
        });

        const stationValues = planetDiv.querySelectorAll('.values.station div');
        stationValues.forEach(val => {
            const techId = Array.from(val.classList).find(c => !isNaN(parseInt(c)));
            if (techId) {
                const level = getEntityLevel(val);
                mapTechToPlanet(planet, parseInt(techId), level);
            }
        });

        // Scrape Ships
        const shipValues = planetDiv.querySelectorAll('.values.ships div');
        shipValues.forEach(val => {
            const techId = Array.from(val.classList).find(c => !isNaN(parseInt(c)));
            if (techId && planet.ships) {
                const count = getEntityLevel(val);
                planet.ships[parseInt(techId)] = count;
                if (parseInt(techId) === 217) {
                    planet.crawlers = count;
                }
            }
        });

        // Scrape Defense
        const defenseValues = planetDiv.querySelectorAll('.values.defence div');
        defenseValues.forEach(val => {
            const techId = Array.from(val.classList).find(c => !isNaN(parseInt(c)));
            if (techId && planet.defenses) {
                const count = getEntityLevel(val);
                planet.defenses[parseInt(techId)] = count;
            }
        });

        // Scrape Research (Global, but we take it from each planet or sum)
        const researchValues = planetDiv.querySelectorAll('.values.research div');
        researchValues.forEach(val => {
            const techId = Array.from(val.classList).find(c => !isNaN(parseInt(c)));
            if (techId) {
                const level = getEntityLevel(val);
                research[parseInt(techId)] = level;
            }
        });

        // Scrape Lifeform Buildings and Research
        const lfBuildings: { id: number, name?: string, level: number }[] = [];
        const lfSetup: { slotNumber: number, selectedTechId: number | null, level: number }[] = [];

        const lfBuildingGroups = ['lifeform1buildings', 'lifeform2buildings', 'lifeform3buildings', 'lifeform4buildings'];
        lfBuildingGroups.forEach(group => {
            const vals = planetDiv.querySelectorAll(`.values.${group} div`);
            vals.forEach(val => {
                const techId = Array.from(val.classList).find(c => !isNaN(parseInt(c)));
                if (techId) {
                    const level = getEntityLevel(val);
                    if (level > 0) {
                        lfBuildings.push({ id: parseInt(techId), level });
                    }
                }
            });
        });

        const lfResearchGroups = ['lifeform1research', 'lifeform2research', 'lifeform3research', 'lifeform4research'];
        lfResearchGroups.forEach(group => {
            const vals = planetDiv.querySelectorAll(`.values.${group} div`);
            vals.forEach(val => {
                const techIdClass = Array.from(val.classList).find(c => !isNaN(parseInt(c)));
                if (techIdClass) {
                    const techId = parseInt(techIdClass);
                    const level = getEntityLevel(val);
                    if (level > 0) {
                        // Infer slot number from tech ID if possible (internal ID structure)
                        // techId = (slotNumber-1)*4 + lfId + some_offset?
                        // Actually, tech IDs are 11201 (slot 1, species 1), 11202 (slot 2, species 1)...
                        // Structure is 1 [Species] 2 [Slot01-18]
                        // e.g. 11216 -> Species 1, Type 2, Slot 16.
                        const techStr = techIdClass.toString();
                        let slotNumber = 0;
                        if (techStr.length === 5 && techStr.startsWith('1')) {
                            slotNumber = parseInt(techStr.substring(3, 5), 10);
                        }

                        // Look up the exact internal ID using the new gkId
                        const techData = LIFEFORM_TECH_DATA.find(t => t.gkId === techId);
                        const normalizedTechId = techData ? techData.id : techId;

                        lfSetup.push({ slotNumber, selectedTechId: normalizedTechId, level });
                    }
                }
            });
        });

        if (lfBuildings.length > 0) planet.lifeformBuildings = lfBuildings;
        if (lfSetup.length > 0) planet.lifeformSetup = lfSetup;



        // Scrape Active Boosters / Items
        const activeItems: ActiveItem[] = [];
        
        const itemEls = planetDiv.querySelectorAll('.empireItems .item_img');
        itemEls.forEach(itemEl => {
            const tooltipTitle = itemEl.getAttribute('data-tooltip-title') || itemEl.getAttribute('title') || '';
            const titleParts = tooltipTitle.split('|');
            const title = titleParts[0].trim();
            const bodyHtml = titleParts.slice(1).join('|');
            
            const style = itemEl.getAttribute('style');
            const mappedItem = findItemByStyle(style) || findItemByName(title);
            
            const ref = mappedItem?.ref || '';
            let type: ActiveItem['type'] = 'other';
            let bonus = 0;
            
            if (mappedItem) {
                const legacy = getLegacyTypeAndBonus(mappedItem);
                type = legacy.type;
                bonus = legacy.bonus;
            } else {
                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('metal booster')) {
                    type = 'metal';
                    if (lowerTitle.includes('platinum')) bonus = 0.40;
                    else if (lowerTitle.includes('gold')) bonus = 0.30;
                    else if (lowerTitle.includes('silver')) bonus = 0.20;
                    else if (lowerTitle.includes('bronze')) bonus = 0.10;
                } else if (lowerTitle.includes('crystal booster')) {
                    type = 'crystal';
                    if (lowerTitle.includes('platinum')) bonus = 0.40;
                    else if (lowerTitle.includes('gold')) bonus = 0.30;
                    else if (lowerTitle.includes('silver')) bonus = 0.20;
                    else if (lowerTitle.includes('bronze')) bonus = 0.10;
                } else if (lowerTitle.includes('deuterium booster')) {
                    type = 'deuterium';
                    if (lowerTitle.includes('platinum')) bonus = 0.40;
                    else if (lowerTitle.includes('gold')) bonus = 0.30;
                    else if (lowerTitle.includes('silver')) bonus = 0.20;
                    else if (lowerTitle.includes('bronze')) bonus = 0.10;
                } else if (lowerTitle.includes('expedition resource booster')) {
                    type = 'expedition_res';
                } else if (lowerTitle.includes('resource booster')) {
                    type = 'resource';
                } else if (lowerTitle.includes('expedition slots')) {
                    type = 'expedition_slots';
                } else if (lowerTitle.includes('fleet slots')) {
                    type = 'fleet_slots';
                } else if (lowerTitle.includes('planet fields')) {
                    type = 'fields';
                }
                
                const titlePercentMatch = title.match(/\((\d+)%\)/);
                if (titlePercentMatch) {
                    bonus = parseInt(titlePercentMatch[1], 10) / 100;
                }
            }
            
            let rarity = '';
            const parentClass = itemEl.parentElement?.className || '';
            const rarityMatch = parentClass.match(/r_(\w+)/);
            if (rarityMatch) rarity = rarityMatch[1];
            
            let timeRemaining = '';
            let expiryTimestamp: number | undefined;
            let duration = '';
            let isPermanent = false;
            
            const decodedHtml = bodyHtml
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#43;/g, '+');
            
            const restTimeMatch = decodedHtml.match(/class="restTime"[^>]*>Time remaining:\s*([^<]+)/i) || 
                                  decodedHtml.match(/Time remaining:\s*([^<]+)/i);
            if (restTimeMatch) {
                timeRemaining = restTimeMatch[1].trim();
                const secondsRemaining = parseOgameTime(timeRemaining);
                if (secondsRemaining > 0) {
                    expiryTimestamp = Date.now() + (secondsRemaining * 1000);
                }
            }
            
            const durationMatch = decodedHtml.match(/Duration:\s*([^<]+)/i);
            if (durationMatch) {
                duration = durationMatch[1].trim();
                if (duration.toLowerCase().includes('permanent')) {
                    isPermanent = true;
                }
            }
            
            const cleanTitle = sanitizeItemTitle(title, bonus);
            activeItems.push({
                ref,
                name: cleanTitle,
                title: cleanTitle,
                rarity,
                timeRemaining,
                expiryTimestamp,
                duration,
                isPermanent,
                bonus,
                type
            });
        });
        
        if (activeItems.length > 0) {
            planet.activeItems = activeItems;
        }

        planets.push(planet);
    });

    console.log(`OGame Nexus: Successfully scraped ${planets.length} planets from Empire page. Sections: [Buildings, Facilities, Ships, Defense, Research, Lifeform Buildings, Lifeform Research, Active Boosters]`);
    return { planets, research };
}

export function parseOgameTime(timeStr: string): number {
    const regex = /(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i;
    const matches = timeStr.match(regex);
    if (!matches) return 0;
    
    const weeks = parseInt(matches[1] || '0', 10);
    const days = parseInt(matches[2] || '0', 10);
    const hours = parseInt(matches[3] || '0', 10);
    const minutes = parseInt(matches[4] || '0', 10);
    const seconds = parseInt(matches[5] || '0', 10);
    
    return (weeks * 7 * 24 * 3600) + 
           (days * 24 * 3600) + 
           (hours * 3600) + 
           (minutes * 60) + 
           seconds;
}


function mapTechToPlanet(planet: Partial<Planet>, techId: number, level: number) {
    switch (techId) {
        case 1: planet.metalMine = level; break;
        case 2: planet.crystalMine = level; break;
        case 3: planet.deuteriumMine = level; break;
        case 4: planet.solarPlant = level; break;
        case 12: planet.fusionReactor = level; break;
        case 22: planet.metalStorage = level; break;
        case 23: planet.crystalStorage = level; break;
        case 24: planet.deuteriumStorage = level; break;
        case 212: planet.solarSatellites = level; break;
        case 14: planet.roboticsFactory = level; break;
        case 15: planet.naniteFactory = level; break;
        case 21: planet.shipyard = level; break;
        case 31: planet.researchLab = level; break;
        case 33: planet.terraformer = level; break;
        case 34: planet.allianceDepot = level; break;
        case 44: planet.missileSilo = level; break;
        case 36: planet.spaceDock = level; break;
        case 41: planet.lunarBase = level; break;
        case 42: planet.sensorPhalanx = level; break;
        case 43: planet.jumpGate = level; break;
    }
}

export function parseExternalDataExportJson(data: any): {
    planets: Partial<Planet>[],
    moons: Partial<Planet>[],
    research: Record<number, number>,
    officers?: any,
    playerClass?: number,
    allianceClass?: number,
    speciesExperience?: Record<string, any>
} {
    const planets: Partial<Planet>[] = [];
    const moons: Partial<Planet>[] = [];
    const research: Record<number, number> = {};

    if (!data) return { planets, moons, research };

    // 1. Global Researches
    if (data.researches && typeof data.researches === 'object') {
        Object.entries(data.researches).forEach(([techIdStr, lvl]) => {
            const techId = parseInt(techIdStr);
            const level = Number(lvl);
            if (!isNaN(techId)) {
                research[techId] = level;
            }
        });
    }

    // 2. Space Objects map (type 1 = planet, type 3 = moon)
    const typeMap: Record<number, 'planet' | 'moon'> = {};
    if (Array.isArray(data.spaceObjects)) {
        data.spaceObjects.forEach((so: any) => {
            if (so && so.id) {
                typeMap[Number(so.id)] = so.type === 3 ? 'moon' : 'planet';
            }
        });
    }

    // 3. Species Experience
    const speciesExp: Record<string, any> = {};
    if (data.species && data.species.values && typeof data.species.values === 'object') {
        Object.entries(data.species.values).forEach(([spId, info]: [string, any]) => {
            speciesExp[spId] = info;
        });
    }

    // 4. Planets & Moons
    if (data.planets && typeof data.planets === 'object' && !Array.isArray(data.planets)) {
        Object.values(data.planets).forEach((rawP: any) => {
            if (!rawP || !rawP.id) return;

            const objectId = Number(rawP.id);
            const isMoon = typeMap[objectId] === 'moon';

            const planet: Partial<Planet> = {
                id: String(rawP.id),
                name: rawP.name || (isMoon ? "Moon" : "Planet"),
                coords: `${rawP.galaxy}:${rawP.system}:${rawP.position}`,
                type: isMoon ? 'moon' : 'planet',
                ships: {},
                defenses: {},
                lifeformBuildings: [],
                lifeformSetup: [],
                lastUpdated: Date.now()
            };

            // Resources
            if (rawP.resources) {
                planet.metal = Number(rawP.resources.metal || 0);
                planet.crystal = Number(rawP.resources.crystal || 0);
                planet.deuterium = Number(rawP.resources.deuterium || 0);
            }

            // Production rates
            if (rawP.production) {
                planet.production = {
                    metal: Number(rawP.production.metal || 0),
                    crystal: Number(rawP.production.crystal || 0),
                    deuterium: Number(rawP.production.deuterium || 0),
                    lastUpdated: Date.now()
                };
            }

            // Buildings
            if (rawP.buildings && typeof rawP.buildings === 'object') {
                Object.entries(rawP.buildings).forEach(([techIdStr, lvl]) => {
                    const techId = parseInt(techIdStr);
                    const level = Number(lvl);
                    if (!isNaN(techId)) {
                        mapTechToPlanet(planet, techId, level);
                    }
                });
            }

            // Ships
            if (rawP.ships && typeof rawP.ships === 'object') {
                Object.entries(rawP.ships).forEach(([shipIdStr, count]) => {
                    const shipId = parseInt(shipIdStr);
                    const cnt = Number(count);
                    if (!isNaN(shipId) && cnt > 0) {
                        planet.ships![shipId] = cnt;
                    }
                });
            }

            // Defenses
            if (rawP.defenses && typeof rawP.defenses === 'object') {
                Object.entries(rawP.defenses).forEach(([defIdStr, count]) => {
                    const defId = parseInt(defIdStr);
                    const cnt = Number(count);
                    if (!isNaN(defId) && cnt > 0) {
                        planet.defenses![defId] = cnt;
                    }
                });
            }

            // Active Lifeform Species (701 -> 1, 702 -> 2, 703 -> 3, 704 -> 4)
            if (rawP.selectedSpeciesId) {
                const spId = Number(rawP.selectedSpeciesId);
                planet.lifeformId = spId > 700 ? spId - 700 : spId;
            }

            // Lifeform Buildings & Techs from selectedSpeciesTechnologyIds
            const selectedTechIds = Array.isArray(rawP.selectedSpeciesTechnologyIds) ? rawP.selectedSpeciesTechnologyIds : [];
            const activeBuildingIds = selectedTechIds.filter((id: number) => isLifeformBuilding(id));
            const activeTechIds = selectedTechIds.filter((id: number) => isLifeformResearch(id));

            // Lifeform Buildings
            if (activeBuildingIds.length > 0 && rawP.speciesBuildings) {
                planet.lifeformBuildings = activeBuildingIds
                    .map((bId: number) => {
                        const level = Number(rawP.speciesBuildings[bId] ?? rawP.speciesBuildings[String(bId)] ?? 0);
                        return { id: bId, level };
                    })
                    .filter((b: { id: number; level: number }) => b.level > 0);
            } else if (rawP.speciesBuildings && typeof rawP.speciesBuildings === 'object') {
                Object.entries(rawP.speciesBuildings).forEach(([bIdStr, lvl]) => {
                    const bId = parseInt(bIdStr);
                    const level = Number(lvl);
                    if (isLifeformBuilding(bId) && level > 0) {
                        planet.lifeformBuildings!.push({ id: bId, level });
                    }
                });
            }

            // Lifeform Techs
            if (activeTechIds.length > 0 && rawP.speciesResearches) {
                const rawSetup = activeTechIds.map((techId: number) => {
                    const techObj = getLfTech(techId);
                    const mappedId = techObj ? techObj.id : techId;
                    const slotNumber = techObj ? Math.floor((techObj.id - 1) / 4) + 1 : (techId % 100);
                    const level = Number(rawP.speciesResearches[techId] ?? rawP.speciesResearches[String(techId)] ?? 0);
                    return { slotNumber, selectedTechId: mappedId, level };
                });

                const slotMap = new Map<number, { slotNumber: number; selectedTechId: number | null; level: number }>();
                rawSetup.forEach((item: { slotNumber: number; selectedTechId: number | null; level: number }) => {
                    if (!item || !item.selectedTechId) return;
                    const existing = slotMap.get(item.slotNumber);
                    if (existing && existing.level > 0 && item.level === 0) return;
                    slotMap.set(item.slotNumber, item);
                });
                planet.lifeformSetup = Array.from(slotMap.values()).sort((a, b) => a.slotNumber - b.slotNumber);
            } else if (rawP.speciesResearches && typeof rawP.speciesResearches === 'object') {
                const rawSetup: { slotNumber: number; selectedTechId: number | null; level: number }[] = [];
                Object.entries(rawP.speciesResearches).forEach(([techIdStr, lvl]) => {
                    const techId = parseInt(techIdStr);
                    const level = Number(lvl);
                    const techObj = getLfTech(techId);
                    if (techObj) {
                        const slotNumber = Math.floor((techObj.id - 1) / 4) + 1;
                        rawSetup.push({ slotNumber, selectedTechId: techObj.id, level });
                    }
                });
                const slotMap = new Map<number, { slotNumber: number; selectedTechId: number | null; level: number }>();
                rawSetup.forEach((item: { slotNumber: number; selectedTechId: number | null; level: number }) => {
                    if (!item || !item.selectedTechId) return;
                    const existing = slotMap.get(item.slotNumber);
                    if (existing && existing.level > 0 && item.level === 0) return;
                    slotMap.set(item.slotNumber, item);
                });
                planet.lifeformSetup = Array.from(slotMap.values()).sort((a, b) => a.slotNumber - b.slotNumber);
            }

            // Active Item Buffs
            const rawBuffs = rawP.buffs || rawP.activeItems || rawP.items;
            if (Array.isArray(rawBuffs) && rawBuffs.length > 0) {
                planet.activeItems = [];
                const now = Date.now();

                rawBuffs.forEach((buff: any) => {
                    if (!buff) return;
                    const name = buff.name || buff.title || buff.nameSlug || '';
                    if (!name) return;

                    const isPermanent = buff.buffEnd === null || buff.effectEnd === null || buff.isPermanent === true;
                    let expiryTimestamp: number | undefined = undefined;
                    
                    const rawEnd = buff.effectEnd ?? buff.buffEnd ?? buff.expiryTimestamp ?? buff.expiry;
                    if (rawEnd !== undefined && rawEnd !== null) {
                        const numEnd = Number(rawEnd);
                        if (!isNaN(numEnd) && numEnd > 0) {
                            expiryTimestamp = numEnd > 1e11 ? numEnd : numEnd * 1000;
                        }
                    }

                    // Skip if expired
                    if (expiryTimestamp && expiryTimestamp <= now) return;

                    const mappedItem = findItemByName(name);
                    let type: ActiveItem['type'] = 'other';
                    let bonus = 0;

                    if (mappedItem) {
                        const legacyInfo = getLegacyTypeAndBonus(mappedItem);
                        type = legacyInfo.type;
                        bonus = legacyInfo.bonus;
                    } else {
                        const lowerName = name.toLowerCase();
                        if (lowerName.includes('metal')) type = 'metal';
                        else if (lowerName.includes('crystal')) type = 'crystal';
                        else if (lowerName.includes('deuterium')) type = 'deuterium';
                        else if (lowerName.includes('expedition resource booster')) type = 'expedition_res';
                        else if (lowerName.includes('expedition slot') || lowerName.includes('expedition computer')) type = 'expedition_slots';
                        else if (lowerName.includes('fleet slot')) type = 'fleet_slots';
                        else if (lowerName.includes('fields')) type = 'fields';

                        // Try parsing percentage bonus from name or title
                        const bonusMatch = (buff.title || name).match(/(\d+)\s*%/);
                        if (bonusMatch) {
                            bonus = Number(bonusMatch[1]) / 100;
                        } else if (buff.amount || buff.value) {
                            bonus = Number(buff.amount || buff.value);
                        }

                        if (bonus === 0) {
                            const lower = (buff.title || name).toLowerCase();
                            if (lower.includes('platinum')) bonus = 0.40;
                            else if (lower.includes('gold')) bonus = 0.30;
                            else if (lower.includes('silver')) bonus = 0.20;
                            else if (lower.includes('bronze')) bonus = 0.10;
                        }
                    }

                    const itemId = buff.itemUuid || buff.uuid || buff.id || buff.itemId || buff.ref;
                    const itemRef = buff.ref || buff.itemUuid || buff.uuid;
                    const iconUrl = getItemIconUrl({ name, ref: itemRef, itemUuid: buff.itemUuid || buff.uuid, id: itemId }, window.location.origin);

                    const cleanItemTitle = sanitizeItemTitle(buff.title || name, bonus);
                    planet.activeItems!.push({
                        id: itemId,
                        itemUuid: buff.itemUuid || buff.uuid,
                        ref: itemRef,
                        iconUrl: iconUrl || undefined,
                        name: cleanItemTitle,
                        title: cleanItemTitle,
                        rarity: buff.rarity || 'common',
                        isPermanent,
                        expiryTimestamp,
                        type,
                        bonus
                    });
                });
            }

            if (isMoon) {
                moons.push(planet);
            } else {
                planets.push(planet);
            }
        });
    }

    return {
        planets,
        moons,
        research,
        officers: data.officers,
        playerClass: data.characterClassId,
        allianceClass: data.allianceClassId,
        speciesExperience: speciesExp
    };
}

export function parseAjaxEmpireJson(
    ajaxData: any,
    isMoonView: boolean
): { planets: Partial<Planet>[], research: Record<number, number> } {
    const planets: Partial<Planet>[] = [];
    const research: Record<number, number> = {};

    let data = ajaxData;
    if (ajaxData && typeof ajaxData.mergedArray === 'string') {
        try {
            data = JSON.parse(ajaxData.mergedArray);
        } catch (e) {
            console.error("OGame Nexus: Failed to parse mergedArray from AJAX response", e);
        }
    }

    if (data && data.planets && !Array.isArray(data.planets) && typeof data.planets === 'object') {
        const extResult = parseExternalDataExportJson(data);
        return {
            planets: isMoonView ? extResult.moons : extResult.planets,
            research: extResult.research
        };
    }

    const rawPlanets = data?.planets || [];
    const groups = data?.groups || {};

    // 1. Extract global standard research from the first planet
    if (rawPlanets.length > 0 && groups.research) {
        const firstPlanet = rawPlanets[0];
        groups.research.forEach((techId: number) => {
            const val = firstPlanet[techId];
            if (val !== undefined) {
                research[techId] = typeof val === 'number' ? val : parseInt(val);
            }
        });
    }

    // 2. Parse planet/moon details
    rawPlanets.forEach((p: any) => {
        const planet: Partial<Planet> = {
            id: String(p.id),
            type: isMoonView ? 'moon' : 'planet',
            name: p.name,
            coords: p.coordinates ? p.coordinates.replace(/[\[\]]/g, '') : undefined,
            diameter: p.diameter ? parseInt(p.diameter.replace(/\D/g, '')) : undefined,
            fieldsUsed: p.fieldUsed ? parseInt(p.fieldUsed) : undefined,
            fieldsTotal: p.fieldMax ? parseInt(p.fieldMax) : undefined,
            ships: {},
            defenses: {},
            lastUpdated: Date.now()
        };

        // Parse hourly production rates
        if (p.production && p.production.hourly) {
            planet.production = {
                metal: p.production.hourly["0"] !== undefined ? (typeof p.production.hourly["0"] === 'number' ? p.production.hourly["0"] : parseInt(p.production.hourly["0"])) : 0,
                crystal: p.production.hourly["1"] !== undefined ? (typeof p.production.hourly["1"] === 'number' ? p.production.hourly["1"] : parseInt(p.production.hourly["1"])) : 0,
                deuterium: p.production.hourly["2"] !== undefined ? (typeof p.production.hourly["2"] === 'number' ? p.production.hourly["2"] : parseInt(p.production.hourly["2"])) : 0,
                lastUpdated: Date.now()
            };
        }

        // Parse current resources
        if (p.metal !== undefined) {
            planet.metal = typeof p.metal === 'number' ? p.metal : parseInt(p.metal);
        }
        if (p.crystal !== undefined) {
            planet.crystal = typeof p.crystal === 'number' ? p.crystal : parseInt(p.crystal);
        }
        if (p.deuterium !== undefined) {
            planet.deuterium = typeof p.deuterium === 'number' ? p.deuterium : parseInt(p.deuterium);
        }

        // Parse storage capacities
        if (p.metalStorage !== undefined) {
            planet.metalCapacity = typeof p.metalStorage === 'number' ? p.metalStorage : parseInt(p.metalStorage);
        }
        if (p.crystalStorage !== undefined) {
            planet.crystalCapacity = typeof p.crystalStorage === 'number' ? p.crystalStorage : parseInt(p.crystalStorage);
        }
        if (p.deuteriumStorage !== undefined) {
            planet.deuteriumCapacity = typeof p.deuteriumStorage === 'number' ? p.deuteriumStorage : parseInt(p.deuteriumStorage);
        }

        // Parse temperature (e.g., "-7°C to 33°C")
        if (p.temperature) {
            const temps = p.temperature.match(/(-?\d+)/g);
            if (temps && temps.length >= 2) {
                planet.tempMin = parseInt(temps[0]);
                planet.tempMax = parseInt(temps[1]);
            }
        }

        // Map supply levels (Mine levels, storages)
        if (groups.supply) {
            groups.supply.forEach((techId: number) => {
                const level = p[techId] !== undefined ? parseInt(p[techId]) : 0;
                mapTechToPlanet(planet, techId, level);
            });
        }

        // Map station levels (Robotics, Shipyard, Research Lab, Space Dock, Silo, etc.)
        if (groups.station) {
            groups.station.forEach((techId: number) => {
                const level = p[techId] !== undefined ? parseInt(p[techId]) : 0;
                mapTechToPlanet(planet, techId, level);
            });
        }

        // Map ship counts
        if (groups.ships) {
            groups.ships.forEach((techId: number) => {
                const count = p[techId] !== undefined ? parseInt(p[techId]) : 0;
                if (planet.ships) planet.ships[techId] = count;
            });
        }

        if (p["217"] !== undefined) {
            planet.crawlers = typeof p["217"] === 'number' ? p["217"] : parseInt(p["217"]);
        } else if (planet.ships && planet.ships[217] !== undefined) {
            planet.crawlers = planet.ships[217];
        }

        // Map defense counts
        if (groups.defence) {
            groups.defence.forEach((techId: number) => {
                const count = p[techId] !== undefined ? parseInt(p[techId]) : 0;
                if (planet.defenses) planet.defenses[techId] = count;
            });
        }

        // Map all lifeform building levels
        const lfBuildings: { id: number, name?: string, level: number }[] = [];
        const lfBuildingGroups = ['lifeform1buildings', 'lifeform2buildings', 'lifeform3buildings', 'lifeform4buildings'];
        lfBuildingGroups.forEach((groupName) => {
            const buildingIds = groups[groupName] || [];
            buildingIds.forEach((techId: number) => {
                const level = p[techId] !== undefined ? parseInt(p[techId]) : 0;
                if (level > 0) {
                    lfBuildings.push({ id: techId, level });
                }
            });
        });
        if (lfBuildings.length > 0) planet.lifeformBuildings = lfBuildings;

        // Map all lifeform tech levels (active slots check handled during DB write)
        const lfSetup: { slotNumber: number, selectedTechId: number | null, level: number }[] = [];
        const lfResearchGroups = ['lifeform1research', 'lifeform2research', 'lifeform3research', 'lifeform4research'];
        lfResearchGroups.forEach((groupName) => {
            const researchIds = groups[groupName] || [];
            researchIds.forEach((techId: number) => {
                const level = p[techId] !== undefined ? parseInt(p[techId]) : 0;
                if (level > 0) {
                    const techStr = techId.toString();
                    let slotNumber = 0;
                    if (techStr.length === 5 && techStr.startsWith('1')) {
                        slotNumber = parseInt(techStr.substring(3, 5), 10);
                    }
                    const techData = LIFEFORM_TECH_DATA.find(t => t.gkId === techId);
                    const normalizedTechId = techData ? techData.id : techId;
                    lfSetup.push({ slotNumber, selectedTechId: normalizedTechId, level });
                }
            });
        });
        if (lfSetup.length > 0) planet.lifeformSetup = lfSetup;



        // Parse Active Items / Boosters from equipment_html
        if (p.equipment_html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(p.equipment_html, 'text/html');
            const itemEls = doc.querySelectorAll('.item_img');
            
            const activeItems: ActiveItem[] = [];
            
            itemEls.forEach(itemEl => {
                const tooltipTitle = itemEl.getAttribute('data-tooltip-title') || itemEl.getAttribute('title') || '';
                const titleParts = tooltipTitle.split('|');
                const title = titleParts[0].trim();
                const bodyHtml = titleParts.slice(1).join('|');
                
                const style = itemEl.getAttribute('style');
                const mappedItem = findItemByStyle(style) || findItemByName(title);
                
                const ref = mappedItem?.ref || '';
                let type: ActiveItem['type'] = 'other';
                let bonus = 0;
                
                if (mappedItem) {
                    const legacy = getLegacyTypeAndBonus(mappedItem);
                    type = legacy.type;
                    bonus = legacy.bonus;
                } else {
                    const lowerTitle = title.toLowerCase();
                    if (lowerTitle.includes('metal booster')) {
                        type = 'metal';
                        if (lowerTitle.includes('platinum')) bonus = 0.40;
                        else if (lowerTitle.includes('gold')) bonus = 0.30;
                        else if (lowerTitle.includes('silver')) bonus = 0.20;
                        else if (lowerTitle.includes('bronze')) bonus = 0.10;
                    } else if (lowerTitle.includes('crystal booster')) {
                        type = 'crystal';
                        if (lowerTitle.includes('platinum')) bonus = 0.40;
                        else if (lowerTitle.includes('gold')) bonus = 0.30;
                        else if (lowerTitle.includes('silver')) bonus = 0.20;
                        else if (lowerTitle.includes('bronze')) bonus = 0.10;
                    } else if (lowerTitle.includes('deuterium booster')) {
                        type = 'deuterium';
                        if (lowerTitle.includes('platinum')) bonus = 0.40;
                        else if (lowerTitle.includes('gold')) bonus = 0.30;
                        else if (lowerTitle.includes('silver')) bonus = 0.20;
                        else if (lowerTitle.includes('bronze')) bonus = 0.10;
                    } else if (lowerTitle.includes('expedition resource booster')) {
                        type = 'expedition_res';
                    } else if (lowerTitle.includes('resource booster')) {
                        type = 'resource';
                    } else if (lowerTitle.includes('expedition slots')) {
                        type = 'expedition_slots';
                    } else if (lowerTitle.includes('fleet slots')) {
                        type = 'fleet_slots';
                    } else if (lowerTitle.includes('planet fields')) {
                        type = 'fields';
                    }
                    
                    const titlePercentMatch = title.match(/\((\d+)%\)/);
                    if (titlePercentMatch) {
                        bonus = parseInt(titlePercentMatch[1], 10) / 100;
                    }
                }
                
                let rarity = '';
                const parentClass = itemEl.parentElement?.className || '';
                const rarityMatch = parentClass.match(/r_(\w+)/);
                if (rarityMatch) rarity = rarityMatch[1];
                
                let timeRemaining = '';
                let expiryTimestamp: number | undefined;
                let duration = '';
                let isPermanent = false;
                
                const decodedHtml = bodyHtml
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#43;/g, '+');
                
                const restTimeMatch = decodedHtml.match(/class="restTime"[^>]*>Time remaining:\s*([^<]+)/i) || 
                                      decodedHtml.match(/Time remaining:\s*([^<]+)/i);
                if (restTimeMatch) {
                    timeRemaining = restTimeMatch[1].trim();
                    const secondsRemaining = parseOgameTime(timeRemaining);
                    if (secondsRemaining > 0) {
                        expiryTimestamp = Date.now() + (secondsRemaining * 1000);
                    }
                }
                
                const durationMatch = decodedHtml.match(/Duration:\s*([^<]+)/i);
                if (durationMatch) {
                    duration = durationMatch[1].trim();
                    if (duration.toLowerCase().includes('permanent')) {
                        isPermanent = true;
                    }
                }
                
                activeItems.push({
                    ref,
                    name: title,
                    title,
                    rarity,
                    timeRemaining,
                    expiryTimestamp,
                    duration,
                    isPermanent,
                    bonus,
                    type
                });
            });
            
            if (activeItems.length > 0) {
                planet.activeItems = activeItems;
            }
        }

        planets.push(planet);
    });

    return { planets, research };
}
