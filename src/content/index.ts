console.log("OGame Nexus: Content script loaded.");

import { trackExpeditions, injectTodaySummaryCard } from './expeditions';
import { trackLifeformDiscoveries } from './lifeforms';
import { scrapeEmpireData, parseOgameTime, parseAjaxEmpireJson } from './empire';
import { trackDebrisHarvests } from './harvests';
import { trackCombatReports, injectTodayCombatSummaryCard } from './combats';
import { trackEspionageReports, trackRawEspionageReports } from './espionage';
import { renderAnalyticsTab } from './analytics';
import { initGalaxyView, cleanupGalaxyView } from './galaxy';
import {
  SHIP_DATA,
  RESEARCH_DATA,
  DEFENCE_DATA,
  BUILDING_DATA,
  LIFEFORM_RESEARCH_DATA,
  LIFEFORM_BUILDING_DATA
} from '../db/staticData';

const PLANET_PROPERTY_NAMES: Record<string, string> = {
  metalMine: "Metal Mine",
  crystalMine: "Crystal Mine",
  deuteriumMine: "Deuterium Synthesizer",
  solarPlant: "Solar Plant",
  fusionReactor: "Fusion Reactor",
  solarSatellites: "Solar Satellites",
  metalStorage: "Metal Storage",
  crystalStorage: "Crystal Storage",
  deuteriumStorage: "Deuterium Tank",
  roboticsFactory: "Robotics Factory",
  naniteFactory: "Nanite Factory",
  shipyard: "Shipyard",
  researchLab: "Research Lab",
  terraformer: "Terraformer",
  allianceDepot: "Alliance Depot",
  missileSilo: "Missile Silo",
  spaceDock: "Space Dock",
  lunarBase: "Lunar Base",
  sensorPhalanx: "Sensor Phalanx",
  jumpGate: "Jump Gate",
  crawlers: "Crawlers"
};

function getEntityName(id: number): string {
  const ship = SHIP_DATA.find(x => x.id === id);
  if (ship) return ship.name;
  
  const def = DEFENCE_DATA.find(x => x.id === id);
  if (def) return def.name;
  
  const res = RESEARCH_DATA.find(x => x.id === id);
  if (res) return res.name;
  
  const bld = BUILDING_DATA.find(x => x.id === id);
  if (bld) return bld.name;

  const lfBld = LIFEFORM_BUILDING_DATA.find(x => x.id === id);
  if (lfBld) return lfBld.name;

  const lfRes = LIFEFORM_RESEARCH_DATA.find(x => x.id === id);
  if (lfRes) return lfRes.name;

  return `Tech #${id}`;
}

/**
 * Safely sends a message to the background script.
 * Handles the "Extension context invalidated" error which occurs when the extension is updated or reloaded.
 */
function safeSendMessage(message: any) {
  try {
    if (chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage(message, () => {
        const lastError = chrome.runtime.lastError;
        if (lastError && lastError.message?.includes("context invalidated")) {
          console.warn("OGame Nexus: Extension context invalidated. Please refresh the page.");
        }
      });
    }
  } catch (e: any) {
    if (e.message?.includes("context invalidated")) {
      console.warn("OGame Nexus: Extension context invalidated. Please refresh the page.");
    } else {
      console.error("OGame Nexus: Error sending message", e);
    }
  }
}

function getMetaContent(name: string) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || null;
}

