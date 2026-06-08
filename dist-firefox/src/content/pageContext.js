(function() {
  "use strict";
  window.addEventListener("ogame-nexus-trigger-tooltips", () => {
    try {
      if (typeof initOverlays === "function") {
        initOverlays();
      }
    } catch (e) {
      console.warn("OGame Nexus: Error triggering tooltips in page context", e);
    }
  });
  window.addEventListener("ogame-nexus-request-raw-messages", () => {
    var _a, _b;
    try {
      const messages = (_b = (_a = window.ogame) == null ? void 0 : _a.messages) == null ? void 0 : _b.content;
      if (Array.isArray(messages)) {
        window.dispatchEvent(new CustomEvent("ogame-nexus-response-raw-messages", {
          detail: { content: messages }
        }));
      }
    } catch (e) {
      console.warn("OGame Nexus: Error retrieving raw messages in page context", e);
    }
  });
})();
