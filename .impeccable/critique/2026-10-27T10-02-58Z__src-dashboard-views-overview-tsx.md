---
target: Overview Empire 360 page
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\_repos\\OGameNexus\\src\\dashboard\\views\\Overview.tsx"
target_fingerprint: "sha256:627d98eef7926a1757a806b77e0ada5163353a6621627088d102c98fc2318ad6"
target_path: "C:\\_repos\\OGameNexus\\src\\dashboard\\views\\Overview.tsx"
timestamp: 2026-10-27T10-02-58Z
slug: src-dashboard-views-overview-tsx
---
# Empire 360° Overview HUD Design Critique

Method: dual-agent (A: fccee58a-1114-44a8-9254-c2aba2900962 · B: e5d0b6f6-194a-47ba-8866-08f45c705075)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 3 | Live Dexie subscriptions react immediately; lacks skeleton states during cold account hydration |
| 2 | Match Between System & Real World | 4 | Flawless alignment with OGame terminology and mental models (MSU, Honor Points, Classes, Scrap Merchant) |
| 3 | User Control and Freedom | 3 | Source checkboxes and scrap presets offer good control; modals lack browser history/URL integration |
| 4 | Consistency and Standards | 2 | Stark clash between React Framer Motion components and embedded vanilla DOM analytics tab |
| 5 | Error Prevention | 3 | Defensive guards on calculations; checkbox hit targets (16px) collide with modal card click zones |
| 6 | Recognition Rather Than Recall | 3 | Strong iconography and species art; complex MSU formula details hidden in obscure 14px button |
| 7 | Flexibility and Efficiency | 3 | Great revenue scenario tuning; zero keyboard accelerators (Esc to dismiss modals, hotkeys) |
| 8 | Aesthetic and Minimalist Design | 2 | High visual noise; 100px donation widget in header; sub-10px typography; legacy table clutter |
| 9 | Error Recovery | 2 | Sterile "No Lifeform data found" and zero-values without actionable sync guidance |
| 10 | Help and Documentation | 2 | Scrap Merchant and Lifeform structure math lacks inline contextual tooltips for new commanders |
| **Total** | | **27/40** | **Moderate (Needs Targeted Refinement)** |

## Design Specificity Verdict

**Verdict: Strong Domain Identity with an Architectural Split**

The Empire 360° dashboard is indisputably custom-crafted for OGame v8-v10 rather than generic dashboard templates. Its data models (MSU conversion rates, rolling 7-day revenue aggregation, Scrap Merchant recovery ratios, and 4-species Lifeform progress) are deeply tied to actual game mechanics.

However, the page is bifurcated:
- **Upper Command Deck (Empire Power Core & Lifeform Hub)**: Modern obsidian glassmorphic HUD with SVG reactor conduits, Framer Motion transitions, and high-tech telemetry.
- **Lower Deck (At-A-Glance)**: Hot-grafts an imperative legacy DOM script (`renderAnalyticsTab`), introducing mismatched fonts, cards-in-cards, and a dense financial ledger that breaks the sci-fi command deck immersion.

Deterministic scan via `impeccable detect` returned 0 direct regex violations on `Overview.tsx`, but identified an upstream `gradient-text` anti-pattern on the view title (`index.css`), pseudo side-tab accent bars on data slats, and critical accessibility deficits on interactive `<div>` slats and modals.

## Overall Impression
The upper viewport delivers an authentic, authoritative command console experience for an OGame commander. The fusion gauge and species matrix look commanding. However, interaction collisions on the slats, an intrusive donation widget in the tactical header, and a jarring legacy table in the bottom half degrade the overall craft.

## What's Working
1. **Unified MSU Power Core Gauge**: Consolidating 5 heterogeneous revenue streams into a single standardized MSU/day metric with active dominance indicators.
2. **Scrap Merchant Integration**: Realistic recovery modeling (35% base to 100% event presets) that solves a core real-world player pain point.
3. **2x2 Lifeform Evolution Matrix**: High-impact tactical matrix with official game art thumbnails and 6px glowing energy conduits.

## Priority Issues
- **[P1] Architectural & Visual Clash in At-A-Glance**: Legacy vanilla DOM script injects disparate styling and nested cards. Fix: Replace with native React macro-velocity charts and compact telemetry pills. (/impeccable layout)
- **[P1] Keyboard Accessibility & Slat Interaction Collision**: Data slats are `<div>` elements with nested 16px checkboxes causing accidental modal triggers. Missing keyboard focus and Esc handlers. Fix: Semantic roles, separate drilldown button, Esc handler. (/impeccable harden)
- **[P2] Invasive Ko-fi Patronage Card in Header**: 100px donation widget consumes prime command deck space. Fix: Move to sidebar bottom or settings; reclaim header for active fleet movements or incoming threat alerts. (/impeccable distill)
- **[P2] Sub-10px Typography & Token Semantic Collisions**: Microcopy drops to 8.3px; color tokens collide between red and amber for metal. Fix: Strict 11.2px minimum font floor and unified semantic tokens. (/impeccable typeset)
- **[P3] Cold-Start Empty States**: Blank containers when data is absent without sync guidance. Fix: Actionable tactical empty states. (/impeccable onboard)

## Persona Red Flags
- **Alex (Power User)**: Sluggish modal-only drilldowns disrupt rapid fleet fueling calculations; Esc key fails to close modals; missing keyboard accelerators.
- **Jordan (First-Timer)**: Overwhelmed by unexplained acronyms (MSU/d, HP); clicks Salvaged Fleet expecting details and gets an intimidating mathematical recovery modal.

## Minor Observations
- Fallback lifeform names are hardcoded English strings bypassing i18n locales.
- `.nexus-yield-info-btn::after` tooltip is fixed at 320px and clips on screens <1280px.
- High inline style density across 2,500+ lines complicates CSS caching and media queries.

## Questions to Consider
1. Why is Planetary Network Efficiency locked behind a full-screen modal instead of an expandable tactical drawer on the canvas?
2. Does the granular 7-day expedition table belong on the Overview, or should the bottom card be an "Empire Fleet Radar & Threat Monitor"?
3. Could the top-right header slot be transformed into a live Tactical Alert HUD (active attacks, fleet movements, server event bonuses)?
