import { Account, Planet } from '../db';
import { calculateMSU, Cost, DEFAULT_RATES, safeArray } from './amortizationCalc';
import { getLfTech, LIFEFORM_TECH_DATA } from '../db/lifeformTechData';
import { LIFEFORM_BONUS_BREAKDOWN_DATA } from '../db/lifeformBonusData';

export interface StandardResearchDef {
    id: number;
    name: string;
    icon: string;
    baseCost: { metal: number; crystal: number; deuterium: number };
    costFactor: number;
    minLab: number;
}

export const STANDARD_RESEARCHES: StandardResearchDef[] = [
    { id: 117, name: "Impulse Drive", icon: "impulse_drive.png", baseCost: { metal: 2000, crystal: 4000, deuterium: 600 }, costFactor: 2, minLab: 2 },
    { id: 115, name: "Combustion Drive", icon: "combustion_drive.png", baseCost: { metal: 400, crystal: 0, deuterium: 600 }, costFactor: 2, minLab: 1 },
    { id: 118, name: "Hyperspace Drive", icon: "hyperspace_drive.png", baseCost: { metal: 10000, crystal: 20000, deuterium: 6000 }, costFactor: 2, minLab: 7 },
    { id: 120, name: "Laser Technology", icon: "laser_tech.png", baseCost: { metal: 200, crystal: 100, deuterium: 0 }, costFactor: 2, minLab: 1 },
    { id: 121, name: "Ion Technology", icon: "ion_tech.png", baseCost: { metal: 1000, crystal: 300, deuterium: 100 }, costFactor: 2, minLab: 4 },
    { id: 113, name: "Energy Technology", icon: "energy_tech.png", baseCost: { metal: 0, crystal: 800, deuterium: 400 }, costFactor: 2, minLab: 1 },
    { id: 114, name: "Hyperspace Technology", icon: "hyperspace_tech.png", baseCost: { metal: 0, crystal: 4000, deuterium: 2000 }, costFactor: 2, minLab: 7 },
    { id: 122, name: "Plasma Technology", icon: "plasma_tech.png", baseCost: { metal: 2000, crystal: 4000, deuterium: 1000 }, costFactor: 2, minLab: 4 },
    { id: 106, name: "Espionage Technology", icon: "espionage_tech.png", baseCost: { metal: 200, crystal: 1000, deuterium: 200 }, costFactor: 2, minLab: 3 },
    { id: 108, name: "Computer Technology", icon: "computer_tech.png", baseCost: { metal: 0, crystal: 400, deuterium: 600 }, costFactor: 2, minLab: 1 },
    { id: 109, name: "Weapons Technology", icon: "weapon_tech.png", baseCost: { metal: 800, crystal: 200, deuterium: 0 }, costFactor: 2, minLab: 4 },
    { id: 110, name: "Shielding Technology", icon: "shielding_tech.png", baseCost: { metal: 200, crystal: 600, deuterium: 0 }, costFactor: 2, minLab: 6 },
    { id: 111, name: "Armour Technology", icon: "armor_tech.png", baseCost: { metal: 1000, crystal: 0, deuterium: 0 }, costFactor: 2, minLab: 2 },
    { id: 124, name: "Astrophysics", icon: "astrophysics.png", baseCost: { metal: 4000, crystal: 8000, deuterium: 4000 }, costFactor: 1.75, minLab: 3 },
    { id: 123, name: "Intergalactic Research Network", icon: "intergalactic_research_network.png", baseCost: { metal: 240000, crystal: 400000, deuterium: 160000 }, costFactor: 2, minLab: 10 },
    { id: 199, name: "Graviton Technology", icon: "graviton_tech.png", baseCost: { metal: 0, crystal: 0, deuterium: 0 }, costFactor: 3, minLab: 12 }
];

export interface ConnectedLabDetail {
    planetId: string;
    planetName: string;
    coords: string;
    labLevel: number;
    eligible: boolean;
    inNetwork: boolean;
}

export interface EffectiveLabResult {
    effectiveLabLevel: number;
    irnLevel: number;
    maxConnectedCount: number;
    eligibleCount: number;
    connectedCount: number;
    labs: ConnectedLabDetail[];
}

