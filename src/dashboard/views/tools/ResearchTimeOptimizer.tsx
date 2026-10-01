import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    TrendingUp,
    Globe,
    Zap,
    Sparkles,
    Sliders,
    ChevronDown,
    ChevronUp,
    Award,
    Building2,
    Network,
    FlaskConical,
    Compass,
    UserCheck,
    CheckCircle2,
    HelpCircle,
    ArrowUpRight,
    Search,
    ShieldAlert
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Planet } from '../../../db';
import { calculateMSU, DEFAULT_RATES, safeArray } from '../../../utils/amortizationCalc';
import {
    STANDARD_RESEARCHES,
    StandardResearchDef,
    calculateResearchDuration,
    formatDuration,
    formatDurationExact,
    formatOGameDuration,
    generateResearchAmortizationList,
    AmortizationUpgradeOption
} from '../../../utils/researchTimeCalc';

const ResearchTimeOptimizer: React.FC = () => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const planets: Planet[] = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];
    const rates: any = useLiveQuery(() => db.settings.get('conversion_rates')) || DEFAULT_RATES;

    // Active Tech Selection: Default to Impulse Drive (id 117)
    const [selectedTechId, setSelectedTechId] = useState<number>(117);
    const selectedTech = useMemo(() => {
        return STANDARD_RESEARCHES.find(r => r.id === selectedTechId) || STANDARD_RESEARCHES[0];
    }, [selectedTechId]);

    // Current player's research level from account
    const currentAccountTechLevel = useMemo(() => {
        const found = safeArray(activeAccount?.researches).find(r => r.id === selectedTech.id);
        return found ? (found.level || 0) : 0;
    }, [activeAccount, selectedTech.id]);

    // Target Level (defaults to current + 1)
    const [targetLevel, setTargetLevel] = useState<number>(1);
    useEffect(() => {
        setTargetLevel(Math.max(1, currentAccountTechLevel + 1));
    }, [currentAccountTechLevel, selectedTech.id]);

    // Server Event Discount (-25% active by default, stored in localStorage)
    const [eventDiscount, setEventDiscount] = useState<number>(() => {
        const saved = localStorage.getItem('ognexus_research_event_pct');
        return saved !== null ? Number(saved) : 25;
    });

    const handleEventDiscountChange = (val: number) => {
        setEventDiscount(val);
        localStorage.setItem('ognexus_research_event_pct', String(val));
    };

    // Simulation / Custom Overrides
    const [showSimulationSettings, setShowSimulationSettings] = useState<boolean>(false);
    const [customDivisor, setCustomDivisor] = useState<number | ''>('');
    const [customIrnLevel, setCustomIrnLevel] = useState<number | ''>('');
    const [technocratOverride, setTechnocratOverride] = useState<boolean | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'lab' | 'irn' | 'lifeform_research' | 'discoverer_tech'>('all');

    // Formula details accordion
    const [isFormulaOpen, setIsFormulaOpen] = useState<boolean>(false);

    // Active Divisor: use scraped serverData divisor if present, else fallback
    const effectiveDivisor = useMemo(() => {
        if (customDivisor !== '') return Number(customDivisor);
        return activeAccount?.researchDurationDivisor || 2; // Default to 2 if not scraped yet (standard for boosted uni like Lyra)
    }, [customDivisor, activeAccount?.researchDurationDivisor]);

    const effectiveIrn = useMemo(() => {
        if (customIrnLevel !== '') return Number(customIrnLevel);
        return safeArray(activeAccount?.researches).find(r => r.id === 123)?.level || 0;
    }, [customIrnLevel, activeAccount?.researches]);

    const effectiveTechnocrat = useMemo(() => {
        if (technocratOverride !== null) return technocratOverride;
        return !!activeAccount?.hasTechnocrat;
    }, [technocratOverride, activeAccount?.hasTechnocrat]);

    // Main calculation for current configuration
    const currentCalculation = useMemo(() => {
        return calculateResearchDuration({
            tech: selectedTech,
            targetLevel,
            account: activeAccount,
            planets,
            rates,
            divisorOverride: effectiveDivisor,
            irnLevelOverride: effectiveIrn,
            technocratOverride: effectiveTechnocrat,
            eventDiscountPct: eventDiscount
        });
    }, [selectedTech, targetLevel, activeAccount, planets, rates, effectiveDivisor, effectiveIrn, effectiveTechnocrat, eventDiscount]);

    // Amortization Recommendations list
    const amortizationList = useMemo(() => {
        return generateResearchAmortizationList({
            tech: selectedTech,
            targetLevel,
            account: activeAccount,
            planets,
            rates,
            divisorOverride: effectiveDivisor,
            technocratOverride: effectiveTechnocrat,
            eventDiscountPct: eventDiscount
        });
    }, [selectedTech, targetLevel, activeAccount, planets, rates, effectiveDivisor, effectiveTechnocrat, eventDiscount]);

    // Filtered options
    const filteredOptions = useMemo(() => {
        if (categoryFilter === 'all') return amortizationList;
        return amortizationList.filter(o => o.category === categoryFilter);
    }, [amortizationList, categoryFilter]);

    const bestUpgrade = amortizationList.length > 0 ? amortizationList[0] : null;

    return (
        <div className="research-optimizer-container" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '60px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.2), rgba(189, 0, 255, 0.2))',
                            border: '1px solid rgba(0, 242, 255, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)'
                        }}>
                            <Clock size={22} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                                Research Time & Amortization Optimizer
                            </h1>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Exact OGame standard research duration formulas, multi-planet IRN pooling & ROI-ranked upgrade recommendations.
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => setShowSimulationSettings(!showSimulationSettings)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            background: showSimulationSettings ? 'rgba(0, 242, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            border: `1px solid ${showSimulationSettings ? 'var(--primary)' : 'var(--border)'}`,
                            color: showSimulationSettings ? 'var(--primary)' : 'var(--text-main)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Sliders size={16} />
                        <span>Universe & Officer Simulation</span>
                    </button>
                </div>
            </div>

            {/* Simulation Overrides Drawer */}
            <AnimatePresence>
                {showSimulationSettings && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', marginBottom: '24px' }}
                    >
                        <div style={{
                            background: 'rgba(10, 15, 26, 0.8)',
                            border: '1px solid rgba(0, 242, 255, 0.2)',
                            borderRadius: '16px',
                            padding: '20px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '16px'
                        }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    RESEARCH DURATION DIVISOR
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        placeholder={`Auto (${effectiveDivisor}x)`}
                                        value={customDivisor}
                                        onChange={(e) => setCustomDivisor(e.target.value === '' ? '' : Number(e.target.value))}
                                        style={{
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            color: '#fff',
                                            fontSize: '0.9rem',
                                            width: '100%'
                                        }}
                                    />
                                    {customDivisor !== '' && (
                                        <button
                                            onClick={() => setCustomDivisor('')}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    Lyra/Scorpius: 2x (16x total). Veritate: 3x (15x total).
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    IRN LEVEL OVERRIDE
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        placeholder={`Auto (Lvl ${effectiveIrn})`}
                                        value={customIrnLevel}
                                        onChange={(e) => setCustomIrnLevel(e.target.value === '' ? '' : Number(e.target.value))}
                                        style={{
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            color: '#fff',
                                            fontSize: '0.9rem',
                                            width: '100%'
                                        }}
                                    />
                                    {customIrnLevel !== '' && (
                                        <button
                                            onClick={() => setCustomIrnLevel('')}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    Simulate connecting more colonies ({effectiveIrn + 1} max connected).
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    TECHNOCRAT OFFICER (-25%)
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setTechnocratOverride(true)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: effectiveTechnocrat ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                            border: `1px solid ${effectiveTechnocrat ? 'var(--primary)' : 'transparent'}`,
                                            color: effectiveTechnocrat ? '#fff' : 'var(--text-muted)',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Active
                                    </button>
                                    <button
                                        onClick={() => setTechnocratOverride(false)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: !effectiveTechnocrat ? 'rgba(255, 80, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                            border: `1px solid ${!effectiveTechnocrat ? 'rgba(255, 80, 80, 0.5)' : 'transparent'}`,
                                            color: !effectiveTechnocrat ? '#fff' : 'var(--text-muted)',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Inactive
                                    </button>
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    Account default: {activeAccount?.hasTechnocrat ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    SERVER RESEARCH EVENT (%)
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        min="0"
                                        max="90"
                                        placeholder="0"
                                        value={eventDiscount}
                                        onChange={(e) => handleEventDiscountChange(Math.max(0, Math.min(99, Number(e.target.value))))}
                                        style={{
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: `1px solid ${eventDiscount > 0 ? '#ffb703' : 'var(--border)'}`,
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            color: eventDiscount > 0 ? '#ffb703' : '#fff',
                                            fontSize: '0.9rem',
                                            fontWeight: 800,
                                            width: '100%'
                                        }}
                                    />
                                    {eventDiscount > 0 && (
                                        <button
                                            onClick={() => handleEventDiscountChange(0)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.65rem', color: eventDiscount > 0 ? '#ffb703' : 'var(--text-muted)' }}>
                                    {eventDiscount > 0 ? `Active: -${eventDiscount}% research duration` : 'Simulate global game events (e.g. 25%)'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Target Research Configuration Bar */}
            <div style={{
                background: 'rgba(12, 18, 28, 0.7)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '20px',
                marginBottom: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            SELECTED RESEARCH
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                            <select
                                value={selectedTechId}
                                onChange={(e) => setSelectedTechId(Number(e.target.value))}
                                style={{
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid rgba(0, 242, 255, 0.3)',
                                    borderRadius: '12px',
                                    padding: '10px 16px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                {STANDARD_RESEARCHES.map(tech => (
                                    <option key={tech.id} value={tech.id} style={{ background: '#0c121c', color: '#fff' }}>
                                        {tech.name} (Req Lab Lvl {tech.minLab})
                                    </option>
                                ))}
                            </select>

                            <div style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '6px 12px',
                                borderRadius: '10px',
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border)'
                            }}>
                                Account Level: <b style={{ color: '#fff' }}>{currentAccountTechLevel}</b>
                            </div>
                        </div>
                    </div>

                    <div style={{ width: '1px', height: '40px', background: 'var(--border)', margin: '0 8px' }} />

                    {/* Target Level Controls */}
                    <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            TARGET LEVEL TO RESEARCH
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <button
                                onClick={() => setTargetLevel(Math.max(1, targetLevel - 1))}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--border)',
                                    color: '#fff',
                                    fontSize: '1.1rem',
                                    fontWeight: 900,
                                    cursor: 'pointer'
                                }}
                            >
                                -
                            </button>

                            <input
                                type="number"
                                min="1"
                                max="40"
                                value={targetLevel}
                                onChange={(e) => setTargetLevel(Math.max(1, Number(e.target.value)))}
                                style={{
                                    width: '60px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid rgba(0, 242, 255, 0.3)',
                                    color: 'var(--primary)',
                                    fontSize: '1.1rem',
                                    fontWeight: 900,
                                    textAlign: 'center',
                                    outline: 'none'
                                }}
                            />

                            <button
                                onClick={() => setTargetLevel(targetLevel + 1)}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--border)',
                                    color: '#fff',
                                    fontSize: '1.1rem',
                                    fontWeight: 900,
                                    cursor: 'pointer'
                                }}
                            >
                                +
                            </button>

                            <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                                {[currentAccountTechLevel + 1, currentAccountTechLevel + 2, currentAccountTechLevel + 5].filter(l => l > 0).map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => setTargetLevel(lvl)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            background: targetLevel === lvl ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                            border: `1px solid ${targetLevel === lvl ? 'var(--primary)' : 'transparent'}`,
                                            color: targetLevel === lvl ? 'var(--primary)' : 'var(--text-muted)',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Lvl {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target Cost Summary */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                            Target Level Cost (MSU)
                        </span>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)' }}>
                            {Math.round(currentCalculation.msuCost).toLocaleString()} MSU
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span>M: {currentCalculation.cost.metal.toLocaleString()}</span>
                            <span>C: {currentCalculation.cost.crystal.toLocaleString()}</span>
                            <span>D: {currentCalculation.cost.deuterium.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Server Research Event Selector Banner */}
                <div style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    background: eventDiscount > 0
                        ? 'linear-gradient(90deg, rgba(255, 183, 3, 0.12) 0%, rgba(12, 18, 28, 0.5) 100%)'
                        : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${eventDiscount > 0 ? 'rgba(255, 183, 3, 0.35)' : 'rgba(255, 255, 255, 0.06)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: eventDiscount > 0 ? 'rgba(255, 183, 3, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: eventDiscount > 0 ? '#ffb703' : 'var(--text-muted)'
                        }}>
                            <Zap size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: eventDiscount > 0 ? '#ffb703' : '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>Server Research Event</span>
                                {eventDiscount > 0 ? (
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 900,
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(255, 183, 3, 0.2)',
                                        color: '#ffb703',
                                        border: '1px solid rgba(255, 183, 3, 0.4)'
                                    }}>
                                        ACTIVE (-{eventDiscount}%)
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {eventDiscount > 0
                                    ? `Cuts remaining research time by ${eventDiscount}%. Matches in-game tech display: ${formatOGameDuration(currentCalculation.finalDurationSeconds)}.`
                                    : 'No active server event. Click -25% Event below if an OGame global research event is running.'}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => handleEventDiscountChange(0)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                background: eventDiscount === 0 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${eventDiscount === 0 ? 'rgba(255, 255, 255, 0.3)' : 'transparent'}`,
                                color: eventDiscount === 0 ? '#fff' : 'var(--text-muted)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            None (0%)
                        </button>
                        <button
                            onClick={() => handleEventDiscountChange(25)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                background: eventDiscount === 25 ? 'rgba(255, 183, 3, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${eventDiscount === 25 ? '#ffb703' : 'transparent'}`,
                                color: eventDiscount === 25 ? '#ffb703' : 'var(--text-muted)',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                            }}
                        >
                            ⚡ -25% Event
                        </button>
                        <button
                            onClick={() => handleEventDiscountChange(30)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                background: eventDiscount === 30 ? 'rgba(255, 183, 3, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${eventDiscount === 30 ? '#ffb703' : 'transparent'}`,
                                color: eventDiscount === 30 ? '#ffb703' : 'var(--text-muted)',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                            }}
                        >
                            -30% Event
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                            <input
                                type="number"
                                min="0"
                                max="90"
                                value={eventDiscount}
                                onChange={(e) => handleEventDiscountChange(Math.max(0, Math.min(99, Number(e.target.value))))}
                                style={{
                                    width: '54px',
                                    padding: '5px 8px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: `1px solid ${eventDiscount > 0 ? '#ffb703' : 'var(--border)'}`,
                                    color: eventDiscount > 0 ? '#ffb703' : '#fff',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    textAlign: 'center',
                                    outline: 'none'
                                }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Bento Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {/* 1. Current Duration Hero */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.08) 0%, rgba(12, 18, 28, 0.7) 100%)',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    borderRadius: '20px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Current Research Time
                        </span>
                        <Clock size={16} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                        <span>{formatDuration(currentCalculation.finalDurationSeconds, true)}</span>
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(0, 242, 255, 0.15)',
                            color: 'var(--primary)',
                            fontWeight: 800,
                            letterSpacing: '0.02em'
                        }}>
                            In-Game: {formatOGameDuration(currentCalculation.finalDurationSeconds)}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Base: {formatDuration(currentCalculation.baseDurationSeconds, true)} <span style={{ color: '#4ade80' }}>(-{((1 - currentCalculation.combinedDiscountMultiplier) * 100).toFixed(2)}%)</span> · Exact: {formatDurationExact(currentCalculation.finalDurationSeconds)}
                    </div>
                </div>

                {/* 2. Effective Research Lab Level & IRN */}
                <div style={{
                    background: 'rgba(12, 18, 28, 0.7)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Effective Lab Level
                        </span>
                        <Building2 size={16} style={{ color: '#a855f7' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        Lvl {currentCalculation.labResult.effectiveLabLevel}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        IRN Lvl {currentCalculation.labResult.irnLevel} · <b style={{ color: '#fff' }}>{currentCalculation.labResult.connectedCount}</b> labs pooled (of {currentCalculation.labResult.eligibleCount} eligible)
                    </div>
                </div>

                {/* 3. Universe Research Speed */}
                <div style={{
                    background: 'rgba(12, 18, 28, 0.7)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Universe Research Speed
                        </span>
                        <Zap size={16} style={{ color: '#eab308' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {currentCalculation.speedResult.totalResearchSpeed}x Speed
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {currentCalculation.speedResult.economySpeed}x Economy × {currentCalculation.speedResult.researchDivisor}x Research Divisor
                    </div>
                </div>

                {/* 4. Total Multipliers & Reductions */}
                <div style={{
                    background: 'rgba(12, 18, 28, 0.7)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Active Reductions
                        </span>
                        <Sparkles size={16} style={{ color: '#00f2ff' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4ade80', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        -{((1 - currentCalculation.combinedDiscountMultiplier) * 100).toFixed(2)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Disc: {currentCalculation.discovererResult.effectiveReductionPct.toFixed(1)}% · LF: {currentCalculation.lifeformResult.totalReductionPct.toFixed(1)}% · Tech: {currentCalculation.technocratDiscountPct}%{currentCalculation.eventDiscountPct > 0 ? ` · Event: ${currentCalculation.eventDiscountPct}%` : ''}
                    </div>
                </div>
            </div>

            {/* Formula & Connected Labs Transparency Panel */}
            <div style={{
                background: 'rgba(12, 18, 28, 0.6)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '20px',
                marginBottom: '28px'
            }}>
                <div
                    onClick={() => setIsFormulaOpen(!isFormulaOpen)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FlaskConical size={18} style={{ color: 'var(--primary)' }} />
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                            Formula Breakdown & Connected Colonies
                        </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <span>{isFormulaOpen ? 'Hide details' : 'Inspect formula & labs'}</span>
                        {isFormulaOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>

                {isFormulaOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}
                    >
                        {/* Mathematical Formula Explanation */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            marginBottom: '20px',
                            fontSize: '0.85rem'
                        }}>
                            <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
                                OGame Exact Standard Research Time Equation:
                            </div>
                            <code style={{ display: 'block', color: '#fff', background: 'rgba(255, 255, 255, 0.04)', padding: '10px', borderRadius: '8px', fontFamily: 'monospace' }}>
                                Time (hours) = (Metal + Crystal) / (1000 × (1 + Effective_Lab_Level) × Universe_Research_Speed) × (1 - Disc_Reduction) × (1 - LF_Reduction) × (1 - Technocrat) × (1 - Event_Reduction)
                            </code>
                            <div style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.6' }}>
                                Plugged in for <b>{selectedTech.name} Level {targetLevel}</b>:<br />
                                • Cost: ({currentCalculation.cost.metal.toLocaleString()} M + {currentCalculation.cost.crystal.toLocaleString()} C) = {(currentCalculation.cost.metal + currentCalculation.cost.crystal).toLocaleString()}<br />
                                • Divisor: 1000 × (1 + {currentCalculation.labResult.effectiveLabLevel}) × {currentCalculation.speedResult.totalResearchSpeed} = {(1000 * (1 + currentCalculation.labResult.effectiveLabLevel) * currentCalculation.speedResult.totalResearchSpeed).toLocaleString()}<br />
                                • Base Time: {formatDuration(currentCalculation.baseDurationSeconds, true)} ({Math.round(currentCalculation.baseDurationSeconds)}s)<br />
                                • Discoverer Class Boost: -{currentCalculation.discovererResult.effectiveReductionPct.toFixed(2)}% (-25% base + {currentCalculation.discovererResult.kaeleshEnhancementPct.toFixed(2)}% Kaelesh Tech)<br />
                                • Lifeform Research Reduction: -{currentCalculation.lifeformResult.totalReductionPct.toFixed(2)}% across all empire setups<br />
                                • Technocrat Officer: -{currentCalculation.technocratDiscountPct}%<br />
                                • Server Research Event: -{currentCalculation.eventDiscountPct}% (reduces remaining duration by {currentCalculation.eventDiscountPct}%)<br />
                                • Final Calculated Duration: <b>{formatDuration(currentCalculation.finalDurationSeconds, true)}</b> (OGame display: <b>{formatOGameDuration(currentCalculation.finalDurationSeconds)}</b>)
                            </div>
                        </div>

                        {/* Connected Colonies Labs Grid */}
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                                Research Labs Across Colonies (IRN Pool: Top {currentCalculation.labResult.maxConnectedCount} Labs):
                            </span>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                gap: '10px'
                            }}>
                                {currentCalculation.labResult.labs.map(lab => (
                                    <div
                                        key={lab.planetId}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            background: lab.inNetwork
                                                ? 'linear-gradient(135deg, rgba(0, 242, 255, 0.08) 0%, rgba(12, 18, 28, 0.6) 100%)'
                                                : 'rgba(0, 0, 0, 0.3)',
                                            border: `1px solid ${lab.inNetwork ? 'rgba(0, 242, 255, 0.3)' : 'var(--border)'}`,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>
                                                {lab.planetName}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                [{lab.coords}]
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: lab.inNetwork ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                Lvl {lab.labLevel}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px' }}>
                                                {lab.inNetwork ? (
                                                    <span style={{ color: '#4ade80' }}>● Connected</span>
                                                ) : lab.eligible ? (
                                                    <span style={{ color: 'var(--text-muted)' }}>○ Needs IRN</span>
                                                ) : (
                                                    <span style={{ color: '#f87171' }}>✕ Lvl &lt; {selectedTech.minLab}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* #1 Best Value Upgrade Spotlight Card */}
            {bestUpgrade && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(12, 18, 28, 0.8) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '20px',
                    padding: '22px',
                    marginBottom: '28px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                background: 'rgba(212, 175, 55, 0.2)',
                                color: '#ffd700',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <Award size={14} /> #1 TOP RECOMMENDED UPGRADE
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                                Highest research time reduction per MSU invested
                            </span>
                        </div>

                        <div style={{
                            background: 'rgba(74, 222, 128, 0.15)',
                            color: '#4ade80',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 800
                        }}>
                            Saves {formatDuration(bestUpgrade.timeSavedSeconds)} on {selectedTech.name} Lvl {targetLevel}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
                                {bestUpgrade.title}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {bestUpgrade.description}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                                    UPGRADE COST
                                </span>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffd700' }}>
                                    {Math.round(bestUpgrade.msuCost).toLocaleString()} MSU
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                                    NEW DURATION
                                </span>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#4ade80' }}>
                                    {formatDuration(bestUpgrade.newDurationSeconds)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Amortized Upgrade Recommendations Table */}
            <div style={{
                background: 'rgba(12, 18, 28, 0.7)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '24px',
                backdropFilter: 'blur(16px)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>
                            Amortized Upgrade Rankings
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Ranked by ROI efficiency (Time Saved vs Resource Cost).
                        </span>
                    </div>

                    {/* Filter Category Tabs */}
                    <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.3)', padding: '4px', borderRadius: '12px' }}>
                        {[
                            { key: 'all', label: 'All Upgrades' },
                            { key: 'lab', label: 'Research Labs' },
                            { key: 'irn', label: 'IRN Network' },
                            { key: 'lifeform_research', label: 'Lifeforms' },
                            { key: 'discoverer_tech', label: 'Discoverer Boost' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setCategoryFilter(tab.key as any)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: categoryFilter === tab.key ? 'rgba(0, 242, 255, 0.15)' : 'transparent',
                                    color: categoryFilter === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredOptions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No upgrade recommendations found for the selected category.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                    <th style={{ padding: '12px 14px' }}>Rank</th>
                                    <th style={{ padding: '12px 14px' }}>Upgrade Target</th>
                                    <th style={{ padding: '12px 14px' }}>Category</th>
                                    <th style={{ padding: '12px 14px' }}>Location</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Cost (MSU)</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Time Saved</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>New Time</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Efficiency (s/1M MSU)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOptions.map((opt) => (
                                    <tr
                                        key={opt.id}
                                        style={{
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                            transition: 'background 0.2s'
                                        }}
                                        className="interactive-table-row"
                                    >
                                        {/* Rank */}
                                        <td style={{ padding: '14px' }}>
                                            <span style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '6px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 900,
                                                background: opt.rank === 1 ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                color: opt.rank === 1 ? '#ffd700' : 'var(--text-main)',
                                                border: `1px solid ${opt.rank === 1 ? 'rgba(212, 175, 55, 0.4)' : 'transparent'}`
                                            }}>
                                                #{opt.rank}
                                            </span>
                                        </td>

                                        {/* Upgrade Title */}
                                        <td style={{ padding: '14px', fontWeight: 800, color: '#fff' }}>
                                            <div>{opt.title}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                                                {opt.description}
                                            </div>
                                        </td>

                                        {/* Category Badge */}
                                        <td style={{ padding: '14px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                background: opt.category === 'lab' ? 'rgba(168, 85, 247, 0.15)' :
                                                    opt.category === 'irn' ? 'rgba(0, 242, 255, 0.15)' :
                                                    opt.category === 'discoverer_tech' ? 'rgba(212, 175, 55, 0.15)' :
                                                    'rgba(74, 222, 128, 0.15)',
                                                color: opt.category === 'lab' ? '#c084fc' :
                                                    opt.category === 'irn' ? '#38bdf8' :
                                                    opt.category === 'discoverer_tech' ? '#ffd700' :
                                                    '#4ade80'
                                            }}>
                                                {opt.categoryLabel}
                                            </span>
                                        </td>

                                        {/* Location */}
                                        <td style={{ padding: '14px', color: 'var(--text-muted)' }}>
                                            {opt.planetName ? (
                                                <span>{opt.planetName} <span style={{ opacity: 0.5 }}>[{opt.coords}]</span></span>
                                            ) : (
                                                <span style={{ opacity: 0.6 }}>Empire Wide</span>
                                            )}
                                        </td>

                                        {/* Cost */}
                                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>
                                            {Math.round(opt.msuCost).toLocaleString()}
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                M: {opt.cost.metal.toLocaleString()} | C: {opt.cost.crystal.toLocaleString()}
                                            </div>
                                        </td>

                                        {/* Time Saved */}
                                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 900, color: '#4ade80' }}>
                                            -{formatDuration(opt.timeSavedSeconds)}
                                        </td>

                                        {/* New Time */}
                                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                                            {formatDuration(opt.newDurationSeconds)}
                                        </td>

                                        {/* Efficiency */}
                                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                                            {opt.secondsSavedPerMillionMsu.toFixed(1)}s
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchTimeOptimizer;
