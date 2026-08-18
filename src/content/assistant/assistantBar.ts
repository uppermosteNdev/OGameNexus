import { AssistantNotification } from './types';
import { evaluateAllNotifications, getAssistantSettings } from './rulesEngine';
import { openAssistantModal, renderAssistantIcon } from './assistantModal';

let notifications: AssistantNotification[] = [];
let shuffledOrder: number[] = [];
let cycleIndex = 0;
let cycleTimer: any = null;
let refreshDebounceTimer: any = null;
let isPaused = false;
let lastEvaluatedPlayerId = '';

let lastRenderedTickerKey = '';
let lastRenderedPillsHtml = '';
let lastRenderedPulseState = '';

function shuffleArray(arr: number[]): number[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function updateShuffledOrder(newLen: number) {
  if (newLen <= 0) {
    shuffledOrder = [];
    cycleIndex = 0;
    return;
  }
  const indices = Array.from({ length: newLen }, (_, i) => i);
  shuffledOrder = shuffleArray(indices);
  cycleIndex = 0;
}

let isFleetMovementListenerAttached = false;

export function isOverviewPage(): boolean {
  const url = window.location.href;
  if (url.includes('component=overview')) return true;
  if (url.includes('page=overview')) return true;
  if (url.includes('page=ingame') && !url.includes('component=')) return true;
  return false;
}

let isOverseerDisabledInMemory = false;

export function isOverseerDisabled(): boolean {
  return isOverseerDisabledInMemory;
}

// Module-level storage listener for instant disable/enable updates
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        let shouldRefresh = false;

        if (changes.nexus_assistant_settings || changes.globalSettings) {
          const newAssistant = changes.nexus_assistant_settings?.newValue;
          const newGlobal = changes.globalSettings?.newValue;
          const isDisabled = (newAssistant && newAssistant.enabled === false) || (newGlobal && newGlobal.enableNexusOverseer === false);
          const isExplicitlyEnabled = (newAssistant && newAssistant.enabled === true) || (newGlobal && newGlobal.enableNexusOverseer === true);

          if (isDisabled) {
            isOverseerDisabledInMemory = true;
            const bar = document.querySelector('#og-nexus-assistant-bar');
            if (bar) bar.remove();
            if (cycleTimer) clearInterval(cycleTimer);
            return;
          } else if (isExplicitlyEnabled) {
            isOverseerDisabledInMemory = false;
            shouldRefresh = true;
          }
        }

        if (changes.nexus_discovered_debris_fields || changes.nexus_fleet_movements || shouldRefresh) {
          debouncedRefreshAssistantBar();
        }
      }
    });
  } catch (e) { }
}

export async function initAssistantBar(playerId: string): Promise<void> {
  const isOverview = isOverviewPage();
  const existingBar = document.querySelector('#og-nexus-assistant-bar');

  if (!isOverview) {
    if (existingBar) existingBar.remove();
    return;
  }

  const settings = await getAssistantSettings();
  if (settings.enabled === false) {
    isOverseerDisabledInMemory = true;
    if (existingBar) existingBar.remove();
    if (cycleTimer) clearInterval(cycleTimer);
    return;
  }
  isOverseerDisabledInMemory = false;

  const planetEl = document.querySelector('#planet');
  if (!planetEl) return;

  lastEvaluatedPlayerId = playerId;
  notifications = await evaluateAllNotifications(playerId);
  updateShuffledOrder(notifications.length);

  renderAssistantBar(playerId);
  startTickerCycle(playerId);

  if (!isFleetMovementListenerAttached) {
    isFleetMovementListenerAttached = true;
    window.addEventListener('ogame-nexus-fleet-movements-updated', () => {
      debouncedRefreshAssistantBar();
    });
    window.addEventListener('ogame-nexus-debris-fields-updated', () => {
      debouncedRefreshAssistantBar();
    });
  }
}

export function debouncedRefreshAssistantBar(playerId?: string): void {
  if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
  refreshDebounceTimer = setTimeout(() => {
    refreshAssistantBar(playerId);
  }, 400);
}

export async function refreshAssistantBar(playerId?: string): Promise<void> {
  const isOverview = isOverviewPage();
  const existingBar = document.querySelector('#og-nexus-assistant-bar');

  if (!isOverview) {
    if (existingBar) existingBar.remove();
    return;
  }

  const settings = await getAssistantSettings();
  if (settings.enabled === false) {
    isOverseerDisabledInMemory = true;
    if (existingBar) existingBar.remove();
    if (cycleTimer) clearInterval(cycleTimer);
    return;
  }
  isOverseerDisabledInMemory = false;

  const targetId = playerId || lastEvaluatedPlayerId || document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
  if (!targetId) return;

  lastEvaluatedPlayerId = targetId;
  const freshNotes = await evaluateAllNotifications(targetId);
  if (freshNotes.length !== notifications.length) {
    notifications = freshNotes;
    updateShuffledOrder(notifications.length);
  } else {
    notifications = freshNotes;
  }
  renderAssistantBar(targetId);
}

