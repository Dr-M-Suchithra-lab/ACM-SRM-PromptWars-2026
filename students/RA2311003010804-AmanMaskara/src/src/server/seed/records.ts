/**
 * Demo hazards, feedback, co-signed issues and skills, timed relative to "now" so the
 * dashboards always look like a normal working week.
 */
import { cohortKey } from "@/core/anonymity";
import { tagThemes } from "@/core/themes";
import { getISTDay, getISTWeekBucket } from "@/core/time";
import type { Hazard, HazardEvent, HazardReport, HazardSeverity } from "@/core/types";
import type { FeedbackEntry, SiteIssue, Skill } from "../repos/types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ── Hazards ────────────────────────────────────────────────────────

type ReportSeed = [
  reporterId: string | null,
  hoursAgo: number,
  transcript?: string,
  transcriptEn?: string,
  /** A photo in `public/demo/`, as the worker attached it */
  photo?: string,
];
type EventSeed = [status: HazardEvent, hoursAgo: number, by?: string, note?: string, level?: number];

interface HazardSeed extends Pick<Hazard, "id" | "siteId" | "orgId" | "category" | "status" | "location"> {
  severity: HazardSeverity;
  reports: ReportSeed[];
  events: EventSeed[];
  extra?: Partial<Hazard>;
}

