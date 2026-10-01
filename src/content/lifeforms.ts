import { injectTodaySummaryCard, addSessionTrackedItems, setNewBadgeActive, isSharedMessage } from './expeditions';
import { flyToNexusButton } from './effects';
import { isRemoveOGLightDuplicatesEnabled } from './settings';

function isExtensionStillValid() {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
}

function parseLifeformElement(msg: Element): any | null {
    const parentMsg = msg.closest('.msg');
    const messageId = parentMsg?.getAttribute('data-msg-id');
    if (!messageId) return null;

    if (isSharedMessage(parentMsg || msg)) {
        return null;
    }

    const timestamp = msg.getAttribute('data-raw-timestamp');
    const coords = msg.getAttribute('data-raw-coords');
    const lifeform = msg.getAttribute('data-raw-lifeform');
    const discoveryType = msg.getAttribute('data-raw-discoverytype');
    const xp = msg.getAttribute('data-raw-lifeformgainedexperience');
    const artifacts = msg.getAttribute('data-raw-artifactsfound');
    const artifactSize = msg.getAttribute('data-raw-artifactssize');

    if (timestamp && coords) {
        return {
            messageId,
            timestamp: parseInt(timestamp),
            coords,
            lifeform: lifeform ? parseInt(lifeform) : undefined,
            discoveryType: discoveryType || 'nothing',
            lifeformGainedExperience: xp ? parseInt(xp) : undefined,
            artifactsFound: artifacts ? parseInt(artifacts) : undefined,
            artifactSize: artifactSize || undefined
        };
    }
    return null;
}

const processedLifeformIds = new Set<string>();

export function scrapeLifeformMessages() {
    const messages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="61"]');
    const newItemsToTrack: any[] = [];

    for (const msg of messages) {
        // Strip legacy attribute from rawMessageData if present
        if (msg.hasAttribute('data-og-nexus-processed')) {
            msg.removeAttribute('data-og-nexus-processed');
        }

        const item = parseLifeformElement(msg);
        if (!item) continue;

        const removeOGLight = isRemoveOGLightDuplicatesEnabled();

        // 1. Immediately and synchronously apply visual transformation to DOM if not already applied
        const parentMsg = (msg.closest('.msg') || document.querySelector(`.msg[data-msg-id="${item.messageId}"]`)) as HTMLElement | null;
        if (parentMsg && !parentMsg.hasAttribute('data-og-nexus-visuals-applied')) {
            parentMsg.classList.add('og-nexus-tracked');
            updateLifeformDiscoveryVisuals(parentMsg, item, removeOGLight);
        }

        // 2. Queue for background tracking if not already processed in this session
        const isProcessed = (parentMsg && parentMsg.hasAttribute('data-og-nexus-processed')) || processedLifeformIds.has(item.messageId);
        if (!isProcessed) {
            if (parentMsg) {
                parentMsg.setAttribute('data-og-nexus-processed', 'true');
            }
            processedLifeformIds.add(item.messageId);
            newItemsToTrack.push(item);
        } else if (parentMsg && !parentMsg.hasAttribute('data-og-nexus-processed')) {
            parentMsg.setAttribute('data-og-nexus-processed', 'true');
        }
    }
    return newItemsToTrack;
}

