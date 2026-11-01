// ─── Welfare schemes a worker can unlock with verified attendance ───
// Eligibility is data, not code: core/eligibility.ts evaluates these rules.
//
// MAINTAINERS: these rules are simplified from the central Acts and scheme guidelines.
// Registration rules, age limits, fees and documents differ per state welfare board and are
// revised often. Verify every rule against your state's current notification before relying on it.

import type { Locale } from "@/i18n/locales";
import type { Sector } from "@/core/types";

export type LocalizedText = Record<Locale, string>;

/** Facts FairShift cannot know, asked as a yes/no tap and never stored on the server. */
export type ConditionId = "age_18_60" | "age_16_59" | "age_18_40" | "not_epf_esic_member" | "not_esic_member";

export interface SchemeRule {
  /** Distinct days worked needed inside the window */
  minDays: number;
  windowMonths: number;
  /** Only days worked at this kind of workplace count ('building' = construction sites) */
  workType?: "building";
  /** Monthly wage ceiling in paise */
  maxMonthlyWage?: number;
}

export interface Scheme {
  id: string;
  name: LocalizedText;
  sectors: readonly Sector[];
  rule: SchemeRule;
  conditions: readonly ConditionId[];
  summary: LocalizedText;
  benefits: readonly LocalizedText[];
  documentsNeeded: readonly LocalizedText[];
  howToApply: LocalizedText;
  /** True when the employer's work certificate is one of the documents */
  needsWorkCertificate: boolean;
  officialLink: string;
  source: string;
}

const ALL_SECTORS: readonly Sector[] = ["construction", "hospital", "campus", "factory"];

const AADHAAR: LocalizedText = { en: "Aadhaar card", hi: "आधार कार्ड", ta: "ஆதார் அட்டை", te: "ఆధార్ కార్డు" };
const BANK: LocalizedText = {
  en: "Bank passbook (account in your name)",
  hi: "बैंक पासबुक (आपके नाम का खाता)",
  ta: "வங்கி பாஸ்புக் (உங்கள் பெயரில் கணக்கு)",
  te: "బ్యాంక్ పాస్‌బుక్ (మీ పేరు మీద ఖాతా)",
};
const MOBILE: LocalizedText = {
  en: "Mobile number linked to Aadhaar",
  hi: "आधार से जुड़ा मोबाइल नंबर",
  ta: "ஆதாருடன் இணைந்த மொபைல் எண்",
  te: "ఆధార్‌తో లింక్ అయిన మొబైల్ నంబర్",
};

