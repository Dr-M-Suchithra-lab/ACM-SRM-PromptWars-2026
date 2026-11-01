import { PolicyEditor } from "./PolicyEditor";
import { policyInput } from "../../shared/engines";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { businessInput, employeeInput, settingsInput } from "../../shared/saas";
import { AuthFrame } from "./AuthExperience";
import { Field } from "./Field";
import { Button } from "./ui/button";
import type { Workspace } from "../types";
export type Api = <T>(path: string, body?: unknown) => Promise<T>;
const value = (f: FormData, key: string) => String(f.get(key) ?? "");
const Input = ({
  label,
  name,
  type = "text",
  required = true,
  initial = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  initial?: string | number;
}) => (
  <Field label={label}>
    <input
      name={name}
      type={type}
      required={required}
      defaultValue={initial}
      maxLength={type === "number" ? undefined : 200}
    />
  </Field>
);
function BusinessFields({
  initial = {},
}: {
  initial?: Record<string, unknown>;
}) {
  return (
    <div className="saas-grid">
      <Input
        label="Business name"
        name="name"
        initial={String(initial.name ?? "")}
      />
      <Field label="Industry">
        <select
          name="industry"
          defaultValue={String(initial.industry ?? "construction")}
        >
          {[
            "construction",
            "healthcare",
            "manufacturing",
            "education",
            "other",
          ].map((i) => (
            <option key={i} value={i}>
              {i[0].toUpperCase() + i.slice(1)}
            </option>
          ))}
        </select>
      </Field>
      <Input
        label="Business email"
        name="email"
        type="email"
        initial={String(initial.email ?? "")}
      />
      <Input
        label="Business phone (optional)"
        name="phone"
        required={false}
        initial={String(initial.phone ?? "")}
      />
      <Input
        label="Business location"
        name="location"
        initial={String(initial.location ?? "")}
      />
      <Input
        label="Country"
        name="country"
        initial={String(initial.country ?? "India")}
      />
      <Input label="State" name="state" initial={String(initial.state ?? "")} />
      <Input label="City" name="city" initial={String(initial.city ?? "")} />
      <Input
        label="Business description (optional)"
        name="description"
        required={false}
        initial={String(initial.description ?? "")}
      />
      <Input
        label="Business size"
        name="size"
        type="number"
        initial={Number(initial.size ?? 1)}
      />
      <Input
        label="Working days (0 Sunday – 6 Saturday, comma separated)"
        name="working_days"
        initial={
          Array.isArray(initial.working_days)
            ? initial.working_days.join(",")
            : "1,2,3,4,5"
        }
      />
      <Field label="Currency">
        <select name="currency">
          <option value="INR">INR · integer paise</option>
        </select>
        <small>The current payroll engine supports INR.</small>
      </Field>
    </div>
  );
}
const businessFields = (f: FormData) =>
  Object.fromEntries(
    [
      "name",
      "industry",
      "email",
      "phone",
      "location",
      "country",
      "state",
      "city",
      "description",
      "currency",
    ].map((k) => [k, value(f, k)]),
  );
