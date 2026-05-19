import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import {
    AreaChart,
    Area,
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
    Activity,
    Database,
    Zap,
    TrendingUp,
    Search,
    Globe,
    Compass,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

const THEME_CYAN = '#0062ff';
const RESOURCE_COLORS = {
    metal: '#E6953C',
    crystal: '#4CAEE6',
    deuterium: '#43D159',
    total: '#fff'
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

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const msuEntry = payload.find((entry: any) => entry.dataKey === 'msu');
        const regularPayload = payload.filter((entry: any) => entry.dataKey !== 'msu' && entry.dataKey !== 'total');
        const total = regularPayload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);

        return (
            <div className="glass" style={{
                padding: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                background: 'rgba(6, 11, 20, 0.95)',
                minWidth: '240px',
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
                            <span style={{ fontWeight: 700, color: '#fff' }}>{Math.floor(Number(entry.value) || 0).toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: THEME_CYAN }}>
                        <span>Total Units</span>
                        <span style={{ color: '#fff' }}>{Math.floor(total).toLocaleString()}</span>
                    </div>
                    {msuEntry && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: THEME_CYAN }}>
                            <span>Total (MSU)</span>
                            <span style={{ color: '#fff' }}>{Math.floor(Number(msuEntry.value) || 0).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const DebrisTable: React.FC<{
    harvests: any[],
    title: string
}> = ({ harvests, title }) => {
    const [page, setPage] = useState(1);
    const pageSize = 20;
    
    const sortedHarvests = useMemo(() => {
        return harvests.slice().sort((a, b) => b.timestamp - a.timestamp);
    }, [harvests]);

    const totalPages = Math.max(1, Math.ceil(sortedHarvests.length / pageSize));
    const currentHarvests = sortedHarvests.slice((page - 1) * pageSize, page * pageSize);

    // Reset to page 1 if harvests change significantly
    React.useEffect(() => {
        setPage(1);
    }, [harvests.length, title]);

    return (
        <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#fff' }}>{title} Reports</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '8px' }}>
                        Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, sortedHarvests.length)} of {sortedHarvests.length}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '4px',
                                color: page === 1 ? 'rgba(255,255,255,0.1)' : '#fff',
                                cursor: page === 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '4px',
                                color: page === totalPages ? 'rgba(255,255,255,0.1)' : '#fff',
                                cursor: page === totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85rem' }}>
                <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Coordinates</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>Metal</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>Crystal</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>Deuterium</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    {currentHarvests.map((h) => {
                        const metal = h.recycledResources?.metal || 0;
                        const crystal = h.recycledResources?.crystal || 0;
                        const deut = h.recycledResources?.deuterium || 0;
                        const total = metal + crystal + deut;
                        return (
                            <tr key={h.messageId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '12px' }}>{new Date(h.timestamp * 1000).toLocaleString()}</td>
                                <td style={{ padding: '12px' }}>{h.coords === '0:0:0' ? 'Unknown' : h.coords}</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: RESOURCE_COLORS.metal }}>{metal.toLocaleString()}</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: RESOURCE_COLORS.crystal }}>{crystal.toLocaleString()}</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: RESOURCE_COLORS.deuterium }}>{deut.toLocaleString()}</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{total.toLocaleString()}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const DebrisFields: React.FC = () => {
    const harvests = useLiveQuery(() => db.debrisHarvests.toArray()) || [];
    const settings = useLiveQuery(() => db.settings.get('conversion_rates'));
    const rates = settings || { metal: 3, crystal: 2, deuterium: 1 };

    const mMultiplier = 1;
    const cMultiplier = rates.metal / rates.crystal;
    const dMultiplier = rates.metal / rates.deuterium;

    const [activeTab, setActiveTab] = useState('overview');

    // Support deep-linking from Hotbar
    useEffect(() => {
        const checkPending = () => {
            const pending = sessionStorage.getItem('ognexus_target_subview');
            if (pending) {
                try {
                    const { view, tab } = JSON.parse(pending);
                    if (view === 'debris' && tab) {
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
            if (detail && detail.view === 'debris' && detail.tab) {
                setActiveTab(detail.tab);
            }
        };
        window.addEventListener('ognexus_navigated', handleNav);
        return () => {
            window.removeEventListener('ognexus_navigated', handleNav);
        };
    }, []);

    const TABS = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'system', label: 'System Debris Fields', icon: Globe },
        { id: 'expedition', label: 'Expedition Debris Fields', icon: Compass },
    ];

    const filteredHarvests = useMemo(() => {
        if (activeTab === 'overview') return harvests;
        if (activeTab === 'system') return harvests.filter(h => !h.coords.endsWith(':16'));
        if (activeTab === 'expedition') return harvests.filter(h => h.coords.endsWith(':16'));
        return harvests;
    }, [harvests, activeTab]);

    const stats = useMemo(() => {
        let totalMetal = 0;
        let totalCrystal = 0;
        let totalDeuterium = 0;
        let totalMSU = 0;

        filteredHarvests.forEach(h => {
            const m = h.recycledResources?.metal || 0;
            const c = h.recycledResources?.crystal || 0;
            const d = h.recycledResources?.deuterium || 0;
            totalMetal += m;
            totalCrystal += c;
            totalDeuterium += d;
            totalMSU += (m * mMultiplier) + (c * cMultiplier) + (d * dMultiplier);
        });

        return { totalMetal, totalCrystal, totalDeuterium, totalMSU, count: filteredHarvests.length };
    }, [filteredHarvests, mMultiplier, cMultiplier, dMultiplier]);

    const chartData = useMemo(() => {
        const dataMap: Record<string, { metal: number, crystal: number, deuterium: number, msu: number }> = {};
        
        filteredHarvests.forEach(h => {
            const date = new Date(h.timestamp * 1000);
            const dateKey = toLocaleDateKey(date);
            if (!dataMap[dateKey]) dataMap[dateKey] = { metal: 0, crystal: 0, deuterium: 0, msu: 0 };
            
            const m = h.recycledResources?.metal || 0;
            const c = h.recycledResources?.crystal || 0;
            const d = h.recycledResources?.deuterium || 0;
            dataMap[dateKey].metal += m;
            dataMap[dateKey].crystal += c;
            dataMap[dateKey].deuterium += d;
            dataMap[dateKey].msu += (m * mMultiplier) + (c * cMultiplier) + (d * dMultiplier);
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
    }, [filteredHarvests, mMultiplier, cMultiplier, dMultiplier]);

    const pieData = useMemo(() => {
        return [
            { name: 'Metal', value: stats.totalMetal, color: RESOURCE_COLORS.metal },
            { name: 'Crystal', value: stats.totalCrystal, color: RESOURCE_COLORS.crystal },
            { name: 'Deuterium', value: stats.totalDeuterium, color: RESOURCE_COLORS.deuterium },
        ].filter(d => d.value > 0);
    }, [stats]);

    return (
        <div className="view">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                    <h1>Debris Fields</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Track harvested debris fields and recycling efficiency.</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 8px' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            paddingBottom: '16px',
                            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === tab.id ? 700 : 500,
                            cursor: 'pointer',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabDebris"
                                style={{
                                    position: 'absolute',
                                    bottom: -1,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    background: 'var(--primary)',
                                    boxShadow: '0 0 10px var(--primary-glow)'
                                }}
                            />
                        )}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                        <Database size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Collected (MSU)</span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                        {Math.floor(stats.totalMSU).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', color: 'var(--primary)', fontSize: '0.8rem' }}>
                        <TrendingUp size={14} />
                        <span>{stats.count} Reports</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: RESOURCE_COLORS.metal }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Metal</span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: RESOURCE_COLORS.metal }}>
                        {Math.floor(stats.totalMetal).toLocaleString()}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: RESOURCE_COLORS.crystal }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Crystal</span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: RESOURCE_COLORS.crystal }}>
                        {Math.floor(stats.totalCrystal).toLocaleString()}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: RESOURCE_COLORS.deuterium }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Deuterium</span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: RESOURCE_COLORS.deuterium }}>
                        {Math.floor(stats.totalDeuterium).toLocaleString()}
                    </div>
                </motion.div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <div className="glass" style={{ padding: '24px', minHeight: '400px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                            <Zap size={20} color={THEME_CYAN} />
                            Harvest History (Last 30 Days)
                        </h3>
                    </div>
                    <div style={{ width: '100%', height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorMSU" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={THEME_CYAN} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={THEME_CYAN} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="displayDate"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    tickFormatter={formatYAxis}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="metal"
                                    stackId="1"
                                    stroke={RESOURCE_COLORS.metal}
                                    fill={RESOURCE_COLORS.metal}
                                    fillOpacity={0.1}
                                    name="Metal"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="crystal"
                                    stackId="1"
                                    stroke={RESOURCE_COLORS.crystal}
                                    fill={RESOURCE_COLORS.crystal}
                                    fillOpacity={0.1}
                                    name="Crystal"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="deuterium"
                                    stackId="1"
                                    stroke={RESOURCE_COLORS.deuterium}
                                    fill={RESOURCE_COLORS.deuterium}
                                    fillOpacity={0.1}
                                    name="Deuterium"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="msu"
                                    stroke={THEME_CYAN}
                                    fill="url(#colorMSU)"
                                    strokeWidth={3}
                                    name="Total (MSU)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ marginBottom: '24px', color: '#fff', alignSelf: 'flex-start' }}>Resource Distribution</h3>
                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'rgba(6, 11, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '0.8rem' }}
                                    formatter={(value: number | undefined) => (value || 0).toLocaleString()}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '20px' }}>
                        {pieData.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color }} />
                                    <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                                </div>
                                <span style={{ fontWeight: 600, color: '#fff' }}>
                                    {((d.value / (stats.totalMetal + stats.totalCrystal + stats.totalDeuterium)) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="glass" style={{ padding: '24px' }}>
                                <h3 style={{ marginBottom: '16px', color: '#fff' }}>Quick Summary</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>System Debris Harvested</span>
                                        <span style={{ color: '#fff', fontWeight: 600 }}>{harvests.filter(h => !h.coords.endsWith(':16')).length}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Expedition Debris Harvested</span>
                                        <span style={{ color: '#fff', fontWeight: 600 }}>{harvests.filter(h => h.coords.endsWith(':16')).length}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Total Recycling Capacity Used</span>
                                        <span style={{ color: '#fff', fontWeight: 600 }}>{harvests.reduce((acc, h) => acc + (h.recyclerAmount || 0), 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="glass" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                <div>
                                    <Search size={48} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '16px' }} />
                                    <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Detailed Reports</h4>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        Switch to System or Expedition tabs to see full harvest logs.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <DebrisTable 
                            harvests={filteredHarvests} 
                            title={activeTab === 'system' ? 'System Debris' : 'Expedition Debris'} 
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            <style>{`
                .view {
                    padding: 40px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                h1 {
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.02em;
                }
                .glass {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 24px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                }
            `}</style>
        </div>
    );
};

export default DebrisFields;
