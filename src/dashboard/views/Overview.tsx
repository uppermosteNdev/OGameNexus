import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Compass,
    Swords,
    Dna,
    Zap,
    BarChart3,
    User,
    Globe,
    Clock,
    TrendingUp,
    Shield,
    Box,
    Star,
    Layers,
    Activity,
    Target,
    Cpu,
    Orbit,
    History,
    Gem,
    X
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { SHIP_DATA } from '../../db/staticData';
import { renderAnalyticsTab } from '../../content/analytics';

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    AreaChart,
    Area
} from 'recharts';

const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, icon, children }) => (
    <AnimatePresence>
        {isOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{ position: 'absolute', inset: 0, background: 'rgba(0, 5, 10, 0.9)', backdropFilter: 'blur(10px)' }}
                />
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.98 }}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '1200px',
                        background: 'rgba(10, 20, 30, 0.95)',
                        border: '1px solid rgba(0, 242, 255, 0.2)',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 0 100px rgba(0, 0, 0, 1)',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ color: THEME_CYAN }}>{icon}</div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.05em', color: '#fff', margin: 0 }}>{title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                padding: '8px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            className="glass-hover"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {children}
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

const BentoCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    gridArea?: string;
    children: React.ReactNode;
}> = ({ title, icon, gridArea, children }) => (
    <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glass"
        style={{
            gridArea,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            willChange: 'transform, opacity'
        }}
    >
        <div className="card-title">
            {icon}
            <span>{title}</span>
        </div>
        <div style={{ flex: 1 }}>{children}</div>
    </motion.div>
);

const AtAGlancePanel: React.FC<{
    expeditions: any[];
    lifeforms: any[];
    combats: any[];
    debrisHarvests: any[];
}> = ({ expeditions, lifeforms, combats, debrisHarvests }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            renderAnalyticsTab(containerRef.current, expeditions, lifeforms, combats, debrisHarvests);
        }
    }, [expeditions, lifeforms, combats, debrisHarvests]);

    return (
        <div ref={containerRef} className="nexus-at-a-glance" style={{ width: '100%' }} />
    );
};

const formatNumber = (num: number) => {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(1) + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num || 0).toString();
};

const THEME_CYAN = '#00f2ff';
const THEME_MAGENTA = '#bd00ff';

// Global styles for consistency
const GlobalStyles = () => (
    <style>{`
        .glass-hover {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-hover:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
            transform: translateY(-4px) scale(1.01);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.05);
            z-index: 10;
        }
        .stat-card-glow {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent);
            pointer-events: none;
        }
    `}</style>
);
const RESOURCE_COLORS = {
    metal: '#E6953C',
    crystal: '#4CAEE6',
    deuterium: '#43D159',
    total: '#fff'
};

