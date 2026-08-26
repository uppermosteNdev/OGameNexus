import { AssistantNotification, AssistantCategory, OVERSEER_TAXONOMY, AssistantDomainId, AssistantSubCategoryId } from './types';
import {
  snoozeNotification,
  unsnoozeNotification,
  snoozeHierarchyNode,
  unsnoozeHierarchyNode,
  getAssistantSettings,
  saveAssistantSettings,
  evaluateAllNotifications,
  formatFriendlyRuleName,
  isKeySnoozed,
  formatNumber,
  formatROI
} from './rulesEngine';
import { findMatchingQueueItem } from '../../utils/amortizationCalc';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function renderPlanetTodosZone(note: AssistantNotification): string {
  const todos: any[] = note.meta?.todos;
  if (!todos || !Array.isArray(todos) || todos.length === 0) {
    return '';
  }

  const totalPlanetTodos = note.meta?.totalPlanetTodos || todos.length;
  const queueData = note.meta?.productionQueue;
  const queueItems: any[] = queueData?.items || [];
  const offset = queueData?.serverTimeOffset || 0;
  const currentServerTime = Date.now() + offset;

  return `
    <div class="nexus-todo-matrix">
      <div class="nexus-todo-matrix-header">
        <div class="todo-hdr-left">
          <span class="todo-hdr-icon">📋</span>
          <span class="todo-hdr-title">Top Priority Projects (${todos.length} of ${totalPlanetTodos})</span>
        </div>
        <div class="todo-hdr-right">
          <span class="todo-hdr-loc">${note.planetName || 'Planet'} [${note.coords || ''}]</span>
        </div>
      </div>

      <div class="nexus-todo-list">
        ${todos.map((t: any, idx: number) => {
          const rankNum = idx + 1;
          const rankColor = rankNum === 1 ? '#38bdf8' : rankNum === 2 ? '#22c55e' : '#c084fc';
          const msuCost = formatNumber(Math.round(t.msuCost));
          const msuDaily = formatNumber(Math.round((t.productionIncrease || 0) * 24));
          const roi = formatROI(t.roiHours);

          const ongoingQueue = findMatchingQueueItem(t, queueItems, note.coords);
          const remainingMs = ongoingQueue && ongoingQueue.endTimestamp > 0 ? Math.max(0, ongoingQueue.endTimestamp - currentServerTime) : 0;
          const remainingTimeStr = ongoingQueue && ongoingQueue.endTimestamp > 0 ? formatCountdown(remainingMs) : '';

          const ongoingBadgeHtml = ongoingQueue ? `
            <div class="todo-ongoing-badge" style="
              display: inline-flex;
              align-items: center;
              gap: 4px;
              background: linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.12) 100%);
              border: 1px solid rgba(245, 158, 11, 0.45);
              box-shadow: 0 0 8px rgba(245, 158, 11, 0.2);
              padding: 2px 7px;
              border-radius: 5px;
              font-size: 10px;
              font-weight: 800;
              color: #fbbf24;
              letter-spacing: 0.02em;
              margin-left: 6px;
              vertical-align: middle;
            ">
              <span style="
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: #f59e0b;
                box-shadow: 0 0 5px #f59e0b;
                display: inline-block;
                animation: ogNexusPulse 1.5s infinite;
              "></span>
              <span>ONGOING</span>
              <span class="nexus-todo-countdown-timer" data-end-ts="${ongoingQueue.endTimestamp}" style="opacity: 0.9; font-size: 9.5px; font-family: monospace; margin-left: 2px;">
                (${remainingTimeStr})
              </span>
            </div>
          ` : '';
          
          let iconUrl = t.icon || 'icons/resources/metal_mine_large.jpg';
          if (!iconUrl.startsWith('http') && !iconUrl.startsWith('chrome-extension://') && !iconUrl.startsWith('/')) {
            try {
              if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime?.getURL) {
                iconUrl = chrome.runtime.getURL(iconUrl);
              }
            } catch (e) {}
          }

          let directUrl = `/game/index.php?page=ingame&component=supplies&cp=${note.planetId}`;
          let directLabel = 'Supplies';
          const tType = String(t.type || '');
          if (tType === 'LifeformProductionBuildings' || tType === 'LifeformResearchBuildings' || tType === '2' || tType === '3') {
            directUrl = `/game/index.php?page=ingame&component=lfbuildings&cp=${note.planetId}`;
            directLabel = 'LF Buildings';
          } else if (tType === 'LifeformProductionResearches' || tType === 'LifeformExpeditionResearches' || tType === '4' || tType === '5') {
            directUrl = `/game/index.php?page=ingame&component=lfresearch&cp=${note.planetId}`;
            directLabel = 'LF Research';
          } else if (tType === 'PlasmaTechnology' || tType === '6') {
            directUrl = `/game/index.php?page=ingame&component=research&cp=${note.planetId}`;
            directLabel = 'Research';
          }

          return `
            <div class="nexus-todo-row">
              <div class="todo-rank-badge" style="color: ${rankColor}; border-color: ${rankColor}55; background: ${rankColor}18;">#${rankNum}</div>
              <div class="todo-icon-wrap">
                <img src="${iconUrl}" class="todo-icon-img" alt="" />
              </div>
              <div class="todo-main-info">
                <div class="todo-title-row">
                  <span class="todo-name">${t.name}</span>
                  <span class="todo-target-lvl">Level ${t.targetLevel}</span>
                  ${ongoingBadgeHtml}
                </div>
                <div class="todo-stats-row">
                  <span class="todo-stat-pill"><span class="lbl">Cost:</span> <span class="val-cost">${msuCost} MSU</span></span>
                  <span class="todo-stat-pill"><span class="lbl">Yield:</span> <span class="val-yield">+${msuDaily}/day</span></span>
                  <span class="todo-stat-pill"><span class="lbl">Payback:</span> <span class="val-roi">${roi}</span></span>
                </div>
              </div>
              <div class="todo-action-col">
                <a href="${directUrl}" class="todo-btn-dispatch" title="Upgrade ${t.name} to Level ${t.targetLevel}" target="_self">
                  <span>${directLabel}</span>
                  <span class="todo-btn-arrow">➔</span>
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
function getRiskColor(val: number, minVal: number, maxVal: number): string {
  if (maxVal <= minVal) return '#ef4444';
  const logMin = Math.log10(Math.max(1, minVal));
  const logMax = Math.log10(Math.max(1, maxVal));
  const t = Math.max(0, Math.min(1, (Math.log10(Math.max(1, val)) - logMin) / (logMax - logMin)));

  // 4 Color Morph Stops: Blue (#38bdf8) -> Green (#22c55e) -> Purple (#c084fc) -> Red (#ef4444)
  const stops = [
    { t: 0.00, r: 56,  g: 189, b: 248 }, // #38bdf8 (Blue - Minimum risk)
    { t: 0.33, r: 34,  g: 197, b: 94  }, // #22c55e (Green - Low-Mid risk)
    { t: 0.66, r: 192, g: 132, b: 252 }, // #c084fc (Purple - Mid-High risk)
    { t: 1.00, r: 239, g: 68,  b: 68  }  // #ef4444 (Red - Highest risk)
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (t >= s1.t && t <= s2.t) {
      const localT = (t - s1.t) / (s2.t - s1.t);
      const r = Math.round(s1.r + (s2.r - s1.r) * localT);
      const g = Math.round(s1.g + (s2.g - s1.g) * localT);
      const b = Math.round(s1.b + (s2.b - s1.b) * localT);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return '#ef4444';
}

function getResourceIconUrl(resName: 'metal' | 'crystal' | 'deuterium'): string {
  const path = `icons/resources/${resName}-icon-medium.jpg`;
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(path);
    }
  } catch (e) {}
  return path;
}

