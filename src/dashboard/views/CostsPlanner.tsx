import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Plus, Minus, Trash2, Globe, ChevronUp, ChevronDown,
    Database, Wrench, Sparkles, Calculator, Dna, Box, Ship, Shield,
    Coins, RotateCcw, Check, CheckCircle2, AlertTriangle, ArrowRight, HelpCircle,
    Info, FlaskConical, Crown, Clock
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { calculateEmpireProduction } from '../../utils/amortizationCalc';
import { LIFEFORM_TECH_DATA } from '../../db/lifeformTechData';
import { SHIP_DATA, BUILDING_DATA, RESEARCH_DATA, DEFENCE_DATA, LIFEFORM_BUILDING_DATA } from '../../db/staticData';
import './CostsPlanner.css';

// ----------------------------------------------------
// STANDARD BASE COSTS & MULTIPLIERS FOR CALCULATORS
// ----------------------------------------------------

interface ResourceCost {
    metal: number;
    crystal: number;
    deuterium: number;
}

interface CartItem {
    id: string;
    planetId: string;
    planetName: string;
    coords: string;
    category: string;
    itemId: number;
    itemName: string;
    currentLevel: number;
    targetLevel: number;
    quantity?: number;
    cost: ResourceCost;
    icon?: string;
}

const MINES_BASE_COSTS: Record<string, { base: ResourceCost; factor: number }> = {
    "Metal Mine": { base: { metal: 60, crystal: 15, deuterium: 0 }, factor: 1.5 },
    "Crystal Mine": { base: { metal: 48, crystal: 24, deuterium: 0 }, factor: 1.6 },
    "Deuterium Mine": { base: { metal: 225, crystal: 75, deuterium: 0 }, factor: 1.5 }, // maps to deuteriumMine/deuteriumSynthesizer
    "Fusion Reactor": { base: { metal: 900, crystal: 360, deuterium: 180 }, factor: 1.8 }
};

const FACILITIES_BASE_COSTS: Record<string, { base: ResourceCost; factor: number }> = {
    "Robotics Factory": { base: { metal: 400, crystal: 120, deuterium: 200 }, factor: 2.0 },
    "Shipyard": { base: { metal: 400, crystal: 200, deuterium: 100 }, factor: 2.0 },
    "Research Lab": { base: { metal: 200, crystal: 400, deuterium: 200 }, factor: 2.0 },
    "Nanite Factory": { base: { metal: 1000000, crystal: 500000, deuterium: 100000 }, factor: 2.0 }
};

const RESEARCH_BASE_COSTS: Record<string, { base: ResourceCost; factor: number }> = {
    "Energy Technology": { base: { metal: 0, crystal: 800, deuterium: 400 }, factor: 2.0 },
    "Laser Technology": { base: { metal: 200, crystal: 100, deuterium: 0 }, factor: 2.0 },
    "Ion Technology": { base: { metal: 1000, crystal: 300, deuterium: 100 }, factor: 2.0 },
    "Hyperspace Technology": { base: { metal: 0, crystal: 4000, deuterium: 2000 }, factor: 2.0 },
    "Plasma Technology": { base: { metal: 2000, crystal: 4000, deuterium: 1000 }, factor: 2.0 },
    "Combustion Drive": { base: { metal: 400, crystal: 0, deuterium: 600 }, factor: 2.0 },
    "Impulse Drive": { base: { metal: 2000, crystal: 4000, deuterium: 600 }, factor: 2.0 },
    "Hyperspace Drive": { base: { metal: 10000, crystal: 20000, deuterium: 6000 }, factor: 2.0 },
    "Espionage Technology": { base: { metal: 200, crystal: 1000, deuterium: 200 }, factor: 2.0 },
    "Computer Technology": { base: { metal: 0, crystal: 400, deuterium: 600 }, factor: 2.0 },
    "Astrophysics": { base: { metal: 4000, crystal: 8000, deuterium: 4000 }, factor: 1.75 },
    "Intergalactic Research Network": { base: { metal: 240000, crystal: 400000, deuterium: 160000 }, factor: 2.0 },
    "Graviton Technology": { base: { metal: 0, crystal: 0, deuterium: 0 }, factor: 3.0 }, // energy: 300,000
    "Weapons Technology": { base: { metal: 800, crystal: 200, deuterium: 0 }, factor: 2.0 },
    "Shielding Technology": { base: { metal: 200, crystal: 600, deuterium: 0 }, factor: 2.0 },
    "Armour Technology": { base: { metal: 1000, crystal: 0, deuterium: 0 }, factor: 2.0 }
};

const LIFEFORM_BUILDINGS_COSTS: Record<number, { base: ResourceCost; factor: number }> = {
    // Humans
    11101: { base: { metal: 7, crystal: 2, deuterium: 0 }, factor: 1.20 },
    11102: { base: { metal: 5, crystal: 2, deuterium: 0 }, factor: 1.23 },
    11103: { base: { metal: 20000, crystal: 25000, deuterium: 10000 }, factor: 1.3 },
    11104: { base: { metal: 40000, crystal: 35000, deuterium: 15000 }, factor: 1.3 },
    11105: { base: { metal: 50000, crystal: 40000, deuterium: 20000 }, factor: 1.3 },
    11106: { base: { metal: 9000, crystal: 6000, deuterium: 3000 }, factor: 1.5 },
    11107: { base: { metal: 25000, crystal: 20000, deuterium: 10000 }, factor: 1.15 },
    11108: { base: { metal: 50000, crystal: 25000, deuterium: 15000 }, factor: 1.5 },
    11109: { base: { metal: 100000, crystal: 80000, deuterium: 30000 }, factor: 1.15 },
    11110: { base: { metal: 150000, crystal: 120000, deuterium: 50000 }, factor: 1.3 },
    11111: { base: { metal: 80000, crystal: 35000, deuterium: 60000 }, factor: 1.5 },
    11112: { base: { metal: 500000, crystal: 400000, deuterium: 200000 }, factor: 1.3 },

    // Rock'tal
    12101: { base: { metal: 9, crystal: 3, deuterium: 0 }, factor: 1.20 },
    12102: { base: { metal: 7, crystal: 2, deuterium: 0 }, factor: 1.20 },
    12103: { base: { metal: 40000, crystal: 10000, deuterium: 15000 }, factor: 1.3 },
    12104: { base: { metal: 50000, crystal: 15000, deuterium: 20000 }, factor: 1.3 },
    12105: { base: { metal: 60000, crystal: 20000, deuterium: 25000 }, factor: 1.3 },
    12106: { base: { metal: 10000, crystal: 8000, deuterium: 1000 }, factor: 1.4 },
    12107: { base: { metal: 35000, crystal: 25000, deuterium: 15000 }, factor: 1.15 },
    12108: { base: { metal: 75000, crystal: 35000, deuterium: 20000 }, factor: 1.4 },
    12109: { base: { metal: 85000, crystal: 44000, deuterium: 25000 }, factor: 1.4 },
    12110: { base: { metal: 120000, crystal: 50000, deuterium: 20000 }, factor: 1.4 },
    12111: { base: { metal: 150000, crystal: 60000, deuterium: 30000 }, factor: 1.4 },
    12112: { base: { metal: 600000, crystal: 450000, deuterium: 250000 }, factor: 1.3 },

    // Mechas
    13101: { base: { metal: 6, crystal: 2, deuterium: 0 }, factor: 1.21 },
    13102: { base: { metal: 5, crystal: 2, deuterium: 0 }, factor: 1.18 },
    13103: { base: { metal: 30000, crystal: 20000, deuterium: 10000 }, factor: 1.3 },
    13104: { base: { metal: 50000, crystal: 30000, deuterium: 15000 }, factor: 1.3 },
    13105: { base: { metal: 80000, crystal: 50000, deuterium: 25000 }, factor: 1.3 },
    13106: { base: { metal: 15000, crystal: 10000, deuterium: 5000 }, factor: 1.5 },
    13107: { base: { metal: 35000, crystal: 15000, deuterium: 10000 }, factor: 1.5 },
    13108: { base: { metal: 60000, crystal: 45000, deuterium: 20000 }, factor: 1.15 },
    13109: { base: { metal: 120000, crystal: 90000, deuterium: 40000 }, factor: 1.15 },
    13110: { base: { metal: 100000, crystal: 40000, deuterium: 20000 }, factor: 1.5 },
    13111: { base: { metal: 55000, crystal: 50000, deuterium: 30000 }, factor: 1.5 },
    13112: { base: { metal: 750000, crystal: 500000, deuterium: 300000 }, factor: 1.3 },

    // Kaelesh
    14101: { base: { metal: 4, crystal: 3, deuterium: 0 }, factor: 1.21 },
    14102: { base: { metal: 6, crystal: 3, deuterium: 0 }, factor: 1.21 },
    14103: { base: { metal: 20000, crystal: 20000, deuterium: 30000 }, factor: 1.3 },
    14104: { base: { metal: 45000, crystal: 30000, deuterium: 20000 }, factor: 1.3 },
    14105: { base: { metal: 70000, crystal: 50000, deuterium: 35000 }, factor: 1.3 },
    14106: { base: { metal: 12000, crystal: 9000, deuterium: 3000 }, factor: 1.5 },
    14107: { base: { metal: 30000, crystal: 20000, deuterium: 15000 }, factor: 1.15 },
    14108: { base: { metal: 60000, crystal: 50000, deuterium: 25000 }, factor: 1.15 },
    14109: { base: { metal: 110000, crystal: 80000, deuterium: 50000 }, factor: 1.15 },
    14110: { base: { metal: 130000, crystal: 90000, deuterium: 60000 }, factor: 1.5 },
    14111: { base: { metal: 70000, crystal: 60000, deuterium: 40000 }, factor: 1.5 },
    14112: { base: { metal: 1000000, crystal: 750000, deuterium: 500000 }, factor: 1.3 }
};

const DEFENCES_BASE_COSTS: Record<number, ResourceCost> = {
    401: { metal: 2000, crystal: 0, deuterium: 0 },
    402: { metal: 1500, crystal: 500, deuterium: 0 },
    403: { metal: 6000, crystal: 2000, deuterium: 0 },
    404: { metal: 20000, crystal: 15000, deuterium: 2000 },
    405: { metal: 2000, crystal: 6000, deuterium: 0 },
    406: { metal: 50000, crystal: 50000, deuterium: 30000 },
    407: { metal: 10000, crystal: 10000, deuterium: 0 },
    408: { metal: 50000, crystal: 50000, deuterium: 0 },
    502: { metal: 8000, crystal: 0, deuterium: 2000 },
    503: { metal: 12500, crystal: 2500, deuterium: 10000 }
};

// ----------------------------------------------------
// UTILITIES FOR MATHEMATICAL SCALING
// ----------------------------------------------------

const calculateMSU = (cost: ResourceCost, rates: { metal: number; crystal: number; deuterium: number }): number => {
    const mMultiplier = 1;
    const cMultiplier = rates.metal / rates.crystal;
    const dMultiplier = rates.metal / rates.deuterium;
    return (cost.metal * mMultiplier) + (cost.crystal * cMultiplier) + (cost.deuterium * dMultiplier);
};

const calculateStandardCost = (base: ResourceCost, multiplier: number, start: number, end: number): ResourceCost => {
    let metal = 0;
    let crystal = 0;
    let deuterium = 0;
    for (let level = start + 1; level <= end; level++) {
        metal += Math.floor(base.metal * Math.pow(multiplier, level - 1));
        crystal += Math.floor(base.crystal * Math.pow(multiplier, level - 1));
        deuterium += Math.floor(base.deuterium * Math.pow(multiplier, level - 1));
    }
    return { metal, crystal, deuterium };
};

const calculateLifeformBuildingCost = (itemId: number, base: ResourceCost, multiplier: number, start: number, end: number): ResourceCost => {
    const isTechScaled = [11101, 11102, 12101, 12102, 13101, 13102, 14101, 14102].includes(itemId);
    let metal = 0;
    let crystal = 0;
    let deuterium = 0;
    for (let level = start + 1; level <= end; level++) {
        if (isTechScaled) {
            metal += Math.floor(base.metal * Math.pow(multiplier, level - 1) * level);
            crystal += Math.floor(base.crystal * Math.pow(multiplier, level - 1) * level);
            deuterium += Math.floor(base.deuterium * Math.pow(multiplier, level - 1) * level);
        } else {
            metal += Math.floor(base.metal * Math.pow(multiplier, level - 1));
            crystal += Math.floor(base.crystal * Math.pow(multiplier, level - 1));
            deuterium += Math.floor(base.deuterium * Math.pow(multiplier, level - 1));
        }
    }
    return { metal, crystal, deuterium };
};

const calculateCumulativeTechCost = (
    baseCost: { metal: number; crystal: number; deuterium: number },
    increaseFactor: { metal: number; crystal: number; deuterium: number },
    start: number,
    end: number
): ResourceCost => {
    let metal = 0;
    let crystal = 0;
    let deuterium = 0;
    for (let level = start + 1; level <= end; level++) {
        metal += Math.floor(baseCost.metal * Math.pow(increaseFactor.metal, level - 1) * level);
        crystal += Math.floor(baseCost.crystal * Math.pow(increaseFactor.crystal, level - 1) * level);
        deuterium += Math.floor(baseCost.deuterium * Math.pow(increaseFactor.deuterium, level - 1) * level);
    }
    return { metal, crystal, deuterium };
};

const getResearchIconPath = (name: string): string => {
    const resMap: Record<string, string> = {
        'Energy Technology': 'icons/research/energy-research-large.jpg',
        'Laser Technology': 'icons/research/laser-tech-research-large.jpg',
        'Ion Technology': 'icons/research/ion-tech-research-large.jpg',
        'Hyperspace Technology': 'icons/research/hyperspace-tech-research-large.jpg',
        'Plasma Technology': 'icons/research/plasma-tech-research-large.jpg',
        'Combustion Drive': 'icons/research/combustion-drive-research-large.jpg',
        'Impulse Drive': 'icons/research/impulse-drive-research-large.jpg',
        'Hyperspace Drive': 'icons/research/hyperspace-drive-research-large.jpg',
        'Espionage Technology': 'icons/research/espionage-tech-research-large.jpg',
        'Computer Technology': 'icons/research/computer-tech-research-large.jpg',
        'Astrophysics': 'icons/research/expedition-tech-research-large.jpg',
        'Intergalactic Research Network': 'icons/research/integalagtic-research-tech-research-large.jpg',
        'Graviton Technology': 'icons/research/graviton-tech-research-large.jpg',
        'Weapons Technology': 'icons/research/weapons-tech-research-large.jpg',
        'Shielding Technology': 'icons/research/shield-tech-research-large.jpg',
        'Armour Technology': 'icons/research/armor-tech-research-large.jpg'
    };
    return resMap[name] || '';
};

