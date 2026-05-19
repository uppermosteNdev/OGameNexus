import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Info, ArrowRight, Globe, TrendingUp, Calculator, CheckCircle2, Activity } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { calculateMSU, DEFAULT_RATES } from '../../../utils/amortizationCalc';

// Constants
const PLASMA_TECH_ID = 122;
const STELLARATOR_ID = 34;

const PLASMA_BASE_COST = { metal: 2000, crystal: 4000, deuterium: 1000 };
const STELLARATOR_BASE_COST = { metal: 75000, crystal: 55000, deuterium: 25000 };

const REDUCTION_BUILDING_IDS = [11103, 12103, 13103, 14103]; // Labs that reduce LF research cost
const TECH_BONUS_BUILDING_IDS = [
    { id: 11111, value: 0.005 }, // Metropolis
    { id: 13111, value: 0.004 }, // Chip Mass Production
    { id: 13107, value: 0.003 }, // High-Performance Transformer
];

const PlasmaTechOptimizer: React.FC = () => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const planets: any[] = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];
    const rates: any = useLiveQuery(() => db.settings.get('conversion_rates')) || DEFAULT_RATES;

    const currentPlasmaLevel = useMemo(() => {
        return (activeAccount?.researches as any[])?.find((r: any) => r.id === PLASMA_TECH_ID)?.level || 0;
    }, [activeAccount]);

    const [targetLevel, setTargetLevel] = useState(1);

    // Default target level to current + 1 when data loads
    React.useEffect(() => {
        if (currentPlasmaLevel > 0 && targetLevel <= currentPlasmaLevel) {
            setTargetLevel(currentPlasmaLevel + 1);
        }
    }, [currentPlasmaLevel]);
    const [selectedPlanetIds, setSelectedPlanetIds] = useState<string[]>([]);

    // Initialize selected planets to those that actually HAVE Improved Stellarator selected in their slot 9
    React.useEffect(() => {
        if (planets.length > 0 && selectedPlanetIds.length === 0) {
            const initial = planets
                .filter((p: any) => (p.lifeformSetup as any[])?.some((t: any) => t.selectedTechId === STELLARATOR_ID))
                .map((p: any) => p.id);
            setSelectedPlanetIds(initial);
        }
    }, [planets]);

    const getPlasmaCost = (level: number) => {
        const factor = Math.pow(2, level - 1);
        return {
            metal: PLASMA_BASE_COST.metal * factor,
            crystal: PLASMA_BASE_COST.crystal * factor,
            deuterium: PLASMA_BASE_COST.deuterium * factor,
        };
    };

    const getStellaratorCost = (level: number, reduction: number) => {
        // LF research cost formula: Base * Level * 1.5^(Level-1)
        const factor = level * Math.pow(1.5, level - 1);
        const costMult = 1 - reduction;
        return {
            metal: STELLARATOR_BASE_COST.metal * factor * costMult,
            crystal: STELLARATOR_BASE_COST.crystal * factor * costMult,
            deuterium: STELLARATOR_BASE_COST.deuterium * factor * costMult,
        };
    };

    const optimizationData = useMemo(() => {
        if (targetLevel <= currentPlasmaLevel) return null;

        // 1. Calculate base MSU cost of target Plasma levels
        let totalBasePlasmaMSU = 0;
        for (let l = currentPlasmaLevel + 1; l <= targetLevel; l++) {
            totalBasePlasmaMSU += calculateMSU(getPlasmaCost(l), rates);
        }

        // 2. Prepare planet data
    const planetStats = planets.map(p => {
            const isSelected = selectedPlanetIds.includes(p.id);
            
            // Tech Multiplier (from amortizationCalc.ts getPlanetTechMultiplier)
            const lfExp = activeAccount?.lifeformExperience?.find((e: any) => e.id === p.lifeformId || e.lifeformId === p.lifeformId);
            const lfLevel = lfExp?.level || 0;
            let techMult = 1 + (lfLevel * 0.001); // 0.1% per LF level
            
            let buildingBonus = 0;
            p.lifeformBuildings?.forEach((b: any) => {
                // We use the same IDs and values as in AMORTIZATION_TABLE
                if (b.id === 11111) buildingBonus += b.level * 0.005; // Metropolis
                if (b.id === 13111) buildingBonus += b.level * 0.004; // Chip Mass Production
                if (b.id === 13107) buildingBonus += b.level * 0.003; // High-Performance Transformer
            });
            techMult += buildingBonus;

            // Stellarator Cost Reduction (from Labs)
            let labReduction = 0;
            const labIds = [11103, 12103, 13103, 14103];
            p.lifeformBuildings?.forEach((b: any) => {
                if (labIds.includes(b.id)) labReduction += b.level * 0.0025; // 0.25% per level
            });

            const currentStellaratorLevel = (p.lifeformSetup as any[])?.find((t: any) => t.selectedTechId === STELLARATOR_ID)?.level || 0;

            return {
                ...p,
                isSelected,
                techMult,
                labReduction,
                currentStellaratorLevel,
                recommendedLevel: currentStellaratorLevel,
                upgradeCostMSU: 0,
            };
        });

        // 3. Optimization Logic (Greedy)
        // Savings from 1 "boosted level" = totalBasePlasmaMSU * 0.0015
        const baseSavingPerBoostedLevel = totalBasePlasmaMSU * 0.0015;

        planetStats.forEach(p => {
            if (!p.isSelected) return;

            const savingPerLevelOnPlanet = baseSavingPerBoostedLevel * p.techMult;
            let level = p.currentStellaratorLevel;
            let totalCostMSU = 0;

            // Continue upgrading as long as the next level's cost is less than the savings it provides
            while (true) {
                const nextLevel = level + 1;
                const nextLevelCost = getStellaratorCost(nextLevel, p.labReduction);
                const nextLevelMSU = calculateMSU(nextLevelCost, rates);

                if (nextLevelMSU < savingPerLevelOnPlanet) {
                    level = nextLevel;
                    totalCostMSU += nextLevelMSU;
                } else {
                    break;
                }
            }

            p.recommendedLevel = level;
            p.upgradeCostMSU = totalCostMSU;
        });

        const totalInvestment = planetStats.reduce((sum, p) => sum + p.upgradeCostMSU, 0);
        
        // Calculate Total Reduction (Stellarator discount)
        const totalBoostedLevels = planetStats.reduce((sum, p) => {
            if (!p.isSelected) return sum + (p.currentStellaratorLevel * p.techMult);
            return sum + (p.recommendedLevel * p.techMult);
        }, 0);
        
        const currentBoostedLevels = planetStats.reduce((sum, p) => {
             return sum + (p.currentStellaratorLevel * p.techMult);
        }, 0);

        // Stellarator reduction percentage calculation:
        // Capped at 50% max reduction as per OGame rules.
        const currentReduction = Math.min(0.5, currentBoostedLevels * 0.0015);
        const nextReduction = Math.min(0.5, totalBoostedLevels * 0.0015);
        
        // -------------------------------------------------------------
        // COST CALCULATION CONDITIONS VERIFICATION:
        // 1. Overall Stellarator discount for costs is calculated (e.g. currentReduction, nextReduction).
        // 2. Plasma Research doubles costs per level (handled in getPlasmaCost which uses Math.pow(2, level - 1)).
        // 3. The discount of the Stellarator is applied AFTER calculating the original costs of Plasma levels.
        //    We compute the total base (original) Plasma cost first (totalBasePlasmaMSU) and then apply
        //    the discount factor (1 - reduction) to obtain the actual research costs.
        // -------------------------------------------------------------
        const plasmaCostWithCurrentStellarator = totalBasePlasmaMSU * (1 - currentReduction);
        const plasmaCostWithNewStellarator = totalBasePlasmaMSU * (1 - nextReduction);
        
        const totalSaving = plasmaCostWithCurrentStellarator - plasmaCostWithNewStellarator;

        return {
            planetStats,
            totalInvestment,
            totalSaving,
            netBenefit: totalSaving - totalInvestment,
            currentReduction: currentReduction * 100,
            nextReduction: nextReduction * 100,
            totalBasePlasmaMSU,
            plasmaCostWithCurrentStellarator,
            plasmaCostWithNewStellarator
        };
    }, [planets, currentPlasmaLevel, targetLevel, selectedPlanetIds, rates]);

    const formatMSU = (val: number) => {
        if (val >= 1000000000) return (val / 1000000000).toFixed(2) + 'B';
        if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(2) + 'K';
        return Math.floor(val).toLocaleString();
    };

    const togglePlanet = (id: string) => {
        setSelectedPlanetIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    return (
        <div className="plasma-optimizer">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '32px' }}>
                {/* CONFIGURATION */}
                <div className="glass" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Calculator size={18} color="var(--primary)" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--text-muted)' }}>TARGET SETUP</span>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Target Plasma Level</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1.2rem', fontWeight: 700, minWidth: '60px', textAlign: 'center' }}>
                                {currentPlasmaLevel}
                            </div>
                            <ArrowRight size={20} style={{ opacity: 0.3 }} />
                            <input
                                type="number"
                                min={currentPlasmaLevel + 1}
                                value={targetLevel}
                                onChange={(e) => setTargetLevel(parseInt(e.target.value) || currentPlasmaLevel + 1)}
                                style={{
                                    flex: 1,
                                    background: 'rgba(0, 242, 255, 0.05)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    color: '#fff',
                                    fontSize: '1.2rem',
                                    fontWeight: 700,
                                    outline: 'none',
                                    textAlign: 'center'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,141,51,0.05)', border: '1px solid rgba(255,141,51,0.1)', fontSize: '0.85rem', lineHeight: 1.5, color: '#ffb982' }}>
                        <Info size={16} style={{ marginBottom: '8px' }} />
                        <p style={{ margin: 0 }}>Improved Stellarator reduces Plasma Technology costs by <b>0.15% per level</b> and research time by <b>0.3% per level</b> (boosted by tech bonuses).</p>
                    </div>
                </div>

                {/* SUMMARY CARD */}
                <div className="glass" style={{
                    padding: '24px',
                    borderRadius: '24px',
                    background: 'linear-gradient(135deg, rgba(6, 11, 20, 0.8) 0%, rgba(13, 20, 35, 0.8) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '20px'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* LEFT COLUMN: STELLARATORS INVESTMENT */}
                        <div style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <Zap size={16} color="var(--primary)" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Step 1: Stellarator Upgrades
                                    </span>
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', lineHeight: '1.2' }}>
                                    {formatMSU(optimizationData?.totalInvestment || 0)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    MSU Required Investment
                                </div>
                            </div>

                            <div style={{
                                marginTop: '24px',
                                padding: '12px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Discount Boost</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.6 }}>
                                        {optimizationData?.currentReduction.toFixed(2)}%
                                    </span>
                                    <ArrowRight size={12} style={{ opacity: 0.4 }} />
                                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                                        {optimizationData?.nextReduction.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: PLASMA TECHNOLOGY */}
                        <div style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <Activity size={16} color="var(--primary)" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Step 2: Plasma Research Cost
                                    </span>
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', filter: 'drop-shadow(0 0 8px var(--primary-glow))', lineHeight: '1.2' }}>
                                    {formatMSU(optimizationData?.plasmaCostWithNewStellarator || 0)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    MSU (using upgraded Stellarators)
                                </div>
                            </div>

                            <div style={{
                                marginTop: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Cost with current Stellarators:</span>
                                    <span style={{ fontWeight: 600, color: '#fff' }}>
                                        {formatMSU(optimizationData?.plasmaCostWithCurrentStellarator || 0)} MSU
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Research Cost Savings:</span>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                        -{formatMSU(optimizationData?.totalSaving || 0)} MSU
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* OVERALL NET BENEFIT BAR */}
                    <div style={{
                        padding: '16px 24px',
                        borderRadius: '16px',
                        background: (optimizationData?.netBenefit || 0) > 0 
                            ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%)' 
                            : 'linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)',
                        border: `1px solid ${(optimizationData?.netBenefit || 0) > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <TrendingUp size={18} color={(optimizationData?.netBenefit || 0) > 0 ? '#22c55e' : '#ef4444'} />
                            <div>
                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                                    Net Optimization Benefit
                                </span>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Savings on Plasma Research minus Stellarator upgrade investments
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                fontSize: '1.4rem',
                                fontWeight: 900,
                                color: (optimizationData?.netBenefit || 0) > 0 ? '#22c55e' : '#ef4444',
                                textShadow: (optimizationData?.netBenefit || 0) > 0 
                                    ? '0 0 10px rgba(34, 197, 94, 0.2)' 
                                    : '0 0 10px rgba(239, 68, 68, 0.2)'
                            }}>
                                {formatMSU(optimizationData?.netBenefit || 0)}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                MSU Net Gain
                            </span>
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
                    gridTemplateColumns: '60px 2.5fr 2fr 1.5fr 1.5fr',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <span>Sync</span>
                    <span>Planet / Tech Bonus</span>
                    <span>Improved Stellarator</span>
                    <span style={{ textAlign: 'right' }}>Upgrade Cost</span>
                    <span style={{ textAlign: 'right' }}>Yield Savings</span>
                </div>

                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {optimizationData?.planetStats.filter((p: any) => (p.lifeformSetup as any[])?.some((t: any) => t.selectedTechId === STELLARATOR_ID)).map((p: any, idx: number) => (
                        <div
                            key={p.id}
                            onClick={() => togglePlanet(p.id)}
                            style={{
                                padding: '16px 32px',
                                display: 'grid',
                                gridTemplateColumns: '60px 2.5fr 2fr 1.5fr 1.5fr',
                                alignItems: 'center',
                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                background: p.isSelected ? 'rgba(0,242,255,0.02)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                opacity: p.isSelected ? 1 : 0.5
                            }}
                        >
                            <div>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '6px',
                                    border: `2px solid ${p.isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
                                    background: p.isSelected ? 'var(--primary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {p.isSelected && <CheckCircle2 size={12} color="#000" strokeWidth={3} />}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <img src={p.imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{p.coords} • {p.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>
                                        {((p.techMult - 1) * 100).toFixed(1)}% Tech Bonus
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem', fontWeight: 800 }}>
                                    Lvl {p.currentStellaratorLevel}
                                </div>
                                <ArrowRight size={14} style={{ opacity: 0.3 }} />
                                <div style={{ background: p.recommendedLevel > p.currentStellaratorLevel ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${p.recommendedLevel > p.currentStellaratorLevel ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`, fontSize: '0.9rem', fontWeight: 900, color: p.recommendedLevel > p.currentStellaratorLevel ? 'var(--primary)' : '#fff' }}>
                                    Lvl {p.recommendedLevel}
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{formatMSU(p.upgradeCostMSU)}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>MSU INVESTMENT</div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                                    {formatMSU((targetLevel > currentPlasmaLevel) ? (optimizationData?.totalBasePlasmaMSU || 0) * (p.recommendedLevel * p.techMult * 0.0015) : 0)}
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>EST. SAVINGS</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PlasmaTechOptimizer;
