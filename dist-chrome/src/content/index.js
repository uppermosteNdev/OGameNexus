(function() {
  "use strict";
  const SHIP_DATA = [
    { id: 202, category: "ships", name: "Small Cargo", icon: "icons/ships/small-cargo-large.jpg", metadata: { cost: { metal: 2e3, crystal: 2e3, deuterium: 0 } } },
    { id: 203, category: "ships", name: "Large Cargo", icon: "icons/ships/large-cargo-large.jpg", metadata: { cost: { metal: 6e3, crystal: 6e3, deuterium: 0 } } },
    { id: 204, category: "ships", name: "Light Fighter", icon: "icons/ships/light-fighter-large.jpg", metadata: { cost: { metal: 3e3, crystal: 1e3, deuterium: 0 } } },
    { id: 205, category: "ships", name: "Heavy Fighter", icon: "icons/ships/heavy-fighter-large.jpg", metadata: { cost: { metal: 6e3, crystal: 4e3, deuterium: 0 } } },
    { id: 206, category: "ships", name: "Cruiser", icon: "icons/ships/cruiser-large.jpg", metadata: { cost: { metal: 2e4, crystal: 7e3, deuterium: 2e3 } } },
    { id: 207, category: "ships", name: "Battleship", icon: "icons/ships/battleship-large.jpg", metadata: { cost: { metal: 45e3, crystal: 15e3, deuterium: 0 } } },
    { id: 208, category: "ships", name: "Colony Ship", icon: "icons/ships/colony-ship-large.jpg", metadata: { cost: { metal: 1e4, crystal: 2e4, deuterium: 1e4 } } },
    { id: 209, category: "ships", name: "Recycler", icon: "icons/ships/recycler-large.jpg", metadata: { cost: { metal: 1e4, crystal: 6e3, deuterium: 2e3 } } },
    { id: 210, category: "ships", name: "Espionage Probe", icon: "icons/ships/espionage-probe-large.jpg", metadata: { cost: { metal: 0, crystal: 1e3, deuterium: 0 } } },
    { id: 211, category: "ships", name: "Bomber", icon: "icons/ships/bomber-large.jpg", metadata: { cost: { metal: 5e4, crystal: 25e3, deuterium: 15e3 } } },
    { id: 212, category: "ships", name: "Solar Satellite", icon: "icons/ships/solar-satellite-large.jpg", metadata: { cost: { metal: 0, crystal: 2e3, deuterium: 500 } } },
    { id: 213, category: "ships", name: "Destroyer", icon: "icons/ships/destroyer-large.jpg", metadata: { cost: { metal: 6e4, crystal: 5e4, deuterium: 15e3 } } },
    { id: 214, category: "ships", name: "Deathstar", icon: "icons/ships/deathstar-large.jpg", metadata: { cost: { metal: 5e6, crystal: 4e6, deuterium: 1e6 } } },
    { id: 215, category: "ships", name: "Battlecruiser", icon: "icons/ships/battlecruiser-large.jpg", metadata: { cost: { metal: 3e4, crystal: 4e4, deuterium: 15e3 } } },
    { id: 217, category: "ships", name: "Crawler", icon: "icons/ships/crawler-large.jpg", metadata: { cost: { metal: 2e3, crystal: 2e3, deuterium: 1e3 } } },
    { id: 218, category: "ships", name: "Reaper", icon: "icons/ships/reaper-large.jpg", metadata: { cost: { metal: 85e3, crystal: 55e3, deuterium: 2e4 } } },
    { id: 219, category: "ships", name: "Pathfinder", icon: "icons/ships/pathfinder-large.jpg", metadata: { cost: { metal: 8e3, crystal: 15e3, deuterium: 8e3 } } }
  ];
  function flyToNexusButton(startElement, imageUrls) {
    if (document.body.classList.contains("low-animation")) {
      return;
    }
    const targetBtn = document.querySelector("#og-nexus-icon-modal-btn");
    if (!targetBtn) return;
    const startRect = startElement.getBoundingClientRect();
    const targetRect = targetBtn.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    const triggerEatingEffect = () => {
      targetBtn.classList.add("og-nexus-button-eating");
      setTimeout(() => {
        targetBtn.classList.remove("og-nexus-button-eating");
      }, 1e3);
    };
    imageUrls.forEach((imgUrl, i) => {
      for (let j = 0; j < 3; j++) {
        setTimeout(() => {
          const particle = document.createElement("img");
          particle.src = imgUrl;
          particle.style.cssText = `
                    position: fixed;
                    z-index: 9999999;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    pointer-events: none;
                    box-shadow: 0 0 10px rgba(56,189,248,0.8);
                    left: ${startRect.left + startRect.width / 2}px;
                    top: ${startRect.top + startRect.height / 2}px;
                    transform: translate(-50%, -50%);
                `;
          document.body.appendChild(particle);
          const scatterX = (Math.random() - 0.5) * 60;
          const scatterY = (Math.random() - 0.5) * 60;
          const anim = particle.animate([
            {
              left: `${startRect.left + startRect.width / 2}px`,
              top: `${startRect.top + startRect.height / 2}px`,
              transform: "translate(-50%, -50%) scale(0.5)",
              opacity: 0
            },
            {
              left: `${startRect.left + startRect.width / 2 + scatterX}px`,
              top: `${startRect.top + startRect.height / 2 + scatterY}px`,
              transform: "translate(-50%, -50%) scale(1.2)",
              opacity: 1,
              offset: 0.2
            },
            {
              left: `${targetX}px`,
              top: `${targetY}px`,
              transform: "translate(-50%, -50%) scale(0.3)",
              opacity: 0.8,
              offset: 1
            }
          ], {
            duration: 600 + Math.random() * 300,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)"
          });
          anim.onfinish = () => {
            particle.remove();
            triggerEatingEffect();
          };
        }, i * 100 + j * 50);
      }
    });
  }
  let sessionRecentExpeditions = [];
  let newBadgeActive = false;
  function addSessionTrackedItems(items) {
    sessionRecentExpeditions = [...sessionRecentExpeditions, ...items];
  }
  function setNewBadgeActive(active) {
    newBadgeActive = active;
  }
  function isExtensionStillValid$2() {
    return !!(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id);
  }
  function scrapeExpeditionMessages() {
    var _a;
    const expeditionMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="41"]:not([data-og-nexus-processed="true"])');
    const results = [];
    for (const msg of expeditionMessages) {
      const messageId = (_a = msg.closest(".msg")) == null ? void 0 : _a.getAttribute("data-msg-id");
      if (!messageId) continue;
      const timestamp = msg.getAttribute("data-raw-timestamp");
      const coords = msg.getAttribute("data-raw-coords");
      const depletion = msg.getAttribute("data-raw-depletion");
      const size = msg.getAttribute("data-raw-size");
      const result = msg.getAttribute("data-raw-expeditionresult");
      if (timestamp && coords && depletion !== null && size !== null && result) {
        let resultDetails = null;
        const resType = result.toLowerCase();
        try {
          if (resType === "navigation" || resType === "delay" || resType === "speedup") {
            const raw = msg.getAttribute("data-raw-navigation");
            if (raw) resultDetails = JSON.parse(raw);
          } else if (resType === "ressources" || resType === "resources") {
            const raw = msg.getAttribute("data-raw-resourcesgained");
            if (raw) resultDetails = JSON.parse(raw);
          } else if (resType === "shipwrecks") {
            const raw = msg.getAttribute("data-raw-technologiesgained");
            if (raw) resultDetails = JSON.parse(raw);
          } else if (resType === "darkmatter") {
            const raw = msg.getAttribute("data-raw-resourcesgained");
            if (raw) resultDetails = JSON.parse(raw);
          } else if (resType === "item" || resType === "items") {
            const raw = msg.getAttribute("data-raw-itemsgained") || msg.getAttribute("data-raw-items") || msg.getAttribute("data-raw-technologiesgained");
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                const parentMsg = msg.closest(".msg");
                let imgUrl = null;
                if (parentMsg) {
                  const shopIcon = parentMsg.querySelector("shopitem-icon");
                  if (shopIcon && shopIcon.style.backgroundImage) {
                    imgUrl = shopIcon.style.backgroundImage.replace(/^url\(['"]?/, "").replace(/['"]?\)$/, "");
                  }
                }
                if (Array.isArray(parsed)) {
                  resultDetails = parsed.map((item) => ({ ...item, imgUrl }));
                } else {
                  resultDetails = parsed;
                  if (resultDetails && typeof resultDetails === "object" && imgUrl) {
                    resultDetails.imgUrl = imgUrl;
                  }
                }
              } catch (e) {
              }
            }
          } else if (resType === "trader") {
            const raw = msg.getAttribute("data-raw-resources");
            if (raw) resultDetails = JSON.parse(raw);
          } else if (resType === "fleetloss" || resType === "fleetlost") {
            const rawShips = msg.getAttribute("data-raw-shipslost") || msg.getAttribute("data-raw-fleet");
            if (rawShips) {
              try {
                resultDetails = { shipsLost: JSON.parse(rawShips) };
              } catch (e) {
              }
            }
          }
        } catch (e) {
          console.warn("OGame Nexus: Failed to parse expedition JSON details", e);
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
        msg.setAttribute("data-og-nexus-processed", "true");
      }
    }
    return results;
  }
  function updateBadgeState(wrapper) {
    const card = wrapper.querySelector(".og-nexus-expedition-summary-card");
    if (!card) return;
    let badge = card.querySelector(".og-nexus-new-badge");
    if (newBadgeActive) {
      const count = sessionRecentExpeditions.length;
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "og-nexus-new-badge nexus-tooltip";
        card.appendChild(badge);
      }
      badge.textContent = `${count} New`;
      badge.setAttribute("data-nexus-tooltip", `${count} new Expeditions/Discoveries tracked`);
    } else {
      if (badge) {
        badge.remove();
      }
    }
  }
  function updateCardClickability(wrapper) {
    const card = wrapper.querySelector(".og-nexus-expedition-summary-card");
    if (!card) return;
    const isExpanded = wrapper.classList.contains("og-nexus-expanded");
    if (newBadgeActive || isExpanded) {
      card.classList.add("clickable");
      card.style.cursor = "pointer";
    } else {
      card.classList.remove("clickable");
      card.style.cursor = "default";
    }
  }
  function formatRelativeTime(timestampSeconds) {
    const diff = Math.floor(Date.now() / 1e3 - timestampSeconds);
    if (diff < 0) return "just now";
    if (diff < 60) return "just now";
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  async function updateDetailsPane(wrapper, playerId) {
    const card = wrapper.querySelector(".og-nexus-expedition-summary-card");
    if (!card) return;
    let detailsPane = card.querySelector(".og-nexus-expedition-details-pane");
    if (!detailsPane) {
      detailsPane = document.createElement("div");
      detailsPane.className = "og-nexus-expedition-details-pane";
      detailsPane.addEventListener("click", (e) => e.stopPropagation());
      card.appendChild(detailsPane);
    }
    detailsPane.innerHTML = `
        <div class="og-nexus-details-grid">
            <div class="og-nexus-details-col">
                <h4 class="og-nexus-details-title" style="color: #facc15;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><polygon points="12,2 22,8.5 12,15 2,8.5"></polygon><polyline points="2,8.5 12,22 22,8.5"></polyline><line x1="12" y1="15" x2="12" y2="22"></line></svg>
                    Direct Bounty
                </h4>
                <div class="og-nexus-no-data">Loading recent bounty...</div>
            </div>
            <div class="og-nexus-details-col">
                <h4 class="og-nexus-details-title" style="color: #38bdf8;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    Fleet Value
                </h4>
                <div class="og-nexus-no-data">Loading fleet...</div>
            </div>
        </div>
    `;
    let expeditions = [];
    if (sessionRecentExpeditions && sessionRecentExpeditions.length > 0) {
      expeditions = [...sessionRecentExpeditions];
    } else {
      expeditions = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: "GET_RECENT_EXPEDITIONS",
          data: { playerId, limit: 20 }
        }, (response) => {
          if ((response == null ? void 0 : response.success) && response.expeditions) {
            resolve(response.expeditions);
          } else {
            resolve([]);
          }
        });
      });
    }
    if (expeditions.length === 0) {
      detailsPane.innerHTML = `
            <div class="og-nexus-details-grid">
                <div style="grid-column: span 2; text-align: center; color: #64748b; padding: 20px; font-style: italic;">
                    No tracked expedition data available for this player.
                </div>
            </div>
        `;
      return;
    }
    let totalMetal = 0;
    let totalCrystal = 0;
    let totalDeuterium = 0;
    let totalDarkMatter = 0;
    let totalArtifacts = 0;
    let totalXp = 0;
    let totalBlackHoles = 0;
    const lifeformXp = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const shipsFound = {};
    const depletionCounts = [0, 0, 0, 0, 0];
    expeditions.forEach((exp) => {
      var _a, _b, _c, _d, _e;
      const isLifeform = exp.type === "lifeform" || exp.discoveryType !== void 0;
      if (isLifeform) {
        if (exp.discoveryType === "artifacts") {
          totalArtifacts += exp.artifactsFound || 0;
        } else if (exp.discoveryType === "lifeform-xp") {
          totalXp += exp.lifeformGainedExperience || 0;
          const lfId = Number(exp.lifeform) || 0;
          if (lfId >= 1 && lfId <= 4) {
            lifeformXp[lfId] += exp.lifeformGainedExperience || 0;
          }
        }
      } else {
        const type = (exp.result || "").toLowerCase();
        if (type === "resources" || type === "ressources") {
          totalMetal += ((_a = exp.resultDetails) == null ? void 0 : _a.metal) || 0;
          totalCrystal += ((_b = exp.resultDetails) == null ? void 0 : _b.crystal) || 0;
          totalDeuterium += ((_c = exp.resultDetails) == null ? void 0 : _c.deuterium) || 0;
        } else if (type === "darkmatter" || type === "dark-matter") {
          totalDarkMatter += ((_d = exp.resultDetails) == null ? void 0 : _d.darkMatter) || ((_e = exp.resultDetails) == null ? void 0 : _e.darkmatter) || 0;
        } else if (type === "fleetloss" || type === "fleetlost") {
          totalBlackHoles++;
        }
        if (type === "shipwrecks" && exp.resultDetails) {
          Object.keys(exp.resultDetails).forEach((shipId) => {
            var _a2;
            const details = exp.resultDetails[shipId];
            if (details) {
              const amount = parseInt(details.amount) || 0;
              const name = details.name || ((_a2 = SHIP_DATA.find((s) => s.id.toString() === shipId.toString())) == null ? void 0 : _a2.name) || `Ship ${shipId}`;
              const icon = SHIP_ID_TO_ICON[shipId.toString()] || "icons/ships/small-cargo-large.jpg";
              if (!shipsFound[shipId]) {
                shipsFound[shipId] = { amount: 0, name, icon };
              }
              shipsFound[shipId].amount += amount;
            }
          });
        }
        const dep = exp.depletion ?? 1;
        if (dep >= 1 && dep <= 5) {
          depletionCounts[dep - 1]++;
        }
      }
    });
    const directMsu = totalMetal + totalCrystal * 1.5 + totalDeuterium * 3;
    let shipMetal = 0;
    let shipCrystal = 0;
    let shipDeuterium = 0;
    Object.keys(shipsFound).forEach((shipId) => {
      const ship = shipsFound[shipId];
      const cost = SHIP_ID_TO_COST[shipId.toString()];
      if (cost) {
        shipMetal += (cost.metal || 0) * ship.amount;
        shipCrystal += (cost.crystal || 0) * ship.amount;
        shipDeuterium += (cost.deuterium || 0) * ship.amount;
      }
    });
    const shipMsu = shipMetal + shipCrystal * 1.5 + shipDeuterium * 3;
    const groupA = [];
    if (totalMetal > 0) {
      groupA.push(`
            <div class="og-nexus-details-item">
                <div class="og-nexus-details-label-group">
                    <img class="og-nexus-details-icon" src="${chrome.runtime.getURL("icons/resources/metal-icon-medium.jpg")}">
                    Metal
                </div>
                <div class="og-nexus-details-value" style="color: #E6953C;">+${formatExactNumber$2(totalMetal)}</div>
            </div>
        `);
    }
    if (totalCrystal > 0) {
      groupA.push(`
            <div class="og-nexus-details-item">
                <div class="og-nexus-details-label-group">
                    <img class="og-nexus-details-icon" src="${chrome.runtime.getURL("icons/resources/crystal-icon-medium.jpg")}">
                    Crystal
                </div>
                <div class="og-nexus-details-value" style="color: #4CAEE6;">+${formatExactNumber$2(totalCrystal)}</div>
            </div>
        `);
    }
    if (totalDeuterium > 0) {
      groupA.push(`
            <div class="og-nexus-details-item">
                <div class="og-nexus-details-label-group">
                    <img class="og-nexus-details-icon" src="${chrome.runtime.getURL("icons/resources/deuterium-icon-medium.jpg")}">
                    Deuterium
                </div>
                <div class="og-nexus-details-value" style="color: #43D159;">+${formatExactNumber$2(totalDeuterium)}</div>
            </div>
        `);
    }
    const groupB = [];
    if (totalDarkMatter > 0) {
      groupB.push(`
            <div class="og-nexus-details-item">
                <div class="og-nexus-details-label-group">
                    <img class="og-nexus-details-icon" src="${chrome.runtime.getURL("icons/resources/dark-matter-icon-medium.jpg")}">
                    Dark Matter
                </div>
                <div class="og-nexus-details-value" style="color: #9061F9;">+${formatExactNumber$2(totalDarkMatter)}</div>
            </div>
        `);
    }
    if (totalArtifacts > 0) {
      groupB.push(`
            <div class="og-nexus-details-item">
                <div class="og-nexus-details-label-group">
                    <img class="og-nexus-details-icon" src="${chrome.runtime.getURL("icons/lifeforms/artifact-icon-large.png")}">
                    Artifacts Found
                </div>
                <div class="og-nexus-details-value" style="color: #EAB308;">+${formatExactNumber$2(totalArtifacts)}</div>
            </div>
        `);
    }
    const lifeformConfigs = {
      1: { name: "Humans", icon: "icons/lifeforms/humans-icon-large.jpg", color: "#22c55e" },
      2: { name: "Rock’tal", icon: "icons/lifeforms/rocktal-icon-large.jpg", color: "#991b1b" },
      3: { name: "Mechas", icon: "icons/lifeforms/mechas-icon-large.jpg", color: "#06b6d4" },
      4: { name: "Kaelesh", icon: "icons/lifeforms/kaelesh-icon-large.jpg", color: "#a855f7" }
    };
    [1, 2, 3, 4].forEach((lfId) => {
      const xpAmount = lifeformXp[lfId];
      if (xpAmount > 0) {
        const config = lifeformConfigs[lfId];
        groupB.push(`
                <div class="og-nexus-details-item">
                    <div class="og-nexus-details-label-group">
                        <img class="og-nexus-details-icon" src="${chrome.runtime.getURL(config.icon)}">
                        ${config.name} XP
                    </div>
                    <div class="og-nexus-details-value" style="color: ${config.color};">+${formatExactNumber$2(xpAmount)}</div>
                </div>
            `);
      }
    });
    if (totalBlackHoles > 0) {
      groupB.push(`
            <div class="og-nexus-details-item">
                <div class="og-nexus-details-label-group">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="og-nexus-details-icon" style="padding: 1px; box-sizing: border-box; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);"><circle cx="12" cy="12" r="10" stroke-dasharray="4 2"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2" fill="#ef4444"></circle></svg>
                    Black Holes
                </div>
                <div class="og-nexus-details-value" style="color: #ef4444;">${totalBlackHoles}</div>
            </div>
        `);
    }
    if (groupA.length > 0 && groupB.length > 0) {
      groupB[0] = groupB[0].replace(
        '<div class="og-nexus-details-item">',
        '<div class="og-nexus-details-item" style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px; margin-top: 4px;">'
      );
    }
    let msuBadgeHTML = "";
    if (directMsu > 0) {
      msuBadgeHTML = `
            <div class="og-nexus-msu-badge">
                <div class="og-nexus-details-label-group" style="font-weight: 700;">Direct MSU</div>
                <div class="og-nexus-details-value">${formatExactNumber$2(Math.floor(directMsu))} MSU</div>
            </div>
        `;
    }
    let directBountyContent = "";
    if (groupA.length === 0 && groupB.length === 0 && !msuBadgeHTML) {
      directBountyContent = `<div class="og-nexus-no-data" style="margin-bottom: 8px;">No bounty found recently</div>`;
    } else {
      directBountyContent = `
            <div class="og-nexus-details-list">
                ${groupA.join("")}
                ${groupB.join("")}
                ${msuBadgeHTML}
            </div>
        `;
    }
    let fleetContent = "";
    const shipKeys = Object.keys(shipsFound);
    if (shipKeys.length === 0) {
      fleetContent = `<div class="og-nexus-no-data" style="margin-bottom: 8px;">No ships found recently</div>`;
    } else {
      fleetContent = `
            <div class="og-nexus-ships-grid">
        `;
      shipKeys.forEach((shipId) => {
        const ship = shipsFound[shipId];
        fleetContent += `
                <div class="og-nexus-ship-mini-card nexus-tooltip" data-nexus-tooltip="${ship.amount}x ${ship.name}" style="background-image: url('${chrome.runtime.getURL(ship.icon)}');">
                    <div class="og-nexus-ship-mini-badge">${formatCompactNumber(ship.amount)}</div>
                </div>
            `;
      });
      fleetContent += `
            </div>
        `;
      let fleetDetailsItems = "";
      if (shipMetal > 0) {
        fleetDetailsItems += `
                <div class="og-nexus-details-item" style="font-size: 11px;">
                    <div class="og-nexus-details-label-group" style="color: #94a3b8;">Fleet Metal Value</div>
                    <div class="og-nexus-details-value" style="color: #E6953C;">+${formatCompactNumber(shipMetal)}</div>
                </div>
            `;
      }
      if (shipCrystal > 0) {
        fleetDetailsItems += `
                <div class="og-nexus-details-item" style="font-size: 11px;">
                    <div class="og-nexus-details-label-group" style="color: #94a3b8;">Fleet Crystal Value</div>
                    <div class="og-nexus-details-value" style="color: #4CAEE6;">+${formatCompactNumber(shipCrystal)}</div>
                </div>
            `;
      }
      if (shipDeuterium > 0) {
        fleetDetailsItems += `
                <div class="og-nexus-details-item" style="font-size: 11px;">
                    <div class="og-nexus-details-label-group" style="color: #94a3b8;">Fleet Deut Value</div>
                    <div class="og-nexus-details-value" style="color: #43D159;">+${formatCompactNumber(shipDeuterium)}</div>
                </div>
            `;
      }
      let fleetMsuBadgeHTML = "";
      if (shipMsu > 0) {
        fleetMsuBadgeHTML = `
                <div class="og-nexus-msu-badge" style="background: linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%); border-color: rgba(56, 189, 248, 0.3);">
                    <div class="og-nexus-details-label-group" style="font-weight: 700; color: #38bdf8;">Fleet MSU</div>
                    <div class="og-nexus-details-value" style="color: #38bdf8; text-shadow: 0 0 8px rgba(56, 189, 248, 0.4);">${formatExactNumber$2(Math.floor(shipMsu))} MSU</div>
                </div>
            `;
      }
      if (fleetDetailsItems || fleetMsuBadgeHTML) {
        fleetContent += `
                <div class="og-nexus-details-list" style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
                    ${fleetDetailsItems}
                    ${fleetMsuBadgeHTML}
                </div>
            `;
      }
    }
    const depletionsMapping = [
      { label: "Pristine", color: "#22c55e" },
      { label: "Good", color: "#eab308" },
      { label: "Moderate", color: "#f97316" },
      { label: "Low", color: "#ef4444" },
      { label: "Depleted", color: "#dc2626" }
    ];
    let depletionContent = `<div class="og-nexus-depletion-flex" style="margin-bottom: 10px;">`;
    let hasAnyDepletion = false;
    depletionCounts.forEach((count, idx) => {
      if (count > 0) {
        hasAnyDepletion = true;
        const map = depletionsMapping[idx];
        depletionContent += `
                <div class="og-nexus-depletion-chip nexus-tooltip" data-nexus-tooltip="${count} slots at ${map.label} level">
                    <span class="og-nexus-depletion-dot" style="background-color: ${map.color}; color: ${map.color};"></span>
                    ${map.label}: ${count}
                </div>
            `;
      }
    });
    if (!hasAnyDepletion) {
      depletionContent += `<div class="og-nexus-no-data" style="padding: 2px 0;">No depletion logs</div>`;
    }
    depletionContent += `</div>`;
    let logsListContent = `<div class="og-nexus-logs-list">`;
    const last5 = expeditions.slice(0, 5);
    last5.forEach((exp) => {
      var _a, _b, _c, _d, _e;
      const isLifeform = exp.type === "lifeform" || exp.discoveryType !== void 0;
      let rewardHTML = "";
      let rowBorderColor = "rgba(255, 255, 255, 0.04)";
      if (isLifeform) {
        const discType = exp.discoveryType;
        let thematicColor = "#6b7280";
        if (exp.lifeform === 1) thematicColor = "#22c55e";
        else if (exp.lifeform === 2) thematicColor = "#991b1b";
        else if (exp.lifeform === 3) thematicColor = "#06b6d4";
        else if (exp.lifeform === 4) thematicColor = "#a855f7";
        else if (discType === "lifeform-xp") thematicColor = "#3b82f6";
        rowBorderColor = thematicColor;
        if (discType === "artifacts") {
          const arts = exp.artifactsFound || 0;
          rewardHTML = `
                    <span style="color: #EAB308;">+${formatCompactNumber(arts)} Artifacts</span>
                    <img class="og-nexus-details-icon" style="width: 14px; height: 14px;" src="${chrome.runtime.getURL("icons/lifeforms/artifact-icon-large.png")}">
                `;
        } else if (discType === "lifeform-xp") {
          const xp = exp.lifeformGainedExperience || 0;
          rewardHTML = `
                    <span style="color: #3b82f6;">+${formatCompactNumber(xp)} XP</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"></path></svg>
                `;
        } else if (discType === "ship-lost") {
          rewardHTML = `<span style="color: #ef4444; font-weight: 800;">Ship Lost</span>`;
        } else {
          rewardHTML = `<span style="color: #64748b;">Nothing</span>`;
        }
      } else {
        const type = (exp.result || "").toLowerCase();
        const size = exp.size ?? 2;
        const isBlackHole = type === "fleetloss" || type === "fleetlost";
        if (isBlackHole) {
          rowBorderColor = "#ef4444";
        } else if (type !== "nothing") {
          if (size === 0) rowBorderColor = "#ec4899";
          else if (size === 1) rowBorderColor = "#06b6d4";
          else rowBorderColor = "#6b7280";
        }
        if (type === "resources" || type === "ressources") {
          if ((_a = exp.resultDetails) == null ? void 0 : _a.metal) {
            rewardHTML = `
                        <span style="color: #E6953C;">+${formatCompactNumber(exp.resultDetails.metal)}</span>
                        <img class="og-nexus-details-icon" style="width: 14px; height: 14px;" src="${chrome.runtime.getURL("icons/resources/metal-icon-medium.jpg")}">
                    `;
          } else if ((_b = exp.resultDetails) == null ? void 0 : _b.crystal) {
            rewardHTML = `
                        <span style="color: #4CAEE6;">+${formatCompactNumber(exp.resultDetails.crystal)}</span>
                        <img class="og-nexus-details-icon" style="width: 14px; height: 14px;" src="${chrome.runtime.getURL("icons/resources/crystal-icon-medium.jpg")}">
                    `;
          } else if ((_c = exp.resultDetails) == null ? void 0 : _c.deuterium) {
            rewardHTML = `
                        <span style="color: #43D159;">+${formatCompactNumber(exp.resultDetails.deuterium)}</span>
                        <img class="og-nexus-details-icon" style="width: 14px; height: 14px;" src="${chrome.runtime.getURL("icons/resources/deuterium-icon-medium.jpg")}">
                    `;
          }
        } else if (type === "darkmatter" || type === "dark-matter") {
          const amount = ((_d = exp.resultDetails) == null ? void 0 : _d.darkMatter) || ((_e = exp.resultDetails) == null ? void 0 : _e.darkmatter) || 0;
          rewardHTML = `
                    <span style="color: #bd69ff;">+${formatCompactNumber(amount)}</span>
                    <img class="og-nexus-details-icon" style="width: 14px; height: 14px;" src="${chrome.runtime.getURL("icons/resources/dark-matter-icon-medium.jpg")}">
                `;
        } else if (type === "shipwrecks") {
          let totalShips = 0;
          let firstShipIcon = "icons/ships/small-cargo-large.jpg";
          if (exp.resultDetails) {
            Object.keys(exp.resultDetails).forEach((id) => {
              totalShips += exp.resultDetails[id].amount || 0;
              firstShipIcon = SHIP_ID_TO_ICON[id.toString()] || firstShipIcon;
            });
          }
          rewardHTML = `
                    <span style="color: #38bdf8;">+${totalShips} Ships</span>
                    <img class="og-nexus-details-icon" style="width: 14px; height: 14px;" src="${chrome.runtime.getURL(firstShipIcon)}">
                `;
        } else if (type === "item" || type === "items") {
          rewardHTML = `
                    <span style="color: #EAB308;">+1 Item</span>
                    <img class="og-nexus-details-icon" style="width: 14px; height: 14px;" src="${chrome.runtime.getURL("icons/lifeforms/artifact-icon-large.png")}">
                `;
        } else if (type === "trader") {
          rewardHTML = `<span style="color: #fb923c;">Trader</span>`;
        } else if (isBlackHole) {
          rewardHTML = `<span style="color: #ef4444; font-weight: 800;">Black Hole</span>`;
        } else if (type === "delay" || type === "navigation" || type === "speedup") {
          rewardHTML = `<span style="color: #06b6d4;">Delay/Speedup</span>`;
        } else {
          rewardHTML = `<span style="color: #64748b;">Nothing</span>`;
        }
      }
      const relativeTime = formatRelativeTime(exp.timestamp);
      logsListContent += `
            <div class="og-nexus-log-row" style="border-left: 3px solid ${rowBorderColor};">
                <div class="og-nexus-log-meta">
                    <span class="og-nexus-log-coords">${exp.coords || "[?:?:?]"}</span>
                    <span class="og-nexus-log-time">${relativeTime}</span>
                </div>
                <div class="og-nexus-log-reward">${rewardHTML}</div>
            </div>
        `;
    });
    logsListContent += `</div>`;
    let sessionBannerHTML = "";
    if (sessionRecentExpeditions && sessionRecentExpeditions.length > 0) {
      const count = sessionRecentExpeditions.length;
      sessionBannerHTML = `
            <div class="og-nexus-session-banner">
                ${count} new Expeditions/Discoveries tracked
            </div>
        `;
    }
    detailsPane.innerHTML = `
        ${sessionBannerHTML}
        <div class="og-nexus-details-grid">
            <div class="og-nexus-details-col">
                <h4 class="og-nexus-details-title" style="color: #facc15;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><polygon points="12,2 22,8.5 12,15 2,8.5"></polygon><polyline points="2,8.5 12,22 22,8.5"></polyline><line x1="12" y1="15" x2="12" y2="22"></line></svg>
                    Direct Bounty
                </h4>
                ${directBountyContent}
            </div>
            <div class="og-nexus-details-col">
                <h4 class="og-nexus-details-title" style="color: #38bdf8;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    Fleet Value
                </h4>
                ${fleetContent}
            </div>
        </div>
    `;
    window.dispatchEvent(new CustomEvent("ogame-nexus-trigger-tooltips"));
  }
  async function injectTodaySummaryCard(playerId, forceLoad = false, maxRarity = 0) {
    if (!isExtensionStillValid$2()) return;
    let existingWrapper = document.querySelector(".og-nexus-summary-wrapper");
    if (existingWrapper) {
      existingWrapper.style.display = "flex";
      if (!forceLoad) return;
    }
    chrome.runtime.sendMessage({
      type: "GET_TODAY_EXPEDITION_STATS",
      data: { playerId }
    }, (response) => {
      var _a;
      if (!isExtensionStillValid$2() || !(response == null ? void 0 : response.success)) return;
      const paginator = document.querySelector(".messagePaginator");
      if (!paginator) return;
      const allWrappers = document.querySelectorAll(".og-nexus-summary-wrapper");
      existingWrapper = null;
      allWrappers.forEach((el, idx) => {
        if (idx === 0 && el.nextElementSibling === paginator) {
          existingWrapper = el;
        } else {
          el.remove();
        }
      });
      if (existingWrapper) {
        const valDivs = existingWrapper.querySelectorAll(".og-nexus-value");
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
            const startVal = parseInt(div.getAttribute("data-value") || "0");
            const endVal = newValues[i];
            if (startVal !== endVal) {
              anyChanged = true;
              div.setAttribute("data-value", endVal.toString());
              animateValue(div, startVal, endVal, 1e3);
            }
          });
          if (anyChanged) {
            const mainIcon2 = existingWrapper.querySelector(".og-nexus-main-exp-icon");
            const pill = existingWrapper.querySelector(".og-nexus-expedition-summary-card");
            if (mainIcon2 && pill) {
              let shadowColor = "rgba(255, 255, 255, 0.6)";
              let scale = 1.35;
              let cardGlow = "0 8px 32px rgba(0, 0, 0, 0.7)";
              if (maxRarity === 2) {
                shadowColor = "rgba(236, 72, 153, 0.9)";
                scale = 1.6;
                cardGlow = "0 0 45px rgba(236, 72, 153, 0.5)";
                pill.classList.remove("og-nexus-flash-rare", "og-nexus-flash-epic");
                void pill.offsetWidth;
                pill.classList.add("og-nexus-flash-epic");
              } else if (maxRarity === 1) {
                shadowColor = "rgba(59, 130, 246, 0.8)";
                scale = 1.45;
                cardGlow = "0 0 35px rgba(59, 130, 246, 0.4)";
                pill.classList.remove("og-nexus-flash-rare", "og-nexus-flash-epic");
                void pill.offsetWidth;
                pill.classList.add("og-nexus-flash-rare");
              }
              mainIcon2.style.transform = `scale(${scale}) rotate(360deg)`;
              mainIcon2.style.filter = `drop-shadow(0 0 15px ${shadowColor})`;
              pill.style.boxShadow = cardGlow;
              if (maxRarity === 2) {
                pill.classList.add("og-nexus-epic-pulse");
              }
              setTimeout(() => {
                mainIcon2.style.transform = "scale(1) rotate(0deg)";
                mainIcon2.style.filter = "drop-shadow(0 0 5px rgba(255, 255, 255, 0.2))";
                pill.style.boxShadow = "0 4px 20px rgba(0,0,0,0.6)";
                pill.classList.remove("og-nexus-epic-pulse", "og-nexus-flash-rare", "og-nexus-flash-epic");
              }, 1300);
            }
          }
        }
        updateBadgeState(existingWrapper);
        updateCardClickability(existingWrapper);
        if (existingWrapper.classList.contains("og-nexus-expanded")) {
          updateDetailsPane(existingWrapper, playerId);
        }
        return;
      }
      const totals = response.totals;
      const wrapper = document.createElement("div");
      wrapper.className = "og-nexus-summary-wrapper";
      wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            margin: 12px 0;
            position: relative;
            z-index: 10;
        `;
      const pillRow = document.createElement("div");
      pillRow.className = "og-nexus-pill-row";
      pillRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            gap: 16px;
        `;
      wrapper.appendChild(pillRow);
      const card = document.createElement("div");
      card.className = "og-nexus-expedition-summary-card clickable";
      card.style.cssText = `
            display: flex;
            flex-direction: column;
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
            overflow: visible;
            box-sizing: border-box;
            width: auto;
        `;
      const mainIcon = document.createElement("img");
      mainIcon.className = "og-nexus-main-exp-icon";
      mainIcon.src = chrome.runtime.getURL("icons/misc/expedition-icon-medium.png");
      mainIcon.style.cssText = `
            width: 38px;
            height: 38px;
            filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.2));
            transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 2;
        `;
      pillRow.appendChild(mainIcon);
      const statsRow = document.createElement("div");
      statsRow.className = "og-nexus-stats-row";
      statsRow.style.cssText = `display: flex; align-items: center; gap: 24px; z-index: 1;`;
      const resConfigs = [
        { val: totals.metal || 0, color: "#E6953C", icon: "icons/resources/metal-icon-medium.jpg", label: "Metal" },
        { val: totals.crystal || 0, color: "#4CAEE6", icon: "icons/resources/crystal-icon-medium.jpg", label: "Crystal" },
        { val: totals.deuterium || 0, color: "#43D159", icon: "icons/resources/deuterium-icon-medium.jpg", label: "Deuterium" },
        { val: totals.darkMatter || 0, color: "#9061F9", icon: "icons/resources/dark-matter-icon-medium.jpg", label: "Dark Matter" },
        { val: totals.artifacts || 0, color: "#EAB308", icon: "icons/lifeforms/artifact-icon-large.png", label: "Artifacts" }
      ];
      resConfigs.forEach((res) => {
        const item = document.createElement("div");
        item.style.cssText = `display: flex; align-items: center; gap: 8px;`;
        const icon = document.createElement("img");
        icon.src = chrome.runtime.getURL(res.icon);
        icon.style.cssText = `width: 20px; height: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4);`;
        const value = document.createElement("div");
        value.className = "og-nexus-value";
        value.setAttribute("data-value", res.val.toString());
        value.textContent = formatCompactNumber(res.val);
        value.style.cssText = `font-size: 15px; font-weight: 700; color: ${res.color}; text-shadow: 0 2px 4px rgba(0,0,0,0.5); line-height: 1; letter-spacing: 0.3px; min-width: 45px; text-align: left;`;
        item.className = "nexus-tooltip";
        item.setAttribute("data-nexus-tooltip", `${res.val.toLocaleString()} ${res.label}`);
        item.appendChild(icon);
        item.appendChild(value);
        statsRow.appendChild(item);
      });
      card.appendChild(statsRow);
      pillRow.appendChild(card);
      (_a = paginator.parentNode) == null ? void 0 : _a.insertBefore(wrapper, paginator);
      updateBadgeState(wrapper);
      updateCardClickability(wrapper);
      card.addEventListener("click", async () => {
        const isExpanded = wrapper.classList.contains("og-nexus-expanded");
        if (!newBadgeActive && !isExpanded) {
          return;
        }
        if (newBadgeActive) {
          newBadgeActive = false;
          updateBadgeState(wrapper);
          updateCardClickability(wrapper);
        }
        wrapper.classList.toggle("og-nexus-expanded");
        updateCardClickability(wrapper);
        if (wrapper.classList.contains("og-nexus-expanded")) {
          await updateDetailsPane(wrapper, playerId);
        }
      });
      window.dispatchEvent(new CustomEvent("ogame-nexus-trigger-tooltips"));
    });
  }
  function animateValue(obj, start, end, duration) {
    if (start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
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
  async function trackExpeditions(playerId) {
    var _a;
    if (!isExtensionStillValid$2()) return;
    let removeOGLight = true;
    try {
      const localData = await chrome.storage.local.get("globalSettings");
      if (((_a = localData == null ? void 0 : localData.globalSettings) == null ? void 0 : _a.removeOGLightDuplicates) !== void 0) {
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
      if (response == null ? void 0 : response.success) {
        let maxRarity = 0;
        response.data.forEach((exp) => {
          const msgElement = document.querySelector(`.msg[data-msg-id="${exp.messageId}"]`);
          if (msgElement) {
            updateExpeditionVisuals(msgElement, exp, removeOGLight);
            if (exp.isNew) {
              setTimeout(() => {
                const wrapper = msgElement.querySelector(".og-nexus-resource-result") || msgElement.querySelector(".og-nexus-darkmatter-result") || msgElement.querySelector(".og-nexus-shipwreck-result") || msgElement.querySelector(".og-nexus-trader-result") || msgElement.querySelector(".og-nexus-item-result");
                if (wrapper) {
                  const icons = Array.from(wrapper.querySelectorAll('div[style*="background-image"], img')).map((el) => el.src || getComputedStyle(el).backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, "$1")).filter((src) => src && src !== "none" && !src.includes("rarity"));
                  if (icons.length > 0) {
                    flyToNexusButton(msgElement, [icons[0]]);
                  }
                }
              }, 100);
            }
          }
          const resType = (exp.result || "").toLowerCase();
          if (resType !== "nothing") {
            const size = exp.size ?? 2;
            let rarity = 0;
            if (size === 0) rarity = 2;
            else if (size === 1) rarity = 1;
            if (rarity > maxRarity) maxRarity = rarity;
          }
        });
        triggerSiteTooltips$2();
        if (response.newCount && response.newCount > 0) {
          const newItems = response.data.filter((exp) => exp.isNew).map((exp) => ({ ...exp, type: "expedition" }));
          if (newItems.length > 0) {
            sessionRecentExpeditions = [...sessionRecentExpeditions, ...newItems];
            newBadgeActive = true;
          }
          injectTodaySummaryCard(playerId, true, maxRarity);
        }
      }
    });
  }
  function formatExactNumber$2(num) {
    return new Intl.NumberFormat().format(num);
  }
  function formatNumber$2(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "G";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toString();
  }
  function formatCompactNumber(num) {
    if (num >= 1e6) {
      return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toString();
  }
  const SHIP_ID_TO_ICON = {};
  const SHIP_ID_TO_COST = {};
  SHIP_DATA.forEach((s) => {
    var _a;
    SHIP_ID_TO_ICON[s.id.toString()] = s.icon;
    SHIP_ID_TO_COST[s.id.toString()] = (_a = s.metadata) == null ? void 0 : _a.cost;
  });
  function cleanOGLightDOM$1(msgElement) {
    const duplicates = msgElement.querySelectorAll(".ogl_battle");
    duplicates.forEach((el) => {
      el.remove();
    });
  }
  function updateExpeditionVisuals(msgElement, exp, removeOGLight = true) {
    if (!isExtensionStillValid$2()) return;
    if (removeOGLight) {
      cleanOGLightDOM$1(msgElement);
    }
    if (msgElement.hasAttribute("data-og-nexus-visuals-applied")) return;
    const resType = (exp.result || "").toLowerCase();
    const size = exp.size ?? 2;
    const isBlackHole = resType === "fleetloss" || resType === "fleetlost";
    const content = msgElement.querySelector(".msgContent");
    const box = msgElement.querySelector(".content-box");
    const head = msgElement.querySelector(".msgHead");
    let rarityColor;
    let rarityBorderColor;
    let rarityTier = 0;
    if (resType !== "nothing") {
      if (isBlackHole) {
        rarityTier = 2;
      } else if (size === 0) {
        rarityTier = 2;
      } else if (size === 1) {
        rarityTier = 1;
      } else {
        rarityTier = 0;
      }
    }
    let rarityIconPath = "";
    if (rarityTier === 2) {
      rarityColor = "#ec4899";
      rarityBorderColor = "#ec4899";
      rarityIconPath = "icons/misc/rarity-epic-medium.png";
    } else if (rarityTier === 1) {
      rarityColor = "#06b6d4";
      rarityBorderColor = "#06b6d4";
      rarityIconPath = "icons/misc/rarity-rare-medium.png";
    } else {
      rarityColor = "#6b7280";
      rarityBorderColor = "#6b7280";
      rarityIconPath = "icons/misc/rarity-common-medium.png";
    }
    msgElement.classList.remove("og-nexus-common-card", "og-nexus-rare-card", "og-nexus-epic-card", "og-nexus-black-hole-main");
    msgElement.querySelectorAll(".nexus-corner").forEach((c) => c.remove());
    if (isBlackHole) {
      msgElement.classList.add("og-nexus-black-hole-main");
    } else if (rarityTier === 2) {
      msgElement.classList.add("og-nexus-epic-card");
    } else if (rarityTier === 1) {
      msgElement.classList.add("og-nexus-rare-card");
    } else {
      msgElement.classList.add("og-nexus-common-card");
    }
    msgElement.style.position = "relative";
    msgElement.style.overflow = "visible";
    msgElement.__rarityColor = rarityColor;
    msgElement.__rarityBorderColor = rarityBorderColor;
    msgElement.__rarityIconUrl = chrome.runtime.getURL(rarityIconPath);
    const footerActions = msgElement.querySelector("message-footer-actions");
    if (footerActions && !footerActions.querySelector(".og-nexus-tracked-btn")) {
      const trackedWrapper = document.createElement("gradient-button");
      trackedWrapper.setAttribute("sq28", "");
      const trackedBtn = document.createElement("button");
      trackedBtn.className = "custom_btn nexus-tooltip og-nexus-tracked-btn";
      const trackedTitle = "OGame Nexus: Message Tracked";
      trackedBtn.setAttribute("data-nexus-tooltip", trackedTitle);
      trackedBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" style="margin: 4px;">
                    <circle cx="10" cy="10" r="9" fill="none" stroke="#9ca3af" stroke-width="1.5" />
                    <path d="M6 10 L9 13 L14 7" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                `;
      trackedWrapper.appendChild(trackedBtn);
      footerActions.appendChild(trackedWrapper);
      triggerSiteTooltips$2();
    }
    if (resType === "ressources" || resType === "resources") {
      if (content) content.style.display = "none";
      if (box) box.style.display = "none";
      if (msgElement.querySelector(".og-nexus-resource-result")) return;
      const details = exp.resultDetails || {};
      let resourceName = "unknown";
      let resourceAmount = 0;
      let resourceColor = "#fff";
      let iconUrl = "";
      if (details.metal) {
        resourceName = "metal";
        resourceAmount = details.metal;
        resourceColor = "#E6953C";
        iconUrl = chrome.runtime.getURL("icons/resources/metal-icon-medium.jpg");
      } else if (details.crystal) {
        resourceName = "crystal";
        resourceAmount = details.crystal;
        resourceColor = "#4CAEE6";
        iconUrl = chrome.runtime.getURL("icons/resources/crystal-icon-medium.jpg");
      } else if (details.deuterium) {
        resourceName = "deuterium";
        resourceAmount = details.deuterium;
        resourceColor = "#43D159";
        iconUrl = chrome.runtime.getURL("icons/resources/deuterium-icon-medium.jpg");
      }
      const container = document.createElement("div");
      container.className = "og-nexus-resource-result";
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
      const layoutWrapper = document.createElement("div");
      layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;
      const pillRarityColor = msgElement.__rarityBorderColor || "#444";
      const pill = document.createElement("div");
      pill.className = "nexus-tooltip";
      if (rarityTier === 0) pill.classList.add("rarity-pill-common");
      if (rarityTier === 1) pill.classList.add("rarity-pill-rare-animate");
      if (rarityTier === 2) pill.classList.add("rarity-pill-epic-animate");
      const tooltipText = `Your expedition brings back ${formatExactNumber$2(resourceAmount)} ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}`;
      pill.setAttribute("data-nexus-tooltip", tooltipText);
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
      const icon = document.createElement("div");
      icon.style.cssText = `
            width: 24px;
            height: 24px;
            background-image: url('${iconUrl}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            `;
      const amount = document.createElement("div");
      amount.textContent = formatNumber$2(resourceAmount);
      if (rarityTier === 2) amount.classList.add("amount-glow");
      amount.style.cssText = `
            font-size: 13px;
            font-weight: bold;
            font-family: 'Verdana', sans-serif;
            color: ${resourceColor};
            `;
      const rarityIcon = document.createElement("img");
      rarityIcon.src = msgElement.__rarityIconUrl;
      rarityIcon.className = "og-nexus-rarity-icon";
      rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
      if (rarityTier === 1) rarityIcon.classList.add("rarity-sparkle-rare");
      if (rarityTier === 2) rarityIcon.classList.add("rarity-sparkle-epic");
      pill.appendChild(rarityIcon);
      pill.appendChild(icon);
      pill.appendChild(amount);
      layoutWrapper.appendChild(pill);
      container.appendChild(layoutWrapper);
      const depletion = exp.depletion ?? 1;
      let signalColor;
      let depletionLabel;
      switch (depletion) {
        case 1:
          signalColor = "#22c55e";
          depletionLabel = "Pristine";
          break;
        case 2:
          signalColor = "#eab308";
          depletionLabel = "Good";
          break;
        case 3:
          signalColor = "#f97316";
          depletionLabel = "Moderate";
          break;
        case 4:
          signalColor = "#ef4444";
          depletionLabel = "Low";
          break;
        case 5:
          signalColor = "#dc2626";
          depletionLabel = "Depleted";
          break;
        default:
          signalColor = "#22c55e";
          depletionLabel = "Unknown";
      }
      const depletionContainer = document.createElement("div");
      depletionContainer.className = "nexus-tooltip";
      const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
      depletionContainer.setAttribute("data-nexus-tooltip", dTooltip);
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
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
      const filledDots = 6 - depletion;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement("div");
        const isFilled = i < filledDots;
        dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : "rgba(255, 255, 255, 0.15)"};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ""}
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
      triggerSiteTooltips$2();
    } else if (resType === "darkmatter") {
      if (content) content.style.display = "none";
      if (box) box.style.display = "none";
      if (msgElement.querySelector(".og-nexus-darkmatter-result")) return;
      const details = exp.resultDetails || {};
      const dmAmount = details.darkMatter ?? details.darkmatter ?? 0;
      const iconUrl = chrome.runtime.getURL("icons/resources/dark-matter-icon-medium.jpg");
      const dmColor = "#bd69ff";
      const container = document.createElement("div");
      container.className = "og-nexus-darkmatter-result";
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
      const layoutWrapper = document.createElement("div");
      layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;
      const pillRarityColor = msgElement.__rarityBorderColor || "#444";
      const pill = document.createElement("div");
      pill.className = "nexus-tooltip";
      if (rarityTier === 0) pill.classList.add("rarity-pill-common");
      if (rarityTier === 1) pill.classList.add("rarity-pill-rare-animate");
      if (rarityTier === 2) pill.classList.add("rarity-pill-epic-animate");
      const tooltipText = `Your expedition brings back ${formatExactNumber$2(dmAmount)} Dark Matter`;
      pill.setAttribute("data-nexus-tooltip", tooltipText);
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
      const icon = document.createElement("div");
      icon.style.cssText = `
            width: 24px;
            height: 24px;
            background-image: url('${iconUrl}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            `;
      const amount = document.createElement("div");
      amount.textContent = formatNumber$2(dmAmount);
      if (rarityTier === 2) amount.classList.add("amount-glow");
      amount.style.cssText = `
            font-size: 13px;
            font-weight: bold;
            font-family: 'Verdana', sans-serif;
            color: ${dmColor};
            `;
      const rarityIcon = document.createElement("img");
      rarityIcon.src = msgElement.__rarityIconUrl;
      rarityIcon.className = "og-nexus-rarity-icon";
      rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
      if (rarityTier === 1) rarityIcon.classList.add("rarity-sparkle-rare");
      if (rarityTier === 2) rarityIcon.classList.add("rarity-sparkle-epic");
      pill.appendChild(rarityIcon);
      pill.appendChild(icon);
      pill.appendChild(amount);
      layoutWrapper.appendChild(pill);
      container.appendChild(layoutWrapper);
      const depletion = exp.depletion ?? 1;
      let signalColor;
      let depletionLabel;
      switch (depletion) {
        case 1:
          signalColor = "#22c55e";
          depletionLabel = "Pristine";
          break;
        case 2:
          signalColor = "#eab308";
          depletionLabel = "Good";
          break;
        case 3:
          signalColor = "#f97316";
          depletionLabel = "Moderate";
          break;
        case 4:
          signalColor = "#ef4444";
          depletionLabel = "Low";
          break;
        case 5:
          signalColor = "#dc2626";
          depletionLabel = "Depleted";
          break;
        default:
          signalColor = "#22c55e";
          depletionLabel = "Unknown";
      }
      const depletionContainer = document.createElement("div");
      depletionContainer.className = "nexus-tooltip";
      const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
      depletionContainer.setAttribute("data-nexus-tooltip", dTooltip);
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
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
      const filledDots = 6 - depletion;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement("div");
        const isFilled = i < filledDots;
        dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : "rgba(255, 255, 255, 0.15)"};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ""}
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
      triggerSiteTooltips$2();
    } else if (resType === "navigation" || resType === "delay" || resType === "speedup") {
      if (content) content.style.display = "none";
      if (box) box.style.display = "none";
      if (msgElement.querySelector(".og-nexus-navigation-result")) return;
      const details = exp.resultDetails || {};
      let isDelay = (details.returnTimeAbsoluteIncreaseHours || 0) > 0;
      if (resType === "delay") isDelay = true;
      if (resType === "speedup") isDelay = false;
      const navColor = isDelay ? "#f97316" : "#22c55e";
      const container = document.createElement("div");
      container.className = "og-nexus-navigation-result";
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
      const layoutWrapper = document.createElement("div");
      layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;
      const pillRarityColor = msgElement.__rarityBorderColor || "#444";
      const pill = document.createElement("div");
      pill.className = "nexus-tooltip";
      if (rarityTier === 0) pill.classList.add("rarity-pill-common");
      if (rarityTier === 1) pill.classList.add("rarity-pill-rare-animate");
      if (rarityTier === 2) pill.classList.add("rarity-pill-epic-animate");
      pill.setAttribute("data-nexus-tooltip", `Expedition return time was ${isDelay ? "delayed" : "shortened"}!`);
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
      const text = document.createElement("div");
      text.textContent = isDelay ? "DELAY" : "SPEEDUP";
      text.style.cssText = `
            font-size: 11px;
            font-weight: bold;
            font-family: 'Verdana', sans-serif;
            color: ${navColor};
            letter-spacing: 2px;
            text-shadow: 0 0 8px ${navColor}60;
            `;
      const rarityIcon = document.createElement("img");
      rarityIcon.src = msgElement.__rarityIconUrl;
      rarityIcon.className = "og-nexus-rarity-icon";
      rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
      if (rarityTier === 1) rarityIcon.classList.add("rarity-sparkle-rare");
      if (rarityTier === 2) rarityIcon.classList.add("rarity-sparkle-epic");
      pill.appendChild(rarityIcon);
      pill.appendChild(text);
      const depletion = exp.depletion ?? 1;
      let signalColor;
      let depletionLabel;
      switch (depletion) {
        case 1:
          signalColor = "#22c55e";
          depletionLabel = "Pristine";
          break;
        case 2:
          signalColor = "#eab308";
          depletionLabel = "Good";
          break;
        case 3:
          signalColor = "#f97316";
          depletionLabel = "Moderate";
          break;
        case 4:
          signalColor = "#ef4444";
          depletionLabel = "Low";
          break;
        case 5:
          signalColor = "#dc2626";
          depletionLabel = "Depleted";
          break;
        default:
          signalColor = "#22c55e";
          depletionLabel = "Unknown";
      }
      const depletionContainer = document.createElement("div");
      depletionContainer.className = "nexus-tooltip";
      const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
      depletionContainer.setAttribute("data-nexus-tooltip", dTooltip);
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
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
      const filledDots = 6 - depletion;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement("div");
        const isFilled = i < filledDots;
        dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : "rgba(255, 255, 255, 0.15)"};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ""}
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
      triggerSiteTooltips$2();
    } else if (resType === "combatpirates" || resType === "combataliens" || resType === "0") {
      if (content) content.style.display = "none";
      if (box) box.style.display = "none";
      if (msgElement.querySelector(".og-nexus-combat-result")) return;
      const isPirates = resType === "combatpirates";
      const labelText = resType === "0" ? "Hostiles" : isPirates ? "Pirates" : "Aliens";
      const hostileColor = "#ef4444";
      const container = document.createElement("div");
      container.className = "og-nexus-combat-result";
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
      const layoutWrapper = document.createElement("div");
      layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;
      const pillRarityColor = msgElement.__rarityBorderColor || "#444";
      const pill = document.createElement("div");
      pill.className = "nexus-tooltip";
      if (rarityTier === 0) pill.classList.add("rarity-pill-common");
      if (rarityTier === 1) pill.classList.add("rarity-pill-rare-animate");
      if (rarityTier === 2) pill.classList.add("rarity-pill-epic-animate");
      pill.setAttribute("data-nexus-tooltip", `Expedition encountered hostile ${labelText.toLowerCase()} forces!`);
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
      const text = document.createElement("div");
      text.textContent = labelText.toUpperCase().split("").join(" ");
      text.style.cssText = `
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 4px;
            color: ${hostileColor} !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            margin-left: 4px;
            `;
      const rarityIcon = document.createElement("img");
      rarityIcon.src = msgElement.__rarityIconUrl;
      rarityIcon.className = "og-nexus-rarity-icon";
      rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
      if (rarityTier === 1) rarityIcon.classList.add("rarity-sparkle-rare");
      if (rarityTier === 2) rarityIcon.classList.add("rarity-sparkle-epic");
      pill.appendChild(rarityIcon);
      pill.appendChild(text);
      layoutWrapper.appendChild(pill);
      container.appendChild(layoutWrapper);
      const depletion = exp.depletion ?? 1;
      let signalColor;
      let depletionLabel;
      switch (depletion) {
        case 1:
          signalColor = "#22c55e";
          depletionLabel = "Pristine";
          break;
        case 2:
          signalColor = "#eab308";
          depletionLabel = "Good";
          break;
        case 3:
          signalColor = "#f97316";
          depletionLabel = "Moderate";
          break;
        case 4:
          signalColor = "#ef4444";
          depletionLabel = "Low";
          break;
        case 5:
          signalColor = "#dc2626";
          depletionLabel = "Depleted";
          break;
        default:
          signalColor = "#22c55e";
          depletionLabel = "Unknown";
      }
      const depletionContainer = document.createElement("div");
      depletionContainer.className = "nexus-tooltip";
      const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
      depletionContainer.setAttribute("data-nexus-tooltip", dTooltip);
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
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
      const filledDots = 6 - depletion;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement("div");
        const isFilled = i < filledDots;
        dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : "rgba(255, 255, 255, 0.15)"};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ""}
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
      triggerSiteTooltips$2();
    } else if (resType === "shipwrecks") {
      if (content) content.style.display = "none";
      if (box) box.style.display = "none";
      if (msgElement.querySelector(".og-nexus-shipwreck-result")) return;
      const details = exp.resultDetails || {};
      let totalMetal = 0;
      let totalCrystal = 0;
      let totalDeuterium = 0;
      const container = document.createElement("div");
      container.className = "og-nexus-shipwreck-result";
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
      const rarityColor2 = msgElement.__rarityBorderColor || "#444";
      const resultPill = document.createElement("div");
      if (rarityTier === 0) resultPill.classList.add("rarity-pill-common");
      if (rarityTier === 1) resultPill.classList.add("rarity-pill-rare-animate");
      if (rarityTier === 2) resultPill.classList.add("rarity-pill-epic-animate");
      resultPill.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid ${rarityColor2};
            border-radius: 4px;
            padding: 6px 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px ${rarityColor2}30;
            position: relative;
            z-index: 1;
            margin: 4px 0;
        `;
      const rarityIcon = document.createElement("img");
      rarityIcon.src = msgElement.__rarityIconUrl;
      rarityIcon.className = "og-nexus-rarity-icon";
      rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
      if (rarityTier === 1) rarityIcon.classList.add("rarity-sparkle-rare");
      if (rarityTier === 2) rarityIcon.classList.add("rarity-sparkle-epic");
      resultPill.appendChild(rarityIcon);
      const contentStack = document.createElement("div");
      contentStack.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            flex: 1;
        `;
      const shipsRow = document.createElement("div");
      shipsRow.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            `;
      Object.entries(details).forEach(([shipId, data]) => {
        const iconPath = SHIP_ID_TO_ICON[shipId];
        if (!iconPath) return;
        const cost = SHIP_ID_TO_COST[shipId];
        if (cost) {
          totalMetal += (cost.metal || 0) * data.amount;
          totalCrystal += (cost.crystal || 0) * data.amount;
          totalDeuterium += (cost.deuterium || 0) * data.amount;
        }
        const shipItem = document.createElement("div");
        shipItem.className = "nexus-tooltip";
        const tooltipTitle = `${formatExactNumber$2(data.amount)} ${data.name}`;
        shipItem.setAttribute("data-nexus-tooltip", tooltipTitle);
        shipItem.style.cssText = `
            position: relative;
            width: 45px;
            height: 45px;
            cursor: default;
            `;
        const innerBox = document.createElement("div");
        innerBox.style.cssText = `
            position: absolute;
            inset: 0;
            background-image: url('${chrome.runtime.getURL(iconPath)}');
            background-size: cover;
            background-position: center;
            border-radius: 4px;
            border: 1px solid ${rarityColor2};
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
            overflow: hidden;
            `;
        const amountBadge = document.createElement("div");
        amountBadge.textContent = formatNumber$2(data.amount);
        if (rarityTier === 2) amountBadge.classList.add("amount-glow");
        amountBadge.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(10, 15, 20, 0.85);
            backdrop-filter: blur(2px);
            color: #fff;
            padding: 2px 0;
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
            `;
        innerBox.appendChild(amountBadge);
        shipItem.appendChild(innerBox);
        shipsRow.appendChild(shipItem);
      });
      contentStack.appendChild(shipsRow);
      const valueRow = document.createElement("div");
      valueRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.4);
            padding: 3px 14px;
            border-radius: 12px;
            border: 1px solid ${rarityColor2}20;
            `;
      const resData = [
        { amount: totalMetal, color: "#E6953C", icon: "icons/resources/metal-icon-medium.jpg" },
        { amount: totalCrystal, color: "#4CAEE6", icon: "icons/resources/crystal-icon-medium.jpg" },
        { amount: totalDeuterium, color: "#43D159", icon: "icons/resources/deuterium-icon-medium.jpg" }
      ];
      resData.forEach((res) => {
        if (res.amount > 0) {
          const item = document.createElement("div");
          item.style.cssText = `display: flex; align-items: center; gap: 6px;`;
          const resIcon = document.createElement("img");
          resIcon.src = chrome.runtime.getURL(res.icon);
          resIcon.style.cssText = `width: 16px; height: 16px;`;
          const resText = document.createElement("span");
          resText.textContent = formatNumber$2(res.amount);
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
      let signalColor;
      let depletionLabel;
      switch (depletion) {
        case 1:
          signalColor = "#22c55e";
          depletionLabel = "Pristine";
          break;
        case 2:
          signalColor = "#eab308";
          depletionLabel = "Good";
          break;
        case 3:
          signalColor = "#f97316";
          depletionLabel = "Moderate";
          break;
        case 4:
          signalColor = "#ef4444";
          depletionLabel = "Low";
          break;
        case 5:
          signalColor = "#dc2626";
          depletionLabel = "Depleted";
          break;
        default:
          signalColor = "#22c55e";
          depletionLabel = "Unknown";
      }
      const depletionContainer = document.createElement("div");
      depletionContainer.className = "nexus-tooltip";
      depletionContainer.setAttribute("data-nexus-tooltip", `Depletion level - Expedition slot is in ${depletionLabel} condition`);
      depletionContainer.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 3px 10px; background: rgba(0, 0, 0, 0.3); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); cursor: default;`;
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement("div");
        const isFilled = i < 6 - depletion;
        dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background-color: ${isFilled ? signalColor : "rgba(255, 255, 255, 0.15)"}; ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ""} transition: all 0.2s ease;`;
        dotsContainer.appendChild(dot);
      }
      depletionContainer.appendChild(dotsContainer);
      container.appendChild(depletionContainer);
      if (head && head.nextSibling) {
        msgElement.insertBefore(container, head.nextSibling);
      } else {
        msgElement.appendChild(container);
      }
      triggerSiteTooltips$2();
    } else if (resType === "trader") {
      if (content) content.style.display = "none";
      if (box) box.style.display = "none";
      if (msgElement.querySelector(".og-nexus-trader-result")) return;
      const container = document.createElement("div");
      container.className = "og-nexus-trader-result";
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
      const layoutWrapper = document.createElement("div");
      layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            `;
      const traderColor = "#eab308";
      const pillRarityColor = msgElement.__rarityBorderColor || "#444";
      const pill = document.createElement("div");
      pill.className = "nexus-tooltip";
      if (rarityTier === 0) pill.classList.add("rarity-pill-common");
      if (rarityTier === 1) pill.classList.add("rarity-pill-rare-animate");
      if (rarityTier === 2) pill.classList.add("rarity-pill-epic-animate");
      pill.setAttribute("data-nexus-tooltip", "Expedition encountered a merchant willing to trade!");
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
      const icon = document.createElement("img");
      icon.src = chrome.runtime.getURL("icons/misc/trader-icon-medium.png");
      icon.style.cssText = `width: 20px; height: 20px;`;
      const text = document.createElement("div");
      text.textContent = "TRADER ENCOUNTER";
      text.style.cssText = `
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 2px;
            color: ${traderColor};
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            `;
      pill.appendChild(icon);
      pill.appendChild(text);
      layoutWrapper.appendChild(pill);
      container.appendChild(layoutWrapper);
      const ratesRow = document.createElement("div");
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
        { label: "Metal", val: details.metal || details[1], color: "#E6953C", icon: "icons/resources/metal-icon-medium.jpg" },
        { label: "Crystal", val: details.crystal || details[2], color: "#4CAEE6", icon: "icons/resources/crystal-icon-medium.jpg" },
        { label: "Deut", val: details.deuterium || details[3], color: "#43D159", icon: "icons/resources/deuterium-icon-medium.jpg" }
      ];
      rates.forEach((r) => {
        if (r.val !== void 0) {
          const item = document.createElement("div");
          item.style.cssText = `display: flex; align-items: center; gap: 6px;`;
          const icon2 = document.createElement("img");
          icon2.src = chrome.runtime.getURL(r.icon);
          icon2.style.cssText = `width: 14px; height: 14px; border-radius: 2px;`;
          const text2 = document.createElement("span");
          text2.textContent = formatNumber$2(r.val);
          text2.style.cssText = `
            font-size: 11px;
            font-weight: 700;
            color: ${r.color};
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            `;
          item.appendChild(icon2);
          item.appendChild(text2);
          ratesRow.appendChild(item);
        }
      });
      if (ratesRow.children.length > 0) {
        container.appendChild(ratesRow);
      }
      const depletion = exp.depletion ?? 1;
      let signalColor;
      let depletionLabel;
      switch (depletion) {
        case 1:
          signalColor = "#22c55e";
          depletionLabel = "Pristine";
          break;
        case 2:
          signalColor = "#eab308";
          depletionLabel = "Good";
          break;
        case 3:
          signalColor = "#f97316";
          depletionLabel = "Moderate";
          break;
        case 4:
          signalColor = "#ef4444";
          depletionLabel = "Low";
          break;
        case 5:
          signalColor = "#dc2626";
          depletionLabel = "Depleted";
          break;
        default:
          signalColor = "#22c55e";
          depletionLabel = "Unknown";
      }
      const depletionContainer = document.createElement("div");
      depletionContainer.className = "nexus-tooltip";
      const dTooltip = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
      depletionContainer.setAttribute("data-nexus-tooltip", dTooltip);
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
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
      const filledDots = 6 - depletion;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement("div");
        const isFilled = i < filledDots;
        dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : "rgba(255, 255, 255, 0.15)"};
                ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ""}
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
    } else if (resType === "item" || resType === "items") {
      if (content) content.style.display = "none";
      if (box) box.style.display = "none";
      if (msgElement.querySelector(".og-nexus-item-result")) return;
      let details = exp.resultDetails;
      if (!details) details = [];
      if (!Array.isArray(details)) {
        if (typeof details === "object" && Object.keys(details).length > 0) {
          details = Object.values(details);
        } else {
          details = [];
        }
      }
      const container = document.createElement("div");
      container.className = "og-nexus-item-result";
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
      const itemsRow = document.createElement("div");
      itemsRow.style.cssText = `display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;`;
      if (details.length > 0) {
        details.forEach((data) => {
          const itemBox = document.createElement("div");
          itemBox.className = "nexus-tooltip";
          const label = data.name || "Unknown Item";
          itemBox.setAttribute("data-nexus-tooltip", `${data.amount > 1 ? data.amount + "x " : ""}${label}`);
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
            const bg = document.createElement("div");
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
            const fallbackIcon = document.createElement("img");
            fallbackIcon.src = chrome.runtime.getURL("icons/misc/expedition-icon-medium.png");
            fallbackIcon.style.cssText = `width: 32px; height: 32px; z-index: 1; opacity: 0.8; pointer-events: none;`;
            itemBox.appendChild(fallbackIcon);
          }
          if (data.amount > 1) {
            const badge = document.createElement("div");
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
        const itemBox = document.createElement("div");
        itemBox.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                background-color: rgba(10, 15, 20, 0.85);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px;
                padding: 6px 14px;
            `;
        const text = document.createElement("div");
        text.style.cssText = `font-size: 11px; font-weight: 700; color: #fff; letter-spacing: 2px;`;
        text.textContent = "VALUABLE ITEM DISCOVERED";
        itemBox.appendChild(text);
        itemsRow.appendChild(itemBox);
      }
      container.appendChild(itemsRow);
      const depletion = exp.depletion ?? 1;
      let signalColor;
      let depletionLabel;
      switch (depletion) {
        case 1:
          signalColor = "#22c55e";
          depletionLabel = "Pristine";
          break;
        case 2:
          signalColor = "#eab308";
          depletionLabel = "Good";
          break;
        case 3:
          signalColor = "#f97316";
          depletionLabel = "Moderate";
          break;
        case 4:
          signalColor = "#ef4444";
          depletionLabel = "Low";
          break;
        case 5:
          signalColor = "#dc2626";
          depletionLabel = "Depleted";
          break;
        default:
          signalColor = "#22c55e";
          depletionLabel = "Unknown";
      }
      const depletionContainer = document.createElement("div");
      depletionContainer.className = "nexus-tooltip";
      depletionContainer.setAttribute("data-nexus-tooltip", `Depletion level - Expedition slot is in ${depletionLabel} condition`);
      depletionContainer.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 3px 10px; background: rgba(0, 0, 0, 0.3); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); cursor: default;`;
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement("div");
        const isFilled = i < 6 - depletion;
        dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background-color: ${isFilled ? signalColor : "rgba(255, 255, 255, 0.15)"}; ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ""} transition: all 0.2s ease;`;
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
      if (content) content.style.display = "none";
      if (box) box.style.display = "none";
      const existing = msgElement.querySelector(".og-nexus-black-hole-card");
      let details = exp.resultDetails || {};
      let shipsLost = details.shipsLost || {};
      if (Object.keys(shipsLost).length === 0) {
        const rawMsg = msgElement.querySelector(".rawMessageData");
        if (rawMsg) {
          const rawShips = rawMsg.getAttribute("data-raw-shipslost") || rawMsg.getAttribute("data-raw-fleet");
          if (rawShips) {
            try {
              shipsLost = JSON.parse(rawShips);
            } catch (e) {
            }
          }
        }
      }
      if (existing) {
        if (Object.keys(shipsLost).length > 0) {
          existing.remove();
        } else {
          return;
        }
      }
      let totalMetal = 0;
      let totalCrystal = 0;
      let totalDeuterium = 0;
      const container = document.createElement("div");
      container.className = "og-nexus-nothing-result og-nexus-black-hole-card";
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
      const pill = document.createElement("div");
      pill.className = "nexus-tooltip og-nexus-black-hole-pill";
      if (rarityTier === 0) pill.classList.add("rarity-pill-common");
      if (rarityTier === 1) pill.classList.add("rarity-pill-rare-animate");
      if (rarityTier === 2) pill.classList.add("rarity-pill-epic-animate");
      pill.setAttribute("data-nexus-tooltip", "TOTAL EXPEDITION FLEET LOSS");
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
      const topRow = document.createElement("div");
      topRow.style.cssText = `display: flex; align-items: center; gap: 0; justify-content: center; width: 100%;`;
      const text = document.createElement("div");
      text.textContent = "BLACK HOLE";
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
      const shipsRow = document.createElement("div");
      shipsRow.style.cssText = `display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 2px;`;
      Object.entries(shipsLost).forEach(([shipId, amount]) => {
        const iconPath = SHIP_ID_TO_ICON[shipId];
        if (!iconPath) return;
        const cost = SHIP_ID_TO_COST[shipId];
        if (cost) {
          totalMetal += (cost.metal || 0) * amount;
          totalCrystal += (cost.crystal || 0) * amount;
          totalDeuterium += (cost.deuterium || 0) * amount;
        }
        const shipItem = document.createElement("div");
        shipItem.style.cssText = `position: relative; width: 36px; height: 36px; border: 1px solid rgba(255, 68, 68, 0.3); border-radius: 3px; overflow: hidden;`;
        const img = document.createElement("img");
        img.src = chrome.runtime.getURL(iconPath);
        img.style.cssText = `width: 100%; height: 100%; object-fit: cover; opacity: 0.8; filter: grayscale(0.5) sepia(0.5) hue-rotate(-50deg);`;
        shipItem.appendChild(img);
        const qty = document.createElement("div");
        qty.textContent = formatCompactNumber(amount);
        qty.style.cssText = `position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: #ffbcbc; font-size: 9px; font-weight: 800; text-align: center;`;
        shipItem.appendChild(qty);
        shipsRow.appendChild(shipItem);
      });
      if (shipsRow.children.length > 0) {
        pill.appendChild(shipsRow);
      }
      if (totalMetal + totalCrystal + totalDeuterium > 0) {
        const lossSummary = document.createElement("div");
        lossSummary.style.cssText = `display: flex; gap: 12px; margin-top: 2px; padding: 2px 12px; background: rgba(255,0,0,0.1); border-radius: 12px; border: 1px solid rgba(255,0,0,0.2);`;
        [
          { amount: totalMetal, color: "#E6953C", icon: "icons/resources/metal-icon-medium.jpg" },
          { amount: totalCrystal, color: "#4CAEE6", icon: "icons/resources/crystal-icon-medium.jpg" },
          { amount: totalDeuterium, color: "#43D159", icon: "icons/resources/deuterium-icon-medium.jpg" }
        ].forEach((res) => {
          if (res.amount > 0) {
            const item = document.createElement("div");
            item.style.cssText = `display: flex; align-items: center; gap: 4px;`;
            const icon = document.createElement("img");
            icon.src = chrome.runtime.getURL(res.icon);
            icon.style.cssText = `width: 12px; height: 12px;`;
            const val = document.createElement("span");
            val.textContent = "-" + formatNumber$2(res.amount);
            val.style.cssText = `font-size: 11px; font-weight: 700; color: ${res.color};`;
            item.appendChild(icon);
            item.appendChild(val);
            lossSummary.appendChild(item);
          }
        });
        pill.appendChild(lossSummary);
      }
      const depletion = exp.depletion ?? 1;
      let signalColor;
      let depletionLabel;
      switch (depletion) {
        case 1:
          signalColor = "#22c55e";
          depletionLabel = "Pristine";
          break;
        case 2:
          signalColor = "#eab308";
          depletionLabel = "Good";
          break;
        case 3:
          signalColor = "#f97316";
          depletionLabel = "Moderate";
          break;
        case 4:
          signalColor = "#ef4444";
          depletionLabel = "Low";
          break;
        case 5:
          signalColor = "#dc2626";
          depletionLabel = "Depleted";
          break;
        default:
          signalColor = "#22c55e";
          depletionLabel = "Unknown";
      }
      const depletionContainer = document.createElement("div");
      depletionContainer.className = "nexus-tooltip";
      depletionContainer.setAttribute("data-nexus-tooltip", `Depletion level - Expedition slot is in ${depletionLabel} condition`);
      depletionContainer.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 3px 10px; background: rgba(0, 0, 0, 0.3); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); cursor: default;`;
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement("div");
        const isFilled = i < 6 - depletion;
        dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background-color: ${isFilled ? signalColor : "rgba(255, 255, 255, 0.15)"}; ${isFilled ? `box-shadow: 0 0 4px ${signalColor};` : ""} transition: all 0.2s ease;`;
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
    } else if (resType === "nothing") {
      if (content) content.style.display = "none";
      if (box) box.style.display = "none";
      if (msgElement.querySelector(".og-nexus-nothing-result")) return;
      const container = document.createElement("div");
      container.className = "og-nexus-nothing-result";
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
      const pill = document.createElement("div");
      pill.className = "nexus-tooltip";
      if (rarityTier === 0) pill.classList.add("rarity-pill-common");
      if (rarityTier === 1) pill.classList.add("rarity-pill-rare-animate");
      if (rarityTier === 2) pill.classList.add("rarity-pill-epic-animate");
      pill.setAttribute("data-nexus-tooltip", "Expedition returned with no significant findings");
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
      const text = document.createElement("div");
      text.textContent = "X NOTHING";
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
      let signalColor;
      let depletionLabel;
      switch (depletion) {
        case 1:
          signalColor = "#22c55e";
          depletionLabel = "Pristine";
          break;
        case 2:
          signalColor = "#eab308";
          depletionLabel = "Good";
          break;
        case 3:
          signalColor = "#f97316";
          depletionLabel = "Moderate";
          break;
        case 4:
          signalColor = "#ef4444";
          depletionLabel = "Low";
          break;
        case 5:
          signalColor = "#dc2626";
          depletionLabel = "Depleted";
          break;
        default:
          signalColor = "#22c55e";
          depletionLabel = "Unknown";
      }
      const depletionContainer = document.createElement("div");
      depletionContainer.className = "nexus-tooltip";
      const dTitle = `Depletion level - Expedition slot is in ${depletionLabel} condition`;
      depletionContainer.setAttribute("data-nexus-tooltip", dTitle);
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
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = `display: flex; align-items: center; gap: 3px;`;
      const filledDots = 6 - depletion;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement("div");
        const isFilled = i < filledDots;
        dot.style.cssText = `
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${isFilled ? signalColor : "rgba(255, 255, 255, 0.08)"};
                ${isFilled ? `box-shadow: 0 0 3px ${signalColor}80;` : ""}
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
    msgElement.setAttribute("data-og-nexus-visuals-applied", "true");
  }
  function triggerSiteTooltips$2() {
    window.dispatchEvent(new CustomEvent("ogame-nexus-trigger-tooltips"));
  }
  function isExtensionStillValid$1() {
    return !!(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id);
  }
  function scrapeLifeformMessages() {
    var _a;
    const messages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="61"]:not([data-og-nexus-processed="true"])');
    const results = [];
    for (const msg of messages) {
      const messageId = (_a = msg.closest(".msg")) == null ? void 0 : _a.getAttribute("data-msg-id");
      if (!messageId) continue;
      const timestamp = msg.getAttribute("data-raw-timestamp");
      const coords = msg.getAttribute("data-raw-coords");
      const lifeform = msg.getAttribute("data-raw-lifeform");
      const discoveryType = msg.getAttribute("data-raw-discoverytype");
      const xp = msg.getAttribute("data-raw-lifeformgainedexperience");
      const artifacts = msg.getAttribute("data-raw-artifactsfound");
      const artifactSize = msg.getAttribute("data-raw-artifactssize");
      if (timestamp && coords) {
        results.push({
          messageId,
          timestamp: parseInt(timestamp),
          coords,
          lifeform: lifeform ? parseInt(lifeform) : void 0,
          discoveryType: discoveryType || "nothing",
          lifeformGainedExperience: xp ? parseInt(xp) : void 0,
          artifactsFound: artifacts ? parseInt(artifacts) : void 0,
          artifactSize: artifactSize || void 0
        });
        msg.setAttribute("data-og-nexus-processed", "true");
      }
    }
    return results;
  }
  async function trackLifeformDiscoveries(playerId) {
    var _a;
    if (!isExtensionStillValid$1()) return;
    let removeOGLight = true;
    try {
      const localData = await chrome.storage.local.get("globalSettings");
      if (((_a = localData == null ? void 0 : localData.globalSettings) == null ? void 0 : _a.removeOGLightDuplicates) !== void 0) {
        removeOGLight = localData.globalSettings.removeOGLightDuplicates;
      }
    } catch (e) {
      console.error("OGame Nexus: Failed to load OGLight duplicate settings", e);
    }
    const discoveryData = scrapeLifeformMessages();
    injectTodaySummaryCard(playerId, false);
    if (discoveryData.length === 0) return;
    chrome.runtime.sendMessage({
      type: "TRACK_LIFEFORMS",
      data: { discoveries: discoveryData, playerId }
    }, (response) => {
      if (response == null ? void 0 : response.success) {
        let maxRarity = 0;
        response.data.forEach((disc) => {
          const msgElement = document.querySelector(`.msg[data-msg-id="${disc.messageId}"]`);
          if (msgElement) {
            msgElement.classList.add("og-nexus-tracked");
            updateLifeformDiscoveryVisuals(msgElement, disc, removeOGLight);
            if (disc.isNew && disc.discoveryType !== "nothing" && disc.discoveryType !== "ship-lost") {
              setTimeout(() => {
                let iconPath = "";
                if (disc.discoveryType === "artifacts") {
                  iconPath = chrome.runtime.getURL("icons/lifeforms/artifact-icon-large.png");
                } else if (disc.discoveryType === "lifeform-xp") {
                  const lfNames = ["humans", "rocktal", "mechas", "kaelesh"];
                  const lfName = lfNames[(disc.lifeform || 1) - 1] || "humans";
                  iconPath = chrome.runtime.getURL(`icons/lifeforms/${lfName}-icon-large.jpg`);
                }
                if (iconPath) {
                  flyToNexusButton(msgElement, [iconPath]);
                }
              }, 100);
            }
          }
          if (disc.discoveryType === "artifacts" && disc.artifactSize) {
            const size = disc.artifactSize.toLowerCase();
            let rarity = 0;
            if (size === "huge") rarity = 2;
            else if (size === "big") rarity = 1;
            if (rarity > maxRarity) maxRarity = rarity;
          }
        });
        if (response.newCount && response.newCount > 0) {
          const newItems = response.data.filter((disc) => disc.isNew).map((disc) => ({ ...disc, type: "lifeform" }));
          if (newItems.length > 0) {
            addSessionTrackedItems(newItems);
            setNewBadgeActive(true);
          }
          injectTodaySummaryCard(playerId, true, maxRarity);
        }
        triggerSiteTooltips$1();
      }
    });
  }
  function cleanOGLightDOM(msgElement) {
    const duplicates = msgElement.querySelectorAll(".ogl_battle");
    duplicates.forEach((el) => {
      el.remove();
    });
  }
  function updateLifeformDiscoveryVisuals(msgElement, discovery, removeOGLight = true) {
    var _a, _b;
    if (!isExtensionStillValid$1()) return;
    if (removeOGLight) {
      cleanOGLightDOM(msgElement);
    }
    if (msgElement.hasAttribute("data-og-nexus-visuals-applied")) return;
    msgElement.setAttribute("data-og-nexus-visuals-applied", "true");
    const discType = discovery.discoveryType;
    let thematicColor = "#6b7280";
    let discLabel = "Lifeform";
    let iconSvg = "";
    if (discType === "lifeform-xp") {
      discLabel = "EXPERIENCE";
      iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="THEME_COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"></path></svg>`;
    } else if (discType === "artifacts") {
      thematicColor = "#eab308";
      discLabel = "ARTIFACTS";
      iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="THEME_COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`;
    } else if (discType === "nothing" || discType === "ship-lost") {
      thematicColor = discType === "ship-lost" ? "#ef4444" : "#6b7280";
      discLabel = "X NOTHING";
      iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="THEME_COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
    }
    if (discovery.lifeform === 1) thematicColor = "#22c55e";
    else if (discovery.lifeform === 2) thematicColor = "#991b1b";
    else if (discovery.lifeform === 3) thematicColor = "#06b6d4";
    else if (discovery.lifeform === 4) thematicColor = "#a855f7";
    else if (discType === "lifeform-xp") thematicColor = "#3b82f6";
    let rarityTier = -1;
    let rarityLabelText = "";
    let rarityColor = "";
    let rarityBorderColor = "";
    let rarityIconPath = "";
    if (discType === "artifacts" && discovery.artifactSize) {
      const size = discovery.artifactSize.toLowerCase();
      if (size === "full") {
        rarityTier = 0;
        rarityLabelText = "Storage Full";
        rarityColor = "#9ca3af";
        rarityBorderColor = "#9ca3af";
        rarityIconPath = "icons/misc/rarity-common-medium.png";
      } else if (size === "normal") {
        rarityTier = 0;
        rarityLabelText = "Common";
      } else if (size === "big") {
        rarityTier = 1;
        rarityLabelText = "Rare";
      } else {
        rarityTier = 2;
        rarityLabelText = "Epic";
      }
      if (rarityTier === 2) {
        rarityColor = "#ec4899";
        rarityBorderColor = "#ec4899";
        rarityIconPath = "icons/misc/rarity-epic-medium.png";
      } else if (rarityTier === 1) {
        rarityColor = "#06b6d4";
        rarityBorderColor = "#06b6d4";
        rarityIconPath = "icons/misc/rarity-rare-medium.png";
      } else if (rarityTier === 0) {
        rarityColor = "#6b7280";
        rarityBorderColor = "#6b7280";
        rarityIconPath = "icons/misc/rarity-common-medium.png";
      }
    }
    iconSvg = iconSvg.replace("THEME_COLOR", thematicColor);
    let pillLfIconUrl = "";
    if (discType === "lifeform-xp") {
      if (discovery.lifeform) {
        const lfId = discovery.lifeform;
        let lfName = "";
        if (lfId === 1) lfName = "humans";
        else if (lfId === 2) lfName = "rocktal";
        else if (lfId === 3) lfName = "mechas";
        else if (lfId === 4) lfName = "kaelesh";
        if (lfName) {
          pillLfIconUrl = chrome.runtime.getURL(`icons/lifeforms/${lfName}-icon-large.jpg`);
        }
      }
    } else if (discType === "artifacts") {
      pillLfIconUrl = chrome.runtime.getURL("icons/lifeforms/artifact-icon-large.png");
    }
    const content = msgElement.querySelector(".msgContent");
    if (content && !msgElement.querySelector(".og-nexus-discovery-result")) {
      content.style.display = "none";
      const container = document.createElement("div");
      container.className = "og-nexus-discovery-result";
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
      const layoutWrapper = document.createElement("div");
      layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        `;
      const pill = document.createElement("div");
      const pillBorderColor = discType === "artifacts" ? rarityBorderColor || "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.08)";
      if (discType === "artifacts") {
        pill.className = "nexus-tooltip";
        if (((_a = discovery.artifactSize) == null ? void 0 : _a.toLowerCase()) === "full") {
          pill.setAttribute("data-nexus-tooltip", "Artifact storage limit reached: no artifacts could be recovered!");
        } else {
          const arts = discovery.artifactsFound || 0;
          pill.setAttribute("data-nexus-tooltip", `${rarityLabelText} Artifact Shipment (+${arts.toLocaleString()} Artifacts)`);
        }
      } else if (discType === "lifeform-xp") {
        pill.className = "nexus-tooltip";
        const xp = discovery.lifeformGainedExperience || 0;
        pill.setAttribute("data-nexus-tooltip", `Lifeform Research Progress (+${xp.toLocaleString()} XP)`);
      }
      if (rarityTier === 0) pill.classList.add("rarity-pill-common");
      if (rarityTier === 1) pill.classList.add("rarity-pill-rare-animate");
      if (rarityTier === 2) pill.classList.add("rarity-pill-epic-animate");
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
        const rarityIcon = document.createElement("img");
        rarityIcon.src = chrome.runtime.getURL(rarityIconPath);
        rarityIcon.className = "og-nexus-rarity-icon";
        rarityIcon.style.cssText = `width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;`;
        if (rarityTier === 1) rarityIcon.classList.add("rarity-sparkle-rare");
        if (rarityTier === 2) rarityIcon.classList.add("rarity-sparkle-epic");
        pill.appendChild(rarityIcon);
      }
      if (pillLfIconUrl) {
        const lfIcon = document.createElement("img");
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
      const text = document.createElement("div");
      let displayedText = discType === "nothing" || discType === "ship-lost" ? "X NOTHING" : discLabel.toUpperCase().split("").join(" ");
      if (discType === "artifacts" && ((_b = discovery.artifactSize) == null ? void 0 : _b.toLowerCase()) === "full") {
        displayedText = "Artifacts storage full";
      } else if (discType === "lifeform-xp" && discovery.lifeformGainedExperience) {
        const xp = discovery.lifeformGainedExperience;
        displayedText = `+${xp} XP`;
      } else if (discType === "artifacts" && discovery.artifactsFound) {
        const arts = discovery.artifactsFound;
        displayedText = `+${arts}`;
      }
      if (rarityTier === 2) text.classList.add("amount-glow");
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
      const head = msgElement.querySelector(".msgHead");
      if (head && head.nextSibling) {
        msgElement.insertBefore(container, head.nextSibling);
      } else {
        msgElement.appendChild(container);
      }
    }
    msgElement.classList.remove("og-nexus-common-card", "og-nexus-rare-card", "og-nexus-epic-card");
    msgElement.querySelectorAll(".nexus-corner").forEach((c) => c.remove());
    if (rarityTier === 2) {
      msgElement.classList.add("og-nexus-epic-card");
    } else if (rarityTier === 1) {
      msgElement.classList.add("og-nexus-rare-card");
    } else {
      msgElement.classList.add("og-nexus-common-card");
      msgElement.style.setProperty("border-left", `3px solid ${thematicColor}`, "important");
    }
    const footerActions = msgElement.querySelector("message-footer-actions");
    if (footerActions && !footerActions.querySelector(".og-nexus-tracked-btn")) {
      const trackedWrapper = document.createElement("gradient-button");
      trackedWrapper.setAttribute("sq28", "");
      const trackedBtn = document.createElement("button");
      trackedBtn.className = "custom_btn nexus-tooltip og-nexus-tracked-btn";
      trackedBtn.setAttribute("data-nexus-tooltip", "OGame Nexus: Discovery Tracked");
      trackedBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" style="margin: 4px;">
                <circle cx="10" cy="10" r="9" fill="none" stroke="#9ca3af" stroke-width="1.5"/>
                <path d="M6 10 L9 13 L14 7" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
      trackedWrapper.appendChild(trackedBtn);
      footerActions.appendChild(trackedWrapper);
    }
    triggerSiteTooltips$1();
  }
  function triggerSiteTooltips$1() {
    window.dispatchEvent(new CustomEvent("ogame-nexus-trigger-tooltips"));
  }
  const LIFEFORM_TECH_DATA = [
    {
      "id": 1,
      "lifeformId": 1,
      "gkId": 11201,
      "name": "Intergalactic Envoys",
      "description": "Intergalactic Envoys are capable of detecting extra-terrestrial civilisations. They also reduced the duration of exploration flights to detect other lifeforms in the Galaxy view with each level. However, exploration is not without danger, and ships are occasionally lost in the endeavour.",
      "shortDesc": "Lifeform Scanning / Speed",
      "metalBaseCost": 5e3,
      "crystalBaseCost": 2500,
      "deutBaseCost": 500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.2,
      "durationBase": 1e3,
      "target": [
        {
          "bonusBreakdownId": 4
        }
      ]
    },
    {
      "id": 2,
      "lifeformId": 2,
      "gkId": 12201,
      "name": "Volcanic Batteries",
      "description": "Volcanic Batteries increase the production of energy on all planets with each level.",
      "shortDesc": "Energy Prod",
      "metalBaseCost": 1e4,
      "crystalBaseCost": 6e3,
      "deutBaseCost": 1e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.25,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 1e3,
      "target": [
        {
          "bonusBreakdownId": 5
        }
      ]
    },
    {
      "id": 3,
      "lifeformId": 3,
      "gkId": 13201,
      "name": "Catalyser Technology",
      "description": "Researching Catalyser Technology increases the production of deuterium on all planets with each level.",
      "shortDesc": "Deut Prod",
      "metalBaseCost": 1e4,
      "crystalBaseCost": 6e3,
      "deutBaseCost": 1e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 1e3,
      "target": [
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 4,
      "lifeformId": 4,
      "gkId": 14201,
      "name": "Heat Recovery",
      "description": "Researching Heat Recovery decreases the fuel consumption of all ships with each level.",
      "shortDesc": "Fuel Cost Reduction (30% Cap)",
      "metalBaseCost": 1e4,
      "crystalBaseCost": 6e3,
      "deutBaseCost": 1e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.03,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "30%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e3,
      "target": [
        {
          "bonusBreakdownId": 6
        }
      ]
    },
    {
      "id": 5,
      "lifeformId": 1,
      "gkId": 11202,
      "name": "High-Performance Extractors",
      "description": "High-Performance Extractors increase the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 7e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2e3,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 6,
      "lifeformId": 2,
      "gkId": 12202,
      "name": "Acoustic Scanning",
      "description": "Researching Acoustic Scanning increases the crystal production on all planets with each level.",
      "shortDesc": "Crystal Prod",
      "metalBaseCost": 7500,
      "crystalBaseCost": 12500,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2e3,
      "target": [
        {
          "bonusBreakdownId": 2
        }
      ]
    },
    {
      "id": 7,
      "lifeformId": 3,
      "gkId": 13202,
      "name": "Plasma Drive",
      "description": "Researching the Plasma Drive increases the speed of all ships (excluding Deathstars) with each level.",
      "shortDesc": "All Ship Speed",
      "metalBaseCost": 7500,
      "crystalBaseCost": 12500,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2e3,
      "target": [
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 202
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 208
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 210
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 214
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 218
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 219
        }
      ]
    },
    {
      "id": 8,
      "lifeformId": 4,
      "gkId": 14202,
      "name": "Sulphide Process",
      "description": "Researching the Sulphide Process increases the production of deuterium on all planets with each level.",
      "shortDesc": "Deut Prod",
      "metalBaseCost": 7500,
      "crystalBaseCost": 12500,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2e3,
      "target": [
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 9,
      "lifeformId": 1,
      "gkId": 11203,
      "name": "Fusion Drives",
      "description": "This advancement in drive technology makes civilian ships faster.  Each level increases the speed.",
      "shortDesc": "Civ Ship Speed",
      "metalBaseCost": 15e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.5,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2500,
      "target": [
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 202
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 208
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 210
        }
      ]
    },
    {
      "id": 10,
      "lifeformId": 2,
      "gkId": 12203,
      "name": "High Energy Pump Systems",
      "description": "High Energy Pump Systems increase the production of deuterium on all planets with each level.",
      "shortDesc": "Deut Prod",
      "metalBaseCost": 15e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2500,
      "target": [
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 11,
      "lifeformId": 3,
      "gkId": 13203,
      "name": "Efficiency Module",
      "description": "The Efficiency Module decreases the fuel consumption of all ships with each level.",
      "shortDesc": "Fuel Cost Reduction (30% Cap)",
      "metalBaseCost": 15e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.03,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "30%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 2500,
      "target": [
        {
          "bonusBreakdownId": 6
        }
      ]
    },
    {
      "id": 12,
      "lifeformId": 4,
      "gkId": 14203,
      "name": "Psionic Network",
      "description": "Strengthening the Psionic Network reduces the chance of losing ships on expeditions with every level.",
      "shortDesc": "Expo Ship Loss Reduction",
      "metalBaseCost": 15e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.05,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 2500,
      "target": [
        {
          "bonusBreakdownId": 8
        }
      ]
    },
    {
      "id": 13,
      "lifeformId": 1,
      "gkId": 11204,
      "name": "Stealth Field Generator",
      "description": "Stealth Field Generators reduce the costs and duration of researching spy tech.",
      "shortDesc": "Esp Tech Cost Reduction",
      "metalBaseCost": 2e4,
      "crystalBaseCost": 15e3,
      "deutBaseCost": 7500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 3500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        }
      ]
    },
    {
      "id": 14,
      "lifeformId": 2,
      "gkId": 12204,
      "name": "Cargo Hold Expansion (Civilian Ships)",
      "description": "The Cargo Hold Expansion increases the cargo capacity of civilian ships on all planets with each level.",
      "shortDesc": "Civ Ship Capacity",
      "metalBaseCost": 2e4,
      "crystalBaseCost": 15e3,
      "deutBaseCost": 7500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.4,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 3500,
      "target": [
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 202
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 208
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 210
        }
      ]
    },
    {
      "id": 15,
      "lifeformId": 3,
      "gkId": 13204,
      "name": "Depot AI",
      "description": "The Depot AI reduces the costs and construction time for the Alliance Depot with each level.",
      "shortDesc": "Alliance Depot Cost Reduction",
      "metalBaseCost": 2e4,
      "crystalBaseCost": 15e3,
      "deutBaseCost": 7500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 3500,
      "target": [
        {
          "bonusBreakdownId": 11
        },
        {
          "bonusBreakdownId": 14
        }
      ]
    },
    {
      "id": 16,
      "lifeformId": 4,
      "gkId": 14204,
      "name": "Telekinetic Tractor Beam",
      "description": "Increases the number of ships which are found on expeditions.",
      "shortDesc": "Expo Find more Ships",
      "metalBaseCost": 2e4,
      "crystalBaseCost": 15e3,
      "deutBaseCost": 7500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 3500,
      "target": [
        {
          "bonusBreakdownId": 12
        }
      ]
    },
    {
      "id": 17,
      "lifeformId": 1,
      "gkId": 11205,
      "name": "Orbital Den",
      "description": "A portion of the resource supplies will be stored here safe from plundering. The den increases the storage capacity.",
      "shortDesc": "Res Protection",
      "metalBaseCost": 25e3,
      "crystalBaseCost": 2e4,
      "deutBaseCost": 1e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.4,
      "crystalIncreaseFactor": 1.4,
      "deutIncreaseFactor": 1.4,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 4,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.2,
      "durationBase": 4500,
      "target": [
        {
          "bonusBreakdownId": 15
        }
      ]
    },
    {
      "id": 18,
      "lifeformId": 2,
      "gkId": 12205,
      "name": "Magma-Powered Production",
      "description": "Magma-Powered Production increases the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 25e3,
      "crystalBaseCost": 2e4,
      "deutBaseCost": 1e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 4500,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 19,
      "lifeformId": 3,
      "gkId": 13205,
      "name": "General Overhaul (Light Fighter)",
      "description": "The general overhaul of the Light Fighter increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Light Fighters with each level.",
      "shortDesc": "LF Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 4500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 204
        }
      ]
    },
    {
      "id": 20,
      "lifeformId": 4,
      "gkId": 14205,
      "name": "Enhanced Sensor Technology",
      "description": "Researching Enhanced Sensor Technology increases the amount of resources that can be earned on expeditions with each level.",
      "shortDesc": "Expo Res Boost",
      "metalBaseCost": 25e3,
      "crystalBaseCost": 2e4,
      "deutBaseCost": 1e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 4500,
      "target": [
        {
          "bonusBreakdownId": 19
        }
      ]
    },
    {
      "id": 21,
      "lifeformId": 1,
      "gkId": 11206,
      "name": "Research AI",
      "description": "The Research AI allows research projects to be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 35e3,
      "crystalBaseCost": 25e3,
      "deutBaseCost": 15e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5e3,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 22,
      "lifeformId": 2,
      "gkId": 12206,
      "name": "Geothermal Power Plants",
      "description": "Geothermal Power Plants increase the production of energy on all planets with each level.",
      "shortDesc": "Energy Prod",
      "metalBaseCost": 5e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.25,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5e3,
      "target": [
        {
          "bonusBreakdownId": 5
        }
      ]
    },
    {
      "id": 23,
      "lifeformId": 3,
      "gkId": 13206,
      "name": "Automated Transport Lines",
      "description": "Researching Automated Transport Lines increases the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 5e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5e3,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 24,
      "lifeformId": 4,
      "gkId": 14206,
      "name": "Neuromodal Compressor",
      "description": "Researching the Neuromodal Compressor increases the cargo capacity of civilian ships on all planets with each level.",
      "shortDesc": "Civ Ship Capacity",
      "metalBaseCost": 5e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.4,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 5e3,
      "target": [
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 202
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 208
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 210
        }
      ]
    },
    {
      "id": 25,
      "lifeformId": 1,
      "gkId": 11207,
      "name": "High-Performance Terraformer",
      "description": "The High-Performance Terraformer reduces the costs, energy required and duration of building the terraformer with each level.",
      "shortDesc": "Terraformer Cost Reduction",
      "metalBaseCost": 7e4,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8e3,
      "target": [
        {
          "bonusBreakdownId": 20
        },
        {
          "bonusBreakdownId": 21
        }
      ]
    },
    {
      "id": 26,
      "lifeformId": 2,
      "gkId": 12207,
      "name": "Depth Sounding",
      "description": "Researching Depth Sounding increases the metal production on all planets with each level.",
      "shortDesc": "Metal Prod",
      "metalBaseCost": 7e4,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5500,
      "target": [
        {
          "bonusBreakdownId": 1
        }
      ]
    },
    {
      "id": 27,
      "lifeformId": 3,
      "gkId": 13207,
      "name": "Improved Drone AI",
      "description": "Improved Drone AI reduces the costs and research time of spy technology with each level.",
      "shortDesc": "Esp Tech Cost Reduction",
      "metalBaseCost": 7e4,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        }
      ]
    },
    {
      "id": 28,
      "lifeformId": 4,
      "gkId": 14207,
      "name": "Neuro-Interface",
      "description": "With the Neuro-Interface, research projects can be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 7e4,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5500,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 29,
      "lifeformId": 1,
      "gkId": 11208,
      "name": "Enhanced Production Technologies",
      "description": "Enhanced Production Technologies increase the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 8e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 6e3,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 30,
      "lifeformId": 2,
      "gkId": 12208,
      "name": "Ion Crystal Enhancement (Heavy Fighter)",
      "description": "Researching the Ion Crystal Enhancement increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Heavy Fighters with each level.",
      "shortDesc": "HF Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 205
        }
      ]
    },
    {
      "id": 31,
      "lifeformId": 3,
      "gkId": 13208,
      "name": "Experimental Recycling Technology",
      "description": "Researching the Experimental Recycling Technology increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Recyclers with each level.",
      "shortDesc": "Recycler Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 209
        }
      ]
    },
    {
      "id": 32,
      "lifeformId": 4,
      "gkId": 14208,
      "name": "Interplanetary Analysis Network",
      "description": "Enhancing the Interplanetary Analysis Network increases the range of all phalanx scans.",
      "shortDesc": "Phalanx Range Boost",
      "metalBaseCost": 8e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.2,
      "crystalIncreaseFactor": 1.2,
      "deutIncreaseFactor": 1.2,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.6,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.2,
      "durationBase": 6e3,
      "target": [
        {
          "bonusBreakdownId": 22
        }
      ]
    },
    {
      "id": 33,
      "lifeformId": 1,
      "gkId": 11209,
      "name": "Light Fighter Mk II",
      "description": "Researching the Light Fighter Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Light Fighters with each level.",
      "shortDesc": "LF Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 204
        }
      ]
    },
    {
      "id": 34,
      "lifeformId": 2,
      "gkId": 12209,
      "name": "Improved Stellarator",
      "description": "Researching the Improved Stellarator reduces the costs and research time of plasma technology with each level.",
      "shortDesc": "Plasma Tech Cost Reduction",
      "metalBaseCost": 75e3,
      "crystalBaseCost": 55e3,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.15,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.3,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 6500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        }
      ]
    },
    {
      "id": 35,
      "lifeformId": 3,
      "gkId": 13209,
      "name": "General Overhaul (Cruiser)",
      "description": "The general overhaul of the Cruiser increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Cruisers with each level.",
      "shortDesc": "Cruiser Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 206
        }
      ]
    },
    {
      "id": 36,
      "lifeformId": 4,
      "gkId": 14209,
      "name": "Overclocking (Heavy Fighter)",
      "description": "Overclocking the Heavy Fighter systems increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Heavy Fighters with each level.",
      "shortDesc": "HF Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 205
        }
      ]
    },
    {
      "id": 37,
      "lifeformId": 1,
      "gkId": 11210,
      "name": "Cruiser Mk II",
      "description": "Researching the Cruiser Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Cruisers with each level.",
      "shortDesc": "Cruiser Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 7e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 206
        }
      ]
    },
    {
      "id": 38,
      "lifeformId": 2,
      "gkId": 12210,
      "name": "Hardened Diamond Drill Heads",
      "description": "Hardened Diamond Drill Heads increase the metal production on all planets with each level.",
      "shortDesc": "Metal Prod",
      "metalBaseCost": 85e3,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 35e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7e3,
      "target": [
        {
          "bonusBreakdownId": 1
        }
      ]
    },
    {
      "id": 39,
      "lifeformId": 3,
      "gkId": 13210,
      "name": "Slingshot Autopilot",
      "description": "Researching the Slingshot Autopilot makes it possible to reclaim fuel when recalling the fleet. Each level increases the amount of fuel reclaimed.",
      "shortDesc": "Fuel Refund for Recalls",
      "metalBaseCost": 85e3,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 35e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.2,
      "crystalIncreaseFactor": 1.2,
      "deutIncreaseFactor": 1.2,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.15,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "90%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7e3,
      "target": [
        {
          "bonusBreakdownId": 23
        }
      ]
    },
    {
      "id": 40,
      "lifeformId": 4,
      "gkId": 14210,
      "name": "Telekinetic Drive",
      "description": "Developing the Telekinetic Drive increases fleet speed on expeditions with every level.",
      "shortDesc": "Expo Fleet Speed Boost",
      "metalBaseCost": 85e3,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 35e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.2,
      "crystalIncreaseFactor": 1.2,
      "deutIncreaseFactor": 1.2,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.2,
      "durationBase": 7e3,
      "target": [
        {
          "bonusBreakdownId": 24
        }
      ]
    },
    {
      "id": 41,
      "lifeformId": 1,
      "gkId": 11211,
      "name": "Improved Lab Technology",
      "description": "With Improved Lab Technology, research projects can be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 12e4,
      "crystalBaseCost": 3e4,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7500,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 42,
      "lifeformId": 2,
      "gkId": 12211,
      "name": "Seismic Mining Technology",
      "description": "Researching Seismic Mining Technology increases the crystal production on all planets with each level.",
      "shortDesc": "Crystal Prod",
      "metalBaseCost": 12e4,
      "crystalBaseCost": 3e4,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7500,
      "target": [
        {
          "bonusBreakdownId": 2
        }
      ]
    },
    {
      "id": 43,
      "lifeformId": 3,
      "gkId": 13211,
      "name": "High-Temperature Superconductors",
      "description": "Researching High-Temperature Superconductors reduces the costs and research time of energy technology with each level.",
      "shortDesc": "Energy Tech Cost Reduction",
      "metalBaseCost": 12e4,
      "crystalBaseCost": 3e4,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        }
      ]
    },
    {
      "id": 44,
      "lifeformId": 4,
      "gkId": 14211,
      "name": "Sixth Sense",
      "description": "Sharpening the Sixth Sense increases the amount of resources that can be earned on expeditions with each level.",
      "shortDesc": "Expo Res Boost",
      "metalBaseCost": 12e4,
      "crystalBaseCost": 3e4,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 7500,
      "target": [
        {
          "bonusBreakdownId": 19
        }
      ]
    },
    {
      "id": 45,
      "lifeformId": 1,
      "gkId": 11212,
      "name": "Plasma Terraformer",
      "description": "Researching the Plasma Terraformer reduces the costs, energy required and duration of building the terraformer with each level.",
      "shortDesc": "Terraformer Cost Reduction",
      "metalBaseCost": 1e5,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 3e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 20
        },
        {
          "bonusBreakdownId": 21
        }
      ]
    },
    {
      "id": 46,
      "lifeformId": 2,
      "gkId": 12212,
      "name": "Magma-Powered Pump Systems",
      "description": "Magma-Powered Pump Systems increase the production of deuterium on all planets with each level.",
      "shortDesc": "Deut Prod",
      "metalBaseCost": 1e5,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 3e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8e3,
      "target": [
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 47,
      "lifeformId": 3,
      "gkId": 13212,
      "name": "General Overhaul (Battleship)",
      "description": "The general overhaul of the Battleship increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battleships with each level.",
      "shortDesc": "Battleship Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 8e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 207
        }
      ]
    },
    {
      "id": 48,
      "lifeformId": 4,
      "gkId": 14212,
      "name": "Psychoharmoniser",
      "description": "Researching the Psychoharmoniser increases the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 1e5,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 3e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8e3,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 49,
      "lifeformId": 1,
      "gkId": 11213,
      "name": "Low-Temperature Drives",
      "description": "Low-Temperature Drives reduce the costs and duration of researching spy tech.",
      "shortDesc": "Esp Tech Cost Reduction",
      "metalBaseCost": 2e5,
      "crystalBaseCost": 1e5,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        }
      ]
    },
    {
      "id": 50,
      "lifeformId": 2,
      "gkId": 12213,
      "name": "Ion Crystal Modules",
      "description": "With each level, Ion Crystal Modules reduce the Crawler’s energy consumption and increase its efficiency.",
      "shortDesc": "Crawler Boost",
      "metalBaseCost": 2e5,
      "crystalBaseCost": 1e5,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.2,
      "crystalIncreaseFactor": 1.2,
      "deutIncreaseFactor": 1.2,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.1,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8500,
      "target": [
        {
          "bonusBreakdownId": 25
        },
        {
          "bonusBreakdownId": 26
        }
      ]
    },
    {
      "id": 51,
      "lifeformId": 3,
      "gkId": 13213,
      "name": "Artificial Swarm Intelligence",
      "description": "Researching Artificial Swarm Intelligence increases the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 2e5,
      "crystalBaseCost": 1e5,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8500,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 52,
      "lifeformId": 4,
      "gkId": 14213,
      "name": "Efficient Swarm Intelligence",
      "description": "Efficient Swarm Intelligence allows regular and lifeform research projects to be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 2e5,
      "crystalBaseCost": 1e5,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8500,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 53,
      "lifeformId": 1,
      "gkId": 11214,
      "name": "Bomber Mk II",
      "description": "Researching the Bomber Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Bombers with each level.",
      "shortDesc": "Bomber Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 211
        }
      ]
    },
    {
      "id": 54,
      "lifeformId": 2,
      "gkId": 12214,
      "name": "Optimised Silo Construction Method",
      "description": "Researching the Optimised Silo Construction Method reduces the costs and research time of missile silos with each level.",
      "shortDesc": "Missile Silo Cost Reduction",
      "metalBaseCost": 22e4,
      "crystalBaseCost": 11e4,
      "deutBaseCost": 11e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 9e3,
      "target": [
        {
          "bonusBreakdownId": 27
        },
        {
          "bonusBreakdownId": 28
        }
      ]
    },
    {
      "id": 55,
      "lifeformId": 3,
      "gkId": 13214,
      "name": "General Overhaul (Battlecruiser)",
      "description": "The general overhaul of the Battlecruiser increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battlecruisers with each level.",
      "shortDesc": "BC Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 215
        }
      ]
    },
    {
      "id": 56,
      "lifeformId": 4,
      "gkId": 14214,
      "name": "Overclocking (Large Cargo)",
      "description": "Overclocking Large Cargo ships increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Largo Cargo ships with each level.",
      "shortDesc": "LC Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 203
        }
      ]
    },
    {
      "id": 57,
      "lifeformId": 1,
      "gkId": 11215,
      "name": "Destroyer Mk II",
      "description": "Researching the Destroyer Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Destroyers with each level.",
      "shortDesc": "Destroyer Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 213
        }
      ]
    },
    {
      "id": 58,
      "lifeformId": 2,
      "gkId": 12215,
      "name": "Diamond Energy Transmitter",
      "description": "Diamond Energy Transmitters reduce the costs and research time of energy technology with each level.",
      "shortDesc": "Energy Tech Cost Reduction",
      "metalBaseCost": 24e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 9500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        }
      ]
    },
    {
      "id": 59,
      "lifeformId": 3,
      "gkId": 13215,
      "name": "General Overhaul (Bomber)",
      "description": "The general overhaul of the Bomber increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Bombers with each level.",
      "shortDesc": "Bomber Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 211
        }
      ]
    },
    {
      "id": 60,
      "lifeformId": 4,
      "gkId": 14215,
      "name": "Gravitation Sensors",
      "description": "Gravitation Sensors increase the amount of Dark Matter that can be earned on expeditions with each level.",
      "shortDesc": "Expo DM Find Boost",
      "metalBaseCost": 24e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9500,
      "target": [
        {
          "bonusBreakdownId": 29
        }
      ]
    },
    {
      "id": 61,
      "lifeformId": 1,
      "gkId": 11216,
      "name": "Battlecruiser Mk II",
      "description": "Researching the Battlecruiser Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battlecruisers with each level.",
      "shortDesc": "BC Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 215
        }
      ]
    },
    {
      "id": 62,
      "lifeformId": 2,
      "gkId": 12216,
      "name": "Obsidian Shield Reinforcement",
      "description": "Researching the Obsidian Shield Reinforcement increases the structural integrity, shield strength as well as attack strength of defensive structures.",
      "shortDesc": "Defense Boost",
      "metalBaseCost": 25e4,
      "crystalBaseCost": 25e4,
      "deutBaseCost": 25e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.4,
      "crystalIncreaseFactor": 1.4,
      "deutIncreaseFactor": 1.4,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.5,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 401
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 402
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 403
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 404
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 405
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 406
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 407
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 408
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 401
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 402
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 403
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 404
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 405
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 406
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 407
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 408
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 401
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 402
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 403
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 404
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 405
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 406
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 407
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 408
        }
      ]
    },
    {
      "id": 63,
      "lifeformId": 3,
      "gkId": 13216,
      "name": "General Overhaul (Destroyer)",
      "description": "The general overhaul of the Destroyer increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Destroyers with each level.",
      "shortDesc": "Destroyer Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 213
        }
      ]
    },
    {
      "id": 64,
      "lifeformId": 4,
      "gkId": 14216,
      "name": "Overclocking (Battleship)",
      "description": "Overclocking the Battleship increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battleships with each level.",
      "shortDesc": "Battleship Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 207
        }
      ]
    },
    {
      "id": 65,
      "lifeformId": 1,
      "gkId": 11217,
      "name": "Robot Assistants",
      "description": "With Robot Assistants, research projects can be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 3e5,
      "crystalBaseCost": 18e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 11e3,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 66,
      "lifeformId": 2,
      "gkId": 12217,
      "name": "Rune Shields",
      "description": "Researching Rune Shields reduces the costs and duration of researching Armour Technology with each level.",
      "shortDesc": "Armor Tech Cost Reduction",
      "metalBaseCost": 5e5,
      "crystalBaseCost": 3e5,
      "deutBaseCost": 2e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 13e3,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        }
      ]
    },
    {
      "id": 67,
      "lifeformId": 3,
      "gkId": 13217,
      "name": "Experimental Weapons Technology",
      "description": "Researching Experimental Weapons Technology reduces the costs and research time of weapons technology with each level.",
      "shortDesc": "Weapons Tech Cost Reduction",
      "metalBaseCost": 5e5,
      "crystalBaseCost": 3e5,
      "deutBaseCost": 2e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 13e3,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        }
      ]
    },
    {
      "id": 68,
      "lifeformId": 4,
      "gkId": 14217,
      "name": "Psionic Shield Matrix",
      "description": "Enhancing the Psionic Shield Matrix reduces the costs and research time of shield technology with each level.",
      "shortDesc": "Shield Tech Cost Reduction",
      "metalBaseCost": 5e5,
      "crystalBaseCost": 3e5,
      "deutBaseCost": 2e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 13e3,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        }
      ]
    },
    {
      "id": 69,
      "lifeformId": 1,
      "gkId": 11218,
      "name": "Supercomputer",
      "description": "With the Supercomputer, astrophysics research projects can be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 5e5,
      "crystalBaseCost": 3e5,
      "deutBaseCost": 2e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 13e3,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        }
      ]
    },
    {
      "id": 70,
      "lifeformId": 2,
      "gkId": 12218,
      "name": "Rock’tal Collector Enhancement",
      "description": "The class bonuses as Collector increase with each level. All bonuses increase except:\n•	Overloading Crawlers\n•	Discount on acceleration (buildings)",
      "shortDesc": "Collector Class Boost",
      "metalBaseCost": 3e5,
      "crystalBaseCost": 18e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.7,
      "crystalIncreaseFactor": 1.7,
      "deutIncreaseFactor": 1.7,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 11e3,
      "target": [
        {
          "bonusBreakdownId": 30
        }
      ]
    },
    {
      "id": 71,
      "lifeformId": 3,
      "gkId": 13218,
      "name": "Mechan General Enhancement",
      "description": "The class bonuses as General increase with each level. All bonuses increase except:\n•	Small chance to immediately destroy a Deathstar once in a battle using a light fighter\n•	Wreckage at attack (transport to starting planet)\n•	Detailed fleet speed settings\n•	Discount on acceleration (shipyard)",
      "shortDesc": "General Class Boost",
      "metalBaseCost": 3e5,
      "crystalBaseCost": 18e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.7,
      "crystalIncreaseFactor": 1.7,
      "deutIncreaseFactor": 1.7,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 11e3,
      "target": [
        {
          "bonusBreakdownId": 31
        }
      ]
    },
    {
      "id": 72,
      "lifeformId": 4,
      "gkId": 14218,
      "name": "Kaelesh Discoverer Enhancement",
      "description": "The class bonuses as Discoverer increase with each level. All bonuses increase except:\n•	Debris fields created on expeditions are visible in the Galaxy view\n•	Loot from inactive players\n•	Discount on acceleration (research)",
      "shortDesc": "Discoverer Class Boost",
      "metalBaseCost": 3e5,
      "crystalBaseCost": 18e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.7,
      "crystalIncreaseFactor": 1.7,
      "deutIncreaseFactor": 1.7,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 11e3,
      "target": [
        {
          "bonusBreakdownId": 32
        }
      ]
    }
  ];
  function getEntityLevel(el) {
    const link = el.querySelector("a");
    const text = link ? link.textContent : el.textContent;
    return parseInt((text == null ? void 0 : text.replace(/,/g, "").replace(/\./g, "")) || "0");
  }
  function scrapeEmpireData() {
    const empire = document.querySelector("#empire") || document.querySelector("#empireView") || document.querySelector(".empireView") || (document.querySelector(".planet") ? document.body : null);
    if (!empire || !empire.querySelector(".planet")) {
      return null;
    }
    const url = window.location.href;
    const isMoonView = url.includes("planetType=1");
    const planetType = isMoonView ? "moon" : "planet";
    console.log(`OGame Nexus: Scraping Empire page (${planetType}s)...`);
    const planetDivs = Array.from(empire.querySelectorAll(".planet:not(.summary)"));
    const planets = [];
    const research = {};
    planetDivs.forEach((planetDiv) => {
      var _a, _b;
      const planetId = planetDiv.id.replace("planet", "");
      if (!planetId) return;
      const planet = {
        id: planetId,
        type: planetType,
        ships: {},
        defenses: {},
        lastUpdated: Date.now()
      };
      const nameEl = planetDiv.querySelector(".planetname");
      if (nameEl) planet.name = (_a = nameEl.textContent) == null ? void 0 : _a.trim();
      const coordsEl = planetDiv.querySelector(".coords a");
      if (coordsEl) {
        const coordsText = (_b = coordsEl.textContent) == null ? void 0 : _b.trim();
        if (coordsText) planet.coords = coordsText.replace(/[\[\]]/g, "");
      }
      const supplyValues = planetDiv.querySelectorAll(".values.supply div");
      supplyValues.forEach((val) => {
        const techId = Array.from(val.classList).find((c) => !isNaN(parseInt(c)));
        if (techId) {
          const level = getEntityLevel(val);
          mapTechToPlanet(planet, parseInt(techId), level);
        }
      });
      const stationValues = planetDiv.querySelectorAll(".values.station div");
      stationValues.forEach((val) => {
        const techId = Array.from(val.classList).find((c) => !isNaN(parseInt(c)));
        if (techId) {
          const level = getEntityLevel(val);
          mapTechToPlanet(planet, parseInt(techId), level);
        }
      });
      const shipValues = planetDiv.querySelectorAll(".values.ships div");
      shipValues.forEach((val) => {
        const techId = Array.from(val.classList).find((c) => !isNaN(parseInt(c)));
        if (techId && planet.ships) {
          const count = getEntityLevel(val);
          planet.ships[parseInt(techId)] = count;
        }
      });
      const defenseValues = planetDiv.querySelectorAll(".values.defence div");
      defenseValues.forEach((val) => {
        const techId = Array.from(val.classList).find((c) => !isNaN(parseInt(c)));
        if (techId && planet.defenses) {
          const count = getEntityLevel(val);
          planet.defenses[parseInt(techId)] = count;
        }
      });
      const researchValues = planetDiv.querySelectorAll(".values.research div");
      researchValues.forEach((val) => {
        const techId = Array.from(val.classList).find((c) => !isNaN(parseInt(c)));
        if (techId) {
          const level = getEntityLevel(val);
          research[parseInt(techId)] = level;
        }
      });
      const lfBuildings = [];
      const lfSetup = [];
      const lfBuildingGroups = ["lifeform1buildings", "lifeform2buildings", "lifeform3buildings", "lifeform4buildings"];
      lfBuildingGroups.forEach((group) => {
        const vals = planetDiv.querySelectorAll(`.values.${group} div`);
        vals.forEach((val) => {
          const techId = Array.from(val.classList).find((c) => !isNaN(parseInt(c)));
          if (techId) {
            const level = getEntityLevel(val);
            if (level > 0) {
              lfBuildings.push({ id: parseInt(techId), level });
            }
          }
        });
      });
      const lfResearchGroups = ["lifeform1research", "lifeform2research", "lifeform3research", "lifeform4research"];
      lfResearchGroups.forEach((group) => {
        const vals = planetDiv.querySelectorAll(`.values.${group} div`);
        vals.forEach((val) => {
          const techIdClass = Array.from(val.classList).find((c) => !isNaN(parseInt(c)));
          if (techIdClass) {
            const techId = parseInt(techIdClass);
            const level = getEntityLevel(val);
            if (level > 0) {
              const techStr = techIdClass.toString();
              let slotNumber = 0;
              if (techStr.length === 5 && techStr.startsWith("1")) {
                slotNumber = parseInt(techStr.substring(3, 5), 10);
              }
              const techData = LIFEFORM_TECH_DATA.find((t) => t.gkId === techId);
              const normalizedTechId = techData ? techData.id : techId;
              lfSetup.push({ slotNumber, selectedTechId: normalizedTechId, level });
            }
          }
        });
      });
      if (lfBuildings.length > 0) planet.lifeformBuildings = lfBuildings;
      if (lfSetup.length > 0) planet.lifeformSetup = lfSetup;
      const activeItems = [];
      const boosters = { metal: 0, crystal: 0, deuterium: 0 };
      const itemEls = planetDiv.querySelectorAll(".empireItems .item_img");
      itemEls.forEach((itemEl) => {
        var _a2;
        const tooltipTitle = itemEl.getAttribute("data-tooltip-title") || "";
        const titleParts = tooltipTitle.split("|");
        const title = titleParts[0].trim();
        const bodyHtml = titleParts.slice(1).join("|");
        const lowerTitle = title.toLowerCase();
        let type = "other";
        let bonus = 0;
        if (lowerTitle.includes("metal booster")) {
          type = "metal";
          if (lowerTitle.includes("platinum")) bonus = 0.4;
          else if (lowerTitle.includes("gold")) bonus = 0.3;
          else if (lowerTitle.includes("silver")) bonus = 0.2;
          else if (lowerTitle.includes("bronze")) bonus = 0.1;
        } else if (lowerTitle.includes("crystal booster")) {
          type = "crystal";
          if (lowerTitle.includes("platinum")) bonus = 0.4;
          else if (lowerTitle.includes("gold")) bonus = 0.3;
          else if (lowerTitle.includes("silver")) bonus = 0.2;
          else if (lowerTitle.includes("bronze")) bonus = 0.1;
        } else if (lowerTitle.includes("deuterium booster")) {
          type = "deuterium";
          if (lowerTitle.includes("platinum")) bonus = 0.4;
          else if (lowerTitle.includes("gold")) bonus = 0.3;
          else if (lowerTitle.includes("silver")) bonus = 0.2;
          else if (lowerTitle.includes("bronze")) bonus = 0.1;
        } else if (lowerTitle.includes("expedition resource booster")) {
          type = "expedition_res";
        } else if (lowerTitle.includes("resource booster")) {
          type = "resource";
        } else if (lowerTitle.includes("expedition slots")) {
          type = "expedition_slots";
        } else if (lowerTitle.includes("fleet slots")) {
          type = "fleet_slots";
        } else if (lowerTitle.includes("planet fields")) {
          type = "fields";
        }
        const titlePercentMatch = title.match(/\((\d+)%\)/);
        if (titlePercentMatch) {
          bonus = parseInt(titlePercentMatch[1], 10) / 100;
        }
        let rarity = "";
        const parentClass = ((_a2 = itemEl.parentElement) == null ? void 0 : _a2.className) || "";
        const rarityMatch = parentClass.match(/r_(\w+)/);
        if (rarityMatch) rarity = rarityMatch[1];
        let timeRemaining = "";
        let expiryTimestamp;
        let duration = "";
        let isPermanent = false;
        const decodedHtml = bodyHtml.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#43;/g, "+");
        const restTimeMatch = decodedHtml.match(/class="restTime"[^>]*>Time remaining:\s*([^<]+)/i) || decodedHtml.match(/Time remaining:\s*([^<]+)/i);
        if (restTimeMatch) {
          timeRemaining = restTimeMatch[1].trim();
          const secondsRemaining = parseOgameTime(timeRemaining);
          if (secondsRemaining > 0) {
            expiryTimestamp = Date.now() + secondsRemaining * 1e3;
          }
        }
        const durationMatch = decodedHtml.match(/Duration:\s*([^<]+)/i);
        if (durationMatch) {
          duration = durationMatch[1].trim();
          if (duration.toLowerCase().includes("permanent")) {
            isPermanent = true;
          }
        }
        activeItems.push({
          name: title,
          title,
          rarity,
          timeRemaining,
          expiryTimestamp,
          duration,
          isPermanent,
          bonus,
          type
        });
        if (bonus > 0) {
          if (type === "metal") boosters.metal += bonus;
          else if (type === "crystal") boosters.crystal += bonus;
          else if (type === "deuterium") boosters.deuterium += bonus;
          else if (type === "resource") {
            boosters.metal += bonus;
            boosters.crystal += bonus;
            boosters.deuterium += bonus;
          }
        }
      });
      if (activeItems.length > 0) {
        planet.activeItems = activeItems;
        planet.boosters = boosters;
      }
      planets.push(planet);
    });
    console.log(`OGame Nexus: Successfully scraped ${planets.length} planets from Empire page. Sections: [Buildings, Facilities, Ships, Defense, Research, Lifeform Buildings, Lifeform Research, Active Boosters]`);
    return { planets, research };
  }
  function parseOgameTime(timeStr) {
    const regex = /(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i;
    const matches = timeStr.match(regex);
    if (!matches) return 0;
    const weeks = parseInt(matches[1] || "0", 10);
    const days = parseInt(matches[2] || "0", 10);
    const hours = parseInt(matches[3] || "0", 10);
    const minutes = parseInt(matches[4] || "0", 10);
    const seconds = parseInt(matches[5] || "0", 10);
    return weeks * 7 * 24 * 3600 + days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds;
  }
  function mapTechToPlanet(planet, techId, level) {
    switch (techId) {
      case 1:
        planet.metalMine = level;
        break;
      case 2:
        planet.crystalMine = level;
        break;
      case 3:
        planet.deuteriumMine = level;
        break;
      case 4:
        planet.solarPlant = level;
        break;
      case 12:
        planet.fusionReactor = level;
        break;
      case 22:
        planet.metalStorage = level;
        break;
      case 23:
        planet.crystalStorage = level;
        break;
      case 24:
        planet.deuteriumStorage = level;
        break;
      case 212:
        planet.solarSatellites = level;
        break;
      case 14:
        planet.roboticsFactory = level;
        break;
      case 15:
        planet.naniteFactory = level;
        break;
      case 21:
        planet.shipyard = level;
        break;
      case 31:
        planet.researchLab = level;
        break;
      case 33:
        planet.terraformer = level;
        break;
      case 34:
        planet.allianceDepot = level;
        break;
      case 44:
        planet.missileSilo = level;
        break;
      case 36:
        planet.spaceDock = level;
        break;
      case 41:
        planet.lunarBase = level;
        break;
      case 42:
        planet.sensorPhalanx = level;
        break;
      case 43:
        planet.jumpGate = level;
        break;
    }
  }
  function formatExactNumber$1(num) {
    return new Intl.NumberFormat().format(num);
  }
  function formatNumber$1(num, decimals = 2) {
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + "G";
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
    return Math.round(num).toString();
  }
  function scrapeDebrisHarvestMessages() {
    var _a;
    const harvestMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="32"]:not([data-og-nexus-processed="true"])');
    const results = [];
    for (const msg of harvestMessages) {
      const messageId = (_a = msg.closest(".msg")) == null ? void 0 : _a.getAttribute("data-msg-id");
      if (!messageId) continue;
      const timestamp = msg.getAttribute("data-raw-timestamp");
      const coords = msg.getAttribute("data-raw-targetcoordinates");
      const recyclerAmount = msg.getAttribute("data-raw-recycleramount");
      const totalCapacity = msg.getAttribute("data-raw-totalcapacity");
      const recycledResourcesRaw = msg.getAttribute("data-raw-recycledresources");
      if (timestamp && coords && recycledResourcesRaw) {
        let recycledResources = void 0;
        try {
          recycledResources = JSON.parse(recycledResourcesRaw);
        } catch (e) {
          console.warn("OGame Nexus: Failed to parse debris resources JSON", e);
        }
        results.push({
          messageId,
          timestamp: parseInt(timestamp),
          coords,
          recyclerAmount: recyclerAmount ? parseInt(recyclerAmount) : void 0,
          totalCapacity: totalCapacity ? parseInt(totalCapacity) : void 0,
          recycledResources
        });
        msg.setAttribute("data-og-nexus-processed", "true");
      }
    }
    return results;
  }
  function trackDebrisHarvests(playerId) {
    const harvests = scrapeDebrisHarvestMessages();
    if (harvests.length > 0) {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          type: "TRACK_DEBRIS",
          data: { harvests, playerId }
        }, (response) => {
          if (response && response.success) {
            response.data.forEach((harvest) => {
              const msgElement = document.querySelector(`.msg[data-msg-id="${harvest.messageId}"]`);
              if (msgElement) {
                updateDebrisVisuals(msgElement, harvest);
                if (harvest.isNew) {
                  setTimeout(() => {
                    var _a, _b, _c;
                    const icons = [];
                    if (((_a = harvest.recycledResources) == null ? void 0 : _a.metal) > 0) icons.push(chrome.runtime.getURL("icons/resources/metal-icon-medium.jpg"));
                    if (((_b = harvest.recycledResources) == null ? void 0 : _b.crystal) > 0) icons.push(chrome.runtime.getURL("icons/resources/crystal-icon-medium.jpg"));
                    if (((_c = harvest.recycledResources) == null ? void 0 : _c.deuterium) > 0) icons.push(chrome.runtime.getURL("icons/resources/deuterium-icon-medium.jpg"));
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
  function updateDebrisVisuals(msgElement, harvest) {
    const footerActions = msgElement.querySelector("message-footer-actions") || msgElement.querySelector(".msg_actions");
    if (footerActions && !footerActions.querySelector(".og-nexus-tracked-btn")) {
      const trackedWrapper = document.createElement("gradient-button");
      trackedWrapper.setAttribute("sq28", "");
      const trackedBtn = document.createElement("button");
      trackedBtn.className = "custom_btn nexus-tooltip og-nexus-tracked-btn";
      trackedBtn.setAttribute("data-nexus-tooltip", "OGame Nexus: Message Tracked");
      trackedBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" style="margin: 4px;">
                <circle cx="10" cy="10" r="9" fill="none" stroke="#9ca3af" stroke-width="1.5" />
                <path d="M6 10 L9 13 L14 7" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;
      trackedWrapper.appendChild(trackedBtn);
      footerActions.appendChild(trackedWrapper);
      if (typeof window.initTooltips === "function") {
        window.initTooltips();
      }
    }
    const content = msgElement.querySelector(".msgContent");
    const res = harvest.recycledResources;
    if (content && res && !msgElement.querySelector(".og-nexus-debris-result")) {
      content.style.display = "none";
      const container = document.createElement("div");
      container.className = "og-nexus-debris-result og-nexus-result-container";
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
      const layoutWrapper = document.createElement("div");
      layoutWrapper.className = "nexus-tooltip rarity-pill-common";
      layoutWrapper.setAttribute("data-nexus-tooltip", `Harvested Debris: ${formatExactNumber$1(res.metal)} Metal, ${formatExactNumber$1(res.crystal)} Crystal, ${formatExactNumber$1(res.deuterium)} Deuterium`);
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
      const addResourceItem = (resName, resAmount, iconUrl, color) => {
        const isZero = resAmount === 0;
        const item = document.createElement("div");
        item.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
                opacity: ${isZero ? 0.6 : 1};
                filter: ${isZero ? "grayscale(0.8)" : "none"};
            `;
        const icon = document.createElement("div");
        icon.style.cssText = `
                width: 22px;
                height: 22px;
                background-image: url('${chrome.runtime.getURL(iconUrl)}');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            `;
        const amountLabel = document.createElement("div");
        amountLabel.textContent = formatNumber$1(resAmount);
        amountLabel.style.cssText = `
                font-size: 13px;
                font-weight: bold;
                font-family: 'Verdana', sans-serif;
                color: ${isZero ? "#9ca3af" : color};
            `;
        item.appendChild(icon);
        item.appendChild(amountLabel);
        layoutWrapper.appendChild(item);
      };
      addResourceItem("metal", res.metal, "icons/resources/metal-icon-medium.jpg", "#E6953C");
      addResourceItem("crystal", res.crystal, "icons/resources/crystal-icon-medium.jpg", "#4CAEE6");
      addResourceItem("deuterium", res.deuterium, "icons/resources/deuterium-icon-medium.jpg", "#43D159");
      container.appendChild(layoutWrapper);
      const head = msgElement.querySelector(".msgHead");
      if (head && head.nextSibling) {
        msgElement.insertBefore(container, head.nextSibling);
      } else {
        msgElement.appendChild(container);
      }
    }
  }
  function isExtensionStillValid() {
    return !!(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id);
  }
  function formatExactNumber(num) {
    return new Intl.NumberFormat().format(num);
  }
  function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "G";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toString();
  }
  function scrapeCombatMessages() {
    var _a, _b, _c, _d, _e, _f;
    const combatMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="25"]:not([data-og-nexus-processed="true"])');
    const results = [];
    for (const msg of combatMessages) {
      const messageId = (_a = msg.closest(".msg")) == null ? void 0 : _a.getAttribute("data-msg-id");
      if (!messageId) continue;
      const timestamp = msg.getAttribute("data-raw-timestamp");
      const coordsRaw = msg.getAttribute("data-raw-coords");
      const resultRaw = msg.getAttribute("data-raw-result");
      const fleetsRaw = msg.getAttribute("data-raw-fleets");
      if (timestamp && coordsRaw && resultRaw) {
        try {
          const result = JSON.parse(resultRaw);
          const coords = coordsRaw.replace(/[\[\]]/g, "");
          const loot = { metal: 0, crystal: 0, deuterium: 0, food: 0 };
          if (result.loot && Array.isArray(result.loot.resources)) {
            result.loot.resources.forEach((r) => {
              if (loot.hasOwnProperty(r.resource)) {
                loot[r.resource] = r.amount;
              }
            });
          }
          const debris = { metal: 0, crystal: 0, deuterium: 0 };
          if (result.debris && Array.isArray(result.debris.resources)) {
            result.debris.resources.forEach((r) => {
              if (debris.hasOwnProperty(r.resource)) {
                debris[r.resource] = r.total;
              }
            });
          }
          let attackerLosses = 0;
          let defenderLosses = 0;
          if (Array.isArray(result.totalValueOfUnitsLost)) {
            result.totalValueOfUnitsLost.forEach((l) => {
              if (l.side === "attacker") attackerLosses = l.value;
              else if (l.side === "defender") defenderLosses = l.value;
            });
          }
          let isAcs = false;
          try {
            const fleets = JSON.parse(fleetsRaw || "[]");
            if (Array.isArray(fleets) && fleets.length > 2) {
              isAcs = true;
            }
          } catch (e) {
          }
          const isExpedition = coords.trim().endsWith(":16");
          const attackers = Array.isArray(result.attackers) ? result.attackers : [];
          const defenders = Array.isArray(result.defenders) ? result.defenders : [];
          let attackerName = ((_b = attackers[0]) == null ? void 0 : _b.name) || "Unknown";
          let defenderName = ((_c = defenders[0]) == null ? void 0 : _c.name) || "Unknown";
          if (attackerName === "Unknown" || defenderName === "Unknown" && !isExpedition) {
            const msgContainer = msg.closest(".msg");
            const header = msgContainer == null ? void 0 : msgContainer.querySelector(".msg_title, .msg_head, .msgHead, .msgHeadInternal, .msg_title_text");
            const headText = (header == null ? void 0 : header.textContent) || "";
            const parenMatch = headText.match(/\((.*?)\)/);
            if (parenMatch) {
              const content = parenMatch[1];
              const parts = content.split(",").map((p) => p.trim());
              if (parts.length >= 2) {
                const aContent = parts[0];
                const dContent = parts[1];
                const aColonIdx = aContent.indexOf(":");
                const dColonIdx = dContent.indexOf(":");
                if (attackerName === "Unknown" && aColonIdx !== -1) {
                  attackerName = aContent.substring(aColonIdx + 1).trim();
                }
                if (defenderName === "Unknown" && dColonIdx !== -1) {
                  defenderName = dContent.substring(dColonIdx + 1).trim();
                }
              }
            }
          }
          if (attackerName === "Unknown" || defenderName === "Unknown" || defenderName === "Expedition Hostile" || isExpedition && (defenderName === "Pirates" || defenderName === "Aliens")) {
            const msgContainer = msg.closest(".msg");
            const bodyText = ((_d = msgContainer == null ? void 0 : msgContainer.querySelector(".msgContent, .msg_content")) == null ? void 0 : _d.textContent) || "";
            if (bodyText) {
              const aMatch = bodyText.match(/(?:Attacker|Angreifer|Attaquant|Attaccante|Agresor|Atacante):\s*\((.*?)\)/i);
              const dMatch = bodyText.match(/(?:Defender|Verteidiger|Défenseur|Difensore|Defensor):\s*\((.*?)\)/i);
              if (attackerName === "Unknown" && aMatch) attackerName = aMatch[1].trim();
              if ((defenderName === "Unknown" || defenderName === "Expedition Hostile" || defenderName === "Pirates" || defenderName === "Aliens") && dMatch) {
                defenderName = dMatch[1].trim();
              }
            }
          }
          results.push({
            messageId,
            timestamp: parseInt(timestamp),
            coords,
            winner: result.winner || "none",
            loot,
            debris,
            attackerLosses,
            defenderLosses,
            attackerName,
            defenderName,
            honor: ((_e = result.honor) == null ? void 0 : _e.attacker) || 0,
            moonChance: ((_f = result.moonCreation) == null ? void 0 : _f.chance) || 0,
            isAcs,
            isExpedition,
            tracked: false,
            rawFleets: JSON.parse(fleetsRaw || "[]"),
            rawResult: result
          });
          msg.setAttribute("data-og-nexus-processed", "true");
        } catch (e) {
          console.error("OGame Nexus: Failed to parse combat report JSON", e);
        }
      }
    }
    return results;
  }
  async function trackCombatReports(playerId) {
    if (!isExtensionStillValid()) return;
    const combatData = scrapeCombatMessages();
    if (combatData.length === 0) return;
    chrome.runtime.sendMessage({
      type: "TRACK_COMBATS",
      data: { combats: combatData, playerId }
    }, (response) => {
      if (response == null ? void 0 : response.success) {
        response.data.forEach((combat) => {
          const msgElement = document.querySelector(`.msg[data-msg-id="${combat.messageId}"]`);
          if (msgElement) {
            updateCombatVisuals(msgElement, combat);
            if (combat.isNew) {
              setTimeout(() => {
                var _a, _b, _c, _d;
                const icons = [];
                icons.push(chrome.runtime.getURL("icons/misc/warrior_armor_shield_weapon.png"));
                if (((_a = combat.loot) == null ? void 0 : _a.metal) > 0 || ((_b = combat.debris) == null ? void 0 : _b.metal) > 0) icons.push(chrome.runtime.getURL("icons/resources/metal-icon-medium.jpg"));
                if (((_c = combat.loot) == null ? void 0 : _c.crystal) > 0 || ((_d = combat.debris) == null ? void 0 : _d.crystal) > 0) icons.push(chrome.runtime.getURL("icons/resources/crystal-icon-medium.jpg"));
                flyToNexusButton(msgElement, icons);
              }, 100);
            }
          }
        });
        triggerSiteTooltips();
      }
    });
  }
  function updateCombatVisuals(msgElement, combat) {
    if (!isExtensionStillValid()) return;
    const footerActions = msgElement.querySelector("message-footer-actions") || msgElement.querySelector(".msg_actions");
    if (footerActions && !footerActions.querySelector(".og-nexus-tracked-btn")) {
      const trackedWrapper = document.createElement("gradient-button");
      trackedWrapper.setAttribute("sq28", "");
      const trackedBtn = document.createElement("button");
      trackedBtn.className = "custom_btn nexus-tooltip og-nexus-tracked-btn";
      trackedBtn.setAttribute("data-nexus-tooltip", "OGame Nexus: Message Tracked");
      trackedBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" style="margin: 4px;">
                <circle cx="10" cy="10" r="9" fill="none" stroke="#9ca3af" stroke-width="1.5" />
                <path d="M6 10 L9 13 L14 7" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;
      trackedWrapper.appendChild(trackedBtn);
      footerActions.appendChild(trackedWrapper);
    }
    if (combat.debris && !msgElement.querySelector(".og-nexus-combat-debris-summary")) {
      const container = document.createElement("div");
      container.className = "og-nexus-combat-debris-summary og-nexus-result-container";
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
      const layoutWrapper = document.createElement("div");
      layoutWrapper.className = "nexus-tooltip rarity-pill-common";
      layoutWrapper.setAttribute("data-nexus-tooltip", `Created Debris: ${formatExactNumber(combat.debris.metal)} Metal, ${formatExactNumber(combat.debris.crystal)} Crystal`);
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
      const addResourceItem = (resName, resAmount, iconUrl, color) => {
        const isZero = resAmount === 0;
        const item = document.createElement("div");
        item.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
                opacity: ${isZero ? 0.6 : 1};
                filter: ${isZero ? "grayscale(0.8)" : "none"};
            `;
        const icon = document.createElement("div");
        icon.style.cssText = `
                width: 20px;
                height: 20px;
                background-image: url('${chrome.runtime.getURL(iconUrl)}');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            `;
        const amountLabel = document.createElement("div");
        amountLabel.textContent = formatNumber(resAmount);
        amountLabel.style.cssText = `
                font-size: 12px;
                font-weight: bold;
                font-family: 'Verdana', sans-serif;
                color: ${isZero ? "#9ca3af" : color};
            `;
        item.appendChild(icon);
        item.appendChild(amountLabel);
        layoutWrapper.appendChild(item);
      };
      addResourceItem("metal", combat.debris.metal, "icons/resources/metal-icon-medium.jpg", "#E6953C");
      addResourceItem("crystal", combat.debris.crystal, "icons/resources/crystal-icon-medium.jpg", "#4CAEE6");
      container.appendChild(layoutWrapper);
      const head = msgElement.querySelector(".msgHead");
      if (head && head.nextSibling) {
        msgElement.insertBefore(container, head.nextSibling);
      } else {
        msgElement.appendChild(container);
      }
    }
  }
  function triggerSiteTooltips() {
    window.dispatchEvent(new CustomEvent("ogame-nexus-trigger-tooltips"));
  }
  let currentTimeframe = "D";
  let currentReferenceDate = /* @__PURE__ */ new Date();
  const CATEGORY_COLORS = {
    Resources: "#4CAEE6",
    Nothing: "#94a3b8",
    Ships: "#22c55e",
    "Dark Matter": "#a855f7",
    Duration: "#ef4444",
    Battle: "#eab308",
    Trader: "#f97316",
    Item: "#f59e0b",
    "Black hole": "#334155",
    "Aliens/Pirates": "#eab308"
  };
  const CATEGORY_ICONS = {
    Resources: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    Nothing: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    Ships: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>',
    "Dark Matter": '<img src="' + chrome.runtime.getURL("icons/resources/dark-matter-icon-medium.jpg") + '" style="width: 14px; height: 14px; border-radius: 2px;">',
    Duration: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    Battle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    Trader: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
    Item: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
    "Artifacts": '<img src="' + chrome.runtime.getURL("icons/lifeforms/artifact-icon-large.png") + '" style="width: 14px; height: 14px; border-radius: 2px;">',
    "Black hole": '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg>'
  };
  function renderAnalyticsTab(container, expeditions, lifeforms = [], combats = [], debrisHarvests = []) {
    container.innerHTML = "";
    const mBounds = getMonthBounds(currentReferenceDate);
    const filterByMonth = (items) => items.filter((item) => {
      const tsMs = item.timestamp * 1e3;
      return tsMs >= mBounds.startMs && tsMs <= mBounds.endMs;
    });
    const monthExpeditions = filterByMonth(expeditions);
    const monthCombats = filterByMonth(combats);
    const monthDebris = filterByMonth(debrisHarvests);
    const bounds = getTimeframeBounds(currentTimeframe, currentReferenceDate);
    const startMs = bounds ? bounds.startMs : 0;
    const endMs = bounds ? bounds.endMs : 0;
    const label = bounds ? bounds.label : "All Time";
    const filterByTimeframe = (items) => items.filter((item) => {
      if (currentTimeframe === "ALL") return true;
      const tsMs = item.timestamp * 1e3;
      return tsMs >= startMs && tsMs <= endMs;
    });
    const tfExpeditions = filterByTimeframe(expeditions);
    const tfLifeforms = filterByTimeframe(lifeforms);
    const tfCombats = filterByTimeframe(combats);
    const tfDebris = filterByTimeframe(debrisHarvests);
    let earliestTs = Date.now();
    const checkEarliest = (arr) => {
      arr.forEach((a) => {
        if (a.timestamp && a.timestamp * 1e3 < earliestTs) earliestTs = a.timestamp * 1e3;
      });
    };
    checkEarliest(expeditions);
    checkEarliest(combats);
    checkEarliest(debrisHarvests);
    const trackingDays = Math.max(1, Math.ceil((Date.now() - earliestTs) / (1e3 * 3600 * 24)));
    const aggregate = processAnalyticsData(tfExpeditions, monthExpeditions, currentReferenceDate, trackingDays, tfLifeforms, tfCombats, tfDebris, monthCombats, monthDebris);
    const headerWrapper = document.createElement("div");
    headerWrapper.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        background: rgba(15, 23, 42, 0.4);
        padding: 12px 20px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.05);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
    `;
    const tfControls = document.createElement("div");
    tfControls.style.cssText = `display: flex; gap: 8px; align-items: center;`;
    ["D", "W", "M", "ALL"].forEach((tf) => {
      const btn = document.createElement("button");
      btn.textContent = tf;
      btn.style.cssText = `
            background: ${currentTimeframe === tf ? "rgba(56, 189, 248, 0.2)" : "rgba(255,255,255,0.05)"};
            color: ${currentTimeframe === tf ? "#38bdf8" : "#94a3b8"};
            border: 1px solid ${currentTimeframe === tf ? "rgba(56, 189, 248, 0.3)" : "transparent"};
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        `;
      btn.onclick = () => {
        currentTimeframe = tf;
        renderAnalyticsTab(container, expeditions, lifeforms, combats, debrisHarvests);
      };
      tfControls.appendChild(btn);
    });
    const dateNav = document.createElement("div");
    dateNav.style.cssText = `display: flex; gap: 12px; align-items: center; margin-left: 24px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 24px;`;
    if (currentTimeframe !== "ALL") {
      const prevBtn = document.createElement("button");
      prevBtn.innerHTML = "&lt;";
      prevBtn.style.cssText = `background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); width: 28px; height: 28px; border-radius: 4px; cursor: pointer;`;
      prevBtn.onclick = () => adjustDate(-1, container, expeditions, lifeforms, combats, debrisHarvests);
      const dateLabel = document.createElement("div");
      dateLabel.textContent = getPickerLabel(currentTimeframe, currentReferenceDate);
      dateLabel.style.cssText = `color: #e2e8f0; font-weight: 600; font-size: 14px; min-width: 100px; text-align: center;`;
      const nextBtn = document.createElement("button");
      nextBtn.innerHTML = "&gt;";
      nextBtn.style.cssText = `background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); width: 28px; height: 28px; border-radius: 4px; cursor: pointer;`;
      nextBtn.onclick = () => adjustDate(1, container, expeditions, lifeforms, combats, debrisHarvests);
      dateNav.appendChild(prevBtn);
      dateNav.appendChild(dateLabel);
      dateNav.appendChild(nextBtn);
    }
    tfControls.appendChild(dateNav);
    headerWrapper.appendChild(tfControls);
    container.appendChild(headerWrapper);
    if (currentTimeframe !== "ALL") {
      renderTimelineChart(container, aggregate.timeline, expeditions, lifeforms, combats, debrisHarvests);
    }
    const titleRow = document.createElement("div");
    titleRow.style.cssText = `text-align: center; margin: 20px 0; color: #fbbf24; font-weight: 700; font-size: 15px; letter-spacing: 0.5px;`;
    titleRow.textContent = label;
    container.appendChild(titleRow);
    const midSection = document.createElement("div");
    midSection.style.cssText = `
        display: flex;
        gap: 24px;
        margin-bottom: 24px;
        align-items: stretch;
    `;
    const pieCardDiv = renderPieChartCard(aggregate);
    midSection.appendChild(pieCardDiv);
    const shipsCardDiv = renderShipsCard(aggregate);
    midSection.appendChild(shipsCardDiv);
    container.appendChild(midSection);
    const globalAggregate = processAnalyticsData(expeditions, expeditions, currentReferenceDate, trackingDays, lifeforms, combats, debrisHarvests, combats, debrisHarvests);
    const tableDiv = renderTotalsTable(aggregate, globalAggregate);
    container.appendChild(tableDiv);
  }
  function classifyResultType(res, detail) {
    const rs = res.toLowerCase();
    if (rs.includes("delay") || rs.includes("speedup") || rs.includes("navigation") || rs === "duration") return "Duration";
    if (rs.includes("ressources") || rs.includes("resources")) return "Resources";
    if (rs.includes("shipwrecks") || rs.includes("ships")) return "Ships";
    if (rs.includes("darkmatter")) return "Dark Matter";
    if (rs.includes("trader")) return "Trader";
    if (rs.includes("fleetloss") || rs.includes("fleetlost") || rs.includes("blackhole")) return "Black hole";
    if (rs.includes("aliens") || rs.includes("pirates") || rs.includes("battle")) return "Battle";
    if (rs.includes("item")) return "Item";
    if (rs.includes("nothing") || rs.includes("none")) return "Nothing";
    if (detail) {
      if (detail.shipsFound || detail.shipswrecks || detail.technologiesgained) return "Ships";
      if (detail.metal || detail.crystal || detail.deuterium) return "Resources";
    }
    return "Nothing";
  }
  function processAnalyticsData(tfExp, monthExp, refDate, trackingDays, tfLf = [], tfCombats = [], tfDebris = [], monthCombats = [], monthDebris = []) {
    const aggregate = {
      totalExpeditions: tfExp.length,
      totalCombats: tfCombats.length,
      totalDebris: tfDebris.length,
      categories: {},
      expeditionsResources: { metal: 0, crystal: 0, deuterium: 0, msu: 0, darkMatter: 0, artifacts: 0 },
      combatsResources: { metal: 0, crystal: 0, deuterium: 0, msu: 0, darkMatter: 0, artifacts: 0 },
      debrisResources: { metal: 0, crystal: 0, deuterium: 0, msu: 0, darkMatter: 0, artifacts: 0 },
      shipsMap: {},
      timeline: [],
      trackingDays
    };
    const daysInMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
    aggregate.timeline = new Array(daysInMonth).fill(0);
    const processMonthTimeline = (items) => {
      items.forEach((item) => {
        const date = new Date(item.timestamp * 1e3);
        const idx = date.getDate() - 1;
        if (idx >= 0 && idx < daysInMonth) {
          aggregate.timeline[idx]++;
        }
      });
    };
    processMonthTimeline(monthExp);
    processMonthTimeline(monthCombats);
    processMonthTimeline(monthDebris);
    tfExp.forEach((exp) => {
      const type = classifyResultType(exp.result || "", exp.resultDetails);
      aggregate.categories[type] = (aggregate.categories[type] || 0) + 1;
      const det = exp.resultDetails;
      if (det && typeof det === "object") {
        if (type === "Resources") {
          aggregate.expeditionsResources.metal += det.metal || 0;
          aggregate.expeditionsResources.crystal += det.crystal || 0;
          aggregate.expeditionsResources.deuterium += det.deuterium || 0;
          aggregate.expeditionsResources.msu += (det.metal || 0) + (det.crystal || 0) * 1.5 + (det.deuterium || 0) * 3;
        }
        if (type === "Dark Matter" || det.darkMatter) {
          aggregate.expeditionsResources.darkMatter += det.darkmatter || det.darkMatter || 0;
        }
        if (det.artifacts) {
          aggregate.expeditionsResources.artifacts += det.artifacts;
        }
        if (type === "Ships") {
          Object.keys(det).forEach((k) => {
            const id = parseInt(k);
            if (!isNaN(id) && id >= 200 && id <= 220) {
              let amount = 0;
              if (typeof det[k] === "object" && det[k] !== null && "amount" in det[k]) {
                amount = parseInt(det[k].amount);
              } else {
                amount = parseInt(det[k]);
              }
              if (!isNaN(amount) && amount > 0) {
                aggregate.shipsMap[id] = (aggregate.shipsMap[id] || 0) + amount;
              }
            }
          });
        }
      }
    });
    tfLf.forEach((disc) => {
      if (disc.discoveryType === "artifacts") {
        aggregate.expeditionsResources.artifacts += disc.artifactsFound || 0;
      }
    });
    tfCombats.forEach((combat) => {
      const loot = combat.loot || {};
      aggregate.combatsResources.metal += loot.metal || 0;
      aggregate.combatsResources.crystal += loot.crystal || 0;
      aggregate.combatsResources.deuterium += loot.deuterium || 0;
      aggregate.combatsResources.msu += (loot.metal || 0) + (loot.crystal || 0) * 1.5 + (loot.deuterium || 0) * 3;
    });
    tfDebris.forEach((harvest) => {
      const res = harvest.recycledResources || {};
      aggregate.debrisResources.metal += res.metal || 0;
      aggregate.debrisResources.crystal += res.crystal || 0;
      aggregate.debrisResources.deuterium += res.deuterium || 0;
      aggregate.debrisResources.msu += (res.metal || 0) + (res.crystal || 0) * 1.5 + (res.deuterium || 0) * 3;
    });
    return aggregate;
  }
  function getMonthBounds(refDate) {
    const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }
  function adjustDate(delta, container, expeditions, lifeforms, combats, debrisHarvests) {
    currentReferenceDate.setMonth(currentReferenceDate.getMonth() + delta);
    renderAnalyticsTab(container, expeditions, lifeforms, combats, debrisHarvests);
  }
  function getTimeframeBounds(tf, refDate) {
    let startMs = 0;
    let endMs = 0;
    let label = "";
    const d = new Date(refDate.getTime());
    if (tf === "M") {
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      startMs = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      endMs = end.getTime();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      label = `${monthNames[d.getMonth()]} 1, ${d.getFullYear()} -> ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    } else if (tf === "W") {
      const day = d.getDay() || 7;
      if (day !== 1) d.setHours(-24 * (day - 1));
      d.setHours(0, 0, 0, 0);
      startMs = d.getTime();
      const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1e3);
      end.setHours(23, 59, 59, 999);
      endMs = end.getTime();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      label = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} -> ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    } else if (tf === "D") {
      d.setHours(0, 0, 0, 0);
      startMs = d.getTime();
      d.setHours(23, 59, 59, 999);
      endMs = d.getTime();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      label = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } else {
      return null;
    }
    return { startMs, endMs, label };
  }
  function getPickerLabel(tf, refDate) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[refDate.getMonth()]} ${refDate.getFullYear()}`;
  }
  function renderTimelineChart(container, timeline, expeditions, lifeforms, combats, debrisHarvests) {
    const maxVal = Math.max(...timeline, 1);
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        height: 80px;
        background: rgba(15, 23, 42, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        backdrop-filter: blur(8px);
    `;
    const bounds = getTimeframeBounds(currentTimeframe, currentReferenceDate);
    timeline.forEach((val, idx) => {
      const pct = val / maxVal * 100;
      const col = document.createElement("div");
      col.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            height: 100%;
            justify-content: flex-end;
            margin: 0 2px;
            position: relative;
        `;
      const barDate = new Date(currentReferenceDate.getFullYear(), currentReferenceDate.getMonth(), idx + 1);
      const barTs = barDate.getTime();
      let inBounds = false;
      if (bounds && currentTimeframe !== "ALL") {
        const startOfDay = new Date(bounds.startMs);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bounds.endMs);
        endOfDay.setHours(23, 59, 59, 999);
        inBounds = barTs >= startOfDay.getTime() && barTs <= endOfDay.getTime();
      }
      const barContainer = document.createElement("div");
      barContainer.className = "nexus-tooltip";
      let tipText = `Day ${idx + 1}: ${val}`;
      barContainer.setAttribute("data-nexus-tooltip", tipText);
      barContainer.style.cssText = `
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.3);
            border-radius: 4px;
            display: flex;
            align-items: flex-end;
            cursor: pointer;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
            padding: 2px;
            ${inBounds ? "border: 2px solid #fbbf24; background: rgba(251, 191, 36, 0.1); box-shadow: 0 0 15px rgba(251, 191, 36, 0.2); z-index: 5;" : "border: 1px solid rgba(255,255,255,0.05);"}
            transition: all 0.2s;
        `;
      barContainer.onmouseover = () => {
        barContainer.style.background = inBounds ? "rgba(251, 191, 36, 0.2)" : "rgba(255,255,255,0.1)";
        barContainer.style.transform = "translateY(-2px)";
      };
      barContainer.onmouseout = () => {
        barContainer.style.background = inBounds ? "rgba(251, 191, 36, 0.1)" : "rgba(0,0,0,0.3)";
        barContainer.style.transform = "none";
      };
      barContainer.onclick = () => {
        currentTimeframe = "D";
        currentReferenceDate = new Date(currentReferenceDate.getFullYear(), currentReferenceDate.getMonth(), idx + 1);
        renderAnalyticsTab(container, expeditions, lifeforms, combats, debrisHarvests);
      };
      const fill = document.createElement("div");
      fill.style.cssText = `
            width: 100%;
            height: ${pct}%;
            background: ${val > 0 ? "#6ee7b7" : "transparent"};
            border-radius: 2px;
            transition: height 0.3s;
        `;
      barContainer.appendChild(fill);
      const lbl = document.createElement("div");
      lbl.style.cssText = `font-size: 10px; color: #64748b; margin-top: 6px; font-weight: 600;`;
      lbl.textContent = (idx + 1).toString();
      col.appendChild(barContainer);
      col.appendChild(lbl);
      wrapper.appendChild(col);
    });
    container.appendChild(wrapper);
  }
  function renderPieChartCard(aggregate) {
    const card = document.createElement("div");
    card.style.cssText = `
        flex: 1.2;
        background: rgba(15, 23, 42, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 24px;
        display: flex;
        gap: 32px;
        align-items: center;
        backdrop-filter: blur(8px);
    `;
    const total = aggregate.totalExpeditions;
    const sortedCats = Object.entries(aggregate.categories).sort((a, b) => b[1] - a[1]);
    let conicGradients = "";
    let currPct = 0;
    sortedCats.forEach(([cat, val]) => {
      const pct = val / Math.max(total, 1) * 100;
      const color = CATEGORY_COLORS[cat] || "#94a3b8";
      if (conicGradients.length > 0) conicGradients += ", ";
      conicGradients += `${color} ${currPct}% ${currPct + pct}%`;
      currPct += pct;
    });
    if (!conicGradients) conicGradients = "rgba(255,255,255,0.05) 0% 100%";
    const chartWrapper = document.createElement("div");
    chartWrapper.style.cssText = `
        position: relative;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: conic-gradient(${conicGradients});
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;
    const innerChart = document.createElement("div");
    innerChart.style.cssText = `
        width: 110px;
        height: 110px;
        border-radius: 50%;
        background: #1e293b;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
    `;
    innerChart.innerHTML = `
        <div style="font-size: 20px; font-weight: 700; color: #f8fafc;">${formatExactNumber$1(total)}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Expeditions</div>
    `;
    chartWrapper.appendChild(innerChart);
    card.appendChild(chartWrapper);
    const legendWrapper = document.createElement("div");
    legendWrapper.style.cssText = `display: flex; flex-direction: column; gap: 8px; flex-grow: 1;`;
    sortedCats.forEach(([cat, val]) => {
      const pctl = (val / Math.max(total, 1) * 100).toFixed(2);
      const color = CATEGORY_COLORS[cat] || "#94a3b8";
      const iconRaw = CATEGORY_ICONS[cat] || "";
      const legItem = document.createElement("div");
      legItem.style.cssText = `display: flex; align-items: center; justify-content: space-between; font-size: 13px;`;
      legItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; color: #e2e8f0; font-weight: 500;">
                <span style="color: ${color}; display: flex;">${iconRaw}</span>
                ${cat}
            </div>
            <div style="display: flex; gap: 12px; align-items: baseline;">
                <span style="font-weight: 700; color: #f8fafc;">${formatExactNumber$1(val)}</span>
                <span style="font-size: 11px; color: #64748b; width: 40px; text-align: right;">${pctl}%</span>
            </div>
        `;
      legendWrapper.appendChild(legItem);
    });
    card.appendChild(legendWrapper);
    return card;
  }
  function renderShipsCard(aggregate) {
    const card = document.createElement("div");
    card.className = "custom-scrollbar";
    card.style.cssText = `
        flex: 1;
        background: rgba(15, 23, 42, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        backdrop-filter: blur(8px);
        overflow-y: auto;
        min-height: 180px;
        transition: border-color 0.3s;
    `;
    const sortedShips = Object.entries(aggregate.shipsMap).sort((a, b) => b[1] - a[1]);
    if (sortedShips.length === 0) {
      card.innerHTML = `<div style="color: #64748b; text-align: center; margin-top: auto; margin-bottom: auto;">No ships found in this period.</div>`;
      return card;
    }
    const grid = document.createElement("div");
    grid.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    `;
    sortedShips.forEach(([shipId, count]) => {
      let sName = "Ship " + shipId;
      let sIcon = "";
      const shipInfo = SHIP_DATA.find((s) => s.id.toString() === shipId);
      if (shipInfo) {
        sName = shipInfo.name;
        sIcon = shipInfo.icon;
      }
      const id = parseInt(shipId);
      let shipConfig = {
        color: "#ef4444",
        glow: "rgba(239, 68, 68, 0.2)",
        border: "rgba(239, 68, 68, 0.3)"
      };
      if (id === 202 || id === 203 || id === 210 || id === 219 || id === 208 || id === 209) {
        shipConfig = {
          color: "#00f2ff",
          glow: "rgba(0, 242, 255, 0.2)",
          border: "rgba(0, 242, 255, 0.3)"
        };
      } else if (id === 204 || id === 205 || id === 206) {
        shipConfig = {
          color: "#f59e0b",
          glow: "rgba(245, 158, 11, 0.2)",
          border: "rgba(245, 158, 11, 0.3)"
        };
      }
      const item = document.createElement("div");
      item.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.04);
            border-left: 3px solid ${shipConfig.color};
            border-radius: 6px;
            padding: 8px 14px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
        `;
      item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                ${sIcon ? `<img src="${chrome.runtime.getURL(sIcon)}" style="width: 22px; height: 22px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); filter: grayscale(0.15); transition: all 0.3s;"/>` : ""}
                <div style="font-size: 11.5px; color: #cbd5e1; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; transition: color 0.3s;">${sName}</div>
            </div>
            <div style="font-weight: 700; color: ${shipConfig.color}; font-size: 13px; text-shadow: 0 0 8px ${shipConfig.glow}; transition: all 0.3s; padding-left: 4px;">${formatNumber$1(count)}</div>
        `;
      const img = item.querySelector("img");
      const text = item.querySelector("div > div");
      item.onmouseover = () => {
        item.style.background = "rgba(255, 255, 255, 0.05)";
        item.style.borderColor = shipConfig.border;
        item.style.borderLeftColor = shipConfig.color;
        item.style.boxShadow = `0 4px 15px ${shipConfig.glow}, inset 0 0 10px rgba(255,255,255,0.01)`;
        item.style.transform = "translateY(-1px)";
        if (img) {
          img.style.filter = "none";
          img.style.borderColor = shipConfig.color;
        }
        if (text) {
          text.style.color = "#ffffff";
        }
      };
      item.onmouseout = () => {
        item.style.background = "rgba(255,255,255,0.02)";
        item.style.borderColor = "rgba(255,255,255,0.04)";
        item.style.borderLeftColor = shipConfig.color;
        item.style.boxShadow = "none";
        item.style.transform = "none";
        if (img) {
          img.style.filter = "grayscale(0.15)";
          img.style.borderColor = "rgba(255,255,255,0.1)";
        }
        if (text) {
          text.style.color = "#cbd5e1";
        }
      };
      grid.appendChild(item);
    });
    card.appendChild(grid);
    return card;
  }
  function renderTotalsTable(ag, globalAg) {
    const card = document.createElement("div");
    card.style.cssText = `
        background: rgba(15, 23, 42, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        overflow: hidden;
        backdrop-filter: blur(8px);
    `;
    const t = document.createElement("table");
    t.style.cssText = `width: 100%; border-collapse: collapse; text-align: right; color: #e2e8f0; font-size: 13px;`;
    const tr = document.createElement("tr");
    tr.style.cssText = `background: rgba(0,0,0,0.3); border-bottom: 2px solid rgba(255,255,255,0.05);`;
    const hdrs = [
      "",
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
      '<img src="' + chrome.runtime.getURL("icons/resources/metal-icon-medium.jpg") + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">',
      '<img src="' + chrome.runtime.getURL("icons/resources/crystal-icon-medium.jpg") + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">',
      '<img src="' + chrome.runtime.getURL("icons/resources/deuterium-icon-medium.jpg") + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">',
      '<span style="color: #94a3b8; font-weight: 800; font-size: 14px;">MSU</span>',
      '<img src="' + chrome.runtime.getURL("icons/resources/dark-matter-icon-medium.jpg") + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">',
      '<img src="' + chrome.runtime.getURL("icons/lifeforms/artifact-icon-large.png") + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">'
    ];
    hdrs.forEach((h) => {
      const th = document.createElement("th");
      th.style.cssText = `padding: 12px; border-right: 1px solid rgba(255,255,255,0.03); ${h ? "text-align: center;" : "width: 120px;"}`;
      th.innerHTML = h;
      tr.appendChild(th);
    });
    t.appendChild(tr);
    const expedRow = document.createElement("tr");
    expedRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #94a3b8; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.05);">Expeditions</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; border-bottom: 2px solid rgba(255,255,255,0.05); font-weight: bold;">${formatNumber$1(ag.totalExpeditions) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.expeditionsResources.metal) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.expeditionsResources.crystal) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.expeditionsResources.deuterium) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.expeditionsResources.msu) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatExactNumber$1(ag.expeditionsResources.darkMatter) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatExactNumber$1(ag.expeditionsResources.artifacts) || "-"}</td>
    `;
    t.appendChild(expedRow);
    const combatRow = document.createElement("tr");
    combatRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #94a3b8; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.05);">Combats</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; border-bottom: 2px solid rgba(255,255,255,0.05); font-weight: bold;">${formatNumber$1(ag.totalCombats) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.combatsResources.metal) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.combatsResources.crystal) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.combatsResources.deuterium) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.combatsResources.msu) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7; border-bottom: 2px solid rgba(255,255,255,0.05);">-</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24; border-bottom: 2px solid rgba(255,255,255,0.05);">-</td>
    `;
    t.appendChild(combatRow);
    const debrisRow = document.createElement("tr");
    debrisRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #94a3b8; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.05);">Debris Fields</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; border-bottom: 2px solid rgba(255,255,255,0.05); font-weight: bold;">${formatNumber$1(ag.totalDebris) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.debrisResources.metal) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.debrisResources.crystal) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.debrisResources.deuterium) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(ag.debrisResources.msu) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7; border-bottom: 2px solid rgba(255,255,255,0.05);">-</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24; border-bottom: 2px solid rgba(255,255,255,0.05);">-</td>
    `;
    t.appendChild(debrisRow);
    const totalEvents = ag.totalExpeditions + ag.totalCombats + ag.totalDebris;
    const totalMetal = ag.expeditionsResources.metal + ag.combatsResources.metal + ag.debrisResources.metal;
    const totalCrystal = ag.expeditionsResources.crystal + ag.combatsResources.crystal + ag.debrisResources.crystal;
    const totalDeuterium = ag.expeditionsResources.deuterium + ag.combatsResources.deuterium + ag.debrisResources.deuterium;
    const totalMsu = ag.expeditionsResources.msu + ag.combatsResources.msu + ag.debrisResources.msu;
    const totalDarkMatter = ag.expeditionsResources.darkMatter;
    const totalArtifacts = ag.expeditionsResources.artifacts;
    const dataRow = document.createElement("tr");
    dataRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #f8fafc; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.05);">Total</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; font-weight: bold; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(totalEvents) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(totalMetal) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(totalCrystal) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(totalDeuterium) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber$1(totalMsu) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatExactNumber$1(totalDarkMatter) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatExactNumber$1(totalArtifacts) || "-"}</td>
    `;
    t.appendChild(dataRow);
    const globalEvents = globalAg.totalExpeditions + globalAg.totalCombats + globalAg.totalDebris;
    const globalMetal = globalAg.expeditionsResources.metal + globalAg.combatsResources.metal + globalAg.debrisResources.metal;
    const globalCrystal = globalAg.expeditionsResources.crystal + globalAg.combatsResources.crystal + globalAg.debrisResources.crystal;
    const globalDeuterium = globalAg.expeditionsResources.deuterium + globalAg.combatsResources.deuterium + globalAg.debrisResources.deuterium;
    const globalMsu = globalAg.expeditionsResources.msu + globalAg.combatsResources.msu + globalAg.debrisResources.msu;
    const globalDarkMatter = globalAg.expeditionsResources.darkMatter;
    const globalArtifacts = globalAg.expeditionsResources.artifacts;
    const avgDenominator = globalAg.trackingDays;
    const avgRow = document.createElement("tr");
    avgRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #f8fafc; border-right: 1px solid rgba(255,255,255,0.05);">Average</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; font-weight: bold;">${formatNumber$1(globalEvents / avgDenominator, 0) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C;">${formatNumber$1(Math.round(globalMetal / avgDenominator), 0) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6;">${formatNumber$1(Math.round(globalCrystal / avgDenominator), 0) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159;">${formatNumber$1(Math.round(globalDeuterium / avgDenominator), 0) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">${formatNumber$1(Math.round(globalMsu / avgDenominator), 0) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7;">${formatExactNumber$1(Math.round(globalDarkMatter / avgDenominator)) || "-"}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24;">${formatExactNumber$1(Math.round(globalArtifacts / avgDenominator)) || "-"}</td>
    `;
    t.appendChild(avgRow);
    card.appendChild(t);
    return card;
  }
  console.log("OGame Nexus: Content script loaded.");
  function safeSendMessage(message) {
    var _a;
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage(message, () => {
          var _a2;
          const lastError = chrome.runtime.lastError;
          if (lastError && ((_a2 = lastError.message) == null ? void 0 : _a2.includes("context invalidated"))) {
            console.warn("OGame Nexus: Extension context invalidated. Please refresh the page.");
          }
        });
      }
    } catch (e) {
      if ((_a = e.message) == null ? void 0 : _a.includes("context invalidated")) {
        console.warn("OGame Nexus: Extension context invalidated. Please refresh the page.");
      } else {
        console.error("OGame Nexus: Error sending message", e);
      }
    }
  }
  function getMetaContent(name) {
    var _a;
    return ((_a = document.querySelector(`meta[name="${name}"]`)) == null ? void 0 : _a.getAttribute("content")) || null;
  }
  function scrapePlayerClass() {
    const classNode = document.querySelector("#characterclass a.tooltipHTML");
    if (!classNode) return void 0;
    const tooltipTitle = classNode.getAttribute("data-tooltip-title") || "";
    if (tooltipTitle.includes("Collector")) return 1;
    if (tooltipTitle.includes("Warrior")) return 2;
    if (tooltipTitle.includes("Discoverer")) return 3;
    return void 0;
  }
  function scrapeOfficers() {
    const officers = {
      hasCommander: false,
      hasAdmiral: false,
      hasEngineer: false,
      hasGeologist: false,
      hasTechnocrat: false
    };
    const officersEl = document.querySelector("#officers");
    if (officersEl) {
      const checkActive = (selector) => {
        const el = officersEl.querySelector(selector);
        if (!el) return false;
        if (el.classList.contains("on")) return true;
        const title = el.getAttribute("data-tooltip-title") || "";
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("active") || lowerTitle.includes("still active")) {
          return true;
        }
        return false;
      };
      officers.hasCommander = checkActive("a.commander");
      officers.hasAdmiral = checkActive("a.admiral");
      officers.hasEngineer = checkActive("a.engineer");
      officers.hasGeologist = checkActive("a.geologist");
      officers.hasTechnocrat = checkActive("a.technocrat");
    }
    return officers;
  }
  function scrapeAllianceClass() {
    const url = window.location.href;
    if (!url.includes("page=ingame") || !url.includes("component=resourcesettings")) return void 0;
    const allyRow = document.querySelector('tr[data-techid="1005"]');
    if (!allyRow) return void 0;
    const classEl = allyRow.querySelector(".allianceclass");
    if (!classEl) return 0;
    if (classEl.classList.contains("trader")) return 1;
    if (classEl.classList.contains("researcher")) return 2;
    if (classEl.classList.contains("warrior")) return 3;
    return 0;
  }
  function scrapePlanetList() {
    const planets = [];
    const planetNodes = document.querySelectorAll("#planetList .smallplanet");
    planetNodes.forEach((node) => {
      var _a, _b, _c, _d;
      const planetId = node.id.replace("planet-", "");
      const planetName = ((_a = node.querySelector(".planet-name")) == null ? void 0 : _a.textContent) || "Unknown";
      const planetCoordsRaw = ((_b = node.querySelector(".planet-koords")) == null ? void 0 : _b.textContent) || "";
      const planetCoords = planetCoordsRaw.replace(/[\[\]]/g, "");
      const planetImg = ((_c = node.querySelector(".planetPic")) == null ? void 0 : _c.getAttribute("src")) || "";
      planets.push({
        id: planetId,
        name: planetName,
        coords: planetCoords,
        type: "planet",
        imgUrl: planetImg,
        lastUpdated: Date.now()
      });
      const moonLink = node.querySelector(".moonlink");
      if (moonLink) {
        const href = moonLink.getAttribute("href") || "";
        const cpMatch = href.match(/cp=(\d+)/);
        if (cpMatch) {
          const moonId = cpMatch[1];
          let moonName = "Moon";
          const tooltip = moonLink.getAttribute("data-tooltip-title");
          if (tooltip) {
            const nameMatch = tooltip.match(/<b>(.*?)\[/);
            if (nameMatch) moonName = nameMatch[1].trim();
          }
          const moonImg = ((_d = moonLink.querySelector(".icon-moon")) == null ? void 0 : _d.getAttribute("src")) || "";
          planets.push({
            id: moonId,
            name: moonName,
            coords: planetCoords,
            type: "moon",
            imgUrl: moonImg,
            parentPlanetId: planetId,
            lastUpdated: Date.now()
          });
        }
      }
    });
    return planets;
  }
  function getActivePlanetId() {
    const url = window.location.href;
    const cpMatch = url.match(/[?&]cp=(\d+)/);
    if (cpMatch) return cpMatch[1];
    const activePlanetNode = document.querySelector("#planetList .smallplanet.active, #planetList .smallplanet.active_home");
    if (activePlanetNode) return activePlanetNode.id.replace("planet-", "");
    const activeLink = document.querySelector("#planetList a.active");
    if (activeLink) {
      const href = activeLink.getAttribute("href") || "";
      const m = href.match(/cp=(\d+)/);
      if (m) return m[1];
    }
    return null;
  }
  function scrapeLifeformId() {
    const lfIconNode = document.querySelector("#lifeform .lifeform-item-icon");
    if (lfIconNode) {
      const classList = lfIconNode.className;
      const match = classList.match(/lifeform(\d+)/);
      if (match) return parseInt(match[1]);
    }
    return null;
  }
  function scrapeOverviewData() {
    const url = window.location.href;
    if (!url.includes("page=ingame") || !url.includes("component=overview")) return null;
    const getXPathText = (xpath) => {
      var _a, _b;
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return ((_b = (_a = result.singleNodeValue) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) || null;
    };
    const diameterText = getXPathText('//*[@id="diameterContentField"]');
    let diameter, fieldsUsed, fieldsTotal;
    if (diameterText) {
      const dMatch = diameterText.match(/([\d,.]+)\s*km/i);
      if (dMatch) diameter = parseInt(dMatch[1].replace(/,/g, ""));
      const fMatch = diameterText.match(/(\d+)\s*\/\s*(\d+)/);
      if (fMatch) {
        fieldsUsed = parseInt(fMatch[1]);
        fieldsTotal = parseInt(fMatch[2]);
      }
    }
    const tempText = getXPathText('//*[@id="temperatureContentField"]');
    let tempMin, tempMax;
    if (tempText) {
      const temps = tempText.match(/(-?\d+)/g);
      if (temps && temps.length >= 2) {
        tempMin = parseInt(temps[0]);
        tempMax = parseInt(temps[1]);
      }
    }
    const honorText = getXPathText('//*[@id="honorContentField"]');
    let honorPoints;
    if (honorText) {
      honorPoints = parseInt(honorText.replace(/[,.]/g, ""));
    }
    const scoreText = getXPathText('//*[@id="scoreContentField"]');
    let score, rank, totalPlayers;
    if (scoreText) {
      const sMatch = scoreText.match(/([\d,.]+)\s*\(Place\s*(\d+)\s*of\s*(\d+)\)/);
      if (sMatch) {
        score = parseInt(sMatch[1].replace(/[,.]/g, ""));
        rank = parseInt(sMatch[2]);
        totalPlayers = parseInt(sMatch[3]);
      }
    }
    const activeItems = [];
    const boosters = { metal: 0, crystal: 0, deuterium: 0 };
    const activeItemsEl = document.querySelector(".active_items");
    if (activeItemsEl) {
      const itemContainers = activeItemsEl.querySelectorAll("div[data-uuid]");
      itemContainers.forEach((container) => {
        const itemEl = container.querySelector("a.active_item");
        if (!itemEl) return;
        const tooltipTitle = itemEl.getAttribute("data-tooltip-title") || "";
        const titleParts = tooltipTitle.split("|");
        const title = titleParts[0].trim();
        const bodyHtml = titleParts.slice(1).join("|");
        const lowerTitle = title.toLowerCase();
        let type = "other";
        let bonus = 0;
        if (lowerTitle.includes("metal booster")) {
          type = "metal";
          if (lowerTitle.includes("platinum")) bonus = 0.4;
          else if (lowerTitle.includes("gold")) bonus = 0.3;
          else if (lowerTitle.includes("silver")) bonus = 0.2;
          else if (lowerTitle.includes("bronze")) bonus = 0.1;
        } else if (lowerTitle.includes("crystal booster")) {
          type = "crystal";
          if (lowerTitle.includes("platinum")) bonus = 0.4;
          else if (lowerTitle.includes("gold")) bonus = 0.3;
          else if (lowerTitle.includes("silver")) bonus = 0.2;
          else if (lowerTitle.includes("bronze")) bonus = 0.1;
        } else if (lowerTitle.includes("deuterium booster")) {
          type = "deuterium";
          if (lowerTitle.includes("platinum")) bonus = 0.4;
          else if (lowerTitle.includes("gold")) bonus = 0.3;
          else if (lowerTitle.includes("silver")) bonus = 0.2;
          else if (lowerTitle.includes("bronze")) bonus = 0.1;
        } else if (lowerTitle.includes("expedition resource booster")) {
          type = "expedition_res";
        } else if (lowerTitle.includes("resource booster")) {
          type = "resource";
        } else if (lowerTitle.includes("expedition slots")) {
          type = "expedition_slots";
        } else if (lowerTitle.includes("fleet slots")) {
          type = "fleet_slots";
        } else if (lowerTitle.includes("planet fields")) {
          type = "fields";
        }
        const titlePercentMatch = title.match(/\((\d+)%\)/);
        if (titlePercentMatch) {
          bonus = parseInt(titlePercentMatch[1], 10) / 100;
        }
        let rarity = "";
        const elClass = itemEl.className || "";
        const parentClass = container.className || "";
        const rarityMatch = elClass.match(/r_(\w+)/) || parentClass.match(/r_(\w+)/);
        if (rarityMatch) rarity = rarityMatch[1];
        let timeRemaining = "";
        let expiryTimestamp;
        let duration = "";
        let isPermanent = false;
        const decodedHtml = bodyHtml.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#43;/g, "+");
        const restTimeMatch = decodedHtml.match(/class="restTime"[^>]*>Time remaining:\s*([^<]+)/i) || decodedHtml.match(/Time remaining:\s*([^<]+)/i);
        if (restTimeMatch) {
          timeRemaining = restTimeMatch[1].trim();
          const secondsRemaining = parseOgameTime(timeRemaining);
          if (secondsRemaining > 0) {
            expiryTimestamp = Date.now() + secondsRemaining * 1e3;
          }
        }
        const durationMatch = decodedHtml.match(/Duration:\s*([^<]+)/i);
        if (durationMatch) {
          duration = durationMatch[1].trim();
          if (duration.toLowerCase().includes("permanent")) {
            isPermanent = true;
          }
        }
        activeItems.push({
          name: title,
          title,
          rarity,
          timeRemaining,
          expiryTimestamp,
          duration,
          isPermanent,
          bonus,
          type
        });
        if (bonus > 0) {
          if (type === "metal") boosters.metal += bonus;
          else if (type === "crystal") boosters.crystal += bonus;
          else if (type === "deuterium") boosters.deuterium += bonus;
          else if (type === "resource") {
            boosters.metal += bonus;
            boosters.crystal += bonus;
            boosters.deuterium += bonus;
          }
        }
      });
    }
    return {
      planetData: {
        diameter,
        fieldsUsed,
        fieldsTotal,
        tempMin,
        tempMax,
        ...activeItemsEl ? { activeItems, boosters } : {}
      },
      accountData: {
        score,
        rank,
        totalPlayers,
        honorPoints
      }
    };
  }
  function scrapeProductionData() {
    const url = window.location.href;
    if (!url.includes("page=ingame") || !url.includes("component=resourcesettings")) return null;
    const getSummaryVal = (idx) => {
      var _a;
      let el = document.querySelector(`tr.summaryHourly td[data-resourceidx="${idx}"]`) || document.querySelector(`tr.summary.hourly td[data-resourceidx="${idx}"]`) || document.querySelector(`tr.summary td[data-resourceidx="${idx}"]`);
      if (!el) {
        const allRows = Array.from(document.querySelectorAll("tr"));
        const hourlyRow = allRows.find((r) => {
          var _a2;
          const txt = ((_a2 = r.textContent) == null ? void 0 : _a2.toLowerCase()) || "";
          return txt.includes("total hourly production") || txt.includes("total production per hour") || txt.includes("producción horaria total") || // Spanish
          txt.includes("stündliche produktion insgesamt");
        });
        if (hourlyRow) {
          const tds = hourlyRow.querySelectorAll("td");
          if (tds.length > idx + 1) {
            el = tds[idx + 1];
          }
        }
      }
      if (!el) return null;
      const tooltipNode = el.querySelector("[data-tooltip-title]") || el;
      const tooltip = tooltipNode.getAttribute("data-tooltip-title") || tooltipNode.getAttribute("title");
      if (tooltip) {
        const rawVal = tooltip.replace(/<[^>]*>/g, "").trim();
        const hasComma = rawVal.includes(",");
        const hasDot = rawVal.includes(".");
        let cleanVal = rawVal;
        if (hasComma && hasDot) {
          const lastComma = rawVal.lastIndexOf(",");
          const lastDot = rawVal.lastIndexOf(".");
          if (lastDot > lastComma) {
            cleanVal = rawVal.substring(0, lastDot);
          } else {
            cleanVal = rawVal.substring(0, lastComma);
          }
        } else if (hasDot && !hasComma) {
          if (/\.\d{3}$/.test(rawVal)) {
            cleanVal = rawVal.substring(0, rawVal.lastIndexOf("."));
          } else if (/\.\d{1,2}$/.test(rawVal)) {
            cleanVal = rawVal.substring(0, rawVal.lastIndexOf("."));
          }
        } else if (hasComma && !hasDot) {
          if (/,\d{3}$/.test(rawVal)) {
            cleanVal = rawVal.substring(0, rawVal.lastIndexOf(","));
          } else if (/,\d{1,2}$/.test(rawVal)) {
            cleanVal = rawVal.substring(0, rawVal.lastIndexOf(","));
          }
        }
        const val = parseInt(cleanVal.replace(/\D/g, ""));
        if (!isNaN(val)) return val;
      }
      const textVal = ((_a = el.textContent) == null ? void 0 : _a.trim()) || "";
      const textMatch = textVal.match(/[\d,.\s\w]+/g);
      if (textMatch) {
        let rawVal = textMatch.join("").toLowerCase().trim();
        let multiplier = 1;
        if (rawVal.endsWith("k")) {
          multiplier = 1e3;
          rawVal = rawVal.slice(0, -1);
        } else if (rawVal.endsWith("m") || rawVal.endsWith("mn")) {
          multiplier = 1e6;
          rawVal = rawVal.replace(/mn$/, "").replace(/m$/, "");
        } else if (rawVal.endsWith("b") || rawVal.endsWith("bn")) {
          multiplier = 1e9;
          rawVal = rawVal.replace(/bn$/, "").replace(/b$/, "");
        }
        const normalized = rawVal.replace(",", ".").replace(/[^\d.]/g, "");
        const floatVal = parseFloat(normalized);
        const val = Math.floor(floatVal * multiplier);
        if (!isNaN(val)) return val;
      }
      return null;
    };
    const metalVal = getSummaryVal(0);
    const crystalVal = getSummaryVal(1);
    const deuteriumVal = getSummaryVal(2);
    if (metalVal === null && crystalVal === null && deuteriumVal === null) return null;
    const rows = Array.from(document.querySelectorAll("tr.alt"));
    const storageRow = rows.find((r) => {
      var _a;
      return (_a = r.textContent) == null ? void 0 : _a.includes("Storage capacity");
    });
    let metalStorage, crystalStorage, deuteriumStorage;
    if (storageRow) {
      const tds = storageRow.querySelectorAll("td.normalmark");
      if (tds.length >= 3) {
        const getTdVal = (td) => {
          var _a;
          const span = td.querySelector("span[data-tooltip-title]");
          const tooltip = (span == null ? void 0 : span.getAttribute("data-tooltip-title")) || td.getAttribute("data-tooltip-title") || td.getAttribute("title");
          if (tooltip) {
            const m = tooltip.match(/[\d,.\s]+/);
            if (m) return parseInt(m[0].replace(/\D/g, "")) || 0;
          }
          const txt = ((_a = td.textContent) == null ? void 0 : _a.trim()) || "";
          const tm = txt.match(/[\d,.\s]+/);
          if (tm) return parseInt(tm[0].replace(/\D/g, "")) || 0;
          return 0;
        };
        metalStorage = getTdVal(tds[0]);
        crystalStorage = getTdVal(tds[1]);
        deuteriumStorage = getTdVal(tds[2]);
      }
    }
    return {
      metal: metalVal || 0,
      crystal: crystalVal || 0,
      deuterium: deuteriumVal || 0,
      metalCapacity: metalStorage,
      crystalCapacity: crystalStorage,
      deuteriumCapacity: deuteriumStorage,
      lastUpdated: Date.now()
    };
  }
  function scrapeSuppliesData() {
    const url = window.location.href;
    if (!url.includes("page=ingame") || !url.includes("component=supplies")) return null;
    const data = {};
    const buildingNodes = document.querySelectorAll("#technologies li.technology");
    buildingNodes.forEach((node) => {
      const techId = parseInt(node.getAttribute("data-technology") || "0");
      const levelNode = node.querySelector(".level");
      if (techId > 0 && levelNode) {
        const level = parseInt(levelNode.getAttribute("data-value") || "0");
        if (techId === 1) data.metalMine = level;
        else if (techId === 2) data.crystalMine = level;
        else if (techId === 3) data.deuteriumMine = level;
        else if (techId === 4) data.solarPlant = level;
        else if (techId === 12) data.fusionReactor = level;
        else if (techId === 212) data.solarSatellites = level;
        else if (techId === 217) data.crawlers = level;
        else if (techId === 22) data.metalStorage = level;
        else if (techId === 23) data.crystalStorage = level;
        else if (techId === 24) data.deuteriumStorage = level;
      }
    });
    return Object.keys(data).length > 0 ? data : null;
  }
  function scrapeResearchLevels() {
    const url = window.location.href;
    if (!url.includes("component=research")) return null;
    const researches = [];
    const techNodes = document.querySelectorAll("#technologies li.technology");
    techNodes.forEach((node) => {
      const techId = parseInt(node.getAttribute("data-technology") || "0");
      const levelNode = node.querySelector(".level");
      if (techId > 0 && levelNode) {
        const level = parseInt(levelNode.getAttribute("data-value") || "0");
        researches.push({ id: techId, level });
      }
    });
    return researches.length > 0 ? researches : null;
  }
  function scrapeLifeformSetup() {
    const url = window.location.href;
    if (!url.includes("component=lfresearch")) return null;
    const techSetup = [];
    const techNodes = document.querySelectorAll("#technologies li.technology");
    techNodes.forEach((node) => {
      const ogTechId = node.getAttribute("data-technology") || "";
      const lfId = parseInt(ogTechId[1]);
      const slotNumber = parseInt(ogTechId.substring(3, 5), 10);
      if (isNaN(lfId) || isNaN(slotNumber)) return;
      const internalTechId = (slotNumber - 1) * 4 + lfId;
      const levelNode = node.querySelector(".level");
      if (levelNode) {
        const level = parseInt(levelNode.getAttribute("data-value") || "0");
        techSetup.push({ slotNumber, selectedTechId: internalTechId, level });
      }
    });
    techSetup.sort((a, b) => a.slotNumber - b.slotNumber);
    return techSetup.length > 0 ? techSetup : null;
  }
  function scrapeLifeformExperience() {
    const url = window.location.href;
    if (!url.includes("component=lfbonuses")) return null;
    const experience = [];
    const items = document.querySelectorAll("lifeform-item");
    items.forEach((item) => {
      const icon = item.querySelector(".lifeform-item-icon");
      if (icon) {
        const lfMatch = icon.className.match(/lifeform(\d+)/);
        if (lfMatch) {
          const lifeformId = parseInt(lfMatch[1]);
          let level = 0;
          let currentExp = 0;
          let nextLevelExp = 100;
          let found = false;
          const langLvlPattern = "(?:Level|Stufe|Nivel|Nível|Niveau|Nivå|Livello|Poziom|Stupeň|Seviye|Уровень|Ур\\.?|Szint|Taso|Επίπεδο|Razina|Nivo|Lvl|Lv\\.?)";
          const xpRegex = new RegExp(`${langLvlPattern}\\s+(\\d+):\\s*(\\d+)\\s*\\/\\s*(\\d+)`, "i");
          const lvlRegex = new RegExp(`${langLvlPattern}\\s*(\\d+)`, "i");
          const currentLevelNode = item.querySelector(".currentlevel");
          if (currentLevelNode) {
            const text = currentLevelNode.textContent || "";
            const match = text.match(lvlRegex);
            if (match) {
              level = parseInt(match[1], 10);
              found = true;
              const xpBar = item.querySelector(".xpbar");
              if (xpBar) {
                const tooltipTitle = xpBar.getAttribute("data-tooltip-title") || xpBar.getAttribute("title");
                if (tooltipTitle) {
                  const xpMatch = tooltipTitle.match(xpRegex);
                  if (xpMatch) {
                    currentExp = parseInt(xpMatch[2], 10);
                    nextLevelExp = parseInt(xpMatch[3], 10);
                  }
                }
              }
              if (level >= 100) {
                currentExp = 100;
                nextLevelExp = 100;
              }
            }
          }
          if (!found) {
            const xpBar = item.querySelector(".xpbar");
            if (xpBar) {
              const tooltipTitle = xpBar.getAttribute("data-tooltip-title");
              if (tooltipTitle) {
                const xpMatch = tooltipTitle.match(xpRegex);
                if (xpMatch) {
                  level = parseInt(xpMatch[1], 10);
                  currentExp = parseInt(xpMatch[2], 10);
                  nextLevelExp = parseInt(xpMatch[3], 10);
                  found = true;
                } else {
                  const lvlMatch = tooltipTitle.match(lvlRegex);
                  if (lvlMatch) {
                    level = parseInt(lvlMatch[1], 10);
                    currentExp = level >= 100 ? 100 : 0;
                    nextLevelExp = level >= 100 ? 100 : 100;
                    found = true;
                  }
                }
              }
            }
          }
          if (!found) {
            const tooltipElements = item.querySelectorAll("[data-tooltip-title], [title]");
            for (const el of tooltipElements) {
              const title = el.getAttribute("data-tooltip-title") || el.getAttribute("title");
              if (title) {
                const xpMatch = title.match(xpRegex);
                if (xpMatch) {
                  level = parseInt(xpMatch[1], 10);
                  currentExp = parseInt(xpMatch[2], 10);
                  nextLevelExp = parseInt(xpMatch[3], 10);
                  found = true;
                  break;
                }
                const match = title.match(lvlRegex);
                if (match) {
                  level = parseInt(match[1], 10);
                  currentExp = level >= 100 ? 100 : 0;
                  nextLevelExp = level >= 100 ? 100 : 100;
                  found = true;
                  break;
                }
              }
            }
          }
          if (!found) {
            const text = item.textContent || "";
            const xpMatch = text.match(xpRegex);
            if (xpMatch) {
              level = parseInt(xpMatch[1], 10);
              currentExp = parseInt(xpMatch[2], 10);
              nextLevelExp = parseInt(xpMatch[3], 10);
              found = true;
            } else {
              const match = text.match(lvlRegex);
              if (match) {
                level = parseInt(match[1], 10);
                currentExp = level >= 100 ? 100 : 0;
                nextLevelExp = level >= 100 ? 100 : 100;
                found = true;
              }
            }
          }
          if (found || lifeformId > 0) {
            experience.push({
              lifeformId,
              level,
              currentExp,
              nextLevelExp
            });
          }
        }
      }
    });
    return experience.length > 0 ? experience : null;
  }
  function scrapeLifeformBuildings() {
    const url = window.location.href;
    if (!url.includes("component=lfbuildings")) return null;
    const buildings = [];
    const buildingNodes = document.querySelectorAll("#technologies li.technology");
    buildingNodes.forEach((node) => {
      const techId = parseInt(node.getAttribute("data-technology") || "0");
      const name = node.getAttribute("aria-label") || "Unknown Building";
      const levelNode = node.querySelector(".level");
      if (techId > 0 && levelNode) {
        const level = parseInt(levelNode.getAttribute("data-value") || "0");
        buildings.push({ id: techId, name, level });
      }
    });
    return buildings.length > 0 ? buildings : null;
  }
  function scrapeFacilitiesData() {
    const url = window.location.href;
    if (!url.includes("page=ingame") || !url.includes("component=facilities")) return null;
    const buildings = [];
    const buildingNodes = document.querySelectorAll("#technologies li.technology");
    buildingNodes.forEach((node) => {
      const techId = parseInt(node.getAttribute("data-technology") || "0");
      const name = node.getAttribute("aria-label") || "Unknown Facility";
      const levelNode = node.querySelector(".level");
      if (techId > 0 && levelNode) {
        const level = parseInt(levelNode.getAttribute("data-value") || "0");
        buildings.push({ id: techId, name, level });
      }
    });
    return buildings.length > 0 ? buildings : null;
  }
  function scrapeAndSync() {
    const playerId = getMetaContent("ogame-player-id");
    const playerName = getMetaContent("ogame-player-name");
    if (!playerId || !playerName) return;
    let avatarUrl = "";
    const avatarEl = document.querySelector("#playerName profile-picture");
    if (avatarEl) {
      const style = window.getComputedStyle(avatarEl);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== "none") {
        const match = bgImage.match(/url\(["']?(.*?)["']?\)/);
        if (match) avatarUrl = match[1];
      }
    }
    const empire = scrapeEmpireData();
    let planets = scrapePlanetList();
    if ((!planets || planets.length === 0) && !empire) {
      console.warn("OGame Nexus: Skipping sync - no planets in sidebar and no empire view detected.");
      return;
    }
    const hasPlanetList = !!document.querySelectorAll("#planetList .smallplanet").length;
    if ((!planets || planets.length === 0) && empire) {
      planets = empire.planets.map((p) => ({
        id: p.id,
        name: p.name || "Unknown",
        coords: p.coords || "",
        type: p.type || "planet",
        lastUpdated: Date.now()
      }));
    }
    const data = {
      isFullPlanetList: hasPlanetList,
      account: {
        playerId,
        playerName,
        universe: getMetaContent("ogame-universe") || "unknown",
        universeName: getMetaContent("ogame-universe-name") || "unknown",
        allianceId: getMetaContent("ogame-alliance-id") || void 0,
        allianceName: getMetaContent("ogame-alliance-name") || void 0,
        allianceTag: getMetaContent("ogame-alliance-tag") || void 0,
        avatarUrl: avatarUrl || void 0,
        serverUrl: window.location.origin,
        playerClass: scrapePlayerClass(),
        allianceClass: scrapeAllianceClass(),
        ...scrapeOfficers()
      },
      planets,
      activePlanetId: getActivePlanetId(),
      lifeformId: scrapeLifeformId(),
      researches: scrapeResearchLevels(),
      lifeformSetup: scrapeLifeformSetup(),
      lifeformExperience: scrapeLifeformExperience(),
      lifeformBuildings: scrapeLifeformBuildings(),
      overview: scrapeOverviewData(),
      supplies: scrapeSuppliesData(),
      facilities: scrapeFacilitiesData(),
      production: scrapeProductionData(),
      empire
    };
    const dataStr = JSON.stringify(data);
    if (window._lastScrapedDataHash === dataStr) {
      return;
    }
    window._lastScrapedDataHash = dataStr;
    safeSendMessage({
      type: "SYNC_SESSION",
      data
    });
  }
  function injectButton() {
    const menuTable = document.querySelector("#menuTable");
    if (!menuTable || document.querySelector("#og-nexus-button-container")) return;
    const li = document.createElement("li");
    li.id = "og-nexus-button-container";
    li.innerHTML = `
    <span class="menu_icon">
        <a id="og-nexus-icon-modal-btn" href="javascript:void(0);" class="tooltipRight js_hideTipOnMobile" target="_self" data-tooltip-title="OGame Nexus Terminal">
            <div class="menuImage" style="background-image: url('${chrome.runtime.getURL("icons/misc/menu-icon-background.png")}'); display: flex; justify-content: center; align-items: center; width: 27px; height: 27px; border-radius: 2px;">
                <img src="${chrome.runtime.getURL("icons/nexus.png")}" class="og-nexus-icon" style="width: 18px; height: 18px;" />
            </div>
        </a>
    </span>
    <a id="og-nexus-text-dashboard-btn" class="menubutton ipiHintable" href="javascript:void(0);" target="_self">
        <span class="textlabel">OGame Nexus</span>
    </a>
  `;
    const modalBtn = li.querySelector("#og-nexus-icon-modal-btn");
    modalBtn == null ? void 0 : modalBtn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleNexusModal();
    });
    const dashboardBtn = li.querySelector("#og-nexus-text-dashboard-btn");
    dashboardBtn == null ? void 0 : dashboardBtn.addEventListener("click", (e) => {
      e.preventDefault();
      scrapeAndSync();
      safeSendMessage({ type: "OPEN_DASHBOARD" });
    });
    menuTable.appendChild(li);
  }
  async function toggleNexusModal() {
    const existing = document.getElementById("og-nexus-modal-overlay");
    if (existing) {
      existing.remove();
      document.body.classList.remove("og-nexus-modal-open");
      return;
    }
    document.body.classList.add("og-nexus-modal-open");
    const overlay = document.createElement("div");
    overlay.id = "og-nexus-modal-overlay";
    overlay.className = "og-nexus-glass";
    overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    z-index: 999999;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: nexus-fade-in 0.3s ease-out;
  `;
    const modal = document.createElement("div");
    modal.className = "og-nexus-modal";
    modal.style.cssText = `
    width: 1150px;
    height: 800px;
    background: linear-gradient(145deg, rgba(20, 25, 35, 0.95), rgba(10, 15, 20, 0.98));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1), 0 40px 80px -20px rgba(0,0,0,0.9), 0 0 40px rgba(56, 189, 248, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    backdrop-filter: blur(24px);
  `;
    const particleBg = document.createElement("div");
    particleBg.className = "og-nexus-modal-particles";
    modal.appendChild(particleBg);
    const header = document.createElement("div");
    header.style.cssText = `
    padding: 24px 32px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.03), transparent);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 2;
  `;
    const titleGroup = document.createElement("div");
    titleGroup.style.display = "flex";
    titleGroup.style.alignItems = "center";
    titleGroup.style.gap = "12px";
    titleGroup.innerHTML = `
    <img src="${chrome.runtime.getURL("icons/nexus.png")}" style="width: 24px; height: 24px;" />
    <span style="font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #f1f5f9; text-shadow: 0 0 10px rgba(255,255,255,0.2);">OGame Nexus Terminal</span>
  `;
    const tabs = document.createElement("div");
    tabs.style.cssText = `display: flex; gap: 12px; margin-left: 40px; flex-grow: 1;`;
    const tabItems = [
      { id: "analytics", label: "AT-A-GLANCE", active: true },
      { id: "todo", label: "AMORTIZATION TO-DO", active: false },
      { id: "blank", label: "STRATEGY", active: false }
    ];
    const contentArea = document.createElement("div");
    contentArea.style.cssText = `flex-grow: 1; padding: 30px; overflow-y: auto; z-index: 2;`;
    tabItems.forEach((t) => {
      const tab = document.createElement("div");
      tab.className = `nexus-modal-tab ${t.active ? "active" : ""}`;
      tab.textContent = t.label;
      tab.style.cssText = `
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      color: ${t.active ? "#38bdf8" : "#64748b"};
      padding: 8px 16px;
      border-radius: 8px;
      background: ${t.active ? "rgba(56, 189, 248, 0.1)" : "transparent"};
      border: 1px solid ${t.active ? "rgba(56, 189, 248, 0.2)" : "transparent"};
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: ${t.active ? "0 0 12px rgba(56, 189, 248, 0.15)" : "none"};
      text-shadow: ${t.active ? "0 0 8px rgba(56, 189, 248, 0.4)" : "none"};
    `;
      tab.addEventListener("mouseenter", () => {
        if (!tab.classList.contains("active")) tab.style.color = "#cbd5e1";
      });
      tab.addEventListener("mouseleave", () => {
        if (!tab.classList.contains("active")) tab.style.color = "#64748b";
      });
      tab.addEventListener("click", () => {
        modal.querySelectorAll(".nexus-modal-tab").forEach((el) => {
          const e = el;
          e.classList.remove("active");
          e.style.color = "#64748b";
          e.style.background = "transparent";
          e.style.border = "1px solid transparent";
          e.style.boxShadow = "none";
          e.style.textShadow = "none";
        });
        tab.classList.add("active");
        tab.style.color = "#38bdf8";
        tab.style.background = "rgba(56, 189, 248, 0.1)";
        tab.style.border = "1px solid rgba(56, 189, 248, 0.2)";
        tab.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.15)";
        tab.style.textShadow = "0 0 8px rgba(56, 189, 248, 0.4)";
        renderTabContent(t.id, contentArea);
      });
      tabs.appendChild(tab);
    });
    const closeBtn = document.createElement("div");
    closeBtn.innerHTML = "&#x2715;";
    closeBtn.style.cssText = `cursor: pointer; font-size: 20px; color: #94a3b8; transition: color 0.2s;`;
    closeBtn.addEventListener("mouseenter", () => closeBtn.style.color = "#f1f5f9");
    closeBtn.addEventListener("mouseleave", () => closeBtn.style.color = "#94a3b8");
    closeBtn.addEventListener("click", () => overlay.remove());
    header.appendChild(titleGroup);
    header.appendChild(tabs);
    header.appendChild(closeBtn);
    modal.appendChild(header);
    modal.appendChild(contentArea);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    renderTabContent("analytics", contentArea);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
  async function renderTabContent(tabId, container) {
    container.innerHTML = "";
    container.style.animation = "nexus-fade-in 0.2s ease-out";
    const metaElement = document.querySelector('meta[name="ogame-player-id"]');
    const playerId = metaElement ? metaElement.getAttribute("content") : "";
    if (tabId === "analytics") {
      container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
        <div class="og-nexus-loading-spinner" style="border: 4px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
      </div>
    `;
      chrome.runtime.sendMessage({ type: "GET_ALL_ANALYTICS", playerId }, (response) => {
        if (response && response.success) {
          renderAnalyticsTab(container, response.expeditions, response.lifeforms || [], response.combats || [], response.debrisHarvests || []);
        } else {
          container.innerHTML = `<div style="color: #ef4444;">Failed to load analytics: ${(response == null ? void 0 : response.error) || "Unknown error"}</div>`;
        }
      });
    } else if (tabId === "todo") {
      const heading = document.createElement("h2");
      heading.textContent = "Amortization To-Do Queue";
      heading.style.cssText = `font-size: 24px; color: #fff; margin-bottom: 8px; font-weight: 800;`;
      container.appendChild(heading);
      const sub = document.createElement("p");
      sub.textContent = "List of your personal, saved, to-do amortization projects.";
      sub.style.cssText = `color: #64748b; font-size: 14px; margin-bottom: 30px;`;
      container.appendChild(sub);
      chrome.runtime.sendMessage({ type: "GET_AMORTIZATION_TODOS", playerId }, (response) => {
        const todos = (response == null ? void 0 : response.todos) || [];
        if (todos.length === 0) {
          const empty = document.createElement("div");
          empty.style.cssText = `height: 300px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255,255,255,0.02); border: 2px dashed rgba(255,255,255,0.05); border-radius: 12px;`;
          empty.innerHTML = `
          <div style="font-size: 40px; margin-bottom: 10px; filter: grayscale(1) opacity(0.5);">📋</div>
          <div style="color: #475569; font-weight: 600;">No projects in your To-Do list yet.</div>
          <div style="color: #334155; font-size: 12px; margin-top: 4px;">Add projects from the Amortization menu to see them here.</div>
        `;
          container.appendChild(empty);
        } else {
          const list = document.createElement("div");
          list.style.cssText = `display: flex; flex-direction: column; gap: 16px;`;
          todos.forEach((item) => {
            const card = document.createElement("div");
            card.className = "nexus-todo-card";
            const getBorderColor = (typeStr, name) => {
              const lowName = name.toLowerCase();
              if (typeStr === "Mines" || lowName.includes("mine")) return "#E6953C";
              if (typeStr === "LifeformExpeditionResearches" || lowName.includes("sensor")) return "#22C55E";
              if (typeStr === "PlasmaTechnology") return "#33B6D3";
              return "#3498db";
            };
            const fallbackIconMapper = (item2) => {
              if (item2.icon) return item2.icon;
              const lowName = (item2.name || "").toLowerCase();
              if (lowName.includes("metal mine")) return "icons/resources/metal_mine_large.jpg";
              if (lowName.includes("crystal mine")) return "icons/resources/crystal_mine_large.jpg";
              if (lowName.includes("deuterium mine")) return "icons/resources/deuterium_mine_large.jpg";
              if (lowName.includes("plasma technology")) return "icons/research/plasma-tech-research-large.jpg";
              if (lowName.includes("automated transport")) return "icons/lifeforms/mechas-tech-t6-large.jpg";
              if (lowName.includes("enhanced sensor")) return "icons/lifeforms/kaelesh-tech-t5-large.jpg";
              if (lowName.includes("high-performance extractors")) return "icons/lifeforms/humans-tech-t2-large.jpg";
              if (lowName.includes("acoustic scanning")) return "icons/lifeforms/rocktal-tech-t2-large.jpg";
              if (lowName.includes("metropolis")) return "icons/lifeforms/humans-building-11-large.jpg";
              if (lowName.includes("chip mass production")) return "icons/lifeforms/mechas-building-11-large.jpg";
              if (lowName.includes("high-performance transformer")) return "icons/lifeforms/mechas-building-7-large.jpg";
              if (lowName.includes("mineral research centre")) return "icons/lifeforms/rocktal-building-11-large.jpg";
              return "icons/misc/technology.png";
            };
            const borderColor = getBorderColor(item.type, item.name);
            const iconUrl = fallbackIconMapper(item);
            card.style.cssText = `
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-left: 4px solid ${borderColor};
            border-radius: 8px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 20px;
            transition: all 0.2s ease;
          `;
            const planetInfo = document.createElement("div");
            planetInfo.style.cssText = `display: flex; flex-direction: column; align-items: center; width: 64px; gap: 6px; flex-shrink: 0;`;
            planetInfo.innerHTML = `
            <div style="position: relative; width: 44px; height: 44px;">
              <div style="width: 44px; height: 44px; background: rgba(0,0,0,0.3); border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                <img src="${chrome.runtime.getURL(iconUrl)}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
              <div style="position: absolute; right: -2px; bottom: -2px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(15, 23, 42, 1); overflow: hidden; background: #000; box-shadow: 0 4px 8px rgba(0,0,0,0.5); z-index: 5;">
                <img src="${item.planetImg || chrome.runtime.getURL("icons/misc/technology.png")}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            </div>
            <span style="font-size: 9px; color: #64748b; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 64px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 10px; display: block;">${item.planetName || "Empire"}</span>
          `;
            const info = document.createElement("div");
            info.style.cssText = `flex-grow: 1; min-width: 0;`;
            info.innerHTML = `
            <div style="font-size: 16px; font-weight: 800; color: #f1f5f9; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;">${item.name}</span>
              <span style="font-size: 11px; background: rgba(52, 152, 219, 0.15); color: #3498db; padding: 2px 8px; border-radius: 99px; flex-shrink: 0;">Lv.${item.targetLevel}</span>
            </div>
            <div style="color: #64748b; font-size: 12px; display: flex; gap: 16px;">
              <span>Coords: <b style="color: #94a3b8">${item.coords || "Empire"}</b></span>
              <span>Payback Time: <b style="color: #22c55e">${item.roiDays}d</b></span>
            </div>
          `;
            const costs = document.createElement("div");
            costs.style.cssText = `display: flex; gap: 12px;`;
            const formatAmount = (num) => {
              const abs = Math.abs(num);
              if (abs >= 1e9) return (num / 1e9).toFixed(2) + "B";
              if (abs >= 1e6) return (num / 1e6).toFixed(1) + "M";
              if (abs >= 1e3) return (num / 1e3).toFixed(1) + "K";
              return Math.floor(num).toString();
            };
            const createCost = (val, icon, color) => {
              if (!val) return "";
              return `
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03);">
                <img src="${chrome.runtime.getURL(icon)}" style="width: 14px; height: 14px;" />
                <span style="font-size: 12px; font-weight: 700; color: ${color};">${formatAmount(val)}</span>
              </div>
            `;
            };
            costs.innerHTML = createCost(item.cost.metal, "icons/resources/metal-icon-medium.jpg", "#E6953C") + createCost(item.cost.crystal, "icons/resources/crystal-icon-medium.jpg", "#33B6D3") + createCost(item.cost.deuterium, "icons/resources/deuterium-icon-medium.jpg", "#22C55E");
            const actions = document.createElement("div");
            const delBtn = document.createElement("div");
            delBtn.innerHTML = "&#x1F5D1;";
            delBtn.style.cssText = `cursor: pointer; filter: grayscale(1) invert(0.5); font-size: 18px; transition: all 0.2s;`;
            delBtn.addEventListener("click", () => {
              chrome.runtime.sendMessage({ type: "REMOVE_AMORTIZATION_TODO", id: item.id }, () => renderTabContent("todo", container));
            });
            actions.appendChild(delBtn);
            card.appendChild(planetInfo);
            card.appendChild(info);
            card.appendChild(costs);
            card.appendChild(actions);
            list.appendChild(card);
          });
          container.appendChild(list);
        }
      });
    } else {
      container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; opacity: 0.6;">
        <div style="font-size: 48px; margin-bottom: 20px;">🏗️</div>
        <h2 style="color: #f1f5f9; font-weight: 800; letter-spacing: 2px;">UNDER CONSTRUCTION</h2>
        <p style="color: #64748b; margin-top: 10px;">This tactical overlay is currently being decrypted...</p>
      </div>
    `;
    }
  }
  function throttle(func, limit) {
    let inThrottle = false;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  const throttledObserverLogic = throttle(() => {
    const isObservablePage = window.location.href.includes("component=lfresearch") || window.location.href.includes("component=overview") || window.location.href.includes("component=lfbuildings") || window.location.href.includes("component=lfbonuses") || window.location.href.includes("component=facilities") || window.location.href.includes("component=supplies") || window.location.href.includes("component=empire") || window.location.href.includes("component=resourcesettings");
    const currentUrl = window.location.href;
    const urlChanged = window._lastScrapedUrl !== currentUrl;
    if (isObservablePage) {
      const hasTechList = !!document.querySelector("#technologies li.technology");
      const hasLfItems = !!document.querySelector("lifeform-item");
      const hasProdTable = !!document.querySelector("tr.summaryHourly") || !!document.querySelector("tr.summary.hourly") || !!Array.from(document.querySelectorAll("tr")).find((r) => {
        var _a;
        return (_a = r.textContent) == null ? void 0 : _a.toLowerCase().includes("total hourly production");
      });
      const hasEmpire = !!document.querySelector("#empire .planet");
      if (hasTechList || hasLfItems || hasProdTable || hasEmpire) {
        if (urlChanged || !window._contentScraped) {
          window._lastScrapedUrl = currentUrl;
          window._contentScraped = true;
          if (window._ogNexusScrapeTimeout) clearTimeout(window._ogNexusScrapeTimeout);
          window._ogNexusScrapeTimeout = setTimeout(() => {
            if (document.querySelector("#technologies li.technology") || document.querySelector("lifeform-item") || document.querySelector("tr.summaryHourly") || document.querySelector("tr.summary.hourly") || document.querySelector("#empire") || Array.from(document.querySelectorAll("tr")).some((r) => {
              var _a;
              return (_a = r.textContent) == null ? void 0 : _a.toLowerCase().includes("total hourly production");
            })) {
              scrapeAndSync();
            }
          }, 300);
        }
      }
    } else {
      window._contentScraped = false;
    }
    if (window.location.href.includes("page=ingame&component=messages")) {
      const playerId = getMetaContent("ogame-player-id");
      if (playerId) {
        injectTodaySummaryCard(playerId, false);
        const isFleetTabActive = !!document.querySelector('div.singleTab.marker[data-category-id="2"]');
        if (isFleetTabActive) {
          const expeditionMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="41"]:not([data-og-nexus-processed="true"])');
          if (expeditionMessages.length > 0) {
            trackExpeditions(playerId);
          }
          const lifeformMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="61"]:not([data-og-nexus-processed="true"])');
          if (lifeformMessages.length > 0) {
            trackLifeformDiscoveries(playerId);
          }
          const isOtherTabActive = !!document.querySelector('div.innerTabItem.active[data-subtab-id="24"]');
          if (isOtherTabActive) {
            const harvestMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="32"]:not([data-og-nexus-processed="true"])');
            if (harvestMessages.length > 0) {
              trackDebrisHarvests(playerId);
            }
          }
          const combatMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="25"]:not([data-og-nexus-processed="true"])');
          if (combatMessages.length > 0) {
            trackCombatReports(playerId);
          }
        }
      }
    }
  }, 100);
  const observer = new MutationObserver((mutations) => {
    if (document.querySelector("#menuTable")) {
      injectButton();
    }
    throttledObserverLogic();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scrapeAndSync();
  injectButton();
  async function initLowAnimationMode() {
    var _a;
    try {
      const localData = await chrome.storage.local.get("globalSettings");
      const enabled = ((_a = localData == null ? void 0 : localData.globalSettings) == null ? void 0 : _a.lowAnimationMode) || false;
      if (enabled) {
        document.body.classList.add("low-animation");
      } else {
        document.body.classList.remove("low-animation");
      }
    } catch (e) {
      console.error("OGame Nexus: Error loading low animation setting", e);
    }
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.globalSettings) {
          const newSettings = changes.globalSettings.newValue;
          if (newSettings && newSettings.lowAnimationMode !== void 0) {
            if (newSettings.lowAnimationMode) {
              document.body.classList.add("low-animation");
            } else {
              document.body.classList.remove("low-animation");
            }
          }
        }
      });
    }
  }
  initLowAnimationMode();
})();