function scrapePlayerClass() {
  const classNode = document.querySelector("#characterclass a.tooltipHTML");
  if (!classNode) return undefined;

  const tooltipTitle = classNode.getAttribute("data-tooltip-title") || "";
  if (tooltipTitle.includes("Collector")) return 1;
  if (tooltipTitle.includes("Warrior")) return 2;
  if (tooltipTitle.includes("Discoverer")) return 3;

  return undefined;
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
    const checkActive = (selector: string) => {
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
  if (!url.includes("page=ingame") || !url.includes("component=resourcesettings")) return undefined;

  const allyRow = document.querySelector('tr[data-techid="1005"]');
  if (!allyRow) return undefined;

  const classEl = allyRow.querySelector('.allianceclass');
  if (!classEl) return 0; // No class active

  if (classEl.classList.contains('trader')) return 1; // Trader
  if (classEl.classList.contains('researcher')) return 2; // Researcher
  if (classEl.classList.contains('warrior')) return 3; // Warrior

  return 0;
}

function scrapePlanetList() {
  const planets: any[] = [];
  const planetNodes = document.querySelectorAll("#planetList .smallplanet");

  planetNodes.forEach(node => {
    const planetId = node.id.replace("planet-", "");
    const planetName = node.querySelector(".planet-name")?.textContent || "Unknown";
    const planetCoordsRaw = node.querySelector(".planet-koords")?.textContent || "";
    // Clean coords from brackets: [1:2:3] -> 1:2:3
    const planetCoords = planetCoordsRaw.replace(/[\[\]]/g, "");

    // Ignore placeholder slots (Free Slot) which have coords [0:0:0] or lack a proper planet id
    if (!node.id || !node.id.startsWith("planet-") || !planetCoords || planetCoords === "0:0:0") {
      return;
    }

    const planetImg = node.querySelector(".planetPic")?.getAttribute("src") || "";

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

        const moonImg = moonLink.querySelector(".icon-moon")?.getAttribute("src") || "";

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

  // Fallback 1: Look for the active link in the planet list
  const activePlanetNode = document.querySelector("#planetList .smallplanet.active, #planetList .smallplanet.active_home");
  if (activePlanetNode) return activePlanetNode.id.replace("planet-", "");

  // Fallback 2: Look for the planet switch links
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

  const getXPathText = (xpath: string) => {
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue?.textContent?.trim() || null;
  };

  // 1. Diameter & Fields: //*[@id="diameterContentField"]
  // Format: "12,800km (244/245)"
  const diameterText = getXPathText('//*[@id="diameterContentField"]');
  let diameter, fieldsUsed, fieldsTotal;
  if (diameterText) {
    const dMatch = diameterText.match(/([\d,.]+)\s*km/i);
    if (dMatch) diameter = parseInt(dMatch[1].replace(/,/g, ''));

    // Note: The XPath text might contain children content. 
    // Usually it looks like "12,800km ( 244 / 245 )" or similar
    const fMatch = diameterText.match(/(\d+)\s*\/\s*(\d+)/);
    if (fMatch) {
      fieldsUsed = parseInt(fMatch[1]);
      fieldsTotal = parseInt(fMatch[2]);
    }
  }

  // 2. Temperature: //*[@id="temperatureContentField"]
  const tempText = getXPathText('//*[@id="temperatureContentField"]');
  let tempMin, tempMax;
  if (tempText) {
    const temps = tempText.match(/(-?\d+)/g);
    if (temps && temps.length >= 2) {
      tempMin = parseInt(temps[0]);
      tempMax = parseInt(temps[1]);
    }
  }

  // 3. Honour points: //*[@id="honorContentField"]
  const honorText = getXPathText('//*[@id="honorContentField"]');
  let honorPoints;
  if (honorText) {
    honorPoints = parseInt(honorText.replace(/[,.]/g, ''));
  }

  // 4. Score & Rank
  const scoreText = getXPathText('//*[@id="scoreContentField"]');
  let score, rank, totalPlayers;
  if (scoreText) {
    const sMatch = scoreText.match(/([\d,.]+)\s*\(Place\s*(\d+)\s*of\s*(\d+)\)/);
    if (sMatch) {
      score = parseInt(sMatch[1].replace(/[,.]/g, ''));
      rank = parseInt(sMatch[2]);
      totalPlayers = parseInt(sMatch[3]);
    }
  }

  // 5. Active Items & Boosters
  const activeItems: any[] = [];
  const boosters = { metal: 0, crystal: 0, deuterium: 0 };
  
  const activeItemsEl = document.querySelector('.active_items');
  if (activeItemsEl) {
    const itemContainers = activeItemsEl.querySelectorAll('div[data-uuid]');
    itemContainers.forEach(container => {
      const itemEl = container.querySelector('a.active_item');
      if (!itemEl) return;
      
      const tooltipTitle = itemEl.getAttribute('data-tooltip-title') || '';
      const titleParts = tooltipTitle.split('|');
      const title = titleParts[0].trim();
      const bodyHtml = titleParts.slice(1).join('|');
      
      const lowerTitle = title.toLowerCase();
      let type: any = 'other';
      let bonus = 0;
      
      if (lowerTitle.includes('metal booster')) {
          type = 'metal';
          if (lowerTitle.includes('platinum')) bonus = 0.40;
          else if (lowerTitle.includes('gold')) bonus = 0.30;
          else if (lowerTitle.includes('silver')) bonus = 0.20;
          else if (lowerTitle.includes('bronze')) bonus = 0.10;
      } else if (lowerTitle.includes('crystal booster')) {
          type = 'crystal';
          if (lowerTitle.includes('platinum')) bonus = 0.40;
          else if (lowerTitle.includes('gold')) bonus = 0.30;
          else if (lowerTitle.includes('silver')) bonus = 0.20;
          else if (lowerTitle.includes('bronze')) bonus = 0.10;
      } else if (lowerTitle.includes('deuterium booster')) {
          type = 'deuterium';
          if (lowerTitle.includes('platinum')) bonus = 0.40;
          else if (lowerTitle.includes('gold')) bonus = 0.30;
          else if (lowerTitle.includes('silver')) bonus = 0.20;
          else if (lowerTitle.includes('bronze')) bonus = 0.10;
      } else if (lowerTitle.includes('expedition resource booster')) {
          type = 'expedition_res';
      } else if (lowerTitle.includes('resource booster')) {
          type = 'resource';
      } else if (lowerTitle.includes('expedition slots')) {
          type = 'expedition_slots';
      } else if (lowerTitle.includes('fleet slots')) {
          type = 'fleet_slots';
      } else if (lowerTitle.includes('planet fields')) {
          type = 'fields';
      }
      
      const titlePercentMatch = title.match(/\((\d+)%\)/);
      if (titlePercentMatch) {
          bonus = parseInt(titlePercentMatch[1], 10) / 100;
      }
      
      let rarity = '';
      const elClass = itemEl.className || '';
      const parentClass = container.className || '';
      const rarityMatch = elClass.match(/r_(\w+)/) || parentClass.match(/r_(\w+)/);
      if (rarityMatch) rarity = rarityMatch[1];
      
      let timeRemaining = '';
      let expiryTimestamp: number | undefined;
      let duration = '';
      let isPermanent = false;
      
      const decodedHtml = bodyHtml
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#43;/g, '+');
      
      const restTimeMatch = decodedHtml.match(/class="restTime"[^>]*>Time remaining:\s*([^<]+)/i) || 
                            decodedHtml.match(/Time remaining:\s*([^<]+)/i);
      if (restTimeMatch) {
          timeRemaining = restTimeMatch[1].trim();
          const secondsRemaining = parseOgameTime(timeRemaining);
          if (secondsRemaining > 0) {
              expiryTimestamp = Date.now() + (secondsRemaining * 1000);
          }
      }
      
      const durationMatch = decodedHtml.match(/Duration:\s*([^<]+)/i);
      if (durationMatch) {
          duration = durationMatch[1].trim();
          if (duration.toLowerCase().includes('permanent')) {
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
          if (type === 'metal') boosters.metal += bonus;
          else if (type === 'crystal') boosters.crystal += bonus;
          else if (type === 'deuterium') boosters.deuterium += bonus;
          else if (type === 'resource') {
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
      ...(activeItemsEl ? { activeItems, boosters } : {})
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

  // Hourly production row is usually after the table. 
  // Based on OGame structure, we can target the data-resourceidx cells in the summaryHourly row
  const getSummaryVal = (idx: number) => {
    // Try both naming conventions for the summary row
    let el = document.querySelector(`tr.summaryHourly td[data-resourceidx="${idx}"]`) ||
      document.querySelector(`tr.summary.hourly td[data-resourceidx="${idx}"]`) ||
      document.querySelector(`tr.summary td[data-resourceidx="${idx}"]`);

    // Fallback 1: Search for the row by text content
    if (!el) {
      const allRows = Array.from(document.querySelectorAll('tr'));
      const hourlyRow = allRows.find(r => {
        const txt = r.textContent?.toLowerCase() || '';
        return (txt.includes('total hourly production') ||
          txt.includes('total production per hour') ||
          txt.includes('producción horaria total') || // Spanish
          txt.includes('stündliche produktion insgesamt')); // German
      });
      if (hourlyRow) {
        const tds = hourlyRow.querySelectorAll('td');
        // Metal is usually index 1, Crystal 2, Deuterium 3 (skipping the label td at 0)
        if (tds.length > idx + 1) {
          el = tds[idx + 1];
        }
      }
    }

    if (!el) return null;

    // Try to get value from tooltip first (most precise)
    // IMPORTANT: The data-tooltip-title is often on a child <span> (e.g. class="tooltipCustom"), not the td itself
    const tooltipNode = el.querySelector('[data-tooltip-title]') || el;
    const tooltip = tooltipNode.getAttribute("data-tooltip-title") || tooltipNode.getAttribute("title");

    if (tooltip) {
      // Clean HTML tags if any (unlikely in title but possible)
      // Example value: "1,653,186.355" or "1.653.186,355"
      const rawVal = tooltip.replace(/<[^>]*>/g, '').trim();

      // Determine separator types to handle formatting
      const hasComma = rawVal.includes(',');
      const hasDot = rawVal.includes('.');

      let cleanVal = rawVal;

      // If mixed separators (e.g. 1,234.56 or 1.234,56), truncate at the LAST visual separator which is likely decimal
      if (hasComma && hasDot) {
        const lastComma = rawVal.lastIndexOf(',');
        const lastDot = rawVal.lastIndexOf('.');

        if (lastDot > lastComma) {
          // English format: 1,234.56 -> Truncate at dot
          cleanVal = rawVal.substring(0, lastDot);
        } else {
          // Euro format: 1.234,56 -> Truncate at comma
          cleanVal = rawVal.substring(0, lastComma);
        }
      } else if (hasDot && !hasComma) {
        // Ambiguous: 1.234 (1234) or 1.234 (decimal)?
        // Safer bet: If the string ends with .xxx (3 digits), it's likely a decimal part in English.
        if (/\.\d{3}$/.test(rawVal)) {
          cleanVal = rawVal.substring(0, rawVal.lastIndexOf('.'));
        } else if (/\.\d{1,2}$/.test(rawVal)) {
          // .x or .xx -> likely decimal
          cleanVal = rawVal.substring(0, rawVal.lastIndexOf('.'));
        }
      } else if (hasComma && !hasDot) {
        // Ambiguous comma.
        if (/,\d{3}$/.test(rawVal)) {
          cleanVal = rawVal.substring(0, rawVal.lastIndexOf(','));
        } else if (/,\d{1,2}$/.test(rawVal)) {
          cleanVal = rawVal.substring(0, rawVal.lastIndexOf(','));
        }
      }

      // Remove all non-digits from the integer part
      const val = parseInt(cleanVal.replace(/\D/g, ''));
      if (!isNaN(val)) return val;
    }

    // Fallback: Parse the text content directly (e.g. "1Mn", "45k")
    const textVal = el.textContent?.trim() || '';
    const textMatch = textVal.match(/[\d,.\s\w]+/g);
    if (textMatch) {
      // Join match parts in case scraped as ["1", "Mn"]
      let rawVal = textMatch.join('').toLowerCase().trim();
      let multiplier = 1;

      if (rawVal.endsWith('k')) {
        multiplier = 1000;
        rawVal = rawVal.slice(0, -1);
      }
      else if (rawVal.endsWith('m') || rawVal.endsWith('mn')) {
        multiplier = 1000000;
        rawVal = rawVal.replace(/mn$/, '').replace(/m$/, '');
      }
      else if (rawVal.endsWith('b') || rawVal.endsWith('bn')) {
        multiplier = 1000000000;
        rawVal = rawVal.replace(/bn$/, '').replace(/b$/, '');
      }

      // Replace comma with dot for parseFloat normalization
      const normalized = rawVal.replace(',', '.').replace(/[^\d.]/g, '');
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

  // Storage row: find the row containing "Storage capacity"
  const rows = Array.from(document.querySelectorAll("tr.alt"));
  const storageRow = rows.find(r => r.textContent?.includes("Storage capacity"));
  let metalStorage, crystalStorage, deuteriumStorage;

  if (storageRow) {
    const tds = storageRow.querySelectorAll("td.normalmark");
    if (tds.length >= 3) {
      const getTdVal = (td: Element) => {
        const span = td.querySelector("span[data-tooltip-title]");
        const tooltip = span?.getAttribute("data-tooltip-title") || td.getAttribute("data-tooltip-title") || td.getAttribute("title");
        if (tooltip) {
          const m = tooltip.match(/[\d,.\s]+/);
          if (m) return parseInt(m[0].replace(/\D/g, '')) || 0;
        }
        const txt = td.textContent?.trim() || "";
        const tm = txt.match(/[\d,.\s]+/);
        if (tm) return parseInt(tm[0].replace(/\D/g, '')) || 0;
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

  const data: any = {};
  const buildingNodes = document.querySelectorAll("#technologies li.technology");

  buildingNodes.forEach(node => {
    const techId = parseInt(node.getAttribute("data-technology") || "0");
    const levelNode = node.querySelector(".level");
    if (techId > 0 && levelNode) {
      let level = parseInt(levelNode.getAttribute("data-value") || "0");
      // If currently upgrading, data-value is target level. Subtract 1 to get current.
      if (node.classList.contains("active") && level > 0) {
        level--;
      }

      // Map tech IDs to fields
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

  const researches: { id: number, level: number }[] = [];
  const techNodes = document.querySelectorAll("#technologies li.technology");

  techNodes.forEach(node => {
    const techId = parseInt(node.getAttribute("data-technology") || "0");
    const levelNode = node.querySelector(".level");
    if (techId > 0 && levelNode) {
      let level = parseInt(levelNode.getAttribute("data-value") || "0");
      // If currently researching, data-value is target level. Subtract 1 to get current.
      if (node.classList.contains("active") && level > 0) {
        level--;
      }
      researches.push({ id: techId, level });
    }
  });

  return researches.length > 0 ? researches : null;
}

function scrapeLifeformSetup() {
  const url = window.location.href;
  if (!url.includes("component=lfresearch")) return null;

  const techSetup: { slotNumber: number, selectedTechId: number, level: number }[] = [];
  const techNodes = document.querySelectorAll("#technologies li.technology");

  techNodes.forEach(node => {
    const ogTechId = node.getAttribute("data-technology") || "";
    // Map to internal 1-72 technical ID
    // Structure: 1 [Species] [Type=2] [Slot01-18]
    const lfId = parseInt(ogTechId[1]);
    const slotNumber = parseInt(ogTechId.substring(3, 5), 10);

    if (isNaN(lfId) || isNaN(slotNumber)) return;

    const internalTechId = (slotNumber - 1) * 4 + lfId;

    const levelNode = node.querySelector(".level");
    if (levelNode) {
      let level = parseInt(levelNode.getAttribute("data-value") || "0");
      // If currently researching, data-value is target level. Subtract 1 to get current.
      if (node.classList.contains("active") && level > 0) {
        level--;
      }
      techSetup.push({ slotNumber, selectedTechId: internalTechId, level });
    }
  });

  // Sort by slot number to ensure consistent comparison
  techSetup.sort((a, b) => a.slotNumber - b.slotNumber);

  return techSetup.length > 0 ? techSetup : null;
}

function scrapeLifeformExperience(sourceDoc?: ParentNode) {
  if (!sourceDoc) {
    const url = window.location.href;
    if (!url.includes("component=lfbonuses")) return null;
  }

  const root = sourceDoc || document;
  const experience: { lifeformId: number, level: number, currentExp: number, nextLevelExp: number }[] = [];
  const items = root.querySelectorAll("lifeform-item");

  items.forEach(item => {
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

        // Primary Source: Try checking .currentlevel first as the cleanest source of the actual level!
        const currentLevelNode = item.querySelector(".currentlevel");
        if (currentLevelNode) {
          const text = currentLevelNode.textContent || "";
          const match = text.match(lvlRegex);
          if (match) {
            level = parseInt(match[1], 10);
            found = true;

            // Now try to get the XP details if possible from xpBar or tooltips to populate progress
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

        // Fallback 1: Try to find level and experience from xpbar first if it exists (if primary failed)
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
                // Try standard OGame max level level parser (e.g. Level 100) or plain level
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

        // Fallback 2: Try checking any tooltips in the item for "Level X" or localized equivalent
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

        // Fallback 3: Try checking text content of the item itself
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

        // Only add if we found a level or if we have at least identified the lifeform
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

  const buildings: { id: number, name: string, level: number }[] = [];
  const buildingNodes = document.querySelectorAll("#technologies li.technology");

  buildingNodes.forEach(node => {
    const techId = parseInt(node.getAttribute("data-technology") || "0");
    const name = node.getAttribute("aria-label") || "Unknown Building";
    const levelNode = node.querySelector(".level");

    if (techId > 0 && levelNode) {
      let level = parseInt(levelNode.getAttribute("data-value") || "0");
      // If currently upgrading, data-value is target level. Subtract 1 to get current.
      if (node.classList.contains("active") && level > 0) {
        level--;
      }
      buildings.push({ id: techId, name, level });
    }
  });

  return buildings.length > 0 ? buildings : null;
}

function scrapeFacilitiesData() {
  const url = window.location.href;
  if (!url.includes("page=ingame") || !url.includes("component=facilities")) return null;

  const buildings: { id: number, name: string, level: number }[] = [];
  const buildingNodes = document.querySelectorAll("#technologies li.technology");

  buildingNodes.forEach(node => {
    const techId = parseInt(node.getAttribute("data-technology") || "0");
    const name = node.getAttribute("aria-label") || "Unknown Facility";
    const levelNode = node.querySelector(".level");

    if (techId > 0 && levelNode) {
      let level = parseInt(levelNode.getAttribute("data-value") || "0");
      // If currently upgrading, data-value is target level. Subtract 1 to get current.
      if (node.classList.contains("active") && level > 0) {
        level--;
      }
      buildings.push({ id: techId, name, level });
    }
  });

  return buildings.length > 0 ? buildings : null;
}

function scrapeAndSync() {
  const playerId = getMetaContent("ogame-player-id");
  const playerName = getMetaContent("ogame-player-name");

  if (!playerId || !playerName) return;

  // Scrape Avatar URL
  let avatarUrl = "";
  const avatarEl = document.querySelector("#playerName profile-picture");
  if (avatarEl) {
    const style = window.getComputedStyle(avatarEl);
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage !== 'none') {
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

  // If we are on empire page and side planet list is missing, use empire planets as reference
  if ((!planets || planets.length === 0) && empire) {
    planets = empire.planets.map(p => ({
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
      allianceId: getMetaContent("ogame-alliance-id") || undefined,
      allianceName: getMetaContent("ogame-alliance-name") || undefined,
      allianceTag: getMetaContent("ogame-alliance-tag") || undefined,
      avatarUrl: avatarUrl || undefined,
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
    lifeformExperience: undefined,
    lifeformBuildings: scrapeLifeformBuildings(),
    overview: scrapeOverviewData(),
    supplies: scrapeSuppliesData(),
    facilities: scrapeFacilitiesData(),
    production: scrapeProductionData(),
    empire: empire
  };

  const dataStr = JSON.stringify(data);
  if ((window as any)._lastScrapedDataHash === dataStr) {
    return;
  }
  (window as any)._lastScrapedDataHash = dataStr;

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
  modalBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleNexusModal();
  });

  const dashboardBtn = li.querySelector("#og-nexus-text-dashboard-btn");
  dashboardBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    scrapeAndSync();
    safeSendMessage({ type: "OPEN_DASHBOARD" });
  });

  menuTable.appendChild(li);
}

async function toggleNexusModal() {
  const existing = document.getElementById('og-nexus-modal-overlay');
  if (existing) {
    existing.remove();
    document.body.classList.remove('og-nexus-modal-open');
    return;
  }

  document.body.classList.add('og-nexus-modal-open');

  const overlay = document.createElement('div');
  overlay.id = 'og-nexus-modal-overlay';
  overlay.className = 'og-nexus-glass';
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

  const modal = document.createElement('div');
  modal.className = 'og-nexus-modal';
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

  // Particles background for modal
  const particleBg = document.createElement('div');
  particleBg.className = 'og-nexus-modal-particles';
  modal.appendChild(particleBg);

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 24px 32px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.03), transparent);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 2;
  `;

  const titleGroup = document.createElement('div');
  titleGroup.style.display = 'flex';
  titleGroup.style.alignItems = 'center';
  titleGroup.style.gap = '12px';
  titleGroup.innerHTML = `
    <img src="${chrome.runtime.getURL("icons/nexus.png")}" style="width: 24px; height: 24px;" />
    <span style="font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #f1f5f9; text-shadow: 0 0 10px rgba(255,255,255,0.2);">OGame Nexus Terminal</span>
  `;

  const tabs = document.createElement('div');
  tabs.style.cssText = `display: flex; gap: 12px; margin-left: 40px; flex-grow: 1;`;

  const tabItems = [
    { id: 'analytics', label: 'AT-A-GLANCE', active: true },
    { id: 'todo', label: 'AMORTIZATION TO-DO', active: false },
    { id: 'blank', label: 'STRATEGY', active: false }
  ];

  const contentArea = document.createElement('div');
  contentArea.style.cssText = `flex-grow: 1; padding: 30px; overflow-y: auto; z-index: 2;`;

  tabItems.forEach(t => {
    const tab = document.createElement('div');
    tab.className = `nexus-modal-tab ${t.active ? 'active' : ''}`;
    tab.textContent = t.label;
    tab.style.cssText = `
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      color: ${t.active ? '#38bdf8' : '#64748b'};
      padding: 8px 16px;
      border-radius: 8px;
      background: ${t.active ? 'rgba(56, 189, 248, 0.1)' : 'transparent'};
      border: 1px solid ${t.active ? 'rgba(56, 189, 248, 0.2)' : 'transparent'};
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: ${t.active ? '0 0 12px rgba(56, 189, 248, 0.15)' : 'none'};
      text-shadow: ${t.active ? '0 0 8px rgba(56, 189, 248, 0.4)' : 'none'};
    `;
    tab.addEventListener('mouseenter', () => { if (!tab.classList.contains('active')) tab.style.color = '#cbd5e1'; });
    tab.addEventListener('mouseleave', () => { if (!tab.classList.contains('active')) tab.style.color = '#64748b'; });
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.nexus-modal-tab').forEach(el => {
        const e = el as HTMLElement;
        e.classList.remove('active');
        e.style.color = '#64748b';
        e.style.background = 'transparent';
        e.style.border = '1px solid transparent';
        e.style.boxShadow = 'none';
        e.style.textShadow = 'none';
      });
      tab.classList.add('active');
      tab.style.color = '#38bdf8';
      tab.style.background = 'rgba(56, 189, 248, 0.1)';
      tab.style.border = '1px solid rgba(56, 189, 248, 0.2)';
      tab.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.15)';
      tab.style.textShadow = '0 0 8px rgba(56, 189, 248, 0.4)';
      renderTabContent(t.id, contentArea);
    });
    tabs.appendChild(tab);
  });

  const rightGroup = document.createElement('div');
  rightGroup.style.cssText = `display: flex; align-items: center; gap: 16px; z-index: 3;`;

  const syncBadge = document.createElement('div');
  syncBadge.id = 'og-nexus-modal-sync-badge';
  syncBadge.style.cssText = `
    font-size: 11px;
    font-weight: 700;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.2);
    border-radius: 6px;
    padding: 4px 10px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    text-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.05);
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  `;
  syncBadge.textContent = 'Game Synced: ...';

  syncBadge.addEventListener('mouseenter', () => {
    if (!syncBadge.classList.contains('syncing')) {
      syncBadge.style.background = 'rgba(56, 189, 248, 0.15)';
      syncBadge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      syncBadge.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.2)';
    }
  });

  syncBadge.addEventListener('mouseleave', () => {
    if (!syncBadge.classList.contains('syncing')) {
      syncBadge.style.background = 'rgba(56, 189, 248, 0.08)';
      syncBadge.style.borderColor = 'rgba(56, 189, 248, 0.2)';
      syncBadge.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.05)';
    }
  });

  syncBadge.addEventListener('click', async (e) => {
    e.preventDefault();
    if (syncBadge.classList.contains('syncing')) return;

    syncBadge.classList.add('syncing');
    syncBadge.style.color = '#94a3b8';
    syncBadge.style.background = 'rgba(148, 163, 184, 0.08)';
    syncBadge.style.borderColor = 'rgba(148, 163, 184, 0.2)';
    syncBadge.style.textShadow = 'none';
    syncBadge.style.boxShadow = 'none';
    syncBadge.style.cursor = 'default';
    syncBadge.textContent = 'Game Synced: Syncing...';

    try {
      await performBackgroundEmpireSync();
      const now = Date.now();
      await chrome.storage.local.set({ 'last_empire_sync_time': now });
      
      syncBadge.style.color = '#38bdf8';
      syncBadge.style.background = 'rgba(56, 189, 248, 0.08)';
      syncBadge.style.borderColor = 'rgba(56, 189, 248, 0.2)';
      syncBadge.style.textShadow = '0 0 8px rgba(56, 189, 248, 0.4)';
      syncBadge.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.05)';
      syncBadge.style.cursor = 'pointer';
      syncBadge.textContent = 'Game Synced: Just now';
    } catch (err) {
      console.error('OGame Nexus: Background sync failed', err);
      syncBadge.style.color = '#ef4444';
      syncBadge.style.background = 'rgba(239, 68, 68, 0.08)';
      syncBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
      syncBadge.style.textShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
      syncBadge.style.cursor = 'pointer';
      syncBadge.textContent = 'Game Synced: Failed (Retry)';
    } finally {
      syncBadge.classList.remove('syncing');
    }
  });

  const closeBtn = document.createElement('div');
  closeBtn.innerHTML = '&#x2715;';
  closeBtn.style.cssText = `cursor: pointer; font-size: 20px; color: #94a3b8; transition: color 0.2s; display: flex; align-items: center; justify-content: center;`;
  closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#f1f5f9');
  closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = '#94a3b8');

  rightGroup.appendChild(syncBadge);
  rightGroup.appendChild(closeBtn);

  const updateHeaderBadge = async () => {
    try {
      const res = await chrome.storage.local.get('last_empire_sync_time');
      const timestamp = res.last_empire_sync_time;
      if (timestamp) {
        const diffMin = Math.floor((Date.now() - timestamp) / 60000);
        let timeAgoStr = '';
        if (diffMin < 1) {
          timeAgoStr = 'Just now';
        } else if (diffMin === 1) {
          timeAgoStr = '1m ago';
        } else if (diffMin < 60) {
          timeAgoStr = `${diffMin}m ago`;
        } else {
          const diffHrs = Math.floor(diffMin / 60);
          timeAgoStr = diffHrs === 1 ? '1h ago' : `${diffHrs}h ago`;
        }
        syncBadge.textContent = `Game Synced: ${timeAgoStr}`;
      } else {
        syncBadge.textContent = 'Game Synced: Never';
      }
    } catch (e) {
      syncBadge.textContent = 'Game Synced: Unknown';
    }
  };

  updateHeaderBadge();
  const badgeTimer = setInterval(updateHeaderBadge, 15000);

  const cleanUpModal = () => {
    clearInterval(badgeTimer);
    overlay.remove();
    document.body.classList.remove('og-nexus-modal-open');
  };

  closeBtn.addEventListener('click', cleanUpModal);

  header.appendChild(titleGroup);
  header.appendChild(tabs);
  header.appendChild(rightGroup);
  modal.appendChild(header);
  modal.appendChild(contentArea);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  renderTabContent('analytics', contentArea);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanUpModal();
  });
}

async function renderTabContent(tabId: string, container: HTMLElement) {
  container.innerHTML = '';
  container.style.animation = 'nexus-fade-in 0.2s ease-out';

  const metaElement = document.querySelector('meta[name="ogame-player-id"]');
  const playerId = metaElement ? metaElement.getAttribute('content') : "";

  if (tabId === 'analytics') {
    // Basic loading state
    container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
        <div class="og-nexus-loading-spinner" style="border: 4px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
      </div>
    `;

    const universe = document.querySelector('meta[name="ogame-universe"]')?.getAttribute("content") || "unknown";
    chrome.runtime.sendMessage({ type: "GET_ALL_ANALYTICS", playerId, universe }, (response) => {
      if (response && response.success) {
        renderAnalyticsTab(container, response.expeditions, response.lifeforms || [], response.combats || [], response.debrisHarvests || []);
      } else {
        container.innerHTML = `<div style="color: #ef4444;">Failed to load analytics: ${response?.error || 'Unknown error'}</div>`;
      }
    });
  } else if (tabId === 'todo') {
    const heading = document.createElement('h2');
    heading.textContent = 'Amortization To-Do Queue';
    heading.style.cssText = `font-size: 24px; color: #fff; margin-bottom: 8px; font-weight: 800;`;
    container.appendChild(heading);

    const sub = document.createElement('p');
    sub.textContent = 'List of your personal, saved, to-do amortization projects.';
    sub.style.cssText = `color: #64748b; font-size: 14px; margin-bottom: 30px;`;
    container.appendChild(sub);

    // Fetch from background/DB
    chrome.runtime.sendMessage({ type: "GET_AMORTIZATION_TODOS", playerId }, (response) => {
      const todos = response?.todos || [];

      if (todos.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = `height: 300px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255,255,255,0.02); border: 2px dashed rgba(255,255,255,0.05); border-radius: 12px;`;
        empty.innerHTML = `
          <div style="font-size: 40px; margin-bottom: 10px; filter: grayscale(1) opacity(0.5);">📋</div>
          <div style="color: #475569; font-weight: 600;">No projects in your To-Do list yet.</div>
          <div style="color: #334155; font-size: 12px; margin-top: 4px;">Add projects from the Amortization menu to see them here.</div>
        `;
        container.appendChild(empty);
      } else {
        const list = document.createElement('div');
        list.style.cssText = `display: flex; flex-direction: column; gap: 16px;`;

        todos.forEach((item: any) => {
          const card = document.createElement('div');
          card.className = 'nexus-todo-card';
          const getBorderColor = (typeStr: string, name: string) => {
            const lowName = name.toLowerCase();
            if (typeStr === 'Mines' || lowName.includes('mine')) return '#E6953C';
            if (typeStr === 'LifeformExpeditionResearches' || lowName.includes('sensor')) return '#22C55E';
            if (typeStr === 'PlasmaTechnology') return '#33B6D3';
            return '#3498db'; // Default blue for other LF techs/buildings
          };

          const fallbackIconMapper = (item: any) => {
            if (item.icon) return item.icon;
            const lowName = (item.name || '').toLowerCase();
            if (lowName.includes('metal mine')) return 'icons/resources/metal_mine_large.jpg';
            if (lowName.includes('crystal mine')) return 'icons/resources/crystal_mine_large.jpg';
            if (lowName.includes('deuterium mine')) return 'icons/resources/deuterium_mine_large.jpg';
            if (lowName.includes('plasma technology')) return 'icons/research/plasma-tech-research-large.jpg';
            
            // Lifeform Techs
            if (lowName.includes('automated transport')) return 'icons/lifeforms/mechas-tech-t6-large.jpg';
            if (lowName.includes('enhanced sensor')) return 'icons/lifeforms/kaelesh-tech-t5-large.jpg';
            if (lowName.includes('high-performance extractors')) return 'icons/lifeforms/humans-tech-t2-large.jpg';
            if (lowName.includes('acoustic scanning')) return 'icons/lifeforms/rocktal-tech-t2-large.jpg';
            
            // Lifeform Buildings
            if (lowName.includes('metropolis')) return 'icons/lifeforms/humans-building-11-large.jpg';
            if (lowName.includes('chip mass production')) return 'icons/lifeforms/mechas-building-11-large.jpg';
            if (lowName.includes('high-performance transformer')) return 'icons/lifeforms/mechas-building-7-large.jpg';
            if (lowName.includes('mineral research centre')) return 'icons/lifeforms/rocktal-building-11-large.jpg';
            
            return 'icons/misc/technology.png';
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

          const planetInfo = document.createElement('div');
          planetInfo.style.cssText = `display: flex; flex-direction: column; align-items: center; width: 64px; gap: 6px; flex-shrink: 0;`;
          planetInfo.innerHTML = `
            <div style="position: relative; width: 44px; height: 44px;">
              <div style="width: 44px; height: 44px; background: rgba(0,0,0,0.3); border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                <img src="${chrome.runtime.getURL(iconUrl)}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
              <div style="position: absolute; right: -2px; bottom: -2px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(15, 23, 42, 1); overflow: hidden; background: #000; box-shadow: 0 4px 8px rgba(0,0,0,0.5); z-index: 5;">
                <img src="${item.planetImg || chrome.runtime.getURL('icons/misc/technology.png')}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            </div>
            <span style="font-size: 9px; color: #64748b; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 64px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 10px; display: block;">${item.planetName || 'Empire'}</span>
          `;

          const info = document.createElement('div');
          info.style.cssText = `flex-grow: 1; min-width: 0;`; // min-width: 0 allows ellipsis to work on children in flex
          info.innerHTML = `
            <div style="font-size: 16px; font-weight: 800; color: #f1f5f9; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;">${item.name}</span>
              <span style="font-size: 11px; background: rgba(52, 152, 219, 0.15); color: #3498db; padding: 2px 8px; border-radius: 99px; flex-shrink: 0;">Lv.${item.targetLevel}</span>
            </div>
            <div style="color: #64748b; font-size: 12px; display: flex; gap: 16px;">
              <span>Coords: <b style="color: #94a3b8">${item.coords || 'Empire'}</b></span>
              <span>Payback Time: <b style="color: #22c55e">${item.roiDays}d</b></span>
            </div>
          `;

          const costs = document.createElement('div');
          costs.style.cssText = `display: flex; gap: 12px;`;

          const formatAmount = (num: number) => {
            const abs = Math.abs(num);
            if (abs >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
            if (abs >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (abs >= 1000) return (num / 1000).toFixed(1) + 'K';
            return Math.floor(num).toString();
          };

          const createCost = (val: number, icon: string, color: string) => {
            if (!val) return '';
            return `
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03);">
                <img src="${chrome.runtime.getURL(icon)}" style="width: 14px; height: 14px;" />
                <span style="font-size: 12px; font-weight: 700; color: ${color};">${formatAmount(val)}</span>
              </div>
            `;
          };

          costs.innerHTML =
            createCost(item.cost.metal, 'icons/resources/metal-icon-medium.jpg', '#E6953C') +
            createCost(item.cost.crystal, 'icons/resources/crystal-icon-medium.jpg', '#33B6D3') +
            createCost(item.cost.deuterium, 'icons/resources/deuterium-icon-medium.jpg', '#22C55E');

          const actions = document.createElement('div');
          const delBtn = document.createElement('div');
          delBtn.innerHTML = '&#x1F5D1;';
          delBtn.style.cssText = `cursor: pointer; filter: grayscale(1) invert(0.5); font-size: 18px; transition: all 0.2s;`;
          delBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: "REMOVE_AMORTIZATION_TODO", id: item.id }, () => renderTabContent('todo', container));
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

let lastParsedFlyingShips = -1;
let lastParsedMissionCounts: Record<string, number> = {};
let cachedTotalShips = -1;
let cachedTotalShipsPlayerId = "";

const MISSION_COLORS: Record<string, string> = {
  "15": "rgba(56, 189, 248, 0.28)", // Expedition (blue)
  "7": "rgba(20, 184, 166, 0.28)",  // Colonisation (greenish teal)
  "8": "rgba(34, 197, 94, 0.28)",   // Recycle (bright green)
  "3": "rgba(74, 222, 128, 0.28)",   // Transport (pale green)
  "4": "rgba(22, 101, 52, 0.32)",    // Deployment (darker green)
  "6": "rgba(234, 179, 8, 0.28)",    // Espionage (yellow)
  "5": "rgba(249, 115, 22, 0.28)",   // ACS Defend (orange)
  "1": "rgba(239, 68, 68, 0.28)",    // Attack (red)
  "2": "rgba(244, 63, 94, 0.28)",    // ACS Attack (brighter red)
  "9": "rgba(239, 68, 68, 0.38)",    // Moon Destruction (flame)
  "18": "rgba(244, 143, 177, 0.28)", // Lifeform Expedition (pale pink)
};
const DEFAULT_MISSION_COLOR = "rgba(148, 163, 184, 0.28)";

function applyFleetOverlayStyling(ownFlying: number, total: number, missionCounts: Record<string, number>, totalMissions: number) {
  const messagesCollapsed = document.getElementById('messages_collapsed');
  const eventBox = document.getElementById('eventboxFilled');

  if (!messagesCollapsed || total <= 0) return;

  // Ensure percentage is at least 1% if there are own flying ships to show a visual segment
  const percentage = ownFlying > 0 ? Math.max(1, Math.min(100, Math.round((ownFlying / total) * 100))) : 0;

  // Determine the gradient segments based on mission type proportions
  let gradientStr = "";
  if (ownFlying > 0 && percentage > 0 && totalMissions > 0) {
    let currentStop = 0;
    const stops: string[] = [];
    
    // Sort active mission types by count ascending (least missions to most missions)
    const sortedActiveMissionTypes = Object.keys(missionCounts)
      .filter(type => missionCounts[type] > 0)
      .sort((a, b) => {
        const countA = missionCounts[a];
        const countB = missionCounts[b];
        if (countA !== countB) {
          return countA - countB;
        }
        return a.localeCompare(b); // stable fallback sort
      });

    let firstColor = "";
    let lastColor = "";
    
    // Find the first and last colors to anchor the gradient ends
    sortedActiveMissionTypes.forEach(type => {
      const color = MISSION_COLORS[type] || DEFAULT_MISSION_COLOR;
      if (!firstColor) firstColor = color;
      lastColor = color;
    });

    if (firstColor) {
      stops.push(`${firstColor} 0%`);
    }

    sortedActiveMissionTypes.forEach(type => {
      const count = missionCounts[type];
      const color = MISSION_COLORS[type] || DEFAULT_MISSION_COLOR;
      const segmentWidth = (count / totalMissions) * percentage;
      const nextStop = currentStop + segmentWidth;

      // Apply a soft gradient blend factor of 0.2 (20% transition zone on each side of segment)
      const blendOffset = segmentWidth * 0.2;
      stops.push(`${color} ${(currentStop + blendOffset).toFixed(2)}%`);
      stops.push(`${color} ${(nextStop - blendOffset).toFixed(2)}%`);

      currentStop = nextStop;
    });

    if (lastColor) {
      stops.push(`${lastColor} ${percentage.toFixed(2)}%`);
    }

    // Remainder of progress bar up to 100% is dark/transparent
    stops.push(`rgba(0, 0, 0, 0.15) ${percentage.toFixed(2)}%`);
    stops.push(`rgba(0, 0, 0, 0.15) 100%`);

    gradientStr = `linear-gradient(90deg, ${stops.join(', ')})`;
  } else {
    gradientStr = `linear-gradient(90deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.15) 100%)`;
  }

  // 1. Reset messagesCollapsed background to default
  messagesCollapsed.style.background = '';

  // 2. Add subtle cyan/blue border on the left side to mark the active Nexus status
  messagesCollapsed.style.borderLeft = '3px solid rgba(6, 182, 212, 0.6)';

  // 3. Manage the absolute progress bar element at the bottom
  messagesCollapsed.style.position = 'relative';
  let progressBar = document.getElementById('og-nexus-fleet-progress-bar');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'og-nexus-fleet-progress-bar';
    progressBar.style.position = 'absolute';
    progressBar.style.bottom = '0';
    progressBar.style.left = '0';
    progressBar.style.width = '100%';
    progressBar.style.pointerEvents = 'none';
    progressBar.style.zIndex = '100'; // Make sure it sits on top of other backgrounds

    // Match the border radius of the parent to prevent bleeding
    const computedStyle = window.getComputedStyle(messagesCollapsed);
    progressBar.style.borderBottomLeftRadius = computedStyle.borderBottomLeftRadius;
    progressBar.style.borderBottomRightRadius = computedStyle.borderBottomRightRadius;

    messagesCollapsed.appendChild(progressBar);
  }

  progressBar.style.height = '4px';
  progressBar.style.background = gradientStr;
  progressBar.style.transition = 'background 0.4s ease';

  // 4. Make sure eventBox background is transparent
  if (eventBox) {
    eventBox.style.background = 'transparent';
    
    // 5. Update the text label in undermark to show percentage
    const undermark = eventBox.querySelector('.undermark');
    if (undermark) {
      const currentText = undermark.textContent || '';
      // Only append if it doesn't already contain percentage
      if (!currentText.includes('%')) {
        undermark.textContent = `${currentText} (${percentage}%)`;
      } else {
        // If it already has percentage, update it if the percentage has changed
        const updatedText = currentText.replace(/\s*\(\d+%\)/, ` (${percentage}%)`);
        if (currentText !== updatedText) {
          undermark.textContent = updatedText;
        }
      }
    }
  }
}

function updateFleetProgressOverlay() {
  const messagesCollapsed = document.getElementById('messages_collapsed');
  const eventBox = document.getElementById('eventboxFilled');
  
  if (!messagesCollapsed && !eventBox) return;

  const playerId = getMetaContent("ogame-player-id");
  if (!playerId) return;

  const eventContent = document.getElementById('eventContent');
  if (eventContent) {
    const rows = eventContent.querySelectorAll('tr.eventFleet');
    let ownFlyingShips = 0;
    let totalMissions = 0;
    const missionCounts: Record<string, number> = {};
    
    rows.forEach(row => {
      const missionFleetImg = row.querySelector('td.missionFleet img');
      if (missionFleetImg) {
        const tooltipTitle = missionFleetImg.getAttribute('data-tooltip-title') || '';
        const isOwn = /Own fleet|Eigene Flotte|Flotte personnelle|Flota propia|Flotta propria|Własna flota|Frota própria|Kendi filon|Kendi Filom|Собственный флот|Eigen vloot|Saját flotta|Vlastní flotila|Vlastná flotila|Egen flåde|Egen flotta|Oma laivasto|Vlastita flota|Flota proprie/i.test(tooltipTitle);
        const isFriendly = /Friendly fleet|Freundliche Flotte|Flotte amicale|Flota amigable|Flotta amica|Przyjazna flota|Frota amigável|Dost filo|Дружественный флот|Vriendelijke vloot|Baráti flotta|Přátelská flotila|Priateľská flotila|Venlig flåde|Vänlig flotta|Vennlig flåte|Ystävällinen laivasto|Φιλικός στόλος|Prijateljska flota|Flota amica/i.test(tooltipTitle);
        const missionType = row.getAttribute('data-mission-type') || '';
        const isOwnFleet = isOwn || (isFriendly && (missionType === '18' || missionType === '15'));
        
        if (isOwnFleet) {
          const detailsTd = row.querySelector('td.detailsFleet');
          if (detailsTd) {
            const text = detailsTd.textContent || '0';
            const count = parseInt(text.replace(/[,.]/g, '').trim(), 10);
            if (!isNaN(count) && count > 0) {
              ownFlyingShips += count;
              const missionType = row.getAttribute('data-mission-type') || 'unknown';
              missionCounts[missionType] = (missionCounts[missionType] || 0) + 1;
              totalMissions += 1;
            }
          }
        }
      }
    });

    const countsChanged = JSON.stringify(missionCounts) !== JSON.stringify(lastParsedMissionCounts);
    if (ownFlyingShips !== lastParsedFlyingShips || countsChanged || cachedTotalShipsPlayerId !== playerId) {
      lastParsedFlyingShips = ownFlyingShips;
      lastParsedMissionCounts = missionCounts;
      cachedTotalShipsPlayerId = playerId;
      
      chrome.runtime.sendMessage({ type: "GET_TOTAL_SHIPS", playerId }, (res) => {
        if (res && res.success) {
          cachedTotalShips = res.totalShips;
          applyFleetOverlayStyling(ownFlyingShips, cachedTotalShips, missionCounts, totalMissions);
        }
      });
    } else {
      applyFleetOverlayStyling(ownFlyingShips, cachedTotalShips, missionCounts, totalMissions);
    }
  } else if (lastParsedFlyingShips >= 0 && cachedTotalShips > 0) {
    const totalMissions = Object.values(lastParsedMissionCounts).reduce((a, b) => a + b, 0);
    applyFleetOverlayStyling(lastParsedFlyingShips, cachedTotalShips, lastParsedMissionCounts, totalMissions);
  }
}

function throttle(func: (...args: any[]) => void, limit: number) {
  let inThrottle = false;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

const throttledObserverLogic = throttle(() => {
  // Trigger scraping if the technology list or overview content changes (AJAX navigation)
  const isObservablePage = window.location.href.includes("component=lfresearch") ||
    window.location.href.includes("component=overview") ||
    window.location.href.includes("component=lfbuildings") ||
    window.location.href.includes("component=facilities") ||
    window.location.href.includes("component=supplies") ||
    window.location.href.includes("component=empire") ||
    window.location.href.includes("component=resourcesettings");

  // Check if the URL has changed since last scrape to handle AJAX navigation
  const currentUrl = window.location.href;
  const urlChanged = (window as any)._lastScrapedUrl !== currentUrl;

  if (isObservablePage) {
    const hasTechList = !!document.querySelector("#technologies li.technology");
    const hasProdTable = !!document.querySelector("tr.summaryHourly") ||
      !!document.querySelector("tr.summary.hourly") ||
      !!Array.from(document.querySelectorAll('tr')).find(r => r.textContent?.toLowerCase().includes('total hourly production'));
    const hasEmpire = !!document.querySelector("#empire .planet");

    // Only scrape if we have visible content and either the URL changed or we haven't scraped this page's content yet
    if (hasTechList || hasProdTable || hasEmpire) {
      if (urlChanged || !(window as any)._contentScraped) {
        (window as any)._lastScrapedUrl = currentUrl;
        (window as any)._contentScraped = true;

        // Debounce much shorter for snappier response, 
        // 300ms is usually enough for the DOM to be stable after a navigation
        if ((window as any)._ogNexusScrapeTimeout) clearTimeout((window as any)._ogNexusScrapeTimeout);
        (window as any)._ogNexusScrapeTimeout = setTimeout(() => {
          // Double check we still have content before scraping
          if (document.querySelector("#technologies li.technology") ||
            document.querySelector("tr.summaryHourly") ||
            document.querySelector("tr.summary.hourly") ||
            document.querySelector("#empire") ||
            Array.from(document.querySelectorAll('tr')).some(r => r.textContent?.toLowerCase().includes('total hourly production'))) {
            scrapeAndSync();
          }
        }, 300);
      }
    }
  } else {
    // Reset contentScraped flag when leaving LF pages so we scrape again when returning
    (window as any)._contentScraped = false;
  }

  // Check if we're on the messages page
  if (window.location.href.includes('page=ingame&component=messages')) {
    const playerId = getMetaContent("ogame-player-id");
    if (playerId) {
      // 1. Conditionally show the summary card depending on the active subtab
      const isExpeditionsTabActive = !!document.querySelector('div.innerTabItem.active[data-subtab-id="22"]');
      const isCombatsTabActive = !!document.querySelector('div.innerTabItem.active[data-subtab-id="21"]');

      if (isExpeditionsTabActive) {
        injectTodaySummaryCard(playerId, false);
        const combatWrapper = document.querySelector('.og-nexus-combat-summary-wrapper') as HTMLElement;
        if (combatWrapper) combatWrapper.style.display = 'none';
      } else if (isCombatsTabActive) {
        injectTodayCombatSummaryCard(playerId, false);
        const expWrapper = document.querySelector('.og-nexus-summary-wrapper') as HTMLElement;
        if (expWrapper) expWrapper.style.display = 'none';
      } else {
        const expWrapper = document.querySelector('.og-nexus-summary-wrapper') as HTMLElement;
        if (expWrapper) expWrapper.style.display = 'none';
        const combatWrapper = document.querySelector('.og-nexus-combat-summary-wrapper') as HTMLElement;
        if (combatWrapper) combatWrapper.style.display = 'none';
      }

      // Trigger a request to the page context to get all raw messages from window.ogame.messages.content
      const now = Date.now();
      if (!(window as any)._lastRawMessagesRequestTime || now - (window as any)._lastRawMessagesRequestTime > 1000) {
        (window as any)._lastRawMessagesRequestTime = now;
        window.dispatchEvent(new CustomEvent('ogame-nexus-request-raw-messages'));
      }

      // Espionage reports tracking (runs on any tab if elements are loaded)
      const espionageMessages = document.querySelectorAll('div.rawMessageData[data-raw-hashcode^="sr-"]:not([data-og-nexus-processed="true"])');
      if (espionageMessages.length > 0) {
        trackEspionageReports(playerId);
      }

      // 2. Ensure we only track if the "Fleets" tab (data-category-id="2") is active
      const isFleetTabActive = !!document.querySelector('div.singleTab.marker[data-category-id="2"]');

      if (isFleetTabActive) {
        // 3. Specialized tracking for expedition messages (Type 41)
        const expeditionMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="41"]:not([data-og-nexus-processed="true"])');
        if (expeditionMessages.length > 0) {
          trackExpeditions(playerId);
        }

        // 4. Specialized tracking for lifeform Discovery messages (Type 61)
        const lifeformMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="61"]:not([data-og-nexus-processed="true"])');
        if (lifeformMessages.length > 0) {
          trackLifeformDiscoveries(playerId);
        }

        // 5. Specialized tracking for Debris harvests (Type 32) - Ensure we are on the "Other" tab
        const isOtherTabActive = !!document.querySelector('div.innerTabItem.active[data-subtab-id="24"]');
        if (isOtherTabActive) {
          const harvestMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="32"]:not([data-og-nexus-processed="true"])');
          if (harvestMessages.length > 0) {
            trackDebrisHarvests(playerId);
          }
        }

        // 6. Specialized tracking for Combat reports (Type 25)
        const combatMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="25"]:not([data-og-nexus-processed="true"])');
        if (combatMessages.length > 0) {
          trackCombatReports(playerId);
        }
      }
    }
  }

  updateFleetProgressOverlay();

  // OGame Galaxy View integration
  if (document.querySelector("#galaxycomponent")) {
    initGalaxyView();
  } else {
    cleanupGalaxyView();
  }
}, 50);

const observer = new MutationObserver((mutations) => {
  if (document.querySelector("#menuTable")) {
    injectButton();
  }

  throttledObserverLogic();
});

observer.observe(document.body, { childList: true, subtree: true });

scrapeAndSync();
injectButton();


async function performBackgroundEmpireSync() {
  console.log("OGame Nexus: Starting background Empire sync (fetching planets and moons)...");
  const playerId = getMetaContent("ogame-player-id");
  const playerName = getMetaContent("ogame-player-name");

  if (!playerId || !playerName) {
    throw new Error("Player context not found");
  }

  // Fetch planetType=0 (Planets)
  const planetsRes = await fetch('/game/index.php?page=ajax&component=empire&ajax=1&planetType=0&asJson=1', {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });
  if (!planetsRes.ok) throw new Error("Failed to fetch planets");
  const planetsText = await planetsRes.text();
  if (planetsText.trim().startsWith('<')) {
    throw new Error("Invalid response: Received HTML redirect/login page instead of JSON");
  }
  const planetsJson = JSON.parse(planetsText);

  // Fetch planetType=1 (Moons)
  const moonsRes = await fetch('/game/index.php?page=ajax&component=empire&ajax=1&planetType=1&asJson=1', {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });
  if (!moonsRes.ok) throw new Error("Failed to fetch moons");
  const moonsText = await moonsRes.text();
  if (moonsText.trim().startsWith('<')) {
    throw new Error("Invalid response: Received HTML redirect/login page instead of JSON");
  }
  const moonsJson = JSON.parse(moonsText);

  // Fetch Lifeform Bonuses (Experience)
  const lfBonusesRes = await fetch('/game/index.php?page=ajax&component=lfbonuses&ajax=1', {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });
  if (!lfBonusesRes.ok) throw new Error("Failed to fetch lifeform bonuses");
  const lfBonusesHtml = await lfBonusesRes.text();

  console.log("OGame Nexus: Planets AJAX raw JSON:", planetsJson);
  console.log("OGame Nexus: Moons AJAX raw JSON:", moonsJson);
  console.log("OGame Nexus: Lifeform Bonuses AJAX raw HTML length:", lfBonusesHtml.length);

  // Parse using our new AJAX parser
  const planetsData = parseAjaxEmpireJson(planetsJson, false);
  const moonsData = parseAjaxEmpireJson(moonsJson, true);
  
  const lfParser = new DOMParser();
  const lfDoc = lfParser.parseFromString(lfBonusesHtml, "text/html");
  const lifeformExperienceData = scrapeLifeformExperience(lfDoc);

  // Count standard buildings, ships, defenses, and lifeform tech for logging
  let totalPlanets = [...planetsData.planets, ...moonsData.planets];
  let supplyCount = 0;
  let stationCount = 0;
  let shipCount = 0;
  let defenseCount = 0;
  let lfBuildingsCount = 0;
  let lfTechsCount = 0;

  totalPlanets.forEach(p => {
    // Standard buildings
    if (p.metalMine) supplyCount++;
    if (p.crystalMine) supplyCount++;
    if (p.deuteriumMine) supplyCount++;
    if (p.solarPlant) supplyCount++;
    if (p.fusionReactor) supplyCount++;
    if (p.metalStorage) supplyCount++;
    if (p.crystalStorage) supplyCount++;
    if (p.deuteriumStorage) supplyCount++;
    
    // Facilities
    if (p.roboticsFactory) stationCount++;
    if (p.naniteFactory) stationCount++;
    if (p.shipyard) stationCount++;
    if (p.researchLab) stationCount++;
    if (p.terraformer) stationCount++;
    if (p.missileSilo) stationCount++;
    if (p.spaceDock) stationCount++;
    if (p.lunarBase) stationCount++;
    if (p.sensorPhalanx) stationCount++;
    if (p.jumpGate) stationCount++;

    // Ships
    if (p.ships) {
      Object.values(p.ships).forEach(count => { if (count > 0) shipCount += count; });
    }

    // Defenses
    if (p.defenses) {
      Object.values(p.defenses).forEach(count => { if (count > 0) defenseCount += count; });
    }

    // Lifeforms
    if (p.lifeformBuildings) {
      p.lifeformBuildings.forEach(b => { if (b.level > 0) lfBuildingsCount++; });
    }
    if (p.lifeformSetup) {
      p.lifeformSetup.forEach(t => { if (t.level > 0) lfTechsCount++; });
    }
  });

  const researchCount = Object.keys(planetsData.research).length;

  console.log(`OGame Nexus: Background Sync - Parsed ${planetsData.planets.length} planets and ${moonsData.planets.length} moons.`);
  console.log(`OGame Nexus: Background Sync Details:
    - Standard Buildings/Facilities: ${supplyCount + stationCount} levels across planets
    - Researches: ${researchCount} techs parsed
    - Combat Ships: ${shipCount} ships total
    - Defense Structures: ${defenseCount} units total
    - Lifeform Buildings: ${lfBuildingsCount} structures
    - Lifeform Technologies: ${lfTechsCount} slots
    - Lifeform Experience: ${lifeformExperienceData ? lifeformExperienceData.length : 0} lifeforms parsed`);

  // Detailed group logs about synced items
  console.groupCollapsed(`OGame Nexus: Detailed Sync Log (Ships, Buildings, Techs, LF XP)`);

  // 1. Researches (Global)
  if (researchCount > 0) {
    console.groupCollapsed(`Researches Synced (${researchCount})`);
    const researchesList: string[] = [];
    Object.entries(planetsData.research).forEach(([techIdStr, level]) => {
      const techId = parseInt(techIdStr);
      if (level > 0) {
        researchesList.push(`${getEntityName(techId)} (Lvl ${level})`);
      }
    });
    console.log(researchesList.join(', ') || 'None');
    console.groupEnd();
  }

  // 1.5 Lifeform Experience (Global)
  if (lifeformExperienceData && lifeformExperienceData.length > 0) {
    console.groupCollapsed(`Lifeform Experience Synced (${lifeformExperienceData.length})`);
    const lfExpNames = ["Humans", "Rock'tal", "Mechas", "Kaelesh"];
    const expList = lifeformExperienceData.map((e: any) => {
      const name = lfExpNames[e.lifeformId - 1] || `LF #${e.lifeformId}`;
      return `${name} (Lvl ${e.level}, XP: ${e.currentExp}/${e.nextLevelExp})`;
    });
    console.log(expList.join(', '));
    console.groupEnd();
  }

  // 2. Planets & Moons details
  totalPlanets.forEach(p => {
    console.groupCollapsed(`${p.name} [${p.coords}] (${p.type === 'moon' ? 'Moon' : 'Planet'})`);
    
    // Buildings & Facilities
    const bldList: string[] = [];
    Object.entries(PLANET_PROPERTY_NAMES).forEach(([propName, dispName]) => {
      const val = (p as any)[propName];
      if (val !== undefined && val > 0) {
        bldList.push(`${dispName}: Lvl ${val}`);
      }
    });
    if (bldList.length > 0) {
      console.log(`%cBuildings & Facilities:`, 'font-weight: bold; color: #4fc3f7;', bldList.join(', '));
    }

    // Ships
    if (p.ships) {
      const shipList: string[] = [];
      Object.entries(p.ships).forEach(([techIdStr, count]) => {
        const techId = parseInt(techIdStr);
        if (count > 0) {
          shipList.push(`${getEntityName(techId)}: ${count.toLocaleString()}`);
        }
      });
      if (shipList.length > 0) {
        console.log(`%cShips:`, 'font-weight: bold; color: #81c784;', shipList.join(', '));
      }
    }

    // Defenses
    if (p.defenses) {
      const defList: string[] = [];
      Object.entries(p.defenses).forEach(([techIdStr, count]) => {
        const techId = parseInt(techIdStr);
        if (count > 0) {
          defList.push(`${getEntityName(techId)}: ${count.toLocaleString()}`);
        }
      });
      if (defList.length > 0) {
        console.log(`%cDefenses:`, 'font-weight: bold; color: #e57373;', defList.join(', '));
      }
    }

    // Lifeform Buildings
    if (p.lifeformBuildings && p.lifeformBuildings.length > 0) {
      const lfBldList = p.lifeformBuildings.map(b => `${getEntityName(b.id)}: Lvl ${b.level}`);
      console.log(`%cLifeform Buildings:`, 'font-weight: bold; color: #ffb74d;', lfBldList.join(', '));
    }

    // Lifeform Technologies
    if (p.lifeformSetup && p.lifeformSetup.length > 0) {
      const lfTechList = p.lifeformSetup
        .filter(t => t.selectedTechId !== null && t.level > 0)
        .map(t => `${getEntityName(t.selectedTechId!)} (Slot ${t.slotNumber}): Lvl ${t.level}`);
      if (lfTechList.length > 0) {
        console.log(`%cLifeform Technologies:`, 'font-weight: bold; color: #ba68c8;', lfTechList.join(', '));
      }
    }

    console.groupEnd();
  });

  console.groupEnd();

  // Scrape the active sidebar planet list to verify existence/order
  const planetsList = scrapePlanetList();

  // Get active planet ID
  const activePlanetId = getActivePlanetId();

  // Send SYNC_SESSION to the background script
  safeSendMessage({
    type: "SYNC_SESSION",
    data: {
      isFullPlanetList: true,
      account: {
        playerId,
        playerName,
        universe: getMetaContent("ogame-universe") || "unknown",
        universeName: getMetaContent("ogame-universe-name") || "unknown",
        allianceId: getMetaContent("ogame-alliance-id") || undefined,
        allianceName: getMetaContent("ogame-alliance-name") || undefined,
        allianceTag: getMetaContent("ogame-alliance-tag") || undefined,
        serverUrl: window.location.origin,
        playerClass: scrapePlayerClass(),
        allianceClass: scrapeAllianceClass(),
        ...scrapeOfficers()
      },
      planets: planetsList.length > 0 ? planetsList : [...planetsData.planets, ...moonsData.planets].map(p => ({
        id: p.id,
        name: p.name || "Unknown",
        coords: p.coords || "",
        type: p.type || "planet",
        lastUpdated: Date.now()
      })),
      activePlanetId,
      lifeformId: scrapeLifeformId(),
      researches: Object.entries(planetsData.research).map(([id, level]) => ({ id: parseInt(id), level })),
      lifeformExperience: lifeformExperienceData || undefined,
      empire: {
        planets: [...planetsData.planets, ...moonsData.planets],
        research: planetsData.research
      }
    }
  });
}


async function initLowAnimationMode() {
  try {
    const localData = await chrome.storage.local.get('globalSettings');
    const enabled = localData?.globalSettings?.lowAnimationMode || false;
    if (enabled) {
      document.body.classList.add('low-animation');
    } else {
      document.body.classList.remove('low-animation');
    }
  } catch (e) {
    console.error("OGame Nexus: Error loading low animation setting", e);
  }

  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.globalSettings) {
        const newSettings = changes.globalSettings.newValue;
        if (newSettings && newSettings.lowAnimationMode !== undefined) {
          if (newSettings.lowAnimationMode) {
            document.body.classList.add('low-animation');
          } else {
            document.body.classList.remove('low-animation');
          }
        }
      }
    });
  }
}

initLowAnimationMode();

// Listen for raw messages response from MAIN world pageContext.ts
window.addEventListener('ogame-nexus-response-raw-messages', (event: any) => {
  const content = event.detail?.content;
  if (Array.isArray(content) && content.length > 0) {
    const playerId = getMetaContent("ogame-player-id");
    if (playerId) {
      trackRawEspionageReports(playerId, content);
    }
  }
});

// Auto-sync function checking every 5 minutes
async function checkAutoSync() {
  try {
    const playerId = getMetaContent("ogame-player-id");
    const playerName = getMetaContent("ogame-player-name");
    // Only attempt sync if player has an active session/context loaded
    if (!playerId || !playerName) return;

    const res = await chrome.storage.local.get('last_empire_sync_time');
    const lastSync = res.last_empire_sync_time || 0;
    const now = Date.now();

    // 5 minutes = 5 * 60 * 1000 milliseconds
    if (now - lastSync >= 5 * 60 * 1000) {
      console.log("OGame Nexus: Auto-sync triggered (5 minutes elapsed since last sync).");
      
      // Update sync time immediately to prevent concurrent triggers in other tabs
      await chrome.storage.local.set({ 'last_empire_sync_time': now });

      try {
        await performBackgroundEmpireSync();
        
        // Update badge if modal is open
        const badge = document.getElementById('og-nexus-modal-sync-badge');
        if (badge) {
          badge.textContent = 'Game Synced: Just now';
        }
      } catch (syncErr) {
        console.error("OGame Nexus: Empire background sync failed, scheduling retry in 2 minutes", syncErr);
        // Set timestamp back to 3 minutes ago, so next checkAutoSync (running every minute)
        // will retry after 2 more minutes instead of waiting another 5 minutes
        await chrome.storage.local.set({ 'last_empire_sync_time': Date.now() - 3 * 60 * 1000 });
      }
    }
  } catch (err) {
    console.error("OGame Nexus: Error during auto-sync check", err);
  }
}

// Initial check after 5 seconds, then check every 60 seconds
setTimeout(checkAutoSync, 5000);
setInterval(checkAutoSync, 60000);


