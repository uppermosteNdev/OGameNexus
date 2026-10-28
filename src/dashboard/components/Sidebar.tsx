import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { isOverwatchTester, syncOverwatchTesterStatusWithCloudflare } from '../../config/overwatchTestingConfig';
import { ThemeIcon } from './ThemeIcon';
import { User, Check, Copy, X, ChevronRight, Sparkles } from 'lucide-react';
import { cleanUniverseId, isSameUniverse } from '../../utils/universe';
import { useTranslation, FlagIcon, SUPPORTED_LANGUAGES, SupportedLanguage, detectLanguageFromServerLink } from '../../i18n';

interface SidebarProps {
    activeView: string;
    onSelect: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelect }) => {
    const isCollapsed = true;
    const { language, setLanguage, t } = useTranslation();
    const [hoveredItem, setHoveredItem] = useState<{ label: string, top: number } | null>(null);
    const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
    const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const sortedAccounts = useMemo(() => {
        return [...accounts].sort((a, b) => {
            const isCurrentA = activeAccount?.playerId === a.playerId && isSameUniverse(activeAccount?.universe, a.universe);
            const isCurrentB = activeAccount?.playerId === b.playerId && isSameUniverse(activeAccount?.universe, b.universe);
            if (isCurrentA && !isCurrentB) return -1;
            if (!isCurrentA && isCurrentB) return 1;
            return (b.lastSeen || 0) - (a.lastSeen || 0);
        });
    }, [accounts, activeAccount]);
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
        { id: 'overview', label: t('nav.overview', 'Empire 360'), iconName: 'control-panel' },
        { id: 'expeditions', label: t('nav.expeditions', 'Expeditions'), iconName: 'navigation' },
        { id: 'lifeforms', label: t('common.lifeforms', 'Lifeforms'), iconName: 'leaf' },
        { id: 'combat', label: t('nav.combat', 'Combats'), iconName: 'sword' },
        { id: 'raidRadar', label: t('nav.raidRadar', 'Raid Radar'), iconName: 'radar' },
        { id: 'debris', label: t('nav.debris', 'Debris Fields'), iconName: 'debris-field' },
        { id: 'empire', label: t('nav.empire', 'Empire'), iconName: 'skyscrapers' },
        { id: 'costsPlanner', label: t('nav.costsPlanner', 'Costs Planner'), iconName: 'shopping-cart' },
        { id: 'overwatch', label: 'Ally Overwatch', iconName: 'radar' },
        { id: 'tools', label: t('nav.tools', 'Tools'), iconName: 'tools' },
        { id: 'signature', label: t('nav.signature', 'Signature'), iconName: 'sparkling' },
        { id: 'dataManagement', label: t('nav.dataManagement', 'Data'), iconName: 'circuit' },
        { id: 'settings', label: t('nav.settings', 'Settings'), iconName: 'settings' },
        { id: 'tutorials', label: t('nav.tutorials', 'Tutorials'), iconName: 'open-book' },
    ];

    return (
        <motion.aside
            animate={{ 
                width: 228,
                padding: '20px 12px'
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
                gap: '12px',
                padding: '0 6px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '12px',
                color: 'var(--primary)',
                textShadow: '0 0 10px var(--primary-glow)',
                width: '100%',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    padding: '5px',
                    borderRadius: '12px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    border: '1px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(0, 242, 255, 0.2)',
                    flexShrink: 0
                }}>
                    <img 
                        src="icons/nexus.png" 
                        alt="Planet" 
                        style={{ 
                            width: '26px', 
                            height: '26px', 
                            objectFit: 'contain',
                            transition: 'all 0.3s ease'
                        }} 
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: 900,
                        letterSpacing: '0.08em',
                        color: '#fff',
                        whiteSpace: 'nowrap'
                    }}>
                        OGAME <span style={{ color: 'var(--primary)' }}>NEXUS</span>
                    </div>
                    <div style={{
                        fontSize: '9.5px',
                        color: 'rgba(255, 255, 255, 0.45)',
                        letterSpacing: '0.04em',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                    }}>
                        Command Deck
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav custom-scrollbar" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                flex: 1,
                overflowY: 'auto',
                minHeight: 0,
                paddingRight: '2px'
            }}>
                {menuItems.map((item) => {
                    const isActive = activeView === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            className={`sidebar-item ${isActive ? 'active' : ''}`}
                            onClick={(e) => handleItemClick(e, item.id)}
                            whileHover={{ x: 3 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                border: isActive ? '1px solid rgba(0, 242, 255, 0.3)' : '1px solid transparent',
                                background: isActive ? 'linear-gradient(90deg, rgba(0, 242, 255, 0.12) 0%, rgba(0, 242, 255, 0.02) 100%)' : 'transparent',
                                color: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.7)',
                                cursor: 'pointer',
                                position: 'relative',
                                textAlign: 'left',
                                width: '100%',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease'
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: '15%',
                                        bottom: '15%',
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
                                flexShrink: 0
                            }}>
                                <ThemeIcon name={item.iconName} size={19} glow={isActive} />
                            </span>
                            <span style={{
                                fontSize: '13.5px',
                                fontWeight: isActive ? 800 : 600,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                flex: 1,
                                color: isActive ? '#fff' : 'inherit'
                            }}>
                                {item.label}
                            </span>
                            {item.id === 'overwatch' && !isTester && (
                                <span style={{
                                    fontSize: '8px',
                                    fontWeight: 800,
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    background: 'rgba(245, 158, 11, 0.22)',
                                    border: '1px solid rgba(245, 158, 11, 0.5)',
                                    color: '#fbbf24',
                                    lineHeight: 1,
                                    boxShadow: '0 0 6px rgba(245, 158, 11, 0.3)',
                                    flexShrink: 0
                                }}>
                                    TEST
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            {/* Bottom Controls: Language Switcher & Account Switcher */}
            <div style={{ marginTop: 'auto', paddingTop: '10px', width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                {/* Language Switcher Button (Directly Above Account Switcher) */}
                <motion.button
                    type="button"
                    onClick={() => {
                        setShowLanguageSwitcher(prev => !prev);
                        setShowAccountSwitcher(false);
                    }}
                    whileHover={{ backgroundColor: 'rgba(0, 242, 255, 0.08)', borderColor: 'rgba(0, 242, 255, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    title={`Language: ${SUPPORTED_LANGUAGES[language]?.nativeName}`}
                    style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '10px',
                        border: showLanguageSwitcher ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: showLanguageSwitcher ? 'rgba(0, 242, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <FlagIcon code={language} size={18} />
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {SUPPORTED_LANGUAGES[language]?.nativeName || language.toUpperCase()}
                    </span>
                    <ChevronRight size={13} color="#64748b" style={{ transform: showLanguageSwitcher ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </motion.button>

                {/* Account Switcher Button */}
                <motion.button
                    type="button"
                    onClick={() => {
                        setShowAccountSwitcher(prev => !prev);
                        setShowLanguageSwitcher(false);
                    }}
                    whileHover={{ backgroundColor: 'rgba(0, 242, 255, 0.08)', borderColor: 'rgba(0, 242, 255, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    title={activeAccount ? `Active: ${activeAccount.playerName} (${activeAccount.universeName && activeAccount.universeName !== 'unknown' ? activeAccount.universeName : cleanUniverseId(activeAccount.universe)})` : 'Select Account'}
                    style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '10px',
                        border: showAccountSwitcher ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: showAccountSwitcher ? 'rgba(0, 242, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                    }}
                >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        {activeAccount?.avatarUrl ? (
                            <img
                                src={activeAccount.avatarUrl}
                                alt={activeAccount.playerName}
                                style={{ width: '26px', height: '26px', borderRadius: '7px', objectFit: 'cover' }}
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
                                fontSize: '11.5px',
                                color: '#00f2ff',
                                border: '1px solid rgba(0, 242, 255, 0.3)'
                            }}>
                                {activeAccount?.playerName?.[0]?.toUpperCase() || <User size={14} />}
                            </div>
                        )}
                        <span
                            style={{
                                position: 'absolute',
                                bottom: '-1px',
                                right: '-1px',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#10b981',
                                boxShadow: '0 0 5px #10b981',
                                border: '1px solid #060b14'
                            }}
                        />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0, overflow: 'hidden' }}>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {activeAccount?.playerName || 'Commander'}
                        </div>
                        <div style={{
                            fontSize: '10px',
                            color: '#00f2ff',
                            opacity: 0.8,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {activeAccount?.universeName && activeAccount.universeName !== 'unknown' 
                                ? activeAccount.universeName 
                                : (activeAccount?.universe ? cleanUniverseId(activeAccount.universe) : 'OGame')}
                        </div>
                    </div>
                    <ChevronRight size={13} color="#64748b" style={{ transform: showAccountSwitcher ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </motion.button>
            </div>

            {/* Language Switcher Popover */}
            {showLanguageSwitcher && (
                <div
                    style={{
                        position: 'fixed',
                        left: '228px',
                        bottom: '80px',
                        width: '280px',
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
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                                {t('common.selectLanguage', 'Select Language')}
                            </h4>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {t('common.chooseLanguageDesc', 'Choose your preferred language')}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowLanguageSwitcher(false)}
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                        {(Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[]).map((langCode) => {
                            const info = SUPPORTED_LANGUAGES[langCode];
                            const isCurrent = language === langCode;
                            return (
                                <button
                                    key={langCode}
                                    type="button"
                                    onClick={() => {
                                        setLanguage(langCode);
                                        setShowLanguageSwitcher(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: isCurrent ? '1px solid rgba(0, 242, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                                        background: isCurrent ? 'rgba(0, 242, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        width: '100%',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <FlagIcon code={langCode} size={26} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: isCurrent ? '#00f2ff' : '#fff' }}>
                                             {info.nativeName}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            {info.label}
                                        </div>
                                    </div>
                                    {isCurrent && (
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: 'rgba(0, 242, 255, 0.2)',
                                            color: '#00f2ff',
                                            border: '1px solid rgba(0, 242, 255, 0.4)'
                                        }}>
                                            {t('common.active', 'ACTIVE')}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Account Switcher Popover */}
            {showAccountSwitcher && (
                <div
                    style={{
                        position: 'fixed',
                        left: '228px',
                        bottom: '24px',
                        width: '370px',
                        maxWidth: 'calc(100vw - 105px)',
                        background: 'linear-gradient(180deg, rgba(8, 15, 28, 0.96) 0%, rgba(4, 8, 16, 0.98) 100%)',
                        backdropFilter: 'blur(28px)',
                        WebkitBackdropFilter: 'blur(28px)',
                        border: '1px solid rgba(0, 242, 255, 0.28)',
                        borderRadius: '18px',
                        padding: '16px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 242, 255, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.12)',
                        zIndex: 10000,
                        animation: 'nexus-tooltip-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    letterSpacing: '0.8px',
                                    textTransform: 'uppercase',
                                    color: '#00f2ff',
                                    background: 'rgba(0, 242, 255, 0.12)',
                                    border: '1px solid rgba(0, 242, 255, 0.25)',
                                    padding: '1.5px 6px',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Sparkles size={9} />
                                    COMMAND DECK
                                </span>
                            </div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>
                                {t('nav.switchAccount', 'Switch Account')}
                            </h4>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {t('nav.switchAccountDesc', 'Select empire to view in Nexus')}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAccountSwitcher(false)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '5px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#94a3b8';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Account List with Slim Double-Bezel Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '350px', overflowY: 'auto', paddingRight: '2px' }}>
                        {sortedAccounts.length === 0 ? (
                            <div style={{ padding: '20px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                {t('nav.noAccounts', 'No accounts stored in local database yet.')}
                            </div>
                        ) : (
                            sortedAccounts.map(acc => {
                                const isCurrent = activeAccount?.playerId === acc.playerId && isSameUniverse(activeAccount?.universe, acc.universe);
                                const cleanUni = cleanUniverseId(acc.universe);
                                const commLang: SupportedLanguage = detectLanguageFromServerLink(acc.universe || acc.serverUrl) || 'en';
                                const rawUniName = acc.universeName && acc.universeName !== 'unknown' ? acc.universeName : '';
                                const displayUniName = rawUniName || cleanUni.replace(/^s\d+-?/i, '').toUpperCase() || cleanUni;
                                const classId = Number(acc.playerClass ?? (acc as any)?.characterClass);
                                const classBadge = classId === 3 ? { icon: '🧭', label: 'Discoverer' } : classId === 1 ? { icon: '⛏️', label: 'Collector' } : classId === 2 ? { icon: '⚔️', label: 'General' } : null;

                                return (
                                    <motion.div
                                        key={`${cleanUni}_${acc.playerId}`}
                                        whileHover={{ scale: 1.01, y: -1 }}
                                        whileTap={{ scale: 0.985 }}
                                        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
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
                                            width: '100%',
                                            padding: '1px', // Slim outer bezel frame
                                            borderRadius: '10px',
                                            background: isCurrent
                                                ? 'linear-gradient(135deg, rgba(0, 242, 255, 0.45) 0%, rgba(0, 242, 255, 0.1) 50%, rgba(16, 185, 129, 0.25) 100%)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                            border: isCurrent
                                                ? '1px solid rgba(0, 242, 255, 0.5)'
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            boxShadow: isCurrent
                                                ? '0 0 16px rgba(0, 242, 255, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                                                : '0 2px 6px rgba(0, 0, 0, 0.2)',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
                                        }}
                                    >
                                        {/* Slim Inner Core */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '9px',
                                                padding: '6px 10px',
                                                borderRadius: '9px',
                                                background: isCurrent
                                                    ? 'linear-gradient(135deg, rgba(8, 20, 36, 0.96) 0%, rgba(5, 12, 22, 0.98) 100%)'
                                                    : 'linear-gradient(180deg, rgba(14, 21, 35, 0.88) 0%, rgba(9, 14, 25, 0.94) 100%)',
                                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                                                boxSizing: 'border-box',
                                            }}
                                        >
                                            {/* Avatar or Monogram */}
                                            <div style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0 }}>
                                                {acc.avatarUrl ? (
                                                    <img
                                                        src={acc.avatarUrl}
                                                        alt={acc.playerName}
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '7px',
                                                            objectFit: 'cover',
                                                            border: isCurrent ? '1px solid rgba(0, 242, 255, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                                                            boxShadow: isCurrent ? '0 0 8px rgba(0, 242, 255, 0.25)' : 'none',
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '7px',
                                                            background: isCurrent
                                                                ? 'linear-gradient(135deg, rgba(0, 242, 255, 0.25) 0%, rgba(14, 165, 233, 0.1) 100%)'
                                                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                                            border: isCurrent ? '1px solid rgba(0, 242, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 800,
                                                            fontSize: '12px',
                                                            color: isCurrent ? '#00f2ff' : '#94a3b8',
                                                            textShadow: isCurrent ? '0 0 6px rgba(0, 242, 255, 0.4)' : 'none',
                                                        }}
                                                    >
                                                        {acc.playerName?.[0]?.toUpperCase() || <User size={13} />}
                                                    </div>
                                                )}
                                                {isCurrent && (
                                                    <span
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: '-1px',
                                                            right: '-1px',
                                                            width: '7px',
                                                            height: '7px',
                                                            borderRadius: '50%',
                                                            backgroundColor: '#10b981',
                                                            border: '1.5px solid #060b14',
                                                            boxShadow: '0 0 6px #10b981',
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            {/* Identity & Universe Column */}
                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                {/* Row 1: Player Name + Universe Badge (Community Flag + Universe Name) */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                    <span
                                                        style={{
                                                            fontWeight: 700,
                                                            fontSize: '12.5px',
                                                            color: isCurrent ? '#ffffff' : '#f1f5f9',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            letterSpacing: '-0.1px',
                                                        }}
                                                    >
                                                        {acc.playerName}
                                                    </span>

                                                    {/* Universe Pill (Community Flag + Universe Name, NO universe/server # ID) */}
                                                    <div
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '1.5px 6px',
                                                            borderRadius: '4px',
                                                            background: isCurrent ? 'rgba(0, 242, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                                            border: isCurrent ? '1px solid rgba(0, 242, 255, 0.28)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <FlagIcon code={commLang} size={13} />
                                                        <span
                                                            style={{
                                                                fontSize: '10.5px',
                                                                fontWeight: 700,
                                                                color: isCurrent ? '#38bdf8' : '#e2e8f0',
                                                                letterSpacing: '0.2px',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {displayUniName}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Row 2: Score & Class */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
                                                    {acc.score ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#10b981', fontWeight: 600 }}>
                                                            <span style={{ fontSize: '7px', opacity: 0.8 }}>◈</span>
                                                            <span>{Math.floor(acc.score).toLocaleString()} pts</span>
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#64748b' }}>OGame</span>
                                                    )}
                                                    {classBadge && (
                                                        <span style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title={classBadge.label}>
                                                            <span>{classBadge.icon}</span>
                                                            <span style={{ fontSize: '9.5px', color: '#64748b' }}>{classBadge.label}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Indicator on Right */}
                                            {isCurrent ? (
                                                <div
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(0, 242, 255, 0.18)',
                                                        border: '1px solid rgba(0, 242, 255, 0.45)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        boxShadow: '0 0 8px rgba(0, 242, 255, 0.25)',
                                                    }}
                                                >
                                                    <Check size={11} style={{ color: '#00f2ff' }} />
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        opacity: 0.4,
                                                    }}
                                                >
                                                    <ChevronRight size={10} style={{ color: '#94a3b8' }} />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* Bookmark Link Helper (Button-in-Button Trailing Icon Architecture) */}
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
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
                                justifyContent: 'space-between',
                                padding: '7px 12px',
                                borderRadius: '9999px',
                                background: copiedLink ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                                border: copiedLink ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.09)',
                                color: copiedLink ? '#34d399' : '#e2e8f0',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
                                boxShadow: copiedLink ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none',
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {copiedLink 
                                    ? 'Copied Direct Bookmark URL!' 
                                    : activeAccount 
                                        ? `Copy URL (${activeAccount.universeName && activeAccount.universeName !== 'unknown' ? activeAccount.universeName : activeAccount.playerName})`
                                        : 'Copy Direct Bookmark URL'
                                }
                            </span>
                            {/* Trailing Icon Pill */}
                            <div
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: copiedLink ? 'rgba(16, 185, 129, 0.25)' : 'rgba(0, 242, 255, 0.12)',
                                    border: copiedLink ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(0, 242, 255, 0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginLeft: '8px',
                                }}
                            >
                                {copiedLink ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} style={{ color: '#00f2ff' }} />}
                            </div>
                        </motion.button>
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
                    {(hoveredItem.label === 'Ally Overwatch' || hoveredItem.label === 'Nexus Overwatch') && !isTester && (
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