export interface UniverseSpeedResult {
    economySpeed: number;
    researchDivisor: number;
    totalResearchSpeed: number;
}

export interface DiscovererBonusResult {
    isDiscoverer: boolean;
    baseBonusPct: number;
    kaeleshEnhancementPct: number;
    effectiveReductionPct: number; // e.g. 38.47
}

export interface LifeformBonusResult {
    totalReductionPct: number; // Capped at 99%
    uncappedReductionPct: number;
}

export interface ResearchCalculationResult {
    tech: StandardResearchDef;
    targetLevel: number;
    cost: Cost;
    msuCost: number;
    labResult: EffectiveLabResult;
    speedResult: UniverseSpeedResult;
    discovererResult: DiscovererBonusResult;
    lifeformResult: LifeformBonusResult;
    hasTechnocrat: boolean;
    technocratDiscountPct: number;
    eventDiscountPct: number;
    baseDurationSeconds: number;
    finalDurationSeconds: number;
    combinedDiscountMultiplier: number;
}

export interface AmortizationUpgradeOption {
    id: string;
    rank: number;
    title: string;
    category: 'lab' | 'irn' | 'lifeform_research' | 'discoverer_tech';
    categoryLabel: string;
    planetId?: string;
    planetName?: string;
    coords?: string;
    currentLevel: number;
    nextLevel: number;
    cost: Cost;
    msuCost: number;
    timeSavedSeconds: number;
    newDurationSeconds: number;
    secondsSavedPerMillionMsu: number;
    costPerSecondSaved: number;
    description: string;
}

/**
 * Calculates the resource cost for a given research level.
 */
export function getResearchCost(tech: StandardResearchDef, level: number): Cost {
    if (level <= 0) return { metal: 0, crystal: 0, deuterium: 0 };

    if (tech.id === 124) {
        // Astrophysics scales at 1.75 and rounds to nearest 100
        const factor = Math.pow(1.75, level - 1);
        return {
            metal: Math.round((tech.baseCost.metal * factor) / 100) * 100,
            crystal: Math.round((tech.baseCost.crystal * factor) / 100) * 100,
            deuterium: Math.round((tech.baseCost.deuterium * factor) / 100) * 100
        };
    }

    const factor = Math.pow(tech.costFactor, level - 1);
    return {
        metal: Math.floor(tech.baseCost.metal * factor),
        crystal: Math.floor(tech.baseCost.crystal * factor),
        deuterium: Math.floor(tech.baseCost.deuterium * factor)
    };
}

/**
 * Calculates the effective Research Lab level using IRN mechanics.
 */
export function calculateEffectiveLabLevel(
    planets: Planet[],
    irnLevel: number,
    minLabReq: number,
    labOverrides?: Record<string, number>
): EffectiveLabResult {
    const validPlanets = safeArray(planets).filter(p => p && p.type !== 'moon');
    const maxConnectedCount = Math.max(1, irnLevel + 1);

    const allLabs: ConnectedLabDetail[] = validPlanets.map(p => {
        const labLevel = labOverrides && labOverrides[p.id] !== undefined
            ? labOverrides[p.id]
            : (p.researchLab || 0);
        const eligible = labLevel >= minLabReq;
        return {
            planetId: p.id,
            planetName: p.name || 'Colony',
            coords: p.coords || '',
            labLevel,
            eligible,
            inNetwork: false
        };
    });

    // Sort descending by lab level
    allLabs.sort((a, b) => b.labLevel - a.labLevel);

    const eligibleLabs = allLabs.filter(l => l.eligible);
    const connectedLabs = eligibleLabs.slice(0, maxConnectedCount);
    connectedLabs.forEach(l => { l.inNetwork = true; });

    const effectiveLabLevel = connectedLabs.reduce((sum, l) => sum + l.labLevel, 0);

    return {
        effectiveLabLevel,
        irnLevel,
        maxConnectedCount,
        eligibleCount: eligibleLabs.length,
        connectedCount: connectedLabs.length,
        labs: allLabs
    };
}

/**
 * Derives the universe research speed from account and XML values.
 */
