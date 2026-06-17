import React from 'react';
import { motion } from 'framer-motion';
import { Radar, Swords, Activity, Compass, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

interface ChangelogModalProps {
    onAcknowledge: () => void;
    onDismissVersion: () => void;
    onNavigateToSettings: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ onAcknowledge, onDismissVersion, onNavigateToSettings }) => {
    const changes = [
        {
            icon: <Radar size={22} color="#00f2ff" />,
            title: "Raid Radar & Galaxy Projections",
            desc: "Track inactive targets, estimate loot growth, and view color-coded hourly resource production projections with live-calculating tooltips inside the Galaxy View.",
            customElement: (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                        onClick={() => {
                            onAcknowledge();
                            window.dispatchEvent(new CustomEvent('ognexus_navigated', { detail: { view: 'tutorials' } }));
                        }}
                        style={{
                            background: 'rgba(0, 242, 255, 0.1)',
                            color: '#00f2ff',
                            border: '1px solid rgba(0, 242, 255, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 242, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 242, 255, 0.1)';
                        }}
                    >
                        See tutorial
                    </button>
                    <button
                        onClick={() => {
                            onAcknowledge();
                            window.dispatchEvent(new CustomEvent('ognexus_navigated', { detail: { view: 'raidRadar' } }));
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                    >
                        Take me there
                    </button>
                </div>
            )
        },
        {
            icon: <Activity size={22} color="#ec4899" />,
            title: "At-A-Glance Row Customization",
            desc: "Added settings cog to customize and sort table rows. Supports HTML5 drag-and-drop ordering, row background color-coding, and storage sync."
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
                    gap: '18px',
                    borderBottom: '1px solid rgba(0, 242, 255, 0.12)',
                    paddingBottom: '18px',
                    marginBottom: '22px'
                }}>
                    <div style={{
                        padding: '10px',
                        borderRadius: '16px',
                        background: 'rgba(0, 242, 255, 0.08)',
                        border: '1px solid rgba(0, 242, 255, 0.25)',
                        boxShadow: '0 0 15px rgba(0, 242, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)'
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
                                System Updated
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
                                v1.1.1
                            </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.5px', marginTop: '2px' }}>
                            OGAME NEXUS COMMAND DECK TELEMETRY REPORT
                        </span>
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
                    <span>Your planetary setups, harvested telemetry, and tracking histories have been preserved securely during this update.</span>
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
                        Acknowledge <ArrowRight size={16} />
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
                        Dismiss for this version
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default ChangelogModal;
