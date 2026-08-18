// This script runs in the "MAIN" world, meaning it has access to the page's global variables like 'initOverlays'
window.addEventListener('ogame-nexus-trigger-tooltips', () => {
    try {
        // @ts-ignore
        if (typeof initOverlays === 'function') {
            // @ts-ignore
            initOverlays();
        }
    } catch (e) {
        console.warn('OGame Nexus: Error triggering tooltips in page context', e);
    }
});

window.addEventListener('ogame-nexus-request-raw-messages', () => {
    try {
        // @ts-ignore
        const messages = window.ogame?.messages?.content;
        if (Array.isArray(messages)) {
            window.dispatchEvent(new CustomEvent('ogame-nexus-response-raw-messages', {
                detail: { content: messages }
            }));
        }
    } catch (e) {
        console.warn('OGame Nexus: Error retrieving raw messages in page context', e);
    }
});

window.addEventListener('ogame-nexus-navigate-galaxy', (e: any) => {
    try {
        const { galaxy, system } = e.detail || {};
        // @ts-ignore
        if (typeof canGalaxyGo === 'function') {
            // @ts-ignore
            canGalaxyGo(galaxy, system);
        } else {
            const galaxyInput = document.getElementById('galaxy_input') as HTMLInputElement | null;
            const systemInput = document.getElementById('system_input') as HTMLInputElement | null;
            if (galaxyInput && systemInput) {
                galaxyInput.value = String(galaxy);
                systemInput.value = String(system);
                
                galaxyInput.dispatchEvent(new Event('change', { bubbles: true }));
                systemInput.dispatchEvent(new Event('change', { bubbles: true }));
                galaxyInput.dispatchEvent(new Event('input', { bubbles: true }));
                systemInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                const parent = galaxyInput.parentElement || document;
                const goBtn = parent.querySelector('.btn_blue, input[type="button"], button') as HTMLElement | null;
                if (goBtn) {
                    goBtn.click();
                }
            }
        }
    } catch (err) {
        console.warn('OGame Nexus: Error navigating galaxy in page context', err);
    }
});

// Hook jQuery AJAX requests to detect message list loads
function hookJQueryAjax() {
    // @ts-ignore
    if (typeof $ === 'function' && $.fn && typeof $(document).on === 'function') {
        // @ts-ignore
        $(document).on("ajaxSuccess", (event, xhr, settings) => {
            if (settings) {
                const url = typeof settings.url === 'string' ? settings.url : '';
                let data = '';
                if (typeof settings.data === 'string') {
                    data = settings.data;
                } else if (settings.data && typeof settings.data === 'object') {
                    try {
                        // @ts-ignore
                        if (typeof $ === 'function' && $.param) {
                            // @ts-ignore
                            data = $.param(settings.data);
                        } else {
                            data = JSON.stringify(settings.data);
                        }
                    } catch (e) {
                        try {
                            data = Object.keys(settings.data).map(k => `${k}=${(settings.data as any)[k]}`).join('&');
                        } catch (e2) {}
                    }
                }
                if (url.includes('action=getMessagesList') || data.includes('action=getMessagesList')) {
                    // If it's not a trash tab / delete operation
                    if (!data.includes('showTrash=true') && !url.includes('showTrash=true')) {
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-messages-loaded'));
                    }
                }

                // Intercept Fleet Event List & Fleet Dispatches
                if (url.includes('component=eventlist') || url.includes('component=eventList') || data.includes('component=eventlist') || data.includes('component=eventList')) {
                    try {
                        const rawText = xhr?.responseText || '';
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-eventlist-loaded', {
                            detail: { html: rawText }
                        }));
                    } catch (e) {
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-eventlist-loaded', { detail: { html: null } }));
                    }
                } else if (url.includes('action=miniFleet') || url.includes('action=recallFleet') || url.includes('action=sendFleet')) {
                    // Fleet dispatched or recalled - trigger event refresh
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-eventlist-loaded', { detail: { html: null } }));
                    }, 500);
                }

                // Intercept Trader Import/Export operations
                if (url.includes('traderImportExport') || url.includes('importExport') || data.includes('traderImportExport') || data.includes('importExport') || url.includes('action=takeItem') || url.includes('action=buyItem')) {
                    try {
                        const rawText = xhr?.responseText || '';
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-importexport-loaded', {
                            detail: { response: rawText }
                        }));
                    } catch (e) {}
                }
            }
        });
    } else {
        setTimeout(hookJQueryAjax, 50);
    }
}
hookJQueryAjax();
