import React from 'react';
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
    Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
    activeView: string;
    onSelect: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelect }) => {
    const menuItems = [
        { id: 'overview', label: 'Empire 360', icon: <LayoutDashboard size={22} /> },
        { id: 'expeditions', label: 'Expeditions', icon: <Compass size={22} /> },
        { id: 'lifeforms', label: 'Lifeforms', icon: <Dna size={22} /> },
        { id: 'combat', label: 'Combats', icon: <Swords size={22} /> },
        { id: 'debris', label: 'Debris Fields', icon: <Orbit size={22} /> },
        { id: 'empire', label: 'Empire', icon: <Rocket size={22} /> },
        { id: 'tools', label: 'Tools', icon: <Wrench size={22} /> },
        { id: 'signature', label: 'Signature Forge', icon: <Sparkles size={22} /> },
        { id: 'dataManagement', label: 'Data Management', icon: <Database size={22} /> },
        { id: 'settings', label: 'Settings', icon: <SettingsIcon size={22} /> },
    ];

    return (
        <aside style={{
            width: 'var(--sidebar-width)',
            backgroundColor: 'var(--bg-sidebar)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 16px',
            zIndex: 100
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px 48px',
                color: 'var(--primary)',
                textShadow: '0 0 10px var(--primary-glow)'
            }}>
                <div style={{
                    padding: '4px',
                    borderRadius: '16px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    border: '1px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img 
                        src="icons/nexus.png" 
                        alt="Planet" 
                        style={{ 
                            width: '42px', 
                            height: '42px', 
                            objectFit: 'contain'
                        }} 
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '2px', color: '#fff' }}>OG NEXUS</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>COMMAND DECK</span>
                </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {menuItems.map((item) => {
                    const isActive = activeView === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: isActive ? 'linear-gradient(90deg, rgba(0, 242, 255, 0.1) 0%, transparent 100%)' : 'transparent',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                position: 'relative',
                                textAlign: 'left',
                                width: '100%',
                                overflow: 'hidden'
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
                            <span style={{ color: isActive ? 'var(--primary)' : 'inherit' }}>
                                {item.icon}
                            </span>
                            <span style={{
                                fontWeight: isActive ? 600 : 400,
                                fontSize: '0.95rem',
                                letterSpacing: '0.5px'
                            }}>
                                {item.label}
                            </span>
                        </motion.button>
                    );
                })}
            </nav>
        </aside>
    );
};

export default Sidebar;
