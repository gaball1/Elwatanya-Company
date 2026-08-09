/**
 * Normalizes human-readable names/keys for case-insensitive, Arabic-aware,
 * whitespace-insensitive uniqueness checks (ERP dedupe).
 *
 * - Trims and collapses inner whitespace.
 * - Lowercases Latin characters.
 * - Removes common Arabic diacritics/tashkeel.
 * - Unifies Arabic letter variants so look-alike names compare equal
 *   (أإآ→ا, ة→ه, ى→ي, ئ/ؤ variants).
 */

const DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;
const ALEF = /[\u0622\u0623\u0625]/g; // آ أ إ
const TEH_MARBUTA = /\u0629/g; // ة
const DOTLESS_YEH = /\u0649/g; // ى
const HAMZA_YEH = /\u0626/g; // ئ
const DIACRITIC_SHADDA_BELOW = /\u0651/g;

export function normalizeKey(value: string): string {
  if (!value) return '';
  return value
    .normalize('NFC')
    .replace(DIACRITICS, '')
    .replace(ALEF, 'ا')
    .replace(TEH_MARBUTA, 'ه')
    .replace(DOTLESS_YEH, 'ي')
    .replace(HAMZA_YEH, 'ي')
    .replace(DIACRITIC_SHADDA_BELOW, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}