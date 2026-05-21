import { SHIP_DATA } from '../db/staticData';
import { flyToNexusButton } from './effects';

function isExtensionStillValid() {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
}

export function scrapeExpeditionMessages() {
    // Only scrape messages that haven't been marked as processed yet
    const expeditionMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="41"]:not([data-og-nexus-processed="true"])');
    const results = [];

    for (const msg of expeditionMessages) {
        const messageId = msg.closest('.msg')?.getAttribute('data-msg-id');
        if (!messageId) continue;

        const timestamp = msg.getAttribute('data-raw-timestamp');
        const coords = msg.getAttribute('data-raw-coords');
        const depletion = msg.getAttribute('data-raw-depletion');
        const size = msg.getAttribute('data-raw-size');
        const result = msg.getAttribute('data-raw-expeditionresult');

        if (timestamp && coords && depletion !== null && size !== null && result) {
            let resultDetails: any = null;
            const resType = result.toLowerCase();

            try {
                if (resType === 'navigation' || resType === 'delay' || resType === 'speedup') {
                    const raw = msg.getAttribute('data-raw-navigation');
                    if (raw) resultDetails = JSON.parse(raw);
                } else if (resType === 'ressources' || resType === 'resources') {
                    const raw = msg.getAttribute('data-raw-resourcesgained');
                    if (raw) resultDetails = JSON.parse(raw);
                } else if (resType === 'shipwrecks') {
                    const raw = msg.getAttribute('data-raw-technologiesgained');
                    if (raw) resultDetails = JSON.parse(raw);
                } else if (resType === 'darkmatter') {
                    const raw = msg.getAttribute('data-raw-resourcesgained');
                    if (raw) resultDetails = JSON.parse(raw);
                } else if (resType === 'item' || resType === 'items') {
                    const raw = msg.getAttribute('data-raw-itemsgained') || msg.getAttribute('data-raw-items') || msg.getAttribute('data-raw-technologiesgained');
                    if (raw) {
                        try {
                            const parsed = JSON.parse(raw);
                            const parentMsg = msg.closest('.msg');
                            let imgUrl = null;
                            if (parentMsg) {
                                const shopIcon = parentMsg.querySelector('shopitem-icon') as HTMLElement;
                                if (shopIcon && shopIcon.style.backgroundImage) {
                                    imgUrl = shopIcon.style.backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
                                }
                            }

                            if (Array.isArray(parsed)) {
                                resultDetails = parsed.map(item => ({ ...item, imgUrl }));
                            } else {
                                resultDetails = parsed;
                                if (resultDetails && typeof resultDetails === 'object' && imgUrl) {
                                    resultDetails.imgUrl = imgUrl;
                                }
                            }
                        } catch (e) { }
                    }
                } else if (resType === 'trader') {
                    const raw = msg.getAttribute('data-raw-resources');
                    if (raw) resultDetails = JSON.parse(raw);
                } else if (resType === 'fleetloss' || resType === 'fleetlost') {
                    const rawShips = msg.getAttribute('data-raw-shipslost') || msg.getAttribute('data-raw-fleet');
                    if (rawShips) {
                        try {
                            resultDetails = { shipsLost: JSON.parse(rawShips) };
                        } catch (e) { }
                    }
                }
            } catch (e) {
                console.warn('OGame Nexus: Failed to parse expedition JSON details', e);
            }

            results.push({
                messageId,
                timestamp: parseInt(timestamp),
                coords,
                depletion: parseInt(depletion),
                size: parseInt(size),
                result,
                resultDetails
            });

            // Mark as processed immediately to avoid rescanning in the same cycle if multiple mutations occur
            msg.setAttribute('data-og-nexus-processed', 'true');
        }
    }

    return results;
}