export function getUniverseResearchSpeed(account: Account | null | undefined, divisorOverride?: number): UniverseSpeedResult {
    const economySpeed = account?.universeSpeed || 1;
    const researchDivisor = divisorOverride !== undefined
        ? divisorOverride
        : (account?.researchDurationDivisor || 1);
    const totalResearchSpeed = economySpeed * researchDivisor;

    return {
        economySpeed,
        researchDivisor,
        totalResearchSpeed: Math.max(1, totalResearchSpeed)
    };
}

/**
 * Calculates planet-specific tech bonus multiplier from LF experience and buildings.
 */
export function getPlanetTechMultiplier(planet: Planet, account: Account | null | undefined): number {
    if (!planet) return 1;
    const expData = safeArray(account?.lifeformExperience).find((e: any) =>
        e.lifeformId === planet.lifeformId || e.id === planet.lifeformId
    );
    const lfLevel = expData?.level || 0;

    let buildingBonus = 0;
    if (planet.lifeformBuildings) {
        const activePrefix = planet.lifeformId ? `1${planet.lifeformId}` : null;
        planet.lifeformBuildings.forEach((b: any) => {
            if (activePrefix && !b.id.toString().startsWith(activePrefix)) return;
            if (b.id === 11111) buildingBonus += b.level * 0.005;      // Metropolis (+0.5%/lvl)
            else if (b.id === 13107) buildingBonus += b.level * 0.003; // Transformer (+0.3%/lvl)
            else if (b.id === 13111) buildingBonus += b.level * 0.004; // Chip Mass Production (+0.4%/lvl)
        });
    }

    return 1 + lfLevel * 0.001 + buildingBonus;
}

/**
 * Calculates Discoverer class bonus, factoring in Kaelesh Discoverer Enhancement (tech 72).
 */
export function calculateDiscovererBonus(
    account: Account | null | undefined,
    planets: Planet[],
    tech72Overrides?: Record<string, number>
): DiscovererBonusResult {
    const isDiscoverer = account?.playerClass === 3 ||
        (account as any)?.characterClass === 3 ||
        (account as any)?.characterClass === 'explorer';

    const baseBonusPct = (account?.explorerBonusIncreasedResearchSpeed || 0.25) * 100; // 25%

    if (!isDiscoverer) {
        return {
            isDiscoverer: false,
            baseBonusPct: 0,
            kaeleshEnhancementPct: 0,
            effectiveReductionPct: 0
        };
    }

    // Calculate aggregated tech bonus for Tech 72 (Kaelesh Discoverer Enhancement)
    let kaeleshEnhancementPct = 0;
    safeArray(planets).filter(p => p && p.type !== 'moon').forEach(p => {
        const setup = safeArray(p.sandboxSetup || p.lifeformSetup);
        const slot18 = setup.find(t => Number(t.selectedTechId || t.id) === 72);
        const level = tech72Overrides && tech72Overrides[p.id] !== undefined
            ? tech72Overrides[p.id]
            : (slot18 ? slot18.level || 0 : 0);

        if (level > 0) {
            const mult = getPlanetTechMultiplier(p, account);
            kaeleshEnhancementPct += level * 0.2 * mult; // Tech 72 base is 0.2% per level
        }
    });

    const effectiveReductionPct = baseBonusPct * (1 + kaeleshEnhancementPct / 100);

    return {
        isDiscoverer: true,
        baseBonusPct,
        kaeleshEnhancementPct,
        effectiveReductionPct
    };
}

/**
 * Calculates Lifeform Research Time Reduction for a standard research.
 */
