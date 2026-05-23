import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Database,
    Ship,
    Moon,
    Package,
    Search,
    Info,
    Box,
    MapPin,
    History,
    Globe,
    Compass,
    Dna,
    Calculator,
    Shield,
    Target,
    ArrowUpRight,
    Zap,
    X,
    Plus,
    Check,
    ChevronDown,
    ChevronUp,
    Swords,
    Orbit,
    Rocket,
    Wrench,
    Settings
} from 'lucide-react';

interface HotbarProps {
    onSelect?: (viewId: string) => void;
}

interface ShortcutItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    glowColor: string;
    view: string;
    tab: string;
    inTesting?: boolean;
    isBeta?: boolean;
}

interface CategoryGroup {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    glowColor: string;
    shortcuts: ShortcutItem[];
}

// 1. All shortcut bubble items persistently retain their parent Category color
const SHORTCUT_CATEGORIES: CategoryGroup[] = [
    {
        id: 'expeditions',
        name: 'Expeditions',
        icon: <Compass size={18} />,
        color: '#22c55e',
        glowColor: 'rgba(34, 197, 94, 0.4)',
        shortcuts: [
            { id: 'expeditions-overview', label: 'Overview', icon: <Activity size={16} />, color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)', view: 'expeditions', tab: 'overview' },
            { id: 'expeditions-resources', label: 'Resources', icon: <Database size={16} />, color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)', view: 'expeditions', tab: 'resources' },
            { id: 'expeditions-ships', label: 'Ships', icon: <Ship size={16} />, color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)', view: 'expeditions', tab: 'ships' },
            { id: 'expeditions-darkMatter', label: 'Dark Matter', icon: <Moon size={16} />, color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)', view: 'expeditions', tab: 'darkMatter' },
            { id: 'expeditions-items', label: 'Items List', icon: <Package size={16} />, color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)', view: 'expeditions', tab: 'items' },
            { id: 'expeditions-depletion', label: 'Depletion', icon: <Search size={16} />, color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)', view: 'expeditions', tab: 'depletion' },
            { id: 'expeditions-info', label: 'Info Summary', icon: <Info size={16} />, color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)', view: 'expeditions', tab: 'info' },
        ]
    },
    {
        id: 'combat',
        name: 'Combats',
        icon: <Swords size={18} />,
        color: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.4)',
        shortcuts: [
            { id: 'combat-overview', label: 'Overview', icon: <Activity size={16} />, color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.3)', view: 'combat', tab: 'overview' },
            { id: 'combat-resources', label: 'Loot & Recovery', icon: <Box size={16} />, color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.3)', view: 'combat', tab: 'resources' },
            { id: 'combat-zones', label: 'Tactical Hotspots', icon: <MapPin size={16} />, color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.3)', view: 'combat', tab: 'zones' },
            { id: 'combat-history', label: 'History Log', icon: <History size={16} />, color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.3)', view: 'combat', tab: 'history' },
        ]
    },
    {
        id: 'debris',
        name: 'Debris Fields',
        icon: <Orbit size={18} />,
        color: '#eab308',
        glowColor: 'rgba(234, 179, 8, 0.4)',
        shortcuts: [
            { id: 'debris-overview', label: 'Overview', icon: <Activity size={16} />, color: '#eab308', glowColor: 'rgba(234, 179, 8, 0.3)', view: 'debris', tab: 'overview' },
            { id: 'debris-system', label: 'System Fields', icon: <Globe size={16} />, color: '#eab308', glowColor: 'rgba(234, 179, 8, 0.3)', view: 'debris', tab: 'system' },
            { id: 'debris-expedition', label: 'Expedition Fields', icon: <Compass size={16} />, color: '#eab308', glowColor: 'rgba(234, 179, 8, 0.3)', view: 'debris', tab: 'expedition' },
        ]
    },
    {
        id: 'empire',
        name: 'Empire',
        icon: <Rocket size={18} />,
        color: '#00f2ff',
        glowColor: 'rgba(0, 242, 255, 0.4)',
        shortcuts: [
            { id: 'empire-lifeform', label: 'Lifeforms', icon: <Dna size={16} />, color: '#00f2ff', glowColor: 'rgba(0, 242, 255, 0.3)', view: 'empire', tab: 'lifeform' },
            { id: 'empire-infrastructure', label: 'Infrastructure', icon: <Box size={16} />, color: '#00f2ff', glowColor: 'rgba(0, 242, 255, 0.3)', view: 'empire', tab: 'infrastructure' },
            { id: 'empire-amortization', label: 'Amortization', icon: <Calculator size={16} />, color: '#00f2ff', glowColor: 'rgba(0, 242, 255, 0.3)', view: 'empire', tab: 'amortization' },
        ]
    },
    {
        id: 'tools',
        name: 'Command Tools',
        icon: <Wrench size={18} />,
        color: '#14b8a6',
        glowColor: 'rgba(20, 184, 166, 0.4)',
        shortcuts: [
            { id: 'tools-scrap-optimizer', label: 'Scrap Merchant', icon: <Package size={16} />, color: '#14b8a6', glowColor: 'rgba(20, 184, 166, 0.3)', view: 'tools', tab: 'scrap-optimizer' },
            { id: 'tools-combat-sim', label: 'Combat Analysis', icon: <Shield size={16} />, color: '#14b8a6', glowColor: 'rgba(20, 184, 166, 0.3)', view: 'tools', tab: 'combat-sim', inTesting: true },
            { id: 'tools-exp-calc', label: 'Expedition Calculator', icon: <Calculator size={16} />, color: '#14b8a6', glowColor: 'rgba(20, 184, 166, 0.3)', view: 'tools', tab: 'exp-calc' },
            { id: 'tools-acs-splitter', label: 'ACS Splitter', icon: <Target size={16} />, color: '#14b8a6', glowColor: 'rgba(20, 184, 166, 0.3)', view: 'tools', tab: 'acs-splitter', isBeta: true },
            { id: 'tools-plasma-optimizer', label: 'Plasma Tech', icon: <Zap size={16} />, color: '#14b8a6', glowColor: 'rgba(20, 184, 166, 0.3)', view: 'tools', tab: 'plasma-optimizer' },
            { id: 'tools-discoverer-optimizer', label: 'Discoverer Tech', icon: <Globe size={16} />, color: '#14b8a6', glowColor: 'rgba(20, 184, 166, 0.3)', view: 'tools', tab: 'discoverer-optimizer' },
        ]
    }
];