export const SCHEMES: readonly Scheme[] = [
  {
    id: "bocw",
    name: {
      en: "Construction Workers Welfare Board",
      hi: "भवन निर्माण श्रमिक कल्याण बोर्ड",
      ta: "கட்டுமானத் தொழிலாளர் நல வாரியம்",
      te: "భవన నిర్మాణ కార్మికుల సంక్షేమ బోర్డు",
    },
    sectors: ["construction"],
    rule: { minDays: 90, windowMonths: 12, workType: "building" },
    conditions: ["age_18_60"],
    summary: {
      en: "Accident cover, scholarships for your children, maternity help and a pension.",
      hi: "दुर्घटना बीमा, बच्चों की छात्रवृत्ति, प्रसूति सहायता और पेंशन।",
      ta: "விபத்துக் காப்பீடு, குழந்தைகளுக்குக் கல்வி உதவித்தொகை, மகப்பேறு உதவி, ஓய்வூதியம்.",
      te: "ప్రమాద బీమా, పిల్లలకు స్కాలర్‌షిప్, ప్రసూతి సాయం మరియు పెన్షన్.",
    },
    benefits: [
      {
        en: "Accident and death cover",
        hi: "दुर्घटना और मृत्यु बीमा",
        ta: "விபத்து மற்றும் இறப்புக் காப்பீடு",
        te: "ప్రమాద మరియు మరణ బీమా",
      },
      {
        en: "Children's education scholarships",
        hi: "बच्चों की पढ़ाई के लिए छात्रवृत्ति",
        ta: "குழந்தைகளின் கல்வி உதவித்தொகை",
        te: "పిల్లల చదువుకు స్కాలర్‌షిప్",
      },
      {
        en: "Maternity and marriage assistance",
        hi: "प्रसूति और विवाह सहायता",
        ta: "மகப்பேறு மற்றும் திருமண உதவி",
        te: "ప్రసూతి మరియు వివాహ సాయం",
      },
      {
        en: "Pension after 60",
        hi: "60 वर्ष के बाद पेंशन",
        ta: "60 வயதுக்குப் பிறகு ஓய்வூதியம்",
        te: "60 ఏళ్ల తర్వాత పెన్షన్",
      },
    ],
    documentsNeeded: [
      AADHAAR,
      BANK,
      {
        en: "Certificate of 90 days of building work (FairShift can create it)",
        hi: "90 दिन के निर्माण कार्य का प्रमाणपत्र (FairShift बना सकता है)",
        ta: "90 நாள் கட்டுமானப் பணிச் சான்றிதழ் (FairShift உருவாக்கும்)",
        te: "90 రోజుల నిర్మాణ పని సర్టిఫికెట్ (FairShift తయారు చేస్తుంది)",
      },
      {
        en: "Passport-size photo",
        hi: "पासपोर्ट साइज़ फोटो",
        ta: "பாஸ்போர்ட் அளவு புகைப்படம்",
        te: "పాస్‌పోర్ట్ సైజు ఫోటో",
      },
    ],
    howToApply: {
      en: "Take the documents to your state Construction Workers Welfare Board office or apply on the board's website. The registration fee is small.",
      hi: "दस्तावेज़ लेकर अपने राज्य के निर्माण श्रमिक कल्याण बोर्ड कार्यालय जाएँ या बोर्ड की वेबसाइट पर आवेदन करें। पंजीकरण शुल्क बहुत कम है।",
      ta: "ஆவணங்களுடன் உங்கள் மாநில கட்டுமானத் தொழிலாளர் நல வாரிய அலுவலகத்துக்குச் செல்லுங்கள் அல்லது வாரிய இணையதளத்தில் விண்ணப்பியுங்கள். பதிவுக் கட்டணம் குறைவு.",
      te: "పత్రాలతో మీ రాష్ట్ర భవన నిర్మాణ కార్మికుల సంక్షేమ బోర్డు కార్యాలయానికి వెళ్లండి లేదా బోర్డు వెబ్‌సైట్‌లో దరఖాస్తు చేయండి. నమోదు రుసుము తక్కువ.",
    },
    needsWorkCertificate: true,
    officialLink: "https://labour.gov.in",
    source:
      "Building and Other Construction Workers (RE&CS) Act, 1996, section 12 (90 days in the preceding 12 months, age 18–60)",
  },
  {
    id: "eshram",
    name: { en: "e-Shram card", hi: "ई-श्रम कार्ड", ta: "இ-ஷ்ரம் அட்டை", te: "ఇ-శ్రమ్ కార్డు" },
    sectors: ALL_SECTORS,
    rule: { minDays: 1, windowMonths: 12 },
    conditions: ["age_16_59", "not_epf_esic_member"],
    summary: {
      en: "A national ID for unorganised workers with ₹2 lakh accident insurance.",
      hi: "असंगठित श्रमिकों का राष्ट्रीय पहचान पत्र, ₹2 लाख दुर्घटना बीमा के साथ।",
      ta: "அமைப்புசாரா தொழிலாளர்களுக்கான தேசிய அடையாள அட்டை, ₹2 லட்சம் விபத்துக் காப்பீட்டுடன்.",
      te: "అసంఘటిత కార్మికులకు జాతీయ గుర్తింపు కార్డు, ₹2 లక్షల ప్రమాద బీమాతో.",
    },
    benefits: [
      {
        en: "₹2 lakh accident insurance",
        hi: "₹2 लाख दुर्घटना बीमा",
        ta: "₹2 லட்சம் விபத்துக் காப்பீடு",
        te: "₹2 లక్షల ప్రమాద బీమా",
      },
      {
        en: "One card for government schemes in any state",
        hi: "किसी भी राज्य में सरकारी योजनाओं के लिए एक कार्ड",
        ta: "எந்த மாநிலத்திலும் அரசுத் திட்டங்களுக்கு ஒரே அட்டை",
        te: "ఏ రాష్ట్రంలోనైనా ప్రభుత్వ పథకాలకు ఒకే కార్డు",
      },
    ],
    documentsNeeded: [AADHAAR, MOBILE, BANK],
    howToApply: {
      en: "Register free on eshram.gov.in with an Aadhaar OTP, or at any Common Service Centre (CSC).",
      hi: "आधार OTP से eshram.gov.in पर मुफ़्त पंजीकरण करें, या किसी भी जन सेवा केंद्र (CSC) पर जाएँ।",
      ta: "ஆதார் OTP மூலம் eshram.gov.in இல் இலவசமாகப் பதிவு செய்யுங்கள், அல்லது பொது சேவை மையத்தில் (CSC) பதிவு செய்யுங்கள்.",
      te: "ఆధార్ OTP తో eshram.gov.in లో ఉచితంగా నమోదు చేసుకోండి, లేదా ఏదైనా కామన్ సర్వీస్ సెంటర్ (CSC) లో చేసుకోండి.",
    },
    needsWorkCertificate: false,
    officialLink: "https://eshram.gov.in",
    source: "Ministry of Labour & Employment, e-Shram portal eligibility (age 16–59, not an EPFO/ESIC member)",
  },
  {
    id: "esic",
    name: {
      en: "ESIC health insurance",
      hi: "ईएसआईसी स्वास्थ्य बीमा",
      ta: "ESIC மருத்துவக் காப்பீடு",
      te: "ESIC ఆరోగ్య బీమా",
    },
    sectors: ["hospital", "campus", "factory"],
    rule: { minDays: 1, windowMonths: 1, maxMonthlyWage: 21_000_00 },
    conditions: ["not_esic_member"],
    summary: {
      en: "Free medical care for you and your family, and paid sick leave.",
      hi: "आपके और परिवार के लिए मुफ़्त इलाज, और बीमारी में वेतन सहित छुट्टी।",
      ta: "உங்களுக்கும் குடும்பத்துக்கும் இலவச மருத்துவம், நோய்க்கால ஊதிய விடுப்பு.",
      te: "మీకు, మీ కుటుంబానికి ఉచిత వైద్యం, అనారోగ్యంలో జీతంతో సెలవు.",
    },
    benefits: [
      {
        en: "Free treatment at ESIC hospitals",
        hi: "ESIC अस्पतालों में मुफ़्त इलाज",
        ta: "ESIC மருத்துவமனைகளில் இலவச சிகிச்சை",
        te: "ESIC ఆసుపత్రుల్లో ఉచిత చికిత్స",
      },
      {
        en: "Sickness pay at 70% of wages",
        hi: "बीमारी में 70% वेतन",
        ta: "நோய்க்காலத்தில் 70% ஊதியம்",
        te: "అనారోగ్యంలో 70% జీతం",
      },
      {
        en: "26 weeks of paid maternity leave",
        hi: "26 सप्ताह का सवेतन मातृत्व अवकाश",
        ta: "26 வாரங்கள் ஊதியத்துடன் மகப்பேறு விடுப்பு",
        te: "26 వారాల జీతంతో ప్రసూతి సెలవు",
      },
    ],
    documentsNeeded: [
      AADHAAR,
      BANK,
      {
        en: "Family details for the e-Pehchan card",
        hi: "ई-पहचान कार्ड के लिए परिवार का विवरण",
        ta: "இ-பெஹ்சான் அட்டைக்குக் குடும்ப விவரங்கள்",
        te: "ఇ-పెహచాన్ కార్డు కోసం కుటుంబ వివరాలు",
      },
    ],
    howToApply: {
      en: "Your employer must register you. Ask HR for your ESIC number and e-Pehchan card. If they refuse, raise it under Speak up.",
      hi: 'आपके नियोक्ता को आपका पंजीकरण करना होता है। HR से अपना ESIC नंबर और ई-पहचान कार्ड माँगें। मना करें तो "बोलिए" में उठाएँ।',
      ta: 'உங்கள் முதலாளி உங்களைப் பதிவு செய்ய வேண்டும். HR இடம் ESIC எண்ணும் இ-பெஹ்சான் அட்டையும் கேளுங்கள். மறுத்தால் "பேசுங்கள்" பகுதியில் தெரிவியுங்கள்.',
      te: 'మీ యజమాని మిమ్మల్ని నమోదు చేయాలి. HR ని మీ ESIC నంబర్, ఇ-పెహచాన్ కార్డు అడగండి. నిరాకరిస్తే "మాట్లాడండి" లో చెప్పండి.',
    },
    needsWorkCertificate: false,
    officialLink: "https://www.esic.gov.in",
    source: "Employees’ State Insurance Act, 1948 (wage ceiling ₹21,000 per month)",
  },
  {
    id: "pmsym",
    name: {
      en: "PM Shram Yogi Maan-dhan pension",
      hi: "पीएम श्रम योगी मानधन पेंशन",
      ta: "பிஎம் ஷ்ரம் யோகி மான்-தன் ஓய்வூதியம்",
      te: "పీఎం శ్రమ్ యోగి మాన్-ధన్ పెన్షన్",
    },
    sectors: ALL_SECTORS,
    rule: { minDays: 1, windowMonths: 12, maxMonthlyWage: 15_000_00 },
    conditions: ["age_18_40", "not_epf_esic_member"],
    summary: {
      en: "₹3,000 pension every month after 60. The government matches what you save.",
      hi: "60 के बाद हर महीने ₹3,000 पेंशन। जितना आप बचाएँ, उतना सरकार जोड़ती है।",
      ta: "60 வயதுக்குப் பிறகு மாதம் ₹3,000 ஓய்வூதியம். நீங்கள் சேமிக்கும் அளவு அரசும் சேர்க்கும்.",
      te: "60 ఏళ్ల తర్వాత నెలకు ₹3,000 పెన్షన్. మీరు దాచినంత ప్రభుత్వం కలుపుతుంది.",
    },
    benefits: [
      {
        en: "₹3,000 monthly pension after 60",
        hi: "60 के बाद ₹3,000 मासिक पेंशन",
        ta: "60க்குப் பிறகு மாதம் ₹3,000 ஓய்வூதியம்",
        te: "60 తర్వాత నెలకు ₹3,000 పెన్షన్",
      },
      {
        en: "Government adds an equal share",
        hi: "सरकार बराबर हिस्सा जोड़ती है",
        ta: "அரசு சம பங்கைச் சேர்க்கும்",
        te: "ప్రభుత్వం సమాన వాటా కలుపుతుంది",
      },
    ],
    documentsNeeded: [AADHAAR, BANK, MOBILE],
    howToApply: {
      en: "Enrol at any Common Service Centre (CSC) or on maandhan.in. The first monthly saving is paid in cash at the centre.",
      hi: "किसी भी जन सेवा केंद्र (CSC) या maandhan.in पर नामांकन करें। पहली मासिक बचत केंद्र पर नकद दी जाती है।",
      ta: "பொது சேவை மையத்தில் (CSC) அல்லது maandhan.in இல் சேருங்கள். முதல் மாதச் சேமிப்பை மையத்தில் பணமாகச் செலுத்தலாம்.",
      te: "ఏదైనా కామన్ సర్వీస్ సెంటర్ (CSC) లో లేదా maandhan.in లో చేరండి. మొదటి నెల పొదుపు కేంద్రంలో నగదుగా కడతారు.",
    },
    needsWorkCertificate: false,
    officialLink: "https://maandhan.in",
    source: "PM-SYM scheme guidelines (age 18–40, income up to ₹15,000 per month, not an EPFO/ESIC/NPS member)",
  },
];

export function getScheme(id: string): Scheme | undefined {
  return SCHEMES.find((s) => s.id === id);
}