function renderFleetSaveExposedZone(note: AssistantNotification): string {
  const exposedLocations: any[] = note.meta?.exposedLocations;
  if (!exposedLocations || !Array.isArray(exposedLocations) || exposedLocations.length === 0) {
    return '';
  }

  const minMsu = note.meta?.minMsu ?? 10000000;
  const maxExposedMsu = exposedLocations[0]?.totalMsu || minMsu;
  const minExposedMsu = exposedLocations[exposedLocations.length - 1]?.totalMsu || minMsu;

  const metalIcon = getResourceIconUrl('metal');
  const crystalIcon = getResourceIconUrl('crystal');
  const deutIcon = getResourceIconUrl('deuterium');

  return `
    <div class="nexus-fs-matrix">
      <div class="nexus-fs-matrix-header">
        <div class="fs-hdr-left">
          <span class="fs-hdr-icon">📡</span>
          <span class="fs-hdr-title">Exposed Goods Breakdown (${exposedLocations.length} Locations)</span>
        </div>
        <div class="fs-hdr-right">
          <span class="fs-hdr-subtext">THRESHOLD:</span>
          <span class="fs-hdr-val">${formatNumber(minMsu)} MSU / loc</span>
        </div>
      </div>

      <div class="nexus-fs-locations-list intelligence-track">
        ${exposedLocations.map((loc: any, idx: number) => {
          const isPlanet = loc.type === 'planet';
          const rankNum = idx + 1;
          const riskColor = getRiskColor(loc.totalMsu, minExposedMsu, maxExposedMsu);
          const typeBadge = isPlanet 
            ? `<span class="fs-type-tag type-planet" title="Vulnerable to Sensor Phalanx scans!">⚠️ Planet (Phalanx Risk)</span>`
            : `<span class="fs-type-tag type-moon" title="Protected from Sensor Phalanx scans!">🛡️ Moon (Safe)</span>`;

          const planetThumb = loc.imgUrl 
            ? `<img src="${loc.imgUrl}" class="fs-loc-thumb-img" alt="" />`
            : `<span class="fs-loc-thumb-fallback">${isPlanet ? '🪐' : '🌕'}</span>`;

          return `
            <div class="nexus-fs-loc-card ${isPlanet ? 'is-planet-danger' : 'is-moon-loc'}">
              <div class="fs-loc-rank-col">
                <span class="fs-rank-badge" style="color: ${riskColor}; border-color: ${riskColor}55; background: ${riskColor}18;">#${rankNum}</span>
              </div>

              <div class="fs-loc-thumb-col">
                <div class="fs-loc-thumb-wrap">
                  ${planetThumb}
                </div>
              </div>

              <div class="fs-loc-main-col">
                <div class="fs-loc-title-row">
                  <div class="fs-loc-ident">
                    <span class="fs-loc-name">${loc.name}</span>
                    <span class="fs-loc-coords">[${loc.coords}]</span>
                    ${typeBadge}
                  </div>
                  <div class="fs-loc-total-msu">
                    <span class="fs-msu-label">TOTAL VALUE</span>
                    <span class="fs-msu-num" style="color: ${riskColor}; text-shadow: 0 0 10px ${riskColor}44;">${formatNumber(loc.totalMsu)} MSU</span>
                  </div>
                </div>

                <div class="fs-loc-breakdown-row">
                  <!-- RESOURCES WITH INDIVIDUAL ICONS -->
                  <div class="fs-pill fs-pill-res" title="Resources on site: ${loc.metal.toLocaleString()} Metal, ${loc.crystal.toLocaleString()} Crystal, ${loc.deuterium.toLocaleString()} Deuterium">
                    <span class="fs-pill-label">Resources:</span>
                    <span class="fs-pill-val">${formatNumber(loc.resMsu)} MSU</span>
                    <span class="fs-sub-res">
                      <span class="fs-res-item">
                        <img src="${metalIcon}" class="fs-mini-res-img" alt="M" />
                        <span class="c-m">${formatNumber(loc.metal)}</span>
                      </span>
                      <span class="fs-res-item">
                        <img src="${crystalIcon}" class="fs-mini-res-img" alt="C" />
                        <span class="c-c">${formatNumber(loc.crystal)}</span>
                      </span>
                      <span class="fs-res-item">
                        <img src="${deutIcon}" class="fs-mini-res-img" alt="D" />
                        <span class="c-d">${formatNumber(loc.deuterium)}</span>
                      </span>
                    </span>
                  </div>

                  <!-- STATIONED SHIPS -->
                  <div class="fs-pill fs-pill-ships" title="Stationed Ships: ${loc.shipsCount.toLocaleString()} ships (${formatNumber(loc.shipsMsu)} MSU value)">
                    <span class="fs-pill-icon">🚀</span>
                    <span class="fs-pill-label">Stationed Fleet:</span>
                    <span class="fs-pill-val">${formatNumber(loc.shipsCount)} ships</span>
                    <span class="fs-pill-val-sub">(${formatNumber(loc.shipsMsu)} MSU)</span>
                  </div>
                </div>
              </div>

              <div class="fs-loc-action-col">
                <a href="/game/index.php?page=ingame&component=fleetdispatch&cp=${loc.id}" class="fs-loc-btn-dispatch" title="Dispatch fleet from ${loc.name} [${loc.coords}]" target="_self">
                  <span>Dispatch</span>
                  <span class="fs-btn-arrow">➔</span>
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
import { getStoredFleetMovements } from '../fleetMovement';

type TabId = 'critical' | 'reminder' | 'logistics' | 'intel' | 'settings';

export function renderAssistantIcon(icon?: string): string {
  if (!icon) return '✨';
  if (icon.startsWith('<')) return icon;
  if (icon.includes('/') || icon.includes('.png') || icon.includes('.jpg') || icon.includes('.webp') || icon.includes('.svg')) {
    let src = icon;
    if (!icon.startsWith('http') && !icon.startsWith('chrome-extension://') && !icon.startsWith('/')) {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime?.getURL) {
          src = chrome.runtime.getURL(icon);
        }
      } catch (e) {
        src = icon;
      }
    }
    const isThemeIcon = icon.includes('themes/sci-fi') || icon.endsWith('.png');
    const typeClass = isThemeIcon ? 'nexus-theme-icon-img' : 'nexus-game-icon-img';
    return `<img src="${src}" class="nexus-assistant-icon-img ${typeClass}" alt="" />`;
  }
  return icon;
}

