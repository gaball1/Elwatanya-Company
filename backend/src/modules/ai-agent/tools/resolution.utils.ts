/**
 * Pure entity-resolution helpers for the AI agent.
 * Used by the ERP resolution tools to match projects, buildings and
 * contractors by name (partial / Arabic / English / case-insensitive / fuzzy).
 */

export function normalize(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // tashkeel + tatweel
    .replace(/[أإآ]/g, 'ا') // unify hamza-on-alef
    .replace(/ى/g, 'ي') // alif maqsura -> ya
    .replace(/ة/g, 'ه') // ta marbuta -> ha
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((t) => (t.length > 3 && t.startsWith('ال') ? t.replace(/^ال/, '') : t))
    .join(' ');
}

/**
 * Arabic construction terms mapped to their English / transliterated aliases.
 * Lets English queries (e.g. "pyramids", "delta", "concrete") match Arabic
 * contractor and project names.
 */
const ARABIC_TERM_ALIASES: Record<string, string[]> = {
  'الاهرام': ['pyramids', 'pyramid', 'ahram', 'al-ahram', 'al ahram'],
  'الاهرامات': ['pyramids', 'pyramid'],
  'النيل': ['nile', 'al-nil', 'el-nil', 'al nil'],
  'الدلتا': ['delta', 'al-delta', 'el-delta', 'al delta'],
  'النور': ['nour', 'noor', 'al-nour', 'al nour', 'light'],
  'الصعيد': ['said', 'saeed', 'saed', 'al-said', 'el-said', 'al said', 'upper-egypt'],
  'الرشيدي': ['rashidi', 'al-rashidi', 'el-rashidi', 'al rashidi'],
  'الواحه': ['oasis', 'al-waha', 'el-waha', 'waha', 'al waha'],
  'مقاولات': ['contracting', 'contractors', 'constructions', 'construction', 'general-contracting'],
  'مقاول': ['contractor', 'contracting'],
  'شركه': ['company', 'co', 'firm'],
  'مؤسسه': ['foundation', 'establishment'],
  'بناء': ['construction', 'building', 'build'],
  'خرسانه': ['concrete', 'ready-mix', 'ready mix'],
  'هيكل': ['structure', 'structural'],
  'الهيكل': ['structure', 'structural'],
  'تشطيبات': ['finishing', 'finishes', 'finish'],
  'محاره': ['plaster'],
  'دهانات': ['paints', 'paint'],
  'كهرباء': ['electric', 'electrical', 'electricity'],
  'كهربائيه': ['electric', 'electrical'],
  'اعمال': ['works', 'general', 'operations'],
  'عامه': ['general'],
  'مسلحه': ['reinforced'],
};

/** English/transliterated aliases for a normalized Arabic name. */
function englishAliases(normalizedCandidate: string): string[] {
  if (!normalizedCandidate) return [];
  const aliases = new Set<string>();
  const add = (arr: string[]) => arr.forEach((x) => aliases.add(x.toLowerCase().replace(/[\s-]+/g, ' ')));
  if (ARABIC_TERM_ALIASES[normalizedCandidate]) add(ARABIC_TERM_ALIASES[normalizedCandidate]);
  for (const token of normalizedCandidate.split(' ')) {
    if (ARABIC_TERM_ALIASES[token]) add(ARABIC_TERM_ALIASES[token]);
    const stripped = token.replace(/^ال/, '');
    if (stripped && ARABIC_TERM_ALIASES[stripped]) add(ARABIC_TERM_ALIASES[stripped]);
    if (ARABIC_TERM_ALIASES['ال' + stripped]) add(ARABIC_TERM_ALIASES['ال' + stripped]);
  }
  return [...aliases];
}

/** Score an English/transliterated alias against the query (0 = no alias match). */
function aliasScoreFor(normalizedCandidate: string, b: string): number {
  const aliases = englishAliases(normalizedCandidate);
  if (aliases.length === 0) return 0;
  let best = 0;
  const bTokens = b.split(' ').filter(Boolean);
  for (const raw of aliases) {
    const n = normalize(raw);
    if (!n) continue;
    if (n === b) best = Math.max(best, 0.95);
    else if (n.includes(b)) best = Math.max(best, 0.9);
    else if (b.includes(n)) best = Math.max(best, 0.85);
    else if (nTokensMatch(n, bTokens)) best = Math.max(best, 0.8);
  }
  return best;
}

function nTokensMatch(alias: string, bTokens: string[]): boolean {
  const aTokens = alias.split(' ').filter(Boolean);
  return bTokens.some((bt) => {
    if (bt.length < 2) return false;
    return aTokens.some((at) => at.startsWith(bt) || bt.startsWith(at) || at.includes(bt) || bt.includes(at));
  });
}

export function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const dp: number[] = Array.from({ length: lb + 1 }, (_, j) => j);
  for (let i = 1; i <= la; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= lb; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[lb];
}

/** Score 0..1 how well a candidate name matches a query. */
export function scoreName(candidate: string, query: string): number {
  const a = normalize(candidate);
  const b = normalize(query);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b)) return 0.92; // query contained in candidate
  if (b.includes(a)) return 0.85; // candidate contained in query
  const aTokens = a.split(' ').filter(Boolean);
  const bTokens = b.split(' ').filter(Boolean);
  if (bTokens.length > 1 && bTokens.every((t) => a.includes(t))) return 0.88;
  // Token-level fuzzy: any candidate token starts with any query token (or vice versa)
  for (const bt of bTokens) {
    if (bt.length < 2) continue;
    if (aTokens.some((at) => at.startsWith(bt) || bt.startsWith(at))) return 0.8;
    if (aTokens.some((at) => at.includes(bt) || bt.includes(at))) return 0.72;
  }
  // English / transliterated alias matching (e.g. "pyramids" -> "الأهرام")
  const aliasScore = aliasScoreFor(a, b);
  if (aliasScore > 0) return aliasScore;
  // Full-string edit distance fallback for fuzzy typos
  const sim = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  if (sim >= 0.72) return sim * 0.9;
  return 0;
}

/** Return the single best match above threshold, or null. */
export function pickBest<T>(
  items: T[],
  query: string,
  getName: (item: T) => string,
  threshold = 0.6,
): T | null {
  let best: T | null = null;
  let bestScore = threshold;
  for (const item of items) {
    const score = scoreName(getName(item), query);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function sanitizeUuids(text: string): string {
  return (text || '').replace(UUID_REGEX, '[id]');
}

export function containsUuid(text: string): boolean {
  return UUID_REGEX.test(text || '');
}

export function formatMoney(value: number | undefined | null): string {
  const v = Number(value ?? 0);
  return new Intl.NumberFormat('en-EG', {
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}
