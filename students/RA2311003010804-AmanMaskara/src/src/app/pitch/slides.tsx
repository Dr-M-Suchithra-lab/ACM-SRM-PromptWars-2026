import type { ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  BadgeCheck,
  Bot,
  Bug,
  Building2,
  ClipboardList,
  Cpu,
  FileText,
  Fingerprint,
  Gauge,
  HardHat,
  Languages,
  Lightbulb,
  Lock,
  Mic,
  QrCode,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TestTube2,
  UserRound,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Arrow, Flow, Node } from "./flow";

export interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  body: ReactNode;
}

const REPO = "https://github.com/amanmaskara04/fairshift";

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-tile bg-accent text-ink">
          {icon}
        </span>
        <h3 className="font-display text-lg leading-tight font-extrabold">{title}</h3>
      </div>
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col border-l-4 border-accent pl-3">
      <span className="figure text-4xl font-semibold md:text-5xl">{value}</span>
      <span className="text-sm text-ink-2">{label}</span>
    </div>
  );
}

/** A prompt exactly as I typed it (typos included); `gloss` is the English meaning of a Hinglish prompt. */
function Prompt({ children, gloss }: { children: ReactNode; gloss?: string }) {
  return (
    <li className="rounded-tile border border-line bg-surface px-3 py-2 text-sm leading-snug">
      <span className="italic">“{children}”</span>
      {gloss && <span className="mt-1 block text-xs text-ink-2">({gloss})</span>}
    </li>
  );
}

// A real phone viewport (390 × 844 CSS px), scaled to fit the frame, so the app lays out exactly
// as it does on a phone instead of squeezing into a narrower box.
const PHONE = { width: 390, height: 844, scale: 0.7 };

