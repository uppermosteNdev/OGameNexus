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

  // 1. Mount and render Overseer bar into the DOM immediately (0ms visual delay)
  renderAssistantBar(playerId);

  // 2. Evaluate fresh notifications and update ticker seamlessly
  const freshNotes = await evaluateAllNotifications(playerId);
  notifications = freshNotes;
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
          <div class="nexus-header-cat-indicators"></div>
          <span class="nexus-overseer-info-btn nexus-tooltip" data-nexus-tooltip="Nexus Overseer acts as your personal assistant, delivering real-time intelligent telemetry, empire notifications, and smart recommendations across all your planets.&#10;&#10;You can snooze or mute alerts anytime or disable Overseer completely from inside Nexus settings.">i</span>
        </div>
        <div class="content">
          <div class="content-cap-left"></div>
          <div class="content-slice-fill">
            <table cellspacing="0" cellpadding="0" class="construction active" style="width: 100%;">
              <tbody>
                <tr>
                  <td class="idle" style="padding: 6px 36px 6px 16px; text-align: center;">
                    <div class="nexus-ticker-wrapper"></div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="nexus-overseer-scroll-hint nexus-tooltip" data-nexus-tooltip="💡 Scroll mouse wheel to cycle through notifications">
              <div class="nexus-mouse-icon">
                <div class="nexus-mouse-wheel"></div>
              </div>
            </div>
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

  const indicatorsEl = barEl.querySelector('.nexus-header-cat-indicators');
  if (indicatorsEl) {
    const catKey = `${criticalCount}_${reminderCount}_${logisticsCount}_${intelCount}`;
    if (indicatorsEl.getAttribute('data-last-key') !== catKey) {
      indicatorsEl.setAttribute('data-last-key', catKey);
      indicatorsEl.innerHTML = `
        <div class="nexus-header-cat-pill cat-critical ${criticalCount > 0 ? 'has-alerts' : 'is-empty'}" data-target-tab="critical" title="${criticalCount} Warning(s) & Critical Alert(s)">
          <span class="cat-dot dot-critical"></span>
          <span class="cat-count-num text-critical">${criticalCount}</span>
        </div>
        <div class="nexus-header-cat-pill cat-reminder ${reminderCount > 0 ? 'has-alerts' : 'is-empty'}" data-target-tab="reminder" title="${reminderCount} Reminder(s)">
          <span class="cat-dot dot-reminder"></span>
          <span class="cat-count-num text-reminder">${reminderCount}</span>
        </div>
        <div class="nexus-header-cat-pill cat-logistics ${logisticsCount > 0 ? 'has-alerts' : 'is-empty'}" data-target-tab="logistics" title="${logisticsCount} Logistics Alert(s)">
          <span class="cat-dot dot-logistics"></span>
          <span class="cat-count-num text-logistics">${logisticsCount}</span>
        </div>
        <div class="nexus-header-cat-pill cat-intel ${intelCount > 0 ? 'has-alerts' : 'is-empty'}" data-target-tab="intel" title="${intelCount} Intel Notification(s)">
          <span class="cat-dot dot-intel"></span>
          <span class="cat-count-num text-intel">${intelCount}</span>
        </div>
      `;
    }
  }

  if (shuffledOrder.length !== notifications.length) {
    updateShuffledOrder(notifications.length);
  }

  const actualIndex = shuffledOrder.length > 0 ? (shuffledOrder[cycleIndex % shuffledOrder.length] ?? 0) : 0;
  const currentItem = notifications.length > 0 ? notifications[actualIndex] : null;

  const currentTickerKey = currentItem
    ? `${currentItem.id}__${currentItem.shortMessage}__${currentItem.category}__${currentItem.severity}`
    : 'all_clear';

  const tickerWrapper = barEl.querySelector('.nexus-ticker-wrapper');
  if (tickerWrapper && (isInitialCreation || currentTickerKey !== lastRenderedTickerKey)) {
    lastRenderedTickerKey = currentTickerKey;

    let tickerHtml = '';
    if (!currentItem) {
      const allClearTooltip = [
        'Nexus Overseer: All Clear',
        'All empire sectors nominal. Fleet secure, queues active & resources balanced.',
        '💡 Click anywhere on the bar to open Nexus Overseer Terminal.'
      ].join('\n\n');

      tickerHtml = `
        <div class="nexus-ticker-item all-clear nexus-tooltip" data-nexus-tooltip="${allClearTooltip.replace(/"/g, '&quot;')}">
          <span class="nexus-ticker-icon">✨</span>
          <span class="nexus-ticker-text">All sectors nominal. Fleet secure & resources balanced.</span>
        </div>
      `;
    } else {
      const catBadgeText = currentItem.badgeText || (currentItem.category === 'critical' ? 'WARNING' : currentItem.category.toUpperCase());
      
      const tooltipLines: string[] = [];
      if (currentItem.title && currentItem.title.toLowerCase() !== currentItem.shortMessage.toLowerCase()) {
        tooltipLines.push(currentItem.title);
      }
      if (currentItem.message && currentItem.message.toLowerCase() !== currentItem.shortMessage.toLowerCase()) {
        tooltipLines.push(currentItem.message);
      } else {
        tooltipLines.push(currentItem.shortMessage);
      }
      tooltipLines.push('💡 Click anywhere on the bar to open Nexus Overseer Terminal.');
      const itemTooltip = tooltipLines.join('\n\n');

      tickerHtml = `
        <div class="nexus-ticker-item severity-${currentItem.severity} nexus-tooltip" data-nexus-tooltip="${itemTooltip.replace(/"/g, '&quot;')}">
          <span class="nexus-ticker-icon">${renderAssistantIcon(currentItem.icon)}</span>
          <span class="nexus-ticker-badge badge-${currentItem.category}">${catBadgeText}</span>
          <span class="nexus-ticker-text">${currentItem.shortMessage}</span>
        </div>
      `;
    }
    tickerWrapper.innerHTML = tickerHtml;
  }

  const scrollHintEl = barEl.querySelector('.nexus-overseer-scroll-hint') as HTMLElement | null;
  if (scrollHintEl) {
    if (notifications.length > 1) {
      scrollHintEl.style.display = 'flex';
      const currentIndex = shuffledOrder.length > 0 ? (cycleIndex % shuffledOrder.length) + 1 : 1;
      const total = shuffledOrder.length || notifications.length;
      scrollHintEl.setAttribute('data-nexus-tooltip', `💡 Scroll mouse wheel to cycle (${currentIndex}/${total})`);
    } else {
      scrollHintEl.style.display = 'none';
    }
  }
}

