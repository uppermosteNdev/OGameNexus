import React, { useState, useEffect } from 'react';
import { Package, Calculator, Shield, Cpu, Target, Zap, Globe, ArrowUpRight } from 'lucide-react';
import './Tools.css';
import ScrapOptimizer from './tools/ScrapOptimizer';
import ExpeditionCalculator from './tools/ExpeditionCalculator';
import AcsSplitter from './tools/AcsSplitter';
import PlasmaTechOptimizer from './tools/PlasmaTechOptimizer';
import DiscovererOptimizer from './tools/DiscovererOptimizer';

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    component: React.ReactNode;
    inTesting?: boolean;
    isBeta?: boolean;
    isShortcut?: boolean;
    shortcutView?: string;
    shortcutTab?: string;
}

const Tools: React.FC = () => {
    const tools: Tool[] = [
        {
            id: 'empire-amortization',
            name: 'Empire Amortization',
            description: 'Optimize building and lifeform research ROI across the Empire',
            icon: <Calculator size={20} />,
            component: <div />,
            isShortcut: true,
            shortcutView: 'empire',
            shortcutTab: 'amortization'
        },
        {
            id: 'scrap-optimizer',
            name: 'Scrap Merchant',
            description: 'Optimize fleet scrapping for maximum resource return',
            icon: <Package size={20} />,
            component: <ScrapOptimizer />
        },
        {
            id: 'combat-sim',
            name: 'Combat Analysis',
            description: 'Advanced battle simulation and fleet compositions',
            icon: <Shield size={20} />,
            component: <div className="text-center py-20 text-[var(--text-muted)] italic">Module synchronization in progress...</div>,
            inTesting: true
        },
        {
            id: 'exp-calc',
            name: 'Expedition Calculator',
            description: 'Optimize fleet composition and calculate max potential yields',
            icon: <Calculator size={20} />,
            component: <ExpeditionCalculator />
        },
        {
            id: 'acs-splitter',
            name: 'ACS Splitter',
            description: 'Split combat results across multiple alliance members',
            icon: <Target size={20} />,
            component: <AcsSplitter />,
            isBeta: true
        },
        {
            id: 'plasma-optimizer',
            name: 'Plasma Tech Optimizer',
            description: 'Optimize Improved Stellarator levels to minimize research costs',
            icon: <Zap size={20} />,
            component: <PlasmaTechOptimizer />
        },
        {
            id: 'discoverer-optimizer',
            name: 'Discoverer Optimizer',
            description: 'Optimize T18 Kaelesh Tech and lab building costs',
            icon: <Globe size={20} />,
            component: <DiscovererOptimizer />
        }
    ];

    const [activeToolId, setActiveToolId] = useState('scrap-optimizer');

    // Support deep-linking from Hotbar
    useEffect(() => {
        const checkPending = () => {
            const pending = sessionStorage.getItem('ognexus_target_subview');
            if (pending) {
                try {
                    const { view, tab } = JSON.parse(pending);
                    if (view === 'tools' && tab) {
                        const targetTool = tools.find(t => t.id === tab);
                        if (targetTool && !targetTool.inTesting) {
                            setActiveToolId(tab);
                        }
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
            if (detail && detail.view === 'tools' && detail.tab) {
                const targetTool = tools.find(t => t.id === detail.tab);
                if (targetTool && !targetTool.inTesting) {
                    setActiveToolId(detail.tab);
                }
            }
        };
        window.addEventListener('ognexus_navigated', handleNav);
        return () => {
            window.removeEventListener('ognexus_navigated', handleNav);
        };
    }, [tools]);

    const activeTool = tools.find(t => t.id === activeToolId);

    return (
        <div className="view-container">
            <header className="view-header">
                <h1 className="view-title">Command Tools</h1>
                <p className="view-subtitle">Utility modules and tactical calculators for universe domination</p>
            </header>

            <div className="tools-layout">
                <aside className="tools-sidebar">
                    <div style={{ padding: '0 20px 20px 20px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Navigation
                    </div>
                    {tools.map(tool => {
                        const isTesting = tool.inTesting;
                        return (
                            <div
                                key={tool.id}
                                className={`tool-menu-item ${activeToolId === tool.id ? 'active' : ''}`}
                                onClick={() => {
                                    if (isTesting) return;
                                    if (tool.isShortcut && tool.shortcutView) {
                                        sessionStorage.setItem('ognexus_target_subview', JSON.stringify({
                                            view: tool.shortcutView,
                                            tab: tool.shortcutTab
                                        }));
                                        window.dispatchEvent(new CustomEvent('ognexus_navigated', {
                                            detail: { view: tool.shortcutView, tab: tool.shortcutTab }
                                        }));
                                        return;
                                    }
                                    setActiveToolId(tool.id);
                                }}
                                style={isTesting ? {
                                    opacity: 0.5,
                                    cursor: 'not-allowed'
                                } : undefined}
                            >
                                <div className="tool-icon">{tool.icon}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{tool.name}</span>
                                            {tool.isShortcut && <ArrowUpRight size={12} style={{ opacity: 0.5, color: 'var(--primary)' }} />}
                                        </div>
                                        {tool.isBeta && (
                                            <span style={{
                                                fontSize: '8px',
                                                fontWeight: 800,
                                                background: 'rgba(0, 242, 255, 0.15)',
                                                color: '#00f2ff',
                                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                                borderRadius: '4px',
                                                padding: '1px 5px',
                                                letterSpacing: '0.5px',
                                                textTransform: 'uppercase',
                                                lineHeight: 1
                                            }}>
                                                Beta
                                            </span>
                                        )}
                                        {isTesting && (
                                            <span style={{
                                                fontSize: '8px',
                                                fontWeight: 800,
                                                background: 'rgba(255,106,0,0.15)',
                                                color: '#ff6a00',
                                                border: '1px solid rgba(255,106,0,0.3)',
                                                borderRadius: '4px',
                                                padding: '1px 5px',
                                                letterSpacing: '0.5px',
                                                textTransform: 'uppercase',
                                                lineHeight: 1
                                            }}>
                                                In Testing
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.6, lineHeight: 1.3 }}>
                                        {tool.description}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </aside>

                <main className="tool-content">
                    {activeTool && (
                        <>
                            <div style={{ marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <div style={{ color: 'var(--primary)', filter: 'drop-shadow(0 0 8px var(--primary-glow))' }}>
                                        {activeTool.icon}
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {activeTool.name}
                                        {activeTool.isBeta && (
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                background: 'rgba(0, 242, 255, 0.15)',
                                                color: '#00f2ff',
                                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                                borderRadius: '4px',
                                                padding: '2px 6px',
                                                letterSpacing: '0.5px',
                                                textTransform: 'uppercase',
                                                lineHeight: 1
                                            }}>
                                                Beta
                                            </span>
                                        )}
                                    </h2>
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{activeTool.description}</p>
                            </div>
                            {activeTool.component}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Tools;
