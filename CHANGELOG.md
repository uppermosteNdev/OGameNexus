# Changelog

All notable changes to the **OGame Nexus** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.7] - 2026-10-20

### 🚀 New Features

* **Multi-Language Support (12 Languages)**
  * Nexus is now fully translated into 12 languages: English, Romanian, German, French, Spanish, Italian, Polish, Portuguese, Brazilian Portuguese, Russian, Turkish, and Dutch.
  * Easy language switcher available in the dashboard top navigation, settings, and in-game messages.

* **Costs Planner: "Add for All Planets" & Cart Editing**
  * Added an **"Add for all planets if possible"** button next to buildings in Mines and Facilities categories to plan empire-wide upgrades with one click.
  * Added an **Edit Level** button directly on every shopping cart item, allowing you to easily adjust desired target levels without deleting and re-adding items.

* **Astrophysics Payback Calculator**
  * Integrated dedicated payback calculations for additional **Astrophysics** colony unlocks into the Amortization tool.
  * Calculates exact payback time and payoff speed when expanding your empire with new colony slots, factoring in mine production and upgrade costs.

* **Scrap Merchant Overhaul**
  * Redesigned Scrap Merchant calculation and display tool, ensuring exact resource recovery numbers.
  * Fleets currently flying on missions are now fully accounted for in scrap capacity breakdowns.

### 🛡️ Improvements & Bug Fixes

* **Sensor Phalanx Moon Count Fix [Closed Beta]**
  * Corrected moon counts and sensor phalanx coverage mapping across all sectors and circular universes.
* **Overwatch Galaxy Sync & Live Feed Fixes [Closed Beta]**
  * Fixed new colony and moon detection so newly surveyed systems correctly alert the alliance, even when the colony already has a moon or is in vacation mode.
  * Fixed player class translation displays (e.g. Discoverer) across different game languages.

---

## [1.2.6] - 2026-10-14

### 🚀 New Features

* **Overwatch Sensor Phalanx Coverage [Closed Beta]**
  * Added a dedicated **Phalanx Coverage** view visualizing the sensor range of all alliance moons on one interactive map. Currently in Closed Beta for testing.
  * Clearly highlights systems covered by your alliance's sensor phalanxes versus blind spots out of range.
  * Direct coordinate click allows quick jumping straight into the Universe Map.

* **Per-Resource Amortization Engine**
  * Added dedicated payback calculations for **Metal**, **Crystal**, and **Deuterium** individually, in addition to total combined resource production.
  * Added clean resource filter buttons to easily view which upgrades pay for themselves fastest for each specific resource.
  * Upgrade recommendations automatically update based on the selected resource filter.

* **Multi-Account Switcher**
  * Added an account switcher in the bottom-left dock to easily switch between your different universe accounts.
  * Accounts are organized by universe and player to ensure completely separate data when switching.
  * Directly updates the page link so you can bookmark or refresh on your active account.

* **Live Universe Feed Unread Counter [Closed Beta]**
  * Added a live badge counter on the Universe Intel navigation tab.
  * Instantly alerts you when new galaxy activity, status changes, or moon events occur without having to keep the feed open.

### 🛡️ Improvements & Bug Fixes

* **Crash Protection & Error Isolation [Closed Beta]**
  * Added protective error boundaries to each Overwatch tab, so an issue in one view will never crash the whole dashboard.
  * Includes an in-place "Retry Module" button to reload the affected section immediately.
* **Empire 1v1 Comparison Guard [Closed Beta]**
  * Fixed an issue in head-to-head empire comparison when fewer than two players were selected.
* **Live Highscores Refresh [Closed Beta]**
  * Fixed player highscores not updating when swapping members inside the empire comparison view.
* **Circular Galaxy Distance Calculation**
  * Added proper wrap-around distance calculation for universes that have circular galaxies or systems enabled.
* **Live Universe Feed Reliability [Closed Beta]**
  * Improved galaxy event detection to prevent false notifications about abandoned or newly colonized planets.
  * Added protections for vacation accounts and planets with moons to ensure reported status changes are accurate.

---

## [1.2.5] - 2026-10-09

### 🚀 New Features
* **Nexus Overwatch [Closed Beta]**: Alliance intelligence sharing, live universe activity feed, and multi-device cloud backup.
* **Multi-Device Personal Vault**: Secure end-to-end cloud backup and cross-device sync for expeditions, combats, debris harvests, and costs planner via private Vault Keys.
* **Raid Radar Inactive Target Scout**: Universe-wide inactive target discovery sorted by player rank and distance from empire colonies.
* **Research Time Optimizer**: Dedicated calculator for exact research durations, optimal lab levels, and Intergalactic Research Network (IRN) breakpoints.

### 🐛 Bug Fixes & Polish
* **Raid Radar Live Status**: Target inactive/active statuses immediately update from live galaxy scans to prevent raiding players who have returned to active status.
* **Non-Destructive Target Sync**: Guaranteed safe target resolution during multi-device synchronization to prevent target record deletion.
* **Scrap Merchant Flying Fleets**: Fleets currently in flight are now fully accounted for in Scraptool and fleet capacity breakdowns.
* **Costs Planner Resource Packs**: Fixed resource pack calculations and cart import behavior when planning large empire goals.

---

## [1.2.4] - 2026-09-28

### 🚀 New Features
* **Raid Helper Minimum Resource Filter**: Exponential slider with editable input to filter and dim inactive planets below desired resource thresholds in Galaxy view.
* **Ongoing Upgrades in Amortization & Overseer**: Active building and research queues display live countdown timers in Amortization To-Do and the Overseer bar.

### 🐛 Bug Fixes
* **Collector & Crawler Calculations**: Fixed 50% mine bonus hard cap, overload %, geologist multiplier (8.8x/8.0x), and empire-wide Rock'tal T18 Collector boost.
* **Language-Agnostic Queues**: Fixed building and research queue scraping across all non-English OGame servers.
* **Alliance Shared Expeditions**: Prevented shared alliance expedition reports from polluting personal stats.

---

## [1.2.3] - 2026-09-15

### 🚀 New Features
* **Instant Multi-Page Message Scanning**: Opening Expeditions or Combat Reports tabs automatically imports and saves all pending reports across all pages in a single background operation.
* **Full Moon Background Synchronization**: Background and manual sync synchronizes all moons (resources, fleets, defenses, lunar base, phalanx, jump gate, and items) directly alongside planets.
* **Nexus Overseer Mouse Wheel Navigation**: Scroll directly over the Overseer bar or click the animated mouse scroll indicator to cycle forward and backward through all empire alerts.
* **Integrated In-Game OGNexus Changelog Tab**: Dedicated OGNexus tab inside the in-game messages panel.
