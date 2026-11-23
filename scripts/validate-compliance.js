import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const isCompact = process.argv.includes('--compact') || process.argv.includes('-q') || process.argv.includes('--quiet');

// ANSI Colors for clean terminal output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warningsCount = 0;

const results = [];

function pass(name, detail = '') {
  totalTests++;
  passedTests++;
  results.push({ status: 'PASS', name, detail });
}

function fail(name, error, file = '', line = 0) {
  totalTests++;
  failedTests++;
  results.push({ status: 'FAIL', name, error, file, line });
}

function warn(name, note, file = '', line = 0) {
  warningsCount++;
  results.push({ status: 'WARN', name, note, file, line });
}

function walkDir(dir, filterExt = ['.ts', '.tsx', '.js', '.css', '.json']) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('dist-') && entry.name !== '.git') {
        files = files.concat(walkDir(fullPath, filterExt));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (filterExt.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function getRelativePath(p) {
  return path.relative(rootDir, p).replace(/\\/g, '/');
}

/**
 * Extract the exact function or block argument passed to setInterval(...)
 */
function extractCallBody(content, startIndex) {
  let openParen = content.indexOf('(', startIndex);
  if (openParen === -1) return '';
  let depth = 1;
  let i = openParen + 1;
  while (i < content.length && depth > 0) {
    if (content[i] === '(') depth++;
    else if (content[i] === ')') depth--;
    i++;
  }
  return content.slice(openParen + 1, i - 1);
}

console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
console.log(`${BOLD}${CYAN}   OGAME NEXUS — GAMEFORGE COMPLIANCE AUDIT SUITE    ${RESET}`);
console.log(`${BOLD}${CYAN}   Based on OGame Origin Third-Party Tool Rules     ${RESET}`);
console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

// -----------------------------------------------------------------------------
// 1. CATEGORY 5 AUDIT: PERIODIC TIMERS, BACKGROUND POLLING & SYNC DISCIPLINE
// -----------------------------------------------------------------------------
const contentAndBgFiles = walkDir(path.join(rootDir, 'src', 'content'))
  .concat(walkDir(path.join(rootDir, 'src', 'background')));

let periodicNetworkCallsFound = false;

for (const file of contentAndBgFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let searchIdx = 0;

  while ((searchIdx = content.indexOf('setInterval(', searchIdx)) !== -1) {
    const lineNumber = content.slice(0, searchIdx).split('\n').length;
    const callBody = extractCallBody(content, searchIdx);

    // Check for network calls inside the timer
    const hasNetwork = /fetch\(|\$\.ajax\(|XMLHttpRequest|axios\(/i.test(callBody);
    const hasSyncFunction = /performBackgroundEmpireSync|checkAutoSync|scrapeAndSync|fetchEmpireProductionQueue|trackRaw|fetchPlanet/i.test(callBody);
    const hasOgameEndpoint = /externaldataexport|component=empire|component=lfbonuses|shop\/inventoryGet|productionqueue|component=eventList|accountInfo/i.test(callBody);

    // Also check if named callback references a sync function
    let callsForbiddenNamedFn = false;
    const matchNamedFn = callBody.match(/^([a-zA-Z0-9_]+)\s*,/);
    if (matchNamedFn) {
      const fnName = matchNamedFn[1];
      if (/sync|fetch|scrape|poll|updateempire|checkauto/i.test(fnName)) {
        // Look up function definition in file
        const fnDefRegex = new RegExp(`(?:function\\s+${fnName}|const\\s+${fnName}\\s*=)[^}]+`, 'g');
        const fnMatch = content.match(fnDefRegex);
        if (fnMatch && (/fetch\(|\$\.ajax\(|externaldataexport|empire/i.test(fnMatch[0]))) {
          callsForbiddenNamedFn = true;
        }
      }
    }

    if (hasNetwork || hasSyncFunction || hasOgameEndpoint || callsForbiddenNamedFn) {
      fail(
        'Automated In-Game Polling via setInterval',
        'Found setInterval triggering network sync or OGame endpoint (Gameforge Category 5 violation)',
        getRelativePath(file),
        lineNumber
      );
      periodicNetworkCallsFound = true;
    } else {
      warn(
        'Client-Only setInterval Observed',
        'Found client-only UI timer (verified 0 network calls)',
        getRelativePath(file),
        lineNumber
      );
    }

    searchIdx += 12; // advance past setInterval
  }
}

if (!periodicNetworkCallsFound) {
  pass('Category 5: Zero periodic timers calling OGame endpoints');
}

// Check 1.2: EMPIRE_SYNC_COOLDOWN_MS enforcement (must be >= 30,000 ms)
const contentIndexPath = path.join(rootDir, 'src', 'content', 'index.ts');
if (fs.existsSync(contentIndexPath)) {
  const contentIndex = fs.readFileSync(contentIndexPath, 'utf8');
  const match = contentIndex.match(/EMPIRE_SYNC_COOLDOWN_MS\s*=\s*([^;]+);/);
  if (match) {
    let expr = match[1].trim();
    let cooldownMs = 0;
    try {
      // Safely evaluate simple math like "30 * 1000"
      if (/^[0-9\s*+-\/]+$/.test(expr)) {
        cooldownMs = Function(`"use strict"; return (${expr});`)();
      } else {
        cooldownMs = parseInt(expr, 10);
      }
    } catch {
      cooldownMs = 0;
    }

    if (cooldownMs >= 30000) {
      pass(`Category 5: Navigation Sync Cooldown enforced (${cooldownMs / 1000}s >= 30s)`);
    } else {
      fail(
        'Insufficient Sync Cooldown',
        `EMPIRE_SYNC_COOLDOWN_MS is ${cooldownMs}ms (must be >= 30000ms)`,
        'src/content/index.ts'
      );
    }
  } else {
    fail('Missing Sync Cooldown', 'EMPIRE_SYNC_COOLDOWN_MS constant not found in src/content/index.ts');
  }
}

// Check 1.3: Forbidden cp= (change planet) parameter in background calls
let forbiddenCpFound = false;
for (const file of contentAndBgFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/(?:fetch|\$\.ajax|axios)\s*\(.*[?&]cp=\d+/i.test(line)) {
      fail('Forbidden cp= Parameter in Background Fetch', 'Automated calls must never mutate active planet via cp= parameter', getRelativePath(file), idx + 1);
      forbiddenCpFound = true;
    }
  });
}
if (!forbiddenCpFound) {
  pass('Category 5: No cp= (change planet) mutations in background calls');
}

// Check 1.4: Background alarms calling game endpoints
const bgIndexPath = path.join(rootDir, 'src', 'background', 'index.ts');
if (fs.existsSync(bgIndexPath)) {
  const bgContent = fs.readFileSync(bgIndexPath, 'utf8');
  if (bgContent.includes('chrome.alarms.create')) {
    fail('Background Alarms Triggering Network', 'Found chrome.alarms.create in background script', 'src/background/index.ts');
  } else {
    pass('Category 5: No chrome.alarms background tasks scheduled');
  }
}

// -----------------------------------------------------------------------------
// 2. AUTOMATION & MACROS (1 CLICK = 1 ACTION RULE)
// -----------------------------------------------------------------------------
// Check 2.1: No auto-refresh (location.reload on a timer)
let autoRefreshFound = false;
for (const file of contentAndBgFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/(?:location\.reload|window\.location\.reload)\s*\(/.test(line)) {
      const windowStart = Math.max(0, idx - 5);
      const surrounding = lines.slice(windowStart, idx + 5).join('\n');
      if (/setTimeout|setInterval/i.test(surrounding)) {
        fail('Automated Page Reload on Timer', 'location.reload() inside timer is forbidden', getRelativePath(file), idx + 1);
        autoRefreshFound = true;
      }
    }
  });
}
if (!autoRefreshFound) {
  pass('Rule 1.1 & 1.3: No auto-refresh or automated page reloads');
}

// -----------------------------------------------------------------------------
// 3. MONETIZATION & AD PROTECTION
// -----------------------------------------------------------------------------
const cssFiles = walkDir(path.join(rootDir, 'src', 'content'), ['.css']);
let adHidingFound = false;
const bannedAdSelectors = [
  '#banner_skyscraper',
  '#topframe',
  '#advertisement',
  '.advertisement',
  '#shop',
  '#merchant',
  '#officers',
  'div.officers',
  '#siteFooter',
  '#footer'
];

for (const file of cssFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const sel of bannedAdSelectors) {
    const escaped = sel.replace('.', '\\.').replace('#', '\\#');
    const regex = new RegExp(`${escaped}\\s*\\{[^}]*(?:display\\s*:\\s*none|visibility\\s*:\\s*hidden|opacity\\s*:\\s*0|height\\s*:\\s*0px)`, 'i');
    if (regex.test(content)) {
      fail('Monetization / Ad Element Hidden', `CSS rule hides or suppresses ${sel}`, getRelativePath(file));
      adHidingFound = true;
    }
  }
}
if (!adHidingFound) {
  pass('Rule 1.7: Monetization and legal elements fully preserved (zero ad-hiding CSS)');
}

// -----------------------------------------------------------------------------
// 4. AUTOMATED ALARMS & INACTIVE NOTIFICATIONS
// -----------------------------------------------------------------------------
let automatedAlarmFound = false;
for (const file of contentAndBgFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/discord\.com\/api\/webhooks/i.test(line)) {
      fail('Automated Discord Webhook Detected', 'Discord webhooks for in-game alerts are strictly forbidden (§1.4)', getRelativePath(file), idx + 1);
      automatedAlarmFound = true;
    }
  });
}
if (!automatedAlarmFound) {
  pass('Rule 1.4: No automated in-game alarms or Discord webhook alerts');
}

