import React, { useMemo, useState, useEffect } from 'react';
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
    Shield,
    Target,
    Trophy,
    Skull,
    TrendingUp,
    MapPin,
    BarChart3,
    History,
    Sword,
    Sword as SwordIcon,
    Flame,
    Box,
    Award,
    Zap,
    X,
    ExternalLink,
    ChevronRight,
    Circle,
    Search,
    ChevronLeft
} from 'lucide-react';
import { SHIP_DATA, RESEARCH_DATA, DEFENCE_DATA } from '../../db/staticData';

// --- Constants ---
const THEME_CRIMSON = '#ef4444';
const THEME_AMBER = '#f59e0b';
const THEME_CYAN = '#38bdf8';

const OUTCOME_COLORS = {
    attacker: '#22c55e', // Green for Attacker win (Account player win)
    defender: '#ef4444', // Red for Defender win (Account player loss)
    none: '#eab308',     // Yellow for Draw
};

const RESOURCE_COLORS = {
    metal: '#E6953C',
    crystal: '#4CAEE6',
    deuterium: '#43D159',
    food: '#EAB308',
    total: '#fff'
};

// --- Helpers ---
const toLocaleDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatYAxis = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1e12) return (value / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
    if (absValue >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (absValue >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (absValue >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return value.toString();
};

const Combat: React.FC = () => {
    const combatReports = useLiveQuery(() => db.combatReports.toArray()) || [];
    const settings = useLiveQuery(() => db.settings.get('conversion_rates'));
    const rates = settings || { metal: 3, crystal: 2, deuterium: 1 };

    // Multipliers for MSU: Metal base (1.0). Multiplier = MetalRate / OtherRate
    const mMultiplier = 1;
    const cMultiplier = rates.metal / rates.crystal;
    const dMultiplier = rates.metal / rates.deuterium;

    const account = useLiveQuery(() => db.accounts.toArray())?.[0];
    const playerName = account?.playerName || 'YOU';

    const getWinnerName = (cr: any) => {
        if (cr.winner === 'none') return 'NONE';
        if (cr.winner === 'attacker') return cr.attackerName || 'YOU';
        if (cr.winner === 'defender') {
            if (cr.isExpedition || cr.coords.trim().endsWith(':16')) {
                const defName = String(cr.defenderName || '').toLowerCase();
                if (cr.expeditionAttackType === 1 || defName.includes('pirat')) return 'Pirates';
                if (cr.expeditionAttackType === 2 || defName.includes('alien')) return 'Aliens';
                return 'Expedition Hostiles';
            }
            return cr.defenderName || 'Defender';
        }
        return cr.winner.toUpperCase();
    };

    const [activeTab, setActiveTab] = useState('overview');

    // Support deep-linking from Hotbar
    useEffect(() => {
        const checkPending = () => {
            const pending = sessionStorage.getItem('ognexus_target_subview');
            if (pending) {
                try {
                    const { view, tab } = JSON.parse(pending);
                    if (view === 'combat' && tab) {
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
            if (detail && detail.view === 'combat' && detail.tab) {
                setActiveTab(detail.tab);
            }
        };
        window.addEventListener('ognexus_navigated', handleNav);
        return () => {
            window.removeEventListener('ognexus_navigated', handleNav);
        };
    }, []);

    const [selectedReport, setSelectedReport] = useState<any>(null);

    // --- Pagination & Filtering ---
    const [currentPage, setCurrentPage] = useState(1);
    const [filterText, setFilterText] = useState('');
    const itemsPerPage = 10;

    const { paginatedList, totalPages, totalItems } = useMemo(() => {
        let filtered = [...combatReports].sort((a, b) => b.timestamp - a.timestamp);
        
        if (filterText) {
            const lowFilter = filterText.toLowerCase();
            filtered = filtered.filter(cr => 
                (cr.attackerName?.toLowerCase().includes(lowFilter)) || 
                (cr.defenderName?.toLowerCase().includes(lowFilter))
            );
        }
        
        const count = filtered.length;
        const pages = Math.ceil(count / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const items = filtered.slice(start, start + itemsPerPage);
        
        return { paginatedList: items, totalPages: pages, totalItems: count };
    }, [combatReports, filterText, currentPage]);

    // Reset page on filter change
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterText(e.target.value);
        setCurrentPage(1);
    };

    // --- Statistics ---
    const stats = useMemo(() => {
        const total = combatReports.length;
        if (total === 0) return null;

        let wins = 0;
        let losses = 0;
        let draws = 0;
        let totalLootMSU = 0;
        let totalDebrisMSU = 0;
        let totalAttackerLosses = 0;
        let totalDefenderLosses = 0;
        let totalHonor = 0;
        let moons = 0;

        combatReports.forEach(cr => {
            if (cr.winner === 'attacker') wins++;
            else if (cr.winner === 'defender') losses++;
            else draws++;

            const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
            const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);
            totalLootMSU += lMSU;

            const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
            const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);
            totalDebrisMSU += dMSU;

            totalAttackerLosses += cr.attackerLosses || 0;
            totalDefenderLosses += cr.defenderLosses || 0;
            totalHonor += cr.honor || 0;
            if (cr.moonChance && cr.moonChance > 0) {
                // We don't necessarily know if it was created from the scraper yet, but we have the chance
            }
        });

        const winRate = ((wins / total) * 100).toFixed(1);
        const profit = totalLootMSU + totalDebrisMSU - totalAttackerLosses;

        return {
            total, wins, losses, draws, winRate,
            totalLootMSU, totalDebrisMSU, totalAttackerLosses, totalDefenderLosses,
            totalHonor, profit
        };
    }, [combatReports, mMultiplier, cMultiplier, dMultiplier]);

    // --- Chart Data ---
    const outcomesPieData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'Wins', value: stats.wins, color: OUTCOME_COLORS.attacker },
            { name: 'Losses', value: stats.losses, color: OUTCOME_COLORS.defender },
            { name: 'Draws', value: stats.draws, color: OUTCOME_COLORS.none },
        ];
    }, [stats]);

    const msuOverTimeData = useMemo(() => {
        const dataMap: Record<string, { attacker: number, defender: number, profit: number }> = {};
        combatReports.forEach(cr => {
            const dateKey = toLocaleDateKey(new Date(cr.timestamp * 1000));
            if (!dataMap[dateKey]) dataMap[dateKey] = { attacker: 0, defender: 0, profit: 0 };
            
            dataMap[dateKey].attacker += cr.attackerLosses || 0;
            dataMap[dateKey].defender += cr.defenderLosses || 0;
            
            const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
            const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);
            const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
            const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);
            
            dataMap[dateKey].profit += (lMSU + dMSU - (cr.attackerLosses || 0));
        });

        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 14);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { attacker: 0, defender: 0, profit: 0 })
            });
        }
        return results;
    }, [combatReports, mMultiplier, cMultiplier, dMultiplier]);

    const zoneActivity = useMemo(() => {
        const zones: Record<string, number> = {};
        combatReports.forEach(cr => {
            const match = cr.coords.match(/(\d+):(\d+)/);
            if (match) {
                const zone = `${match[1]}:${match[2]}`;
                zones[zone] = (zones[zone] || 0) + 1;
            }
        });
        return Object.entries(zones)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [combatReports]);

    const recentCombats = paginatedList;

    if (!stats) {
        return (
            <div className="view">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Flame size={32} color={THEME_CRIMSON} />
                    <h1>Combat Command</h1>
                </div>
                <div className="glass" style={{ padding: '60px', textAlign: 'center', marginTop: '32px' }}>
                    <Sword size={64} color="rgba(255,255,255,0.1)" style={{ marginBottom: '24px' }} />
                    <div style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>No Combat Data Detected</div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '400px', margin: '0 auto' }}>
                        Engage hostile fleets or defensive installations to populate your tactical database.
                    </p>
                </div>

                <AnimatePresence>
                    {selectedReport && (
                        <CombatDetailModal 
                            report={selectedReport} 
                            onClose={() => setSelectedReport(null)} 
                            rates={rates} 
                            mMultiplier={mMultiplier}
                            cMultiplier={cMultiplier}
                            dMultiplier={dMultiplier}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="view">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Flame size={32} color={THEME_CRIMSON} />
                    <h1 style={{ margin: 0 }}>Combat Command</h1>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['overview', 'resources', 'zones', 'history'].map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`tab-btn ${activeTab === t ? 'active' : ''}`}
                            style={{
                                background: activeTab === t ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activeTab === t ? THEME_CRIMSON : 'rgba(255,255,255,0.1)',
                                color: activeTab === t ? '#fff' : 'rgba(255,255,255,0.5)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                            <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                                    <Sword size={80} />
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Engagements</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total}</div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', fontSize: '0.75rem' }}>
                                    <span style={{ color: OUTCOME_COLORS.attacker }}>{stats.wins} Wins</span>
                                    <span style={{ color: OUTCOME_COLORS.defender }}>{stats.losses} Losses</span>
                                    <span style={{ color: OUTCOME_COLORS.none }}>{stats.draws} Draws</span>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '24px', borderLeft: `4px solid ${THEME_AMBER}` }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Win Rate</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: THEME_AMBER }}>{stats.winRate}%</div>
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                        <div style={{ width: `${stats.winRate}%`, height: '100%', background: THEME_AMBER, borderRadius: '2px' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Profit (MSU)</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: stats.profit >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {stats.profit >= 0 ? '+' : ''}{formatYAxis(stats.profit)}
                                </div>
                                <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                    Revenue - Attacker Losses
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Honor Rank Impact</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: THEME_CYAN }}>
                                    {stats.totalHonor >= 0 ? '+' : ''}{stats.totalHonor.toLocaleString()}
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <Award size={16} color={THEME_CYAN} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Tactical Merit accumulated</span>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '32px' }}>
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Target size={18} color={THEME_CRIMSON} />
                                    Mission Success Rate
                                </div>
                                <div style={{ height: '240px' }}>
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <PieChart>
                                            <Pie
                                                data={outcomesPieData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {outcomesPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ background: 'rgba(10, 15, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                itemStyle={{ fontSize: '0.8rem', fontWeight: 700 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                                    {outcomesPieData.map(d => (
                                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color }} />
                                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={18} color={THEME_AMBER} />
                                    MSU Performance Registry
                                </div>
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <AreaChart data={msuOverTimeData}>
                                            <defs>
                                                <linearGradient id="colorAttacker" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={OUTCOME_COLORS.defender} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={OUTCOME_COLORS.defender} stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis
                                                dataKey="displayDate"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                                tickFormatter={formatYAxis}
                                            />
                                            <Tooltip
                                                contentStyle={{ background: 'rgba(10, 15, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                labelStyle={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}
                                                itemStyle={{ fontSize: '0.8rem' }}
                                            />
                                            <Area type="monotone" name="Losses (MSU)" dataKey="attacker" stroke={OUTCOME_COLORS.defender} fillOpacity={1} fill="url(#colorAttacker)" />
                                            <Area type="monotone" name="Profit (MSU)" dataKey="profit" stroke="#22c55e" fillOpacity={1} fill="url(#colorProfit)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Recent & Zones Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                        <History size={18} color={THEME_CYAN} />
                                        Combat Log
                                    </div>
                                    <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, color: THEME_CYAN }} />
                                        <input 
                                            type="text" 
                                            value={filterText}
                                            onChange={handleFilterChange}
                                            placeholder="Filter by name..."
                                            title="filter by attacker/defender name"
                                            style={{
                                                width: '100%',
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '20px',
                                                padding: '10px 16px 10px 44px',
                                                fontSize: '0.8rem',
                                                color: '#fff',
                                                outline: 'none',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                            }}
                                            onFocus={e => {
                                                e.currentTarget.style.borderColor = THEME_CYAN;
                                                e.currentTarget.style.boxShadow = `0 0 15px ${THEME_CYAN}30, inset 0 2px 4px rgba(0,0,0,0.2)`;
                                            }}
                                            onBlur={e => {
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                                e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.75rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', opacity: 0.5 }}>
                                                <th style={{ padding: '12px 0', fontWeight: 700 }}>COORD/TIME</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700 }}>ATTACKER</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'center' }}>VS</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700 }}>DEFENDER</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700 }}>WINNER</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'right' }}>LOOT MSU</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'right' }}>DEBRIS MSU</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentCombats.map((cr, idx) => {
                                                const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
                                                const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
                                                const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);

                                                const winnerName = getWinnerName(cr);
                                                const isAccountWin = (cr.winner === 'attacker' && cr.attackerName === playerName) ||
                                                                    (cr.winner === 'defender' && cr.defenderName === playerName);
                                                const isTie = cr.winner === 'none';
                                                
                                                const statusColor = isAccountWin ? '#22c55e' : (isTie ? '#eab308' : '#ef4444');
                                                const rowBg = isAccountWin ? 'rgba(34, 197, 94, 0.03)' : (isTie ? 'rgba(234, 179, 8, 0.03)' : 'rgba(239, 68, 68, 0.03)');
                                                const prefix = isAccountWin ? '+' : (isTie ? '' : '-');

                                                const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);

                                                return (
                                                    <tr key={idx} 
                                                        onClick={() => setSelectedReport(cr)}
                                                        style={{ 
                                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                            background: rowBg,
                                                            transition: 'all 0.2s',
                                                            cursor: 'pointer'
                                                        }}
                                                        className="combat-row-hover"
                                                    >
                                                        <td style={{ padding: '10px 0' }}>
                                                            <div style={{ fontWeight: 800 }}>{cr.coords}</div>
                                                            <div style={{ fontSize: '0.65rem', opacity: 0.4 }}>{new Date(cr.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </td>
                                                        <td style={{ padding: '10px 8px' }}>
                                                            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }} title={cr.attackerName}>
                                                                {cr.attackerName || 'Unknown'}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                            <SwordIcon size={12} style={{ opacity: 0.3 }} />
                                                        </td>
                                                        <td style={{ padding: '10px 8px' }}>
                                                            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }} title={cr.defenderName}>
                                                                {cr.defenderName || 'Unknown'}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 8px' }}>
                                                            <span style={{ color: statusColor, fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                                                {getWinnerName(cr)}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                                            <div style={{ color: statusColor, fontWeight: 700 }}>
                                                                {prefix}{formatYAxis(lMSU)}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, opacity: 0.8 }}>
                                                            {formatYAxis(dMSU)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination Controls */}
                                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', opacity: 0.8 }}>
                                    <div style={{ opacity: 0.5 }}>
                                        Showing {recentCombats.length} of {totalItems} reports
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                cursor: currentPage === 1 ? 'default' : 'pointer',
                                                opacity: currentPage === 1 ? 0.3 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <ChevronLeft size={14} />
                                            Prev
                                        </button>
                                        <span style={{ fontWeight: 700 }}>
                                            Page {currentPage} of {totalPages || 1}
                                        </span>
                                        <button 
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                cursor: currentPage >= totalPages ? 'default' : 'pointer',
                                                opacity: currentPage >= totalPages ? 0.3 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            Next
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                        </div>

                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={18} color={THEME_AMBER} />
                                    Tactical Hotspots
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {zoneActivity.map(([zone, count], idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                color: THEME_AMBER,
                                                width: '24px',
                                                height: '24px',
                                                border: `1px solid ${THEME_AMBER}`,
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flexGrow: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Galaxy {zone}</span>
                                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{count} Ops</span>
                                                </div>
                                                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                                    <div style={{
                                                        width: `${(count / stats.total) * 100}%`,
                                                        height: '100%',
                                                        background: `linear-gradient(to right, ${THEME_AMBER}, ${THEME_CRIMSON})`,
                                                        borderRadius: '2px'
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(245, 158, 11, 0.05)', border: `1px dashed ${THEME_AMBER}40`, borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <Shield size={24} color={THEME_AMBER} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: THEME_AMBER, marginBottom: '4px' }}>Strategic Recommendation</div>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                                                    High concentration of activity detected in {zoneActivity[0]?.[0] || 'designated sectors'}. 
                                                    Allocate recyclers for debris field collection in these hotspots to maximize recovery.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'resources' && (
                    <motion.div
                        key="resources"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card"
                        style={{ padding: '32px' }}
                    >
                         <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Box size={24} color={THEME_CYAN} />
                            Logistics & Recovery Breakdown
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                            <div>
                                <h3 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>Direct Loot Seized</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {['metal', 'crystal', 'deuterium'].map(r => {
                                        const val = combatReports.reduce((sum, cr) => sum + (cr.loot?.[r as keyof typeof cr.loot] || 0), 0);
                                        return (
                                            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: RESOURCE_COLORS[r as keyof typeof RESOURCE_COLORS] }} />
                                                </div>
                                                <div style={{ flexGrow: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize' }}>{r}</span>
                                                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{val.toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                                        Contribution to total payload: {((val * (r === 'metal' ? mMultiplier : r === 'crystal' ? cMultiplier : dMultiplier)) / stats.totalLootMSU * 100 || 0).toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>Debris Field Generation</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {['metal', 'crystal', 'deuterium'].map(r => {
                                        const val = combatReports.reduce((sum, cr) => sum + (cr.debris?.[r as keyof typeof cr.debris] || 0), 0);
                                        return (
                                            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: RESOURCE_COLORS[r as keyof typeof RESOURCE_COLORS], opacity: 0.6 }} />
                                                </div>
                                                <div style={{ flexGrow: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize' }}>{r}</span>
                                                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{val.toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                                        Theoretical maximum recovery
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '40px', display: 'flex', gap: '24px' }}>
                             <div style={{ flexGrow: 1, padding: '24px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', marginBottom: '12px' }}>Revenue Yield</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{formatYAxis(stats.totalLootMSU + stats.totalDebrisMSU)} MSU</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>Combined Loot and Debris</div>
                             </div>
                             <div style={{ flexGrow: 1, padding: '24px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '12px' }}>Operation Costs</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{formatYAxis(stats.totalAttackerLosses)} MSU</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>Total Fleet Losses (Attacker)</div>
                             </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'history' && (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-card"
                        style={{ padding: '0' }}
                    >
                        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <BarChart3 size={24} color={THEME_AMBER} />
                                Full Engagement History
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                             <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ textAlign: 'left', padding: '16px', fontWeight: 700 }}>TIMESTAMP</th>
                                        <th style={{ textAlign: 'left', padding: '16px', fontWeight: 700 }}>ATTACKER</th>
                                        <th style={{ textAlign: 'center', padding: '16px', fontWeight: 700 }}>VS</th>
                                        <th style={{ textAlign: 'left', padding: '16px', fontWeight: 700 }}>DEFENDER</th>
                                        <th style={{ textAlign: 'center', padding: '16px', fontWeight: 700 }}>WINNER</th>
                                        <th style={{ textAlign: 'right', padding: '16px', fontWeight: 700 }}>LOOT MSU</th>
                                        <th style={{ textAlign: 'right', padding: '16px', fontWeight: 700 }}>DEBRIS MSU</th>
                                        <th style={{ textAlign: 'right', padding: '16px', fontWeight: 700 }}>LOSSES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {combatReports.sort((a,b) => b.timestamp - a.timestamp).map((cr, idx) => {
                                        const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
                                        const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
                                        
                                        const winnerName = getWinnerName(cr);
                                        const isAccountWin = (cr.winner === 'attacker' && cr.attackerName === playerName) ||
                                                            (cr.winner === 'defender' && cr.defenderName === playerName);
                                        const isTie = cr.winner === 'none';

                                        const rowBg = isAccountWin ? 'rgba(34, 197, 94, 0.05)' : (isTie ? 'rgba(234, 179, 8, 0.05)' : 'rgba(239, 68, 68, 0.05)');
                                        const statusColor = isAccountWin ? '#22c55e' : (isTie ? '#eab308' : '#ef4444');
                                        const prefix = isAccountWin ? '+' : (isTie ? '' : '-');

                                        const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);
                                        const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);

                                        return (
                                            <tr key={idx} 
                                                onClick={() => setSelectedReport(cr)}
                                                style={{ 
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)', 
                                                    transition: 'all 0.2s',
                                                    background: rowBg,
                                                    cursor: 'pointer'
                                                }}
                                                className="combat-row-hover"
                                            >
                                                <td style={{ padding: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{new Date(cr.timestamp * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                <td style={{ padding: '16px', fontWeight: 700 }}>{cr.attackerName || 'Unknown'}</td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}><SwordIcon size={14} style={{ opacity: 0.3 }} /></td>
                                                <td style={{ padding: '16px', fontWeight: 700 }}>{cr.defenderName || 'Unknown'}</td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 900,
                                                        background: statusColor + '20',
                                                        color: statusColor,
                                                        textTransform: 'uppercase',
                                                        border: `1px solid ${statusColor}40`
                                                    }}>
                                                        {getWinnerName(cr)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', color: statusColor, fontWeight: 700 }}>
                                                    {prefix}{formatYAxis(lMSU)}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, opacity: 0.8 }}>
                                                    {formatYAxis(dMSU)}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', color: '#ef4444', opacity: 0.8 }}>{formatYAxis(cr.attackerLosses)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedReport && (
                    <CombatDetailModal 
                        report={selectedReport} 
                        onClose={() => setSelectedReport(null)} 
                        rates={rates} 
                        mMultiplier={mMultiplier}
                        cMultiplier={cMultiplier}
                        dMultiplier={dMultiplier}
                    />
                )}
            </AnimatePresence>

            <style>{`
                .tab-btn:hover { background: rgba(239, 68, 68, 0.05) !important; color: #fff !important; }
                .tab-btn.active:hover { background: rgba(239, 68, 68, 0.2) !important; }
                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
                }
                tr:hover { background: rgba(255,255,255,0.02); }
                .combat-row-hover:hover {
                    background: rgba(255, 255, 255, 0.06) !important;
                    transform: translateX(4px);
                }
            `}</style>
        </div>
    );
};

const CombatDetailModal = ({ report, onClose, rates, mMultiplier, cMultiplier, dMultiplier }: { report: any, onClose: () => void, rates: any, mMultiplier: number, cMultiplier: number, dMultiplier: number }) => {
    const account = useLiveQuery(() => db.accounts.toArray())?.[0];
    const accountPlayerName = account?.playerName || 'YOU';
    
    const isAccountWin = (report.winner === 'attacker' && report.attackerName === accountPlayerName) ||
                        (report.winner === 'defender' && report.defenderName === accountPlayerName);
    const isTie = report.winner === 'none';
                        
    const themeColor = isAccountWin ? '#22c55e' : (isTie ? '#eab308' : '#ef4444');

    // Extract fleet and tech data from rawResult/rawFleets
    const participants = Array.isArray(report.rawFleets) ? report.rawFleets : [];
    const attackers = participants.filter((p: any) => p.side === 'attacker');
    const defenders = participants.filter((p: any) => p.side === 'defender');

    const renderFleet = (fleet: any[], sideColor: string) => {
        if (fleet.length === 0) return <div style={{ opacity: 0.3, fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>No tactical data found</div>;
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {fleet.map((p, pIdx) => (
                    <div key={pIdx} className="glass-card" style={{ padding: '20px', borderLeft: `4px solid ${sideColor}` }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: '12px', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{p.player?.name || 'Unknown Participant'}</span>
                        </div>
                        
                        {/* Research Levels */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {p.combatResearchPercentage?.map((res: any) => {
                                let label = '';
                                if (res.id === 109) label = 'WT';
                                else if (res.id === 110) label = 'ST';
                                else if (res.id === 111) label = 'AT';
                                if (!label) return null;
                                return (
                                    <div key={res.id} style={{ fontSize: '0.65rem', fontWeight: 900, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span style={{ opacity: 0.5, marginRight: '4px' }}>{label}</span>
                                        {res.percentage / 10}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Technology / Ships Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                            {p.combatTechnologies?.map((tech: any) => {
                                const info = [...SHIP_DATA, ...DEFENCE_DATA].find(s => s.id === tech.technologyId);
                                if (!info || tech.amount === 0) return null;
                                
                                return (
                                    <div key={tech.technologyId} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <img src={info.icon} alt={info.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                            <span style={{ fontSize: '0.65rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.name}</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>{formatYAxis(tech.amount)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
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
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.9)',
                    backdropFilter: 'blur(20px)',
                    pointerEvents: 'auto'
                }}
                onClick={onClose}
            />
            <motion.div 
                initial={{ scale: 0.9, y: 40, rotateX: -10 }}
                animate={{ scale: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.9, y: 40, rotateX: -10 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '1280px',
                    maxHeight: '94vh',
                    margin: '20px auto',
                    background: 'linear-gradient(135deg, #1a1f25 0%, #0d1115 100%)',
                    borderRadius: '32px',
                    border: `1px solid ${themeColor}30`,
                    boxShadow: `0 0 50px ${themeColor}15, 0 25px 50px -12px rgba(0, 0, 0, 0.8)`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    perspective: '1000px',
                    zIndex: 1
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div style={{ padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                        <div style={{ 
                            background: themeColor, 
                            color: '#000', 
                            padding: '12px 24px', 
                            borderRadius: '16px', 
                            fontSize: '1rem', 
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            boxShadow: `0 8px 16px ${themeColor}40`
                        }}>
                            {isAccountWin ? 'OBJECTIVE SECURED' : (isTie ? 'TACTICAL DRAW' : 'OPERATIONAL FAILURE')}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-1px' }}>Deployment Report: {report.coords}</div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.4, fontWeight: 600 }}>Timestamp: {new Date(report.timestamp * 1000).toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <button onClick={onClose} style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s' }} aria-label="Close">
                        <X size={28} />
                    </button>
                </div>

                {/* Main Battle Visual Area */}
                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 48px 48px 48px' }}>
                    
                    {/* The "Fight" Layout */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative', minHeight: '400px' }}>
                        
                        {/* Left Wing: Attacker */}
                        <div style={{ flex: 1, padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', justifyContent: 'flex-end' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 800, textTransform: 'uppercase' }}>Assault Leader</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>Attacker ({report.attackerName || 'Unknown'})</div>
                                </div>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Sword size={32} color="#ef4444" />
                                </div>
                            </div>
                            {renderFleet(attackers, '#ef4444')}
                        </div>

                        {/* Center: VS Divider */}
                        <div style={{ width: '100px', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '100px', bottom: '100px', width: '2px', background: 'rgba(255,255,255,0.05)' }} />
                            <div style={{ 
                                marginTop: '120px',
                                width: '50px', height: '50px', 
                                borderRadius: '50%', 
                                background: '#0d1115', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem', fontWeight: 900, color: themeColor,
                                zIndex: 1,
                                boxShadow: `0 0 20px ${themeColor}20`
                            }}>VS</div>
                        </div>

                        {/* Right Wing: Defender */}
                        <div style={{ flex: 1, padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Shield size={32} color="#22c55e" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 800, textTransform: 'uppercase' }}>Planetary Defense</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>Defender ({report.defenderName || 'Unknown'})</div>
                                </div>
                            </div>
                            {renderFleet(defenders, '#22c55e')}
                        </div>
                    </div>

                    {/* Summary Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', marginTop: '48px' }}>
                        
                         {/* Loot Card */}
                         <div className="glass-card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, opacity: 0.5, marginBottom: '24px', letterSpacing: '1px' }}>RESOURCES SEIZED</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {['metal', 'crystal', 'deuterium'].map(res => (
                                    <div key={res} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: RESOURCE_COLORS[res as keyof typeof RESOURCE_COLORS] }} />
                                            <span style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'capitalize' }}>{res}</span>
                                        </div>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatYAxis(report.loot?.[res] || 0)}</span>
                                    </div>
                                ))}
                            </div>
                            <Box size={80} style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.03, transform: 'rotate(-15deg)' }} />
                         </div>

                         {/* Debris Card */}
                         <div className="glass-card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, opacity: 0.5, marginBottom: '24px', letterSpacing: '1px' }}>DEBRIS FIELD GENERATION</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.6 }}>Metal Recovery</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatYAxis(report.debris?.metal || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.6 }}>Crystal Recovery</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatYAxis(report.debris?.crystal || 0)}</span>
                                </div>
                                <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: THEME_AMBER }}>EQUIVALENT YIELD</span>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 950, color: THEME_AMBER }}>{formatYAxis((report.debris?.metal || 0) * mMultiplier + (report.debris?.crystal || 0) * cMultiplier)} MSU</span>
                                </div>
                            </div>
                            <Zap size={80} style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.03, transform: 'rotate(-15deg)' }} />
                         </div>

                         {/* Net Result Card */}
                         <div className="glass-card" style={{ padding: '32px', background: `${themeColor}08`, border: `1px solid ${themeColor}20`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: themeColor, marginBottom: '12px', letterSpacing: '2px' }}>NET OPERATIONAL PROFIT</div>
                            <div style={{ fontSize: '3.2rem', fontWeight: 1000, color: themeColor, textShadow: `0 0 30px ${themeColor}40` }}>
                                {isAccountWin ? '+' : ''}{formatYAxis((report.loot?.metal || 0) * mMultiplier + (report.loot?.crystal || 0) * cMultiplier + (report.loot?.deuterium || 0) * dMultiplier + (report.debris?.metal || 0) * mMultiplier + (report.debris?.crystal || 0) * cMultiplier - report.attackerLosses)}
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, opacity: 0.4, marginTop: '8px' }}>TOTAL MSU IMPACT</div>
                            <TrendingUp size={100} style={{ position: 'absolute', opacity: 0.05, bottom: '10px' }} />
                         </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div style={{ padding: '32px 48px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            background: themeColor,
                            color: '#000',
                            border: 'none',
                            padding: '16px 48px',
                            borderRadius: '20px',
                            fontSize: '1rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            boxShadow: `0 8px 24px ${themeColor}40`,
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                    >
                        ACKNOWLEDGE REPORT
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Combat;
