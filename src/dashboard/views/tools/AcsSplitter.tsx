import React, { useState, useEffect } from 'react';
import {
    Target, Download, Trophy, Users, Layers, AlertCircle, TrendingUp,
    Shield, Rocket, Info, X, Settings, PieChart, Gavel, Coins
} from 'lucide-react';
import { SHIP_DATA, DEFENCE_DATA } from '../../../db/staticData';

interface CombatReport {
    key: string;
    RESULT_CODE: number;
    RESULT_DATA: {
        generic: {
            winner: string;
            combat_rounds: number;
            event_time: string;
            combat_coordinates: string;
            debris_metal: number;
            debris_crystal: number;
            debris_deuterium: number;
            debris_reaper_metal_retrieved?: number;
            debris_reaper_crystal_retrieved?: number;
            debris_reaper_deuterium_retrieved?: number;
            units_lost_attackers: number;
            units_lost_defenders: number;
            wreckfield?: Array<{
                ship_type: number;
                count: number;
            }>;
        };
        attackers: Array<{
            fleet_owner: string;
            fleet_owner_alliance_tag?: string;
            fleet_composition: Array<{
                ship_type: number;
                count: number;
            }>;
        }>;
        defenders: Array<{
            fleet_owner: string;
            fleet_owner_alliance_tag?: string;
            fleet_composition: Array<{
                ship_type: number;
                count: number;
            }>;
        }>;
    };
}

interface RecycleReport {
    key: string;
    RESULT_CODE: number;
    RESULT_MESSAGE?: string;
    RESULT_DATA: {
        generic: {
            owner_id: number;
            owner_name: string;
            recycler_count: number;
            reaper_count: number;
            recycler_metal_retrieved?: number;
            recycler_crystal_retrieved?: number;
            reaper_metal_retrieved?: number;
            reaper_crystal_retrieved?: number;
        };
    };
}