const HAZARDS: HazardSeed[] = [
  {
    id: "haz-c1",
    siteId: "site1",
    orgId: "org1",
    category: "electrical",
    severity: "critical",
    status: "received",
    location: "Floor 2",
    reports: [
      [null, 7, "தண்ணீர் தொட்டி அருகே மின் கம்பிகள் திறந்து தொங்குகின்றன", "Bare wires hanging next to the water tank"],
    ],
    events: [
      ["received", 7],
      ["escalated", 3, undefined, undefined, 1],
    ],
    extra: { escalationLevel: 1 },
  },
  {
    id: "haz-c2",
    siteId: "site1",
    orgId: "org1",
    category: "scaffolding",
    severity: "high",
    status: "in_progress",
    location: "Floor 3",
    reports: [
      [
        "w1001",
        30,
        "மூன்றாம் மாடி சாரம் ஆடுகிறது, ஒரு கிளாம்ப் இல்லை",
        "Floor 3 scaffold is shaking, one clamp is missing",
      ],
      [null, 20, "Floor 3 scaffold moves when we climb", "Floor 3 scaffold moves when we climb"],
    ],
    events: [
      ["received", 30],
      ["report_added", 20],
      ["in_progress", 18, "admin1"],
      ["escalated", 6, undefined, undefined, 1],
    ],
    extra: { escalationLevel: 1, assigneeUid: "admin1" },
  },
  {
    id: "haz-c3",
    siteId: "site1",
    orgId: "org1",
    category: "ppe_missing",
    severity: "medium",
    status: "fixed",
    location: "Gate store",
    reports: [["w1001", 4 * 24, "புதிய உதவியாளர்களுக்கு ஹெல்மெட் இல்லை", "No helmets in the store for new helpers"]],
    events: [
      ["received", 96],
      ["in_progress", 94, "admin1"],
      ["fixed", 26, "admin1", "40 new helmets issued at the gate store; the guard keeps a register."],
    ],
    extra: { confirmation: "pending", fixNote: "40 new helmets issued at the gate store; the guard keeps a register." },
  },
  {
    id: "haz-c4",
    siteId: "site1",
    orgId: "org1",
    category: "heat_stress",
    severity: "medium",
    status: "received",
    location: "Rebar yard",
    reports: [[null, 40, "रीबार यार्ड में दोपहर को छाँव नहीं है", "No shade at the rebar yard after noon"]],
    events: [["received", 40]],
  },
  {
    id: "haz-c5",
    siteId: "site1",
    orgId: "org1",
    category: "fall_from_height",
    severity: "high",
    status: "fixed",
    location: "Floor 6",
    reports: [
      [
        "w1005",
        12 * 24,
        "Open lift shaft edge on floor 6 has no railing",
        "Open lift shaft edge on floor 6 has no railing",
      ],
    ],
    events: [
      ["received", 288],
      ["in_progress", 285, "admin1"],
      ["fixed", 270, "admin1", "Temporary railing and toe-board installed around the shaft."],
      ["confirmed", 250],
    ],
    extra: { confirmation: "confirmed", fixNote: "Temporary railing and toe-board installed around the shaft." },
  },
  {
    id: "haz-c6",
    siteId: "site1",
    orgId: "org1",
    category: "machinery",
    severity: "medium",
    status: "dismissed",
    location: "Batching plant",
    reports: [[null, 6 * 24, "Mixer drum makes a grinding noise", "Mixer drum makes a grinding noise"]],
    events: [
      ["received", 144],
      ["dismissed", 120, "admin1", "Serviced by the vendor the same morning (job card 4471)."],
    ],
    extra: { dismissReason: "already_fixed", dismissNote: "Serviced by the vendor the same morning (job card 4471)." },
  },
  {
    // Reported by tapping the Machine icon with a photo and no words; the manager has started work.
    id: "haz-c7",
    siteId: "site1",
    orgId: "org1",
    category: "machinery",
    severity: "low",
    status: "in_progress",
    location: "Concrete pump boom swinging over the wall formwork",
    reports: [[null, 3, undefined, undefined, "/demo/hazard-machine.jpg"]],
    events: [
      ["received", 3],
      ["in_progress", 1, "admin1"],
    ],
    extra: { assigneeUid: "admin1" },
  },
  {
    // Ramesh, by name: marked fixed, he said it was still a problem, so it reopened and has missed
    // two 4-hour "Danger now" deadlines since (supervisor, then site manager).
    id: "haz-c8",
    siteId: "site1",
    orgId: "org1",
    category: "electrical",
    severity: "critical",
    status: "received",
    location: "Floor 4 corridor",
    reports: [
      [
        "w1001",
        30,
        "நான்காம் மாடியில் மின் பெட்டிக்கு வெளியே பிரேக்கர் தொங்குகிறது, கம்பிகள் திறந்து கிடக்கின்றன",
        "On floor 4 the breaker is hanging outside the board and the wires are exposed",
        "/demo/hazard-electrical.jpg",
      ],
    ],
    events: [
      ["received", 30],
      ["in_progress", 28, "admin1"],
      ["fixed", 24, "admin1", "Loose wires taped and the breaker screwed back to the wall."],
      ["reopened", 9, undefined, "not_fixed"],
      ["escalated", 5, undefined, undefined, 1],
      ["escalated", 1, undefined, undefined, 2],
    ],
    extra: {
      escalationLevel: 2,
      assigneeUid: "admin1",
      fixNote: "Loose wires taped and the breaker screwed back to the wall.",
    },
  },
  {
    id: "haz-h1",
    siteId: "site2",
    orgId: "org2",
    category: "needle_stick",
    severity: "high",
    status: "received",
    location: "Bed 12",
    reports: [
      [
        "w2001",
        10,
        "बेड 12 के पास सामान्य कूड़ेदान में इस्तेमाल की गई सुइयाँ",
        "Used needles thrown in the general bin near bed 12",
      ],
    ],
    events: [["received", 10]],
  },
  {
    id: "haz-h2",
    siteId: "site3",
    orgId: "org2",
    category: "chemical_biohazard",
    severity: "high",
    status: "in_progress",
    location: "Corridor",
    reports: [
      [
        null,
        29,
        "कॉरिडोर में खून गिरा है, सुबह से साफ़ नहीं हुआ",
        "Blood spill in the corridor, not cleaned since morning",
      ],
    ],
    events: [
      ["received", 29],
      ["in_progress", 27, "admin2"],
      ["escalated", 5, undefined, undefined, 1],
    ],
    extra: { escalationLevel: 1, assigneeUid: "admin2" },
  },
  {
    id: "haz-h3",
    siteId: "site2",
    orgId: "org2",
    category: "slip",
    severity: "low",
    status: "fixed",
    location: "Washroom",
    reports: [
      ["w2001", 72, "बाथरूम के पास फ़र्श गीला है, कोई बोर्ड नहीं", "Wet floor near the washroom, no sign board"],
    ],
    events: [
      ["received", 72],
      ["fixed", 20, "admin2", "Caution boards placed; housekeeping now mops every 2 hours."],
    ],
    extra: { confirmation: "pending", fixNote: "Caution boards placed; housekeeping now mops every 2 hours." },
  },
  {
    id: "haz-h4",
    siteId: "site3",
    orgId: "org2",
    category: "patient_aggression",
    severity: "medium",
    status: "received",
    location: "Night desk",
    reports: [
      [null, 22, "रात में मरीज़ के रिश्तेदार ने धक्का दिया", "A patient's relative pushed an attendant at night"],
    ],
    events: [["received", 22]],
  },
  {
    id: "haz-h5",
    siteId: "site3",
    orgId: "org2",
    category: "lifting_injury",
    severity: "low",
    status: "fixed",
    location: "Post-op",
    reports: [
      [
        "w2006",
        9 * 24,
        "Patient hoist is broken, we lift patients by hand",
        "Patient hoist is broken, we lift patients by hand",
      ],
    ],
    events: [
      ["received", 216],
      ["in_progress", 210, "admin2"],
      ["fixed", 190, "admin2", "Hoist motor replaced by the vendor."],
      ["confirmed", 170],
    ],
    extra: { confirmation: "confirmed", fixNote: "Hoist motor replaced by the vendor." },
  },
];

