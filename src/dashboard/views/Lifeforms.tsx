import React, { useState, useMemo, useEffect } from 'react';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Planet, LifeformSavedSetup } from '../../db';
import { LIFEFORM_TECH_DATA } from '../../db/lifeformTechData';
import { LIFEFORM_BONUS_BREAKDOWN_DATA } from '../../db/lifeformBonusData';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Check, ChevronUp, ChevronDown, RotateCcw, Download, Info, Globe, Trash2, AlertTriangle, BarChart3, Radio, FlaskConical, RefreshCw, HelpCircle, Zap, ArrowRight, Target } from 'lucide-react';
import './Lifeforms.css';

interface SandboxSlot {
    slotNumber: number;
    selectedTechId: number | null;
    level: number;
}

const getBonusName = (id: number) => {
    return LIFEFORM_BONUS_BREAKDOWN_DATA.find(b => b.id === id)?.bonusName || `Bonus ${id}`;
};

const LF_ID_MAP: Record<string, number> = {
    human: 1,
    rock: 2,
    mecha: 3,
    kaelesh: 4
};

const LF_TEMPLATES = {
    "FULL FLEETER": ["kaelesh", "mecha", "mecha", "human", "mecha", "kaelesh", "mecha", "mecha", "mecha", "human", "rock", "mecha", "mecha", "mecha", "human", "human", "mecha", "mecha"],
    "DISCOVERER FLEETER": ["kaelesh", "mecha", "mecha", "kaelesh", "kaelesh", "kaelesh", "mecha", "mecha", "mecha", "human", "kaelesh", "mecha", "mecha", "mecha", "kaelesh", "human", "mecha", "kaelesh"],
    "DISCOVERER MINER": ["mecha", "human", "kaelesh", "kaelesh", "kaelesh", "kaelesh", "rock", "human", "rock", "rock", "kaelesh", "kaelesh", "mecha", "kaelesh", "kaelesh", "rock", "mecha", "kaelesh"],
    "MINER FLEETER": ["kaelesh", "mecha", "mecha", "human", "mecha", "mecha", "rock", "mecha", "rock", "rock", "mecha", "mecha", "mecha", "mecha", "human", "human", "mecha", "mecha"],
    "FULL MINER": ["mecha", "human", "rock", "rock", "rock", "mecha", "rock", "human", "rock", "rock", "mecha", "kaelesh", "rock", "kaelesh", "rock", "rock", "mecha", "rock"],
    "DISCOVERER RESEARCHER": ["mecha", "human", "human", "kaelesh", "kaelesh", "human", "kaelesh", "human", "rock", "rock", "kaelesh", "kaelesh", "kaelesh", "mecha", "kaelesh", "human", "human", "kaelesh"]
};

const getTechBonuses = (tech: any, level: number) => {
    if (!tech || !tech.target) return [];

    const uniqueBonusIds: number[] = [];
    const bonusToTargets: Record<number, any[]> = {};

    tech.target.forEach((t: any) => {
        if (!uniqueBonusIds.includes(t.bonusBreakdownId)) {
            uniqueBonusIds.push(t.bonusBreakdownId);
            bonusToTargets[t.bonusBreakdownId] = [];
        }
        bonusToTargets[t.bonusBreakdownId].push(t);
    });

    const hasOnlyBonus1 = tech.bonus1BaseValue !== null && tech.bonus1BaseValue !== undefined &&
        (tech.bonus2BaseValue === null || tech.bonus2BaseValue === undefined) &&
        (tech.bonus3BaseValue === null || tech.bonus3BaseValue === undefined);

    return uniqueBonusIds.map((id, index) => {
        let baseValue = null;
        if (index === 0) baseValue = tech.bonus1BaseValue;
        else if (index === 1) baseValue = tech.bonus2BaseValue;
        else if (index === 2) baseValue = tech.bonus3BaseValue;

        if (baseValue === null && hasOnlyBonus1) {
            baseValue = tech.bonus1BaseValue;
        }

        if (baseValue === null || baseValue === undefined) return null;

        return {
            id,
            name: getBonusName(id),
            value: baseValue * level,
            targets: bonusToTargets[id]
        };
    }).filter(b => b !== null) as { id: number, name: string, value: number, targets: any[] }[];
};

const calculateBoostedValue = (defaultValueStr: string, boostPercentage: number) => {
    const isPercentage = defaultValueStr.includes('%');
    const baseValue = parseFloat(defaultValueStr.replace(/[^\d.-]/g, ''));

    const finalValue = baseValue * (1 + (boostPercentage / 100));

    if (isPercentage) {
        const floored = Math.floor(finalValue * 100) / 100;
        return `${finalValue > 0 ? '+' : ''}${floored.toFixed(2)}%`;
    } else {
        return Math.floor(finalValue).toString();
    }
};

