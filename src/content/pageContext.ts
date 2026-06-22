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