export async function injectTodaySummaryCard(playerId: string, forceLoad: boolean = false, maxRarity: number = 0) {
    if (!isExtensionStillValid()) return;

    let existingWrapper = document.querySelector('.og-nexus-summary-wrapper') as HTMLElement;

    // If it exists and we're not forcing, we're done. 
    // It should always be visible now, so ensure display is flex.
    if (existingWrapper) {
        existingWrapper.style.display = 'flex';
        if (!forceLoad) return;
    }

    chrome.runtime.sendMessage({
        type: "GET_TODAY_EXPEDITION_STATS",
        data: { playerId }
    }, (response) => {
        if (!isExtensionStillValid() || !response?.success) return;

        const paginator = document.querySelector('.messagePaginator');
        if (!paginator) return;

        // Re-find and deduplicate
        const allWrappers = document.querySelectorAll('.og-nexus-summary-wrapper');
        existingWrapper = null as any;

        allWrappers.forEach((el, idx) => {
            if (idx === 0 && el.nextElementSibling === paginator) {
                existingWrapper = el as HTMLElement;
            } else {
                el.remove();
            }
        });

        if (existingWrapper) {
            const valDivs = existingWrapper.querySelectorAll('.og-nexus-value');
            if (valDivs.length >= 5) {
                const newValues = [
                    response.totals.metal || 0,
                    response.totals.crystal || 0,
                    response.totals.deuterium || 0,
                    response.totals.darkMatter || 0,
                    response.totals.artifacts || 0
                ];

                let anyChanged = false;
                valDivs.forEach((div, i) => {
                    const currentText = div.textContent || '0';
                    // Extract numeric value from compact string for comparison
                    // This is a bit tricky, but since we have the true newValues, 
                    // we can just check if they differ from the previous source of truth if we stored it,
                    // but comparing the rendered state is safer for UI consistency.
                    // Actually, let's just use the animateValue and let it handle the logic.
                    // To get the start value, we need to strip K/M or just store it.
                    // Let's just track if the number changed at all.
                    // A simple way: store data-value on the element.
                    const startVal = parseInt(div.getAttribute('data-value') || '0');
                    const endVal = newValues[i];
                    if (startVal !== endVal) {
                        anyChanged = true;
                        div.setAttribute('data-value', endVal.toString());
                        animateValue(div as HTMLElement, startVal, endVal, 1000);
                    }
                });

                if (anyChanged) {
                    const mainIcon = existingWrapper.querySelector('.og-nexus-main-exp-icon') as HTMLElement;
                    const pill = existingWrapper.querySelector('.og-nexus-expedition-summary-card') as HTMLElement;
                    if (mainIcon && pill) {
                        let shadowColor = 'rgba(255, 255, 255, 0.6)';
                        let scale = 1.35;
                        let cardGlow = '0 8px 32px rgba(0, 0, 0, 0.7)';

                        // Apply rarity-based visual enhancements
                        if (maxRarity === 2) { // Epic / Pink
                            shadowColor = 'rgba(236, 72, 153, 0.9)';
                            scale = 1.6;
                            cardGlow = '0 0 45px rgba(236, 72, 153, 0.5)';

                            pill.classList.remove('og-nexus-flash-rare', 'og-nexus-flash-epic');
                            void pill.offsetWidth; // trigger reflow
                            pill.classList.add('og-nexus-flash-epic');
                        } else if (maxRarity === 1) { // Rare / Blue
                            shadowColor = 'rgba(59, 130, 246, 0.8)';
                            scale = 1.45;
                            cardGlow = '0 0 35px rgba(59, 130, 246, 0.4)';

                            pill.classList.remove('og-nexus-flash-rare', 'og-nexus-flash-epic');
                            void pill.offsetWidth; // trigger reflow
                            pill.classList.add('og-nexus-flash-rare');
                        }

                        mainIcon.style.transform = `scale(${scale}) rotate(360deg)`;
                        mainIcon.style.filter = `drop-shadow(0 0 15px ${shadowColor})`;
                        pill.style.boxShadow = cardGlow;

                        // Epic Pulse
                        if (maxRarity === 2) {
                            pill.classList.add('og-nexus-epic-pulse');
                        }

                        setTimeout(() => {
                            mainIcon.style.transform = 'scale(1) rotate(0deg)';
                            mainIcon.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.2))';
                            pill.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6)';
                            pill.classList.remove('og-nexus-epic-pulse', 'og-nexus-flash-rare', 'og-nexus-flash-epic');
                        }, 1300);
                    }
                }
            }
            return;
        }

        const totals = response.totals;

        const wrapper = document.createElement('div');
        wrapper.className = 'og-nexus-summary-wrapper nexus-tooltip';
        wrapper.setAttribute('data-nexus-tooltip', "Today's Expedition Bounty");
        wrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            margin: 12px 0;
            gap: 16px;
            position: relative;
            z-index: 10;
        `;

        const card = document.createElement('div');
        card.className = 'og-nexus-expedition-summary-card';
        card.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px 24px;
            background: linear-gradient(135deg, rgba(20, 26, 32, 0.85) 0%, rgba(10, 15, 20, 0.92) 100%);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            font-family: 'Segoe UI', 'Roboto', 'Inter', system-ui, sans-serif;
            position: relative;
            overflow: hidden;
        `;

        // Main Icon (Outside the pill)
        const mainIcon = document.createElement('img');
        mainIcon.className = 'og-nexus-main-exp-icon';
        mainIcon.src = chrome.runtime.getURL('icons/misc/expedition-icon-medium.png');
        mainIcon.style.cssText = `
            width: 38px;
            height: 38px;
            filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.2));
            transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 2;
        `;
        wrapper.appendChild(mainIcon);

        const statsRow = document.createElement('div');
        statsRow.className = 'og-nexus-stats-row';
        statsRow.style.cssText = `display: flex; align-items: center; gap: 24px; z-index: 1;`;

        const resConfigs = [
            { val: totals.metal || 0, color: '#E6953C', icon: 'icons/resources/metal-icon-medium.jpg', label: 'Metal' },
            { val: totals.crystal || 0, color: '#4CAEE6', icon: 'icons/resources/crystal-icon-medium.jpg', label: 'Crystal' },
            { val: totals.deuterium || 0, color: '#43D159', icon: 'icons/resources/deuterium-icon-medium.jpg', label: 'Deuterium' },
            { val: totals.darkMatter || 0, color: '#9061F9', icon: 'icons/resources/dark-matter-icon-medium.jpg', label: 'Dark Matter' },
            { val: totals.artifacts || 0, color: '#EAB308', icon: 'icons/lifeforms/artifact-icon-large.png', label: 'Artifacts' }
        ];

        resConfigs.forEach(res => {
            const item = document.createElement('div');
            item.style.cssText = `display: flex; align-items: center; gap: 8px;`;

            const icon = document.createElement('img');
            icon.src = chrome.runtime.getURL(res.icon);
            icon.style.cssText = `width: 20px; height: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4);`;

            const value = document.createElement('div');
            value.className = 'og-nexus-value';
            value.setAttribute('data-value', res.val.toString());
            value.textContent = formatCompactNumber(res.val);
            value.style.cssText = `font-size: 15px; font-weight: 700; color: ${res.color}; text-shadow: 0 2px 4px rgba(0,0,0,0.5); line-height: 1; letter-spacing: 0.3px; min-width: 45px; text-align: left;`;

            item.className = 'nexus-tooltip';
            item.setAttribute('data-nexus-tooltip', `${res.val.toLocaleString()} ${res.label}`);
            item.appendChild(icon);
            item.appendChild(value);
            statsRow.appendChild(item);
        });

        card.appendChild(statsRow);
        wrapper.appendChild(card);
        paginator.parentNode?.insertBefore(wrapper, paginator);

        // Re-trigger tooltips for the new card
        window.dispatchEvent(new CustomEvent('ogame-nexus-trigger-tooltips'));
    });
}

function animateValue(obj: HTMLElement, start: number, end: number, duration: number) {
    if (start === end) return;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Easing out for smoother rolling
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(easeProgress * (end - start) + start);
        obj.textContent = formatCompactNumber(current);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = formatCompactNumber(end);
        }
    };
    window.requestAnimationFrame(step);
}

export async function trackExpeditions(playerId: string) {
    if (!isExtensionStillValid()) return;

    let removeOGLight = true;
    try {
        const localData = await chrome.storage.local.get('globalSettings');
        if (localData?.globalSettings?.removeOGLightDuplicates !== undefined) {
            removeOGLight = localData.globalSettings.removeOGLightDuplicates;
        }
    } catch (e) {
        console.error("OGame Nexus: Failed to load OGLight duplicate settings", e);
    }

    const expeditionData = scrapeExpeditionMessages();
    injectTodaySummaryCard(playerId, false);

    if (expeditionData.length === 0) return;

    chrome.runtime.sendMessage({
        type: "TRACK_EXPEDITIONS",
        data: { expeditions: expeditionData, playerId }
    }, (response) => {
        if (response?.success) {
            let maxRarity = 0;
            response.data.forEach((exp: any) => {
                const msgElement = document.querySelector(`.msg[data-msg-id="${exp.messageId}"]`) as HTMLElement;
                if (msgElement) {
                    updateExpeditionVisuals(msgElement, exp, removeOGLight);

                    if (exp.isNew) {
                        setTimeout(() => {
                            const wrapper = msgElement.querySelector('.og-nexus-resource-result') || msgElement.querySelector('.og-nexus-darkmatter-result') || msgElement.querySelector('.og-nexus-shipwreck-result') || msgElement.querySelector('.og-nexus-trader-result') || msgElement.querySelector('.og-nexus-item-result');
                            if (wrapper) {
                                const icons = Array.from(wrapper.querySelectorAll('div[style*="background-image"], img'))
                                    .map(el => (el as HTMLImageElement).src || getComputedStyle(el).backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1'))
                                    .filter(src => src && src !== 'none' && !src.includes('rarity'));
                                if (icons.length > 0) {
                                    flyToNexusButton(msgElement, [icons[0]]);
                                }
                            }
                        }, 100);
                    }
                }

                // Track rarity if this was a NEWLY added expedition
                // The background logic: results includes both new and existing, but we can check if it contributes to rarity
                // Actually, let's just find the max rarity of all results returned for simplicity,
                // matching the visual impact of the messages currently being tracked.
                const resType = (exp.result || '').toLowerCase();
                if (resType !== 'nothing') {
                    const size = exp.size ?? 2;
                    let rarity = 0;
                    if (size === 0) rarity = 2; // Epic
                    else if (size === 1) rarity = 1; // Rare

                    if (rarity > maxRarity) maxRarity = rarity;
                }
            });

            // Re-init tooltips once after batch update
            triggerSiteTooltips();

            // Only re-fetch if actually new data was logged to IndexedDB
            if (response.newCount && response.newCount > 0) {
                injectTodaySummaryCard(playerId, true, maxRarity);
            }
        }
    });
}

function formatExactNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
}

function formatNumber(num: number): string {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'G';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toString();
}

function formatCompactNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
}

const SHIP_ID_TO_ICON: Record<string, string> = {};
const SHIP_ID_TO_COST: Record<string, any> = {};
SHIP_DATA.forEach(s => {
    SHIP_ID_TO_ICON[s.id.toString()] = s.icon;
    SHIP_ID_TO_COST[s.id.toString()] = s.metadata?.cost;
});

