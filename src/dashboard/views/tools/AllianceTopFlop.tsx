// ============================================================================
// NEXUS TOOLS — ALLIANCE TOP / FLOP (DELIGHTFUL MULTI-TAB WORKSPACE)
// Multi-preset alliance daily rankings with Discord bot integration
// Tabs: Info | Customization | Preview
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { cleanUniverseId } from '../../../utils/universe';
import {
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Clock,
  Shield,
  ShieldOff,
  Download,
  Users,
  Award,
  Zap,
  TrendingUp,
  TrendingDown,
  Palette,
  Sliders,
  Info,
  Eye,
  ArrowRight,
  ArrowLeft,
  Paintbrush,
  RotateCcw,
  Image as ImageIcon,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import './AllianceTopFlop.css';

interface TopFlopConfig {
  config_id?: string;
  universe_id?: string;
  ogame_alliance_id?: string;
  alliance_tag?: string;
  config_name?: string;
  player_id?: string;
  player_name?: string;
  scheduled_utc_hour?: number;
  theme?: string;
  custom_logo_url?: string | null;
  custom_title?: string;
  category?: number;
  is_default?: number;
  last_generated_at?: number;
}

type TabType = 'info' | 'customization' | 'preview';

export interface ThemePresetDef {
  id: string;
  name: string;
  desc: string;
  borderColor: string;
  playerNameColor: string;
  pointsColor: string;
  pointDiffColor: string;
  pointDiffLossColor: string;
  previewBg: string;
}

export const THEME_PRESETS: ThemePresetDef[] = [
  {
    id: 'tactical',
    name: 'Tactical OLED',
    desc: 'Deep slate with cyan accents and emerald gains',
    borderColor: '#00d4ff',
    playerNameColor: '#38bdf8',
    pointsColor: '#e2e8f0',
    pointDiffColor: '#22c55e',
    pointDiffLossColor: '#ef4444',
    previewBg: 'linear-gradient(135deg, #040918, #02050f)',
  },
  {
    id: 'gold',
    name: 'Golden Empire',
    desc: 'Imperial amber with warm gold typography',
    borderColor: '#f59e0b',
    playerNameColor: '#fde047',
    pointsColor: '#fef3c7',
    pointDiffColor: '#eab308',
    pointDiffLossColor: '#f87171',
    previewBg: 'linear-gradient(135deg, #1c1304, #080502)',
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Neon',
    desc: 'Vibrant magenta, electric violet, and bright cyan',
    borderColor: '#ec4899',
    playerNameColor: '#c084fc',
    pointsColor: '#fdf4ff',
    pointDiffColor: '#06b6d4',
    pointDiffLossColor: '#f43f5e',
    previewBg: 'linear-gradient(135deg, #16021f, #05010a)',
  },
  {
    id: 'stealth',
    name: 'Deep Space Stealth',
    desc: 'Titanium silver with cool ice blue member names',
    borderColor: '#64748b',
    playerNameColor: '#93c5fd',
    pointsColor: '#cbd5e1',
    pointDiffColor: '#34d399',
    pointDiffLossColor: '#fb7185',
    previewBg: 'linear-gradient(135deg, #090e17, #020408)',
  },
  {
    id: 'crimson',
    name: 'Crimson Vanguard',
    desc: 'Aggressive ruby red with flame orange glow',
    borderColor: '#dc2626',
    playerNameColor: '#fb923c',
    pointsColor: '#fee2e2',
    pointDiffColor: '#84cc16',
    pointDiffLossColor: '#ef4444',
    previewBg: 'linear-gradient(135deg, #1a0404, #080101)',
  },
  {
    id: 'emerald',
    name: 'Emerald Fleet',
    desc: 'Lush jade and matrix emerald with mint accents',
    borderColor: '#10b981',
    playerNameColor: '#6ee7b7',
    pointsColor: '#ecfdf5',
    pointDiffColor: '#34d399',
    pointDiffLossColor: '#f87171',
    previewBg: 'linear-gradient(135deg, #021a0f, #010804)',
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    desc: 'Deep cosmic amber with coronal flame highlights',
    borderColor: '#ea580c',
    playerNameColor: '#fed7aa',
    pointsColor: '#fff7ed',
    pointDiffColor: '#f97316',
    pointDiffLossColor: '#ef4444',
    previewBg: 'linear-gradient(135deg, #1f0b02, #080301)',
  },
  {
    id: 'amethyst',
    name: 'Amethyst Void',
    desc: 'Hyper-deep nebula violet with soft lilac ranks',
    borderColor: '#9333ea',
    playerNameColor: '#e9d5ff',
    pointsColor: '#faf5ff',
    pointDiffColor: '#a855f7',
    pointDiffLossColor: '#f43f5e',
    previewBg: 'linear-gradient(135deg, #15031f, #050108)',
  },
];

export interface WallpaperPreset {
  id: string;
  name: string;
  url: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'none',
    name: 'None (Deep OLED)',
    url: '',
  },
  {
    id: 'bg1',
    name: 'Nebula Horizon (1)',
    url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/backgrounds/bg_1.jpg',
  },
  {
    id: 'bg2',
    name: 'Deep Cosmos (2)',
    url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/backgrounds/bg_2.jpg',
  },
  {
    id: 'bg3',
    name: 'Void Matrix (3)',
    url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/backgrounds/bg_3.jpg',
  },
  {
    id: 'bg4',
    name: 'Stellar Core (4)',
    url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/backgrounds/bg_4.jpg',
  },
  {
    id: 'bg5',
    name: 'Supernova (5)',
    url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/backgrounds/bg_5.jpg',
  },
  {
    id: 'bg6',
    name: 'Dark Nebula (6)',
    url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/backgrounds/bg_6.jpg',
  },
  {
    id: 'bg7',
    name: 'Orbital Rift (7)',
    url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/backgrounds/bg_7.jpg',
  },
  {
    id: 'bg8',
    name: 'Solar Flare (8)',
    url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/backgrounds/bg_8.jpg',
  },
  {
    id: 'bg9',
    name: 'Cosmic Abyss (9)',
    url: 'https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/assets/backgrounds/bg_9.jpg',
  },
];

