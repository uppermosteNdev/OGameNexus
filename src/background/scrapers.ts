/**
 * Parsing utilities for OGame HTML content.
 * These rely on Regex for Service Worker compatibility (no DOM available).
 */

export interface ScrapedProduction {
    metal: number;
    crystal: number;
    deuterium: number;
    metalCapacity?: number;
    crystalCapacity?: number;
    deuteriumCapacity?: number;
    lastUpdated: number;
}

export interface ScrapedOverview {
    diameter?: number;
    fieldsUsed?: number;
    fieldsTotal?: number;
    tempMin?: number;
    tempMax?: number;
    coords?: string;
    score?: number;
    rank?: number;
    totalPlayers?: number;
    honorPoints?: number;
    lifeformId?: number;
}

export function parseProduction(html: string): ScrapedProduction | null {
    const summaryMatch = html.match(/<tr[^>]*class="[^"]*summaryHourly[^"]*"[^>]*>([\s\S]*?)<\/tr>/);
    if (!summaryMatch) return null;

    const rowContent = summaryMatch[1];

    const getVal = (idx: number) => {
        const tdRegex = new RegExp(`<td[^>]*data-resourceidx=["']${idx}["'][^>]*>([\\s\\S]*?)<\\/td>`, 'i');
        const tdMatch = rowContent.match(tdRegex);
        if (!tdMatch) return 0;

        const tdContent = tdMatch[1];
        const valueMatch = tdContent.match(/(?:data-tooltip-title|title)=["']([^"']+)["']/i);

        if (valueMatch) {
            const titleContent = valueMatch[1];
            const numberMatches = titleContent.match(/[\d,.]+/g);
            if (numberMatches) {
                const rawValue = numberMatches[numberMatches.length - 1];
                const cleaned = rawValue.replace(/,/g, '');
                const val = parseFloat(cleaned);
                if (!isNaN(val)) return val;
            }
        }
        return 0;
    };

    const data: ScrapedProduction = {
        metal: getVal(0),
        crystal: getVal(1),
        deuterium: getVal(2),
        lastUpdated: Date.now()
    };

    // Extract Storage Capacity
    // Try to find the row by class first (usually 'alt' right after summaryHourly)
    // Or look for any row containing a cell that looks like "Storage capacity" or has 3+ numeric value cells
    let storageRow = null;
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    const summaryIdx = rows.findIndex(r => r.includes('summaryHourly'));

    if (summaryIdx !== -1 && rows.length > summaryIdx + 1) {
        // Usually it's the next 'alt' row
        for (let i = summaryIdx + 1; i < summaryIdx + 4 && i < rows.length; i++) {
            if (rows[i].includes('class="alt"') || rows[i].toLowerCase().includes('storage')) {
                storageRow = rows[i];
                break;
            }
        }
    }

    if (storageRow) {
        console.log('Background: Found potential storage row');
        // Look for td elements - being generous with classes
        const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const tdMatches = [...storageRow.matchAll(tdPattern)];

        // OGame production table has: Resource Name | Metal | Crystal | Deuterium | (sometimes Energy)
        // We want indices 1, 2, 3 (skipping the label)
        if (tdMatches.length >= 4) {
            for (let i = 1; i <= 3; i++) {
                const tdContent = tdMatches[i][1];
                // Check tooltip for exact value
                const valMatch = tdContent.match(/(?:data-tooltip-title|title)=["']([\d,.]+)["']/i);
                if (valMatch) {
                    const val = parseInt(valMatch[1].replace(/[,.]/g, ''));
                    if (i === 1) data.metalCapacity = val;
                    else if (i === 2) data.crystalCapacity = val;
                    else if (i === 3) data.deuteriumCapacity = val;
                    console.log(`Background: Extracted capacity ${i}: ${val}`);
                } else {
                    // Fallback: parse text content (remove tags and non-numeric chars)
                    const text = tdContent.replace(/<[^>]*>/g, '').trim();
                    const numMatch = text.match(/[\d,.]+/);
                    if (numMatch) {
                        let val = parseFloat(numMatch[0].replace(/,/g, ''));
                        // Handle shorthand like 1.4M or 252M
                        if (text.toUpperCase().includes('M')) val *= 1000000;
                        else if (text.toUpperCase().includes('K')) val *= 1000;
                        else if (text.toUpperCase().includes('G') || text.toUpperCase().includes('B')) val *= 1000000000;

                        if (i === 1 && !data.metalCapacity) data.metalCapacity = Math.floor(val);
                        else if (i === 2 && !data.crystalCapacity) data.crystalCapacity = Math.floor(val);
                        else if (i === 3 && !data.deuteriumCapacity) data.deuteriumCapacity = Math.floor(val);
                    }
                }
            }
        } else {
            console.warn('Background: Storage row found but not enough cells');
        }
    } else {
        console.warn('Background: Storage capacity row not found in HTML');
    }

    return data;
}

export function parseOverview(html: string): ScrapedOverview {
    const data: ScrapedOverview = {};

    // 1. Diameter & Fields: <span id="diameterContentField">12,800km (<span>244</span> / <span>245</span>)</span>
    const diameterMatch = html.match(/id=["']diameterContentField["'][^>]*>([\s\S]*?)<\/span>/i);
    if (diameterMatch) {
        const content = diameterMatch[1];
        // Diameter
        const dMatch = content.match(/([\d,.]+)\s*km/i);
        if (dMatch) data.diameter = parseInt(dMatch[1].replace(/[,.]/g, ''));

        // Fields: More robust, look for numbers separated by slash
        const fMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
        if (fMatch) {
            data.fieldsUsed = parseInt(fMatch[1]);
            data.fieldsTotal = parseInt(fMatch[2]);
        }
    }

    // 2. Temperature: <span id="temperatureContentField">-19°C to 21°C</span>
    const tempMatch = html.match(/id=["']temperatureContentField["'][^>]*>([\s\S]*?)<\/span>/i);
    if (tempMatch) {
        const content = tempMatch[1];
        const temps = content.match(/(-?\d+)/g);
        if (temps && temps.length >= 2) {
            data.tempMin = parseInt(temps[0]);
            data.tempMax = parseInt(temps[1]);
        }
    }

    // 3. Position: <span id="positionContentField">...>[5:160:6]</a></span>
    const posMatch = html.match(/id=["']positionContentField["'][^>]*>[\s\S]*?\[(\d+:\d+:\d+)\][\s\S]*?<\/span>/i);
    if (posMatch) {
        data.coords = posMatch[1];
    }

    // 4. Score & Rank: <span id="scoreContentField">...>235,214,806 (Place 16 of 615)</a></span>
    const scoreMatch = html.match(/id=["']scoreContentField["'][^>]*>[\s\S]*?>([\d,.]+)\s*\(Place\s*(\d+)\s*of\s*(\d+)\)[\s\S]*?<\/span>/i);
    if (scoreMatch) {
        data.score = parseInt(scoreMatch[1].replace(/[,.]/g, ''));
        data.rank = parseInt(scoreMatch[2]);
        data.totalPlayers = parseInt(scoreMatch[3]);
    }

    // 5. Honour: <span id="honorContentField">135,551</span>
    const honorMatch = html.match(/id=["']honorContentField["'][^>]*>([\d,.]+)<\/span>/i);
    if (honorMatch) {
        data.honorPoints = parseInt(honorMatch[1].replace(/[,.]/g, ''));
    }

    // 6. Lifeform Species: <div class="lifeform-item-icon small lifeform3"></div>
    const lfMatch = html.match(/class=["']lifeform-item-icon\s+small\s+lifeform(\d+)["']/i);
    if (lfMatch) {
        data.lifeformId = parseInt(lfMatch[1]);
    }

    return data;
}

export interface ScrapedPlayerData {
    positions: { [type: string]: { score: number, rank: number, ships?: number } };
    planets: Array<{ id: string, name: string, coords: string, size?: number, moon?: { id: string, name: string, size?: number } }>;
    alliance?: { id: string, name: string, tag: string };
}

export function parsePlayerDataXml(xml: string): ScrapedPlayerData {
    const data: ScrapedPlayerData = {
        positions: {},
        planets: []
    };

    // 1. Parse Positions
    const posMatches = xml.matchAll(/<position type=["'](\d+)["'] score=["']([\d.-]+)["'](?: ships=["'](\d+)["'])?>(\d+)<\/position>/g);
    for (const match of posMatches) {
        data.positions[match[1]] = {
            score: parseFloat(match[2]),
            ships: match[3] ? parseInt(match[3]) : undefined,
            rank: parseInt(match[4])
        };
    }

    // 2. Parse Planets and Moons
    // We match planet blocks and then moons inside them
    const planetBlocks = xml.matchAll(/<planet id=["'](\d+)["'] name=["']([^"']+)["'] coords=["']([^"']+)["'](?: size=["'](\d+)["'])?>([\s\S]*?)<\/planet>/g);
    for (const pMatch of planetBlocks) {
        const planetId = pMatch[1];
        const planetName = pMatch[2];
        const coords = pMatch[3];
        const planetSize = pMatch[4] ? parseInt(pMatch[4]) : undefined;
        const innerContent = pMatch[5];

        let moonData;
        const moonMatch = innerContent.match(/<moon id=["'](\d+)["'] name=["']([^"']+)["'] size=["'](\d+)["']\/>/);
        if (moonMatch) {
            moonData = {
                id: moonMatch[1],
                name: moonMatch[2],
                size: parseInt(moonMatch[3])
            };
        }

        data.planets.push({
            id: planetId,
            name: planetName,
            coords: coords,
            size: planetSize,
            moon: moonData
        });
    }

    // 3. Alliance
    const allianceMatch = xml.match(/<alliance id=["'](\d+)["']>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<tag>([^<]+)<\/tag>[\s\S]*?<\/alliance>/);
    if (allianceMatch) {
        data.alliance = {
            id: allianceMatch[1],
            name: allianceMatch[2],
            tag: allianceMatch[3]
        };
    }

    return data;
}

export interface ScrapedSupplies {
    metalMine?: number;
    crystalMine?: number;
    deuteriumMine?: number;
    solarPlant?: number;
    fusionReactor?: number;
    solarSatellites?: number;
    metalStorage?: number;
    crystalStorage?: number;
    deuteriumStorage?: number;
    crawlers?: number;
}

export function parseSupplies(html: string): ScrapedSupplies {
    const data: ScrapedSupplies = {};

    const getLevelByTechId = (techId: number) => {
        const regex = new RegExp(`data-technology=["']${techId}["'][^>]*>[\\s\\S]*?class=["']level["'][^>]*data-value=["'](\\d+)["']`, "i");
        const match = html.match(regex);
        return match ? parseInt(match[1]) : undefined;
    };

    data.metalMine = getLevelByTechId(1);
    data.crystalMine = getLevelByTechId(2);
    data.deuteriumMine = getLevelByTechId(3);
    data.solarPlant = getLevelByTechId(4);
    data.fusionReactor = getLevelByTechId(12);
    data.solarSatellites = getLevelByTechId(212);
    data.crawlers = getLevelByTechId(217);
    data.metalStorage = getLevelByTechId(22);
    data.crystalStorage = getLevelByTechId(23);
    data.deuteriumStorage = getLevelByTechId(24);

    return data;
}
export function parseResearches(html: string): { id: number, level: number }[] | null {
    const researches: { id: number, level: number }[] = [];
    const liRegex = /<li[^>]*class=["'][^"']*technology[^"']*["'][^>]*data-technology=["'](\d+)["'][^>]*>([\s\S]*?)<\/li>/gi;
    const levelRegex = /class=["']level["'][^>]*data-value=["'](\d+)["']/i;

    let match;
    while ((match = liRegex.exec(html)) !== null) {
        const id = parseInt(match[1]);
        const innerContent = match[2];
        const levelMatch = innerContent.match(levelRegex);
        if (levelMatch) {
            researches.push({ id, level: parseInt(levelMatch[1]) });
        }
    }

    return researches.length > 0 ? researches : null;
}

export function parseLifeformResearch(html: string): { slotNumber: number, selectedTechId: number, level: number }[] | null {
    const techSetup: { slotNumber: number, selectedTechId: number, level: number }[] = [];
    const liRegex = /<li[^>]*class=["'][^"']*technology[^"']*["'][^>]*data-technology=["'](\d+)["'][^>]*>([\s\S]*?)<\/li>/gi;
    const levelRegex = /class=["']level["'][^>]*data-value=["'](\d+)["']/i;

    let match;
    while ((match = liRegex.exec(html)) !== null) {
        const ogTechId = match[1];
        if (ogTechId.length === 5) {
            const lfId = parseInt(ogTechId[1]);
            const slotNumber = parseInt(ogTechId.substring(3, 5), 10);
            if (isNaN(lfId) || isNaN(slotNumber)) continue;

            const internalTechId = (slotNumber - 1) * 4 + lfId;
            const innerContent = match[2];
            const levelMatch = innerContent.match(levelRegex);

            if (levelMatch) {
                techSetup.push({
                    slotNumber,
                    selectedTechId: internalTechId,
                    level: parseInt(levelMatch[1], 10)
                });
            }
        }
    }

    if (techSetup.length === 0) return null;
    return techSetup.sort((a, b) => a.slotNumber - b.slotNumber);
}

export function parseLifeformBuildings(html: string): { id: number, name: string, level: number }[] | null {
    const buildings: { id: number, name: string, level: number }[] = [];
    const liRegex = /<li[^>]*class=["'][^"']*technology[^"']*["'][^>]*data-technology=["'](\d+)["'][^>]*aria-label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/li>/gi;
    const levelRegex = /class=["']level["'][^>]*data-value=["'](\d+)["']/i;

    let match;
    while ((match = liRegex.exec(html)) !== null) {
        const id = parseInt(match[1], 10);
        const name = match[2];
        const innerContent = match[3];
        const levelMatch = innerContent.match(levelRegex);

        if (levelMatch) {
            buildings.push({
                id,
                name,
                level: parseInt(levelMatch[1], 10)
            });
        }
    }

    return buildings.length > 0 ? buildings : null;
}

export function parseLifeformBonuses(html: string): { experience: any[], currentLifeformId: number | null } {
    const experience: any[] = [];
    let currentLifeformId: number | null = null;

    // Detect active lifeform on the bonuses page
    const lfMatch = html.match(/class=["']lifeform-item-icon[^"']*lifeform(\d+)[^"']*["']/i);
    if (lfMatch) currentLifeformId = parseInt(lfMatch[1], 10);

    // Extract experience data for all lifeforms
    const itemRegex = /<lifeform-item[^>]*>([\s\S]*?)<\/lifeform-item>/gi;
    const iconRegex = /class=["']lifeform-item-icon[^"']*lifeform(\d+)[^"']*["']/i;
    const xpRegex = /data-tooltip-title=["']Level\s+(\d+):\s+(\d+)\/(\d+)\s+XP["']/i;

    let match;
    while ((match = itemRegex.exec(html)) !== null) {
        const content = match[1];
        const lfMatch = content.match(iconRegex);
        const xpMatch = content.match(xpRegex);

        if (lfMatch && xpMatch) {
            experience.push({
                lifeformId: parseInt(lfMatch[1], 10),
                level: parseInt(xpMatch[1], 10),
                currentExp: parseInt(xpMatch[2], 10),
                nextLevelExp: parseInt(xpMatch[3], 10)
            });
        }
    }

    return { experience, currentLifeformId };
}

export interface ScrapedServerData {
    universeSpeed: number;
    topScore: number;
    speedFleetPeaceful: number;
    speedFleetWar: number;
    speedFleetHolding: number;
    donutGalaxy: number;
    donutSystem: number;
    galaxies: number;
    systems: number;
    bonusFields: number;
    cargoHyperspaceTechMultiplier: number;
}

export function parseServerDataXml(xml: string): ScrapedServerData {
    const getVal = (tag: string) => {
        const regex = new RegExp(`<${tag}>([^<]+)<\\/${tag}>`, 'i');
        const match = xml.match(regex);
        return match ? parseFloat(match[1]) : 0;
    };

    return {
        universeSpeed: getVal('speed'),
        topScore: getVal('topScore'),
        speedFleetPeaceful: getVal('speedFleetPeaceful'),
        speedFleetWar: getVal('speedFleetWar'),
        speedFleetHolding: getVal('speedFleetHolding'),
        donutGalaxy: getVal('donutGalaxy'),
        donutSystem: getVal('donutSystem'),
        galaxies: getVal('galaxies'),
        systems: getVal('systems'),
        bonusFields: getVal('bonusFields'),
        cargoHyperspaceTechMultiplier: getVal('cargoHyperspaceTechMultiplier')
    };
}