export function calculateLifeformResearchReduction(
    account: Account | null | undefined,
    planets: Planet[],
    targetTechId: number,
    techLevelOverrides?: Record<string, Record<number, number>>
): LifeformBonusResult {
    let totalTimeReduction = 0;

    safeArray(planets).filter(p => p && p.type !== 'moon').forEach(p => {
        const setup = safeArray(p.sandboxSetup || p.lifeformSetup);
        const mult = getPlanetTechMultiplier(p, account);

        setup.forEach(slot => {
            if (!slot) return;
            const techId = Number(slot.selectedTechId || slot.id);
            const level = techLevelOverrides?.[p.id]?.[techId] !== undefined
                ? techLevelOverrides[p.id][techId]
                : (slot.level || 0);

            if (level <= 0) return;

            const tech = getLfTech(techId);
            if (!tech || !tech.target) return;

            // Check if this tech grants Research Speed Boost (bonus ID 9)
            tech.target.forEach((t: any) => {
                if (t.bonusBreakdownId === 9) {
                    // Check if it applies globally or targets our tech
                    const hasSpecificTarget = t.gameKnowledgeId !== undefined && t.gameKnowledgeId !== null;
                    if (!hasSpecificTarget || t.gameKnowledgeId === targetTechId) {
                        const baseVal = tech.bonus1BaseValue || 0;
                        totalTimeReduction += baseVal * level * mult;
                    }
                }
            });
        });
    });

    return {
        totalReductionPct: Math.min(99, Math.max(0, totalTimeReduction)),
        uncappedReductionPct: totalTimeReduction
    };
}

/**
 * Main calculation: computes full research duration for a specific level.
 */
export function calculateResearchDuration(params: {
    tech: StandardResearchDef;
    targetLevel: number;
    account: Account | null | undefined;
    planets: Planet[];
    rates?: typeof DEFAULT_RATES;
    divisorOverride?: number;
    irnLevelOverride?: number;
    labOverrides?: Record<string, number>;
    tech72Overrides?: Record<string, number>;
    lfTechOverrides?: Record<string, Record<number, number>>;
    technocratOverride?: boolean;
    eventDiscountPct?: number;
}): ResearchCalculationResult {
    const {
        tech,
        targetLevel,
        account,
        planets,
        rates = DEFAULT_RATES,
        divisorOverride,
        irnLevelOverride,
        labOverrides,
        tech72Overrides,
        lfTechOverrides,
        technocratOverride,
        eventDiscountPct: rawEventDiscount = 0
    } = params;

    const cost = getResearchCost(tech, targetLevel);
    const msuCost = calculateMSU(cost, rates);

    const irnLevel = irnLevelOverride !== undefined
        ? irnLevelOverride
        : (safeArray(account?.researches).find(r => r.id === 123)?.level || 0);

    const labResult = calculateEffectiveLabLevel(planets, irnLevel, tech.minLab, labOverrides);
    const speedResult = getUniverseResearchSpeed(account, divisorOverride);
    const discovererResult = calculateDiscovererBonus(account, planets, tech72Overrides);
    const lifeformResult = calculateLifeformResearchReduction(account, planets, tech.id, lfTechOverrides);

    const hasTechnocrat = technocratOverride !== undefined ? technocratOverride : !!account?.hasTechnocrat;
    const technocratDiscountPct = hasTechnocrat ? 25 : 0;
    const eventDiscountPct = Math.max(0, Math.min(99, rawEventDiscount));

    // Base seconds formula: (Metal + Crystal) * 3600 / (1000 * (1 + EffectiveLab) * ResearchSpeed)
    const metalAndCrystal = cost.metal + cost.crystal;
    const denominator = 1000 * (1 + labResult.effectiveLabLevel) * speedResult.totalResearchSpeed;
    const baseDurationSeconds = denominator > 0 ? (metalAndCrystal * 3600) / denominator : 0;

    // Reduction multipliers: applied multiplicatively in modern OGame
    const discMultiplier = 1 - (discovererResult.effectiveReductionPct / 100);
    const lfMultiplier = 1 - (lifeformResult.totalReductionPct / 100);
    const technocratMultiplier = 1 - (technocratDiscountPct / 100);
    const eventMultiplier = 1 - (eventDiscountPct / 100);

    const combinedDiscountMultiplier = Math.max(0, discMultiplier * lfMultiplier * technocratMultiplier * eventMultiplier);
    const finalDurationSeconds = Math.max(1, Math.round(baseDurationSeconds * combinedDiscountMultiplier));

    return {
        tech,
        targetLevel,
        cost,
        msuCost,
        labResult,
        speedResult,
        discovererResult,
        lifeformResult,
        hasTechnocrat,
        technocratDiscountPct,
        eventDiscountPct,
        baseDurationSeconds,
        finalDurationSeconds,
        combinedDiscountMultiplier
    };
}

