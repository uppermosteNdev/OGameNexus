import React, { useMemo, useState, useEffect } from 'react';
import { SHIP_DATA } from '../../../db/staticData';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import {
    Calculator,
    Trophy,
    Box,
    Zap,
    Ship,
    Check,
    X,
    Settings,
    User,
    TrendingUp,
    Sparkles,
    Shield
} from 'lucide-react';
import { calculateExpeditionFinds, ExpoCalcConfig } from '../../utils/expoCalculator';
import { LIFEFORM_TECH_DATA } from '../../../db/lifeformTechData';

const THEME_CYAN = '#0062ff';

const RESOURCE_COLORS = {
    metal: '#E6953C',
    crystal: '#4CAEE6',
    deuterium: '#43D159',
    total: '#fff'
};

const SHIP_ITEMS = [
    { id: 202, label: 'Small Cargo', color: '#f8fafc' },
    { id: 203, label: 'Large Cargo', color: '#94a3b8' },
    { id: 204, label: 'Light Fighter', color: '#3b82f6' },
    { id: 205, label: 'Heavy Fighter', color: '#ef4444' },
    { id: 206, label: 'Cruiser', color: '#f59e0b' },
    { id: 207, label: 'Battleship', color: '#10b981' },
    { id: 219, label: 'Pathfinder', color: '#ec4899' },
    { id: 215, label: 'Battlecruiser', color: '#06b6d4' },
    { id: 211, label: 'Bomber', color: '#84cc16' },
    { id: 213, label: 'Destroyer', color: '#f97316' },
    { id: 218, label: 'Reaper', color: '#14b8a6' },
    { id: 210, label: 'Espionage Probe', color: '#8b5cf6' },
    { id: 208, label: 'Colony Ship', color: '#fca5a5' },
    { id: 209, label: 'Recycler', color: '#dc2626' },
    { id: 214, label: 'Deathstar', color: '#fffb00' },
];

const TOP_SCORE_THRESHOLD_OPTIONS = [
    { label: '< 10k Pts', value: 40000 },
    { label: '< 100k Pts', value: 500000 },
    { label: '< 1M Pts', value: 1200000 },
    { label: '< 5M Pts', value: 1800000 },
    { label: '< 25M Pts', value: 2400000 },
    { label: '< 50M Pts', value: 3000000 },
    { label: '< 75M Pts', value: 3600000 },
    { label: '< 100M Pts', value: 4200000 },
    { label: '> 100M Pts', value: 5000000 },
];