interface OverviewProps {
    onSelect?: (viewId: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ onSelect }) => {
    const activeAccount = useLiveQuery(
        async () => {
            try {
                return await db.accounts.orderBy('lastSeen').reverse().first();
            } catch (e) {
                console.warn("DB not ready or index missing, falling back...", e);
                return await db.accounts.toCollection().last();
            }
        }
    );

    const planets = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    const planetCount = planets.filter(p => p.type === 'planet').length;
    const moonCount = planets.filter(p => p.type === 'moon').length;

    // Expeditions Data
    const expeditions = useLiveQuery(
        () => activeAccount ? db.expeditions.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    // Lifeform Species Data
    const lifeformSpecies = useLiveQuery(() => db.lifeformSpecies.toArray()) || [];

    // Combat Reports Data
    const combatReports = useLiveQuery(
        () => activeAccount ? db.combatReports.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    // Debris Harvests Data
    const debrisHarvests = useLiveQuery(
        () => activeAccount ? db.debrisHarvests.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    // Lifeform Discoveries Data
    const lifeformDiscoveries = useLiveQuery(
        () => activeAccount ? db.lifeformDiscoveries.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    // Settings (for conversion rates)
    const settings = useLiveQuery(() => db.settings.get('conversion_rates'));
    const rates = settings || { metal: 3, crystal: 2, deuterium: 1 };

    // Calculate totals and capture freshness
    const totals = useMemo(() => {
        return planets.reduce((acc, p) => {
            if (p.production) {
                acc.metal += p.production.metal;
                acc.crystal += p.production.crystal;
                acc.deuterium += p.production.deuterium;
                if (acc.lastUpdated === 0 || p.production.lastUpdated < acc.lastUpdated) {
                    acc.lastUpdated = p.production.lastUpdated;
                }
            }
            return acc;
        }, { metal: 0, crystal: 0, deuterium: 0, lastUpdated: 0 });
    }, [planets]);

    const mMultiplier = 1;
    const cMultiplier = rates.metal / rates.crystal;
    const dMultiplier = rates.metal / rates.deuterium;
    const totalMSUPerHour = (totals.metal * mMultiplier) + (totals.crystal * cMultiplier) + (totals.deuterium * dMultiplier);

    // Expedition Stats Calculation
    const expStats = useMemo(() => {
        if (expeditions.length === 0) return null;
        const last7Days = Date.now() / 1000 - (7 * 24 * 60 * 60);
        const recentExps = expeditions.filter(e => e.timestamp >= last7Days);

        const counts = { resources: 0, ships: 0, dm: 0, fail: 0, common: 0, large: 0, epic: 0 };
        let points = 0;

        const res7d = { metal: 0, crystal: 0, deuterium: 0, msu: 0 };
        const ship7d = { metal: 0, crystal: 0, deuterium: 0, msu: 0 };

        const shipCostMap: Record<number, any> = {};
        SHIP_DATA.forEach(s => shipCostMap[s.id] = s.metadata?.cost || { metal: 0, crystal: 0, deuterium: 0 });

        expeditions.forEach(e => {
            const res = (e.result || '').toLowerCase();
            if (res.includes('resource')) counts.resources++;
            else if (res.includes('ship') || res.includes('wreck')) counts.ships++;
            else if (res.includes('darkmatter')) counts.dm++;
            else if (res.includes('combat') || res.includes('loss') || res.includes('nothing')) counts.fail++;

            if (e.size === 0) counts.epic++;
            else if (e.size === 1) counts.large++;
            else if (e.size === 2) counts.common++;

            if (e.resultDetails) {
                const m = Number(e.resultDetails.metal) || 0;
                const c = Number(e.resultDetails.crystal) || 0;
                const d = Number(e.resultDetails.deuterium) || 0;
                points += (m + c + d);

                const isRecent = e.timestamp >= last7Days;

                // Track direct resources
                if (isRecent) {
                    res7d.metal += m;
                    res7d.crystal += c;
                    res7d.deuterium += d;
                    res7d.msu += (m * mMultiplier) + (c * cMultiplier) + (d * dMultiplier);
                }

                // Track ships cost if any
                if (res.includes('ship') || res.includes('wreck')) {
                    Object.entries(e.resultDetails).forEach(([id, data]: [string, any]) => {
                        const sid = parseInt(id);
                        const cost = shipCostMap[sid];
                        if (cost) {
                            const amount = data.amount || data; // handle both object and number formats
                            const sm = (cost.metal || 0) * (typeof amount === 'number' ? amount : amount.amount || 0);
                            const sc = (cost.crystal || 0) * (typeof amount === 'number' ? amount : amount.amount || 0);
                            const sd = (cost.deuterium || 0) * (typeof amount === 'number' ? amount : amount.amount || 0);

                            if (isRecent) {
                                ship7d.metal += sm;
                                ship7d.crystal += sc;
                                ship7d.deuterium += sd;
                                ship7d.msu += (sm * mMultiplier) + (sc * cMultiplier) + (sd * dMultiplier);
                            }
                        }
                    });
                }
            }
        });

        return {
            total: expeditions.length,
            recent: recentExps.length,
            successRate: (((expeditions.length - counts.fail) / expeditions.length) * 100).toFixed(1),
            totalResources: points,
            rarity: counts,
            mostRecent: expeditions.sort((a, b) => b.timestamp - a.timestamp)[0],
            avgResDaily: {
                metal: res7d.metal / 7,
                crystal: res7d.crystal / 7,
                deuterium: res7d.deuterium / 7,
                msu: res7d.msu / 7
            },
            avgShipDaily: {
                metal: ship7d.metal / 7,
                crystal: ship7d.crystal / 7,
                deuterium: ship7d.deuterium / 7,
                msu: ship7d.msu / 7
            }
        };
    }, [expeditions, mMultiplier, cMultiplier, dMultiplier]);

    // Combat Stats Calculation
    const combatStats = useMemo(() => {
        if (combatReports.length === 0) return null;
        const last7Days = Date.now() / 1000 - (7 * 24 * 60 * 60);
        const recentCombats = combatReports.filter(c => c.timestamp >= last7Days && c.winner === 'attacker');

        const res7d = { metal: 0, crystal: 0, deuterium: 0, msu: 0 };
        recentCombats.forEach(c => {
            if (c.loot) {
                const m = c.loot.metal || 0;
                const cr = c.loot.crystal || 0;
                const d = c.loot.deuterium || 0;
                res7d.metal += m;
                res7d.crystal += cr;
                res7d.deuterium += d;
                res7d.msu += (m * mMultiplier) + (cr * cMultiplier) + (d * dMultiplier);
            }
        });

        return {
            total: combatReports.length,
            wins: combatReports.filter(c => c.winner === 'attacker').length,
            losses: combatReports.filter(c => c.winner === 'defender').length,
            avgDaily: {
                metal: res7d.metal / 7,
                crystal: res7d.crystal / 7,
                deuterium: res7d.deuterium / 7,
                msu: res7d.msu / 7
            }
        };
    }, [combatReports, mMultiplier, cMultiplier, dMultiplier]);

    // Debris Stats Calculation
    const debrisStats = useMemo(() => {
        if (debrisHarvests.length === 0) return null;
        const last7Days = Date.now() / 1000 - (7 * 24 * 60 * 60);
        const recentDebris = debrisHarvests.filter(d => d.timestamp >= last7Days && d.recycledResources);

        const res7d = { metal: 0, crystal: 0, deuterium: 0, msu: 0 };
        recentDebris.forEach(d => {
            const m = d.recycledResources?.metal || 0;
            const cr = d.recycledResources?.crystal || 0;
            const det = d.recycledResources?.deuterium || 0;
            res7d.metal += m;
            res7d.crystal += cr;
            res7d.deuterium += det;
            res7d.msu += (m * mMultiplier) + (cr * cMultiplier) + (det * dMultiplier);
        });

        return {
            total: debrisHarvests.length,
            avgDaily: {
                metal: res7d.metal / 7,
                crystal: res7d.crystal / 7,
                deuterium: res7d.deuterium / 7,
                msu: res7d.msu / 7
            }
        };
    }, [debrisHarvests, mMultiplier, cMultiplier, dMultiplier]);

    // Lifeform Stats
    const lfStats = useMemo(() => {
        if (planets.length === 0) return null;

        const speciesCounts: Record<number, number> = {};
        let totalBuildings = 0;

        planets.forEach(p => {
            if (p.lifeformId) {
                speciesCounts[p.lifeformId] = (speciesCounts[p.lifeformId] || 0) + 1;
            }
            totalBuildings += p.lifeformBuildings?.reduce((s, b) => s + b.level, 0) || 0;
        });

        const dominant = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0];
        const domSpecies = dominant ? lifeformSpecies.find(s => s.lifeformId === Number(dominant[0])) : null;
        const domCount = dominant ? dominant[1] : 0;
        const totalPlanets = planets.filter(p => p.type === 'planet').length;

        return {
            coverage: totalPlanets > 0 ? ((domCount / totalPlanets) * 100).toFixed(0) : '0',
            totalBuildings,
            domSpecies: domSpecies?.lifeformName || 'None',
            species: lifeformSpecies
        };
    }, [planets, lifeformSpecies]);

    // Historical 7D Data for Charts
    const historicalData = useMemo(() => {
        const days: any[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            days.push({
                timestamp: d.getTime() / 1000,
                name: d.toLocaleDateString(undefined, { weekday: 'short' }),
                metal: 0,
                crystal: 0,
                deuterium: 0,
                msu: 0,
                shipMetal: 0,
                shipCrystal: 0,
                shipDeuterium: 0,
                shipMsu: 0,
                combatMetal: 0,
                combatCrystal: 0,
                combatDeuterium: 0,
                debrisMetal: 0,
                debrisCrystal: 0,
                debrisDeuterium: 0,
                totalMsu: 0,
            });
        }

        const shipCostMap: Record<number, any> = {};
        SHIP_DATA.forEach(s => shipCostMap[s.id] = s.metadata?.cost || { metal: 0, crystal: 0, deuterium: 0 });

        expeditions.forEach(e => {
            const dIdx = days.findIndex(d => e.timestamp >= d.timestamp && e.timestamp < d.timestamp + 86400);
            if (dIdx !== -1) {
                const det = e.resultDetails || {};
                const m = Number(det.metal) || 0;
                const c = Number(det.crystal) || 0;
                const d = Number(det.deuterium) || 0;

                days[dIdx].metal += m;
                days[dIdx].crystal += c;
                days[dIdx].deuterium += d;
                days[dIdx].msu += (m * mMultiplier) + (c * cMultiplier) + (d * dMultiplier);

                const res = (e.result || '').toLowerCase();
                if (res.includes('ship') || res.includes('wreck')) {
                    Object.entries(det).forEach(([id, data]: [string, any]) => {
                        const sid = parseInt(id);
                        const cost = shipCostMap[sid];
                        if (cost) {
                            const amount = typeof data === 'number' ? data : (data.amount || 0);
                            const sm = (cost.metal || 0) * amount;
                            const sc = (cost.crystal || 0) * amount;
                            const sd = (cost.deuterium || 0) * amount;
                            days[dIdx].shipMetal += sm;
                            days[dIdx].shipCrystal += sc;
                            days[dIdx].shipDeuterium += sd;
                            days[dIdx].shipMsu += (sm * mMultiplier) + (sc * cMultiplier) + (sd * dMultiplier);
                        }
                    });
                }
            }
        });

        combatReports.forEach(cr => {
            const dIdx = days.findIndex(d => cr.timestamp >= d.timestamp && cr.timestamp < d.timestamp + 86400);
            if (dIdx !== -1) {
                const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
                days[dIdx].combatMetal = (days[dIdx].combatMetal || 0) + (loot.metal || 0);
                days[dIdx].combatCrystal = (days[dIdx].combatCrystal || 0) + (loot.crystal || 0);
                days[dIdx].combatDeuterium = (days[dIdx].combatDeuterium || 0) + (loot.deuterium || 0);
            }
        });

        debrisHarvests.forEach(dh => {
            const dIdx = days.findIndex(d => dh.timestamp >= d.timestamp && dh.timestamp < d.timestamp + 86400);
            if (dIdx !== -1 && dh.recycledResources) {
                days[dIdx].debrisMetal = (days[dIdx].debrisMetal || 0) + (dh.recycledResources.metal || 0);
                days[dIdx].debrisCrystal = (days[dIdx].debrisCrystal || 0) + (dh.recycledResources.crystal || 0);
                days[dIdx].debrisDeuterium = (days[dIdx].debrisDeuterium || 0) + (dh.recycledResources.deuterium || 0);
            }
        });

        // Calculate Totals
        const mineDaily = totalMSUPerHour * 24;
        days.forEach(d => {
            const expMsu = d.msu || 0;
            const shipMsu = d.shipMsu || 0;
            const combatMsu = (d.combatMetal || 0) + (d.combatCrystal || 0) * 1.5 + (d.combatDeuterium || 0) * 3;
            const debrisMsu = (d.debrisMetal || 0) + (d.debrisCrystal || 0) * 1.5 + (d.debrisDeuterium || 0) * 3;
            d.totalMsu = mineDaily + expMsu + shipMsu + combatMsu + debrisMsu;
        });

        return days;
    }, [expeditions, combatReports, debrisHarvests, mMultiplier, cMultiplier, dMultiplier, totalMSUPerHour]);

    const [activeModal, setActiveModal] = useState<'mines' | 'expedition' | 'fleet' | 'combats' | 'debris' | 'total' | null>(null);


    return (
        <div className="view">
            <GlobalStyles />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <motion.h1
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="view-title"
                    style={{ marginBottom: 0 }}
                >
                    Empire 360°
                </motion.h1>

                {activeAccount && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 242, 255, 0.06)', borderColor: 'rgba(0, 242, 255, 0.3)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect && onSelect('signature')}
                        title="Customize Empire Signature"
                        style={{
                            display: 'flex',
                            gap: '24px',
                            alignItems: 'center',
                            background: 'rgba(0, 242, 255, 0.03)',
                            padding: '16px 24px',
                            borderRadius: '24px',
                            border: '1px solid rgba(0, 242, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s, background-color 0.2s'
                        }}
                    >
                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '1.4rem',
                                letterSpacing: '-0.02em',
                                textShadow: '0 0 20px rgba(0, 242, 255, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                {activeAccount.playerName}
                                {activeAccount.honorPoints !== undefined && (
                                    <span style={{
                                        fontSize: '0.85rem',
                                        color: '#22c55e',
                                        fontWeight: 700,
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(34, 197, 94, 0.2)'
                                    }}>
                                        {activeAccount.honorPoints.toLocaleString()} HP
                                    </span>
                                )}
                                {activeAccount.playerClass !== undefined && (
                                    <span style={{
                                        fontSize: '0.85rem',
                                        color: activeAccount.playerClass === 1 ? '#E6953C' : activeAccount.playerClass === 2 ? '#ef4444' : '#06b6d4',
                                        fontWeight: 900,
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        padding: '2px 10px',
                                        borderRadius: '8px',
                                        border: `1px solid ${activeAccount.playerClass === 1 ? 'rgba(230, 149, 60, 0.3)' : activeAccount.playerClass === 2 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {activeAccount.playerClass === 1 ? 'Collector' : activeAccount.playerClass === 2 ? 'Warrior' : 'Discoverer'}
                                    </span>
                                )}
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '4px'
                            }}>
                                {activeAccount.score !== undefined && (
                                    <div
                                        title={activeAccount.totalPlayers ? `Rank ${activeAccount.rank} of ${activeAccount.totalPlayers} players` : undefined}
                                        style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 700 }}
                                    >
                                        {activeAccount.score.toLocaleString()} pts
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '6px', fontWeight: 500 }}>
                                            (#{activeAccount.rank})
                                        </span>
                                    </div>
                                )}
                                {activeAccount.allianceTag && (
                                    <span style={{
                                        color: 'var(--primary)',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        background: 'rgba(0, 242, 255, 0.1)',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--primary-glow)'
                                    }}>
                                        {activeAccount.allianceTag}
                                    </span>
                                )}
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                                    {activeAccount.allianceName || 'Independent'}
                                </span>
                            </div>
                        </div>

                        <div style={{
                            position: 'relative',
                            width: '72px',
                            height: '72px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg
                                style={{
                                    position: 'absolute',
                                    width: '84px',
                                    height: '84px',
                                    zIndex: 0,
                                    filter: 'drop-shadow(0 0 4px var(--primary-glow))'
                                }}
                                viewBox="0 0 100 100"
                            >
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="48"
                                    fill="none"
                                    stroke="var(--primary)"
                                    strokeWidth="1.5"
                                    strokeDasharray="6 8"
                                    opacity="0.4"
                                    strokeLinecap="round"
                                />
                            </svg>

                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                background: 'var(--bg-dark)',
                                border: '2px solid var(--primary)',
                                boxShadow: '0 0 15px var(--primary-glow)',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                {activeAccount.avatarUrl ? (
                                    <img
                                        src={activeAccount.avatarUrl}
                                        alt="Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <User size={32} color="var(--primary)" />
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            <div className="bento-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gridTemplateRows: 'repeat(4, auto)',
                gap: '16px'
            }}>
                {/* Production Summary - ECONOMIC CORE REDESIGN */}
                <BentoCard
                    title="Empire Power Core"
                    icon={<Gem size={18} />}
                    gridArea="1 / 1 / 3 / 6"
                >
                    {(() => {
                        const mineDaily = totalMSUPerHour * 24;
                        const expResDaily = expStats?.avgResDaily.msu || 0;
                        const expShipDaily = expStats?.avgShipDaily.msu || 0;
                        const combatDaily = combatStats?.avgDaily.msu || 0;
                        const debrisDaily = debrisStats?.avgDaily.msu || 0;
                        const totalRevenue = mineDaily + expResDaily + expShipDaily + combatDaily + debrisDaily || 1;

                        const mineProp = (mineDaily / totalRevenue) * 283;
                        const expResProp = (expResDaily / totalRevenue) * 283;
                        const expShipProp = (expShipDaily / totalRevenue) * 283;
                        const combatProp = (combatDaily / totalRevenue) * 283;
                        const debrisProp = (debrisDaily / totalRevenue) * 283;

                        const isExpHeavy = (expResDaily + expShipDaily) > mineDaily;
                        const dominantLabel = isExpHeavy ? "EXPEDITION DOMINANT" : "PRODUCTION DOMINANT";
                        const dominantPercent = isExpHeavy
                            ? ((expResDaily + expShipDaily) / totalRevenue * 100).toFixed(1)
                            : (mineDaily / totalRevenue * 100).toFixed(1);

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '12px 0' }}>
                                {/* THE POWER CORE HEADER */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                    <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                                        {/* Decorative concentric circles */}
                                        <div style={{ position: 'absolute', inset: -6, border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '50%' }} />

                                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                                            {/* Mine (Cyan) */}
                                            <circle
                                                cx="50" cy="50" r="45" fill="none" stroke={THEME_CYAN} strokeWidth="8"
                                                strokeDasharray={`${mineProp} 283`}
                                                strokeLinecap="round"
                                                style={{ transition: 'all 1s ease-out' }}
                                            />
                                            {/* Exp Res (Green) */}
                                            <circle
                                                cx="50" cy="50" r="45" fill="none" stroke="#22c55e" strokeWidth="8"
                                                strokeDasharray={`${expResProp} 283`}
                                                strokeDashoffset={-mineProp}
                                                strokeLinecap="round"
                                                style={{ transition: 'all 1s ease-out' }}
                                            />
                                            {/* Salvage (Magenta) */}
                                            <circle
                                                cx="50" cy="50" r="45" fill="none" stroke={THEME_MAGENTA} strokeWidth="8"
                                                strokeDasharray={`${expShipProp} 283`}
                                                strokeDashoffset={-(mineProp + expResProp)}
                                                strokeLinecap="round"
                                                style={{ transition: 'all 1s ease-out' }}
                                            />
                                            {/* Combat (Red) */}
                                            <circle
                                                cx="50" cy="50" r="45" fill="none" stroke="#ef4444" strokeWidth="8"
                                                strokeDasharray={`${combatProp} 283`}
                                                strokeDashoffset={-(mineProp + expResProp + expShipProp)}
                                                strokeLinecap="round"
                                                style={{ transition: 'all 1s ease-out' }}
                                            />
                                            {/* Debris (Yellow) */}
                                            <circle
                                                cx="50" cy="50" r="45" fill="none" stroke="#eab308" strokeWidth="8"
                                                strokeDasharray={`${debrisProp} 283`}
                                                strokeDashoffset={-(mineProp + expResProp + expShipProp + combatProp)}
                                                strokeLinecap="round"
                                                style={{ transition: 'all 1s ease-out' }}
                                            />
                                        </svg>
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <TrendingUp size={28} color={THEME_CYAN} style={{ filter: `drop-shadow(0 0 8px ${THEME_CYAN}88)` }} />
                                        </div>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, letterSpacing: '0.15em' }}>EMPIRE DAILY YIELD</div>
                                        <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#fff', lineHeight: 1, margin: '6px 0', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                            {formatNumber(totalRevenue)}
                                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: THEME_CYAN, opacity: 0.8 }}>MSU</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '4px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isExpHeavy ? THEME_MAGENTA : THEME_CYAN, boxShadow: `0 0 8px ${isExpHeavy ? THEME_MAGENTA : THEME_CYAN}` }} />
                                            <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700, letterSpacing: '0.02em' }}>
                                                {dominantLabel} <span style={{ color: THEME_CYAN }}>({dominantPercent}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* DATA SLATS */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
                                    {/* MINES */}
                                    <div className="glass-hover" onClick={() => setActiveModal('mines')} style={{ padding: '12px', background: 'rgba(0, 242, 255, 0.03)', border: '1px solid rgba(0, 242, 255, 0.08)', position: 'relative', cursor: 'pointer', borderRadius: '12px' }}>
                                        <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '2px', background: THEME_CYAN }} />
                                        <div style={{ fontSize: '0.6rem', color: THEME_CYAN, fontWeight: 900, marginBottom: '4px' }}>PLANETARY MINES</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatNumber(mineDaily)}</div>
                                    </div>

                                    {/* EXPEDITION RESOURCES */}
                                    <div className="glass-hover" onClick={() => setActiveModal('expedition')} style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.03)', border: '1px solid rgba(34, 197, 94, 0.08)', position: 'relative', cursor: 'pointer', borderRadius: '12px' }}>
                                        <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '2px', background: '#22c55e' }} />
                                        <div style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 900, marginBottom: '4px' }}>EXPEDITION RESOURCES</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatNumber(expResDaily)}</div>
                                    </div>

                                    {/* FLEET SALVAGE */}
                                    <div className="glass-hover" onClick={() => setActiveModal('fleet')} style={{ padding: '12px', background: 'rgba(189, 0, 255, 0.03)', border: '1px solid rgba(189, 0, 255, 0.08)', position: 'relative', cursor: 'pointer', borderRadius: '12px' }}>
                                        <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '2px', background: THEME_MAGENTA }} />
                                        <div style={{ fontSize: '0.6rem', color: THEME_MAGENTA, fontWeight: 900, marginBottom: '4px' }}>SALVAGED FLEET</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatNumber(expShipDaily)}</div>
                                    </div>

                                    {/* COMBAT LOOT */}
                                    <div className="glass-hover" onClick={() => setActiveModal('combats')} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.08)', position: 'relative', cursor: 'pointer', borderRadius: '12px' }}>
                                        <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '2px', background: '#ef4444' }} />
                                        <div style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 900, marginBottom: '4px' }}>COMBAT PROFITS</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatNumber(combatDaily)}</div>
                                    </div>

                                    {/* DEBRIS HARVESTING */}
                                    <div className="glass-hover" onClick={() => setActiveModal('debris')} style={{ padding: '12px', background: 'rgba(234, 179, 8, 0.03)', border: '1px solid rgba(234, 179, 8, 0.08)', position: 'relative', cursor: 'pointer', borderRadius: '12px' }}>
                                        <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '2px', background: '#eab308' }} />
                                        <div style={{ fontSize: '0.6rem', color: '#eab308', fontWeight: 900, marginBottom: '4px' }}>DEBRIS FIELDS</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatNumber(debrisDaily)}</div>
                                    </div>

                                    {/* TOTAL AVG */}
                                    <div className="glass-hover" onClick={() => setActiveModal('total')} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', position: 'relative', cursor: 'pointer', borderRadius: '12px' }}>
                                        <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '2px', background: '#fff' }} />
                                        <div style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 900, marginBottom: '4px', opacity: 0.6 }}>TOTAL DAILY</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatNumber(totalRevenue)}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </BentoCard>

                {/* Lifeform Summary - THE CIVILIZATION HUB */}
                <BentoCard
                    title="Lifeform Hub"
                    icon={<Dna size={18} color="#43D159" />}
                    gridArea="1 / 6 / 3 / 13"
                >
                    {!lfStats ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                            No Lifeform data found
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                                    <div style={{ position: 'absolute', inset: -5, borderRadius: '50%', background: 'linear-gradient(135deg, #43D159, #00F2FF, #BD00FF)', opacity: 0.2, filter: 'blur(10px)' }} />
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img 
                                            src={`icons/lifeforms/${lfStats.domSpecies.toLowerCase().replace(/['’‘`\s]/g, "")}-icon-large.jpg`} 
                                            alt="" 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { (e.target as any).src = 'icons/lifeforms/humans-icon-large.jpg'; }}
                                        />
                                    </div>
                                    <div style={{ position: 'absolute', bottom: -5, right: -5, width: '28px', height: '28px', borderRadius: '50%', background: '#0a141e', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                        <Globe size={14} color={THEME_CYAN} />
                                    </div>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.15em', marginBottom: '4px' }}>DOMINANT SPECIES</div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', letterSpacing: '0.02em', lineHeight: 1.1 }}>{lfStats.domSpecies}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                        <div style={{ background: 'rgba(67, 209, 89, 0.1)', border: '1px solid rgba(67, 209, 89, 0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 900, color: '#43D159' }}>{lfStats.coverage}% COVERAGE</div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{lfStats.totalBuildings} STRUCTURES</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '4px' }}>SPECIES EVOLUTION & PROGRESS</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                                    {[1, 2, 3, 4].map(id => {
                                        const species = lifeformSpecies.find(s => s.lifeformId === id);
                                        const experience = activeAccount?.lifeformExperience?.find(e => e.lifeformId === id);
                                        const name = species?.lifeformName || (id === 1 ? 'Humans' : id === 2 ? "Rock'tal" : id === 3 ? 'Mechas' : 'Kaelesh');
                                        
                                        const level = experience?.level || 0;
                                        const progress = level >= 100 ? 100 : (experience && experience.nextLevelExp > 0 ? (experience.currentExp / experience.nextLevelExp) * 100 : 0);
                                        
                                        const colors: Record<number, string> = {
                                            1: '#43D159', // Human - Green
                                            2: '#FF4D00', // Rocktal - Orange
                                            3: '#00F2FF', // Mecha - Cyan
                                            4: '#BD00FF'  // Kaelesh - Magenta
                                        };
                                        const color = colors[id];

                                        return (
                                            <div key={id} style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '4px',
                                                padding: '8px 12px',
                                                background: level > 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
                                                borderRadius: '10px',
                                                border: `1px solid ${level > 0 ? 'rgba(255,255,255,0.05)' : 'transparent'}`,
                                                opacity: level > 0 ? 1 : 0.4
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>{name.toUpperCase()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color }}>
                                                        <span style={{ opacity: 0.5, fontSize: '0.55rem', color: '#fff' }}>LVL</span> {level}
                                                    </div>
                                                </div>
                                                <div style={{ height: '3px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        style={{ 
                                                            height: '100%', 
                                                            background: color, 
                                                            boxShadow: `0 0 10px ${color}33`,
                                                            borderRadius: '2px'
                                                        }}
                                                    />
                                                </div>
                                                {level > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <span style={{ fontSize: '0.45rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
                                                            {level >= 100 ? 'MAX LEVEL' : `${progress.toFixed(1)}% TO LVL ${level + 1}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </BentoCard>

                {/* At-A-Glance Overview Card */}
                <BentoCard
                    title="At-A-Glance"
                    icon={<Activity size={18} />}
                    gridArea="3 / 1 / 5 / 13"
                >
                    <AtAGlancePanel
                        expeditions={expeditions}
                        lifeforms={lifeformDiscoveries}
                        combats={combatReports}
                        debrisHarvests={debrisHarvests}
                    />
                </BentoCard>
            </div>

            {/* MODALS RELOCATED OUTSIDE GRID */}
            <Modal
                isOpen={activeModal === 'mines'}
                onClose={() => setActiveModal(null)}
                title="Planetary Network Efficiency"
                icon={<Globe size={28} />}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
                    {/* TOP CHART BAR */}
                    <div className="glass" style={{ gridColumn: 'span 12', padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '24px', height: '400px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: '24px', letterSpacing: '0.1em' }}>DISTRIBUTION BY PLANET (MSU)</div>
                        <ResponsiveContainer width="100%" height="85%" minWidth={0} minHeight={0}>
                            <BarChart data={planets.filter(p => p.type === 'planet').map(p => ({
                                name: p.name,
                                msu: p.production ? (p.production.metal * mMultiplier) + (p.production.crystal * cMultiplier) + (p.production.deuterium * dMultiplier) : 0
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
                                <Tooltip
                                    contentStyle={{ background: '#0a141e', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ color: THEME_CYAN }}
                                    formatter={(value: any) => [formatNumber(value), 'Yield (MSU)']}
                                />
                                <Bar dataKey="msu" fill={THEME_CYAN} radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* PLANET GRID */}
                    <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                        {planets.filter(p => p.type === 'planet').map(p => (
                            <div key={p.id} className="glass-hover" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: `1px solid rgba(0,242,255,0.2)`, background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
                                        {p.imgUrl ? (
                                            <img src={p.imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Globe size={18} color={THEME_CYAN} opacity={0.5} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 900, color: THEME_CYAN, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                        <div style={{ opacity: 0.3, fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>{p.coords === '0:0:0' ? 'Unknown' : `[${p.coords}]`}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {/* METAL */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src="icons/resources/metal_mine_medium.jpg" alt="M" style={{ width: '18px', height: '18px', borderRadius: '3px' }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>{p.metalMine || 0}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: RESOURCE_COLORS.metal }}>
                                            {p.production ? formatNumber(p.production.metal) : 'N/A'}
                                        </div>
                                    </div>

                                    {/* CRYSTAL */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src="icons/resources/crystal_mine_medium.jpg" alt="C" style={{ width: '18px', height: '18px', borderRadius: '3px' }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>{p.crystalMine || 0}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: RESOURCE_COLORS.crystal }}>
                                            {p.production ? formatNumber(p.production.crystal) : 'N/A'}
                                        </div>
                                    </div>

                                    {/* DEUTERIUM */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src="icons/resources/deuterium_mine_medium.jpg" alt="D" style={{ width: '18px', height: '18px', borderRadius: '3px' }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>{p.deuteriumMine || 0}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: RESOURCE_COLORS.deuterium }}>
                                            {p.production ? formatNumber(p.production.deuterium) : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={activeModal === 'expedition'}
                onClose={() => setActiveModal(null)}
                title="7-Day Expedition Resource Analysis"
                icon={<TrendingUp size={28} />}
            >
                <div style={{ height: '500px', minHeight: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={historicalData}>
                            <defs>
                                <linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#E6953C" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#E6953C" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4CAEE6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4CAEE6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorDs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#43D159" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#43D159" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                            <YAxis stroke="rgba(255,255,255,0.3)" tickFormatter={(val) => formatNumber(val)} />
                            <Tooltip
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '12px', fontSize: '0.8rem' }}
                                formatter={(val: any, name: any) => [Number(val || 0).toLocaleString(), name]}
                                itemSorter={(item: any) => {
                                    const order: Record<string, number> = { 'Metal': 1, 'Crystal': 2, 'Deuterium': 3 };
                                    return order[item.name as string] || 10;
                                }}
                            />
                            <Area type="monotone" dataKey="metal" name="Metal" stroke="#E6953C" fillOpacity={1} fill="url(#colorMs)" stackId="1" />
                            <Area type="monotone" dataKey="crystal" name="Crystal" stroke="#4CAEE6" fillOpacity={1} fill="url(#colorCs)" stackId="1" />
                            <Area type="monotone" dataKey="deuterium" name="Deuterium" stroke="#43D159" fillOpacity={1} fill="url(#colorDs)" stackId="1" />
                            <Legend
                                content={() => (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.05em' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E6953C' }}>
                                            <div style={{ width: '10px', height: '10px', background: '#E6953C', borderRadius: '2px' }} /> METAL
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4CAEE6' }}>
                                            <div style={{ width: '10px', height: '10px', background: '#4CAEE6', borderRadius: '2px' }} /> CRYSTAL
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#43D159' }}>
                                            <div style={{ width: '10px', height: '10px', background: '#43D159', borderRadius: '2px' }} /> DEUTERIUM
                                        </div>
                                    </div>
                                )}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ marginTop: '24px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                    Shows total loot gathered from all sorties per day across the 7-day period.
                </div>
            </Modal>

            <Modal
                isOpen={activeModal === 'fleet'}
                onClose={() => setActiveModal(null)}
                title="7-Day Expedition Salvage Value"
                icon={<BarChart3 size={28} />}
            >
                <div style={{ height: '500px', minHeight: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={historicalData}>
                            <defs>
                                <linearGradient id="colorSM" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RESOURCE_COLORS.metal} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RESOURCE_COLORS.metal} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorSC" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RESOURCE_COLORS.crystal} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RESOURCE_COLORS.crystal} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorSD" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RESOURCE_COLORS.deuterium} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RESOURCE_COLORS.deuterium} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                            <YAxis stroke="rgba(255,255,255,0.3)" tickFormatter={(val) => formatNumber(val)} />
                            <Tooltip
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(189,0,255,0.2)', borderRadius: '12px', fontSize: '0.8rem' }}
                                formatter={(val: any, name: any) => [Number(val || 0).toLocaleString(), name]}
                                itemSorter={(item: any) => {
                                    const order: Record<string, number> = { 'Metal': 1, 'Crystal': 2, 'Deuterium': 3 };
                                    return order[item.name as string] || 10;
                                }}
                            />
                            <Area type="monotone" dataKey="shipMetal" name="Metal" stroke={RESOURCE_COLORS.metal} fillOpacity={1} fill="url(#colorSM)" stackId="a" />
                            <Area type="monotone" dataKey="shipCrystal" name="Crystal" stroke={RESOURCE_COLORS.crystal} fillOpacity={1} fill="url(#colorSC)" stackId="a" />
                            <Area type="monotone" dataKey="shipDeuterium" name="Deuterium" stroke={RESOURCE_COLORS.deuterium} fillOpacity={1} fill="url(#colorSD)" stackId="a" />
                            <Legend
                                content={() => (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.05em' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.metal }}>
                                            <div style={{ width: '10px', height: '10px', background: RESOURCE_COLORS.metal, borderRadius: '2px' }} /> METAL
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.crystal }}>
                                            <div style={{ width: '10px', height: '10px', background: RESOURCE_COLORS.crystal, borderRadius: '2px' }} /> CRYSTAL
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.deuterium }}>
                                            <div style={{ width: '10px', height: '10px', background: RESOURCE_COLORS.deuterium, borderRadius: '2px' }} /> DEUTERIUM
                                        </div>
                                    </div>
                                )}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ marginTop: '24px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                    Visualizes the raw material equivalent value of all ships found during expeditions over the last 7 days.
                </div>
            </Modal>

            <Modal
                isOpen={activeModal === 'combats'}
                onClose={() => setActiveModal(null)}
                title="7-Day Combat Profit Analysis"
                icon={<BarChart3 size={28} />}
            >
                <div style={{ height: '500px', minHeight: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={historicalData}>
                            <defs>
                                <linearGradient id="colorCM" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RESOURCE_COLORS.metal} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RESOURCE_COLORS.metal} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCC" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RESOURCE_COLORS.crystal} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RESOURCE_COLORS.crystal} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCD" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RESOURCE_COLORS.deuterium} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RESOURCE_COLORS.deuterium} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                            <YAxis stroke="rgba(255,255,255,0.3)" tickFormatter={(val) => formatNumber(val)} />
                            <Tooltip
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', fontSize: '0.8rem' }}
                                formatter={(val: any, name: any) => [Number(val || 0).toLocaleString(), name]}
                                itemSorter={(item: any) => {
                                    const order: Record<string, number> = { 'Metal': 1, 'Crystal': 2, 'Deuterium': 3 };
                                    return order[item.name as string] || 10;
                                }}
                            />
                            <Area type="monotone" dataKey="combatMetal" name="Metal" stroke={RESOURCE_COLORS.metal} fillOpacity={1} fill="url(#colorCM)" stackId="c" />
                            <Area type="monotone" dataKey="combatCrystal" name="Crystal" stroke={RESOURCE_COLORS.crystal} fillOpacity={1} fill="url(#colorCC)" stackId="c" />
                            <Area type="monotone" dataKey="combatDeuterium" name="Deuterium" stroke={RESOURCE_COLORS.deuterium} fillOpacity={1} fill="url(#colorCD)" stackId="c" />
                            <Legend
                                content={() => (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.05em' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.metal }}>
                                            <div style={{ width: '10px', height: '10px', background: RESOURCE_COLORS.metal, borderRadius: '2px' }} /> METAL
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.crystal }}>
                                            <div style={{ width: '10px', height: '10px', background: RESOURCE_COLORS.crystal, borderRadius: '2px' }} /> CRYSTAL
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.deuterium }}>
                                            <div style={{ width: '10px', height: '10px', background: RESOURCE_COLORS.deuterium, borderRadius: '2px' }} /> DEUTERIUM
                                        </div>
                                    </div>
                                )}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ marginTop: '24px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                    Trend analysis of gathered loot from successful combat operations over the last 7 days.
                </div>
            </Modal>

            <Modal
                isOpen={activeModal === 'debris'}
                onClose={() => setActiveModal(null)}
                title="7-Day Debris Field Harvesting"
                icon={<BarChart3 size={28} />}
            >
                <div style={{ height: '500px', minHeight: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={historicalData}>
                            <defs>
                                <linearGradient id="colorDM" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RESOURCE_COLORS.metal} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RESOURCE_COLORS.metal} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorDC" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RESOURCE_COLORS.crystal} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RESOURCE_COLORS.crystal} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RESOURCE_COLORS.deuterium} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RESOURCE_COLORS.deuterium} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                            <YAxis stroke="rgba(255,255,255,0.3)" tickFormatter={(val) => formatNumber(val)} />
                            <Tooltip
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '12px', fontSize: '0.8rem' }}
                                formatter={(val: any, name: any) => [Number(val || 0).toLocaleString(), name]}
                                itemSorter={(item: any) => {
                                    const order: Record<string, number> = { 'Metal': 1, 'Crystal': 2, 'Deuterium': 3 };
                                    return order[item.name as string] || 10;
                                }}
                            />
                            <Area type="monotone" dataKey="debrisMetal" name="Metal" stroke={RESOURCE_COLORS.metal} fillOpacity={1} fill="url(#colorDM)" stackId="d" />
                            <Area type="monotone" dataKey="debrisCrystal" name="Crystal" stroke={RESOURCE_COLORS.crystal} fillOpacity={1} fill="url(#colorDC)" stackId="d" />
                            <Area type="monotone" dataKey="debrisDeuterium" name="Deuterium" stroke={RESOURCE_COLORS.deuterium} fillOpacity={1} fill="url(#colorDD)" stackId="d" />
                            <Legend
                                content={() => (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.05em' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.metal }}>
                                            <div style={{ width: '10px', height: '10px', background: RESOURCE_COLORS.metal, borderRadius: '2px' }} /> METAL
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.crystal }}>
                                            <div style={{ width: '10px', height: '10px', background: RESOURCE_COLORS.crystal, borderRadius: '2px' }} /> CRYSTAL
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.deuterium }}>
                                            <div style={{ width: '10px', height: '10px', background: RESOURCE_COLORS.deuterium, borderRadius: '2px' }} /> DEUTERIUM
                                        </div>
                                    </div>
                                )}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ marginTop: '24px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                    Visualizes the total resources reclaimed from debris fields over the last 7 days.
                </div>
            </Modal>

            <Modal
                isOpen={activeModal === 'total'}
                onClose={() => setActiveModal(null)}
                title="7-Day Total Yield Trend"
                icon={<Activity size={28} />}
            >
                <div style={{ height: '500px', minHeight: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={historicalData}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={THEME_CYAN} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={THEME_CYAN} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                            <YAxis stroke="rgba(255,255,255,0.3)" tickFormatter={(val) => formatNumber(val)} />
                            <Tooltip
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '12px', fontSize: '0.8rem' }}
                                formatter={(val: any, name: any) => [Number(val || 0).toLocaleString(), name]}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="totalMsu" 
                                name="Total Yield (MSU)" 
                                stroke={THEME_CYAN} 
                                fillOpacity={1} 
                                fill="url(#colorTotal)" 
                                strokeWidth={3}
                            />
                            <Area type="monotone" dataKey="msu" name="Expedition (MSU)" stroke="#22c55e" fill="transparent" strokeDasharray="5 5" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ marginTop: '24px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                    Aggregate view of your total income (Mines + Expeditions + Fleet + Combat + Debris) expressed in MSU over the last 7 days.
                </div>
            </Modal>

        </div>
    );
};

export default Overview;