/**
 * Formats a duration in seconds into a clean human-readable string.
 * When includeWeeks is true, durations >= 7 days will be grouped into weeks (e.g. "1w 6d 6h 23m 23s").
 * When includeWeeks is false, durations will display in full days (e.g. "13d 6h 23m 23s").
 */
export function formatDuration(totalSeconds: number, includeWeeks = true): string {
    if (totalSeconds <= 0 || !isFinite(totalSeconds)) return "0s";

    const seconds = Math.floor(totalSeconds % 60);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    let days = Math.floor(totalHours / 24);
    let weeks = 0;

    if (includeWeeks && days >= 7) {
        weeks = Math.floor(days / 7);
        days = days % 7;
    }

    const parts: string[] = [];
    if (weeks > 0) parts.push(`${weeks}w`);
    if (days > 0 || (weeks > 0 && (hours > 0 || minutes > 0 || seconds > 0))) parts.push(`${days}d`);
    if (hours > 0 || (days > 0 && (minutes > 0 || seconds > 0))) parts.push(`${hours}h`);
    if (minutes > 0 || (hours > 0 && seconds > 0)) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
}

/**
 * Formats duration in full days without weeks: e.g. "13d 6h 23m 23s" or "17d 16h 37m 57s".
 */
export function formatDurationExact(totalSeconds: number): string {
    return formatDuration(totalSeconds, false);
}

/**
 * Formats duration to match OGame's standard truncated in-game notation:
 * - >= 1 week: "1w 6d 6h"
 * - >= 1 day:  "2d 14h 32m"
 * - >= 1 hour: "5h 12m 44s"
 * - < 1 hour:  "32m 14s"
 */