const Lifeforms: React.FC = () => {
    const planets = useLiveQuery(() => db.planets.filter(p => p.type === 'planet').toArray());
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const gameKnowledge = useLiveQuery(() => db.gameKnowledge.toArray());
    const species = useLiveQuery(() => db.lifeformSpecies.toArray());

    const { knowledgeMap, knowledgeIconMap } = useMemo(() => {
        const kMap: Record<number, string> = {};
        const iMap: Record<string, string> = {};
        gameKnowledge?.forEach(k => {
            kMap[k.id] = k.name;
            if (k.category === 'ships') {
                const shipNameSlug = k.name.toLowerCase().replace(/ /g, '-');
                iMap[k.name] = `/icons/ships/${shipNameSlug}-large.jpg`;
            } else if (k.category === 'research') {
                const resMap: Record<string, string> = {
                    'Energy Technology': '/icons/research/energy-research-large.jpg',
                    'Laser Technology': '/icons/research/laser-tech-research-large.jpg',
                    'Ion Technology': '/icons/research/ion-tech-research-large.jpg',
                    'Hyperspace Technology': '/icons/research/hyperspace-tech-research-large.jpg',
                    'Plasma Technology': '/icons/research/plasma-tech-research-large.jpg',
                    'Combustion Drive': '/icons/research/combustion-drive-research-large.jpg',
                    'Impulse Drive': '/icons/research/impulse-drive-research-large.jpg',
                    'Hyperspace Drive': '/icons/research/hyperspace-drive-research-large.jpg',
                    'Espionage Technology': '/icons/research/espionage-tech-research-large.jpg',
                    'Computer Technology': '/icons/research/computer-tech-research-large.jpg',
                    'Astrophysics': '/icons/research/expedition-tech-research-large.jpg',
                    'Intergalactic Research Network': '/icons/research/integalagtic-research-tech-research-large.jpg',
                    'Graviton Technology': '/icons/research/graviton-tech-research-large.jpg',
                    'Weapons Technology': '/icons/research/weapons-tech-research-large.jpg',
                    'Shielding Technology': '/icons/research/shield-tech-research-large.jpg',
                    'Armour Technology': '/icons/research/armor-tech-research-large.jpg'
                };
                iMap[k.name] = resMap[k.name] || '';
            }
        });
        return { knowledgeMap: kMap, knowledgeIconMap: iMap };
    }, [gameKnowledge]);

    const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerSlotIndex, setPickerSlotIndex] = useState<number | null>(null);
    const [tempSelectedTechId, setTempSelectedTechId] = useState<number | null>(null);

    const [slots, setSlots] = useState<SandboxSlot[]>([]);
    const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [viewMode, setViewMode] = useState<'planet' | 'all-bonuses'>('all-bonuses');
    const [lastBulkAction, setLastBulkAction] = useState(0);

    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
    const [selectedBreakdownKey, setSelectedBreakdownKey] = useState<string | null>(null);
    const [newSetupName, setNewSetupName] = useState('');
    const [calcRange, setCalcRange] = useState<{ start: number | string, end: number | string }>({ start: '', end: '' });
    const [overwriteTarget, setOverwriteTarget] = useState<LifeformSavedSetup | null>(null);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const savedSetups = useLiveQuery(() => db.lifeformSavedSetups.toArray());

    const activeTech = useMemo(() => {
        if (!slots || slots.length === 0 || !slots[activeSlotIndex] || slots[activeSlotIndex].selectedTechId === null) return null;
        return LIFEFORM_TECH_DATA.find(t => t.id === slots[activeSlotIndex].selectedTechId);
    }, [slots, activeSlotIndex]);

    useEffect(() => {
        if (activeTech && slots[activeSlotIndex]) {
            setCalcRange({
                start: slots[activeSlotIndex].level,
                end: slots[activeSlotIndex].level + 1
            });
        }
    }, [activeTech?.id, activeSlotIndex, slots[activeSlotIndex]?.level]);

    useEffect(() => {
        if (planets && planets.length > 0 && !selectedPlanetId) {
            setSelectedPlanetId(planets[0].id);
        }
    }, [planets]);

    useEffect(() => {
        if (!selectedPlanetId || !planets) return;

        const planet = planets.find(p => p.id === selectedPlanetId);

        const normalizeSetup = (setup: any[]): SandboxSlot[] => {
            const fullSlots: SandboxSlot[] = Array.from({ length: 18 }, (_, i) => ({
                slotNumber: i + 1,
                selectedTechId: null,
                level: 0
            }));

            if (setup && setup.length > 0) {
                setup.forEach(s => {
                    let tid = s.selectedTechId;
                    let slotNum = s.slotNumber;

                    // OGame IDs are 1[Species]2[Slot] e.g. 11201 or 12209
                    if (tid && tid > 10000) {
                        const species = Math.floor(tid / 1000) % 10;
                        const slot = tid % 100;
                        // Map to internal 1-72 ID
                        tid = (slot - 1) * 4 + species;
                        if (!slotNum || slotNum === 0) slotNum = slot;
                    }

                    if (slotNum >= 1 && slotNum <= 18) {
                        fullSlots[slotNum - 1] = {
                            slotNumber: slotNum,
                            selectedTechId: tid,
                            level: s.level
                        };
                    }
                });
            }
            return fullSlots;
        };

        if (planet?.sandboxSetup && planet.sandboxSetup.length > 0) {
            setSlots(normalizeSetup(planet.sandboxSetup));
        } else if (planet?.lifeformSetup && planet.lifeformSetup.length > 0) {
            setSlots(normalizeSetup(planet.lifeformSetup));
        } else {
            setSlots(normalizeSetup([]));
        }
        setSaveStatus('idle');
    }, [selectedPlanetId, planets]);

    const saveSlots = async (newSlots: SandboxSlot[]) => {
        if (!selectedPlanetId) return;
        try {
            await db.planets.update(selectedPlanetId, {
                sandboxSetup: newSlots
            });
        } catch (err) {
            console.error("Failed to persist sandbox setup:", err);
        }
    };

    const updateSlot = (index: number, updates: Partial<SandboxSlot>) => {
        setSlots(prev => {
            const next = [...prev];
            if ('level' in updates && typeof updates.level === 'string') {
                updates.level = parseInt(updates.level) || 0;
            }
            next[index] = { ...next[index], ...updates };
            saveSlots(next);
            return next;
        });
        if (saveStatus === 'saved') setSaveStatus('idle');
    };

    const handleSaveSetup = async () => {
        if (!selectedPlanetId) return;
        setSaveStatus('saving');
        try {
            await db.planets.update(selectedPlanetId, {
                sandboxSetup: slots
            });
            setSaveStatus('saved');
        } catch (error) {
            console.error('Failed to save sandbox setup:', error);
            setSaveStatus('idle');
        }
    };

    const handleClearTechLevels = () => {
        if (!slots) return;
        const resetSlots = slots.map(s => ({ ...s, level: 0 }));
        setSlots(resetSlots);
        saveSlots(resetSlots);
        setLastBulkAction(Date.now());
        if (saveStatus === 'saved') setSaveStatus('idle');
    };

    const handleResetAllTechs = () => {
        if (!slots) return;
        const resetSlots = slots.map(s => ({ ...s, selectedTechId: null, level: 0 }));
        setSlots(resetSlots);
        saveSlots(resetSlots);
        setLastBulkAction(Date.now());
        if (saveStatus === 'saved') setSaveStatus('idle');
    };

    const handleClearSlot = (index: number) => {
        updateSlot(index, { selectedTechId: null, level: 0 });
    };

    const handleLoadCurrentTechs = () => {
        const planet = planets?.find(p => p.id === selectedPlanetId);
        if (planet?.lifeformSetup && planet.lifeformSetup.length > 0) {
            setSlots(planet.lifeformSetup);
            saveSlots(planet.lifeformSetup);
            setLastBulkAction(Date.now());
            if (saveStatus === 'saved') setSaveStatus('idle');
        } else {
            alert("No actual lifeform technology data found for this planet. Visit the 'Lifeform Research' page in-game to sync your data.");
        }
    };

    const handleSaveSetupAs = async (overrideName?: string) => {
        const targetName = (overrideName || newSetupName).trim();
        if (!targetName) return;

        const existing = savedSetups?.find(s => s.name.toLowerCase() === targetName.toLowerCase());
        if (existing) {
            setOverwriteTarget(existing);
            return;
        }

        await db.lifeformSavedSetups.add({
            name: targetName,
            setup: slots,
            lastUpdated: Date.now()
        });

        setNewSetupName('');
        setIsSaveAsModalOpen(false);
    };

    const confirmOverwrite = async () => {
        if (!overwriteTarget) return;
        await db.lifeformSavedSetups.update(overwriteTarget.id!, {
            setup: slots,
            lastUpdated: Date.now()
        });
        setOverwriteTarget(null);
        setNewSetupName('');
        setIsSaveAsModalOpen(false);
    };

    const handleLoadNamedSetup = (setup: LifeformSavedSetup) => {
        setSlots(setup.setup);
        setIsLoadModalOpen(false);
        saveSlots(setup.setup);
        setLastBulkAction(Date.now());
        if (saveStatus === 'saved') setSaveStatus('idle');
    };

    const handleDeleteNamedSetup = async (id: number) => {
        await db.lifeformSavedSetups.delete(id);
    };

    const handleRevertAllPlanets = async () => {
        if (!planets) return;
        if (!confirm("Are you sure you want to revert ALL sandbox setups to their live in-game values? This will overwrite all your theoretical changes for every planet.")) return;

        try {
            const updates = planets.map(p =>
                db.planets.update(p.id, {
                    sandboxSetup: p.lifeformSetup || []
                })
            );
            await Promise.all(updates);

            const currentPlanet = planets.find(p => p.id === selectedPlanetId);
            if (currentPlanet) {
                setSlots(currentPlanet.lifeformSetup || []);
            }

            setLastBulkAction(Date.now());
        } catch (err) {
            console.error("Failed to revert all planets:", err);
        }
    };

    const handleApplyToAllPlanets = async () => {
        if (!planets || !slots) return;
        if (!confirm("Apply this technology setup to ALL planets in your empire? This will overwrite existing sandbox setups for all other planets.")) return;

        try {
            const updates = planets.map(p =>
                db.planets.update(p.id, {
                    sandboxSetup: slots
                })
            );
            await Promise.all(updates);
            setLastBulkAction(Date.now());
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
            console.error("Failed to apply setup to all planets:", err);
        }
    };

    const handleApplyLFTemplate = (templateName: string) => {
        const template = LF_TEMPLATES[templateName as keyof typeof LF_TEMPLATES];
        const newSlots = slots.map((slot, index) => {
            const lfName = template[index];
            const lfId = LF_ID_MAP[lfName];
            const techId = (index * 4) + lfId;
            return { ...slot, selectedTechId: techId, level: 0 };
        });
        setSlots(newSlots);
        setSaveStatus('idle');
    };

    const handleApplyTemplateGlobal = async (templateName: string) => {
        if (!planets) return;

        const confirmMessage = `⚠️ GLOBAL ACTION REQUIRED ⚠️\n\nAre you sure you want to apply the "${templateName}" tech preset to ALL ${planets.length} planets in your empire?\n\nThis will OVERWRITE all existing sandbox setups for every planet.\n\nContinue?`;

        if (!confirm(confirmMessage)) return;

        const template = LF_TEMPLATES[templateName as keyof typeof LF_TEMPLATES];
        try {
            const updates = planets.map(p => {
                const currentSlots = p.sandboxSetup || p.lifeformSetup || Array.from({ length: 18 }, (_, i) => ({ slotNumber: i + 1, selectedTechId: null, level: 0 }));
                const newS = currentSlots.map((slot: any, index: number) => {
                    const lfName = template[index];
                    const lfId = LF_ID_MAP[lfName];
                    const techId = (index * 4) + lfId;
                    return { ...slot, selectedTechId: techId, level: 0 };
                });
                return db.planets.update(p.id, { sandboxSetup: newS });
            });
            await Promise.all(updates);

            const updatedSlots = slots.map((slot, index) => {
                const lfName = template[index];
                const lfId = LF_ID_MAP[lfName];
                const techId = (index * 4) + lfId;
                return { ...slot, selectedTechId: techId, level: 0 };
            });
            setSlots(updatedSlots);

            setLastBulkAction(Date.now());
            alert(`✅ ${templateName} preset applied to all planets!`);
        } catch (err) {
            console.error("Global template apply failed:", err);
            alert("❌ Failed to apply global preset.");
        }
    };

    const getIconPath = (techId: number | null) => {
        if (techId === null) return '';
        const tech = LIFEFORM_TECH_DATA.find(t => t.id === techId);
        if (!tech) return '';
        const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
        const lfName = lfNames[tech.lifeformId - 1];
        const slotNum = Math.floor((tech.id - 1) / 4) + 1;
        return `/icons/lifeforms/${lfName}-tech-t${slotNum}-large.jpg`;
    };

    const getLfIcon = (lfId: number) => {
        const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
        return `/icons/lifeforms/${lfNames[lfId - 1]}-icon-large.jpg`;
    };

    const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

    const calculateCost = (base: number, factor: number, level: number) => {
        if (level <= 0) return 0;
        // OGame Lifeform Tech formula: Base * Multiplier^(Level-1) * Level
        return Math.floor(base * Math.pow(factor, level - 1) * level);
    };

    const calculateCumulativeCost = (base: number, factor: number, start: number, end: number) => {
        let total = 0;
        for (let i = start + 1; i <= end; i++) {
            total += calculateCost(base, factor, i);
        }
        return total;
    };



    const researchReduction = useMemo(() => {
        const planet = planets?.find(p => p.id === selectedPlanetId);
        if (!planet || !planet.lifeformBuildings) return 0;

        const REDUCTION_IDS = [11103, 12103, 13103, 14103]; // Research centers for Humans, Rocktal, Mechas, Kaelesh
        let totalLevels = 0;
        planet.lifeformBuildings.forEach((b: any) => {
            if (REDUCTION_IDS.includes(b.id)) {
                totalLevels += b.level || 0;
            }
        });
        return totalLevels * 0.0025; // 0.25% per level
    }, [planets, selectedPlanetId]);

    const precise = (num: number) => {
        return Math.round(num * 1000000) / 1000000; // Keep 6 decimals during calc
    };

    const totalBonuses = useMemo(() => {
        const bonuses: Record<string, number> = {};
        const planet = planets?.find(p => p.id === selectedPlanetId);
        const expData = activeAccount?.lifeformExperience?.find(e => e.lifeformId === planet?.lifeformId);

        let buildingBonus = 0;
        if (planet?.lifeformBuildings) {
            planet.lifeformBuildings.forEach(b => {
                if (b.id === 11111) buildingBonus += b.level * 0.005;
                else if (b.id === 13107) buildingBonus += b.level * 0.003;
                else if (b.id === 13111) buildingBonus += b.level * 0.004;
            });
        }

        const totalBonusMultiplier = 1 + (expData?.level || 0) * 0.001 + buildingBonus;

        slots.forEach(slot => {
            if (!slot) return;
            const tech = LIFEFORM_TECH_DATA.find(t => t.id === slot.selectedTechId);
            if (!tech) return;

            const techBonuses = getTechBonuses(tech, slot.level);
            techBonuses.forEach(b => {
                const finalValue = precise(b.value * totalBonusMultiplier);
                bonuses[b.name] = precise((bonuses[b.name] || 0) + finalValue);
            });
        });
        return bonuses;
    }, [slots, planets, selectedPlanetId, activeAccount]);

    const empireBonuses = useMemo(() => {
        if (!planets) return { sandbox: {}, live: {}, ships: { sandbox: {}, live: {} }, researches: { sandbox: {}, live: {} } };
        const sandbox: Record<string, number> = {};
        const live: Record<string, number> = {};
        const ships: { sandbox: Record<string, Record<string, number>>, live: Record<string, Record<string, number>> } = { sandbox: {}, live: {} };
        const researches: { sandbox: Record<string, Record<string, number>>, live: Record<string, Record<string, number>> } = { sandbox: {}, live: {} };
        const planetResearches: { sandbox: Record<string, { Cost: number, Time: number }>, live: Record<string, { Cost: number, Time: number }> } = { sandbox: {}, live: {} };

        const calculateForSetup = (setup: any[], expData: any, p: any, targetObj: Record<string, number>, shipTargetObj: Record<string, Record<string, number>>, researchTargetObj: Record<string, Record<string, number>>, planetTargetObj: Record<string, { Cost: number, Time: number }>) => {
            let buildingBonus = 0;
            if (p.lifeformBuildings) {
                p.lifeformBuildings.forEach((b: any) => {
                    if (b.id === 11111) buildingBonus += b.level * 0.005;
                    else if (b.id === 13107) buildingBonus += b.level * 0.003;
                    else if (b.id === 13111) buildingBonus += b.level * 0.004;
                });
            }

            const totalMultiplier = 1 + (expData?.level || 0) * 0.001 + buildingBonus;

            if (!planetTargetObj[p.id]) planetTargetObj[p.id] = { Cost: 0, Time: 0 };
            let pBuildingCost = 0;
            let pBuildingTime = 0;
            if (p.lifeformBuildings) {
                p.lifeformBuildings.forEach((b: any) => {
                    if ([11103, 12103, 13103, 14103].includes(b.id)) {
                        pBuildingCost += b.level * 0.25;
                        pBuildingTime += b.level * 2;
                    }
                });
            }
            planetTargetObj[p.id].Cost = precise(pBuildingCost);
            planetTargetObj[p.id].Time = precise(pBuildingTime);

            setup.forEach(slot => {
                if (!slot) return;
                const tech = LIFEFORM_TECH_DATA.find(t => t.id === slot.selectedTechId);
                if (!tech) return;
                const techBonuses = getTechBonuses(tech, slot.level);
                techBonuses.forEach(b => {
                    const finalValue = precise(b.value * totalMultiplier);
                    targetObj[b.name] = precise((targetObj[b.name] || 0) + finalValue);

                    if ([6, 7, 10, 16, 17, 18].includes(b.id)) {
                        const type = { 16: 'Armor', 17: 'Shields', 18: 'Weapons', 7: 'Speed', 6: 'Fuel', 10: 'Cargo' }[b.id as 6 | 7 | 10 | 16 | 17 | 18];
                        const shipTargets = b.targets.filter(t => t.gameKnowledgeId).map(t => t.gameKnowledgeId);

                        const applyToShip = (tid: number) => {
                            const sName = knowledgeMap[tid];
                            if (!sName || tid === 212) return;
                            if (!shipTargetObj[sName]) shipTargetObj[sName] = {};
                            shipTargetObj[sName][type] = precise((shipTargetObj[sName][type] || 0) + finalValue);
                        };

                        if (shipTargets.length > 0) {
                            shipTargets.forEach(applyToShip);
                        } else {
                            [202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 213, 214, 215, 218, 219].forEach(applyToShip);
                        }
                    }

                    if ([9, 13].includes(b.id)) {
                        const type = { 9: 'Time', 13: 'Cost' }[b.id as 9 | 13];
                        const resTargets = b.targets.filter(t => t.gameKnowledgeId).map(t => t.gameKnowledgeId);

                        const applyToRes = (tid: number) => {
                            const rName = knowledgeMap[tid];
                            if (!rName) return;
                            if (!researchTargetObj[rName]) researchTargetObj[rName] = {};
                            researchTargetObj[rName][type] = precise((researchTargetObj[rName][type] || 0) + finalValue);
                        };

                        if (resTargets.length > 0) {
                            resTargets.forEach(applyToRes);
                        } else {
                            [106, 108, 109, 110, 111, 113, 114, 115, 117, 118, 120, 121, 122, 123, 124, 199].forEach(applyToRes);
                        }
                    }
                });
            });
        };

        planets.forEach(p => {
            const expData = activeAccount?.lifeformExperience?.find(e => e.lifeformId === p.lifeformId);
            calculateForSetup(p.sandboxSetup || p.lifeformSetup || [], expData, p, sandbox, ships.sandbox, researches.sandbox, planetResearches.sandbox);
            calculateForSetup(p.lifeformSetup || [], expData, p, live, ships.live, researches.live, planetResearches.live);
        });
        return { sandbox, live, ships, researches, planetResearches };
    }, [planets, activeAccount, knowledgeMap]);

    const empireBonusesBreakdown = useMemo(() => {
        if (!planets) return {};
        const breakdown: Record<string, { planetName: string, value: number, coords: string, imgUrl?: string, techValue: number, levelBonus: number, buildingBonus: number }[]> = {};

        planets.forEach(p => {
            const setup = p.sandboxSetup || p.lifeformSetup || [];
            const expData = activeAccount?.lifeformExperience?.find(e => e.lifeformId === p.lifeformId);

            let buildingBonus = 0;
            if (p.lifeformBuildings) {
                p.lifeformBuildings.forEach((b: any) => {
                    if (b.id === 11111) buildingBonus += b.level * 0.005;
                    else if (b.id === 13107) buildingBonus += b.level * 0.003;
                    else if (b.id === 13111) buildingBonus += b.level * 0.004;
                });
            }

            const lfLevelBonusPercentage = (expData?.level || 0) * 0.1; // Percentage display
            const totalMultiplier = 1 + (expData?.level || 0) * 0.001 + buildingBonus;

            setup.forEach(slot => {
                if (!slot) return;
                const tech = LIFEFORM_TECH_DATA.find(t => t.id === slot.selectedTechId);
                if (!tech) return;

                const techBonuses = getTechBonuses(tech, slot.level);
                techBonuses.forEach(b => {
                    const techContribution = b.value;
                    const finalValue = precise(techContribution * totalMultiplier);

                    const addToBreakdown = (key: string) => {
                        if (!breakdown[key]) breakdown[key] = [];
                        const existing = breakdown[key].find(item => item.planetName === p.name && item.coords === p.coords);
                        if (existing) {
                            existing.value = precise(existing.value + finalValue);
                            existing.techValue = precise(existing.techValue + techContribution);
                        } else {
                            breakdown[key].push({
                                planetName: p.name,
                                value: finalValue,
                                coords: p.coords,
                                imgUrl: p.imgUrl,
                                techValue: techContribution,
                                levelBonus: lfLevelBonusPercentage,
                                buildingBonus: buildingBonus * 100
                            });
                        }
                    };

                    addToBreakdown(b.name);

                    // Add ship-specific breakdowns
                    if ([6, 7, 10, 16, 17, 18].includes(b.id)) {
                        const type = { 16: 'Armor', 17: 'Shields', 18: 'Weapons', 7: 'Speed', 6: 'Fuel', 10: 'Cargo' }[b.id as 6 | 7 | 10 | 16 | 17 | 18];
                        const shipTargets = b.targets.filter(t => t.gameKnowledgeId).map(t => t.gameKnowledgeId);

                        const trackShip = (tid: number) => {
                            const sName = knowledgeMap[tid];
                            if (!sName || tid === 212) return;
                            addToBreakdown(`SHIP:${sName}:${type}`);
                        };

                        if (shipTargets.length > 0) {
                            shipTargets.forEach(trackShip);
                        } else {
                            [202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 213, 214, 215, 218, 219].forEach(trackShip);
                        }
                    }

                    if ([9, 13].includes(b.id)) {
                        const type = { 9: 'Time', 13: 'Cost' }[b.id as 9 | 13];
                        const resTargets = b.targets.filter(t => t.gameKnowledgeId).map(t => t.gameKnowledgeId);

                        const trackRes = (tid: number) => {
                            const rName = knowledgeMap[tid];
                            if (!rName) return;
                            addToBreakdown(`RESEARCH:${rName}:${type}`);
                        };

                        if (resTargets.length > 0) {
                            resTargets.forEach(trackRes);
                        } else {
                            [106, 108, 109, 110, 111, 113, 114, 115, 117, 118, 120, 121, 122, 123, 124, 199].forEach(trackRes);
                        }
                    }
                });
            });
        });

        // Add PLANET_SUMMARY entries
        planets?.forEach(p => {
            const buildingData = (empireBonuses as any).planetResearches?.sandbox?.[p.id] || { Cost: 0, Time: 0 };

            ['Cost', 'Time'].forEach(type => {
                const summaryKey = `PLANET_SUMMARY:${p.id}:${type}`;
                const globalKey = type === 'Cost' ? 'Research Costs Decrease' : 'Research Speed Boost';
                const globalBreakdown = breakdown[globalKey] || [];

                // Aggregate tech totals
                const techTotal = precise(globalBreakdown.reduce((acc, curr) => acc + curr.value, 0));

                const lfId = p.lifeformId || 1;
                const speciesFolderName = ['humans', 'rocktal', 'mechas', 'kaelesh'][lfId - 1];
                const buildingIcon = `/icons/lifeforms/${speciesFolderName}-building-3-large.jpg`;
                const buildingNames = ['Research Centre', 'Rune Research Centre', 'Robotics Research Centre', 'Bio-Molecular Laboratory'];

                const summaryItems = [
                    {
                        planetName: buildingNames[lfId - 1],
                        value: buildingData[type as 'Cost' | 'Time'],
                        coords: p.coords,
                        imgUrl: buildingIcon,
                        techValue: 0,
                        levelBonus: 0,
                        buildingBonus: 0,
                        label: 'Individual Planet Specialization'
                    }
                ];

                // Only add global tech bonus for Time reduction (user requested cost to only show building)
                if (type === 'Time') {
                    summaryItems.push({
                        planetName: 'Lifeform Technologies (Empire)',
                        value: techTotal,
                        coords: 'Global Bonus',
                        imgUrl: '/icons/lifeforms/lifeform-dna-icon-medium.png',
                        techValue: 0,
                        levelBonus: 0,
                        buildingBonus: 0,
                        label: 'Global Empire Knowledge'
                    });
                }

                breakdown[summaryKey] = summaryItems;
            });
        });

        return breakdown;
    }, [planets, activeAccount, knowledgeMap, empireBonuses]);

    const openPicker = (index: number) => {
        setPickerSlotIndex(index);
        setTempSelectedTechId(slots[index].selectedTechId);
        setIsPickerOpen(true);
        setActiveSlotIndex(index);
    };

    const formatFloor2 = (num: number) => {
        return (Math.floor(num * 100) / 100).toFixed(2);
    };

    const selectTechInPicker = () => {
        if (pickerSlotIndex !== null) {
            updateSlot(pickerSlotIndex, { selectedTechId: tempSelectedTechId });
            setIsPickerOpen(false);
        }
    };



    const renderTierGroup = (tier: number) => {
        const startIndex = (tier - 1) * 6;
        const tierSlotsIndices = [0, 1, 2, 3, 4, 5].map(i => startIndex + i);

        const containerVariants = {
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: {
                    staggerChildren: 0.05
                }
            }
        };

        const itemVariants = {
            hidden: { scale: 0.8, opacity: 0 },
            show: { scale: 1, opacity: 1 }
        };

        return (
            <div className="tier-column-group">
                <div className="tier-header">Tier {tier} Research</div>
                <motion.div
                    key={`${tier}-${lastBulkAction}`}
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="tier-slots-grid"
                >
                    {tierSlotsIndices.map(idx => {
                        const slot = slots[idx];
                        if (!slot) return <div key={idx} className="tech-slot empty" />;

                        const tech = slot.selectedTechId !== null ? LIFEFORM_TECH_DATA.find(t => t.id === slot.selectedTechId) : null;
                        const speciesBorderColor = tech ? ['#22c55e', '#ef4444', '#3b82f6', '#a855f7'][tech.lifeformId - 1] : 'rgba(255, 255, 255, 0.1)';

                        return (
                            <motion.div
                                key={idx}
                                variants={itemVariants}
                                layoutId={`slot-${idx}`}
                                className={`tech-slot ${activeSlotIndex === idx ? 'active' : ''} ${!tech ? 'empty' : ''} ${tech && slot.level === 0 ? 'level-zero' : ''}`}
                                style={{ borderColor: speciesBorderColor }}
                                onClick={() => openPicker(idx)}
                                whileTap={{ scale: 0.95 }}
                            >
                                <AnimatePresence mode="wait">
                                    {tech ? (
                                        <motion.img
                                            key={slot.selectedTechId}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.2 }}
                                            src={getIconPath(slot.selectedTechId)}
                                            className="tech-slot-img"
                                            alt=""
                                        />
                                    ) : (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 0.05 }}
                                            exit={{ opacity: 0 }}
                                            className="tech-slot-placeholder"
                                        >
                                            {/* Blank center for unselected slots as requested */}
                                            <div className="empty-slot-cross" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="tech-name-overlay">
                                    <span className="tech-overlay-text">{tech ? tech.name : 'Select Technology'}</span>
                                    {tech && (
                                        <button
                                            className="clear-slot-btn"
                                            onClick={(e) => { e.stopPropagation(); handleClearSlot(idx); }}
                                            title="Clear Slot"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="slot-tier-banner">
                                    <span className="slot-tier-text">T{slot.slotNumber}</span>
                                </div>
                                {tech && (
                                    <div className="slot-level-wrapper" onClick={(e) => e.stopPropagation()}>
                                        <ChevronUp
                                            size={14}
                                            className="level-arrow"
                                            onClick={() => updateSlot(idx, { level: slot.level + 1 })}
                                        />
                                        <input
                                            type="number"
                                            className="slot-level-input"
                                            value={slot.level}
                                            onChange={(e) => updateSlot(idx, { level: e.target.value as any })}
                                            onFocus={(e) => e.target.select()}
                                            min="0"
                                        />
                                        <ChevronDown
                                            size={14}
                                            className="level-arrow"
                                            onClick={() => updateSlot(idx, { level: Math.max(0, slot.level - 1) })}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        );
    };

    return (
        <div className="view">
            <h1 className="view-title">Lifeform Tech Sandbox</h1>

            <div className="lifeform-sandbox-container">
                {/* Vertical Planet Sidebar */}
                <div className="planet-sidebar-vertical glass">
                    <div className="sidebar-section">
                        <div style={{ padding: '20px 20px' }}>
                            <motion.div
                                className={`view-item-vertical ${viewMode === 'all-bonuses' ? 'selected' : ''}`}
                                onClick={() => setViewMode('all-bonuses')}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="view-icon-container">
                                    <Globe size={20} />
                                </div>
                                <div className="view-vertical-info">
                                    <span className="view-vertical-name">Empire Overview</span>
                                    <span className="view-vertical-subtitle">All Lifeform Bonuses</span>
                                </div>
                                <div className="view-item-glow" />
                            </motion.div>
                        </div>
                    </div>

                    <div className="sidebar-section" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        <div className="sidebar-header-row" style={{ padding: '20px 20px 8px', display: 'flex', justifyContent: 'center' }}>
                            <button
                                className="revert-all-btn"
                                onClick={handleRevertAllPlanets}
                                title="Update all planets from Sandbox to LIVE versions"
                            >
                                <RotateCcw size={14} />
                                Update all planets from Sandbox to LIVE versions
                            </button>
                        </div>
                        <div className="planet-list-container custom-scrollbar" style={{ padding: '8px 20px 20px', flex: 1, overflowY: 'auto' }}>
                            {planets?.map((p, idx) => {
                                const speciesColor = p.lifeformId ? ['rgba(34, 197, 94, 0.15)', 'rgba(239, 68, 68, 0.15)', 'rgba(59, 130, 246, 0.15)', 'rgba(168, 85, 247, 0.15)'][p.lifeformId - 1] : 'rgba(255, 255, 255, 0.05)';
                                const speciesBorder = p.lifeformId ? ['rgba(34, 197, 94, 0.3)', 'rgba(239, 68, 68, 0.3)', 'rgba(59, 130, 246, 0.3)', 'rgba(168, 85, 247, 0.3)'][p.lifeformId - 1] : 'rgba(255, 255, 255, 0.1)';

                                return (
                                    <motion.div
                                        key={p.id}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`planet-item-vertical ${selectedPlanetId === p.id && viewMode === 'planet' ? 'selected' : ''}`}
                                        style={{
                                            backgroundColor: speciesColor,
                                            borderColor: selectedPlanetId === p.id && viewMode === 'planet' ? undefined : speciesBorder,
                                            marginBottom: '8px'
                                        }}
                                        onClick={() => {
                                            setSelectedPlanetId(p.id);
                                            setViewMode('planet');
                                        }}
                                    >
                                        <img src={p.imgUrl || '/icons/planets/dry-large.jpg'} className="planet-img-small" alt="" />
                                        <div className="planet-vertical-info" style={{ flex: 1 }}>
                                            <span className="planet-vertical-name">{p.name}</span>
                                            <span className="planet-vertical-coords">{p.coords === '0:0:0' ? 'Unknown' : `[${p.coords}]`}</span>
                                        </div>

                                        {(() => {
                                            const isModified = p.lifeformSetup && p.sandboxSetup && (
                                                p.lifeformSetup.length !== p.sandboxSetup.length ||
                                                p.lifeformSetup.some((s, i) =>
                                                    s.selectedTechId !== p.sandboxSetup?.[i]?.selectedTechId ||
                                                    s.level !== p.sandboxSetup?.[i]?.level
                                                )
                                            );

                                            return isModified ? (
                                                <div className="version-tag sandbox" title="Sandbox Version (Modified)">
                                                    <FlaskConical size={10} />
                                                    <span>SANDBOX</span>
                                                </div>
                                            ) : (
                                                <div className="version-tag live" title="Live Version (Synced)">
                                                    <Radio size={10} />
                                                    <span>LIVE</span>
                                                </div>
                                            );
                                        })()}

                                        {p.lifeformId && (
                                            <img
                                                src={getLfIcon(p.lifeformId)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '6px',
                                                    opacity: 1,
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    boxShadow: '0 0 12px rgba(0,0,0,0.5)',
                                                    zIndex: 4
                                                }}
                                                title={['Humans', 'Rock\'tal', 'Mechas', 'Kaelesh'][p.lifeformId - 1]}
                                                alt=""
                                            />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Sandbox Content */}
                <div className="main-sandbox-area" style={{ gridTemplateColumns: viewMode === 'all-bonuses' ? '1fr' : '1fr 350px' }}>
                    {viewMode === 'all-bonuses' ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="empire-overview-screen glass"
                        >
                            <div className="empire-overview-header">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <div>
                                        <div className="overview-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Globe className="overview-icon" />
                                            <span>All Lifeform Bonuses</span>
                                            <div className="title-info-trigger" title="Data is aggregated from your live in-game tech and building levels. If results seem incomplete, ensure you have visited the Empire page in OGame while the extension is active.">
                                                <HelpCircle size={16} style={{ opacity: 0.5, cursor: 'help' }} />
                                            </div>
                                        </div>
                                        <div className="overview-subtitle">Total aggregated bonuses across {planets?.length || 0} planets</div>
                                    </div>
                                    <button className="re-sync-btn" onClick={() => setIsSyncModalOpen(true)}>
                                        <RefreshCw size={14} />
                                        Re-sync Game Data
                                    </button>
                                </div>
                            </div>

                            <div className="all-bonuses-container">
                                <div className="overview-section-card">
                                    <div className="overview-section-title">
                                        <Info size={14} /> Lifeform Specialist Experience
                                    </div>
                                    <div className="lifeform-experience-dashboard">
                                        {[1, 2, 3, 4].map(id => {
                                            const expData = activeAccount?.lifeformExperience?.find(e => e.lifeformId === id);
                                            const level = expData?.level || 0;
                                            const hasTechs = planets?.some(p => p.lifeformId === id);
                                            const progress = expData ? (expData.currentExp / expData.nextLevelExp) * 100 : 0;
                                            const speciesName = ['Humans', 'Rock\'tal', 'Mechas', 'Kaelesh'][id - 1];
                                            const speciesColor = ['#22c55e', '#ef4444', '#3b82f6', '#a855f7'][id - 1];

                                            const relevantPlanets = planets?.filter(p => p.lifeformId === id) || [];
                                            let totalBldBonus = 0;
                                            relevantPlanets.forEach(p => {
                                                if (p.lifeformBuildings) {
                                                    p.lifeformBuildings.forEach(b => {
                                                        if (b.id === 11111) totalBldBonus += b.level * 0.005;
                                                        else if (b.id === 13107) totalBldBonus += b.level * 0.003;
                                                        else if (b.id === 13111) totalBldBonus += b.level * 0.004;
                                                    });
                                                }
                                            });
                                            const avgBldBonus = relevantPlanets.length > 0 ? (totalBldBonus / relevantPlanets.length) * 100 : 0;

                                            return (
                                                <div key={id} className={`lf-exp-pod ${hasTechs ? 'has-techs' : ''}`}>
                                                    <div className="lf-pod-visual" style={{ borderColor: speciesColor }}>
                                                        <img src={getLfIcon(id)} className="lf-pod-img" alt="" />
                                                        <div className="lf-pod-level-badge" style={{ backgroundColor: speciesColor }}>
                                                            {level}
                                                        </div>
                                                    </div>
                                                    <div className="lf-pod-main">
                                                        <div className="lf-pod-header">
                                                            <span className="lf-pod-name">{speciesName}</span>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                                <span className="lf-pod-bonus" style={{ fontSize: '0.85rem' }}>+{Number(level * 0.1).toFixed(1)}% <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>lvl</span></span>
                                                            </div>
                                                        </div>
                                                        <div className="lf-pod-progress-track">
                                                            <motion.div
                                                                className="lf-pod-progress-fill"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress}%` }}
                                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                                style={{ backgroundColor: speciesColor, boxShadow: `0 0 10px ${speciesColor}66` }}
                                                            />
                                                        </div>
                                                        <div className="lf-pod-meta">
                                                            <span>Lvl {level}</span>
                                                            <span>{Number(progress).toFixed(1)}% to Lvl {level + 1}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="overview-section-card">
                                    <div className="overview-section-title">
                                        <BarChart3 size={14} /> Primary Resource & Expedition Metrics
                                    </div>
                                    <div className="bento-bonuses-grid">
                                        {[
                                            { name: 'Metal', key: 'Resource Bonus Metal', icon: '/icons/resources/metal-icon-medium.jpg', isPng: false },
                                            { name: 'Crystal', key: 'Resource Bonus Crystal', icon: '/icons/resources/crystal-icon-medium.jpg', isPng: false },
                                            { name: 'Deuterium', key: 'Resource Bonus Deuterium', icon: '/icons/resources/deuterium-icon-medium.jpg', isPng: false },
                                            { name: 'Exp. Resources', key: 'Expedition Resource Find Bonus', icon: '/icons/misc/expedition-icon-medium.png', isPng: true },
                                            { name: 'Exp. Dark Matter', key: 'Expedition Dark Matter Find Boost', icon: '/icons/resources/dark-matter-icon-medium.jpg', isPng: false },
                                            { name: 'Exp. Ships', key: 'Expedition Ship Find Bonus', icon: '/icons/misc/expedition-ships-icon-medium.png', isPng: true },
                                        ].map((item, idx) => {
                                            const bonusSet = empireBonuses as { sandbox: Record<string, number>, live: Record<string, number> };
                                            const val = bonusSet.sandbox[item.key] || 0;
                                            const liveVal = bonusSet.live[item.key] || 0;
                                            const diff = val - liveVal;

                                            return (
                                                <motion.div
                                                    key={item.key}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="bento-bonus-card"
                                                    onClick={() => {
                                                        setSelectedBreakdownKey(item.key);
                                                        setIsBreakdownModalOpen(true);
                                                    }}
                                                >
                                                    <div className={`bento-bonus-icon-wrapper ${item.isPng ? 'png-icon' : ''}`}>
                                                        <img src={item.icon} alt="" className="bento-bonus-icon" />
                                                    </div>
                                                    <div className="bento-bonus-info">
                                                        <div className="bento-bonus-name">{item.name}</div>
                                                        <div className="bento-bonus-value-large" style={{ marginBottom: 0 }}>+{formatFloor2(val)}%</div>
                                                        {Math.abs(diff) > 0.005 && (
                                                            <div className={`ship-delta ${diff > 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                                                                {diff > 0 ? '+' : ''}{formatFloor2(diff)}% vs Live
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bento-card-overlay">
                                                        <div className="bento-overlay-content">
                                                            <BarChart3 size={18} className="bento-overlay-icon" />
                                                            <span className="bento-overlay-text">Inspect Breakdown</span>
                                                        </div>
                                                    </div>
                                                    <div className="bento-card-glow" />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {(() => {
                                    const classBoostKeys = ['Collector Class Boost', 'General Class Boost', 'Discoverer Class Boost'];
                                    const classBoostsData = Object.entries((empireBonuses as any).sandbox || {})
                                        .filter(([name, val]) => classBoostKeys.includes(name) && (val as number) > 0);

                                    if (classBoostsData.length === 0) return null;

                                    return (
                                        <div className="overview-section-card">
                                            <div className="overview-section-title">
                                                <BarChart3 size={14} /> Class Boosts
                                            </div>
                                            <div className="bento-bonuses-grid">
                                                {/* Enhancement card based on account class */}
                                                {(() => {
                                                    const accountClass = activeAccount?.playerClass;
                                                    let techId = 69; // Supercomputer (Lifeform 1, slot 18)
                                                    if (accountClass === 1) techId = 70; // Collector (Lifeform 2, slot 18)
                                                    else if (accountClass === 2) techId = 71; // General (Lifeform 3, slot 18)
                                                    else if (accountClass === 3) techId = 72; // Discoverer (Lifeform 4, slot 18)

                                                    const tech = LIFEFORM_TECH_DATA.find(t => t.id === techId);
                                                    if (!tech) return null;

                                                    const targetBonusId = tech.target[0].bonusBreakdownId;
                                                    const bonusMeta = LIFEFORM_BONUS_BREAKDOWN_DATA.find(b => b.id === targetBonusId);
                                                    const bonusKey = bonusMeta?.bonusName || "";
                                                    const boostVal = (empireBonuses as any).sandbox[bonusKey] || 0;
                                                    const liveBoostVal = (empireBonuses as any).live[bonusKey] || 0;
                                                    const diff = boostVal - liveBoostVal;

                                                    return (
                                                        <motion.div
                                                            key={`enhancement-${techId}`}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="bento-bonus-card enhancement-card"
                                                            style={{
                                                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                                                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(12, 18, 28, 0.6) 100%)',
                                                                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                                                textAlign: 'left'
                                                            }}
                                                            onClick={() => {
                                                                setSelectedBreakdownKey(bonusKey);
                                                                setIsBreakdownModalOpen(true);
                                                            }}
                                                        >
                                                            <div className="bento-bonus-icon-wrapper png-icon" style={{ background: 'rgba(212, 175, 55, 0.08)', boxShadow: '0 0 10px rgba(212, 175, 55, 0.1)' }}>
                                                                <img src={getIconPath(techId)} alt="" className="bento-bonus-icon" />
                                                            </div>
                                                            <div className="bento-bonus-info">
                                                                <div className="bento-bonus-name" style={{ fontSize: '0.75rem', lineHeight: '1.2', color: 'rgba(212, 175, 55, 0.9)', fontWeight: 800 }}>{tech.name}</div>
                                                                <div className="bento-bonus-value-large" style={{ marginBottom: 0, fontSize: '1.3rem', color: '#fff', fontWeight: 900 }}>
                                                                    +{formatFloor2(boostVal)}%
                                                                </div>
                                                                {Math.abs(diff) > 0.001 && (
                                                                    <div className={`ship-delta ${diff > 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                                                                        {diff > 0 ? '+' : ''}{formatFloor2(diff)}% vs Live
                                                                    </div>
                                                                )}
                                                                <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '2px', color: '#fff' }}>
                                                                    Total aggregated tech bonus
                                                                </div>
                                                            </div>

                                                            <div className="bento-card-overlay">
                                                                <div className="bento-overlay-content">
                                                                    <BarChart3 size={18} className="bento-overlay-icon" style={{ color: 'rgba(212, 175, 55, 0.8)' }} />
                                                                    <span className="bento-overlay-text" style={{ color: 'rgba(212, 175, 55, 0.8)' }}>Inspect Enhancement</span>
                                                                </div>
                                                            </div>
                                                            <div className="bento-card-glow" style={{ background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.1) 0%, transparent 70%)' }} />
                                                        </motion.div>
                                                    );
                                                })()}

                                                {classBoostsData.map(([className, boostVal]: [string, any]) => {
                                                    const liveBoostVal = (empireBonuses as any).live[className] || 0;
                                                    const breakdownItem = LIFEFORM_BONUS_BREAKDOWN_DATA.find(b => b.bonusName === className);
                                                    if (!breakdownItem?.boostDetails) return null;

                                                    return breakdownItem.boostDetails.map((detail, idx) => {
                                                        const isPercentage = detail.defaultValue.includes('%');
                                                        const baseValue = parseFloat(detail.defaultValue.replace(/[^\d.-]/g, ''));

                                                        const finalValNum = baseValue * (1 + (boostVal / 100));
                                                        const liveFinalValNum = baseValue * (1 + (liveBoostVal / 100));

                                                        const displayedFinal = isPercentage ? (Math.floor(finalValNum * 100) / 100) : Math.floor(finalValNum);
                                                        const displayedLive = isPercentage ? (Math.floor(liveFinalValNum * 100) / 100) : Math.floor(liveFinalValNum);
                                                        const diff = displayedFinal - displayedLive;

                                                        return (
                                                            <motion.div
                                                                key={`${className}-${detail.name}`}
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: idx * 0.05 }}
                                                                className="bento-bonus-card"
                                                                onClick={() => {
                                                                    setSelectedBreakdownKey(className);
                                                                    setIsBreakdownModalOpen(true);
                                                                }}
                                                            >
                                                                <div className="bento-bonus-icon-wrapper png-icon">
                                                                    <img src={`/icons/misc/${detail.icon}`} alt="" className="bento-bonus-icon" />
                                                                </div>
                                                                <div className="bento-bonus-info" style={{ textAlign: 'left' }}>
                                                                    <div className="bento-bonus-name" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>{detail.name}</div>
                                                                    <div className="bento-bonus-value-large" style={{ marginBottom: 0, fontSize: '1.2rem' }}>
                                                                        {calculateBoostedValue(detail.defaultValue, boostVal)}
                                                                    </div>
                                                                    {Math.abs(diff) > 0.001 && (
                                                                        <div className={`ship-delta ${diff > 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                                                                            {diff > 0 ? '+' : ''}{isPercentage ? formatFloor2(diff) + '%' : diff} vs Live
                                                                        </div>
                                                                    )}
                                                                    <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '2px' }}>
                                                                        {detail.defaultValue} base + {formatFloor2(boostVal)}% tech
                                                                    </div>
                                                                </div>
                                                                <div className="bento-card-overlay">
                                                                    <div className="bento-overlay-content">
                                                                        <BarChart3 size={18} className="bento-overlay-icon" />
                                                                        <span className="bento-overlay-text">Inspect {className}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="bento-card-glow" />
                                                            </motion.div>
                                                        );
                                                    });
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}


                                <div className="overview-section-card">
                                    <div className="overview-section-title">
                                        <Info size={14} /> Individual Ship Tactical Bonuses
                                    </div>
                                    <div className="ship-bonuses-table-container">
                                        <table className="ship-bonuses-table">
                                            <thead>
                                                <tr>
                                                    <th>Ship Name</th>
                                                    <th>Armor</th>
                                                    <th>Shields</th>
                                                    <th>Weapons</th>
                                                    <th>Speed</th>
                                                    <th>Cargo</th>
                                                    <th>Fuel Red.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries((empireBonuses as any).ships?.sandbox || {}).sort((a, b) => {
                                                    const order = ['Small Cargo', 'Large Cargo', 'Light Fighter', 'Heavy Fighter', 'Cruiser', 'Battleship', 'Colony Ship', 'Recycler', 'Espionage Probe', 'Bomber', 'Destroyer', 'Deathstar', 'Battlecruiser', 'Reaper', 'Pathfinder'];
                                                    return order.indexOf(a[0]) - order.indexOf(b[0]);
                                                }).map(([name, vals]: [string, any]) => {
                                                    const liveVals = (empireBonuses as any).ships?.live?.[name] || {};
                                                    return (
                                                        <tr key={name}>
                                                            <td className="table-item-cell">
                                                                <div className="table-item-info">
                                                                    <img src={knowledgeIconMap[name]} className="table-item-icon" alt="" />
                                                                    <span className="table-item-name">{name}</span>
                                                                </div>
                                                            </td>
                                                            {['Armor', 'Shields', 'Weapons', 'Speed', 'Cargo', 'Fuel'].map(type => {
                                                                const val = vals[type] || 0;
                                                                const liveVal = liveVals[type] || 0;
                                                                const diff = val - liveVal;

                                                                return (
                                                                    <td
                                                                        key={type}
                                                                        className="interactive-ship-cell"
                                                                        onClick={() => {
                                                                            setSelectedBreakdownKey(`SHIP:${name}:${type}`);
                                                                            setIsBreakdownModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <div className="ship-delta-container">
                                                                            <span className={`ship-val ${val > 0 ? 'positive' : 'zero'}`}>
                                                                                {val > 0 ? `+${formatFloor2(val)}%` : '0.00%'}
                                                                            </span>
                                                                            {Math.abs(diff) > 0.005 && (
                                                                                <span className={`ship-delta ${diff > 0 ? 'positive' : 'negative'}`}>
                                                                                    {diff > 0 ? '+' : ''}{formatFloor2(diff)}% vs Live
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="overview-section-card">
                                    <div className="overview-section-title">
                                        <Info size={14} /> Individual Research Cost & Time Reduction
                                    </div>
                                    <div className="ship-bonuses-table-container">
                                        <table className="ship-bonuses-table">
                                            <thead>
                                                <tr>
                                                    <th>Research Name</th>
                                                    <th>Cost Reduction</th>
                                                    <th>Time Reduction</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries((empireBonuses as any).researches?.sandbox || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([name, vals]: [string, any]) => {
                                                    const liveVals = (empireBonuses as any).researches?.live?.[name] || {};
                                                    return (
                                                        <tr key={name}>
                                                            <td className="table-item-cell">
                                                                <div className="table-item-info">
                                                                    <img src={knowledgeIconMap[name]} className="table-item-icon" alt="" />
                                                                    <span className="table-item-name">{name}</span>
                                                                </div>
                                                            </td>
                                                            {['Cost', 'Time'].map(type => {
                                                                const limit = type === 'Cost' ? 50 : 99;
                                                                const val = Math.min(vals[type] || 0, limit);
                                                                const liveVal = Math.min(liveVals[type] || 0, limit);
                                                                const diff = val - liveVal;

                                                                return (
                                                                    <td
                                                                        key={type}
                                                                        className="interactive-ship-cell"
                                                                        onClick={() => {
                                                                            setSelectedBreakdownKey(`RESEARCH:${name}:${type}`);
                                                                            setIsBreakdownModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <div className="ship-delta-container">
                                                                            <span className={`ship-val ${val > 0 ? 'positive' : 'zero'}`}>
                                                                                {val > 0 ? `+${formatFloor2(val)}%` : '0.00%'}
                                                                            </span>
                                                                            {Math.abs(diff) > 0.005 && (
                                                                                <span className={`ship-delta ${diff > 0 ? 'positive' : 'negative'}`}>
                                                                                    {diff > 0 ? '+' : ''}{formatFloor2(diff)}% vs Live
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                                {Object.keys((empireBonuses as any).researches?.sandbox || {}).length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>No active research bonuses through Lifeforms</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="overview-section-card">
                                    <div className="overview-section-title">
                                        <Globe size={14} /> Lifeform Tech Research & Time Reduction (by Planet)
                                    </div>
                                    <div className="ship-bonuses-table-container">
                                        <table className="ship-bonuses-table">
                                            <thead>
                                                <tr>
                                                    <th>Planet</th>
                                                    <th>Cost Reduction</th>
                                                    <th>Time Reduction</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {planets?.map(p => {
                                                    const sData = (empireBonuses as any).planetResearches?.sandbox?.[p.id] || { Cost: 0, Time: 0 };
                                                    const lData = (empireBonuses as any).planetResearches?.live?.[p.id] || { Cost: 0, Time: 0 };
                                                    return (
                                                        <tr key={p.id}>
                                                            <td className="table-item-cell">
                                                                <div className="table-item-info">
                                                                    <img src={p.imgUrl || '/icons/planets/dry-large.jpg'} className="table-item-icon" alt="" />
                                                                    <span className="table-item-name">{p.name} <span style={{ opacity: 0.5, fontSize: '0.9em' }}>{p.coords === '0:0:0' ? 'Unknown' : `[${p.coords}]`}</span></span>
                                                                </div>
                                                            </td>
                                                            {['Cost', 'Time'].map(type => {
                                                                const limit = type === 'Cost' ? 50 : 99;
                                                                // Add Individual Research bonus (empire-wide tech) to planet building bonus
                                                                const globalBonus = (empireBonuses as any).researches?.sandbox?.['Energy Technology']?.[type] || 0;
                                                                const globalLiveBonus = (empireBonuses as any).researches?.live?.['Energy Technology']?.[type] || 0;

                                                                const val = Math.min((sData as any)[type] + globalBonus, limit);
                                                                const liveVal = Math.min((lData as any)[type] + globalLiveBonus, limit);
                                                                const diff = val - liveVal;

                                                                return (
                                                                    <td
                                                                        key={type}
                                                                        className="interactive-ship-cell"
                                                                        onClick={() => {
                                                                            setSelectedBreakdownKey(`PLANET_SUMMARY:${p.id}:${type}`);
                                                                            setIsBreakdownModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <div className="ship-delta-container">
                                                                            <span className={`ship-val ${val > 0 ? 'positive' : 'zero'}`}>
                                                                                {val > 0 ? `+${formatFloor2(val)}%` : '0.00%'}
                                                                            </span>
                                                                            {Math.abs(diff) > 0.005 && (
                                                                                <span className={`ship-delta ${diff > 0 ? 'positive' : 'negative'}`}>
                                                                                    {diff > 0 ? '+' : ''}{formatFloor2(diff)}% vs Live
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {[
                                    { title: 'Other resource & Structural bonuses', names: ['Energy Bonus', 'Crawler Boost', 'Crawler Energy Consumption', 'Orbital Den Storage Bonus', 'Phalanx Range Boost', 'Alliance Depot Cost Reduction', 'Alliance Depot Time Reduction', 'Terraformer Cost Reduction', 'Terraformer Time Reduction', 'Missile Silo Cost Reduction', 'Missile Silo Time Reduction'] }
                                ].map(cat => {
                                    const bentoKeys = ['Resource Bonus Metal', 'Resource Bonus Crystal', 'Resource Bonus Deuterium', 'Expedition Resource Find Bonus', 'Expedition Dark Matter Find Boost', 'Expedition Ship Find Bonus'];
                                    const shipKeys = ['Ship Armor Increase', 'Ship Shields Increase', 'Ship Weapons Increase', 'Ship Fuel Cost Reduction', 'Ship Speed Increase'];
                                    const classBoostKeys = ['Collector Class Boost', 'General Class Boost', 'Discoverer Class Boost'];

                                    const catBonuses = Object.entries((empireBonuses as { sandbox: Record<string, number> }).sandbox).filter(([name]) =>
                                        cat.names.includes(name) && !bentoKeys.includes(name) && !shipKeys.includes(name)
                                    );

                                    if (catBonuses.length === 0) return null;

                                    const classBoostsData = catBonuses.filter(([name]) => classBoostKeys.includes(name));
                                    const otherBonuses = catBonuses.filter(([name]) => !classBoostKeys.includes(name));

                                    return (
                                        <div key={cat.title} className="overview-section-card">
                                            <div className="overview-section-title">
                                                <BarChart3 size={14} /> {cat.title}
                                            </div>

                                            {classBoostsData.length > 0 && (
                                                <div className="bento-bonuses-grid" style={{ marginTop: '16px', marginBottom: otherBonuses.length > 0 ? '24px' : '0' }}>
                                                    {classBoostsData.map(([className, boostVal]) => {
                                                        const breakdownItem = LIFEFORM_BONUS_BREAKDOWN_DATA.find(b => b.bonusName === className);
                                                        if (!breakdownItem?.boostDetails) return null;

                                                        return breakdownItem.boostDetails.map((detail, idx) => (
                                                            <motion.div
                                                                key={`${className}-${detail.name}`}
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: idx * 0.05 }}
                                                                className="bento-bonus-card"
                                                                onClick={() => {
                                                                    setSelectedBreakdownKey(className);
                                                                    setIsBreakdownModalOpen(true);
                                                                }}
                                                            >
                                                                <div className="bento-bonus-icon-wrapper png-icon">
                                                                    <img src={`/icons/misc/${detail.icon}`} alt="" className="bento-bonus-icon" />
                                                                </div>
                                                                <div className="bento-bonus-info" style={{ textAlign: 'left' }}>
                                                                    <div className="bento-bonus-name" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>{detail.name}</div>
                                                                    <div className="bento-bonus-value-large" style={{ marginBottom: 0, fontSize: '1.2rem' }}>
                                                                        {calculateBoostedValue(detail.defaultValue, boostVal)}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '2px' }}>
                                                                        {detail.defaultValue} base + {formatFloor2(boostVal)}% tech
                                                                    </div>
                                                                </div>
                                                                <div className="bento-card-overlay">
                                                                    <div className="bento-overlay-content">
                                                                        <BarChart3 size={18} className="bento-overlay-icon" />
                                                                        <span className="bento-overlay-text">Inspect {className}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="bento-card-glow" />
                                                            </motion.div>
                                                        ));
                                                    })}
                                                </div>
                                            )}

                                            {otherBonuses.length > 0 && (
                                                <div className="bento-bonuses-grid" style={{ marginTop: '16px' }}>
                                                    {otherBonuses.sort((a, b) => b[1] - a[1]).map(([name, value], idx) => {
                                                        const liveVal = (empireBonuses as { live: Record<string, number> }).live[name] || 0;
                                                        const diff = value - liveVal;

                                                        const iconMap: Record<string, string> = {
                                                            'Energy Bonus': 'collector_energy_production.png',
                                                            'Crawler Boost': 'collector_resource_production.png',
                                                            'Crawler Energy Consumption': 'warrior_fuel_consumption.png',
                                                            'Orbital Den Storage Bonus': 'collector_cargo_bay.png',
                                                            'Phalanx Range Boost': 'discoverer_phalanx_range.png',
                                                            'Alliance Depot Cost Reduction': 'collector_resource_production.png',
                                                            'Alliance Depot Time Reduction': 'discoverer_research_time.png',
                                                            'Terraformer Cost Reduction': 'discoverer_bigger_planets.png',
                                                            'Terraformer Time Reduction': 'discoverer_research_time.png',
                                                            'Missile Silo Cost Reduction': 'collector_resource_production.png',
                                                            'Missile Silo Time Reduction': 'discoverer_research_time.png'
                                                        };
                                                        const icon = `/icons/misc/${iconMap[name] || 'nothing-empty-icon-medium.png'}`;

                                                        return (
                                                            <motion.div
                                                                key={name}
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: idx * 0.05 }}
                                                                className="bento-bonus-card"
                                                                onClick={() => {
                                                                    setSelectedBreakdownKey(name);
                                                                    setIsBreakdownModalOpen(true);
                                                                }}
                                                            >
                                                                <div className="bento-bonus-icon-wrapper png-icon">
                                                                    <img src={icon} alt="" className="bento-bonus-icon" />
                                                                </div>
                                                                <div className="bento-bonus-info" style={{ textAlign: 'left' }}>
                                                                    <div className="bento-bonus-name" style={{ fontSize: '0.65rem' }}>{name}</div>
                                                                    <div className="bento-bonus-value-large" style={{ marginBottom: 0 }}>+{formatFloor2(value)}%</div>
                                                                    {Math.abs(diff) > 0.005 && (
                                                                        <div className={`ship-delta ${diff > 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                                                                            {diff > 0 ? '+' : ''}{formatFloor2(diff)}% vs Live
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="bento-card-overlay">
                                                                    <div className="bento-overlay-content">
                                                                        <BarChart3 size={18} className="bento-overlay-icon" />
                                                                        <span className="bento-overlay-text">Inspect Breakdown</span>
                                                                    </div>
                                                                </div>
                                                                <div className="bento-card-glow" />
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {(() => {
                                    const fleetNames = ['Exploration Flight Fleet Speed Bonus', 'Fuel Refund for Recalls', 'Expedition Ship Loss Reduction', 'Expedition Fleet Speed Boost'];
                                    const fleetBonuses = Object.entries((empireBonuses as { sandbox: Record<string, number> }).sandbox)
                                        .filter(([name]) => fleetNames.includes(name));

                                    if (fleetBonuses.length === 0) return null;

                                    return (
                                        <div className="overview-section-card">
                                            <div className="overview-section-title">
                                                <BarChart3 size={14} /> Fleet Mechanics
                                            </div>
                                            <div className="bento-bonuses-grid">
                                                {fleetBonuses.map(([name, value], idx) => {
                                                    const liveVal = (empireBonuses as { live: Record<string, number> }).live[name] || 0;
                                                    const diff = value - liveVal;

                                                    let icon = '/icons/misc/exploration-icon-medium.png';
                                                    if (name.includes('Fuel')) icon = '/icons/misc/warrior_fuel_consumption.png';
                                                    if (name.includes('Loss')) icon = '/icons/misc/expedition-ships-icon-medium.png';
                                                    if (name.includes('Boost')) icon = '/icons/misc/speedup-icon-medium.png';

                                                    return (
                                                        <motion.div
                                                            key={name}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="bento-bonus-card"
                                                            onClick={() => {
                                                                setSelectedBreakdownKey(name);
                                                                setIsBreakdownModalOpen(true);
                                                            }}
                                                        >
                                                            <div className="bento-bonus-icon-wrapper png-icon">
                                                                <img src={icon} alt="" className="bento-bonus-icon" />
                                                            </div>
                                                            <div className="bento-bonus-info">
                                                                <div className="bento-bonus-name">{name.replace('Exploration Flight Fleet Speed Bonus', 'Exploration Speed')}</div>
                                                                <div className="bento-bonus-value-large" style={{ marginBottom: 0 }}>+{formatFloor2(value)}%</div>
                                                                {Math.abs(diff) > 0.005 && (
                                                                    <div className={`ship-delta ${diff > 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                                                                        {diff > 0 ? '+' : ''}{formatFloor2(diff)}% vs Live
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="bento-card-overlay">
                                                                <div className="bento-overlay-content">
                                                                    <BarChart3 size={18} className="bento-overlay-icon" />
                                                                    <span className="bento-overlay-text">Inspect Breakdown</span>
                                                                </div>
                                                            </div>
                                                            <div className="bento-card-glow" />
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {Object.keys((empireBonuses as { sandbox: Record<string, number> }).sandbox).length === 0 && (
                                    <div className="no-empire-data">
                                        No active lifeform setups found across your empire.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
                            <div className="tech-grid-scroll">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={selectedPlanetId}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3, ease: 'easeOut' }}
                                        className="tech-grid-layout"
                                    >
                                        {slots.length > 0 && (
                                            <>
                                                {renderTierGroup(1)}
                                                {renderTierGroup(2)}
                                                {renderTierGroup(3)}
                                            </>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <div className="sandbox-global-actions glass">
                                <div className="action-column">
                                    <div className="column-label">Persistence</div>
                                    <button
                                        className={`action-btn primary-action ${saveStatus}`}
                                        onClick={handleSaveSetup}
                                        disabled={saveStatus === 'saving'}
                                    >
                                        {saveStatus === 'saving' ? (
                                            'Saving...'
                                        ) : saveStatus === 'saved' ? (
                                            <><Check size={16} /> Setup Saved</>
                                        ) : (
                                            <><Save size={16} /> Save Planet Setup</>
                                        )}
                                    </button>
                                    <button className="action-btn" onClick={() => setIsSaveAsModalOpen(true)}>
                                        <Save size={16} /> Save Planet Setup As...
                                    </button>
                                    <button className="action-btn apply-all-btn" onClick={handleApplyToAllPlanets}>
                                        <Globe size={16} /> Apply to All Planets
                                    </button>
                                </div>

                                <div className="action-column">
                                    <div className="column-label">Data Management</div>
                                    <button className="action-btn load-techs-btn" onClick={handleLoadCurrentTechs}>
                                        <RefreshCw size={16} /> Sync Live Techs
                                    </button>
                                    <button className="action-btn" onClick={() => setIsLoadModalOpen(true)}>
                                        <Download size={16} /> Load Setups...
                                    </button>
                                </div>

                                <div className="action-column">
                                    <div className="column-label">Danger Zone</div>
                                    <button className="action-btn reset-techs-btn" onClick={handleClearTechLevels} title="Resets all levels to 0 but keeps selected technologies">
                                        <RotateCcw size={16} /> Clear Levels
                                    </button>

                                    <button className="action-btn clear-all-techs-btn" onClick={handleResetAllTechs} title="Deletes all selected technologies and resets levels">
                                        <Trash2 size={16} /> Reset Everything
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {viewMode !== 'all-bonuses' && (
                        <div className="sandbox-sidebar">
                            {viewMode === 'planet' && (
                                <div className="glass editor-card">
                                    {activeTech && slots[activeSlotIndex] && (
                                        <>
                                            <div className="editor-sleek-header">
                                                <div className="tech-visual-main">
                                                    <img
                                                        src={getIconPath(slots[activeSlotIndex].selectedTechId)}
                                                        className="tech-main-img"
                                                        alt=""
                                                    />
                                                    <div className="tech-tier-tag">T{slots[activeSlotIndex].slotNumber}</div>
                                                </div>
                                                <div className="tech-info-main">
                                                    <div className="tech-name-sleek">{activeTech.name}</div>
                                                    <div className="tech-desc-sleek">{activeTech.shortDesc}</div>
                                                    <div className="tech-bonuses-mini">
                                                        {getTechBonuses(activeTech, slots[activeSlotIndex].level).map((b, i) => {
                                                            const p = planets?.find(pl => pl.id === selectedPlanetId);
                                                            const expData = activeAccount?.lifeformExperience?.find(e => e.lifeformId === p?.lifeformId);
                                                            let buildingBonus = 0;
                                                            if (p?.lifeformBuildings) {
                                                                p.lifeformBuildings.forEach(lb => {
                                                                    if (lb.id === 11111) buildingBonus += lb.level * 0.005;
                                                                    else if (lb.id === 13107) buildingBonus += lb.level * 0.003;
                                                                    else if (lb.id === 13111) buildingBonus += lb.level * 0.004;
                                                                });
                                                            }
                                                            const totalMultiplier = 1 + (expData?.level || 0) * 0.001 + buildingBonus;
                                                            return (
                                                                <div key={i} className="bonus-pill-sleek">
                                                                    <span className="pill-value">+{formatFloor2(b.value * totalMultiplier)}%</span>
                                                                    <span className="pill-label">total</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="editor-section-divider" />

                                            <div className="editor-section">
                                                <div className="section-label-sleek">Level Adjustment</div>
                                                <div className="level-controls-sleek">
                                                    <button className="level-adj-btn" onClick={() => updateSlot(activeSlotIndex, { level: Math.max(0, slots[activeSlotIndex].level - 1) })}>-</button>
                                                    <input
                                                        type="text"
                                                        className="level-input-sleek"
                                                        value={slots[activeSlotIndex].level}
                                                        onChange={(e) => updateSlot(activeSlotIndex, { level: e.target.value as any })}
                                                        onFocus={(e) => e.target.select()}
                                                    />
                                                    <button className="level-adj-btn" onClick={() => updateSlot(activeSlotIndex, { level: slots[activeSlotIndex].level + 1 })}>+</button>
                                                    <div className="level-quick-adds">
                                                        <button className="quick-add-btn" onClick={() => updateSlot(activeSlotIndex, { level: slots[activeSlotIndex].level + 10 })}>+10</button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="editor-section">
                                                <div className="section-label-sleek" style={{ marginBottom: '8px' }}>Cost Calculator</div>

                                                <div className="range-picker-sleek">
                                                    <div className="range-field">
                                                        <span className="field-label">From Level</span>
                                                        <div className="field-input-wrapper">
                                                            <input
                                                                type="number"
                                                                value={calcRange.start}
                                                                onChange={e => setCalcRange({ ...calcRange, start: parseInt(e.target.value) || 0 })}
                                                                className="range-input-sleek"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="range-connector">
                                                        <ArrowRight size={16} />
                                                    </div>

                                                    <div className="range-field">
                                                        <span className="field-label">To Level</span>
                                                        <div className="field-input-wrapper">
                                                            <input
                                                                type="number"
                                                                value={calcRange.end}
                                                                onChange={e => setCalcRange({ ...calcRange, end: parseInt(e.target.value) || 0 })}
                                                                className="range-input-sleek"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="cost-grid-sleek" style={{ marginTop: '4px' }}>
                                                    {[
                                                        { label: 'Metal', color: 'var(--color-metal)', base: activeTech.metalBaseCost, factor: activeTech.metalIncreaseFactor, icon: 'metal-bg' },
                                                        { label: 'Crystal', color: 'var(--color-crystal)', base: activeTech.crystalBaseCost, factor: activeTech.crystalIncreaseFactor, icon: 'crystal-bg' },
                                                        { label: 'Deuterium', color: 'var(--color-deuterium)', base: activeTech.deutBaseCost, factor: activeTech.deutIncreaseFactor, icon: 'deut-bg' }
                                                    ].map(res => {
                                                        const rawCost = calculateCumulativeCost(res.base || 0, res.factor || 1, Number(calcRange.start) || 0, Number(calcRange.end) || 0);
                                                        const cost = Math.floor(rawCost * (1 - researchReduction));
                                                        return (
                                                            <div key={res.label} className="cost-row-sleek">
                                                                <div className={`cost-icon-mini ${res.icon}`} />
                                                                <div className="cost-label-sleek">{res.label}</div>
                                                                <div className="cost-value-sleek" style={{ color: res.color }}>
                                                                    {formatNumber(cost)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="glass editor-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                <div className="stats-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Zap size={16} className="info-glow" />
                                    Technology Templates
                                </div>
                                <div className="bonus-list" style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {Object.keys(LF_TEMPLATES).map(name => (
                                            <div key={name} style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className={`template-btn ${name.toLowerCase().replace(/ /g, '-')}`}
                                                    onClick={() => handleApplyLFTemplate(name)}
                                                    style={{ flex: 1 }}
                                                >
                                                    {name}
                                                </button>
                                                <button
                                                    className="template-btn global"
                                                    onClick={() => handleApplyTemplateGlobal(name)}
                                                    title="Apply to ALL planets"
                                                >
                                                    <Globe size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
                                            Select a template to quickly fill all 18 tech slots with recommended species. Save your setup after applying.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Save As Modal */}
            <AnimatePresence>
                {isSaveAsModalOpen && (
                    <div className="picker-overlay" onClick={() => { setIsSaveAsModalOpen(false); setOverwriteTarget(null); }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="tech-picker-modal mini"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="picker-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Save size={20} className="info-glow" />
                                    <div className="stats-title" style={{ margin: 0 }}>Save Planet Setup As...</div>
                                </div>
                                <button className="picker-close" onClick={() => { setIsSaveAsModalOpen(false); setOverwriteTarget(null); }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="picker-main-content vertical">
                                <AnimatePresence mode="wait">
                                    {overwriteTarget ? (
                                        <motion.div
                                            key="overwrite-confirm"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="overwrite-confirm-area"
                                        >
                                            <div className="overwrite-warning">
                                                <AlertTriangle size={32} className="warning-icon" />
                                                <div className="warning-text">
                                                    Overwrite setup <strong>"{overwriteTarget.name}"</strong>?
                                                </div>
                                            </div>
                                            <div className="overwrite-actions">
                                                <button className="confirm-overwrite-btn" onClick={confirmOverwrite}>
                                                    Overwrite <Check size={18} />
                                                </button>
                                                <button className="cancel-overwrite-btn" onClick={() => setOverwriteTarget(null)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="save-form"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                        >
                                            <div style={{ marginBottom: '20px' }}>
                                                <div className="details-label">New Setup Name</div>
                                                <input
                                                    type="text"
                                                    className="setup-name-input"
                                                    placeholder="e.g., Heavy Research Focus"
                                                    value={newSetupName}
                                                    onChange={e => setNewSetupName(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>

                                            {savedSetups && savedSetups.length > 0 && (
                                                <div style={{ marginBottom: '20px' }}>
                                                    <div className="details-label">Existing Setups (Click to Overwrite)</div>
                                                    <div className="saved-list">
                                                        {savedSetups.map(s => (
                                                            <div
                                                                key={s.id}
                                                                className="saved-item-name clickable"
                                                                onClick={() => handleSaveSetupAs(s.name)}
                                                            >
                                                                • {s.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                className="select-tech-confirm-btn"
                                                onClick={() => handleSaveSetupAs()}
                                                disabled={!newSetupName.trim()}
                                            >
                                                Save Setup <Check size={18} style={{ marginLeft: '8px' }} />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Load Modal */}
            <AnimatePresence>
                {isLoadModalOpen && (
                    <div className="picker-overlay" onClick={() => setIsLoadModalOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="tech-picker-modal mini"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="picker-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Download size={20} className="info-glow" />
                                    <div className="stats-title" style={{ margin: 0 }}>Load Planet Setup...</div>
                                </div>
                                <button className="picker-close" onClick={() => setIsLoadModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="picker-main-content vertical">
                                <div className="saved-list selectable">
                                    {savedSetups?.map(s => (
                                        <div key={s.id} className="saved-list-row">
                                            <div className="saved-item-info" onClick={() => handleLoadNamedSetup(s)}>
                                                <div className="saved-item-title">{s.name}</div>
                                                <div className="saved-item-meta">{new Date(s.lastUpdated).toLocaleDateString()} at {new Date(s.lastUpdated).toLocaleTimeString()}</div>
                                            </div>
                                            <button className="delete-setup-btn" onClick={() => s.id && handleDeleteNamedSetup(s.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!savedSetups || savedSetups.length === 0) && (
                                        <div className="no-empire-data" style={{ padding: '32px' }}>
                                            No saved setups found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Tech Picker Overlay */}
            <AnimatePresence>
                {isPickerOpen && pickerSlotIndex !== null && (
                    <div className="picker-overlay" onClick={() => setIsPickerOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="tech-picker-modal"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="picker-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Info size={20} className="info-glow" />
                                    <div className="stats-title" style={{ margin: 0 }}>Select Lifeform Technology</div>
                                </div>
                                <button className="picker-close" onClick={() => setIsPickerOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="picker-main-content">
                                <div className="picker-grid-section">
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                        Tier {Math.floor(pickerSlotIndex / 6) + 1} Slot {pickerSlotIndex + 1}
                                    </div>
                                    <div className="picker-grid">
                                        {[1, 2, 3, 4].map(lfId => {
                                            const techId = (pickerSlotIndex * 4) + lfId;
                                            const tech = LIFEFORM_TECH_DATA.find(t => t.id === techId);
                                            if (!tech) return null;
                                            const isActive = tempSelectedTechId === techId;
                                            return (
                                                <div
                                                    key={lfId}
                                                    className={`picker-item ${isActive ? 'active' : ''}`}
                                                    onClick={() => setTempSelectedTechId(techId)}
                                                >
                                                    <div className="picker-item-border" />
                                                    <img src={getIconPath(techId)} className="picker-img" alt="" />
                                                    <div className="picker-name">{tech.name}</div>
                                                    <div className="picker-species">
                                                        {['Human', 'Rock\'tal', 'Mecha', 'Kaelesh'][lfId - 1]}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="picker-details-section">
                                    {(() => {
                                        const tech = LIFEFORM_TECH_DATA.find(t => t.id === tempSelectedTechId);
                                        if (!tech) return null;
                                        return (
                                            <motion.div
                                                key={tempSelectedTechId}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="picker-details-card"
                                            >
                                                <div className="details-header">
                                                    <div className="details-title">{tech.name}</div>
                                                    <div className="details-subtitle">
                                                        {['Human', 'Rock\'tal', 'Mecha', 'Kaelesh'][tech.lifeformId - 1]} Technology
                                                    </div>
                                                </div>

                                                <div className="details-body">
                                                    <div className="details-label">Description</div>
                                                    <div className="details-desc">{tech.description}</div>

                                                    <div className="details-label" style={{ marginTop: '16px' }}>Bonuses</div>
                                                    <div className="details-bonuses vertical">
                                                        {getTechBonuses(tech, 1).map((b, i) => {
                                                            const affectedEntities = b.targets
                                                                .map(t => knowledgeMap[t.gameKnowledgeId])
                                                                .filter(Boolean);

                                                            return (
                                                                <div key={i} className="bonus-row">
                                                                    <div className="bonus-info-main">
                                                                        <div className="bonus-dot" />
                                                                        <span className="bonus-text">
                                                                            {b.name}: <span className="bonus-highlight">+{formatFloor2(b.value)}%</span> <span className="per-level-label">per level</span>
                                                                        </span>
                                                                    </div>
                                                                    {affectedEntities.length > 0 && (
                                                                        <div className="entity-info-group">
                                                                            <div className="info-icon-wrapper tooltip-trigger">
                                                                                <Info size={14} className="affected-info-icon" />
                                                                                <div className="premium-tooltip">
                                                                                    <div className="tooltip-header">Affected Entities</div>
                                                                                    <div className="tooltip-content">
                                                                                        {affectedEntities.map((name, idx) => (
                                                                                            <div key={idx} className="tooltip-item">• {name}</div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <div className="tooltip-overlay-arrow" />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {(!tech.target || tech.target.length === 0) && (
                                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>See individual breakdown for details.</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <button className="select-tech-confirm-btn" onClick={selectTechInPicker}>
                                                    Select Technology <Check size={18} style={{ marginLeft: '8px' }} />
                                                </button>
                                            </motion.div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {isBreakdownModalOpen && selectedBreakdownKey && (
                    <div className="picker-overlay" onClick={() => setIsBreakdownModalOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="tech-picker-modal breakdown-modal"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="picker-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <BarChart3 size={24} className="info-glow" />
                                    <div>
                                        <div className="stats-title" style={{ margin: 0, fontSize: '1rem' }}>
                                            {selectedBreakdownKey?.startsWith('PLANET_SUMMARY:')
                                                ? 'Lifeform Research Breakdown'
                                                : (selectedBreakdownKey?.startsWith('RESEARCH:') || selectedBreakdownKey?.startsWith('SHIP:'))
                                                    ? 'Detailed Bonus Breakdown'
                                                    : 'Empire Breakdown'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {(() => {
                                                if (selectedBreakdownKey?.startsWith('PLANET_SUMMARY:')) {
                                                    const pid = selectedBreakdownKey.split(':')[1];
                                                    const p = planets?.find(item => item.id === pid);
                                                    return `${p?.name} [${p?.coords}]`;
                                                }
                                                if (selectedBreakdownKey?.startsWith('RESEARCH:') || selectedBreakdownKey?.startsWith('SHIP:')) {
                                                    const [type, name, stat] = selectedBreakdownKey.split(':');
                                                    const icon = knowledgeIconMap[name];
                                                    return (
                                                        <>
                                                            {icon && <img src={icon} style={{ width: '16px', height: '16px', borderRadius: '2px' }} alt="" />}
                                                            {name} - {stat} {type === 'RESEARCH' ? 'Reduction' : 'Bonus'}
                                                        </>
                                                    );
                                                }
                                                return selectedBreakdownKey;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <button className="picker-close" onClick={() => setIsBreakdownModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="picker-main-content vertical" style={{ padding: '24px' }}>
                                <div className="breakdown-total-display glass">
                                    <div className="total-main">
                                        <span className="total-label">
                                            {selectedBreakdownKey?.startsWith('SHIP:')
                                                ? `${selectedBreakdownKey.split(':')[1]} - ${selectedBreakdownKey.split(':')[2]} Bonus`
                                                : selectedBreakdownKey?.startsWith('RESEARCH:')
                                                    ? `${selectedBreakdownKey.split(':')[1]} - ${selectedBreakdownKey.split(':')[2]} Reduction`
                                                    : selectedBreakdownKey?.startsWith('PLANET_SUMMARY:')
                                                        ? `${planets?.find(p => p.id === selectedBreakdownKey.split(':')[1])?.name} - LIFEFORM RESEARCH ${selectedBreakdownKey.split(':')[2].toUpperCase()} REDUCTION`
                                                        : 'Combined Bonus'
                                            }
                                        </span>
                                        <span className="total-value">
                                            +{formatFloor2(Number(
                                                selectedBreakdownKey?.startsWith('PLANET_SUMMARY:') ?
                                                    (() => {
                                                        const [_, pid, type] = selectedBreakdownKey.split(':');
                                                        const sData = (empireBonuses as any).planetResearches?.sandbox?.[pid] || { Cost: 0, Time: 0 };
                                                        const globalBonus = type === 'Time' ? ((empireBonuses as any).researches?.sandbox?.['Energy Technology']?.[type] || 0) : 0;
                                                        const total = sData[type as 'Cost' | 'Time'] + globalBonus;
                                                        return Math.min(total, type === 'Cost' ? 50 : 99);
                                                    })() :
                                                    (empireBonuses as { sandbox: Record<string, number> }).sandbox[selectedBreakdownKey!] ||
                                                    (empireBonuses as any).ships?.sandbox?.[selectedBreakdownKey!.split(':')[1]]?.[selectedBreakdownKey!.split(':')[2]] ||
                                                    (empireBonuses as any).researches?.sandbox?.[selectedBreakdownKey!.split(':')[1]]?.[selectedBreakdownKey!.split(':')[2]] ||
                                                    0
                                            ))}%
                                        </span>
                                    </div>
                                    <div className="total-bar-bg">
                                        <motion.div
                                            className="total-bar-fill"
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 1.5, ease: 'easeOut' }}
                                        />
                                    </div>
                                </div>

                                <div className="breakdown-list-container custom-scrollbar">
                                    {(empireBonusesBreakdown[selectedBreakdownKey!] || [])
                                        .filter(bp => bp.value > 0)
                                        .sort((a, b) => b.value - a.value)
                                        .map((bp, i) => {
                                            const totalForShare = Number(
                                                selectedBreakdownKey?.startsWith('PLANET_SUMMARY:') ?
                                                    (() => {
                                                        const [_, pid, type] = selectedBreakdownKey.split(':');
                                                        const sData = (empireBonuses as any).planetResearches?.sandbox?.[pid] || { Cost: 0, Time: 0 };
                                                        const globalBonus = type === 'Time' ? ((empireBonuses as any).researches?.sandbox?.['Energy Technology']?.[type] || 0) : 0;
                                                        return sData[type as 'Cost' | 'Time'] + globalBonus;
                                                    })() :
                                                    (empireBonuses as { sandbox: Record<string, number> }).sandbox[selectedBreakdownKey!] ||
                                                    (empireBonuses as any).ships?.sandbox?.[selectedBreakdownKey!.split(':')[1]]?.[selectedBreakdownKey!.split(':')[2]] ||
                                                    (empireBonuses as any).researches?.sandbox?.[selectedBreakdownKey!.split(':')[1]]?.[selectedBreakdownKey!.split(':')[2]] ||
                                                    1
                                            );

                                            return (
                                                <motion.div
                                                    key={i}
                                                    className="breakdown-planet-card glass"
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                >
                                                    <div className="planet-card-header">
                                                        <div className="planet-card-visual">
                                                            <img src={bp.imgUrl || '/icons/planets/dry-large.jpg'} className="planet-card-img" alt="" />
                                                        </div>
                                                        <div className="planet-card-info">
                                                            <span className="planet-card-name">{bp.planetName}</span>
                                                            <span className="planet-card-coords">{bp.coords === '0:0:0' ? 'Unknown' : (bp.coords === 'Global Bonus' ? bp.coords : `[${bp.coords}]`)}</span>
                                                        </div>
                                                        <div className="planet-card-value-group">
                                                            <div className="planet-card-calculation">
                                                                {bp.techValue > 0 ? (
                                                                    <>
                                                                        {formatFloor2(bp.techValue)}% <span className="calc-operator">×</span> (1 + {(bp.levelBonus / 100).toFixed(3)} <span style={{ opacity: 0.6 }}>lvl</span> + {(bp.buildingBonus / 100).toFixed(3)} <span style={{ opacity: 0.6 }}>bld</span>)
                                                                    </>
                                                                ) : (
                                                                    <span>{selectedBreakdownKey?.startsWith('PLANET_SUMMARY:') ? (bp as any).label : 'Base Building Bonus'}</span>
                                                                )}
                                                            </div>
                                                            <div className="planet-card-value">+{formatFloor2(bp.value)}%</div>
                                                        </div>
                                                    </div>
                                                    <div className="planet-card-progress">
                                                        <div className="planet-progress-bg">
                                                            <motion.div
                                                                className="planet-progress-fill"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(bp.value / totalForShare) * 100}%` }}
                                                                transition={{ duration: 1, delay: 0.3 + (i * 0.05) }}
                                                            />
                                                        </div>
                                                        <span className="planet-contribution-pct">
                                                            {Number(((bp.value || 0) / totalForShare) * 100).toFixed(1)}% share
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
                {isSyncModalOpen && (
                    <div className="picker-overlay" onClick={() => setIsSyncModalOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="tech-picker-modal sync-modal-v2"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="picker-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="sync-header-icon">
                                        <RefreshCw size={24} className="spinning" />
                                    </div>
                                    <div>
                                        <div className="stats-title" style={{ margin: 0 }}>Sync Lifeform Intelligence</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choose your synchronization method</div>
                                    </div>
                                </div>
                                <button className="picker-close" onClick={() => setIsSyncModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="sync-paths-container">
                                {/* Path 1: Empire Sync */}
                                <div className="sync-path-card empire-path">
                                    <div className="path-glow" />
                                    <div className="path-header">
                                        <div className="path-icon-wrapper zap">
                                            <Zap size={24} fill="currentColor" />
                                        </div>
                                        <div className="path-title-group">
                                            <div className="path-label">METHOD A</div>
                                            <div className="path-name">Fast Empire Sync</div>
                                        </div>
                                    </div>

                                    <div className="path-description">
                                        Sync all data across your entire empire in seconds.
                                    </div>
                                    <div className="path-steps vertical">
                                        <div className="path-step">
                                            <div className="step-circle">1</div>
                                            <div className="step-content">
                                                <div className="step-action">Visit Empire Page</div>
                                                <div className="step-hint">Open the in-game Empire view</div>
                                            </div>
                                        </div>

                                        <div className="path-step">
                                            <div className="step-circle">2</div>
                                            <div className="step-content">
                                                <div className="step-action">Double Scan</div>
                                                <div className="step-hint">Visit both Planet and Moon views</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Path 2: Full Manual Sync */}
                                <div className="sync-path-card manual-path">
                                    <div className="path-glow" />
                                    <div className="path-header">
                                        <div className="path-icon-wrapper target">
                                            <Target size={24} />
                                        </div>
                                        <div className="path-title-group">
                                            <div className="path-label">METHOD B</div>
                                            <div className="path-name">Lazy Sync</div>
                                        </div>
                                    </div>

                                    <div className="path-description">
                                        Detailed data synchronization whenever you go through any of the game pages.
                                    </div>

                                    <div className="path-steps vertical">
                                        <div className="path-step">
                                            <div className="step-circle">1</div>
                                            <div className="step-content">
                                                <div className="step-action">Visit Lifeform Page</div>
                                                <div className="step-hint">Updates building levels</div>
                                            </div>
                                        </div>
                                        <div className="path-step">
                                            <div className="step-circle">2</div>
                                            <div className="step-content">
                                                <div className="step-action">Visit Development</div>
                                                <div className="step-hint">Updates technologies & levels</div>
                                            </div>
                                        </div>
                                        <div className="path-step">
                                            <div className="step-circle">3</div>
                                            <div className="step-content">
                                                <div className="step-action">Resource Settings</div>
                                                <div className="step-hint">Go to Resource Settings page</div>
                                            </div>
                                        </div>
                                        <div className="path-step">
                                            <div className="step-circle">4</div>
                                            <div className="step-content">
                                                <div className="step-action">Player Bonuses</div>
                                                <div className="step-hint">Visit Lifeform Player Bonuses tab</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="sync-footer">
                                <button className="select-tech-confirm-btn" onClick={() => setIsSyncModalOpen(false)}>
                                    I Understand, Sync Now <ArrowRight size={18} style={{ marginLeft: '12px' }} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Lifeforms;