function attachBarEvents(barEl: HTMLElement, playerId: string): void {
  barEl.onmouseenter = () => { isPaused = true; };
  barEl.onmouseleave = () => { isPaused = false; };

  // Scroll wheel navigation for notifications
  barEl.addEventListener('wheel', (e: WheelEvent) => {
    if (notifications.length <= 1) return;

    e.preventDefault();
    e.stopPropagation();

    const total = shuffledOrder.length || notifications.length;
    if (total <= 1) return;

    if (e.deltaY > 0) {
      // Scroll DOWN -> Next notification
      cycleIndex = (cycleIndex + 1) % total;
    } else if (e.deltaY < 0) {
      // Scroll UP -> Previous notification
      cycleIndex = (cycleIndex - 1 + total) % total;
    }

    const targetId = playerId || lastEvaluatedPlayerId || document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
    renderAssistantBar(targetId);
  }, { passive: false });

  const scrollHint = barEl.querySelector('.nexus-overseer-scroll-hint') as HTMLElement | null;
  if (scrollHint) {
    scrollHint.onclick = (e) => {
      e.stopPropagation();
      const total = shuffledOrder.length || notifications.length;
      if (total <= 1) return;
      cycleIndex = (cycleIndex + 1) % total;
      const targetId = playerId || lastEvaluatedPlayerId || document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
      renderAssistantBar(targetId);
    };
  }

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

  barEl.onclick = async (e: MouseEvent) => {
    const catPill = (e.target as HTMLElement)?.closest('.nexus-header-cat-pill') as HTMLElement | null;
    let targetTab: 'critical' | 'reminder' | 'logistics' | 'intel' | 'settings' | undefined = undefined;

    if (catPill) {
      e.stopPropagation();
      const tabAttr = catPill.getAttribute('data-target-tab') as any;
      if (tabAttr) targetTab = tabAttr;
    } else {
      if (notifications.length > 0 && shuffledOrder.length > 0) {
        const currentItem = notifications[shuffledOrder[cycleIndex % shuffledOrder.length]];
        if (currentItem) {
          targetTab = currentItem.category === 'growth' ? 'intel' : (currentItem.category as any);
        }
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