const AnimatedNumber = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = React.useState(value);

    React.useEffect(() => {
        const start = displayValue;
        const end = Math.floor(value);
        if (start === end) {
            setDisplayValue(end);
            return;
        }

        const duration = 600;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

            const current = Math.floor(start + (end - start) * easeOutCubic(progress));
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <>{displayValue.toLocaleString()}</>;
};

const ExpeditionCalculator: React.FC = () => {
    const activeAccount = useLiveQuery(
        async () => {
            try {
                return await db.accounts.orderBy('lastSeen').reverse().first();
            } catch (e) {
                return await db.accounts.toCollection().last();
            }
        }
    );

    const planets = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    const [selectedPreset, setSelectedPreset] = useState<string>('');

    const [calcConfig, setCalcConfig] = useState<ExpoCalcConfig>({
        universeSpeed: 1,
        topPointsScore: 5000000,
        playerClass: 'discoverer',
        hasPathfinder: false,
        hyperspaceTechLevel: 0,
        cargoHyperspaceTechMultiplier: 5,
        fleetShips: SHIP_DATA.map(s => ({ id: s.id, count: 0 })),
        resBonusPercent: 0,
        shipBonusPercent: 0,
        lifeformDiscovererBonusPercent: 0,
        lifeformCargoBonuses: {}
    });

    const lifeformExpeditionBonuses = useMemo(() => {
        if (!planets || !activeAccount) return { resBonus: 0, shipBonus: 0, classBonus: 0, cargoBonuses: {} };

        const getBonus = (breakdownId: number) => {
            let total = 0;
            planets.filter(p => p.type === 'planet').forEach(p => {
                const setup = p.lifeformSetup || [];
                const expData = activeAccount.lifeformExperience?.find((e: any) => e.lifeformId === p.lifeformId);
                let buildingBonus = 0;
                if (p.lifeformBuildings) {
                    p.lifeformBuildings.forEach((b: any) => {
                        if (b.id === 11111) buildingBonus += b.level * 0.005;
                        else if (b.id === 13107) buildingBonus += b.level * 0.003;
                        else if (b.id === 13111) buildingBonus += b.level * 0.004;
                    });
                }
                const totalMultiplier = 1 + (expData?.level || 0) * 0.001 + buildingBonus;
                setup.forEach((slot: any) => {
                    const tech = LIFEFORM_TECH_DATA.find(t => t.id === slot.selectedTechId);
                    if (!tech || !tech.target) return;
                    const bonusContribution = tech.target
                        .filter(t => t.bonusBreakdownId === breakdownId)
                        .reduce((acc, t, idx) => {
                            let base = 0;
                            if (idx === 0) base = tech.bonus1BaseValue || 0;
                            else if (idx === 1) base = tech.bonus2BaseValue || 0;
                            else if (idx === 2) base = tech.bonus3BaseValue || 0;
                            return acc + (base * slot.level);
                        }, 0);
                    total += bonusContribution * totalMultiplier;
                });
            });
            return total;
        };

        const getCargoBonuses = () => {
            const shipCargoObj: Record<number, number> = {};

            planets.filter(p => p.type === 'planet').forEach(p => {
                const setup = p.lifeformSetup || [];
                const expData = activeAccount.lifeformExperience?.find((e: any) => e.lifeformId === p.lifeformId);
                let buildingBonus = 0;
                if (p.lifeformBuildings) {
                    p.lifeformBuildings.forEach((b: any) => {
                        if (b.id === 11111) buildingBonus += b.level * 0.005;
                        else if (b.id === 13107) buildingBonus += b.level * 0.003;
                        else if (b.id === 13111) buildingBonus += b.level * 0.004;
                    });
                }
                const totalMultiplier = 1 + (expData?.level || 0) * 0.001 + buildingBonus;

                setup.forEach((slot: any) => {
                    const tech = LIFEFORM_TECH_DATA.find(t => t.id === slot.selectedTechId);
                    if (!tech || !tech.target) return;

                    const uniqueBonusIds: number[] = [];
                    const bonusToTargets: Record<number, any[]> = {};

                    tech.target.forEach((t: any) => {
                        if (!uniqueBonusIds.includes(t.bonusBreakdownId)) {
                            uniqueBonusIds.push(t.bonusBreakdownId);
                            bonusToTargets[t.bonusBreakdownId] = [];
                        }
                        bonusToTargets[t.bonusBreakdownId].push(t);
                    });

                    const hasOnlyBonus1 = tech.bonus1BaseValue !== null && tech.bonus1BaseValue !== undefined &&
                        (tech.bonus2BaseValue === null || tech.bonus2BaseValue === undefined) &&
                        (tech.bonus3BaseValue === null || tech.bonus3BaseValue === undefined);

                    uniqueBonusIds.forEach((id, index) => {
                        if (id !== 10) return; // Only cargo capacity bonuses

                        let baseValue = null;
                        if (index === 0) baseValue = tech.bonus1BaseValue;
                        else if (index === 1) baseValue = tech.bonus2BaseValue;
                        else if (index === 2) baseValue = tech.bonus3BaseValue;

                        if (baseValue === null && hasOnlyBonus1) {
                            baseValue = tech.bonus1BaseValue;
                        }

                        if (baseValue === null || baseValue === undefined) return;

                        const finalValue = baseValue * slot.level * totalMultiplier;
                        const targets = bonusToTargets[id];
                        const shipTargets = targets.filter((t: any) => t.gameKnowledgeId).map((t: any) => t.gameKnowledgeId);

                        const applyToShip = (tid: number) => {
                            if (tid === 212) return;
                            shipCargoObj[tid] = (shipCargoObj[tid] || 0) + finalValue;
                        };

                        if (shipTargets.length > 0) {
                            shipTargets.forEach(applyToShip);
                        } else {
                            [202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 213, 214, 215, 218, 219].forEach(applyToShip);
                        }
                    });
                });
            });

            const formatted: Record<number, number> = {};
            Object.keys(shipCargoObj).forEach(k => {
                const shipId = Number(k);
                formatted[shipId] = Number(shipCargoObj[shipId].toFixed(4));
            });
            return formatted;
        };

        return {
            resBonus: getBonus(19),
            shipBonus: getBonus(12),
            classBonus: getBonus(32),
            cargoBonuses: getCargoBonuses()
        };
    }, [planets, activeAccount]);


    useEffect(() => {
        if (!activeAccount) return;

        const pClass: 'collector' | 'discoverer' | 'other' = 
            activeAccount.playerClass === 1 ? 'collector' : 
            activeAccount.playerClass === 3 ? 'discoverer' : 'other';

        const ts = activeAccount.topScore || 0;
        let tp = 5000000;
        if (ts < 10000) tp = 40000;
        else if (ts < 100000) tp = 500000;
        else if (ts < 1000000) tp = 1200000;
        else if (ts < 5000000) tp = 1800000;
        else if (ts < 25000000) tp = 2400000;
        else if (ts < 50000000) tp = 3000000;
        else if (ts < 75000000) tp = 3600000;
        else if (ts < 100000000) tp = 4200000;

        const hypLevel = activeAccount.researches?.find(r => r.id === 114)?.level || 0;
        const resBonusPercent = Number(lifeformExpeditionBonuses.resBonus.toFixed(4));
        const shipBonusPercent = Number(lifeformExpeditionBonuses.shipBonus.toFixed(4));
        const lifeformDiscovererBonusPercent = Number(lifeformExpeditionBonuses.classBonus.toFixed(4));
        const universeSpeed = activeAccount.universeSpeed || 1;
        const cargoHyperspaceTechMultiplier = activeAccount.cargoHyperspaceTechMultiplier || 5;
        const lifeformCargoBonuses = lifeformExpeditionBonuses.cargoBonuses;

        setCalcConfig(prev => {
            const next = {
                ...prev,
                playerClass: pClass,
                universeSpeed,
                topPointsScore: tp,
                hyperspaceTechLevel: hypLevel,
                cargoHyperspaceTechMultiplier,
                resBonusPercent,
                shipBonusPercent,
                lifeformDiscovererBonusPercent,
                lifeformCargoBonuses
            };

            // Determine if we should update/initialize the fleet
            if (selectedPreset) {
                if (selectedPreset === 'SC_SMALL') next.fleetShips = getPresetFleet(202, false, next);
                else if (selectedPreset === 'LC_SMALL') next.fleetShips = getPresetFleet(203, false, next);
                else if (selectedPreset === 'SC_BIG') next.fleetShips = getPresetFleet(202, true, next);
                else if (selectedPreset === 'LC_BIG') next.fleetShips = getPresetFleet(203, true, next);
            } else if (!next.fleetShips.some(s => s.count > 0)) {
                // First load default
                next.fleetShips = getPresetFleet(202, false, next);
                next.hasPathfinder = true;
                setTimeout(() => setSelectedPreset('SC_SMALL'), 0);
            }
            return next;
        });

    }, [activeAccount, lifeformExpeditionBonuses, selectedPreset, planets]);

    const calcResults = useMemo(() => calculateExpeditionFinds(calcConfig), [calcConfig]);

    const findableShipIds = useMemo(() => {
        const ids = new Set<number>();
        const fleet = calcConfig.fleetShips;
        const findableMap: Record<number, number[]> = {
            202: [202, 204, 210],
            203: [202, 204, 203, 210, 205],
            204: [202, 203, 204, 210],
            205: [202, 203, 204, 205, 206, 210],
            219: [202, 203, 204, 205, 206, 210, 219, 207],
            207: [202, 203, 204, 205, 206, 210, 219, 207, 215],
            215: [202, 203, 204, 205, 206, 210, 219, 207, 215, 211],
            211: [202, 203, 204, 205, 206, 210, 219, 207, 215, 211, 213],
            213: [202, 203, 204, 205, 206, 210, 219, 207, 215, 211, 213, 218],
            218: [202, 203, 204, 205, 206, 210, 219, 207, 215, 211, 213, 218],
            208: [],
        };

        fleet.forEach(s => {
            if (s.count > 0 && findableMap[s.id]) {
                findableMap[s.id].forEach(fid => ids.add(fid));
            }
        });
        return ids;
    }, [calcConfig.fleetShips]);

    const getPresetFleet = (cargoId: number, bigShip: boolean, config: ExpoCalcConfig) => {
        const hypLevel = config.hyperspaceTechLevel;
        const multiplier = config.cargoHyperspaceTechMultiplier;

        const isCollector = config.playerClass.toLowerCase() === "collector";
        const trueMultiplier = isCollector ? 2 : (3 * config.universeSpeed);
        const trueExpeditionLimit = trueMultiplier * config.topPointsScore;

        const resBonusFactor = 1 + (config.resBonusPercent / 100);
        const lifeformFactor = 1 + (config.lifeformDiscovererBonusPercent / 100);

        const goalMetal = trueExpeditionLimit * resBonusFactor * lifeformFactor;

        let baseCap = cargoId === 202 ? 5000 : 25000;
        let classCargoBonus = (isCollector && (cargoId === 202 || cargoId === 203)) ? 1.25 : 1;
        const lfCargoBonus = config.lifeformCargoBonuses?.[cargoId] || 0;
        let capacityPerShip = baseCap * (1 + (hypLevel * multiplier) / 100 + (lfCargoBonus / 100)) * classCargoBonus;

        const neededCargoes = Math.ceil(goalMetal / capacityPerShip);

        return SHIP_DATA.map(s => {
            if (s.id === cargoId) return { id: s.id, count: Math.max(1, neededCargoes) };
            if (s.id === 210) return { id: s.id, count: 1 }; // Espionage Probe
            if (s.id === 219) return { id: s.id, count: 1 }; // Pathfinder
            if (bigShip && s.id === 218) return { id: s.id, count: 1 }; // Reaper
            return { id: s.id, count: 0 };
        });
    };

    const applyPreset = (cargoId: number, bigShip: boolean, presetKey: string) => {
        setSelectedPreset(presetKey);
        
        setCalcConfig(prev => {
            const next = { ...prev };
            next.fleetShips = getPresetFleet(cargoId, bigShip, next);
            next.hasPathfinder = true;
            return next;
        });
    };

    return (
        <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingBottom: '40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>

                {/* COLUMN 1: CONFIG & RESULTS */}
                <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* MAX FINDS SECTION */}
                    <div className="glass bento-funky" style={{ padding: '20px', borderRadius: '24px', background: 'rgba(5, 10, 20, 0.4)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${RESOURCE_COLORS.metal}, ${RESOURCE_COLORS.crystal}, ${RESOURCE_COLORS.deuterium})` }} />
                        <h4 style={{ margin: '0 0 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>Potential Max Yields</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: RESOURCE_COLORS.metal, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Max Metal</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}><AnimatedNumber value={calcResults.maxMetal} /></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: RESOURCE_COLORS.crystal, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Max Crystal</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}><AnimatedNumber value={calcResults.maxCrystal} /></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: RESOURCE_COLORS.deuterium, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Max Deuterium</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}><AnimatedNumber value={calcResults.maxDeuterium} /></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: THEME_CYAN, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Max Ship SI</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}><AnimatedNumber value={calcResults.maxShipsSI} /></div>
                            </div>
                        </div>
                    </div>

                    {/* SERVER PARAMS */}
                    <div className="glass bento-funky" style={{ 
                        padding: '24px', 
                        borderRadius: '24px', 
                        background: 'rgba(6,11,20,0.4)', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Settings size={16} color={THEME_CYAN} style={{ filter: 'drop-shadow(0 0 5px ' + THEME_CYAN + '88)' }} />
                            <h4 style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.6)' }}>Server Params</h4>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                            <div className="param-field">
                                <label>Universe Speed</label>
                                <div className="input-wrapper">
                                    <TrendingUp size={14} className="input-icon" />
                                    <input type="number" value={calcConfig.universeSpeed} onChange={e => setCalcConfig({ ...calcConfig, universeSpeed: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="param-field">
                                <label>Top Player Points</label>
                                <div className="input-wrapper">
                                    <Trophy size={14} className="input-icon" />
                                    <select value={calcConfig.topPointsScore} onChange={e => setCalcConfig({ ...calcConfig, topPointsScore: Number(e.target.value) })}>
                                        {TOP_SCORE_THRESHOLD_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="param-field">
                                <label>Hyperspace Tech</label>
                                <div className="input-wrapper">
                                    <Zap size={14} className="input-icon" />
                                    <input type="number" value={calcConfig.hyperspaceTechLevel} onChange={e => setCalcConfig({ ...calcConfig, hyperspaceTechLevel: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PLAYER BONUSES */}
                    <div className="glass bento-funky" style={{ 
                        padding: '24px', 
                        borderRadius: '24px', 
                        background: 'rgba(6,11,20,0.4)', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <User size={16} color={RESOURCE_COLORS.crystal} style={{ filter: 'drop-shadow(0 0 5px ' + RESOURCE_COLORS.crystal + '88)' }} />
                            <h4 style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.6)' }}>Player Bonuses</h4>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="param-field">
                                <label>Research Bonus (%)</label>
                                <div className="input-wrapper">
                                    <Sparkles size={14} className="input-icon" style={{ color: RESOURCE_COLORS.metal }} />
                                    <input type="number" step="0.1" value={calcConfig.resBonusPercent} onChange={e => setCalcConfig({ ...calcConfig, resBonusPercent: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="param-field">
                                <label>Ship Found Bonus (%)</label>
                                <div className="input-wrapper">
                                    <Ship size={14} className="input-icon" style={{ color: RESOURCE_COLORS.crystal }} />
                                    <input type="number" step="0.1" value={calcConfig.shipBonusPercent} onChange={e => setCalcConfig({ ...calcConfig, shipBonusPercent: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="param-field">
                                <label>Discoverer T18 Tech (%)</label>
                                <div className="input-wrapper">
                                    <Shield size={14} className="input-icon" style={{ color: RESOURCE_COLORS.deuterium }} />
                                    <input type="number" step="0.1" value={calcConfig.lifeformDiscovererBonusPercent} onChange={e => setCalcConfig({ ...calcConfig, lifeformDiscovererBonusPercent: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="param-field">
                                <label>Class</label>
                                <div className="input-wrapper">
                                    <Zap size={14} className="input-icon" style={{ color: '#a855f7' }} />
                                    <select value={calcConfig.playerClass} onChange={e => setCalcConfig({ ...calcConfig, playerClass: e.target.value as any })}>
                                        <option value="collector">Collector</option>
                                        <option value="discoverer">Discoverer</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: ANALYTICS & PRESETS */}
                <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* BENTO TOP ROW: PRESETS, STATS & CHECKLIST */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '24px' }}>

                        {/* EXPEDITION FLEET PRESETS */}
                        <div className="glass bento-funky" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ margin: '0 0 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>Expedition Fleet Presets</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button onClick={() => applyPreset(202, false, 'SC_SMALL')} className={`preset-btn funky-btn ${selectedPreset === 'SC_SMALL' ? 'selected' : ''}`}>
                                    <div className="preset-icon"><Zap size={14} /></div>
                                    <div className="preset-text">
                                        <span>SC / Small Ship</span>
                                    </div>
                                </button>
                                <button onClick={() => applyPreset(203, false, 'LC_SMALL')} className={`preset-btn funky-btn ${selectedPreset === 'LC_SMALL' ? 'selected' : ''}`}>
                                    <div className="preset-icon"><Zap size={14} /></div>
                                    <div className="preset-text">
                                        <span>LC / Small Ship</span>
                                    </div>
                                </button>
                                <button onClick={() => applyPreset(202, true, 'SC_BIG')} className={`preset-btn funky-btn ${selectedPreset === 'SC_BIG' ? 'selected' : ''}`}>
                                    <div className="preset-icon"><Trophy size={14} /></div>
                                    <div className="preset-text">
                                        <span>SC / Big Ship</span>
                                    </div>
                                </button>
                                <button onClick={() => applyPreset(203, true, 'LC_BIG')} className={`preset-btn funky-btn ${selectedPreset === 'LC_BIG' ? 'selected' : ''}`}>
                                    <div className="preset-icon"><Trophy size={14} /></div>
                                    <div className="preset-text">
                                        <span>LC / Big Ship</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* FLEET STATS */}
                        <div className="glass bento-funky" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(0, 98, 255, 0.05)', border: '1px solid rgba(0, 98, 255, 0.1)' }}>
                            <h4 style={{ margin: '0 0 20px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>Fleet Stats</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Total Cargo</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}><AnimatedNumber value={calcResults.totalCargo} /></span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Structural Integrity</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}><AnimatedNumber value={calcResults.totalSI} /></span>
                                </div>
                            </div>
                        </div>

                        {/* EXPEDITION CHECKLIST */}
                        <div className="glass bento-funky" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ margin: '0 0 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>Expedition Checklist</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { label: 'Metal Cargo', ok: calcResults.totalCargo >= (calcResults as any).theoreticalMaxMetal },
                                    { label: 'Crystal Cargo', ok: calcResults.totalCargo >= Math.floor((calcResults as any).theoreticalMaxMetal / 2) },
                                    { label: 'Deuterium Cargo', ok: calcResults.totalCargo >= Math.floor((calcResults as any).theoreticalMaxMetal / 3) },
                                    { label: 'Ship Find Cargo', ok: calcResults.totalCargo >= calcResults.expeditionLimit },
                                    { label: 'Pathfinder', ok: calcConfig.fleetShips.find(s => s.id === 219 && s.count > 0) },
                                    { label: 'Espionage Probe', ok: calcConfig.fleetShips.find(s => s.id === 210 && s.count > 0) }
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <span style={{ fontSize: '0.55rem', color: item.ok ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
                                        <div style={{ transform: `scale(${item.ok ? 1 : 0.8})`, transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                                            {item.ok ? <Check size={12} color="#22c55e" strokeWidth={3} /> : <X size={12} color="#ef4444" strokeWidth={3} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* FLEET TABLE */}
                    <div className="glass bento-funky" style={{ padding: '20px 24px', borderRadius: '24px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ margin: '0 0 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>Fleet Composition & Discovery Analysis</h4>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th style={{ padding: '8px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Ship Type</th>
                                    <th style={{ padding: '8px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', width: '100px' }}>In Fleet</th>
                                    <th style={{ padding: '8px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'center' }}>Findable</th>
                                    <th style={{ padding: '8px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'right' }}>Max Findable</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SHIP_ITEMS.filter(s => s.id !== 212 && s.id !== 217).map(ship => {
                                    const result = calcResults.shipFinds.find(r => r.id === ship.id);
                                    const fleetShip = calcConfig.fleetShips.find(fs => fs.id === ship.id);
                                    const isFindable = findableShipIds.has(ship.id);
                                    return (
                                        <tr key={ship.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '4px 8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <img src={`/icons/ships/${ship.label.toLowerCase().replace(/ /g, '-')}-large.jpg`} style={{ width: '20px', height: '20px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isFindable ? '#fff' : 'rgba(255,255,255,0.3)' }}>{ship.label}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <input
                                                    type="number"
                                                    value={fleetShip?.count || 0}
                                                    onChange={e => {
                                                        setSelectedPreset('');
                                                        const count = Math.max(0, parseInt(e.target.value) || 0);
                                                        const nextFleet = [...calcConfig.fleetShips];
                                                        const idx = nextFleet.findIndex(fs => fs.id === ship.id);
                                                        if (idx !== -1) nextFleet[idx].count = count;
                                                        else nextFleet.push({ id: ship.id, count });
                                                        setCalcConfig({ ...calcConfig, fleetShips: nextFleet, hasPathfinder: nextFleet.some(f => f.id === 219 && f.count > 0) });
                                                    }}
                                                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '3px 6px', color: '#fff', fontSize: '0.75rem' }}
                                                />
                                            </td>
                                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                                {isFindable ? (
                                                    <span style={{ color: '#22c55e', fontSize: '0.55rem', fontWeight: 900 }}>YES</span>
                                                ) : (
                                                    <span style={{ color: '#ef4444', fontSize: '0.55rem', fontWeight: 900 }}>NO</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontSize: '0.75rem', color: isFindable ? '#fff' : 'rgba(255,255,255,0.1)' }}>
                                                {isFindable && result ? <AnimatedNumber value={result.maxCount} /> : '0'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .bento-funky {
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                }
                .bento-funky:hover {
                    border-color: rgba(0, 98, 255, 0.2) !important;
                    background: rgba(255,255,255,0.03) !important;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                }
                .funky-btn {
                    position: relative;
                    overflow: hidden;
                }
                .funky-btn::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    pointer-events: none;
                }
                .funky-btn:hover::after {
                    opacity: 1;
                }
                .preset-btn {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    width: 100%;
                }
                .preset-btn.selected {
                    background: rgba(0, 98, 255, 0.15) !important;
                    border: 1px solid ${THEME_CYAN} !important;
                    box-shadow: 0 0 15px rgba(0, 98, 255, 0.3);
                }
                .preset-btn:hover {
                    background: rgba(0, 98, 255, 0.1);
                    border-color: rgba(0, 98, 255, 0.3);
                    transform: translateY(-2px);
                }
                .preset-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    background: rgba(0, 98, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${THEME_CYAN};
                    flex-shrink: 0;
                }
                .preset-text {
                    display: flex;
                    flex-direction: column;
                }
                .preset-text span {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: #fff;
                    white-space: nowrap;
                }
                .param-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .param-field label {
                    font-size: 0.6rem;
                    font-weight: 800;
                    color: rgba(255,255,255,0.4);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding-left: 2px;
                }
                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .input-icon {
                    position: absolute;
                    left: 12px;
                    opacity: 0.6;
                    pointer-events: none;
                }
                .input-wrapper input, .input-wrapper select {
                    width: 100%;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                    padding: 10px 12px 10px 36px;
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 600;
                    outline: none;
                    transition: all 0.2s ease;
                }
                .input-wrapper input:focus, .input-wrapper select:focus {
                    border-color: ${THEME_CYAN};
                    background: rgba(0, 98, 255, 0.05);
                    box-shadow: 0 0 15px rgba(0, 98, 255, 0.1);
                }
                .input-wrapper select {
                    cursor: pointer;
                    appearance: auto;
                    color-scheme: dark;
                }
                .input-wrapper select option {
                    background: #1e293b;
                    color: #fff;
                }
            ` }} />
        </div>
    );
};

export default ExpeditionCalculator;
