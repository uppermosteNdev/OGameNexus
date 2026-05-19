import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { LIFEFORM_TECH_DATA } from '../../db/lifeformTechData';
import { LIFEFORM_BONUS_BREAKDOWN_DATA } from '../../db/lifeformBonusData';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Zap, Layers, Box, Cpu, Swords, Activity, Target, Orbit, Dna, Compass, Info, ShieldCheck, Sparkles, Calculator } from 'lucide-react';
import AmortizationView from './AmortizationView';

const THEME_CYAN = '#00f2ff';

const Empire: React.FC = () => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const [activeTab, setActiveTab] = useState<'lifeform' | 'infrastructure' | 'amortization'>('lifeform');

    // Support deep-linking from Hotbar
    useEffect(() => {
        const checkPending = () => {
            const pending = sessionStorage.getItem('ognexus_target_subview');
            if (pending) {
                try {
                    const { view, tab } = JSON.parse(pending);
                    if (view === 'empire' && tab) {
                        setActiveTab(tab as any);
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
            if (detail && detail.view === 'empire' && detail.tab) {
                setActiveTab(detail.tab as any);
            }
        };
        window.addEventListener('ognexus_navigated', handleNav);
        return () => {
            window.removeEventListener('ognexus_navigated', handleNav);
        };
    }, []);

    const planets = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).filter(p => p.type === 'planet').toArray() : [],
        [activeAccount]
    ) || [];

    const [hoveredTech, setHoveredTech] = useState<{
        techId: number,
        level: number,
        planet: any,
        rect: DOMRect | null
    } | null>(null);


    const getLfColor = (lfId?: number) => {
        if (!lfId) return 'rgba(255,255,255,0.2)';
        const colors = ['#22c55e', '#ef4444', '#3b82f6', '#a855f7']; // Humans, Rock'tal, Mechas, Kaelesh
        return colors[lfId - 1];
    };

    const getLfIcon = (lfId?: number) => {
        if (!lfId) return '';
        const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
        return `/icons/lifeforms/${lfNames[lfId - 1]}-icon-large.jpg`;
    };

    const getBuildingIconPath = (buildingId: number, planetLfId?: number) => {
        // Precise slot detection: OGame tech IDs for LF buildings usually end in 01-12
        const slotNum = buildingId % 100;

        // Use planet's lifeform ID as the source of truth for the icon set
        // Humans: 1, Rock'tal: 2, Mechas: 3, Kaelesh: 4
        const lfId = planetLfId || (Math.floor(buildingId / 1000) % 10);
        const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
        const lfName = lfNames[(lfId || 1) - 1];

        return `/icons/lifeforms/${lfName}-building-${slotNum}-large.jpg`;
    };

    const getTechIconPath = (techId: number) => {
        const tech = LIFEFORM_TECH_DATA.find(t => t.id === techId);
        if (!tech) return '';
        const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
        const lfName = lfNames[tech.lifeformId - 1];
        const slotNum = Math.floor((tech.id - 1) / 4) + 1;
        return `/icons/lifeforms/${lfName}-tech-t${slotNum}-large.jpg`;
    };

    return (
        <div className="view-container" style={{ padding: '0 24px 40px 24px' }}>
            <style>
                {`
                    .intelligence-track::-webkit-scrollbar {
                        height: 4px;
                    }
                    .intelligence-track::-webkit-scrollbar-track {
                        background: rgba(255, 255, 255, 0.02);
                        border-radius: 10px;
                    }
                    .intelligence-track::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                    }
                    .intelligence-track::-webkit-scrollbar-thumb:hover {
                        background: rgba(0, 242, 255, 0.3);
                    }
                    .tab-active {
                        background: rgba(0, 242, 255, 0.1) !important;
                        border-color: rgba(0, 242, 255, 0.4) !important;
                        color: #fff !important;
                    }
                `}
            </style>

            <header className="view-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="view-title" style={{ fontSize: '2.8rem', fontWeight: 950, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>Empire Intelligence</h1>
                    <p className="view-subtitle" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.15rem', marginTop: '2px', fontWeight: 500 }}>Global Lifeform Infrastructure & Research Status</p>
                </div>

                <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                        onClick={() => setActiveTab('lifeform')}
                        className={activeTab === 'lifeform' ? 'tab-active' : ''}
                        style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid transparent', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Dna size={16} /> LIFEFORM
                    </button>
                    <button
                        onClick={() => setActiveTab('infrastructure')}
                        className={activeTab === 'infrastructure' ? 'tab-active' : ''}
                        style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid transparent', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Box size={16} /> INFRASTRUCTURE
                    </button>
                    <button
                        onClick={() => setActiveTab('amortization')}
                        className={activeTab === 'amortization' ? 'tab-active' : ''}
                        style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid transparent', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Calculator size={16} /> AMORTIZATION
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeTab === 'amortization' ? (
                    <AmortizationView planets={planets} account={activeAccount} />
                ) : (
                    planets.map((p, idx) => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="glass"
                            style={{
                                display: 'flex',
                                alignItems: 'stretch',
                                background: 'rgba(12, 18, 28, 0.7)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                position: 'relative',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Planet Identity - Ultra Slim Column */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '160px',
                                flexShrink: 0,
                                padding: '12px 16px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderRight: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <img src={p.imgUrl || '/icons/planets/dry-large.jpg'} style={{ width: '40px', height: '40px', borderRadius: '10px', border: `1.5px solid ${getLfColor(p.lifeformId)}`, opacity: p.lifeformId ? 1 : 0.6, objectFit: 'cover' }} alt="" />
                                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#000', padding: '1px 4px', borderRadius: '4px', fontSize: '8px', fontWeight: 1000, color: THEME_CYAN, border: '1px solid rgba(0,242,255,0.5)' }}>
                                        {p.coords === '0:0:0' ? 'Unknown' : p.coords}
                                    </div>
                                </div>
                                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 1000, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {p.lifeformId && (
                                            <>
                                                <img src={getLfIcon(p.lifeformId)} style={{ width: '12px', height: '12px', borderRadius: '2px' }} alt="" />
                                                <span style={{ fontSize: '8px', color: getLfColor(p.lifeformId), fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {['Humans', 'Rock\'tal', 'Mechas', 'Kaelesh'][p.lifeformId - 1]}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Intelligence Data - Single Row Horizontal Track */}
                            <div style={{
                                display: 'flex',
                                flex: 1,
                                minWidth: 0,
                                overflowX: 'auto',
                                overflowY: 'hidden'
                            }} className="intelligence-track">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'lifeform' ? (
                                        <motion.div
                                            key="lifeform"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ display: 'flex', alignItems: 'center', height: '100%' }}
                                        >
                                            {/* Infrastructure Section */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 16px',
                                                borderRight: '1px solid rgba(255,255,255,0.08)',
                                                flexShrink: 0,
                                                height: '100%',
                                                justifyContent: 'center'
                                            }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {(() => {
                                                        if (!p.lifeformId) return null;
                                                        const baseId = 10000 + (p.lifeformId * 1000) + 100;
                                                        return Array.from({ length: 12 }, (_, i) => {
                                                            const bid = baseId + i + 1;
                                                            const b = p.lifeformBuildings?.find(eb => eb.id === bid);
                                                            const level = b?.level || 0;
                                                            return (
                                                                <div key={bid} style={{ position: 'relative', flexShrink: 0 }}>
                                                                    <img
                                                                        src={getBuildingIconPath(bid, p.lifeformId)}
                                                                        style={{
                                                                            width: '38px',
                                                                            height: '38px',
                                                                            borderRadius: '6px',
                                                                            border: `1.5px solid ${getLfColor(p.lifeformId)}${level > 0 ? '88' : '33'}`,
                                                                            objectFit: 'cover',
                                                                            opacity: level > 0 ? 1 : 0.4,
                                                                            filter: level > 0 ? 'none' : 'grayscale(0.5)'
                                                                        }}
                                                                        alt=""
                                                                    />
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        bottom: '-2px',
                                                                        right: '-2px',
                                                                        background: level > 0 ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.6)',
                                                                        padding: '0px 4px',
                                                                        borderRadius: '3px',
                                                                        fontSize: '10px',
                                                                        fontWeight: 1000,
                                                                        color: level > 0 ? '#fff' : 'rgba(255,255,255,0.4)',
                                                                        border: `1px solid ${getLfColor(p.lifeformId)}${level > 0 ? '' : '44'}`,
                                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.8)'
                                                                    }}>
                                                                        {level}
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                    {(!p.lifeformId) && (
                                                        <div style={{ height: '56px', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '14px', fontStyle: 'italic' }}>Strategic data unavailable</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Technologies Section */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 16px',
                                                flexShrink: 0,
                                                height: '100%',
                                                justifyContent: 'center'
                                            }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {[1, 2, 3].map(tier => (
                                                        <div key={tier} style={{
                                                            display: 'flex',
                                                            gap: '4px',
                                                            padding: '4px',
                                                            background: 'rgba(255,255,255,0.03)',
                                                            borderRadius: '8px',
                                                            border: `1.5px solid ${tier === 1 ? 'rgba(34,197,94,0.15)' : tier === 2 ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)'}`,
                                                            flexShrink: 0
                                                        }}>
                                                            {p.lifeformSetup?.filter(s => {
                                                                if (tier === 1) return s.slotNumber <= 6;
                                                                if (tier === 2) return s.slotNumber > 6 && s.slotNumber <= 12;
                                                                return s.slotNumber > 12;
                                                            }).sort((a, b) => a.slotNumber - b.slotNumber).map((s) => {
                                                                const lfId = s.selectedTechId ? (LIFEFORM_TECH_DATA.find(t => t.id === s.selectedTechId)?.lifeformId) : undefined;
                                                                const techColor = getLfColor(lfId);

                                                                return (
                                                                    <div
                                                                        key={s.slotNumber}
                                                                        style={{ position: 'relative', flexShrink: 0 }}
                                                                        onMouseEnter={(e) => {
                                                                            if (s.selectedTechId) {
                                                                                setHoveredTech({
                                                                                    techId: s.selectedTechId,
                                                                                    level: s.level,
                                                                                    planet: p,
                                                                                    rect: e.currentTarget.getBoundingClientRect()
                                                                                });
                                                                            }
                                                                        }}
                                                                        onMouseLeave={() => setHoveredTech(null)}
                                                                    >
                                                                        {s.selectedTechId ? (
                                                                            <>
                                                                                <img
                                                                                    src={getTechIconPath(s.selectedTechId)}
                                                                                    style={{
                                                                                        width: '38px',
                                                                                        height: '38px',
                                                                                        borderRadius: '6px',
                                                                                        border: `1.5px solid ${techColor}aa`,
                                                                                        objectFit: 'cover'
                                                                                    }}
                                                                                    alt=""
                                                                                />
                                                                                <div style={{
                                                                                    position: 'absolute',
                                                                                    bottom: '-2px',
                                                                                    right: '-2px',
                                                                                    background: techColor,
                                                                                    padding: '0px 4px',
                                                                                    borderRadius: '3px',
                                                                                    fontSize: '10px',
                                                                                    fontWeight: 1000,
                                                                                    color: '#fff',
                                                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.8)',
                                                                                    border: '1px solid rgba(255,255,255,0.3)'
                                                                                }}>
                                                                                    {s.level}
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1.5px dashed rgba(255,255,255,0.1)' }} />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                    {(!p.lifeformSetup || p.lifeformSetup.length === 0) && (
                                                        <div style={{ height: '56px', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '14px', fontStyle: 'italic' }}>Technologies unavailable</div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="infrastructure"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ display: 'flex', alignItems: 'center', height: '100%' }}
                                        >
                                            {/* Extraction Section */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 16px',
                                                borderRight: '1px solid rgba(255,255,255,0.08)',
                                                flexShrink: 0,
                                                height: '100%',
                                                justifyContent: 'center'
                                            }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {[
                                                        { id: 1, name: 'Metal Mine', val: p.metalMine, icon: '/icons/resources/metal_mine_large.jpg', color: '#ff8d33' },
                                                        { id: 2, name: 'Crystal Mine', val: p.crystalMine, icon: '/icons/resources/crystal_mine_large.jpg', color: '#33b2ff' },
                                                        { id: 3, name: 'Deuterium Synthesizer', val: p.deuteriumMine, icon: '/icons/resources/deuterium_mine_large.jpg', color: '#33ff8d' },
                                                        { id: 4, name: 'Solar Plant', val: p.solarPlant, icon: '/icons/resources/solar-plant-large.jpg', lucide: <Zap size={18} />, color: '#ffe133' },
                                                        { id: 12, name: 'Fusion Reactor', val: p.fusionReactor, icon: '/icons/resources/fusion-reactor-large.jpg', lucide: <Zap size={18} />, color: '#33ccff' },
                                                        { id: 22, name: 'Metal Storage', val: p.metalStorage, icon: '/icons/resources/metal_storage_large.jpg', lucide: <Box size={18} />, color: 'rgba(255,255,255,0.2)' },
                                                        { id: 23, name: 'Crystal Storage', val: p.crystalStorage, icon: '/icons/resources/crystal_storage_large.jpg', lucide: <Box size={18} />, color: 'rgba(255,255,255,0.2)' },
                                                        { id: 24, name: 'Deuterium Tank', val: p.deuteriumStorage, icon: '/icons/resources/deuterium_storage_large.jpg', lucide: <Box size={18} />, color: 'rgba(255,255,255,0.2)' },
                                                    ].map(b => (
                                                        <div key={b.id} style={{ position: 'relative', flexShrink: 0 }} title={b.name}>
                                                            <div style={{
                                                                width: '38px', height: '38px', borderRadius: '8px',
                                                                border: `1.5px solid ${b.color === 'rgba(255,255,255,0.2)' ? 'rgba(255,255,255,0.15)' : b.color + '66'}`,
                                                                background: 'rgba(255,255,255,0.03)',
                                                                overflow: 'hidden',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: b.color || '#fff'
                                                            }}>
                                                                {b.icon ? (
                                                                    <img src={b.icon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                                ) : (
                                                                    b.lucide || <Box size={24} opacity={0.3} />
                                                                )}
                                                            </div>
                                                            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#fff', padding: '0px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 1000, color: '#000', border: '1px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                                                                {b.val || 0}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Facilities Section */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 16px',
                                                flexShrink: 0,
                                                height: '100%',
                                                justifyContent: 'center'
                                            }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {[
                                                        { id: 14, name: 'Robotics Factory', val: p.roboticsFactory, icon: '/icons/facilities/robotics_factory_large.jpg', lucide: <Cpu size={18} /> },
                                                        { id: 21, name: 'Shipyard', val: p.shipyard, icon: '/icons/facilities/shipyard_large.jpg', lucide: <Swords size={18} /> },
                                                        { id: 31, name: 'Research Lab', val: p.researchLab, icon: '/icons/facilities/research_lab_large.jpg', lucide: <Activity size={18} /> },
                                                        { id: 34, name: 'Alliance Depot', val: p.allianceDepot, icon: '/icons/facilities/alliance_depot_large.jpg', lucide: <Globe size={18} /> },
                                                        { id: 44, name: 'Missile Silo', val: p.missileSilo, icon: '/icons/facilities/missile_silo_large.jpg', lucide: <Target size={18} /> },
                                                        { id: 15, name: 'Nanite Factory', val: p.naniteFactory, icon: '/icons/facilities/nanite_factory_large.jpg', lucide: <Activity size={18} /> },
                                                        { id: 33, name: 'Terraformer', val: p.terraformer, icon: '/icons/facilities/terraformer_large.jpg', lucide: <Globe size={18} /> },
                                                        { id: 36, name: 'Space Dock', val: p.spaceDock, icon: '/icons/facilities/space_dock_large.jpg', lucide: <Orbit size={18} /> },
                                                    ].map(f => (
                                                        <div key={f.id} style={{ position: 'relative', flexShrink: 0 }} title={f.name}>
                                                            <div style={{
                                                                width: '38px', height: '38px', borderRadius: '8px',
                                                                border: '1.5px solid rgba(0, 242, 255, 0.3)',
                                                                background: 'rgba(0, 242, 255, 0.05)',
                                                                overflow: 'hidden',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: THEME_CYAN
                                                            }}>
                                                                {f.icon ? (
                                                                    <img src={f.icon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                                ) : (
                                                                    f.lucide
                                                                )}
                                                            </div>
                                                            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: THEME_CYAN, padding: '0px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 1000, color: '#000', border: '1px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                                                                {f.val || 0}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Top-right subtle watermark icon */}
                            <div style={{ position: 'absolute', top: '16px', right: '16px', opacity: 0.1, pointerEvents: 'none' }}>
                                {activeTab === 'lifeform' ? <Dna size={32} /> : <Box size={32} />}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .glass:hover {
                    background: rgba(255, 255, 255, 0.04) !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                    transform: translateY(-2px);
                    transition: all 0.3s ease;
                }
            `}</style>
            {/* Floating Sleek Tooltip */}
            <AnimatePresence>
                {hoveredTech && (() => {
                    const tech = LIFEFORM_TECH_DATA.find(t => t.id === hoveredTech.techId);
                    if (!tech) return null;

                    const TOOLTIP_WIDTH = 380;
                    const TOOLTIP_MARGIN = 20;

                    const iconRect = hoveredTech.rect || { left: 0, top: 0, width: 0, height: 0, bottom: 0 };
                    const centerX = iconRect.left + iconRect.width / 2;

                    // Horizontal constraint
                    let leftPos = centerX - TOOLTIP_WIDTH / 2;
                    if (leftPos < TOOLTIP_MARGIN) leftPos = TOOLTIP_MARGIN;
                    if (leftPos + TOOLTIP_WIDTH > window.innerWidth - TOOLTIP_MARGIN) {
                        leftPos = window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN;
                    }

                    // Vertical flip logic
                    const spaceAbove = iconRect.top;
                    const spaceBelow = window.innerHeight - iconRect.bottom;
                    const preferAbove = spaceAbove > 400 || spaceAbove > spaceBelow;

                    const verticalPos = preferAbove
                        ? { bottom: window.innerHeight - iconRect.top + 12 }
                        : { top: iconRect.bottom + 12 };

                    const slotNum = Math.floor((tech.id - 1) / 4) + 1;
                    const alternatives = [1, 2, 3, 4].map(idx => (slotNum - 1) * 4 + idx).filter(id => id !== tech.id);

                    return (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: preferAbove ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: preferAbove ? 10 : -10 }}
                            style={{
                                position: 'fixed',
                                left: leftPos,
                                ...verticalPos,
                                width: TOOLTIP_WIDTH + 'px',
                                background: 'rgba(10, 15, 25, 0.98)',
                                backdropFilter: 'blur(20px)',
                                borderRadius: '24px',
                                border: `1px solid ${getLfColor(tech.lifeformId)}88`,
                                boxShadow: `0 24px 60px rgba(0,0,0,0.8), 0 0 30px ${getLfColor(tech.lifeformId)}33`,
                                padding: '24px',
                                zIndex: 10000,
                                pointerEvents: 'none',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={getTechIconPath(tech.id)}
                                        style={{ width: '80px', height: '80px', borderRadius: '18px', border: `2px solid ${getLfColor(tech.lifeformId)}`, boxShadow: `0 8px 16px rgba(0,0,0,0.4)` }}
                                        alt=""
                                    />
                                    <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: getLfColor(tech.lifeformId), width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #000', fontSize: '10px', fontWeight: 1000 }}>
                                        T{slotNum}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 900, color: getLfColor(tech.lifeformId), letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Lifeform Technology</div>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 950, color: '#fff', letterSpacing: '-0.02em' }}>{tech.name}</h3>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            Level {hoveredTech.level}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alternatives */}
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Slot Alternatives
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    {alternatives.map(id => {
                                        const altTech = LIFEFORM_TECH_DATA.find(t => t.id === id);
                                        const altColor = getLfColor(altTech?.lifeformId);
                                        return (
                                            <div key={id} style={{ flex: 1, position: 'relative' }}>
                                                <div style={{
                                                    position: 'relative',
                                                    borderRadius: '20px',
                                                    overflow: 'hidden',
                                                    border: `2.5px solid ${altColor}cc`,
                                                    aspectRatio: '1',
                                                    boxShadow: `0 12px 24px rgba(0,0,0,0.6), 0 0 15px ${altColor}33`,
                                                    background: '#000'
                                                }}>
                                                    <img
                                                        src={getTechIconPath(id)}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.05)' }}
                                                        alt=""
                                                    />
                                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 60%)' }} />
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '6px',
                                                        left: '0',
                                                        right: '0',
                                                        textAlign: 'center',
                                                        fontSize: '9px',
                                                        color: '#fff',
                                                        fontWeight: 900,
                                                        padding: '0 4px',
                                                        textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                                                    }}>
                                                        {altTech?.name.split(' ').slice(0, 2).join(' ')}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Decorative background circle */}
                            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '200px', height: '200px', borderRadius: '50%', background: `${getLfColor(tech.lifeformId)}11`, filter: 'blur(60px)', zIndex: -1 }} />
                        </motion.div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
};

export default Empire;
