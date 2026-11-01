/**
 * Demo organisations, sites and people: one construction company in Chennai and one
 * hospital in Lucknow, 18 workers each, so both sectors look like real workplaces.
 */
import { scryptSync } from "node:crypto";
import type { SkillLevel } from "@/config/minimum-wage";
import type { Admin, Org, Site, Worker } from "../repos/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const hashCache = new Map<string, string>();

/** scrypt is deliberately slow; demo hashes are deterministic, so compute each once per process. */
function hashSecret(secret: string, saltHex: string): string {
  const key = `${secret}|${saltHex}`;
  let hash = hashCache.get(key);
  if (!hash) {
    hash = scryptSync(secret, Buffer.from(saltHex, "hex"), 64).toString("hex");
    hashCache.set(key, hash);
  }
  return hash;
}

export const DEMO_PIN = "1234";
export const DEMO_ADMIN_PASSWORD = "demo1234";

export const ORGS: Org[] = [
  {
    id: "org1",
    name: "BuildRight Constructions",
    sector: "construction",
    labourRules: { dailyHrs: 8, weeklyHrs: 48, otMultiplier: 2 },
  },
  {
    id: "org2",
    name: "City Care Hospital",
    sector: "hospital",
    labourRules: { dailyHrs: 8, weeklyHrs: 48, otMultiplier: 2 },
  },
];

export const SITES: Site[] = [
  {
    id: "site1",
    orgId: "org1",
    name: "Velachery Tower Site, Chennai",
    sector: "construction",
    state: "TN",
    geofence: { lat: 12.9815, lng: 80.2176, radiusM: 200 },
    qrSecret: "qr-secret-site1-abcdef1234567890",
  },
  {
    id: "site2",
    orgId: "org2",
    name: "Ward A — General Medicine",
    sector: "hospital",
    state: "UP",
    qrSecret: "qr-secret-site2-abcdef1234567890",
  },
  {
    id: "site3",
    orgId: "org2",
    name: "Ward B — Surgery",
    sector: "hospital",
    state: "UP",
    qrSecret: "qr-secret-site3-abcdef1234567890",
  },
];

type RosterRow = [
  code: string,
  name: string,
  jobTitle: string,
  skill: SkillLevel,
  lang: string,
  siteId: string,
  rate: number,
];

// Construction: daily wages in paise. Hospital: monthly salaries in paise.
const CONSTRUCTION: RosterRow[] = [
  ["1001", "Ramesh Kumar", "Mason", "skilled", "ta", "site1", 80_000],
  ["1002", "Arun Yadav", "Bar bender", "semi_skilled", "hi", "site1", 70_000],
  ["1003", "Venkat Rao", "Carpenter", "skilled", "te", "site1", 78_000],
  ["1004", "Dinesh Singh", "Scaffolder", "semi_skilled", "hi", "site1", 72_000],
  ["1005", "Manoj Kumar", "Mason", "skilled", "ta", "site1", 80_000],
  ["1006", "Ravi Sharma", "Helper", "unskilled", "hi", "site1", 60_000],
  ["1007", "Selvam Murugan", "Electrician", "skilled", "ta", "site1", 85_000],
  ["1008", "Babu Rajan", "Helper", "unskilled", "ta", "site1", 54_000],
  ["1009", "Suresh Naik", "Crane operator", "skilled", "en", "site1", 95_000],
  ["1010", "Prakash Mahto", "Helper", "unskilled", "hi", "site1", 58_000],
  ["1011", "Karthik Raja", "Plumber", "skilled", "ta", "site1", 82_000],
  ["1012", "Imran Sheikh", "Welder", "skilled", "hi", "site1", 88_000],
  ["1013", "Lakshman Reddy", "Bar bender", "semi_skilled", "te", "site1", 70_000],
  ["1014", "Gopal Das", "Painter", "semi_skilled", "en", "site1", 68_000],
  ["1015", "Murali Krishnan", "Mason", "skilled", "ta", "site1", 79_000],
  ["1016", "Raju Oraon", "Helper", "unskilled", "hi", "site1", 56_000],
  ["1017", "Valli Ammal", "Helper", "unskilled", "ta", "site1", 56_000],
  ["1018", "Sekar Pandian", "Carpenter", "skilled", "ta", "site1", 77_000],
];

