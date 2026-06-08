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
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1024;
        }
        return true;
    });

    useEffect(() => {
        const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
            const sidebarElement = document.querySelector('aside');
            if (sidebarElement && !sidebarElement.contains(e.target as Node)) {
                setIsCollapsed(true);
            }
        };

        if (!isCollapsed) {
            document.addEventListener('mousedown', handleDocumentClick);
            document.addEventListener('touchstart', handleDocumentClick);
        }

        return () => {
            document.removeEventListener('mousedown', handleDocumentClick);
            document.removeEventListener('touchstart', handleDocumentClick);
        };
    }, [isCollapsed]);

    const handleItemClick = (e: React.MouseEvent, itemId: string) => {
        if (isCollapsed) {
            e.stopPropagation();
            setIsCollapsed(false);
        } else {
            onSelect(itemId);
            // On mobile or smaller viewports, auto-collapse after selecting
            if (window.innerWidth < 1024) {
                setIsCollapsed(true);
            }
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
                width: isCollapsed ? 80 : 280,
                padding: isCollapsed ? '40px 8px' : '40px 16px'
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
                overflow: 'hidden',
                cursor: isCollapsed ? 'pointer' : 'default',
                flexShrink: 0
            }}
            onClick={() => {
                if (isCollapsed) {
                    setIsCollapsed(false);
                }
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? '0px' : '12px',
                padding: isCollapsed ? '0 0 48px' : '0 12px 48px',
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
                            width: isCollapsed ? '36px' : '42px', 
                            height: isCollapsed ? '36px' : '42px', 
                            objectFit: 'contain',
                            transition: 'all 0.3s ease'
                        }} 
                    />
                </div>
                {!isCollapsed && (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap' }}
                    >
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '2px', color: '#fff' }}>OG NEXUS</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>COMMAND DECK</span>
                    </motion.div>
                )}
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
                            onClick={(e) => handleItemClick(e, item.id)}
                            whileHover={{ x: isCollapsed ? 0 : 4, scale: isCollapsed ? 1.08 : 1 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isCollapsed ? 'center' : 'flex-start',
                                gap: isCollapsed ? '0px' : '16px',
                                padding: isCollapsed ? '14px 0' : '14px 16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: isActive ? 'linear-gradient(90deg, rgba(0, 242, 255, 0.1) 0%, transparent 100%)' : 'transparent',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                position: 'relative',
                                textAlign: 'left',
                                width: '100%',
                                overflow: 'hidden',
                                transition: 'background 0.3s ease, color 0.3s ease, padding 0.3s ease, justify-content 0.3s ease'
                            }}
                            title={isCollapsed ? item.label : undefined}
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
                                width: isCollapsed ? '100%' : 'auto'
                            }}>
                                {item.icon}
                            </span>
                            {!isCollapsed && (
                                <motion.span 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        fontWeight: isActive ? 600 : 400,
                                        fontSize: '0.95rem',
                                        letterSpacing: '0.5px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            {/* Manual Toggle Button at bottom */}
            <div style={{
                display: 'flex',
                justifyContent: isCollapsed ? 'center' : 'flex-end',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                marginTop: '16px',
                width: '100%'
            }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering aside's click
                        setIsCollapsed(!isCollapsed);
                    }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        borderRadius: '50%',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--primary)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.background = 'rgba(0, 242, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                    title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