// -----------------------------------------------------------------------------
// 5. VERSION CONSISTENCY & REPUTATION AUDIT
// -----------------------------------------------------------------------------
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'manifest.json'), 'utf8'));
const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'dashboard', 'App.tsx'), 'utf8');

const pkgVer = pkg.version;
const manifestVer = manifest.version;
const appVerMatch = appTsx.match(/return\s*["']([0-9.]+)["']/);
const appVer = appVerMatch ? appVerMatch[1] : null;

if (pkgVer === manifestVer && (!appVer || appVer === pkgVer)) {
  pass(`Version Alignment: v${pkgVer} synchronized across package.json, manifest.json, and App.tsx`);
} else {
  fail('Version Desynchronization', `package.json=${pkgVer}, manifest.json=${manifestVer}, App.tsx=${appVer}`);
}

// -----------------------------------------------------------------------------
// 6. KILL-SWITCH STATUS AUDIT
// -----------------------------------------------------------------------------
const killSwitchPath = path.join(rootDir, 'src', 'config', 'killSwitch.ts');
if (fs.existsSync(killSwitchPath)) {
  const ksContent = fs.readFileSync(killSwitchPath, 'utf8');
  const isDisabled = /IS_EXTENSION_DISABLED\s*=\s*true/.test(ksContent);
  if (isDisabled) {
    warn('Kill-Switch State', 'IS_EXTENSION_DISABLED is TRUE (Extension is deactivated for emergency compliance)');
  } else {
    pass('Kill-Switch State: IS_EXTENSION_DISABLED is FALSE (Extension is active)');
  }
} else {
  fail('Missing Kill-Switch', 'src/config/killSwitch.ts does not exist');
}

// -----------------------------------------------------------------------------
// 7. OGAME REQUEST GUARD 1.0.0 INTEGRITY & AUDIT
// -----------------------------------------------------------------------------
import crypto from 'crypto';

const EXPECTED_GUARD_SHA256 = 'ef8d4c200da1e54e05f23815db033d41d24638d2a4e27fb3f5ae0af0d119af5f';
const guardSourcePath = path.join(rootDir, 'public', 'ogame-request-guard.js');

if (fs.existsSync(guardSourcePath)) {
  const guardBytes = fs.readFileSync(guardSourcePath);
  const guardHash = crypto.createHash('sha256').update(guardBytes).digest('hex').toLowerCase();

  if (guardHash === EXPECTED_GUARD_SHA256) {
    pass(`OGame Request Guard: public/ogame-request-guard.js byte-identical match (${guardHash.slice(0, 16)}...)`);
  } else {
    fail('OGame Request Guard Hash Mismatch', `Expected ${EXPECTED_GUARD_SHA256}, got ${guardHash}`, 'public/ogame-request-guard.js', 1);
  }
} else {
  fail('Missing OGame Request Guard', 'public/ogame-request-guard.js does not exist');
}

// Check built dist-chrome guard if present
const distChromeGuard = path.join(rootDir, 'dist-chrome', 'ogame-request-guard.js');
if (fs.existsSync(distChromeGuard)) {
  const distBytes = fs.readFileSync(distChromeGuard);
  const distHash = crypto.createHash('sha256').update(distBytes).digest('hex').toLowerCase();
  if (distHash === EXPECTED_GUARD_SHA256) {
    pass(`Build Distribution Guard: dist-chrome/ogame-request-guard.js verified unchanged`);
  } else {
    fail('Build Distribution Guard Hash Mismatch', `dist-chrome guard altered! Expected ${EXPECTED_GUARD_SHA256}, got ${distHash}`);
  }
}

// Check built dist-firefox guard if present
const distFirefoxGuard = path.join(rootDir, 'dist-firefox', 'ogame-request-guard.js');
if (fs.existsSync(distFirefoxGuard)) {
  const distBytes = fs.readFileSync(distFirefoxGuard);
  const distHash = crypto.createHash('sha256').update(distBytes).digest('hex').toLowerCase();
  if (distHash === EXPECTED_GUARD_SHA256) {
    pass(`Build Distribution Guard: dist-firefox/ogame-request-guard.js verified unchanged`);
  } else {
    fail('Build Distribution Guard Hash Mismatch', `dist-firefox guard altered! Expected ${EXPECTED_GUARD_SHA256}, got ${distHash}`);
  }
}

// Verify pageContext.ts (world: MAIN) has NO network requests
const pageContextPath = path.join(rootDir, 'src', 'content', 'pageContext.ts');
if (fs.existsSync(pageContextPath)) {
  const pcContent = fs.readFileSync(pageContextPath, 'utf8');
  if (/\b(fetch|XMLHttpRequest|\$\.ajax|\$\.get|\$\.post)\b/.test(pcContent)) {
    fail('MAIN World Network Request Violation', 'pageContext.ts runs in world: MAIN and must not initiate network requests', 'src/content/pageContext.ts');
  } else {
    pass('MAIN World Isolation: pageContext.ts has zero outbound network calls');
  }
}

// -----------------------------------------------------------------------------
// 8. ZERO RAW NETWORK CALLS OUTSIDE GUARD (AGENTS.md §5)
// -----------------------------------------------------------------------------
const rawNetFiles = walkDir(path.join(rootDir, 'src'), ['.ts', '.tsx', '.js']);
let rawNetViolations = 0;
const rawNetPatterns = [
  { regex: /(?<![A-Za-z0-9_$.])fetch\s*\(/, label: 'raw fetch()' },
  { regex: /\bnew\s+XMLHttpRequest\s*\(/, label: 'XMLHttpRequest' },
  { regex: /\$\.ajax\s*\(/, label: '$.ajax()' },
  { regex: /\bGM_xmlhttpRequest\s*\(/, label: 'GM_xmlhttpRequest()' },
  { regex: /\bnew\s+WebSocket\s*\(/, label: 'WebSocket' },
  { regex: /\b(globalThis|window)\.fetch\s*=/, label: 'global fetch monkey-patch' },
];
for (const file of rawNetFiles) {
  const rel = getRelativePath(file);
  if (rel === 'src/utils/networkGuard.ts' || rel.endsWith('.d.ts')) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    for (const pat of rawNetPatterns) {
      if (pat.regex.test(line)) {
        rawNetViolations++;
        fail('AGENTS.md §5: Raw Network Call Outside Guard', `Detected ${pat.label} — route through networkGuard.ts`, rel, idx + 1);
      }
    }
  });
}
if (rawNetViolations === 0) {
  pass('AGENTS.md §5: Zero raw fetch/XHR/WebSocket calls or global fetch patches in src/');
}

// -----------------------------------------------------------------------------
// 9. MANIFEST PERMISSION HYGIENE
// -----------------------------------------------------------------------------
const perms = Array.isArray(manifest.permissions) ? manifest.permissions : [];
const hostPerms = Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];
const forbiddenPerms = perms.filter((p) => p === 'alarms');
const forbiddenHosts = hostPerms.filter((h) => /localhost|127\.0\.0\.1|\*\.workers\.dev/.test(h));
if (forbiddenPerms.length === 0 && forbiddenHosts.length === 0) {
  pass('Manifest Hygiene: No unused alarms permission or dev/wildcard host_permissions');
} else {
  fail(
    'Manifest Permission Hygiene',
    `Disallowed entries in src/manifest.json: ${[...forbiddenPerms, ...forbiddenHosts].join(', ')}`,
    'src/manifest.json',
    1
  );
}

// -----------------------------------------------------------------------------
// 10. WORKER SECRETS & PUBLIC BYPASS HYGIENE
// -----------------------------------------------------------------------------
const wranglerPath = path.join(rootDir, 'nexus-sync-worker', 'wrangler.jsonc');
if (fs.existsSync(wranglerPath)) {
  const wranglerRaw = fs.readFileSync(wranglerPath, 'utf8');
  const hasCommittedSecret = /"(SERVER_PEPPER|EXTENSION_SECRET|MASTER_ADMIN_SECRET)"\s*:/.test(wranglerRaw);
  if (hasCommittedSecret) {
    fail('Worker Secrets Leak', 'Secrets must be managed via `wrangler secret put`, not committed in wrangler.jsonc', 'nexus-sync-worker/wrangler.jsonc', 1);
  } else {
    pass('Worker Secrets Hygiene: Zero secrets committed in wrangler.jsonc');
  }
}

const workerIndexPath = path.join(rootDir, 'nexus-sync-worker', 'src', 'index.ts');
if (fs.existsSync(workerIndexPath)) {
  const wiContent = fs.readFileSync(workerIndexPath, 'utf8');
  const bypassesTopFlopApi = /path\.startsWith\(['"]\/api\/(v1\/)?topflop\/['"]\)/.test(wiContent) &&
    /if\s*\([^)]*path\.startsWith\(['"]\/api\/(v1\/)?topflop\/['"]\)[^)]*\)\s*\{\s*return;\s*\}/.test(wiContent);
  if (bypassesTopFlopApi) {
    fail('Worker Public Bypass Violation', '/api/topflop/* must not bypass global worker middleware', 'nexus-sync-worker/src/index.ts', 1);
  } else {
    pass('Worker Middleware Hygiene: /api/topflop/* and /topflop/status protected');
  }
}

// -----------------------------------------------------------------------------
// 11. DIRECT PROBING RULE (AGENTS.md §3.5)
// -----------------------------------------------------------------------------
let probeViolations = 0;
for (const file of rawNetFiles) {
  const rel = getRelativePath(file);
  if (rel.includes('galaxy') || rel.includes('espionage') || rel === 'src/content/pageContext.ts' || rel.endsWith('.d.ts')) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    if (/action=miniFleet|page=ingame&component=minifleet/i.test(line)) {
      probeViolations++;
      fail('AGENTS.md §3.5: Direct Probing Outside Galaxy/Inbox', 'Direct miniFleet probing is only permitted in galaxy view or inbox spy reports', rel, idx + 1);
    }
  });
}
if (probeViolations === 0) {
  pass('AGENTS.md §3.5: Direct probing strictly confined to Galaxy/Inbox');
}

// -----------------------------------------------------------------------------
// PRINT AUDIT REPORT
// -----------------------------------------------------------------------------
if (isCompact) {
  if (failedTests > 0) {
    console.log(`${RED}${BOLD}⛔ COMPLIANCE FAILED (${passedTests}/${totalTests} passed, ${failedTests} failed):${RESET}`);
    for (const res of results.filter((r) => r.status === 'FAIL')) {
      console.log(`  ${RED}✖${RESET} ${res.name}: ${res.error}${res.file ? ` (${res.file}:${res.line})` : ''}`);
    }
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}✅ COMPLIANCE PASS: ${passedTests}/${totalTests} checks | 0 failures${RESET}`);
    process.exit(0);
  }
}

console.log(`${BOLD}Audit Summary:${RESET}`);
for (const res of results) {
  if (res.status === 'PASS') {
    console.log(`  ${GREEN}✔ [PASS]${RESET} ${res.name} ${res.detail ? GRAY + '(' + res.detail + ')' + RESET : ''}`);
  } else if (res.status === 'FAIL') {
    console.log(`  ${RED}✖ [FAIL]${RESET} ${BOLD}${res.name}${RESET}: ${res.error}`);
    if (res.file) {
      console.log(`         ${GRAY}↳ ${res.file}:${res.line}${RESET}`);
    }
  } else if (res.status === 'WARN') {
    console.log(`  ${YELLOW}▲ [NOTE]${RESET} ${res.name}: ${res.note}`);
    if (res.file) {
      console.log(`         ${GRAY}↳ ${res.file}:${res.line}${RESET}`);
    }
  }
}

console.log(`\n------------------------------------------------------`);
console.log(`Checks passed: ${GREEN}${passedTests}/${totalTests}${RESET} | Failures: ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET} | Notes: ${YELLOW}${warningsCount}${RESET}`);

if (failedTests > 0) {
  console.log(`\n${RED}${BOLD}⛔ COMPLIANCE AUDIT FAILED! Address the violations above before releasing.${RESET}\n`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}${BOLD}✅ COMPLIANCE AUDIT PASSED! Codebase adheres to Gameforge Origin guidelines.${RESET}\n`);
  process.exit(0);
}