const HOSPITAL: RosterRow[] = [
  ["2001", "Sunita Devi", "Ward attendant", "semi_skilled", "hi", "site2", 18_000_00],
  ["2002", "Meena Kumari", "Staff nurse", "skilled", "hi", "site2", 26_000_00],
  ["2003", "Lakshmi Bai", "Housekeeping", "unskilled", "hi", "site2", 12_500_00],
  ["2004", "Pooja Yadav", "Patient care assistant", "semi_skilled", "hi", "site3", 15_000_00],
  ["2005", "Kavita Rani", "Staff nurse", "skilled", "en", "site3", 27_000_00],
  ["2006", "Anita Sharma", "Ward attendant", "semi_skilled", "hi", "site3", 17_000_00],
  ["2007", "Farzana Khatoon", "Housekeeping", "unskilled", "hi", "site2", 12_000_00],
  ["2008", "Rekha Verma", "Lab assistant", "semi_skilled", "hi", "site3", 16_500_00],
  ["2009", "Sangeeta Pal", "Patient care assistant", "semi_skilled", "hi", "site2", 15_500_00],
  ["2010", "Mohd. Arif", "Security guard", "unskilled", "hi", "site2", 13_000_00],
  ["2011", "Deepa Nair", "Staff nurse", "skilled", "ta", "site3", 26_500_00],
  ["2012", "Ramkali", "Housekeeping", "unskilled", "hi", "site3", 11_500_00],
  ["2013", "Shalini Gupta", "Ward attendant", "semi_skilled", "hi", "site2", 17_000_00],
  ["2014", "Vijay Kumar", "Security guard", "unskilled", "hi", "site3", 13_000_00],
  ["2015", "Neha Singh", "Staff nurse", "skilled", "en", "site2", 26_000_00],
  ["2016", "Kamla Devi", "Housekeeping", "unskilled", "hi", "site2", 12_000_00],
  ["2017", "Srinivas Rao", "OT technician", "skilled", "te", "site3", 24_000_00],
  ["2018", "Priyanka Mishra", "Patient care assistant", "semi_skilled", "hi", "site3", 15_000_00],
];

/** Demo personas use PIN 1234; everyone else's PIN is their code reversed. */
const pinFor = (code: string) => (code === "1001" || code === "2001" ? DEMO_PIN : [...code].reverse().join(""));
const saltFor = (code: string) => `a1b2c3d4e5f6${code}`;

/** How long ago each worker joined (days). Ramesh's start is set by his attendance story. */
const TENURE_DAYS: Record<string, number> = { "1008": 40, "1016": 55, "1017": 70, "2018": 35, "2012": 60 };
export const DEFAULT_TENURE_DAYS = 130;

export function buildWorkers(now: Date, rameshJoined: Date): Worker[] {
  const rows: [RosterRow, "org1" | "org2", "daily" | "monthly"][] = [
    ...CONSTRUCTION.map((r) => [r, "org1", "daily"] as [RosterRow, "org1", "daily"]),
    ...HOSPITAL.map((r) => [r, "org2", "monthly"] as [RosterRow, "org2", "monthly"]),
  ];
  return rows.map(([[code, name, jobTitle, skillLevel, lang, siteId, rate], orgId, basis]) => ({
    id: `w${code}`,
    orgId,
    siteId,
    name,
    code,
    pinHash: hashSecret(pinFor(code), saltFor(code)),
    pinSalt: saltFor(code),
    lang,
    role: "worker",
    jobTitle,
    skillLevel,
    pay: { basis, rate },
    joinedAt:
      code === "1001" ? rameshJoined : new Date(now.getTime() - (TENURE_DAYS[code] ?? DEFAULT_TENURE_DAYS) * DAY_MS),
    pastWork:
      code === "1001"
        ? [{ employer: "Shakti Infra Projects", role: "Mason", sector: "construction", from: "2023-03", to: "2025-11" }]
        : code === "2001"
          ? [
              {
                employer: "Sahara Nursing Home",
                role: "Ward helper",
                sector: "hospital",
                from: "2021-06",
                to: "2024-02",
              },
            ]
          : undefined,
  }));
}

export function buildAdmins(): Admin[] {
  return [
    {
      id: "admin1",
      orgId: "org1",
      name: "Priya Menon",
      email: "priya@buildright.demo",
      passwordHash: hashSecret(DEMO_ADMIN_PASSWORD, "a1b2c3d4e5f60101"),
      passwordSalt: "a1b2c3d4e5f60101",
      role: "admin",
      siteIds: ["site1"],
    },
    {
      id: "admin2",
      orgId: "org2",
      name: "Dr. Arjun Patel",
      email: "arjun@citycare.demo",
      passwordHash: hashSecret(DEMO_ADMIN_PASSWORD, "a1b2c3d4e5f60102"),
      passwordSalt: "a1b2c3d4e5f60102",
      role: "admin",
      siteIds: ["site2", "site3"],
    },
  ];
}
