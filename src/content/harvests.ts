import { flyToNexusButton } from './effects';

export function formatExactNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
}

export function formatNumber(num: number, decimals: number = 2): string {
    const n = num || 0;
    const d = 2;
    if (n >= 1000000000000) return (n / 1000000000000).toFixed(d) + 'T';
    if (n >= 1000000000) return (n / 1000000000).toFixed(d) + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(d) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(d) + 'K';
    return Math.round(n).toString();
}

export function scrapeDebrisHarvestMessages() {
    // Message type 32 = Harvesting report from DF
    const harvestMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="32"]:not([data-og-nexus-processed="true"])');
    const results: any[] = [];

    for (const msg of harvestMessages) {
        const messageId = msg.closest('.msg')?.getAttribute('data-msg-id');
        if (!messageId) continue;

        const timestamp = msg.getAttribute('data-raw-timestamp');
        const coords = msg.getAttribute('data-raw-targetcoordinates');
        const recyclerAmount = msg.getAttribute('data-raw-recycleramount');
        const totalCapacity = msg.getAttribute('data-raw-totalcapacity');
        const recycledResourcesRaw = msg.getAttribute('data-raw-recycledresources');

        if (timestamp && coords && recycledResourcesRaw) {
            let recycledResources = undefined;
            try {
                recycledResources = JSON.parse(recycledResourcesRaw);
            } catch (e) {
                console.warn('OGame Nexus: Failed to parse debris resources JSON', e);
            }

            results.push({
                messageId,
                timestamp: parseInt(timestamp),
                coords,
                recyclerAmount: recyclerAmount ? parseInt(recyclerAmount) : undefined,
                totalCapacity: totalCapacity ? parseInt(totalCapacity) : undefined,
                recycledResources
            });

            // Mark as processed immediately
            msg.setAttribute('data-og-nexus-processed', 'true');
        }
    }

    return results;
}

export function trackDebrisHarvests(playerId: string) {
    const harvests = scrapeDebrisHarvestMessages();

    if (harvests.length > 0) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({
                type: "TRACK_DEBRIS",
                data: { harvests, playerId }
            }, (response) => {
                if (response && response.success) {
                    response.data.forEach((harvest: any) => {
                        const msgElement = document.querySelector(`.msg[data-msg-id="${harvest.messageId}"]`);
                        if (msgElement) {
                            updateDebrisVisuals(msgElement, harvest);
                            if (harvest.isNew) {
                                setTimeout(() => {
                                    const icons: string[] = [];
                                    if (harvest.recycledResources?.metal > 0) icons.push(chrome.runtime.getURL('icons/resources/metal-icon-medium.jpg'));
                                    if (harvest.recycledResources?.crystal > 0) icons.push(chrome.runtime.getURL('icons/resources/crystal-icon-medium.jpg'));
                                    if (harvest.recycledResources?.deuterium > 0) icons.push(chrome.runtime.getURL('icons/resources/deuterium-icon-medium.jpg'));

                                    if (icons.length > 0) {
                                        flyToNexusButton(msgElement, icons);
                                    }
                                }, 100);
                            }
                        }
                    });
                }
            });
        }
    }
}

export function updateDebrisVisuals(msgElement: Element, harvest: any) {
    // Adding the "tracked" tick mark
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

        // Need to trigger standard tooltips for the tooltip functionality
        if (typeof (window as any).initTooltips === 'function') {
            (window as any).initTooltips();
        }
    }

    // Creating the pills
    const content = msgElement.querySelector('.msgContent') as HTMLElement;
    const res = harvest.recycledResources;

    if (content && res && !msgElement.querySelector('.og-nexus-debris-result')) {
        // Hide original content
        content.style.display = 'none';

        const container = document.createElement('div');
        container.className = 'og-nexus-debris-result og-nexus-result-container';
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
        layoutWrapper.className = 'nexus-tooltip rarity-pill-common';
        layoutWrapper.setAttribute('data-nexus-tooltip', `Harvested Debris: ${formatExactNumber(res.metal)} Metal, ${formatExactNumber(res.crystal)} Crystal, ${formatExactNumber(res.deuterium)} Deuterium`);
        layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            padding: 6px 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            cursor: default;
        `;

        // Function adapted to generate elegant pill similar to expeditions
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
                width: 22px;
                height: 22px;
                background-image: url('${chrome.runtime.getURL(iconUrl)}');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            `;

            const amountLabel = document.createElement('div');
            amountLabel.textContent = formatNumber(resAmount);
            amountLabel.style.cssText = `
                font-size: 13px;
                font-weight: bold;
                font-family: 'Verdana', sans-serif;
                color: ${isZero ? '#9ca3af' : color};
            `;

            item.appendChild(icon);
            item.appendChild(amountLabel);
            layoutWrapper.appendChild(item);
        };

        addResourceItem('metal', res.metal, 'icons/resources/metal-icon-medium.jpg', '#E6953C');
        addResourceItem('crystal', res.crystal, 'icons/resources/crystal-icon-medium.jpg', '#4CAEE6');
        addResourceItem('deuterium', res.deuterium, 'icons/resources/deuterium-icon-medium.jpg', '#43D159');

        container.appendChild(layoutWrapper);

        const head = msgElement.querySelector('.msgHead');
        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
    }
}
