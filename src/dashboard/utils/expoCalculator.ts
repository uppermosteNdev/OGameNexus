export const SHIP_SI_VALUES: Record<number, number> = {
    202: 4000,      // Small Cargo
    203: 12000,     // Large Cargo
    204: 4000,      // Light Fighter
    205: 10000,     // Heavy Fighter
    206: 27000,     // Cruiser
    207: 60000,     // Battleship
    208: 30000,     // Colony Ship
    209: 16000,     // Recycler
    210: 1000,      // Espionage Probe
    211: 75000,     // Bomber
    213: 110000,    // Destroyer
    214: 9000000,   // Deathstar (Rip)
    215: 70000,     // Battlecruiser
    218: 160000,    // Reaper
    219: 23000      // Pathfinder
};

export const SHIP_CARGO_VALUES: Record<number, number> = {
    202: 5000,
    203: 25000,
    204: 50,
    205: 100,
    206: 800,
    207: 1500,
    208: 7500,
    209: 10000,
    210: 5,
    211: 500,
    213: 2000,
    214: 1000000,
    215: 750,
    218: 10000,
    219: 10000
};

export const FINDABLE_SHIPS = [202, 203, 204, 205, 206, 207, 210, 211, 215, 219];

export interface ShipEntry {
    id: number;
    count: number;
}

export interface ExpoCalcConfig {
    universeSpeed: number;
    topPointsScore: number;
    playerClass: 'collector' | 'discoverer' | 'other';
    hasPathfinder: boolean;
    hyperspaceTechLevel: number;
    cargoHyperspaceTechMultiplier: number;
    fleetShips: ShipEntry[];
    resBonusPercent: number;
    shipBonusPercent: number;
    lifeformDiscovererBonusPercent: number; // Lifeform Bonus for Discoverer Class (Id 32)
    lifeformCargoBonuses?: Record<number, number>; // Ship ID -> lifeform cargo bonus percentage
    expeditionBoosterPercent: number;
}

export function calculateExpeditionFinds(config: ExpoCalcConfig) {
    // 1. Determine the Multiplier based on Class and Pathfinder presence
    let multiplier;
    const isCollector = config.playerClass.toLowerCase() === "collector";
    const isDiscoverer = config.playerClass.toLowerCase() === "discoverer";

    if (config.hasPathfinder) {
        multiplier = isCollector ? 2 : (3 * config.universeSpeed);
    } else {
        multiplier = isCollector ? 1 : (1.5 * config.universeSpeed);
    }

    // 2. Calculate the Expedition Limit (Base Cap)
    const expeditionLimit = multiplier * config.topPointsScore;

    // 3. Calculate Fleet Stats
    let totalCargo = 0;
    let totalSI = 0;

    config.fleetShips.forEach(ship => {
        const baseCargo = SHIP_CARGO_VALUES[ship.id] || 0;
        const si = SHIP_SI_VALUES[ship.id] || 0;

        // Cargo with Hyperspace Tech and Lifeform Cargo Tech bonuses
        const lfCargoBonus = config.lifeformCargoBonuses?.[ship.id] || 0;
        const cargoFactor = 1 + (config.hyperspaceTechLevel * config.cargoHyperspaceTechMultiplier / 100) + (lfCargoBonus / 100);

        // Collector class also gets +25% cargo for transporters (Small/Large Cargo)
        let classCargoBonus = 1;
        if (isCollector && (ship.id === 202 || ship.id === 203)) {
            classCargoBonus = 1.25;
        }

        totalCargo += Math.floor(baseCargo * ship.count * cargoFactor * classCargoBonus);
        totalSI += si * ship.count;
    });

    // 4. Calculate Resource Finds
    const resBonusFactor = 1 + (config.resBonusPercent / 100);
    const lifeformFactor = 1 + (config.lifeformDiscovererBonusPercent / 100);
    const boosterFactor = 1 + ((config.expeditionBoosterPercent || 0) / 100);

    // Base finds before being capped by cargo
    const potentialMetal = expeditionLimit * resBonusFactor;

    // Final finds are capped by cargo, then applied lifeform bonus, and then multiplied by the booster item percentage
    const maxMetal = Math.floor(Math.floor(Math.min(potentialMetal, totalCargo) * lifeformFactor) * boosterFactor);
    const maxCrystal = Math.floor(maxMetal / 2);
    const maxDeuterium = Math.floor(maxMetal / 3);

    // 5. Calculate Ship Finds
    let effectiveSIPool = 0;
    if (totalCargo > 0) {
        effectiveSIPool = Math.max(Math.min(totalCargo, expeditionLimit), 10000);
    }

    const shipBonusFactor = 1 + (config.shipBonusPercent / 100);

    const shipFinds = Object.keys(SHIP_SI_VALUES).map(idStr => {
        const id = parseInt(idStr);
        const si = SHIP_SI_VALUES[id];
        const canBeFound = FINDABLE_SHIPS.includes(id);

        let maxCount = 0;
        if (canBeFound && si > 0 && effectiveSIPool > 0) {
            maxCount = Math.floor((effectiveSIPool / si) * shipFindsScale(id, isDiscoverer) * shipBonusFactor);
        }

        return {
            id,
            canBeFound,
            maxCount
        };
    });

    return {
        expeditionLimit,
        maxMetal,
        maxCrystal,
        maxDeuterium,
        shipFinds,
        totalCargo,
        totalSI,
        maxShipsSI: effectiveSIPool * shipBonusFactor,
        theoreticalMaxMetal: Math.floor(Math.floor(potentialMetal * lifeformFactor) * boosterFactor),
        theoreticalMaxShipsSI: expeditionLimit * shipBonusFactor
    };
}

/**
 * Helper to determine the ship count scaling factor.
 * In OGame, discoverers find more ships.
 */
function shipFindsScale(shipId: number, isDiscoverer: boolean) {
    // This is a simplified scaling. Default is 1.0.
    // In some setups Discoverers might get extra, but usually the multiplier
    // in the 'multiplier' variable handles the base pool size.
    return 1.0;
}
