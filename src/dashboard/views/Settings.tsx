import React, { useState, useEffect } from 'react';
import { getLinkedAccount, linkGoogleAccount, unlinkGoogleAccount, GoogleAccount } from '../../utils/googleAuth';
import { LogIn, LogOut, CheckCircle, Smartphone, ShieldCheck, Database, TrendingUp, Cpu, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

const Settings: React.FC = () => {
    const [account, setAccount] = useState<GoogleAccount | null>(null);
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Economy Rates State
    const conversionRates = useLiveQuery(() => db.settings.get('conversion_rates'));
    const [rates, setRates] = useState({ metal: 3, crystal: 2, deuterium: 1 });
    const [isSavingRates, setIsSavingRates] = useState(false);

    // Tools Preferences State
    const [scrapPercent, setScrapPercent] = useState(35);
    const [removeOGLight, setRemoveOGLight] = useState(true);

    useEffect(() => {
        const fetchAccount = async () => {
            const acc = await getLinkedAccount();
            setAccount(acc);
            setIsLoading(false);
        };
        fetchAccount();

        // Load Global Tools Preferences
        const loadSettings = async () => {
            try {
                const localData = await chrome.storage.local.get('globalSettings');
                if (localData?.globalSettings) {
                    const settings = localData.globalSettings;
                    if (settings.defaultScrapPercent !== undefined) setScrapPercent(settings.defaultScrapPercent);
                    if (settings.removeOGLightDuplicates !== undefined) {
                        setRemoveOGLight(settings.removeOGLightDuplicates);
                    }
                } else {
                    const globalSettings = localStorage.getItem('og-nexus-global-settings');
                    if (globalSettings) {
                        const parsed = JSON.parse(globalSettings);
                        if (parsed.defaultScrapPercent !== undefined) setScrapPercent(parsed.defaultScrapPercent);
                        if (parsed.removeOGLightDuplicates !== undefined) {
                            setRemoveOGLight(parsed.removeOGLightDuplicates);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load settings from storage", e);
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (conversionRates) {
            setRates({
                metal: conversionRates.metal || 3,
                crystal: conversionRates.crystal || 2,
                deuterium: conversionRates.deuterium || 1
            });
        }
    }, [conversionRates]);

    const handleToggleAuth = async () => {
        if (account) {
            await unlinkGoogleAccount();
            setAccount(null);
        } else {
            // Intercept for Coming Soon modal
            setShowComingSoon(true);
        }
    };

    const saveRates = async () => {
        setIsSavingRates(true);
        try {
            await db.settings.put({
                id: 'conversion_rates',
                metal: rates.metal,
                crystal: rates.crystal,
                deuterium: rates.deuterium
            });
            setTimeout(() => setIsSavingRates(false), 500);
        } catch (e) {
            console.error(e);
            setIsSavingRates(false);
        }
    };

    const saveScrapPercent = async (val: number) => {
        const num = Math.min(100, Math.max(0, val || 0));
        setScrapPercent(num);
        try {
            const current = JSON.parse(localStorage.getItem('og-nexus-global-settings') || '{}');
            current.defaultScrapPercent = num;
            localStorage.setItem('og-nexus-global-settings', JSON.stringify(current));

            // Sync to chrome.storage.local
            await chrome.storage.local.set({ globalSettings: current });

            // Also update the scrap tool's local storage so it applies immediately if it never edited.
            const scrapOpt = JSON.parse(localStorage.getItem('og-nexus-scrap-optimizer') || '{}');
            scrapOpt.scrapPercent = num;
            localStorage.setItem('og-nexus-scrap-optimizer', JSON.stringify(scrapOpt));

        } catch (e) {
            console.error(e);
        }
    };

    const saveRemoveOGLight = async (val: boolean) => {
        setRemoveOGLight(val);
        try {
            const current = JSON.parse(localStorage.getItem('og-nexus-global-settings') || '{}');
            current.removeOGLightDuplicates = val;
            localStorage.setItem('og-nexus-global-settings', JSON.stringify(current));

            // Sync to chrome.storage.local
            await chrome.storage.local.set({ globalSettings: current });
        } catch (e) {
            console.error(e);
        }
    };

    const clearTableData = async (tableName: 'expeditions' | 'combatReports' | 'debrisHarvests', alertName: string) => {
        if (window.confirm(`Are you sure you want to delete ALL ${alertName}? This action cannot be undone.`)) {
            try {
                await db[tableName].clear();
                alert(`Successfully cleared all ${alertName}.`);
            } catch (e) {
                console.error(`Failed to clear ${tableName}`, e);
                alert(`Failed to clear ${alertName}. Check console.`);
            }
        }
    };

    const resetWelcomeModal = () => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove('welcomeDismissed', () => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                    }
                });
            }
            localStorage.removeItem('og-nexus-welcome-dismissed');
            alert("Welcome modal state has been reset! Refresh the dashboard to see it.");
        } catch (e) {
            console.error(e);
            localStorage.removeItem('og-nexus-welcome-dismissed');
            alert("Welcome modal state has been reset! Refresh the dashboard to see it.");
        }
    };

    return (
        <div className="view">
            <h1>Settings Hub</h1>
            <p>Configure extension behavior, economy baselines, and data management.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '32px' }}>
                
                {/* Economy Settings */}
                <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <TrendingUp size={20} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Market & Economy Rates</h2>
                    </div>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '20px' }}>
                        Set the standard trade ratios for your universe (MSU). This affects Amortization returns and Tech optimizations.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-metal)' }}>Metal Rate</span>
                            <input 
                                type="number" 
                                value={rates.metal} 
                                onChange={(e) => setRates({...rates, metal: parseFloat(e.target.value) || 0})}
                                style={{ width: '80px', padding: '6px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-crystal)' }}>Crystal Rate</span>
                            <input 
                                type="number" 
                                value={rates.crystal} 
                                onChange={(e) => setRates({...rates, crystal: parseFloat(e.target.value) || 0})}
                                style={{ width: '80px', padding: '6px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-deuterium)' }}>Deuterium Rate</span>
                            <input 
                                type="number" 
                                value={rates.deuterium} 
                                onChange={(e) => setRates({...rates, deuterium: parseFloat(e.target.value) || 0})}
                                style={{ width: '80px', padding: '6px' }}
                            />
                        </div>
                    </div>
                    <button 
                        onClick={saveRates}
                        style={{ marginTop: '20px', width: '100%', padding: '10px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                    >
                        {isSavingRates ? 'Saved!' : 'Save Economy Rates'}
                    </button>
                </div>

                {/* Tool Preferences */}
                <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Cpu size={20} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Tool Preferences</h2>
                    </div>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '20px' }}>
                        Configure default behaviors for the extension's toolset.
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600 }}>Default Scrap Return %</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Loaded automatically in the Scrap Optimizer tool (e.g. 75 for Discoverer).</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                                type="number" 
                                value={scrapPercent} 
                                onChange={(e) => saveScrapPercent(parseInt(e.target.value))}
                                min="0" max="100"
                                style={{ width: '80px', padding: '6px' }}
                            />
                            <span style={{ fontWeight: 800 }}>%</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ marginRight: '16px' }}>
                            <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600 }}>Clean OGLight Duplicate Visuals</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Automatically removes OGLight injected markup from processed expedition and lifeform messages.</span>
                        </div>
                        <div>
                            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={removeOGLight} 
                                    onChange={(e) => saveRemoveOGLight(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span className="slider" style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: removeOGLight ? 'var(--primary)' : '#334155',
                                    transition: '.3s', borderRadius: '24px',
                                    boxShadow: removeOGLight ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none'
                                }}>
                                    <span style={{
                                        position: 'absolute', content: '""', height: '18px', width: '18px', left: removeOGLight ? '24px' : '4px', bottom: '3px',
                                        backgroundColor: '#0f172a', transition: '.3s', borderRadius: '50%'
                                    }} />
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Database size={20} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Data Management</h2>
                    </div>
                    
                    <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '20px' }}>
                        Manage locally recorded logs and tracking databases. For imports and exports, visit the Data Management tool.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button 
                            onClick={() => clearTableData('expeditions', 'Expedition Logs')}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.2)', color: '#ff4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            <span>Clear Expedition Logs</span>
                            <Trash2 size={16} />
                        </button>
                        <button 
                            onClick={() => clearTableData('combatReports', 'Combat Reports')}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.2)', color: '#ff4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            <span>Clear Combat Reports</span>
                            <Trash2 size={16} />
                        </button>
                        <button 
                            onClick={() => clearTableData('debrisHarvests', 'Debris Harvests')}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.2)', color: '#ff4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            <span>Clear Debris Harvests</span>
                            <Trash2 size={16} />
                        </button>
                        <button 
                            onClick={resetWelcomeModal}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(0, 242, 255, 0.1)', border: '1px solid rgba(0, 242, 255, 0.2)', color: 'var(--primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            <span>Reset Welcome Modal State</span>
                            <Sparkles size={16} />
                        </button>
                    </div>
                </div>

                {/* Cloud Backup */}
                <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <ShieldCheck size={20} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Cloud Backup</h2>
                    </div>

                    {isLoading ? (
                        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                        </div>
                    ) : account ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                    src={account.picture}
                                    style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid var(--primary)' }}
                                    alt="Profile"
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.name}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.email}</div>
                                </div>
                                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={14} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>LINKED</span>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleAuth}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,68,68,0.1)',
                                    color: '#ff4444',
                                    border: '1px solid rgba(255,68,68,0.2)',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <LogOut size={16} /> Unlink Google Account
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: 1.5 }}>
                                Link your Google Account to enable automated cloud backups and multi-device synchronization.
                            </p>
                            <button
                                onClick={handleToggleAuth}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: 'var(--primary)',
                                    color: '#000',
                                    border: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <LogIn size={18} /> Link Account
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Coming Soon Modal */}
            <AnimatePresence>
                {showComingSoon && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowComingSoon(false)}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                backdropFilter: 'blur(8px)',
                                zIndex: 1000,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '400px',
                                    background: 'rgba(10, 20, 30, 0.95)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: '24px',
                                    padding: '40px',
                                    textAlign: 'center',
                                    boxShadow: '0 0 40px rgba(0, 98, 255, 0.2)'
                                }}
                            >
                                <div style={{ 
                                    width: '64px', 
                                    height: '64px', 
                                    background: 'rgba(0, 98, 255, 0.1)', 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    margin: '0 auto 24px',
                                    border: '1px solid var(--primary)'
                                }}>
                                    <Smartphone size={32} color="var(--primary)" />
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '16px', color: '#fff' }}>Deploying Soon</h2>
                                <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6, marginBottom: '32px' }}>
                                    Cloud synchronization and remote backups are currently undergoing flight trials. This feature will be available in a future transmission.
                                </p>
                                <button
                                    onClick={() => setShowComingSoon(false)}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        background: 'var(--primary)',
                                        color: '#000',
                                        border: 'none',
                                        fontSize: '1rem',
                                        fontWeight: 900,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Acknowledge
                                </button>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Settings;

