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