const getLifeformResearchCostMultiplier = (planet: any): number => {
    if (!planet || !planet.lifeformBuildings) return 1.0;
    let totalLevels = 0;
    planet.lifeformBuildings.forEach((b: any) => {
        if (b.id === 11103 || b.id === 12103 || b.id === 13103 || b.id === 14103 || b.id === 14106) {
            totalLevels += b.level || 0;
        }
    });
    const discount = totalLevels * 0.0025; // 0.25% per level
    return Math.max(0.0, 1.0 - discount);
};

const getMineCostMultiplier = (planet: any): number => {
    if (!planet || !planet.lifeformBuildings) return 1.0;
    const found = planet.lifeformBuildings.find((b: any) => b.id === 12111);
    const level = found ? (found.level || 0) : 0;
    const discount = level * 0.005; // 0.5% per level
    return Math.max(0.0, 1.0 - discount);
};

const getLifeformBuildingCostMultiplier = (planet: any): number => {
    if (!planet || !planet.lifeformBuildings) return 1.0;
    const found = planet.lifeformBuildings.find((b: any) => b.id === 12108);
    const level = found ? (found.level || 0) : 0;
    const discount = level * 0.01; // 1% per level
    return Math.max(0.0, 1.0 - discount);
};

const applyDiscount = (cost: ResourceCost, multiplier: number): ResourceCost => {
    return {
        metal: Math.floor(cost.metal * multiplier),
        crystal: Math.floor(cost.crystal * multiplier),
        deuterium: Math.floor(cost.deuterium * multiplier)
    };
};

const getLifeformResearchDiscountTooltip = (planet: any): string => {
    if (!planet) return '';
    const lfId = planet.lifeformId || 1;
    let details = '';
    let totalDiscount = 0;
    const buildings = planet.lifeformBuildings || [];

    if (lfId === 1) {
        const lvl = buildings.find((b: any) => b.id === 11103)?.level || 0;
        totalDiscount = lvl * 0.25;
        details = `Research Centre (Humans) lvl ${lvl}: -${totalDiscount.toFixed(2)}% discount (0.25% per level)`;
    } else if (lfId === 2) {
        const lvl = buildings.find((b: any) => b.id === 12103)?.level || 0;
        totalDiscount = lvl * 0.25;
        details = `Rune Technologium (Rocktal) lvl ${lvl}: -${totalDiscount.toFixed(2)}% discount (0.25% per level)`;
    } else if (lfId === 3) {
        const lvl = buildings.find((b: any) => b.id === 13103)?.level || 0;
        totalDiscount = lvl * 0.25;
        details = `Robotics Research Centre (Mechas) lvl ${lvl}: -${totalDiscount.toFixed(2)}% discount (0.25% per level)`;
    } else if (lfId === 4) {
        const lvl1 = buildings.find((b: any) => b.id === 14103)?.level || 0;
        const lvl2 = buildings.find((b: any) => b.id === 14106)?.level || 0;
        totalDiscount = (lvl1 + lvl2) * 0.25;
        details = `Vortex Chamber lvl ${lvl1} + Antimatter Convector lvl ${lvl2}: -${totalDiscount.toFixed(2)}% discount (0.25% per level)`;
    }

    return details ? `\nLifeform Research Cost Discount:\n${details}` : '';
};

const getLifeformResearchDiscountPercentageVal = (planet: any): number => {
    if (!planet) return 0;
    const lfId = planet.lifeformId || 1;
    const buildings = planet.lifeformBuildings || [];
    if (lfId === 1) {
        return (buildings.find((b: any) => b.id === 11103)?.level || 0) * 0.25;
    } else if (lfId === 2) {
        return (buildings.find((b: any) => b.id === 12103)?.level || 0) * 0.25;
    } else if (lfId === 3) {
        return (buildings.find((b: any) => b.id === 13103)?.level || 0) * 0.25;
    } else if (lfId === 4) {
        const lvl1 = buildings.find((b: any) => b.id === 14103)?.level || 0;
        const lvl2 = buildings.find((b: any) => b.id === 14106)?.level || 0;
        return (lvl1 + lvl2) * 0.25;
    }
    return 0;
};

const getEmpireResearchDiscount = (
    techName: string,
    planets: any[],
    account: any
): {
    discount: number;
    totalLevel: number;
    totalBoostedLevel: number;
    techSources: { name: string; level: number; boostedLevel: number }[];
} => {
    const mappings: Record<string, { name: string; id: number; normId: number }[]> = {
        'Espionage Technology': [
            { name: 'Stealth Field Generator', id: 11204, normId: 15 },
            { name: 'Improved Drone AI', id: 13207, normId: 27 },
            { name: 'Low-Temperature Drives', id: 11213, normId: 24 }
        ],
        'Energy Technology': [
            { name: 'High-Temperature Superconductors', id: 13211, normId: 31 },
            { name: 'Diamond Energy Transmitter', id: 12215, normId: 35 }
        ],
        'Weapons Technology': [
            { name: 'Experimental Weapons Technology', id: 13217, normId: 37 }
        ],
        'Shielding Technology': [
            { name: 'Psionic Shield Matrix', id: 14217, normId: 41 }
        ],
        'Armour Technology': [
            { name: 'Rune Shields', id: 12217, normId: 42 }
        ],
        'Plasma Technology': [
            { name: 'Improved Stellarator', id: 12209, normId: 34 }
        ]
    };

    let totalLevel = 0;
    let totalBoostedLevel = 0;
    const techSources: { name: string; level: number; boostedLevel: number }[] = [];

    const targetTechs = mappings[techName] || [];
    if (targetTechs.length === 0) {
        return { discount: 0, totalLevel: 0, totalBoostedLevel: 0, techSources: [] };
    }

    const sourceLevels: Record<string, { level: number; boostedLevel: number }> = {};
    targetTechs.forEach(t => {
        sourceLevels[t.name] = { level: 0, boostedLevel: 0 };
    });

    planets.forEach((pl: any) => {
        const setup = pl.lifeformSetup || [];
        targetTechs.forEach(t => {
            const foundTech = setup.find((tech: any) => tech.selectedTechId === t.id || tech.selectedTechId === t.normId);
            if (foundTech && foundTech.level > 0) {
                const lvl = foundTech.level;
                const lfLevel = account?.lifeformExperience?.find((e: any) => e.id === pl.lifeformId || e.lifeformId === pl.lifeformId)?.level || 0;
                const lfLevelBonus = lfLevel * 0.001;

                let buildingBonus = 0;
                pl.lifeformBuildings?.forEach((b: any) => {
                    if (b.id === 11111) buildingBonus += b.level * 0.005;
                    if (b.id === 13107) buildingBonus += b.level * 0.003;
                    if (b.id === 13111) buildingBonus += b.level * 0.004;
                });

                const techMult = 1 + lfLevelBonus + buildingBonus;
                const boosted = lvl * techMult;

                sourceLevels[t.name].level += lvl;
                sourceLevels[t.name].boostedLevel += boosted;
                totalLevel += lvl;
                totalBoostedLevel += boosted;
            }
        });
    });

    const discount = Math.min(0.50, totalBoostedLevel * 0.0015);

    Object.keys(sourceLevels).forEach(name => {
        if (sourceLevels[name].level > 0) {
            techSources.push({
                name,
                level: sourceLevels[name].level,
                boostedLevel: sourceLevels[name].boostedLevel
            });
        }
    });

    return {
        discount,
        totalLevel,
        totalBoostedLevel,
        techSources
    };
};

// ----------------------------------------------------
// COMPONENT IMPLEMENTATION
// ----------------------------------------------------

