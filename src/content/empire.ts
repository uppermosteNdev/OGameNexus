import { Planet, ActiveItem } from '../db';
import { LIFEFORM_TECH_DATA } from '../db/lifeformTechData';

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
        const boosters = { metal: 0, crystal: 0, deuterium: 0 };
        
        const itemEls = planetDiv.querySelectorAll('.empireItems .item_img');
        itemEls.forEach(itemEl => {
            const tooltipTitle = itemEl.getAttribute('data-tooltip-title') || itemEl.getAttribute('title') || '';
            const titleParts = tooltipTitle.split('|');
            const title = titleParts[0].trim();
            const bodyHtml = titleParts.slice(1).join('|');
            
            const lowerTitle = title.toLowerCase();
            let type: ActiveItem['type'] = 'other';
            let bonus = 0;
            
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
            
            if (bonus > 0) {
                if (type === 'metal') boosters.metal += bonus;
                else if (type === 'crystal') boosters.crystal += bonus;
                else if (type === 'deuterium') boosters.deuterium += bonus;
                else if (type === 'resource') {
                    boosters.metal += bonus;
                    boosters.crystal += bonus;
                    boosters.deuterium += bonus;
                }
            }
        });
        
        if (activeItems.length > 0) {
            planet.activeItems = activeItems;
            planet.boosters = boosters;
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

        // Infer active lifeformId from building levels (second digit of techId e.g. 13101: 3=Mechas)
        let inferredLifeformId = 0;
        const firstLfBuilding = lfBuildings.find(b => b.level > 0);
        if (firstLfBuilding) {
            const techStr = firstLfBuilding.id.toString();
            if (techStr.length === 5 && techStr.startsWith('1')) {
                inferredLifeformId = parseInt(techStr[1], 10);
            }
        }
        // Fallback to active tech research selection
        if (!inferredLifeformId && lfSetup.length > 0) {
            const firstLfTech = lfSetup.find(t => t.level > 0);
            if (firstLfTech && firstLfTech.selectedTechId) {
                const techData = LIFEFORM_TECH_DATA.find(t => t.id === firstLfTech.selectedTechId);
                if (techData) {
                    inferredLifeformId = techData.lifeformId;
                }
            }
        }
        if (inferredLifeformId > 0) {
            planet.lifeformId = inferredLifeformId;
        }

        // Parse Active Items / Boosters from equipment_html
        if (p.equipment_html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(p.equipment_html, 'text/html');
            const itemEls = doc.querySelectorAll('.item_img');
            
            const activeItems: ActiveItem[] = [];
            const boosters = { metal: 0, crystal: 0, deuterium: 0 };
            
            itemEls.forEach(itemEl => {
                const tooltipTitle = itemEl.getAttribute('data-tooltip-title') || itemEl.getAttribute('title') || '';
                const titleParts = tooltipTitle.split('|');
                const title = titleParts[0].trim();
                const bodyHtml = titleParts.slice(1).join('|');
                
                const lowerTitle = title.toLowerCase();
                let type: ActiveItem['type'] = 'other';
                let bonus = 0;
                
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
                
                if (bonus > 0) {
                    if (type === 'metal') boosters.metal += bonus;
                    else if (type === 'crystal') boosters.crystal += bonus;
                    else if (type === 'deuterium') boosters.deuterium += bonus;
                    else if (type === 'resource') {
                        boosters.metal += bonus;
                        boosters.crystal += bonus;
                        boosters.deuterium += bonus;
                    }
                }
            });
            
            if (activeItems.length > 0) {
                planet.activeItems = activeItems;
                planet.boosters = boosters;
            }
        }

        planets.push(planet);
    });

    return { planets, research };
}
