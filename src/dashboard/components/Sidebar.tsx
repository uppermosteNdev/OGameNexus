import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { isOverwatchTester, syncOverwatchTesterStatusWithCloudflare } from '../../config/overwatchTestingConfig';
import { ThemeIcon } from './ThemeIcon';
import { User, Check, Copy, X } from 'lucide-react';
import { cleanUniverseId, isSameUniverse } from '../../utils/universe';

interface SidebarProps {
    activeView: string;
    onSelect: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelect }) => {
    const isCollapsed = true;
    const [hoveredItem, setHoveredItem] = useState<{ label: string, top: number } | null>(null);
    const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const [, setTesterSyncTick] = useState(0);
    const [passkeyUnlocked, setPasskeyUnlocked] = useState<string | null>(() => {
        try {
            return localStorage.getItem('nexus_overwatch_tester_unlocked');
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const handleUpdate = () => {
            try {
                setPasskeyUnlocked(localStorage.getItem('nexus_overwatch_tester_unlocked'));
            } catch { }
            setTesterSyncTick(t => t + 1);
        };
        window.addEventListener('nexus_overwatch_tester_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('nexus_overwatch_tester_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    useEffect(() => {
        if (activeAccount?.playerId) {
            syncOverwatchTesterStatusWithCloudflare(activeAccount.playerId, activeAccount.universe);
        }
    }, [activeAccount?.playerId, activeAccount?.universe]);

    const isTester = isOverwatchTester(activeAccount, passkeyUnlocked);

    const handleItemClick = (e: React.MouseEvent, itemId: string) => {
        onSelect(itemId);
    };

    const handleMouseEnter = (e: React.MouseEvent, label: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const sidebarElement = e.currentTarget.closest('aside');
        const sidebarRect = sidebarElement?.getBoundingClientRect();
        if (sidebarRect) {
            setHoveredItem({
                label,
                top: rect.top - sidebarRect.top + (rect.height / 2)
            });
        }
    };

    const menuItems = [
        { id: 'overview', label: 'Empire 360', iconName: 'control-panel' },
        { id: 'expeditions', label: 'Expeditions', iconName: 'navigation' },
        { id: 'lifeforms', label: 'Lifeforms', iconName: 'leaf' },
        { id: 'combat', label: 'Combats', iconName: 'sword' },
        { id: 'raidRadar', label: 'Raid Radar', iconName: 'radar' },
        { id: 'debris', label: 'Debris Fields', iconName: 'debris-field' },
        { id: 'empire', label: 'Empire', iconName: 'skyscrapers' },
        { id: 'costsPlanner', label: 'Costs Planner', iconName: 'shopping-cart' },
        { id: 'overwatch', label: 'Nexus Overwatch', iconName: 'radar' },
        { id: 'tools', label: 'Tools', iconName: 'tools' },
        { id: 'signature', label: 'Signature Forge', iconName: 'sparkling' },
        { id: 'dataManagement', label: 'Data Management', iconName: 'circuit' },
        { id: 'settings', label: 'Settings', iconName: 'settings' },
        { id: 'tutorials', label: 'Tutorials', iconName: 'open-book' },
    ];

    return (
        <motion.aside
            animate={{ 
                width: 80,
                padding: '40px 8px'
            }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{
                height: '100%',
                maxHeight: '100vh',
                boxSizing: 'border-box',
                backgroundColor: 'var(--bg-sidebar)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                overflow: 'visible', // Allow tooltips to overflow aside boundary
                cursor: 'default',
                flexShrink: 0,
                position: 'relative'
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0px',
                padding: '0 0 48px',
                color: 'var(--primary)',
                textShadow: '0 0 10px var(--primary-glow)',
                width: '100%',
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    padding: '4px',
                    borderRadius: '16px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    border: '1px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                }}>
                    <img 
                        src="icons/nexus.png" 
                        alt="Planet" 
                        style={{ 
                            width: '36px', 
                            height: '36px', 
                            objectFit: 'contain',
                            transition: 'all 0.3s ease'
                        }} 
                    />
                </div>
            </div>

            <nav className="sidebar-nav custom-scrollbar" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                flex: 1,
                overflowY: 'auto',
                minHeight: 0
            }}>
                {menuItems.map((item) => {
                    const isActive = activeView === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            className={`sidebar-item ${isActive ? 'active' : ''}`}
                            onClick={(e) => handleItemClick(e, item.id)}
                            onMouseEnter={(e) => handleMouseEnter(e, item.label)}
                            onMouseLeave={() => setHoveredItem(null)}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '14px 0',
                                borderRadius: '12px',
                                border: 'none',
                                background: isActive ? 'linear-gradient(90deg, rgba(0, 242, 255, 0.1) 0%, transparent 100%)' : 'transparent',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                position: 'relative',
                                textAlign: 'center',
                                width: '100%',
                                overflow: 'hidden',
                                transition: 'background 0.3s ease, color 0.3s ease'
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: '20%',
                                        bottom: '20%',
                                        width: '3px',
                                        backgroundColor: 'var(--primary)',
                                        borderRadius: '0 4px 4px 0',
                                        boxShadow: '0 0 10px var(--primary)'
                                    }}
                                />
                            )}
                            <span style={{ 
                                color: isActive ? 'var(--primary)' : 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%'
                            }}>
                                <ThemeIcon name={item.iconName} size={22} glow={isActive} />
                            </span>
                            {item.id === 'overwatch' && !isTester && (
                                <span style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '5px',
                                    fontSize: '8px',
                                    fontWeight: 800,
                                    padding: '1px 3px',
                                    borderRadius: '3px',
                                    background: 'rgba(245, 158, 11, 0.22)',
                                    border: '1px solid rgba(245, 158, 11, 0.5)',
                                    color: '#fbbf24',
                                    lineHeight: 1,
                                    boxShadow: '0 0 6px rgba(245, 158, 11, 0.3)',
                                    pointerEvents: 'none',
                                }}>
                                    TEST
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            {/* Account Switcher Button */}
            <div style={{ marginTop: 'auto', paddingTop: '12px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <motion.button
                    type="button"
                    onClick={() => setShowAccountSwitcher(prev => !prev)}
                    onMouseEnter={(e) => handleMouseEnter(e, `Account: ${activeAccount?.playerName || 'Select'} (${cleanUniverseId(activeAccount?.universe)} #${activeAccount?.playerId || '?'})`)}
                    onMouseLeave={() => setHoveredItem(null)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    title={activeAccount ? `Active: ${activeAccount.playerName} (${cleanUniverseId(activeAccount.universe)} • #${activeAccount.playerId})` : 'Select Account'}
                    style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        border: showAccountSwitcher ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.12)',
                        background: showAccountSwitcher ? 'rgba(0, 242, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        color: showAccountSwitcher ? 'var(--primary)' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        transition: 'all 0.25s ease',
                    }}
                >
                    {activeAccount?.avatarUrl ? (
                        <img
                            src={activeAccount.avatarUrl}
                            alt={activeAccount.playerName}
                            style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '7px',
                            background: 'rgba(0, 242, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '12px',
                            color: '#00f2ff',
                        }}>
                            {activeAccount?.playerName?.[0]?.toUpperCase() || <User size={15} />}
                        </div>
                    )}
                    <span
                        style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            boxShadow: '0 0 6px #10b981',
                        }}
                    />
                </motion.button>
            </div>

            {/* Account Switcher Popover */}
            {showAccountSwitcher && (
                <div
                    style={{
                        position: 'fixed',
                        left: '88px',
                        bottom: '24px',
                        width: '320px',
                        background: 'rgba(8, 14, 26, 0.96)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(0, 242, 255, 0.3)',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0, 242, 255, 0.15)',
                        zIndex: 10000,
                        animation: 'nexus-tooltip-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#fff' }}>Switch Account</h4>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Select empire to view in Nexus</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAccountSwitcher(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px',
                            }}
                        >
                            <X size={15} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                        {accounts.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                No accounts stored in local database yet.
                            </div>
                        ) : (
                            accounts.map(acc => {
                                const isCurrent = activeAccount?.playerId === acc.playerId && isSameUniverse(activeAccount?.universe, acc.universe);
                                const cleanUni = cleanUniverseId(acc.universe);
                                return (
                                    <button
                                        key={`${cleanUni}_${acc.playerId}`}
                                        type="button"
                                        onClick={() => {
                                            window.dispatchEvent(new CustomEvent('ognexus_switch_account', {
                                                detail: {
                                                    playerId: acc.playerId,
                                                    universe: acc.universe
                                                }
                                            }));
                                            setShowAccountSwitcher(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: isCurrent ? '1px solid rgba(0, 242, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: isCurrent ? 'rgba(0, 242, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            width: '100%',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: isCurrent ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            color: isCurrent ? '#00f2ff' : '#94a3b8',
                                            flexShrink: 0,
                                        }}>
                                            {acc.playerName?.[0]?.toUpperCase() || 'P'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {acc.playerName}
                                                </span>
                                                {isCurrent && (
                                                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: 'rgba(0, 242, 255, 0.2)', color: '#00f2ff' }}>
                                                        ACTIVE
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                {acc.universeName && acc.universeName !== 'unknown' ? acc.universeName : cleanUni} ({cleanUni}) • #{acc.playerId}
                                                {acc.score ? ` • ${Math.floor(acc.score).toLocaleString()} pts` : ''}
                                            </div>
                                        </div>
                                        {isCurrent && <Check size={14} style={{ color: '#00f2ff', flexShrink: 0 }} />}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Bookmark Link Helper */}
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button
                            type="button"
                            onClick={() => {
                                const extId = (typeof chrome !== 'undefined' && chrome.runtime?.id) ? chrome.runtime.id : '';
                                const uni = activeAccount?.universe ? cleanUniverseId(activeAccount.universe) : '';
                                const playerId = activeAccount?.playerId || '';
                                const queryParams = (uni && playerId)
                                    ? `?universe=${encodeURIComponent(uni)}&player=${encodeURIComponent(playerId)}`
                                    : playerId
                                        ? `?player=${encodeURIComponent(playerId)}`
                                        : '';
                                const url = extId 
                                    ? `chrome-extension://${extId}/dashboard.html${queryParams}`
                                    : `${window.location.origin}${window.location.pathname}${queryParams}`;
                                navigator.clipboard.writeText(url);
                                setCopiedLink(true);
                                setTimeout(() => setCopiedLink(false), 2500);
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: copiedLink ? '#10b981' : '#38bdf8',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                            <span>
                                {copiedLink 
                                    ? 'Copied Direct Bookmark URL!' 
                                    : activeAccount 
                                        ? `Copy URL (${cleanUniverseId(activeAccount.universe)} • #${activeAccount.playerId})`
                                        : 'Copy Direct Bookmark URL'
                                }
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* Hover Tooltip Overlay */}
            {hoveredItem && (
                <div style={{
                    position: 'absolute',
                    left: '92px',
                    top: `${hoveredItem.top}px`,
                    transform: 'translateY(-50%)',
                    background: 'rgba(6, 11, 20, 0.95)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(0, 242, 255, 0.25)',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    pointerEvents: 'none',
                    boxShadow: '0 4px 20px rgba(0, 242, 255, 0.2), inset 0 0 10px rgba(0, 242, 255, 0.05)',
                    animation: 'nexus-tooltip-fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <div style={{
                        position: 'absolute',
                        left: '-6px',
                        top: '50%',
                        transform: 'translateY(-50%) rotate(45deg)',
                        width: '10px',
                        height: '10px',
                        background: 'rgba(6, 11, 20, 0.95)',
                        borderLeft: '1px solid rgba(0, 242, 255, 0.25)',
                        borderBottom: '1px solid rgba(0, 242, 255, 0.25)',
                        zIndex: -1
                    }} />
                    
                    {/* Small Vertical Indicator Bar inside Tooltip */}
                    <div style={{
                        width: '3px',
                        height: '14px',
                        backgroundColor: 'var(--primary)',
                        borderRadius: '2px',
                        boxShadow: '0 0 8px var(--primary)'
                    }} />

                    <span style={{
                        fontFamily: 'var(--font-main)',
                        letterSpacing: '0.02em',
                        color: 'var(--text-main)',
                        textShadow: '0 0 8px rgba(0, 242, 255, 0.3)'
                    }}>
                        {hoveredItem.label}
                    </span>
                    {hoveredItem.label === 'Nexus Overwatch' && !isTester && (
                        <span style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.16)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}>
                            In Testing
                        </span>
                    )}
                </div>
            )}

            {/* Global Keyframe Styles for Tooltip Slide-In */}
            <style>{`
                @keyframes nexus-tooltip-fade-in {
                    from { opacity: 0; transform: translateY(-50%) scale(0.95) translateX(-8px); }
                    to { opacity: 1; transform: translateY(-50%) scale(1) translateX(0); }
                }
                .sidebar-item {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                .sidebar-item:not(.active):hover {
                    color: var(--primary) !important;
                    background: linear-gradient(90deg, rgba(0, 242, 255, 0.08) 0%, transparent 100%) !important;
                }
                .sidebar-item.active:hover {
                    background: linear-gradient(90deg, rgba(0, 242, 255, 0.18) 0%, transparent 100%) !important;
                }
                .sidebar-item svg {
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease !important;
                }
                .sidebar-item:hover svg {
                    filter: drop-shadow(0 0 6px var(--primary-glow)) !important;
                }
            `}</style>
        </motion.aside>
    );
};

export default Sidebar;
