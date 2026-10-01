// ============================================================================
// NEXUS UNIVERSE NORMALIZATION & MATCHING UTILITIES
// Standardizes Gameforge server domain formats (e.g. s267-en.ogame.gameforge.com)
// to clean universe IDs (e.g. s267-en).
// ============================================================================

/**
 * Cleans and standardizes universe IDs across OGame domains.
 * Examples:
 * - "s267-en.ogame.gameforge.com" -> "s267-en"
 * - "267-en.ogame.gameforge.com"  -> "s267-en"
 * - "267-en"                     -> "s267-en"
 * - "https://s267-en.ogame..."   -> "s267-en"
 */
export function cleanUniverseId(raw?: string | null): string {
  if (!raw) return 's267-en';
  let clean = String(raw).trim().toLowerCase();
  clean = clean.replace(/\.ogame\.gameforge\.com.*$/, '');
  clean = clean.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (/^\d+-[a-z]+$/.test(clean)) {
    clean = 's' + clean;
  }
  return clean || 's267-en';
}

/**
 * Compares two universe strings flexibly.
 * If either universe is unassigned, empty, or 'unknown', it defaults to true
 * so historical user telemetry is never lost due to schema or domain discrepancies.
 */
export function isSameUniverse(uniA?: string | null, uniB?: string | null): boolean {
  if (!uniA || !uniB || uniA === 'unknown' || uniB === 'unknown') {
    return true;
  }
  return cleanUniverseId(uniA) === cleanUniverseId(uniB);
}
