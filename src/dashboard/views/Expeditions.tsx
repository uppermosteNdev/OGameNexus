import React, { useMemo, useState, useEffect } from 'react';
import { SHIP_DATA } from '../../db/staticData';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    Star,
    Activity,
    Database,
    Ship,
    Moon,
    Package,
    Info,
    Search,
    Box,
    Award,
    Trophy,
    Zap,
    Target,
    ArrowUpRight,
    User,
    Globe,
    Cloud,
    Loader2,
    Check
} from 'lucide-react';
import { LIFEFORM_TECH_DATA } from '../../db/lifeformTechData';
import { getLinkedAccount, uploadToDrive } from '../../utils/googleAuth';

// --- Constants ---

const THEME_CYAN = '#0062ff'; // Vibrant blue/cyan for primary active elements

const CATEGORIES = [
    { id: 'noEvent', label: 'No Event', color: '#4b5563', key: 'nothing' },
    { id: 'resources', label: 'Resources', color: '#2563eb', key: 'resources' },
    { id: 'ships', label: 'Ships', color: '#f8fafc', key: 'ships' },
    { id: 'delay', label: 'Delay', color: '#ea580c', key: 'delay' },
    { id: 'speedup', label: 'Speedup', color: '#16a34a', key: 'speedup' },
    { id: 'darkMatter', label: 'Dark Matter', color: '#06b6d4', key: 'darkmatter' },
    { id: 'combat', label: 'Combat', color: '#fca5a5', key: 'combat' },
    { id: 'item', label: 'Item', color: '#8b5cf6', key: 'item' },
    { id: 'trader', label: 'Trader', color: '#eab308', key: 'trader' },
    { id: 'lostFleet', label: 'Lost Fleet', color: '#dc2626', key: 'fleetloss' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const RESOURCE_COLORS = {
    metal: '#E6953C',
    crystal: '#4CAEE6',
    deuterium: '#43D159',
    total: '#fff'
};

const RARITY_COLORS = {
    common: '#6b7280',
    rare: '#3b82f6',
    epic: '#ec4899'
};

const DEPLETION_LEVELS = [
    { id: 1, label: 'Pristine', color: '#22c55e' },
    { id: 2, label: 'Good', color: '#eab308' },
    { id: 3, label: 'Moderate', color: '#f97316' },
    { id: 4, label: 'High', color: '#ef4444' },
    { id: 5, label: 'Depleted', color: '#dc2626' },
];

// --- Helpers ---

const getExpeditionCategory = (exp: any): CategoryId | null => {
    const res = (exp.result || '').toLowerCase().trim();
    if (res === 'nothing' || res === 'none') return 'noEvent';
    if (res === 'resources' || res === 'ressources') return 'resources';
    if (res === 'shipwrecks' || res === 'ships') return 'ships';
    if (res === 'darkmatter') return 'darkMatter';
    if (res === 'trader') return 'trader';
    if (res === 'fleetloss' || res === 'lostfleet' || res === 'fleetlost') return 'lostFleet';
    if (res === 'item' || res === 'items') return 'item';
    if (res.includes('combat') || res === '0' || res === 'aliens' || res === 'pirates') return 'combat';

    const isNav = res.includes('navigation') || res === 'delay' || res === 'speedup' || res === 'early';
    if (isNav) {
        const shift = exp.resultDetails?.returnTimeAbsoluteIncreaseHours ?? 0;
        const multiplier = exp.resultDetails?.returnTimeMultiplier;
        const hasMultiplier = multiplier !== undefined;
        if (res === 'delay' || (res.includes('navigation') && (shift > 0 || (hasMultiplier && multiplier >= 1)))) return 'delay';
        return 'speedup';
    }

    return null;
};

const toLocaleDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getStartOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const formatYAxis = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1e12) return (value / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
    if (absValue >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (absValue >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (absValue >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return value.toString();
};

// --- Component: CustomTooltip ---

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const hasMSU = payload.some((entry: any) => entry.dataKey === 'msu');
        const msuEntry = payload.find((entry: any) => entry.dataKey === 'msu');
        const regularPayload = payload.filter((entry: any) => entry.dataKey !== 'msu');

        // Total should only sum regular entries (no aggregated metrics like MSU)
        const total = regularPayload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);

        // Sum metal, crystal, deuterium across the whole data point to get Resource Units
        const rawData = payload[0].payload;
        const resourceUnits = (Number(rawData.metal) || 0) + (Number(rawData.crystal) || 0) + (Number(rawData.deuterium) || 0);

        return (
            <div className="glass" style={{
                padding: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                background: 'rgba(6, 11, 20, 0.95)',
                minWidth: '280px',
                pointerEvents: 'none'
            }}>
                <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    {label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {regularPayload.map((entry: any) => (
                        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: entry.color || entry.fill }} />
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{entry.name}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: '#fff', paddingLeft: '20px' }}>{Math.floor(Number(entry.value) || 0).toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                {!hasMSU ? (
                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', fontWeight: 700, color: THEME_CYAN, display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                        <span>Total</span>
                        <span style={{ color: '#fff', paddingLeft: '20px' }}>{Math.floor(total).toLocaleString()}</span>
                    </div>
                ) : (
                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: THEME_CYAN }}>
                            <span>Resource Units</span>
                            <span style={{ color: '#fff', paddingLeft: '20px' }}>{Math.floor(resourceUnits).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: THEME_CYAN }}>
                            <span>Resource Units (MSU)</span>
                            <span style={{ color: '#fff', paddingLeft: '20px' }}>{Math.floor(Number(msuEntry.value) || 0).toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

// --- Table Components ---

const GenericExpeditionTable: React.FC<{
    expeditions: any[],
    rows: { label: string, color?: string, icon?: any, calc: (exp: any) => number }[],
    footer?: { label: string, calc: (rowValues: number[]) => number }[],
    showPerDay?: boolean,
    showPercent?: boolean
}> = ({ expeditions, rows, footer, showPerDay = true, showPercent = true }) => {
    const now = new Date();
    const today = getStartOfDay(now);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    const day = today.getDay() || 7;
    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - (day - 1));
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const monthStart = new Date(today); monthStart.setDate(1);
    const lastMonthStart = new Date(monthStart); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(monthStart);

    const ytdStart = new Date(today.getFullYear(), 0, 1);

    const firstExpDate = expeditions.length > 0 ? new Date(Math.min(...expeditions.map(e => e.timestamp)) * 1000) : today;
    const startOfFirstExp = getStartOfDay(firstExpDate);

    const buckets = [
        { label: 'Today', filter: (d: Date) => d >= today },
        { label: 'Yesterday', filter: (d: Date) => d >= yesterday && d < today },
        { label: 'Current Week', filter: (d: Date) => d >= weekStart },
        { label: 'Last Week', filter: (d: Date) => d >= lastWeekStart && d < weekStart },
        { label: 'Current Month', filter: (d: Date) => d >= monthStart },
        { label: 'Last Month', filter: (d: Date) => d >= lastMonthStart && d < lastMonthEnd },
        { label: 'YTD (Year-to-date)', filter: (d: Date) => d >= ytdStart },
    ];

    const totalDays = Math.max(1, Math.round((today.getTime() - startOfFirstExp.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const data = rows.map(rowDef => {
        const row: any = { label: rowDef.label, color: rowDef.color, icon: rowDef.icon, total: 0 };
        buckets.forEach(b => row[b.label] = 0);

        expeditions.forEach(exp => {
            const date = new Date(exp.timestamp * 1000);
            const val = rowDef.calc(exp);
            if (val > 0) {
                row.total += val;
                buckets.forEach(b => {
                    if (b.filter(date)) row[b.label] += val;
                });
            }
        });

        row.perDay = Math.floor(row.total / totalDays).toLocaleString();

        // Calculate total for percentage across ALL rows
        let allExpsTotal = 0;
        expeditions.forEach(exp => {
            rows.forEach(r => allExpsTotal += r.calc(exp));
        });
        row.percent = allExpsTotal > 0 ? ((row.total / allExpsTotal) * 100).toFixed(3) : 0;

        return row;
    });

    const footerData = footer?.map(fDef => {
        const row: any = { label: fDef.label, isFooter: true, total: 0 };
        buckets.forEach(b => {
            const valsInBucket = data.map(r => r[b.label]);
            row[b.label] = fDef.calc(valsInBucket);
        });

        const allTotals = data.map(r => r.total);
        row.total = fDef.calc(allTotals);

        row.perDay = Math.floor(row.total / totalDays).toLocaleString();
        row.percent = '100';
        return row;
    }) || [];

    const allDisplayRows = [...data, ...footerData];

    return (
        <div style={{ overflowX: 'auto', padding: '0 12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.8rem' }}>
                <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Event Type</th>
                        {buckets.map(b => <th key={b.label} style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: '90px' }}>{b.label}</th>)}
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>Total</th>
                        {showPerDay && <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>ø per day</th>}
                        {showPercent && <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>%</th>}
                    </tr>
                </thead>
                <tbody>
                    {allDisplayRows.map((row, idx) => (
                        <tr key={idx} className={row.isFooter ? "" : "hover-highlight"} style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: row.isFooter ? 'rgba(255,255,255,0.02)' : 'transparent',
                            fontWeight: row.isFooter ? 700 : 400
                        }}>
                            <td style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {row.color && <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: row.color }} />}
                                {row.label}
                            </td>
                            {buckets.map(b => (
                                <td key={b.label} style={{ textAlign: 'right', padding: '10px 12px', opacity: row[b.label] > 0 ? 1 : 0.3 }}>
                                    {Math.floor(row[b.label]).toLocaleString()}
                                </td>
                            ))}
                            <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>
                                {Math.floor(row.total).toLocaleString()}
                            </td>
                            {showPerDay && <td style={{ textAlign: 'right', padding: '10px 12px', color: THEME_CYAN }}>{row.perDay}</td>}
                            {showPercent && <td style={{ textAlign: 'right', padding: '10px 12px', color: 'rgba(255,255,255,0.5)' }}>{row.percent}%</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
            <style>{`
                .hover-highlight:hover { background: rgba(255,255,255,0.05); }
            `}</style>
        </div>
    );
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
    { label: '< 10,000 Points (40k Base)', value: 40000 },
    { label: '< 100,000 Points (500k Base)', value: 500000 },
    { label: '< 1,000,000 Points (1.2M Base)', value: 1200000 },
    { label: '< 5,000,000 Points (1.8M Base)', value: 1800000 },
    { label: '< 25,000,000 Points (2.4M Base)', value: 2400000 },
    { label: '< 50,000,000 Points (3M Base)', value: 3000000 },
    { label: '< 75,000,000 Points (3.6M Base)', value: 3600000 },
    { label: '< 100,000,000 Points (4.2M Base)', value: 4200000 },
    { label: '> 100,000,000 Points (5M Base)', value: 5000000 },
];

// --- Main Component ---

const Expeditions: React.FC = () => {
    const activeAccount = useLiveQuery(
        async () => {
            try {
                return await db.accounts.orderBy('lastSeen').reverse().first();
            } catch (e) {
                return await db.accounts.toCollection().last();
            }
        }
    );

    const expeditions = useLiveQuery(
        () => activeAccount ? db.expeditions.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    const settings = useLiveQuery(() => db.settings.get('conversion_rates'));
    const knowledge = useLiveQuery(() => db.gameKnowledge.where('category').equals('ships').toArray()) || [];
    const rates = settings || { metal: 3, crystal: 2, deuterium: 1 };

    // Multipliers for MSU: Metal base (1.0). Multiplier = MetalRate / OtherRate
    const mMultiplier = 1;
    const cMultiplier = rates.metal / rates.crystal;
    const dMultiplier = rates.metal / rates.deuterium;

    const [activeTab, setActiveTab] = useState('overview');
    const [subTab, setSubTab] = useState('none');

    // Support deep-linking from Hotbar
    useEffect(() => {
        const checkPending = () => {
            const pending = sessionStorage.getItem('ognexus_target_subview');
            if (pending) {
                try {
                    const { view, tab } = JSON.parse(pending);
                    if (view === 'expeditions' && tab) {
                        setActiveTab(tab);
                        sessionStorage.removeItem('ognexus_target_subview');
                    }
                } catch (e) {
                    console.error('Failed to parse target subview:', e);
                }
            }
        };
        checkPending();

        const handleNav = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail && detail.view === 'expeditions' && detail.tab) {
                setActiveTab(detail.tab);
            }
        };
        window.addEventListener('ognexus_navigated', handleNav);
        return () => {
            window.removeEventListener('ognexus_navigated', handleNav);
        };
    }, []);

    const [viewMode, setViewMode] = useState<'chart' | 'table' | 'calculator'>('chart');
    const [selectedHallOfFameShip, setSelectedHallOfFameShip] = useState<number>(204); // Default to Light Fighter
    const [selectedSalvageRecord, setSelectedSalvageRecord] = useState<any>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error' | 'not-linked'>('idle');

    const handleBackup = async () => {
        const account = await getLinkedAccount();
        if (!account) {
            setBackupStatus('not-linked');
            setTimeout(() => setBackupStatus('idle'), 3000);
            return;
        }

        setIsBackingUp(true);
        try {
            const data = await db.expeditions.toArray();
            const json = JSON.stringify({
                version: '1.0',
                type: 'expeditions_backup',
                timestamp: Date.now(),
                account: account.email,
                data: data
            }, null, 2);

            const fileName = `OGNexus_Expeditions_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const result = await uploadToDrive(fileName, json);

            if (result) {
                setBackupStatus('success');
            } else {
                setBackupStatus('error');
            }
        } catch (e) {
            console.error(e);
            setBackupStatus('error');
        } finally {
            setIsBackingUp(false);
            setTimeout(() => setBackupStatus('idle'), 3000);
        }
    };

    const planets = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];
    const activePlanetId = useMemo(() => planets[0]?.id, [planets]);

    // Active expedition boosters
    const activeExpeditionBoosters = useMemo(() => {
        const map = new Map<string, any>();
        planets.forEach(p => {
            if (p.activeItems && p.activeItems.length > 0) {
                p.activeItems.forEach(item => {
                    const title = (item.title || item.name || '').toLowerCase();
                    const isTarget = title.includes('expedition resource booster') || 
                                   title.includes('expedition computer') || 
                                   title.includes('expedition turbo');
                    
                    if (isTarget) {
                        const existing = map.get(title);
                        // Keep the one with the latest expiration (or first encountered if none have expiry)
                        if (!existing || (item.expiryTimestamp || 0) > (existing.expiryTimestamp || 0)) {
                            map.set(title, {
                                ...item,
                                planetName: p.name || 'Unknown',
                                coords: p.coords || ''
                            });
                        }
                    }
                });
            }
        });
        return Array.from(map.values());
    }, [planets]);

    const expeditionResBoosterPercent = useMemo(() => {
        let total = 0;
        activeExpeditionBoosters.forEach(item => {
            const title = (item.title || item.name || '').toLowerCase();
            if (title.includes('expedition resource booster')) {
                total += item.bonus || 0;
            }
        });
        return total;
    }, [activeExpeditionBoosters]);

    const theoreticalMax = useMemo(() => {
        if (!activeAccount || !planets) return null;

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

        const currentResBonus = getBonus(19);
        const currentClassBonus = getBonus(32);
        const currentShipBonus = getBonus(12);

        const ts = activeAccount.topScore || 0;
        let tp = 40000;
        if (ts < 10000) tp = 40000;
        else if (ts < 100000) tp = 500000;
        else if (ts < 1000000) tp = 1200000;
        else if (ts < 5000000) tp = 1800000;
        else if (ts < 25000000) tp = 2400000;
        else if (ts < 50000000) tp = 3000000;
        else if (ts < 75000000) tp = 3600000;
        else if (ts < 100000000) tp = 4200000;
        else tp = 5000000;

        const universeSpeed = activeAccount.universeSpeed || 1;

        // Multiplier logic assuming Pathfinder presence (doubles the base class bonus)
        let multiplier = 3 * universeSpeed; // Discoverer
        let className = 'Discoverer';

        if (activeAccount.playerClass === 1) { // Collector
            multiplier = 2;
            className = 'Collector';
        } else if (activeAccount.playerClass === 2) { // General
            multiplier = 1;
            className = 'General';
        }

        const limit = tp * multiplier;

        // Resource finds
        const resBonusFactor = 1 + (currentResBonus / 100);
        const classBonusFactor = 1 + (currentClassBonus / 100);
        const shipBonusFactor = 1 + (currentShipBonus / 100);

        // No cargo cap
        const baseMetal = Math.floor(limit * resBonusFactor * classBonusFactor);
        const baseCrystal = Math.floor(baseMetal / 2);
        const baseDeuterium = Math.floor(baseMetal / 3);

        const maxMetal = expeditionResBoosterPercent > 0 
            ? Math.floor(baseMetal * (1 + expeditionResBoosterPercent)) 
            : baseMetal;
        const maxCrystal = expeditionResBoosterPercent > 0 
            ? Math.floor(baseCrystal * (1 + expeditionResBoosterPercent)) 
            : baseCrystal;
        const maxDeuterium = expeditionResBoosterPercent > 0 
            ? Math.floor(baseDeuterium * (1 + expeditionResBoosterPercent)) 
            : baseDeuterium;

        const maxShipsSI = Math.floor(limit * shipBonusFactor);

        return { 
            maxMetal, 
            maxCrystal, 
            maxDeuterium, 
            maxShipsSI, 
            className,
            baseMetal,
            baseCrystal,
            baseDeuterium,
            boosterPercent: expeditionResBoosterPercent
        };
    }, [activeAccount, planets, expeditionResBoosterPercent]);

    const [visibleCategories, setVisibleCategories] = useState<Set<CategoryId>>(new Set(CATEGORIES.map(c => c.id)));
    const [visibleResources, setVisibleResources] = useState<Set<string>>(new Set(['metal', 'crystal', 'deuterium', 'msu']));
    const [visibleRarities, setVisibleRarities] = useState<Set<string>>(new Set(['common', 'rare', 'epic']));
    const [visibleShips, setVisibleShips] = useState<Set<number>>(new Set(SHIP_ITEMS.map(s => s.id)));
    const [visibleDepletion, setVisibleDepletion] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));

    const TABS = [
        { id: 'overview', label: 'Overview', icon: Activity, sub: [] },
        {
            id: 'resources', label: 'Resources', icon: Database,
            sub: [
                { id: 'amount', label: 'Amount' },
                { id: 'sizes', label: 'Sizes' },
                { id: 'count', label: 'Count' }
            ]
        },
        {
            id: 'ships', label: 'Ships', icon: Ship,
            sub: [
                { id: 'amount', label: 'Amount' },
                { id: 'sizes', label: 'Sizes' },
                { id: 'resourceUnits', label: 'Resource Units' }
            ]
        },
        { id: 'darkMatter', label: 'Dark Matter', icon: Moon, sub: [{ id: 'amount', label: 'Amount' }, { id: 'sizes', label: 'Sizes' }] },
        { id: 'items', label: 'Items', icon: Package, sub: [{ id: 'list', label: 'List' }] },
        { id: 'depletion', label: 'Depletion', icon: Search, sub: [{ id: 'status', label: 'Status' }] },
        { id: 'info', label: 'Info', icon: Info, sub: [] },
    ];

    const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];

    useEffect(() => {
        if (currentTab.sub.length > 0) {
            setSubTab(currentTab.sub[0].id);
        } else {
            setSubTab('none');
        }
    }, [activeTab]);

    const toggleCategory = (id: CategoryId) => {
        const next = new Set(visibleCategories);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setVisibleCategories(next);
    };

    const toggleResource = (id: string) => {
        const next = new Set(visibleResources);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setVisibleResources(next);
    };

    const toggleRarity = (id: string) => {
        const next = new Set(visibleRarities);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setVisibleRarities(next);
    };

    const toggleShip = (id: number) => {
        const next = new Set(visibleShips);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setVisibleShips(next);
    };

    // --- Data Processing for Charts ---
    const chartData = useMemo(() => {
        const dataMap: Record<string, Record<CategoryId, number>> = {};
        expeditions.forEach(exp => {
            const date = new Date(exp.timestamp * 1000);
            const dateKey = toLocaleDateKey(date);
            if (!dataMap[dateKey]) {
                dataMap[dateKey] = { noEvent: 0, resources: 0, ships: 0, delay: 0, speedup: 0, darkMatter: 0, combat: 0, item: 0, trader: 0, lostFleet: 0 };
            }
            const category = getExpeditionCategory(exp);
            if (category) dataMap[dateKey][category]++;
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { noEvent: 0, resources: 0, ships: 0, delay: 0, speedup: 0, darkMatter: 0, combat: 0, item: 0, trader: 0, lostFleet: 0 })
            });
        }
        return results;
    }, [expeditions]);

    const resourceAmountData = useMemo(() => {
        const dataMap: Record<string, { metal: number, crystal: number, deuterium: number, msu: number }> = {};
        expeditions.forEach(exp => {
            const dateKey = toLocaleDateKey(new Date(exp.timestamp * 1000));
            if (!dataMap[dateKey]) dataMap[dateKey] = { metal: 0, crystal: 0, deuterium: 0, msu: 0 };
            if (exp.resultDetails) {
                const m = exp.resultDetails.metal || 0;
                const c = exp.resultDetails.crystal || 0;
                const d = exp.resultDetails.deuterium || 0;
                dataMap[dateKey].metal += m;
                dataMap[dateKey].crystal += c;
                dataMap[dateKey].deuterium += d;
                dataMap[dateKey].msu += (m * mMultiplier) + (c * cMultiplier) + (d * dMultiplier);
            }
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { metal: 0, crystal: 0, deuterium: 0, msu: 0 })
            });
        }
        return results;
    }, [expeditions, mMultiplier, cMultiplier, dMultiplier]);

    const resourceSizeData = useMemo(() => {
        const dataMap: Record<string, { common: number, large: number, epic: number }> = {};
        expeditions.forEach(exp => {
            const dateKey = toLocaleDateKey(new Date(exp.timestamp * 1000));
            if (!dataMap[dateKey]) dataMap[dateKey] = { common: 0, large: 0, epic: 0 };
            if (getExpeditionCategory(exp) === 'resources') {
                const size = exp.size ?? 2;
                if (size === 0) dataMap[dateKey].epic++;
                else if (size === 1) dataMap[dateKey].large++;
                else dataMap[dateKey].common++;
            }
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { common: 0, large: 0, epic: 0 })
            });
        }
        return results;
    }, [expeditions]);

    const resourceCountData = useMemo(() => {
        const dataMap: Record<string, { metal: number, crystal: number, deuterium: number }> = {};
        expeditions.forEach(exp => {
            const dateKey = toLocaleDateKey(new Date(exp.timestamp * 1000));
            if (!dataMap[dateKey]) dataMap[dateKey] = { metal: 0, crystal: 0, deuterium: 0 };
            if (getExpeditionCategory(exp) === 'resources' && exp.resultDetails) {
                if (exp.resultDetails.metal) dataMap[dateKey].metal++;
                else if (exp.resultDetails.crystal) dataMap[dateKey].crystal++;
                else if (exp.resultDetails.deuterium) dataMap[dateKey].deuterium++;
            }
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { metal: 0, crystal: 0, deuterium: 0 })
            });
        }
        return results;
    }, [expeditions]);

    const shipAmountData = useMemo(() => {
        const dataMap: Record<string, Record<number, number>> = {};
        expeditions.forEach(exp => {
            const dateKey = toLocaleDateKey(new Date(exp.timestamp * 1000));
            if (!dataMap[dateKey]) {
                dataMap[dateKey] = {};
                SHIP_ITEMS.forEach(s => dataMap[dateKey][s.id] = 0);
            }
            if (getExpeditionCategory(exp) === 'ships' && exp.resultDetails) {
                Object.entries(exp.resultDetails).forEach(([id, data]: [string, any]) => {
                    const sid = parseInt(id);
                    if (dataMap[dateKey][sid] !== undefined) {
                        dataMap[dateKey][sid] += data.amount || 0;
                    }
                });
            }
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            const row: any = {
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })
            };
            SHIP_ITEMS.forEach(s => {
                row[s.id] = (dataMap[key] || {})[s.id] || 0;
            });
            results.push(row);
        }
        return results;
    }, [expeditions]);

    const shipSizeData = useMemo(() => {
        const dataMap: Record<string, { common: number, large: number, epic: number }> = {};
        expeditions.forEach(exp => {
            const dateKey = toLocaleDateKey(new Date(exp.timestamp * 1000));
            if (!dataMap[dateKey]) dataMap[dateKey] = { common: 0, large: 0, epic: 0 };
            if (getExpeditionCategory(exp) === 'ships') {
                const size = exp.size ?? 2;
                if (size === 0) dataMap[dateKey].epic++;
                else if (size === 1) dataMap[dateKey].large++;
                else dataMap[dateKey].common++;
            }
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { common: 0, large: 0, epic: 0 })
            });
        }
        return results;
    }, [expeditions]);

    const shipResourceData = useMemo(() => {
        const dataMap: Record<string, { metal: number, crystal: number, deuterium: number, msu: number }> = {};
        const shipCostMap: Record<number, any> = {};
        SHIP_DATA.forEach(s => shipCostMap[s.id] = s.metadata?.cost || { metal: 0, crystal: 0, deuterium: 0 });

        expeditions.forEach(exp => {
            const dateKey = toLocaleDateKey(new Date(exp.timestamp * 1000));
            if (!dataMap[dateKey]) dataMap[dateKey] = { metal: 0, crystal: 0, deuterium: 0, msu: 0 };

            if (getExpeditionCategory(exp) === 'ships' && exp.resultDetails) {
                Object.entries(exp.resultDetails).forEach(([id, data]: [string, any]) => {
                    const sid = parseInt(id);
                    const cost = shipCostMap[sid];
                    if (cost) {
                        const amount = data.amount || 0;
                        const m = (cost.metal || 0) * amount;
                        const c = (cost.crystal || 0) * amount;
                        const d = (cost.deuterium || 0) * amount;
                        dataMap[dateKey].metal += m;
                        dataMap[dateKey].crystal += c;
                        dataMap[dateKey].deuterium += d;
                        dataMap[dateKey].msu += (m * mMultiplier) + (c * cMultiplier) + (d * dMultiplier);
                    }
                });
            }
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { metal: 0, crystal: 0, deuterium: 0, msu: 0 })
            });
        }
        return results;
    }, [expeditions, mMultiplier, cMultiplier, dMultiplier]);

    const dmAmountData = useMemo(() => {
        const dataMap: Record<string, { amount: number }> = {};
        expeditions.forEach(exp => {
            const dateKey = toLocaleDateKey(new Date(exp.timestamp * 1000));
            if (!dataMap[dateKey]) dataMap[dateKey] = { amount: 0 };
            if (getExpeditionCategory(exp) === 'darkMatter' && exp.resultDetails) {
                dataMap[dateKey].amount += exp.resultDetails.darkMatter || 0;
            }
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { amount: 0 })
            });
        }
        return results;
    }, [expeditions]);

    const dmSizeData = useMemo(() => {
        const dataMap: Record<string, { common: number, large: number, epic: number }> = {};
        expeditions.forEach(exp => {
            const dateKey = toLocaleDateKey(new Date(exp.timestamp * 1000));
            if (!dataMap[dateKey]) dataMap[dateKey] = { common: 0, large: 0, epic: 0 };
            if (getExpeditionCategory(exp) === 'darkMatter') {
                const size = exp.size ?? 2;
                if (size === 0) dataMap[dateKey].epic++;
                else if (size === 1) dataMap[dateKey].large++;
                else dataMap[dateKey].common++;
            }
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { common: 0, large: 0, epic: 0 })
            });
        }
        return results;
    }, [expeditions]);

    const depletionData = useMemo(() => {
        const dataMap: Record<string, Record<number, number>> = {};
        expeditions.forEach(exp => {
            const dateKey = toLocaleDateKey(new Date(exp.timestamp * 1000));
            if (!dataMap[dateKey]) {
                dataMap[dateKey] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            }
            const dep = exp.depletion ?? 1;
            if (dataMap[dateKey][dep] !== undefined) dataMap[dateKey][dep]++;
        });
        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
            });
        }
        return results;
    }, [expeditions]);

    const pieChartData = useMemo(() => {
        const counts: Record<string, number> = {};
        CATEGORIES.forEach(c => counts[c.id] = 0);
        expeditions.forEach(e => {
            const cat = getExpeditionCategory(e);
            if (cat) counts[cat]++;
        });
        return CATEGORIES.map(cat => ({
            name: cat.label,
            value: counts[cat.id],
            color: cat.color
        })).filter(d => d.value > 0);
    }, [expeditions]);

    const barChartData = useMemo(() => {
        const counts: Record<number, number> = {};
        SHIP_ITEMS.forEach(s => counts[s.id] = 0);
        expeditions.forEach(e => {
            if (getExpeditionCategory(e) === 'ships' && e.resultDetails) {
                Object.entries(e.resultDetails).forEach(([id, data]: [string, any]) => {
                    const sid = parseInt(id);
                    if (counts[sid] !== undefined) {
                        counts[sid] += data.amount || 0;
                    }
                });
            }
        });
        return SHIP_ITEMS.map(s => ({
            name: s.label,
            count: counts[s.id],
            color: s.color
        })).sort((a, b) => b.count - a.count).slice(0, 7);
    }, [expeditions]);

    const summaryStats = useMemo(() => {
        let totalMSU = 0;
        let positiveOutcomes = 0;
        const posCategories = ['resources', 'ships', 'darkmatter', 'item', 'trader'];

        expeditions.forEach(e => {
            const cat = getExpeditionCategory(e);
            if (cat && posCategories.includes(cat)) positiveOutcomes++;

            if (e.resultDetails) {
                const m = e.resultDetails.metal || 0;
                const c = e.resultDetails.crystal || 0;
                const d = e.resultDetails.deuterium || 0;
                totalMSU += (m * mMultiplier) + (c * cMultiplier) + (d * dMultiplier);
            }
        });

        return {
            totalMSU,
            positiveRate: expeditions.length > 0 ? (positiveOutcomes / expeditions.length * 100).toFixed(1) : '0.0'
        };
    }, [expeditions, mMultiplier, cMultiplier, dMultiplier]);

    return (
        <div className="expeditions-layout">
            {/* --- Sidebar 1: Primary --- */}
            <div className="expeditions-sidebar-primary">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="glass"
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '12px 10px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px',
                            background: activeTab === tab.id ? THEME_CYAN : 'rgba(255,255,255,0.03)',
                            color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.2s',
                            fontSize: '0.75rem', textAlign: 'center', minHeight: '60px', gap: '4px'
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* --- Sidebar 2: Secondary --- */}
            <AnimatePresence>
                {currentTab.sub.length > 0 && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 140, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="expeditions-sidebar-secondary"
                        style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}
                    >
                        {currentTab.sub.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSubTab(s.id)}
                                className="glass"
                                style={{
                                    display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: '8px',
                                    background: subTab === s.id ? THEME_CYAN : 'rgba(255,255,255,0.03)',
                                    color: subTab === s.id ? '#fff' : 'rgba(255,255,255,0.6)', cursor: 'pointer',
                                    border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', fontWeight: 600,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Main Content Area --- */}
            <div className="expeditions-main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                {/* --- Switcher Header --- */}
                <div style={{ display: 'flex', width: '100%', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={() => setViewMode('chart')}
                        style={{
                            flex: 1, padding: '14px', background: viewMode === 'chart' ? THEME_CYAN : 'transparent',
                            color: viewMode === 'chart' ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.2s', borderRight: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        {activeTab === 'info' ? 'Expedition Details' : 'Chart'}
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        style={{
                            flex: 1, padding: '14px', background: viewMode === 'table' ? THEME_CYAN : 'transparent',
                            color: viewMode === 'table' ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.2s', borderRight: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        {activeTab === 'info' ? 'Expedition Hall of Fame' : 'Table'}
                    </button>
                    <button
                        onClick={handleBackup}
                        disabled={isBackingUp}
                        style={{
                            padding: '0 24px', background: 'transparent',
                            color: backupStatus === 'success' ? '#10b981' : (backupStatus === 'error' ? '#ef4444' : (backupStatus === 'not-linked' ? '#eab308' : 'var(--primary)')),
                            border: 'none', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', opacity: isBackingUp ? 0.6 : 1,
                            minWidth: '180px', justifyContent: 'center'
                        }}
                    >
                        {isBackingUp ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : backupStatus === 'success' ? (
                            <Check size={16} />
                        ) : backupStatus === 'not-linked' ? (
                            <Info size={16} />
                        ) : (
                            <Cloud size={16} />
                        )}

                        {isBackingUp ? 'Backing Up...' : (
                            backupStatus === 'success' ? 'Backup Complete' : (
                                backupStatus === 'error' ? 'Backup Failed' : (
                                    backupStatus === 'not-linked' ? 'Link Account First' : 'Cloud Backup'
                                )
                            )
                        )}
                    </button>
                </div>

                {/* --- Content --- */}
                <div style={{ flex: 1, overflowY: viewMode === 'table' ? 'auto' : 'hidden', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    {viewMode === 'table' ? (
                        <>
                            {activeTab === 'overview' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={CATEGORIES.map(cat => ({
                                        label: cat.label,
                                        color: cat.color,
                                        calc: (exp) => getExpeditionCategory(exp) === cat.id ? 1 : 0
                                    }))}
                                    footer={[{ label: 'Sum', calc: (vals) => vals.reduce((a, b) => a + b, 0) }]}
                                />
                            )}
                            {activeTab === 'resources' && subTab === 'amount' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={[
                                        { label: 'Metal', color: RESOURCE_COLORS.metal, calc: (exp) => exp.resultDetails?.metal || 0 },
                                        { label: 'Crystal', color: RESOURCE_COLORS.crystal, calc: (exp) => exp.resultDetails?.crystal || 0 },
                                        { label: 'Deuterium', color: RESOURCE_COLORS.deuterium, calc: (exp) => exp.resultDetails?.deuterium || 0 },
                                    ]}
                                    footer={[
                                        { label: 'Resource units', calc: (vals) => vals.reduce((a, b) => a + b, 0) },
                                        {
                                            label: 'Resource units (MSU)', calc: (vals) => {
                                                return (vals[0] * mMultiplier) + (vals[1] * cMultiplier) + (vals[2] * dMultiplier);
                                            }
                                        }
                                    ]}
                                    showPercent={false}
                                />
                            )}
                            {activeTab === 'resources' && subTab === 'sizes' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={[
                                        { label: 'Common Find', color: RARITY_COLORS.common, calc: (exp) => (getExpeditionCategory(exp) === 'resources' && (exp.size ?? 2) === 2) ? 1 : 0 },
                                        { label: 'Large Find', color: RARITY_COLORS.rare, calc: (exp) => (getExpeditionCategory(exp) === 'resources' && (exp.size ?? 2) === 1) ? 1 : 0 },
                                        { label: 'Epic Find', color: RARITY_COLORS.epic, calc: (exp) => (getExpeditionCategory(exp) === 'resources' && (exp.size ?? 2) === 0) ? 1 : 0 },
                                    ]}
                                    footer={[{ label: 'Sum', calc: (vals) => vals.reduce((a, b) => a + b, 0) }]}
                                    showPerDay={false}
                                />
                            )}
                            {activeTab === 'resources' && subTab === 'count' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={[
                                        { label: 'Metal', color: RESOURCE_COLORS.metal, calc: (exp) => (getExpeditionCategory(exp) === 'resources' && exp.resultDetails?.metal) ? 1 : 0 },
                                        { label: 'Crystal', color: RESOURCE_COLORS.crystal, calc: (exp) => (getExpeditionCategory(exp) === 'resources' && exp.resultDetails?.crystal) ? 1 : 0 },
                                        { label: 'Deuterium', color: RESOURCE_COLORS.deuterium, calc: (exp) => (getExpeditionCategory(exp) === 'resources' && exp.resultDetails?.deuterium) ? 1 : 0 },
                                    ]}
                                    footer={[{ label: 'Resource units', calc: (vals) => vals.reduce((a, b) => a + b, 0) }]}
                                />
                            )}
                            {activeTab === 'items' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={[
                                        {
                                            label: 'Valuable Items',
                                            color: '#8b5cf6',
                                            calc: (exp) => {
                                                if (getExpeditionCategory(exp) !== 'item') return 0;
                                                if (Array.isArray(exp.resultDetails)) {
                                                    return exp.resultDetails.reduce((acc: number, i: any) => acc + (i.amount || 0), 0);
                                                }
                                                return 1;
                                            }
                                        },
                                    ]}
                                    footer={[{ label: 'Total Items', calc: (vals) => vals.reduce((a, b) => a + b, 0) }]}
                                />
                            )}
                            {activeTab === 'ships' && subTab === 'amount' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={SHIP_ITEMS.map(s => ({
                                        label: s.label,
                                        color: s.color,
                                        calc: (exp: any) => (getExpeditionCategory(exp) === 'ships' && exp.resultDetails) ? (exp.resultDetails[s.id]?.amount || 0) : 0
                                    }))}
                                    footer={[{ label: 'Total Ships', calc: (vals) => vals.reduce((a, b) => a + b, 0) }]}
                                />
                            )}
                            {activeTab === 'ships' && subTab === 'sizes' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={[
                                        { label: 'Common Find', color: RARITY_COLORS.common, calc: (exp) => (getExpeditionCategory(exp) === 'ships' && (exp.size ?? 2) >= 2) ? 1 : 0 },
                                        { label: 'Large Find', color: RARITY_COLORS.rare, calc: (exp) => (getExpeditionCategory(exp) === 'ships' && exp.size === 1) ? 1 : 0 },
                                        { label: 'Epic Find', color: RARITY_COLORS.epic, calc: (exp) => (getExpeditionCategory(exp) === 'ships' && exp.size === 0) ? 1 : 0 },
                                    ]}
                                    footer={[{ label: 'Total Findings', calc: (vals) => vals.reduce((a, b) => a + b, 0) }]}
                                />
                            )}
                            {activeTab === 'ships' && subTab === 'resourceUnits' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={[
                                        {
                                            label: 'Metal', color: RESOURCE_COLORS.metal, calc: (exp) => {
                                                if (getExpeditionCategory(exp) !== 'ships' || !exp.resultDetails) return 0;
                                                let sum = 0;
                                                Object.entries(exp.resultDetails).forEach(([id, data]: [string, any]) => {
                                                    const cost = SHIP_DATA.find(s => s.id === parseInt(id))?.metadata?.cost;
                                                    if (cost) sum += (cost.metal || 0) * (data.amount || 0);
                                                });
                                                return sum;
                                            }
                                        },
                                        {
                                            label: 'Crystal', color: RESOURCE_COLORS.crystal, calc: (exp) => {
                                                if (getExpeditionCategory(exp) !== 'ships' || !exp.resultDetails) return 0;
                                                let sum = 0;
                                                Object.entries(exp.resultDetails).forEach(([id, data]: [string, any]) => {
                                                    const cost = SHIP_DATA.find(s => s.id === parseInt(id))?.metadata?.cost;
                                                    if (cost) sum += (cost.crystal || 0) * (data.amount || 0);
                                                });
                                                return sum;
                                            }
                                        },
                                        {
                                            label: 'Deuterium', color: RESOURCE_COLORS.deuterium, calc: (exp) => {
                                                if (getExpeditionCategory(exp) !== 'ships' || !exp.resultDetails) return 0;
                                                let sum = 0;
                                                Object.entries(exp.resultDetails).forEach(([id, data]: [string, any]) => {
                                                    const cost = SHIP_DATA.find(s => s.id === parseInt(id))?.metadata?.cost;
                                                    if (cost) sum += (cost.deuterium || 0) * (data.amount || 0);
                                                });
                                                return sum;
                                            }
                                        },
                                    ]}
                                    footer={[
                                        { label: 'Resource units', calc: (vals) => vals.reduce((a, b) => a + b, 0) },
                                        { label: 'Resource units (MSU)', calc: (vals) => (vals[0] * mMultiplier) + (vals[1] * cMultiplier) + (vals[2] * dMultiplier) }
                                    ]}
                                />
                            )}
                            {activeTab === 'darkMatter' && subTab === 'amount' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={[
                                        { label: 'Dark Matter', color: '#06b6d4', calc: (exp) => exp.resultDetails?.darkMatter || 0 },
                                    ]}
                                    footer={[{ label: 'Sum', calc: (vals) => vals.reduce((a, b) => a + b, 0) }]}
                                />
                            )}
                            {activeTab === 'darkMatter' && subTab === 'sizes' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={[
                                        { label: 'Common Find', color: RARITY_COLORS.common, calc: (exp) => (getExpeditionCategory(exp) === 'darkMatter' && (exp.size ?? 2) === 2) ? 1 : 0 },
                                        { label: 'Large Find', color: RARITY_COLORS.rare, calc: (exp) => (getExpeditionCategory(exp) === 'darkMatter' && (exp.size ?? 2) === 1) ? 1 : 0 },
                                        { label: 'Epic Find', color: RARITY_COLORS.epic, calc: (exp) => (getExpeditionCategory(exp) === 'darkMatter' && (exp.size ?? 2) === 0) ? 1 : 0 },
                                    ]}
                                    footer={[{ label: 'Sum', calc: (vals) => vals.reduce((a, b) => a + b, 0) }]}
                                />
                            )}
                            {activeTab === 'depletion' && (
                                <GenericExpeditionTable
                                    expeditions={expeditions}
                                    rows={DEPLETION_LEVELS.map(lev => ({
                                        label: lev.label,
                                        color: lev.color,
                                        calc: (exp) => (exp.depletion ?? 1) === lev.id ? 1 : 0
                                    }))}
                                    footer={[{ label: 'Total Expeditions', calc: (vals) => vals.reduce((a, b) => a + b, 0) }]}
                                />
                            )}
                            {activeTab === 'info' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
                                    {/* HALL OF FAME INTERFACE */}
                                    <div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.4rem' }}>Mission Records</h3>
                                            <p style={{ margin: '4px 0 0', opacity: 0.4, fontSize: '0.75rem', fontWeight: 600 }}>Elite findings documented across your empire's sorties.</p>
                                        </div>
                                    </div>

                                    {/* TOP RESOURCE FINDS */}
                                    <div className="glass" style={{ gridColumn: 'span 4', padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: RESOURCE_COLORS.metal }}>
                                            <Trophy size={18} /> <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Best Metal Finds</span>
                                        </div>
                                        {expeditions.filter(e => (e.resultDetails?.metal || 0) > 0).sort((a, b) => (b.resultDetails?.metal || 0) - (a.resultDetails?.metal || 0)).slice(0, 5).map((e, idx) => (
                                            <div key={e.messageId} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{(e.resultDetails?.metal || 0).toLocaleString()}</div>
                                                <div style={{ opacity: 0.3, fontSize: '0.7rem', fontWeight: 700 }}>{new Date(e.timestamp * 1000).toLocaleDateString()}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="glass" style={{ gridColumn: 'span 4', padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: RESOURCE_COLORS.crystal }}>
                                            <Trophy size={18} /> <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Best Crystal Finds</span>
                                        </div>
                                        {expeditions.filter(e => (e.resultDetails?.crystal || 0) > 0).sort((a, b) => (b.resultDetails?.crystal || 0) - (a.resultDetails?.crystal || 0)).slice(0, 5).map((e, idx) => (
                                            <div key={e.messageId} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{(e.resultDetails?.crystal || 0).toLocaleString()}</div>
                                                <div style={{ opacity: 0.3, fontSize: '0.7rem', fontWeight: 700 }}>{new Date(e.timestamp * 1000).toLocaleDateString()}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="glass" style={{ gridColumn: 'span 4', padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: RESOURCE_COLORS.deuterium }}>
                                            <Trophy size={18} /> <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Best Deuterium Finds</span>
                                        </div>
                                        {expeditions.filter(e => (e.resultDetails?.deuterium || 0) > 0).sort((a, b) => (b.resultDetails?.deuterium || 0) - (a.resultDetails?.deuterium || 0)).slice(0, 5).map((e, idx) => (
                                            <div key={e.messageId} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{(e.resultDetails?.deuterium || 0).toLocaleString()}</div>
                                                <div style={{ opacity: 0.3, fontSize: '0.7rem', fontWeight: 700 }}>{new Date(e.timestamp * 1000).toLocaleDateString()}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* SECOND ROW: DM AND MSU */}
                                    <div className="glass" style={{ gridColumn: 'span 6', padding: '24px', borderRadius: '24px', background: 'rgba(189,0,255,0.03)', border: '1px solid rgba(189,0,255,0.1)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#06b6d4' }}>
                                            <Award size={18} /> <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Elite Dark Matter Discoveries</span>
                                        </div>
                                        {expeditions.filter(e => (e.resultDetails?.darkMatter || 0) > 0).sort((a, b) => (b.resultDetails?.darkMatter || 0) - (a.resultDetails?.darkMatter || 0)).slice(0, 5).map((e, idx) => (
                                            <div key={e.messageId} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: idx < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6,182,212,0.2)', fontSize: '0.65rem', fontWeight: 900 }}>{idx + 1}</div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#06b6d4' }}>{(e.resultDetails?.darkMatter || 0).toLocaleString()}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>{e.coords === '0:0:0' ? 'Unknown' : `[${e.coords}]`}</div>
                                                    <div style={{ opacity: 0.3, fontSize: '0.6rem', fontWeight: 700 }}>{new Date(e.timestamp * 1000).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="glass" style={{ gridColumn: 'span 6', padding: '24px', borderRadius: '24px', background: 'rgba(0,98,255,0.03)', border: '1px solid rgba(0,98,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: THEME_CYAN }}>
                                                <ArrowUpRight size={18} /> <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Top Ship Salvage (by MSU)</span>
                                            </div>
                                            {selectedSalvageRecord && (
                                                <button
                                                    onClick={() => setSelectedSalvageRecord(null)}
                                                    style={{ background: 'transparent', border: 'none', color: THEME_CYAN, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Info size={14} /> BACK TO LIST
                                                </button>
                                            )}
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {selectedSalvageRecord ? (
                                                <motion.div
                                                    key="salvage-info"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                                                >
                                                    <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Calculated Value</div>
                                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
                                                            {formatYAxis(selectedSalvageRecord.totalMSU)} <span style={{ fontSize: '0.8rem', color: THEME_CYAN }}>MSU</span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                                        {Object.entries(selectedSalvageRecord.resultDetails || {}).map(([id, data]: [string, any]) => {
                                                            const ship = SHIP_DATA.find(s => s.id === parseInt(id));
                                                            if (!ship) return null;
                                                            return (
                                                                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                                                                        <img src={chrome.runtime.getURL(ship.icon || '')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    </div>
                                                                    <div style={{ overflow: 'hidden' }}>
                                                                        <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ship.name}</div>
                                                                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: THEME_CYAN }}>{data.amount?.toLocaleString()}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div style={{ marginTop: '4px', opacity: 0.3, fontSize: '0.6rem', fontWeight: 700, textAlign: 'right' }}>
                                                        DISCOVERED ON {new Date(selectedSalvageRecord.timestamp * 1000).toLocaleString()} AT {selectedSalvageRecord.coords === '0:0:0' ? 'Unknown' : `[${selectedSalvageRecord.coords}]`}
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="salvage-list"
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                >
                                                    {expeditions.filter(e => getExpeditionCategory(e) === 'ships').map(e => {
                                                        let totalMSU = 0;
                                                        Object.entries(e.resultDetails || {}).forEach(([id, data]: [string, any]) => {
                                                            const cost = SHIP_DATA.find(s => s.id === parseInt(id))?.metadata?.cost;
                                                            if (cost) {
                                                                const am = data.amount || 0;
                                                                totalMSU += ((cost.metal || 0) * am * mMultiplier) + ((cost.crystal || 0) * am * cMultiplier) + ((cost.deuterium || 0) * am * dMultiplier);
                                                            }
                                                        });
                                                        return { ...e, totalMSU };
                                                    }).sort((a, b) => b.totalMSU - a.totalMSU).slice(0, 5).map((e, idx) => (
                                                        <motion.div
                                                            key={e.messageId}
                                                            onClick={() => setSelectedSalvageRecord(e)}
                                                            whileHover={{ x: 4, background: 'rgba(255,255,255,0.02)' }}
                                                            style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 10px', borderBottom: idx < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: 'rgba(0,98,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,98,255,0.2)', fontSize: '0.65rem', fontWeight: 900 }}>{idx + 1}</div>
                                                                <div style={{ fontSize: '1rem', fontWeight: 900 }}>{formatYAxis(e.totalMSU)} <span style={{ fontSize: '0.6rem', opacity: 0.4 }}>MSU</span></div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>{e.coords === '0:0:0' ? 'Unknown' : `[${e.coords}]`}</div>
                                                                <div style={{ opacity: 0.3, fontSize: '0.6rem', fontWeight: 700 }}>{new Date(e.timestamp * 1000).toLocaleString()}</div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* THIRD ROW: SPECIFIC SHIP SELECTOR RECORDS */}
                                    <div className="glass" style={{ gridColumn: 'span 12', padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)' }}><Box size={20} color={THEME_CYAN} /></div>
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>Ship Specific Hall of Fame</div>
                                                    <div style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 700 }}>Find records for individual ship discoveries</div>
                                                </div>
                                            </div>
                                            <select
                                                value={selectedHallOfFameShip}
                                                onChange={(e) => setSelectedHallOfFameShip(parseInt(e.target.value))}
                                                style={{ background: '#0a141e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}
                                            >
                                                {SHIP_ITEMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                            </select>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                                            {(() => {
                                                const bestByShip = expeditions.filter(e => getExpeditionCategory(e) === 'ships' && e.resultDetails && e.resultDetails[selectedHallOfFameShip])
                                                    .sort((a, b) => (b.resultDetails[selectedHallOfFameShip]?.amount || 0) - (a.resultDetails[selectedHallOfFameShip]?.amount || 0))
                                                    .slice(0, 5);

                                                if (bestByShip.length === 0) return <div style={{ gridColumn: 'span 5', textAlign: 'center', padding: '40px', opacity: 0.2 }}>No records for this ship type found yet.</div>;

                                                return bestByShip.map((e, idx) => (
                                                    <div key={e.messageId} className="glass" style={{ padding: '20px', borderRadius: '20px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)' }} />
                                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>RANK {idx + 1}</div>
                                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: THEME_CYAN }}>{e.resultDetails[selectedHallOfFameShip].amount}</div>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.6 }}>UNITS</div>
                                                        <div style={{ fontSize: '0.6rem', opacity: 0.3, marginTop: '8px' }}>{new Date(e.timestamp * 1000).toLocaleDateString()}</div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>

                    ) : (
                        <div style={{ width: '100%', height: '100%' }}>
                            {activeTab === 'overview' && (
                                <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div className="card-title"><TrendingUp size={18} /><span>Mission Activity</span></div>
                                        <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                <AreaChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} allowDecimals={false} tickFormatter={formatYAxis} width={60} />
                                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                                                    {CATEGORIES.map((cat) => (
                                                        <Area key={cat.id} name={cat.label} type="monotone" dataKey={cat.id} stackId="1" stroke={cat.color} fill={cat.color} fillOpacity={visibleCategories.has(cat.id) ? 0.6 : 0} strokeOpacity={visibleCategories.has(cat.id) ? 1 : 0} strokeWidth={2} hide={!visibleCategories.has(cat.id)} />
                                                    ))}
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {CATEGORIES.map((cat) => (
                                            <div key={cat.id} onClick={() => toggleCategory(cat.id)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: visibleCategories.has(cat.id) ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: cat.color, opacity: visibleCategories.has(cat.id) ? 1 : 0.3 }} />
                                                <span style={{ fontSize: '0.75rem', color: visibleCategories.has(cat.id) ? '#fff' : 'rgba(255,255,255,0.3)' }}>{cat.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'resources' && (
                                <div style={{ width: '100%', height: '100%' }}>
                                    {subTab === 'amount' && (
                                        <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div className="card-title"><Database size={18} /><span>Resource Gains</span></div>
                                                <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                        <AreaChart data={resourceAmountData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={formatYAxis} width={60} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Area name="Metal" type="monotone" dataKey="metal" stackId="1" stroke={RESOURCE_COLORS.metal} fill={RESOURCE_COLORS.metal} fillOpacity={visibleResources.has('metal') ? 0.6 : 0} strokeOpacity={visibleResources.has('metal') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('metal')} />
                                                            <Area name="Crystal" type="monotone" dataKey="crystal" stackId="1" stroke={RESOURCE_COLORS.crystal} fill={RESOURCE_COLORS.crystal} fillOpacity={visibleResources.has('crystal') ? 0.6 : 0} strokeOpacity={visibleResources.has('crystal') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('crystal')} />
                                                            <Area name="Deuterium" type="monotone" dataKey="deuterium" stackId="1" stroke={RESOURCE_COLORS.deuterium} fill={RESOURCE_COLORS.deuterium} fillOpacity={visibleResources.has('deuterium') ? 0.6 : 0} strokeOpacity={visibleResources.has('deuterium') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('deuterium')} />
                                                            <Area name="Resource Units (MSU)" type="monotone" dataKey="msu" stroke={THEME_CYAN} fill={THEME_CYAN} fillOpacity={visibleResources.has('msu') ? 0.2 : 0} strokeOpacity={visibleResources.has('msu') ? 0.8 : 0} strokeWidth={3} strokeDasharray="5 5" hide={!visibleResources.has('msu')} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {[
                                                    { id: 'metal', label: 'Metal', color: RESOURCE_COLORS.metal },
                                                    { id: 'crystal', label: 'Crystal', color: RESOURCE_COLORS.crystal },
                                                    { id: 'deuterium', label: 'Deuterium', color: RESOURCE_COLORS.deuterium },
                                                    { id: 'msu', label: 'Resource Units (MSU)', color: THEME_CYAN },
                                                ].map((res) => (
                                                    <div key={res.id} onClick={() => toggleResource(res.id)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: visibleResources.has(res.id) ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                                                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: res.color, opacity: visibleResources.has(res.id) ? 1 : 0.3 }} />
                                                        <span style={{ fontSize: '0.75rem', color: visibleResources.has(res.id) ? '#fff' : 'rgba(255,255,255,0.3)' }}>{res.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {subTab === 'sizes' && (
                                        <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div className="card-title"><Star size={18} /><span>Rarity Distribution</span></div>
                                                <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                        <AreaChart data={resourceSizeData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} allowDecimals={false} tickFormatter={formatYAxis} width={60} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Area name="Common Find" type="monotone" dataKey="common" stackId="1" stroke={RARITY_COLORS.common} fill={RARITY_COLORS.common} fillOpacity={visibleRarities.has('common') ? 0.6 : 0} strokeOpacity={visibleRarities.has('common') ? 1 : 0} strokeWidth={2} hide={!visibleRarities.has('common')} />
                                                            <Area name="Large Find" type="monotone" dataKey="large" stackId="1" stroke={RARITY_COLORS.rare} fill={RARITY_COLORS.rare} fillOpacity={visibleRarities.has('rare') ? 0.6 : 0} strokeOpacity={visibleRarities.has('rare') ? 1 : 0} strokeWidth={2} hide={!visibleRarities.has('rare')} />
                                                            <Area name="Epic Find" type="monotone" dataKey="epic" stackId="1" stroke={RARITY_COLORS.epic} fill={RARITY_COLORS.epic} fillOpacity={visibleRarities.has('epic') ? 0.6 : 0} strokeOpacity={visibleRarities.has('epic') ? 1 : 0} strokeWidth={2} hide={!visibleRarities.has('epic')} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {[
                                                    { id: 'common', label: 'Common Find', color: RARITY_COLORS.common },
                                                    { id: 'rare', label: 'Large Find', color: RARITY_COLORS.rare },
                                                    { id: 'epic', label: 'Epic Find', color: RARITY_COLORS.epic },
                                                ].map((rar) => (
                                                    <div key={rar.id} onClick={() => toggleRarity(rar.id)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: visibleRarities.has(rar.id) ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                                                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: rar.color, opacity: visibleRarities.has(rar.id) ? 1 : 0.3 }} />
                                                        <span style={{ fontSize: '0.75rem', color: visibleRarities.has(rar.id) ? '#fff' : 'rgba(255,255,255,0.3)' }}>{rar.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {subTab === 'count' && (
                                        <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div className="card-title"><Box size={18} /><span>Find Frequency</span></div>
                                                <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                        <AreaChart data={resourceCountData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} allowDecimals={false} tickFormatter={formatYAxis} width={60} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Area name="Metal" type="monotone" dataKey="metal" stackId="1" stroke={RESOURCE_COLORS.metal} fill={RESOURCE_COLORS.metal} fillOpacity={visibleResources.has('metal') ? 0.6 : 0} strokeOpacity={visibleResources.has('metal') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('metal')} />
                                                            <Area name="Crystal" type="monotone" dataKey="crystal" stackId="1" stroke={RESOURCE_COLORS.crystal} fill={RESOURCE_COLORS.crystal} fillOpacity={visibleResources.has('crystal') ? 0.6 : 0} strokeOpacity={visibleResources.has('crystal') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('crystal')} />
                                                            <Area name="Deuterium" type="monotone" dataKey="deuterium" stackId="1" stroke={RESOURCE_COLORS.deuterium} fill={RESOURCE_COLORS.deuterium} fillOpacity={visibleResources.has('deuterium') ? 0.6 : 0} strokeOpacity={visibleResources.has('deuterium') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('deuterium')} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {[
                                                    { id: 'metal', label: 'Metal', color: RESOURCE_COLORS.metal },
                                                    { id: 'crystal', label: 'Crystal', color: RESOURCE_COLORS.crystal },
                                                    { id: 'deuterium', label: 'Deuterium', color: RESOURCE_COLORS.deuterium },
                                                ].map((res) => (
                                                    <div key={res.id} onClick={() => toggleResource(res.id)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: visibleResources.has(res.id) ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                                                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: res.color, opacity: visibleResources.has(res.id) ? 1 : 0.3 }} />
                                                        <span style={{ fontSize: '0.75rem', color: visibleResources.has(res.id) ? '#fff' : 'rgba(255,255,255,0.3)' }}>{res.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'ships' && (
                                <div style={{ width: '100%', height: '100%' }}>
                                    {subTab === 'amount' && (
                                        <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div className="card-title"><Ship size={18} /><span>Ship Findings</span></div>
                                                <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                        <AreaChart data={shipAmountData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={formatYAxis} width={60} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            {SHIP_ITEMS.map(s => (
                                                                <Area key={s.id} name={s.label} type="monotone" dataKey={s.id} stackId="1" stroke={s.color} fill={s.color} fillOpacity={visibleShips.has(s.id) ? 0.6 : 0} strokeOpacity={visibleShips.has(s.id) ? 1 : 0} strokeWidth={2} hide={!visibleShips.has(s.id)} />
                                                            ))}
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            {viewMode === 'chart' && (
                                                <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {SHIP_ITEMS.map((s) => (
                                                        <div key={s.id} onClick={() => toggleShip(s.id)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: visibleShips.has(s.id) ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                                                            <div style={{ width: 12, height: 12, borderRadius: 2, background: s.color, opacity: visibleShips.has(s.id) ? 1 : 0.3 }} />
                                                            <span style={{ fontSize: '0.75rem', color: visibleShips.has(s.id) ? '#fff' : 'rgba(255,255,255,0.3)' }}>{s.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {subTab === 'sizes' && (
                                        <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div className="card-title"><Star size={18} /><span>Rarity Distribution (Ships)</span></div>
                                                <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                        <AreaChart data={shipSizeData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} allowDecimals={false} tickFormatter={formatYAxis} width={60} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Area name="Common Find" type="monotone" dataKey="common" stackId="1" stroke={RARITY_COLORS.common} fill={RARITY_COLORS.common} fillOpacity={visibleRarities.has('common') ? 0.6 : 0} strokeOpacity={visibleRarities.has('common') ? 1 : 0} strokeWidth={2} hide={!visibleRarities.has('common')} />
                                                            <Area name="Large Find" type="monotone" dataKey="large" stackId="1" stroke={RARITY_COLORS.rare} fill={RARITY_COLORS.rare} fillOpacity={visibleRarities.has('rare') ? 0.6 : 0} strokeOpacity={visibleRarities.has('rare') ? 1 : 0} strokeWidth={2} hide={!visibleRarities.has('rare')} />
                                                            <Area name="Epic Find" type="monotone" dataKey="epic" stackId="1" stroke={RARITY_COLORS.epic} fill={RARITY_COLORS.epic} fillOpacity={visibleRarities.has('epic') ? 0.6 : 0} strokeOpacity={visibleRarities.has('epic') ? 1 : 0} strokeWidth={2} hide={!visibleRarities.has('epic')} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            {viewMode === 'chart' && (
                                                <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {[
                                                        { id: 'common', label: 'Common Find', color: RARITY_COLORS.common },
                                                        { id: 'rare', label: 'Large Find', color: RARITY_COLORS.rare },
                                                        { id: 'epic', label: 'Epic Find', color: RARITY_COLORS.epic },
                                                    ].map((rar) => (
                                                        <div key={rar.id} onClick={() => toggleRarity(rar.id)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: visibleRarities.has(rar.id) ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                                                            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: rar.color, opacity: visibleRarities.has(rar.id) ? 1 : 0.3 }} />
                                                            <span style={{ fontSize: '0.75rem', color: visibleRarities.has(rar.id) ? '#fff' : 'rgba(255,255,255,0.3)' }}>{rar.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {subTab === 'resourceUnits' && (
                                        <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div className="card-title"><Database size={18} /><span>Resource Value of Ships</span></div>
                                                <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                        <AreaChart data={shipResourceData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={formatYAxis} width={60} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Area name="Metal" type="monotone" dataKey="metal" stackId="1" stroke={RESOURCE_COLORS.metal} fill={RESOURCE_COLORS.metal} fillOpacity={visibleResources.has('metal') ? 0.6 : 0} strokeOpacity={visibleResources.has('metal') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('metal')} />
                                                            <Area name="Crystal" type="monotone" dataKey="crystal" stackId="1" stroke={RESOURCE_COLORS.crystal} fill={RESOURCE_COLORS.crystal} fillOpacity={visibleResources.has('crystal') ? 0.6 : 0} strokeOpacity={visibleResources.has('crystal') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('crystal')} />
                                                            <Area name="Deuterium" type="monotone" dataKey="deuterium" stackId="1" stroke={RESOURCE_COLORS.deuterium} fill={RESOURCE_COLORS.deuterium} fillOpacity={visibleResources.has('deuterium') ? 0.6 : 0} strokeOpacity={visibleResources.has('deuterium') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('deuterium')} />
                                                            <Area name="Resource Units (MSU)" type="monotone" dataKey="msu" stroke={THEME_CYAN} fill={THEME_CYAN} fillOpacity={visibleResources.has('msu') ? 0.2 : 0} strokeOpacity={visibleResources.has('msu') ? 0.8 : 0} strokeWidth={3} strokeDasharray="5 5" hide={!visibleResources.has('msu')} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            {viewMode === 'chart' && (
                                                <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {[
                                                        { id: 'metal', label: 'Metal', color: RESOURCE_COLORS.metal },
                                                        { id: 'crystal', label: 'Crystal', color: RESOURCE_COLORS.crystal },
                                                        { id: 'deuterium', label: 'Deuterium', color: RESOURCE_COLORS.deuterium },
                                                        { id: 'msu', label: 'Resource Units (MSU)', color: THEME_CYAN },
                                                    ].map((res) => (
                                                        <div key={res.id} onClick={() => toggleResource(res.id)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: visibleResources.has(res.id) ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                                                            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: res.color, opacity: visibleResources.has(res.id) ? 1 : 0.3 }} />
                                                            <span style={{ fontSize: '0.75rem', color: visibleResources.has(res.id) ? '#fff' : 'rgba(255,255,255,0.3)' }}>{res.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'darkMatter' && (
                                <div style={{ width: '100%', height: '100%' }}>
                                    {subTab === 'amount' && (
                                        <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div className="card-title"><Moon size={18} /><span>Dark Matter Gains</span></div>
                                                <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                        <AreaChart data={dmAmountData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={formatYAxis} width={60} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Area name="Dark Matter" type="monotone" dataKey="amount" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} strokeWidth={2} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {subTab === 'sizes' && (
                                        <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div className="card-title"><Star size={18} /><span>Rarity Distribution (Dark Matter)</span></div>
                                                <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                        <AreaChart data={dmSizeData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} allowDecimals={false} tickFormatter={formatYAxis} width={60} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Area name="Common Find" type="monotone" dataKey="common" stackId="1" stroke={RARITY_COLORS.common} fill={RARITY_COLORS.common} fillOpacity={visibleRarities.has('common') ? 0.6 : 0} strokeOpacity={visibleRarities.has('common') ? 1 : 0} strokeWidth={2} hide={!visibleRarities.has('common')} />
                                                            <Area name="Large Find" type="monotone" dataKey="large" stackId="1" stroke={RARITY_COLORS.rare} fill={RARITY_COLORS.rare} fillOpacity={visibleRarities.has('rare') ? 0.6 : 0} strokeOpacity={visibleRarities.has('rare') ? 1 : 0} strokeWidth={2} hide={!visibleRarities.has('rare')} />
                                                            <Area name="Epic Find" type="monotone" dataKey="epic" stackId="1" stroke={RARITY_COLORS.epic} fill={RARITY_COLORS.epic} fillOpacity={visibleRarities.has('epic') ? 0.6 : 0} strokeOpacity={visibleRarities.has('epic') ? 1 : 0} strokeWidth={2} hide={!visibleRarities.has('epic')} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            {viewMode === 'chart' && (
                                                <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {[
                                                        { id: 'common', label: 'Common Find', color: RARITY_COLORS.common },
                                                        { id: 'rare', label: 'Large Find', color: RARITY_COLORS.rare },
                                                        { id: 'epic', label: 'Epic Find', color: RARITY_COLORS.epic },
                                                    ].map((rar) => (
                                                        <div key={rar.id} onClick={() => toggleRarity(rar.id)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: visibleRarities.has(rar.id) ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                                                            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: rar.color, opacity: visibleRarities.has(rar.id) ? 1 : 0.3 }} />
                                                            <span style={{ fontSize: '0.75rem', color: visibleRarities.has(rar.id) ? '#fff' : 'rgba(255,255,255,0.3)' }}>{rar.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'depletion' && (
                                <div style={{ display: 'flex', width: '100%', height: '100%', gap: '24px' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div className="card-title"><Search size={18} /><span>Depletion Status Distribution</span></div>
                                        <div style={{ flex: 1, width: '100%', marginTop: '20px', minHeight: '350px', minWidth: 0 }}>
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                <AreaChart data={depletionData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} minTickGap={40} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} allowDecimals={false} tickFormatter={formatYAxis} width={60} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    {DEPLETION_LEVELS.map(lev => (
                                                        <Area key={lev.id} name={lev.label} type="monotone" dataKey={lev.id} stackId="1" stroke={lev.color} fill={lev.color} fillOpacity={visibleDepletion.has(lev.id) ? 0.6 : 0} strokeOpacity={visibleDepletion.has(lev.id) ? 1 : 0} strokeWidth={2} hide={!visibleDepletion.has(lev.id)} />
                                                    ))}
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    {viewMode === 'chart' && (
                                        <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {DEPLETION_LEVELS.map((lev) => (
                                                <div key={lev.id} onClick={() => {
                                                    const next = new Set(visibleDepletion);
                                                    if (next.has(lev.id)) next.delete(lev.id);
                                                    else next.add(lev.id);
                                                    setVisibleDepletion(next);
                                                }} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: visibleDepletion.has(lev.id) ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: lev.color, opacity: visibleDepletion.has(lev.id) ? 1 : 0.3 }} />
                                                    <span style={{ fontSize: '0.75rem', color: visibleDepletion.has(lev.id) ? '#fff' : 'rgba(255,255,255,0.3)' }}>{lev.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}


                            {activeTab === 'info' && (
                                <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingBottom: '40px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {/* THEORETICAL MAX FIND SECTION */}
                                        {theoreticalMax && (
                                            <div className="glass" style={{ padding: '40px 40px 48px 40px', borderRadius: '24px', background: 'rgba(5, 10, 20, 0.6)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative', overflow: 'hidden' }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${RESOURCE_COLORS.metal}, ${RESOURCE_COLORS.crystal}, ${RESOURCE_COLORS.deuterium}, ${THEME_CYAN})` }} />

                                                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: RESOURCE_COLORS.metal, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>POTENTIAL MAX METAL</div>
                                                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff' }}>{theoreticalMax.maxMetal.toLocaleString()}</div>
                                                        {theoreticalMax.boosterPercent > 0 && (
                                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 800, marginTop: '4px' }}>
                                                                Base: {theoreticalMax.baseMetal.toLocaleString()} (+{(theoreticalMax.boosterPercent * 100).toFixed(0)}%)
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: RESOURCE_COLORS.crystal, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>POTENTIAL MAX CRYSTAL</div>
                                                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff' }}>{theoreticalMax.maxCrystal.toLocaleString()}</div>
                                                        {theoreticalMax.boosterPercent > 0 && (
                                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 800, marginTop: '4px' }}>
                                                                Base: {theoreticalMax.baseCrystal.toLocaleString()} (+{(theoreticalMax.boosterPercent * 100).toFixed(0)}%)
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />

                                                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: RESOURCE_COLORS.deuterium, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>POTENTIAL MAX DEUTERIUM</div>
                                                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff' }}>{theoreticalMax.maxDeuterium.toLocaleString()}</div>
                                                        {theoreticalMax.boosterPercent > 0 && (
                                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 800, marginTop: '4px' }}>
                                                                Base: {theoreticalMax.baseDeuterium.toLocaleString()} (+{(theoreticalMax.boosterPercent * 100).toFixed(0)}%)
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: THEME_CYAN, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>POTENTIAL SI POOL</div>
                                                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff' }}>{theoreticalMax.maxShipsSI.toLocaleString()}</div>
                                                    </div>
                                                </div>

                                                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />

                                                {/* Active boosters list */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Package size={14} color={THEME_CYAN} />
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            Active Expedition Boosters
                                                        </span>
                                                    </div>
                                                    {activeExpeditionBoosters.length > 0 ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                                            {activeExpeditionBoosters.map((item, idx) => {
                                                                const title = (item.title || item.name || '').toLowerCase();
                                                                const isRes = title.includes('expedition resource booster');
                                                                const isComputer = title.includes('expedition computer');
                                                                const accentColor = isRes ? '#10b981' : isComputer ? '#bd00ff' : '#00f2ff';
                                                                return (
                                                                    <div key={idx} className="glass" style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '10px',
                                                                        padding: '8px 14px',
                                                                        borderRadius: '12px',
                                                                        background: 'rgba(255, 255, 255, 0.02)',
                                                                        border: `1px solid ${accentColor}33`
                                                                    }}>
                                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
                                                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>{item.title}</div>
                                                                        {item.bonus > 0 && (
                                                                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: accentColor }}>
                                                                                +{item.bonus * 100}%
                                                                            </div>
                                                                        )}
                                                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                                                                            ({item.timeRemaining || (item.isPermanent ? 'Permanent' : 'Active')})
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontWeight: 600 }}>
                                                            No active expedition boosters detected. Visit the Empire or Overview page to scrape active boosters.
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ position: 'absolute', bottom: '12px', right: '20px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.02em' }}>
                                                    Calculated assuming {theoreticalMax.className} Class + Pathfinder + Infinite Cargo
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
                                            {/* EXPEDITION DETAILS INTERFACE */}
                                            <div style={{ gridColumn: 'span 12', display: 'flex', gap: '24px' }}>
                                                <div className="glass" style={{ flex: 1, padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0, 98, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(0, 98, 255, 0.2)' }}>
                                                        <Activity size={32} color={THEME_CYAN} />
                                                    </div>
                                                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff' }}>{expeditions.length}</div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>TOTAL MISSIONS SENT</div>
                                                </div>
                                                <div className="glass" style={{ flex: 1, padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                                                        <Zap size={32} color="#16a34a" />
                                                    </div>
                                                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff' }}>
                                                        {summaryStats.positiveRate}%
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>POSITIVE OUTCOME RATE</div>
                                                </div>
                                                <div className="glass" style={{ flex: 1, padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(189, 0, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(189, 0, 255, 0.2)' }}>
                                                        <TrendingUp size={32} color="#bd00ff" />
                                                    </div>
                                                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff' }}>
                                                        {formatYAxis(summaryStats.totalMSU)}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CUMULATIVE MSU FOUND</div>
                                                </div>
                                            </div>

                                            <div className="glass" style={{ gridColumn: 'span 6', padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', height: '400px' }}>
                                                <div className="card-title" style={{ marginBottom: '24px' }}><Target size={18} /><span>Event Distribution Matrix</span></div>
                                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                    <PieChart>
                                                        <Pie
                                                            data={pieChartData}
                                                            cx="50%" cy="50%"
                                                            innerRadius={80}
                                                            outerRadius={120}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {pieChartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.2)" strokeWidth={2} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{ background: '#0a141e', border: '1px solid rgba(255,242,255,0.1)', borderRadius: '12px' }}
                                                            itemStyle={{ color: '#fff', fontSize: '0.8rem' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="glass" style={{ gridColumn: 'span 6', padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', height: '400px' }}>
                                                <div className="card-title" style={{ marginBottom: '24px' }}><Ship size={18} /><span>Top Fleet Recoveries</span></div>
                                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                                    <BarChart
                                                        layout="vertical"
                                                        data={barChartData}
                                                        margin={{ left: 80 }}
                                                    >
                                                        <XAxis type="number" hide />
                                                        <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={10} axisLine={false} tickLine={false} />
                                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0a141e', border: 'none', borderRadius: '8px' }} />
                                                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                                            {barChartData.map((entry, index) => (
                                                                <Cell key={`cell-bar-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="glass" style={{ gridColumn: 'span 12', padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div className="card-title" style={{ marginBottom: '32px' }}><Globe size={18} /><span>Sector Discovery Heatmap</span></div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                                    {(() => {
                                                        const sectorMap: Record<string, number> = {};
                                                        expeditions.forEach(e => {
                                                            const parts = e.coords.split(':');
                                                            if (parts.length === 3) {
                                                                const sector = `${parts[0]}:${parts[1]}:16`;
                                                                sectorMap[sector] = (sectorMap[sector] || 0) + 1;
                                                            }
                                                        });
                                                        return Object.entries(sectorMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([coords, count]) => (
                                                            <div key={coords} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: THEME_CYAN }}>{coords === '0:0:16' ? 'Unknown' : coords}</div>
                                                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>{count} Missions</div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'items' && viewMode === 'chart' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div className="glass" style={{ padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="card-title" style={{ marginBottom: '24px' }}><Package size={18} /><span>Item Discovery History</span></div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                            {expeditions.filter(e => getExpeditionCategory(e) === 'item').slice(0, 50).map(e => (
                                                <div key={e.messageId} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(e.timestamp * 1000).toLocaleString()}</span>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: THEME_CYAN }}>{e.coords}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
                                                            <Package size={20} color="#8b5cf6" />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            {e.resultDetails ? (
                                                                Object.entries(e.resultDetails).map(([id, data]: [string, any]) => (
                                                                    <div key={id} style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                                                                        {(data.amount > 1 ? `${data.amount}x ` : '') + (data.name || 'Unknown Item')}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Valuable Item</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {expeditions.filter(e => getExpeditionCategory(e) === 'item').length === 0 && (
                                                <div style={{ gridColumn: 'span 12', textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
                                                    No items discovered yet. Keep exploring!
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(activeTab !== 'overview' && activeTab !== 'resources' && activeTab !== 'ships' && activeTab !== 'darkMatter' && activeTab !== 'depletion' && activeTab !== 'info' && activeTab !== 'calculator' && activeTab !== 'items') && (
                                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5, paddingTop: '100px' }}>
                                    <Activity size={48} style={{ marginBottom: '16px' }} />
                                    <h3>{currentTab.label} Visuals</h3>
                                    <p>Detailed analytics for this category are being computed.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <style>{`
                    .glass {
                        backdrop-filter: blur(16px);
                        -webkit-backdrop-filter: blur(16px);
                        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
                    }
                    .card-title {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        color: rgba(255,255,255,0.7);
                        font-size: 0.8rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Expeditions;
