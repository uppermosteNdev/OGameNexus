import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShieldCheck, Database, ArrowRight, Ship, Dna, Activity, Eye, Zap, LayoutGrid, Orbit, Calculator, Clock, SlidersHorizontal, Radio, Users, Bell, TrendingUp, ChevronDown, Check, Globe, ShoppingCart, RefreshCw } from 'lucide-react';
import { useTranslation, FlagIcon, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n';

interface ChangelogModalProps {
    onAcknowledge: () => void;
    onDismissVersion: () => void;
    onNavigateToSettings: () => void;
    onOpenTutorials?: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ onAcknowledge, onDismissVersion, onNavigateToSettings, onOpenTutorials }) => {
    const { language, setLanguage, t } = useTranslation();
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
                setIsLangOpen(false);
            }
        };
        if (isLangOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isLangOpen]);

    const changes = [
        {
            icon: <Globe size={22} color="#00f2ff" />,
            title: t('changelog.features.multiLangTitle', "Multi-Language Support"),
            desc: t('changelog.features.multiLangDesc', "Nexus is now available in 12 languages with an easy language selector in the dashboard header, settings, and in-game messages.")
        },
        {
            icon: <ShoppingCart size={22} color="#10b981" />,
            title: t('changelog.features.costsPlannerTitle', "Costs Planner: All Planets & Cart Editing"),
            desc: t('changelog.features.costsPlannerDesc', "Add mine and facility upgrades across all planets with one click, and edit desired levels directly inside your shopping cart.")
        },
        {
            icon: <Sparkles size={22} color="#fbbf24" />,
            title: t('changelog.features.astroAmortizationTitle', "Astrophysics Payback Calculator"),
            desc: t('changelog.features.astroAmortizationDesc', "Calculate payback times and payoff speed for unlocking new colony slots through Astrophysics in the Amortization tool.")
        },
        {
            icon: <RefreshCw size={22} color="#38bdf8" />,
            title: t('changelog.features.scrapMerchantTitle', "Scrap Merchant Overhaul"),
            desc: t('changelog.features.scrapMerchantDesc', "Redesigned scrap calculation tool with accurate resource returns and full fleet mission support.")
        },
        {
            icon: <ShieldCheck size={22} color="#f43f5e" />,
            title: t('changelog.features.overwatchFixesTitle', "Overwatch Galaxy Sync & Sensor Fixes [Closed Beta]"),
            desc: t('changelog.features.overwatchFixesDesc', "Fixed new colony and moon alerts on the live universe feed, corrected moon counting in Sensor Phalanx, and improved player class displays.")
        }
    ];

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(2, 6, 12, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    width: '100%',
                    maxWidth: '720px',
                    background: 'radial-gradient(circle at top left, rgba(13, 22, 38, 0.95), rgba(6, 11, 20, 0.99))',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    borderRadius: '24px',
                    padding: '32px 36px',
                    boxShadow: '0 0 50px rgba(0, 242, 255, 0.22), inset 0 0 20px rgba(0, 242, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    margin: 'auto'
                }}
            >
                {/* Accent line on top */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, var(--primary), var(--secondary), transparent)',
                    opacity: 0.85
                }} />

                {/* Header Section */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    borderBottom: '1px solid rgba(0, 242, 255, 0.12)',
                    paddingBottom: '18px',
                    marginBottom: '22px',
                    position: 'relative',
                    zIndex: 20
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            padding: '10px',
                            borderRadius: '16px',
                            background: 'rgba(0, 242, 255, 0.08)',
                            border: '1px solid rgba(0, 242, 255, 0.25)',
                            boxShadow: '0 0 15px rgba(0, 242, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)',
                            flexShrink: 0
                        }}>
                            <Sparkles size={26} style={{ filter: 'drop-shadow(0 0 4px var(--primary-glow))' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{
                                    fontFamily: 'var(--font-title)',
                                    fontSize: '1.75rem',
                                    fontWeight: 800,
                                    margin: 0,
                                    color: '#fff',
                                    letterSpacing: '-0.02em',
                                    background: 'linear-gradient(135deg, #fff 40%, var(--primary) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    {t('changelog.title', 'System Updated')}
                                </h2>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    color: '#00f2ff',
                                    background: 'rgba(0, 242, 255, 0.1)',
                                    border: '1px solid rgba(0, 242, 255, 0.3)',
                                    padding: '2px 8px',
                                    borderRadius: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    display: 'inline-block'
                                }}>
                                    {t('changelog.versionBadge', 'v1.2.7')}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.5px', marginTop: '2px' }}>
                                {t('changelog.telemetryReport', 'OGAME NEXUS COMMAND DECK TELEMETRY REPORT')}
                            </span>
                        </div>
                    </div>

                    {/* Language Dropdown Selector */}
                    <div ref={langDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={() => setIsLangOpen(prev => !prev)}
                            aria-expanded={isLangOpen}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: isLangOpen ? 'rgba(0, 242, 255, 0.12)' : 'rgba(0, 0, 0, 0.45)',
                                border: isLangOpen ? '1px solid rgba(0, 242, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '12px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                color: '#fff',
                                boxShadow: isLangOpen ? '0 0 16px rgba(0, 242, 255, 0.22)' : 'none'
                            }}
                        >
                            <FlagIcon code={language} size={20} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
                                {language.toUpperCase()}
                            </span>
                            <ChevronDown
                                size={14}
                                style={{
                                    color: isLangOpen ? 'var(--primary)' : '#94a3b8',
                                    transform: isLangOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease, color 0.2s ease'
                                }}
                            />
                        </button>

                        <AnimatePresence>
                            {isLangOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        right: 0,
                                        zIndex: 100,
                                        minWidth: '165px',
                                        maxHeight: '360px',
                                        overflowY: 'auto',
                                        background: 'rgba(9, 14, 24, 0.98)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(0, 242, 255, 0.28)',
                                        borderRadius: '12px',
                                        padding: '6px',
                                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 242, 255, 0.15)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '3px'
                                    }}
                                >
                                    {(Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[]).map((langCode) => {
                                        const isCurrent = language === langCode;
                                        const info = SUPPORTED_LANGUAGES[langCode];
                                        return (
                                            <button
                                                key={langCode}
                                                type="button"
                                                onClick={() => {
                                                    setLanguage(langCode);
                                                    setIsLangOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '10px',
                                                    padding: '8px 10px',
                                                    borderRadius: '8px',
                                                    border: isCurrent ? '1px solid rgba(0, 242, 255, 0.25)' : '1px solid transparent',
                                                    background: isCurrent ? 'rgba(0, 242, 255, 0.12)' : 'transparent',
                                                    color: isCurrent ? '#00f2ff' : '#cbd5e1',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    width: '100%',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isCurrent) {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                                        e.currentTarget.style.color = '#fff';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isCurrent) {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.color = '#cbd5e1';
                                                    }
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                                    <FlagIcon code={langCode} size={20} />
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '0.82rem', fontWeight: isCurrent ? 700 : 500 }}>
                                                            {info.nativeName}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                                            {info.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isCurrent && <Check size={14} color="#00f2ff" />}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Changelog Items */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    marginBottom: '26px',
                    maxHeight: '360px',
                    overflowY: 'auto',
                    paddingRight: '6px'
                }}>
                    {changes.map((item, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            gap: '16px',
                            padding: '16px',
                            background: 'rgba(13, 22, 38, 0.4)',
                            border: '1px solid rgba(0, 242, 255, 0.06)',
                            borderRadius: '16px',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                color: '#fff'
                            }}>
                                {item.icon}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
                                    {item.title}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                    {item.desc}
                                </span>
                                {(item as any).customElement}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Ambient notification banner */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 16px',
                    background: 'rgba(20, 184, 166, 0.04)',
                    border: '1px solid rgba(20, 184, 166, 0.15)',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    color: 'rgba(20, 184, 166, 0.95)',
                    lineHeight: 1.35,
                    marginBottom: '26px'
                }}>
                    <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                    <span>{t('changelog.dataPreservedNotice', 'Your planetary setups, harvested telemetry, and tracking histories have been preserved securely during this update.')}</span>
                </div>

                {/* Actions Layout */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '20px'
                }}>
                    <motion.button
                        onClick={onAcknowledge}
                        whileHover={{ scale: 1.005, boxShadow: '0 0 20px rgba(0, 242, 255, 0.35)' }}
                        whileTap={{ scale: 0.995 }}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, #00b8d4 100%)',
                            color: '#02060c',
                            border: 'none',
                            fontSize: '0.92rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 0 15px rgba(0, 242, 255, 0.15)',
                            transition: 'box-shadow 0.2s ease'
                        }}
                    >
                        {t('changelog.acknowledge', 'Acknowledge')} <ArrowRight size={16} />
                    </motion.button>

                    <motion.button
                        onClick={onDismissVersion}
                        whileHover={{ background: 'rgba(255, 255, 255, 0.03)', color: '#fff' }}
                        whileTap={{ scale: 0.995 }}
                        style={{
                            width: '100%',
                            padding: '11px 20px',
                            borderRadius: '12px',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {t('changelog.dismissVersion', 'Dismiss for this version')}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default ChangelogModal;
