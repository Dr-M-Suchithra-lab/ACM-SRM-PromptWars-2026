// ─── FairShift Feedback Themes ──────────────────────────────────────
// Deterministic tagging of (already redacted) comments, so themes work without AI.

export const THEMES = ["pay", "hours", "safety", "respect", "facilities"] as const;
export type Theme = (typeof THEMES)[number];

const THEME_WORDS: Record<Theme, string[]> = {
  pay: [
    "pay",
    "salary",
    "wage",
    "money",
    "paid",
    "पैसा",
    "वेतन",
    "तनख्वाह",
    "मज़दूरी",
    "சம்பளம்",
    "ஊதியம்",
    "జీతం",
    "కూలీ",
  ],
  hours: [
    "overtime",
    "hours",
    "late",
    "shift",
    "night",
    "tired",
    "ओवरटाइम",
    "घंटे",
    "थक",
    "நேரம்",
    "இரவு",
    "சோர்வு",
    "గంటలు",
    "రాత్రి",
    "అలసట",
  ],
  safety: [
    "unsafe",
    "danger",
    "helmet",
    "injury",
    "accident",
    "safety",
    "खतरा",
    "चोट",
    "सुरक्षा",
    "ஆபத்து",
    "காயம்",
    "பாதுகாப்பு",
    "ప్రమాదం",
    "గాయం",
    "భద్రత",
  ],
  respect: [
    "shout",
    "rude",
    "abuse",
    "respect",
    "insult",
    "चिल्ला",
    "गाली",
    "इज़्ज़त",
    "திட்ட",
    "மரியாதை",
    "అరుస్త",
    "గౌరవం",
    "తిట్ట",
  ],
  facilities: [
    "water",
    "toilet",
    "food",
    "rest room",
    "shade",
    "पानी",
    "शौचालय",
    "खाना",
    "தண்ணீர்",
    "கழிப்பறை",
    "నీళ్లు",
    "మరుగుదొడ్డి",
  ],
};

export function tagThemes(comment: string): Theme[] {
  const text = comment.toLowerCase();
  return THEMES.filter((theme) => THEME_WORDS[theme].some((w) => text.includes(w.toLowerCase())));
}

export function countThemes(comments: string[]): Record<Theme, number> {
  const counts = Object.fromEntries(THEMES.map((t) => [t, 0])) as Record<Theme, number>;
  for (const comment of comments) for (const theme of tagThemes(comment)) counts[theme]++;
  return counts;
}
