import type { HazardCategory } from "@/core/types";

/**
 * Deterministic last-resort classifier for typed reports when Gemini is unavailable.
 * Keywords cover English, Hindi (Devanagari + common romanised), Tamil and Telugu.
 * Order matters: more specific categories are checked first.
 */
const KEYWORDS: [HazardCategory, string[]][] = [
  ["fire_exit", ["fire exit", "exit blocked", "emergency exit"]],
  [
    "fire",
    ["fire", "smoke", "burning", "flames", "आग", "धुआं", "धुआँ", "जल रहा", "தீ", "புகை", "எரி", "మంట", "పొగ", "కాలుతో"],
  ],
  ["needle_stick", ["needle", "syringe", "सुई", "इंजेक्शन", "ஊசி", "సూది"]],
  ["patient_aggression", ["patient hit", "attack", "abuse", "violent", "मारा", "हमला", "தாக்கு", "దాడి"]],
  ["chemical_biohazard", ["blood", "biohazard", "infect", "खून", "संक्रमण", "இரத்த", "రక్తం"]],
  ["scaffolding", ["scaffold", "मचान", "पाड़", "சாரம்", "పరంజా"]],
  ["fall_from_height", ["fall", "height", "edge", "roof", "गिर", "ऊंचाई", "விழ", "உயர", "పడి", "ఎత్తు"]],
  [
    "electrical",
    ["wire", "electric", "shock", "current", "बिजली", "तार", "करंट", "மின்", "கம்பி", "కరెంట్", "విద్యుత్", "వైర్"],
  ],
  ["heat_stress", ["heat", "hot", "sun", "dizzy", "गर्मी", "धूप", "வெயில்", "வெப்ப", "ఎండ", "వేడి"]],
  [
    "ppe_missing",
    ["helmet", "gloves", "mask", "harness", "ppe", "हेलमेट", "दस्ताने", "தலைக்கவசம்", "கையுறை", "హెల్మెట్", "గ్లౌజ్"],
  ],
  ["slip", ["slip", "wet floor", "फिसल", "गीला", "வழுக்", "జారి"]],
  ["lifting_injury", ["lift", "heavy", "back pain", "भारी", "उठा", "கனமான", "தூக்க", "బరువు"]],
  ["chemical", ["chemical", "gas", "smell", "fumes", "रसायन", "गैस", "ரசாயன", "வாயு", "రసాయన", "గ్యాస్"]],
  ["noise", ["noise", "loud", "शोर", "சத்தம்", "శబ్దం"]],
  ["machinery", ["machine", "mixer", "crane", "मशीन", "இயந்திர", "యంత్ర"]],
];

export function classifyByKeywords(text: string, allowed?: readonly string[]): HazardCategory | "other" {
  const haystack = text.toLowerCase();
  for (const [category, words] of KEYWORDS) {
    if (allowed && !allowed.includes(category)) continue;
    if (words.some((w) => haystack.includes(w.toLowerCase()))) return category;
  }
  return "other";
}
