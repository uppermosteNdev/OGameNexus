
import { flyToNexusButton } from './effects';

function isExtensionStillValid() {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
}

export function formatExactNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
}

export function formatNumber(num: number): string {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'G';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toString();
}

export function scrapeCombatMessages() {
    const combatMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="25"]:not([data-og-nexus-processed="true"])');
    const results = [];

    for (const msg of combatMessages) {
        const messageId = msg.closest('.msg')?.getAttribute('data-msg-id');
        if (!messageId) continue;

        const timestamp = msg.getAttribute('data-raw-timestamp');
        const coordsRaw = msg.getAttribute('data-raw-coords');
        const resultRaw = msg.getAttribute('data-raw-result');
        const fleetsRaw = msg.getAttribute('data-raw-fleets');

        if (timestamp && coordsRaw && resultRaw) {
            try {
                const result = JSON.parse(resultRaw);
                const coords = coordsRaw.replace(/[\[\]]/g, '');

                // Extract Loot
                const loot: any = { metal: 0, crystal: 0, deuterium: 0, food: 0 };
                if (result.loot && Array.isArray(result.loot.resources)) {
                    result.loot.resources.forEach((r: any) => {
                        if (loot.hasOwnProperty(r.resource)) {
                            loot[r.resource] = r.amount;
                        }
                    });
                }

                // Extract Debris
                const debris: any = { metal: 0, crystal: 0, deuterium: 0 };
                if (result.debris && Array.isArray(result.debris.resources)) {
                    result.debris.resources.forEach((r: any) => {
                        if (debris.hasOwnProperty(r.resource)) {
                            debris[r.resource] = r.total;
                        }
                    });
                }

                // Extract Losses
                let attackerLosses = 0;
                let defenderLosses = 0;
                if (Array.isArray(result.totalValueOfUnitsLost)) {
                    result.totalValueOfUnitsLost.forEach((l: any) => {
                        if (l.side === 'attacker') attackerLosses = l.value;
                        else if (l.side === 'defender') defenderLosses = l.value;
                    });
                }

                // Check for ACS
                let isAcs = false;
                try {
                    const fleets = JSON.parse(fleetsRaw || '[]');
                    // If multiple participants on either side, it's ACS (or at least looks like it)
                    if (Array.isArray(fleets) && fleets.length > 2) {
                        isAcs = true;
                    }
                } catch (e) { }

                // Identify expedition and names
                const isExpedition = coords.trim().endsWith(':16');
                const attackers = Array.isArray(result.attackers) ? result.attackers : [];
                const defenders = Array.isArray(result.defenders) ? result.defenders : [];
                
                // Usually take the first name as primary
                let attackerName = attackers[0]?.name || 'Unknown';
                let defenderName = defenders[0]?.name || 'Unknown';

                // FALLBACK: Parse from message head if metadata is missing names
                if (attackerName === 'Unknown' || (defenderName === 'Unknown' && !isExpedition)) {
                    // Try multiple possible header selectors
                    const msgContainer = msg.closest('.msg');
                    const header = msgContainer?.querySelector('.msg_title, .msg_head, .msgHead, .msgHeadInternal, .msg_title_text');
                    const headText = header?.textContent || '';
                    
                    const parenMatch = headText.match(/\((.*?)\)/);
                    if (parenMatch) {
                        const content = parenMatch[1];
                        const parts = content.split(',').map(p => p.trim());
                        if (parts.length >= 2) {
                            // Split by first colon to handle names that might contain colons
                            const aContent = parts[0];
                            const dContent = parts[1];
                            
                            const aColonIdx = aContent.indexOf(':');
                            const dColonIdx = dContent.indexOf(':');
                            
                            if (attackerName === 'Unknown' && aColonIdx !== -1) {
                                attackerName = aContent.substring(aColonIdx + 1).trim();
                            }
                            if (defenderName === 'Unknown' && dColonIdx !== -1) {
                                defenderName = dContent.substring(dColonIdx + 1).trim();
                            }
                        }
                    }
                }

                // FALLBACK 2: Parse from message body if still Unknown
                if (attackerName === 'Unknown' || defenderName === 'Unknown' || defenderName === 'Expedition Hostile' || (isExpedition && (defenderName === 'Pirates' || defenderName === 'Aliens'))) {
                    const msgContainer = msg.closest('.msg');
                    const bodyText = msgContainer?.querySelector('.msgContent, .msg_content')?.textContent || '';
                    
                    if (bodyText) {
                        // Regex to find "Attacker: (Name)" or "Defender: (Name)"
                        // We support multiple languages by looking for the colon and parentheses pattern
                        // Examples: "Attacker: (Aliens)", "Defender: (Vendetta)", "Angreifer: (Discovery)"
                        const aMatch = bodyText.match(/(?:Attacker|Angreifer|Attaquant|Attaccante|Agresor|Atacante):\s*\((.*?)\)/i);
                        const dMatch = bodyText.match(/(?:Defender|Verteidiger|Défenseur|Difensore|Defensor):\s*\((.*?)\)/i);
                        
                        if (attackerName === 'Unknown' && aMatch) attackerName = aMatch[1].trim();
                        
                        // For Defender, if it's already "Pirates" or "Aliens" from the header, we might want to keep the body's name if it's more specific
                        if ((defenderName === 'Unknown' || defenderName === 'Expedition Hostile' || defenderName === 'Pirates' || defenderName === 'Aliens') && dMatch) {
                            defenderName = dMatch[1].trim();
                        }
                    }
                }

                results.push({
                    messageId,
                    timestamp: parseInt(timestamp),
                    coords,
                    winner: result.winner || 'none',
                    loot,
                    debris,
                    attackerLosses,
                    defenderLosses,
                    attackerName,
                    defenderName,
                    honor: result.honor?.attacker || 0,
                    moonChance: result.moonCreation?.chance || 0,
                    isAcs,
                    isExpedition,
                    tracked: false,
                    rawFleets: JSON.parse(fleetsRaw || '[]'),
                    rawResult: result
                });

                // Mark as processed
                msg.setAttribute('data-og-nexus-processed', 'true');
            } catch (e) {
                console.error('OGame Nexus: Failed to parse combat report JSON', e);
            }
        }
    }

    return results;
}

