import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Target,
    Trophy,
    Skull,
    TrendingUp,
    MapPin,
    BarChart3,
    History,
    Sword,
    Sword as SwordIcon,
    Flame,
    Box,
    Award,
    Zap,
    X,
    ExternalLink,
    ChevronRight,
    Circle,
    Search,
    ChevronLeft,
    Settings as SettingsIcon,
    ZoomIn,
    ZoomOut
} from 'lucide-react';
import { SHIP_DATA, RESEARCH_DATA, DEFENCE_DATA } from '../../db/staticData';

// --- Constants ---
const THEME_CRIMSON = '#ef4444';
const THEME_AMBER = '#f59e0b';
const THEME_CYAN = '#38bdf8';

const OUTCOME_COLORS = {
    attacker: '#22c55e', // Green for Attacker win (Account player win)
    defender: '#ef4444', // Red for Defender win (Account player loss)
    none: '#eab308',     // Yellow for Draw
};

const RESOURCE_COLORS = {
    metal: '#E6953C',
    crystal: '#4CAEE6',
    deuterium: '#43D159',
    food: '#EAB308',
    total: '#fff'
};

// --- Helpers ---
const toLocaleDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatYAxis = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1e12) return (value / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
    if (absValue >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (absValue >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (absValue >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return value.toString();
};

const Combat: React.FC = () => {
    const account = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const combatReports = useLiveQuery(
        () => account ? db.combatReports.where('playerId').equals(account.playerId).toArray() : [],
        [account]
    ) || [];

    // Load Combat Filter Settings
    const [filterMode, setFilterMode] = useState<'pvp' | 'pve' | 'all'>(() => {
        const saved = localStorage.getItem('og-nexus-combat-settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.filterMode !== undefined) {
                    return parsed.filterMode;
                }
            } catch (e) {
                console.error(e);
            }
        }
        return 'pvp'; // Default is PVP
    });

    // Save Settings helper
    const saveFilterMode = (mode: 'pvp' | 'pve' | 'all') => {
        setFilterMode(mode);
        try {
            const settingsObj = { filterMode: mode };
            localStorage.setItem('og-nexus-combat-settings', JSON.stringify(settingsObj));
            
            // Also sync to chrome.storage.local for consistency
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ combatSettings: settingsObj });
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Load from chrome.storage.local on mount
    useEffect(() => {
        const loadFromChrome = async () => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    const result = await chrome.storage.local.get('combatSettings');
                    if (result?.combatSettings?.filterMode !== undefined) {
                        setFilterMode(result.combatSettings.filterMode);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadFromChrome();
    }, []);

    // Filter reports based on active mode
    const filteredReports = useMemo(() => {
        return combatReports.filter(cr => {
            const isExp = cr.isExpedition || (cr.coords ? cr.coords.trim().endsWith(':16') : false);
            if (filterMode === 'pvp') return !isExp;
            if (filterMode === 'pve') return isExp;
            return true;
        });
    }, [combatReports, filterMode]);



    const settings = useLiveQuery(() => db.settings.get('conversion_rates'));
    const rates = settings || { metal: 3, crystal: 2, deuterium: 1 };

    // Multipliers for MSU: Metal base (1.0). Multiplier = MetalRate / OtherRate
    const mMultiplier = 1;
    const cMultiplier = rates.metal / rates.crystal;
    const dMultiplier = rates.metal / rates.deuterium;

    const playerName = account?.playerName || 'YOU';

    const getWinnerName = (cr: any) => {
        if (cr.winner === 'none') return 'NONE';
        if (cr.winner === 'attacker') return cr.attackerName || 'YOU';
        if (cr.winner === 'defender') {
            if (cr.isExpedition || cr.coords.trim().endsWith(':16')) {
                const defName = String(cr.defenderName || '').toLowerCase();
                if (cr.expeditionAttackType === 1 || defName.includes('pirat')) return 'Pirates';
                if (cr.expeditionAttackType === 2 || defName.includes('alien')) return 'Aliens';
                return 'Expedition Hostiles';
            }
            return cr.defenderName || 'Defender';
        }
        return cr.winner.toUpperCase();
    };

    const [activeTab, setActiveTab] = useState('overview');

    // Support deep-linking from Hotbar
    useEffect(() => {
        const checkPending = () => {
            const pending = sessionStorage.getItem('ognexus_target_subview');
            if (pending) {
                try {
                    const { view, tab } = JSON.parse(pending);
                    if (view === 'combat' && tab) {
                        setActiveTab(tab);
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
            if (detail && detail.view === 'combat' && detail.tab) {
                setActiveTab(detail.tab);
            }
        };
        window.addEventListener('ognexus_navigated', handleNav);
        return () => {
            window.removeEventListener('ognexus_navigated', handleNav);
        };
    }, []);

    // --- Zones / Galaxy Hotspots State ---
    const galaxiesCount = account?.galaxies || 9;
    const systemsCount = account?.systems || 499;

    const [activeGalaxy, setActiveGalaxy] = useState<number | null>(null);
    const [zoomRange, setZoomRange] = useState<[number, number]>([1, 499]);
    const [hoveredSystem, setHoveredSystem] = useState<number | null>(null);
    const [mouseCoords, setMouseCoords] = useState<{ x: number, y: number } | null>(null);
    const [selectedSystemForCombats, setSelectedSystemForCombats] = useState<number | null>(null);

    // Zooming and Panning states
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartRange, setDragStartRange] = useState<[number, number]>([1, 499]);
    const [isPinching, setIsPinching] = useState(false);
    const [pinchStartDist, setPinchStartDist] = useState(0);
    const [pinchStartRange, setPinchStartRange] = useState<[number, number]>([1, 499]);
    const [pinchMidPct, setPinchMidPct] = useState(0);

    const [containerWidth, setContainerWidth] = useState(800);
    const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null);

    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const containerRef = useCallback((node: HTMLDivElement | null) => {
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
            resizeObserverRef.current = null;
        }
        if (node) {
            setContainerWidth(node.getBoundingClientRect().width);
            const ro = new ResizeObserver(entries => {
                for (let entry of entries) {
                    setContainerWidth(entry.contentRect.width);
                }
            });
            ro.observe(node);
            resizeObserverRef.current = ro;
        }
    }, []);

    const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
        setCanvasNode(node);
    }, []);

    // Parse coordinates helper
    const parseCoords = (coordsStr?: string) => {
        if (!coordsStr) return null;
        const match = coordsStr.match(/(\d+):(\d+):(\d+)/);
        if (match) {
            return {
                galaxy: parseInt(match[1], 10),
                system: parseInt(match[2], 10),
                position: parseInt(match[3], 10)
            };
        }
        const match2 = coordsStr.match(/(\d+):(\d+)/);
        if (match2) {
            return {
                galaxy: parseInt(match2[1], 10),
                system: parseInt(match2[2], 10),
                position: 1
            };
        }
        return null;
    };

    // Auto-select the galaxy with the highest total combat profit/loot on load
    useEffect(() => {
        if (activeGalaxy !== null || combatReports.length === 0) return;
        
        const galaxyProfits: Record<number, number> = {};
        combatReports.forEach(cr => {
            const parsed = parseCoords(cr.coords);
            if (!parsed) return;
            const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
            const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);
            const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
            const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);
            const profit = lMSU + dMSU - (cr.attackerLosses || 0);
            
            galaxyProfits[parsed.galaxy] = (galaxyProfits[parsed.galaxy] || 0) + profit;
        });

        let bestGalaxy = 1;
        let highestProfit = -Infinity;
        Object.entries(galaxyProfits).forEach(([gStr, profit]) => {
            const g = parseInt(gStr, 10);
            if (profit > highestProfit) {
                highestProfit = profit;
                bestGalaxy = g;
            }
        });
        
        setActiveGalaxy(bestGalaxy);
    }, [combatReports, activeGalaxy, mMultiplier, cMultiplier, dMultiplier]);

    // Reset zoom when galaxy or systemsCount changes
    useEffect(() => {
        setZoomRange([1, systemsCount]);
    }, [systemsCount, activeGalaxy]);



    // Compute aggregated systems data for the active galaxy
    const systemData = useMemo(() => {
        const currentGal = activeGalaxy || 1;
        
        const systems = Array.from({ length: systemsCount }, (_, idx) => {
            const sysNum = idx + 1;
            return {
                system: sysNum,
                coords: `[${currentGal}:${sysNum}]`,
                profit: 0,
                battlesCount: 0,
                loot: 0,
                losses: 0,
            };
        });

        filteredReports.forEach(cr => {
            const parsed = parseCoords(cr.coords);
            if (!parsed || parsed.galaxy !== currentGal) return;
            if (parsed.system < 1 || parsed.system > systemsCount) return;

            const sysIdx = parsed.system - 1;
            const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
            const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);
            const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
            const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);
            const profit = lMSU + dMSU - (cr.attackerLosses || 0);

            systems[sysIdx].profit += profit;
            systems[sysIdx].battlesCount += 1;
            systems[sysIdx].loot += lMSU + dMSU;
            systems[sysIdx].losses += cr.attackerLosses || 0;
        });

        return systems;
    }, [filteredReports, activeGalaxy, systemsCount, mMultiplier, cMultiplier, dMultiplier]);

    const { maxProfit, maxLoss } = useMemo(() => {
        let maxP = 0;
        let maxL = 0;
        systemData.forEach(s => {
            if (s.profit > maxP) maxP = s.profit;
            if (s.profit < 0 && Math.abs(s.profit) > maxL) maxL = Math.abs(s.profit);
        });
        return { maxProfit: maxP || 1, maxLoss: maxL || 1 };
    }, [systemData]);

    const galaxyStats = useMemo(() => {
        let totalBattles = 0;
        let totalProfit = 0;
        let totalLosses = 0;
        let mostActiveSys = 1;
        let maxBattles = -1;

        systemData.forEach(s => {
            totalBattles += s.battlesCount;
            totalProfit += s.profit;
            totalLosses += s.losses;
            if (s.battlesCount > maxBattles) {
                maxBattles = s.battlesCount;
                mostActiveSys = s.system;
            }
        });

        return {
            totalBattles,
            totalProfit,
            totalLosses,
            mostActiveSystem: mostActiveSys,
            hasData: totalBattles > 0
        };
    }, [systemData]);

    const topHotspots = useMemo(() => {
        return [...systemData]
            .filter(s => s.battlesCount > 0)
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 5);
    }, [systemData]);

    const systemCombats = useMemo(() => {
        if (selectedSystemForCombats === null) return [];
        const currentGal = activeGalaxy || 1;
        return filteredReports.filter(cr => {
            const parsed = parseCoords(cr.coords);
            return parsed && parsed.galaxy === currentGal && parsed.system === selectedSystemForCombats;
        }).sort((a, b) => b.timestamp - a.timestamp);
    }, [filteredReports, selectedSystemForCombats, activeGalaxy]);

    // Zoom and Pan Handlers
    const handleZoomButton = (factor: number) => {
        const [start, end] = zoomRange;
        const currentSpan = end - start;
        const mid = start + currentSpan / 2;
        const newSpan = Math.max(8, Math.min(systemsCount, currentSpan * factor));
        
        let newStart = mid - newSpan / 2;
        let newEnd = mid + newSpan / 2;
        
        if (newStart < 1) {
            newEnd += (1 - newStart);
            newStart = 1;
        }
        if (newEnd > systemsCount) {
            newStart -= (newEnd - systemsCount);
            newEnd = systemsCount;
        }
        
        setZoomRange([Math.max(1, newStart), Math.min(systemsCount, newEnd)]);
    };

    // Non-passive wheel event listener for zooming
    useEffect(() => {
        const canvas = canvasNode;
        if (!canvas) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const pct = mouseX / rect.width;
            
            const [startSys, endSys] = zoomRange;
            const currentSpan = endSys - startSys;
            const mouseSystem = startSys + pct * currentSpan;
            
            const factor = e.deltaY < 0 ? 0.85 : 1.15;
            const newSpan = Math.max(8, Math.min(systemsCount, currentSpan * factor));
            
            let newStart = mouseSystem - pct * newSpan;
            let newEnd = mouseSystem + (1 - pct) * newSpan;
            
            if (newStart < 1) {
                newEnd += (1 - newStart);
                newStart = 1;
            }
            if (newEnd > systemsCount) {
                newStart -= (newEnd - systemsCount);
                newEnd = systemsCount;
            }
            
            setZoomRange([Math.max(1, newStart), Math.min(systemsCount, newEnd)]);
            
            const sysFloat = newStart + pct * newSpan;
            const sNum = Math.floor(sysFloat);
            if (sNum >= 1 && sNum <= systemsCount) {
                setHoveredSystem(sNum);
            }
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            canvas.removeEventListener('wheel', onWheel);
        };
    }, [canvasNode, zoomRange, systemsCount]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStartX(e.clientX);
        setDragStartRange([...zoomRange]);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const [startSys, endSys] = zoomRange;
        const visibleCount = endSys - startSys + 1;
        const pct = mouseX / rect.width;
        const sysFloat = startSys + pct * visibleCount;
        const sNum = Math.floor(sysFloat);

        if (sNum >= 1 && sNum <= systemsCount) {
            setHoveredSystem(sNum);
            setMouseCoords({ x: mouseX, y: mouseY });
        } else {
            setHoveredSystem(null);
            setMouseCoords(null);
        }

        if (isDragging) {
            const deltaX = e.clientX - dragStartX;
            const systemDelta = -(deltaX / rect.width) * (dragStartRange[1] - dragStartRange[0]);
            
            let newStart = dragStartRange[0] + systemDelta;
            let newEnd = dragStartRange[1] + systemDelta;
            
            if (newStart < 1) {
                newEnd += (1 - newStart);
                newStart = 1;
            }
            if (newEnd > systemsCount) {
                newStart -= (newEnd - systemsCount);
                newEnd = systemsCount;
            }
            
            setZoomRange([Math.max(1, newStart), Math.min(systemsCount, newEnd)]);
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(false);
        const dragDistance = Math.abs(e.clientX - dragStartX);
        if (dragDistance < 5) {
            if (hoveredSystem !== null) {
                setSelectedSystemForCombats(hoveredSystem);
            }
        }
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        setHoveredSystem(null);
        setMouseCoords(null);
    };

    const getTouchDist = (t1: React.Touch, t2: React.Touch) => {
        return Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2));
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStartX(e.touches[0].clientX);
            setDragStartRange([...zoomRange]);
            setIsPinching(false);
        } else if (e.touches.length === 2) {
            setIsDragging(false);
            setIsPinching(true);
            const dist = getTouchDist(e.touches[0], e.touches[1]);
            setPinchStartDist(dist);
            setPinchStartRange([...zoomRange]);
            
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            setPinchMidPct(midX / rect.width);
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if ((isDragging || isPinching) && e.cancelable) {
            e.preventDefault();
        }
        const rect = e.currentTarget.getBoundingClientRect();
        if (isDragging && e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - dragStartX;
            const systemDelta = -(deltaX / rect.width) * (dragStartRange[1] - dragStartRange[0]);
            
            let newStart = dragStartRange[0] + systemDelta;
            let newEnd = dragStartRange[1] + systemDelta;
            
            if (newStart < 1) {
                newEnd += (1 - newStart);
                newStart = 1;
            }
            if (newEnd > systemsCount) {
                newStart -= (newEnd - systemsCount);
                newEnd = systemsCount;
            }
            
            setZoomRange([Math.max(1, newStart), Math.min(systemsCount, newEnd)]);
        } else if (isPinching && e.touches.length === 2) {
            const dist = getTouchDist(e.touches[0], e.touches[1]);
            if (dist === 0 || pinchStartDist === 0) return;
            
            const factor = pinchStartDist / dist;
            const currentSpan = pinchStartRange[1] - pinchStartRange[0];
            const newSpan = Math.max(8, Math.min(systemsCount, currentSpan * factor));
            
            const mouseSystem = pinchStartRange[0] + pinchMidPct * currentSpan;
            let newStart = mouseSystem - pinchMidPct * newSpan;
            let newEnd = mouseSystem + (1 - pinchMidPct) * newSpan;
            
            if (newStart < 1) {
                newEnd += (1 - newStart);
                newStart = 1;
            }
            if (newEnd > systemsCount) {
                newStart -= (newEnd - systemsCount);
                newEnd = systemsCount;
            }
            
            setZoomRange([Math.max(1, newStart), Math.min(systemsCount, newEnd)]);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        setIsDragging(false);
        setIsPinching(false);
        if (e.changedTouches && e.changedTouches.length === 1) {
            const touchDistance = Math.abs(e.changedTouches[0].clientX - dragStartX);
            if (touchDistance < 10) {
                if (hoveredSystem !== null) {
                    setSelectedSystemForCombats(hoveredSystem);
                }
            }
        }
    };

    const focusSystem = (sysNum: number) => {
        setHoveredSystem(sysNum);
        let start = sysNum - 15;
        let end = sysNum + 15;
        if (start < 1) {
            end += (1 - start);
            start = 1;
        }
        if (end > systemsCount) {
            start -= (end - systemsCount);
            end = systemsCount;
        }
        setZoomRange([Math.max(1, start), Math.min(systemsCount, end)]);
    };

    // Canvas drawing effect
    useEffect(() => {
        const canvas = canvasNode;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const logicalHeight = 140;
        const targetWidth = Math.floor(containerWidth * dpr);
        const targetHeight = Math.floor(logicalHeight * dpr);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            canvas.style.width = `${containerWidth}px`;
            canvas.style.height = `${logicalHeight}px`;
        }

        // Reset transform scale to support high-DPI crisp rendering
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, containerWidth, logicalHeight);

        const [startSys, endSys] = zoomRange;
        const visibleCount = endSys - startSys + 1;
        const barHeight = logicalHeight;

        // Draw system hotspot bars
        for (let idx = 0; idx < systemsCount; idx++) {
            const sNum = idx + 1;
            if (sNum < Math.floor(startSys) - 1 || sNum > Math.ceil(endSys) + 1) continue;

            const xStart = ((sNum - startSys) / visibleCount) * containerWidth;
            const xEnd = ((sNum + 1 - startSys) / visibleCount) * containerWidth;
            const w = xEnd - xStart;

            const data = systemData[idx];
            let color = 'rgba(255, 255, 255, 0.05)';
            let h = 2; // neutral system baseline

            if (data.profit > 0) {
                const ratio = data.profit / maxProfit;
                const opacity = 0.15 + 0.85 * Math.min(1, Math.max(0, ratio));
                color = `rgba(245, 158, 11, ${opacity})`;
                h = (0.2 + 0.8 * Math.min(1, ratio)) * barHeight;
            } else if (data.profit < 0) {
                color = THEME_CRIMSON;
                const ratio = Math.abs(data.profit) / maxLoss;
                h = (0.2 + 0.8 * Math.min(1, ratio)) * barHeight;
            }

            ctx.fillStyle = color;
            const gap = w > 3 ? 1 : 0;
            const drawW = Math.max(0.5, w - gap);
            const drawY = barHeight - h;
            ctx.fillRect(xStart, drawY, drawW, h);

            if (hoveredSystem === sNum) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillRect(xStart, drawY, drawW, h);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1;
                ctx.strokeRect(xStart, drawY, drawW, h);
            }
        }
    }, [systemData, zoomRange, hoveredSystem, containerWidth, systemsCount, canvasNode, maxProfit, maxLoss]);

    const ticks = useMemo(() => {
        const [startSys, endSys] = zoomRange;
        const visibleCount = endSys - startSys + 1;
        
        const getTickStep = (count: number) => {
            if (count <= 15) return 1;
            if (count <= 30) return 2;
            if (count <= 75) return 5;
            if (count <= 150) return 10;
            if (count <= 300) return 25;
            if (count <= 600) return 50;
            return 100;
        };

        const step = getTickStep(visibleCount);
        const firstTick = Math.ceil(startSys / step) * step;
        
        const list = [];
        for (let sNum = firstTick; sNum <= endSys; sNum += step) {
            list.push(sNum);
        }
        return list;
    }, [zoomRange]);

    const [selectedReport, setSelectedReport] = useState<any>(null);

    // --- Pagination & Filtering ---
    const [currentPage, setCurrentPage] = useState(1);
    const [filterText, setFilterText] = useState('');
    const itemsPerPage = 10;

    const [historyPage, setHistoryPage] = useState(1);
    const historyItemsPerPage = 50;

    // Reset history page when filter mode or active tab changes
    useEffect(() => {
        setHistoryPage(1);
    }, [filterMode, activeTab]);

    const sortedHistory = useMemo(() => {
        return [...filteredReports].sort((a, b) => b.timestamp - a.timestamp);
    }, [filteredReports]);

    const { paginatedHistory, totalHistoryPages } = useMemo(() => {
        const count = sortedHistory.length;
        const pages = Math.ceil(count / historyItemsPerPage);
        const start = (historyPage - 1) * historyItemsPerPage;
        const items = sortedHistory.slice(start, start + historyItemsPerPage);
        
        return { paginatedHistory: items, totalHistoryPages: pages };
    }, [sortedHistory, historyPage]);

    const { paginatedList, totalPages, totalItems } = useMemo(() => {
        let filtered = [...filteredReports].sort((a, b) => b.timestamp - a.timestamp);
        
        if (filterText) {
            const lowFilter = filterText.toLowerCase();
            filtered = filtered.filter(cr => 
                (cr.attackerName?.toLowerCase().includes(lowFilter)) || 
                (cr.defenderName?.toLowerCase().includes(lowFilter))
            );
        }
        
        const count = filtered.length;
        const pages = Math.ceil(count / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const items = filtered.slice(start, start + itemsPerPage);
        
        return { paginatedList: items, totalPages: pages, totalItems: count };
    }, [filteredReports, filterText, currentPage]);

    // Reset page on filter change
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterText(e.target.value);
        setCurrentPage(1);
    };

    // --- Statistics ---
    const stats = useMemo(() => {
        const total = filteredReports.length;
        if (total === 0) return null;

        let wins = 0;
        let losses = 0;
        let draws = 0;
        let totalLootMSU = 0;
        let totalDebrisMSU = 0;
        let totalAttackerLosses = 0;
        let totalDefenderLosses = 0;
        let totalHonor = 0;
        let moons = 0;

        filteredReports.forEach(cr => {
            if (cr.winner === 'attacker') wins++;
            else if (cr.winner === 'defender') losses++;
            else draws++;

            const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
            const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);
            totalLootMSU += lMSU;

            const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
            const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);
            totalDebrisMSU += dMSU;

            totalAttackerLosses += cr.attackerLosses || 0;
            totalDefenderLosses += cr.defenderLosses || 0;
            totalHonor += cr.honor || 0;
            if (cr.moonChance && cr.moonChance > 0) {
                // We don't necessarily know if it was created from the scraper yet, but we have the chance
            }
        });

        const winRate = ((wins / total) * 100).toFixed(1);
        const profit = totalLootMSU + totalDebrisMSU - totalAttackerLosses;

        return {
            total, wins, losses, draws, winRate,
            totalLootMSU, totalDebrisMSU, totalAttackerLosses, totalDefenderLosses,
            totalHonor, profit
        };
    }, [filteredReports, mMultiplier, cMultiplier, dMultiplier]);

    // --- Chart Data ---
    const outcomesPieData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'Wins', value: stats.wins, color: OUTCOME_COLORS.attacker },
            { name: 'Losses', value: stats.losses, color: OUTCOME_COLORS.defender },
            { name: 'Draws', value: stats.draws, color: OUTCOME_COLORS.none },
        ];
    }, [stats]);

    const msuOverTimeData = useMemo(() => {
        const dataMap: Record<string, { attacker: number, defender: number, profit: number }> = {};
        filteredReports.forEach(cr => {
            const dateKey = toLocaleDateKey(new Date(cr.timestamp * 1000));
            if (!dataMap[dateKey]) dataMap[dateKey] = { attacker: 0, defender: 0, profit: 0 };
            
            dataMap[dateKey].attacker += cr.attackerLosses || 0;
            dataMap[dateKey].defender += cr.defenderLosses || 0;
            
            const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
            const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);
            const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
            const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);
            
            dataMap[dateKey].profit += (lMSU + dMSU - (cr.attackerLosses || 0));
        });

        const results = [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 14);
        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            const key = toLocaleDateKey(d);
            results.push({
                date: key,
                displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
                ...(dataMap[key] || { attacker: 0, defender: 0, profit: 0 })
            });
        }
        return results;
    }, [filteredReports, mMultiplier, cMultiplier, dMultiplier]);

    const zoneActivity = useMemo(() => {
        const zones: Record<string, number> = {};
        filteredReports.forEach(cr => {
            const match = cr.coords.match(/(\d+):(\d+)/);
            if (match) {
                const zone = `${match[1]}:${match[2]}`;
                zones[zone] = (zones[zone] || 0) + 1;
            }
        });
        return Object.entries(zones)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [filteredReports]);

    const recentCombats = paginatedList;

    if (combatReports.length === 0) {
        return (
            <div className="view">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Flame size={32} color={THEME_CRIMSON} />
                    <h1>Combat Command</h1>
                </div>
                <div className="glass" style={{ padding: '60px', textAlign: 'center', marginTop: '32px' }}>
                    <Sword size={64} color="rgba(255,255,255,0.1)" style={{ marginBottom: '24px' }} />
                    <div style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>No Combat Data Detected</div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '400px', margin: '0 auto' }}>
                        Engage hostile fleets or defensive installations to populate your tactical database.
                    </p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="view">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Flame size={32} color={THEME_CRIMSON} />
                            <h1 style={{ margin: 0 }}>Combat Command</h1>
                        </div>
                        {/* 3-way Sleek Segmented Switch */}
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {[
                                { id: 'pvp', label: 'PVP' },
                                { id: 'pve', label: 'PVE' },
                                { id: 'all', label: 'All' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => saveFilterMode(opt.id as 'pvp' | 'pve' | 'all')}
                                    style={{
                                        background: filterMode === opt.id ? THEME_CRIMSON : 'transparent',
                                        color: filterMode === opt.id ? '#000' : 'rgba(255,255,255,0.6)',
                                        border: 'none',
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease-in-out',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                    onMouseEnter={e => {
                                        if (filterMode !== opt.id) {
                                            e.currentTarget.style.color = '#fff';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (filterMode !== opt.id) {
                                            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                        }
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Empty filter message */}
                <div className="glass" style={{ padding: '60px', textAlign: 'center', marginTop: '32px' }}>
                    <Sword size={64} color="rgba(255,255,255,0.1)" style={{ marginBottom: '24px' }} />
                    <div style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>No Combats Match Selection</div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
                        No recorded combat logs match the active filter: <strong style={{ color: THEME_CRIMSON }}>{filterMode.toUpperCase()}</strong>.
                        <br />
                        Adjust your filter preferences at the top left of the page.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="view">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Flame size={32} color={THEME_CRIMSON} />
                        <h1 style={{ margin: 0 }}>Combat Command</h1>
                    </div>
                    {/* 3-way Sleek Segmented Switch */}
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {[
                            { id: 'pvp', label: 'PVP' },
                            { id: 'pve', label: 'PVE' },
                            { id: 'all', label: 'All' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => saveFilterMode(opt.id as 'pvp' | 'pve' | 'all')}
                                style={{
                                    background: filterMode === opt.id ? THEME_CRIMSON : 'transparent',
                                    color: filterMode === opt.id ? '#000' : 'rgba(255,255,255,0.6)',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease-in-out',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                                onMouseEnter={e => {
                                    if (filterMode !== opt.id) {
                                        e.currentTarget.style.color = '#fff';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (filterMode !== opt.id) {
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                    }
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {['overview', 'resources', 'zones', 'history'].map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`tab-btn ${activeTab === t ? 'active' : ''}`}
                            style={{
                                background: activeTab === t ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activeTab === t ? THEME_CRIMSON : 'rgba(255,255,255,0.1)',
                                color: activeTab === t ? '#fff' : 'rgba(255,255,255,0.5)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                            <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                                    <Sword size={80} />
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Engagements</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total}</div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', fontSize: '0.75rem' }}>
                                    <span style={{ color: OUTCOME_COLORS.attacker }}>{stats.wins} Wins</span>
                                    <span style={{ color: OUTCOME_COLORS.defender }}>{stats.losses} Losses</span>
                                    <span style={{ color: OUTCOME_COLORS.none }}>{stats.draws} Draws</span>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '24px', borderLeft: `4px solid ${THEME_AMBER}` }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Win Rate</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: THEME_AMBER }}>{stats.winRate}%</div>
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                        <div style={{ width: `${stats.winRate}%`, height: '100%', background: THEME_AMBER, borderRadius: '2px' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Profit (MSU)</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: stats.profit >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {stats.profit >= 0 ? '+' : ''}{formatYAxis(stats.profit)}
                                </div>
                                <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                    Revenue - Attacker Losses
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Honor Rank Impact</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: THEME_CYAN }}>
                                    {stats.totalHonor >= 0 ? '+' : ''}{stats.totalHonor.toLocaleString()}
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <Award size={16} color={THEME_CYAN} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Tactical Merit accumulated</span>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '32px' }}>
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Target size={18} color={THEME_CRIMSON} />
                                    Mission Success Rate
                                </div>
                                <div style={{ height: '240px' }}>
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <PieChart>
                                            <Pie
                                                data={outcomesPieData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {outcomesPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ background: 'rgba(10, 15, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                itemStyle={{ fontSize: '0.8rem', fontWeight: 700 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                                    {outcomesPieData.map(d => (
                                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color }} />
                                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={18} color={THEME_AMBER} />
                                    MSU Performance Registry
                                </div>
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <AreaChart data={msuOverTimeData}>
                                            <defs>
                                                <linearGradient id="colorAttacker" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={OUTCOME_COLORS.defender} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={OUTCOME_COLORS.defender} stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis
                                                dataKey="displayDate"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                                tickFormatter={formatYAxis}
                                            />
                                            <Tooltip
                                                contentStyle={{ background: 'rgba(10, 15, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                labelStyle={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}
                                                itemStyle={{ fontSize: '0.8rem' }}
                                            />
                                            <Area type="monotone" name="Losses (MSU)" dataKey="attacker" stroke={OUTCOME_COLORS.defender} fillOpacity={1} fill="url(#colorAttacker)" />
                                            <Area type="monotone" name="Profit (MSU)" dataKey="profit" stroke="#22c55e" fillOpacity={1} fill="url(#colorProfit)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Galaxy Tabs Navigation */}
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px', scrollbarWidth: 'thin' }}>
                            {Array.from({ length: galaxiesCount }, (_, i) => i + 1).map(g => (
                                <button
                                    key={g}
                                    onClick={() => setActiveGalaxy(g)}
                                    className={`tab-btn ${(activeGalaxy || 1) === g ? 'active' : ''}`}
                                    style={{
                                        background: (activeGalaxy || 1) === g ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: (activeGalaxy || 1) === g ? THEME_AMBER : 'rgba(255,255,255,0.1)',
                                        color: (activeGalaxy || 1) === g ? '#fff' : 'rgba(255,255,255,0.5)',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    Galaxy {g}
                                </button>
                            ))}
                        </div>

                        {/* Interactive Heatmap Card */}
                        <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                                <div 
                                    onClick={() => setActiveTab('zones')}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={e => {
                                        const text = e.currentTarget.querySelector('.heatmap-header-text') as HTMLElement;
                                        if (text) text.style.color = THEME_AMBER;
                                    }}
                                    onMouseLeave={e => {
                                        const text = e.currentTarget.querySelector('.heatmap-header-text') as HTMLElement;
                                        if (text) text.style.color = '#fff';
                                    }}
                                >
                                    <MapPin size={20} color={THEME_AMBER} />
                                    <span className="heatmap-header-text" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s' }}>
                                        Stellar Hotspots Heatmap
                                        <ChevronRight size={16} style={{ opacity: 0.6 }} />
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                    Viewing Systems: <strong style={{ color: THEME_AMBER }}>{Math.round(zoomRange[0])}</strong> - <strong style={{ color: THEME_AMBER }}>{Math.round(zoomRange[1])}</strong> of <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{systemsCount}</strong>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        onClick={() => handleZoomButton(0.7)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 700
                                        }}
                                        className="tab-btn"
                                    >
                                        <ZoomIn size={14} /> Zoom In
                                    </button>
                                    <button
                                        onClick={() => handleZoomButton(1.3)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 700
                                        }}
                                        className="tab-btn"
                                    >
                                        <ZoomOut size={14} /> Zoom Out
                                    </button>
                                    <button
                                        onClick={() => setZoomRange([1, systemsCount])}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            fontWeight: 700
                                        }}
                                        className="tab-btn"
                                    >
                                        Reset View
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('zones')}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontWeight: 700,
                                            transition: 'all 0.2s',
                                            marginLeft: '8px'
                                        }}
                                        className="tab-btn"
                                    >
                                        Detailed Zones <ExternalLink size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Wrapper */}
                            <div 
                                ref={containerRef}
                                style={{
                                    position: 'relative',
                                    background: 'rgba(0,0,0,0.5)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    padding: '6px',
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                    overflow: 'hidden',
                                    height: '178px',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none'
                                }}
                            >
                                {/* HTML Coordinates Ruler */}
                                <div style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: '24px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                                    marginBottom: '4px'
                                }}>
                                    {ticks.map(sNum => {
                                        const [startSys, endSys] = zoomRange;
                                        const visibleCount = endSys - startSys + 1;
                                        const pct = ((sNum - startSys + 0.5) / visibleCount) * 100;
                                        
                                        return (
                                            <div
                                                key={sNum}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${pct}%`,
                                                    transform: 'translateX(-50%)',
                                                    top: '0px',
                                                    fontSize: '9px',
                                                    fontFamily: 'monospace',
                                                    color: hoveredSystem === sNum ? THEME_AMBER : 'rgba(255, 255, 255, 0.4)',
                                                    fontWeight: hoveredSystem === sNum ? 'bold' : 'normal',
                                                    pointerEvents: 'none',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    transition: 'color 0.1s ease'
                                                }}
                                            >
                                                <span>{sNum}</span>
                                                <div style={{
                                                    width: '1px',
                                                    height: '5px',
                                                    background: hoveredSystem === sNum ? THEME_AMBER : 'rgba(255, 255, 255, 0.25)',
                                                    marginTop: '2px'
                                                }} />
                                            </div>
                                        );
                                    })}
                                </div>

                                <canvas
                                    ref={canvasRef}
                                    width={containerWidth}
                                    height={140}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseLeave}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    style={{ display: 'block', width: '100%', height: '140px' }}
                                />

                                {/* Interactive HTML Tooltip */}
                                {hoveredSystem !== null && mouseCoords !== null && (
                                    (() => {
                                        const data = systemData[hoveredSystem - 1];
                                        if (!data) return null;
                                        
                                        const tooltipX = mouseCoords.x + 220 > containerWidth ? mouseCoords.x - 230 : mouseCoords.x + 20;
                                        const tooltipY = Math.max(10, mouseCoords.y - 50);
                                        const isLoss = data.profit < 0;
                                        const isWin = data.profit > 0;
                                        const borderCol = isWin ? THEME_AMBER : (isLoss ? THEME_CRIMSON : 'rgba(255,255,255,0.2)');

                                        return (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: `${tooltipX}px`,
                                                    top: `${tooltipY}px`,
                                                    background: 'rgba(10, 15, 20, 0.95)',
                                                    backdropFilter: 'blur(8px)',
                                                    border: `1px solid ${borderCol}`,
                                                    borderRadius: '10px',
                                                    padding: '12px',
                                                    width: '200px',
                                                    pointerEvents: 'none',
                                                    zIndex: 10,
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                                                }}
                                            >
                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Stellar System</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
                                                    {data.coords}
                                                </div>
                                                
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                                                    <span style={{ opacity: 0.6 }}>Combats Fought:</span>
                                                    <span style={{ fontWeight: 800 }}>{data.battlesCount}</span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                                                    <span style={{ opacity: 0.6 }}>Total Yield:</span>
                                                    <span style={{ fontWeight: 800, color: '#fff' }}>{formatYAxis(data.loot)} MSU</span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                                                    <span style={{ opacity: 0.6 }}>Losses Sustained:</span>
                                                    <span style={{ fontWeight: 800, color: THEME_CRIMSON }}>{formatYAxis(data.losses)} MSU</span>
                                                </div>

                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Net Profit:</span>
                                                    <span style={{ color: isWin ? '#22c55e' : (isLoss ? THEME_CRIMSON : '#fff') }}>
                                                        {isWin ? '+' : ''}{formatYAxis(data.profit)} MSU
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            {/* Heatmap Legend */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', background: THEME_CRIMSON, borderRadius: '2px' }} />
                                    <span>Negative Net Yield (Losses)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '2px' }} />
                                    <span>No recorded combat logs</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '36px', height: '12px', background: `linear-gradient(to right, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 1))`, borderRadius: '2px' }} />
                                    <span>Positive Net Yield (Profit Scale)</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent & Zones Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                        <History size={18} color={THEME_CYAN} />
                                        Combat Log
                                    </div>
                                    <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, color: THEME_CYAN }} />
                                        <input 
                                            type="text" 
                                            value={filterText}
                                            onChange={handleFilterChange}
                                            placeholder="Filter by name..."
                                            title="filter by attacker/defender name"
                                            style={{
                                                width: '100%',
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '20px',
                                                padding: '10px 16px 10px 44px',
                                                fontSize: '0.8rem',
                                                color: '#fff',
                                                outline: 'none',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                            }}
                                            onFocus={e => {
                                                e.currentTarget.style.borderColor = THEME_CYAN;
                                                e.currentTarget.style.boxShadow = `0 0 15px ${THEME_CYAN}30, inset 0 2px 4px rgba(0,0,0,0.2)`;
                                            }}
                                            onBlur={e => {
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                                e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.75rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', opacity: 0.5 }}>
                                                <th style={{ padding: '12px 0', fontWeight: 700 }}>COORD/TIME</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700 }}>ATTACKER</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'center' }}>VS</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700 }}>DEFENDER</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700 }}>WINNER</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'right' }}>LOOT MSU</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'right' }}>DEBRIS MSU</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentCombats.map((cr, idx) => {
                                                const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
                                                const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
                                                const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);

                                                const winnerName = getWinnerName(cr);
                                                const isAccountWin = (cr.winner === 'attacker' && cr.attackerName === playerName) ||
                                                                    (cr.winner === 'defender' && cr.defenderName === playerName);
                                                const isTie = cr.winner === 'none';
                                                
                                                const statusColor = isAccountWin ? '#22c55e' : (isTie ? '#eab308' : '#ef4444');
                                                const rowBg = isAccountWin ? 'rgba(34, 197, 94, 0.03)' : (isTie ? 'rgba(234, 179, 8, 0.03)' : 'rgba(239, 68, 68, 0.03)');
                                                const prefix = isAccountWin ? '+' : (isTie ? '' : '-');

                                                const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);

                                                return (
                                                    <tr key={idx} 
                                                        onClick={() => setSelectedReport(cr)}
                                                        style={{ 
                                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                            background: rowBg,
                                                            transition: 'all 0.2s',
                                                            cursor: 'pointer'
                                                        }}
                                                        className="combat-row-hover"
                                                    >
                                                        <td style={{ padding: '10px 0' }}>
                                                            <div style={{ fontWeight: 800 }}>{cr.coords}</div>
                                                            <div style={{ fontSize: '0.65rem', opacity: 0.4 }}>{new Date(cr.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </td>
                                                        <td style={{ padding: '10px 8px' }}>
                                                            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }} title={cr.attackerName}>
                                                                {cr.attackerName || 'Unknown'}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                            <SwordIcon size={12} style={{ opacity: 0.3 }} />
                                                        </td>
                                                        <td style={{ padding: '10px 8px' }}>
                                                            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }} title={cr.defenderName}>
                                                                {cr.defenderName || 'Unknown'}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 8px' }}>
                                                            <span style={{ color: statusColor, fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                                                {getWinnerName(cr)}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                                            <div style={{ color: statusColor, fontWeight: 700 }}>
                                                                {prefix}{formatYAxis(lMSU)}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, opacity: 0.8 }}>
                                                            {formatYAxis(dMSU)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination Controls */}
                                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', opacity: 0.8 }}>
                                    <div style={{ opacity: 0.5 }}>
                                        Showing {recentCombats.length} of {totalItems} reports
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                cursor: currentPage === 1 ? 'default' : 'pointer',
                                                opacity: currentPage === 1 ? 0.3 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <ChevronLeft size={14} />
                                            Prev
                                        </button>
                                        <span style={{ fontWeight: 700 }}>
                                            Page {currentPage} of {totalPages || 1}
                                        </span>
                                        <button 
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                cursor: currentPage >= totalPages ? 'default' : 'pointer',
                                                opacity: currentPage >= totalPages ? 0.3 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            Next
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                        </div>

                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={18} color={THEME_AMBER} />
                                    Tactical Hotspots
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {zoneActivity.map(([zone, count], idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                color: THEME_AMBER,
                                                width: '24px',
                                                height: '24px',
                                                border: `1px solid ${THEME_AMBER}`,
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flexGrow: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Galaxy {zone}</span>
                                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{count} Ops</span>
                                                </div>
                                                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                                    <div style={{
                                                        width: `${(count / stats.total) * 100}%`,
                                                        height: '100%',
                                                        background: `linear-gradient(to right, ${THEME_AMBER}, ${THEME_CRIMSON})`,
                                                        borderRadius: '2px'
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(245, 158, 11, 0.05)', border: `1px dashed ${THEME_AMBER}40`, borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <Shield size={24} color={THEME_AMBER} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: THEME_AMBER, marginBottom: '4px' }}>Strategic Recommendation</div>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                                                    High concentration of activity detected in {zoneActivity[0]?.[0] || 'designated sectors'}. 
                                                    Allocate recyclers for debris field collection in these hotspots to maximize recovery.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'resources' && (
                    <motion.div
                        key="resources"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card"
                        style={{ padding: '32px' }}
                    >
                         <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Box size={24} color={THEME_CYAN} />
                            Logistics & Recovery Breakdown
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                            <div>
                                <h3 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>Direct Loot Seized</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {['metal', 'crystal', 'deuterium'].map(r => {
                                        const val = filteredReports.reduce((sum, cr) => sum + (cr.loot?.[r as keyof typeof cr.loot] || 0), 0);
                                        return (
                                            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: RESOURCE_COLORS[r as keyof typeof RESOURCE_COLORS] }} />
                                                </div>
                                                <div style={{ flexGrow: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize' }}>{r}</span>
                                                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{val.toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                                        Contribution to total payload: {((val * (r === 'metal' ? mMultiplier : r === 'crystal' ? cMultiplier : dMultiplier)) / stats.totalLootMSU * 100 || 0).toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>Debris Field Generation</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {['metal', 'crystal', 'deuterium'].map(r => {
                                        const val = filteredReports.reduce((sum, cr) => sum + (cr.debris?.[r as keyof typeof cr.debris] || 0), 0);
                                        return (
                                            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: RESOURCE_COLORS[r as keyof typeof RESOURCE_COLORS], opacity: 0.6 }} />
                                                </div>
                                                <div style={{ flexGrow: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize' }}>{r}</span>
                                                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{val.toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                                        Theoretical maximum recovery
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '40px', display: 'flex', gap: '24px' }}>
                             <div style={{ flexGrow: 1, padding: '24px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', marginBottom: '12px' }}>Revenue Yield</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{formatYAxis(stats.totalLootMSU + stats.totalDebrisMSU)} MSU</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>Combined Loot and Debris</div>
                             </div>
                             <div style={{ flexGrow: 1, padding: '24px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '12px' }}>Operation Costs</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{formatYAxis(stats.totalAttackerLosses)} MSU</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>Total Fleet Losses (Attacker)</div>
                             </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'zones' && (
                    <motion.div
                        key="zones"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Galaxy Tabs Navigation */}
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px', scrollbarWidth: 'thin' }}>
                            {Array.from({ length: galaxiesCount }, (_, i) => i + 1).map(g => (
                                <button
                                    key={g}
                                    onClick={() => setActiveGalaxy(g)}
                                    className={`tab-btn ${(activeGalaxy || 1) === g ? 'active' : ''}`}
                                    style={{
                                        background: (activeGalaxy || 1) === g ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: (activeGalaxy || 1) === g ? THEME_AMBER : 'rgba(255,255,255,0.1)',
                                        color: (activeGalaxy || 1) === g ? '#fff' : 'rgba(255,255,255,0.5)',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    Galaxy {g}
                                </button>
                            ))}
                        </div>

                        {/* Interactive Heatmap Card */}
                        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={20} color={THEME_AMBER} />
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Stellar Hotspots Heatmap</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                    Viewing Systems: <strong style={{ color: THEME_AMBER }}>{Math.round(zoomRange[0])}</strong> - <strong style={{ color: THEME_AMBER }}>{Math.round(zoomRange[1])}</strong> of <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{systemsCount}</strong>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleZoomButton(0.7)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 700
                                        }}
                                        className="tab-btn"
                                    >
                                        <ZoomIn size={14} /> Zoom In
                                    </button>
                                    <button
                                        onClick={() => handleZoomButton(1.3)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 700
                                        }}
                                        className="tab-btn"
                                    >
                                        <ZoomOut size={14} /> Zoom Out
                                    </button>
                                    <button
                                        onClick={() => setZoomRange([1, systemsCount])}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            fontWeight: 700
                                        }}
                                        className="tab-btn"
                                    >
                                        Reset View
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Wrapper */}
                            <div 
                                ref={containerRef}
                                style={{
                                    position: 'relative',
                                    background: 'rgba(0,0,0,0.5)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    padding: '6px',
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                    overflow: 'hidden',
                                    height: '178px',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none'
                                }}
                            >
                                {/* HTML Coordinates Ruler */}
                                <div style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: '24px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                                    marginBottom: '4px'
                                }}>
                                    {ticks.map(sNum => {
                                        const [startSys, endSys] = zoomRange;
                                        const visibleCount = endSys - startSys + 1;
                                        const pct = ((sNum - startSys + 0.5) / visibleCount) * 100;
                                        
                                        return (
                                            <div
                                                key={sNum}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${pct}%`,
                                                    transform: 'translateX(-50%)',
                                                    top: '0px',
                                                    fontSize: '9px',
                                                    fontFamily: 'monospace',
                                                    color: hoveredSystem === sNum ? THEME_AMBER : 'rgba(255, 255, 255, 0.4)',
                                                    fontWeight: hoveredSystem === sNum ? 'bold' : 'normal',
                                                    pointerEvents: 'none',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    transition: 'color 0.1s ease'
                                                }}
                                            >
                                                <span>{sNum}</span>
                                                <div style={{
                                                    width: '1px',
                                                    height: '5px',
                                                    background: hoveredSystem === sNum ? THEME_AMBER : 'rgba(255, 255, 255, 0.25)',
                                                    marginTop: '2px'
                                                }} />
                                            </div>
                                        );
                                    })}
                                </div>

                                <canvas
                                    ref={canvasRef}
                                    width={containerWidth}
                                    height={140}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseLeave}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    style={{ display: 'block', width: '100%', height: '140px' }}
                                />

                                {/* Interactive HTML Tooltip */}
                                {hoveredSystem !== null && mouseCoords !== null && (
                                    (() => {
                                        const data = systemData[hoveredSystem - 1];
                                        if (!data) return null;
                                        
                                        const tooltipX = mouseCoords.x + 220 > containerWidth ? mouseCoords.x - 230 : mouseCoords.x + 20;
                                        const tooltipY = Math.max(10, mouseCoords.y - 50);
                                        const isLoss = data.profit < 0;
                                        const isWin = data.profit > 0;
                                        const borderCol = isWin ? THEME_AMBER : (isLoss ? THEME_CRIMSON : 'rgba(255,255,255,0.2)');

                                        return (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: `${tooltipX}px`,
                                                    top: `${tooltipY}px`,
                                                    background: 'rgba(10, 15, 20, 0.95)',
                                                    backdropFilter: 'blur(8px)',
                                                    border: `1px solid ${borderCol}`,
                                                    borderRadius: '10px',
                                                    padding: '12px',
                                                    width: '200px',
                                                    pointerEvents: 'none',
                                                    zIndex: 10,
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                                                }}
                                            >
                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Stellar System</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
                                                    {data.coords}
                                                </div>
                                                
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                                                    <span style={{ opacity: 0.6 }}>Combats Fought:</span>
                                                    <span style={{ fontWeight: 800 }}>{data.battlesCount}</span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                                                    <span style={{ opacity: 0.6 }}>Total Yield:</span>
                                                    <span style={{ fontWeight: 800, color: '#fff' }}>{formatYAxis(data.loot)} MSU</span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                                                    <span style={{ opacity: 0.6 }}>Losses Sustained:</span>
                                                    <span style={{ fontWeight: 800, color: THEME_CRIMSON }}>{formatYAxis(data.losses)} MSU</span>
                                                </div>

                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Net Profit:</span>
                                                    <span style={{ color: isWin ? '#22c55e' : (isLoss ? THEME_CRIMSON : '#fff') }}>
                                                        {isWin ? '+' : ''}{formatYAxis(data.profit)} MSU
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            {/* Heatmap Legend */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', background: THEME_CRIMSON, borderRadius: '2px' }} />
                                    <span>Negative Net Yield (Losses)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px' }} />
                                    <span>No recorded combat logs</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '36px', height: '12px', background: `linear-gradient(to right, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 1))`, borderRadius: '2px' }} />
                                    <span>Positive Net Yield (Profit Scale)</span>
                                </div>
                            </div>
                        </div>

                        {/* Hotspot details columns */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Left Side: Top Hotspots List */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Award size={18} color={THEME_AMBER} />
                                    Top System Hotspots in Galaxy {activeGalaxy || 1}
                                </div>

                                {topHotspots.length === 0 ? (
                                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                                        No combat profits recorded in this Galaxy yet.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {topHotspots.map((hs, index) => (
                                            <div 
                                                key={hs.system}
                                                onClick={() => focusSystem(hs.system)}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '12px 16px',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="combat-row-hover"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 900,
                                                        color: THEME_AMBER,
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(245, 158, 11, 0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: `1px solid ${THEME_AMBER}30`
                                                    }}>{index + 1}</div>
                                                    <div>
                                                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>System {hs.coords}</span>
                                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                            {hs.battlesCount} engagements
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ color: '#22c55e', fontWeight: 900, fontSize: '0.9rem' }}>
                                                        +{formatYAxis(hs.profit)}
                                                    </span>
                                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                        MSU Yield
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Summary Stats */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={18} color={THEME_AMBER} />
                                    Galaxy Tactical Metrics
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: 'calc(100% - 40px)' }}>
                                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Total Engagements</span>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{galaxyStats.totalBattles}</div>
                                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Recorded in stellar database</span>
                                    </div>

                                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Net Profit Yield</span>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: galaxyStats.totalProfit >= 0 ? '#22c55e' : THEME_CRIMSON }}>
                                            {galaxyStats.totalProfit >= 0 ? '+' : ''}{formatYAxis(galaxyStats.totalProfit)}
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>MSU Profit minus Fleet losses</span>
                                    </div>

                                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Attacker Fleet Losses</span>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: THEME_CRIMSON }}>{formatYAxis(galaxyStats.totalLosses)}</div>
                                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Total MSU losses in operations</span>
                                    </div>

                                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Most Active System</span>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: THEME_AMBER }}>
                                            {galaxyStats.hasData ? `[${activeGalaxy}:${galaxyStats.mostActiveSystem}]` : 'N/A'}
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>System with the highest activity</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'history' && (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-card"
                        style={{ padding: '0' }}
                    >
                        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <BarChart3 size={24} color={THEME_AMBER} />
                                Full Engagement History
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                             <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ textAlign: 'left', padding: '16px', fontWeight: 700 }}>TIMESTAMP</th>
                                        <th style={{ textAlign: 'left', padding: '16px', fontWeight: 700 }}>ATTACKER</th>
                                        <th style={{ textAlign: 'center', padding: '16px', fontWeight: 700 }}>VS</th>
                                        <th style={{ textAlign: 'left', padding: '16px', fontWeight: 700 }}>DEFENDER</th>
                                        <th style={{ textAlign: 'center', padding: '16px', fontWeight: 700 }}>WINNER</th>
                                        <th style={{ textAlign: 'right', padding: '16px', fontWeight: 700 }}>LOOT MSU</th>
                                        <th style={{ textAlign: 'right', padding: '16px', fontWeight: 700 }}>DEBRIS MSU</th>
                                        <th style={{ textAlign: 'right', padding: '16px', fontWeight: 700 }}>LOSSES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedHistory.map((cr, idx) => {
                                        const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
                                        const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
                                        
                                        const winnerName = getWinnerName(cr);
                                        const isAccountWin = (cr.winner === 'attacker' && cr.attackerName === playerName) ||
                                                            (cr.winner === 'defender' && cr.defenderName === playerName);
                                        const isTie = cr.winner === 'none';

                                        const rowBg = isAccountWin ? 'rgba(34, 197, 94, 0.05)' : (isTie ? 'rgba(234, 179, 8, 0.05)' : 'rgba(239, 68, 68, 0.05)');
                                        const statusColor = isAccountWin ? '#22c55e' : (isTie ? '#eab308' : '#ef4444');
                                        const prefix = isAccountWin ? '+' : (isTie ? '' : '-');

                                        const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);
                                        const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);

                                        return (
                                            <tr key={idx} 
                                                onClick={() => setSelectedReport(cr)}
                                                style={{ 
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)', 
                                                    transition: 'all 0.2s',
                                                    background: rowBg,
                                                    cursor: 'pointer'
                                                }}
                                                className="combat-row-hover"
                                            >
                                                <td style={{ padding: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{new Date(cr.timestamp * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                <td style={{ padding: '16px', fontWeight: 700 }}>{cr.attackerName || 'Unknown'}</td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}><SwordIcon size={14} style={{ opacity: 0.3 }} /></td>
                                                <td style={{ padding: '16px', fontWeight: 700 }}>{cr.defenderName || 'Unknown'}</td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 900,
                                                        background: statusColor + '20',
                                                        color: statusColor,
                                                        textTransform: 'uppercase',
                                                        border: `1px solid ${statusColor}40`
                                                    }}>
                                                        {getWinnerName(cr)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', color: statusColor, fontWeight: 700 }}>
                                                    {prefix}{formatYAxis(lMSU)}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, opacity: 0.8 }}>
                                                    {formatYAxis(dMSU)}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', color: '#ef4444', opacity: 0.8 }}>{formatYAxis(cr.attackerLosses)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* History Pagination Controls */}
                        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', opacity: 0.8 }}>
                            <div style={{ opacity: 0.5 }}>
                                Showing {sortedHistory.length > 0 ? ((historyPage - 1) * historyItemsPerPage) + 1 : 0} - {Math.min(historyPage * historyItemsPerPage, sortedHistory.length)} of {sortedHistory.length} reports
                            </div>
                            {totalHistoryPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button 
                                        disabled={historyPage === 1}
                                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: historyPage === 1 ? 'default' : 'pointer',
                                            opacity: historyPage === 1 ? 0.3 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <ChevronLeft size={14} />
                                        Prev
                                    </button>
                                    <span style={{ fontWeight: 700 }}>
                                        Page {historyPage} of {totalHistoryPages || 1}
                                    </span>
                                    <button 
                                        disabled={historyPage >= totalHistoryPages}
                                        onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: historyPage >= totalHistoryPages ? 'default' : 'pointer',
                                            opacity: historyPage >= totalHistoryPages ? 0.3 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        Next
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedReport && (
                    <CombatDetailModal 
                        report={selectedReport} 
                        onClose={() => setSelectedReport(null)} 
                        rates={rates} 
                        mMultiplier={mMultiplier}
                        cMultiplier={cMultiplier}
                        dMultiplier={dMultiplier}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedSystemForCombats !== null && (
                    <SystemCombatsModal
                        system={selectedSystemForCombats}
                        galaxy={activeGalaxy || 1}
                        combats={systemCombats}
                        onClose={() => setSelectedSystemForCombats(null)}
                        onSelectReport={(report) => {
                            setSelectedReport(report);
                        }}
                        rates={rates}
                        mMultiplier={mMultiplier}
                        cMultiplier={cMultiplier}
                        dMultiplier={dMultiplier}
                    />
                )}
            </AnimatePresence>

            <style>{`
                .tab-btn:hover { background: rgba(239, 68, 68, 0.05) !important; color: #fff !important; }
                .tab-btn.active:hover { background: rgba(239, 68, 68, 0.2) !important; }
                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
                }
                tr:hover { background: rgba(255,255,255,0.02); }
                .combat-row-hover:hover {
                    background: rgba(255, 255, 255, 0.06) !important;
                    transform: translateX(4px);
                }
            `}</style>
        </div>
    );
};