const DEFAULT_SHORTCUTS = [
    'expeditions-overview',
    'combat-overview',
    'debris-overview',
    'empire-lifeform',
    'tools-scrap-optimizer',
    'tools-exp-calc'
];

const LOCAL_STORAGE_KEY = 'ognexus_hotbar_shortcuts';

// Dynamic honeycomb packing coordinator - filters out visual conflicts with the Customize bubble at (-58, 0)
const getHexCoordinatesForIndex = (index: number, spacing: number) => {
    const cells: Array<{ q: number; r: number; dist: number }> = [];
    for (let q = 0; q <= 8; q++) {
        for (let r = 0; r <= 8; r++) {
            if (q === 0 && r === 0) continue;
            
            const x = -q * spacing * 0.866;
            const y = -r * spacing - (q % 2 === 1 ? spacing / 2 : 0);
            
            // Distance checking to the Settings Customize bubble which sits at (-58, 0)
            const distToCust = Math.sqrt((x - (-58)) ** 2 + y ** 2);
            if (distToCust < 50) {
                continue; // Skip coordinate to prevent visual overlaps!
            }

            const dist = Math.sqrt(x * x + y * y);
            cells.push({ q, r, dist });
        }
    }
    cells.sort((a, b) => a.dist - b.dist);
    return cells[index] || { q: index, r: 0 };
};