export async function openAssistantModal(
  notifications: AssistantNotification[],
  playerId: string,
  onUpdateCallback?: () => void,
  initialTab?: TabId
): Promise<void> {
  const existingModal = document.querySelector('#og-nexus-assistant-modal-overlay');
  if (existingModal) {
    existingModal.remove();
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'og-nexus-assistant-modal-overlay';
  overlay.className = 'nexus-modal-overlay';

  let currentTab: TabId = initialTab || 'critical';
  let activeNotifications = notifications;
  let settings = await getAssistantSettings();
  let expandedSections: Record<string, boolean> = {};
  let openBreadcrumbMenuKey: string | null = null;

  const renderModalContent = () => {
    const criticalNotes = activeNotifications.filter(n => n.category === 'critical');
    const reminderNotes = activeNotifications.filter(n => n.category === 'reminder');
    const logisticsNotes = activeNotifications.filter(n => n.category === 'logistics');
    const intelNotes = activeNotifications.filter(n => n.category === 'intel' || n.category === 'growth');
    const snoozedEntries = Object.entries(settings.snoozedRules || {});

    overlay.innerHTML = `
      <div class="nexus-assistant-modal">
        <!-- Header -->
        <div class="nexus-modal-header">
          <div class="nexus-modal-title-group">
            <div class="nexus-overseer-badge">
              <span class="nexus-pulse-dot ${criticalNotes.length > 0 ? 'pulse-danger' : (reminderNotes.length > 0 ? 'pulse-warning' : (logisticsNotes.length > 0 ? 'pulse-warning' : 'pulse-normal'))}"></span>
              <span class="nexus-overseer-emblem">OVERSEER</span>
            </div>
            <div>
              <div class="nexus-modal-heading-row">
                <h2 class="nexus-modal-title">Nexus Overseer Terminal</h2>
                <span class="nexus-telemetry-badge">${activeNotifications.length === 0 ? 'STATUS: NOMINAL' : `ACTIVE ALERTS: ${activeNotifications.length}`}</span>
              </div>
              <p class="nexus-modal-subtitle">Tactical empire diagnostics, security threat monitoring, and automated logistics intelligence.</p>
            </div>
          </div>
          <div class="nexus-modal-header-actions">
            <button class="nexus-modal-sync-btn" title="Fetch fresh account data and re-sync empire">
              <span class="hdr-btn-icon">${renderAssistantIcon('icons/themes/sci-fi/flash-on-lightning-96.png')}</span>
              <span>Re-sync Empire</span>
            </button>
            <button class="nexus-modal-refresh-btn" title="Re-scan local alerts and empire status">
              <span class="hdr-btn-icon">${renderAssistantIcon('icons/themes/sci-fi/sync-96.png')}</span>
              <span>Re-scan</span>
            </button>
            <button class="nexus-modal-close-btn" title="Close Overseer Terminal" aria-label="Close">✕</button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="nexus-modal-tabs">
          <button class="nexus-modal-tab ${currentTab === 'critical' ? 'active' : ''}" data-tab="critical">
            <span class="tab-icon">${renderAssistantIcon('icons/themes/sci-fi/high-priority-96.png')}</span> Warnings <span class="tab-badge ${criticalNotes.length > 0 ? 'badge-danger' : ''}">${criticalNotes.length}</span>
          </button>
          <button class="nexus-modal-tab ${currentTab === 'reminder' ? 'active' : ''}" data-tab="reminder">
            <span class="tab-icon">${renderAssistantIcon('icons/themes/sci-fi/bell-96.png')}</span> Reminders <span class="tab-badge ${reminderNotes.length > 0 ? 'badge-reminder' : ''}">${reminderNotes.length}</span>
          </button>
          <button class="nexus-modal-tab ${currentTab === 'logistics' ? 'active' : ''}" data-tab="logistics">
            <span class="tab-icon">${renderAssistantIcon('icons/themes/sci-fi/stopwatch-96.png')}</span> Logistics <span class="tab-badge ${logisticsNotes.length > 0 ? 'badge-warning' : ''}">${logisticsNotes.length}</span>
          </button>
          <button class="nexus-modal-tab ${currentTab === 'intel' ? 'active' : ''}" data-tab="intel">
            <span class="tab-icon">${renderAssistantIcon('icons/themes/sci-fi/idea-96.png')}</span> Intel <span class="tab-badge">${intelNotes.length}</span>
          </button>
          <button class="nexus-modal-tab ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
            <span class="tab-icon">${renderAssistantIcon('icons/themes/sci-fi/adjust-settings-96.png')}</span> Overseer Rules & Thresholds <span class="tab-badge ${snoozedEntries.length > 0 ? 'badge-snoozed' : ''}">${snoozedEntries.length}</span>
          </button>
        </div>

        <!-- Content Area -->
        <div class="nexus-modal-body">
          ${renderTabBody(currentTab, { criticalNotes, reminderNotes, logisticsNotes, intelNotes, snoozedEntries })}
        </div>
      </div>
    `;

    attachModalEvents();
  };

  const renderTabBody = (
    tab: TabId,
    data: {
      criticalNotes: AssistantNotification[];
      reminderNotes: AssistantNotification[];
      logisticsNotes: AssistantNotification[];
      intelNotes: AssistantNotification[];
      snoozedEntries: [string, any][];
    }
  ) => {
    let currentList: AssistantNotification[] = [];
    if (tab === 'critical') currentList = data.criticalNotes;
    else if (tab === 'reminder') currentList = data.reminderNotes;
    else if (tab === 'logistics') currentList = data.logisticsNotes;
    else if (tab === 'intel') currentList = data.intelNotes;

    if (tab === 'settings') {
      return renderTaxonomySettingsView(data.snoozedEntries);
    }

    if (currentList.length === 0) {
      return `
        <div class="nexus-modal-empty-state">
          <div class="empty-icon">🛡️</div>
          <h3>Perimeter Secure</h3>
          <p>No active anomalies or alerts detected in this sector. All telemetry is nominal.</p>
        </div>
      `;
    }

    return `
      <div class="nexus-cards-grid">
        ${currentList.map(note => {
          const isDeepSpace = (note.coords && (note.coords.endsWith(':16') || note.coords.includes(':16]'))) 
            || note.badgeText === 'EXPEDITION' 
            || note.badgeText === 'EXPEDITIONS' 
            || note.badgeText === 'DEPLETION'
            || note.ruleId?.includes('expedition') 
            || note.planetName === 'Deep Space';
          const defaultLabel = isDeepSpace ? 'Deep Space' : 'Planet';
          const planetEmoji = isDeepSpace ? '🌌' : '🪐';
          const planetLabel = note.planetName && note.planetName !== 'Planet' ? note.planetName : defaultLabel;

          const coordsHtml = note.coords
            ? `
              <div class="card-planet-pill">
                ${note.planetImgUrl ? `<img src="${note.planetImgUrl}" class="nexus-card-planet-thumb" alt="" />` : `<span class="planet-emoji">${planetEmoji}</span>`}
                <span class="nexus-card-planet-name">${planetLabel}</span>
                <span class="nexus-card-planet-coords">[${note.coords}]</span>
              </div>
            `
            : '';

          // Look up taxonomy labels for this notification
          const domainDef = OVERSEER_TAXONOMY.find(d => d.id === note.domain);
          const subCatDef = domainDef?.subCategories.find(s => s.id === note.subCategory);
          const ruleDef = subCatDef?.rules.find(r => r.id === note.ruleId);

          const domainTitle = domainDef?.name || 'Category';
          const subCatTitle = subCatDef?.name || 'Sub-Category';
          const ruleTitle = ruleDef?.name || note.title;

          const isDomainMenuOpen = openBreadcrumbMenuKey === `domain_${note.id}`;
          const isSubCatMenuOpen = openBreadcrumbMenuKey === `subcat_${note.id}`;
          const isRuleMenuOpen = openBreadcrumbMenuKey === `rule_${note.id}`;
          const hasOpenMenu = isDomainMenuOpen || isSubCatMenuOpen || isRuleMenuOpen;

          return `
            <div class="nexus-notification-card severity-${note.severity} ${hasOpenMenu ? 'has-open-menu' : ''}" data-card-id="${note.id}">
              <div class="card-inner-shell">
                <!-- Clickable Taxonomy Breadcrumb (Category > Subcategory > Rule) -->
                <div class="card-taxonomy-breadcrumb">
                  <div class="nexus-breadcrumb-item nexus-dropdown-wrapper" style="position: relative !important; z-index: ${isDomainMenuOpen ? '9999999 !important;' : '1;'};">
                    <button class="breadcrumb-btn ${isDomainMenuOpen ? 'active' : ''}" data-toggle-breadcrumb="domain_${note.id}" title="Click to mute or snooze ${domainTitle}">
                      <span class="bc-icon">${domainDef?.icon ? renderAssistantIcon(domainDef.icon) : '🪐'}</span>
                      <span class="bc-name">${domainTitle}</span>
                      <span class="bc-arrow">▾</span>
                    </button>
                    ${isDomainMenuOpen ? `
                      <div class="nexus-breadcrumb-menu" style="position: absolute !important; top: calc(100% + 6px) !important; left: 0 !important; min-width: 220px !important; background-color: #080d1a !important; background: #080d1a !important; border: 1px solid rgba(56, 189, 248, 0.6) !important; border-radius: 8px !important; box-shadow: 0 20px 60px rgba(0, 0, 0, 1), 0 0 25px rgba(0, 0, 0, 1), 0 0 14px rgba(56, 189, 248, 0.3) !important; padding: 6px !important; z-index: 99999999 !important;">
                        <div class="breadcrumb-menu-header" style="font-size: 9.5px !important; font-weight: 800 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #38bdf8 !important; padding: 4px 8px 6px 8px !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; margin-bottom: 6px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">Category: ${domainTitle}</div>
                        <button class="breadcrumb-menu-opt" data-breadcrumb-action="snooze" data-mute-level="domain" data-mute-key="${note.domain}" data-mute-type="until" data-mute-title="${domainTitle}" data-mute-icon="${domainDef?.icon}" style="width: 100% !important; box-sizing: border-box !important; background-color: #101726 !important; background: #101726 !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 6px !important; padding: 7px 10px !important; display: flex !important; align-items: center !important; gap: 8px !important; text-align: left !important; cursor: pointer !important; color: #f1f5f9 !important; font-size: 11px !important; font-weight: 600 !important; margin-bottom: 4px !important;">
                          <span class="opt-icon">${renderAssistantIcon('icons/themes/sci-fi/stopwatch-96.png')}</span>
                          <span class="opt-text">Snooze Category (24h)</span>
                        </button>
                        <button class="breadcrumb-menu-opt opt-danger" data-breadcrumb-action="mute" data-mute-level="domain" data-mute-key="${note.domain}" data-mute-type="forever" data-mute-title="${domainTitle}" data-mute-icon="${domainDef?.icon}" style="width: 100% !important; box-sizing: border-box !important; background-color: rgba(239, 68, 68, 0.12) !important; background: rgba(239, 68, 68, 0.12) !important; border: 1px solid rgba(239, 68, 68, 0.35) !important; border-radius: 6px !important; padding: 7px 10px !important; display: flex !important; align-items: center !important; gap: 8px !important; text-align: left !important; cursor: pointer !important; color: #fca5a5 !important; font-size: 11px !important; font-weight: 600 !important; margin-bottom: 0 !important;">
                          <span class="opt-icon">${renderAssistantIcon('icons/themes/sci-fi/cancel-144.png')}</span>
                          <span class="opt-text">Mute Category (Forever)</span>
                        </button>
                      </div>
                    ` : ''}
                  </div>

                  <span class="breadcrumb-divider">›</span>

                  <div class="nexus-breadcrumb-item nexus-dropdown-wrapper" style="position: relative !important; z-index: ${isSubCatMenuOpen ? '9999999 !important;' : '1;'};">
                    <button class="breadcrumb-btn ${isSubCatMenuOpen ? 'active' : ''}" data-toggle-breadcrumb="subcat_${note.id}" title="Click to mute or snooze ${subCatTitle}">
                      <span class="bc-icon">${subCatDef?.icon ? renderAssistantIcon(subCatDef.icon) : '📂'}</span>
                      <span class="bc-name">${subCatTitle}</span>
                      <span class="bc-arrow">▾</span>
                    </button>
                    ${isSubCatMenuOpen ? `
                      <div class="nexus-breadcrumb-menu" style="position: absolute !important; top: calc(100% + 6px) !important; left: 0 !important; min-width: 220px !important; background-color: #080d1a !important; background: #080d1a !important; border: 1px solid rgba(56, 189, 248, 0.6) !important; border-radius: 8px !important; box-shadow: 0 20px 60px rgba(0, 0, 0, 1), 0 0 25px rgba(0, 0, 0, 1), 0 0 14px rgba(56, 189, 248, 0.3) !important; padding: 6px !important; z-index: 99999999 !important;">
                        <div class="breadcrumb-menu-header" style="font-size: 9.5px !important; font-weight: 800 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #38bdf8 !important; padding: 4px 8px 6px 8px !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; margin-bottom: 6px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">Sub-Category: ${subCatTitle}</div>
                        <button class="breadcrumb-menu-opt" data-breadcrumb-action="snooze" data-mute-level="subCategory" data-mute-key="${note.subCategory}" data-mute-type="until" data-mute-title="${subCatTitle}" data-mute-icon="${subCatDef?.icon}" style="width: 100% !important; box-sizing: border-box !important; background-color: #101726 !important; background: #101726 !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 6px !important; padding: 7px 10px !important; display: flex !important; align-items: center !important; gap: 8px !important; text-align: left !important; cursor: pointer !important; color: #f1f5f9 !important; font-size: 11px !important; font-weight: 600 !important; margin-bottom: 4px !important;">
                          <span class="opt-icon">${renderAssistantIcon('icons/themes/sci-fi/stopwatch-96.png')}</span>
                          <span class="opt-text">Snooze Sub-Category (24h)</span>
                        </button>
                        <button class="breadcrumb-menu-opt opt-danger" data-breadcrumb-action="mute" data-mute-level="subCategory" data-mute-key="${note.subCategory}" data-mute-type="forever" data-mute-title="${subCatTitle}" data-mute-icon="${subCatDef?.icon}" style="width: 100% !important; box-sizing: border-box !important; background-color: rgba(239, 68, 68, 0.12) !important; background: rgba(239, 68, 68, 0.12) !important; border: 1px solid rgba(239, 68, 68, 0.35) !important; border-radius: 6px !important; padding: 7px 10px !important; display: flex !important; align-items: center !important; gap: 8px !important; text-align: left !important; cursor: pointer !important; color: #fca5a5 !important; font-size: 11px !important; font-weight: 600 !important; margin-bottom: 0 !important;">
                          <span class="opt-icon">${renderAssistantIcon('icons/themes/sci-fi/cancel-144.png')}</span>
                          <span class="opt-text">Mute Sub-Category (Forever)</span>
                        </button>
                      </div>
                    ` : ''}
                  </div>

                  <span class="breadcrumb-divider">›</span>

                  <div class="nexus-breadcrumb-item nexus-dropdown-wrapper" style="position: relative !important; z-index: ${isRuleMenuOpen ? '9999999 !important;' : '1;'};">
                    <button class="breadcrumb-btn ${isRuleMenuOpen ? 'active' : ''}" data-toggle-breadcrumb="rule_${note.id}" title="Click to mute or snooze ${ruleTitle}">
                      <span class="bc-icon">${ruleDef?.icon ? renderAssistantIcon(ruleDef.icon) : '🎯'}</span>
                      <span class="bc-name">${ruleTitle}</span>
                      <span class="bc-arrow">▾</span>
                    </button>
                    ${isRuleMenuOpen ? `
                      <div class="nexus-breadcrumb-menu" style="position: absolute !important; top: calc(100% + 6px) !important; left: 0 !important; min-width: 220px !important; background-color: #080d1a !important; background: #080d1a !important; border: 1px solid rgba(56, 189, 248, 0.6) !important; border-radius: 8px !important; box-shadow: 0 20px 60px rgba(0, 0, 0, 1), 0 0 25px rgba(0, 0, 0, 1), 0 0 14px rgba(56, 189, 248, 0.3) !important; padding: 6px !important; z-index: 99999999 !important;">
                        <div class="breadcrumb-menu-header" style="font-size: 9.5px !important; font-weight: 800 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #38bdf8 !important; padding: 4px 8px 6px 8px !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; margin-bottom: 6px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">Rule: ${ruleTitle}</div>
                        <button class="breadcrumb-menu-opt" data-breadcrumb-action="snooze" data-mute-level="rule" data-mute-key="${note.ruleId}" data-mute-type="until" data-mute-title="${ruleTitle}" data-mute-icon="${ruleDef?.icon}" style="width: 100% !important; box-sizing: border-box !important; background-color: #101726 !important; background: #101726 !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 6px !important; padding: 7px 10px !important; display: flex !important; align-items: center !important; gap: 8px !important; text-align: left !important; cursor: pointer !important; color: #f1f5f9 !important; font-size: 11px !important; font-weight: 600 !important; margin-bottom: 4px !important;">
                          <span class="opt-icon">${renderAssistantIcon('icons/themes/sci-fi/stopwatch-96.png')}</span>
                          <span class="opt-text">Snooze Rule (24h)</span>
                        </button>
                        <button class="breadcrumb-menu-opt opt-danger" data-breadcrumb-action="mute" data-mute-level="rule" data-mute-key="${note.ruleId}" data-mute-type="forever" data-mute-title="${ruleTitle}" data-mute-icon="${ruleDef?.icon}" style="width: 100% !important; box-sizing: border-box !important; background-color: rgba(239, 68, 68, 0.12) !important; background: rgba(239, 68, 68, 0.12) !important; border: 1px solid rgba(239, 68, 68, 0.35) !important; border-radius: 6px !important; padding: 7px 10px !important; display: flex !important; align-items: center !important; gap: 8px !important; text-align: left !important; cursor: pointer !important; color: #fca5a5 !important; font-size: 11px !important; font-weight: 600 !important; margin-bottom: 0 !important;">
                          <span class="opt-icon">${renderAssistantIcon('icons/themes/sci-fi/cancel-144.png')}</span>
                          <span class="opt-text">Mute Rule (Forever)</span>
                        </button>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <div class="card-header">
                  <div class="card-title-wrap">
                    <span class="card-icon${note.iconTooltip ? ' nexus-tooltip' : ''}" ${note.iconTooltip ? `data-nexus-tooltip="${note.iconTooltip.replace(/"/g, '&quot;')}"` : ''}>${renderAssistantIcon(note.icon)}</span>
                    <span class="card-badge badge-${note.severity}">${note.badgeText || 'ALERT'}</span>
                    <h4 class="card-title">${note.title}</h4>
                  </div>
                  ${coordsHtml}
                </div>

                <div class="card-body">
                  <p class="card-message">${note.message}</p>
                  ${renderFleetSaveExposedZone(note)}
                  ${renderPlanetTodosZone(note)}
                </div>

                <div class="card-footer">
                  <div class="card-snooze-actions">
                    <button class="nexus-card-btn-dismiss" data-dismiss-id="${note.id}" title="Dismiss this alert for 1 hour">
                      <span class="btn-icon">✕</span> Dismiss
                    </button>
                  </div>

                  ${note.actionUrl ? `
                    <a href="${note.actionUrl}" class="nexus-card-action-btn" target="_self">
                      <span>${note.actionLabel || 'Inspect'}</span>
                      <span class="nexus-action-chevron">↗</span>
                    </a>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  const renderTaxonomySettingsView = (snoozedEntries: [string, any][]) => {
    return `
      <div class="nexus-settings-view">
        
        <!-- TOP TAXONOMY SUMMARY BAR -->
        <div class="nexus-taxonomy-summary-card">
          <div class="summary-header-row">
            <div>
              <h3 class="nexus-taxonomy-heading">Rule Management</h3>
              <p class="nexus-taxonomy-desc">Snooze (24h) or disable (forever) notifications at <strong>Category</strong>, <strong>Sub-Category</strong>, or specific <strong>Rule</strong> level.</p>
            </div>
            <div class="summary-stats-pills">
              <div class="stat-pill">
                <span class="stat-num">4</span>
                <span class="stat-label">Categories</span>
              </div>
              <div class="stat-pill">
                <span class="stat-num">11</span>
                <span class="stat-label">Sub-Systems</span>
              </div>
              <div class="stat-pill">
                <span class="stat-num">20</span>
                <span class="stat-label">Rules</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3-TIER HIERARCHY TREE -->
        <div class="nexus-taxonomy-tree">
          ${OVERSEER_TAXONOMY.map(domain => {
            const isDomainSnoozed = isKeySnoozed(domain.id, settings);
            const domainRecord = settings.snoozedRules[domain.id];
            const isDomainExpanded = !!expandedSections[`domain_${domain.id}`];

            return `
              <div class="nexus-domain-block ${isDomainSnoozed ? 'is-snoozed' : ''}">
                <!-- Domain Header (Tier 1) -->
                <div class="nexus-domain-header" data-toggle-section="domain_${domain.id}">
                  <div class="domain-info-left">
                    <span class="domain-expand-chevron">${isDomainExpanded ? '▼' : '▶'}</span>
                    <span class="domain-icon">${domain.icon ? renderAssistantIcon(domain.icon) : '🪐'}</span>
                    <div>
                      <div class="domain-title-row">
                        <span class="domain-name">${domain.name}</span>
                        ${isDomainSnoozed ? `
                          <span class="nexus-node-badge badge-snoozed-forever">${domainRecord?.type === 'until' ? 'MUTED (24H)' : 'MUTED'}</span>
                        ` : `
                          <span class="nexus-node-badge badge-active">ACTIVE</span>
                        `}
                      </div>
                      <span class="domain-desc">${domain.desc}</span>
                    </div>
                  </div>

                  <div class="domain-actions-right" onclick="event.stopPropagation()">
                    ${isDomainSnoozed ? `
                      <button class="nexus-btn-node-restore" data-restore-key="${domain.id}" title="Restore all notifications in ${domain.name}">
                        ✓ Restore Category
                      </button>
                    ` : `
                      <button class="nexus-btn-node-snooze" data-hierarchy-key="${domain.id}" data-hierarchy-level="domain" data-hierarchy-type="until" data-hierarchy-title="${domain.name}" data-hierarchy-icon="${domain.icon}" title="Snooze entire ${domain.name} category for 24h">
                        Snooze 24h
                      </button>
                      <button class="nexus-btn-node-mute" data-hierarchy-key="${domain.id}" data-hierarchy-level="domain" data-hierarchy-type="forever" data-hierarchy-title="${domain.name}" data-hierarchy-icon="${domain.icon}" title="Mute entire ${domain.name} category permanently">
                        Mute Category
                      </button>
                    `}
                  </div>
                </div>

                <!-- Sub-Categories Container (Tier 2) -->
                ${isDomainExpanded ? `
                  <div class="nexus-domain-body">
                    ${domain.subCategories.map(subCat => {
                      const isSubSnoozed = isKeySnoozed(subCat.id, settings);
                      const subRecord = settings.snoozedRules[subCat.id];
                      const isSubExpanded = !!expandedSections[`sub_${subCat.id}`];

                      return `
                        <div class="nexus-subcat-block ${isSubSnoozed ? 'is-snoozed' : ''} ${isDomainSnoozed ? 'parent-snoozed' : ''}">
                          <!-- Sub-Category Header -->
                          <div class="nexus-subcat-header" data-toggle-section="sub_${subCat.id}">
                            <div class="subcat-info-left">
                              <span class="subcat-expand-chevron">${isSubExpanded ? '▼' : '▶'}</span>
                              <span class="subcat-icon">${renderAssistantIcon(subCat.icon)}</span>
                              <div>
                                <div class="subcat-title-row">
                                  <span class="subcat-name">${subCat.name}</span>
                                  ${isSubSnoozed ? `
                                    <span class="nexus-node-badge badge-snoozed-forever">${subRecord?.type === 'until' ? 'MUTED (24H)' : 'MUTED'}</span>
                                  ` : (isDomainSnoozed ? `
                                    <span class="nexus-node-badge badge-muted-by-parent">INHERITED (CATEGORY MUTED)</span>
                                  ` : `
                                    <span class="nexus-node-badge badge-sub-count">${subCat.rules.length} Rule${subCat.rules.length > 1 ? 's' : ''}</span>
                                  `)}
                                </div>
                                <span class="subcat-desc">${subCat.desc}</span>
                              </div>
                            </div>

                            <div class="subcat-actions-right" onclick="event.stopPropagation()">
                              ${isSubSnoozed ? `
                                <button class="nexus-btn-node-restore" data-restore-key="${subCat.id}" title="Restore ${subCat.name}">
                                  ✓ Restore Sub-Category
                                </button>
                              ` : `
                                <button class="nexus-btn-node-snooze" data-hierarchy-key="${subCat.id}" data-hierarchy-level="subCategory" data-hierarchy-type="until" data-hierarchy-title="${subCat.name}" data-hierarchy-icon="${subCat.icon}" title="Snooze ${subCat.name} for 24h">
                                  Snooze 24h
                                </button>
                                <button class="nexus-btn-node-mute" data-hierarchy-key="${subCat.id}" data-hierarchy-level="subCategory" data-hierarchy-type="forever" data-hierarchy-title="${subCat.name}" data-hierarchy-icon="${subCat.icon}" title="Mute ${subCat.name} permanently">
                                  Mute Group
                                </button>
                              `}
                            </div>
                          </div>

                          <!-- Rules List (Tier 3) -->
                          ${isSubExpanded ? `
                            <div class="nexus-subcat-rules-list">
                              ${subCat.rules.map(rule => {
                                const isRuleSnoozed = isKeySnoozed(rule.id, settings);
                                const ruleRecord = settings.snoozedRules[rule.id];
                                const isInheritedMute = isDomainSnoozed || isSubSnoozed;

                                return `
                                  <div class="nexus-rule-row ${isRuleSnoozed ? 'is-snoozed' : ''} ${isInheritedMute ? 'parent-snoozed' : ''}">
                                    <div class="rule-info-left">
                                      <span class="rule-icon">${renderAssistantIcon(rule.icon)}</span>
                                      <div class="rule-text-group">
                                        <div class="rule-title-row">
                                          <span class="rule-name">${rule.name}</span>
                                          <span class="rule-severity-pill pill-${rule.defaultSeverity}">${rule.defaultSeverity.toUpperCase()}</span>
                                          ${isRuleSnoozed ? `
                                            <span class="nexus-node-badge badge-snoozed-forever">${ruleRecord?.type === 'until' ? 'SNOOZED (24H)' : 'MUTED'}</span>
                                          ` : (isInheritedMute ? `
                                            <span class="nexus-node-badge badge-muted-by-parent">INHERITED MUTED</span>
                                          ` : '')}
                                        </div>
                                        <span class="rule-desc">${rule.desc}</span>
                                      </div>
                                    </div>

                                    <div class="rule-actions-right">
                                      ${isRuleSnoozed ? `
                                        <button class="nexus-btn-node-restore" data-restore-key="${rule.id}" title="Restore ${rule.name}">
                                          ✓ Restore Rule
                                        </button>
                                      ` : `
                                        <button class="nexus-btn-node-snooze" data-hierarchy-key="${rule.id}" data-hierarchy-level="rule" data-hierarchy-type="until" data-hierarchy-title="${rule.name}" data-hierarchy-icon="${rule.icon}" title="Snooze this rule for 24h">
                                          24h
                                        </button>
                                        <button class="nexus-btn-node-mute" data-hierarchy-key="${rule.id}" data-hierarchy-level="rule" data-hierarchy-type="forever" data-hierarchy-title="${rule.name}" data-hierarchy-icon="${rule.icon}" title="Mute this rule permanently">
                                          Mute
                                        </button>
                                      `}
                                    </div>
                                  </div>
                                `;
                              }).join('')}
                            </div>
                          ` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- MUTED & SNOOZED OVERVIEW TABLE -->
        <div class="nexus-settings-section">
          <div class="section-header">
            <span class="section-icon">${renderAssistantIcon('icons/themes/sci-fi/cancel-144.png')}</span>
            <h3>Currently Muted & Snoozed Items (${snoozedEntries.length})</h3>
            ${snoozedEntries.length > 1 ? `
              <button class="nexus-btn-restore-all" id="restore-all-snoozes-btn">Restore All</button>
            ` : ''}
          </div>
          ${snoozedEntries.length === 0 ? `
            <p class="nexus-empty-text">No rules or categories are currently muted. All Overseer intelligence feeds are actively broadcasting.</p>
          ` : `
            <div class="nexus-snoozed-list">
              ${snoozedEntries.map(([ruleId, record]) => {
                const friendly = formatFriendlyRuleName(ruleId, record);
                const levelLabel = record.level ? `[${record.level.toUpperCase()}] ` : '';
                
                let timeText = 'Muted Permanently';
                if (record.type === 'until' && record.untilTimestamp) {
                  const d = new Date(record.untilTimestamp);
                  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  const isToday = new Date().toDateString() === d.toDateString();
                  const datePrefix = isToday ? 'today at ' : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at `;
                  const remainingMs = Math.max(0, record.untilTimestamp - Date.now());
                  const totalMin = Math.ceil(remainingMs / (60 * 1000));
                  const remH = Math.floor(totalMin / 60);
                  const remM = totalMin % 60;
                  const remText = remH > 0 ? `${remH}h ${remM}m left` : `${remM}m left`;
                  timeText = `Snoozed until ${timeStr} (${datePrefix}${timeStr} • ${remText})`;
                }

                return `
                  <div class="nexus-snoozed-item">
                    <div class="snooze-info">
                      <div class="snooze-title-row">
                        <span class="snooze-icon">${renderAssistantIcon(friendly.icon)}</span>
                        <span class="nexus-snooze-title">${levelLabel}${friendly.title}</span>
                        ${friendly.coords ? `
                          <div class="nexus-snoozed-planet-badge">
                            ${friendly.planetImgUrl ? `<img src="${friendly.planetImgUrl}" class="nexus-snoozed-planet-thumb" alt="" />` : `<span class="planet-emoji">🪐</span>`}
                            <span>${friendly.planetName ? `${friendly.planetName} ` : ''}[${friendly.coords}]</span>
                          </div>
                        ` : ''}
                      </div>
                      <span class="nexus-snooze-type">${timeText}</span>
                    </div>
                    <button class="nexus-btn-unsnooze" data-unsnooze-id="${ruleId}">Restore</button>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- DETECTION THRESHOLDS -->
        <div class="nexus-settings-section">
          <div class="section-header">
            <span class="section-icon">${renderAssistantIcon('icons/themes/sci-fi/adjust-settings-96.png')}</span>
            <h3>Overseer Detection Thresholds</h3>
          </div>
          <div class="nexus-settings-row">
            <div>
              <label class="setting-title">Storage Overflow Alert Window</label>
              <p class="setting-desc">Trigger early warning when a storage tank will overflow within this time.</p>
            </div>
            <div class="nexus-input-group">
              <input type="text" inputmode="numeric" id="setting-storage-overflow-hours" value="${(settings.thresholds.storageOverflowHours ?? 3).toLocaleString('en-US')}" />
              <span class="input-unit">hours</span>
            </div>
          </div>
          <div class="nexus-settings-row">
            <div>
              <label class="setting-title">Fleet Save Risk Threshold (Per Location)</label>
              <p class="setting-desc">Trigger reminder when any individual planet or moon's stationary asset value exceeds this MSU threshold.</p>
            </div>
            <div class="nexus-input-group">
              <input type="text" inputmode="numeric" id="setting-fleet-save-msu" value="${(settings.thresholds.minFleetSaveMsu ?? 10000000).toLocaleString('en-US')}" />
              <span class="input-unit">MSU</span>
            </div>
          </div>
          <div class="nexus-settings-row">
            <div>
              <label class="setting-title">Debris Field Opportunity Threshold</label>
              <p class="setting-desc">Trigger opportunity alert when a scanned galaxy debris field exceeds this MSU value.</p>
            </div>
            <div class="nexus-input-group">
              <input type="text" inputmode="numeric" id="setting-min-debris-msu" value="${(settings.thresholds.minDebrisMsu ?? 1000000).toLocaleString('en-US')}" />
              <span class="input-unit">MSU</span>
            </div>
          </div>
          <div class="nexus-settings-row">
            <div>
              <label class="setting-title">Artifacts Warning Threshold</label>
              <p class="setting-desc">Trigger almost-full warning when collected Lifeform Artifacts reach this number before the 3,600 cap.</p>
            </div>
            <div class="nexus-input-group">
              <input type="text" inputmode="numeric" id="setting-artifacts-threshold" value="${(settings.thresholds.artifactsWarningThreshold ?? 3000).toLocaleString('en-US')}" />
              <span class="input-unit">/ 3600</span>
            </div>
          </div>
          <div class="nexus-settings-row">
            <div>
              <label class="setting-title">Officer Expiry Alert Window</label>
              <p class="setting-desc">Trigger warning when active Commander/Officers will expire within this time.</p>
            </div>
            <div class="nexus-input-group">
              <input type="text" inputmode="numeric" id="setting-officer-expiry-hours" value="${(settings.thresholds.officerExpiryHours ?? 12).toLocaleString('en-US')}" />
              <span class="input-unit">hours</span>
            </div>
          </div>
          <div class="nexus-settings-row">
            <div>
              <label class="setting-title">Expedition Depletion Warning Rate</label>
              <p class="setting-desc">Trigger warning when non-pristine expeditions in past 4h exceed this percentage.</p>
            </div>
            <div class="nexus-input-group">
              <input type="text" inputmode="numeric" id="setting-expo-depletion-pct" value="${(settings.thresholds.maxExpoDepletionPct ?? 10).toLocaleString('en-US')}" />
              <span class="input-unit">%</span>
            </div>
          </div>
          <div class="settings-actions">
            <button id="save-thresholds-btn" class="nexus-btn-save-settings">Save Thresholds</button>
          </div>
        </div>
      </div>
    `;
  };

  let modalLiveTimer: number | null = null;

  const attachModalEvents = () => {
    const closeModal = () => {
      if (modalLiveTimer) {
        window.clearInterval(modalLiveTimer);
        modalLiveTimer = null;
      }
      overlay.remove();
    };

    // Close button & outside click
    overlay.querySelector('.nexus-modal-close-btn')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
      // Close open breadcrumb menus on outside click
      if (openBreadcrumbMenuKey && !(e.target as HTMLElement).closest('.nexus-dropdown-wrapper')) {
        openBreadcrumbMenuKey = null;
        renderModalContent();
      }
    });

    if (modalLiveTimer) {
      window.clearInterval(modalLiveTimer);
      modalLiveTimer = null;
    }

    const timerElements = overlay.querySelectorAll<HTMLElement>('.nexus-todo-countdown-timer[data-end-ts]');
    if (timerElements.length > 0) {
      modalLiveTimer = window.setInterval(() => {
        if (!document.contains(overlay)) {
          if (modalLiveTimer) {
            window.clearInterval(modalLiveTimer);
            modalLiveTimer = null;
          }
          return;
        }
        const now = Date.now();
        overlay.querySelectorAll<HTMLElement>('.nexus-todo-countdown-timer[data-end-ts]').forEach(el => {
          const endTs = parseInt(el.getAttribute('data-end-ts') || '0', 10);
          if (endTs > 0) {
            const rem = Math.max(0, endTs - now);
            if (rem <= 0) {
              el.textContent = '(Completed)';
            } else {
              el.textContent = `(${formatCountdown(rem)})`;
            }
          }
        });
      }, 1000);
    }

    // Re-sync Empire button
    overlay.querySelector('.nexus-modal-sync-btn')?.addEventListener('click', async () => {
      const btn = overlay.querySelector('.nexus-modal-sync-btn') as HTMLButtonElement | null;
      if (!btn || btn.classList.contains('syncing')) return;

      btn.classList.add('syncing');
      btn.innerHTML = `<span class="hdr-btn-icon nexus-sync-spinner" style="display:inline-flex; align-items:center; animation: nexus-spin 0.8s linear infinite;">${renderAssistantIcon('icons/themes/sci-fi/sync-96.png')}</span> <span>Syncing...</span>`;
      btn.disabled = true;

      const onSyncFinished = async () => {
        window.removeEventListener('ogame-nexus-empire-sync-completed', onSyncFinished);
        activeNotifications = await evaluateAllNotifications(playerId);
        settings = await getAssistantSettings();
        renderModalContent();
        if (onUpdateCallback) onUpdateCallback();
      };

      window.addEventListener('ogame-nexus-empire-sync-completed', onSyncFinished);
      window.dispatchEvent(new CustomEvent('ogame-nexus-trigger-empire-sync'));

      // Safety fallback timeout
      setTimeout(async () => {
        window.removeEventListener('ogame-nexus-empire-sync-completed', onSyncFinished);
        if (btn && btn.classList.contains('syncing')) {
          activeNotifications = await evaluateAllNotifications(playerId);
          settings = await getAssistantSettings();
          renderModalContent();
          if (onUpdateCallback) onUpdateCallback();
        }
      }, 10000);
    });

    // Refresh / Re-scan button
    overlay.querySelector('.nexus-modal-refresh-btn')?.addEventListener('click', async () => {
      const btn = overlay.querySelector('.nexus-modal-refresh-btn') as HTMLElement | null;
      if (btn) {
        btn.classList.add('scanning');
        const iconSpan = btn.querySelector('.hdr-btn-icon') as HTMLElement | null;
        if (iconSpan) iconSpan.style.animation = 'nexus-spin 0.6s linear infinite';
      }
      activeNotifications = await evaluateAllNotifications(playerId);
      settings = await getAssistantSettings();
      renderModalContent();
      if (onUpdateCallback) onUpdateCallback();
    });

    // Tab switching
    overlay.querySelectorAll('.nexus-modal-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        currentTab = tabBtn.getAttribute('data-tab') as TabId;
        openBreadcrumbMenuKey = null;
        renderModalContent();
      });
    });

    // Action buttons (e.g. Open Nexus Terminal)
    overlay.querySelectorAll('.nexus-card-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const href = btn.getAttribute('href');
        if (href === '#open-nexus-terminal' || href?.includes('nexusTab=')) {
          e.preventDefault();
          overlay.remove();
          const terminalBtn = document.querySelector('#og-nexus-icon-modal-btn') as HTMLElement | null;
          if (terminalBtn) {
            terminalBtn.click();
          }
        }
      });
    });

    // Toggle card breadcrumb dropdown menu (Category > Subcategory > Rule)
    overlay.querySelectorAll('[data-toggle-breadcrumb]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuKey = btn.getAttribute('data-toggle-breadcrumb');
        openBreadcrumbMenuKey = openBreadcrumbMenuKey === menuKey ? null : menuKey;
        renderModalContent();
      });
    });

    // Handle breadcrumb popover action options (Snooze 24h / Mute Forever)
    overlay.querySelectorAll('.nexus-breadcrumb-menu .breadcrumb-menu-opt').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-mute-key');
        const level = btn.getAttribute('data-mute-level') as any;
        const type = (btn.getAttribute('data-mute-type') || 'forever') as any;
        const title = btn.getAttribute('data-mute-title') || undefined;
        const icon = btn.getAttribute('data-mute-icon') || undefined;

        if (key) {
          await snoozeHierarchyNode(key, type, 24, { level, title, icon });
          activeNotifications = await evaluateAllNotifications(playerId);
          settings = await getAssistantSettings();
          openBreadcrumbMenuKey = null;
          renderModalContent();
          if (onUpdateCallback) onUpdateCallback();
        }
      });
    });

    // Dismiss buttons on cards (snooze this instance for 1 hour)
    overlay.querySelectorAll('.nexus-card-btn-dismiss').forEach(dismissBtn => {
      dismissBtn.addEventListener('click', async () => {
        const id = dismissBtn.getAttribute('data-dismiss-id');
        if (id) {
          const targetNote = activeNotifications.find(n => n.id === id);
          await snoozeNotification(targetNote || id, 'until', 1);
          activeNotifications = await evaluateAllNotifications(playerId);
          settings = await getAssistantSettings();
          renderModalContent();
          if (onUpdateCallback) onUpdateCallback();
        }
      });
    });

    // Accordion expand/collapse in taxonomy tree
    overlay.querySelectorAll('[data-toggle-section]').forEach(header => {
      header.addEventListener('click', () => {
        const sectionId = header.getAttribute('data-toggle-section');
        if (sectionId) {
          expandedSections[sectionId] = !expandedSections[sectionId];
          renderModalContent();
        }
      });
    });

    // Hierarchy Snooze / Mute buttons in Settings Tree
    overlay.querySelectorAll('[data-hierarchy-key]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-hierarchy-key');
        const level = btn.getAttribute('data-hierarchy-level') as any;
        const type = btn.getAttribute('data-hierarchy-type') as any;
        const title = btn.getAttribute('data-hierarchy-title') || undefined;
        const icon = btn.getAttribute('data-hierarchy-icon') || undefined;

        if (key && type) {
          await snoozeHierarchyNode(key, type, 24, { level, title, icon });
          activeNotifications = await evaluateAllNotifications(playerId);
          settings = await getAssistantSettings();
          renderModalContent();
          if (onUpdateCallback) onUpdateCallback();
        }
      });
    });

    // Hierarchy Restore button in Settings Tree
    overlay.querySelectorAll('[data-restore-key]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-restore-key');
        if (key) {
          await unsnoozeHierarchyNode(key);
          activeNotifications = await evaluateAllNotifications(playerId);
          settings = await getAssistantSettings();
          renderModalContent();
          if (onUpdateCallback) onUpdateCallback();
        }
      });
    });

    // Unsnooze buttons in summary table
    overlay.querySelectorAll('.nexus-btn-unsnooze').forEach(unsnoozeBtn => {
      unsnoozeBtn.addEventListener('click', async () => {
        const id = unsnoozeBtn.getAttribute('data-unsnooze-id');
        if (id) {
          await unsnoozeNotification(id);
          activeNotifications = await evaluateAllNotifications(playerId);
          settings = await getAssistantSettings();
          renderModalContent();
          if (onUpdateCallback) onUpdateCallback();
        }
      });
    });

    // Restore All snoozes button
    overlay.querySelector('#restore-all-snoozes-btn')?.addEventListener('click', async () => {
      settings.snoozedRules = {};
      await saveAssistantSettings(settings);
      activeNotifications = await evaluateAllNotifications(playerId);
      renderModalContent();
      if (onUpdateCallback) onUpdateCallback();
    });

    // Input comma formatting on numeric fields
    overlay.querySelectorAll<HTMLInputElement>('.nexus-input-group input').forEach(input => {
      input.addEventListener('input', () => {
        const clean = input.value.replace(/[^0-9]/g, '');
        if (clean) {
          const num = parseInt(clean, 10);
          if (!isNaN(num)) {
            input.value = num.toLocaleString('en-US');
          }
        } else {
          input.value = '';
        }
      });
    });

    // Save Thresholds button
    overlay.querySelector('#save-thresholds-btn')?.addEventListener('click', async () => {
      const storageInput = overlay.querySelector('#setting-storage-overflow-hours') as HTMLInputElement | null;
      const fleetInput = overlay.querySelector('#setting-fleet-save-msu') as HTMLInputElement | null;
      const debrisInput = overlay.querySelector('#setting-min-debris-msu') as HTMLInputElement | null;
      const artifactsInput = overlay.querySelector('#setting-artifacts-threshold') as HTMLInputElement | null;
      const officerInput = overlay.querySelector('#setting-officer-expiry-hours') as HTMLInputElement | null;
      const depletionInput = overlay.querySelector('#setting-expo-depletion-pct') as HTMLInputElement | null;

      const parseNum = (input: HTMLInputElement | null, fallback: number) => {
        if (!input) return fallback;
        const clean = input.value.replace(/[^0-9]/g, '');
        const num = parseInt(clean, 10);
        return isNaN(num) ? fallback : num;
      };

      settings.thresholds.storageOverflowHours = parseNum(storageInput, 3);
      settings.thresholds.minFleetSaveMsu = parseNum(fleetInput, 10000000);
      settings.thresholds.minDebrisMsu = parseNum(debrisInput, 1000000);
      settings.thresholds.artifactsWarningThreshold = parseNum(artifactsInput, 3000);
      settings.thresholds.officerExpiryHours = parseNum(officerInput, 12);
      settings.thresholds.maxExpoDepletionPct = parseNum(depletionInput, 10);

      await saveAssistantSettings(settings);
      activeNotifications = await evaluateAllNotifications(playerId);
      renderModalContent();
      if (onUpdateCallback) onUpdateCallback();
    });
  };

  document.body.appendChild(overlay);
  renderModalContent();
}