const CostsPlanner: React.FC = () => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const planets = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).filter(p => p.type === 'planet').toArray() : [],
        [activeAccount]
    ) || [];
    const settings = useLiveQuery(() => db.settings.get('conversion_rates'));

    const expeditions = useLiveQuery(
        () => activeAccount ? db.expeditions.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    const combatReports = useLiveQuery(
        () => activeAccount ? db.combatReports.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    const debrisHarvests = useLiveQuery(
        () => activeAccount ? db.debrisHarvests.where('playerId').equals(activeAccount.playerId).filter(d => d.universe === activeAccount.universe).toArray() : [],
        [activeAccount]
    ) || [];

    const rates = useMemo(() => {
        return settings || { metal: 3, crystal: 2, deuterium: 1 };
    }, [settings]);

    // Calculate dynamic production on-the-fly using standard engine
    const calcResults = useMemo(() => {
        if (!activeAccount || planets.length === 0) return null;
        return calculateEmpireProduction({ account: activeAccount, planets });
    }, [activeAccount, planets]);

    // Daily Production Summarizer
    const dailyProduction = useMemo(() => {
        let metal = 0;
        let crystal = 0;
        let deuterium = 0;
        
        if (calcResults) {
            planets.forEach(p => {
                const prod = calcResults.planets[p.id]?.total;
                if (prod) {
                    metal += (prod.metal || 0) * 24;
                    crystal += (prod.crystal || 0) * 24;
                    deuterium += (prod.deuterium || 0) * 24;
                }
            });
        }
        
        return { metal, crystal, deuterium };
    }, [planets, calcResults]);

    // UI Workspace States
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedPlanetId, setSelectedPlanetId] = useState<string>('');
    const [plannerStep, setPlannerStep] = useState<number>(1); // 1 = Category, 2 = Planet Orbit, 3 = Config

    const cardTransition = useMemo(() => ({
        type: "spring" as const,
        stiffness: 260,
        damping: 26,
        mass: 1
    }), []);

    // Categories mapping for visual references in paths
    const categoriesMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
        mines: { label: 'Mines', icon: <Box size={18} />, color: '#ff8d33' },
        facilities: { label: 'Facilities', icon: <Wrench size={18} />, color: '#a855f7' },
        empireResearch: { label: 'Research', icon: <FlaskConical size={18} />, color: '#00f2ff' },
        lifeformBuildings: { label: 'LF Buildings', icon: <Globe size={18} />, color: '#22c55e' },
        lifeformResearch: { label: 'LF Research', icon: <Dna size={18} />, color: '#ec4899' },
        shipsDefences: { label: 'Ships / Defenses', icon: <Ship size={18} />, color: '#3b82f6' }
    };

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);

    // Cart DB Persistence & Realtime Auto-Synchronization
    const [cartInitialized, setCartInitialized] = useState<boolean>(false);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        setCartInitialized(false);
        isFirstLoad.current = true;
    }, [activeAccount?.playerId]);

    useEffect(() => {
        if (!activeAccount || !planets || planets.length === 0 || cartInitialized) return;

        let active = true;

        db.settings.get("costs_planner_cart_" + activeAccount.playerId).then(data => {
            if (!active) return;

            const initialCart: CartItem[] = (data as any)?.cartItems || [];
            let needsSave = false;

            const syncedCart = initialCart.map(item => {
                let realCurrent = 0;
                let realPlanet = planets.find(p => p.id === item.planetId);

                if (item.category === 'Mines' && realPlanet) {
                    if (item.itemName === 'Metal Mine') realCurrent = realPlanet.metalMine || 0;
                    if (item.itemName === 'Crystal Mine') realCurrent = realPlanet.crystalMine || 0;
                    if (item.itemName === 'Deuterium Mine') realCurrent = realPlanet.deuteriumMine || 0;
                    if (item.itemName === 'Fusion Reactor') realCurrent = realPlanet.fusionReactor || 0;
                } else if (item.category === 'Facilities' && realPlanet) {
                    if (item.itemName === 'Robotics Factory') realCurrent = realPlanet.roboticsFactory || 0;
                    if (item.itemName === 'Shipyard') realCurrent = realPlanet.shipyard || 0;
                    if (item.itemName === 'Research Lab') realCurrent = realPlanet.researchLab || 0;
                    if (item.itemName === 'Nanite Factory') realCurrent = realPlanet.naniteFactory || 0;
                } else if (item.category === 'Research' && activeAccount.researches) {
                    const found = activeAccount.researches.find(r => r.id === item.itemId);
                    realCurrent = found ? found.level : 0;
                } else if (item.category === 'LF Building' && realPlanet?.lifeformBuildings) {
                    const found = realPlanet.lifeformBuildings.find(b => b.id === item.itemId);
                    realCurrent = found ? found.level : 0;
                } else if (item.category === 'LF Research' && realPlanet) {
                    const rawSetup = realPlanet.sandboxSetup || realPlanet.lifeformSetup || [];
                    const found = rawSetup.find(s => {
                        let tid = s.selectedTechId;
                        if (tid && tid > 10000) {
                            const species = Math.floor(tid / 1000) % 10;
                            const slot = tid % 100;
                            tid = (slot - 1) * 4 + species;
                        }
                        return tid === item.itemId;
                    });
                    realCurrent = found ? found.level : 0;
                } else {
                    return item;
                }

                if (realCurrent === item.currentLevel) {
                    return item;
                }

                if (realCurrent >= item.targetLevel) {
                    needsSave = true;
                    return null;
                }

                needsSave = true;
                let cost: ResourceCost = { metal: 0, crystal: 0, deuterium: 0 };

                if (item.category === 'Mines' && realPlanet) {
                    const specName = item.itemName === 'Deuterium Mine' ? 'Deuterium Mine' : item.itemName;
                    const costConfig = MINES_BASE_COSTS[specName];
                    if (costConfig) {
                        cost = calculateStandardCost(costConfig.base, costConfig.factor, realCurrent, item.targetLevel);
                        if (item.itemName !== 'Fusion Reactor') {
                            const multiplier = getMineCostMultiplier(realPlanet);
                            cost = applyDiscount(cost, multiplier);
                        }
                    }
                } else if (item.category === 'Facilities') {
                    const costConfig = FACILITIES_BASE_COSTS[item.itemName];
                    if (costConfig) {
                        cost = calculateStandardCost(costConfig.base, costConfig.factor, realCurrent, item.targetLevel);
                    }
                } else if (item.category === 'Research') {
                    const costConfig = RESEARCH_BASE_COSTS[item.itemName];
                    if (costConfig) {
                        cost = calculateStandardCost(costConfig.base, costConfig.factor, realCurrent, item.targetLevel);
                        const { discount } = getEmpireResearchDiscount(item.itemName, planets, activeAccount);
                        if (discount > 0) {
                            cost = applyDiscount(cost, 1.0 - discount);
                        }
                    }
                } else if (item.category === 'LF Building' && realPlanet) {
                    const costConfig = LIFEFORM_BUILDINGS_COSTS[item.itemId];
                    if (costConfig) {
                        cost = calculateLifeformBuildingCost(item.itemId, costConfig.base, costConfig.factor, realCurrent, item.targetLevel);
                        const multiplier = getLifeformBuildingCostMultiplier(realPlanet);
                        cost = applyDiscount(cost, multiplier);
                    }
                } else if (item.category === 'LF Research' && realPlanet) {
                    const tech = LIFEFORM_TECH_DATA.find(t => t.id === item.itemId);
                    if (tech) {
                        cost = calculateCumulativeTechCost(
                            { metal: tech.metalBaseCost, crystal: tech.crystalBaseCost, deuterium: tech.deutBaseCost },
                            { metal: tech.metalIncreaseFactor, crystal: tech.crystalIncreaseFactor, deuterium: tech.deutIncreaseFactor },
                            realCurrent,
                            item.targetLevel
                        );
                        const multiplier = getLifeformResearchCostMultiplier(realPlanet);
                        cost = applyDiscount(cost, multiplier);
                    }
                }

                return {
                    ...item,
                    currentLevel: realCurrent,
                    cost
                };
            }).filter((item): item is CartItem => item !== null);

            setCart(syncedCart);
            setCartInitialized(true);

            if (needsSave && activeAccount) {
                db.settings.put({
                    id: "costs_planner_cart_" + activeAccount.playerId,
                    cartItems: syncedCart
                } as any).catch(e => console.error("Failed to sync cart to DB:", e));
            }
        });

        return () => {
            active = false;
        };
    }, [activeAccount, planets, cartInitialized]);

    useEffect(() => {
        if (!activeAccount || !cartInitialized) return;
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }
        db.settings.put({
            id: "costs_planner_cart_" + activeAccount.playerId,
            cartItems: cart
        } as any).catch(e => console.error("Failed to save cart to DB:", e));
    }, [cart, activeAccount, cartInitialized]);

    // Drilldown Targets/Quantities States
    const [targetLevels, setTargetLevels] = useState<Record<string, number>>({});
    const [batchQuantities, setBatchQuantities] = useState<Record<string, number>>({});
    const [lfResearchTargetLevels, setLfResearchTargetLevels] = useState<Record<number, number>>({});

    // Notify popups
    const [notification, setNotification] = useState<string | null>(null);

    const isItemDuplicate = (category: string, planetId: string, itemName: string, targetLevel: number): boolean => {
        return cart.some(item =>
            item.category === category &&
            item.planetId === planetId &&
            item.itemName === itemName &&
            item.targetLevel === targetLevel
        );
    };

    const activePlanet = useMemo(() => {
        return planets.find(p => p.id === selectedPlanetId) || null;
    }, [planets, selectedPlanetId]);

    // Pre-populate target level defaults for active item
    const getStoredCurrentLevel = (category: string, itemName: string, itemId?: number): number => {
        if (category === 'mines' && activePlanet) {
            if (itemName === 'Metal Mine') return activePlanet.metalMine || 0;
            if (itemName === 'Crystal Mine') return activePlanet.crystalMine || 0;
            if (itemName === 'Deuterium Mine') return activePlanet.deuteriumMine || 0;
            if (itemName === 'Fusion Reactor') return activePlanet.fusionReactor || 0;
        }
        if (category === 'facilities' && activePlanet) {
            if (itemName === 'Robotics Factory') return activePlanet.roboticsFactory || 0;
            if (itemName === 'Shipyard') return activePlanet.shipyard || 0;
            if (itemName === 'Research Lab') return activePlanet.researchLab || 0;
            if (itemName === 'Nanite Factory') return activePlanet.naniteFactory || 0;
        }
        if (category === 'empireResearch' && activeAccount?.researches) {
            const found = activeAccount.researches.find(r => r.id === itemId);
            return found ? found.level : 0;
        }
        if (category === 'lifeformBuildings' && activePlanet?.lifeformBuildings) {
            const found = activePlanet.lifeformBuildings.find(b => b.id === itemId);
            return found ? found.level : 0;
        }
        return 0;
    };

    const handleLevelChange = (key: string, value: number, maxDown: number) => {
        setTargetLevels(prev => ({
            ...prev,
            [key]: Math.max(maxDown, value)
        }));
    };

    const handleQuantityChange = (key: string, value: number) => {
        setBatchQuantities(prev => ({
            ...prev,
            [key]: Math.max(1, value)
        }));
    };

    // Lifeform technology matrix helper (renders slot icons correctly)
    const getLfTechIconPath = (techId: number | null) => {
        if (techId === null) return '';
        const tech = LIFEFORM_TECH_DATA.find(t => t.id === techId);
        if (!tech) return '';
        const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
        const lfName = lfNames[tech.lifeformId - 1];
        const slotNum = Math.floor((tech.id - 1) / 4) + 1;
        return `icons/lifeforms/${lfName}-tech-t${slotNum}-large.jpg`;
    };

    const triggerNotification = (text: string) => {
        setNotification(text);
        setTimeout(() => setNotification(null), 1200);
    };

    // ----------------------------------------------------
    // ADD TO LIST TRIGGERS
    // ----------------------------------------------------

    const handleAddMineToCart = (itemName: string) => {
        if (!activePlanet) return;
        const current = getStoredCurrentLevel('mines', itemName);
        const inputKey = `mines_${selectedPlanetId}_${itemName}`;
        const target = targetLevels[inputKey] ?? (current + 1);
        if (target <= current) return;

        const existing = cart.find(item =>
            item.category === 'Mines' &&
            item.planetId === selectedPlanetId &&
            item.itemName === itemName
        );

        if (existing && existing.targetLevel === target) {
            triggerNotification(`Lvl ${target} ${itemName} is already in the list!`);
            return;
        }

        const specName = itemName === 'Deuterium Mine' ? 'Deuterium Mine' : itemName;
        const costConfig = MINES_BASE_COSTS[specName];
        if (!costConfig) return;

        let cost = calculateStandardCost(costConfig.base, costConfig.factor, current, target);
        if (itemName !== 'Fusion Reactor') {
            const multiplier = getMineCostMultiplier(activePlanet);
            cost = applyDiscount(cost, multiplier);
        }
        const icon = itemName === 'Metal Mine' ? 'icons/resources/metal_mine_large.jpg'
            : itemName === 'Crystal Mine' ? 'icons/resources/crystal_mine_large.jpg'
                : itemName === 'Deuterium Mine' ? 'icons/resources/deuterium_mine_large.jpg'
                    : 'icons/resources/fusion-reactor-large.jpg';

        const newItem: CartItem = {
            id: `${selectedPlanetId}_mines_${itemName}_${Date.now()}`,
            planetId: selectedPlanetId,
            planetName: activePlanet.name,
            coords: activePlanet.coords,
            category: 'Mines',
            itemId: 0,
            itemName,
            currentLevel: current,
            targetLevel: target,
            cost,
            icon
        };

        setCart(prev => {
            const filtered = prev.filter(item =>
                !(item.category === 'Mines' &&
                    item.planetId === selectedPlanetId &&
                    item.itemName === itemName)
            );
            return [...filtered, newItem];
        });

        if (existing) {
            triggerNotification(`Updated ${itemName} to Lvl ${target} in list!`);
        } else {
            triggerNotification(`Added ${itemName} to list!`);
        }
    };

    const handleAddFacilityToCart = (itemName: string) => {
        if (!activePlanet) return;
        const current = getStoredCurrentLevel('facilities', itemName);
        const inputKey = `facilities_${selectedPlanetId}_${itemName}`;
        const target = targetLevels[inputKey] ?? (current + 1);
        if (target <= current) return;

        const existing = cart.find(item =>
            item.category === 'Facilities' &&
            item.planetId === selectedPlanetId &&
            item.itemName === itemName
        );

        if (existing && existing.targetLevel === target) {
            triggerNotification(`Lvl ${target} ${itemName} is already in the list!`);
            return;
        }

        const costConfig = FACILITIES_BASE_COSTS[itemName];
        if (!costConfig) return;

        const cost = calculateStandardCost(costConfig.base, costConfig.factor, current, target);
        const icon = itemName === 'Robotics Factory' ? 'icons/facilities/robotics_factory_large.jpg'
            : itemName === 'Shipyard' ? 'icons/facilities/shipyard_large.jpg'
                : itemName === 'Research Lab' ? 'icons/facilities/research_lab_large.jpg'
                    : 'icons/facilities/nanite_factory_large.jpg';

        const newItem: CartItem = {
            id: `${selectedPlanetId}_facilities_${itemName}_${Date.now()}`,
            planetId: selectedPlanetId,
            planetName: activePlanet.name,
            coords: activePlanet.coords,
            category: 'Facilities',
            itemId: 0,
            itemName,
            currentLevel: current,
            targetLevel: target,
            cost,
            icon
        };

        setCart(prev => {
            const filtered = prev.filter(item =>
                !(item.category === 'Facilities' &&
                    item.planetId === selectedPlanetId &&
                    item.itemName === itemName)
            );
            return [...filtered, newItem];
        });

        if (existing) {
            triggerNotification(`Updated ${itemName} to Lvl ${target} in list!`);
        } else {
            triggerNotification(`Added ${itemName} to list!`);
        }
    };

    const handleAddResearchToCart = (tech: any) => {
        const current = getStoredCurrentLevel('empireResearch', tech.name, tech.id);
        const inputKey = `research_${tech.id}`;
        const target = targetLevels[inputKey] ?? (current + 1);
        if (target <= current) return;

        const existing = cart.find(item =>
            item.category === 'Research' &&
            item.planetId === 'empire' &&
            item.itemName === tech.name
        );

        if (existing && existing.targetLevel === target) {
            triggerNotification(`Lvl ${target} ${tech.name} is already in the list!`);
            return;
        }

        const costConfig = RESEARCH_BASE_COSTS[tech.name];
        if (!costConfig) return;

        let cost = calculateStandardCost(costConfig.base, costConfig.factor, current, target);
        const { discount } = getEmpireResearchDiscount(tech.name, planets, activeAccount);
        if (discount > 0) {
            cost = applyDiscount(cost, 1.0 - discount);
        }

        // Map icons locally from name
        const resMap: Record<string, string> = {
            'Energy Technology': 'icons/research/energy-research-large.jpg',
            'Laser Technology': 'icons/research/laser-tech-research-large.jpg',
            'Ion Technology': 'icons/research/ion-tech-research-large.jpg',
            'Hyperspace Technology': 'icons/research/hyperspace-tech-research-large.jpg',
            'Plasma Technology': 'icons/research/plasma-tech-research-large.jpg',
            'Combustion Drive': 'icons/research/combustion-drive-research-large.jpg',
            'Impulse Drive': 'icons/research/impulse-drive-research-large.jpg',
            'Hyperspace Drive': 'icons/research/hyperspace-drive-research-large.jpg',
            'Espionage Technology': 'icons/research/espionage-tech-research-large.jpg',
            'Computer Technology': 'icons/research/computer-tech-research-large.jpg',
            'Astrophysics': 'icons/research/expedition-tech-research-large.jpg',
            'Intergalactic Research Network': 'icons/research/integalagtic-research-tech-research-large.jpg',
            'Graviton Technology': 'icons/research/graviton-tech-research-large.jpg',
            'Weapons Technology': 'icons/research/weapons-tech-research-large.jpg',
            'Shielding Technology': 'icons/research/shield-tech-research-large.jpg',
            'Armour Technology': 'icons/research/armor-tech-research-large.jpg'
        };
        const icon = resMap[tech.name] || '';

        const newItem: CartItem = {
            id: `empire_research_${tech.id}_${Date.now()}`,
            planetId: 'empire',
            planetName: 'Empire',
            coords: 'Global',
            category: 'Research',
            itemId: tech.id,
            itemName: tech.name,
            currentLevel: current,
            targetLevel: target,
            cost,
            icon
        };

        setCart(prev => {
            const filtered = prev.filter(item =>
                !(item.category === 'Research' &&
                    item.planetId === 'empire' &&
                    item.itemName === tech.name)
            );
            return [...filtered, newItem];
        });

        if (existing) {
            triggerNotification(`Updated ${tech.name} to Lvl ${target} in list!`);
        } else {
            triggerNotification(`Added ${tech.name} to list!`);
        }
    };

    const handleAddAllResearchToCart = () => {
        const itemsToAdd: CartItem[] = [];

        RESEARCH_DATA.forEach(tech => {
            const current = getStoredCurrentLevel('empireResearch', tech.name, tech.id);
            const inputKey = `research_${tech.id}`;
            const target = targetLevels[inputKey] ?? current;

            if (target > current) {
                const existing = cart.find(item =>
                    item.category === 'Research' &&
                    item.planetId === 'empire' &&
                    item.itemName === tech.name
                );

                if (existing && existing.targetLevel === target) {
                    return;
                }

                const costConfig = RESEARCH_BASE_COSTS[tech.name];
                if (costConfig) {
                    let cost = calculateStandardCost(costConfig.base, costConfig.factor, current, target);
                    const { discount } = getEmpireResearchDiscount(tech.name, planets, activeAccount);
                    if (discount > 0) {
                        cost = applyDiscount(cost, 1.0 - discount);
                    }
                    const icon = getResearchIconPath(tech.name);

                    itemsToAdd.push({
                        id: `empire_research_${tech.id}_${Date.now()}`,
                        planetId: 'empire',
                        planetName: 'Empire',
                        coords: 'Global',
                        category: 'Research',
                        itemId: tech.id,
                        itemName: tech.name,
                        currentLevel: current,
                        targetLevel: target,
                        cost,
                        icon
                    });
                }
            }
        });

        if (itemsToAdd.length === 0) {
            triggerNotification("No research technology level increases have been adjusted in the grid yet!");
            return;
        }

        const techsToAdd = itemsToAdd.map(i => i.itemName);
        let addedCount = 0;
        let updatedCount = 0;
        itemsToAdd.forEach(item => {
            const exists = cart.some(c => c.category === 'Research' && c.planetId === 'empire' && c.itemName === item.itemName);
            if (exists) {
                updatedCount++;
            } else {
                addedCount++;
            }
        });

        setCart(prev => {
            const filtered = prev.filter(item =>
                !(item.category === 'Research' &&
                    item.planetId === 'empire' &&
                    techsToAdd.includes(item.itemName))
            );
            return [...filtered, ...itemsToAdd];
        });

        let msg = '';
        if (addedCount > 0 && updatedCount > 0) {
            msg = `Added ${addedCount} & updated ${updatedCount} Researches in list!`;
        } else if (updatedCount > 0) {
            msg = `Updated ${updatedCount} Researches in list!`;
        } else {
            msg = `Added ${addedCount} Researches to list!`;
        }
        triggerNotification(msg);

        // Reset levels in local view
        setTargetLevels(prev => {
            const next = { ...prev };
            RESEARCH_DATA.forEach(tech => {
                delete next[`research_${tech.id}`];
            });
            return next;
        });
    };

    const handleAddLifeformBuildingToCart = (bld: any) => {
        if (!activePlanet) return;
        const current = getStoredCurrentLevel('lifeformBuildings', bld.name, bld.id);
        const inputKey = `lfBuildings_${selectedPlanetId}_${bld.id}`;
        const target = targetLevels[inputKey] ?? (current + 1);
        if (target <= current) return;

        const existing = cart.find(item =>
            item.category === 'LF Building' &&
            item.planetId === selectedPlanetId &&
            item.itemName === bld.name
        );

        if (existing && existing.targetLevel === target) {
            triggerNotification(`Lvl ${target} ${bld.name} is already in the list!`);
            return;
        }

        const costConfig = LIFEFORM_BUILDINGS_COSTS[bld.id];
        if (!costConfig) return;

        let cost = calculateLifeformBuildingCost(bld.id, costConfig.base, costConfig.factor, current, target);
        const multiplier = getLifeformBuildingCostMultiplier(activePlanet);
        cost = applyDiscount(cost, multiplier);

        // Icon lookup
        const lfId = activePlanet.lifeformId || 1;
        const raceFolders = ['humans', 'rocktal', 'mechas', 'kaelesh'];
        const raceFolder = raceFolders[lfId - 1];
        const slotIndex = bld.id % 100;
        const icon = `icons/lifeforms/${raceFolder}-building-${slotIndex}-large.jpg`;

        const newItem: CartItem = {
            id: `${selectedPlanetId}_lfBuildings_${bld.id}_${Date.now()}`,
            planetId: selectedPlanetId,
            planetName: activePlanet.name,
            coords: activePlanet.coords,
            category: 'LF Building',
            itemId: bld.id,
            itemName: bld.name,
            currentLevel: current,
            targetLevel: target,
            cost,
            icon
        };

        setCart(prev => {
            const filtered = prev.filter(item =>
                !(item.category === 'LF Building' &&
                    item.planetId === selectedPlanetId &&
                    item.itemName === bld.name)
            );
            return [...filtered, newItem];
        });

        if (existing) {
            triggerNotification(`Updated ${bld.name} to Lvl ${target} in list!`);
        } else {
            triggerNotification(`Added ${bld.name} to list!`);
        }
    };

    const handleAddLifeformResearchToCart = () => {
        if (!activePlanet) return;

        // Fetch and normalize setup on the target planet
        const rawSetup = activePlanet.sandboxSetup || activePlanet.lifeformSetup || [];
        const activeSetup: { slotNumber: number; selectedTechId: number | null; level: number }[] = Array.from({ length: 18 }, (_, i) => ({
            slotNumber: i + 1,
            selectedTechId: null,
            level: 0
        }));

        rawSetup.forEach(s => {
            let tid = s.selectedTechId;
            let slotNum = s.slotNumber;

            // OGame IDs are 1[Species]2[Slot] e.g. 11201 or 12209
            if (tid && tid > 10000) {
                const species = Math.floor(tid / 1000) % 10;
                const slot = tid % 100;
                tid = (slot - 1) * 4 + species;
                if (!slotNum || slotNum === 0) slotNum = slot;
            }

            if (slotNum >= 1 && slotNum <= 18) {
                activeSetup[slotNum - 1] = {
                    slotNumber: slotNum,
                    selectedTechId: tid,
                    level: s.level
                };
            }
        });

        const itemsToAdd: CartItem[] = [];

        activeSetup.forEach((slot) => {
            if (slot.selectedTechId === null || slot.selectedTechId === undefined) return;
            const tech = LIFEFORM_TECH_DATA.find(t => t.id === slot.selectedTechId);
            if (!tech) return;

            const current = slot.level || 0;
            const target = lfResearchTargetLevels[slot.selectedTechId] ?? current;

            if (target > current) {
                const existing = cart.find(item =>
                    item.category === 'LF Research' &&
                    item.planetId === selectedPlanetId &&
                    item.itemName === tech.name
                );

                if (existing && existing.targetLevel === target) {
                    return;
                }

                // Cost scaling base configuration
                let cost = calculateCumulativeTechCost(
                    { metal: tech.metalBaseCost, crystal: tech.crystalBaseCost, deuterium: tech.deutBaseCost },
                    { metal: tech.metalIncreaseFactor, crystal: tech.crystalIncreaseFactor, deuterium: tech.deutIncreaseFactor },
                    current,
                    target
                );
                const multiplier = getLifeformResearchCostMultiplier(activePlanet);
                cost = applyDiscount(cost, multiplier);

                const icon = getLfTechIconPath(slot.selectedTechId);

                itemsToAdd.push({
                    id: `${selectedPlanetId}_lfResearch_${tech.id}_${Date.now()}`,
                    planetId: selectedPlanetId,
                    planetName: activePlanet.name,
                    coords: activePlanet.coords,
                    category: 'LF Research',
                    itemId: tech.id,
                    itemName: tech.name,
                    currentLevel: current,
                    targetLevel: target,
                    cost,
                    icon
                });
            }
        });

        if (itemsToAdd.length === 0) {
            triggerNotification("No technology level increases have been adjusted in the grid yet!");
            return;
        }

        const techsToAdd = itemsToAdd.map(i => i.itemName);
        let addedCount = 0;
        let updatedCount = 0;
        itemsToAdd.forEach(item => {
            const exists = cart.some(c => c.category === 'LF Research' && c.planetId === selectedPlanetId && c.itemName === item.itemName);
            if (exists) {
                updatedCount++;
            } else {
                addedCount++;
            }
        });

        setCart(prev => {
            const filtered = prev.filter(item =>
                !(item.category === 'LF Research' &&
                    item.planetId === selectedPlanetId &&
                    techsToAdd.includes(item.itemName))
            );
            return [...filtered, ...itemsToAdd];
        });

        let msg = '';
        if (addedCount > 0 && updatedCount > 0) {
            msg = `Added ${addedCount} & updated ${updatedCount} Techs in list!`;
        } else if (updatedCount > 0) {
            msg = `Updated ${updatedCount} Techs in list!`;
        } else {
            msg = `Added ${addedCount} Techs to shopping list!`;
        }
        triggerNotification(msg);

        // Reset levels in local view
        setLfResearchTargetLevels({});
    };

    const handleAddShipOrDefenseToCart = (item: any, type: 'ship' | 'defence') => {
        const inputKey = `batch_${selectedPlanetId}_${item.id}`;
        const qty = batchQuantities[inputKey] ?? (type === 'ship' ? 10 : 25);

        let cost: ResourceCost = { metal: 0, crystal: 0, deuterium: 0 };
        let icon = '';

        if (type === 'ship') {
            const shipCost = item.metadata?.cost;
            if (shipCost) {
                cost = {
                    metal: (shipCost.metal || 0) * qty,
                    crystal: (shipCost.crystal || 0) * qty,
                    deuterium: (shipCost.deuterium || 0) * qty
                };
            }
            icon = item.icon || '';
        } else {
            const defenceCost = DEFENCES_BASE_COSTS[item.id];
            if (defenceCost) {
                cost = {
                    metal: (defenceCost.metal || 0) * qty,
                    crystal: (defenceCost.crystal || 0) * qty,
                    deuterium: (defenceCost.deuterium || 0) * qty
                };
            }
            // Map defense icons locally
            const defMap: Record<number, string> = {
                401: 'icons/defense/rocket-launcher-large.jpg',
                402: 'icons/defense/light-laser-large.jpg',
                403: 'icons/defense/heavy-laser-large.jpg',
                404: 'icons/defense/gauss-cannon-large.jpg',
                405: 'icons/defense/ion-cannon-large.jpg',
                406: 'icons/defense/plasma-turret-large.jpg',
                407: 'icons/defense/small-shield-dome-large.jpg',
                408: 'icons/defense/large-shield-dome-large.jpg',
                502: 'icons/defense/anti-ballistic-missile-large.jpg',
                503: 'icons/defense/interplanetary-missile-large.jpg'
            };
            icon = defMap[item.id] || '';
        }

        const newItem: CartItem = {
            id: `${selectedPlanetId}_${type}_${item.id}_${Date.now()}`,
            planetId: selectedPlanetId,
            planetName: activePlanet ? activePlanet.name : 'Empire',
            coords: activePlanet ? activePlanet.coords : 'Global',
            category: type === 'ship' ? 'Ships' : 'Defenses',
            itemId: item.id,
            itemName: item.name,
            currentLevel: 0,
            targetLevel: 0,
            quantity: qty,
            cost,
            icon
        };

        const existing = cart.find(c =>
            c.category === (type === 'ship' ? 'Ships' : 'Defenses') &&
            c.planetId === selectedPlanetId &&
            c.itemId === item.id
        );

        if (existing) {
            const newQty = (existing.quantity || 0) + qty;
            triggerNotification(`Updated ${item.name} to ${newQty}x in list!`);
        } else {
            triggerNotification(`Added ${qty}x ${item.name} to list!`);
        }

        setCart(prev => {
            const existingIdx = prev.findIndex(c =>
                c.category === (type === 'ship' ? 'Ships' : 'Defenses') &&
                c.planetId === selectedPlanetId &&
                c.itemId === item.id
            );

            if (existingIdx > -1) {
                const ext = prev[existingIdx];
                const next = [...prev];
                next[existingIdx] = {
                    ...ext,
                    quantity: (ext.quantity || 0) + qty,
                    cost: {
                        metal: ext.cost.metal + cost.metal,
                        crystal: ext.cost.crystal + cost.crystal,
                        deuterium: ext.cost.deuterium + cost.deuterium
                    }
                };
                return next;
            } else {
                return [...prev, newItem];
            }
        });
    };

    const handleDeleteCartItem = (itemId: string) => {
        setCart(prev => prev.filter(item => item.id !== itemId));
    };

    // ----------------------------------------------------
    // COMPUTE CART SUMMARY
    // ----------------------------------------------------

    const cartSummary = useMemo(() => {
        let metal = 0;
        let crystal = 0;
        let deuterium = 0;
        cart.forEach(item => {
            metal += item.cost.metal;
            crystal += item.cost.crystal;
            deuterium += item.cost.deuterium;
        });

        const totalCost: ResourceCost = { metal, crystal, deuterium };
        const totalMSU = calculateMSU(totalCost, rates);

        return {
            cost: totalCost,
            msu: totalMSU
        };
    }, [cart, rates]);

    const packageMetrics = useMemo(() => {
        const metalPackageMSU = dailyProduction.metal;
        const crystalPackageMSU = dailyProduction.crystal * (rates.metal / rates.crystal);
        const deuteriumPackageMSU = dailyProduction.deuterium * (rates.metal / rates.deuterium);

        const metalPacksNeeded = metalPackageMSU > 0 ? (cartSummary.msu / metalPackageMSU) : 0;
        const crystalPacksNeeded = crystalPackageMSU > 0 ? (cartSummary.msu / crystalPackageMSU) : 0;
        const deuteriumPacksNeeded = deuteriumPackageMSU > 0 ? (cartSummary.msu / deuteriumPackageMSU) : 0;

        return {
            metalPacksNeeded,
            crystalPacksNeeded,
            deuteriumPacksNeeded
        };
    }, [dailyProduction, cartSummary.msu, rates]);

    // Dynamic multipliers for daily yield MSU calculation
    const mMultiplier = 1;
    const cMultiplier = useMemo(() => rates.metal / rates.crystal, [rates]);
    const dMultiplier = useMemo(() => rates.metal / rates.deuterium, [rates]);

    const totalEmpireDailyYieldMSU = useMemo(() => {
        let metalHourly = 0;
        let crystalHourly = 0;
        let deuteriumHourly = 0;
        if (calcResults) {
            planets.forEach(p => {
                const prod = calcResults.planets[p.id]?.total;
                if (prod) {
                    metalHourly += prod.metal || 0;
                    crystalHourly += prod.crystal || 0;
                    deuteriumHourly += prod.deuterium || 0;
                }
            });
        }
        const mineDailyMSU = ((metalHourly * mMultiplier) + (crystalHourly * cMultiplier) + (deuteriumHourly * dMultiplier)) * 24;

        let expResMsu7d = 0;
        let expShipMsu7d = 0;
        if (expeditions.length > 0) {
            const last7Days = Date.now() / 1000 - (7 * 24 * 60 * 60);
            const recentExps = expeditions.filter(e => e.timestamp >= last7Days);

            const shipCostMap: Record<number, any> = {};
            SHIP_DATA.forEach(s => shipCostMap[s.id] = s.metadata?.cost || { metal: 0, crystal: 0, deuterium: 0 });

            recentExps.forEach(e => {
                const res = (e.result || '').toLowerCase();
                if (e.resultDetails) {
                    const m = Number(e.resultDetails.metal) || 0;
                    const c = Number(e.resultDetails.crystal) || 0;
                    const d = Number(e.resultDetails.deuterium) || 0;

                    expResMsu7d += (m * mMultiplier) + (c * cMultiplier) + (d * dMultiplier);

                    if (res.includes('ship') || res.includes('wreck')) {
                        Object.entries(e.resultDetails).forEach(([id, data]: [string, any]) => {
                            const sid = parseInt(id);
                            const cost = shipCostMap[sid];
                            if (cost) {
                                const amount = data.amount || data;
                                const amt = typeof amount === 'number' ? amount : amount.amount || 0;
                                const sm = (cost.metal || 0) * amt;
                                const sc = (cost.crystal || 0) * amt;
                                const sd = (cost.deuterium || 0) * amt;

                                expShipMsu7d += (sm * mMultiplier) + (sc * cMultiplier) + (sd * dMultiplier);
                            }
                        });
                    }
                }
            });
        }
        const expResDailyMSU = expResMsu7d / 7;
        const expShipDailyMSU = expShipMsu7d / 7;

        let combatMsu7d = 0;
        if (combatReports.length > 0) {
            const last7Days = Date.now() / 1000 - (7 * 24 * 60 * 60);
            const recentCombats = combatReports.filter(c => c.timestamp >= last7Days && c.winner === 'attacker');

            recentCombats.forEach(c => {
                if (c.loot) {
                    const m = c.loot.metal || 0;
                    const cr = c.loot.crystal || 0;
                    const d = c.loot.deuterium || 0;
                    combatMsu7d += (m * mMultiplier) + (cr * cMultiplier) + (d * dMultiplier);
                }
            });
        }
        const combatDailyMSU = combatMsu7d / 7;

        let debrisMsu7d = 0;
        if (debrisHarvests.length > 0) {
            const last7Days = Date.now() / 1000 - (7 * 24 * 60 * 60);
            const recentDebris = debrisHarvests.filter(d => d.timestamp >= last7Days && d.recycledResources);

            recentDebris.forEach(d => {
                const m = d.recycledResources?.metal || 0;
                const cr = d.recycledResources?.crystal || 0;
                const det = d.recycledResources?.deuterium || 0;
                debrisMsu7d += (m * mMultiplier) + (cr * cMultiplier) + (det * dMultiplier);
            });
        }
        const debrisDailyMSU = debrisMsu7d / 7;

        return mineDailyMSU + expResDailyMSU + combatDailyMSU + debrisDailyMSU || 1;
    }, [planets, calcResults, expeditions, combatReports, debrisHarvests, mMultiplier, cMultiplier, dMultiplier, rates]);

    const formatGatherTime = (days: number): string => {
        if (days <= 0 || isNaN(days) || !isFinite(days)) return 'Instant';

        let remainingMinutes = Math.round(days * 24 * 60);
        
        const minutesInYear = 365 * 24 * 60;
        const minutesInMonth = 30 * 24 * 60;
        const minutesInDay = 24 * 60;
        const minutesInHour = 60;

        const years = Math.floor(remainingMinutes / minutesInYear);
        remainingMinutes %= minutesInYear;

        const months = Math.floor(remainingMinutes / minutesInMonth);
        remainingMinutes %= minutesInMonth;

        const targetDays = Math.floor(remainingMinutes / minutesInDay);
        remainingMinutes %= minutesInDay;

        const hours = Math.floor(remainingMinutes / minutesInHour);
        const minutes = remainingMinutes % minutesInHour;

        const parts: string[] = [];
        if (years > 0) parts.push(`${years}y`);
        if (months > 0) parts.push(`${months}m`);
        if (targetDays > 0) parts.push(`${targetDays}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

        return parts.slice(0, 3).join(' ');
    };

    const daysToGather = useMemo(() => {
        return cartSummary.msu / totalEmpireDailyYieldMSU;
    }, [cartSummary.msu, totalEmpireDailyYieldMSU]);

    const gatherTimeText = useMemo(() => {
        return formatGatherTime(daysToGather);
    }, [daysToGather]);

    const groupedCart = useMemo(() => {
        const groups: Record<string, { name: string; coords: string; isEmpire: boolean; planetImg?: string; items: CartItem[] }> = {};

        cart.forEach(item => {
            const isEmpireItem = item.planetId === 'empire' || item.category === 'Research' || item.category === 'Ships' || item.category === 'Defenses';
            const groupKey = isEmpireItem ? 'empire' : item.planetId;

            if (!groups[groupKey]) {
                const targetPlanet = planets.find(p => p.id === item.planetId);
                groups[groupKey] = {
                    name: isEmpireItem ? 'Global Empire' : item.planetName,
                    coords: isEmpireItem ? 'Global' : item.coords,
                    isEmpire: isEmpireItem,
                    planetImg: targetPlanet ? targetPlanet.imgUrl : '',
                    items: []
                };
            }
            groups[groupKey].items.push(item);
        });

        // Sort so that 'empire' is always first, then by name
        return Object.entries(groups).sort(([aKey], [bKey]) => {
            if (aKey === 'empire') return -1;
            if (bKey === 'empire') return 1;
            return aKey.localeCompare(bKey);
        });
    }, [cart, planets]);

    const formatNumber = (num: number) => {
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
        return Math.floor(num).toLocaleString();
    };

    const formatFullNumber = (num: number) => {
        return Math.floor(num).toLocaleString();
    };

    return (
        <div className="view-container costs-planner-view">
            {/* Header */}
            <header className="view-header relative">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '10px', borderRadius: '16px', background: 'rgba(0, 242, 255, 0.1)', color: 'var(--primary)', filter: 'drop-shadow(0 0 10px rgba(0, 242, 255, 0.3))' }}>
                        <ShoppingCart size={28} />
                    </div>
                    <div>
                        <h1 className="view-title">Costs Planner</h1>
                        <p className="view-subtitle">Simulate building upgrades, technologies, and fleet costs in a cohesive queue</p>
                    </div>
                </div>

                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="cart-alert"
                        >
                            <CheckCircle2 size={16} color="#00f2ff" />
                            <span>{notification}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Split Screen Layout */}
            <div className="planner-split-layout">

                {/* Left Column: Category drilldown workspace */}
                <section className="planner-workspace-col">

                    <AnimatePresence mode="wait">
                        {/* STEP 1: CATEGORY SELECTION SHELF */}
                        {plannerStep === 1 && (
                            <motion.div
                                key="step-1-categories"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="category-selection-shelf"
                            >
                                {[
                                    { id: 'mines', label: 'Mines', desc: 'Colony mines & fusion power plants', ogIcon: 'icons/resources/metal_mine_large.jpg', color: '#ff8d33' },
                                    { id: 'facilities', label: 'Facilities', desc: 'Advanced nanites & shipyards', ogIcon: 'icons/facilities/nanite_factory_large.jpg', color: '#a855f7' },
                                    { id: 'empireResearch', label: 'Research', desc: 'Drive & astrophysical sciences', ogIcon: 'icons/research/expedition-tech-research-large.jpg', color: '#00f2ff' },
                                    { id: 'lifeformBuildings', label: 'LF Buildings', desc: 'Species-specific colony structures', ogIcon: 'icons/lifeforms/mechas-building-7-large.jpg', color: '#22c55e' },
                                    { id: 'lifeformResearch', label: 'LF Research', desc: 'Intergalactic envoys & slots matrix', ogIcon: 'icons/lifeforms/humans-tech-t1-large.jpg', color: '#ec4899' },
                                    { id: 'shipsDefences', label: 'Ships / Defenses', desc: 'Starships, fleets & defense grids', ogIcon: 'icons/ships/battlecruiser-large.jpg', color: '#3b82f6' }
                                ].map(cat => (
                                    <motion.div
                                        transition={cardTransition}
                                        whileHover={{ scale: 1.02, y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                        key={cat.id}
                                        className={`category-card-btn bento-${cat.id}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                            setSelectedCategory(cat.id);
                                            setPlannerStep(2);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedCategory(cat.id);
                                                setPlannerStep(2);
                                            }
                                        }}
                                        style={{
                                            // @ts-ignore
                                            '--accent-color': cat.color
                                        }}
                                    >
                                        <div className="bento-bg-icon-overlay">
                                            <img src={cat.ogIcon} alt="" />
                                        </div>
                                        <div className="bento-bg-gradient-fade" />

                                        <div className="bento-card-content-wrapper">
                                            <div className="bento-card-top-row">
                                                <div className="bento-og-icon-wrapper" style={{ borderColor: cat.color }}>
                                                    <img src={cat.ogIcon} alt="" />
                                                </div>
                                                <div className="bento-small-indicator-icon" style={{ color: cat.color }}>
                                                    {categoriesMap[cat.id]?.icon}
                                                </div>
                                            </div>

                                            <div className="bento-card-text-group">
                                                <span className="bento-card-label">{cat.label}</span>
                                                <span className="bento-card-description">{cat.desc}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}

                        {/* STEP 2: ROTARY PLANET SPHERE */}
                        {plannerStep === 2 && selectedCategory && (
                            <motion.div
                                key="step-2-orbit"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="planet-selector-shelf-sequential"
                            >
                                <div className="step-navigation-header">
                                    <button className="step-back-btn" onClick={() => setPlannerStep(1)}>
                                        <RotateCcw size={13} />
                                        <span>Back to Categories</span>
                                    </button>
                                    <div className="step-instruction-badge">Step 2: Select Operational Scope</div>
                                </div>

                                <div className="step-2-horizontal-flow">
                                    {/* Active Centered Category Indicator */}
                                    <div className="selected-category-centered">
                                        {(() => {
                                            const cat = [
                                                { id: 'mines', label: 'Mines', desc: 'Colony mines & fusion power plants', ogIcon: 'icons/resources/metal_mine_large.jpg', color: '#ff8d33' },
                                                { id: 'facilities', label: 'Facilities', desc: 'Advanced nanites & shipyards', ogIcon: 'icons/facilities/nanite_factory_large.jpg', color: '#a855f7' },
                                                { id: 'empireResearch', label: 'Research', desc: 'Drive & astrophysical sciences', ogIcon: 'icons/research/expedition-tech-research-large.jpg', color: '#00f2ff' },
                                                { id: 'lifeformBuildings', label: 'LF Buildings', desc: 'Species-specific colony structures', ogIcon: 'icons/lifeforms/mechas-building-7-large.jpg', color: '#22c55e' },
                                                { id: 'lifeformResearch', label: 'LF Research', desc: 'Intergalactic envoys & slots matrix', ogIcon: 'icons/lifeforms/humans-tech-t1-large.jpg', color: '#ec4899' },
                                                { id: 'shipsDefences', label: 'Ships / Defenses', desc: 'Starships, fleets & defense grids', ogIcon: 'icons/ships/battlecruiser-large.jpg', color: '#3b82f6' }
                                            ].find(c => c.id === selectedCategory);

                                            if (!cat) return null;

                                            return (
                                                <motion.div
                                                    transition={cardTransition}
                                                    className={`category-card-btn active centered-active-btn bento-${cat.id}`}
                                                    style={{
                                                        // @ts-ignore
                                                        '--accent-color': cat.color
                                                    }}
                                                >
                                                    <div className="bento-bg-icon-overlay">
                                                        <img src={cat.ogIcon} alt="" />
                                                    </div>
                                                    <div className="bento-bg-gradient-fade" />

                                                    <div className="bento-card-content-wrapper">
                                                        <div className="bento-card-top-row">
                                                            <div className="bento-og-icon-wrapper" style={{ borderColor: cat.color }}>
                                                                <img src={cat.ogIcon} alt="" />
                                                            </div>
                                                            <div className="bento-small-indicator-icon" style={{ color: cat.color }}>
                                                                {categoriesMap[cat.id]?.icon}
                                                            </div>
                                                        </div>

                                                        <div className="bento-card-text-group">
                                                            <span className="bento-card-label">{cat.label}</span>
                                                            <span className="bento-card-description">{cat.desc}</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })()}
                                    </div>

                                    <div className="connector-path-horizontal" />

                                    {/* Spinning Rotary Sphere Container */}
                                    <div className="rotary-sphere-container">
                                        {/* The spinning orbit ring */}
                                        <div className="planets-orbit">
                                            {planets.map((p, idx) => {
                                                const angle = (idx / planets.length) * 360;
                                                const isSelected = selectedPlanetId === p.id && (plannerStep as number) === 3;
                                                const isCategoryColonyScoped = ['mines', 'facilities', 'lifeformBuildings', 'lifeformResearch'].includes(selectedCategory);

                                                return (
                                                    <div
                                                        key={p.id}
                                                        className={`planet-rotary-item ${isSelected ? 'active' : ''} ${isCategoryColonyScoped ? 'enabled' : 'disabled'}`}
                                                        style={{
                                                            // @ts-ignore
                                                            '--angle': `${angle}deg`,
                                                            animationDelay: `${idx * 0.08}s`
                                                        }}
                                                        onClick={() => {
                                                            if (isCategoryColonyScoped) {
                                                                setSelectedPlanetId(p.id);
                                                                setPlannerStep(3);
                                                            }
                                                        }}
                                                    >
                                                        <div className="planet-rotary-img-wrapper">
                                                            <img src={p.imgUrl || 'icons/planets/dry-large.jpg'} alt="" />
                                                        </div>
                                                        <div
                                                            className="planet-mini-label-tooltip"
                                                            style={{
                                                                // @ts-ignore
                                                                '--angle': `${angle}deg`
                                                            }}
                                                        >
                                                            <div className="tooltip-upright-content">
                                                                <span className="p-coords-badge">{p.coords}</span>
                                                                <span className="p-name-badge">{p.name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Central glowing Empire Button */}
                                        <div className="center-empire-wrapper">
                                            {(() => {
                                                const isEmpireActive = ['empireResearch', 'shipsDefences'].includes(selectedCategory);
                                                return (
                                                    <button
                                                        className={`empire-center-btn ${isEmpireActive ? 'enabled' : 'disabled'}`}
                                                        onClick={() => {
                                                            if (isEmpireActive) {
                                                                setSelectedPlanetId('empire');
                                                                setPlannerStep(3);
                                                            }
                                                        }}
                                                        title={isEmpireActive ? 'Empire scope selected' : 'Empire scope not applicable'}
                                                    >
                                                        <div className="empire-glow-ring" />
                                                        <Globe size={26} />
                                                        <span className="empire-label">EMPIRE</span>
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: BREADCRUMB & CONFIG DETAILS PANEL */}
                        {plannerStep === 3 && selectedCategory && (
                            <motion.div
                                key="step-3-config"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.3 }}
                                className="workspace-options-panel-sequential"
                            >
                                {/* Breadcrumb Pathway */}
                                <div className="workspace-breadcrumb-navbar">
                                    <button className="step-back-btn" onClick={() => {
                                        setPlannerStep(1);
                                        setSelectedCategory('');
                                    }}>
                                        <RotateCcw size={13} />
                                        <span>Back to Categories</span>
                                    </button>

                                    <div className="breadcrumb-pathway">
                                        <span className="path-node" onClick={() => setPlannerStep(2)}>
                                            {categoriesMap[selectedCategory]?.icon}
                                            <span>{categoriesMap[selectedCategory]?.label}</span>
                                        </span>
                                        <span className="path-separator">&gt;</span>
                                        <span className="path-node current" onClick={() => setPlannerStep(2)}>
                                            {selectedPlanetId === 'empire' ? (
                                                <>
                                                    <Globe size={14} />
                                                    <span>Global Empire</span>
                                                </>
                                            ) : (
                                                <>
                                                    <img src={activePlanet?.imgUrl || 'icons/planets/dry-large.jpg'} className="path-planet-thumb" alt="" />
                                                    <span>{activePlanet?.name} [{activePlanet?.coords}]</span>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="sequential-config-workspace-inner">

                                    {/* Option List: MINES */}
                                    {selectedCategory === 'mines' && activePlanet && (
                                        <div className="builder-options-list">
                                            {[
                                                { name: "Metal Mine", dbKey: "metalMine", desc: "Primary source of structural metals" },
                                                { name: "Crystal Mine", dbKey: "crystalMine", desc: "Crucial resource for computers and high-end materials" },
                                                { name: "Deuterium Mine", dbKey: "deuteriumMine", desc: "Fuel Synthesizer extracted from surface oceans" },
                                                { name: "Fusion Reactor", dbKey: "fusionReactor", desc: "Consumes deuterium to yield high baseline power" }
                                            ].map(mine => {
                                                const current = getStoredCurrentLevel('mines', mine.name);
                                                const inputKey = `mines_${selectedPlanetId}_${mine.name}`;
                                                const target = targetLevels[inputKey] ?? (current + 1);
                                                const costKey = mine.name === 'Deuterium Mine' ? 'Deuterium Mine' : mine.name;
                                                const costConfig = MINES_BASE_COSTS[costKey];
                                                let calculatedCost = costConfig ? calculateStandardCost(costConfig.base, costConfig.factor, current, target) : { metal: 0, crystal: 0, deuterium: 0 };
                                                if (mine.name !== 'Fusion Reactor') {
                                                    const multiplier = getMineCostMultiplier(activePlanet);
                                                    calculatedCost = applyDiscount(calculatedCost, multiplier);
                                                }
                                                const hasUpgrade = target > current;

                                                return (
                                                    <div key={mine.name} className="builder-option-row">
                                                        <div className="option-info-group flex-row-item">
                                                            <img
                                                                src={
                                                                    mine.name === 'Metal Mine' ? 'icons/resources/metal_mine_large.jpg'
                                                                        : mine.name === 'Crystal Mine' ? 'icons/resources/crystal_mine_large.jpg'
                                                                            : mine.name === 'Deuterium Mine' ? 'icons/resources/deuterium_mine_large.jpg'
                                                                                : 'icons/resources/fusion-reactor-large.jpg'
                                                                }
                                                                style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                alt=""
                                                            />
                                                            <div>
                                                                <div className="option-title">{mine.name}</div>
                                                                <div className="option-description">
                                                                    {mine.desc}
                                                                    {activePlanet.lifeformId === 2 && mine.name !== 'Fusion Reactor' && (() => {
                                                                        const mrcLvl = activePlanet.lifeformBuildings?.find((b: any) => b.id === 12111)?.level || 0;
                                                                        const mrcDiscount = mrcLvl * 0.5;
                                                                        if (mrcLvl > 0) {
                                                                            return (
                                                                                <span className="discount-pill" style={{ marginLeft: '8px', color: '#33ff8d', fontSize: '0.7rem', background: 'rgba(51, 255, 141, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(51, 255, 141, 0.2)', fontWeight: 600 }}>
                                                                                    -{mrcDiscount}% (Mineral Research Centre lvl {mrcLvl})
                                                                                </span>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="option-controls-group">
                                                            {/* Levels adjusting shelf */}
                                                            <div className="level-adjuster-shelf">
                                                                <span className="level-label">Lvl {current}</span>
                                                                <ArrowRight size={14} style={{ opacity: 0.3 }} />
                                                                <div className="slider-input-wrapper">
                                                                    <button className="qty-arrow" onClick={() => handleLevelChange(inputKey, target - 1, current + 1)} disabled={target <= current + 1}>
                                                                        <Minus size={12} />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        value={target}
                                                                        onChange={(e) => handleLevelChange(inputKey, parseInt(e.target.value) || (current + 1), current + 1)}
                                                                        min={current + 1}
                                                                        className="level-val-input"
                                                                    />
                                                                    <button className="qty-arrow" onClick={() => handleLevelChange(inputKey, target + 1, current + 1)}>
                                                                        <Plus size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Mini resource breakdown */}
                                                            {hasUpgrade && (() => {
                                                                let singleCost = costConfig ? calculateStandardCost(costConfig.base, costConfig.factor, target - 1, target) : { metal: 0, crystal: 0, deuterium: 0 };
                                                                if (mine.name !== 'Fusion Reactor') {
                                                                    const multiplier = getMineCostMultiplier(activePlanet);
                                                                    singleCost = applyDiscount(singleCost, multiplier);
                                                                }
                                                                return (
                                                                    <div className="option-mini-cost-container">
                                                                        <div className="option-mini-cost">
                                                                            <div className="cost-column-header">Lvl {target} Cost</div>
                                                                            {singleCost.metal > 0 && <span style={{ color: '#ff8d33' }}>M: {formatNumber(singleCost.metal)}</span>}
                                                                            {singleCost.crystal > 0 && <span style={{ color: '#33b2ff' }}>C: {formatNumber(singleCost.crystal)}</span>}
                                                                            {singleCost.deuterium > 0 && <span style={{ color: '#33ff8d' }}>D: {formatNumber(singleCost.deuterium)}</span>}
                                                                        </div>
                                                                        <div className="option-mini-cost">
                                                                            <div className="cost-column-header highlighted">Total Cost</div>
                                                                            {calculatedCost.metal > 0 && <span style={{ color: '#ff8d33' }}>M: {formatNumber(calculatedCost.metal)}</span>}
                                                                            {calculatedCost.crystal > 0 && <span style={{ color: '#33b2ff' }}>C: {formatNumber(calculatedCost.crystal)}</span>}
                                                                            {calculatedCost.deuterium > 0 && <span style={{ color: '#33ff8d' }}>D: {formatNumber(calculatedCost.deuterium)}</span>}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            <button className="add-to-cart-btn" onClick={() => handleAddMineToCart(mine.name)} disabled={!hasUpgrade}>
                                                                <Plus size={16} />
                                                                <span>Add to List</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Option List: FACILITIES */}
                                    {selectedCategory === 'facilities' && activePlanet && (
                                        <div className="builder-options-list">
                                            {[
                                                { name: "Robotics Factory", desc: "Speeds up construction time of all planetary buildings" },
                                                { name: "Shipyard", desc: "Builds fleets, transporters, and planetary defense turrets" },
                                                { name: "Research Lab", desc: "Conducts vital technological advancements for the empire" },
                                                { name: "Nanite Factory", desc: "State of the art nano-robots that slash build times of structures/ships" }
                                            ].map(fac => {
                                                const current = getStoredCurrentLevel('facilities', fac.name);
                                                const inputKey = `facilities_${selectedPlanetId}_${fac.name}`;
                                                const target = targetLevels[inputKey] ?? (current + 1);
                                                const costConfig = FACILITIES_BASE_COSTS[fac.name];
                                                const calculatedCost = costConfig ? calculateStandardCost(costConfig.base, costConfig.factor, current, target) : { metal: 0, crystal: 0, deuterium: 0 };
                                                const hasUpgrade = target > current;

                                                return (
                                                    <div key={fac.name} className="builder-option-row">
                                                        <div className="option-info-group flex-row-item">
                                                            <img
                                                                src={
                                                                    fac.name === 'Robotics Factory' ? 'icons/facilities/robotics_factory_large.jpg'
                                                                        : fac.name === 'Shipyard' ? 'icons/facilities/shipyard_large.jpg'
                                                                            : fac.name === 'Research Lab' ? 'icons/facilities/research_lab_large.jpg'
                                                                                : 'icons/facilities/nanite_factory_large.jpg'
                                                                }
                                                                style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                alt=""
                                                            />
                                                            <div>
                                                                <div className="option-title">{fac.name}</div>
                                                                <div className="option-description">{fac.desc}</div>
                                                            </div>
                                                        </div>

                                                        <div className="option-controls-group">
                                                            <div className="level-adjuster-shelf">
                                                                <span className="level-label">Lvl {current}</span>
                                                                <ArrowRight size={14} style={{ opacity: 0.3 }} />
                                                                <div className="slider-input-wrapper">
                                                                    <button className="qty-arrow" onClick={() => handleLevelChange(inputKey, target - 1, current + 1)} disabled={target <= current + 1}>
                                                                        <Minus size={12} />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        value={target}
                                                                        onChange={(e) => handleLevelChange(inputKey, parseInt(e.target.value) || (current + 1), current + 1)}
                                                                        min={current + 1}
                                                                        className="level-val-input"
                                                                    />
                                                                    <button className="qty-arrow" onClick={() => handleLevelChange(inputKey, target + 1, current + 1)}>
                                                                        <Plus size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Mini resource breakdown */}
                                                            {hasUpgrade && (() => {
                                                                const singleCost = costConfig ? calculateStandardCost(costConfig.base, costConfig.factor, target - 1, target) : { metal: 0, crystal: 0, deuterium: 0 };
                                                                return (
                                                                    <div className="option-mini-cost-container">
                                                                        <div className="option-mini-cost">
                                                                            <div className="cost-column-header">Lvl {target} Cost</div>
                                                                            {singleCost.metal > 0 && <span style={{ color: '#ff8d33' }}>M: {formatNumber(singleCost.metal)}</span>}
                                                                            {singleCost.crystal > 0 && <span style={{ color: '#33b2ff' }}>C: {formatNumber(singleCost.crystal)}</span>}
                                                                            {singleCost.deuterium > 0 && <span style={{ color: '#33ff8d' }}>D: {formatNumber(singleCost.deuterium)}</span>}
                                                                        </div>
                                                                        <div className="option-mini-cost">
                                                                            <div className="cost-column-header highlighted">Total Cost</div>
                                                                            {calculatedCost.metal > 0 && <span style={{ color: '#ff8d33' }}>M: {formatNumber(calculatedCost.metal)}</span>}
                                                                            {calculatedCost.crystal > 0 && <span style={{ color: '#33b2ff' }}>C: {formatNumber(calculatedCost.crystal)}</span>}
                                                                            {calculatedCost.deuterium > 0 && <span style={{ color: '#33ff8d' }}>D: {formatNumber(calculatedCost.deuterium)}</span>}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            <button className="add-to-cart-btn" onClick={() => handleAddFacilityToCart(fac.name)} disabled={!hasUpgrade}>
                                                                <Plus size={16} />
                                                                <span>Add to List</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Option List: EMPIRE RESEARCH */}
                                    {selectedCategory === 'empireResearch' && (
                                        <div className="research-designer-container" style={{ width: '100%' }}>
                                            <div className="research-bento-grid">
                                                {RESEARCH_DATA.map(tech => {
                                                    const current = getStoredCurrentLevel('empireResearch', tech.name, tech.id);
                                                    const inputKey = `research_${tech.id}`;
                                                    const target = targetLevels[inputKey] ?? current;
                                                    const hasUpgrade = target > current;
                                                    const techIcon = getResearchIconPath(tech.name);

                                                    return (
                                                        <div
                                                            key={tech.id}
                                                            className="research-grid-card"
                                                            title={(() => {
                                                                const { discount, techSources } = getEmpireResearchDiscount(tech.name, planets, activeAccount);
                                                                if (discount > 0) {
                                                                    const sourceDetails = techSources.map(s => `${s.name} lvl ${s.level} (boosted to ${s.boostedLevel.toFixed(2)})`).join(', ');
                                                                    return `${tech.name} Cost Discount:\n${sourceDetails}: -${(discount * 100).toFixed(2)}% discount (0.15% per level)`;
                                                                }
                                                                return '';
                                                            })()}
                                                        >
                                                            <div className="bento-bg-icon-overlay">
                                                                <img src={techIcon} alt="" />
                                                            </div>
                                                            <div className="bento-bg-gradient-fade" />

                                                            <div className="research-card-content-wrapper">
                                                                <div className="bento-card-top-row">
                                                                    <div className="bento-og-icon-wrapper" style={{ borderColor: '#00f2ff', width: '44px', height: '44px', borderRadius: '12px' }}>
                                                                        <img src={techIcon} alt="" />
                                                                    </div>
                                                                    <div className="bento-small-indicator-icon" style={{ color: '#00f2ff' }}>
                                                                        {categoriesMap.empireResearch?.icon}
                                                                    </div>
                                                                </div>

                                                                <div className="bento-card-text-group" style={{ margin: '4px 0 8px 0' }}>
                                                                    <span className="bento-card-label" style={{ fontSize: '0.92rem' }}>{tech.name}</span>
                                                                    {(() => {
                                                                        const { discount, techSources } = getEmpireResearchDiscount(tech.name, planets, activeAccount);
                                                                        if (discount > 0) {
                                                                            const pillLabel = techSources.map(s => s.name).join(' + ');
                                                                            return (
                                                                                <span style={{ color: '#33ff8d', fontSize: '0.68rem', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                                                                                    -{(discount * 100).toFixed(2)}% ({pillLabel})
                                                                                </span>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>

                                                                <div className="research-card-controls-bar">
                                                                    <div className="slot-level-wrapper" style={{ position: 'relative', bottom: 'auto', right: 'auto', left: 'auto', width: '100%', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', border: '1px solid rgba(0, 242, 255, 0.25)' }}>
                                                                        <ChevronDown
                                                                            size={14}
                                                                            className="level-arrow"
                                                                            onClick={() => handleLevelChange(inputKey, Math.max(current, target - 1), current)}
                                                                            style={{
                                                                                opacity: target <= current ? 0.3 : 1,
                                                                                cursor: target <= current ? 'not-allowed' : 'pointer'
                                                                            }}
                                                                        />
                                                                        <div className="slot-level-input" style={{ width: 'auto', minWidth: '40px', padding: '0 4px', textAlign: 'center', fontSize: '0.72rem', color: hasUpgrade ? '#22c55e' : '#ff9d00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                                                                            {current}→{target}
                                                                        </div>
                                                                        <ChevronUp
                                                                            size={14}
                                                                            className="level-arrow"
                                                                            onClick={() => handleLevelChange(inputKey, target + 1, current)}
                                                                            style={{ cursor: 'pointer' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', width: '100%' }}>
                                                <button className="add-all-techs-btn research-accent-btn" onClick={handleAddAllResearchToCart}>
                                                    <FlaskConical size={18} />
                                                    <span>Add Additional Levels to Shopping List</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Option List: LIFEFORM BUILDINGS */}
                                    {selectedCategory === 'lifeformBuildings' && activePlanet && (
                                        <div className="builder-options-list">
                                            {(() => {
                                                const lfId = activePlanet.lifeformId;
                                                if (!lfId || lfId === 0) {
                                                    return (
                                                        <div className="empty-state-notice">
                                                            <AlertTriangle size={32} color="#ffaa00" />
                                                            <div className="empty-title">NO ACTIVE LIFEFORM SPECIES</div>
                                                            <div className="empty-desc">This planet has no active lifeform species synced in the database. Go to the Lifeforms tab to establish a colony.</div>
                                                        </div>
                                                    );
                                                }

                                                const minId = 10000 + lfId * 1000 + 100;
                                                const maxId = minId + 12;
                                                const currentRaceBuildings = LIFEFORM_BUILDING_DATA.filter(b => b.id >= minId && b.id <= maxId);

                                                return currentRaceBuildings.map(bld => {
                                                    const current = getStoredCurrentLevel('lifeformBuildings', bld.name, bld.id);
                                                    const inputKey = `lfBuildings_${selectedPlanetId}_${bld.id}`;
                                                    const target = targetLevels[inputKey] ?? (current + 1);
                                                    const costConfig = LIFEFORM_BUILDINGS_COSTS[bld.id];
                                                    let calculatedCost = costConfig ? calculateLifeformBuildingCost(bld.id, costConfig.base, costConfig.factor, current, target) : { metal: 0, crystal: 0, deuterium: 0 };
                                                    const multiplier = getLifeformBuildingCostMultiplier(activePlanet);
                                                    calculatedCost = applyDiscount(calculatedCost, multiplier);
                                                    const hasUpgrade = target > current;

                                                    const lfId = activePlanet.lifeformId || 1;
                                                    const raceFolders = ['humans', 'rocktal', 'mechas', 'kaelesh'];
                                                    const raceFolder = raceFolders[lfId - 1];
                                                    const slotIndex = bld.id % 100;
                                                    const bldIcon = `icons/lifeforms/${raceFolder}-building-${slotIndex}-large.jpg`;

                                                    return (
                                                        <div key={bld.id} className="builder-option-row">
                                                            <div className="option-info-group flex-row-item">
                                                                <img
                                                                    src={bldIcon}
                                                                    style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                    alt=""
                                                                />
                                                                <div>
                                                                    <div className="option-title">{bld.name}</div>
                                                                    {activePlanet.lifeformId === 2 && (() => {
                                                                        const megalithLvl = activePlanet.lifeformBuildings?.find((b: any) => b.id === 12108)?.level || 0;
                                                                        if (megalithLvl > 0) {
                                                                            return (
                                                                                <div style={{ color: '#33ff8d', fontSize: '0.7rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                    <span style={{ background: 'rgba(51, 255, 141, 0.1)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(51, 255, 141, 0.2)', fontWeight: 600 }}>
                                                                                        -{megalithLvl * 1}% discount (Megalith lvl {megalithLvl})
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            </div>

                                                            <div className="option-controls-group">
                                                                <div className="level-adjuster-shelf">
                                                                    <span className="level-label">Lvl {current}</span>
                                                                    <ArrowRight size={14} style={{ opacity: 0.3 }} />
                                                                    <div className="slider-input-wrapper">
                                                                        <button className="qty-arrow" onClick={() => handleLevelChange(inputKey, target - 1, current + 1)} disabled={target <= current + 1}>
                                                                            <Minus size={12} />
                                                                        </button>
                                                                        <input
                                                                            type="number"
                                                                            value={target}
                                                                            onChange={(e) => handleLevelChange(inputKey, parseInt(e.target.value) || (current + 1), current + 1)}
                                                                            min={current + 1}
                                                                            className="level-val-input"
                                                                        />
                                                                        <button className="qty-arrow" onClick={() => handleLevelChange(inputKey, target + 1, current + 1)}>
                                                                            <Plus size={12} />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {hasUpgrade && (() => {
                                                                    let singleCost = costConfig ? calculateLifeformBuildingCost(bld.id, costConfig.base, costConfig.factor, target - 1, target) : { metal: 0, crystal: 0, deuterium: 0 };
                                                                    const multiplier = getLifeformBuildingCostMultiplier(activePlanet);
                                                                    singleCost = applyDiscount(singleCost, multiplier);
                                                                    return (
                                                                        <div className="option-mini-cost-container">
                                                                            <div className="option-mini-cost">
                                                                                <div className="cost-column-header">Lvl {target} Cost</div>
                                                                                {singleCost.metal > 0 && <span style={{ color: '#ff8d33' }}>M: {formatNumber(singleCost.metal)}</span>}
                                                                                {singleCost.crystal > 0 && <span style={{ color: '#33b2ff' }}>C: {formatNumber(singleCost.crystal)}</span>}
                                                                                {singleCost.deuterium > 0 && <span style={{ color: '#33ff8d' }}>D: {formatNumber(singleCost.deuterium)}</span>}
                                                                            </div>
                                                                            <div className="option-mini-cost">
                                                                                <div className="cost-column-header highlighted">Total Cost</div>
                                                                                {calculatedCost.metal > 0 && <span style={{ color: '#ff8d33' }}>M: {formatNumber(calculatedCost.metal)}</span>}
                                                                                {calculatedCost.crystal > 0 && <span style={{ color: '#33b2ff' }}>C: {formatNumber(calculatedCost.crystal)}</span>}
                                                                                {calculatedCost.deuterium > 0 && <span style={{ color: '#33ff8d' }}>D: {formatNumber(calculatedCost.deuterium)}</span>}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}

                                                                <button className="add-to-cart-btn" onClick={() => handleAddLifeformBuildingToCart(bld)} disabled={!hasUpgrade}>
                                                                    <Plus size={16} />
                                                                    <span>Add to List</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}

                                    {/* Option List: LIFEFORM RESEARCH */}
                                    {selectedCategory === 'lifeformResearch' && activePlanet && (
                                        <div className="lf-research-matrix-planner">
                                            {(() => {
                                                // Fetch and normalize setup on the target planet
                                                const rawSetup = activePlanet.sandboxSetup || activePlanet.lifeformSetup || [];
                                                const activeSetup: { slotNumber: number; selectedTechId: number | null; level: number }[] = Array.from({ length: 18 }, (_, i) => ({
                                                    slotNumber: i + 1,
                                                    selectedTechId: null,
                                                    level: 0
                                                }));

                                                rawSetup.forEach(s => {
                                                    let tid = s.selectedTechId;
                                                    let slotNum = s.slotNumber;

                                                    // OGame IDs are 1[Species]2[Slot] e.g. 11201 or 12209
                                                    if (tid && tid > 10000) {
                                                        const species = Math.floor(tid / 1000) % 10;
                                                        const slot = tid % 100;
                                                        tid = (slot - 1) * 4 + species;
                                                        if (!slotNum || slotNum === 0) slotNum = slot;
                                                    }

                                                    if (slotNum >= 1 && slotNum <= 18) {
                                                        activeSetup[slotNum - 1] = {
                                                            slotNumber: slotNum,
                                                            selectedTechId: tid,
                                                            level: s.level
                                                        };
                                                    }
                                                });

                                                if (rawSetup.length === 0) {
                                                    return (
                                                        <div className="empty-state-notice">
                                                            <AlertTriangle size={32} color="#ffaa00" />
                                                            <div className="empty-title">NO TECHNOLOGY SETUP SYNCED</div>
                                                            <div className="empty-desc">This planet has no active Lifeform Technology setup recorded. Please scan your Lifeform technology menu in-game to build optimization matrix profiles.</div>
                                                        </div>
                                                    );
                                                }

                                                // Render 18-slot matrix exactly matching design
                                                return (
                                                    <div className="matrix-designer-container">
                                                        <div className="designer-instruction" style={{ marginBottom: '16px' }}>
                                                            <Info size={14} color="var(--primary)" />
                                                            <span>Recreated active planet technology array. Increment target levels inside matrix slots, then add all to cart at once.</span>
                                                        </div>

                                                        <div className="tech-grid-layout">
                                                            {[1, 2, 3].map(tier => {
                                                                const startIndex = (tier - 1) * 6;
                                                                const tierSlotsIndices = [0, 1, 2, 3, 4, 5].map(i => startIndex + i);

                                                                return (
                                                                    <div key={tier} className="tier-column-group">
                                                                        <div className="tier-header">Tier {tier} Research</div>
                                                                        <div className="tier-slots-grid">
                                                                            {tierSlotsIndices.map(idx => {
                                                                                const slot = activeSetup[idx];
                                                                                if (!slot) return <div key={idx} className="tech-slot empty" />;

                                                                                const tech = slot.selectedTechId !== null ? LIFEFORM_TECH_DATA.find(t => t.id === slot.selectedTechId) : null;
                                                                                const targetLvl = lfResearchTargetLevels[slot.selectedTechId || 0] ?? (slot.level || 0);
                                                                                const hasIncrease = targetLvl > (slot.level || 0);
                                                                                const speciesBorderColor = tech ? ['#22c55e', '#ef4444', '#3b82f6', '#a855f7'][tech.lifeformId - 1] : 'rgba(255, 255, 255, 0.1)';

                                                                                return (
                                                                                    <div
                                                                                        key={idx}
                                                                                        className={`tech-slot ${!tech ? 'empty' : ''} ${tech && slot.level === 0 ? 'level-zero' : ''} ${hasIncrease ? 'has-boost' : ''}`}
                                                                                        style={{ borderColor: speciesBorderColor, cursor: 'default' }}
                                                                                    >
                                                                                        {tech ? (
                                                                                            <img
                                                                                                src={getLfTechIconPath(slot.selectedTechId)}
                                                                                                className="tech-slot-img"
                                                                                                alt=""
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="tech-slot-placeholder">
                                                                                                <div className="empty-slot-cross" />
                                                                                            </div>
                                                                                        )}

                                                                                        <div className="tech-name-overlay">
                                                                                            <span className="tech-overlay-text">{tech ? tech.name : 'Empty Slot'}</span>
                                                                                            {tech && (
                                                                                                <span className="tech-overlay-discount">
                                                                                                    -{getLifeformResearchDiscountPercentageVal(activePlanet).toFixed(2)}% Discount
                                                                                                </span>
                                                                                            )}
                                                                                        </div>

                                                                                        <div className="slot-tier-banner">
                                                                                            <span className="slot-tier-text">T{slot.slotNumber}</span>
                                                                                        </div>

                                                                                        {tech && (
                                                                                            <div className="slot-level-wrapper" onClick={(e) => e.stopPropagation()}>
                                                                                                <ChevronDown
                                                                                                    size={14}
                                                                                                    className="level-arrow"
                                                                                                    onClick={() => setLfResearchTargetLevels(prev => ({
                                                                                                        ...prev,
                                                                                                        [tech.id]: Math.max(slot.level || 0, targetLvl - 1)
                                                                                                    }))}
                                                                                                    style={{
                                                                                                        opacity: targetLvl <= (slot.level || 0) ? 0.3 : 1,
                                                                                                        cursor: targetLvl <= (slot.level || 0) ? 'not-allowed' : 'pointer'
                                                                                                    }}
                                                                                                />
                                                                                                <div className="slot-level-input" style={{ width: 'auto', minWidth: '40px', padding: '0 4px', textAlign: 'center', fontSize: '0.72rem', color: hasIncrease ? '#22c55e' : '#ff9d00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                                    {slot.level || 0}→{targetLvl}
                                                                                                </div>
                                                                                                <ChevronUp
                                                                                                    size={14}
                                                                                                    className="level-arrow"
                                                                                                    onClick={() => setLfResearchTargetLevels(prev => ({ ...prev, [tech.id]: targetLvl + 1 }))}
                                                                                                    style={{ cursor: 'pointer' }}
                                                                                                />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                                                            <button className="add-all-techs-btn" onClick={handleAddLifeformResearchToCart}>
                                                                <Dna size={18} />
                                                                <span>Add Additional Levels to Shopping List</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Option List: SHIPS & DEFENSES */}
                                    {selectedCategory === 'shipsDefences' && (
                                        <div className="builder-options-list">
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                                                PLANETARY SHIPS (FLEETS)
                                            </div>
                                            {SHIP_DATA.map(ship => {
                                                const inputKey = `batch_${selectedPlanetId}_${ship.id}`;
                                                const qty = batchQuantities[inputKey] ?? 10;
                                                const shipCost = ship.metadata?.cost;
                                                const totalCost = shipCost ? {
                                                    metal: (shipCost.metal || 0) * qty,
                                                    crystal: (shipCost.crystal || 0) * qty,
                                                    deuterium: (shipCost.deuterium || 0) * qty
                                                } : { metal: 0, crystal: 0, deuterium: 0 };

                                                return (
                                                    <div key={ship.id} className="builder-option-row">
                                                        <div className="option-info-group flex-row-item">
                                                            <img src={ship.icon} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} alt="" />
                                                            <div>
                                                                <div className="option-title">{ship.name}</div>
                                                                <div className="option-description">Basic Hull ID {ship.id}</div>
                                                            </div>
                                                        </div>

                                                        <div className="option-controls-group">
                                                            <div className="level-adjuster-shelf">
                                                                <span className="level-label">Qty</span>
                                                                <div className="slider-input-wrapper">
                                                                    <button className="qty-arrow" onClick={() => handleQuantityChange(inputKey, qty - 10)} disabled={qty <= 1}>
                                                                        <Minus size={12} />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        value={qty}
                                                                        onChange={(e) => handleQuantityChange(inputKey, parseInt(e.target.value) || 1)}
                                                                        min="1"
                                                                        className="level-val-input"
                                                                    />
                                                                    <button className="qty-arrow" onClick={() => handleQuantityChange(inputKey, qty + 10)}>
                                                                        <Plus size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="option-mini-cost">
                                                                {totalCost.metal > 0 && <span style={{ color: '#ff8d33' }}>M: {formatNumber(totalCost.metal)}</span>}
                                                                {totalCost.crystal > 0 && <span style={{ color: '#33b2ff' }}>C: {formatNumber(totalCost.crystal)}</span>}
                                                                {totalCost.deuterium > 0 && <span style={{ color: '#33ff8d' }}>D: {formatNumber(totalCost.deuterium)}</span>}
                                                            </div>

                                                            <button className="add-to-cart-btn" onClick={() => handleAddShipOrDefenseToCart(ship, 'ship')}>
                                                                <Plus size={16} />
                                                                <span>Add to List</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px', marginTop: '32px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                                                PLANETARY DEFENSES
                                            </div>
                                            {DEFENCE_DATA.map(def => {
                                                const inputKey = `batch_${selectedPlanetId}_${def.id}`;
                                                const qty = batchQuantities[inputKey] ?? 25;
                                                const defCost = DEFENCES_BASE_COSTS[def.id];
                                                const totalCost = defCost ? {
                                                    metal: (defCost.metal || 0) * qty,
                                                    crystal: (defCost.crystal || 0) * qty,
                                                    deuterium: (defCost.deuterium || 0) * qty
                                                } : { metal: 0, crystal: 0, deuterium: 0 };

                                                return (
                                                    <div key={def.id} className="builder-option-row">
                                                        <div className="option-info-group">
                                                            <div className="option-title">{def.name}</div>
                                                            <div className="option-description">Defense Grid Unit ID {def.id}</div>
                                                        </div>

                                                        <div className="option-controls-group">
                                                            <div className="level-adjuster-shelf">
                                                                <span className="level-label">Qty</span>
                                                                <div className="slider-input-wrapper">
                                                                    <button className="qty-arrow" onClick={() => handleQuantityChange(inputKey, qty - 10)} disabled={qty <= 1}>
                                                                        <Minus size={12} />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        value={qty}
                                                                        onChange={(e) => handleQuantityChange(inputKey, parseInt(e.target.value) || 1)}
                                                                        min="1"
                                                                        className="level-val-input"
                                                                    />
                                                                    <button className="qty-arrow" onClick={() => handleQuantityChange(inputKey, qty + 10)}>
                                                                        <Plus size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="option-mini-cost">
                                                                {totalCost.metal > 0 && <span style={{ color: '#ff8d33' }}>M: {formatNumber(totalCost.metal)}</span>}
                                                                {totalCost.crystal > 0 && <span style={{ color: '#33b2ff' }}>C: {formatNumber(totalCost.crystal)}</span>}
                                                                {totalCost.deuterium > 0 && <span style={{ color: '#33ff8d' }}>D: {formatNumber(totalCost.deuterium)}</span>}
                                                            </div>

                                                            <button className="add-to-cart-btn" onClick={() => handleAddShipOrDefenseToCart(def, 'defence')}>
                                                                <Plus size={16} />
                                                                <span>Add to List</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* Right Column: Shopping Cart (The Logistics Ledger) */}
                <aside className="planner-cart-col">
                    <div className="cart-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShoppingCart size={18} color="var(--primary)" />
                            <span className="font-title">SHOPPING CART</span>
                        </div>
                        <span className="cart-count-badge">{cart.length} ITEMS</span>
                    </div>

                    {/* Cart scroll container */}
                    <div className="cart-items-list custom-scrollbar">
                        <AnimatePresence initial={false}>
                            {groupedCart.map(([groupKey, group]) => (
                                <div key={groupKey} className="cart-group-section">
                                    <div className="cart-group-header">
                                        <div className="group-title-wrapper">
                                            {group.isEmpire ? (
                                                <Crown size={14} color="var(--primary)" />
                                            ) : (
                                                <img
                                                    src={group.planetImg || 'icons/planets/dry-large.jpg'}
                                                    alt=""
                                                    className="cart-group-planet-thumb"
                                                />
                                            )}
                                            <span className="group-name">{group.name}</span>
                                            <span className="group-coords">
                                                {group.coords !== 'Global' ? `[${group.coords}]` : 'Global'}
                                            </span>
                                        </div>
                                        <span className="group-count-tag">
                                            {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>
                                    <div className="cart-group-items">
                                        {group.items.map(item => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                                className="cart-item-row glass"
                                            >
                                                <div className="cart-item-header">
                                                    <div className="item-badge-category">{item.category}</div>
                                                    <button className="delete-item-btn" onClick={() => handleDeleteCartItem(item.id)}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>

                                                <div className="cart-item-body">
                                                    <div className="item-visual-block">
                                                        {item.icon ? (
                                                            <img src={item.icon} className="item-thumbnail-pic" alt="" />
                                                        ) : (
                                                            <div className="placeholder-pic"><Database size={16} /></div>
                                                        )}
                                                    </div>

                                                    <div className="item-details-block">
                                                        <div className="item-name-heading">{item.itemName}</div>
                                                        <div className="item-coords-sub">
                                                            {item.planetId === 'empire' ? 'Global Empire Research' : `[${item.coords}] • ${item.planetName}`}
                                                        </div>
                                                        <div className="item-level-transition">
                                                            {item.quantity ? (
                                                                <span className="qty-tag">Batch Qty: {item.quantity}</span>
                                                            ) : (
                                                                <>
                                                                    <span className="lvl-prev">Lvl {item.currentLevel}</span>
                                                                    <ArrowRight size={10} style={{ opacity: 0.4 }} />
                                                                    <span className="lvl-next">Lvl {item.targetLevel}</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {(() => {
                                                            let discountPct = 0;
                                                            let discountLabel = '';

                                                            if (item.category === 'Mines' && item.itemName !== 'Fusion Reactor') {
                                                                const planet = planets.find(p => p.id === item.planetId);
                                                                if (planet) {
                                                                    const mult = getMineCostMultiplier(planet);
                                                                    if (mult < 1.0) {
                                                                        discountPct = (1.0 - mult) * 100;
                                                                        discountLabel = `Mineral Research Centre: -${discountPct.toFixed(1)}%`;
                                                                    }
                                                                }
                                                            } else if (item.category === 'LF Building') {
                                                                const planet = planets.find(p => p.id === item.planetId);
                                                                if (planet) {
                                                                    const mult = getLifeformBuildingCostMultiplier(planet);
                                                                    if (mult < 1.0) {
                                                                        discountPct = (1.0 - mult) * 100;
                                                                        discountLabel = `Megalith: -${discountPct.toFixed(1)}%`;
                                                                    }
                                                                }
                                                            } else if (item.category === 'LF Research') {
                                                                const planet = planets.find(p => p.id === item.planetId);
                                                                if (planet) {
                                                                    const mult = getLifeformResearchCostMultiplier(planet);
                                                                    if (mult < 1.0) {
                                                                        discountPct = (1.0 - mult) * 100;
                                                                        discountLabel = `LF Buildings Discount: -${discountPct.toFixed(2)}%`;
                                                                    }
                                                                }
                                                            } else if (item.category === 'Research') {
                                                                const { discount } = getEmpireResearchDiscount(item.itemName, planets, activeAccount);
                                                                if (discount > 0) {
                                                                    discountPct = discount * 100;
                                                                    discountLabel = `Lifeform Research: -${discountPct.toFixed(2)}%`;
                                                                }
                                                            }

                                                            if (discountLabel) {
                                                                return (
                                                                    <div className="cart-item-discount-badge">
                                                                        {discountLabel}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Cost breakdown inside row */}
                                                <div className="cart-item-cost-bar">
                                                    {item.cost.metal > 0 && (
                                                        <div className="mini-res">
                                                            <img src="icons/resources/metal-icon-medium.jpg" alt="" />
                                                            <span style={{ color: '#ff8d33' }}>{formatFullNumber(item.cost.metal)}</span>
                                                        </div>
                                                    )}
                                                    {item.cost.crystal > 0 && (
                                                        <div className="mini-res">
                                                            <img src="icons/resources/crystal-icon-medium.jpg" alt="" />
                                                            <span style={{ color: '#33b2ff' }}>{formatFullNumber(item.cost.crystal)}</span>
                                                        </div>
                                                    )}
                                                    {item.cost.deuterium > 0 && (
                                                        <div className="mini-res">
                                                            <img src="icons/resources/deuterium-icon-medium.jpg" alt="" />
                                                            <span style={{ color: '#33ff8d' }}>{formatFullNumber(item.cost.deuterium)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </AnimatePresence>

                        {cart.length === 0 && (
                            <div className="empty-cart-state">
                                <ShoppingCart size={40} style={{ opacity: 0.05, marginBottom: '16px' }} />
                                <div className="title">LEDGER IS EMPTY</div>
                                <div className="desc">Stack building queues, technologies, and fleet projects from the left workspace to begin logistical calculations.</div>
                            </div>
                        )}
                    </div>

                    {/* Ledger Summary */}
                    {cart.length > 0 && (
                        <div className="cart-summary-block glass">
                            <div className="summary-title">ESTIMATED INVESTMENT REQUIRED</div>

                            <div className="summary-resources-grid">
                                <div className="summary-res-pod">
                                    <div className="pod-header">
                                        <img src="icons/resources/metal-icon-medium.jpg" alt="" />
                                        <span>METAL</span>
                                    </div>
                                    <div className="pod-value" style={{ color: '#ff8d33' }}>{formatFullNumber(cartSummary.cost.metal)}</div>
                                </div>

                                <div className="summary-res-pod">
                                    <div className="pod-header">
                                        <img src="icons/resources/crystal-icon-medium.jpg" alt="" />
                                        <span>CRYSTAL</span>
                                    </div>
                                    <div className="pod-value" style={{ color: '#33b2ff' }}>{formatFullNumber(cartSummary.cost.crystal)}</div>
                                </div>

                                <div className="summary-res-pod">
                                    <div className="pod-header">
                                        <img src="icons/resources/deuterium-icon-medium.jpg" alt="" />
                                        <span>DEUTERIUM</span>
                                    </div>
                                    <div className="pod-value" style={{ color: '#33ff8d' }}>{formatFullNumber(cartSummary.cost.deuterium)}</div>
                                </div>
                            </div>

                            <div className="summary-msu-container">
                                <div className="summary-msu-pod">
                                    <div className="msu-label-group">
                                        <Coins size={16} color="var(--primary)" />
                                        <span>TOTAL MSU</span>
                                    </div>
                                    <div className="msu-val-text">{formatFullNumber(cartSummary.msu)}</div>
                                </div>
                                <div className="summary-msu-pod">
                                    <div className="msu-label-group">
                                        <Clock size={16} color="#43D159" />
                                        <span>EST. GATHER TIME</span>
                                    </div>
                                    <div className="msu-val-text" style={{ color: '#43D159', textShadow: '0 0 10px rgba(67, 209, 89, 0.25)' }}>{gatherTimeText}</div>
                                </div>
                            </div>

                            <div className="summary-packages-grid">
                                <div className="summary-package-pod">
                                    <img src="icons/misc/metal_package_large.png" className="package-icon" alt="" />
                                    <div className="package-name">Metal Packages</div>
                                    <div className="package-val">
                                        {packageMetrics.metalPacksNeeded > 0 
                                            ? `${packageMetrics.metalPacksNeeded.toFixed(2)} Packs`
                                            : '0.00 Packs'}
                                    </div>
                                    <div className="package-yield">Yield: {formatNumber(dailyProduction.metal)}</div>
                                </div>

                                <div className="summary-package-pod">
                                    <img src="icons/misc/crystal_package_large.png" className="package-icon" alt="" />
                                    <div className="package-name">Crystal Packages</div>
                                    <div className="package-val">
                                        {packageMetrics.crystalPacksNeeded > 0 
                                            ? `${packageMetrics.crystalPacksNeeded.toFixed(2)} Packs`
                                            : '0.00 Packs'}
                                    </div>
                                    <div className="package-yield">Yield: {formatNumber(dailyProduction.crystal)}</div>
                                </div>

                                <div className="summary-package-pod">
                                    <img src="icons/misc/deuterium_package_large.png" className="package-icon" alt="" />
                                    <div className="package-name">Deut Packages</div>
                                    <div className="package-val">
                                        {packageMetrics.deuteriumPacksNeeded > 0 
                                            ? `${packageMetrics.deuteriumPacksNeeded.toFixed(2)} Packs`
                                            : '0.00 Packs'}
                                    </div>
                                    <div className="package-yield">Yield: {formatNumber(dailyProduction.deuterium)}</div>
                                </div>
                            </div>

                            <button className="clear-cart-btn" onClick={() => setCart([])}>
                                <RotateCcw size={14} />
                                <span>Empty Shopping Cart</span>
                            </button>
                        </div>
                    )}
                </aside>

            </div>
        </div>
    );
};

export default CostsPlanner;