export async function trackCombatReports(playerId: string) {
    if (!isExtensionStillValid()) return;

    const combatData = scrapeCombatMessages();
    if (combatData.length === 0) return;

    chrome.runtime.sendMessage({
        type: "TRACK_COMBATS",
        data: { combats: combatData, playerId }
    }, (response) => {
        if (response?.success) {
            response.data.forEach((combat: any) => {
                const msgElement = document.querySelector(`.msg[data-msg-id="${combat.messageId}"]`) as HTMLElement;
                if (msgElement) {
                    updateCombatVisuals(msgElement, combat);

                    if (combat.isNew) {
                        setTimeout(() => {
                            const icons: string[] = [];
                            // Animation with combat icon and resource icons
                            icons.push(chrome.runtime.getURL('icons/misc/warrior_armor_shield_weapon.png'));
                            if (combat.loot?.metal > 0 || combat.debris?.metal > 0) icons.push(chrome.runtime.getURL('icons/resources/metal-icon-medium.jpg'));
                            if (combat.loot?.crystal > 0 || combat.debris?.crystal > 0) icons.push(chrome.runtime.getURL('icons/resources/crystal-icon-medium.jpg'));

                            flyToNexusButton(msgElement, icons);
                        }, 100);
                    }
                }
            });
            triggerSiteTooltips();
        }
    });
}

export function updateCombatVisuals(msgElement: HTMLElement, combat: any) {
    if (!isExtensionStillValid()) return;

    // 1. Add tracked icon in footer
    const footerActions = msgElement.querySelector('message-footer-actions') || msgElement.querySelector('.msg_actions');
    if (footerActions && !footerActions.querySelector('.og-nexus-tracked-btn')) {
        const trackedWrapper = document.createElement('gradient-button');
        trackedWrapper.setAttribute('sq28', '');

        const trackedBtn = document.createElement('button');
        trackedBtn.className = 'custom_btn nexus-tooltip og-nexus-tracked-btn';
        trackedBtn.setAttribute('data-nexus-tooltip', 'OGame Nexus: Message Tracked');

        trackedBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" style="margin: 4px;">
                <circle cx="10" cy="10" r="9" fill="none" stroke="#9ca3af" stroke-width="1.5" />
                <path d="M6 10 L9 13 L14 7" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;

        trackedWrapper.appendChild(trackedBtn);
        footerActions.appendChild(trackedWrapper);
    }

    // 2. Add debris summary pill
    if (combat.debris && !msgElement.querySelector('.og-nexus-combat-debris-summary')) {
        const container = document.createElement('div');
        container.className = 'og-nexus-combat-debris-summary og-nexus-result-container';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 8px 0;
            gap: 6px;
            position: relative;
            z-index: 1;
        `;

        const layoutWrapper = document.createElement('div');
        layoutWrapper.className = 'nexus-tooltip rarity-pill-common';
        layoutWrapper.setAttribute('data-nexus-tooltip', `Created Debris: ${formatExactNumber(combat.debris.metal)} Metal, ${formatExactNumber(combat.debris.crystal)} Crystal`);
        layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            padding: 4px 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            cursor: default;
        `;

        const addResourceItem = (resName: string, resAmount: number, iconUrl: string, color: string) => {
            const isZero = resAmount === 0;
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
                opacity: ${isZero ? 0.6 : 1};
                filter: ${isZero ? 'grayscale(0.8)' : 'none'};
            `;

            const icon = document.createElement('div');
            icon.style.cssText = `
                width: 20px;
                height: 20px;
                background-image: url('${chrome.runtime.getURL(iconUrl)}');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            `;

            const amountLabel = document.createElement('div');
            amountLabel.textContent = formatNumber(resAmount);
            amountLabel.style.cssText = `
                font-size: 12px;
                font-weight: bold;
                font-family: 'Verdana', sans-serif;
                color: ${isZero ? '#9ca3af' : color};
            `;

            item.appendChild(icon);
            item.appendChild(amountLabel);
            layoutWrapper.appendChild(item);
        };

        addResourceItem('metal', combat.debris.metal, 'icons/resources/metal-icon-medium.jpg', '#E6953C');
        addResourceItem('crystal', combat.debris.crystal, 'icons/resources/crystal-icon-medium.jpg', '#4CAEE6');

        container.appendChild(layoutWrapper);

        const head = msgElement.querySelector('.msgHead');
        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
    }
}

function triggerSiteTooltips() {
    window.dispatchEvent(new CustomEvent('ogame-nexus-trigger-tooltips'));
}
