---
name: release-validation
description: >-
  Audits and verifies that OGame Nexus strictly adheres to Gameforge and OGame Origin
  third-party tool rules before any release or version bump. Checks for zero automated
  polling (setInterval/alarms), 1-click=1-action rule, sync cooldowns, monetization preservation,
  and version alignment. Trigger when the user mentions /release-validation, /release-compliance,
  "release validation", "validate compliance", or preparing a new release.
---

# OGame Nexus Release Compliance & Validation

This workflow performs an on-demand Gameforge toleration audit to ensure that no forbidden features (specifically Category 5 automated background polling, macros, or ad suppression) exist in the codebase.

## Procedures to Execute

### 1. Run the Automated Compliance Linter
Execute the static compliance script:
```powershell
node scripts/validate-compliance.js
```
Verify that all 8 Origin compliance checks pass with 0 failures:
- Category 5: Zero periodic timers calling OGame endpoints.
- Category 5: Navigation Sync Cooldown enforced ($\ge 30\text{s}$).
- Category 5: No `cp=` (change planet) mutations in background calls.
- Category 5: No `chrome.alarms` scheduled for network calls.
- Rule 1.1 & 1.3: No auto-refresh or automated page reloads.
- Rule 1.7: Monetization and legal elements fully preserved (zero ad-hiding CSS).
- Rule 1.4: No automated in-game alarms or Discord webhook alerts.
- Version Alignment: Version synchronized across `package.json`, `src/manifest.json`, and `src/dashboard/App.tsx`.

### 2. Run TypeScript Type Check
Execute:
```powershell
npx tsc --noEmit
```
Ensure there are 0 TypeScript compilation errors.

### 3. Audit Git Diff for Network & Timer Changes
If git is available, inspect recent modifications:
```powershell
git diff --name-only HEAD~1
```
Check modified files for any newly introduced:
- `fetch(` or `$.ajax(` or `XMLHttpRequest`
- `setTimeout(` or `setInterval(`
- In-game endpoints (`externaldataexport`, `empire`, `lfbonuses`, etc.)
- Manifest permission changes (e.g. host permissions or alarms)

### 4. Check Kill-Switch Status
Inspect `src/config/killSwitch.ts`:
- If preparing an emergency kill-switch release (e.g. v1.3.1), `IS_EXTENSION_DISABLED` must be `true`.
- If preparing a normal tolerated release (e.g. v1.3.2+), `IS_EXTENSION_DISABLED` should be `false`.

### 5. Generate Compliance Certification Report
Format a clean markdown report in the response:
- **Gameforge Toleration Verdict**: ✅ APPROVED FOR RELEASE or ⛔ BLOCKED (with exact file and line issues).
- **Rule-by-rule Checklist**:
  - `[PASS]` Category 5: Automated Polling & Timers
  - `[PASS]` Rule 1.1: 1 Click = 1 Action (No Macros)
  - `[PASS]` Rule 1.3: No Auto-Refresh
  - `[PASS]` Rule 1.4: No Inactive Push Alarms / Webhooks
  - `[PASS]` Rule 1.5.1: Direct Probing Bound to Inbox / Galaxy
  - `[PASS]` Rule 1.7: Monetization & Ad Elements Untouched
  - `[PASS]` Version Synchronization
- **Recommended Next Steps**: Command to package (`npm run build:chrome` or `npm run build:firefox`).