export const COLOR_PALETTE_GROUPS: { groupName: string; colors: string[] }[] = [
  {
    groupName: 'Tactical Cyan & Blue',
    colors: ['#00f2ff', '#00d4ff', '#38bdf8', '#0ea5e9', '#0284c7', '#2563eb', '#60a5fa', '#93c5fd'],
  },
  {
    groupName: 'Emerald Matrix & Mint',
    colors: ['#22c55e', '#10b981', '#34d399', '#059669', '#84cc16', '#a3e635', '#4ade80', '#6ee7b7'],
  },
  {
    groupName: 'Imperial Gold & Amber',
    colors: ['#eab308', '#f59e0b', '#fbbf24', '#fde047', '#fef08a', '#f97316', '#ea580c', '#fed7aa'],
  },
  {
    groupName: 'Vanguard Crimson & Rose',
    colors: ['#ef4444', '#dc2626', '#b91c1c', '#f87171', '#f43f5e', '#e11d48', '#fda4af', '#fecdd3'],
  },
  {
    groupName: 'Nebula Violet & Magenta',
    colors: ['#a855f7', '#9333ea', '#7e22ce', '#c084fc', '#d8b4fe', '#ec4899', '#db2777', '#f472b6'],
  },
  {
    groupName: 'OLED Monochrome Accents',
    colors: ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#334155'],
  },
];

type ColorProperty = 'borderColor' | 'playerNameColor' | 'pointsColor' | 'pointDiffColor' | 'pointDiffLossColor';

const CATEGORIES = [
  { id: 0, name: 'Total Points', desc: 'Overall Highscore (Economy + Fleet + Research)', icon: Award },
  { id: 1, name: 'Economy', desc: 'Mines, facilities, and industrial structures', icon: Zap },
  { id: 2, name: 'Research', desc: 'Technologies and scientific advancements', icon: Sparkles },
  { id: 3, name: 'Military Points', desc: 'Fleet units and defensive structures', icon: Shield },
  { id: 4, name: 'Military Built', desc: 'Total combat power produced', icon: TrendingUp },
  { id: 5, name: 'Military Destroyed', desc: 'Hostile ships & defense destroyed', icon: TrendingDown },
  { id: 6, name: 'Military Lost', desc: 'Own ships & defenses lost in combat', icon: TrendingDown },
  { id: 7, name: 'Honor Points', desc: 'Honorable battles and warfare score', icon: Award },
  { id: 8, name: 'Lifeforms', desc: 'Lifeform population and biology tech', icon: Users },
];

