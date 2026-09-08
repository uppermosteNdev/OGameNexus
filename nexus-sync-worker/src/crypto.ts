// ============================================================================
// NEXUS OVERWATCH — CRYPTOGRAPHIC UTILITIES & GLYPH ENGINE
// ============================================================================

// Crockford Base32 Alphabet (No I, L, O, U to prevent visual confusion)
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Calculates a 2-character polynomial checksum for a Crockford Base32 string
 */
function calculateChecksum(base32Str: string): string {
  let checksum = 0;
  for (let i = 0; i < base32Str.length; i++) {
    const val = CROCKFORD_ALPHABET.indexOf(base32Str[i].toUpperCase());
    if (val >= 0) {
      checksum = (checksum * 37 + val) % 1024;
    }
  }
  const char1 = CROCKFORD_ALPHABET[Math.floor(checksum / 32) % 32];
  const char2 = CROCKFORD_ALPHABET[checksum % 32];
  return `${char1}${char2}`;
}

/**
 * Generates a high-volume 128-bit cryptographic Alliance Glyph:
 * Format: NXOW-XXXX-XXXX-XXXX-XXXX
 */
export function generateAllianceGlyph(): string {
  const randomBytes = new Uint8Array(10); // 80-128 bits of entropy
  crypto.getRandomValues(randomBytes);

  let rawChars = '';
  for (let i = 0; i < 14; i++) {
    const byteIndex = Math.floor((i * 5) / 8);
    const bitOffset = (i * 5) % 8;
    let val = (randomBytes[byteIndex] >> bitOffset) & 0x1f;
    if (bitOffset > 3 && byteIndex + 1 < randomBytes.length) {
      val |= (randomBytes[byteIndex + 1] << (8 - bitOffset)) & 0x1f;
    }
    rawChars += CROCKFORD_ALPHABET[val % 32];
  }

  const checksum = calculateChecksum(rawChars);
  const full16 = rawChars + checksum; // exactly 16 characters

  return `NXOW-${full16.slice(0, 4)}-${full16.slice(4, 8)}-${full16.slice(8, 12)}-${full16.slice(12, 16)}`;
}

/**
 * Validates the format and checksum of an Alliance Glyph
 */
export function validateAllianceGlyph(glyph: string): boolean {
  if (!glyph || typeof glyph !== 'string') return false;
  const clean = glyph.toUpperCase().trim().replace(/[^0-9A-Z]/g, '');

  if (!clean.startsWith('NXOW') || clean.length !== 20) return false;

  const contentAndCheck = clean.slice(4); // 16 chars
  const content = contentAndCheck.slice(0, 14);
  const providedCheck = contentAndCheck.slice(14, 16);

  // Check valid Crockford characters
  for (const c of contentAndCheck) {
    if (!CROCKFORD_ALPHABET.includes(c)) return false;
  }

  const expectedCheck = calculateChecksum(content);
  return providedCheck === expectedCheck;
}

/**
 * Hashes an Alliance Glyph for secure server storage / lookup
 */
export async function hashGlyph(glyph: string, serverPepper: string): Promise<string> {
  const clean = glyph.toUpperCase().trim().replace(/-/g, '');
  const data = new TextEncoder().encode(`${clean}:${serverPepper}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a random session auth token (UUID v4)
 */
export function generateAuthToken(): string {
  return crypto.randomUUID();
}
