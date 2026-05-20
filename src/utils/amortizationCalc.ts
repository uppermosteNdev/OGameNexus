
export interface Cost {
    metal: number;
    crystal: number;
    deuterium: number;
}

export interface AmortizationItem {
    name: string;
    type: AmortizationType;
    cost: Cost;
    msuCost: number;
    productionIncrease: number; // MSU value
    prodDelta: Cost; // Raw resource values
    roiHours: number;
    planetId?: string;
    currentLevel: number;
}

export enum AmortizationType {
    Mines = 1,
    LifeformProductionBuildings = 2,
    LifeformResearchBuildings = 3,
    LifeformProductionResearches = 4,
    LifeformExpeditionResearches = 5,
    PlasmaTechnology = 6
}

export const DEFAULT_RATES = {
    metal: 3,
    crystal: 2,
    deuterium: 1
};

export const AMORTIZATION_TABLE = [
    // Mines
    {
        name: "Metal Mine",
        id: null,
        type: AmortizationType.Mines,
        baseCost: { metal: 60, crystal: 15, deuterium: 0 },
        costFormula: (level: number) => ({
            metal: Math.floor(60 * Math.pow(1.5, level - 1)),
            crystal: Math.floor(15 * Math.pow(1.5, level - 1)),
            deuterium: 0
        }),
        reduction: "mineralResearchCenter",
        effect: { type: "metal", value: "mine_formula" }
    },
    {
        name: "Crystal Mine",
        id: null,
        type: AmortizationType.Mines,
        baseCost: { metal: 48, crystal: 24, deuterium: 0 },
        costFormula: (level: number) => ({
            metal: Math.floor(48 * Math.pow(1.6, level - 1)),
            crystal: Math.floor(24 * Math.pow(1.6, level - 1)),
            deuterium: 0
        }),
        reduction: "mineralResearchCenter",
        effect: { type: "crystal", value: "mine_formula" }
    },
    {
        name: "Deuterium Mine",
        id: null,
        type: AmortizationType.Mines,
        baseCost: { metal: 225, crystal: 75, deuterium: 0 },
        costFormula: (level: number) => ({
            metal: Math.floor(225 * Math.pow(1.5, level - 1)),
            crystal: Math.floor(75 * Math.pow(1.5, level - 1)),
            deuterium: 0
        }),
        reduction: "mineralResearchCenter",
        effect: { type: "deuterium", value: "mine_formula" }
    },
    // LF Buildings
    { name: "High-Performance Transformer", id: 13107, type: AmortizationType.LifeformResearchBuildings, baseCost: { metal: 35000, crystal: 15000, deuterium: 10000 }, multiplier: 1.5, lifeformId: 3, effect: { type: "tech_bonus", value: 0.003 } },
    { name: "Chip Mass Production", id: 13111, type: AmortizationType.LifeformResearchBuildings, baseCost: { metal: 55000, crystal: 50000, deuterium: 30000 }, multiplier: 1.5, lifeformId: 3, effect: { type: "tech_bonus", value: 0.004 } },
    { name: "High-Performance Synthesiser", id: 13110, type: AmortizationType.LifeformProductionBuildings, baseCost: { metal: 100000, crystal: 40000, deuterium: 20000 }, multiplier: 1.5, lifeformId: 3, effect: { type: "deuterium", value: 0.02, target: "mine" } },
    { name: "High Energy Smelting", id: 11106, type: AmortizationType.LifeformProductionBuildings, baseCost: { metal: 9000, crystal: 6000, deuterium: 3000 }, multiplier: 1.5, lifeformId: 1, effect: { type: "metal", value: 0.015, target: "mine" } },
    { name: "Fusion-Powered Production", id: 11108, type: AmortizationType.LifeformProductionBuildings, baseCost: { metal: 50000, crystal: 25000, deuterium: 15000 }, multiplier: 1.5, lifeformId: 1, effect: { type: "multiple", values: { metal: 0, crystal: 0.015, deuterium: 0.01 }, target: "mine" } },
    { name: "Metropolis", id: 11111, type: AmortizationType.LifeformResearchBuildings, baseCost: { metal: 80000, crystal: 35000, deuterium: 60000 }, multiplier: 1.5, lifeformId: 1, effect: { type: "tech_bonus", value: 0.005 } },
    { name: "Magma Forge", id: 12106, type: AmortizationType.LifeformProductionBuildings, baseCost: { metal: 10000, crystal: 8000, deuterium: 1000 }, multiplier: 1.4, lifeformId: 2, reduction: "megalith", effect: { type: "metal", value: 0.02, target: "mine" } },
    { name: "Crystal Refinery", id: 12109, type: AmortizationType.LifeformProductionBuildings, baseCost: { metal: 85000, crystal: 44000, deuterium: 25000 }, multiplier: 1.4, lifeformId: 2, reduction: "megalith", effect: { type: "crystal", value: 0.02, target: "mine" } },
    { name: "Deuterium Synthesiser", id: 12110, type: AmortizationType.LifeformProductionBuildings, baseCost: { metal: 120000, crystal: 50000, deuterium: 20000 }, multiplier: 1.4, lifeformId: 2, reduction: "megalith", effect: { type: "deuterium", value: 0.02, target: "mine" } },

    // LF Techs
    { name: "Catalyser Technology", id: 3, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 10000, crystal: 6000, deuterium: 1000 }, multiplier: 1.5, lifeformId: 3, reduction: "research_centers", effect: { type: "deuterium", value: 0.0008, target: "global" } },
    { name: "High-Performance Extractors", id: 5, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 7000, crystal: 10000, deuterium: 5000 }, multiplier: 1.5, lifeformId: 1, reduction: "research_centers", effect: { type: "all", value: 0.0006, target: "global" } },
    { name: "Acoustic Scanning", id: 6, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 7500, crystal: 12500, deuterium: 5000 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "crystal", value: 0.0008, target: "global" } },
    { name: "Sulphide Process", id: 8, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 7500, crystal: 12500, deuterium: 5000 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "deuterium", value: 0.0008, target: "global" } },
    { name: "High Energy Pump Systems", id: 10, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 15000, crystal: 10000, deuterium: 5000 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "deuterium", value: 0.0008, target: "global" } },
    { name: "Telekinetic Tractor Beam", id: 16, type: AmortizationType.LifeformExpeditionResearches, baseCost: { metal: 20000, crystal: 15000, deuterium: 7500 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "expo_si", value: 0.002 } },
    { name: "Magma-Powered Production", id: 18, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 25000, crystal: 20000, deuterium: 10000 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "all", value: 0.0006, target: "global" } },
    { name: "Enhanced Sensor Technology", id: 20, type: AmortizationType.LifeformExpeditionResearches, baseCost: { metal: 25000, crystal: 20000, deuterium: 10000 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "expo_res", value: 0.002 } },
    { name: "Automated Transport Lines", id: 23, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 50000, crystal: 50000, deuterium: 20000 }, multiplier: 1.5, lifeformId: 3, reduction: "research_centers", effect: { type: "all", value: 0.0006, target: "global" } },
    { name: "Depth Sounding", id: 26, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 70000, crystal: 40000, deuterium: 20000 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "metal", value: 0.0008, target: "global" } },
    { name: "Enhanced Production Technologies", id: 29, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 80000, crystal: 50000, deuterium: 20000 }, multiplier: 1.5, lifeformId: 1, reduction: "research_centers", effect: { type: "all", value: 0.0006, target: "global" } },
    { name: "Hardened Diamond Drill Heads", id: 38, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 85000, crystal: 40000, deuterium: 35000 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "metal", value: 0.0008, target: "global" } },
    { name: "Seismic Mining Technology", id: 42, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 120000, crystal: 30000, deuterium: 25000 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "crystal", value: 0.0008, target: "global" } },
    { name: "Sixth Sense", id: 44, type: AmortizationType.LifeformExpeditionResearches, baseCost: { metal: 120000, crystal: 30000, deuterium: 25000 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "expo_res", value: 0.002 } },
    { name: "Magma-Powered Pump Systems", id: 46, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 100000, crystal: 40000, deuterium: 30000 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "deuterium", value: 0.0008, target: "global" } },
    { name: "Psychoharmoniser", id: 48, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 100000, crystal: 40000, deuterium: 30000 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "all", value: 0.0006, target: "global" } },
    { name: "Artificial Swarm Intelligence", id: 51, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 200000, crystal: 100000, deuterium: 100000 }, multiplier: 1.5, lifeformId: 3, reduction: "research_centers", effect: { type: "all", value: 0.0006, target: "global" } },

    // Level * 1.7 scale
    { name: "Rock’tal Collector Enhancement", id: 70, type: AmortizationType.LifeformProductionResearches, baseCost: { metal: 300000, crystal: 180000, deuterium: 120000 }, multiplier: 1.7, lifeformId: 2, reduction: "research_centers", effect: { type: "all", value: 0.002, target: "global" } },
    { name: "Kaelesh Discoverer Enhancement", id: 72, type: AmortizationType.LifeformExpeditionResearches, baseCost: { metal: 300000, crystal: 180000, deuterium: 120000 }, multiplier: 1.7, lifeformId: 4, reduction: "research_centers", effect: { type: "kaelesh_discovery_adv", value: 0.002 } },

    // Plasma
    {
        name: "Plasma Technology",
        id: 122,
        type: AmortizationType.PlasmaTechnology,
        baseCost: { metal: 2000, crystal: 4000, deuterium: 1000 },
        costFormula: (level: number) => ({
            metal: Math.floor(2000 * Math.pow(2, level - 1)),
            crystal: Math.floor(4000 * Math.pow(2, level - 1)),
            deuterium: Math.floor(1000 * Math.pow(2, level - 1))
        }),
        reduction: "improvedStellarator",
        effect: { type: "plasma", value: 1 }
    }
];

