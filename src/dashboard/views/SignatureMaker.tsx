import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronLeft, 
    Sparkles, 
    Download, 
    Copy, 
    Check, 
    Image as ImageIcon, 
    User, 
    Globe, 
    Star, 
    Eye, 
    Lock,
    RefreshCw,
    TrendingUp,
    Compass,
    Dna,
    Swords,
    Orbit,
    Calendar
} from 'lucide-react';

interface SignatureMakerProps {
    onBack: () => void;
}

const BACKGROUNDS = [
    { id: '10504', name: "No Man's Sky", url: '/icons/signatures/10504.jpg' },
    { id: '2150163743', name: 'Skyline Carrier', url: '/icons/signatures/2150163743.jpg' },
    { id: '2151828268', name: 'Strait of Atlas', url: '/icons/signatures/2151828268.jpg' },
    { id: '61216', name: 'Galactic Core', url: '/icons/signatures/61216.jpg' },
    { id: '64', name: 'Nexus Prime', url: '/icons/signatures/64.jpg' },
    { id: '9647', name: 'Eye of Creation', url: '/icons/signatures/9647.jpg' },
    { id: '2151972738', name: 'Cosmic Nebula', url: '/icons/signatures/2151972738.jpg' },
    { id: '2', name: 'Ancient City', url: '/icons/signatures/2.jpg' },
    { id: '2150163759', name: 'The Dreadnought', url: '/icons/signatures/2150163759.jpg' },
    { id: '2150163795', name: 'Flight Deck Zero', url: '/icons/signatures/2150163795.jpg' },
];

const ACCENTS = [
    { id: 'cyan', name: 'Cyan Tech', color: '#00f2ff', glow: 'rgba(0, 242, 255, 0.4)', bg: 'rgba(0, 242, 255, 0.08)' },
    { id: 'emerald', name: 'Emerald', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', bg: 'rgba(34, 197, 94, 0.08)' },
    { id: 'amber', name: 'Solar Amber', color: '#ffe133', glow: 'rgba(255, 225, 51, 0.4)', bg: 'rgba(255, 225, 51, 0.08)' },
    { id: 'orange', name: 'Plasma Orange', color: '#ff6a00', glow: 'rgba(255, 106, 0, 0.4)', bg: 'rgba(255, 106, 0, 0.08)' },
    { id: 'magenta', name: 'Cosmic Purple', color: '#bd00ff', glow: 'rgba(189, 0, 255, 0.4)', bg: 'rgba(189, 0, 255, 0.08)' }
];

const SPACE_QUOTES = [
    "Exploring the Unknown",
    "Fear the Reaper",
    "Ad Astra per Aspera",
    "Through the Void",
    "Industrial Overlord",
    "Discoverer of Worlds",
    "Shadow of the Nebula",
    "Mastering the Cosmos",
    "Stars My Destination",
    "Galaxy In My Sights",
    "Void Voyager"
];

const formatNumber = (num: number) => {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(1) + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num).toLocaleString();
};