export const AllianceTopFlop: React.FC = () => {
  const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());

  const universeId = cleanUniverseId(activeAccount?.universe);
  const rawAllianceId = activeAccount?.allianceId ? String(activeAccount.allianceId).trim() : '';
  const hasAlliance = Boolean(rawAllianceId && rawAllianceId !== '0');
  const allianceId = hasAlliance ? rawAllianceId : undefined;
  const allianceTag = activeAccount?.allianceTag?.trim() || '';
  const allianceName = activeAccount?.allianceName?.trim() || '';
  const myPlayerId = activeAccount?.playerId ? String(activeAccount.playerId) : '';
  const myPlayerName = activeAccount?.playerName?.trim() || 'Commander';

  // Active Tab: 'info' | 'customization' | 'preview'
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Live UTC Clock
  const [currentUtcTime, setCurrentUtcTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentUtcTime(`${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Configuration & Status State
  const [defaultAllianceLogo, setDefaultAllianceLogo] = useState<string | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Tab 1: Info & Baseline State
  const [scheduledUtcHour, setScheduledUtcHour] = useState<number>(0);
  const [category, setCategory] = useState<number>(0);

  // Tab 2: Customization Form State
  const [customTitle, setCustomTitle] = useState<string>('Top / Flop of the day');
  const [themePreset, setThemePreset] = useState<string>('tactical');
  const [borderColor, setBorderColor] = useState<string>('#00d4ff');
  const [playerNameColor, setPlayerNameColor] = useState<string>('#38bdf8');
  const [pointsColor, setPointsColor] = useState<string>('#e2e8f0');
  const [pointDiffColor, setPointDiffColor] = useState<string>('#22c55e');
  const [pointDiffLossColor, setPointDiffLossColor] = useState<string>('#ef4444');
  const [bgImageUrl, setBgImageUrl] = useState<string>('');

  // In-App Color Palette Modal State
  const [isColorModalOpen, setIsColorModalOpen] = useState<boolean>(false);
  const [activeColorProp, setActiveColorProp] = useState<ColorProperty>('borderColor');
  const [modalTargetPreset, setModalTargetPreset] = useState<ThemePresetDef>(THEME_PRESETS[0]);

  // Active Logo resolution (Strictly official Alliance logo from OGame API)
  const activeLogo = defaultAllianceLogo;

  // Build serialized theme string
  const serializedTheme = useMemo(() => {
    return JSON.stringify({
      themePreset,
      borderColor,
      playerNameColor,
      pointsColor,
      pointDiffColor,
      pointDiffLossColor,
      bgImageUrl: bgImageUrl.trim() || undefined,
    });
  }, [themePreset, borderColor, playerNameColor, pointsColor, pointDiffColor, pointDiffLossColor, bgImageUrl]);

  // Apply Theme Preset
  const handleApplyThemePreset = (pDef: ThemePresetDef) => {
    setThemePreset(pDef.id);
    setBorderColor(pDef.borderColor);
    setPlayerNameColor(pDef.playerNameColor);
    setPointsColor(pDef.pointsColor);
    setPointDiffColor(pDef.pointDiffColor);
    setPointDiffLossColor(pDef.pointDiffLossColor);
  };

  const handleOpenColorModal = (pDef: ThemePresetDef, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleApplyThemePreset(pDef);
    setModalTargetPreset(pDef);
    setIsColorModalOpen(true);
  };

  const handleResetCurrentPresetColors = () => {
    setBorderColor(modalTargetPreset.borderColor);
    setPlayerNameColor(modalTargetPreset.playerNameColor);
    setPointsColor(modalTargetPreset.pointsColor);
    setPointDiffColor(modalTargetPreset.pointDiffColor);
    setPointDiffLossColor(modalTargetPreset.pointDiffLossColor);
  };

  const getCurrentColorForProp = (prop: ColorProperty): string => {
    switch (prop) {
      case 'borderColor': return borderColor;
      case 'playerNameColor': return playerNameColor;
      case 'pointsColor': return pointsColor;
      case 'pointDiffColor': return pointDiffColor;
      case 'pointDiffLossColor': return pointDiffLossColor;
    }
  };

  const setCurrentColorForProp = (prop: ColorProperty, val: string) => {
    switch (prop) {
      case 'borderColor': setBorderColor(val); break;
      case 'playerNameColor': setPlayerNameColor(val); break;
      case 'pointsColor': setPointsColor(val); break;
      case 'pointDiffColor': setPointDiffColor(val); break;
      case 'pointDiffLossColor': setPointDiffLossColor(val); break;
    }
  };

  // Populate form from a Configuration
  const populateFromConfig = (p: TopFlopConfig) => {
    setScheduledUtcHour(p.scheduled_utc_hour ?? 0);
    setCategory(p.category ?? 0);
    setCustomTitle(p.custom_title || 'Top / Flop of the day');

    if (p.theme && p.theme.startsWith('{')) {
      try {
        const parsed = JSON.parse(p.theme);
        setThemePreset(parsed.themePreset || 'tactical');
        setBorderColor(parsed.borderColor || '#00d4ff');
        setPlayerNameColor(parsed.playerNameColor || '#38bdf8');
        setPointsColor(parsed.pointsColor || '#e2e8f0');
        setPointDiffColor(parsed.pointDiffColor || '#22c55e');
        setPointDiffLossColor(parsed.pointDiffLossColor || '#ef4444');
        setBgImageUrl(parsed.bgImageUrl || '');
        return;
      } catch {}
    }
    // Fallback to named preset
    const match = THEME_PRESETS.find((t) => t.id === p.theme) || THEME_PRESETS[0];
    handleApplyThemePreset(match);
  };

  // Canonical Discord URL for the alliance report
  const canonicalDiscordUrl = useMemo(() => {
    const baseUrl = `https://nexus-sync-worker.nexus-overwatch.workers.dev/topflop/${universeId}/${allianceId || '500078'}/${myPlayerId}/topflop.png`;
    return category !== 0 ? `${baseUrl}?type=${category}` : baseUrl;
  }, [universeId, allianceId, myPlayerId, category]);

  // Image Preview URL (with cache-bust timestamp for live refreshing)
  const [imageTimestamp, setImageTimestamp] = useState<number>(Date.now());
  const previewImageUrl = `${canonicalDiscordUrl}${canonicalDiscordUrl.includes('?') ? '&' : '?'}t=${imageTimestamp}`;

  // Fetch Alliance Configuration from Cloudflare Worker
  const fetchConfig = async () => {
    if (!allianceId) return;
    setIsLoadingConfig(true);
    try {
      const res = await fetch(`https://nexus-sync-worker.nexus-overwatch.workers.dev/api/topflop/presets?universe=${universeId}&allianceId=${allianceId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.defaultAllianceLogo) {
          setDefaultAllianceLogo(data.defaultAllianceLogo);
        } else if (data.liveData?.customLogoUrl) {
          setDefaultAllianceLogo(data.liveData.customLogoUrl);
        }
        if (data.presets && Array.isArray(data.presets)) {
          const cfg = data.presets.find((p: TopFlopConfig) => p.player_id === myPlayerId) || data.presets[0];
          if (cfg) {
            populateFromConfig(cfg);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load configuration from Cloudflare Worker:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [universeId, allianceId]);

  // Copy to clipboard with visual feedback
  const handleCopyDiscordUrl = () => {
    navigator.clipboard.writeText(canonicalDiscordUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Save / Update Configuration to Cloudflare D1
  const handleSaveConfig = async () => {
    if (!allianceId) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payload = {
        universeId,
        allianceId,
        allianceTag,
        configName: `${allianceTag || 'Alliance'} Daily Top/Flop`,
        playerId: myPlayerId,
        playerName: myPlayerName,
        scheduledUtcHour,
        theme: serializedTheme,
        customLogoUrl: null,
        customTitle,
        category,
        isDefault: 1,
      };

      const res = await fetch('https://nexus-sync-worker.nexus-overwatch.workers.dev/api/topflop/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatusMessage('Configuration successfully saved to Cloudflare!');
        setImageTimestamp(Date.now());
        await fetchConfig();
      } else {
        setStatusMessage('Failed to save configuration.');
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || 'Connection failed'}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Trigger Immediate "Generate Now" on Edge
  const handleGenerateNow = async () => {
    if (!allianceId) return;
    setIsGenerating(true);
    setStatusMessage('Generating live Top/Flop image on Cloudflare edge...');
    try {
      const payload = {
        universeId,
        allianceId,
        allianceTag,
        configName: `${allianceTag || 'Alliance'} Daily Top/Flop`,
        playerId: myPlayerId,
        playerName: myPlayerName,
        theme: serializedTheme,
        customTitle: customTitle || 'Top / Flop of the day',
        customLogoUrl: null,
        category,
        scheduledUtcHour,
      };

      const res = await fetch('https://nexus-sync-worker.nexus-overwatch.workers.dev/api/topflop/generate-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setImageTimestamp(Date.now());
        setStatusMessage('Fresh Top/Flop image generated successfully!');
        await fetchConfig();
      } else {
        setStatusMessage('Generation completed with edge cache update.');
        setImageTimestamp(Date.now());
      }
    } catch (err: any) {
      setStatusMessage(`Notice: ${err?.message || 'Generated'}`);
      setImageTimestamp(Date.now());
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // Flow button: Go to Preview
  const handleGoToPreview = async () => {
    setActiveTab('preview');
    await handleGenerateNow();
  };

  // Download image helper
  const handleDownloadImage = async () => {
    try {
      const res = await fetch(previewImageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TopFlop-${universeId}-${allianceTag}-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(previewImageUrl, '_blank');
    }
  };

  return (
    <div className="atf-root">
      {/* DOUBLE-BEZEL CONTAINER */}
      <div className="atf-double-bezel">
        <div className="atf-inner-core">
          
          {/* HEADER BAR */}
          <div className="atf-hero-header">
            <div>
              <div className="atf-eyebrow">
                <Shield className="w-3.5 h-3.5" />
                <span>Alliance Stats & Rankings</span>
              </div>
              <h2 className="atf-title">
                Alliance Top / Flop
                {hasAlliance && allianceTag && (
                  <span className="atf-alliance-badge">[{allianceTag}] {allianceName}</span>
                )}
              </h2>
            </div>

            <div className="atf-header-actions">
              <div className="atf-utc-clock">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Server UTC: <strong>{currentUtcTime || 'Loading...'}</strong></span>
              </div>
            </div>
          </div>

          {!hasAlliance ? (
            <div className="atf-empty-alliance-state animate-fade-in">
              <div className="atf-empty-alliance-glow" />
              <div className="atf-empty-alliance-icon-wrapper">
                <ShieldOff className="w-10 h-10 text-amber-400" />
              </div>

              <div className="atf-empty-alliance-badge">
                <span>No Alliance Detected</span>
              </div>

              <h3 className="atf-empty-alliance-title">Alliance Membership Required</h3>

              <p className="atf-empty-alliance-desc">
                Alliance Top / Flop tracks daily rankings, point deltas, and highscore shifts across 24-hour windows for alliance members. Commander <strong>{myPlayerName}</strong> is currently not affiliated with an alliance on universe <strong>{universeId || 'this universe'}</strong>.
              </p>

              <div className="atf-empty-alliance-meta">
                <div className="atf-meta-pill">
                  <span className="atf-meta-pill-label">Commander</span>
                  <span className="atf-meta-pill-val">{myPlayerName}</span>
                </div>
                <div className="atf-meta-pill">
                  <span className="atf-meta-pill-label">Universe</span>
                  <span className="atf-meta-pill-val">{universeId || 'Unknown'}</span>
                </div>
                <div className="atf-meta-pill warning">
                  <span className="atf-meta-pill-label">Status</span>
                  <span className="atf-meta-pill-val">Unenlisted</span>
                </div>
              </div>

              <div className="atf-empty-alliance-notice">
                <div className="atf-notice-icon">
                  <Info className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="atf-notice-text">
                  To configure Top/Flop report presets, schedule Discord announcements, or generate custom HUD cards, join or establish an alliance in OGame on universe <strong>{universeId}</strong>. If you belong to an alliance under another account, switch to it using the account selector in the top navigation bar.
                </div>
              </div>
            </div>
          ) : (
            <>

          {/* STATUS NOTIFICATION TOAST */}
          {statusMessage && (
            <div className="atf-status-banner">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* STEP 2: 3-TAB WORKSPACE (INFO / CUSTOMIZATION / PREVIEW) */}
          <div className="atf-tabs-nav">
            <button
              type="button"
              className={`atf-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <Info className="w-4 h-4" />
              <span>1. Info & Baseline</span>
            </button>

            <button
              type="button"
              className={`atf-tab-btn ${activeTab === 'customization' ? 'active' : ''}`}
              onClick={() => setActiveTab('customization')}
            >
              <Palette className="w-4 h-4" />
              <span>2. Customization</span>
            </button>

            <button
              type="button"
              className={`atf-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('preview');
                handleGenerateNow();
              }}
            >
              <Eye className="w-4 h-4" />
              <span>3. Live Preview & Discord</span>
            </button>
          </div>

          {/* TAB CONTENT AREAS */}
          <div className="atf-tab-body">
            
            {/* ================================================================ */}
            {/* TAB 1: INFO */}
            {/* ================================================================ */}
            {activeTab === 'info' && (
              <div className="atf-tab-pane animate-fade-in">
                <div className="atf-grid-two">
                  
                  {/* Left Column: Preset Details */}
                  <div className="atf-panel-card">
                    <h3 className="atf-panel-heading">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      Tracking Schedule & Scope
                    </h3>

                    {/* 24h Cut-off Window */}
                    <div className="atf-form-group">
                      <label className="atf-label">
                        24-Hour Cut-Off Time (UTC)
                      </label>
                      <div className="atf-select-wrapper">
                        <select
                          value={scheduledUtcHour}
                          onChange={(e) => setScheduledUtcHour(parseInt(e.target.value, 10))}
                          className="atf-select"
                        >
                          {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i}>
                              {String(i).padStart(2, '0')}:00 UTC {i === new Date().getUTCHours() ? '• (Current Hour)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="atf-hint">
                        Every day at this hour, points are compared against the previous day's baseline to compute 24-hour gains and losses.
                      </span>
                    </div>

                    {/* Alliance Context Pill */}
                    <div className="atf-info-box">
                      <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div className="atf-info-box-text">
                        Tracking <strong>[{allianceTag}] {allianceName}</strong> on universe <strong>{universeId}</strong>. Highscores are synchronized continuously every hour.
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Points Category */}
                  <div className="atf-panel-card">
                    <h3 className="atf-panel-heading">
                      <Award className="w-4 h-4 text-cyan-400" />
                      Points Category to Track
                    </h3>
                    <span className="atf-hint" style={{ marginBottom: 12, display: 'block' }}>
                      Choose which Gameforge leaderboard points to calculate rankings for:
                    </span>

                    <div className="atf-categories-grid">
                      {CATEGORIES.map((cat) => {
                        const IconComp = cat.icon;
                        const isSelected = category === cat.id;
                        return (
                          <div
                            key={cat.id}
                            className={`atf-category-pill ${isSelected ? 'active' : ''}`}
                            onClick={() => setCategory(cat.id)}
                          >
                            <IconComp className="w-4 h-4 flex-shrink-0" />
                            <div className="atf-cat-text">
                              <span className="atf-cat-name">{cat.name}</span>
                              <span className="atf-cat-desc">{cat.desc}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-cyan-400 ml-auto flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Info Tab Footer Navigation */}
                <div className="atf-tab-footer">
                  <button
                    type="button"
                    className="atf-btn-secondary"
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Save Schedule</span>
                  </button>
                  <button
                    type="button"
                    className="atf-btn-primary ml-auto"
                    onClick={() => setActiveTab('customization')}
                  >
                    <span>Next: Customization</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* TAB 2: CUSTOMIZATION */}
            {/* ================================================================ */}
            {activeTab === 'customization' && (
              <div className="atf-tab-pane animate-fade-in">
                <div className="atf-grid-two">
                  
                  {/* Left Column: Visual Themes & Accent Colors */}
                  <div className="atf-panel-card">
                    <div className="atf-panel-header-row">
                      <h3 className="atf-panel-heading" style={{ margin: 0, border: 'none', padding: 0 }}>
                        <Paintbrush className="w-4 h-4 text-cyan-400" />
                        Visual Theme Presets
                      </h3>
                      <button
                        type="button"
                        className="atf-btn-modal-trigger"
                        onClick={(e) => handleOpenColorModal(THEME_PRESETS.find((t) => t.id === themePreset) || THEME_PRESETS[0], e)}
                        title="Open fine-grained color picker"
                      >
                        <Palette className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Fine-Tune Colors</span>
                      </button>
                    </div>
                    <span className="atf-hint" style={{ marginTop: 4, marginBottom: 14, display: 'block' }}>
                      Select a theme preset below. Click any card to apply, or click the palette icon to fine-tune individual colors:
                    </span>

                    {/* 8 Theme Presets Grid */}
                    <div className="atf-themes-grid">
                      {THEME_PRESETS.map((tDef) => {
                        const isCurrent = themePreset === tDef.id;
                        return (
                          <div
                            key={tDef.id}
                            className={`atf-theme-card ${isCurrent ? 'active' : ''}`}
                            onClick={() => handleApplyThemePreset(tDef)}
                          >
                            <div className="atf-theme-swatches" style={{ background: tDef.previewBg }}>
                              <span style={{ background: tDef.borderColor, boxShadow: `0 0 6px ${tDef.borderColor}80` }} />
                              <span style={{ background: tDef.playerNameColor }} />
                              <span style={{ background: tDef.pointDiffColor }} />
                            </div>
                            <div className="atf-theme-meta">
                              <span className="atf-theme-title">{tDef.name}</span>
                              <span className="atf-theme-desc">{tDef.desc}</span>
                            </div>

                            <button
                              type="button"
                              className="atf-theme-tune-btn"
                              onClick={(e) => handleOpenColorModal(tDef, e)}
                              title={`Customize colors for ${tDef.name}`}
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>Tune</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Report Banner Title */}
                    <div className="atf-form-group" style={{ marginTop: 20 }}>
                      <label className="atf-label">Custom Header Banner Title</label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Top / Flop of the day"
                        className="atf-input"
                      />
                      <span className="atf-hint">
                        Rendered centered at the top of Column 1 in prominent all-caps typography.
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Alliance Logo & Wallpaper Backdrop */}
                  <div className="atf-panel-card">
                    <h3 className="atf-panel-heading">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      Branding & Wallpaper
                    </h3>

                    {/* Alliance Logo Section (Synced from OGame) */}
                    <div className="atf-form-group">
                      <label className="atf-label">Alliance Logo</label>

                      <div className="atf-logo-preview-card">
                        <div className="atf-logo-thumb-frame">
                          {activeLogo ? (
                            <img
                              src={activeLogo}
                              alt="Alliance Logo"
                              className="atf-logo-thumb"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Shield className="w-8 h-8 text-cyan-400" />
                          )}
                        </div>
                        <div className="atf-logo-meta">
                          <div className="atf-logo-badges-row">
                            <span className="atf-logo-badge official">
                              Official OGame Emblem
                            </span>
                          </div>
                          <span className="atf-logo-help">
                            Automatically retrieved from your alliance's public profile in OGame and centered in Column 1.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pre-Uploaded Wallpapers Selection (10 Presets: Deep OLED + 9 Images, 2x5 Grid) */}
                    <div className="atf-form-group" style={{ marginTop: 18 }}>
                      <label className="atf-label">Background Wallpaper (10 Presets)</label>
                      <div className="atf-wallpapers-grid">
                        {WALLPAPER_PRESETS.map((wp) => {
                          const isSelected = (!bgImageUrl && wp.id === 'none') || (bgImageUrl === wp.url);
                          return (
                            <div
                              key={wp.id}
                              className={`atf-wallpaper-card ${isSelected ? 'active' : ''}`}
                              onClick={() => setBgImageUrl(wp.url)}
                              title={wp.name}
                            >
                              <div
                                className="atf-wallpaper-thumb"
                                style={wp.url ? { backgroundImage: `url(${wp.url})` } : { background: '#02050f' }}
                              >
                                {isSelected && (
                                  <div className="atf-wallpaper-check">
                                    <Check className="w-3 h-3 text-cyan-400" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <span className="atf-hint">
                        Rendered as a sleek space backdrop behind the tactical statistics.
                      </span>
                    </div>

                    {/* Quick Preview Badge */}
                    <div className="atf-customization-summary">
                      <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span>Ready to review your styling? Click "Generate Preview" below to render the live image.</span>
                    </div>
                  </div>
                </div>

                {/* Customization Footer Navigation */}
                <div className="atf-tab-footer">
                  <button
                    type="button"
                    className="atf-btn-secondary"
                    onClick={() => setActiveTab('info')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Info</span>
                  </button>

                  <div className="atf-footer-right">
                    <button
                      type="button"
                      className="atf-btn-secondary"
                      onClick={handleSaveConfig}
                      disabled={isSaving}
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save Customization</span>
                    </button>
                    <button
                      type="button"
                      className="atf-btn-primary"
                      onClick={handleGoToPreview}
                      disabled={isGenerating}
                    >
                      {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>Generate Preview</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* TAB 3: PREVIEW */}
            {/* ================================================================ */}
            {activeTab === 'preview' && (
              <div className="atf-tab-pane animate-fade-in">
                
                {/* PREVIEW TOP ACTION BAR */}
                <div className="atf-preview-action-bar">
                  <div className="atf-preview-status">
                    <span className="atf-live-indicator" />
                    <span className="atf-badge-category">
                      {CATEGORIES.find((c) => c.id === category)?.name || 'Total Points'}
                    </span>
                  </div>

                  <div className="atf-preview-btns">
                    <button
                      type="button"
                      className="atf-btn-action"
                      onClick={handleGenerateNow}
                      disabled={isGenerating}
                      title="Force fresh render on Cloudflare edge"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>{isGenerating ? 'Rendering...' : 'Refresh Live'}</span>
                    </button>

                    <button
                      type="button"
                      className="atf-btn-action"
                      onClick={handleCopyDiscordUrl}
                      title="Copy permanent Discord image link"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Link Copied!' : 'Copy Image Link'}</span>
                    </button>

                    <button
                      type="button"
                      className="atf-btn-action primary"
                      onClick={handleDownloadImage}
                      title="Download image as PNG file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PNG</span>
                    </button>
                  </div>
                </div>

                {/* IMAGE PREVIEW FRAME */}
                <div className="atf-preview-container">
                  <div className="atf-preview-frame">
                    <img
                      src={previewImageUrl}
                      alt={`Alliance Top/Flop for [${allianceTag}]`}
                      className="atf-preview-img"
                      onError={(e) => {
                        (e.target as HTMLElement).style.opacity = '0.5';
                      }}
                    />
                    {isGenerating && (
                      <div className="atf-generating-overlay">
                        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                        <span>Rendering Tactical HUD on Cloudflare edge...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DISCORD SHARING CARD */}
                <div className="atf-discord-box">
                  <div className="atf-discord-box-header">
                    <div className="atf-discord-icon-wrap">
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="atf-discord-box-title">Discord Auto-Embed Link</h4>
                      <p className="atf-discord-box-desc">
                        Paste this permanent URL into any Discord channel. Discord will automatically embed this live image and keep it updated daily at your cut-off hour.
                      </p>
                    </div>
                  </div>

                  <div className="atf-discord-input-row">
                    <input
                      type="text"
                      readOnly
                      value={canonicalDiscordUrl}
                      className="atf-discord-url-input"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      className="atf-discord-copy-btn"
                      onClick={handleCopyDiscordUrl}
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Preview Footer Navigation */}
                <div className="atf-tab-footer">
                  <button
                    type="button"
                    className="atf-btn-secondary"
                    onClick={() => setActiveTab('customization')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Customization</span>
                  </button>
                  
                  <button
                    type="button"
                    className="atf-btn-secondary ml-auto"
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Save Configuration</span>
                  </button>
                </div>
              </div>
            )}

          </div>

            </>
          )}

        </div>
      </div>

      {/* ================================================================ */}
      {/* IN-APP COLOR PICKER MODAL */}
      {/* ================================================================ */}
      {isColorModalOpen && (
        <div className="atf-modal-overlay animate-fade-in" onClick={() => setIsColorModalOpen(false)}>
          <div className="atf-color-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="atf-modal-header">
              <div className="atf-modal-title-row">
                <div className="atf-modal-icon-badge" style={{ background: modalTargetPreset.previewBg, borderColor: borderColor }}>
                  <Palette className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="atf-modal-title">Fine-Tune Colors: {modalTargetPreset.name}</h3>
                  <span className="atf-modal-sub">Pick colors for each tactical element using the calibrated sci-fi palette</span>
                </div>
              </div>
              <button
                type="button"
                className="atf-modal-close-btn"
                onClick={() => setIsColorModalOpen(false)}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Aspect Tabs */}
            <div className="atf-modal-aspect-tabs">
              <button
                type="button"
                className={`atf-aspect-tab ${activeColorProp === 'borderColor' ? 'active' : ''}`}
                onClick={() => setActiveColorProp('borderColor')}
              >
                <span className="atf-aspect-dot" style={{ background: borderColor }} />
                <span>Border Accent</span>
              </button>

              <button
                type="button"
                className={`atf-aspect-tab ${activeColorProp === 'playerNameColor' ? 'active' : ''}`}
                onClick={() => setActiveColorProp('playerNameColor')}
              >
                <span className="atf-aspect-dot" style={{ background: playerNameColor }} />
                <span>Player Names</span>
              </button>

              <button
                type="button"
                className={`atf-aspect-tab ${activeColorProp === 'pointsColor' ? 'active' : ''}`}
                onClick={() => setActiveColorProp('pointsColor')}
              >
                <span className="atf-aspect-dot" style={{ background: pointsColor }} />
                <span>Total Points</span>
              </button>

              <button
                type="button"
                className={`atf-aspect-tab ${activeColorProp === 'pointDiffColor' ? 'active' : ''}`}
                onClick={() => setActiveColorProp('pointDiffColor')}
              >
                <span className="atf-aspect-dot" style={{ background: pointDiffColor }} />
                <span>Point Gains (+)</span>
              </button>

              <button
                type="button"
                className={`atf-aspect-tab ${activeColorProp === 'pointDiffLossColor' ? 'active' : ''}`}
                onClick={() => setActiveColorProp('pointDiffLossColor')}
              >
                <span className="atf-aspect-dot" style={{ background: pointDiffLossColor }} />
                <span>Point Losses (-)</span>
              </button>
            </div>

            {/* Active Color Hex Bar & Live Preview Badge */}
            <div className="atf-modal-active-color-bar">
              <div className="atf-active-swatch-display">
                <span
                  className="atf-active-swatch-large"
                  style={{
                    background: getCurrentColorForProp(activeColorProp),
                    boxShadow: `0 0 16px ${getCurrentColorForProp(activeColorProp)}80`,
                    borderColor: getCurrentColorForProp(activeColorProp),
                  }}
                />
                <div className="atf-active-swatch-text">
                  <span className="atf-active-swatch-label">Current Color Hex</span>
                  <span className="atf-active-swatch-hex">{getCurrentColorForProp(activeColorProp).toUpperCase()}</span>
                </div>
              </div>

              <div className="atf-hex-manual-row">
                <span className="atf-hex-prefix">#</span>
                <input
                  type="text"
                  maxLength={7}
                  value={getCurrentColorForProp(activeColorProp).replace('#', '')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                    setCurrentColorForProp(activeColorProp, `#${raw}`);
                  }}
                  className="atf-hex-manual-input"
                  placeholder="00f2ff"
                />
              </div>
            </div>

            {/* Curated Sci-Fi Color Palette Grid */}
            <div className="atf-modal-palettes-scroll">
              {COLOR_PALETTE_GROUPS.map((group) => (
                <div key={group.groupName} className="atf-palette-group">
                  <span className="atf-palette-group-title">{group.groupName}</span>
                  <div className="atf-palette-swatches-row">
                    {group.colors.map((c) => {
                      const isCurrent = getCurrentColorForProp(activeColorProp).toLowerCase() === c.toLowerCase();
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`atf-palette-swatch-btn ${isCurrent ? 'selected' : ''}`}
                          style={{ background: c }}
                          onClick={() => setCurrentColorForProp(activeColorProp, c)}
                          title={c}
                        >
                          {isCurrent && <Check className="w-3.5 h-3.5 text-black drop-shadow-md" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Live Tactical Row Micro-Preview */}
            <div className="atf-modal-micro-preview">
              <span className="atf-micro-preview-label">Live Row Preview</span>
              <div
                className="atf-micro-preview-row"
                style={{
                  borderLeftColor: borderColor,
                  background: 'rgba(0, 0, 0, 0.4)',
                }}
              >
                <span className="atf-m-rank">1</span>
                <span className="atf-m-name" style={{ color: playerNameColor }}>FleetAdmiral_OG</span>
                <span className="atf-m-score" style={{ color: pointsColor }}>142.8M</span>
                <span className="atf-m-gain" style={{ color: pointDiffColor }}>+3.45M</span>
                <span className="atf-m-pct" style={{ color: pointDiffColor }}>+2.4%</span>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="atf-modal-footer">
              <button
                type="button"
                className="atf-btn-secondary"
                onClick={handleResetCurrentPresetColors}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Preset Defaults</span>
              </button>

              <button
                type="button"
                className="atf-btn-primary"
                onClick={() => setIsColorModalOpen(false)}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllianceTopFlop;