export function buildHazards(now: Date): Hazard[] {
  const ago = (hours: number) => new Date(now.getTime() - hours * HOUR_MS);
  return HAZARDS.map(({ reports, events, extra, severity, ...seed }) => ({
    ...seed,
    baseSeverity: severity,
    severity,
    reports: reports.map(([reporterId, hours, transcript, transcriptEn, photo]): HazardReport => ({
      reporterId,
      at: ago(hours),
      transcript,
      transcriptEn,
      photoDataUrl: photo,
    })),
    timeline: events.map(([status, hours, by, note, level]) => ({ status, at: ago(hours), by, note, level })),
    createdAt: ago(reports[0][1]),
    escalationLevel: 0,
    trackingRefs: [],
    ...extra,
  }));
}

// ── Feedback ───────────────────────────────────────────────────────

const COMMENTS: Record<string, string[]> = {
  site1: [
    "Water cans on the 5th floor run out by 2 pm.",
    "தண்ணீர் மேல் மாடியில் மதியமே தீர்ந்துவிடுகிறது.",
    "Overtime is told at 6 pm, we cannot plan the bus home.",
    "ओवरटाइम का पैसा पूरा नहीं मिलता, अगले महीने थोड़ा देते हैं।",
    "Helmet straps are broken on many helmets.",
    "Supervisor speaks politely now, thank you.",
    "Toilet near the gate is not cleaned for days.",
    "சம்பளம் சரியான நேரத்தில் வருகிறது.",
    "No shade at lunch time, we eat in the sun.",
    "मचान पर चढ़ने से पहले कोई जाँच नहीं होती।",
    "Night concrete pouring goes till 11 pm, very tired the next day.",
    "First aid box on floor 4 is empty.",
    "పని బాగుంది కానీ జీతం ఆలస్యం అవుతోంది.",
    "Canteen food was good this week.",
  ],
  site2: [
    "Night duty roster changes without notice.",
    "मरीज़ों के रिश्तेदार चिल्लाते हैं, कोई सुरक्षा नहीं।",
    "Small-size gloves are not available for weeks.",
    "Breaks get cut when rounds run late.",
    "Nurses treat housekeeping staff with respect now.",
    "वेतन पर्ची समझ में नहीं आती, कटौती कितनी है?",
    "No rest room for women staff on night shift.",
    "Sister in-charge helped me when my child was sick.",
    "Drinking water cooler is not working since Monday.",
  ],
  site3: [
    "PPE gowns are reused, it does not feel safe.",
    "டியூட்டி அதிகம், ஆட்கள் குறைவு.",
    "Overtime is not written in the register.",
    "Salary came on time this month.",
    "Patient lift is slow, we push trolleys up the ramp.",
    "रात की ड्यूटी के बाद घर जाने का कोई साधन नहीं।",
    "OT staff shout at helpers during emergencies.",
    "Good training on the new infusion pumps.",
  ],
};

/** Typical mood per site (pay, safety, respect), nudged by the random draw. */
const SITE_MOOD: Record<string, [number, number, number]> = {
  site1: [1.9, 2.0, 2.4],
  site2: [2.3, 1.9, 2.5],
  site3: [2.2, 2.1, 2.2],
};
const ORG_OF_SITE: Record<string, string> = { site1: "org1", site2: "org2", site3: "org2" };

export function buildFeedback(now: Date, rand: () => number): FeedbackEntry[] {
  const entries: FeedbackEntry[] = [];
  const score = (mean: number) => Math.max(1, Math.min(3, Math.round(mean + (rand() - 0.5) * 1.6)));
  for (const siteId of Object.keys(COMMENTS)) {
    const pool = COMMENTS[siteId];
    let next = 0;
    for (let week = 0; week < 4; week++) {
      const count = 6 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i++) {
        const day = new Date(now.getTime() - (week * 7 + Math.floor(rand() * 6)) * DAY_MS);
        const comment = rand() < 0.5 ? pool[next++ % pool.length] : undefined;
        const [pay, safety, respect] = SITE_MOOD[siteId].map(score);
        entries.push({
          id: `fb-${siteId}-${week}-${i}`,
          orgId: ORG_OF_SITE[siteId],
          siteId,
          cohort: cohortKey(siteId, "all"),
          weekBucket: getISTWeekBucket(day),
          scores: { pay, safety, respect },
          comment,
          themes: comment ? tagThemes(comment) : undefined,
          createdAt: new Date(`${getISTDay(day)}T00:00:00Z`),
        });
      }
    }
  }
  return entries;
}

