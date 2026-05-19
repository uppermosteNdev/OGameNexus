import { Planet } from '../db';
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

        planets.push(planet);
    });

    console.log(`OGame Nexus: Successfully scraped ${planets.length} planets from Empire page. Sections: [Buildings, Facilities, Ships, Defense, Research, Lifeform Buildings, Lifeform Research]`);
    return { planets, research };
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