export function calculateMSU(cost: Cost, rates: any = DEFAULT_RATES): number {
    const mMultiplier = 1;
    const cMultiplier = rates.metal / rates.crystal;
    const dMultiplier = rates.metal / rates.deuterium;

    return (cost.metal * mMultiplier) +
        (cost.crystal * cMultiplier) +
        (cost.deuterium * dMultiplier);
}

export function formatROI(hours: number): string {
    if (hours === Infinity || isNaN(hours)) return '∞';

    const years = Math.floor(hours / (24 * 365));
    const weeks = Math.floor((hours % (24 * 365)) / (24 * 7));
    const days = Math.floor((hours % (24 * 7)) / 24);
    const h = Math.floor(hours % 24);
    const m = Math.floor((hours * 60) % 60);

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (weeks > 0) parts.push(`${weeks}w`);
    if (days > 0) parts.push(`${days}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);

    return parts.join(' ');
}

function getPlanetTechMultiplier(planet: any, account: any): number {
    const lfLevel = account.lifeformExperience?.find((e: any) => e.id === planet.lifeformId || e.lifeformId === planet.lifeformId)?.level || 0;
    const lfLevelBonus = lfLevel * 0.001; // 0.1% per level

    let buildingBonus = 0;
    planet.lifeformBuildings?.forEach((b: any) => {
        const entry = AMORTIZATION_TABLE.find(e => e.id === b.id);
        if (entry && entry.effect && (entry.effect as any).type === 'tech_bonus') {
            buildingBonus += b.level * (entry.effect as any).value;
        }
    });

    return 1 + lfLevelBonus + buildingBonus;
}

function calculateTotalExpeditionBonus(state: EmpireState, type: 'expo_res' | 'expo_si'): number {
    let totalBonus = 0;
    state.planets.forEach(p => {
        const techMult = getPlanetTechMultiplier(p, state.account);
        p.lifeformSetup?.forEach((t: any) => {
            const level = t.level || 0;
            const entry = AMORTIZATION_TABLE.find(e => e.id === t.selectedTechId);
            if (entry && entry.effect && level > 0) {
                const effect = entry.effect as any;
                if (effect.type === type || effect.type === 'kaelesh_discovery_adv') {
                    totalBonus += (effect.value as number) * level * techMult;
                }
            }
        });
    });
    return totalBonus;
}


export interface EmpireState {
    account: any;
    planets: any[];
}

export interface ProductionResults {
    empireBase: { metal: number; crystal: number; deuterium: number };
    planets: {
        [planetId: string]: {
            base: { metal: number; crystal: number; deuterium: number };
            mult: { metal: number; crystal: number; deuterium: number };
            total: { metal: number; crystal: number; deuterium: number };
        }
    };
    globalBonuses: { metal: number; crystal: number; deuterium: number };
}

export function calculateEmpireProduction(state: EmpireState): ProductionResults {
    const { account, planets } = state;
    const universeSpeed = account.universeSpeed || 1;
    const playerClass = account.playerClass || 0;

    let globalEuroMetal = 0;
    let globalEuroCrystal = 0;
    let globalEuroDeut = 0;

    planets.forEach((p: any) => {
        const techMult = getPlanetTechMultiplier(p, account);
        p.lifeformSetup?.forEach((t: any) => {
            const level = t.level || 0;
            const entry = AMORTIZATION_TABLE.find(e => e.id === t.selectedTechId);
            if (entry && entry.effect && (entry.effect as any).target === 'global') {
                const val = (entry.effect as any).value * level * techMult;
                if ((entry.effect as any).type === 'metal') globalEuroMetal += val;
                if ((entry.effect as any).type === 'crystal') globalEuroCrystal += val;
                if ((entry.effect as any).type === 'deuterium') globalEuroDeut += val;
                if ((entry.effect as any).type === 'all') {
                    globalEuroMetal += val;
                    globalEuroCrystal += val;
                    globalEuroDeut += val;
                }
            }
        });
    });

    const results: ProductionResults = {
        empireBase: { metal: 0, crystal: 0, deuterium: 0 },
        planets: {},
        globalBonuses: { metal: globalEuroMetal, crystal: globalEuroCrystal, deuterium: globalEuroDeut }
    };

    planets.forEach((p: any) => {
        const m = p.metalMine || 0;
        const c = p.crystalMine || 0;
        const d = p.deuteriumMine || 0;
        const temp = p.tempMax || 20;

        let slot = 0;
        try { slot = parseInt(p.coords.split(':')[2]); } catch (e) { }
        let metalPosFactor = 1;
        if (slot === 6 || slot === 10) metalPosFactor = 1.17;
        else if (slot === 7 || slot === 9) metalPosFactor = 1.23;
        else if (slot === 8) metalPosFactor = 1.35;

        let crystalPosFactor = 1;
        if (slot === 1) crystalPosFactor = 1.4;
        else if (slot === 2) crystalPosFactor = 1.3;
        else if (slot === 3) crystalPosFactor = 1.2;

        const baseMetal = 30 * m * Math.pow(1.1, m) * universeSpeed * metalPosFactor;
        const baseCrystal = 20 * c * Math.pow(1.1, c) * universeSpeed * crystalPosFactor;
        const baseDeut = 10 * d * Math.pow(1.1, d) * (1.44 - 0.004 * temp) * universeSpeed;

        results.empireBase.metal += baseMetal;
        results.empireBase.crystal += baseCrystal;
        results.empireBase.deuterium += baseDeut;

        const plasmaLevel = account.researches?.find((r: any) => r.id === 122)?.level || 0;
        const plasmaMetal = plasmaLevel * 0.01;
        const plasmaCrystal = plasmaLevel * (0.66 / 100);
        const plasmaDeut = plasmaLevel * (0.33 / 100);

        let lfbMetal = 0, lfbCrystal = 0, lfbDeut = 0;
        p.lifeformBuildings?.forEach((b: any) => {
            if (b.id === 12106) lfbMetal += b.level * 0.02;
            if (b.id === 12109) lfbCrystal += b.level * 0.02;
            if (b.id === 12110) lfbDeut += b.level * 0.02;
            if (b.id === 13110) lfbDeut += b.level * 0.02;
            if (b.id === 11106) lfbMetal += b.level * 0.015;
            if (b.id === 11108) { lfbCrystal += b.level * 0.015; lfbDeut += b.level * 0.01; }
        });

        let classMetal = 0, classCrystal = 0, classDeut = 0;
        if (playerClass === 1) {
            classMetal = 0.25; classCrystal = 0.25; classDeut = 0.25;
        }

        const multMetal = 1 + plasmaMetal + lfbMetal + globalEuroMetal + classMetal;
        const multCrystal = 1 + plasmaCrystal + lfbCrystal + globalEuroCrystal + classCrystal;
        const multDeut = 1 + plasmaDeut + lfbDeut + globalEuroDeut + classDeut;

        results.planets[p.id] = {
            base: { metal: baseMetal, crystal: baseCrystal, deuterium: baseDeut },
            mult: { metal: multMetal, crystal: multCrystal, deuterium: multDeut },
            total: { metal: baseMetal * multMetal, crystal: baseCrystal * multCrystal, deuterium: baseDeut * multDeut }
        };
    });

    return results;
}

export function rankAmortizationItems(planets: any[], account: any, filters: { [key in AmortizationType]: boolean }, rates: any = DEFAULT_RATES, limit: number = 25, expoAverages?: { resources: Cost, ships: Cost, totals: { resources: Cost, ships: Cost } }, selectedPlanetIds?: string[]): AmortizationItem[] {
    // Deep clone to create full empire state
    const state: EmpireState = JSON.parse(JSON.stringify({ planets, account }));
    const resultItems: AmortizationItem[] = [];

    const REDUCTION_IDS = {
        mineralResearchCenter: 12111,
        megalith: 12108,
        researchCentre: 11103,
        runeTechnologium: 12103,
        roboticsResearchCentre: 13103,
        vortexChamber: 14103,
        improvedStellarator: 34
    };

    const getReduction = (type: string, planet: any, state: EmpireState): number => {
        if (!type) return 0;
        if (type === "mineralResearchCenter") {
            const level = planet.lifeformBuildings?.find((b: any) => b.id === REDUCTION_IDS.mineralResearchCenter)?.level || 0;
            return level * 0.005;
        }
        if (type === "megalith") {
            const level = planet.lifeformBuildings?.find((b: any) => b.id === REDUCTION_IDS.megalith)?.level || 0;
            return level * 0.01;
        }
        if (type === "research_centers") {
            const l1 = planet.lifeformBuildings?.find((b: any) => b.id === REDUCTION_IDS.researchCentre)?.level || 0;
            const l2 = planet.lifeformBuildings?.find((b: any) => b.id === REDUCTION_IDS.runeTechnologium)?.level || 0;
            const l3 = planet.lifeformBuildings?.find((b: any) => b.id === REDUCTION_IDS.roboticsResearchCentre)?.level || 0;
            const l4 = planet.lifeformBuildings?.find((b: any) => b.id === REDUCTION_IDS.vortexChamber)?.level || 0;
            return (l1 + l2 + l3 + l4) * 0.0025;
        }
        if (type === "improvedStellarator") {
            let totalBoostedLevel = 0;
            state.planets.forEach((pl: any) => {
                const tech = pl.lifeformSetup?.find((t: any) => t.selectedTechId === REDUCTION_IDS.improvedStellarator);
                if (tech && tech.level > 0) {
                    const techMult = getPlanetTechMultiplier(pl, state.account);
                    totalBoostedLevel += tech.level * techMult;
                }
            });
            // Improved Stellarator reduction is 0.15% per level (boosted)
            const reduction = totalBoostedLevel * 0.0015;
            return Math.min(0.5, reduction); // Cap at 50%
        }
        return 0;
    };

    for (let i = 0; i < limit; i++) {
        const prodData = calculateEmpireProduction(state);
        const candidates: AmortizationItem[] = [];

        // Pre-calculate current expedition bonuses for normalization
        const currentResBonus = calculateTotalExpeditionBonus(state, 'expo_res');
        const currentSiBonus = calculateTotalExpeditionBonus(state, 'expo_si');

        state.planets.forEach(p => {
            const isSelected = !selectedPlanetIds || selectedPlanetIds.includes(p.id);
            if (i === 0) console.groupCollapsed(`[Amortization Debug] Evaluating Planet: ${p.coords} (${p.name}) [Selected: ${isSelected}]`);
            AMORTIZATION_TABLE.forEach(entry => {
                if (!filters[entry.type]) return;

                // Only evaluate candidates for selected planets. 
                // Plasma is an exception as it is empire-wide.
                if (!isSelected && entry.type !== AmortizationType.PlasmaTechnology) return;

                const isBuilding = entry.type === AmortizationType.LifeformProductionBuildings || entry.type === AmortizationType.LifeformResearchBuildings;
                if (entry.lifeformId && entry.lifeformId !== p.lifeformId && isBuilding) return;

                let currentLevel = 0;
                if (entry.type === AmortizationType.Mines) {
                    if (entry.name === "Metal Mine") currentLevel = p.metalMine || 0;
                    if (entry.name === "Crystal Mine") currentLevel = p.crystalMine || 0;
                    if (entry.name === "Deuterium Mine") currentLevel = p.deuteriumMine || 0;
                } else if (entry.type === AmortizationType.PlasmaTechnology) {
                    currentLevel = state.account.researches?.find((r: any) => r.id === 122)?.level || 0;
                } else if (entry.id && (entry.type === AmortizationType.LifeformProductionBuildings || entry.type === AmortizationType.LifeformResearchBuildings)) {
                    currentLevel = p.lifeformBuildings?.find((b: any) => b.id === entry.id)?.level || 0;
                } else if (entry.id && (entry.type === AmortizationType.LifeformProductionResearches || entry.type === AmortizationType.LifeformExpeditionResearches)) {
                    const tech = p.lifeformSetup?.find((t: any) => t.selectedTechId === entry.id);
                    if (!tech) return;
                    currentLevel = tech.level;
                }

                const nextLevel = currentLevel + 1;
                const reduction = getReduction(entry.reduction || "", p, state);
                const discountFactor = Math.max(0.01, 1 - reduction);

                let cost: Cost;
                if (entry.costFormula) {
                    cost = entry.costFormula(nextLevel);
                } else {
                    const factor = nextLevel * Math.pow(entry.multiplier!, nextLevel - 1);
                    cost = {
                        metal: Math.floor(entry.baseCost!.metal * factor),
                        crystal: Math.floor(entry.baseCost!.crystal * factor),
                        deuterium: Math.floor(entry.baseCost!.deuterium * factor)
                    };
                }
                cost.metal = Math.floor(cost.metal * discountFactor);
                cost.crystal = Math.floor(cost.crystal * discountFactor);
                cost.deuterium = Math.floor(cost.deuterium * discountFactor);

                let prodIncrease = 0;
                let prodDelta: Cost = { metal: 0, crystal: 0, deuterium: 0 };
                const effect = entry.effect as any;
                const universeSpeed = state.account.universeSpeed || 1;

                if (entry.type === AmortizationType.Mines) {
                    const temp = p.tempMax || 20;
                    let slot = 0;
                    try { slot = parseInt(p.coords.split(':')[2]); } catch (e) { }
                    let metalPosFactor = 1;
                    if (slot === 6 || slot === 10) metalPosFactor = 1.17;
                    else if (slot === 7 || slot === 9) metalPosFactor = 1.23;
                    else if (slot === 8) metalPosFactor = 1.35;

                    let crystalPosFactor = 1;
                    if (slot === 1) crystalPosFactor = 1.4;
                    else if (slot === 2) crystalPosFactor = 1.3;
                    else if (slot === 3) crystalPosFactor = 1.2;

                    const mNext = (entry.name === "Metal Mine" ? nextLevel : (p.metalMine || 0));
                    const cNext = (entry.name === "Crystal Mine" ? nextLevel : (p.crystalMine || 0));
                    const dNext = (entry.name === "Deuterium Mine" ? nextLevel : (p.deuteriumMine || 0));

                    const bM_next = 30 * mNext * Math.pow(1.1, mNext) * universeSpeed * metalPosFactor;
                    const bC_next = 20 * cNext * Math.pow(1.1, cNext) * universeSpeed * crystalPosFactor;
                    const bD_next = 10 * dNext * Math.pow(1.1, dNext) * (1.44 - 0.004 * temp) * universeSpeed;

                    const pData = prodData.planets[p.id];
                    prodDelta = {
                        metal: (bM_next - pData.base.metal) * pData.mult.metal,
                        crystal: (bC_next - pData.base.crystal) * pData.mult.crystal,
                        deuterium: (bD_next - pData.base.deuterium) * pData.mult.deuterium
                    };
                    prodIncrease = calculateMSU(prodDelta, rates);
                } else if (effect) {
                    if (effect.type === 'plasma') {
                        prodDelta = {
                            metal: prodData.empireBase.metal * 0.01,
                            crystal: prodData.empireBase.crystal * 0.0066,
                            deuterium: prodData.empireBase.deuterium * 0.0033
                        };
                        prodIncrease = calculateMSU(prodDelta, rates);
                    } else if (effect.type === 'tech_bonus') {
                        // ROI for Tech Boosters (Metropolis, Transformer, Chip Mass Production): 
                        // Increase in production for all OTHER techs on this planet.
                        const factor = effect.value; // The incremental tech bonus from 1 level
                        let deltaM = 0, deltaC = 0, deltaD = 0;

                        p.lifeformSetup?.forEach((t: any) => {
                            const level = t.level || 0;
                            const tEntry = AMORTIZATION_TABLE.find(e => e.id === t.selectedTechId);
                            if (tEntry && tEntry.effect) {
                                const tEffect = tEntry.effect as any;
                                const tVal = tEffect.value * level * factor;
                                if (tEffect.target === 'global') {
                                    if (tEffect.type === 'metal' || tEffect.type === 'all') deltaM += prodData.empireBase.metal * tVal;
                                    if (tEffect.type === 'crystal' || tEffect.type === 'all') deltaC += prodData.empireBase.crystal * tVal;
                                    if (tEffect.type === 'deuterium' || tEffect.type === 'all') deltaD += prodData.empireBase.deuterium * tVal;
                                } else if (tEffect.target === 'mine') {
                                    if (tEffect.type === 'metal') deltaM += prodData.planets[p.id].base.metal * tVal;
                                    if (tEffect.type === 'crystal') deltaC += prodData.planets[p.id].base.crystal * tVal;
                                    if (tEffect.type === 'deuterium') deltaD += prodData.planets[p.id].base.deuterium * tVal;
                                } else if (tEffect.type === 'expo_res' || tEffect.type === 'kaelesh_discovery_adv') {
                                    const baseline = (expoAverages?.resources?.metal || expoAverages?.resources?.crystal)
                                        ? expoAverages.resources
                                        : { metal: 33333, crystal: 16666, deuterium: 8333 };

                                    const trueM = baseline.metal / (1 + currentResBonus);
                                    const trueC = baseline.crystal / (1 + currentResBonus);
                                    const trueD = baseline.deuterium / (1 + currentResBonus);

                                    deltaM += trueM * tVal;
                                    deltaC += trueC * tVal;
                                    deltaD += trueD * tVal;

                                    if (tEffect.type === 'kaelesh_discovery_adv') {
                                        // Discovery Adv mult boost also affects Slots and Enemies indirectly.
                                        const computerLevel = state.account.researches?.find((r: any) => r.id === 108)?.level || 10;
                                        const slts = computerLevel + 3;

                                        // Bonus from Slot gain (0.004 per level) and Enemies (0.00045 per level)
                                        // Each building upgrade boosts the tech mult, which acts as a factor on these bases.
                                        const indirectBasePerLevel = (0.004 / slts) + 0.00045;
                                        const indirectGainFactor = indirectBasePerLevel * level * factor;

                                        const baselineSi = (expoAverages?.ships?.metal || expoAverages?.ships?.crystal) ? expoAverages.ships : { metal: 4166, crystal: 2083, deuterium: 416 };
                                        const totalM = trueM * (1 + currentResBonus) + (baselineSi.metal / (1 + currentSiBonus)) * (1 + currentSiBonus);
                                        const totalC = trueC * (1 + currentResBonus) + (baselineSi.crystal / (1 + currentSiBonus)) * (1 + currentSiBonus);
                                        const totalD = trueD * (1 + currentResBonus) + (baselineSi.deuterium / (1 + currentSiBonus)) * (1 + currentSiBonus);

                                        deltaM += totalM * indirectGainFactor;
                                        deltaC += totalC * indirectGainFactor;
                                        deltaD += totalD * indirectGainFactor;
                                    }
                                } else if (tEffect.type === 'expo_si') {
                                    const baseline = (expoAverages?.ships?.metal || expoAverages?.ships?.crystal)
                                        ? expoAverages.ships
                                        : { metal: 4166, crystal: 2083, deuterium: 416 };

                                    const trueM = baseline.metal / (1 + currentSiBonus);
                                    const trueC = baseline.crystal / (1 + currentSiBonus);
                                    const trueD = baseline.deuterium / (1 + currentSiBonus);

                                    deltaM += trueM * tVal;
                                    deltaC += trueC * tVal;
                                    deltaD += trueD * tVal;
                                }
                            }
                        });
                        prodDelta = { metal: deltaM, crystal: deltaC, deuterium: deltaD };
                        prodIncrease = calculateMSU(prodDelta, rates);
                    } else if (effect.type === 'expo_res' || effect.type === 'expo_si' || effect.type === 'kaelesh_discovery_adv') {
                        const isKaeleshAdv = effect.type === 'kaelesh_discovery_adv';
                        const techMult = getPlanetTechMultiplier(p, state.account);
                        const effectiveValue = effect.value * techMult;

                        const baselineRes = (expoAverages?.resources?.metal || expoAverages?.resources?.crystal) ? expoAverages.resources : { metal: 33333, crystal: 16666, deuterium: 8333 };
                        const baselineSi = (expoAverages?.ships?.metal || expoAverages?.ships?.crystal) ? expoAverages.ships : { metal: 4166, crystal: 2083, deuterium: 416 };

                        const trueM_res = baselineRes.metal / (1 + currentResBonus);
                        const trueC_res = baselineRes.crystal / (1 + currentResBonus);
                        const trueD_res = baselineRes.deuterium / (1 + currentResBonus);

                        const trueM_si = baselineSi.metal / (1 + currentSiBonus);
                        const trueC_si = baselineSi.crystal / (1 + currentSiBonus);
                        const trueD_si = baselineSi.deuterium / (1 + currentSiBonus);

                        if (isKaeleshAdv) {
                            const computerLevel = state.account.researches?.find((r: any) => r.id === 108)?.level || 10;
                            const estimatedSlots = computerLevel + 3; // Base 1 + Computer + 2 Discovery bonus

                            // 1. Direct Resource Bonus part (0.2% per level)
                            const directM = trueM_res * effectiveValue;
                            const directC = trueC_res * effectiveValue;
                            const directD = trueD_res * effectiveValue;

                            // 2. Extra Value from Slots and Fewer Enemies
                            const totalMSUYield = calculateMSU({
                                metal: trueM_res * (1 + currentResBonus) + trueM_si * (1 + currentSiBonus),
                                crystal: trueC_res * (1 + currentResBonus) + trueC_si * (1 + currentSiBonus),
                                deuterium: trueD_res * (1 + currentResBonus) + trueD_si * (1 + currentSiBonus)
                            }, rates);

                            // Slot gain: 0.2% of base 2 = 0.004 slots per level
                            const slotMSU = (0.004 * techMult / estimatedSlots) * totalMSUYield;

                            // Fewer Enemies: KDE reduces the post-Discoverer enemy pool by 0.2% per level (relative to the 50% discount).
                            // A 0.2% gain on a ~10-15% hostile pool shifts approx 0.03% absolute missions into the "success" category.
                            // Distributed into the loot pools, this results in a logical ~0.045% gain to total empire yield.
                            const enemyMSU = (0.00045 * techMult) * totalMSUYield;

                            const extraMSU = slotMSU + enemyMSU;

                            // 3. Redistribute extra value back into resources based on yield weight
                            const weightM = (trueM_res * (1 + currentResBonus) + trueM_si * (1 + currentSiBonus)) * rates.metal / (totalMSUYield || 1);
                            const weightC = (trueC_res * (1 + currentResBonus) + trueC_si * (1 + currentSiBonus)) * rates.crystal / (totalMSUYield || 1);
                            const weightD = (trueD_res * (1 + currentResBonus) + trueD_si * (1 + currentSiBonus)) * rates.deuterium / (totalMSUYield || 1);

                            prodDelta = {
                                metal: directM + (extraMSU * weightM / (rates.metal || 1)),
                                crystal: directC + (extraMSU * weightC / (rates.crystal || 1)),
                                deuterium: directD + (extraMSU * weightD / (rates.deuterium || 1))
                            };
                            prodIncrease = calculateMSU(prodDelta, rates);
                        }
                        else {
                            const isRes = effect.type === 'expo_res';
                            const currentGlobalBonus = isRes ? currentResBonus : currentSiBonus;
                            const trueM = isRes ? trueM_res : trueM_si;
                            const trueC = isRes ? trueC_res : trueC_si;
                            const trueD = isRes ? trueD_res : trueD_si;

                            prodDelta = {
                                metal: trueM * effectiveValue,
                                crystal: trueC * effectiveValue,
                                deuterium: trueD * effectiveValue
                            };
                            prodIncrease = calculateMSU(prodDelta, rates);
                        }
                    } else {
                        const target = effect.target;
                        const techMult = (entry.type === AmortizationType.LifeformProductionResearches || entry.type === AmortizationType.LifeformExpeditionResearches)
                            ? getPlanetTechMultiplier(p, state.account)
                            : 1;

                        if (effect.type === 'multiple') {
                            const mInc = (target === 'global' ? prodData.empireBase.metal : prodData.planets[p.id].base.metal) * (effect.values.metal * techMult);
                            const cInc = (target === 'global' ? prodData.empireBase.crystal : prodData.planets[p.id].base.crystal) * (effect.values.crystal * techMult);
                            const dInc = (target === 'global' ? prodData.empireBase.deuterium : prodData.planets[p.id].base.deuterium) * (effect.values.deuterium * techMult);
                            prodDelta = { metal: mInc, crystal: cInc, deuterium: dInc };
                        } else {
                            const effectiveValue = effect.value * techMult;
                            const mInc = (target === 'global' ? prodData.empireBase.metal : prodData.planets[p.id].base.metal) * (effect.type === 'metal' || effect.type === 'all' ? effectiveValue : 0);
                            const cInc = (target === 'global' ? prodData.empireBase.crystal : prodData.planets[p.id].base.crystal) * (effect.type === 'crystal' || effect.type === 'all' || effect.type === 'crystal_deuterium' ? effectiveValue : 0);
                            const dInc = (target === 'global' ? prodData.empireBase.deuterium : prodData.planets[p.id].base.deuterium) * (effect.type === 'deuterium' || effect.type === 'all' || effect.type === 'crystal_deuterium' ? effectiveValue : 0);
                            prodDelta = { metal: mInc, crystal: cInc, deuterium: dInc };
                        }
                        prodIncrease = calculateMSU(prodDelta, rates);
                    }
                }

                if (prodIncrease > 0) {
                    const msuCost = calculateMSU(cost, rates);
                    const roiHours = msuCost / prodIncrease;

                    if (i === 0) {
                        let breakdownStr = "";
                        if (entry.type === AmortizationType.Mines) {
                            const pData = prodData.planets[p.id];
                            const resKey = entry.name === "Metal Mine" ? "metal" : (entry.name === "Crystal Mine" ? "crystal" : "deuterium");
                            const m = pData.mult[resKey as keyof typeof pData.mult];

                            // Re-calculate components for logging
                            const plasmaLevel = state.account.researches?.find((r: any) => r.id === 122)?.level || 0;
                            const plasmaB = resKey === "metal" ? plasmaLevel * 0.01 : (resKey === "crystal" ? plasmaLevel * (0.66 / 100) : plasmaLevel * (0.33 / 100));

                            let lfbB = 0;
                            p.lifeformBuildings?.forEach((b: any) => {
                                if (resKey === 'metal') {
                                    if (b.id === 12106) lfbB += b.level * 0.02;
                                    if (b.id === 11106) lfbB += b.level * 0.015;
                                } else if (resKey === 'crystal') {
                                    if (b.id === 12109) lfbB += b.level * 0.02;
                                    if (b.id === 11108) lfbB += b.level * 0.015;
                                } else if (resKey === 'deuterium') {
                                    if (b.id === 12110) lfbB += b.level * 0.02;
                                    if (b.id === 13110) lfbB += b.level * 0.02;
                                    if (b.id === 11108) lfbB += b.level * 0.01;
                                }
                            });

                            const techB = prodData.globalBonuses[resKey as keyof typeof prodData.globalBonuses];
                            const classB = (state.account.playerClass === 1) ? 0.25 : 0;

                            breakdownStr = `\n                            - Multiplier Breakdown (${resKey}): ${(m * 100).toFixed(1)}% 
                                [100% Base + ${(plasmaB * 100).toFixed(1)}% Plasma + ${(lfbB * 100).toFixed(1)}% LF Buildings + ${(techB * 100).toFixed(1)}% LF Techs + ${(classB * 100).toFixed(0)}% Class]`;
                        } else if (entry.type === AmortizationType.LifeformProductionResearches || entry.type === AmortizationType.LifeformExpeditionResearches) {
                            const effect = entry.effect as any;
                            const techMult = getPlanetTechMultiplier(p, state.account);
                            const effectiveValue = effect.value * techMult;
                            let details: string[] = [];

                            if (effect.type === 'expo_res' || effect.type === 'expo_si' || effect.type === 'kaelesh_discovery_adv') {
                                const isKaeleshAdv = effect.type === 'kaelesh_discovery_adv';
                                const isRes = effect.type === 'expo_res' || isKaeleshAdv;
                                const isShips = effect.type === 'expo_si' || isKaeleshAdv;

                                if (isKaeleshAdv) {
                                    const computerLevel = state.account.researches?.find((r: any) => r.id === 108)?.level || 10;
                                    const slts = computerLevel + 3;
                                    details.push(`Aggregated Discovery Boost (incl. Slots: +${(0.004 * techMult / slts * 100).toFixed(4)}% yield and Fewer Enemies: +${(0.00016 * techMult * 100).toFixed(4)}% yield)`);
                                    details.push(`Total Gain across both Res & Ships: +${prodIncrease.toFixed(2)} MSU/h`);
                                } else {
                                    const currentGlobalBonus = isRes ? currentResBonus : currentSiBonus;
                                    const baseline = isRes
                                        ? ((expoAverages?.resources?.metal || expoAverages?.resources?.crystal) ? expoAverages.resources : { metal: 33333, crystal: 16666, deuterium: 8333 })
                                        : ((expoAverages?.ships?.metal || expoAverages?.ships?.crystal) ? expoAverages.ships : { metal: 4166, crystal: 2083, deuterium: 416 });

                                    const trueM = baseline.metal / (1 + currentGlobalBonus);
                                    const trueC = baseline.crystal / (1 + currentGlobalBonus);
                                    const trueD = baseline.deuterium / (1 + currentGlobalBonus);

                                    const dM = trueM * effectiveValue;
                                    const dC = trueC * effectiveValue;
                                    const dD = trueD * effectiveValue;
                                    details.push(`Expedition ${isRes ? 'Res' : 'Ships'} Gain: +${calculateMSU({ metal: dM, crystal: dC, deuterium: dD }, rates).toFixed(2)} MSU/h (normalized from ${(currentGlobalBonus * 100).toFixed(1)}% LF bonus)`);
                                }
                            } else {
                                const targetName = effect.target === 'global' ? 'Empire' : `Planet (${p.coords})`;
                                const baseM = effect.target === 'global' ? prodData.empireBase.metal : prodData.planets[p.id].base.metal;
                                const baseC = effect.target === 'global' ? prodData.empireBase.crystal : prodData.planets[p.id].base.crystal;
                                const baseD = effect.target === 'global' ? prodData.empireBase.deuterium : prodData.planets[p.id].base.deuterium;

                                if (effect.type === 'metal' || effect.type === 'all')
                                    details.push(`${targetName} Metal: +${calculateMSU({ metal: baseM * effectiveValue, crystal: 0, deuterium: 0 }, rates).toFixed(2)} MSU/h`);
                                if (effect.type === 'crystal' || effect.type === 'all' || effect.type === 'crystal_deuterium')
                                    details.push(`${targetName} Crystal: +${calculateMSU({ metal: 0, crystal: baseC * effectiveValue, deuterium: 0 }, rates).toFixed(2)} MSU/h`);
                                if (effect.type === 'deuterium' || effect.type === 'all' || effect.type === 'crystal_deuterium')
                                    details.push(`${targetName} Deuterium: +${calculateMSU({ metal: 0, crystal: 0, deuterium: baseD * effectiveValue }, rates).toFixed(2)} MSU/h`);
                            }

                            breakdownStr = `\n                            - Research Bonus: +${(effectiveValue * 100).toFixed(4)}% (incl. ${(techMult > 1 ? '+' + ((techMult - 1) * 100).toFixed(1) + '% building bonus' : 'no building bonus')})
                            - Production Boost Breakdown:${details.map(d => '\n                                * ' + d).join('')}`;
                        } else if (entry.type === AmortizationType.PlasmaTechnology) {
                            const dM = prodData.empireBase.metal * 0.01;
                            const dC = prodData.empireBase.crystal * (0.66 / 100);
                            const dD = prodData.empireBase.deuterium * (0.33 / 100);
                            const reduction = getReduction("improvedStellarator", {}, state);
                            breakdownStr = `\n                            - Research Bonus: +1% Metal, +0.66% Crystal, +0.33% Deuterium
                            - Cost Reduction: -${(reduction * 100).toFixed(2)}% (from Improved Stellarator)
                            - Empire-wide Base Production:
                                * Metal Basis: ${prodData.empireBase.metal.toLocaleString()} /h
                                * Crystal Basis: ${prodData.empireBase.crystal.toLocaleString()} /h
                                * Deuterium Basis: ${prodData.empireBase.deuterium.toLocaleString()} /h
                            - Incremental Production Boost (Lvl ${nextLevel}):
                                * Metal: +${calculateMSU({ metal: dM, crystal: 0, deuterium: 0 }, rates).toFixed(2)} MSU/h (+${dM.toLocaleString()} Metal)
                                * Crystal: +${calculateMSU({ metal: 0, crystal: dC, deuterium: 0 }, rates).toFixed(2)} MSU/h (+${dC.toLocaleString()} Crystal)
                                * Deuterium: +${calculateMSU({ metal: 0, crystal: 0, deuterium: dD }, rates).toFixed(2)} MSU/h (+${dD.toLocaleString()} Deut)`;
                        } else if (entry.effect && (entry.effect as any).type === 'tech_bonus') {
                            const factor = (entry.effect as any).value;
                            let techDetails: string[] = [];

                            p.lifeformSetup?.forEach((t: any) => {
                                const level = t.level || 0;
                                const tEntry = AMORTIZATION_TABLE.find(e => e.id === t.selectedTechId);
                                if (tEntry && tEntry.effect && level > 0) {
                                    const tEffect = tEntry.effect as any;
                                    const tVal = tEffect.value * level * factor;
                                    let deltaMSU = 0;

                                    if (tEffect.target === 'global') {
                                        const dM = prodData.empireBase.metal * tVal;
                                        const dC = prodData.empireBase.crystal * tVal;
                                        const dD = prodData.empireBase.deuterium * tVal;
                                        deltaMSU = calculateMSU({ metal: dM, crystal: dC, deuterium: dD }, rates);
                                    } else if (tEffect.target === 'mine') {
                                        const dM = prodData.planets[p.id].base.metal * tVal;
                                        const dC = prodData.planets[p.id].base.crystal * tVal;
                                        const dD = prodData.planets[p.id].base.deuterium * tVal;
                                        deltaMSU = calculateMSU({ metal: dM, crystal: dC, deuterium: dD }, rates);
                                    } else if (tEffect.type === 'expo_res') {
                                        const baseline = (expoAverages?.resources?.metal || expoAverages?.resources?.crystal)
                                            ? expoAverages.resources
                                            : { metal: 33333, crystal: 16666, deuterium: 8333 };
                                        const trueM = baseline.metal / (1 + currentResBonus);
                                        const trueC = baseline.crystal / (1 + currentResBonus);
                                        const trueD = baseline.deuterium / (1 + currentResBonus);
                                        deltaMSU = calculateMSU({ metal: trueM * tVal, crystal: trueC * tVal, deuterium: trueD * tVal }, rates);
                                    } else if (tEffect.type === 'expo_si') {
                                        const baseline = (expoAverages?.ships?.metal || expoAverages?.ships?.crystal)
                                            ? expoAverages.ships
                                            : { metal: 4166, crystal: 2083, deuterium: 416 };
                                        const trueM = baseline.metal / (1 + currentSiBonus);
                                        const trueC = baseline.crystal / (1 + currentSiBonus);
                                        const trueD = baseline.deuterium / (1 + currentSiBonus);
                                        deltaMSU = calculateMSU({ metal: trueM * tVal, crystal: trueC * tVal, deuterium: trueD * tVal }, rates);
                                    }

                                    if (deltaMSU > 0.01) {
                                        techDetails.push(`${tEntry.name} (Lvl ${level}): +${deltaMSU.toFixed(2)} MSU/h`);
                                    }
                                }
                            });

                            breakdownStr = `\n                            - Tech Multiplier Bonus: +${(factor * 100).toFixed(2)}% per level
                            - Bonus Breakdown Across Selected Techs:${techDetails.length > 0 ? techDetails.map(d => '\n                                * ' + d).join('') : '\n                                (No production techs active)'}`;
                        }

                        console.log(`[Amortization Debug] Candidate: ${entry.name} Lvl:${nextLevel} (${p.coords})
                            - Cost: M:${cost.metal.toLocaleString()} C:${cost.crystal.toLocaleString()} D:${cost.deuterium.toLocaleString()}
                            - Prod Increase: M:${prodDelta.metal.toFixed(2)} C:${prodDelta.crystal.toFixed(2)} D:${prodDelta.deuterium.toFixed(2)}
                            - Prod Increase (MSU): ${prodIncrease.toFixed(2)}${breakdownStr}
                            - ROI: ${roiHours.toFixed(2)}h`);

                        // Log totals for expedition researches to help user verify
                        if (entry.type === AmortizationType.LifeformExpeditionResearches && expoAverages) {
                            const effect = entry.effect as any;
                            const isRes = effect.type === 'expo_res' || effect.type === 'kaelesh_discovery_adv';
                            const isShips = effect.type === 'expo_si' || effect.type === 'kaelesh_discovery_adv';

                            if (isRes) {
                                const base = expoAverages.resources;
                                console.log(`[Amortization Debug] -> ${entry.name} Res Baseline (Best 7/60d Hourly): M:${base.metal.toLocaleString()} C:${base.crystal.toLocaleString()} D:${base.deuterium.toLocaleString()}`);
                                if (expoAverages.totals?.resources) {
                                    const t = expoAverages.totals.resources;
                                    console.log(`[Amortization Debug] -> ${entry.name} Res Context (30d Totals): M:${t.metal.toLocaleString()} C:${t.crystal.toLocaleString()} D:${t.deuterium.toLocaleString()}`);
                                }
                            }
                            if (isShips) {
                                const base = expoAverages.ships;
                                const msu = calculateMSU(base, rates);
                                console.log(`[Amortization Debug] -> ${entry.name} Ship Baseline (Best 7/60d Hourly): ${msu.toFixed(2)} MSU (M:${base.metal.toLocaleString()} C:${base.crystal.toLocaleString()} D:${base.deuterium.toLocaleString()})`);
                                if (expoAverages.totals?.ships) {
                                    const t = expoAverages.totals.ships;
                                    const tMsu = calculateMSU(t, rates);
                                    console.log(`[Amortization Debug] -> ${entry.name} Ship Context (30d Totals): ${tMsu.toLocaleString(undefined, { maximumFractionDigits: 0 })} MSU (M:${t.metal.toLocaleString()} C:${t.crystal.toLocaleString()} D:${t.deuterium.toLocaleString()})`);
                                }
                            }
                        }
                    }

                    candidates.push({
                        name: entry.name,
                        type: entry.type,
                        cost: cost,
                        msuCost: msuCost,
                        productionIncrease: prodIncrease,
                        prodDelta: prodDelta,
                        roiHours: roiHours,
                        planetId: (entry.type === AmortizationType.PlasmaTechnology) ? undefined : p.id,
                        currentLevel: currentLevel
                    });
                } else if (i === 0 && filters[entry.type]) {
                    // console.log(`[Amortization Debug] Skipped ${entry.name} (${p.coords}) - Prod Increase: ${prodIncrease}`);
                }
            });
            if (i === 0) console.groupEnd();
        });

        // Deduplicate Plasma in candidates
        const uniqueCandidates = candidates.filter((item, index, self) =>
            item.type !== AmortizationType.PlasmaTechnology ||
            index === self.findIndex(t => t.type === AmortizationType.PlasmaTechnology)
        );

        if (uniqueCandidates.length === 0) break;
        uniqueCandidates.sort((a, b) => a.roiHours - b.roiHours);
        const best = uniqueCandidates[0];

        if (i === 0) {
            console.log(`[Amortization Debug] STEP 1 WINNER: ${best.name} (ROI: ${best.roiHours.toFixed(2)}h) at ${best.planetId ? planets.find(p => p.id === best.planetId)?.coords : 'GLOBAL'}`);
        }

        // Apply best to state
        if (best.type === AmortizationType.Mines) {
            const pIdx = state.planets.findIndex(pl => pl.id === best.planetId);
            if (best.name === "Metal Mine") state.planets[pIdx].metalMine = (state.planets[pIdx].metalMine || 0) + 1;
            else if (best.name === "Crystal Mine") state.planets[pIdx].crystalMine = (state.planets[pIdx].crystalMine || 0) + 1;
            else if (best.name === "Deuterium Mine") state.planets[pIdx].deuteriumMine = (state.planets[pIdx].deuteriumMine || 0) + 1;
        } else if (best.type === AmortizationType.PlasmaTechnology) {
            const tech = state.account.researches?.find((r: any) => r.id === 122);
            if (tech) tech.level++;
            else state.account.researches.push({ id: 122, level: 1 });
        } else if (best.type === AmortizationType.LifeformProductionBuildings || best.type === AmortizationType.LifeformResearchBuildings) {
            const pIdx = state.planets.findIndex(pl => pl.id === best.planetId);
            const bIdx = state.planets[pIdx].lifeformBuildings?.findIndex((b: any) => b.name === best.name);
            if (bIdx !== -1) state.planets[pIdx].lifeformBuildings[bIdx!].level++;
        } else if (best.type === AmortizationType.LifeformProductionResearches || best.type === AmortizationType.LifeformExpeditionResearches) {
            const pIdx = state.planets.findIndex(pl => pl.id === best.planetId);
            const tech = state.planets[pIdx].lifeformSetup?.find((t: any) => AMORTIZATION_TABLE.find(e => e.id === t.selectedTechId)?.name === best.name);
            if (tech) tech.level++;
        }

        resultItems.push(best);
    }

    // Attach final state to window if possible (this runs in UI thread)
    try { (window as any).amortizationFullEmpire = state; } catch (e) { }

    return resultItems;
}