// ── Co-signed issues ───────────────────────────────────────────────

type IssueSeed = [
  id: string,
  siteId: string,
  text: string,
  signers: number,
  status: SiteIssue["status"],
  daysAgo: number,
  updatedDaysAgo: number,
  response?: string,
];

const ISSUES: IssueSeed[] = [
  [
    "iss-1",
    "site1",
    "Drinking water runs out on the upper floors by afternoon",
    7,
    "acknowledged",
    9,
    6,
    "Two extra 20-litre cans per floor from Monday. The store keeper refills them at 1 pm.",
  ],
  ["iss-2", "site1", "Overtime list is announced at 6 pm with no notice, we miss the last bus", 5, "escalated", 4, 1],
  ["iss-3", "site1", "No shade or rest area during the lunch break", 3, "gathering", 3, 1],
  ["iss-4", "site1", "முதலுதவிப் பெட்டி காலியாக உள்ளது", 2, "gathering", 1, 1],
  ["iss-5", "site2", "No escort to the bus stop after night shift", 6, "escalated", 6, 2],
  ["iss-6", "site2", "Small-size gloves out of stock for two weeks", 4, "gathering", 5, 2],
  ["iss-7", "site3", "ब्रेक का समय राउंड लंबा होने पर कट जाता है", 1, "gathering", 2, 2],
  [
    "iss-8",
    "site3",
    "PPE gowns are reused across patients",
    8,
    "resolved",
    20,
    12,
    "500 new gowns received. Single-use rule repeated in every shift huddle.",
  ],
];

export function buildIssues(now: Date): SiteIssue[] {
  const day = (daysAgo: number) => getISTDay(new Date(now.getTime() - daysAgo * DAY_MS));
  return ISSUES.map(([id, siteId, text, signerCount, status, created, updated, response]) => ({
    id,
    orgId: ORG_OF_SITE[siteId],
    siteId,
    text,
    signerCount,
    status,
    response,
    createdDay: day(created),
    updatedDay: day(updated),
  }));
}

// ── Skills ─────────────────────────────────────────────────────────

export const SKILLS: Skill[] = [
  {
    id: "sk1",
    workerId: "w1001",
    title: "Scaffolding Safety",
    issuer: "NSDC",
    date: new Date("2025-03-15"),
    verifiedBy: "admin1",
  },
  { id: "sk2", workerId: "w1001", title: "First Aid Basic", issuer: "Red Cross", date: new Date("2025-06-20") },
  {
    id: "sk3",
    workerId: "w1001",
    title: "Brick & Block Masonry (Level 4)",
    issuer: "CSDCI",
    date: new Date("2024-08-02"),
    verifiedBy: "admin1",
  },
  {
    id: "sk4",
    workerId: "w1002",
    title: "Electrical Safety",
    issuer: "NSDC",
    date: new Date("2025-01-10"),
    verifiedBy: "admin1",
  },
  {
    id: "sk5",
    workerId: "w1003",
    title: "Height Work Certificate",
    issuer: "State Labour Dept",
    date: new Date("2024-11-01"),
    verifiedBy: "admin1",
  },
  {
    id: "sk6",
    workerId: "w1007",
    title: "Wireman Licence",
    issuer: "TN Electrical Licensing Board",
    date: new Date("2023-05-12"),
    verifiedBy: "admin1",
  },
  {
    id: "sk7",
    workerId: "w2001",
    title: "Patient Care",
    issuer: "City Care Hospital",
    date: new Date("2025-02-15"),
    verifiedBy: "admin2",
  },
  { id: "sk8", workerId: "w2001", title: "Infection Control", issuer: "ICMR", date: new Date("2025-08-01") },
  {
    id: "sk9",
    workerId: "w2002",
    title: "Basic Life Support",
    issuer: "AHA",
    date: new Date("2025-05-10"),
    verifiedBy: "admin2",
  },
  {
    id: "sk10",
    workerId: "w2004",
    title: "Phlebotomy",
    issuer: "City Care Hospital",
    date: new Date("2025-04-20"),
    verifiedBy: "admin2",
  },
  {
    id: "sk11",
    workerId: "w2003",
    title: "Biomedical Waste Handling",
    issuer: "UP Pollution Control Board",
    date: new Date("2025-07-08"),
    verifiedBy: "admin2",
  },
];