function cleanOGLightDOM(msgElement: HTMLElement) {
    // Purge specifically and only OGLight visual summary cards (class '.ogl_battle')
    const duplicates = msgElement.querySelectorAll('.ogl_battle');
    duplicates.forEach(el => {
        el.remove();
    });
}

function updateExpeditionVisuals(msgElement: HTMLElement, exp: any, removeOGLight: boolean = true) {
    if (!isExtensionStillValid()) return;

    if (removeOGLight) {
        cleanOGLightDOM(msgElement);
    }

    // Check if we've already applied visuals to this message element
    if (msgElement.hasAttribute('data-og-nexus-visuals-applied')) return;

    const resType = (exp.result || '').toLowerCase();
    const size = exp.size ?? 2;

    const isBlackHole = resType === 'fleetloss' || resType === 'fleetlost';

    const content = msgElement.querySelector('.msgContent') as HTMLElement;
    const box = msgElement.querySelector('.content-box') as HTMLElement;
    const head = msgElement.querySelector('.msgHead');

    let rarityColor: string;
    let rarityBgGradient: string;
    let rarityBorderColor: string;
    let rarityGlow: string;
    let rarityLabelText = '';
    let rarityTier = 0; // 0=Common, 1=Rare, 2=Epic

    if (resType !== 'nothing') {
        // Black holes are always "Epic" magnitude bad luck
        if (isBlackHole) {
            rarityTier = 2;
        } else if (size === 0) {
            rarityTier = 2; // Epic
        } else if (size === 1) {
            rarityTier = 1; // Rare
        } else {
            rarityTier = 0; // Common
        }
    }

    let rarityIconPath = '';

    if (rarityTier === 2) {
        rarityColor = '#ec4899';
        rarityBgGradient = 'linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(168, 85, 247, 0.10) 50%, rgba(20, 20, 30, 0.95) 100%)';
        rarityBorderColor = '#ec4899';
        rarityGlow = '0 0 20px rgba(236, 72, 153, 0.4)';
        rarityLabelText = 'Epic';
        rarityIconPath = 'icons/misc/rarity-epic-medium.png';
    } else if (rarityTier === 1) {
        rarityColor = '#06b6d4'; // Cyan
        rarityBgGradient = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.08) 50%, rgba(20, 20, 30, 0.95) 100%)';
        rarityBorderColor = '#06b6d4';
        rarityGlow = '0 0 15px rgba(6, 182, 212, 0.3)';
        rarityLabelText = 'Rare';
        rarityIconPath = 'icons/misc/rarity-rare-medium.png';
    } else {
        rarityColor = '#6b7280';
        rarityBgGradient = 'linear-gradient(135deg, rgba(107, 114, 128, 0.08) 0%, rgba(75, 85, 99, 0.05) 50%, rgba(20, 20, 30, 0.95) 100%)';
        rarityBorderColor = '#6b7280';
        rarityGlow = 'none';
        rarityLabelText = 'Common';
        rarityIconPath = 'icons/misc/rarity-common-medium.png';
    }

    // Apply rarity or thematic styling via classes
    msgElement.classList.remove('og-nexus-common-card', 'og-nexus-rare-card', 'og-nexus-epic-card', 'og-nexus-black-hole-main');
    msgElement.querySelectorAll('.nexus-corner').forEach(c => c.remove());

    if (isBlackHole) {
        msgElement.classList.add('og-nexus-black-hole-main');
    } else if (rarityTier === 2) {
        msgElement.classList.add('og-nexus-epic-card');
    } else if (rarityTier === 1) {
        msgElement.classList.add('og-nexus-rare-card');
    } else {
        msgElement.classList.add('og-nexus-common-card');
    }

    msgElement.style.position = 'relative';
    msgElement.style.overflow = 'visible'; // allow tooltips to show

    // Store rarity color for pill styling
    (msgElement as any).__rarityColor = rarityColor;
    (msgElement as any).__rarityBorderColor = rarityBorderColor;
    (msgElement as any).__rarityIconUrl = chrome.runtime.getURL(rarityIconPath);

    // 1. Add subtle tracked icon to footer (if missing)
    const footerActions = msgElement.querySelector('message-footer-actions');
    if (footerActions && !footerActions.querySelector('.og-nexus-tracked-btn')) {
        const trackedWrapper = document.createElement('gradient-button');
        trackedWrapper.setAttribute('sq28', '');

        const trackedBtn = document.createElement('button');
        trackedBtn.className = 'custom_btn nexus-tooltip og-nexus-tracked-btn';
        const trackedTitle = 'OGame Nexus: Message Tracked';
        trackedBtn.setAttribute('data-nexus-tooltip', trackedTitle);

        // Use a subtle gray checkmark SVG
        trackedBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" style="margin: 4px;">
                    <circle cx="10" cy="10" r="9" fill="none" stroke="#9ca3af" stroke-width="1.5" />
                    <path d="M6 10 L9 13 L14 7" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                `;

        trackedWrapper.appendChild(trackedBtn);
        footerActions.appendChild(trackedWrapper);

        // Re-init tooltips for the new button
        triggerSiteTooltips();
    }

    // 2. Custom UI for Resources
    if (resType === 'ressources' || resType === 'resources') {
        if (content) content.style.display = 'none';
        if (box) box.style.display = 'none';

        // Check if we already added our custom panel
        if (msgElement.querySelector('.og-nexus-resource-result')) return;

        const details = exp.resultDetails || {};

        // Setup resource data
        let resourceName = 'unknown';
        let resourceAmount = 0;
        let resourceColor = '#fff';
        let iconUrl = '';

        if (details.metal) {
            resourceName = 'metal';
            resourceAmount = details.metal;
            resourceColor = '#E6953C';
            iconUrl = chrome.runtime.getURL('icons/resources/metal-icon-medium.jpg');
        } else if (details.crystal) {
            resourceName = 'crystal';
            resourceAmount = details.crystal;
            resourceColor = '#4CAEE6';
            iconUrl = chrome.runtime.getURL('icons/resources/crystal-icon-medium.jpg');
        } else if (details.deuterium) {
            resourceName = 'deuterium';
            resourceAmount = details.deuterium;
            resourceColor = '#43D159';
            iconUrl = chrome.runtime.getURL('icons/resources/deuterium-icon-medium.jpg');
        }

        // --- minimalist container ---
        const container = document.createElement('div');
        container.className = 'og-nexus-resource-result';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 4px 0;
            gap: 6px;
            position: relative;
            z-index: 1;
            `;

        const layoutWrapper = document.createElement('div');
        layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;



        // The "Pill" / Box with rarity accent and glow
        const pillRarityColor = (msgElement as any).__rarityBorderColor || '#444';
        const pill = document.createElement('div');
        pill.className = 'nexus-tooltip';
        if (rarityTier === 0) pill.classList.add('rarity-pill-common');
        if (rarityTier === 1) pill.classList.add('rarity-pill-rare-animate');
        if (rarityTier === 2) pill.classList.add('rarity-pill-epic-animate');
        const tooltipText = `Your expedition brings back ${formatExactNumber(resourceAmount)} ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}`;
        pill.setAttribute('data-nexus-tooltip', tooltipText);
        pill.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid ${pillRarityColor};
            border-radius: 4px;
            padding: 4px 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px ${pillRarityColor}40;
            justify-content: center;
            cursor: default;
            `;

        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 24px;
            height: 24px;
            background-image: url('${iconUrl}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            `;

        const amount = document.createElement('div');
        amount.textContent = formatNumber(resourceAmount);
        if (rarityTier === 2) amount.classList.add('amount-glow');
        amount.style.cssText = `
            font-size: 13px;
            font-weight: bold;
            font-family: 'Verdana', sans-serif;
            color: ${resourceColor};
            `;

        const rarityIcon = document.createElement('img');
        rarityIcon.src = (msgElement as any).__rarityIconUrl;
        rarityIcon.className = 'og-nexus-rarity-icon';
        rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
        if (rarityTier === 1) rarityIcon.classList.add('rarity-sparkle-rare');
        if (rarityTier === 2) rarityIcon.classList.add('rarity-sparkle-epic');
        pill.appendChild(rarityIcon);

        pill.appendChild(icon);
        pill.appendChild(amount);

        layoutWrapper.appendChild(pill);
        container.appendChild(layoutWrapper);

        // Depletion indicator reuse
        const depletion = exp.depletion ?? 1;
        let signalColor: string;
        let depletionLabel: string;
        switch (depletion) {
            case 1: signalColor = '#22c55e'; depletionLabel = 'Pristine'; break;
            case 2: signalColor = '#eab308'; depletionLabel = 'Good'; break;
            case 3: signalColor = '#f97316'; depletionLabel = 'Moderate'; break;
            case 4: signalColor = '#ef4444'; depletionLabel = 'Low'; break;
            case 5: signalColor = '#dc2626'; depletionLabel = 'Depleted'; break;
            default: signalColor = '#22c55e'; depletionLabel = 'Unknown';
        }

        const depletionContainer = document.createElement('div');
        depletionContainer.className = 'nexus-tooltip';
        const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
        depletionContainer.setAttribute('data-nexus-tooltip', dTooltip);
        depletionContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: default;
            `;

        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
        const filledDots = 6 - depletion;
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            const isFilled = i < filledDots;
            dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : 'rgba(255, 255, 255, 0.15)'};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ''}
            transition: all 0.2s ease;
            `;
            dotsContainer.appendChild(dot);
        }
        depletionContainer.appendChild(dotsContainer);

        container.appendChild(pill);
        container.appendChild(depletionContainer);

        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
        triggerSiteTooltips();
    } else if (resType === 'darkmatter') {
        if (content) content.style.display = 'none';
        if (box) box.style.display = 'none';

        // Check if we already added our custom panel
        if (msgElement.querySelector('.og-nexus-darkmatter-result')) return;

        const details = exp.resultDetails || {};
        const dmAmount = details.darkMatter ?? details.darkmatter ?? 0;
        const iconUrl = chrome.runtime.getURL('icons/resources/dark-matter-icon-medium.jpg');
        const dmColor = '#bd69ff'; // Premium purple

        const container = document.createElement('div');
        container.className = 'og-nexus-darkmatter-result';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 4px 0;
            gap: 6px;
            position: relative;
            z-index: 1;
            `;

        const layoutWrapper = document.createElement('div');
        layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;



        const pillRarityColor = (msgElement as any).__rarityBorderColor || '#444';
        const pill = document.createElement('div');
        pill.className = 'nexus-tooltip';
        if (rarityTier === 0) pill.classList.add('rarity-pill-common');
        if (rarityTier === 1) pill.classList.add('rarity-pill-rare-animate');
        if (rarityTier === 2) pill.classList.add('rarity-pill-epic-animate');
        const tooltipText = `Your expedition brings back ${formatExactNumber(dmAmount)} Dark Matter`;
        pill.setAttribute('data-nexus-tooltip', tooltipText);
        pill.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid ${pillRarityColor};
            border-radius: 4px;
            padding: 4px 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px ${pillRarityColor}40;
            justify-content: center;
            cursor: default;
            `;

        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 24px;
            height: 24px;
            background-image: url('${iconUrl}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            `;

        const amount = document.createElement('div');
        amount.textContent = formatNumber(dmAmount);
        if (rarityTier === 2) amount.classList.add('amount-glow');
        amount.style.cssText = `
            font-size: 13px;
            font-weight: bold;
            font-family: 'Verdana', sans-serif;
            color: ${dmColor};
            `;

        const rarityIcon = document.createElement('img');
        rarityIcon.src = (msgElement as any).__rarityIconUrl;
        rarityIcon.className = 'og-nexus-rarity-icon';
        rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
        if (rarityTier === 1) rarityIcon.classList.add('rarity-sparkle-rare');
        if (rarityTier === 2) rarityIcon.classList.add('rarity-sparkle-epic');
        pill.appendChild(rarityIcon);

        pill.appendChild(icon);
        pill.appendChild(amount);

        layoutWrapper.appendChild(pill);
        container.appendChild(layoutWrapper);

        // Depletion indicator reuse
        const depletion = exp.depletion ?? 1;
        let signalColor: string;
        let depletionLabel: string;
        switch (depletion) {
            case 1: signalColor = '#22c55e'; depletionLabel = 'Pristine'; break;
            case 2: signalColor = '#eab308'; depletionLabel = 'Good'; break;
            case 3: signalColor = '#f97316'; depletionLabel = 'Moderate'; break;
            case 4: signalColor = '#ef4444'; depletionLabel = 'Low'; break;
            case 5: signalColor = '#dc2626'; depletionLabel = 'Depleted'; break;
            default: signalColor = '#22c55e'; depletionLabel = 'Unknown';
        }

        const depletionContainer = document.createElement('div');
        depletionContainer.className = 'nexus-tooltip';
        const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
        depletionContainer.setAttribute('data-nexus-tooltip', dTooltip);
        depletionContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: default;
            `;

        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
        const filledDots = 6 - depletion;
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            const isFilled = i < filledDots;
            dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : 'rgba(255, 255, 255, 0.15)'};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ''}
            transition: all 0.2s ease;
            `;
            dotsContainer.appendChild(dot);
        }
        depletionContainer.appendChild(dotsContainer);

        container.appendChild(pill);
        container.appendChild(depletionContainer);

        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
        triggerSiteTooltips();
    } else if (resType === 'navigation' || resType === 'delay' || resType === 'speedup') {
        if (content) content.style.display = 'none';
        if (box) box.style.display = 'none';

        if (msgElement.querySelector('.og-nexus-navigation-result')) return;

        const details = exp.resultDetails || {};
        let isDelay = (details.returnTimeAbsoluteIncreaseHours || 0) > 0;
        if (resType === 'delay') isDelay = true;
        if (resType === 'speedup') isDelay = false;
        const navColor = isDelay ? '#f97316' : '#22c55e'; // Orange for delay, Green for reduction

        const container = document.createElement('div');
        container.className = 'og-nexus-navigation-result';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 4px 0;
            gap: 6px;
            position: relative;
            z-index: 1;
            `;

        const layoutWrapper = document.createElement('div');
        layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;



        // Navigation Pill
        const pillRarityColor = (msgElement as any).__rarityBorderColor || '#444';
        const pill = document.createElement('div');
        pill.className = 'nexus-tooltip';
        if (rarityTier === 0) pill.classList.add('rarity-pill-common');
        if (rarityTier === 1) pill.classList.add('rarity-pill-rare-animate');
        if (rarityTier === 2) pill.classList.add('rarity-pill-epic-animate');
        pill.setAttribute('data-nexus-tooltip', `Expedition return time was ${isDelay ? 'delayed' : 'shortened'}!`);
        pill.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid ${pillRarityColor};
            border-radius: 4px;
            padding: 4px 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px ${pillRarityColor}40;
            justify-content: center;
            cursor: default;
            `;



        const text = document.createElement('div');
        text.textContent = isDelay ? 'DELAY' : 'SPEEDUP';
        text.style.cssText = `
            font-size: 11px;
            font-weight: bold;
            font-family: 'Verdana', sans-serif;
            color: ${navColor};
            letter-spacing: 2px;
            text-shadow: 0 0 8px ${navColor}60;
            `;

        const rarityIcon = document.createElement('img');
        rarityIcon.src = (msgElement as any).__rarityIconUrl;
        rarityIcon.className = 'og-nexus-rarity-icon';
        rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
        if (rarityTier === 1) rarityIcon.classList.add('rarity-sparkle-rare');
        if (rarityTier === 2) rarityIcon.classList.add('rarity-sparkle-epic');
        pill.appendChild(rarityIcon);


        pill.appendChild(text);

        // Depletion indicator
        const depletion = exp.depletion ?? 1;
        let signalColor: string;
        let depletionLabel: string;
        switch (depletion) {
            case 1: signalColor = '#22c55e'; depletionLabel = 'Pristine'; break;
            case 2: signalColor = '#eab308'; depletionLabel = 'Good'; break;
            case 3: signalColor = '#f97316'; depletionLabel = 'Moderate'; break;
            case 4: signalColor = '#ef4444'; depletionLabel = 'Low'; break;
            case 5: signalColor = '#dc2626'; depletionLabel = 'Depleted'; break;
            default: signalColor = '#22c55e'; depletionLabel = 'Unknown';
        }

        const depletionContainer = document.createElement('div');
        depletionContainer.className = 'nexus-tooltip';
        const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
        depletionContainer.setAttribute('data-nexus-tooltip', dTooltip);
        depletionContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 2px 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: default;
            `;

        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
        const filledDots = 6 - depletion;
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            const isFilled = i < filledDots;
            dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : 'rgba(255, 255, 255, 0.15)'};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ''}
            transition: all 0.2s ease;
            `;
            dotsContainer.appendChild(dot);
        }
        depletionContainer.appendChild(dotsContainer);

        layoutWrapper.appendChild(pill);
        container.appendChild(layoutWrapper);
        container.appendChild(depletionContainer);

        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
        triggerSiteTooltips();
    }
    else if (resType === 'combatpirates' || resType === 'combataliens' || resType === '0') {
        if (content) content.style.display = 'none';
        if (box) box.style.display = 'none';

        // Check if we already added our custom panel
        if (msgElement.querySelector('.og-nexus-combat-result')) return;

        const isPirates = resType === 'combatpirates';
        const isAliens = resType === 'combataliens';
        const labelText = resType === '0' ? 'Hostiles' : (isPirates ? 'Pirates' : 'Aliens');
        const hostileColor = '#ef4444'; // Vibrant Red

        // minimalist container
        const container = document.createElement('div');
        container.className = 'og-nexus-combat-result';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 4px 0;
            gap: 6px;
            position: relative;
            z-index: 1;
            `;

        const layoutWrapper = document.createElement('div');
        layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;



        // Combat Pill
        const pillRarityColor = (msgElement as any).__rarityBorderColor || '#444';
        const pill = document.createElement('div');
        pill.className = 'nexus-tooltip';
        if (rarityTier === 0) pill.classList.add('rarity-pill-common');
        if (rarityTier === 1) pill.classList.add('rarity-pill-rare-animate');
        if (rarityTier === 2) pill.classList.add('rarity-pill-epic-animate');
        pill.setAttribute('data-nexus-tooltip', `Expedition encountered hostile ${labelText.toLowerCase()} forces!`);
        pill.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid ${pillRarityColor};
            border-radius: 6px;
            padding: 4px 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 12px ${pillRarityColor}30;
            justify-content: center;
            cursor: default;
            `;

        const text = document.createElement('div');
        // Space out the characters for the minimalist look
        text.textContent = labelText.toUpperCase().split('').join(' ');
        text.style.cssText = `
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 4px;
            color: ${hostileColor} !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            margin-left: 4px;
            `;

        const rarityIcon = document.createElement('img');
        rarityIcon.src = (msgElement as any).__rarityIconUrl;
        rarityIcon.className = 'og-nexus-rarity-icon';
        rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
        if (rarityTier === 1) rarityIcon.classList.add('rarity-sparkle-rare');
        if (rarityTier === 2) rarityIcon.classList.add('rarity-sparkle-epic');
        pill.appendChild(rarityIcon);

        pill.appendChild(text);
        layoutWrapper.appendChild(pill);
        container.appendChild(layoutWrapper);

        // Depletion indicator reuse
        const depletion = exp.depletion ?? 1;
        let signalColor: string;
        let depletionLabel: string;
        switch (depletion) {
            case 1: signalColor = '#22c55e'; depletionLabel = 'Pristine'; break;
            case 2: signalColor = '#eab308'; depletionLabel = 'Good'; break;
            case 3: signalColor = '#f97316'; depletionLabel = 'Moderate'; break;
            case 4: signalColor = '#ef4444'; depletionLabel = 'Low'; break;
            case 5: signalColor = '#dc2626'; depletionLabel = 'Depleted'; break;
            default: signalColor = '#22c55e'; depletionLabel = 'Unknown';
        }

        const depletionContainer = document.createElement('div');
        depletionContainer.className = 'nexus-tooltip';
        const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
        depletionContainer.setAttribute('data-nexus-tooltip', dTooltip);
        depletionContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 2px 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: default;
            `;

        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
        const filledDots = 6 - depletion;
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            const isFilled = i < filledDots;
            dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : 'rgba(255, 255, 255, 0.15)'};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ''}
            transition: all 0.2s ease;
            `;
            dotsContainer.appendChild(dot);
        }
        depletionContainer.appendChild(dotsContainer);

        container.appendChild(pill);
        container.appendChild(depletionContainer);

        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
        triggerSiteTooltips();
    } else if (resType === 'shipwrecks') {
        if (content) content.style.display = 'none';
        if (box) box.style.display = 'none';

        if (msgElement.querySelector('.og-nexus-shipwreck-result')) return;

        const details = exp.resultDetails || {};
        let totalMetal = 0;
        let totalCrystal = 0;
        let totalDeuterium = 0;

        const container = document.createElement('div');
        container.className = 'og-nexus-shipwreck-result';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 10px 0;
            gap: 8px;
            position: relative;
            z-index: 1;
            `;

        const rarityColor = (msgElement as any).__rarityBorderColor || '#444';

        // Main Result Pill
        const resultPill = document.createElement('div');
        if (rarityTier === 0) resultPill.classList.add('rarity-pill-common');
        if (rarityTier === 1) resultPill.classList.add('rarity-pill-rare-animate');
        if (rarityTier === 2) resultPill.classList.add('rarity-pill-epic-animate');
        resultPill.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid ${rarityColor};
            border-radius: 4px;
            padding: 6px 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px ${rarityColor}30;
            position: relative;
            z-index: 1;
            margin: 4px 0;
        `;

        const rarityIcon = document.createElement('img');
        rarityIcon.src = (msgElement as any).__rarityIconUrl;
        rarityIcon.className = 'og-nexus-rarity-icon';
        rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
        if (rarityTier === 1) rarityIcon.classList.add('rarity-sparkle-rare');
        if (rarityTier === 2) rarityIcon.classList.add('rarity-sparkle-epic');
        resultPill.appendChild(rarityIcon);

        const contentStack = document.createElement('div');
        contentStack.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            flex: 1;
        `;

        const shipsRow = document.createElement('div');
        shipsRow.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            `;

        Object.entries(details).forEach(([shipId, data]: [string, any]) => {
            const iconPath = SHIP_ID_TO_ICON[shipId];
            if (!iconPath) return;

            const cost = SHIP_ID_TO_COST[shipId];
            if (cost) {
                totalMetal += (cost.metal || 0) * data.amount;
                totalCrystal += (cost.crystal || 0) * data.amount;
                totalDeuterium += (cost.deuterium || 0) * data.amount;
            }

            const shipItem = document.createElement('div');
            shipItem.className = 'nexus-tooltip';
            const tooltipTitle = `${formatExactNumber(data.amount)} ${data.name}`;
            shipItem.setAttribute('data-nexus-tooltip', tooltipTitle);
            shipItem.style.cssText = `
            position: relative;
            width: 36px;
            height: 36px;
            cursor: default;
            `;

            const innerBox = document.createElement('div');
            innerBox.style.cssText = `
            position: absolute;
            inset: 0;
            background-image: url('${chrome.runtime.getURL(iconPath)}');
            background-size: cover;
            background-position: center;
            border-radius: 4px;
            border: 1px solid ${rarityColor};
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
            overflow: hidden;
            `;

            const amountBadge = document.createElement('div');
            amountBadge.textContent = formatNumber(data.amount);
            if (rarityTier === 2) amountBadge.classList.add('amount-glow');
            amountBadge.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(10, 15, 20, 0.85);
            backdrop-filter: blur(2px);
            color: #fff;
            padding: 0px 0;
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
            `;
            innerBox.appendChild(amountBadge);
            shipItem.appendChild(innerBox);
            shipsRow.appendChild(shipItem);
        });

        contentStack.appendChild(shipsRow);

        const valueRow = document.createElement('div');
        valueRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.4);
            padding: 3px 14px;
            border-radius: 12px;
            border: 1px solid ${rarityColor}20;
            `;

        const resData = [
            { amount: totalMetal, color: '#E6953C', icon: 'icons/resources/metal-icon-medium.jpg' },
            { amount: totalCrystal, color: '#4CAEE6', icon: 'icons/resources/crystal-icon-medium.jpg' },
            { amount: totalDeuterium, color: '#43D159', icon: 'icons/resources/deuterium-icon-medium.jpg' }
        ];

        resData.forEach(res => {
            if (res.amount > 0) {
                const item = document.createElement('div');
                item.style.cssText = `display: flex; align-items: center; gap: 6px;`;
                const resIcon = document.createElement('img');
                resIcon.src = chrome.runtime.getURL(res.icon);
                resIcon.style.cssText = `width: 16px; height: 16px;`;
                const resText = document.createElement('span');
                resText.textContent = formatNumber(res.amount);
                resText.style.cssText = `font-size: 12px; font-weight: 700; color: ${res.color}; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);`;
                item.appendChild(resIcon);
                item.appendChild(resText);
                valueRow.appendChild(item);
            }
        });

        if (totalMetal + totalCrystal + totalDeuterium > 0) {
            contentStack.appendChild(valueRow);
        }

        resultPill.appendChild(contentStack);
        container.appendChild(resultPill);

        const depletion = exp.depletion ?? 1;
        let signalColor: string;
        let depletionLabel: string;
        switch (depletion) {
            case 1: signalColor = '#22c55e'; depletionLabel = 'Pristine'; break;
            case 2: signalColor = '#eab308'; depletionLabel = 'Good'; break;
            case 3: signalColor = '#f97316'; depletionLabel = 'Moderate'; break;
            case 4: signalColor = '#ef4444'; depletionLabel = 'Low'; break;
            case 5: signalColor = '#dc2626'; depletionLabel = 'Depleted'; break;
            default: signalColor = '#22c55e'; depletionLabel = 'Unknown';
        }

        const depletionContainer = document.createElement('div');
        depletionContainer.className = 'nexus-tooltip';
        depletionContainer.setAttribute('data-nexus-tooltip', `Depletion level - Expedition slot is in ${depletionLabel} condition`);
        depletionContainer.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 3px 10px; background: rgba(0, 0, 0, 0.3); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); cursor: default;`;

        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            const isFilled = i < (6 - depletion);
            dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background-color: ${isFilled ? signalColor : 'rgba(255, 255, 255, 0.15)'}; ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ''} transition: all 0.2s ease;`;
            dotsContainer.appendChild(dot);
        }
        depletionContainer.appendChild(dotsContainer);
        container.appendChild(depletionContainer);

        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
        triggerSiteTooltips();
    } else if (resType === 'trader') {
        if (content) content.style.display = 'none';
        if (box) box.style.display = 'none';

        // Check if we already added our custom panel
        if (msgElement.querySelector('.og-nexus-trader-result')) return;

        // minimalist container
        const container = document.createElement('div');
        container.className = 'og-nexus-trader-result';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 10px 0;
            gap: 8px;
            position: relative;
            z-index: 1;
            `;

        const layoutWrapper = document.createElement('div');
        layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;

        // Trader Pill
        const traderColor = '#eab308'; // Gold/Yellow
        const pillRarityColor = (msgElement as any).__rarityBorderColor || '#444';
        const pill = document.createElement('div');
        pill.className = 'nexus-tooltip';
        if (rarityTier === 0) pill.classList.add('rarity-pill-common');
        if (rarityTier === 1) pill.classList.add('rarity-pill-rare-animate');
        if (rarityTier === 2) pill.classList.add('rarity-pill-epic-animate');
        pill.setAttribute('data-nexus-tooltip', 'Expedition encountered a merchant willing to trade!');
        pill.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid ${pillRarityColor};
            border-radius: 6px;
            padding: 4px 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 12px ${pillRarityColor}30;
            justify-content: center;
            cursor: default;
            `;

        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('icons/misc/trader-icon-medium.png');
        icon.style.cssText = `width: 20px; height: 20px;`;

        const text = document.createElement('div');
        text.textContent = 'TRADER ENCOUNTER';
        text.style.cssText = `
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 2px;
            color: ${traderColor};
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            `;

        // Trader rarity icon removed per user rule

        pill.appendChild(icon);
        pill.appendChild(text);
        layoutWrapper.appendChild(pill);
        container.appendChild(layoutWrapper);

        // Exchange Rates Row
        const ratesRow = document.createElement('div');
        ratesRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 15px;
            background: rgba(0, 0, 0, 0.3);
            padding: 5px 15px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            margin-top: -4px;
            `;

        const details = exp.resultDetails || {};
        const rates = [
            { label: 'Metal', val: details.metal || details[1], color: '#E6953C', icon: 'icons/resources/metal-icon-medium.jpg' },
            { label: 'Crystal', val: details.crystal || details[2], color: '#4CAEE6', icon: 'icons/resources/crystal-icon-medium.jpg' },
            { label: 'Deut', val: details.deuterium || details[3], color: '#43D159', icon: 'icons/resources/deuterium-icon-medium.jpg' }
        ];

        rates.forEach(r => {
            if (r.val !== undefined) {
                const item = document.createElement('div');
                item.style.cssText = `display: flex; align-items: center; gap: 6px;`;

                const icon = document.createElement('img');
                icon.src = chrome.runtime.getURL(r.icon);
                icon.style.cssText = `width: 14px; height: 14px; border-radius: 2px;`;

                const text = document.createElement('span');
                text.textContent = formatNumber(r.val);
                text.style.cssText = `
            font-size: 11px;
            font-weight: 700;
            color: ${r.color};
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            `;

                item.appendChild(icon);
                item.appendChild(text);
                ratesRow.appendChild(item);
            }
        });

        if (ratesRow.children.length > 0) {
            container.appendChild(ratesRow);
        }

        // Depletion indicator reuse
        const depletion = exp.depletion ?? 1;
        let signalColor: string;
        let depletionLabel: string;
        switch (depletion) {
            case 1: signalColor = '#22c55e'; depletionLabel = 'Pristine'; break;
            case 2: signalColor = '#eab308'; depletionLabel = 'Good'; break;
            case 3: signalColor = '#f97316'; depletionLabel = 'Moderate'; break;
            case 4: signalColor = '#ef4444'; depletionLabel = 'Low'; break;
            case 5: signalColor = '#dc2626'; depletionLabel = 'Depleted'; break;
            default: signalColor = '#22c55e'; depletionLabel = 'Unknown';
        }

        const depletionContainer = document.createElement('div');
        depletionContainer.className = 'nexus-tooltip';
        const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
        depletionContainer.setAttribute('data-nexus-tooltip', dTooltip);
        depletionContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: default;
            `;

        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
        const filledDots = 6 - depletion;
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            const isFilled = i < filledDots;
            dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : 'rgba(255, 255, 255, 0.15)'};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ''}
            `;
            dotsContainer.appendChild(dot);
        }
        depletionContainer.appendChild(dotsContainer);
        container.appendChild(depletionContainer);

        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
    } else if (resType === 'item' || resType === 'items') {
        if (content) content.style.display = 'none';
        if (box) box.style.display = 'none';

        if (msgElement.querySelector('.og-nexus-item-result')) return;

        let details = exp.resultDetails;
        if (!details) details = [];
        if (!Array.isArray(details)) {
            if (typeof details === 'object' && Object.keys(details).length > 0) {
                details = Object.values(details);
            } else {
                details = [];
            }
        }

        const container = document.createElement('div');
        container.className = 'og-nexus-item-result';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 10px 0;
            gap: 8px;
            position: relative;
            z-index: 1;
            `;

        const itemsRow = document.createElement('div');
        itemsRow.style.cssText = `display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;`;

        if (details.length > 0) {
            details.forEach((data: any) => {
                const itemBox = document.createElement('div');
                itemBox.className = 'nexus-tooltip';
                const label = data.name || 'Unknown Item';
                itemBox.setAttribute('data-nexus-tooltip', `${data.amount > 1 ? data.amount + 'x ' : ''}${label}`);
                itemBox.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 70px;
                    height: 70px;
                    background: rgba(10, 15, 20, 0.85);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    cursor: pointer;
                    position: relative;
                `;

                if (data.imgUrl) {
                    const bg = document.createElement('div');
                    bg.style.cssText = `
                        position: absolute;
                        inset: 4px;
                        background-image: url('${data.imgUrl}');
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        z-index: 1;
                        border-radius: 4px;
                        pointer-events: none;
                    `;
                    itemBox.appendChild(bg);
                } else {
                    const fallbackIcon = document.createElement('img');
                    fallbackIcon.src = chrome.runtime.getURL('icons/misc/expedition-icon-medium.png');
                    fallbackIcon.style.cssText = `width: 32px; height: 32px; z-index: 1; opacity: 0.8; pointer-events: none;`;
                    itemBox.appendChild(fallbackIcon);
                }

                if (data.amount > 1) {
                    const badge = document.createElement('div');
                    badge.textContent = `${data.amount}`;
                    badge.style.cssText = `
                        position: absolute;
                        bottom: 4px;
                        right: 4px;
                        background: rgba(0,0,0,0.8);
                        border: 1px solid rgba(255,255,255,0.2);
                        color: #fff;
                        font-size: 10px;
                        font-weight: 800;
                        padding: 1px 4px;
                        border-radius: 4px;
                        z-index: 2;
                        pointer-events: none;
                    `;
                    itemBox.appendChild(badge);
                }

                itemsRow.appendChild(itemBox);
            });
        } else {
            const itemBox = document.createElement('div');
            itemBox.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                background-color: rgba(10, 15, 20, 0.85);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px;
                padding: 6px 14px;
            `;
            const text = document.createElement('div');
            text.style.cssText = `font-size: 11px; font-weight: 700; color: #fff; letter-spacing: 2px;`;
            text.textContent = 'VALUABLE ITEM DISCOVERED';
            itemBox.appendChild(text);
            itemsRow.appendChild(itemBox);
        }

        container.appendChild(itemsRow);

        const depletion = exp.depletion ?? 1;
        let signalColor: string;
        let depletionLabel: string;
        switch (depletion) {
            case 1: signalColor = '#22c55e'; depletionLabel = 'Pristine'; break;
            case 2: signalColor = '#eab308'; depletionLabel = 'Good'; break;
            case 3: signalColor = '#f97316'; depletionLabel = 'Moderate'; break;
            case 4: signalColor = '#ef4444'; depletionLabel = 'Low'; break;
            case 5: signalColor = '#dc2626'; depletionLabel = 'Depleted'; break;
            default: signalColor = '#22c55e'; depletionLabel = 'Unknown';
        }

        const depletionContainer = document.createElement('div');
        depletionContainer.className = 'nexus-tooltip';
        depletionContainer.setAttribute('data-nexus-tooltip', `Depletion level - Expedition slot is in ${depletionLabel} condition`);
        depletionContainer.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 3px 10px; background: rgba(0, 0, 0, 0.3); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); cursor: default;`;

        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            const isFilled = i < (6 - depletion);
            dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background-color: ${isFilled ? signalColor : 'rgba(255, 255, 255, 0.15)'}; ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ''} transition: all 0.2s ease;`;
            dotsContainer.appendChild(dot);
        }
        depletionContainer.appendChild(dotsContainer);
        container.appendChild(depletionContainer);

        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
    } else if (isBlackHole) {
        if (content) content.style.display = 'none';
        if (box) box.style.display = 'none';

        const existing = msgElement.querySelector('.og-nexus-black-hole-card');
        let details = exp.resultDetails || {};
        let shipsLost = details.shipsLost || {};

        if (Object.keys(shipsLost).length === 0) {
            const rawMsg = msgElement.querySelector('.rawMessageData');
            if (rawMsg) {
                const rawShips = rawMsg.getAttribute('data-raw-shipslost') || rawMsg.getAttribute('data-raw-fleet');
                if (rawShips) {
                    try {
                        shipsLost = JSON.parse(rawShips);
                    } catch (e) { }
                }
            }
        }

        // If we already added a card but it's empty and now we have ships, remove it and rebuild
        if (existing) {
            if (Object.keys(shipsLost).length > 0) {
                existing.remove();
            } else {
                return; // Still no ships, don't duplicate
            }
        }

        let totalMetal = 0;
        let totalCrystal = 0;
        let totalDeuterium = 0;

        const container = document.createElement('div');
        container.className = 'og-nexus-nothing-result og-nexus-black-hole-card';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 4px 0;
            gap: 6px;
            position: relative;
            z-index: 1;
            `;

        const pill = document.createElement('div');
        pill.className = 'nexus-tooltip og-nexus-black-hole-pill';
        if (rarityTier === 0) pill.classList.add('rarity-pill-common');
        if (rarityTier === 1) pill.classList.add('rarity-pill-rare-animate');
        if (rarityTier === 2) pill.classList.add('rarity-pill-epic-animate');
        pill.setAttribute('data-nexus-tooltip', 'TOTAL EXPEDITION FLEET LOSS');
        pill.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            background-color: rgba(10, 5, 5, 0.95);
            border: 1px solid #ff4444;
            border-radius: 4px;
            padding: 6px 20px;
            box-shadow: 0 0 25px rgba(255, 68, 68, 0.4);
            justify-content: center;
            cursor: default;
            width: fit-content;
            min-width: 250px;
            `;

        const topRow = document.createElement('div');
        topRow.style.cssText = `display: flex; align-items: center; gap: 0; justify-content: center; width: 100%;`;

        const text = document.createElement('div');
        text.textContent = 'BLACK HOLE';
        text.style.cssText = `
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 5px;
            color: #ef4444;
            text-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
            text-align: center;
            `;
        topRow.appendChild(text);
        pill.appendChild(topRow);

        // Ships Lost Display
        const shipsRow = document.createElement('div');
        shipsRow.style.cssText = `display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 2px;`;

        Object.entries(shipsLost).forEach(([shipId, amount]: [string, any]) => {
            const iconPath = SHIP_ID_TO_ICON[shipId];
            if (!iconPath) return;

            const cost = SHIP_ID_TO_COST[shipId];
            if (cost) {
                totalMetal += (cost.metal || 0) * amount;
                totalCrystal += (cost.crystal || 0) * amount;
                totalDeuterium += (cost.deuterium || 0) * amount;
            }

            const shipItem = document.createElement('div');
            shipItem.style.cssText = `position: relative; width: 36px; height: 36px; border: 1px solid rgba(255, 68, 68, 0.3); border-radius: 3px; overflow: hidden;`;

            const img = document.createElement('img');
            img.src = chrome.runtime.getURL(iconPath);
            img.style.cssText = `width: 100%; height: 100%; object-fit: cover; opacity: 0.8; filter: grayscale(0.5) sepia(0.5) hue-rotate(-50deg);`;
            shipItem.appendChild(img);

            const qty = document.createElement('div');
            qty.textContent = formatCompactNumber(amount);
            qty.style.cssText = `position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: #ffbcbc; font-size: 9px; font-weight: 800; text-align: center;`;
            shipItem.appendChild(qty);

            shipsRow.appendChild(shipItem);
        });

        if (shipsRow.children.length > 0) {
            pill.appendChild(shipsRow);
        }

        // Loss Resource Summary
        if (totalMetal + totalCrystal + totalDeuterium > 0) {
            const lossSummary = document.createElement('div');
            lossSummary.style.cssText = `display: flex; gap: 12px; margin-top: 2px; padding: 2px 12px; background: rgba(255,0,0,0.1); border-radius: 12px; border: 1px solid rgba(255,0,0,0.2);`;

            [
                { amount: totalMetal, color: '#E6953C', icon: 'icons/resources/metal-icon-medium.jpg' },
                { amount: totalCrystal, color: '#4CAEE6', icon: 'icons/resources/crystal-icon-medium.jpg' },
                { amount: totalDeuterium, color: '#43D159', icon: 'icons/resources/deuterium-icon-medium.jpg' }
            ].forEach(res => {
                if (res.amount > 0) {
                    const item = document.createElement('div');
                    item.style.cssText = `display: flex; align-items: center; gap: 4px;`;
                    const icon = document.createElement('img');
                    icon.src = chrome.runtime.getURL(res.icon);
                    icon.style.cssText = `width: 12px; height: 12px;`;
                    const val = document.createElement('span');
                    val.textContent = '-' + formatNumber(res.amount);
                    val.style.cssText = `font-size: 11px; font-weight: 700; color: ${res.color};`;
                    item.appendChild(icon);
                    item.appendChild(val);
                    lossSummary.appendChild(item);
                }
            });
            pill.appendChild(lossSummary);
        }


        const depletion = exp.depletion ?? 1;
        let signalColor: string;
        let depletionLabel: string;
        switch (depletion) {
            case 1: signalColor = '#22c55e'; depletionLabel = 'Pristine'; break;
            case 2: signalColor = '#eab308'; depletionLabel = 'Good'; break;
            case 3: signalColor = '#f97316'; depletionLabel = 'Moderate'; break;
            case 4: signalColor = '#ef4444'; depletionLabel = 'Low'; break;
            case 5: signalColor = '#dc2626'; depletionLabel = 'Depleted'; break;
            default: signalColor = '#22c55e'; depletionLabel = 'Unknown';
        }

        const depletionContainer = document.createElement('div');
        depletionContainer.className = 'nexus-tooltip';
        depletionContainer.setAttribute('data-nexus-tooltip', `Depletion level - Expedition slot is in ${depletionLabel} condition`);
        depletionContainer.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 3px 10px; background: rgba(0, 0, 0, 0.3); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); cursor: default;`;

        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            const isFilled = i < (6 - depletion);
            dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background-color: ${isFilled ? signalColor : 'rgba(255, 255, 255, 0.15)'}; ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ''} transition: all 0.2s ease;`;
            dotsContainer.appendChild(dot);
        }
        depletionContainer.appendChild(dotsContainer);

        container.appendChild(pill);
        container.appendChild(depletionContainer);

        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
    } else if (resType === 'nothing') {
        if (content) content.style.display = 'none';
        if (box) box.style.display = 'none';

        if (msgElement.querySelector('.og-nexus-nothing-result')) return;

        const container = document.createElement('div');
        container.className = 'og-nexus-nothing-result';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 4px 0;
            gap: 6px;
            position: relative;
            z-index: 1;
            `;

        const pill = document.createElement('div');
        pill.className = 'nexus-tooltip';
        if (rarityTier === 0) pill.classList.add('rarity-pill-common');
        if (rarityTier === 1) pill.classList.add('rarity-pill-rare-animate');
        if (rarityTier === 2) pill.classList.add('rarity-pill-epic-animate');
        pill.setAttribute('data-nexus-tooltip', 'Expedition returned with no significant findings');
        pill.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            padding: 4px 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            justify-content: center;
            cursor: default;
            `;

        const text = document.createElement('div');
        text.textContent = 'X NOTHING';
        text.style.cssText = `
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 4px;
            color: #6b7280;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            margin-left: 0;
            `;

        pill.appendChild(text);

        const depletion = exp.depletion ?? 1;
        let signalColor: string;
        let depletionLabel: string;

        switch (depletion) {
            case 1: signalColor = '#22c55e'; depletionLabel = 'Pristine'; break;
            case 2: signalColor = '#eab308'; depletionLabel = 'Good'; break;
            case 3: signalColor = '#f97316'; depletionLabel = 'Moderate'; break;
            case 4: signalColor = '#ef4444'; depletionLabel = 'Low'; break;
            case 5: signalColor = '#dc2626'; depletionLabel = 'Depleted'; break;
            default: signalColor = '#22c55e'; depletionLabel = 'Unknown';
        }

        const depletionContainer = document.createElement('div');
        depletionContainer.className = 'nexus-tooltip';
        const dTitle = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
        depletionContainer.setAttribute('data-nexus-tooltip', dTitle);
        depletionContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            cursor: default;
            `;

        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
        const filledDots = 6 - depletion;
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            const isFilled = i < filledDots;
            dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : 'rgba(255, 255, 255, 0.08)'};
                ${isFilled ? `box-shadow: 0 0 3px ${signalColor}80;` : ''}
            `;
            dotsContainer.appendChild(dot);
        }
        depletionContainer.appendChild(dotsContainer);

        container.appendChild(pill);
        container.appendChild(depletionContainer);

        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
    }

    msgElement.setAttribute('data-og-nexus-visuals-applied', 'true');
}

function triggerSiteTooltips() {
    // Dispatch a custom event that our "MAIN" world script will pick up to call initOverlays()
    // This avoids CSP violations from injecting inline scripts.
    window.dispatchEvent(new CustomEvent('ogame-nexus-trigger-tooltips'));
}