const AcsSplitter: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [reports, setReports] = useState<CombatReport[]>([]);
    const [rrReports, setRrReports] = useState<RecycleReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stepper Navigation
    const [currentStep, setCurrentStep] = useState(1);

    // Bulk RR Inputs and Status
    const [bulkRrInput, setBulkRrInput] = useState('');
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ total: 0, current: 0, success: 0, failed: 0 });
    const [skippedRrKeys, setSkippedRrKeys] = useState<Array<{ key: string; error: string }>>([]);

    // Split Configurations
    const [activeFaction, setActiveFaction] = useState<'attackers' | 'defenders'>('attackers');
    const [splitMethod, setSplitMethod] = useState<'equal' | 'contribution' | 'capacity'>('equal');
    const [reimburseExpenses, setReimburseExpenses] = useState(true);

    // Commander Expenses Mapping (keyed by commander fleet_owner)
    const [participantSettings, setParticipantSettings] = useState<Record<string, {
        active: boolean;
        lossesMetal: number;
        lossesCrystal: number;
        fuelDeut: number;
    }>>({});

    const [copiedTransfers, setCopiedTransfers] = useState(false);

    const getShipInfo = (id: number) => {
        return SHIP_DATA.find(s => s.id === id) || DEFENCE_DATA.find(d => d.id === id);
    };

    // Auto-populate activeFaction and participantSettings based on combat report winner
    const combinedReport = React.useMemo(() => {
        if (reports.length === 0) return null;

        const first = reports[0];
        const result = {
            ...first,
            RESULT_DATA: {
                ...first.RESULT_DATA,
                generic: { ...first.RESULT_DATA.generic },
                attackers: [] as any[],
                defenders: [] as any[]
            }
        };

        const gen = result.RESULT_DATA.generic;
        gen.debris_metal = 0;
        gen.debris_crystal = 0;
        gen.debris_deuterium = 0;
        gen.debris_reaper_metal_retrieved = 0;
        gen.debris_reaper_crystal_retrieved = 0;
        gen.debris_reaper_deuterium_retrieved = 0;
        gen.units_lost_attackers = 0;
        gen.units_lost_defenders = 0;
        gen.wreckfield = [];

        reports.forEach(r => {
            const rg = r.RESULT_DATA.generic;
            gen.debris_metal += (rg.debris_metal || 0);
            gen.debris_crystal += (rg.debris_crystal || 0);
            gen.debris_deuterium += (rg.debris_deuterium || 0);
            gen.debris_reaper_metal_retrieved! += (rg.debris_reaper_metal_retrieved || 0);
            gen.debris_reaper_crystal_retrieved! += (rg.debris_reaper_crystal_retrieved || 0);
            gen.debris_reaper_deuterium_retrieved! += (rg.debris_reaper_deuterium_retrieved || 0);
            gen.units_lost_attackers += (rg.units_lost_attackers || 0);
            gen.units_lost_defenders += (rg.units_lost_defenders || 0);

            if (rg.wreckfield) {
                rg.wreckfield.forEach(w => {
                    const existing = gen.wreckfield!.find(ex => ex.ship_type === w.ship_type);
                    if (existing) existing.count += w.count;
                    else gen.wreckfield!.push({ ...w });
                });
            }
        });

        const last = reports[reports.length - 1];
        gen.winner = last.RESULT_DATA.generic.winner;
        gen.combat_coordinates = last.RESULT_DATA.generic.combat_coordinates;
        gen.event_time = last.RESULT_DATA.generic.event_time;

        const mergeFleets = (allFleets: any[][]) => {
            const mergedMap = new Map<string, any>();
            allFleets.flat().forEach(participant => {
                const key = participant.fleet_owner;
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, {
                        ...participant,
                        fleet_composition: participant.fleet_composition.map((s: any) => ({ ...s }))
                    });
                } else {
                    const existing = mergedMap.get(key);
                    participant.fleet_composition.forEach((ship: any) => {
                        const existingShip = existing.fleet_composition.find((s: any) => s.ship_type === ship.ship_type);
                        if (existingShip) {
                            existingShip.count += (ship.count || 0);
                        } else {
                            existing.fleet_composition.push({ ...ship });
                        }
                    });
                }
            });
            return Array.from(mergedMap.values());
        };

        result.RESULT_DATA.attackers = mergeFleets(reports.map(r => r.RESULT_DATA.attackers));
        result.RESULT_DATA.defenders = mergeFleets(reports.map(r => r.RESULT_DATA.defenders));

        return result;
    }, [reports]);

    useEffect(() => {
        if (!combinedReport) return;
        
        // Auto-assign split faction based on winner
        const winner = combinedReport.RESULT_DATA.generic.winner;
        if (winner === 'attacker') {
            setActiveFaction('attackers');
        } else if (winner === 'defender') {
            setActiveFaction('defenders');
        }

        // Initialize active settings for all commanders
        const newSettings = { ...participantSettings };
        let updated = false;

        const allCommanders = [
            ...combinedReport.RESULT_DATA.attackers.map(a => a.fleet_owner),
            ...combinedReport.RESULT_DATA.defenders.map(d => d.fleet_owner)
        ];

        allCommanders.forEach(name => {
            if (!newSettings[name]) {
                newSettings[name] = {
                    active: true,
                    lossesMetal: 0,
                    lossesCrystal: 0,
                    fuelDeut: 0
                };
                updated = true;
            }
        });

        if (updated) {
            setParticipantSettings(newSettings);
        }
    }, [combinedReport]);

    const fetchReport = async () => {
        const trimmedKey = apiKey.trim();
        if (!trimmedKey.toLowerCase().startsWith('cr-')) {
            setError('Please enter a valid Combat Report (cr-) API key');
            return;
        }

        if (reports.some(r => r.key === trimmedKey)) {
            setError('This combat report has already been added.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            chrome.runtime.sendMessage(
                { type: "FETCH_COMBAT_REPORT", apiKey: trimmedKey },
                (response) => {
                    setLoading(false);
                    if (chrome.runtime.lastError) {
                        setError(`Runtime error: ${chrome.runtime.lastError.message}`);
                        return;
                    }

                    if (response && response.success) {
                        const data = response.data;
                        if (data.RESULT_CODE !== 1000) {
                            setError(data.RESULT_MESSAGE || 'API returned an error');
                        } else {
                            setReports(prev => [...prev, { ...data, key: trimmedKey }]);
                            setApiKey('');
                        }
                    } else {
                        setError(response?.error || 'Failed to fetch report from background service');
                    }
                }
            );
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            setLoading(false);
        }
    };

    const removeReport = (key: string) => {
        setReports(prev => prev.filter(r => r.key !== key));
    };

    // Bulk RR processing with error tolerance
    const handleBulkRrImport = async () => {
        const rawKeys = bulkRrInput.match(/rr-[a-zA-Z0-9-]+/g) || [];
        const uniqueKeys = Array.from(new Set(rawKeys)).filter(key => !rrReports.some(r => r.key === key));
        
        if (uniqueKeys.length === 0) {
            setBulkRrInput('');
            return;
        }
        
        setBulkImporting(true);
        setSkippedRrKeys([]);
        setBulkProgress({ total: uniqueKeys.length, current: 0, success: 0, failed: 0 });
        
        const fetchedReports: RecycleReport[] = [];
        const failedList: Array<{ key: string; error: string }> = [];

        await Promise.all(uniqueKeys.map(async (key) => {
            return new Promise<void>((resolve) => {
                chrome.runtime.sendMessage(
                    { type: "FETCH_COMBAT_REPORT", apiKey: key },
                    (response) => {
                        setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
                        
                        if (chrome.runtime.lastError) {
                            failedList.push({ key, error: chrome.runtime.lastError.message || 'Unknown runtime error' });
                            setBulkProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
                        } else if (response && response.success) {
                            const data = response.data;
                            if (data.RESULT_CODE === 1000) {
                                fetchedReports.push({ ...data, key });
                                setBulkProgress(prev => ({ ...prev, success: prev.success + 1 }));
                            } else {
                                const errMsg = data.RESULT_MESSAGE || 'API returned error code ' + data.RESULT_CODE;
                                failedList.push({ key, error: errMsg });
                                setBulkProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
                            }
                        } else {
                            failedList.push({ key, error: response?.error || 'Failed retrieval from background' });
                            setBulkProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
                        }
                        resolve();
                    }
                );
            });
        }));

        if (fetchedReports.length > 0) {
            setRrReports(prev => [...prev, ...fetchedReports]);
        }
        if (failedList.length > 0) {
            setSkippedRrKeys(failedList);
        }
        
        setBulkRrInput('');
        setBulkImporting(false);
    };

    const removeRrReport = (key: string) => {
        setRrReports(prev => prev.filter(r => r.key !== key));
    };

    const groupedDebris = React.useMemo(() => {
        const groups = new Map<string, { owner: string; metal: number; crystal: number; times: number }>();
        rrReports.forEach(rr => {
            if (!rr.RESULT_DATA || !rr.RESULT_DATA.generic) return;
            const owner = rr.RESULT_DATA.generic.owner_name;
            const met = (rr.RESULT_DATA.generic.recycler_metal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_metal_retrieved || 0);
            const cry = (rr.RESULT_DATA.generic.recycler_crystal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_crystal_retrieved || 0);

            if (!groups.has(owner)) {
                groups.set(owner, { owner, metal: met, crystal: cry, times: 1 });
            } else {
                const existing = groups.get(owner)!;
                existing.metal += met;
                existing.crystal += cry;
                existing.times += 1;
            }
        });
        return Array.from(groups.values());
    }, [rrReports]);

    const formatNumber = (num: number | undefined | null) => (num || 0).toLocaleString();

    // Equalization Transfers calculation logic
    const generateTransfers = (
        participants: Array<{ name: string; targetM: number; harvestedM: number; targetC: number; harvestedC: number }>
    ) => {
        const transfers: Array<{ from: string; to: string; metal: number; crystal: number }> = [];

        // Metal Transfers
        const metalDiffs = participants.map(p => ({ name: p.name, diff: p.targetM - p.harvestedM }));
        const mReceivers = metalDiffs.filter(p => p.diff > 1).sort((a, b) => b.diff - a.diff);
        const mSenders = metalDiffs.filter(p => p.diff < -1).sort((a, b) => a.diff - b.diff);

        let rIdx = 0;
        let sIdx = 0;

        const mTransfers: Array<{ from: string; to: string; amount: number }> = [];

        while (rIdx < mReceivers.length && sIdx < mSenders.length) {
            const receiver = mReceivers[rIdx];
            const sender = mSenders[sIdx];

            const toSend = -sender.diff;
            const toReceive = receiver.diff;

            const amount = Math.min(toSend, toReceive);

            mTransfers.push({ from: sender.name, to: receiver.name, amount });

            sender.diff += amount;
            receiver.diff -= amount;

            if (Math.abs(sender.diff) < 1) sIdx++;
            if (Math.abs(receiver.diff) < 1) rIdx++;
        }

        // Crystal Transfers
        const crystalDiffs = participants.map(p => ({ name: p.name, diff: p.targetC - p.harvestedC }));
        const cReceivers = crystalDiffs.filter(p => p.diff > 1).sort((a, b) => b.diff - a.diff);
        const cSenders = crystalDiffs.filter(p => p.diff < -1).sort((a, b) => a.diff - b.diff);

        rIdx = 0;
        sIdx = 0;

        const cTransfers: Array<{ from: string; to: string; amount: number }> = [];

        while (rIdx < cReceivers.length && sIdx < cSenders.length) {
            const receiver = cReceivers[rIdx];
            const sender = cSenders[sIdx];

            const toSend = -sender.diff;
            const toReceive = receiver.diff;

            const amount = Math.min(toSend, toReceive);

            cTransfers.push({ from: sender.name, to: receiver.name, amount });

            sender.diff += amount;
            receiver.diff -= amount;

            if (Math.abs(sender.diff) < 1) sIdx++;
            if (Math.abs(receiver.diff) < 1) rIdx++;
        }

        // Combine Metal and Crystal transfers
        const combinedMap = new Map<string, { from: string; to: string; metal: number; crystal: number }>();

        mTransfers.forEach(t => {
            const key = `${t.from}->${t.to}`;
            combinedMap.set(key, { from: t.from, to: t.to, metal: t.amount, crystal: 0 });
        });

        cTransfers.forEach(t => {
            const key = `${t.from}->${t.to}`;
            if (combinedMap.has(key)) {
                combinedMap.get(key)!.crystal = t.amount;
            } else {
                combinedMap.set(key, { from: t.from, to: t.to, metal: 0, crystal: t.amount });
            }
        });

        return Array.from(combinedMap.values());
    };

    // Full split logic calculations
    const splitCalculations = React.useMemo(() => {
        if (!combinedReport) return null;

        const commanders = activeFaction === 'attackers' 
            ? combinedReport.RESULT_DATA.attackers.map(a => a.fleet_owner)
            : combinedReport.RESULT_DATA.defenders.map(d => d.fleet_owner);

        const activeCommanders = commanders.filter(name => {
            return participantSettings[name]?.active !== false;
        });

        // 1. Gather actual harvested resources from RRs
        const harvestedMap: Record<string, { metal: number; crystal: number }> = {};
        commanders.forEach(name => {
            harvestedMap[name] = { metal: 0, crystal: 0 };
        });

        rrReports.forEach(rr => {
            if (!rr.RESULT_DATA || !rr.RESULT_DATA.generic) return;
            const owner = rr.RESULT_DATA.generic.owner_name;
            const matchedName = commanders.find(c => c.toLowerCase() === owner.toLowerCase()) || owner;
            
            const met = (rr.RESULT_DATA.generic.recycler_metal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_metal_retrieved || 0);
            const cry = (rr.RESULT_DATA.generic.recycler_crystal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_crystal_retrieved || 0);

            if (!harvestedMap[matchedName]) {
                harvestedMap[matchedName] = { metal: 0, crystal: 0 };
            }
            harvestedMap[matchedName].metal += met;
            harvestedMap[matchedName].crystal += cry;
        });

        // 2. Sum up totals
        let totalHarvestedM = 0;
        let totalHarvestedC = 0;
        rrReports.forEach(rr => {
            if (!rr.RESULT_DATA || !rr.RESULT_DATA.generic) return;
            totalHarvestedM += (rr.RESULT_DATA.generic.recycler_metal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_metal_retrieved || 0);
            totalHarvestedC += (rr.RESULT_DATA.generic.recycler_crystal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_crystal_retrieved || 0);
        });

        let totalLossesM = 0;
        let totalLossesC = 0;
        let totalFuelD = 0;

        activeCommanders.forEach(name => {
            const settings = participantSettings[name] || { lossesMetal: 0, lossesCrystal: 0, fuelDeut: 0 };
            totalLossesM += settings.lossesMetal;
            totalLossesC += settings.lossesCrystal;
            totalFuelD += settings.fuelDeut;
        });

        // 3. Reimbursements mapping
        const reimbursementMap: Record<string, { metal: number; crystal: number }> = {};
        activeCommanders.forEach(name => {
            reimbursementMap[name] = { metal: 0, crystal: 0 };
        });

        let remainingM = totalHarvestedM;
        let remainingC = totalHarvestedC;

        if (reimburseExpenses) {
            if (totalLossesM > 0) {
                const metalRatio = Math.min(1, totalHarvestedM / totalLossesM);
                activeCommanders.forEach(name => {
                    const settings = participantSettings[name] || { lossesMetal: 0, lossesCrystal: 0, fuelDeut: 0 };
                    const alloc = Math.floor(settings.lossesMetal * metalRatio);
                    reimbursementMap[name].metal += alloc;
                    remainingM -= alloc;
                });
            }
            if (totalLossesC > 0) {
                const crystalRatio = Math.min(1, totalHarvestedC / totalLossesC);
                activeCommanders.forEach(name => {
                    const settings = participantSettings[name] || { lossesMetal: 0, lossesCrystal: 0, fuelDeut: 0 };
                    const alloc = Math.floor(settings.lossesCrystal * crystalRatio);
                    reimbursementMap[name].crystal += alloc;
                    remainingC -= alloc;
                });
            }
        }

        remainingM = Math.max(0, remainingM);
        remainingC = Math.max(0, remainingC);

        // 4. Split algorithms
        const profitShareMap: Record<string, { metal: number; crystal: number }> = {};
        activeCommanders.forEach(name => {
            profitShareMap[name] = { metal: 0, crystal: 0 };
        });

        if (activeCommanders.length > 0) {
            if (splitMethod === 'equal') {
                const shareM = Math.floor(remainingM / activeCommanders.length);
                const shareC = Math.floor(remainingC / activeCommanders.length);
                activeCommanders.forEach(name => {
                    profitShareMap[name].metal = shareM;
                    profitShareMap[name].crystal = shareC;
                });
            } else if (splitMethod === 'contribution') {
                const sumLossesM = totalLossesM || 1;
                const sumLossesC = totalLossesC || 1;
                activeCommanders.forEach(name => {
                    const settings = participantSettings[name] || { lossesMetal: 0, lossesCrystal: 0, fuelDeut: 0 };
                    profitShareMap[name].metal = totalLossesM > 0 ? Math.floor(remainingM * (settings.lossesMetal / sumLossesM)) : Math.floor(remainingM / activeCommanders.length);
                    profitShareMap[name].crystal = totalLossesC > 0 ? Math.floor(remainingC * (settings.lossesCrystal / sumLossesC)) : Math.floor(remainingC / activeCommanders.length);
                });
            } else if (splitMethod === 'capacity') {
                const sumHarvestedM = totalHarvestedM || 1;
                const sumHarvestedC = totalHarvestedC || 1;
                activeCommanders.forEach(name => {
                    const harvested = harvestedMap[name] || { metal: 0, crystal: 0 };
                    profitShareMap[name].metal = totalHarvestedM > 0 ? Math.floor(remainingM * (harvested.metal / sumHarvestedM)) : Math.floor(remainingM / activeCommanders.length);
                    profitShareMap[name].crystal = totalHarvestedC > 0 ? Math.floor(remainingC * (harvested.crystal / sumHarvestedC)) : Math.floor(remainingC / activeCommanders.length);
                });
            }
        }

        // 5. Build full participant ledger
        const participantPayouts = commanders.map(name => {
            const isActive = activeCommanders.includes(name);
            const reimb = reimbursementMap[name] || { metal: 0, crystal: 0 };
            const profit = profitShareMap[name] || { metal: 0, crystal: 0 };
            const harvested = harvestedMap[name] || { metal: 0, crystal: 0 };

            const targetM = isActive ? (reimb.metal + profit.metal) : 0;
            const targetC = isActive ? (reimb.crystal + profit.crystal) : 0;

            const diffM = targetM - harvested.metal;
            const diffC = targetC - harvested.crystal;

            return {
                name,
                isActive,
                lossesMetal: participantSettings[name]?.lossesMetal || 0,
                lossesCrystal: participantSettings[name]?.lossesCrystal || 0,
                fuelDeut: participantSettings[name]?.fuelDeut || 0,
                harvestedM: harvested.metal,
                harvestedC: harvested.crystal,
                targetM,
                targetC,
                diffM,
                diffC
            };
        });

        const activePayouts = participantPayouts.filter(p => p.isActive);
        const transfers = generateTransfers(
            activePayouts.map(p => ({
                name: p.name,
                targetM: p.targetM,
                harvestedM: p.harvestedM,
                targetC: p.targetC,
                harvestedC: p.harvestedC
            }))
        );

        return {
            totalHarvestedM,
            totalHarvestedC,
            totalLossesM,
            totalLossesC,
            totalFuelD,
            netProfitM: remainingM,
            netProfitC: remainingC,
            participantPayouts,
            transfers
        };
    }, [combinedReport, activeFaction, splitMethod, reimburseExpenses, participantSettings, rrReports]);

    const winnerColor = combinedReport?.RESULT_DATA.generic.winner === 'attacker' ? 'var(--primary)' :
        combinedReport?.RESULT_DATA.generic.winner === 'defender' ? '#ff5f5f' :
            'var(--text-muted)';

    const winnerIcon = combinedReport?.RESULT_DATA.generic.winner === 'attacker' ? <Rocket size={20} /> :
        combinedReport?.RESULT_DATA.generic.winner === 'defender' ? <Shield size={20} /> :
            <Gavel size={20} />;

    const handleCopyTransfers = () => {
        if (!splitCalculations || !combinedReport) return;
        const textLines = [
            `--- OGame ACS Split Balance Sheet ---`,
            `Location: [${combinedReport.RESULT_DATA.generic.combat_coordinates}]`,
            `Time: ${combinedReport.RESULT_DATA.generic.event_time}`,
            `Total Harvested: ${formatNumber(splitCalculations.totalHarvestedM)} Metal | ${formatNumber(splitCalculations.totalHarvestedC)} Crystal`,
            ``,
            `Required Transfers:`
        ];

        if (splitCalculations.transfers.length === 0) {
            textLines.push(`All accounts are balanced! No transfers required.`);
        } else {
            splitCalculations.transfers.forEach(t => {
                const resources = [];
                if (t.metal > 0) resources.push(`${formatNumber(t.metal)} Metal`);
                if (t.crystal > 0) resources.push(`${formatNumber(t.crystal)} Crystal`);
                textLines.push(`- ${t.from} sends ${resources.join(' & ')} to ${t.to}`);
            });
        }
        textLines.push(`-------------------------------------`);

        navigator.clipboard.writeText(textLines.join('\n'));
        setCopiedTransfers(true);
        setTimeout(() => setCopiedTransfers(false), 2000);
    };

    return (
        <div className="acs-splitter-container" style={{ padding: '0 8px', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* Step Stepper Header */}
            <div className="acs-steps-header glass">
                {[
                    { step: 1, label: 'Battle Intel', icon: <Target size={16} />, status: reports.length > 0 ? 'completed' : 'active' },
                    { step: 2, label: 'Debris Harvests', icon: <Download size={16} />, status: reports.length === 0 ? 'locked' : (rrReports.length > 0 ? 'completed' : 'active') },
                    { step: 3, label: 'Profit Division', icon: <Coins size={16} />, status: reports.length === 0 ? 'locked' : 'active' }
                ].map((s) => {
                    const isActive = currentStep === s.step;
                    const isLocked = reports.length === 0 && s.step > 1;
                    const isCompleted = s.step === 1 ? reports.length > 0 : (s.step === 2 ? rrReports.length > 0 : false);
                    
                    return (
                        <button 
                            key={s.step} 
                            disabled={isLocked}
                            className={`step-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                            onClick={() => setCurrentStep(s.step)}
                        >
                            <div className="step-badge">
                                {isCompleted ? '✓' : s.step}
                            </div>
                            <div className="step-icon">{s.icon}</div>
                            <div className="step-label">{s.label}</div>
                        </button>
                    );
                })}
            </div>

            {/* STEP 1: COMBAT REPORTS */}
            {currentStep === 1 && (
                <div className="step-content animate-fade">
                    <div className="grid-2-1">
                        <div className="card-primary glass">
                            <label className="card-lbl-primary">
                                <Target size={16} /> strategic combat integration
                            </label>
                            <p className="card-desc">
                                Paste in the shareable API key (`cr-` report) from your wave logs. You can bundle multiple waves together to split resource costs and debris sums as a single aggregate ACS operation.
                            </p>
                            
                            <div className="input-group">
                                <input
                                    type="text"
                                    placeholder="cr-en-XXX-XXXXXX..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="input-custom font-mono"
                                />
                                <button
                                    onClick={fetchReport}
                                    disabled={loading}
                                    className="btn-primary"
                                >
                                    {loading ? 'Decrypting...' : <><Download size={16} /> Import Wave</>}
                                </button>
                            </div>
                            {error && <div className="error-box"><AlertCircle size={14} /> {error}</div>}

                            {reports.length > 0 && (
                                <div className="cr-tags-container">
                                    <div className="sub-tag-lbl">Added combat report keys:</div>
                                    <div className="flex-wrap-gap">
                                        {reports.map((r, idx) => (
                                            <div key={idx} className="cr-tag glass">
                                                <span className="font-mono">{r.key.split('-').pop()?.slice(-8)}...</span>
                                                <button onClick={() => removeReport(r.key)} className="btn-x-red"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {combinedReport ? (
                            <div className="side-cards">
                                {/* Verdict banner */}
                                <div className="verdict-banner" style={{ borderLeftColor: winnerColor, background: `${winnerColor}0a` }}>
                                    <div className="verdict-icon" style={{ backgroundColor: winnerColor }}>
                                        {winnerIcon}
                                    </div>
                                    <div>
                                        <div className="verdict-title" style={{ color: winnerColor }}>
                                            {combinedReport.RESULT_DATA.generic.winner === 'draw' ? 'Draw' : `${combinedReport.RESULT_DATA.generic.winner}s Win`}
                                        </div>
                                        <div className="verdict-sub">Coordinates: {combinedReport.RESULT_DATA.generic.combat_coordinates} | Time: {combinedReport.RESULT_DATA.generic.event_time}</div>
                                    </div>
                                </div>

                                {/* Fleet commanders */}
                                <div className="card-glass shadow-large">
                                    <div className="side-card-title"><Users size={16} /> Factions Involved</div>
                                    <div className="commanders-faction-split">
                                        <div>
                                            <div className="faction-header attacker-col">ATTACKERS ({combinedReport.RESULT_DATA.attackers.length})</div>
                                            <div className="commanders-list">
                                                {combinedReport.RESULT_DATA.attackers.map((a, i) => (
                                                    <span key={i} className="commander-pill-atk">{a.fleet_owner}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '12px' }}>
                                            <div className="faction-header defender-col">DEFENDERS ({combinedReport.RESULT_DATA.defenders.length})</div>
                                            <div className="commanders-list">
                                                {combinedReport.RESULT_DATA.defenders.map((d, i) => (
                                                    <span key={i} className="commander-pill-def">{d.fleet_owner}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Debris generated */}
                                <div className="card-glass shadow-large">
                                    <div className="side-card-title"><TrendingUp size={16} /> Total Potential Debris</div>
                                    <div className="debris-stack">
                                        <div className="debris-item-bar border-metal">
                                            <span className="debris-name">METAL DEBRIS</span>
                                            <span className="debris-val metal-color">{formatNumber(combinedReport.RESULT_DATA.generic.debris_metal)}</span>
                                        </div>
                                        <div className="debris-item-bar border-crystal">
                                            <span className="debris-name">CRYSTAL DEBRIS</span>
                                            <span className="debris-val crystal-color">{formatNumber(combinedReport.RESULT_DATA.generic.debris_crystal)}</span>
                                        </div>
                                        {(combinedReport.RESULT_DATA.generic.debris_reaper_metal_retrieved || 0) > 0 && (
                                            <div className="reaper-extraction-box">
                                                <div className="reaper-lbl">Reaper Tactical Retrieval (Auto-harvested)</div>
                                                <div className="reaper-values">
                                                    <span>M: {formatNumber(combinedReport.RESULT_DATA.generic.debris_reaper_metal_retrieved)}</span>
                                                    <span>C: {formatNumber(combinedReport.RESULT_DATA.generic.debris_reaper_crystal_retrieved)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state glass">
                                <Info size={40} className="empty-state-icon" />
                                <h3>Decrypt Battle Records</h3>
                                <p>Provide at least one Combat Report (cr-) API key on the left to initialize the split wizard and map out debris calculations.</p>
                            </div>
                        )}
                    </div>

                    {combinedReport && (
                        <div className="nav-bottom-actions">
                            <button onClick={() => setCurrentStep(2)} className="btn-next">
                                Proceed to Debris Harvests →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: RECYCLE REPORTS */}
            {currentStep === 2 && combinedReport && (
                <div className="step-content animate-fade">
                    <div className="grid-2-1">
                        <div className="card-primary glass">
                            <label className="card-lbl-primary" style={{ color: 'var(--color-crystal)' }}>
                                <Download size={16} /> Bulk Recycle Log Collection
                            </label>
                            <p className="card-desc">
                                Paste **one or multiple** recycle logs (`rr-`) simultaneously. You can copy a block of text containing multiple keys (separated by spaces, commas, or newlines) — we will automatically isolate, process, and combine the active harvests.
                            </p>

                            <textarea
                                placeholder="Paste multiple rr-en-XXX keys here..."
                                value={bulkRrInput}
                                onChange={(e) => setBulkRrInput(e.target.value)}
                                className="textarea-custom font-mono"
                                rows={6}
                            />

                            <button
                                onClick={handleBulkRrImport}
                                disabled={bulkImporting || !bulkRrInput.trim()}
                                className="btn-primary"
                                style={{ background: 'var(--color-crystal)', color: '#0b0f19', marginTop: '12px' }}
                            >
                                {bulkImporting ? 'Retrieving batch...' : <><Download size={16} /> Batch Import Recycle Reports</>}
                            </button>

                            {bulkImporting && (
                                <div className="bulk-loader-box">
                                    <div className="loader-progress-text">
                                        Importing reports: {bulkProgress.current} / {bulkProgress.total} 
                                        <span className="success-badge">({bulkProgress.success} OK)</span>
                                        {bulkProgress.failed > 0 && <span className="failed-badge">({bulkProgress.failed} Skipped)</span>}
                                    </div>
                                    <div className="progress-bg">
                                        <div 
                                            className="progress-fill fill-crystal" 
                                            style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Skipped keys due to errors */}
                            {skippedRrKeys.length > 0 && (
                                <div className="skipped-diagnostic-card">
                                    <div className="skipped-diagnostic-title"><AlertCircle size={14} /> Skipped Invalid Keys ({skippedRrKeys.length})</div>
                                    <div className="skipped-diagnostic-desc">The following keys returned API or network failures and were skipped:</div>
                                    <div className="skipped-keys-list font-mono">
                                        {skippedRrKeys.map((item, idx) => (
                                            <div key={idx} className="skipped-key-row">
                                                <span className="skipped-key-name">{item.key.slice(0, 16)}...</span>
                                                <span className="skipped-key-reason">{item.error}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {rrReports.length > 0 && (
                                <div className="rr-added-container">
                                    <div className="sub-tag-lbl">Recycle reports successfully imported ({rrReports.length}):</div>
                                    <div className="flex-wrap-gap">
                                        {rrReports.map((rr, idx) => (
                                            <div key={idx} className="rr-tag glass">
                                                <span className="font-mono">{rr.key.split('-').pop()?.slice(-8)}...</span>
                                                <button onClick={() => removeRrReport(rr.key)} className="btn-x-red"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="side-cards">
                            {/* Debris field progress gauge */}
                            {splitCalculations && (
                                <div className="card-glass shadow-large">
                                    <div className="side-card-title"><TrendingUp size={16} /> Harvest Collection Rate</div>
                                    
                                    {/* Metal bar */}
                                    <div className="gauge-row">
                                        <div className="gauge-labels">
                                            <span className="metal-color font-bold">METAL COLLECTION</span>
                                            <span className="font-mono">
                                                {Math.round(Math.min(100, (splitCalculations.totalHarvestedM / (combinedReport.RESULT_DATA.generic.debris_metal || 1)) * 100))}%
                                            </span>
                                        </div>
                                        <div className="progress-bg h-8">
                                            <div 
                                                className="progress-fill fill-metal" 
                                                style={{ width: `${Math.min(100, (splitCalculations.totalHarvestedM / (combinedReport.RESULT_DATA.generic.debris_metal || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="gauge-nums font-mono">
                                            {formatNumber(splitCalculations.totalHarvestedM)} / {formatNumber(combinedReport.RESULT_DATA.generic.debris_metal)}
                                        </div>
                                    </div>

                                    {/* Crystal bar */}
                                    <div className="gauge-row" style={{ marginTop: '16px' }}>
                                        <div className="gauge-labels">
                                            <span className="crystal-color font-bold">CRYSTAL COLLECTION</span>
                                            <span className="font-mono">
                                                {Math.round(Math.min(100, (splitCalculations.totalHarvestedC / (combinedReport.RESULT_DATA.generic.debris_crystal || 1)) * 100))}%
                                            </span>
                                        </div>
                                        <div className="progress-bg h-8">
                                            <div 
                                                className="progress-fill fill-crystal" 
                                                style={{ width: `${Math.min(100, (splitCalculations.totalHarvestedC / (combinedReport.RESULT_DATA.generic.debris_crystal || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="gauge-nums font-mono">
                                            {formatNumber(splitCalculations.totalHarvestedC)} / {formatNumber(combinedReport.RESULT_DATA.generic.debris_crystal)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Yield summary per player */}
                            <div className="card-glass shadow-large">
                                <div className="side-card-title"><Users size={16} /> Yield Summary</div>
                                {groupedDebris.length > 0 ? (
                                    <div className="yield-groups-stack">
                                        {groupedDebris.map((group, idx) => (
                                            <div key={idx} className="yield-group-card">
                                                <div className="yield-header">
                                                    <span className="yield-commander-name">{group.owner}</span>
                                                    <span className="yield-runs-tag">{group.times} collections</span>
                                                </div>
                                                <div className="yield-nums-grid">
                                                    <div>
                                                        <div className="yield-lbl-small font-bold text-center text-metal">METAL</div>
                                                        <div className="yield-val font-mono">{formatNumber(group.metal)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="yield-lbl-small font-bold text-center text-crystal">CRYSTAL</div>
                                                        <div className="yield-val font-mono">{formatNumber(group.crystal)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center font-sm opacity-6 padding-16">No recycle harvests registered yet. Bulk paste recycle reports to map yields.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="nav-bottom-actions">
                        <button onClick={() => setCurrentStep(1)} className="btn-back">
                            ← Back to Battle Intel
                        </button>
                        <button onClick={() => setCurrentStep(3)} className="btn-next">
                            Proceed to Profit Division →
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: PROFIT DIVISION */}
            {currentStep === 3 && combinedReport && splitCalculations && (
                <div className="step-content animate-fade">
                    
                    {/* Upper Split Settings Card */}
                    <div className="card-glass margin-b-24 shadow-large">
                        <div className="split-settings-header"><Settings size={18} color="var(--primary)" /> Reward Distribution Parameters</div>
                        
                        <div className="grid-3-col">
                            {/* Faction selector */}
                            <div>
                                <label className="input-label-caps">active faction split team</label>
                                <div className="btn-group-toggle">
                                    <button 
                                        className={activeFaction === 'attackers' ? 'active-atk' : ''}
                                        onClick={() => setActiveFaction('attackers')}
                                    >
                                        Attackers Split
                                    </button>
                                    <button 
                                        className={activeFaction === 'defenders' ? 'active-def' : ''}
                                        onClick={() => setActiveFaction('defenders')}
                                    >
                                        Defenders Split
                                    </button>
                                </div>
                            </div>

                            {/* Split Method */}
                            <div>
                                <label className="input-label-caps">split algorithm</label>
                                <select 
                                    value={splitMethod} 
                                    onChange={(e) => setSplitMethod(e.target.value as any)}
                                    className="select-custom"
                                >
                                    <option value="equal">Standard Equal Split</option>
                                    <option value="contribution">Contribution-based Split</option>
                                    <option value="capacity">Capacity-based Split</option>
                                </select>
                            </div>

                            {/* Options checkboxes */}
                            <div className="flex-col-center">
                                <label className="checkbox-holder">
                                    <input 
                                        type="checkbox" 
                                        checked={reimburseExpenses}
                                        onChange={(e) => setReimburseExpenses(e.target.checked)}
                                        className="checkbox-custom"
                                    />
                                    <span>Reimburse Fleet Losses First</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Faction Expenses Input Table */}
                    <div className="card-glass margin-b-24 shadow-large overflow-x">
                        <div className="split-settings-header"><Coins size={18} color="var(--primary)" /> Expense & Combat Losses Matrix</div>
                        <table className="expenses-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>Active</th>
                                    <th>Commander</th>
                                    <th>Lost Metal</th>
                                    <th>Lost Crystal</th>
                                    <th>Flight Fuel Spent (Deut)</th>
                                    <th>Debris Harvested (Metal)</th>
                                    <th>Debris Harvested (Crystal)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {splitCalculations.participantPayouts.map((p, idx) => (
                                    <tr key={idx} className={p.isActive ? 'active-row' : 'inactive-row'}>
                                        <td className="text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={p.isActive}
                                                onChange={(e) => {
                                                    setParticipantSettings(prev => ({
                                                        ...prev,
                                                        [p.name]: {
                                                            ...prev[p.name],
                                                            active: e.target.checked
                                                        }
                                                    }));
                                                }}
                                                className="checkbox-custom"
                                            />
                                        </td>
                                        <td className="font-bold">{p.name}</td>
                                        <td>
                                            <input 
                                                type="number"
                                                disabled={!p.isActive}
                                                value={participantSettings[p.name]?.lossesMetal || 0}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    setParticipantSettings(prev => ({
                                                        ...prev,
                                                        [p.name]: {
                                                            ...prev[p.name],
                                                            lossesMetal: val
                                                        }
                                                    }));
                                                }}
                                                className="table-input"
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                type="number"
                                                disabled={!p.isActive}
                                                value={participantSettings[p.name]?.lossesCrystal || 0}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    setParticipantSettings(prev => ({
                                                        ...prev,
                                                        [p.name]: {
                                                            ...prev[p.name],
                                                            lossesCrystal: val
                                                        }
                                                    }));
                                                }}
                                                className="table-input"
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                type="number"
                                                disabled={!p.isActive}
                                                value={participantSettings[p.name]?.fuelDeut || 0}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    setParticipantSettings(prev => ({
                                                        ...prev,
                                                        [p.name]: {
                                                            ...prev[p.name],
                                                            fuelDeut: val
                                                        }
                                                    }));
                                                }}
                                                className="table-input"
                                            />
                                        </td>
                                        <td className="font-mono text-metal font-bold">
                                            {formatNumber(p.harvestedM)}
                                        </td>
                                        <td className="font-mono text-crystal font-bold">
                                            {formatNumber(p.harvestedC)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary & Transfers Grid */}
                    <div className="grid-2-1">
                        
                        {/* Final Balance sheet ledger */}
                        <div className="card-glass shadow-large">
                            <div className="split-settings-header"><PieChart size={18} color="var(--primary)" /> Participant Payout Ledger</div>
                            <div className="ledger-stack">
                                {splitCalculations.participantPayouts.filter(p => p.isActive).map((p, idx) => (
                                    <div key={idx} className="ledger-row glass">
                                        <div className="ledger-row-header">
                                            <span className="ledger-name font-bold">{p.name}</span>
                                            <span className="ledger-tag-status">Active Partner</span>
                                        </div>
                                        <div className="ledger-row-grid">
                                            <div>
                                                <div className="ledger-small-title font-bold text-metal">Metal Target Share</div>
                                                <div className="ledger-small-val font-mono">{formatNumber(p.targetM)}</div>
                                            </div>
                                            <div>
                                                <div className="ledger-small-title font-bold text-crystal">Crystal Target Share</div>
                                                <div className="ledger-small-val font-mono">{formatNumber(p.targetC)}</div>
                                            </div>
                                        </div>
                                        <div className="balance-grid border-top-line">
                                            <div className="balance-col">
                                                <span className="balance-lbl">Metal Balance:</span>
                                                {p.diffM >= 0 ? (
                                                    <span className="balance-val font-mono green-color font-bold">Gets +{formatNumber(p.diffM)}</span>
                                                ) : (
                                                    <span className="balance-val font-mono coral-color font-bold">Owes {formatNumber(Math.abs(p.diffM))}</span>
                                                )}
                                            </div>
                                            <div className="balance-col">
                                                <span className="balance-lbl">Crystal Balance:</span>
                                                {p.diffC >= 0 ? (
                                                    <span className="balance-val font-mono green-color font-bold">Gets +{formatNumber(p.diffC)}</span>
                                                ) : (
                                                    <span className="balance-val font-mono coral-color font-bold">Owes {formatNumber(Math.abs(p.diffC))}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Equalization balancing transfers */}
                        <div className="card-primary glass">
                            <label className="card-lbl-primary" style={{ color: 'var(--primary)' }}>
                                <Coins size={16} /> Equalization Transfers
                            </label>
                            <p className="card-desc">
                                Execute the balancing transfers below to perfectly balance the rewards and expenses.
                            </p>

                            {splitCalculations.transfers.length > 0 ? (
                                <div className="transfers-box-container font-mono">
                                    {splitCalculations.transfers.map((t, idx) => {
                                        const parts = [];
                                        if (t.metal > 0) parts.push(<span key="met" className="text-metal font-bold">{formatNumber(t.metal)} Metal</span>);
                                        if (t.crystal > 0) parts.push(<span key="cry" className="text-crystal font-bold">{formatNumber(t.crystal)} Crystal</span>);
                                        
                                        return (
                                            <div key={idx} className="transfer-statement glass">
                                                <div className="transfer-flow">
                                                    <span className="transfer-from font-bold">{t.from}</span>
                                                    <span className="transfer-arrow">➔</span>
                                                    <span className="transfer-to font-bold">{t.to}</span>
                                                </div>
                                                <div className="transfer-details">
                                                    {parts.reduce((prev: any, curr) => prev === null ? [curr] : [prev, " & ", curr], null)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="balanced-banner glass text-center">
                                    <Trophy size={36} color="var(--primary)" style={{ marginBottom: '12px' }} />
                                    <div className="font-bold">Perfectly Balanced Operations</div>
                                    <div className="font-sm opacity-6">All commander accounts are balanced. No equalization transfers are required!</div>
                                </div>
                            )}

                            {splitCalculations.transfers.length > 0 && (
                                <button 
                                    onClick={handleCopyTransfers} 
                                    className="btn-primary" 
                                    style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {copiedTransfers ? 'Copied to Clipboard! ✓' : 'Copy Transfer List'}
                                </button>
                            )}
                        </div>

                    </div>

                    <div className="nav-bottom-actions">
                        <button onClick={() => setCurrentStep(2)} className="btn-back">
                            ← Back to Debris Harvests
                        </button>
                    </div>

                </div>
            )}

            {/* Custom Premium Styles Block */}
            <style>{`
                .acs-splitter-container {
                    animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-fade {
                    animation: fadeIn 0.3s ease-out;
                }

                .font-mono {
                    font-family: 'Outfit', 'Courier New', monospace;
                }

                .font-bold {
                    font-weight: 700;
                }

                .glass {
                    background: rgba(18, 24, 38, 0.5);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .card-glass {
                    background: rgba(18, 24, 38, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 20px;
                    padding: 20px;
                }

                /* Steps indicator styling */
                .acs-steps-header {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 12px;
                    background: rgba(11, 15, 25, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    padding: 8px;
                    border-radius: 24px;
                    margin-bottom: 28px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }

                .step-item {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    background: none;
                    border: none;
                    padding: 12px 16px;
                    border-radius: 18px;
                    cursor: pointer;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 800;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .step-item:hover:not(.locked) {
                    background: rgba(255, 255, 255, 0.03);
                    color: rgba(255, 255, 255, 0.8);
                }

                .step-item.active {
                    background: rgba(0, 242, 255, 0.1);
                    color: var(--primary);
                    border: 1px solid rgba(0, 242, 255, 0.15);
                    box-shadow: 0 0 15px rgba(0, 242, 255, 0.05);
                }

                .step-item.completed {
                    color: #47d6a5;
                }

                .step-item.locked {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .step-badge {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 900;
                    transition: all 0.3s;
                }

                .step-item.active .step-badge {
                    background: var(--primary);
                    color: #0b0f19;
                }

                .step-item.completed .step-badge {
                    background: rgba(71, 214, 165, 0.2);
                    color: #47d6a5;
                    border: 1px solid rgba(71, 214, 165, 0.3);
                }

                .step-label {
                    font-size: 0.8rem;
                }

                @media (max-width: 768px) {
                    .step-label {
                        display: none;
                    }
                    .acs-steps-header {
                        gap: 4px;
                    }
                }

                /* Primary Card Styling */
                .card-primary {
                    border-radius: 24px;
                    padding: 28px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .card-lbl-primary {
                    font-size: 0.7rem;
                    font-weight: 900;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .card-desc {
                    font-size: 0.9rem;
                    line-height: 1.6;
                    opacity: 0.7;
                    margin: 0;
                }

                /* Input Styles */
                .input-group {
                    display: flex;
                    gap: 12px;
                }

                .input-custom {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    padding: 14px 18px;
                    color: #fff;
                    outline: none;
                    font-size: 0.95rem;
                    transition: all 0.3s;
                }

                .input-custom:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 15px rgba(0, 242, 255, 0.15);
                }

                .textarea-custom {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 16px;
                    color: #fff;
                    outline: none;
                    font-size: 0.9rem;
                    line-height: 1.6;
                    resize: vertical;
                    transition: all 0.3s;
                }

                .textarea-custom:focus {
                    border-color: var(--color-crystal);
                    box-shadow: 0 0 15px rgba(77, 166, 255, 0.15);
                }

                /* Buttons */
                .btn-primary {
                    background: var(--primary);
                    color: #0b0f19;
                    border: none;
                    border-radius: 14px;
                    padding: 12px 24px;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    font-size: 0.9rem;
                }

                .btn-primary:hover:not(:disabled) {
                    filter: brightness(1.2);
                    transform: scale(1.02);
                }

                .btn-primary:active:not(:disabled) {
                    transform: scale(0.98);
                }

                .btn-primary:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                /* Layout Grids */
                .grid-2-1 {
                    display: grid;
                    grid-template-columns: 1.7fr 1fr;
                    gap: 24px;
                    align-items: start;
                }

                @media (max-width: 900px) {
                    .grid-2-1 {
                        grid-template-columns: 1fr;
                    }
                }

                .grid-3-col {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 24px;
                    align-items: center;
                }

                @media (max-width: 768px) {
                    .grid-3-col {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                }

                /* Side cards stack */
                .side-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .side-card-title {
                    font-size: 0.7rem;
                    font-weight: 900;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                /* Verdict banner */
                .verdict-banner {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 18px 24px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-left-width: 5px;
                }

                .verdict-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #0b0f19;
                }

                .verdict-title {
                    font-size: 1.25rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .verdict-sub {
                    font-size: 0.75rem;
                    opacity: 0.6;
                    margin-top: 2px;
                }

                /* Tags styling */
                .cr-tags-container, .rr-added-container {
                    margin-top: 18px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    padding-top: 16px;
                }

                .sub-tag-lbl {
                    font-size: 0.75rem;
                    opacity: 0.5;
                    margin-bottom: 8px;
                }

                .flex-wrap-gap {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .cr-tag, .rr-tag {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    border-radius: 10px;
                    font-size: 0.75rem;
                    background: rgba(0, 0, 0, 0.3);
                }

                .btn-x-red {
                    background: none;
                    border: none;
                    color: rgba(255, 95, 95, 0.6);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: color 0.2s;
                    padding: 0;
                }

                .btn-x-red:hover {
                    color: rgba(255, 95, 95, 1);
                }

                /* Commanders display */
                .commanders-faction-split {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .faction-header {
                    font-size: 0.6rem;
                    font-weight: 900;
                    letter-spacing: 1px;
                    margin-bottom: 6px;
                }

                .attacker-col { color: var(--primary); }
                .defender-col { color: #ff5f5f; }

                .commanders-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .commander-pill-atk {
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 4px 10px;
                    background: rgba(0, 242, 255, 0.08);
                    color: var(--primary);
                    border: 1px solid rgba(0, 242, 255, 0.1);
                    border-radius: 8px;
                }

                .commander-pill-def {
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 4px 10px;
                    background: rgba(255, 95, 95, 0.08);
                    color: #ff5f5f;
                    border: 1px solid rgba(255, 95, 95, 0.1);
                    border-radius: 8px;
                }

                /* Debris list */
                .debris-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .debris-item-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 14px;
                    border-left-width: 4px;
                    border-left-style: solid;
                }

                .border-metal { border-left-color: var(--color-metal); }
                .border-crystal { border-left-color: var(--color-crystal); }

                .debris-name {
                    font-size: 0.7rem;
                    font-weight: 900;
                    opacity: 0.6;
                }

                .debris-val {
                    font-weight: 800;
                    font-size: 0.95rem;
                    font-family: 'Outfit', monospace;
                }

                .metal-color { color: #cfd4dc; }
                .crystal-color { color: #6db6ff; }
                .deuterium-color { color: #47d6a5; }

                .reaper-extraction-box {
                    padding: 12px;
                    background: rgba(0, 242, 255, 0.04);
                    border: 1px solid rgba(0, 242, 255, 0.08);
                    border-radius: 12px;
                    font-size: 0.75rem;
                    margin-top: 4px;
                }

                .reaper-lbl {
                    color: var(--primary);
                    font-weight: 800;
                    margin-bottom: 6px;
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .reaper-values {
                    display: flex;
                    justify-content: space-between;
                    opacity: 0.8;
                    font-family: monospace;
                }

                /* Empty state */
                .empty-state {
                    border-radius: 24px;
                    padding: 60px 20px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                }

                .empty-state-icon {
                    color: var(--primary);
                    opacity: 0.35;
                }

                .empty-state h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    color: rgba(255, 255, 255, 0.8);
                }

                .empty-state p {
                    margin: 0;
                    max-width: 320px;
                    font-size: 0.85rem;
                    opacity: 0.5;
                    line-height: 1.5;
                }

                /* Nav action bars */
                .nav-bottom-actions {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    padding-top: 20px;
                }

                .btn-next {
                    background: var(--primary);
                    color: #0b0f19;
                    border: none;
                    border-radius: 12px;
                    padding: 12px 28px;
                    font-weight: 800;
                    cursor: pointer;
                    margin-left: auto;
                    transition: all 0.2s;
                }

                .btn-back {
                    background: rgba(255, 255, 255, 0.06);
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 12px 28px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-next:hover, .btn-back:hover {
                    filter: brightness(1.2);
                    transform: translateY(-1px);
                }

                /* Gauge progress rows */
                .gauge-row {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gauge-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    font-weight: 800;
                }

                .progress-bg {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .h-8 { height: 8px; }

                .progress-fill {
                    height: 100%;
                    border-radius: 8px;
                    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .fill-metal { background: linear-gradient(90deg, #6c788c, #cfd4dc); }
                .fill-crystal { background: linear-gradient(90deg, #2b77c2, #6db6ff); }

                .gauge-nums {
                    font-size: 0.7rem;
                    opacity: 0.5;
                    text-align: right;
                    margin-top: 2px;
                }

                /* Yield Commander Card Stack */
                .yield-groups-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .yield-group-card {
                    background: rgba(0, 0, 0, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    border-radius: 14px;
                    padding: 14px;
                }

                .yield-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .yield-commander-name {
                    font-weight: 800;
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.9);
                }

                .yield-runs-tag {
                    font-size: 0.65rem;
                    opacity: 0.5;
                    background: rgba(255, 255, 255, 0.06);
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .yield-nums-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }

                .yield-nums-grid > div {
                    background: rgba(0, 0, 0, 0.15);
                    border-radius: 8px;
                    padding: 8px;
                }

                .yield-lbl-small {
                    font-size: 0.55rem;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }

                .text-metal { color: #8ba2b5; }
                .text-crystal { color: #5a9fff; }

                .yield-val {
                    font-size: 0.8rem;
                    font-weight: 800;
                    text-align: center;
                }

                /* Bulk Import loading indicator */
                .bulk-loader-box {
                    margin-top: 14px;
                    background: rgba(0, 242, 255, 0.04);
                    border: 1px solid rgba(0, 242, 255, 0.06);
                    border-radius: 12px;
                    padding: 12px 16px;
                }

                .loader-progress-text {
                    font-size: 0.75rem;
                    font-weight: 700;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .success-badge { color: #47d6a5; }
                .failed-badge { color: #ff5f5f; }

                /* Diagnostic details */
                .skipped-diagnostic-card {
                    margin-top: 14px;
                    background: rgba(255, 95, 95, 0.04);
                    border: 1px solid rgba(255, 95, 95, 0.12);
                    border-radius: 14px;
                    padding: 14px;
                }

                .skipped-diagnostic-title {
                    font-size: 0.75rem;
                    font-weight: 900;
                    color: #ff5f5f;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 4px;
                }

                .skipped-diagnostic-desc {
                    font-size: 0.75rem;
                    opacity: 0.6;
                    margin-bottom: 8px;
                }

                .skipped-keys-list {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 8px 12px;
                    max-height: 120px;
                    overflow-y: auto;
                    font-size: 0.7rem;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .skipped-key-row {
                    display: flex;
                    justify-content: space-between;
                }

                .skipped-key-name {
                    color: #ff5f5f;
                }

                .skipped-key-reason {
                    opacity: 0.5;
                }

                /* Step 3: Split Settings */
                .split-settings-header {
                    font-size: 0.75rem;
                    font-weight: 900;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 12px;
                }

                .input-label-caps {
                    font-size: 0.6rem;
                    font-weight: 900;
                    opacity: 0.5;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    display: block;
                    margin-bottom: 8px;
                }

                .btn-group-toggle {
                    display: flex;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    padding: 3px;
                    gap: 2px;
                }

                .btn-group-toggle button {
                    flex: 1;
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    padding: 8px 12px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-group-toggle button.active-atk {
                    background: rgba(0, 242, 255, 0.12);
                    color: var(--primary);
                }

                .btn-group-toggle button.active-def {
                    background: rgba(255, 95, 95, 0.12);
                    color: #ff5f5f;
                }

                .select-custom {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                    padding: 8px 12px;
                    color: #fff;
                    outline: none;
                    font-size: 0.8rem;
                    font-weight: 800;
                }

                .select-custom option {
                    background: #121826;
                }

                .checkbox-holder {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 700;
                }

                .checkbox-custom {
                    width: 16px;
                    height: 16px;
                    accent-color: var(--primary);
                    cursor: pointer;
                }

                .margin-b-24 { margin-bottom: 24px; }

                /* Expenses Table Styling */
                .overflow-x {
                    overflow-x: auto;
                }

                .expenses-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.85rem;
                }

                .expenses-table th {
                    text-align: left;
                    font-size: 0.65rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    opacity: 0.5;
                    padding: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .expenses-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    vertical-align: middle;
                }

                .expenses-table tr.active-row td {
                    color: rgba(255, 255, 255, 0.95);
                }

                .expenses-table tr.inactive-row td {
                    color: rgba(255, 255, 255, 0.25);
                }

                .table-input {
                    background: rgba(0, 0, 0, 0.35);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    color: #fff;
                    border-radius: 8px;
                    padding: 6px 10px;
                    font-size: 0.8rem;
                    font-family: monospace;
                    outline: none;
                    width: 100px;
                    transition: border-color 0.2s;
                }

                .table-input:focus {
                    border-color: var(--primary);
                }

                .table-input:disabled {
                    opacity: 0.2;
                    cursor: not-allowed;
                }

                /* Payout Ledger styling */
                .ledger-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .ledger-row {
                    padding: 16px;
                    border-radius: 16px;
                }

                .ledger-row-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .ledger-name {
                    font-size: 0.95rem;
                }

                .ledger-tag-status {
                    font-size: 0.6rem;
                    background: rgba(0, 242, 255, 0.1);
                    color: var(--primary);
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-weight: 800;
                }

                .ledger-row-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .ledger-small-title {
                    font-size: 0.55rem;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }

                .ledger-small-val {
                    font-size: 0.85rem;
                    font-weight: 800;
                }

                .border-top-line {
                    border-top: 1px solid rgba(255, 255, 255, 0.04);
                    padding-top: 10px;
                }

                .balance-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .balance-col {
                    display: flex;
                    flex-direction: column;
                }

                .balance-lbl {
                    font-size: 0.6rem;
                    opacity: 0.5;
                    margin-bottom: 2px;
                }

                .balance-val {
                    font-size: 0.8rem;
                }

                .green-color { color: #47d6a5; }
                .coral-color { color: #ff557f; }

                /* Equalization transfers UI */
                .transfers-box-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: 16px;
                }

                .transfer-statement {
                    padding: 12px 16px;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .transfer-flow {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                }

                .transfer-arrow {
                    color: var(--primary);
                }

                .transfer-details {
                    font-size: 0.8rem;
                    opacity: 0.85;
                }

                .balanced-banner {
                    padding: 32px 16px;
                    border-radius: 16px;
                }

                .text-center { text-align: center; }
                .font-sm { font-size: 0.8rem; }
                .opacity-6 { opacity: 0.6; }
                .padding-16 { padding: 16px; }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .glass-card {
                    backdrop-filter: blur(20px);
                    transition: all 0.3s ease;
                }
                .glass-card:hover {
                    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                }
                .acs-splitter-container input:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
                }
                .acs-splitter-container button:hover:not(:disabled) {
                    filter: brightness(1.2);
                    transform: scale(1.02);
                }
                .acs-splitter-container button:active:not(:disabled) {
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
};

export default AcsSplitter;