function PhoneDemo() {
  const screen = { width: PHONE.width * PHONE.scale, height: PHONE.height * PHONE.scale };
  return (
    <div className="mx-auto flex shrink-0 flex-col items-center rounded-[2.75rem] bg-ink px-[11px] pt-3 pb-[11px] shadow-xl">
      <span aria-hidden="true" className="mb-2 h-1.5 w-16 rounded-full bg-ink-2" />
      <div className="relative overflow-hidden rounded-[2rem] bg-paper" style={screen}>
        <iframe
          src="/login"
          title="Worker app demo"
          loading="lazy"
          className="absolute top-0 left-0 border-0"
          style={{
            width: PHONE.width,
            height: PHONE.height,
            transform: `scale(${PHONE.scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}

export const SLIDES: Slide[] = [
  {
    id: "title",
    eyebrow: "Prompt Wars 2026 × ACM SRMIST · UN SDG 8",
    title: "Fair work. Fair pay. Your voice.",
    body: (
      <div className="flex flex-col gap-8">
        <BrandMark className="text-4xl md:text-5xl" />
        <p className="max-w-3xl text-xl md:text-2xl">
          A voice-first app in four Indian languages that gives shift workers proof of their hours, a pay check they can
          hear, a safe way to report danger and speak up, and gives employers an early warning before people get hurt or
          quit.
        </p>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat value="4" label="languages, read aloud" />
          <Stat value="2+" label="industries, one codebase" />
          <Stat value="376" label="automated tests" />
          <Stat value="0" label="accessibility violations" />
        </div>
      </div>
    ),
  },
  {
    id: "problem",
    eyebrow: "The problem",
    title: "“Ramesh worked 4 hours of overtime last week. Nobody wrote it down.”",
    body: (
      <div className="grid gap-4 md:grid-cols-2">
        <Card icon={<Scale className="size-5" />} title="Opaque pay">
          Paper registers and WhatsApp groups. Overtime goes uncounted, and nobody can check the payslip against the
          hours actually worked.
        </Card>
        <Card icon={<Fingerprint className="size-5" />} title="Fear of being identified">
          Workers stay silent about bad supervisors or conditions because complaints can be traced back.
        </Card>
        <Card icon={<HardHat className="size-5" />} title="Unreported hazards">
          A shaking scaffold or exposed wire is ignored until someone is injured.
        </Card>
        <Card icon={<ClipboardList className="size-5" />} title="Lost career history">
          No record of skills or days worked, so every new job starts from zero and welfare benefits go unclaimed.
          Employers can&apos;t see who is overworked or about to quit.
        </Card>
      </div>
    ),
  },
  {
    id: "users",
    eyebrow: "Who it is for",
    title: "Four users, one platform",
    body: (
      <div className="grid gap-4 md:grid-cols-2">
        <Card icon={<UserRound className="size-5" />} title="Shift worker">
          Mason, ward attendant, cleaner. A ₹7,000 Android phone, patchy data, may not read well, speaks Tamil, Hindi or
          Telugu.
        </Card>
        <Card icon={<Building2 className="size-5" />} title="Site manager">
          Needs to see who is on duty, who is exhausted, which hazards are overdue, and whether everyone was paid what
          they are owed.
        </Card>
        <Card icon={<QrCode className="size-5" />} title="Gate kiosk">
          A spare phone at the gate shows a QR code that changes every 30 seconds, so a photo of it stops working within
          a minute.
        </Card>
        <Card icon={<BadgeCheck className="size-5" />} title="Next employer or welfare officer">
          Opens a signed link to verify a worker&apos;s skills, work history or certificate, and only what the worker
          chose to share.
        </Card>
      </div>
    ),
  },
  {
    id: "thinking",
    eyebrow: "How I approached it",
    title: "From the brief to a solution",
    body: (
      <div className="flex flex-col gap-6">
        <Flow
          steps={[
            <Node key="1">Read the brief + rubric line by line</Node>,
            <Node key="2">Studied past Prompt Wars winners</Node>,
            <Node key="3" tone="accent">
              Designed for Ramesh&apos;s ₹7,000 phone
            </Node>,
            <Node key="4">Every pain point mapped to a feature</Node>,
            <Node key="5" tone="brand">
              Tests + security from day one
            </Node>,
          ]}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Card icon={<Lightbulb className="size-5" />} title="What gets judged">
            Code quality, security, efficiency, testing, accessibility and problem alignment, not just the number of
            features.
          </Card>
          <Card icon={<Cpu className="size-5" />} title="The core idea">
            Let the AI <em>understand</em> messy speech; let tested code <em>compute</em> every rupee, hour and
            deadline.
          </Card>
          <Card icon={<Smartphone className="size-5" />} title="Hard constraints">
            Low literacy, regional languages, slow data, cheap phones: so voice, icons, offline and light pages.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "flow",
    eyebrow: "User flow",
    title: "A worker's day, and what the manager sees",
    body: (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Worker</p>
          <Flow
            steps={[
              <Node key="a">Pick language (own script)</Node>,
              <Node key="b">Code + PIN keypad</Node>,
              <Node key="c" tone="accent">
                Home: earned so far
              </Node>,
              <Node key="d">Scan gate QR (works offline)</Node>,
              <Node key="e">Check pay · speak a hazard · get help · speak up</Node>,
            ]}
          />
        </div>
        <div className="flex justify-center">
          <Arrow vertical label="MongoDB · Mumbai" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Manager</p>
          <Flow
            steps={[
              <Node key="f" tone="ink">
                Needs attention (escalated first)
              </Node>,
              <Node key="g">Hazard → fixed → worker confirms</Node>,
              <Node key="h" tone="brand">
                Pay shortfall → Pay the gap
              </Node>,
              <Node key="i">Fatigue + quit-risk reasons</Node>,
              <Node key="j">Approve skills and certificates</Node>,
            ]}
          />
        </div>
      </div>
    ),
  },
  {
    id: "architecture",
    eyebrow: "Architecture",
    title: "The AI understands. The code computes.",
    body: (
      <div className="flex flex-col gap-4">
        <Flow
          steps={[
            <Node key="1">
              Worker app /w · Employer /a
              <span className="block text-xs font-normal">PWA · offline queue · service worker</span>
            </Node>,
            <Node key="2" tone="ink">
              proxy.ts
              <span className="block text-xs font-normal">nonce CSP · security headers</span>
            </Node>,
            <Node key="3">
              Server Actions
              <span className="block text-xs font-normal">roles · org checks · Zod · rate limits</span>
            </Node>,
            <Node key="4" tone="brand">
              Next.js 16 · Vercel Mumbai
              <span className="block text-xs font-normal">Cloud Run–ready container</span>
            </Node>,
          ]}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Node tone="accent">
            core/ · pure TypeScript
            <span className="block text-xs font-normal">
              2× overtime · pay check · fatigue · quit risk · eligibility · hazard deadlines · signed tokens
            </span>
          </Node>
          <Node>
            ai/ · Gemini 3.5 Flash-Lite · 3.8 Flash · TTS
            <span className="block text-xs font-normal">
              speech → JSON · hazard urgency · help steps · reworded pay · fallbacks
            </span>
          </Node>
          <Node>
            repos/ · one interface
            <span className="block text-xs font-normal">MongoDB Atlas (Mumbai) · in-memory for tests</span>
          </Node>
        </div>
        <p className="text-ink-2">
          Gemini never produces a number. If it is down, rule-based fallbacks and template text take over, so the demo
          cannot break.
        </p>
      </div>
    ),
  },
  {
    id: "novelty",
    eyebrow: "Why FairShift stands out",
    title: "Six things nobody else ships together",
    body: (
      <div className="grid gap-4 md:grid-cols-3">
        <Card icon={<Scale className="size-5" />} title="Pay you can check">
          FairPay Sentinel compares recorded hours with what was paid: “4h 32m × ₹200/h = ₹907”. The employer settles it
          with <em>Pay the gap</em>.
        </Card>
        <Card icon={<Mic className="size-5" />} title="Speak, don't type">
          Report danger in Tamil, Hindi or Telugu. The AI judges how urgent it is; a fire is always critical, with a
          one-tap Call 112.
        </Card>
        <Card icon={<Users className="size-5" />} title="Safe in numbers">
          An issue reaches management only when 5 workers sign it. Signers are never stored; feedback shows only for
          groups of 5+.
        </Card>
        <Card icon={<HardHat className="size-5" />} title="Hazards can't be ignored">
          Deadlines by severity, automatic escalation up the chain, and the worker confirms whether it is really fixed.
        </Card>
        <Card icon={<BadgeCheck className="size-5" />} title="Attendance becomes proof">
          Verified days unlock welfare schemes (BOCW, e-Shram, ESIC) and a signed work certificate; a 30-day passport
          link carries skills.
        </Card>
        <Card icon={<Languages className="size-5" />} title="Built for real phones">
          Read-aloud on every screen, a Help tab with verified helplines, offline check-ins, every page under 400 ms.
        </Card>
      </div>
    ),
  },
  {
    id: "demo",
    eyebrow: "Live demo",
    title: "Try it right here",
    body: (
      <div className="grid items-start gap-6 md:grid-cols-[300px_1fr]">
        <PhoneDemo />
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-3">
            {[
              "Tap “Ramesh” → Home shows what he has earned so far and a rest warning.",
              "Pay → the possible shortfall, with the arithmetic in plain words. Tap 🔊 to hear it.",
              "Report → tap “Fire or smoke” → Danger now, with a one-tap Call 112.",
              "Help → type “my overtime was not paid” → next steps and the right helpline.",
              "Open the manager dashboard as Priya → Needs attention, Payroll, People.",
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="figure flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
                  {i + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-ink-2">The phone shows the real app at a real phone size, not a screenshot.</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/login"
              target="_blank"
              rel="noreferrer"
              className="rounded-tile border-2 border-ink bg-accent px-4 py-2 font-bold text-ink"
            >
              Open worker app ↗
            </a>
            <a
              href="/login?role=admin"
              target="_blank"
              rel="noreferrer"
              className="rounded-tile border-2 border-ink bg-surface px-4 py-2 font-bold"
            >
              Open manager dashboard ↗
            </a>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "prompts-1",
    eyebrow: "My prompts · part 1 — discover & plan",
    title: "How the idea was shaped",
    body: (
      <div className="grid gap-6 md:grid-cols-2">
        <ul className="flex flex-col gap-2">
          <Prompt>
            check from github and linkedin and from internet that which are the best projects that have won older prompt
            wars … and also read my docs to get a knowledge about what we have to do to win this promptwars
          </Prompt>
          <Prompt gloss="Make proper build docs; we'll build on Next.js. Research the UI and the architecture, make a build plan, put it in the docs folder, and verify everything.">
            build karne ka proper docs bana de, and next js arch pe banaenge. ui ka proper research kar, architecture ka
            research kar, and then build plan bana, and docs folder mei daalde. sab kuch confirm and verify krna
          </Prompt>
          <Prompt>also i have added an animations folder in D drive from which you can use animation</Prompt>
        </ul>
        <div className="flex flex-col gap-3">
          <Card icon={<FileText className="size-5" />} title="What came out">
            Six planning docs before any code: past-winner research, product spec, UI/UX design for low-literacy users,
            architecture, phased build plan, and a verification log.
          </Card>
          <Card icon={<Gauge className="size-5" />} title="Key decision">
            From the animation folder, one text effect made it in, rebuilt as pure CSS. The 3D and WebGL effects were
            too heavy for a ₹7,000 phone; the landing scene is hand-made SVG.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "prompts-2",
    eyebrow: "My prompts · part 2 — build, test on my phone, fix",
    title: "How the product was sharpened",
    body: (
      <div className="grid gap-6 md:grid-cols-2">
        <ul className="flex flex-col gap-2">
          <Prompt>
            deploy it on vercel and mongo db . we have to switch the services . and do it fast within 10 mins
          </Prompt>
          <Prompt>the ui ux is very bad on android phone . please align it and fix it for both laptop and phone</Prompt>
          <Prompt>
            in danger when i am using voice command to report fire , its marking it low rank issue . the issue severity
            if understood by ai would be better rather than depending on manual terms
          </Prompt>
          <Prompt>how can someone merge scaffolding and heat issue together . does it make sense??</Prompt>
          <Prompt>
            give options or sliders of how much the admin want to pay … and the admin pays the worker , remove the pay
            gap
          </Prompt>
          <Prompt>
            you can also add emergency helpline numbers for workers and an ai resolution to there issues. brainstorm
            this feature and do it yourself.
          </Prompt>
        </ul>
        <div className="flex flex-col gap-3">
          <Card icon={<Sparkles className="size-5" />} title="What came out">
            Live on MongoDB in Mumbai within the hour; a phone-first redesign; the AI judges how urgent a hazard is and
            a fire is always critical, with Call 112; merges only for the same danger at the same site; payroll presets,
            sliders and <em>Pay the gap</em>; a Help tab with verified helplines and AI next steps.
          </Card>
          <Card icon={<Bug className="size-5" />} title="How I found the problems">
            By using the live app on my own phone as each demo person, then reporting each one as page, action and
            symptom.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "prompts-3",
    eyebrow: "My prompts · part 3 — judgement, quality & release",
    title: "How the build was proved",
    body: (
      <div className="grid gap-6 md:grid-cols-2">
        <ul className="flex flex-col gap-2">
          <Prompt>
            everyone has same problem statement and used agents that gave everyone same thing . what different did we do
          </Prompt>
          <Prompt>but everyone has done same thing</Prompt>
          <Prompt>dont compromise security performance for lighthouse . do other changes</Prompt>
          <Prompt>is it possible to increase code quality even more</Prompt>
          <Prompt>
            do full test and security audit and make it in the best possible form possible . make sure all tests passed
            . act as proper testing engineer .
          </Prompt>
          <Prompt gloss="Drafted with the agent, sent by me.">
            Act as a release engineer before I submit FairShift. Do not change any feature code. Verify against these
            exact targets and report a pass/fail table …
          </Prompt>
        </ul>
        <div className="flex flex-col gap-3">
          <Card icon={<Gauge className="size-5" />} title="What came out">
            Four features beyond the brief. The lowest AI score (code quality, 89) became the next target: formatting,
            focused components, coverage from 78% to 98%. Tenant-isolation tests, 34 live probes, and a release gate
            where all six targets passed.
          </Card>
          <Card icon={<Lightbulb className="size-5" />} title="What I learned">
            Define “done” before starting. Describe the user and the device, not just the feature. Test on the real
            phone.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "agy",
    eyebrow: "From prompt to agent",
    title: "Build phases became precise Antigravity briefs",
    body: (
      <div className="flex flex-col gap-5">
        <Flow
          steps={[
            <Node key="1">My prompt (one line, often Hinglish)</Node>,
            <Node key="2" tone="accent">
              Spec docs: what, why, constraints
            </Node>,
            <Node key="3" tone="ink">
              Antigravity task brief
            </Node>,
            <Node key="4">Agent builds the phase</Node>,
            <Node key="5" tone="brand">
              Verified: build + tests + my phone
            </Node>,
          ]}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <pre className="figure overflow-x-auto rounded-tile border border-ink bg-ink p-4 text-xs leading-relaxed text-paper md:text-sm">
            {`# Task A — FairShift: foundations + core engine

## Decisions (already made — do not deviate)
- Data layer: repository interfaces; in-memory
  backend now, one accessor getRepos()
- i18n: en|hi|ta|te, short simple words

## Core engine — PURE TypeScript, no I/O
- pay.ts: ALL money as integer paise

## Tests (write them first for core)
- coverage src/core/** ≥ 95

## Not your job
- no network/AI calls · no new dependencies`}
          </pre>
          <div className="flex flex-col gap-3">
            <Card icon={<Bot className="size-5" />} title="Why briefs, not chats">
              An agent starts cold. A brief fixes the decisions up front, lists exactly what to deliver, says what is{" "}
              <em>not</em> its job, and sets the tests that define “done”.
            </Card>
            <Card icon={<BadgeCheck className="size-5" />} title="Trust, but verify">
              Agent output was never committed on faith: every phase had to pass lint, types, unit and end-to-end tests,
              and then I used it on my own phone.
            </Card>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "decisions",
    eyebrow: "Prompts → decisions",
    title: "How my prompts changed the build",
    body: (
      <table className="w-full text-left text-sm md:text-base">
        <thead className="text-ink-2">
          <tr>
            <th className="border-b border-ink py-2 pr-4 font-semibold">Prompt</th>
            <th className="border-b border-ink py-2 font-semibold">Building decision it caused</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Study past winners", "Treat security, tests and accessibility as features: they are scored."],
            [
              "Deploy on Vercel + MongoDB, fast",
              "One data interface, so storage changed without touching a page; live in Mumbai within the hour.",
            ],
            [
              "Clicks feel slow",
              "Measured the database round trip, moved the servers next to the data in Mumbai, added instant press feedback.",
            ],
            [
              "Fire marked as low severity",
              "The AI judges severity from what is happening; code can only raise it. Fire is always critical.",
            ],
            [
              "Code quality scored lowest (89)",
              "Formatted the codebase, split the largest pages, raised coverage from 78% to 98% with a gate in CI.",
            ],
            [
              "October payroll should look like this",
              "Payday window: pay screens open on last month for the first 7 days, when wages fall due, so the story never vanishes at a month change.",
            ],
            [
              "Don't compromise security for Lighthouse",
              "Strict security headers kept; speed won elsewhere (two database round trips per page).",
            ],
            [
              "Follow the submission guide",
              "A Cloud Run–ready container, smoke-tested in CI; live on Vercel, which the organisers allowed.",
            ],
          ].map(([prompt, decision]) => (
            <tr key={prompt}>
              <td className="border-b border-line py-2 pr-4 font-semibold">{prompt}</td>
              <td className="border-b border-line py-2">{decision}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    id: "testing",
    eyebrow: "Testing while vibecoding",
    title: "AI writes code fast — and bugs confidently",
    body: (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          {[
            [
              "Unit · 340",
              "Pay, overtime, fatigue, risk, eligibility, hazard deadlines, signed tokens, AI guard rails, contrast, 4 languages.",
            ],
            ["Coverage · 98%", "Of all measured lines, enforced in CI: the build fails below 95%."],
            [
              "End-to-end · 36",
              "Real browser (phone + desktop) through both interfaces, with axe accessibility checks.",
            ],
            [
              "Live probes · 34",
              "Read-only attacks on the deployed site: forged logins, cross-site requests, tampering.",
            ],
          ].map(([name, text]) => (
            <div key={name} className="rounded-tile border border-line bg-surface p-3">
              <p className="font-display font-extrabold">{name}</p>
              <p className="text-sm text-ink-2">{text}</p>
            </div>
          ))}
        </div>
        <Card icon={<Bug className="size-5" />} title="Real bugs the tests caught">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>Overtime capped once per month instead of per week: workers underpaid.</li>
            <li>Seeded shifts 5½ hours off on a UTC server.</li>
            <li>Keypad and PIN field shared a screen-reader label.</li>
            <li>“Thank you” screen swallowed by a page refresh.</li>
            <li>Security policy silently blocking chart styles.</li>
          </ul>
        </Card>
      </div>
    ),
  },
  {
    id: "security",
    eyebrow: "Security while vibecoding",
    title: "Fast code still has to be safe code",
    body: (
      <div className="grid gap-4 md:grid-cols-3">
        <Card icon={<ShieldCheck className="size-5" />} title="Caught in review">
          A helper exported from a server-action file would have become a public endpoint leaking QR secrets. Moved to
          server-only code.
        </Card>
        <Card icon={<Building2 className="size-5" />} title="Companies kept apart">
          A test makes one company&apos;s manager try every action on another company&apos;s records: all refused,
          nothing changed.
        </Card>
        <Card icon={<Lock className="size-5" />} title="Anonymity is a security property">
          No identity on feedback, one-way guards, names removed: a manager cannot unmask a worker.
        </Card>
        <Card icon={<Fingerprint className="size-5" />} title="Accounts">
          Hashed PINs, signed sessions, role checks on every action, login rate limits.
        </Card>
        <Card icon={<Bot className="size-5" />} title="Prompt injection">
          Speech and text are fenced as untrusted; output must match a strict schema; code decides the final severity.
        </Card>
        <Card icon={<TestTube2 className="size-5" />} title="Headers, secrets & dependencies">
          Nonce script policy, HSTS, no framing. Secrets only in encrypted environment settings. 0 production
          vulnerabilities; 34/34 live probes.
        </Card>
      </div>
    ),
  },
  {
    id: "impact",
    eyebrow: "Why FairShift deserves the top spot",
    title: "Every rubric line, with proof",
    body: (
      <div className="grid gap-3">
        {[
          [
            "Real-world impact",
            "Unpaid overtime found with its arithmetic; hazards escalate on deadlines; a fire always offers Call 112.",
          ],
          [
            "SDG 8",
            "8.5 fair pay (pay check, 2× overtime, Pay the gap) · 8.8 safe workplaces and rights (hazards, anonymous voice, welfare eligibility).",
          ],
          [
            "Inclusivity",
            "4 languages, voice in and out, offline, big targets, axe 0 violations, every page under 400 ms.",
          ],
          ["Technical", "Strict TypeScript, nonce CSP, signed sessions, 376 tests, 98% coverage, green CI."],
          [
            "Feasibility",
            "Construction and hospital live from one codebase; a new industry is one config file; Cloud Run–ready.",
          ],
        ].map(([k, v]) => (
          <div key={k} className="grid gap-1 border-b border-line pb-3 md:grid-cols-[220px_1fr]">
            <span className="font-display font-extrabold">{k}</span>
            <span className="text-ink-2">{v}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "thanks",
    eyebrow: "Thank you",
    title: "Fairer, safer work — for the people who build and care for our cities.",
    body: (
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div className="rounded-tile border-2 border-ink bg-white p-3">
          <QRCodeSVG value={REPO} size={160} title="FairShift GitHub repository" />
        </div>
        <div className="flex flex-col gap-2">
          <a href={REPO} className="font-bold text-primary underline underline-offset-4">
            github.com/amanmaskara04/fairshift
          </a>
          <p className="text-ink-2">
            Built with Claude Code and Google Antigravity · Gemini · Next.js · MongoDB Atlas · Vercel
          </p>
        </div>
      </div>
    ),
  },
];