export function Onboarding({
  api,
  session,
  enabled,
  hasMembership,
  onCreated,
}: {
  api: Api;
  session: Session | null;
  enabled: boolean;
  hasMembership: boolean;
  onCreated: (org: string) => Promise<void>;
}) {
  const [choice, setChoice] = useState(""),
    [step, setStep] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  if (!session)
    return (
      <AuthFrame title="Welcome to NYAVERIS AI">
        <Link to="/signup">Create an account</Link> or{" "}
        <Link to="/login">sign in</Link> to continue.
      </AuthFrame>
    );
  if (hasMembership)
    return (
      <AuthFrame title="Your workplace is ready">
        <Link to="/app/home">Open your authorized workspace</Link>
        <Button variant="outline" onClick={() => setChoice("create")}>
          Create another business
        </Button>
        {choice !== "create" && (
          <p>Use the workspace selector to switch between your memberships.</p>
        )}
        {choice === "create" && Setup()}
      </AuthFrame>
    );
  function Setup() {
    return (
      <form className="form-stack" onSubmit={submit}>
        <ol className="wizard-progress" aria-label="Business setup progress">
          {["Business details", "Workforce policy", "Owner & review"].map(
            (t, i) => (
              <li key={t} aria-current={step === i + 1 ? "step" : undefined}>
                {i + 1}. {t}
              </li>
            ),
          )}
        </ol>
        <fieldset hidden={step !== 1}>
          <legend>Business details</legend>
          <BusinessFields />
        </fieldset>
        <fieldset hidden={step !== 2}>
          <legend>Workforce configuration</legend>
          <p>
            These are your workplace rules, not a statement of legal wage
            requirements. Review applicable employment policies before use.
          </p>
          <div className="saas-grid">
            <Input
              label="Time zone (IANA)"
              name="timezone"
              initial="Asia/Kolkata"
            />
            <Input
              label="Standard shift duration (minutes)"
              name="regular_minutes"
              type="number"
              initial={480}
            />
            <Input
              label="Minimum rest between shifts (minutes)"
              name="min_rest_minutes"
              type="number"
              initial={660}
            />
            <Input
              label="Maximum shift duration (minutes)"
              name="max_shift_minutes"
              type="number"
              initial={720}
            />
            <Input
              label="Maximum consecutive working days"
              name="max_consecutive_days"
              type="number"
              initial={6}
            />
            <Field label="Default wage calculation basis">
              <select name="basis">
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </Field>
            <Input
              label="Hourly rate (paise)"
              name="hourly_paise"
              type="number"
              initial={10000}
            />
            <Input
              label="Daily rate (paise)"
              name="daily_paise"
              type="number"
              initial={80000}
            />
            <Input
              label="Overtime multiplier (basis points, 10000 = 1×)"
              name="overtime_bps"
              type="number"
              initial={15000}
            />
          </div>
        </fieldset>
        <fieldset hidden={step !== 3}>
          <legend>Business administrator</legend>
          <p>
            Your verified account ({session?.user.email}) will become the
            business owner. Ownership is assigned by the database, never by the
            browser.
          </p>
          <p>
            Creation saves the business, owner membership and initial wage
            policy together. Repeated creation attempts use the same request
            identifier.
          </p>
          <label className="check-label">
            <input type="checkbox" name="authorized" required={step === 3} /> I
            am authorized to create and administer this business.
          </label>
        </fieldset>
        <div className="button-row">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              onClick={(e) => {
                const form = e.currentTarget.form!;
                const controls = Array.from(
                  form.querySelectorAll<HTMLInputElement>(
                    `fieldset:not([hidden]) input`,
                  ),
                );
                if (controls.every((c) => c.reportValidity()))
                  setStep(step + 1);
              }}
            >
              Continue
            </Button>
          ) : (
            <Button disabled={busy || !enabled} type="submit">
              {busy ? "Creating workspace…" : "Create Business"}
            </Button>
          )}
        </div>
        {!enabled && (
          <p role="status">
            Business creation is waiting for the approved database migration.
            Your existing workspaces are available.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </form>
    );
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !enabled) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const policy = Object.fromEntries(
        [
          "hourly_paise",
          "daily_paise",
          "regular_minutes",
          "overtime_bps",
          "min_rest_minutes",
          "max_shift_minutes",
          "max_consecutive_days",
        ].map((k) => [k, Number(f.get(k))]),
      );
      const b = businessInput.parse({
        ...businessFields(f),
        size: Number(f.get("size")),
        working_days: value(f, "working_days").split(",").map(Number),
        request_id: requestId,
        policy: {
          ...policy,
          basis: value(f, "basis"),
          timezone: value(f, "timezone"),
        },
      });
      const r = await api<{ organization_id: string }>("/businesses", b);
      await onCreated(r.organization_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Welcome to NYAVERIS AI"
      subtitle="Let's build a fairer workplace together."
    >
      {choice === "create" ? (
        Setup()
      ) : (
        <div className="onboarding-choices">
          <Button onClick={() => setChoice("create")}>
            Create My Business
          </Button>
          <p>For business owners who want to manage their organization.</p>
          <Link className="button button-outline" to="/invite">
            Join My Workplace
          </Link>
          <p>For employees who have received an authorized invitation.</p>
        </div>
      )}
    </AuthFrame>
  );
}
export function InvitationExperience({
  pendingInvitations = [],
  api,
  session,
  onAccepted,
}: {
  api: Api;
  session: Session | null;
  onAccepted: (org: string) => Promise<void>;
  pendingInvitations?: { business_name: string }[];
}) {
  const [token, setToken] = useState(() => {
    const t = new URLSearchParams(location.hash.slice(1)).get("token");
    if (t && /^[a-f0-9]{64}$/.test(t)) {
      sessionStorage.setItem("nyaveris-invitation", t);
      history.replaceState(null, "", "/invite");
      return t;
    }
    return sessionStorage.getItem("nyaveris-invitation") ?? "";
  });
  const [preview, setPreview] = useState<{
      business_name: string;
      department: string;
      job_title: string;
      expires_at: string;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setPreview(null);
    setError("");
    if (!session || !token) return;
    let active = true;
    api<NonNullable<typeof preview>>("/invitations/preview", { token })
      .then((r) => {
        if (active) setPreview(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [api, session, token]);
  return (
    <AuthFrame
      title={
        preview
          ? `You're Invited to Join ${preview.business_name} on NYAVERIS AI`
          : "Join your workplace"
      }
      subtitle="Workplace access starts with a verified invitation."
    >
      {!token ? (
        <>
          <p>
            {pendingInvitations.length > 0 && (
              <span>
                You have pending invitations from{" "}
                {pendingInvitations.map((i) => i.business_name).join(", ")}
                .{" "}
              </span>
            )}
            Open the secure invitation link supplied by your employer. A company
            name or employee ID cannot grant access.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const u = new URL(value(new FormData(e.currentTarget), "link"));
                if (u.origin !== location.origin || u.pathname !== "/invite")
                  throw Error();
                const t = new URLSearchParams(u.hash.slice(1)).get("token");
                if (!t || !/^[a-f0-9]{64}$/.test(t)) throw Error();
                sessionStorage.setItem("nyaveris-invitation", t);
                setToken(t);
              } catch {
                setError(
                  "Enter a valid invitation link from this NYAVERIS AI site.",
                );
              }
            }}
          >
            <Input label="Invitation link" name="link" />
            <Button>Open invitation</Button>
          </form>
        </>
      ) : !session ? (
        <>
          <p>
            Sign in using the email address your employer invited. Your verified
            account must match the invitation.
          </p>
          <Link className="button" to="/signup">
            Sign up
          </Link>{" "}
          <Link to="/login">Sign in or continue with Google</Link>
        </>
      ) : preview ? (
        <>
          <dl>
            <dt>Business</dt>
            <dd>{preview.business_name}</dd>
            <dt>Department</dt>
            <dd>{preview.department || "Not assigned"}</dd>
            <dt>Job role</dt>
            <dd>{preview.job_title || "Employee"}</dd>
            <dt>Invitation expiry</dt>
            <dd>{new Date(preview.expires_at).toLocaleString()}</dd>
          </dl>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api<{ organization_id: string }>(
                  "/invitations/accept",
                  { token },
                );
                sessionStorage.removeItem("nyaveris-invitation");
                await onAccepted(r.organization_id);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Accept Invitation
          </Button>
        </>
      ) : error ? (
        <p>
          Invitation details could not be loaded for this account. Check the
          intended email address and invitation status.
        </p>
      ) : (
        <p role="status">Checking invitation for your verified account…</p>
      )}
      {error && <p role="alert">{error}</p>}
    </AuthFrame>
  );
}
type Employee = ReturnType<typeof employeeInput.parse> & {
  id: string;
  user_id: string | null;
};
type Invitation = {
  id: string;
  employee_id: string;
  email: string;
  status: string;
  expires_at: string;
};
type Records = {
  employee_profiles: Employee[];
  organization_invitations: Invitation[];
  business_settings: Record<string, unknown>[];
  business_events: { id: string; event_type: string; created_at: string }[];
};
export function WorkforceManagement({
  api,
  workspace,
  reload,
  settings = false,
}: {
  api: Api;
  workspace: Workspace;
  reload: () => Promise<void>;
  settings?: boolean;
}) {
  const org = workspace.organizations[0],
    navigate = useNavigate();
  const [records, setRecords] = useState<Records | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Employee | null | undefined>(),
    [selected, setSelected] = useState<Employee | null>(null),
    [link, setLink] = useState("");
  async function load() {
    const r = await api<Records>("/employees?org=" + org.id);
    setRecords(r);
  }
  useEffect(() => {
    let active = true;
    api<Records>("/employees?org=" + org.id)
      .then((r) => {
        if (active) setRecords(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [api, org.id]);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await load();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function invite(employeeId: string) {
    const r = await api<{ link: string; message: string }>("/invitations", {
      organization_id: org.id,
      employee_id: employeeId,
    });
    setLink(r.link);
    setMessage(r.message);
  }
  const cfg = records?.business_settings[0];
  return (
    <section className="saas-workforce">
      <div className="page-title">
        <h1>{settings ? "Business Settings" : "Employees"}</h1>
        <p>{org.name} · Manage only your authorized workforce.</p>
      </div>
      {error && (
        <div role="alert" className="error-banner">
          {error}
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {link && (
        <div className="card">
          <p>
            Share this private, single-use link only with the intended employee.
            Resending rotates the token and invalidates the old link.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              void (
                navigator.clipboard?.writeText(link) ??
                Promise.reject(new Error("Clipboard unavailable"))
              ).then(
                () => setMessage("Invitation link copied."),
                () =>
                  setMessage(
                    "Clipboard unavailable. Select the private link below.",
                  ),
              )
            }
          >
            Copy Invitation Link
          </Button>
          <input readOnly aria-label="Private invitation link" value={link} />
          <Button variant="outline" onClick={() => setLink("")}>
            Hide private link
          </Button>
        </div>
      )}
      {!records ? (
        error ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void run(load)}
          >
            Retry workforce records
          </Button>
        ) : (
          <p role="status">Loading authorized records…</p>
        )
      ) : settings ? (
        <>
          <p>
            Policy changes affect future work. Verified payroll retains its
            saved policy snapshot.
          </p>
          {cfg?.owner_user_id !== workspace.userId ? (
            <p>
              Only the business owner can change business settings and
              administrator access. Delegated administrators can manage
              employees, shifts, payroll and safety.
            </p>
          ) : (
            <>
              <form
                className="card form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run(async () => {
                    const b = settingsInput.parse({
                      ...businessFields(f),
                      size: Number(f.get("size")),
                      working_days: value(f, "working_days")
                        .split(",")
                        .map(Number),
                      departments: value(f, "departments")
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                      work_locations: value(f, "work_locations")
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    });
                    await api("/business-settings", {
                      ...b,
                      organization_id: org.id,
                    });
                    setMessage("Business settings saved.");
                  });
                }}
              >
                <BusinessFields initial={{ ...cfg, name: org.name }} />
                <Input
                  label="Departments (comma separated)"
                  name="departments"
                  required={false}
                  initial={((cfg.departments as string[]) ?? []).join(",")}
                />
                <Input
                  label="Work locations (comma separated)"
                  name="work_locations"
                  required={false}
                  initial={((cfg.work_locations as string[]) ?? []).join(",")}
                />
                <Button disabled={busy}>Save business settings</Button>
              </form>
              <div className="card">
                <h2>Administrator permissions</h2>
                <p>
                  Administrators receive employee, schedule, payroll and safety
                  management permissions. Ownership stays with the original
                  verified owner.
                </p>
                {workspace.organization_members
                  .filter((m) => m.user_id !== workspace.userId)
                  .map((m) => (
                    <div className="saas-person" key={m.user_id}>
                      <span>
                        {m.display_name} · {m.role}
                      </span>
                      <Button
                        variant="outline"
                        disabled={busy || m.active === false}
                        onClick={() => {
                          if (
                            confirm(
                              `Change administrator access for ${m.display_name}?`,
                            )
                          )
                            void run(async () => {
                              await api("/administrator-access", {
                                organization_id: org.id,
                                user_id: m.user_id,
                                admin: m.role !== "admin",
                              });
                            });
                        }}
                      >
                        {m.role === "admin"
                          ? "Remove admin access"
                          : "Grant admin access"}
                      </Button>
                    </div>
                  ))}
              </div>
            </>
          )}
          <a className="button button-outline" href="#business-pay-policy">
            Configure pay and rest policies
          </a>
          <section className="card" id="business-pay-policy">
            <PolicyEditor
              key={org.id + JSON.stringify(workspace.pay_policies[0])}
              policy={workspace.pay_policies[0]}
              language="en"
              busy={busy}
              onSave={(policy, note) =>
                void run(async () => {
                  await api("/policies", {
                    ...policyInput.parse(policy),
                    organization_id: org.id,
                    note,
                  });
                  setMessage("Pay and rest policy saved.");
                })
              }
            />
          </section>
          <div className="card">
            <h2>Business audit history</h2>
            {records.business_events.map((e) => (
              <p key={e.id}>
                {e.event_type.replaceAll("_", " ")} ·{" "}
                {new Date(e.created_at).toLocaleString()}
              </p>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="button-row">
            <Button onClick={() => setEditing(null)}>Add Employee</Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setMessage(
                  "Create the employee profile below, then choose Save and invite. Employees set their own passwords.",
                );
              }}
            >
              Invite Employee
            </Button>
          </div>
          <label className="field">
            Search by name, email or employee ID
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
            />
          </label>
          <Field label="Employment status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          {editing !== undefined && (
            <form
              className="card form-stack"
              key={editing?.id ?? "new"}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget),
                  send =
                    (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                      "value",
                    ) === "invite";
                void run(async () => {
                  const data = employeeInput.parse({
                    ...Object.fromEntries(
                      [
                        "name",
                        "email",
                        "phone",
                        "employee_code",
                        "department",
                        "job_title",
                        "employment_type",
                        "start_date",
                        "status",
                        "pay_basis",
                        "work_location",
                        "skills",
                      ].map((k) => [k, value(f, k)]),
                    ),
                    rate_paise: Number(f.get("rate_paise")),
                  });
                  if (
                    editing &&
                    editing.status !== data.status &&
                    !confirm(
                      `Change ${data.name}'s access to ${data.status}? Payroll and audit history will be retained.`,
                    )
                  )
                    return;
                  const r = await api<{ employee_id: string }>("/employees", {
                    ...data,
                    organization_id: org.id,
                    ...(editing ? { employee_id: editing.id } : {}),
                  });
                  if (send) await invite(r.employee_id);
                  else
                    setMessage(
                      "Employee profile saved. A profile alone does not grant access.",
                    );
                  setEditing(undefined);
                });
              }}
            >
              <h2>{editing ? "Edit employee" : "Add employee / invitation"}</h2>
              <div className="saas-grid">
                {[
                  ["Employee name", "name"],
                  ["Employee email", "email"],
                  ["Phone (optional)", "phone"],
                  ["Employee ID", "employee_code"],
                  ["Department", "department"],
                  ["Job title", "job_title"],
                  ["Assigned work location", "work_location"],
                  ["Skills (optional)", "skills"],
                ].map(([label, key]) => (
                  <Input
                    key={key}
                    label={label}
                    name={key}
                    type={key === "email" ? "email" : "text"}
                    required={["name", "email", "employee_code"].includes(key)}
                    initial={String(editing?.[key as keyof Employee] ?? "")}
                  />
                ))}
                <Input
                  label="Employment start date"
                  name="start_date"
                  type="date"
                  initial={
                    editing?.start_date ?? new Date().toISOString().slice(0, 10)
                  }
                />
                <Input
                  label="Pay rate (integer paise)"
                  name="rate_paise"
                  type="number"
                  initial={
                    editing?.rate_paise ??
                    (workspace.pay_policies[0].basis === "daily"
                      ? workspace.pay_policies[0].daily_paise
                      : workspace.pay_policies[0].hourly_paise) ??
                    10000
                  }
                />
                <Field label="Pay basis">
                  <select
                    name="pay_basis"
                    defaultValue={
                      editing?.pay_basis ??
                      workspace.pay_policies[0].basis ??
                      "hourly"
                    }
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </Field>
                <Field label="Employment type">
                  <select
                    name="employment_type"
                    defaultValue={editing?.employment_type ?? "full_time"}
                  >
                    <option value="full_time">Full time</option>
                    <option value="part_time">Part time</option>
                    <option value="contract">Contract</option>
                  </select>
                </Field>
                <Field label="Access status">
                  <select
                    name="status"
                    defaultValue={editing?.status ?? "active"}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>
              <p>
                Invitation role: Employee. No password is generated or shared
                with the employer.
              </p>
              <div className="button-row">
                <Button disabled={busy} type="submit">
                  Save employee
                </Button>
                {!editing?.user_id && (
                  <Button disabled={busy} type="submit" value="invite">
                    Save and invite
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(undefined)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
          <div className="card">
            <h2>Workforce directory</h2>
            {!records.employee_profiles.length && (
              <p>
                No employees yet. Invite your first team member to get started.
              </p>
            )}
            {records.employee_profiles
              .filter(
                (e) =>
                  (status === "all" || e.status === status) &&
                  `${e.name} ${e.email} ${e.employee_code}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              )
              .map((e) => (
                <div className="saas-person" key={e.id}>
                  <div>
                    <strong>{e.name}</strong>
                    <p>
                      {e.employee_code} · {e.department || "No department"} ·{" "}
                      {e.status}
                    </p>
                    <small>
                      {e.email} ·{" "}
                      {e.user_id
                        ? "Account linked"
                        : "Invitation acceptance required"}
                    </small>
                  </div>
                  <div className="button-row">
                    <Button variant="outline" onClick={() => setEditing(e)}>
                      Edit
                    </Button>
                    <Button variant="outline" onClick={() => setSelected(e)}>
                      View history
                    </Button>
                    {!e.user_id &&
                      e.status === "active" &&
                      !records.organization_invitations.some(
                        (i) => i.employee_id === e.id && i.status === "pending",
                      ) && (
                        <Button
                          disabled={busy}
                          onClick={() => void run(() => invite(e.id))}
                        >
                          Invite
                        </Button>
                      )}
                    {e.user_id && (
                      <Button
                        variant="outline"
                        onClick={() => navigate("/app/shifts")}
                      >
                        Assign shift
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <div className="card">
            <h2>Invitations</h2>
            {!records.organization_invitations.length && (
              <p>No invitations sent.</p>
            )}
            {records.organization_invitations.map((i) => (
              <div className="saas-person" key={i.id}>
                <span>
                  {i.email} ·{" "}
                  {i.status === "pending" &&
                  Date.parse(i.expires_at) < Date.now()
                    ? "expired"
                    : i.status}
                </span>
                {i.status === "pending" && (
                  <div className="button-row">
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => {
                        if (
                          confirm(
                            "Resend this invitation? The previous link will stop working.",
                          )
                        )
                          void run(async () => {
                            const r = await api<{
                              link: string;
                              message: string;
                            }>("/invitations/resend", {
                              organization_id: org.id,
                              invitation_id: i.id,
                            });
                            setLink(r.link);
                            setMessage(r.message);
                          });
                      }}
                    >
                      Resend / new private link
                    </Button>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => {
                        if (confirm("Revoke this invitation?"))
                          void run(async () => {
                            await api("/invitations/revoke", {
                              organization_id: org.id,
                              invitation_id: i.id,
                            });
                          });
                      }}
                    >
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {selected && (
            <div className="card">
              <h2>{selected.name} · Attendance, payroll and reviews</h2>
              {workspace.shifts
                .filter((s) => s.worker_id === selected.user_id)
                .map((s) => (
                  <div className="saas-person" key={s.id}>
                    <span>
                      {new Date(s.starts_at).toLocaleString()} ·{" "}
                      {s.confirmed ? "Confirmed" : "Unconfirmed"}
                    </span>
                    <span>
                      {workspace.payroll_entries.find(
                        (p) => p.shift_id === s.id,
                      )?.gross_paise ?? "Not recorded"}{" "}
                      paise ·{" "}
                      {
                        workspace.pay_disputes.filter(
                          (d) => d.shift_id === s.id,
                        ).length
                      }{" "}
                      reviews
                    </span>
                  </div>
                ))}
              <h3>Payroll reviews</h3>
              {workspace.pay_disputes
                .filter((d) => d.worker_id === selected.user_id)
                .map((d) => (
                  <p key={d.id}>
                    {d.reason} · {d.status} ·{" "}
                    {new Date(d.created_at).toLocaleString()}
                  </p>
                ))}
              {selected.user_id && (
                <Link to="/app/disputes">
                  Open payroll reviews and ProofLoop history
                </Link>
              )}
              {!selected.user_id && (
                <p>
                  The employee must accept their invitation before shifts can be
                  assigned.
                </p>
              )}
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close history
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
export function BusinessOverview({ workspace }: { workspace: Workspace }) {
  const workers = workspace.organization_members.filter(
      (m) => m.role === "worker",
    ),
    today = new Intl.DateTimeFormat("en-CA", {
      timeZone: workspace.pay_policies[0].timezone,
    }).format(new Date());
  const metrics = [
    ["Total employees", workspace.employee_profiles?.length ?? workers.length],
    [
      "Active employees",
      workspace.employee_profiles?.filter((e) => e.status === "active")
        .length ?? workers.filter((m) => m.active !== false).length,
    ],
    [
      "Today's shifts",
      workspace.shifts.filter(
        (s) =>
          new Intl.DateTimeFormat("en-CA", {
            timeZone: workspace.pay_policies[0].timezone,
          }).format(new Date(s.starts_at)) === today,
      ).length,
    ],
    [
      "Pending payroll reviews",
      workspace.pay_disputes.filter((d) => d.status !== "closed").length,
    ],
    [
      "Potential wage discrepancies",
      workspace.pay.filter((p) => p.hasPayroll && p.discrepancyPaise !== 0)
        .length,
    ],
    [
      "Open safety reports",
      workspace.safety_reports.filter((r) => r.status !== "closed").length,
    ],
    ["RestGuard warnings", workspace.risks.length],
  ];
  return (
    <>
      <div className="page-title">
        <h1>Your workforce, in focus.</h1>
        <p>
          {workers.length
            ? "Authorized workplace records, calculated from your saved data."
            : "Your business is ready. Let's add your team."}
        </p>
      </div>
      <div className="stats-row">
        {metrics.map(([label, count]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Your setup checklist</h2>
        <ul>
          <li>✓ Business Created</li>
          <li>
            {workspace.pay_policies.length ? "✓" : "○"}{" "}
            <Link to="/app/settings#business-pay-policy">
              Configure Pay Policy
            </Link>
          </li>
          <li>
            {(workspace.employee_profiles?.length ?? workers.length)
              ? "✓"
              : "○"}{" "}
            <Link to="/app/employees">Add First Employee</Link>
          </li>
          <li>
            {workspace.shifts.length ? "✓" : "○"}{" "}
            <Link to="/app/shifts">Create First Shift</Link>
          </li>
          <li>
            {workspace.business_events?.some(
              (e) => e.event_type === "workforce_dashboard_reviewed",
            )
              ? "✓"
              : "○"}{" "}
            <Link to="/app/analytics">Review Workforce Dashboard</Link> · review
            your current records
          </li>
        </ul>
      </div>
      <div className="card">
        <h2>Recent activity</h2>
        {workspace.dispute_events
          .slice(-10)
          .reverse()
          .map((e) => (
            <p key={e.id}>
              {e.explanation} · {new Date(e.created_at).toLocaleString()}
            </p>
          ))}
        {!workspace.dispute_events.length && (
          <p>Your first saved shift or payroll action will appear here.</p>
        )}
      </div>
    </>
  );
}