export function updateAssistantBarData(newNotifications: AssistantNotification[], playerId: string): void {
  if (isOverseerDisabledInMemory) return;
  notifications = newNotifications;
  updateShuffledOrder(notifications.length);
  renderAssistantBar(playerId);
}

export function renderAssistantBar(playerId: string): void {
  const isOverview = isOverviewPage();
  const existingBar = document.querySelector('#og-nexus-assistant-bar') as HTMLElement | null;

  if (!isOverview || isOverseerDisabledInMemory) {
    if (existingBar) existingBar.remove();
    if (cycleTimer) clearInterval(cycleTimer);
    return;
  }

  const planetEl = document.querySelector('#planet');
  if (!planetEl) return;

  let barEl = existingBar;
  let isInitialCreation = false;

  if (!barEl) {
    isInitialCreation = true;
    barEl = document.createElement('div');
    barEl.id = 'og-nexus-assistant-bar';
    barEl.className = 'productionboxoverseer injectedComponent parent overview og-nexus-wide-container';

    try {
      const middleSliceUrl = chrome.runtime.getURL('icons/misc/middle-slice.png');
      barEl.style.setProperty('--nexus-middle-slice', `url("${middleSliceUrl}")`);
    } catch (e) { }

    planetEl.parentNode?.insertBefore(barEl, planetEl.nextSibling);

    barEl.innerHTML = `
      <div class="content-box-s og-nexus-wide-box">
        <div class="header">
          <div class="header-cap-left"></div>
          <div class="header-slice-fill"></div>
          <div class="header-cap-right"></div>
          <h3>Nexus Overseer</h3>
          <span class="nexus-overseer-info-btn nexus-tooltip" data-nexus-tooltip="Nexus Overseer acts as your personal assistant, delivering real-time intelligent telemetry, empire notifications, and smart recommendations across all your planets.&#10;&#10;You can snooze or mute alerts anytime or disable Overseer completely from inside Nexus settings.">i</span>
        </div>
        <div class="content">
          <div class="content-cap-left"></div>
          <div class="content-slice-fill">
            <table cellspacing="0" cellpadding="0" class="construction active" style="width: 100%;">
              <tbody>
                <tr>
                  <td class="idle" style="padding: 6px 16px; text-align: center;">
                    <div class="nexus-ticker-wrapper"></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="content-cap-right"></div>
        </div>
        <div class="footer">
          <div class="footer-cap-left"></div>
          <div class="footer-slice-fill"></div>
          <div class="footer-cap-right"></div>
        </div>
      </div>
    `;

    attachBarEvents(barEl, playerId);
  }

  const criticalCount = notifications.filter(n => n.category === 'critical').length;
  const reminderCount = notifications.filter(n => n.category === 'reminder').length;
  const logisticsCount = notifications.filter(n => n.category === 'logistics').length;
  const intelCount = notifications.filter(n => n.category === 'intel' || n.category === 'growth').length;

  const pulseDot = barEl.querySelector('.nexus-pulse-dot');
  const targetPulseClass = criticalCount > 0
    ? 'pulse-danger'
    : (reminderCount > 0 ? 'pulse-warning' : (logisticsCount > 0 ? 'pulse-warning' : 'pulse-normal'));

  if (pulseDot && lastRenderedPulseState !== targetPulseClass) {
    lastRenderedPulseState = targetPulseClass;
    pulseDot.className = `nexus-pulse-dot ${targetPulseClass}`;
  }

  const pillsContainer = barEl.querySelector('.nexus-counter-pills');
  const pillsHtml = `
    ${criticalCount > 0 ? `<span class="nexus-pill-badge pill-danger" title="${criticalCount} Active Warning(s)"><span class="nexus-pill-dot dot-danger"></span><span class="nexus-pill-count">${criticalCount}</span></span>` : ''}
    ${reminderCount > 0 ? `<span class="nexus-pill-badge pill-reminder" title="${reminderCount} Active Reminder(s)"><span class="nexus-pill-dot dot-reminder"></span><span class="nexus-pill-count">${reminderCount}</span></span>` : ''}
    ${logisticsCount > 0 ? `<span class="nexus-pill-badge pill-warning" title="${logisticsCount} Active Logistics Alert(s)"><span class="nexus-pill-dot dot-warning"></span><span class="nexus-pill-count">${logisticsCount}</span></span>` : ''}
    ${intelCount > 0 ? `<span class="nexus-pill-badge pill-info" title="${intelCount} Active Intel Update(s)"><span class="nexus-pill-dot dot-info"></span><span class="nexus-pill-count">${intelCount}</span></span>` : ''}
  `.trim();

  if (pillsContainer && pillsHtml !== lastRenderedPillsHtml) {
    lastRenderedPillsHtml = pillsHtml;
    pillsContainer.innerHTML = pillsHtml;
  }

  if (shuffledOrder.length !== notifications.length) {
    updateShuffledOrder(notifications.length);
  }

  const actualIndex = shuffledOrder.length > 0 ? (shuffledOrder[cycleIndex] ?? 0) : 0;
  const currentItem = notifications.length > 0 ? notifications[actualIndex] : null;

  const currentTickerKey = currentItem
    ? `${currentItem.id}__${currentItem.shortMessage}__${currentItem.category}__${currentItem.severity}`
    : 'all_clear';

  const tickerWrapper = barEl.querySelector('.nexus-ticker-wrapper');
  if (tickerWrapper && (isInitialCreation || currentTickerKey !== lastRenderedTickerKey)) {
    lastRenderedTickerKey = currentTickerKey;

    let tickerHtml = '';
    if (!currentItem) {
      tickerHtml = `
        <div class="nexus-ticker-item all-clear">
          <span class="nexus-ticker-icon">✨</span>
          <span class="nexus-ticker-text">All sectors nominal. Fleet secure & resources balanced.</span>
        </div>
      `;
    } else {
      const catBadgeText = currentItem.badgeText || (currentItem.category === 'critical' ? 'WARNING' : currentItem.category.toUpperCase());
      tickerHtml = `
        <div class="nexus-ticker-item severity-${currentItem.severity}">
          <span class="nexus-ticker-icon${currentItem.iconTooltip ? ' nexus-tooltip' : ''}" ${currentItem.iconTooltip ? `data-nexus-tooltip="${currentItem.iconTooltip.replace(/"/g, '&quot;')}"` : ''}>${renderAssistantIcon(currentItem.icon)}</span>
          <span class="nexus-ticker-badge badge-${currentItem.category}">${catBadgeText}</span>
          <span class="nexus-ticker-text" title="${currentItem.message}">${currentItem.shortMessage}</span>
        </div>
      `;
    }
    tickerWrapper.innerHTML = tickerHtml;
  }
}

function attachBarEvents(barEl: HTMLElement, playerId: string): void {
  barEl.onmouseenter = () => { isPaused = true; };
  barEl.onmouseleave = () => { isPaused = false; };

  const infoBtn = barEl.querySelector('.nexus-overseer-info-btn') as HTMLElement | null;
  if (infoBtn) {
    infoBtn.onclick = async (e) => {
      e.stopPropagation();
      notifications = await evaluateAllNotifications(playerId);
      openAssistantModal(notifications, playerId, async () => {
        notifications = await evaluateAllNotifications(playerId);
        updateShuffledOrder(notifications.length);
        renderAssistantBar(playerId);
      }, 'settings');
    };
  }

  barEl.onclick = async () => {
    let targetTab: 'critical' | 'reminder' | 'logistics' | 'intel' | 'settings' | undefined = undefined;
    if (notifications.length > 0 && shuffledOrder.length > 0) {
      const currentItem = notifications[shuffledOrder[cycleIndex % shuffledOrder.length]];
      if (currentItem) {
        targetTab = currentItem.category === 'growth' ? 'intel' : (currentItem.category as any);
      }
    }

    notifications = await evaluateAllNotifications(playerId);
    openAssistantModal(notifications, playerId, async () => {
      notifications = await evaluateAllNotifications(playerId);
      updateShuffledOrder(notifications.length);
      renderAssistantBar(playerId);
    }, targetTab);
  };
}

function startTickerCycle(playerId: string): void {
  if (cycleTimer) clearInterval(cycleTimer);
  let tickCounter = 0;

  cycleTimer = setInterval(async () => {
    if (isPaused) return;

    tickCounter++;

    if (tickCounter % 4 === 0) {
      const targetId = playerId || lastEvaluatedPlayerId || document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
      if (targetId) {
        const freshNotes = await evaluateAllNotifications(targetId);
        if (freshNotes.length !== notifications.length) {
          notifications = freshNotes;
          updateShuffledOrder(notifications.length);
        } else {
          notifications = freshNotes;
        }
      }
    }

    if (notifications.length > 1) {
      cycleIndex++;
      if (cycleIndex >= shuffledOrder.length) {
        updateShuffledOrder(notifications.length);
      }
      const targetId = playerId || lastEvaluatedPlayerId || document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
      renderAssistantBar(targetId);
    } else {
      cycleIndex = 0;
      const targetId = playerId || lastEvaluatedPlayerId || document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
      renderAssistantBar(targetId);
    }
  }, 4000);
}
