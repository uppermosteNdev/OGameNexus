import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Compass,
    Dna,
    Swords,
    Orbit,
    Settings as SettingsIcon,
    Rocket,
    PlusCircle,
    Wrench,
    Database,
    Activity,
    Globe,
    Sparkles,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
    Radar
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
    activeView: string;
    onSelect: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelect }) => {
    const isCollapsed = true;
    const [hoveredItem, setHoveredItem] = useState<{ label: string, top: number } | null>(null);

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
        { id: 'overview', label: 'Empire 360', icon: <LayoutDashboard size={22} /> },
        { id: 'expeditions', label: 'Expeditions', icon: <Compass size={22} /> },
        { id: 'lifeforms', label: 'Lifeforms', icon: <Dna size={22} /> },
        { id: 'combat', label: 'Combats', icon: <Swords size={22} /> },
        { id: 'raidRadar', label: 'Raid Radar', icon: <Radar size={22} /> },
        { id: 'debris', label: 'Debris Fields', icon: <Orbit size={22} /> },
        { id: 'empire', label: 'Empire', icon: <Rocket size={22} /> },
        { id: 'costsPlanner', label: 'Costs Planner', icon: <ShoppingCart size={22} /> },
        { id: 'tools', label: 'Tools', icon: <Wrench size={22} /> },
        { id: 'signature', label: 'Signature Forge', icon: <Sparkles size={22} /> },
        { id: 'dataManagement', label: 'Data Management', icon: <Database size={22} /> },
        { id: 'settings', label: 'Settings', icon: <SettingsIcon size={22} /> },
        { id: 'tutorials', label: 'Tutorials', icon: <BookOpen size={22} /> },
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
                                {item.icon}
                            </span>
                        </motion.button>
                    );
                })}
            </nav>

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