const CombatDetailModal = ({ report, onClose, rates, mMultiplier, cMultiplier, dMultiplier }: { report: any, onClose: () => void, rates: any, mMultiplier: number, cMultiplier: number, dMultiplier: number }) => {
    const account = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const accountPlayerName = account?.playerName || 'YOU';
    
    const isAccountWin = (report.winner === 'attacker' && report.attackerName === accountPlayerName) ||
                        (report.winner === 'defender' && report.defenderName === accountPlayerName);
    const isTie = report.winner === 'none';
                        
    const themeColor = isAccountWin ? '#22c55e' : (isTie ? '#eab308' : '#ef4444');

    // Extract fleet and tech data from rawResult/rawFleets
    const participants = Array.isArray(report.rawFleets) ? report.rawFleets : [];
    const attackers = participants.filter((p: any) => p.side === 'attacker');
    const defenders = participants.filter((p: any) => p.side === 'defender');

    const renderFleet = (fleet: any[], sideColor: string) => {
        if (fleet.length === 0) return <div style={{ opacity: 0.3, fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>No tactical data found</div>;
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {fleet.map((p, pIdx) => (
                    <div key={pIdx} className="glass-card" style={{ padding: '20px', borderLeft: `4px solid ${sideColor}` }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: '12px', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{p.player?.name || 'Unknown Participant'}</span>
                        </div>
                        
                        {/* Research Levels */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {p.combatResearchPercentage?.map((res: any) => {
                                let label = '';
                                if (res.id === 109) label = 'WT';
                                else if (res.id === 110) label = 'ST';
                                else if (res.id === 111) label = 'AT';
                                if (!label) return null;
                                return (
                                    <div key={res.id} style={{ fontSize: '0.65rem', fontWeight: 900, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span style={{ opacity: 0.5, marginRight: '4px' }}>{label}</span>
                                        {res.percentage / 10}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Technology / Ships Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                            {p.combatTechnologies?.map((tech: any) => {
                                const info = [...SHIP_DATA, ...DEFENCE_DATA].find(s => s.id === tech.technologyId);
                                if (!info || tech.amount === 0) return null;
                                
                                return (
                                    <div key={tech.technologyId} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <img src={info.icon} alt={info.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                            <span style={{ fontSize: '0.65rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.name}</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>{formatYAxis(tech.amount)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 24px',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.9)',
                    backdropFilter: 'blur(20px)',
                    pointerEvents: 'auto'
                }}
                onClick={onClose}
            />
            <motion.div 
                initial={{ scale: 0.9, y: 40, rotateX: -10 }}
                animate={{ scale: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.9, y: 40, rotateX: -10 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '1280px',
                    maxHeight: '94vh',
                    margin: '20px auto',
                    background: 'linear-gradient(135deg, #1a1f25 0%, #0d1115 100%)',
                    borderRadius: '32px',
                    border: `1px solid ${themeColor}30`,
                    boxShadow: `0 0 50px ${themeColor}15, 0 25px 50px -12px rgba(0, 0, 0, 0.8)`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    perspective: '1000px',
                    zIndex: 1
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div style={{ padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                        <div style={{ 
                            background: themeColor, 
                            color: '#000', 
                            padding: '12px 24px', 
                            borderRadius: '16px', 
                            fontSize: '1rem', 
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            boxShadow: `0 8px 16px ${themeColor}40`
                        }}>
                            {isAccountWin ? 'OBJECTIVE SECURED' : (isTie ? 'TACTICAL DRAW' : 'OPERATIONAL FAILURE')}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-1px' }}>Deployment Report: {report.coords}</div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.4, fontWeight: 600 }}>Timestamp: {new Date(report.timestamp * 1000).toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <button onClick={onClose} style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s' }} aria-label="Close">
                        <X size={28} />
                    </button>
                </div>

                {/* Main Battle Visual Area */}
                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 48px 48px 48px' }}>
                    
                    {/* The "Fight" Layout */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative', minHeight: '400px' }}>
                        
                        {/* Left Wing: Attacker */}
                        <div style={{ flex: 1, padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', justifyContent: 'flex-end' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 800, textTransform: 'uppercase' }}>Assault Leader</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>Attacker ({report.attackerName || 'Unknown'})</div>
                                </div>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Sword size={32} color="#ef4444" />
                                </div>
                            </div>
                            {renderFleet(attackers, '#ef4444')}
                        </div>

                        {/* Center: VS Divider */}
                        <div style={{ width: '100px', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '100px', bottom: '100px', width: '2px', background: 'rgba(255,255,255,0.05)' }} />
                            <div style={{ 
                                marginTop: '120px',
                                width: '50px', height: '50px', 
                                borderRadius: '50%', 
                                background: '#0d1115', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem', fontWeight: 900, color: themeColor,
                                zIndex: 1,
                                boxShadow: `0 0 20px ${themeColor}20`
                            }}>VS</div>
                        </div>

                        {/* Right Wing: Defender */}
                        <div style={{ flex: 1, padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Shield size={32} color="#22c55e" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 800, textTransform: 'uppercase' }}>Planetary Defense</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>Defender ({report.defenderName || 'Unknown'})</div>
                                </div>
                            </div>
                            {renderFleet(defenders, '#22c55e')}
                        </div>
                    </div>

                    {/* Summary Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', marginTop: '48px' }}>
                        
                         {/* Loot Card */}
                         <div className="glass-card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, opacity: 0.5, marginBottom: '24px', letterSpacing: '1px' }}>RESOURCES SEIZED</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {['metal', 'crystal', 'deuterium'].map(res => (
                                    <div key={res} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: RESOURCE_COLORS[res as keyof typeof RESOURCE_COLORS] }} />
                                            <span style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'capitalize' }}>{res}</span>
                                        </div>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatYAxis(report.loot?.[res] || 0)}</span>
                                    </div>
                                ))}
                            </div>
                            <Box size={80} style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.03, transform: 'rotate(-15deg)' }} />
                         </div>

                         {/* Debris Card */}
                         <div className="glass-card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, opacity: 0.5, marginBottom: '24px', letterSpacing: '1px' }}>DEBRIS FIELD GENERATION</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.6 }}>Metal Recovery</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatYAxis(report.debris?.metal || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.6 }}>Crystal Recovery</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatYAxis(report.debris?.crystal || 0)}</span>
                                </div>
                                <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: THEME_AMBER }}>EQUIVALENT YIELD</span>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 950, color: THEME_AMBER }}>{formatYAxis((report.debris?.metal || 0) * mMultiplier + (report.debris?.crystal || 0) * cMultiplier)} MSU</span>
                                </div>
                            </div>
                            <Zap size={80} style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.03, transform: 'rotate(-15deg)' }} />
                         </div>

                         {/* Net Result Card */}
                         <div className="glass-card" style={{ padding: '32px', background: `${themeColor}08`, border: `1px solid ${themeColor}20`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: themeColor, marginBottom: '12px', letterSpacing: '2px' }}>NET OPERATIONAL PROFIT</div>
                            <div style={{ fontSize: '3.2rem', fontWeight: 1000, color: themeColor, textShadow: `0 0 30px ${themeColor}40` }}>
                                {isAccountWin ? '+' : ''}{formatYAxis((report.loot?.metal || 0) * mMultiplier + (report.loot?.crystal || 0) * cMultiplier + (report.loot?.deuterium || 0) * dMultiplier + (report.debris?.metal || 0) * mMultiplier + (report.debris?.crystal || 0) * cMultiplier - report.attackerLosses)}
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, opacity: 0.4, marginTop: '8px' }}>TOTAL MSU IMPACT</div>
                            <TrendingUp size={100} style={{ position: 'absolute', opacity: 0.05, bottom: '10px' }} />
                         </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div style={{ padding: '32px 48px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            background: themeColor,
                            color: '#000',
                            border: 'none',
                            padding: '16px 48px',
                            borderRadius: '20px',
                            fontSize: '1rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            boxShadow: `0 8px 24px ${themeColor}40`,
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                    >
                        ACKNOWLEDGE REPORT
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const SystemCombatsModal = ({
    system,
    galaxy,
    combats,
    onClose,
    onSelectReport,
    rates,
    mMultiplier,
    cMultiplier,
    dMultiplier
}: {
    system: number;
    galaxy: number;
    combats: any[];
    onClose: () => void;
    onSelectReport: (report: any) => void;
    rates: any;
    mMultiplier: number;
    cMultiplier: number;
    dMultiplier: number;
}) => {
    const account = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const accountPlayerName = account?.playerName || 'YOU';
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const totalPages = Math.ceil(combats.length / itemsPerPage);
    const paginatedCombats = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return combats.slice(start, start + itemsPerPage);
    }, [combats, currentPage]);

    const getWinnerName = (cr: any) => {
        if (cr.winner === 'none') return 'NONE';
        if (cr.winner === 'attacker') return cr.attackerName || 'YOU';
        if (cr.winner === 'defender') {
            if (cr.isExpedition || cr.coords.trim().endsWith(':16')) {
                const defName = String(cr.defenderName || '').toLowerCase();
                if (cr.expeditionAttackType === 1 || defName.includes('pirat')) return 'Pirates';
                if (cr.expeditionAttackType === 2 || defName.includes('alien')) return 'Aliens';
                return 'Expedition Hostiles';
            }
            return cr.defenderName || 'Defender';
        }
        return cr.winner.toUpperCase();
    };

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 24px',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.9)',
                    backdropFilter: 'blur(20px)',
                    pointerEvents: 'auto'
                }}
                onClick={onClose}
            />
            <motion.div 
                initial={{ scale: 0.9, y: 40, rotateX: -10 }}
                animate={{ scale: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.9, y: 40, rotateX: -10 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '1000px',
                    maxHeight: '90vh',
                    margin: '40px auto',
                    background: 'linear-gradient(135deg, #1a1f25 0%, #0d1115 100%)',
                    borderRadius: '32px',
                    border: `1px solid ${THEME_AMBER}30`,
                    boxShadow: `0 0 50px ${THEME_AMBER}15, 0 25px 50px -12px rgba(0, 0, 0, 0.8)`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    perspective: '1000px',
                    zIndex: 1
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(to right, transparent, ${THEME_AMBER}, transparent)` }} />
                    
                    <div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-1px' }}>System Combat Operations</div>
                        <div style={{ fontSize: '0.9rem', color: THEME_AMBER, fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Sector: [{galaxy}:{system}] • {combats.length} total engagements
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#fff',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        className="tab-btn"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Table Body */}
                <div style={{ padding: '32px 48px', overflowY: 'auto', flexGrow: 1 }}>
                    {combats.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)' }}>
                            No combat logs registered in this system.
                        </div>
                    ) : (
                        <>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', opacity: 0.5 }}>
                                        <th style={{ padding: '16px 8px', fontWeight: 700 }}>COORD/TIME</th>
                                        <th style={{ padding: '16px 8px', fontWeight: 700 }}>ATTACKER</th>
                                        <th style={{ padding: '16px 8px', fontWeight: 700, textAlign: 'center' }}>VS</th>
                                        <th style={{ padding: '16px 8px', fontWeight: 700 }}>DEFENDER</th>
                                        <th style={{ padding: '16px 8px', fontWeight: 700 }}>WINNER</th>
                                        <th style={{ padding: '16px 8px', fontWeight: 700, textAlign: 'right' }}>LOOT MSU</th>
                                        <th style={{ padding: '16px 8px', fontWeight: 700, textAlign: 'right' }}>DEBRIS MSU</th>
                                        <th style={{ padding: '16px 8px', fontWeight: 700, textAlign: 'right' }}>LOSSES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCombats.map((cr, idx) => {
                                        const loot = cr.loot || { metal: 0, crystal: 0, deuterium: 0 };
                                        const debris = cr.debris || { metal: 0, crystal: 0, deuterium: 0 };
                                        
                                        const winnerName = getWinnerName(cr);
                                        const isAccountWin = (cr.winner === 'attacker' && cr.attackerName === accountPlayerName) ||
                                                            (cr.winner === 'defender' && cr.defenderName === accountPlayerName);
                                        const isTie = cr.winner === 'none';

                                        const rowBg = isAccountWin ? 'rgba(34, 197, 94, 0.03)' : (isTie ? 'rgba(234, 179, 8, 0.03)' : 'rgba(239, 68, 68, 0.03)');
                                        const statusColor = isAccountWin ? '#22c55e' : (isTie ? '#eab308' : '#ef4444');
                                        const prefix = isAccountWin ? '+' : (isTie ? '' : '-');

                                        const lMSU = (loot.metal * mMultiplier) + (loot.crystal * cMultiplier) + (loot.deuterium * dMultiplier);
                                        const dMSU = (debris.metal * mMultiplier) + (debris.crystal * cMultiplier) + (debris.deuterium * dMultiplier);

                                        return (
                                            <tr key={idx} 
                                                onClick={() => {
                                                    onSelectReport(cr);
                                                }}
                                                style={{ 
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)', 
                                                    transition: 'all 0.2s',
                                                    background: rowBg,
                                                    cursor: 'pointer'
                                                }}
                                                className="combat-row-hover"
                                            >
                                                <td style={{ padding: '16px 8px' }}>
                                                    <div style={{ fontWeight: 800 }}>{cr.coords}</div>
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '2px' }}>
                                                        {new Date(cr.timestamp * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 8px', fontWeight: 700 }}>{cr.attackerName || 'Unknown'}</td>
                                                <td style={{ padding: '16px 8px', textAlign: 'center' }}><SwordIcon size={12} style={{ opacity: 0.3 }} /></td>
                                                <td style={{ padding: '16px 8px', fontWeight: 700 }}>{cr.defenderName || 'Unknown'}</td>
                                                <td style={{ padding: '16px 8px' }}>
                                                    <span style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 900,
                                                        background: statusColor + '20',
                                                        color: statusColor,
                                                        textTransform: 'uppercase',
                                                        border: `1px solid ${statusColor}40`
                                                    }}>
                                                        {getWinnerName(cr)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 8px', textAlign: 'right', color: statusColor, fontWeight: 700 }}>
                                                    {prefix}{formatYAxis(lMSU)}
                                                </td>
                                                <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 700, opacity: 0.8 }}>
                                                    {formatYAxis(dMSU)}
                                                </td>
                                                <td style={{ padding: '16px 8px', textAlign: 'right', color: '#ef4444', opacity: 0.8 }}>
                                                    {formatYAxis(cr.attackerLosses || 0)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', fontSize: '0.75rem', opacity: 0.8 }}>
                                    <div style={{ opacity: 0.5 }}>
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, combats.length)} of {combats.length} operations
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                cursor: currentPage === 1 ? 'default' : 'pointer',
                                                opacity: currentPage === 1 ? 0.3 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <ChevronLeft size={14} />
                                            Prev
                                        </button>
                                        <span style={{ fontWeight: 700 }}>
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button 
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                cursor: currentPage >= totalPages ? 'default' : 'pointer',
                                                opacity: currentPage >= totalPages ? 0.3 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            Next
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Combat;