function parseLifeformFromHTMLString(html: string): any | null {
    const idMatch = html.match(/data-msg-id=['"](\d+)['"]/i);
    if (!idMatch) return null;
    const messageId = idMatch[1];

    const timeMatch = html.match(/data-raw-timestamp=['"](\d+)['"]/i);
    const coordsMatch = html.match(/data-raw-coords=['"]([^'"]+)['"]/i);
    const lfMatch = html.match(/data-raw-lifeform=['"](\d+)['"]/i);
    const discMatch = html.match(/data-raw-discoveryType=['"]([^'"]+)['"]/i);
    const xpMatch = html.match(/data-raw-lifeformGainedExperience=['"](\d+)['"]/i);
    const artMatch = html.match(/data-raw-artifactsFound=['"](\d+)['"]/i);
    const artSizeMatch = html.match(/data-raw-artifactsSize=['"]([^'"]+)['"]/i);

    if (timeMatch && coordsMatch) {
        return {
            messageId,
            timestamp: parseInt(timeMatch[1], 10),
            coords: coordsMatch[1],
            lifeform: lfMatch ? parseInt(lfMatch[1], 10) : undefined,
            discoveryType: discMatch ? discMatch[1] : 'nothing',
            lifeformGainedExperience: xpMatch ? parseInt(xpMatch[1], 10) : undefined,
            artifactsFound: artMatch ? parseInt(artMatch[1], 10) : undefined,
            artifactSize: artSizeMatch ? artSizeMatch[1] : undefined
        };
    }
    return null;
}

export function scrapeRawLifeformHTML(htmls: string[]) {
    const results: any[] = [];
    const removeOGLight = isRemoveOGLightDuplicatesEnabled();

    const visibleDomMsgMap = new Map<string, HTMLElement>();
    document.querySelectorAll('.msg[data-msg-id]').forEach(el => {
        const id = el.getAttribute('data-msg-id');
        if (id) visibleDomMsgMap.set(id, el as HTMLElement);
    });

    for (const html of htmls) {
        if (!html.includes("data-raw-messagetype='61'") && !html.includes('data-raw-messagetype="61"') &&
            !html.includes("data-raw-messageType='61'") && !html.includes('data-raw-messageType="61"')) {
            continue;
        }

        const item = parseLifeformFromHTMLString(html);
        if (item) {
            const parentMsg = visibleDomMsgMap.get(item.messageId);
            if (parentMsg) {
                const domMsg = parentMsg.querySelector('div.rawMessageData[data-raw-messagetype="61"], div.rawMessageData[data-raw-messageType="61"]');
                if (domMsg && domMsg.hasAttribute('data-og-nexus-processed')) {
                    domMsg.removeAttribute('data-og-nexus-processed');
                }
                parentMsg.setAttribute('data-og-nexus-processed', 'true');
                if (!parentMsg.hasAttribute('data-og-nexus-visuals-applied')) {
                    parentMsg.classList.add('og-nexus-tracked');
                    updateLifeformDiscoveryVisuals(parentMsg, item, removeOGLight);
                }
            }

            if (!processedLifeformIds.has(item.messageId)) {
                processedLifeformIds.add(item.messageId);
                results.push(item);
            }
        }
    }
    return results;
}

export async function trackLifeformDiscoveries(playerId: string) {
    if (!isExtensionStillValid()) return;

    const removeOGLight = isRemoveOGLightDuplicatesEnabled();
    const discoveryData = scrapeLifeformMessages();

    // Initial card display if needed (shared with expeditions)
    injectTodaySummaryCard(playerId, false);

    if (discoveryData.length === 0) return;

    // Send to background for centralized storage (extension origin)
    chrome.runtime.sendMessage({
        type: "TRACK_LIFEFORMS",
        data: { discoveries: discoveryData, playerId }
    }, (response) => {
        if (response?.success) {
            let maxRarity = 0;
            response.data.forEach((disc: any) => {
                const msgElement = document.querySelector(`.msg[data-msg-id="${disc.messageId}"]`) as HTMLElement;
                if (msgElement) {
                    msgElement.classList.add('og-nexus-tracked');
                    updateLifeformDiscoveryVisuals(msgElement, disc, removeOGLight);

                    if (disc.isNew && disc.discoveryType !== 'nothing' && disc.discoveryType !== 'ship-lost') {
                        setTimeout(() => {
                            let iconPath = '';
                            if (disc.discoveryType === 'artifacts') {
                                iconPath = chrome.runtime.getURL('icons/lifeforms/artifact-icon-large.png');
                            } else if (disc.discoveryType === 'lifeform-xp') {
                                // Default to Human if not specified, or parse properly based on lifeform
                                const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
                                const lfName = lfNames[(disc.lifeform || 1) - 1] || 'humans';
                                iconPath = chrome.runtime.getURL(`icons/lifeforms/${lfName}-icon-large.jpg`);
                            }
                            if (iconPath) {
                                flyToNexusButton(msgElement, [iconPath]);
                            }
                        }, 100);
                    }
                }

                if (disc.discoveryType === 'artifacts' && disc.artifactSize) {
                    const size = disc.artifactSize.toLowerCase();
                    let rarity = 0;
                    if (size === 'huge') rarity = 2; // Epic
                    else if (size === 'big') rarity = 1; // Rare

                    if (rarity > maxRarity) maxRarity = rarity;
                }
            });
            // Update summary card if new discoveries were logged
            if (response.newCount && response.newCount > 0) {
                const newItems = response.data.filter((disc: any) => disc.isNew).map((disc: any) => ({ ...disc, type: 'lifeform' }));
                if (newItems.length > 0) {
                    addSessionTrackedItems(newItems);
                    setNewBadgeActive(true);
                }
                injectTodaySummaryCard(playerId, true, maxRarity);
            }

            // Re-init tooltips once after batch update
            triggerSiteTooltips();
        }
    });
}

export async function trackRawLifeformDiscoveries(playerId: string, htmls: string[]) {
    if (!isExtensionStillValid()) return;

    const removeOGLight = isRemoveOGLightDuplicatesEnabled();
    const discoveryData = scrapeRawLifeformHTML(htmls);
    if (discoveryData.length === 0) return;

    const unprocessedDiscoveries = discoveryData;

    injectTodaySummaryCard(playerId, false);

    chrome.runtime.sendMessage({
        type: "TRACK_LIFEFORMS",
        data: { discoveries: unprocessedDiscoveries, playerId }
    }, (response) => {
        if (response?.success) {
            let maxRarity = 0;
            response.data.forEach((disc: any) => {
                const msgElement = document.querySelector(`.msg[data-msg-id="${disc.messageId}"]`) as HTMLElement;
                if (msgElement) {
                    msgElement.classList.add('og-nexus-tracked');
                    updateLifeformDiscoveryVisuals(msgElement, disc, removeOGLight);

                    if (disc.isNew && disc.discoveryType !== 'nothing' && disc.discoveryType !== 'ship-lost') {
                        setTimeout(() => {
                            let iconPath = '';
                            if (disc.discoveryType === 'artifacts') {
                                iconPath = chrome.runtime.getURL('icons/lifeforms/artifact-icon-large.png');
                            } else if (disc.discoveryType === 'lifeform-xp') {
                                const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
                                const lfName = lfNames[(disc.lifeform || 1) - 1] || 'humans';
                                iconPath = chrome.runtime.getURL(`icons/lifeforms/${lfName}-icon-large.jpg`);
                            }
                            if (iconPath) {
                                flyToNexusButton(msgElement, [iconPath]);
                            }
                        }, 100);
                    }
                }

                if (disc.discoveryType === 'artifacts' && disc.artifactSize) {
                    const size = disc.artifactSize.toLowerCase();
                    let rarity = 0;
                    if (size === 'huge') rarity = 2;
                    else if (size === 'big') rarity = 1;

                    if (rarity > maxRarity) maxRarity = rarity;
                }
            });

            if (response.newCount && response.newCount > 0) {
                const newItems = response.data.filter((disc: any) => disc.isNew).map((disc: any) => ({ ...disc, type: 'lifeform' }));
                if (newItems.length > 0) {
                    addSessionTrackedItems(newItems);
                    setNewBadgeActive(true);
                }
                injectTodaySummaryCard(playerId, true, maxRarity);
            }

            triggerSiteTooltips();
        }
    });
}

function cleanOGLightDOM(msgElement: HTMLElement) {
    // Purge specifically and only OGLight visual summary cards (class '.ogl_battle')
    const duplicates = msgElement.querySelectorAll('.ogl_battle');
    duplicates.forEach(el => {
        el.remove();
    });
    const content = msgElement.querySelector('.msgContent');
    if (content) {
        content.classList.remove('ogl_hidden');
    }
}

function updateLifeformDiscoveryVisuals(msgElement: HTMLElement, discovery: any, removeOGLight: boolean = true) {
    if (!isExtensionStillValid()) return;

    if (removeOGLight) {
        const isExpeditionsTab = document.documentElement?.getAttribute('data-nexus-active-subtab') === '22' ||
                                 !!document.querySelector('div.innerTabItem.active[data-subtab-id="22"]');
        if (isExpeditionsTab) {
            cleanOGLightDOM(msgElement);
        }
    }

    // Check if visuals already applied
    if (msgElement.hasAttribute('data-og-nexus-visuals-applied')) return;
    msgElement.setAttribute('data-og-nexus-visuals-applied', 'true');

    const discType = discovery.discoveryType;

    // Determine thematic color based on discovery type defaults
    let thematicColor = '#6b7280'; // gray default for 'nothing'
    let discLabel = 'Lifeform';
    let iconSvg = '';

    if (discType === 'lifeform-xp') {
        discLabel = 'EXPERIENCE';
        iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="THEME_COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"></path></svg>`;
    } else if (discType === 'artifacts') {
        thematicColor = '#eab308';
        discLabel = 'ARTIFACTS';
        iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="THEME_COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`;
    } else if (discType === 'nothing' || discType === 'ship-lost') {
        thematicColor = discType === 'ship-lost' ? '#ef4444' : '#6b7280';
        discLabel = 'X NOTHING';
        iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="THEME_COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
    }

    // Apply lifeform-specific color coding if lifeform is specified
    if (discovery.lifeform === 1) thematicColor = '#22c55e'; // Humans: Green
    else if (discovery.lifeform === 2) thematicColor = '#991b1b'; // Rocktal: Maroon-Red
    else if (discovery.lifeform === 3) thematicColor = '#06b6d4'; // Mechas: Blue/Cyan
    else if (discovery.lifeform === 4) thematicColor = '#a855f7'; // Kaelesh: Purple
    else if (discType === 'lifeform-xp') thematicColor = '#3b82f6'; // Fallback for XP if no lifeform ID

    // Determine rarity for artifacts
    let rarityTier = -1; // -1 means no rarity icon
    let rarityLabelText = '';
    let rarityColor = '';
    let rarityBgGradient = '';
    let rarityBorderColor = '';
    let rarityGlow = '';
    let rarityIconPath = '';

    if (discType === 'artifacts' && discovery.artifactSize) {
        const size = discovery.artifactSize.toLowerCase();
        if (size === 'full') {
            rarityTier = 0;
            rarityLabelText = 'Storage Full';
            rarityColor = '#9ca3af';
            rarityBorderColor = '#9ca3af';
            rarityIconPath = 'icons/misc/rarity-common-medium.png';
        } else if (size === 'normal') {
            rarityTier = 0;
            rarityLabelText = 'Common';
        } else if (size === 'big') {
            rarityTier = 1;
            rarityLabelText = 'Rare';
        } else {
            rarityTier = 2; // huge or anything else
            rarityLabelText = 'Epic';
        }

        if (rarityTier === 2) {
            rarityColor = '#ec4899';
            rarityBgGradient = 'linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(168, 85, 247, 0.10) 50%, rgba(20, 20, 30, 0.95) 100%)';
            rarityBorderColor = '#ec4899';
            rarityGlow = '0 0 20px rgba(236, 72, 153, 0.4)';
            rarityIconPath = 'icons/misc/rarity-epic-medium.png';
        } else if (rarityTier === 1) {
            rarityColor = '#06b6d4';
            rarityBgGradient = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.08) 50%, rgba(20, 20, 30, 0.95) 100%)';
            rarityBorderColor = '#06b6d4';
            rarityGlow = '0 0 15px rgba(6, 182, 212, 0.3)';
            rarityIconPath = 'icons/misc/rarity-rare-medium.png';
        } else if (rarityTier === 0) {
            rarityColor = '#6b7280';
            rarityBgGradient = 'linear-gradient(135deg, rgba(107, 114, 128, 0.08) 0%, rgba(75, 85, 99, 0.05) 50%, rgba(20, 20, 30, 0.95) 100%)';
            rarityBorderColor = '#6b7280';
            rarityGlow = 'none';
            rarityIconPath = 'icons/misc/rarity-common-medium.png';
        }
    }

    // Update iconSvg with the final thematic color
    iconSvg = iconSvg.replace('THEME_COLOR', thematicColor);

    // Determine background icon and pill icon
    let backgroundIconSvg = iconSvg;
    let pillLfIconUrl = '';

    if (discType === 'lifeform-xp') {
        if (discovery.lifeform) {
            const lfId = discovery.lifeform;
            let lfName = '';
            if (lfId === 1) lfName = 'humans';
            else if (lfId === 2) lfName = 'rocktal';
            else if (lfId === 3) lfName = 'mechas';
            else if (lfId === 4) lfName = 'kaelesh';

            if (lfName) {
                pillLfIconUrl = chrome.runtime.getURL(`icons/lifeforms/${lfName}-icon-large.jpg`);
            }
        }
    } else if (discType === 'artifacts') {
        pillLfIconUrl = chrome.runtime.getURL('icons/lifeforms/artifact-icon-large.png');
    }

    const content = msgElement.querySelector('.msgContent') as HTMLElement;
    if (content && !msgElement.querySelector('.og-nexus-discovery-result')) {
        // Hide original content
        content.style.display = 'none';

        const container = document.createElement('div');
        container.className = 'og-nexus-discovery-result';
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



        const pill = document.createElement('div');
        const pillBorderColor = discType === 'artifacts' ? (rarityBorderColor || 'rgba(255, 255, 255, 0.15)') : 'rgba(255, 255, 255, 0.08)';

        if (discType === 'artifacts') {
            pill.className = 'nexus-tooltip';
            if (discovery.artifactSize?.toLowerCase() === 'full') {
                pill.setAttribute('data-nexus-tooltip', 'Artifact storage limit reached: no artifacts could be recovered!');
            } else {
                const arts = discovery.artifactsFound || 0;
                pill.setAttribute('data-nexus-tooltip', `${rarityLabelText} Artifact Shipment (+${arts.toLocaleString()} Artifacts)`);
            }
        } else if (discType === 'lifeform-xp') {
            pill.className = 'nexus-tooltip';
            const xp = discovery.lifeformGainedExperience || 0;
            pill.setAttribute('data-nexus-tooltip', `Lifeform Research Progress (+${xp.toLocaleString()} XP)`);
        }

        if (rarityTier === 0) pill.classList.add('rarity-pill-common');
        if (rarityTier === 1) pill.classList.add('rarity-pill-rare-animate');
        if (rarityTier === 2) pill.classList.add('rarity-pill-epic-animate');

        pill.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(20, 25, 30, 0.7);
            border: 1px solid ${pillBorderColor};
            border-radius: 4px;
            padding: 4px 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            cursor: default;
        `;

        if (rarityTier >= 0) {
            const rarityIcon = document.createElement('img');
            rarityIcon.src = chrome.runtime.getURL(rarityIconPath);
            rarityIcon.className = 'og-nexus-rarity-icon';
            rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
            if (rarityTier === 1) rarityIcon.classList.add('rarity-sparkle-rare');
            if (rarityTier === 2) rarityIcon.classList.add('rarity-sparkle-epic');
            pill.appendChild(rarityIcon);
        }

        if (pillLfIconUrl) {
            const lfIcon = document.createElement('img');
            lfIcon.src = pillLfIconUrl;
            lfIcon.style.cssText = `
                width: 24px;
                height: 24px;
                border-radius: 3px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
            `;
            pill.appendChild(lfIcon);
        }

        const text = document.createElement('div');
        let displayedText = (discType === 'nothing' || discType === 'ship-lost') ? 'X NOTHING' : discLabel.toUpperCase().split('').join(' ');
        if (discType === 'artifacts' && discovery.artifactSize?.toLowerCase() === 'full') {
            displayedText = 'Artifacts storage full';
        } else if (discType === 'lifeform-xp' && discovery.lifeformGainedExperience) {
            const xp = discovery.lifeformGainedExperience;
            displayedText = `+${xp} XP`;
        } else if (discType === 'artifacts' && discovery.artifactsFound) {
            const arts = discovery.artifactsFound;
            displayedText = `+${arts}`;
        }

        if (rarityTier === 2) text.classList.add('amount-glow');
        text.textContent = displayedText;
        text.style.cssText = `
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 2px;
            color: ${rarityColor || thematicColor} !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        `;

        pill.appendChild(text);
        layoutWrapper.appendChild(pill);
        container.appendChild(layoutWrapper);

        const head = msgElement.querySelector('.msgHead');
        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
    }

    // Apply rarity or thematic styling via classes
    msgElement.classList.remove('og-nexus-common-card', 'og-nexus-rare-card', 'og-nexus-epic-card');
    msgElement.querySelectorAll('.nexus-corner').forEach(c => c.remove());

    if (rarityTier === 2) {
        msgElement.classList.add('og-nexus-epic-card');
    } else if (rarityTier === 1) {
        msgElement.classList.add('og-nexus-rare-card');
    } else {
        msgElement.classList.add('og-nexus-common-card');
        // If it was XP or Nothing, we still apply the thematic border
        msgElement.style.setProperty('border-left', `3px solid ${thematicColor}`, 'important');
    }

    // Add subtle tracked icon to footer (if missing)
    const footerActions = msgElement.querySelector('message-footer-actions');
    if (footerActions && !footerActions.querySelector('.og-nexus-tracked-btn')) {
        const trackedWrapper = document.createElement('gradient-button');
        trackedWrapper.setAttribute('sq28', '');

        const trackedBtn = document.createElement('button');
        trackedBtn.className = 'custom_btn nexus-tooltip og-nexus-tracked-btn';
        trackedBtn.setAttribute('data-nexus-tooltip', 'OGame Nexus: Discovery Tracked');

        // Use a subtle gray checkmark SVG similar to expeditions
        trackedBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" style="margin: 4px;">
                <circle cx="10" cy="10" r="9" fill="none" stroke="#9ca3af" stroke-width="1.5"/>
                <path d="M6 10 L9 13 L14 7" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        trackedWrapper.appendChild(trackedBtn);
        footerActions.appendChild(trackedWrapper);
        // Re-init tooltips for the new button
    }

    triggerSiteTooltips();
}

function triggerSiteTooltips() {
    window.dispatchEvent(new CustomEvent('ogame-nexus-trigger-tooltips'));
}
