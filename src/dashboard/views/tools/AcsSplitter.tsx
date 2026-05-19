import React, { useState, useEffect } from 'react';
import {
    Target, Download, Trophy, Users, Layers, AlertCircle, TrendingUp,
    Shield, Rocket, Info, X, Settings, PieChart, Gavel, Coins
} from 'lucide-react';
import { SHIP_DATA, DEFENCE_DATA } from '../../../db/staticData';

interface CombatReport {
    key: string;
    RESULT_CODE: number;
    RESULT_DATA: {
        generic: {
            winner: string;
            combat_rounds: number;
            event_time: string;
            combat_coordinates: string;
            debris_metal: number;
            debris_crystal: number;
            debris_deuterium: number;
            debris_reaper_metal_retrieved?: number;
            debris_reaper_crystal_retrieved?: number;
            debris_reaper_deuterium_retrieved?: number;
            units_lost_attackers: number;
            units_lost_defenders: number;
            wreckfield?: Array<{
                ship_type: number;
                count: number;
            }>;
        };
        attackers: Array<{
            fleet_owner: string;
            fleet_owner_alliance_tag?: string;
            fleet_composition: Array<{
                ship_type: number;
                count: number;
            }>;
        }>;
        defenders: Array<{
            fleet_owner: string;
            fleet_owner_alliance_tag?: string;
            fleet_composition: Array<{
                ship_type: number;
                count: number;
            }>;
        }>;
    };
}

interface RecycleReport {
    key: string;
    RESULT_CODE: number;
    RESULT_MESSAGE?: string;
    RESULT_DATA: {
        generic: {
            owner_id: number;
            owner_name: string;
            recycler_count: number;
            reaper_count: number;
            recycler_metal_retrieved?: number;
            recycler_crystal_retrieved?: number;
            reaper_metal_retrieved?: number;
            reaper_crystal_retrieved?: number;
        };
    };
}

