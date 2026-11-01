// ─── "I need help": deterministic triage ────────────────────────────
// Used when Gemini is unavailable, and as the floor under Gemini's answer: an emergency in the
// words always puts 112 first, whatever the model said. Keywords cover English, Hindi, Tamil
// and Telugu, matched as substrings of the lower-cased text.

import type { HelplineId } from "@/config/helplines";
import { urgencyFromText } from "./hazard-urgency";

export const HELP_TOPICS = ["emergency", "safety", "pay", "harassment", "health", "benefits", "other"] as const;
export type HelpTopic = (typeof HELP_TOPICS)[number];

export const HELP_URGENCIES = ["emergency", "urgent", "normal"] as const;
export type HelpUrgency = (typeof HELP_URGENCIES)[number];

/** Where in FairShift the worker can act on it */
export const HELP_ACTIONS = ["report_hazard", "check_pay", "speak_up", "benefits", "none"] as const;
export type HelpAction = (typeof HELP_ACTIONS)[number];

const TOPIC_WORDS: [HelpTopic, string[]][] = [
  [
    "harassment",
    [
      "harass",
      "abuse",
      "touch",
      "threat",
      "beat",
      "slap",
      "उत्पीड़न",
      "छेड़",
      "धमकी",
      "मारपीट",
      "துன்புறுத்த",
      "மிரட்ட",
      "వేధింపు",
      "బెదిరింపు",
    ],
  ],
  [
    "pay",
    [
      "pay",
      "salary",
      "wage",
      "paid",
      "money",
      "overtime",
      "वेतन",
      "तनख्वाह",
      "पैसा",
      "मजदूरी",
      "சம்பளம்",
      "கூலி",
      "பணம்",
      "జీతం",
      "కూలి",
      "డబ్బు",
    ],
  ],
  [
    "benefits",
    [
      "provident fund",
      "pf ",
      "esic",
      "esi card",
      "e-shram",
      "eshram",
      "pension",
      "insurance",
      "scheme",
      "बीमा",
      "पेंशन",
      "योजना",
      "காப்பீடு",
      "ஓய்வூதியம்",
      "திட்ட",
      "బీమా",
      "పెన్షన్",
      "పథకం",
    ],
  ],
  [
    "health",
    [
      "stress",
      "tired",
      "sleep",
      "sad",
      "anxious",
      "depress",
      "sick",
      "तनाव",
      "थका",
      "नींद",
      "बीमार",
      "மன அழுத்த",
      "சோர்வ",
      "தூக்க",
      "ఒత్తిడి",
      "అలసట",
      "నిద్ర",
    ],
  ],
  [
    "safety",
    [
      "unsafe",
      "danger",
      "helmet",
      "scaffold",
      "wire",
      "gloves",
      "खतरा",
      "असुरक्षित",
      "हेलमेट",
      "ஆபத்து",
      "பாதுகாப்ப",
      "ప్రమాదం",
      "భద్రత",
    ],
  ],
];

export interface HelpTriage {
  urgency: HelpUrgency;
  topic: HelpTopic;
  helplines: HelplineId[];
  action: HelpAction;
}

const TOPIC_PLAN: Record<HelpTopic, Omit<HelpTriage, "urgency" | "topic">> = {
  emergency: { helplines: ["emergency", "ambulance", "fire"], action: "report_hazard" },
  safety: { helplines: [], action: "report_hazard" },
  pay: { helplines: ["eshram"], action: "check_pay" },
  harassment: { helplines: ["women", "emergency"], action: "speak_up" },
  health: { helplines: ["mental_health"], action: "none" },
  benefits: { helplines: ["eshram", "epfo", "esic"], action: "benefits" },
  other: { helplines: ["eshram"], action: "speak_up" },
};

/** Topic, urgency, helpline ids and in-app action for a worker's problem, without AI. */
export function triageHelp(text: string): HelpTriage {
  if (urgencyFromText(text) === "critical")
    return { urgency: "emergency", topic: "emergency", ...TOPIC_PLAN.emergency };
  const haystack = `${text.toLowerCase()} `;
  const topic = TOPIC_WORDS.find(([, words]) => words.some((w) => haystack.includes(w)))?.[0] ?? "other";
  const urgency: HelpUrgency = topic === "harassment" || urgencyFromText(text) === "high" ? "urgent" : "normal";
  return { urgency, topic, ...TOPIC_PLAN[topic] };
}

/** Phone numbers are never taken from model text: any run of 3+ digits is removed. */
export function stripNumbers(text: string): string {
  return text
    .replace(/\+?\d[\d\s-]{2,}\d/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