export function formatOGameDuration(totalSeconds: number): string {
    if (totalSeconds <= 0 || !isFinite(totalSeconds)) return "0s";

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalDays = Math.floor(totalHours / 24);
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    const hours = totalHours % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (weeks > 0) {
        return `${weeks}w ${days}d ${hours}h`;
    }
    if (totalDays > 0) {
        return `${totalDays}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
}

/**
 * Calculates standard Research Lab upgrade cost.
 */
export function getLabUpgradeCost(currentLevel: number): Cost {
    const factor = Math.pow(2, currentLevel);
    return {
        metal: 200 * factor,
        crystal: 400 * factor,
        deuterium: 200 * factor
    };
}

/**
 * Calculates Intergalactic Research Network (IRN) upgrade cost.
 */
export function getIrnUpgradeCost(currentLevel: number): Cost {
    const factor = Math.pow(2, currentLevel);
    return {
        metal: 240000 * factor,
        crystal: 400000 * factor,
        deuterium: 160000 * factor
    };
}

/**
 * Calculates Lifeform Tech upgrade cost.
 */
export function getLfTechUpgradeCost(baseCost: Cost, currentLevel: number): Cost {
    // Standard LF research formula: Base * (L + 1) * 1.5^L
    const factor = (currentLevel + 1) * Math.pow(1.5, currentLevel);
    return {
        metal: Math.round(baseCost.metal * factor),
        crystal: Math.round(baseCost.crystal * factor),
        deuterium: Math.round(baseCost.deuterium * factor)
    };
}

/**
 * Generates the Amortized Upgrade Recommendations list for the selected research and level.
 */
export function generateResearchAmortizationList(params: {
    tech: StandardResearchDef;
    targetLevel: number;
    account: Account | null | undefined;
    planets: Planet[];
    rates?: typeof DEFAULT_RATES;
    divisorOverride?: number;
    technocratOverride?: boolean;
    eventDiscountPct?: number;
}): AmortizationUpgradeOption[] {
    const { tech, targetLevel, account, planets, rates = DEFAULT_RATES, divisorOverride, technocratOverride, eventDiscountPct = 0 } = params;

    const baseResult = calculateResearchDuration({
        tech,
        targetLevel,
        account,
        planets,
        rates,
        divisorOverride,
        technocratOverride,
        eventDiscountPct
    });

    const currentSeconds = baseResult.finalDurationSeconds;
    const candidates: AmortizationUpgradeOption[] = [];
    const validPlanets = safeArray(planets).filter(p => p && p.type !== 'moon');

    // 1. Evaluate Research Lab upgrades on each planet
    validPlanets.forEach(p => {
        const currentLab = p.researchLab || 0;
        const nextLab = currentLab + 1;
        const upgradeCost = getLabUpgradeCost(currentLab);
        const msuCost = calculateMSU(upgradeCost, rates);

        const newResult = calculateResearchDuration({
            tech,
            targetLevel,
            account,
            planets,
            rates,
            divisorOverride,
            technocratOverride,
            eventDiscountPct,
            labOverrides: { [p.id]: nextLab }
        });

        const timeSaved = Math.max(0, currentSeconds - newResult.finalDurationSeconds);
        if (timeSaved > 0) {
            const secondsPerMillionMsu = msuCost > 0 ? (timeSaved / msuCost) * 1000000 : 0;
            const costPerSecondSaved = timeSaved > 0 ? msuCost / timeSaved : 0;

            candidates.push({
                id: `lab-${p.id}`,
                rank: 0,
                title: `Research Lab (Lvl ${currentLab} → ${nextLab})`,
                category: 'lab',
                categoryLabel: 'Research Lab',
                planetId: p.id,
                planetName: p.name,
                coords: p.coords,
                currentLevel: currentLab,
                nextLevel: nextLab,
                cost: upgradeCost,
                msuCost,
                timeSavedSeconds: timeSaved,
                newDurationSeconds: newResult.finalDurationSeconds,
                secondsSavedPerMillionMsu: secondsPerMillionMsu,
                costPerSecondSaved,
                description: `Expands lab capacity on ${p.name}. Effective empire lab level rises to ${newResult.labResult.effectiveLabLevel}.`
            });
        }
    });

    // 2. Evaluate IRN upgrade
    const currentIrn = baseResult.labResult.irnLevel;
    const nextIrn = currentIrn + 1;
    const irnCost = getIrnUpgradeCost(currentIrn);
    const irnMsuCost = calculateMSU(irnCost, rates);

    const newIrnResult = calculateResearchDuration({
        tech,
        targetLevel,
        account,
        planets,
        rates,
        divisorOverride,
        technocratOverride,
        eventDiscountPct,
        irnLevelOverride: nextIrn
    });

    const irnTimeSaved = Math.max(0, currentSeconds - newIrnResult.finalDurationSeconds);
    if (irnTimeSaved > 0) {
        const secondsPerMillionMsu = irnMsuCost > 0 ? (irnTimeSaved / irnMsuCost) * 1000000 : 0;
        const costPerSecondSaved = irnTimeSaved > 0 ? irnMsuCost / irnTimeSaved : 0;

        candidates.push({
            id: 'irn-upgrade',
            rank: 0,
            title: `Intergalactic Research Network (Lvl ${currentIrn} → ${nextIrn})`,
            category: 'irn',
            categoryLabel: 'IRN Network',
            currentLevel: currentIrn,
            nextLevel: nextIrn,
            cost: irnCost,
            msuCost: irnMsuCost,
            timeSavedSeconds: irnTimeSaved,
            newDurationSeconds: newIrnResult.finalDurationSeconds,
            secondsSavedPerMillionMsu: secondsPerMillionMsu,
            costPerSecondSaved,
            description: `Connects ${newIrnResult.labResult.connectedCount} colonies to the research network (was ${baseResult.labResult.connectedCount}).`
        });
    }

    // 3. Evaluate Lifeform Research Speed tech upgrades
    validPlanets.forEach(p => {
        const setup = safeArray(p.sandboxSetup || p.lifeformSetup);
        setup.forEach(slot => {
            if (!slot) return;
            const techId = Number(slot.selectedTechId || slot.id);
            const lfTech = getLfTech(techId);
            if (!lfTech || !lfTech.target) return;

            const grantsResearchSpeed = lfTech.target.some((t: any) => t.bonusBreakdownId === 9);
            if (!grantsResearchSpeed) return;

            const currentLvl = slot.level || 0;
            const nextLvl = currentLvl + 1;

            const baseCost: Cost = {
                metal: (lfTech as any).metalBaseCost || 0,
                crystal: (lfTech as any).crystalBaseCost || 0,
                deuterium: (lfTech as any).deutBaseCost || 0
            };
            const upgradeCost = getLfTechUpgradeCost(baseCost, currentLvl);
            const msuCost = calculateMSU(upgradeCost, rates);

            const newResult = calculateResearchDuration({
                tech,
                targetLevel,
                account,
                planets,
                rates,
                divisorOverride,
                technocratOverride,
                eventDiscountPct,
                lfTechOverrides: { [p.id]: { [techId]: nextLvl } }
            });

            const timeSaved = Math.max(0, currentSeconds - newResult.finalDurationSeconds);
            if (timeSaved > 0) {
                const secondsPerMillionMsu = msuCost > 0 ? (timeSaved / msuCost) * 1000000 : 0;
                const costPerSecondSaved = timeSaved > 0 ? msuCost / timeSaved : 0;

                candidates.push({
                    id: `lf-${p.id}-${techId}`,
                    rank: 0,
                    title: `${lfTech.name} (Lvl ${currentLvl} → ${nextLvl})`,
                    category: 'lifeform_research',
                    categoryLabel: 'LF Research Speed',
                    planetId: p.id,
                    planetName: p.name,
                    coords: p.coords,
                    currentLevel: currentLvl,
                    nextLevel: nextLvl,
                    cost: upgradeCost,
                    msuCost,
                    timeSavedSeconds: timeSaved,
                    newDurationSeconds: newResult.finalDurationSeconds,
                    secondsSavedPerMillionMsu: secondsPerMillionMsu,
                    costPerSecondSaved,
                    description: `Increases lifeform research time reduction across the empire by +${((newResult.lifeformResult.totalReductionPct - baseResult.lifeformResult.totalReductionPct)).toFixed(2)}%.`
                });
            }
        });
    });

    // 4. Evaluate Kaelesh Discoverer Enhancement (tech 72)
    if (baseResult.discovererResult.isDiscoverer) {
        validPlanets.forEach(p => {
            const setup = safeArray(p.sandboxSetup || p.lifeformSetup);
            const slot18 = setup.find(t => Number(t.selectedTechId || t.id) === 72);
            if (!slot18) return;

            const currentLvl = slot18.level || 0;
            const nextLvl = currentLvl + 1;
            const baseCost: Cost = { metal: 300000, crystal: 180000, deuterium: 120000 };
            const upgradeCost = getLfTechUpgradeCost(baseCost, currentLvl);
            const msuCost = calculateMSU(upgradeCost, rates);

            const newResult = calculateResearchDuration({
                tech,
                targetLevel,
                account,
                planets,
                rates,
                divisorOverride,
                technocratOverride,
                eventDiscountPct,
                tech72Overrides: { [p.id]: nextLvl }
            });

            const timeSaved = Math.max(0, currentSeconds - newResult.finalDurationSeconds);
            if (timeSaved > 0) {
                const secondsPerMillionMsu = msuCost > 0 ? (timeSaved / msuCost) * 1000000 : 0;
                const costPerSecondSaved = timeSaved > 0 ? msuCost / timeSaved : 0;

                candidates.push({
                    id: `tech72-${p.id}`,
                    rank: 0,
                    title: `Kaelesh Discoverer Enhancement (Lvl ${currentLvl} → ${nextLvl})`,
                    category: 'discoverer_tech',
                    categoryLabel: 'Discoverer Boost',
                    planetId: p.id,
                    planetName: p.name,
                    coords: p.coords,
                    currentLevel: currentLvl,
                    nextLevel: nextLvl,
                    cost: upgradeCost,
                    msuCost,
                    timeSavedSeconds: timeSaved,
                    newDurationSeconds: newResult.finalDurationSeconds,
                    secondsSavedPerMillionMsu: secondsPerMillionMsu,
                    costPerSecondSaved,
                    description: `Boosts Discoverer research reduction from -${baseResult.discovererResult.effectiveReductionPct.toFixed(2)}% to -${newResult.discovererResult.effectiveReductionPct.toFixed(2)}%.`
                });
            }
        });
    }

    // Sort descending by efficiency (seconds saved per 1M MSU)
    candidates.sort((a, b) => b.secondsSavedPerMillionMsu - a.secondsSavedPerMillionMsu);
    candidates.forEach((c, idx) => { c.rank = idx + 1; });

    return candidates;
}