const AcsSplitter: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [rrKey, setRrKey] = useState('');
    const [reports, setReports] = useState<CombatReport[]>([]); // Changed from single report to array
    const [rrReports, setRrReports] = useState<RecycleReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [rrLoading, setRrLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rrError, setRrError] = useState<string | null>(null);

    // Settings (Alpha)
    const [splitMethod, setSplitMethod] = useState<'equal' | 'contribution' | 'capacity'>('equal');

    const getShipInfo = (id: number) => {
        return SHIP_DATA.find(s => s.id === id) || DEFENCE_DATA.find(d => d.id === id);
    };

    const fetchReport = async () => {
        const trimmedKey = apiKey.trim();
        if (!trimmedKey.toLowerCase().startsWith('cr-')) {
            setError('Please enter a valid Combat Report (cr-) API key');
            return;
        }

        if (reports.some(r => r.key === trimmedKey)) {
            setError('This combat report has already been added.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            chrome.runtime.sendMessage(
                { type: "FETCH_COMBAT_REPORT", apiKey: trimmedKey },
                (response) => {
                    setLoading(false);
                    if (chrome.runtime.lastError) {
                        setError(`Runtime error: ${chrome.runtime.lastError.message}`);
                        return;
                    }

                    if (response && response.success) {
                        const data = response.data;
                        if (data.RESULT_CODE !== 1000) {
                            setError(data.RESULT_MESSAGE || 'API returned an error');
                        } else {
                            setReports(prev => [...prev, { ...data, key: trimmedKey }]);
                            setApiKey('');
                        }
                    } else {
                        setError(response?.error || 'Failed to fetch report from background service');
                    }
                }
            );
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            setLoading(false);
        }
    };

    const removeReport = (key: string) => {
        setReports(prev => prev.filter(r => r.key !== key));
    };

    const fetchRrReport = async () => {
        if (!rrKey.trim().toLowerCase().startsWith('rr-')) {
            setRrError('Please enter a valid Recycle Report (rr-) API key');
            return;
        }
        if (rrReports.some(r => r.key === rrKey.trim())) {
            setRrError('This recycle report has already been added.');
            return;
        }

        setRrLoading(true);
        setRrError(null);

        try {
            chrome.runtime.sendMessage(
                { type: "FETCH_COMBAT_REPORT", apiKey: rrKey.trim() },
                (response) => {
                    setRrLoading(false);
                    if (chrome.runtime.lastError) {
                        setRrError(`Runtime error: ${chrome.runtime.lastError.message}`);
                        return;
                    }

                    if (response && response.success) {
                        const data = response.data;
                        if (data.RESULT_CODE !== 1000) {
                            setRrError(data.RESULT_MESSAGE || 'API returned an error');
                        } else {
                            setRrReports(prev => [...prev, { ...data, key: rrKey.trim() }]);
                            setRrKey('');
                        }
                    } else {
                        setRrError(response?.error || 'Failed to fetch report from background service');
                    }
                }
            );
        } catch (err: any) {
            setRrError(err.message || 'An unexpected error occurred');
            setRrLoading(false);
        }
    };

    const removeRrReport = (key: string) => {
        setRrReports(prev => prev.filter(r => r.key !== key));
    };

    const groupedDebris = React.useMemo(() => {
        const groups = new Map<string, { owner: string; metal: number; crystal: number; times: number }>();
        rrReports.forEach(rr => {
            if (!rr.RESULT_DATA || !rr.RESULT_DATA.generic) return;
            const owner = rr.RESULT_DATA.generic.owner_name;
            const met = (rr.RESULT_DATA.generic.recycler_metal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_metal_retrieved || 0);
            const cry = (rr.RESULT_DATA.generic.recycler_crystal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_crystal_retrieved || 0);

            if (!groups.has(owner)) {
                groups.set(owner, { owner, metal: met, crystal: cry, times: 1 });
            } else {
                const existing = groups.get(owner)!;
                existing.metal += met;
                existing.crystal += cry;
                existing.times += 1;
            }
        });
        return Array.from(groups.values());
    }, [rrReports]);

    const formatNumber = (num: number | undefined | null) => (num || 0).toLocaleString();

    const combinedReport = React.useMemo(() => {
        if (reports.length === 0) return null;

        // Start with a deep copy of the first report's data structure
        const first = reports[0];
        const result = {
            ...first,
            RESULT_DATA: {
                ...first.RESULT_DATA,
                generic: { ...first.RESULT_DATA.generic },
                attackers: [] as any[],
                defenders: [] as any[]
            }
        };

        const gen = result.RESULT_DATA.generic;

        // Sum generic data and wreckfield from all reports
        // We start i from 1 for summing, because result already has first report's values
        // Actually, let's just initialize result with 0s and sum all to be cleaner? 
        // No, strings like winner/event_time/coords should probably come from the last report or similar.
        // User said "summed together", let's sum resources and merge participants.

        // Let's reset the sumable fields to 0 first to avoid double counting first report
        gen.debris_metal = 0;
        gen.debris_crystal = 0;
        gen.debris_deuterium = 0;
        gen.debris_reaper_metal_retrieved = 0;
        gen.debris_reaper_crystal_retrieved = 0;
        gen.debris_reaper_deuterium_retrieved = 0;
        gen.units_lost_attackers = 0;
        gen.units_lost_defenders = 0;
        gen.wreckfield = [];

        reports.forEach(r => {
            const rg = r.RESULT_DATA.generic;
            gen.debris_metal += (rg.debris_metal || 0);
            gen.debris_crystal += (rg.debris_crystal || 0);
            gen.debris_deuterium += (rg.debris_deuterium || 0);
            gen.debris_reaper_metal_retrieved! += (rg.debris_reaper_metal_retrieved || 0);
            gen.debris_reaper_crystal_retrieved! += (rg.debris_reaper_crystal_retrieved || 0);
            gen.debris_reaper_deuterium_retrieved! += (rg.debris_reaper_deuterium_retrieved || 0);
            gen.units_lost_attackers += (rg.units_lost_attackers || 0);
            gen.units_lost_defenders += (rg.units_lost_defenders || 0);

            if (rg.wreckfield) {
                rg.wreckfield.forEach(w => {
                    const existing = gen.wreckfield!.find(ex => ex.ship_type === w.ship_type);
                    if (existing) existing.count += w.count;
                    else gen.wreckfield!.push({ ...w });
                });
            }
        });

        // Set the winner/coords from the last report (most recent wave)
        const last = reports[reports.length - 1];
        gen.winner = last.RESULT_DATA.generic.winner;
        gen.combat_coordinates = last.RESULT_DATA.generic.combat_coordinates;
        gen.event_time = last.RESULT_DATA.generic.event_time;

        const mergeFleets = (allFleets: any[][]) => {
            const mergedMap = new Map<string, any>();

            allFleets.flat().forEach(participant => {
                const key = participant.fleet_owner;
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, {
                        ...participant,
                        fleet_composition: participant.fleet_composition.map((s: any) => ({ ...s }))
                    });
                } else {
                    const existing = mergedMap.get(key);
                    participant.fleet_composition.forEach((ship: any) => {
                        const existingShip = existing.fleet_composition.find((s: any) => s.ship_type === ship.ship_type);
                        if (existingShip) {
                            existingShip.count += (ship.count || 0);
                        } else {
                            existing.fleet_composition.push({ ...ship });
                        }
                    });
                }
            });

            return Array.from(mergedMap.values());
        };

        result.RESULT_DATA.attackers = mergeFleets(reports.map(r => r.RESULT_DATA.attackers));
        result.RESULT_DATA.defenders = mergeFleets(reports.map(r => r.RESULT_DATA.defenders));

        return result;
    }, [reports]);

    const winnerColor = combinedReport?.RESULT_DATA.generic.winner === 'attacker' ? 'var(--primary)' :
        combinedReport?.RESULT_DATA.generic.winner === 'defender' ? '#ff5f5f' :
            'var(--text-muted)';

    const winnerIcon = combinedReport?.RESULT_DATA.generic.winner === 'attacker' ? <Rocket size={20} /> :
        combinedReport?.RESULT_DATA.generic.winner === 'defender' ? <Shield size={20} /> :
            <Gavel size={20} />;

    return (
        <div className="acs-splitter-container" style={{ padding: '0 8px' }}>
            {!combinedReport ? (
                <div style={{ textAlign: 'center', padding: '100px 20px', opacity: 0.5 }}>
                    {!loading ? (
                        <>
                            <div className="config-card glass" style={{ maxWidth: '500px', margin: '0 auto 40px', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                                    <Target size={18} /> Strategic Combat Import
                                </label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="cr-en-XXX-XXXXXX..."
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        style={{
                                            flex: 1,
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            padding: '12px 16px',
                                            color: '#fff',
                                            outline: 'none',
                                            fontFamily: 'monospace',
                                            fontSize: '1rem'
                                        }}
                                    />
                                    <button
                                        onClick={fetchReport}
                                        disabled={loading}
                                        style={{
                                            background: 'var(--primary)',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '12px',
                                            padding: '0 24px',
                                            fontWeight: 700,
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            opacity: loading ? 0.7 : 1
                                        }}
                                    >
                                        <Download size={18} /> Import
                                    </button>
                                </div>
                                {error && <div style={{ color: '#ff5f5f', fontSize: '0.85rem', marginTop: '16px' }}>{error}</div>}
                            </div>

                            <Info size={48} style={{ marginBottom: '24px', color: 'var(--primary)', opacity: 0.4 }} />
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', opacity: 0.8 }}>ACS Split Optimization</h2>
                            <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '1rem', lineHeight: 1.6, opacity: 0.6 }}>
                                Provide a combat report to begin. We'll help you group recycling reports and calculate fair profit distributions.
                            </p>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                            <div className="loader-ring" style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--primary)' }}>DECRYPTING BATTLE DATA...</div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="acs-layout-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(340px, 1fr) minmax(340px, 1fr) minmax(340px, 1fr)',
                    gap: '24px',
                    alignItems: 'start'
                }}>

                    {/* Column 1: Battle Intel */}
                    <div className="col-intel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Target size={14} /> Combat Reports ({reports.length})
                                </div>
                                <button onClick={() => { setReports([]); setRrReports([]); setApiKey(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Reset All Data"><X size={14} /></button>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="text"
                                    placeholder="Add wave (cr-)..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        color: '#fff',
                                        outline: 'none',
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem'
                                    }}
                                />
                                <button
                                    onClick={fetchReport}
                                    disabled={loading}
                                    style={{ background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '12px', padding: '0 16px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    {loading ? '...' : <Download size={18} />}
                                </button>
                            </div>
                            {error && <div style={{ color: '#ff5f5f', fontSize: '0.75rem', marginBottom: '10px' }}>{error}</div>}

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {reports.map((r, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        fontSize: '0.7rem', background: 'rgba(0,0,0,0.3)',
                                        padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <span style={{ opacity: 0.6, fontFamily: 'monospace' }}>{r.key.split('-').pop()?.slice(-6)}</span>
                                        <X size={12} style={{ color: '#ff5f5f', cursor: 'pointer' }} onClick={() => removeReport(r.key)} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden', border: `1px solid ${winnerColor}40` }}>
                            <div style={{ background: `${winnerColor}15`, padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '14px', background: winnerColor, color: '#000',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>{winnerIcon}</div>
                                <div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'capitalize', color: winnerColor }}>
                                        {combinedReport.RESULT_DATA.generic.winner === 'draw' ? 'Draw' : `${combinedReport.RESULT_DATA.generic.winner}s Win`}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 700 }}>Coords: {combinedReport.RESULT_DATA.generic.combat_coordinates}</div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <Users size={18} color="var(--primary)" />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Fleet Commanders</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>Attackers</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {combinedReport.RESULT_DATA.attackers.map((a, i) => (
                                            <span key={i} style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', background: 'rgba(0,242,255,0.1)', color: 'var(--primary)', borderRadius: '8px' }}>{a.fleet_owner}</span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#ff5f5f', textTransform: 'uppercase', marginBottom: '6px' }}>Defenders</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {combinedReport.RESULT_DATA.defenders.map((d, i) => (
                                            <span key={i} style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', background: 'rgba(255,95,95,0.1)', color: '#ff5f5f', borderRadius: '8px' }}>{d.fleet_owner}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <TrendingUp size={18} color="var(--primary)" />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Resource Impact</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', borderLeft: '3px solid var(--color-metal)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}>METAL DEBRIS</span>
                                    <span style={{ fontWeight: 800, color: 'var(--color-metal)' }}>{formatNumber(combinedReport.RESULT_DATA.generic.debris_metal)}</span>
                                </div>
                                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', borderLeft: '3px solid var(--color-crystal)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}>CRYSTAL DEBRIS</span>
                                    <span style={{ fontWeight: 800, color: 'var(--color-crystal)' }}>{formatNumber(combinedReport.RESULT_DATA.generic.debris_crystal)}</span>
                                </div>
                                {(combinedReport.RESULT_DATA.generic.debris_reaper_metal_retrieved || 0) > 0 && (
                                    <div style={{ padding: '12px', background: 'rgba(0,242,255,0.05)', borderRadius: '14px', border: '1px solid rgba(0,242,255,0.1)', fontSize: '0.75rem' }}>
                                        <div style={{ color: 'var(--primary)', fontWeight: 800, marginBottom: '4px' }}>REAPER EXTRACTION</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                                            <span>M: {formatNumber(combinedReport.RESULT_DATA.generic.debris_reaper_metal_retrieved)}</span>
                                            <span>C: {formatNumber(combinedReport.RESULT_DATA.generic.debris_reaper_crystal_retrieved)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Harvest Reports */}
                    <div className="col-harvest" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid var(--color-metal)', background: 'rgba(0,242,255,0.02)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-metal)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Download size={14} /> Recovery Log
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="rr-en-XXX-..."
                                    value={rrKey}
                                    onChange={(e) => setRrKey(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        color: '#fff',
                                        outline: 'none',
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem'
                                    }}
                                />
                                <button
                                    onClick={fetchRrReport}
                                    disabled={rrLoading}
                                    style={{ background: 'var(--color-metal)', color: '#000', border: 'none', borderRadius: '12px', padding: '0 16px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    {rrLoading ? '...' : <Download size={18} />}
                                </button>
                            </div>
                            {rrError && <div style={{ color: '#ff5f5f', fontSize: '0.75rem', marginTop: '10px' }}>{rrError}</div>}
                        </div>

                        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <PieChart size={18} color="var(--color-metal)" />
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Yield Summary</h3>
                                </div>
                                <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px' }}>{rrReports.length} Reports</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {groupedDebris.map((group, idx) => (
                                    <div key={idx} style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                            <Users size={14} color="var(--primary)" />
                                            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{group.owner}</span>
                                            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5 }}>{group.times}x drops</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                                                <div style={{ fontSize: '0.6rem', color: 'var(--color-metal)', fontWeight: 800 }}>METAL</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{formatNumber(group.metal)}</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                                                <div style={{ fontSize: '0.6rem', color: 'var(--color-crystal)', fontWeight: 800 }}>CRYSTAL</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{formatNumber(group.crystal)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                                {rrReports.map((rr, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        fontSize: '0.7rem', background: 'rgba(0,0,0,0.3)',
                                        padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <span style={{ opacity: 0.6, fontFamily: 'monospace' }}>{rr.key.split('-').pop()?.slice(-6)}</span>
                                        <X size={12} style={{ color: '#ff5f5f', cursor: 'pointer' }} onClick={() => removeRrReport(rr.key)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Split Logic */}
                    <div className="col-split" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Coins size={18} color="var(--primary)" />
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Reward Distribution</h3>
                                </div>
                                <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#000', padding: '2px 8px', borderRadius: '6px', fontWeight: 900 }}>ALPHA</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', opacity: 0.5, letterSpacing: '1px' }}>Split Algorithm</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {[
                                            { id: 'equal', name: 'Standard Equal', icon: <Users size={14} /> },
                                            { id: 'contribution', name: 'Contribution Based', icon: <TrendingUp size={14} /> },
                                            { id: 'capacity', name: 'Capacity Weighing', icon: <Layers size={14} /> }
                                        ].map(method => (
                                            <div
                                                key={method.id}
                                                onClick={() => setSplitMethod(method.id as any)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                                                    background: splitMethod === method.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                    color: splitMethod === method.id ? '#000' : '#fff',
                                                    borderRadius: '14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800,
                                                    transition: 'all 0.2s', border: '1px solid transparent',
                                                    borderColor: splitMethod === method.id ? 'transparent' : 'rgba(255,255,255,0.05)'
                                                }}
                                            >
                                                {method.icon} {method.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ padding: '24px', background: 'rgba(0,242,255,0.03)', borderRadius: '20px', border: '1px solid rgba(0,242,255,0.1)', textAlign: 'center' }}>
                                    <PieChart size={32} color="var(--primary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Calculation Sandbox</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Profit share analysis will be calculated based on selected algorithm once reports are finalized.</div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.6 }}>
                                    <Settings size={18} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Fuel Deduction</div>
                                        <div style={{ fontSize: '0.65rem' }}>Auto-calculate deuterium costs</div>
                                    </div>
                                    <input type="checkbox" checked={true} readOnly style={{ accentColor: 'var(--primary)' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .glass-card {
                    backdrop-filter: blur(20px);
                    transition: all 0.3s ease;
                }
                .glass-card:hover {
                    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                }
                .acs-splitter-container input:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
                }
                .acs-splitter-container button:hover:not(:disabled) {
                    filter: brightness(1.2);
                    transform: scale(1.02);
                }
                .acs-splitter-container button:active:not(:disabled) {
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
};

export default AcsSplitter;