const Hotbar: React.FC<HotbarProps> = ({ onSelect }) => {
    const [activeKeys, setActiveKeys] = useState<string[]>(DEFAULT_SHORTCUTS);
    const [isOpen, setIsOpen] = useState(false);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('expeditions');
    const containerRef = useRef<HTMLDivElement>(null);

    const SPACING = 58; // Hex cell distance spacing

    // Flat list of all shortcuts for easy lookup
    const allShortcutsMap = React.useMemo(() => {
        const map = new Map<string, ShortcutItem>();
        SHORTCUT_CATEGORIES.forEach(cat => {
            cat.shortcuts.forEach(s => map.set(s.id, s));
        });
        return map;
    }, []);

    // Load configurations
    useEffect(() => {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setActiveKeys(parsed);
                }
            } catch (e) {
                console.error('Failed to parse hotbar shortcuts:', e);
            }
        }
    }, []);

    // Close on clicking outside the entire console
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsCustomizing(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
        }
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen]);

    const toggleShortcut = (id: string) => {
        let updatedKeys: string[];
        if (activeKeys.includes(id)) {
            if (activeKeys.length <= 1) return; // prevent leaving hotbar empty
            updatedKeys = activeKeys.filter(k => k !== id);
        } else {
            updatedKeys = [...activeKeys, id];
        }
        setActiveKeys(updatedKeys);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedKeys));
    };

    const handleShortcutClick = (shortcut: ShortcutItem) => {
        if (shortcut.inTesting) return;
        sessionStorage.setItem('ognexus_target_subview', JSON.stringify({
            view: shortcut.view,
            tab: shortcut.tab
        }));
        
        // Dispatch navigation event for already-mounted targets
        window.dispatchEvent(new CustomEvent('ognexus_navigated', {
            detail: { view: shortcut.view, tab: shortcut.tab }
        }));

        onSelect?.(shortcut.view);

        // Retract the honeycomb to the initial shortcut state after clicking
        setIsOpen(false);
        setIsCustomizing(false);
    };

    // Filter to active shortcuts maintaining user's selection order
    const visibleShortcuts = activeKeys
        .map(key => allShortcutsMap.get(key))
        .filter((item): item is ShortcutItem => !!item);

    return (
        <div 
            ref={containerRef}
            style={{
                position: 'fixed',
                bottom: '40px',
                right: '40px',
                zIndex: 1000
            }}
        >
            <style>{`
                @keyframes consolePulse {
                    0% { box-shadow: 0 0 15px rgba(0, 242, 255, 0.25), inset 0 0 10px rgba(0, 242, 255, 0.1); }
                    50% { box-shadow: 0 0 30px rgba(0, 242, 255, 0.6), inset 0 0 15px rgba(0, 242, 255, 0.2); }
                    100% { box-shadow: 0 0 15px rgba(0, 242, 255, 0.25), inset 0 0 10px rgba(0, 242, 255, 0.1); }
                }
                .trigger-glow {
                    animation: consolePulse 3s infinite ease-in-out;
                }
                .hex-bubble-glow:hover {
                    box-shadow: 0 0 25px var(--glow-color) !important;
                }
            `}</style>

            <div style={{
                position: 'relative',
                width: '56px',
                height: '56px'
            }}>
                {/* 1. Customization Popover Panel (Floats cleanly next to the honeycomb cluster) */}
                <AnimatePresence>
                    {isCustomizing && isOpen && (
                        <motion.div
                            initial={{ opacity: 0, x: 15, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 15, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{
                                position: 'absolute',
                                right: '310px',
                                bottom: '0px',
                                background: 'rgba(8, 16, 28, 0.96)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '16px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 242, 255, 0.15)',
                                width: '340px',
                                maxHeight: '460px',
                                overflowY: 'auto',
                                scrollbarWidth: 'thin'
                            }}
                        >
                            {/* Panel Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                paddingBottom: '8px',
                                marginBottom: '4px'
                            }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                    Customize Hotbar
                                </span>
                                <button 
                                    onClick={() => setIsCustomizing(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '2px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Accordion Categories */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {SHORTCUT_CATEGORIES.map(category => {
                                    const isExpanded = expandedCategory === category.id;
                                    return (
                                        <div 
                                            key={category.id} 
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.01)',
                                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                                borderRadius: '10px',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {/* Category Header Row */}
                                            <button
                                                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 12px',
                                                    background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                                                    border: 'none',
                                                    color: isExpanded ? '#fff' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ color: category.color, display: 'flex', alignItems: 'center' }}>
                                                        {category.icon}
                                                    </span>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{category.name}</span>
                                                </div>
                                                <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </span>
                                            </button>

                                            {/* Sub-tabs List */}
                                            <AnimatePresence initial={false}>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                        style={{ overflow: 'hidden' }}
                                                    >
                                                        <div style={{
                                                            padding: '8px 12px 12px 12px',
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(1, 1fr)',
                                                            gap: '6px',
                                                            borderTop: '1px solid rgba(255,255,255,0.02)'
                                                        }}>
                                                            {category.shortcuts.map(subItem => {
                                                                const isSelected = activeKeys.includes(subItem.id);
                                                                const isTesting = subItem.inTesting;
                                                                return (
                                                                    <button
                                                                        key={subItem.id}
                                                                        onClick={() => {
                                                                            if (isTesting) return;
                                                                            toggleShortcut(subItem.id);
                                                                        }}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                            padding: '8px 12px',
                                                                            borderRadius: '8px',
                                                                            border: isSelected ? `1px solid ${subItem.color}44` : '1px solid rgba(255,255,255,0.03)',
                                                                            background: isSelected ? `linear-gradient(135deg, ${subItem.color}10 0%, transparent 100%)` : 'rgba(255,255,255,0.01)',
                                                                            color: isSelected ? '#fff' : 'var(--text-muted)',
                                                                            fontSize: '0.72rem',
                                                                            fontWeight: isSelected ? 700 : 500,
                                                                            cursor: isTesting ? 'not-allowed' : 'pointer',
                                                                            opacity: isTesting ? 0.4 : 1,
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ color: isSelected ? subItem.color : 'inherit', display: 'flex', alignItems: 'center', opacity: isSelected ? 1 : 0.6 }}>
                                                                                {subItem.icon}
                                                                            </span>
                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                {subItem.label}
                                                                                {subItem.isBeta && (
                                                                                    <span style={{
                                                                                        fontSize: '8px',
                                                                                        fontWeight: 800,
                                                                                        background: 'rgba(0, 242, 255, 0.15)',
                                                                                        color: '#00f2ff',
                                                                                        border: '1px solid rgba(0, 242, 255, 0.3)',
                                                                                        borderRadius: '4px',
                                                                                        padding: '1px 4px',
                                                                                        letterSpacing: '0.5px',
                                                                                        textTransform: 'uppercase',
                                                                                        lineHeight: 1
                                                                                    }}>
                                                                                        Beta
                                                                                    </span>
                                                                                )}
                                                                                {isTesting && '(In Testing)'}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{
                                                                            width: '14px',
                                                                            height: '14px',
                                                                            borderRadius: '4px',
                                                                            border: `1px solid ${isSelected ? subItem.color : 'rgba(255,255,255,0.2)'}`,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            background: isSelected ? subItem.color : 'transparent',
                                                                            transition: 'all 0.15s'
                                                                        }}>
                                                                            {isSelected && <Check size={10} color="#000" strokeWidth={3} />}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2. Honeycomb Radial Projection Cluster */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Honeycomb Shortcuts */}
                            {visibleShortcuts.map((shortcut, idx) => {
                                const isHovered = hoveredId === shortcut.id;
                                const coords = getHexCoordinatesForIndex(idx, SPACING);

                                // Find category parent dynamically to prepend to label name
                                const catGroup = SHORTCUT_CATEGORIES.find(c => c.shortcuts.some(s => s.id === shortcut.id));
                                const fullLabel = catGroup ? `${catGroup.name} - ${shortcut.label}` : shortcut.label;

                                return (
                                    <motion.div
                                        key={shortcut.id}
                                        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                        animate={{ 
                                            opacity: 1, 
                                            scale: 1, 
                                            x: -coords.q * SPACING * 0.866,
                                            y: -coords.r * SPACING - (coords.q % 2 === 1 ? SPACING / 2 : 0)
                                        }}
                                        exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                        transition={{ 
                                            type: 'spring', 
                                            stiffness: 300, 
                                            damping: 20, 
                                            delay: idx * 0.03 
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            left: 4,
                                            width: '48px',
                                            height: '48px',
                                            zIndex: isHovered ? 1010 : 990
                                        }}
                                        onMouseEnter={() => setHoveredId(shortcut.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                    >
                                        {/* Tooltip Overlay (Includes Category Prefix) */}
                                        <AnimatePresence>
                                            {isHovered && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                                                    animate={{ opacity: 1, y: -38, scale: 1 }}
                                                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '0px',
                                                        background: 'rgba(5, 10, 18, 0.96)',
                                                        border: `1px solid ${shortcut.inTesting ? '#ff6a00' : shortcut.color}66`,
                                                        color: '#fff',
                                                        padding: '5px 10px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.62rem',
                                                        fontWeight: 800,
                                                        whiteSpace: 'nowrap',
                                                        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${shortcut.inTesting ? 'rgba(255, 106, 0, 0.2)' : shortcut.color + '22'}`,
                                                        zIndex: 1100,
                                                        pointerEvents: 'none',
                                                        letterSpacing: '0.5px',
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    {fullLabel}{shortcut.isBeta ? ' (BETA)' : ''}{shortcut.inTesting ? ' (In Testing)' : ''}
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-4px',
                                                        right: '20px',
                                                        transform: 'rotate(45deg)',
                                                        width: '8px',
                                                        height: '8px',
                                                        background: 'rgba(5, 10, 18, 0.96)',
                                                        borderRight: `1px solid ${shortcut.inTesting ? '#ff6a00' : shortcut.color}66`,
                                                        borderBottom: `1px solid ${shortcut.inTesting ? '#ff6a00' : shortcut.color}66`
                                                    }} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
 
                                        {/* Hex bubble item (Slightly chunkier 2.5px border!) */}
                                        <motion.button
                                            onClick={() => {
                                                if (shortcut.inTesting) return;
                                                handleShortcutClick(shortcut);
                                            }}
                                            whileHover={shortcut.inTesting ? {} : {
                                                scale: 1.12,
                                                borderColor: shortcut.color
                                            }}
                                            whileTap={shortcut.inTesting ? {} : { scale: 0.94 }}
                                            className="hex-bubble-glow"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '50%',
                                                background: 'rgba(8, 16, 28, 0.85)',
                                                backdropFilter: 'blur(10px)',
                                                border: shortcut.inTesting ? '2.5px solid rgba(255, 106, 0, 0.35)' : `2.5px solid ${shortcut.color}77`,
                                                color: shortcut.inTesting ? '#ff6a00' : shortcut.color,
                                                boxShadow: shortcut.inTesting ? 'none' : `0 8px 20px rgba(0, 0, 0, 0.4), inset 0 0 10px ${shortcut.color}15`,
                                                cursor: shortcut.inTesting ? 'not-allowed' : 'pointer',
                                                outline: 'none',
                                                opacity: shortcut.inTesting ? 0.4 : 1,
                                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                                // @ts-ignore
                                                '--glow-color': shortcut.inTesting ? 'rgba(255, 106, 0, 0.1)' : shortcut.glowColor
                                            }}
                                        >
                                            {shortcut.icon}
                                        </motion.button>
                                    </motion.div>
                                );
                            })}

                            {/* 3. Unique Cogwheel Customize Settings Button (Placed OUTSIDE the honeycomb cluster, directly next to the trigger button) */}
                            {(() => {
                                const isHovered = hoveredId === 'customize_trigger';
                                const color = 'var(--primary)';
                                const glowColor = 'rgba(0, 242, 255, 0.3)';

                                return (
                                    <motion.div
                                        key="customize-cog"
                                        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                        animate={{ 
                                            opacity: 1, 
                                            scale: 1, 
                                            x: -58, // Slides out exactly to the left of the master trigger button
                                            y: 0
                                        }}
                                        exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                        transition={{ 
                                            type: 'spring', 
                                            stiffness: 280, 
                                            damping: 18
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            left: 4,
                                            width: '48px',
                                            height: '48px',
                                            zIndex: isHovered ? 1010 : 990
                                        }}
                                        onMouseEnter={() => setHoveredId('customize_trigger')}
                                        onMouseLeave={() => setHoveredId(null)}
                                    >
                                        {/* Tooltip Overlay */}
                                        <AnimatePresence>
                                            {isHovered && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                                                    animate={{ opacity: 1, y: -38, scale: 1 }}
                                                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '0px',
                                                        background: 'rgba(5, 10, 18, 0.96)',
                                                        border: `1px solid ${color}`,
                                                        color: '#fff',
                                                        padding: '5px 10px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.62rem',
                                                        fontWeight: 800,
                                                        whiteSpace: 'nowrap',
                                                        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${glowColor}`,
                                                        zIndex: 1100,
                                                        pointerEvents: 'none',
                                                        letterSpacing: '0.5px',
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    Customize Hotbar
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-4px',
                                                        right: '20px',
                                                        transform: 'rotate(45deg)',
                                                        width: '8px',
                                                        height: '8px',
                                                        background: 'rgba(5, 10, 18, 0.96)',
                                                        borderRight: `1px solid ${color}`,
                                                        borderBottom: `1px solid ${color}`
                                                    }} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Dynamic Spinning Settings Cog Button (Slightly chunkier 2.5px border!) */}
                                        <motion.button
                                            onClick={() => setIsCustomizing(!isCustomizing)}
                                            whileHover={{
                                                scale: 1.12,
                                                rotate: 120, // Spin satisfyingly on hover!
                                                borderColor: 'var(--primary)',
                                                boxShadow: '0 0 20px rgba(0, 242, 255, 0.35)'
                                            }}
                                            whileTap={{ scale: 0.94 }}
                                            transition={{ type: 'spring', stiffness: 220, damping: 12 }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '50%',
                                                background: isCustomizing ? 'rgba(0, 242, 255, 0.15)' : 'rgba(8, 16, 28, 0.85)',
                                                backdropFilter: 'blur(10px)',
                                                border: '2.5px solid rgba(0, 242, 255, 0.55)',
                                                color: 'var(--primary)',
                                                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4), inset 0 0 10px rgba(0, 242, 255, 0.08)',
                                                cursor: 'pointer',
                                                outline: 'none'
                                            }}
                                        >
                                            <Settings size={18} />
                                        </motion.button>
                                    </motion.div>
                                );
                            })()}
                        </>
                    )}
                </AnimatePresence>

                {/* 4. Main Master Trigger Bubble (Pulsates gently, displays Zap action icon when closed) */}
                <motion.button
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (isOpen) setIsCustomizing(false); // Close customizer too
                    }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className="trigger-glow"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'rgba(8, 20, 35, 0.85)',
                        backdropFilter: 'blur(16px)',
                        border: isOpen ? '2.5px solid var(--primary)' : '2px solid rgba(0, 242, 255, 0.35)',
                        color: isOpen ? 'var(--primary)' : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                        zIndex: 1000,
                        outline: 'none',
                        transition: 'border-color 0.25s, color 0.25s'
                    }}
                >
                    <AnimatePresence mode="wait">
                        {isOpen ? (
                            <motion.div
                                key="close"
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                style={{ display: 'flex', alignItems: 'center' }}
                            >
                                <X size={20} color="var(--primary)" strokeWidth={2.5} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="arrow-shortcut"
                                initial={{ rotate: 90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: -90, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                style={{ display: 'flex', alignItems: 'center' }}
                            >
                                <ArrowUpRight size={22} color="var(--primary)" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 5px rgba(0, 242, 255, 0.5))' }} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </div>
    );
};

export default Hotbar;
