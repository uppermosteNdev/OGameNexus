import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Compass, Dna, Wrench, ArrowRight, Heart, BookOpen } from 'lucide-react';

interface WelcomeModalProps {
    onLetsGo: () => void;
    onNeverShow: () => void;
    onOpenTutorials?: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onLetsGo, onNeverShow, onOpenTutorials }) => {
    const features = [
        {
            icon: <LayoutDashboard size={20} color="var(--primary)" />,
            title: "Empire 360",
            desc: "Complete telemetry of planetary infrastructure, resources, and fleet movements."
        },
        {
            icon: <Compass size={20} color="#ff8e3c" />,
            title: "Expedition Tracker",
            desc: "Automatic parsing, statistical logging, and deep-space optimization."
        },
        {
            icon: <Dna size={20} color="var(--color-deuterium)" />,
            title: "Lifeform Matrix",
            desc: "Track bonuses, research, and optimize specialized species progression."
        },
        {
            icon: <Wrench size={20} color="#bd00ff" />,
            title: "Tactical Arsenal",
            desc: "Advanced toolset featuring scrap recovery calculators and combat reporting."
        }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(2, 6, 12, 0.8)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            overflowY: 'auto'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    width: '100%',
                    maxWidth: '820px',
                    background: 'radial-gradient(circle at top left, rgba(13, 22, 38, 0.93), rgba(6, 11, 20, 0.99))',
                    border: '1px solid rgba(0, 242, 255, 0.25)',
                    borderRadius: '28px',
                    padding: '30px 40px',
                    boxShadow: '0 0 50px rgba(0, 242, 255, 0.18), inset 0 0 20px rgba(0, 242, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Ambient glow accent line */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, var(--primary), var(--secondary), transparent)',
                    opacity: 0.8
                }} />

                {/* Top Header Section with Official Logo */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    marginBottom: '24px',
                    borderBottom: '1px solid rgba(0, 242, 255, 0.1)',
                    paddingBottom: '16px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            padding: '6px',
                            borderRadius: '20px',
                            background: 'rgba(0, 242, 255, 0.1)',
                            border: '1px solid rgba(0, 242, 255, 0.35)',
                            boxShadow: '0 0 20px rgba(0, 242, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <img
                                src="icons/nexus.png"
                                alt="OGame Nexus Logo"
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h2 style={{
                                fontFamily: 'var(--font-title)',
                                fontSize: '2.2rem',
                                fontWeight: 800,
                                margin: 0,
                                color: '#fff',
                                letterSpacing: '-0.02em',
                                background: 'linear-gradient(135deg, #fff 30%, var(--primary) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                OGame Nexus
                            </h2>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                PREMIUM COMMAND DECK & ANALYTICS
                            </span>
                        </div>
                    </div>

                    {onOpenTutorials && (
                        <motion.button
                            onClick={onOpenTutorials}
                            animate={{
                                boxShadow: [
                                    '0 0 15px rgba(0, 242, 255, 0.15), inset 0 0 6px rgba(0, 242, 255, 0.05)',
                                    '0 0 28px rgba(0, 242, 255, 0.35), inset 0 0 10px rgba(0, 242, 255, 0.15)',
                                    '0 0 15px rgba(0, 242, 255, 0.15), inset 0 0 6px rgba(0, 242, 255, 0.05)'
                                ],
                                borderColor: [
                                    'rgba(0, 242, 255, 0.3)',
                                    'rgba(0, 242, 255, 0.65)',
                                    'rgba(0, 242, 255, 0.3)'
                                ]
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 2.5,
                                ease: "easeInOut"
                            }}
                            whileHover={{ 
                                boxShadow: '0 0 35px rgba(0, 242, 255, 0.5), inset 0 0 12px rgba(0, 242, 255, 0.2)',
                                background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.16) 0%, rgba(0, 184, 212, 0.06) 100%)'
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 18px',
                                background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.08) 0%, rgba(0, 184, 212, 0.02) 100%)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '16px',
                                color: '#00f2ff',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                letterSpacing: '0.5px',
                                textShadow: '0 0 8px rgba(0, 242, 255, 0.4)'
                            }}
                        >
                            <BookOpen size={14} style={{ filter: 'drop-shadow(0 0 4px var(--primary-glow))' }} />
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.75)', fontWeight: 650, letterSpacing: '0.2px' }}>New here?</span>
                                <span style={{ color: '#00f2ff', textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: '0.76rem' }}>Try our recommended tutorials</span>
                            </div>
                        </motion.button>
                    )}
                </div>

                {/* Two Column Grid */}
                <div style={{
                    display: 'flex',
                    gap: '36px',
                    flexWrap: 'wrap',
                    marginBottom: '24px'
                }}>
                    {/* Left Column: Feature Highlights */}
                    <div style={{
                        flex: '1 1 340px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: 'var(--primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            marginBottom: '4px'
                        }}>
                            SYSTEM TELEMETRY
                        </span>

                        {features.map((feat, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                gap: '14px',
                                padding: '14px 16px',
                                background: 'rgba(13, 22, 38, 0.45)',
                                border: '1px solid rgba(0, 242, 255, 0.06)',
                                borderRadius: '16px',
                                transition: 'all 0.3s ease'
                            }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                    {feat.icon}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                                        {feat.title}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                                        {feat.desc}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Column: Origin Story & Acknowledgments */}
                    <div style={{
                        flex: '1 1 340px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}>
                        {/* Genesis Story */}
                        <div>
                            <span style={{
                                display: 'block',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                color: 'var(--secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                marginBottom: '8px'
                            }}>
                                THE GENESIS OF NEXUS
                            </span>
                            <div style={{
                                background: 'rgba(189, 0, 255, 0.03)',
                                border: '1px solid rgba(189, 0, 255, 0.08)',
                                padding: '16px',
                                borderRadius: '16px',
                                fontSize: '0.82rem',
                                color: 'rgba(248, 250, 252, 0.85)',
                                lineHeight: 1.5,
                                fontStyle: 'italic'
                            }}>
                                OGame Nexus was born from a singular vision: to unify tactical telemetry, deep-space expeditions, and planetary analytics into a single, cohesive command deck. As commanders navigating the infinite cosmos, we required an interface that was not only powerful but also sleek, adaptive, and visually stunning. This extension was forged to elevate every empire's efficiency, turning raw sensor data into immediate, actionable space intelligence.
                            </div>
                        </div>

                        {/* Community Acknowledgments */}
                        <div>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                color: '#14b8a6',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                marginBottom: '8px'
                            }}>
                                <Heart size={14} fill="#14b8a6" color="#14b8a6" /> DEEP-SPACE GRATITUDE
                            </span>
                            <div style={{
                                background: 'rgba(20, 184, 166, 0.03)',
                                border: '1px solid rgba(20, 184, 166, 0.15)',
                                padding: '16px',
                                borderRadius: '16px',
                                fontSize: '0.82rem',
                                color: 'rgba(248, 250, 252, 0.85)',
                                lineHeight: 1.55
                            }}>
                                This deck would not have cleared drydock without the support and testing of our veteran pilots. A special planetary salute goes to the legendary <strong style={{ color: '#2dd4bf', fontWeight: 800 }}>Lyra LazyOldPeople</strong> and the <strong style={{ color: '#fb7185', fontWeight: 800 }}>DOOM OGame</strong> communities. Your endless feedback, tactical insights, and planetary camaraderie have been the fusion fuel that powers our core engines. Thank you for colonizing the universe with us!
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions Layout */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '24px'
                }}>
                    {/* Alliance Collaboration Showcase */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        background: 'radial-gradient(ellipse at center, rgba(0, 242, 255, 0.04) 0%, transparent 70%)',
                        padding: '12px 0',
                        position: 'relative'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '24px',
                            position: 'relative',
                            width: '100%'
                        }}>
                            {/* Connection Line Graphic */}
                            <div style={{
                                position: 'absolute',
                                left: '20%',
                                right: '20%',
                                height: '1px',
                                background: 'linear-gradient(90deg, rgba(20, 184, 166, 0) 0%, rgba(20, 184, 166, 0.35) 25%, rgba(0, 242, 255, 0.4) 50%, rgba(244, 63, 94, 0.35) 75%, rgba(244, 63, 94, 0) 100%)',
                                zIndex: 0
                            }} />

                            {/* Lyra Logo Container */}
                            <motion.div
                                whileHover={{ scale: 1.15, rotate: -3 }}
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    background: 'rgba(13, 22, 38, 0.9)',
                                    border: '2px solid #14b8a6',
                                    boxShadow: '0 0 25px rgba(20, 184, 166, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0',
                                    overflow: 'hidden',
                                    zIndex: 1,
                                    cursor: 'pointer'
                                }}
                            >
                                <img
                                    src="icons/misc/LyraLowLogo.png"
                                    alt="Lyra LazyOldPeople"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </motion.div>

                            {/* Collaboration Intersection "X" */}
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                fontWeight: 900,
                                color: '#00f2ff',
                                textShadow: '0 0 8px rgba(0, 242, 255, 0.6)',
                                boxShadow: '0 0 10px rgba(0, 242, 255, 0.2)',
                                zIndex: 2,
                                fontFamily: 'monospace'
                            }}>
                                X
                            </div>

                            {/* DooM Logo Container */}
                            <motion.div
                                whileHover={{ scale: 1.15, rotate: 3 }}
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    background: 'rgba(13, 22, 38, 0.9)',
                                    border: '2px solid #f43f5e',
                                    boxShadow: '0 0 25px rgba(244, 63, 94, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0',
                                    overflow: 'hidden',
                                    zIndex: 1,
                                    cursor: 'pointer'
                                }}
                            >
                                <img
                                    src="icons/misc/DoomLogo.png"
                                    alt="DooM OGame"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </motion.div>
                        </div>

                        {/* Micro label */}
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'rgba(248, 250, 252, 0.5)',
                            letterSpacing: '1px',
                            marginTop: '8px'
                        }}>
                            A LazyOldPeople & DOOM collaboration
                        </span>
                    </div>

                    <motion.button
                        onClick={onLetsGo}
                        whileHover={{ scale: 1.01, boxShadow: '0 0 25px rgba(0, 242, 255, 0.4)' }}
                        whileTap={{ scale: 0.99 }}
                        style={{
                            width: '100%',
                            padding: '14px 20px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, #00b8d4 100%)',
                            color: '#02060c',
                            border: 'none',
                            fontSize: '1rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 0 15px rgba(0, 242, 255, 0.2)',
                            transition: 'box-shadow 0.2s ease'
                        }}
                    >
                        Let's Go! <ArrowRight size={18} />
                    </motion.button>

                    <motion.button
                        onClick={onNeverShow}
                        whileHover={{ background: 'rgba(255, 255, 255, 0.04)', color: '#fff' }}
                        whileTap={{ scale: 0.99 }}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Never show again
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default WelcomeModal;
