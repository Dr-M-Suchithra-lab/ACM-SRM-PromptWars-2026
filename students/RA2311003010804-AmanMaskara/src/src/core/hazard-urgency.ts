// ─── Urgency words in what the worker said ──────────────────────────
// Gemini judges severity from the whole report. This is the deterministic safety net under
// it: words that always mean "danger now" can raise a report's severity, never lower it.
// Words are matched as whole tokens (so Hindi "आग", fire, never matches "आगे", ahead);
// phrases are matched as consecutive tokens. English, Hindi, Tamil and Telugu.

import type { HazardSeverity } from "./types";

const CRITICAL = [
  // English
  "fire",
  "smoke",
  "burning",
  "flames",
  "explosion",
  "blast",
  "trapped",
  "unconscious",
  "fainted",
  "collapsed",
  "electrocuted",
  "not breathing",
  "heavy bleeding",
  "bleeding badly",
  "dead",
  "died",
  "dying",
  // Hindi
  "आग",
  "धुआं",
  "धुआँ",
  "विस्फोट",
  "धमाका",
  "फंसा",
  "फँसा",
  "फंसे",
  "बेहोश",
  "सांस नहीं",
  "मर गया",
  "करंट लगा",
  // Tamil
  "தீ",
  "தீப்பிடித்தது",
  "புகை",
  "வெடிப்பு",
  "சிக்கி",
  "மயக்கம்",
  "மூச்சு இல்லை",
  "இறந்து",
  // Telugu
  "మంటలు",
  "మంట",
  "పొగ",
  "పేలుడు",
  "చిక్కుకున్నారు",
  "స్పృహ",
  "ఊపిరి లేదు",
  "చనిపోయారు",
];

const HIGH = [
  // English
  "injured",
  "injury",
  "hurt",
  "bleeding",
  "fell",
  "fallen",
  "shock",
  "sparks",
  "crack",
  "cracked",
  "broken",
  "leaking",
  "gas leak",
  // Hindi
  "चोट",
  "घायल",
  "खून",
  "गिर गया",
  "गिरा",
  "झटका",
  "चिंगारी",
  "दरार",
  "टूटा",
  "रिसाव",
  // Tamil
  "காயம்",
  "இரத்தம்",
  "விழுந்தார்",
  "விழுந்தது",
  "மின்அதிர்ச்சி",
  "விரிசல்",
  "உடைந்த",
  "கசிவு",
  // Telugu
  "గాయం",
  "రక్తం",
  "పడిపోయారు",
  "షాక్",
  "పగులు",
  "విరిగింది",
  "లీక్",
];

/** Equipment names that contain an urgent word but describe no emergency ("the fire exit is blocked"). */
const NOT_URGENT = [
  "fire exit",
  "fire extinguisher",
  "fire door",
  "fire drill",
  "आग निकास",
  "தீ வெளியேற்றம்",
  "అగ్ని నిష్క్రమణ",
];

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
}

/** Whole-token match for a word, consecutive-token match for a phrase. */
function mentions(haystack: string[], term: string): boolean {
  const needle = tokens(term);
  if (needle.length === 0) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((word, j) => haystack[i + j] === word)) return true;
  }
  return false;
}

/** The severity the words alone call for, or null when they say nothing urgent. */
export function urgencyFromText(...texts: (string | undefined)[]): HazardSeverity | null {
  let text = texts.filter(Boolean).join(" ").toLowerCase();
  for (const phrase of NOT_URGENT) text = text.replaceAll(phrase, " ");
  const words = tokens(text);
  if (words.length === 0) return null;
  if (CRITICAL.some((term) => mentions(words, term))) return "critical";
  if (HIGH.some((term) => mentions(words, term))) return "high";
  return null;
}
