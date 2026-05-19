import React, { useState, useMemo } from 'react';
import { Info, ArrowRight, TrendingUp, Calculator, CheckCircle2, Globe, HelpCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { calculateMSU, DEFAULT_RATES } from '../../../utils/amortizationCalc';

const TECH_72_ID = 72; // Kaelesh Discoverer Enhancement
const TECH_72_BASE = { metal: 300000, crystal: 180000, deuterium: 120000, factor: 1.7 };

const TECH_BUILDINGS = [
    { id: 11111, name: 'Metropolis', base: { metal: 80000, crystal: 35000, deuterium: 60000 }, factor: 1.5, effect: 0.005 },
    { id: 13111, name: 'Chip Mass Production', base: { metal: 55000, crystal: 50000, deuterium: 30000 }, factor: 1.5, effect: 0.004 },
    { id: 13107, name: 'High-Performance Transformer', base: { metal: 35000, crystal: 15000, deuterium: 10000 }, factor: 1.5, effect: 0.003 },
];

const LAB_BUILDINGS = [
    { id: 11103, name: 'Research Centre', base: { metal: 20000, crystal: 25000, deuterium: 10000 }, factor: 1.3 },
    { id: 12103, name: 'Rune Technologium', base: { metal: 40000, crystal: 10000, deuterium: 15000 }, factor: 1.3 },
    { id: 13103, name: 'Robotics Research Centre', base: { metal: 30000, crystal: 20000, deuterium: 10000 }, factor: 1.3 },
    { id: 14103, name: 'Vortex Chamber', base: { metal: 20000, crystal: 20000, deuterium: 30000 }, factor: 1.3 },
];

const getTechBuildingImage = (id: number) => {
    switch(id) {
        case 11111: return '/icons/lifeforms/humans-building-11-large.jpg';
        case 13111: return '/icons/lifeforms/mechas-building-11-large.jpg';
        case 13107: return '/icons/lifeforms/mechas-building-7-large.jpg';
        default: return `/icons/planets/dry-large.jpg`;
    }
};

const getLabImage = (id: number) => {
    switch (id) {
        case 11103: return '/icons/lifeforms/humans-building-3-large.jpg';
        case 12103: return '/icons/lifeforms/rocktal-building-3-large.jpg';
        case 13103: return '/icons/lifeforms/mechas-building-3-large.jpg';
        case 14103: return '/icons/lifeforms/kaelesh-building-3-large.jpg';
        default: return `/icons/planets/dry-large.jpg`;
    }
};

const DiscovererOptimizer: React.FC = () => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const planets: any[] = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];
    const rates: any = useLiveQuery(() => db.settings.get('conversion_rates')) || DEFAULT_RATES;

    const [targetPercentage, setTargetPercentage] = useState<number | ''>('');
    const [lfLevels, setLfLevels] = useState<Record<number, number>>({});
    const [newColonyRace, setNewColonyRace] = useState<number>(4); // Kaelesh default

    // Initialize LF levels from account
    React.useEffect(() => {
        if (activeAccount && Object.keys(lfLevels).length === 0 && activeAccount.lifeformExperience) {
            const initial: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
            activeAccount.lifeformExperience.forEach((e: any) => {
                if (e.lifeformId) initial[e.lifeformId] = e.level || 0;
            });
            setLfLevels(initial);
        }
    }, [activeAccount]);

    // Prepare planet data
    const basePlanetStats = useMemo(() => {
        return planets.filter(p => {
            const setup = p.lifeformSetup || [];
            return setup.some((t: any) => t.selectedTechId === TECH_72_ID);
        }).map(p => {
            const setup = p.lifeformSetup || [];
            const buildings = p.lifeformBuildings || [];

            // Get LF Level from user overrides or fallback to db
            const lfExp = activeAccount?.lifeformExperience?.find((e: any) => e.lifeformId === p.lifeformId);
            const lfLevel = lfLevels[p.lifeformId] !== undefined ? lfLevels[p.lifeformId] : (lfExp?.level || 0);

            const tech72Level = setup.find((t: any) => t.selectedTechId === TECH_72_ID)?.level || 0;

            // Find lab building
            let currentLabLevel = 0;
            let labId = 0;
            const activeLab = LAB_BUILDINGS.find(lb => buildings.some((b: any) => b.id === lb.id));
            if (activeLab) {
                currentLabLevel = buildings.find((b: any) => b.id === activeLab.id)?.level || 0;
                labId = activeLab.id;
            } else if (p.lifeformId) {
                // If they don't have it built but we know their lf id, get the corresponding lab
                const mappedId = { 1: 11103, 2: 12103, 3: 13103, 4: 14103 }[p.lifeformId as 1|2|3|4];
                if (mappedId) labId = mappedId;
            }

            // Find tech buildings we can actively upgrade based on current lifeform
            const currentLfId = Number(p.lifeformId);
            let upgradeableIds: number[] = [];
            if (currentLfId === 1) upgradeableIds = [11111];
            else if (currentLfId === 3) upgradeableIds = [13111, 13107];
            
            let upgradeableTechBuildings = upgradeableIds.map(id => {
                const bDef = TECH_BUILDINGS.find(t => t.id === id);
                const existingLevel = buildings.find((b: any) => Number(b.id) === id)?.level || 0;
                return {
                    id,
                    name: bDef?.name || '',
                    baseLevel: existingLevel,
                    targetLevel: existingLevel
                };
            });

            // Include all OTHER tech buildings that exist on the planet as a static bonus
            let staticTechBonus = 0;
            buildings.forEach((b: any) => {
                const tb = TECH_BUILDINGS.find(t => t.id === b.id);
                if (tb && !upgradeableIds.includes(b.id)) {
                    staticTechBonus += b.level * tb.effect;
                }
            });

            return {
                id: p.id,
                name: p.name,
                coords: p.coords,
                imgUrl: p.imgUrl,
                lfLevel,
                baseTech72Level: tech72Level,
                baseLabLevel: currentLabLevel,
                labId,
                upgradeableTechBuildings,
                staticTechBonus
            };
        });
    }, [planets, activeAccount, lfLevels]);

    const calcCurrentBonusForPlanet = (p: any, t72Lvl: number, tbLevels: number[]) => {
        let baseMult = 1 + (p.lfLevel * 0.001) + (p.staticTechBonus || 0);
        
        p.upgradeableTechBuildings?.forEach((tbState: any, i: number) => {
            const tbDef = TECH_BUILDINGS.find(t => t.id === tbState.id);
            if (tbDef) {
                baseMult += tbLevels[i] * tbDef.effect;
            }
        });
        
        return t72Lvl * 0.002 * baseMult;
    };

    const currentEmpireBonusPercentage = useMemo(() => {
        let total = 0;
        basePlanetStats.forEach(p => {
            total += calcCurrentBonusForPlanet(p, p.baseTech72Level, p.upgradeableTechBuildings.map((t: any) => t.baseLevel));
        });
        return total * 100;
    }, [basePlanetStats]);

    // Initial state setup for target input
    React.useEffect(() => {
        if (targetPercentage === '') {
            const next50 = Math.floor((currentEmpireBonusPercentage + 50) / 50) * 50;
            setTargetPercentage(next50);
        }
    }, [currentEmpireBonusPercentage]);

    const getBuildingCost = (base: any, level: number, factor: number) => {
        if (level === 0) return { metal: 0, crystal: 0, deuterium: 0 };
        return {
            metal: Math.floor(base.metal * level * Math.pow(factor, level - 1)),
            crystal: Math.floor(base.crystal * level * Math.pow(factor, level - 1)),
            deuterium: Math.floor(base.deuterium * level * Math.pow(factor, level - 1))
        };
    };

    const optimizationData = useMemo(() => {
        const target = typeof targetPercentage === 'number' ? targetPercentage / 100 : 0;
        let baseCurrentBonus = currentEmpireBonusPercentage / 100;
        
        if (target <= baseCurrentBonus) return null;

        let bestResult: any = null;
        let lowestTotalCost = Infinity;

        // Try 0, 1, 2, 3 virtual colonies
        for (let vc = 0; vc <= 3; vc++) {
            // Initialize state clone
            const state: any[] = basePlanetStats.map(p => ({
                ...p,
                targetTech72Level: p.baseTech72Level,
                targetLabLevel: p.baseLabLevel,
                upgradeableTechBuildings: p.upgradeableTechBuildings.map((tb: any) => ({ ...tb })),
                costMSU: 0,
            }));

            let currentBonus = baseCurrentBonus;
            let initialCost = 0;
            let astroLevelsAdded = 0;

            if (vc > 0) {
                let currentAstro = activeAccount?.researches?.find((r: any) => r.id === 124)?.level || 0;
                if (currentAstro === 0 && planets.length > 0) {
                    currentAstro = Math.max(1, (planets.length - 1) * 2 - 1);
                }

                let nextAstro = currentAstro;
                let mSum = 0; let cSum = 0; let dSum = 0;
                
                for (let i = 0; i < vc; i++) {
                    let targetAstro = nextAstro + 2;
                    for (let lvl = nextAstro + 1; lvl <= targetAstro; lvl++) {
                        mSum += 4000 * Math.pow(1.75, lvl - 1);
                        cSum += 8000 * Math.pow(1.75, lvl - 1);
                        dSum += 4000 * Math.pow(1.75, lvl - 1);
                    }
                    nextAstro = targetAstro;
                    
                    const unlockCosts: { [key: number]: number } = { 1: 8.9e9, 2: 10.6e9, 3: 7.7e9, 4: 7.2e9 };
                    initialCost += unlockCosts[newColonyRace] || 7.2e9;
                }
                
                astroLevelsAdded = nextAstro - currentAstro;
                initialCost += calculateMSU({ metal: mSum, crystal: cSum, deuterium: dSum }, rates);

                for (let i = 0; i < vc; i++) {
                    const currentRaceNum = Number(newColonyRace);
                    let upgradeableIds: number[] = [];
                    if (currentRaceNum === 1) upgradeableIds = [11111];
                    else if (currentRaceNum === 3) upgradeableIds = [13111, 13107];
                    
                    let upgradeableTechBuildings = upgradeableIds.map(id => {
                        const bDef = TECH_BUILDINGS.find(t => t.id === id);
                        return { id, name: bDef?.name || '', baseLevel: 0, targetLevel: 0 };
                    });
                
                    state.push({
                        id: `virtual-${vc}-${i}`,
                        name: `New Colony`,
                        coords: '?-?',
                        imgUrl: `/icons/planets/dry-large.jpg`,
                        lfLevel: lfLevels[currentRaceNum] !== undefined ? lfLevels[currentRaceNum] : (activeAccount?.lifeformExperience?.find((e: any) => Number(e.id) === currentRaceNum || Number(e.lifeformId) === currentRaceNum)?.level || 0),
                        baseTech72Level: 0,
                        baseLabLevel: 0,
                        targetTech72Level: 0,
                        targetLabLevel: 0,
                        labId: { 1: 11103, 2: 12103, 3: 13103, 4: 14103 }[currentRaceNum as 1|2|3|4],
                        upgradeableTechBuildings,
                        staticTechBonus: 0,
                        costMSU: 0,
                        isVirtual: true
                    });
                }
                
                // Recalculate currentBonus for this state
                currentBonus = 0;
                state.forEach(p => {
                    currentBonus += calcCurrentBonusForPlanet(p, p.baseTech72Level, p.upgradeableTechBuildings.map((tb: any) => tb.baseLevel));
                });
            }

            let loopLimit = 10000;
            while (currentBonus < target && loopLimit > 0) {
                loopLimit--;
                let bestUpgrade: any = null;
                let lowestCostPerBonus = Infinity;

            state.forEach((p, idx) => {
                // 1. Evaluate upgrading Tech 72
                const nextTech72Level = p.targetTech72Level + 1;
                // Calculate cost for Tech 72 Level N using formula: Base * N * 1.7^(N-1) with Lab Discount
                const labReduction = Math.min(0.5, p.targetLabLevel * 0.0025);
                const discount = 1 - labReduction;
                const costObj = getBuildingCost(TECH_72_BASE, nextTech72Level, TECH_72_BASE.factor);
                const tech72CostMSU = calculateMSU({
                    metal: costObj.metal * discount,
                    crystal: costObj.crystal * discount,
                    deuterium: costObj.deuterium * discount
                }, rates);

                const newBonusT72 = calcCurrentBonusForPlanet(p, nextTech72Level, p.upgradeableTechBuildings.map((tb: any) => tb.targetLevel));
                const oldBonusT72 = calcCurrentBonusForPlanet(p, p.targetTech72Level, p.upgradeableTechBuildings.map((tb: any) => tb.targetLevel));
                const gainT72 = newBonusT72 - oldBonusT72;

                if (gainT72 > 0) {
                    const ratio = tech72CostMSU / gainT72;
                    if (ratio < lowestCostPerBonus) {
                        lowestCostPerBonus = ratio;
                        bestUpgrade = { type: 'tech72', planetIndex: idx, cost: tech72CostMSU, gain: gainT72 };
                    }
                }

                // 2. Evaluate upgrading Tech Buildings
                p.upgradeableTechBuildings.forEach((tbState: any, tbIndex: number) => {
                    const tbDef = TECH_BUILDINGS.find(t => t.id === tbState.id);
                    if (tbDef) {
                        const nextTbLevel = tbState.targetLevel + 1;
                        const tbCostObj = getBuildingCost(tbDef.base, nextTbLevel, tbDef.factor);
                        const tbCostMSU = calculateMSU(tbCostObj, rates);

                        const newBonusTb = calcCurrentBonusForPlanet(p, p.targetTech72Level, p.upgradeableTechBuildings.map((inner: any, i: number) => i === tbIndex ? nextTbLevel : inner.targetLevel));
                        const gainTb = newBonusTb - oldBonusT72;

                        if (gainTb > 0) {
                            const ratioTb = tbCostMSU / gainTb;
                            if (ratioTb < lowestCostPerBonus) {
                                lowestCostPerBonus = ratioTb;
                                bestUpgrade = { type: 'techBuilding', planetIndex: idx, tbIndex, cost: tbCostMSU, gain: gainTb };
                            }
                        }
                    }
                });

                // 3. Evaluate upgrading Lab
                if (p.labId) {
                    const labDef = LAB_BUILDINGS.find(l => l.id === p.labId);
                    if (labDef && p.targetLabLevel < 200) { // Max out at reasonable level like 200 (50% reduction)
                        const nextLabLevel = p.targetLabLevel + 1;
                        if (nextLabLevel * 0.0025 <= 0.5) { // Strict 50% cap
                            const labCostObj = getBuildingCost(labDef.base, nextLabLevel, labDef.factor);
                            const labCostMSU = calculateMSU(labCostObj, rates);

                            // Lab doesn't give immediate bonus %, but reduces future Tech 72 costs.
                            // To value it, look at how much it saves on the *next immediate* Tech 72 upgrade?
                            // Or better: Assume we will build the next Tech 72 upgrade anyway.
                            // What if we upgrade Lab first? The cost of next Tech 72 drops by BaseCost * 0.0025
                            // So 'gain' is the cost saved. If labCostMSU < savings, it's worth it essentially "for free" in the long run.
                            // But keeping it unified: Effective cost of (Lab + Next Tech 72) vs (Next Tech 72).
                            
                            // Let's compute the MSU cost of reaching (Lab+1, Tech72+1)
                            const nextTech72LevelD = p.targetTech72Level + 1;
                            const currentLabReduction = p.targetLabLevel * 0.0025;
                            const nextLabReduction = nextLabLevel * 0.0025;
                            
                            const costT72WithoutLab = calculateMSU({
                                metal: costObj.metal * (1 - currentLabReduction),
                                crystal: costObj.crystal * (1 - currentLabReduction),
                                deuterium: costObj.deuterium * (1 - currentLabReduction)
                            }, rates);
                            
                            const costT72WithLab = calculateMSU({
                                metal: costObj.metal * (1 - nextLabReduction),
                                crystal: costObj.crystal * (1 - nextLabReduction),
                                deuterium: costObj.deuterium * (1 - nextLabReduction)
                            }, rates);
                            
                            const totalPackageCost = labCostMSU + costT72WithLab;
                            
                            if (totalPackageCost < costT72WithoutLab) {
                                // Upgrading the lab pays for itself IMMEDIATELY on the very next tech upgrade.
                                // It should have extremely high priority.
                                // We can represent this by making its 'cost' effectively negative/0 or extremely small ratio.
                                const immediateGainRatio = totalPackageCost / gainT72; // The gain is purely the tech 72 gain.
                                if (immediateGainRatio < lowestCostPerBonus) {
                                    lowestCostPerBonus = immediateGainRatio;
                                    // Make sure we increment Lab
                                    bestUpgrade = { type: 'lab', planetIndex: idx, cost: labCostMSU, gain: 0 };
                                }
                            }
                        }
                    }
                }
            });

            if (!bestUpgrade) break;

            // Apply best upgrade
            const p = state[bestUpgrade.planetIndex];
            if (bestUpgrade.type === 'tech72') {
                p.targetTech72Level++;
                currentBonus += bestUpgrade.gain;
            } else if (bestUpgrade.type === 'techBuilding') {
                p.upgradeableTechBuildings[bestUpgrade.tbIndex].targetLevel++;
                currentBonus += bestUpgrade.gain;
            } else if (bestUpgrade.type === 'lab') {
                p.targetLabLevel++;
            }

            p.costMSU += bestUpgrade.cost;
            }

            const totalInvestment = state.reduce((sum, p) => sum + p.costMSU, 0) + initialCost;

            if (currentBonus >= target && totalInvestment < lowestTotalCost) {
                lowestTotalCost = totalInvestment;
                bestResult = {
                    planetStats: state,
                    totalInvestment,
                    finalBonus: currentBonus * 100,
                    hasReachedTarget: true,
                    astroLevelsAdded,
                    virtualColoniesAdded: vc,
                    initialCost
                };
            }
        }

        return bestResult;
    }, [basePlanetStats, targetPercentage, currentEmpireBonusPercentage, rates, lfLevels, newColonyRace, activeAccount, planets]);

    const formatMSU = (val: number) => {
        if (val >= 1000000000) return (val / 1000000000).toFixed(2) + 'B';
        if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(2) + 'K';
        return Math.floor(val).toLocaleString();
    };

    return (
        <div className="discoverer-optimizer">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                {/* CONFIGURATION */}
                <div className="glass" style={{ padding: '20px', borderRadius: '20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Calculator size={16} color="var(--primary)" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-muted)' }}>TARGET CONFIG</span>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}>
                                {currentEmpireBonusPercentage.toFixed(2)}%
                            </div>
                            <ArrowRight size={16} style={{ opacity: 0.3 }} />
                            <input
                                type="number"
                                min={currentEmpireBonusPercentage}
                                step="0.1"
                                value={targetPercentage}
                                onChange={(e) => setTargetPercentage(parseFloat(e.target.value) || currentEmpireBonusPercentage)}
                                style={{
                                    flex: 1,
                                    background: 'rgba(0, 242, 255, 0.05)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: '10px',
                                    padding: '8px',
                                    color: '#fff',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    outline: 'none',
                                    textAlign: 'center',
                                    minWidth: '0'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>New Colony Race:</span>
                        <select 
                            value={newColonyRace}
                            onChange={e => setNewColonyRace(Number(e.target.value))}
                            style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                        >
                            <option value={1}>Humans (8.9B MSU base)</option>
                            <option value={2}>Rock'tal (10.6B MSU base)</option>
                            <option value={3}>Mechas (7.7B MSU base)</option>
                            <option value={4}>Kaelesh (7.2B MSU base)</option>
                        </select>
                    </div>

                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.1)', fontSize: '0.75rem', lineHeight: 1.4, color: 'var(--primary)' }}>
                        <p style={{ margin: 0 }}>Dynamically calculates cheapest path across Techs, Lab Buildings, and New Colonies (Astrophysics) to reach target %.</p>
                    </div>
                </div>

                {/* LIFEFORM LEVELS CONFIG */}
                <div className="glass" style={{ padding: '20px', borderRadius: '20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Globe size={16} color="var(--primary)" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-muted)' }}>LF LEVELS (Overrides)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        {[
                            { id: 1, name: 'Humans', icon: 'humans-icon-large.jpg' },
                            { id: 2, name: 'Rock\'tal', icon: 'rocktal-icon-large.jpg' },
                            { id: 3, name: 'Mechas', icon: 'mechas-icon-large.jpg' },
                            { id: 4, name: 'Kaelesh', icon: 'kaelesh-icon-large.jpg' },
                        ].map(lf => (
                            <div key={lf.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <img src={`/icons/lifeforms/${lf.icon}`} alt={lf.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={lfLevels[lf.id] ?? 0}
                                    onChange={(e) => setLfLevels(prev => ({ ...prev, [lf.id]: parseInt(e.target.value) || 0 }))}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '6px',
                                        padding: '6px 2px',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        outline: 'none',
                                        textAlign: 'center'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* SUMMARY CARD */}
                <div className="glass" style={{
                    padding: '20px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Investment</div>
                            <div style={{ fontSize: '2.0rem', fontWeight: 900, color: '#fff' }}>{formatMSU(optimizationData?.totalInvestment || 0)}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Cost to reach target</div>
                            {optimizationData?.astroLevelsAdded > 0 && (
                                <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 800, marginTop: '8px', background: 'rgba(168, 85, 247, 0.1)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                    +{optimizationData.astroLevelsAdded} Astro Lvl (= +{optimizationData.virtualColoniesAdded} Colony)
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Optimized Status</div>
                            <div style={{ fontSize: '2.0rem', fontWeight: 900, color: optimizationData?.hasReachedTarget ? '#22c55e' : 'var(--primary)' }}>
                                {optimizationData?.finalBonus.toFixed(2)}%
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Projected Account Bonus</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PLANET LIST */}
            <div className="glass" style={{ background: 'rgba(6,11,20,0.4)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{
                    padding: '20px 32px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <span>Planet</span>
                    <span>T18 Discoverer Tech</span>
                    <span>Tech Building</span>
                    <span>Lifeform Lab</span>
                    <span style={{ textAlign: 'right' }}>Cost (MSU)</span>
                </div>

                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {optimizationData?.planetStats.map((p: any) => (
                        <div
                            key={p.id}
                            style={{
                                padding: '16px 32px',
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr',
                                alignItems: 'center',
                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                background: p.costMSU > 0 ? 'rgba(0,242,255,0.02)' : 'transparent',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.isVirtual ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                                    {p.isVirtual ? <HelpCircle size={20} color="rgba(255,255,255,0.3)" /> : <img src={p.imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: p.isVirtual ? '#a855f7' : '#fff' }}>
                                        {p.coords} • {p.name} {p.isVirtual && <span style={{ fontSize: '0.65rem', background: 'rgba(168, 85, 247, 0.2)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>NEW</span>}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>
                                        Base Bonus {(calcCurrentBonusForPlanet(p, p.baseTech72Level, p.upgradeableTechBuildings.map((t: any) => t.baseLevel)) * 100).toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            {/* Tech 72 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src="/icons/lifeforms/kaelesh-tech-t18-large.jpg" style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }} alt="T18 Kaelesh Tech" title="Kaelesh Discoverer Enhancement" />
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', fontWeight: 800 }}>
                                    Lvl {p.baseTech72Level}
                                </div>
                                <ArrowRight size={14} style={{ opacity: 0.3 }} />
                                <div style={{ background: p.targetTech72Level > p.baseTech72Level ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${p.targetTech72Level > p.baseTech72Level ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`, fontSize: '0.85rem', fontWeight: 900, color: p.targetTech72Level > p.baseTech72Level ? 'var(--primary)' : '#fff' }}>
                                    Lvl {p.targetTech72Level}
                                </div>
                            </div>

                            {/* Tech Buildings */}
                            {p.upgradeableTechBuildings?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {p.upgradeableTechBuildings.map((tb: any, tbIdx: number) => (
                                        <div key={tb.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src={getTechBuildingImage(tb.id)} style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }} alt={tb.name} title={tb.name} />
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', fontWeight: 800 }}>
                                                Lvl {tb.baseLevel}
                                            </div>
                                            <ArrowRight size={14} style={{ opacity: 0.3 }} />
                                            <div style={{ background: tb.targetLevel > tb.baseLevel ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${tb.targetLevel > tb.baseLevel ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`, fontSize: '0.85rem', fontWeight: 900, color: tb.targetLevel > tb.baseLevel ? 'var(--primary)' : '#fff' }}>
                                                Lvl {tb.targetLevel}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div style={{ opacity: 0.3, fontSize: '0.8rem', paddingLeft: '8px' }}>No active boosters</div>}

                            {/* Lifeform Lab */}
                            {p.labId ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src={getLabImage(p.labId)} style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }} alt="Lab" title="Lifeform Lab" />
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', fontWeight: 800 }}>
                                    Lvl {p.baseLabLevel}
                                </div>
                                <ArrowRight size={14} style={{ opacity: 0.3 }} />
                                <div style={{ background: p.targetLabLevel > p.baseLabLevel ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${p.targetLabLevel > p.baseLabLevel ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`, fontSize: '0.85rem', fontWeight: 900, color: p.targetLabLevel > p.baseLabLevel ? 'var(--primary)' : '#fff' }}>
                                    Lvl {p.targetLabLevel}
                                </div>
                            </div>
                            ) : <div style={{ opacity: 0.3, fontSize: '0.8rem' }}>N/A</div>}

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: p.costMSU > 0 ? '#fff' : 'rgba(255, 255, 255, 0.3)' }}>{formatMSU(p.costMSU)}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>MSU</div>
                            </div>
                        </div>
                    ))}
                    {optimizationData?.planetStats.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No planets found with Kaelesh Discoverer Enhancement selected.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiscovererOptimizer;
