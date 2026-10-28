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
    X,
    Settings,
    Check,
    Sliders
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { SHIP_DATA } from '../../db/staticData';
import { renderAnalyticsTab } from '../../content/analytics';
import { calculateEmpireProduction, safeArray } from '../../utils/amortizationCalc';
import { calculateTotalEmpireDailyYield, useEmpireYieldConfig } from '../../utils/empireYield';
import { ThemeIcon } from '../components/ThemeIcon';
import { isSameUniverse } from '../../utils/universe';
import { getPlayerClassName } from '../../i18n/gameData';

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
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '40px 24px',
                overflow: 'auto',
                WebkitOverflowScrolling: 'touch'
            }}>
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
                        flexDirection: 'column',
                        margin: '20px auto'
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
    badge?: React.ReactNode;
    gridArea?: string;
    children: React.ReactNode;
}> = ({ title, icon, badge, gridArea, children }) => (
    <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
            gridArea,
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            willChange: 'transform, opacity',
            background: 'linear-gradient(180deg, rgba(10, 18, 30, 0.82) 0%, rgba(6, 11, 20, 0.92) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(0, 242, 255, 0.16)',
            borderRadius: '24px',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 0 24px rgba(0, 242, 255, 0.02)',
            position: 'relative',
            overflow: 'hidden'
        }}
    >
        {/* Top edge subtle technical glow line */}
        <div style={{
            position: 'absolute',
            top: 0,
            left: '12%',
            right: '12%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.4), transparent)',
            pointerEvents: 'none'
        }} />

        {/* Card Header */}
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(0, 242, 255, 0.08)',
                    border: '1px solid rgba(0, 242, 255, 0.25)',
                    boxShadow: '0 0 12px rgba(0, 242, 255, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: THEME_CYAN,
                    flexShrink: 0
                }}>
                    {icon}
                </div>
                <span style={{
                    fontSize: '0.92rem',
                    fontWeight: 900,
                    color: '#fff',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-title, sans-serif)',
                    textShadow: '0 0 14px rgba(0, 242, 255, 0.2)'
                }}>
                    {title}
                </span>
            </div>
            {badge && <div>{badge}</div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
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
    const n = num || 0;
    const d = 2;
    if (n >= 1000000000000) return (n / 1000000000000).toFixed(d) + 'T';
    if (n >= 1000000000) return (n / 1000000000).toFixed(d) + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(d) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(d) + 'K';
    return Math.round(n).toString();
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
        .nexus-yield-info-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(111, 159, 200, 0.4);
            color: #8bb3d6;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 10px;
            font-weight: 700;
            font-style: italic;
            line-height: 1;
            cursor: help;
            user-select: none;
            position: relative;
            z-index: 100;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nexus-yield-info-btn:hover {
            background: rgba(56, 189, 248, 0.2);
            border-color: #38bdf8;
            color: #38bdf8;
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
            transform: scale(1.15);
            z-index: 1000;
        }
        .nexus-yield-info-btn::after {
            content: attr(data-nexus-tooltip);
            white-space: pre-line;
            width: 320px;
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            text-align: left;
            line-height: 1.5;
            font-size: 11px;
            color: #cbd5e1;
            padding: 10px 14px;
            background: rgba(10, 15, 26, 0.98);
            border: 1px solid rgba(56, 189, 248, 0.4);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85), 0 0 14px rgba(56, 189, 248, 0.25);
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 400;
            font-style: normal;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            z-index: 9999999 !important;
            transform: translateY(4px);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-sizing: border-box;
        }
        .nexus-yield-info-btn:hover::after {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
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
        async () => {
            if (!activeAccount) {
                return await db.debrisHarvests.toArray();
            }
            const strPid = String(activeAccount.playerId || '').trim();
            const numPid = Number(strPid);
            const pidVariants: any[] = [strPid];
            if (!isNaN(numPid) && String(numPid) === strPid) {
                pidVariants.push(numPid);
            }

            let userHarvests = await db.debrisHarvests
                .where('playerId')
                .anyOf(pidVariants)
                .toArray();

            if (userHarvests.length === 0) {
                const all = await db.debrisHarvests.toArray();
                userHarvests = all.filter(d => !d.playerId || String(d.playerId).trim() === strPid);
            }

            const activeUni = activeAccount.universe;
            return userHarvests.filter(d => isSameUniverse(d.universe, activeUni));
        },
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

    // Calculate dynamic production on-the-fly using standard engine
    const calcResults = useMemo(() => {
        if (!activeAccount || planets.length === 0) return null;
        return calculateEmpireProduction({ account: activeAccount, planets });
    }, [activeAccount, planets]);

    // Calculate totals and capture freshness
    const totals = useMemo(() => {
        const result = { metal: 0, crystal: 0, deuterium: 0, lastUpdated: 0 };
        if (!calcResults) return result;

        planets.forEach(p => {
            const prod = calcResults.planets[p.id]?.total;
            if (prod) {
                result.metal += prod.metal;
                result.crystal += prod.crystal;
                result.deuterium += prod.deuterium;
                if (result.lastUpdated === 0 || p.lastUpdated < result.lastUpdated) {
                    result.lastUpdated = p.lastUpdated;
                }
            }
        });
        return result;
    }, [planets, calcResults]);

    const mMultiplier = 1;
    const cMultiplier = rates.metal / rates.crystal;
    const dMultiplier = rates.metal / rates.deuterium;
    const totalMSUPerHour = (totals.metal * mMultiplier) + (totals.crystal * cMultiplier) + (totals.deuterium * dMultiplier);

    // Expedition Stats Calculation
    const expStats = useMemo(() => {
        if (expeditions.length === 0) return null;
        const nowSec = Date.now() / 1000;
        const last7Days = nowSec - (7 * 24 * 60 * 60);
        const recentExps = expeditions.filter(e => e.timestamp >= last7Days);

        const validTimestamps = expeditions.map(e => e.timestamp).filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
        const minTimestamp = validTimestamps.length > 0 ? Math.min(...validTimestamps) : nowSec;
        const daysTracked = Math.min(7, Math.max(1, Math.ceil((nowSec - minTimestamp) / 86400)));

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
            daysTracked,
            successRate: (((expeditions.length - counts.fail) / expeditions.length) * 100).toFixed(1),
            totalResources: points,
            rarity: counts,
            mostRecent: expeditions.sort((a, b) => b.timestamp - a.timestamp)[0],
            avgResDaily: {
                metal: res7d.metal / daysTracked,
                crystal: res7d.crystal / daysTracked,
                deuterium: res7d.deuterium / daysTracked,
                msu: res7d.msu / daysTracked
            },
            avgShipDaily: {
                metal: ship7d.metal / daysTracked,
                crystal: ship7d.crystal / daysTracked,
                deuterium: ship7d.deuterium / daysTracked,
                msu: ship7d.msu / daysTracked
            }
        };
    }, [expeditions, mMultiplier, cMultiplier, dMultiplier]);

    // Combat Stats Calculation
    const combatStats = useMemo(() => {
        if (combatReports.length === 0) return null;
        const nowSec = Date.now() / 1000;
        const last7Days = nowSec - (7 * 24 * 60 * 60);
        const recentCombats = combatReports.filter(c => c.timestamp >= last7Days && c.winner === 'attacker');

        const validTimestamps = combatReports.map(c => c.timestamp).filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
        const minTimestamp = validTimestamps.length > 0 ? Math.min(...validTimestamps) : nowSec;
        const daysTracked = Math.min(7, Math.max(1, Math.ceil((nowSec - minTimestamp) / 86400)));

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
            daysTracked,
            avgDaily: {
                metal: res7d.metal / daysTracked,
                crystal: res7d.crystal / daysTracked,
                deuterium: res7d.deuterium / daysTracked,
                msu: res7d.msu / daysTracked
            }
        };
    }, [combatReports, mMultiplier, cMultiplier, dMultiplier]);

    // Debris Stats Calculation
    const debrisStats = useMemo(() => {
        if (debrisHarvests.length === 0) return null;
        const nowSec = Date.now() / 1000;
        const last7Days = nowSec - (7 * 24 * 60 * 60);
        const recentDebris = debrisHarvests.filter(d => d.timestamp >= last7Days && d.recycledResources);

        const validTimestamps = debrisHarvests.map(d => d.timestamp).filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
        const minTimestamp = validTimestamps.length > 0 ? Math.min(...validTimestamps) : nowSec;
        const daysTracked = Math.min(7, Math.max(1, Math.ceil((nowSec - minTimestamp) / 86400)));

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
            daysTracked,
            avgDaily: {
                metal: res7d.metal / daysTracked,
                crystal: res7d.crystal / daysTracked,
                deuterium: res7d.deuterium / daysTracked,
                msu: res7d.msu / daysTracked
            }
        };
    }, [debrisHarvests, mMultiplier, cMultiplier, dMultiplier]);

    // Lifeform Stats
    const lfStats = useMemo(() => {
        if (planets.length === 0) return null;

        const speciesCounts: Record<number, number> = {};
        let totalBuildings = 0;

        safeArray(planets).forEach(p => {
            if (p.lifeformId) {
                speciesCounts[p.lifeformId] = (speciesCounts[p.lifeformId] || 0) + 1;
            }
            const safeBuildings = safeArray(p.lifeformBuildings);
            totalBuildings += safeBuildings.reduce((s: number, b: any) => s + (b?.level || 0), 0);
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

    const [yieldConfig, setYieldConfig] = useEmpireYieldConfig();
    const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
    const [scrapPercentInput, setScrapPercentInput] = useState<number>(() => Math.round((yieldConfig.scrapMerchantRatio || 0.75) * 100));

    useEffect(() => {
        setScrapPercentInput(Math.round((yieldConfig.scrapMerchantRatio || 0.75) * 100));
    }, [yieldConfig.scrapMerchantRatio]);

    const [activeModal, setActiveModal] = useState<'mines' | 'expedition' | 'fleet' | 'combats' | 'debris' | 'total' | null>(null);
    const [isDonateHovered, setIsDonateHovered] = useState(false);


    return (
        <div className="view">
            <GlobalStyles />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '36px' }}>
                <div>
                    <motion.h1
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="view-title"
                        style={{ marginBottom: 0 }}
                    >
                        Empire 360°
                    </motion.h1>
                    <div style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: 'rgba(255, 255, 255, 0.45)',
                        letterSpacing: '0.15em',
                        marginTop: '6px',
                        textTransform: 'uppercase'
                    }}>
                        Command Telemetry & Empire Yield
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {activeAccount && (
                        <motion.div
                            onMouseEnter={() => setIsDonateHovered(true)}
                            onMouseLeave={() => setIsDonateHovered(false)}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{
                                scale: 1.02,
                                backgroundColor: 'rgba(0, 242, 255, 0.08)',
                                borderColor: 'rgba(0, 242, 255, 0.35)',
                                boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)'
                            }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, rgba(10, 18, 30, 0.8) 0%, rgba(6, 11, 20, 0.9) 100%)',
                                padding: '12px 20px',
                                borderRadius: '20px',
                                border: '1px solid rgba(0, 242, 255, 0.16)',
                                backdropFilter: 'blur(16px)',
                                height: '100px',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}
                        >
                            <a
                                href="https://ko-fi.com/W0M821KSSE"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                            >
                                <AnimatePresence>
                                    {isDonateHovered && (
                                        <motion.span
                                            initial={{ opacity: 0, width: 0, marginRight: 0 }}
                                            animate={{ opacity: 1, width: 'auto', marginRight: 12 }}
                                            exit={{ opacity: 0, width: 0, marginRight: 0 }}
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                            style={{
                                                overflow: 'hidden',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                color: 'var(--text-main)',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                fontFamily: 'var(--font-main)',
                                                textShadow: '0 0 8px rgba(0, 242, 255, 0.2)'
                                            }}
                                        >
                                            <div style={{ whiteSpace: 'nowrap' }}>
                                                Hi! This is uppermosteN, the sole developer of OGame Nexus.
                                            </div>
                                            <div style={{ whiteSpace: 'nowrap', marginTop: '4px', color: 'rgba(248, 250, 252, 0.85)' }}>
                                                If you like what I do, a coffee would be much appreciated ❤️
                                            </div>
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                                <img
                                    height="36"
                                    style={{ border: '0px', height: '36px', display: 'block' }}
                                    src="https://storage.ko-fi.com/cdn/kofi2.png?v=6"
                                    alt="Buy Me a Coffee at ko-fi.com"
                                />
                            </a>
                        </motion.div>
                    )}

                    {activeAccount && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{
                                scale: 1.02,
                                borderColor: 'rgba(0, 242, 255, 0.4)',
                                boxShadow: '0 12px 36px rgba(0, 242, 255, 0.18)'
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelect && onSelect('signature')}
                            title="Customize Empire Signature"
                            style={{
                                display: 'flex',
                                gap: '22px',
                                alignItems: 'center',
                                background: 'linear-gradient(135deg, rgba(10, 18, 30, 0.85) 0%, rgba(6, 11, 20, 0.95) 100%)',
                                padding: '14px 24px',
                                borderRadius: '20px',
                                border: '1px solid rgba(0, 242, 255, 0.2)',
                                backdropFilter: 'blur(16px)',
                                boxShadow: '0 12px 36px -6px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                                cursor: 'pointer',
                                height: '100px',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
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
                                            {getPlayerClassName(activeAccount.playerClass)}
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
                    icon={<ThemeIcon name="diamond" size={18} />}
                    gridArea="1 / 1 / 3 / 6"
                >
                    {(() => {
                        const yieldBreakdown = calculateTotalEmpireDailyYield({
                            activeAccount,
                            planets,
                            expeditions,
                            combatReports,
                            debrisHarvests,
                            rates,
                            yieldConfig
                        });
                        const mineDaily = yieldBreakdown.mineDailyMSU;
                        const expResDaily = yieldBreakdown.expResDailyMSU;
                        const expShipDaily = yieldBreakdown.expShipDailyMSU;
                        const combatDaily = yieldBreakdown.combatDailyMSU;
                        const debrisDaily = yieldBreakdown.debrisDailyMSU;
                        const totalRevenue = yieldBreakdown.totalDailyYieldMSU;

                        const mineProp = totalRevenue > 0 ? (mineDaily / totalRevenue) * 283 : 0;
                        const expResProp = totalRevenue > 0 ? (expResDaily / totalRevenue) * 283 : 0;
                        const expShipProp = totalRevenue > 0 ? (expShipDaily / totalRevenue) * 283 : 0;
                        const combatProp = totalRevenue > 0 ? (combatDaily / totalRevenue) * 283 : 0;
                        const debrisProp = totalRevenue > 0 ? (debrisDaily / totalRevenue) * 283 : 0;

                        const isExpHeavy = (expResDaily + expShipDaily) > mineDaily;
                        const dominantLabel = totalRevenue === 0
                            ? "NO ACTIVE SOURCES"
                            : isExpHeavy ? "EXPEDITION DOMINANT" : "PRODUCTION DOMINANT";
                        const dominantPercent = totalRevenue > 0
                            ? (isExpHeavy
                                ? ((expResDaily + expShipDaily) / totalRevenue * 100).toFixed(1)
                                : (mineDaily / totalRevenue * 100).toFixed(1))
                            : "0.0";

                        const activeCount = [
                            yieldConfig.includeMines,
                            yieldConfig.includeExpeditions,
                            yieldConfig.includeSalvagedFleet,
                            yieldConfig.includeCombatProfits,
                            yieldConfig.includeDebrisFields
                        ].filter(Boolean).length;

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '6px 0 0 0' }}>
                                {/* THE POWER CORE HEADER */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
                                    <div style={{ position: 'relative', width: '102px', height: '102px', flexShrink: 0 }}>
                                        {/* Outer technical radar ticks */}
                                        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: -6, width: 'calc(100% + 12px)', height: 'calc(100% + 12px)', pointerEvents: 'none' }}>
                                            <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0, 242, 255, 0.25)" strokeWidth="1" strokeDasharray="3 6" opacity="0.7" />
                                            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                                        </svg>

                                        {/* Reactor Ambient Glow */}
                                        <div style={{
                                            position: 'absolute',
                                            inset: '10%',
                                            borderRadius: '50%',
                                            background: 'radial-gradient(circle, rgba(0, 242, 255, 0.18) 0%, rgba(0, 242, 255, 0.04) 60%, transparent 80%)',
                                            filter: 'blur(5px)',
                                            pointerEvents: 'none'
                                        }} />

                                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8.5" />
                                            {/* Mine (Cyan) */}
                                            {yieldConfig.includeMines && (
                                                <circle
                                                    cx="50" cy="50" r="45" fill="none" stroke={THEME_CYAN} strokeWidth="8.5"
                                                    strokeDasharray={`${mineProp} 283`}
                                                    strokeLinecap="round"
                                                    style={{ transition: 'all 0.6s ease-out' }}
                                                />
                                            )}
                                            {/* Exp Res (Green) */}
                                            {yieldConfig.includeExpeditions && (
                                                <circle
                                                    cx="50" cy="50" r="45" fill="none" stroke="#22c55e" strokeWidth="8.5"
                                                    strokeDasharray={`${expResProp} 283`}
                                                    strokeDashoffset={-mineProp}
                                                    strokeLinecap="round"
                                                    style={{ transition: 'all 0.6s ease-out' }}
                                                />
                                            )}
                                            {/* Salvage (Magenta) */}
                                            {yieldConfig.includeSalvagedFleet && (
                                                <circle
                                                    cx="50" cy="50" r="45" fill="none" stroke={THEME_MAGENTA} strokeWidth="8.5"
                                                    strokeDasharray={`${expShipProp} 283`}
                                                    strokeDashoffset={-(mineProp + expResProp)}
                                                    strokeLinecap="round"
                                                    style={{ transition: 'all 0.6s ease-out' }}
                                                />
                                            )}
                                            {/* Combat (Red) */}
                                            {yieldConfig.includeCombatProfits && (
                                                <circle
                                                    cx="50" cy="50" r="45" fill="none" stroke="#ef4444" strokeWidth="8.5"
                                                    strokeDasharray={`${combatProp} 283`}
                                                    strokeDashoffset={-(mineProp + expResProp + expShipProp)}
                                                    strokeLinecap="round"
                                                    style={{ transition: 'all 0.6s ease-out' }}
                                                />
                                            )}
                                            {/* Debris (Yellow) */}
                                            {yieldConfig.includeDebrisFields && (
                                                <circle
                                                    cx="50" cy="50" r="45" fill="none" stroke="#eab308" strokeWidth="8.5"
                                                    strokeDasharray={`${debrisProp} 283`}
                                                    strokeDashoffset={-(mineProp + expResProp + expShipProp + combatProp)}
                                                    strokeLinecap="round"
                                                    style={{ transition: 'all 0.6s ease-out' }}
                                                />
                                            )}
                                        </svg>
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            pointerEvents: 'none'
                                        }}>
                                            <div style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '50%',
                                                background: 'rgba(6, 11, 20, 0.94)',
                                                border: '1.5px solid rgba(0, 242, 255, 0.35)',
                                                boxShadow: '0 0 16px rgba(0, 242, 255, 0.3), inset 0 0 12px rgba(0, 242, 255, 0.15)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Zap size={20} color={THEME_CYAN} style={{ filter: `drop-shadow(0 0 8px ${THEME_CYAN})` }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 50 }}>
                                            <div style={{
                                                fontSize: '0.72rem',
                                                color: 'rgba(255,255,255,0.65)',
                                                fontWeight: 900,
                                                letterSpacing: '0.14em',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: THEME_CYAN, boxShadow: `0 0 8px ${THEME_CYAN}` }} />
                                                EMPIRE DAILY YIELD
                                            </div>
                                            <span
                                                className="nexus-yield-info-btn"
                                                data-nexus-tooltip={`Empire Daily Yield Calculation\n\n• Checkboxes: Toggle any revenue category to customize your global empire calculation.\n• Planetary Mines: 24h theoretical output based on live mine levels, plasma tech, lifeforms & active bonuses.\n• Expeditions, Fleet Salvage, Combat & Debris: Rolling daily average calculated over the last 7 days.\n• Salvaged Fleet: Scaled by your average Scrap Merchant recovery rate (${Math.round((yieldConfig.scrapMerchantRatio || 0.75) * 100)}%).\n• MSU (Metal Standard Units): Standardized revenue based on your conversion rates (${rates.metal}:${rates.crystal}:${rates.deuterium}).`}
                                            >
                                                i
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: '3.1rem',
                                            fontWeight: 900,
                                            color: '#ffffff',
                                            lineHeight: 1,
                                            margin: '8px 0',
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: '10px',
                                            position: 'relative',
                                            zIndex: 1,
                                            fontFamily: 'var(--font-title, sans-serif)',
                                            textShadow: '0 0 25px rgba(0, 242, 255, 0.2)'
                                        }}>
                                            {formatNumber(totalRevenue)}
                                            <span style={{
                                                fontSize: '0.95rem',
                                                fontWeight: 900,
                                                color: THEME_CYAN,
                                                background: 'rgba(0, 242, 255, 0.1)',
                                                border: '1px solid rgba(0, 242, 255, 0.28)',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                letterSpacing: '0.06em',
                                                textShadow: 'none'
                                            }}>
                                                MSU/d
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'inline-flex',
                                            gap: '8px',
                                            alignItems: 'center',
                                            background: totalRevenue === 0
                                                ? 'rgba(255,255,255,0.03)'
                                                : isExpHeavy ? 'rgba(189, 0, 255, 0.1)' : 'rgba(0, 242, 255, 0.08)',
                                            border: `1px solid ${totalRevenue === 0 ? 'rgba(255,255,255,0.08)' : isExpHeavy ? 'rgba(189, 0, 255, 0.3)' : 'rgba(0, 242, 255, 0.25)'}`,
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            boxShadow: totalRevenue === 0 ? 'none' : `0 0 14px ${isExpHeavy ? 'rgba(189, 0, 255, 0.18)' : 'rgba(0, 242, 255, 0.15)'}`
                                        }}>
                                            <div style={{
                                                width: '7px',
                                                height: '7px',
                                                borderRadius: '50%',
                                                background: totalRevenue === 0 ? '#64748b' : isExpHeavy ? THEME_MAGENTA : THEME_CYAN,
                                                boxShadow: `0 0 8px ${totalRevenue === 0 ? '#64748b' : isExpHeavy ? THEME_MAGENTA : THEME_CYAN}`
                                            }} />
                                            <div style={{ fontSize: '0.74rem', color: '#fff', fontWeight: 800, letterSpacing: '0.03em' }}>
                                                {dominantLabel} <span style={{ color: isExpHeavy ? '#e879f9' : THEME_CYAN }}>({dominantPercent}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* DATA SLATS */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '18px' }}>
                                    {/* MINES */}
                                    <div
                                        className="glass-hover"
                                        onClick={() => setActiveModal('mines')}
                                        style={{
                                            padding: '12px 14px',
                                            background: yieldConfig.includeMines ? 'linear-gradient(135deg, rgba(14, 23, 38, 0.85) 0%, rgba(8, 14, 24, 0.95) 100%)' : 'rgba(255, 255, 255, 0.015)',
                                            border: yieldConfig.includeMines ? '1px solid rgba(0, 242, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                                            boxShadow: yieldConfig.includeMines ? '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 16px rgba(0, 242, 255, 0.04)' : 'none',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            borderRadius: '14px',
                                            opacity: yieldConfig.includeMines ? 1 : 0.45,
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: '68px'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', left: 0, top: '15%', height: '70%', width: '3.5px', borderRadius: '0 2px 2px 0', background: yieldConfig.includeMines ? THEME_CYAN : 'rgba(255,255,255,0.2)', boxShadow: yieldConfig.includeMines ? `0 0 8px ${THEME_CYAN}88` : 'none' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setYieldConfig({ includeMines: !yieldConfig.includeMines });
                                                    }}
                                                    title={yieldConfig.includeMines ? "Exclude Planetary Mines from Empire Daily Yield" : "Include Planetary Mines in Empire Daily Yield"}
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '4px',
                                                        border: yieldConfig.includeMines ? `1.5px solid ${THEME_CYAN}` : '1px solid rgba(255,255,255,0.25)',
                                                        background: yieldConfig.includeMines ? 'rgba(0, 242, 255, 0.22)' : 'rgba(255,255,255,0.03)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: yieldConfig.includeMines ? `0 0 8px ${THEME_CYAN}55` : 'none'
                                                    }}
                                                >
                                                    {yieldConfig.includeMines && <Check size={11} color={THEME_CYAN} strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: '0.64rem', color: yieldConfig.includeMines ? THEME_CYAN : 'rgba(255,255,255,0.5)', fontWeight: 900, letterSpacing: '0.04em' }}>PLANETARY MINES</span>
                                            </div>
                                            {!yieldConfig.includeMines && (
                                                <span style={{ fontSize: '0.52rem', fontWeight: 900, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.35)', letterSpacing: '0.04em' }}>OFF</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <div style={{ fontSize: '1.22rem', fontWeight: 900, color: yieldConfig.includeMines ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: '-0.02em' }}>
                                                {formatNumber(yieldBreakdown.rawMineDailyMSU)}
                                            </div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>MSU/d</span>
                                        </div>
                                    </div>

                                    {/* EXPEDITION RESOURCES */}
                                    <div
                                        className="glass-hover"
                                        onClick={() => setActiveModal('expedition')}
                                        style={{
                                            padding: '12px 14px',
                                            background: yieldConfig.includeExpeditions ? 'linear-gradient(135deg, rgba(14, 23, 38, 0.85) 0%, rgba(8, 14, 24, 0.95) 100%)' : 'rgba(255, 255, 255, 0.015)',
                                            border: yieldConfig.includeExpeditions ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                                            boxShadow: yieldConfig.includeExpeditions ? '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 16px rgba(34, 197, 94, 0.04)' : 'none',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            borderRadius: '14px',
                                            opacity: yieldConfig.includeExpeditions ? 1 : 0.45,
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: '68px'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', left: 0, top: '15%', height: '70%', width: '3.5px', borderRadius: '0 2px 2px 0', background: yieldConfig.includeExpeditions ? '#22c55e' : 'rgba(255,255,255,0.2)', boxShadow: yieldConfig.includeExpeditions ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setYieldConfig({ includeExpeditions: !yieldConfig.includeExpeditions });
                                                    }}
                                                    title={yieldConfig.includeExpeditions ? "Exclude Expedition Resources from Empire Daily Yield" : "Include Expedition Resources in Empire Daily Yield"}
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '4px',
                                                        border: yieldConfig.includeExpeditions ? '1.5px solid #22c55e' : '1px solid rgba(255,255,255,0.25)',
                                                        background: yieldConfig.includeExpeditions ? 'rgba(34, 197, 94, 0.22)' : 'rgba(255,255,255,0.03)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: yieldConfig.includeExpeditions ? '0 0 8px rgba(34, 197, 94, 0.55)' : 'none'
                                                    }}
                                                >
                                                    {yieldConfig.includeExpeditions && <Check size={11} color="#22c55e" strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: '0.64rem', color: yieldConfig.includeExpeditions ? '#22c55e' : 'rgba(255,255,255,0.5)', fontWeight: 900, letterSpacing: '0.04em' }}>EXPEDITION RESOURCES</span>
                                            </div>
                                            {!yieldConfig.includeExpeditions && (
                                                <span style={{ fontSize: '0.52rem', fontWeight: 900, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.35)', letterSpacing: '0.04em' }}>OFF</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <div style={{ fontSize: '1.22rem', fontWeight: 900, color: yieldConfig.includeExpeditions ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: '-0.02em' }}>
                                                {formatNumber(yieldBreakdown.rawExpResDailyMSU)}
                                            </div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>MSU/d</span>
                                        </div>
                                    </div>

                                    {/* SALVAGED FLEET */}
                                    <div
                                        className="glass-hover"
                                        onClick={() => setActiveModal('fleet')}
                                        style={{
                                            padding: '12px 14px',
                                            background: yieldConfig.includeSalvagedFleet ? 'linear-gradient(135deg, rgba(14, 23, 38, 0.85) 0%, rgba(8, 14, 24, 0.95) 100%)' : 'rgba(255, 255, 255, 0.015)',
                                            border: yieldConfig.includeSalvagedFleet ? '1px solid rgba(189, 0, 255, 0.28)' : '1px solid rgba(255, 255, 255, 0.06)',
                                            boxShadow: yieldConfig.includeSalvagedFleet ? '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 16px rgba(189, 0, 255, 0.05)' : 'none',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            borderRadius: '14px',
                                            opacity: yieldConfig.includeSalvagedFleet ? 1 : 0.45,
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: '68px'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', left: 0, top: '15%', height: '70%', width: '3.5px', borderRadius: '0 2px 2px 0', background: yieldConfig.includeSalvagedFleet ? THEME_MAGENTA : 'rgba(255,255,255,0.2)', boxShadow: yieldConfig.includeSalvagedFleet ? `0 0 8px ${THEME_MAGENTA}88` : 'none' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setYieldConfig({ includeSalvagedFleet: !yieldConfig.includeSalvagedFleet });
                                                    }}
                                                    title={yieldConfig.includeSalvagedFleet ? "Exclude Salvaged Fleet from Empire Daily Yield" : "Include Salvaged Fleet in Empire Daily Yield"}
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '4px',
                                                        border: yieldConfig.includeSalvagedFleet ? `1.5px solid ${THEME_MAGENTA}` : '1px solid rgba(255,255,255,0.25)',
                                                        background: yieldConfig.includeSalvagedFleet ? 'rgba(189, 0, 255, 0.22)' : 'rgba(255,255,255,0.03)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: yieldConfig.includeSalvagedFleet ? `0 0 8px ${THEME_MAGENTA}55` : 'none'
                                                    }}
                                                >
                                                    {yieldConfig.includeSalvagedFleet && <Check size={11} color={THEME_MAGENTA} strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: '0.64rem', color: yieldConfig.includeSalvagedFleet ? THEME_MAGENTA : 'rgba(255,255,255,0.5)', fontWeight: 900, letterSpacing: '0.04em' }}>SALVAGED FLEET</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {!yieldConfig.includeSalvagedFleet && (
                                                    <span style={{ fontSize: '0.52rem', fontWeight: 900, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.35)', letterSpacing: '0.04em' }}>OFF</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setScrapPercentInput(Math.round((yieldConfig.scrapMerchantRatio || 0.75) * 100));
                                                        setIsScrapModalOpen(true);
                                                    }}
                                                    title="Configure Scrap Merchant Recovery Rate"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '2px 7px',
                                                        background: 'rgba(189, 0, 255, 0.18)',
                                                        border: '1px solid rgba(189, 0, 255, 0.45)',
                                                        color: '#e879f9',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.62rem',
                                                        fontWeight: 800,
                                                        lineHeight: 1,
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <Settings size={10} />
                                                    <span>{Math.round((yieldConfig.scrapMerchantRatio || 0.75) * 100)}%</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                            <div style={{ fontSize: '1.22rem', fontWeight: 900, color: yieldConfig.includeSalvagedFleet ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: '-0.02em' }}>
                                                {formatNumber(yieldBreakdown.expShipDailyMSU)}
                                            </div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>MSU/d</span>
                                            {yieldConfig.includeSalvagedFleet && yieldConfig.scrapMerchantRatio < 1 && (
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginLeft: '2px' }}>
                                                    ({formatNumber(yieldBreakdown.rawExpShipDailyMSU)} raw)
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* COMBAT PROFITS */}
                                    <div
                                        className="glass-hover"
                                        onClick={() => setActiveModal('combats')}
                                        style={{
                                            padding: '12px 14px',
                                            background: yieldConfig.includeCombatProfits ? 'linear-gradient(135deg, rgba(14, 23, 38, 0.85) 0%, rgba(8, 14, 24, 0.95) 100%)' : 'rgba(255, 255, 255, 0.015)',
                                            border: yieldConfig.includeCombatProfits ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                                            boxShadow: yieldConfig.includeCombatProfits ? '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 16px rgba(239, 68, 68, 0.04)' : 'none',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            borderRadius: '14px',
                                            opacity: yieldConfig.includeCombatProfits ? 1 : 0.45,
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: '68px'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', left: 0, top: '15%', height: '70%', width: '3.5px', borderRadius: '0 2px 2px 0', background: yieldConfig.includeCombatProfits ? '#ef4444' : 'rgba(255,255,255,0.2)', boxShadow: yieldConfig.includeCombatProfits ? '0 0 8px rgba(239, 68, 68, 0.6)' : 'none' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setYieldConfig({ includeCombatProfits: !yieldConfig.includeCombatProfits });
                                                    }}
                                                    title={yieldConfig.includeCombatProfits ? "Exclude Combat Profits from Empire Daily Yield" : "Include Combat Profits in Empire Daily Yield"}
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '4px',
                                                        border: yieldConfig.includeCombatProfits ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.25)',
                                                        background: yieldConfig.includeCombatProfits ? 'rgba(239, 68, 68, 0.22)' : 'rgba(255,255,255,0.03)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: yieldConfig.includeCombatProfits ? '0 0 8px rgba(239, 68, 68, 0.55)' : 'none'
                                                    }}
                                                >
                                                    {yieldConfig.includeCombatProfits && <Check size={11} color="#ef4444" strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: '0.64rem', color: yieldConfig.includeCombatProfits ? '#ef4444' : 'rgba(255,255,255,0.5)', fontWeight: 900, letterSpacing: '0.04em' }}>COMBAT PROFITS</span>
                                            </div>
                                            {!yieldConfig.includeCombatProfits && (
                                                <span style={{ fontSize: '0.52rem', fontWeight: 900, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.35)', letterSpacing: '0.04em' }}>OFF</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <div style={{ fontSize: '1.22rem', fontWeight: 900, color: yieldConfig.includeCombatProfits ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: '-0.02em' }}>
                                                {formatNumber(yieldBreakdown.rawCombatDailyMSU)}
                                            </div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>MSU/d</span>
                                        </div>
                                    </div>

                                    {/* DEBRIS FIELDS */}
                                    <div
                                        className="glass-hover"
                                        onClick={() => setActiveModal('debris')}
                                        style={{
                                            padding: '12px 14px',
                                            background: yieldConfig.includeDebrisFields ? 'linear-gradient(135deg, rgba(14, 23, 38, 0.85) 0%, rgba(8, 14, 24, 0.95) 100%)' : 'rgba(255, 255, 255, 0.015)',
                                            border: yieldConfig.includeDebrisFields ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                                            boxShadow: yieldConfig.includeDebrisFields ? '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 16px rgba(234, 179, 8, 0.04)' : 'none',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            borderRadius: '14px',
                                            opacity: yieldConfig.includeDebrisFields ? 1 : 0.45,
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: '68px'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', left: 0, top: '15%', height: '70%', width: '3.5px', borderRadius: '0 2px 2px 0', background: yieldConfig.includeDebrisFields ? '#eab308' : 'rgba(255,255,255,0.2)', boxShadow: yieldConfig.includeDebrisFields ? '0 0 8px rgba(234, 179, 8, 0.6)' : 'none' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setYieldConfig({ includeDebrisFields: !yieldConfig.includeDebrisFields });
                                                    }}
                                                    title={yieldConfig.includeDebrisFields ? "Exclude Debris Fields from Empire Daily Yield" : "Include Debris Fields in Empire Daily Yield"}
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '4px',
                                                        border: yieldConfig.includeDebrisFields ? '1.5px solid #eab308' : '1px solid rgba(255,255,255,0.25)',
                                                        background: yieldConfig.includeDebrisFields ? 'rgba(234, 179, 8, 0.22)' : 'rgba(255,255,255,0.03)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: yieldConfig.includeDebrisFields ? '0 0 8px rgba(234, 179, 8, 0.55)' : 'none'
                                                    }}
                                                >
                                                    {yieldConfig.includeDebrisFields && <Check size={11} color="#eab308" strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: '0.64rem', color: yieldConfig.includeDebrisFields ? '#eab308' : 'rgba(255,255,255,0.5)', fontWeight: 900, letterSpacing: '0.04em' }}>DEBRIS FIELDS</span>
                                            </div>
                                            {!yieldConfig.includeDebrisFields && (
                                                <span style={{ fontSize: '0.52rem', fontWeight: 900, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.35)', letterSpacing: '0.04em' }}>OFF</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <div style={{ fontSize: '1.22rem', fontWeight: 900, color: yieldConfig.includeDebrisFields ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: '-0.02em' }}>
                                                {formatNumber(yieldBreakdown.rawDebrisDailyMSU)}
                                            </div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>MSU/d</span>
                                        </div>
                                    </div>

                                    {/* TOTAL AVG */}
                                    <div
                                        className="glass-hover"
                                        onClick={() => setActiveModal('total')}
                                        style={{
                                            padding: '12px 14px',
                                            background: 'linear-gradient(135deg, rgba(16, 26, 44, 0.9) 0%, rgba(10, 18, 30, 0.95) 100%)',
                                            border: '1px solid rgba(0, 242, 255, 0.3)',
                                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 16px rgba(0, 242, 255, 0.08)',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            borderRadius: '14px',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: '68px'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', left: 0, top: '15%', height: '70%', width: '3.5px', borderRadius: '0 2px 2px 0', background: '#00f2ff', boxShadow: '0 0 10px rgba(0, 242, 255, 0.8)' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '0.64rem', color: '#fff', fontWeight: 900, opacity: 0.95, letterSpacing: '0.05em' }}>TOTAL DAILY</span>
                                            <span style={{
                                                fontSize: '0.55rem',
                                                fontWeight: 900,
                                                padding: '2px 7px',
                                                borderRadius: '4px',
                                                background: activeCount === 5 ? 'rgba(0, 242, 255, 0.16)' : 'rgba(245, 158, 11, 0.16)',
                                                border: activeCount === 5 ? '1px solid rgba(0, 242, 255, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                                color: activeCount === 5 ? '#00f2ff' : '#fbbf24',
                                                letterSpacing: '0.04em'
                                            }}>
                                                {activeCount}/5 ACTIVE
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 0 12px rgba(0, 242, 255, 0.3)' }}>
                                                {formatNumber(totalRevenue)}
                                            </div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: THEME_CYAN }}>MSU/d</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </BentoCard>

                {/* Lifeform Summary - THE CIVILIZATION HUB */}
                <BentoCard
                    title="Lifeform Hub"
                    icon={<ThemeIcon name="leaf" size={18} />}
                    gridArea="1 / 6 / 3 / 13"
                >
                    {!lfStats ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                            No Lifeform data found
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', position: 'relative' }}>
                            {/* DOMINANT SPECIES COMMAND BANNER */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '22px',
                                padding: '16px 20px',
                                background: 'linear-gradient(135deg, rgba(14, 23, 38, 0.8) 0%, rgba(8, 14, 24, 0.9) 100%)',
                                borderRadius: '16px',
                                border: '1px solid rgba(0, 242, 255, 0.18)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Ambient Glow */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-40%',
                                    right: '-10%',
                                    width: '180px',
                                    height: '180px',
                                    background: 'radial-gradient(circle, rgba(0, 242, 255, 0.12) 0%, transparent 70%)',
                                    pointerEvents: 'none'
                                }} />

                                {/* Dominant Species Avatar */}
                                <div style={{ position: 'relative', width: '82px', height: '82px', flexShrink: 0 }}>
                                    <div style={{
                                        position: 'absolute',
                                        inset: -4,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #00F2FF, #43D159, #BD00FF)',
                                        opacity: 0.35,
                                        filter: 'blur(8px)'
                                    }} />
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '2px solid rgba(0, 242, 255, 0.4)',
                                        boxShadow: '0 0 20px rgba(0, 242, 255, 0.25)',
                                        background: '#060b14',
                                        position: 'relative',
                                        zIndex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <img
                                            src={`icons/lifeforms/${lfStats.domSpecies.toLowerCase().replace(/['’‘`\s]/g, "")}-icon-large.jpg`}
                                            alt={lfStats.domSpecies}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { (e.target as any).src = 'icons/lifeforms/humans-icon-large.jpg'; }}
                                        />
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: -2,
                                        right: -2,
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: '#060b14',
                                        border: '1.5px solid rgba(0, 242, 255, 0.4)',
                                        boxShadow: '0 0 10px rgba(0, 242, 255, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 2
                                    }}>
                                        <Globe size={14} color={THEME_CYAN} />
                                    </div>
                                </div>

                                {/* Dominant Species Text & Badges */}
                                <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                                    <div style={{
                                        fontSize: '0.68rem',
                                        color: 'rgba(255,255,255,0.55)',
                                        fontWeight: 900,
                                        letterSpacing: '0.14em',
                                        textTransform: 'uppercase',
                                        marginBottom: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#43D159', boxShadow: '0 0 8px #43D159' }} />
                                        DOMINANT SPECIES
                                    </div>
                                    <div style={{
                                        fontSize: '1.85rem',
                                        fontWeight: 900,
                                        color: '#ffffff',
                                        letterSpacing: '0.01em',
                                        lineHeight: 1.1,
                                        fontFamily: 'var(--font-title, sans-serif)',
                                        textShadow: '0 0 20px rgba(0, 242, 255, 0.25)'
                                    }}>
                                        {lfStats.domSpecies}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                                        <div style={{
                                            background: 'rgba(67, 209, 89, 0.12)',
                                            border: '1px solid rgba(67, 209, 89, 0.35)',
                                            padding: '3px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.68rem',
                                            fontWeight: 900,
                                            color: '#43D159',
                                            letterSpacing: '0.04em',
                                            boxShadow: '0 0 10px rgba(67, 209, 89, 0.15)'
                                        }}>
                                            {lfStats.coverage}% COLONY COVERAGE
                                        </div>
                                        <div style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            padding: '3px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            color: 'rgba(255, 255, 255, 0.85)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            <Box size={12} color="rgba(0, 242, 255, 0.7)" />
                                            <span>{lfStats.totalBuildings.toLocaleString()} STRUCTURES</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2X2 SPECIES EVOLUTION & MASTERY MATRIX */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                                <div style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 900,
                                    color: 'rgba(255, 255, 255, 0.55)',
                                    letterSpacing: '0.12em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <span>SPECIES EVOLUTION & MASTERY</span>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>4 SPECIES REGISTERED</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                    {[1, 2, 3, 4].map(id => {
                                        const species = safeArray(lifeformSpecies).find((s: any) => s.lifeformId === id);
                                        const experience = safeArray(activeAccount?.lifeformExperience).find((e: any) => e.lifeformId === id || e.id === id);
                                        const name = species?.lifeformName || (id === 1 ? 'Humans' : id === 2 ? "Rock'tal" : id === 3 ? 'Mechas' : 'Kaelesh');
                                        const slug = id === 1 ? 'humans' : id === 2 ? 'rocktal' : id === 3 ? 'mechas' : 'kaelesh';

                                        const level = experience?.level || 0;
                                        const progress = level >= 100 ? 100 : (experience && experience.nextLevelExp > 0 ? (experience.currentExp / experience.nextLevelExp) * 100 : 0);

                                        const colors: Record<number, string> = {
                                            1: '#43D159', // Humans - Green
                                            2: '#f97316', // Rock'tal - Volcanic Orange
                                            3: '#00F2FF', // Mechas - Cyan
                                            4: '#BD00FF'  // Kaelesh - Magenta
                                        };
                                        const color = colors[id];
                                        const isActive = level > 0;

                                        return (
                                            <div
                                                key={id}
                                                className="glass-hover"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px 14px',
                                                    background: isActive ? 'linear-gradient(135deg, rgba(14, 22, 36, 0.8) 0%, rgba(8, 14, 24, 0.9) 100%)' : 'rgba(255, 255, 255, 0.015)',
                                                    borderRadius: '14px',
                                                    border: `1px solid ${isActive ? `${color}44` : 'rgba(255, 255, 255, 0.05)'}`,
                                                    boxShadow: isActive ? `0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 16px ${color}11` : 'none',
                                                    opacity: isActive ? 1 : 0.45,
                                                    transition: 'all 0.2s ease',
                                                    minHeight: '66px'
                                                }}
                                            >
                                                {/* Species Avatar Thumbnail */}
                                                <div style={{
                                                    position: 'relative',
                                                    width: '42px',
                                                    height: '42px',
                                                    borderRadius: '10px',
                                                    overflow: 'hidden',
                                                    border: `1.5px solid ${isActive ? color : 'rgba(255,255,255,0.1)'}`,
                                                    boxShadow: isActive ? `0 0 10px ${color}55` : 'none',
                                                    flexShrink: 0,
                                                    background: '#060b14'
                                                }}>
                                                    <img
                                                        src={`icons/lifeforms/${slug}-icon-large.jpg`}
                                                        alt={name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => { (e.target as any).src = 'icons/lifeforms/humans-icon-large.jpg'; }}
                                                    />
                                                </div>

                                                {/* Species Info & Progress */}
                                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#fff', letterSpacing: '0.04em' }}>
                                                            {name.toUpperCase()}
                                                        </span>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 900,
                                                            color: color,
                                                            display: 'flex',
                                                            alignItems: 'baseline',
                                                            gap: '3px'
                                                        }}>
                                                            <span style={{ opacity: 0.55, fontSize: '0.55rem', color: '#fff', fontWeight: 700 }}>LVL</span>
                                                            <span>{level}</span>
                                                        </div>
                                                    </div>

                                                    {/* 6px Glowing Energy Conduit Progress Bar */}
                                                    <div style={{
                                                        height: '6px',
                                                        background: 'rgba(255, 255, 255, 0.06)',
                                                        borderRadius: '3px',
                                                        overflow: 'hidden',
                                                        position: 'relative'
                                                    }}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                                            style={{
                                                                height: '100%',
                                                                background: `linear-gradient(90deg, ${color}88, ${color})`,
                                                                boxShadow: `0 0 10px ${color}`,
                                                                borderRadius: '3px'
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Status line */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: isActive ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.25)' }}>
                                                            {level >= 100
                                                                ? 'MAX LEVEL'
                                                                : isActive
                                                                    ? `${progress.toFixed(1)}% TO LVL ${level + 1}`
                                                                    : 'DORMANT'}
                                                        </span>
                                                        {level >= 100 && (
                                                            <span style={{
                                                                fontSize: '0.52rem',
                                                                fontWeight: 900,
                                                                color: '#fbbf24',
                                                                background: 'rgba(251, 191, 36, 0.15)',
                                                                padding: '1px 5px',
                                                                borderRadius: '3px',
                                                                border: '1px solid rgba(251, 191, 36, 0.35)',
                                                                letterSpacing: '0.04em'
                                                            }}>
                                                                MASTERED
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
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
                    icon={<ThemeIcon name="bar-chart" size={18} />}
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
                icon={<ThemeIcon name="city-buildings" size={28} />}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
                    {/* TOP CHART BAR */}
                    <div className="glass" style={{ gridColumn: 'span 12', padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '24px', height: '400px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: '24px', letterSpacing: '0.1em' }}>DISTRIBUTION BY PLANET (MSU)</div>
                        <ResponsiveContainer width="100%" height="85%" minWidth={0} minHeight={0}>
                            <BarChart data={planets.filter(p => p.type === 'planet').map(p => ({
                                name: p.name,
                                msu: calcResults?.planets[p.id] ? (calcResults.planets[p.id].total.metal * mMultiplier) + (calcResults.planets[p.id].total.crystal * cMultiplier) + (calcResults.planets[p.id].total.deuterium * dMultiplier) : 0
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
                                            {calcResults?.planets[p.id] ? `${formatNumber(calcResults.planets[p.id].total.metal)}/h` : 'N/A'}
                                        </div>
                                    </div>

                                    {/* CRYSTAL */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src="icons/resources/crystal_mine_medium.jpg" alt="C" style={{ width: '18px', height: '18px', borderRadius: '3px' }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>{p.crystalMine || 0}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: RESOURCE_COLORS.crystal }}>
                                            {calcResults?.planets[p.id] ? `${formatNumber(calcResults.planets[p.id].total.crystal)}/h` : 'N/A'}
                                        </div>
                                    </div>

                                    {/* DEUTERIUM */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src="icons/resources/deuterium_mine_medium.jpg" alt="D" style={{ width: '18px', height: '18px', borderRadius: '3px' }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>{p.deuteriumMine || 0}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: RESOURCE_COLORS.deuterium }}>
                                            {calcResults?.planets[p.id] ? `${formatNumber(calcResults.planets[p.id].total.deuterium)}/h` : 'N/A'}
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
                icon={<ThemeIcon name="navigation" size={28} />}
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
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '12px', fontSize: '0.8rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
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
                icon={<ThemeIcon name="rocket" size={28} />}
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
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(189,0,255,0.2)', borderRadius: '12px', fontSize: '0.8rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
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
                icon={<ThemeIcon name="sword" size={28} />}
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
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', fontSize: '0.8rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
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
                icon={<ThemeIcon name="debris-field" size={28} />}
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
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '12px', fontSize: '0.8rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
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
                                contentStyle={{ background: '#0a141e', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '12px', fontSize: '0.8rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
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

            {/* SCRAP MERCHANT SETTINGS MODAL */}
            <Modal
                isOpen={isScrapModalOpen}
                onClose={() => setIsScrapModalOpen(false)}
                title="Scrap Merchant Settings"
                icon={<Settings size={28} />}
            >
                {(() => {
                    const yieldBreakdown = calculateTotalEmpireDailyYield({
                        activeAccount,
                        planets,
                        expeditions,
                        combatReports,
                        debrisHarvests,
                        rates,
                        yieldConfig
                    });
                    const rawExpShip = yieldBreakdown.rawExpShipDailyMSU;
                    const previewYield = rawExpShip * (scrapPercentInput / 100);
                    const diffMSU = rawExpShip - previewYield;

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
                            {/* EXPLANATION */}
                            <div style={{
                                background: 'rgba(189, 0, 255, 0.05)',
                                border: '1px solid rgba(189, 0, 255, 0.2)',
                                borderRadius: '16px',
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#e879f9', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ThemeIcon name="tools" size={18} />
                                    Scrap Merchant Yield Recovery
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.5 }}>
                                    Ships found during expeditions can be converted into resources at the Scrap Merchant. The unboosted rate starts at <strong>35% base</strong> and can reach up to <strong>100%</strong> with event or premium items.
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4 }}>
                                    We recommend using a comfortable percentage that you usually scrap at to accurately reflect your true daily income. This calculation applies globally across all OGame Nexus planners and yield displays.
                                </div>
                            </div>

                            {/* RATE SELECTOR WITH PRESETS */}
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '16px',
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
                                        AVERAGE SCRAP MERCHANT RATE
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#e879f9', letterSpacing: '-0.02em' }}>
                                            {scrapPercentInput}
                                        </span>
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#e879f9' }}>%</span>
                                    </div>
                                </div>

                                {/* PRESET BUTTONS */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                    {[
                                        { label: '35% (Base)', value: 35 },
                                        { label: '75% (Standard)', value: 75 },
                                        { label: '85% (Boosted)', value: 85 },
                                        { label: '100% (Event/Max)', value: 100 }
                                    ].map(preset => {
                                        const isSelected = scrapPercentInput === preset.value;
                                        return (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setScrapPercentInput(preset.value)}
                                                style={{
                                                    padding: '10px 8px',
                                                    borderRadius: '10px',
                                                    border: isSelected ? '1px solid #bd00ff' : '1px solid rgba(255, 255, 255, 0.1)',
                                                    background: isSelected ? 'rgba(189, 0, 255, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                                    color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                                                    fontWeight: isSelected ? 800 : 600,
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: isSelected ? '0 0 12px rgba(189, 0, 255, 0.3)' : 'none'
                                                }}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* RANGE SLIDER */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                                    <input
                                        type="range"
                                        min={35}
                                        max={100}
                                        step={1}
                                        value={scrapPercentInput}
                                        onChange={(e) => setScrapPercentInput(Number(e.target.value))}
                                        style={{
                                            width: '100%',
                                            accentColor: '#bd00ff',
                                            cursor: 'pointer',
                                            height: '6px'
                                        }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 700 }}>
                                        <span style={{ color: scrapPercentInput === 35 ? '#e879f9' : 'inherit' }}>35% (Base)</span>
                                        <span>50%</span>
                                        <span style={{ color: scrapPercentInput === 75 ? '#e879f9' : 'inherit' }}>75% (Standard)</span>
                                        <span style={{ color: scrapPercentInput === 85 ? '#e879f9' : 'inherit' }}>85% (Boosted)</span>
                                        <span style={{ color: scrapPercentInput === 100 ? '#e879f9' : 'inherit' }}>100% (Event/Max)</span>
                                    </div>
                                </div>
                            </div>

                            {/* LIVE IMPACT SUMMARY */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '16px',
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Daily Impact Preview
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Raw Recovered Fleet Value (100%):</span>
                                    <span style={{ fontWeight: 800, color: '#fff' }}>{formatNumber(rawExpShip)} MSU/d</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Scrap Merchant Multiplier:</span>
                                    <span style={{ fontWeight: 800, color: '#e879f9' }}>× {scrapPercentInput}%</span>
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '2px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                                    <span style={{ fontWeight: 800, color: '#fff' }}>Counted Towards Daily Yield:</span>
                                    <span style={{ fontWeight: 900, color: THEME_CYAN, fontSize: '1.1rem' }}>
                                        {formatNumber(previewYield)} MSU/d
                                    </span>
                                </div>
                                {diffMSU > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                                        <span>Excluded Scrap Margin:</span>
                                        <span>-{formatNumber(diffMSU)} MSU/d</span>
                                    </div>
                                )}
                            </div>

                            {/* MODAL ACTIONS */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setScrapPercentInput(75)}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Reset to Default (75%)
                                </button>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsScrapModalOpen(false)}
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.82rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setYieldConfig({ scrapMerchantRatio: scrapPercentInput / 100 });
                                            setIsScrapModalOpen(false);
                                        }}
                                        style={{
                                            padding: '10px 24px',
                                            borderRadius: '10px',
                                            border: '1px solid #bd00ff',
                                            background: 'linear-gradient(135deg, rgba(189, 0, 255, 0.4) 0%, rgba(189, 0, 255, 0.2) 100%)',
                                            color: '#fff',
                                            fontWeight: 800,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            boxShadow: '0 0 20px rgba(189, 0, 255, 0.35)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        Save & Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

        </div>
    );
};

export default Overview;