const SignatureMaker: React.FC<SignatureMakerProps> = ({ onBack }) => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const planets = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    const planetCount = planets.filter(p => p.type === 'planet').length;
    const moonCount = planets.filter(p => p.type === 'moon').length;

    // Mission queries
    const expeditionCount = useLiveQuery(
        () => activeAccount ? db.expeditions.where('playerId').equals(activeAccount.playerId).count() : 0,
        [activeAccount]
    ) ?? 0;

    const discoveryCount = useLiveQuery(
        () => activeAccount ? db.lifeformDiscoveries.where('playerId').equals(activeAccount.playerId).count() : 0,
        [activeAccount]
    ) ?? 0;

    const combatCount = useLiveQuery(
        () => activeAccount ? db.combatReports.where('playerId').equals(activeAccount.playerId).count() : 0,
        [activeAccount]
    ) ?? 0;

    const harvestCount = useLiveQuery(
        () => activeAccount ? db.debrisHarvests.where('playerId').equals(activeAccount.playerId).count() : 0,
        [activeAccount]
    ) ?? 0;

    // Daily Production Summarizer
    const dailyProduction = useMemo(() => {
        let metal = 0;
        let crystal = 0;
        let deuterium = 0;
        
        planets.forEach(p => {
            if (p.production) {
                metal += (p.production.metal || 0) * 24;
                crystal += (p.production.crystal || 0) * 24;
                deuterium += (p.production.deuterium || 0) * 24;
            }
        });
        
        return { metal, crystal, deuterium };
    }, [planets]);

    // Lifeform species distribution
    const lifeformDistribution = useMemo(() => {
        const counts = { humans: 0, rocktal: 0, mechas: 0, kaelesh: 0, none: 0 };
        planets.forEach(p => {
            if (p.lifeformId === 1) counts.humans++;
            else if (p.lifeformId === 2) counts.rocktal++;
            else if (p.lifeformId === 3) counts.mechas++;
            else if (p.lifeformId === 4) counts.kaelesh++;
            else if (p.type === 'planet') counts.none++;
        });
        return counts;
    }, [planets]);

    const totalLfPlanets = lifeformDistribution.humans + lifeformDistribution.rocktal + lifeformDistribution.mechas + lifeformDistribution.kaelesh;

    // Dynamic generation timestamp
    const getFormattedDate = () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return `${day} / ${month} / ${year}`;
    };

    // Customization states
    const [selectedBg, setSelectedBg] = useState(BACKGROUNDS[0]);
    const [customBgUrl, setCustomBgUrl] = useState('');
    const [activeAccent, setActiveAccent] = useState(ACCENTS[0]);
    const [tagline, setTagline] = useState(SPACE_QUOTES[0]);
    
    // Toggles
    const [showHp, setShowHp] = useState(true);
    const [showClass, setShowClass] = useState(true);
    const [showScore, setShowScore] = useState(true);
    const [showAlliance, setShowAlliance] = useState(true);
    const [showColonies, setShowColonies] = useState(true);
    const [showWatermark, setShowWatermark] = useState(true);
    
    // Toggles for new items
    const [showYields, setShowYields] = useState(true);
    const [showMissions, setShowMissions] = useState(true);
    const [showChart, setShowChart] = useState(true);
    const [showDate, setShowDate] = useState(true);

    // Avatar config
    const [avatarType, setAvatarType] = useState<'current' | 'lifeform' | 'custom'>('current');
    const [selectedLfAvatar, setSelectedLfAvatar] = useState<number>(4); // 1: Human, 2: Rock'tal, 3: Mecha, 4: Kaelesh
    const [customAvatarUrl, setCustomAvatarUrl] = useState('');

    // UI feedback states
    const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success'>('idle');

    useEffect(() => {
        if (copyStatus !== 'idle') {
            const t = setTimeout(() => setCopyStatus('idle'), 2000);
            return () => clearTimeout(t);
        }
    }, [copyStatus]);

    useEffect(() => {
        if (downloadStatus !== 'idle') {
            const t = setTimeout(() => setDownloadStatus('idle'), 2000);
            return () => clearTimeout(t);
        }
    }, [downloadStatus]);

    const handleGenerateImage = async (type: 'copy' | 'download') => {
        try {
            // Force load the exact web fonts for canvas rendering to ensure pixel-perfect matches
            try {
                await Promise.all([
                    document.fonts.load('800 28px Outfit'),
                    document.fonts.load('900 28px Outfit'),
                    document.fonts.load('600 15px Inter'),
                    document.fonts.load('800 16px Inter'),
                    document.fonts.load('500 13px Inter'),
                    document.fonts.load('800 11px Inter'),
                    document.fonts.load('900 11px Inter'),
                    document.fonts.load('700 13px Inter'),
                    document.fonts.load('800 13px Inter'),
                    document.fonts.load('italic 500 13px Inter'),
                    document.fonts.load('700 11px Outfit'),
                    document.fonts.load('900 10px Outfit'),
                    document.fonts.load('900 12px Outfit'),
                    document.fonts.load('700 9px Inter')
                ]);
            } catch (err) {
                console.warn('Font loading failed, falling back:', err);
            }

            // Wait for loaded fonts to completely register in canvas cache
            await new Promise(resolve => setTimeout(resolve, 100));
            await document.fonts.ready;

            // Create canvas at 2x scale (width: 1520px, height: 720px)
            const canvas = document.createElement('canvas');
            canvas.width = 1520;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.scale(2, 2); // draw in 760x360 coordinates

            // 1. Draw background
            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';
            bgImg.src = customBgUrl || selectedBg.url;

            await new Promise((resolve) => {
                bgImg.onload = resolve;
                bgImg.onerror = () => {
                    ctx.fillStyle = '#080c14';
                    ctx.fillRect(0, 0, 760, 360);
                    resolve(null);
                };
            });

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, 760, 360, 24);
            ctx.clip();

            ctx.drawImage(bgImg, 0, 0, 760, 360);
            ctx.fillStyle = 'rgba(8, 12, 20, 0.55)'; // subtle dark overlay for text contrast
            ctx.fillRect(0, 0, 760, 360);
            ctx.restore();

            // Draw glowing outer border
            ctx.strokeStyle = activeAccent.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(0, 0, 760, 360, 24);
            ctx.stroke();

            // 2. Draw Column 1: Identity & Stats (Left - x: 36)
            let currentX = 36;
            let currentY = 56;
            
            ctx.shadowColor = activeAccent.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 28px "Outfit", sans-serif';
            const nameText = activeAccount?.playerName || 'Commander';
            ctx.fillText(nameText, currentX, currentY);
            ctx.shadowBlur = 0; // reset

            let nameWidth = ctx.measureText(nameText).width;
            let textOffset = currentX + nameWidth;

            if (activeAccount?.universeName) {
                ctx.font = '600 15px "Inter", sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                const uniText = `in Universe ${activeAccount.universeName}`;
                ctx.fillText(uniText, textOffset + 8, currentY - 4);
            }

            // Draw HP and Class badges onto the 2nd line
            const badgeHeight = 24;
            let runningX = 36;

            if (showClass || showHp) {
                currentY += 30; // Move baseline down to badges row
                let runningY = currentY - 20;

                // Class Badge FIRST
                if (showClass && activeAccount?.playerClass !== undefined) {
                    const className = activeAccount.playerClass === 1 ? 'COLLECTOR' : activeAccount.playerClass === 2 ? 'WARRIOR' : 'DISCOVERER';
                    const classColor = activeAccount.playerClass === 1 ? '#E6953C' : activeAccount.playerClass === 2 ? '#ef4444' : '#06b6d4';
                    ctx.font = '900 11px "Inter", sans-serif';
                    const classWidth = ctx.measureText(className).width + 14;

                    ctx.strokeStyle = classColor;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.roundRect(runningX, runningY, classWidth, badgeHeight, 6);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = classColor;
                    ctx.fillText(className, runningX + 7, runningY + 16);

                    runningX += classWidth + 8;
                }

                // HP Badge NEXT
                if (showHp && activeAccount?.honorPoints !== undefined) {
                    const hpText = `${activeAccount.honorPoints.toLocaleString()} HP`;
                    ctx.font = '800 11px "Inter", sans-serif';
                    const hpWidth = ctx.measureText(hpText).width + 14;

                    ctx.strokeStyle = '#22c55e';
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.roundRect(runningX, runningY, hpWidth, badgeHeight, 6);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#22c55e';
                    ctx.fillText(hpText, runningX + 7, runningY + 16);
                }
            }

            // Score & Rank (Row 2, dynamically shifted)
            currentY += 36;
            if (showScore && activeAccount?.score !== undefined) {
                ctx.font = '800 16px "Inter", sans-serif';
                ctx.fillStyle = activeAccent.color;
                const ptsText = `${activeAccount.score.toLocaleString()} pts`;
                ctx.fillText(ptsText, 36, currentY);
                const ptsWidth = ctx.measureText(ptsText).width; // Measure width at 16px size

                const rankText = `(#${activeAccount.rank || 1})`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.font = '500 13px "Inter", sans-serif';
                ctx.fillText(rankText, 36 + ptsWidth + 8, currentY);
            }

            // Alliance Details (Row 3, dynamically shifted)
            currentY += 31;
            if (showAlliance && activeAccount?.allianceTag) {
                const tagText = `[${activeAccount.allianceTag}]`;
                ctx.font = '800 13px "Inter", sans-serif';
                ctx.fillStyle = activeAccent.color;
                const tagWidth = ctx.measureText(tagText).width;

                ctx.fillStyle = `${activeAccent.color}22`;
                ctx.beginPath();
                ctx.roundRect(36, currentY - 15, tagWidth + 10, 20, 4);
                ctx.fill();

                ctx.fillStyle = activeAccent.color;
                ctx.fillText(tagText, 41, currentY);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                ctx.font = '500 13px "Inter", sans-serif';
                ctx.fillText(activeAccount.allianceName || 'Independent', 36 + tagWidth + 16, currentY);
            } else if (showAlliance) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.font = '500 13px "Inter", sans-serif';
                ctx.fillText('Independent Alliance', 36, currentY);
            }

            // Colonies (Row 4, dynamically shifted)
            currentY += 35;
            if (showColonies) {
                ctx.font = '700 13px "Inter", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${planetCount} Planets / ${moonCount} Moons Established`, 36, currentY);
            }

            // Tagline (Row 5, dynamically shifted)
            currentY += 34;
            if (tagline) {
                ctx.font = 'italic 500 13px "Inter", sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillText(`"${tagline}"`, 36, currentY);
            }

            // Dynamic Generation Date (Bottom Left)
            if (showDate) {
                ctx.font = '700 11px "Outfit", sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.fillText(`Generated: ${getFormattedDate()}`, 36, 320);
            }

            // 3. Draw Column 2: Economy & Missions (Center - x: 380)
            const col2X = 380;

            // Daily Production Rates
            if (showYields) {
                ctx.font = '800 11px "Outfit", sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillText('EMPIRE DAILY PRODUCTION', col2X, 52);

                const yields = [
                    { label: 'Metal', val: dailyProduction.metal, color: '#E6953C' },
                    { label: 'Crystal', val: dailyProduction.crystal, color: '#4CAEE6' },
                    { label: 'Deuterium', val: dailyProduction.deuterium, color: '#43D159' }
                ];

                yields.forEach((y, i) => {
                    const rowY = 76 + i * 22;
                    ctx.font = '700 13px "Inter", sans-serif';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.fillText(y.label, col2X, rowY);

                    ctx.fillStyle = y.color;
                    ctx.font = '800 13px "Inter", sans-serif';
                    ctx.fillText(`+${formatNumber(y.val)} / day`, col2X + 80, rowY);
                });
            }

            // Mission achievements
            if (showMissions) {
                const missionStartY = showYields ? 172 : 52;
                ctx.font = '800 11px "Outfit", sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillText('MISSION COUNTERS', col2X, missionStartY);

                const missions = [
                    { label: 'Expeditions', val: expeditionCount },
                    { label: 'LF Discoveries', val: discoveryCount },
                    { label: 'Combats', val: combatCount },
                    { label: 'Harvested DFs', val: harvestCount }
                ];

                missions.forEach((m, i) => {
                    const rowY = missionStartY + 24 + i * 22;
                    ctx.font = '700 13px "Inter", sans-serif';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.fillText(m.label, col2X, rowY);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = '800 13px "Inter", sans-serif';
                    ctx.fillText(m.val.toLocaleString(), col2X + 115, rowY);
                });
            }

            // 4. Draw Column 3: Profile Avatar & Lifeform Donut (Right - x: 620)
            const col3CenterX = 660;

            // Profile Avatar centered vertically
            const avatarCenterY = 180;
            const avatarRadius = 45;

            // Glowing borders
            ctx.shadowColor = activeAccent.color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = activeAccent.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(col3CenterX, avatarCenterY, avatarRadius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0; // reset

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([5, 6]);
            ctx.beginPath();
            ctx.arc(col3CenterX, avatarCenterY, avatarRadius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw avatar image
            let avatarUrl = '/icons/nexus.png';
            if (avatarType === 'current' && activeAccount?.avatarUrl) {
                avatarUrl = activeAccount.avatarUrl;
            } else if (avatarType === 'lifeform') {
                const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
                avatarUrl = `/icons/lifeforms/${lfNames[selectedLfAvatar - 1]}-icon-large.jpg`;
            }

            const avImg = new Image();
            avImg.crossOrigin = 'anonymous';
            avImg.src = avatarUrl;

            await new Promise((resolve) => {
                avImg.onload = resolve;
                avImg.onerror = resolve;
            });

            ctx.save();
            ctx.beginPath();
            ctx.arc(col3CenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
            ctx.clip();

            try {
                ctx.drawImage(avImg, col3CenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
            } catch (err) {
                ctx.fillStyle = '#0b0f19';
                ctx.fillRect(col3CenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                
                ctx.fillStyle = activeAccent.color;
                ctx.font = '900 30px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(activeAccount?.playerName?.charAt(0).toUpperCase() || 'C', col3CenterX, avatarCenterY);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
            }
            ctx.restore();

            // Watermark (Bottom Center with Logo Pill Capsule)
            if (showWatermark) {
                const wmImg = new Image();
                wmImg.crossOrigin = 'anonymous';
                wmImg.src = '/icons/nexus.png';
                await new Promise((resolve) => { wmImg.onload = resolve; wmImg.onerror = resolve; });

                const wmText = 'OGAME NEXUS';
                ctx.font = '900 9px "Outfit", sans-serif';
                const textWidth = ctx.measureText(wmText).width;
                
                // Pill dimensions matching HTML
                const imgSize = 14;
                const gap = 8;
                const pillPaddingX = 12;
                const pillPaddingY = 4;
                
                const contentWidth = imgSize + gap + textWidth;
                const pillWidth = contentWidth + pillPaddingX * 2;
                const pillHeight = imgSize + pillPaddingY * 2;
                
                const startX = 380 - pillWidth / 2;
                const startY = 326; 

                // Draw translucent pill background
                ctx.fillStyle = 'rgba(8, 12, 20, 0.65)';
                ctx.beginPath();
                ctx.roundRect(startX, startY, pillWidth, pillHeight, 20);
                ctx.fill();

                // Draw pill border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw logo
                try {
                    ctx.drawImage(wmImg, startX + pillPaddingX, startY + pillPaddingY, imgSize, imgSize);
                } catch (e) {
                    // ignore if logo load fails
                }

                // Draw text
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.fillText(wmText, startX + pillPaddingX + imgSize + gap, startY + pillPaddingY + 10);
            }

            // 5. Output file
            if (type === 'download') {
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeAccount?.playerName || 'empire'}_nexus_signature.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setDownloadStatus('success');
            } else {
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        setCopyStatus('error');
                        return;
                    }
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        setCopyStatus('success');
                    } catch (err) {
                        console.error('Clipboard copy failed:', err);
                        setCopyStatus('error');
                    }
                }, 'image/png');
            }

        } catch (e) {
            console.error('Error generating signature canvas:', e);
            if (type === 'copy') setCopyStatus('error');
        }
    };

    return (
        <div className="view-container" style={{ padding: '0 24px 40px 24px' }}>
            {/* Custom Styles */}
            <style>{`
                .control-section {
                    background: rgba(12, 18, 28, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 16px;
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                }
                .section-header {
                    font-size: 0.9rem;
                    font-weight: 800;
                    color: #fff;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 2px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    padding-bottom: 6px;
                }
                .option-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(255,255,255,0.02);
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.04);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .option-toggle:hover {
                    background: rgba(255,255,255,0.04);
                    border-color: rgba(255,255,255,0.07);
                }
                .custom-checkbox {
                    width: 16px;
                    height: 16px;
                    border-radius: 4px;
                    border: 1.5px solid rgba(255,255,255,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .checked {
                    border-color: var(--theme-color) !important;
                    background: var(--theme-color) !important;
                }
                .bg-card-preview {
                    position: relative;
                    width: 760px;
                    height: 360px;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 16px 50px rgba(0,0,0,0.8), 0 0 35px var(--theme-glow);
                    border: 2px solid var(--theme-color);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: grid;
                    grid-template-columns: 320px 220px 180px;
                    padding: 36px;
                    box-sizing: border-box;
                    align-items: start;
                }
                .avatar-glow-ring {
                    width: 90px;
                    height: 90px;
                    border-radius: 50%;
                    border: 2.5px solid var(--theme-color);
                    box-shadow: 0 0 15px var(--theme-color);
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .avatar-dash-ring {
                    position: absolute;
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    border: 1.2px dashed rgba(255,255,255,0.25);
                    animation: spin 30s linear infinite;
                }
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
                .resource-label {
                    font-size: 13px;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.5);
                }
                .resource-value {
                    font-size: 13px;
                    font-weight: 800;
                }
                .stat-label {
                    font-size: 13px;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.5);
                }
                .stat-value {
                    font-size: 13px;
                    font-weight: 800;
                    color: #fff;
                }
            `}</style>

            {/* View Header */}
            <header className="view-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <motion.button
                    whileHover={{ scale: 1.05, x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#fff',
                        padding: '10px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    <ChevronLeft size={20} />
                </motion.button>
                <div>
                    <h1 className="view-title" style={{ fontSize: '2.8rem', fontWeight: 950, color: '#fff', margin: 0, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Empire Signature Forge <Sparkles size={28} color={activeAccent.color} style={{ filter: `drop-shadow(0 0 8px ${activeAccent.color})` }} />
                    </h1>
                    <p className="view-subtitle" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.15rem', marginTop: '2px', fontWeight: 500 }}>
                        Craft and export a state-of-the-art visual signature card of your OGame accomplishments
                    </p>
                </div>
            </header>

            {/* Split Workspace */}
            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
                
                {/* Left Panel: Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Background Selector */}
                    <div className="control-section">
                        <div className="section-header">
                            <ImageIcon size={16} /> Background Backdrop
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {BACKGROUNDS.map(bg => (
                                <button
                                    key={bg.id}
                                    onClick={() => { setSelectedBg(bg); setCustomBgUrl(''); }}
                                    style={{
                                        border: selectedBg.id === bg.id && !customBgUrl ? `2.5px solid ${activeAccent.color}` : '1.5px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px',
                                        height: '60px',
                                        backgroundImage: `url(${bg.url})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 100%)',
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        justifyContent: 'center',
                                        paddingBottom: '4px',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        letterSpacing: '0.5px'
                                    }}>
                                        {bg.name}
                                    </div>
                                    {selectedBg.id === bg.id && !customBgUrl && (
                                        <div style={{ position: 'absolute', top: '4px', right: '4px', background: activeAccent.color, borderRadius: '50%', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Check size={8} color="#000" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Accent Picker */}
                    <div className="control-section">
                        <div className="section-header">
                            <Sparkles size={16} /> Color Accent
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                            {ACCENTS.map(accent => (
                                <button
                                    key={accent.id}
                                    onClick={() => setActiveAccent(accent)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 2px',
                                        borderRadius: '8px',
                                        border: activeAccent.id === accent.id ? `2px solid ${accent.color}` : '1.5px solid rgba(255,255,255,0.08)',
                                        background: activeAccent.id === accent.id ? accent.bg : 'rgba(255,255,255,0.02)',
                                        color: activeAccent.id === accent.id ? '#fff' : 'rgba(255,255,255,0.4)',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: accent.color, boxShadow: `0 0 6px ${accent.color}` }} />
                                    {accent.name.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Avatar Customizer */}
                    <div className="control-section">
                        <div className="section-header">
                            <User size={16} /> Player Avatar
                        </div>
                        
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {(['current', 'lifeform'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setAvatarType(type)}
                                    style={{
                                        flex: 1,
                                        border: 'none',
                                        background: avatarType === type ? 'rgba(255,255,255,0.06)' : 'transparent',
                                        padding: '6px 0',
                                        borderRadius: '8px',
                                        color: avatarType === type ? '#fff' : 'rgba(255,255,255,0.4)',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {type === 'current' ? 'OGame' : 'Lifeform'}
                                </button>
                            ))}
                        </div>

                        {avatarType === 'lifeform' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '4px' }}>
                                {[1, 2, 3, 4].map(lf => {
                                    const names = ['Humans', 'Rock\'tal', 'Mechas', 'Kaelesh'];
                                    const codes = ['humans', 'rocktal', 'mechas', 'kaelesh'];
                                    return (
                                        <button
                                            key={lf}
                                            onClick={() => setSelectedLfAvatar(lf)}
                                            style={{
                                                border: selectedLfAvatar === lf ? `2px solid ${activeAccent.color}` : '1.5px solid rgba(255,255,255,0.08)',
                                                borderRadius: '8px',
                                                padding: '4px',
                                                background: selectedLfAvatar === lf ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '4px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <img 
                                                src={`/icons/lifeforms/${codes[lf - 1]}-icon-large.jpg`} 
                                                alt={names[lf - 1]} 
                                                style={{ width: '100%', aspectRatio: '1', borderRadius: '4px', objectFit: 'cover' }}
                                            />
                                            <span style={{ fontSize: '9px', color: selectedLfAvatar === lf ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 800 }}>
                                                {names[lf - 1].split('\'')[0]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Taglines & Space Quotes */}
                    <div className="control-section">
                        <div className="section-header">
                            <Star size={16} /> Epic Space Motto
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Select Epic Motto Preset</span>
                            <select
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                style={{
                                    background: 'rgba(15, 23, 36, 0.9)',
                                    border: '1.5px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {SPACE_QUOTES.map(q => (
                                    <option key={q} value={q} style={{ background: '#0e131f' }}>{q}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Or Enter Custom Motto</span>
                            <input
                                type="text"
                                maxLength={50}
                                placeholder="Type your own space legacy tagline..."
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                style={{
                                    background: 'rgba(0,0,0,0.4)',
                                    border: '1.5px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Display Field Toggles */}
                    <div className="control-section">
                        <div className="section-header">
                            <Eye size={16} /> Display Elements
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {[
                                { label: 'Honor Points (HP)', checked: showHp, setChecked: setShowHp },
                                { label: 'Player Class Badge', checked: showClass, setChecked: setShowClass },
                                { label: 'Score and Rank', checked: showScore, setChecked: setShowScore },
                                { label: 'Alliance Details', checked: showAlliance, setChecked: setShowAlliance },
                                { label: 'Colonies (Planets/Moons)', checked: showColonies, setChecked: setShowColonies },
                                { label: 'Daily Yields (Metal/Crys/Deut)', checked: showYields, setChecked: setShowYields },
                                { label: 'Mission Log Totals', checked: showMissions, setChecked: setShowMissions }
                            ].map((opt, i) => (
                                <div
                                    key={i}
                                    className="option-toggle"
                                    onClick={() => opt.setChecked(!opt.checked)}
                                    style={{ '--theme-color': activeAccent.color } as React.CSSProperties}
                                >
                                    <span style={{ fontSize: '11px', color: opt.checked ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{opt.label}</span>
                                    <div className={`custom-checkbox ${opt.checked ? 'checked' : ''}`}>
                                        {opt.checked && <Check size={10} color="#000" strokeWidth={3} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Panel: Live Preview & Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', justifySelf: 'stretch', padding: '0 16px' }}>
                    
                    <div style={{ width: '100%', textAlign: 'left' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>Live Dashboard Preview</h2>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>This is how your high-density signature card will look</p>
                    </div>

                    {/* Interactive CSS Signature Card (760px x 360px) */}
                    <div 
                        className="bg-card-preview"
                        style={{
                            '--theme-color': activeAccent.color,
                            '--theme-glow': activeAccent.glow,
                            backgroundImage: `url(${customBgUrl || selectedBg.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        } as React.CSSProperties}
                    >
                        {/* Background Overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8, 12, 20, 0.55)', zIndex: 1, pointerEvents: 'none' }} />

                        {/* COLUMN 1: Player Identity (Left - width: 320px) */}
                        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'space-between', paddingRight: '20px' }}>
                            
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                 {/* Line 1: Name and Universe */}
                                 <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                     <span style={{
                                         fontSize: '28px',
                                         fontWeight: 950,
                                         color: '#fff',
                                         letterSpacing: '-0.03em',
                                         textShadow: `0 0 15px ${activeAccent.color}`,
                                         fontFamily: '"Outfit", sans-serif'
                                     }}>
                                         {activeAccount?.playerName || 'Commander'}
                                     </span>
                                     {activeAccount?.universeName && (
                                         <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textShadow: 'none', fontFamily: '"Inter", sans-serif' }}>
                                             in Universe {activeAccount.universeName}
                                         </span>
                                     )}
                                 </div>

                                 {/* Line 2: Badges (Class first, HP second) */}
                                 {(showClass || showHp) && (
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                         <AnimatePresence>
                                             {showClass && activeAccount?.playerClass !== undefined && (
                                                 <motion.span
                                                     initial={{ opacity: 0, scale: 0.8 }}
                                                     animate={{ opacity: 1, scale: 1 }}
                                                     exit={{ opacity: 0, scale: 0.8 }}
                                                     style={{
                                                         fontSize: '11px',
                                                         color: activeAccount.playerClass === 1 ? '#E6953C' : activeAccount.playerClass === 2 ? '#ef4444' : '#06b6d4',
                                                         fontWeight: 900,
                                                         background: 'rgba(255, 255, 255, 0.04)',
                                                         border: `1.2px solid ${activeAccount.playerClass === 1 ? 'rgba(230, 149, 60, 0.4)' : activeAccount.playerClass === 2 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(6, 182, 212, 0.4)'}`,
                                                         padding: '2px 8px',
                                                         borderRadius: '6px',
                                                         letterSpacing: '0.5px',
                                                         fontFamily: '"Inter", sans-serif'
                                                     }}
                                                 >
                                                     {activeAccount.playerClass === 1 ? 'COLLECTOR' : activeAccount.playerClass === 2 ? 'WARRIOR' : 'DISCOVERER'}
                                                 </motion.span>
                                             )}
                                         </AnimatePresence>

                                         <AnimatePresence>
                                             {showHp && activeAccount?.honorPoints !== undefined && (
                                                 <motion.span
                                                     initial={{ opacity: 0, scale: 0.8 }}
                                                     animate={{ opacity: 1, scale: 1 }}
                                                     exit={{ opacity: 0, scale: 0.8 }}
                                                     style={{
                                                         fontSize: '11px',
                                                         color: '#22c55e',
                                                         fontWeight: 800,
                                                         background: 'rgba(34, 197, 94, 0.12)',
                                                         border: '1.2px solid #22c55e',
                                                         padding: '2px 8px',
                                                         borderRadius: '6px',
                                                         fontFamily: '"Inter", sans-serif'
                                                     }}
                                                 >
                                                     {activeAccount.honorPoints.toLocaleString()} HP
                                                 </motion.span>
                                             )}
                                         </AnimatePresence>
                                     </div>
                                 )}

                                {/* Score & Rank */}
                                <AnimatePresence>
                                    {showScore && activeAccount?.score !== undefined && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}
                                        >
                                            <span style={{ fontSize: '16px', fontWeight: 800, color: activeAccent.color }}>
                                                {activeAccount.score.toLocaleString()} pts
                                            </span>
                                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                                                (#{activeAccount.rank || 1})
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Alliance tag & name */}
                                <AnimatePresence>
                                    {showAlliance && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            {activeAccount?.allianceTag && (
                                                <span style={{
                                                    fontSize: '13px',
                                                    color: activeAccent.color,
                                                    fontWeight: 800,
                                                    background: `${activeAccent.color}22`,
                                                    padding: '1px 6px',
                                                    borderRadius: '4px'
                                                }}>
                                                    [{activeAccount.allianceTag}]
                                                </span>
                                            )}
                                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
                                                {activeAccount?.allianceName || 'Independent Alliance'}
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Planets and moons counts */}
                                <AnimatePresence>
                                    {showColonies && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            style={{ fontSize: '13px', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <Globe size={14} style={{ color: activeAccent.color }} />
                                            <span>{planetCount} Planets / {moonCount} Moons Established</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Motto Tagline */}
                                <AnimatePresence>
                                    {tagline && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontWeight: 500 }}
                                        >
                                            "{tagline}"
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Dynamic Generation Date */}
                            <AnimatePresence>
                                {showDate && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.3 }}
                                        exit={{ opacity: 0 }}
                                        style={{ fontSize: '11px', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Calendar size={12} />
                                        <span>Generated: {getFormattedDate()}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* COLUMN 2: Yields and Achievements (Center - width: 220px) */}
                        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '24px', height: '100%', justifyContent: 'center' }}>
                            
                            {/* Yields */}
                            <AnimatePresence>
                                {showYields && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                                    >
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 800, letterSpacing: '1px' }}>DAILY PRODUCTION</div>
                                        {[
                                            { label: 'Metal', val: dailyProduction.metal, color: '#E6953C' },
                                            { label: 'Crystal', val: dailyProduction.crystal, color: '#4CAEE6' },
                                            { label: 'Deuterium', val: dailyProduction.deuterium, color: '#43D159' }
                                        ].map(y => (
                                            <div key={y.label} style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '12px' }}>
                                                <span className="resource-label">{y.label}</span>
                                                <span className="resource-value" style={{ color: y.color }}>+{formatNumber(y.val)} / day</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Missions */}
                            <AnimatePresence>
                                {showMissions && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                                    >
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 800, letterSpacing: '1px' }}>MISSION COUNTERS</div>
                                        {[
                                            { label: 'Expeditions', val: expeditionCount },
                                            { label: 'LF Discoveries', val: discoveryCount },
                                            { label: 'Combats', val: combatCount },
                                            { label: 'Harvested DFs', val: harvestCount }
                                        ].map(m => (
                                            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '12px' }}>
                                                <span className="stat-label">{m.label}</span>
                                                <span className="stat-value">{m.val.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* COLUMN 3: Profile Avatar (Right - width: 180px) */}
                        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                            
                            {/* Glowing Avatar */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '110px' }}>
                                <div className="avatar-dash-ring" />
                                <div className="avatar-glow-ring">
                                    <div style={{ width: '86px', height: '86px', borderRadius: '50%', overflow: 'hidden', background: '#0b0f19', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {(() => {
                                            let avUrl = '/icons/nexus.png';
                                            if (avatarType === 'current' && activeAccount?.avatarUrl) {
                                                avUrl = activeAccount.avatarUrl;
                                            } else if (avatarType === 'lifeform') {
                                                const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
                                                avUrl = `/icons/lifeforms/${lfNames[selectedLfAvatar - 1]}-icon-large.jpg`;
                                            } else if (avatarType === 'custom' && customAvatarUrl) {
                                                avUrl = customAvatarUrl;
                                            }
                                            return (
                                                <img
                                                    src={avUrl}
                                                    alt="Avatar"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        const parent = e.currentTarget.parentElement;
                                                        if (parent) {
                                                            const el = document.createElement('div');
                                                            el.style.color = activeAccent.color;
                                                            el.style.fontFamily = '"Outfit", sans-serif';
                                                            el.style.fontSize = '30px';
                                                            el.style.fontWeight = '900';
                                                            el.innerText = activeAccount?.playerName?.charAt(0).toUpperCase() || 'C';
                                                            parent.appendChild(el);
                                                        }
                                                    }}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Watermark in bottom center of card with Logo */}
                        <AnimatePresence>
                            {showWatermark && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 2,
                                    gridColumn: '1 / -1',
                                    pointerEvents: 'none'
                                }}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 0.8, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: 'rgba(8, 12, 20, 0.65)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '20px',
                                            padding: '4px 12px',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                            backdropFilter: 'blur(4px)',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <img src="/icons/nexus.png" alt="OG Nexus Logo" style={{ width: '14px', height: '14px', filter: 'brightness(1.1) drop-shadow(0 0 3px rgba(255,255,255,0.4))' }} />
                                        <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.85)', letterSpacing: '1.5px', fontFamily: '"Outfit", sans-serif' }}>
                                            OGAME NEXUS
                                        </span>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Actions Row */}
                    <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '600px', marginTop: '8px' }}>
                        
                        {/* Copy to Clipboard */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleGenerateImage('copy')}
                            style={{
                                flex: 1,
                                background: copyStatus === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 242, 255, 0.05)',
                                border: copyStatus === 'success' ? '1.5px solid #22c55e' : `1.5px solid ${activeAccent.color}55`,
                                color: copyStatus === 'success' ? '#22c55e' : '#fff',
                                padding: '14px 24px',
                                borderRadius: '14px',
                                fontSize: '14px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.3s'
                            }}
                        >
                            {copyStatus === 'idle' && (
                                <>
                                    <Copy size={18} style={{ color: activeAccent.color }} /> Copy Image to Clipboard
                                </>
                            )}
                            {copyStatus === 'success' && (
                                <>
                                    <Check size={18} /> Copied PNG Successfully!
                                </>
                            )}
                            {copyStatus === 'error' && (
                                <>
                                    <RefreshCw size={18} /> Retry Clipboard Copy
                                </>
                            )}
                        </motion.button>

                        {/* Download File */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleGenerateImage('download')}
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                                color: '#fff',
                                padding: '14px 24px',
                                borderRadius: '14px',
                                fontSize: '14px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.3s'
                            }}
                        >
                            {downloadStatus === 'idle' ? (
                                <>
                                    <Download size={18} /> Download Image PNG
                                </>
                            ) : (
                                <>
                                    <Check size={18} color="#22c55e" /> Download Triggered!
                                </>
                            )}
                        </motion.button>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default SignatureMaker;
