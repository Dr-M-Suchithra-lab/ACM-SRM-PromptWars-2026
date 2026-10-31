// ─── Keyword similarity (deterministic fallback for duplicate detection) ─
// Works in every script: words are runs of Unicode letters and combining marks, so Tamil
// and Telugu vowel signs stay attached to their consonants.

const STOPWORDS = new Set([
  // English
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "and",
  "or",
  "not",
  "no",
  "we",
  "our",
  "us",
  "it",
  "its",
  "this",
  "that",
  "there",
  "be",
  "been",
  "have",
  "has",
  "with",
  "very",
  "too",
  "my",
  "i",
  // Hindi
  "है",
  "हैं",
  "का",
  "की",
  "के",
  "को",
  "में",
  "से",
  "पर",
  "और",
  "नहीं",
  "भी",
  "हम",
  "यह",
  "वह",
  "था",
  "थी",
  // Tamil
  "ஒரு",
  "இந்த",
  "அந்த",
  "மற்றும்",
  "இல்லை",
  "உள்ளது",
  // Telugu
  "ఒక",
  "ఈ",
  "ఆ",
  "మరియు",
  "లేదు",
  "ఉంది",
]);

/** Lower-cased content words of a text, without stopwords or one-letter tokens. */
export function keywords(text: string): Set<string> {
  const words = text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  return new Set(words.filter((w) => w.length > 1 && !STOPWORDS.has(w)));
}

/** Overlap coefficient |A∩B| / min(|A|,|B|): short complaints match longer ones that contain them. */
export function keywordSimilarity(a: string, b: string): number {
  const ka = keywords(a);
  const kb = keywords(b);
  if (ka.size === 0 || kb.size === 0) return 0;
  let shared = 0;
  for (const word of ka) if (kb.has(word)) shared++;
  return shared / Math.min(ka.size, kb.size);
}

export const SIMILARITY_THRESHOLD = 0.5;

/** Candidates most similar to `text`, best first, above the threshold. */
export function rankBySimilarity<T>(text: string, candidates: T[], textOf: (item: T) => string, limit = 3): T[] {
  return candidates
    .map((item) => ({ item, score: keywordSimilarity(text, textOf(item)) }))
    .filter(({ score }) => score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
