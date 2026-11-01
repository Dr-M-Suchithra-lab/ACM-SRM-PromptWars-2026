import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";
import { Field } from "./Field";
import { Button } from "./ui/button";
import { safeAuthNext, passwordIssues } from "../../shared/saas";

export const authStorage = {
  getItem: (key: string) =>
    sessionStorage.getItem(key) ?? localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    const remember = localStorage.getItem("nyaveris-remember") !== "false";
    (remember ? sessionStorage : localStorage).removeItem(key);
    (remember ? localStorage : sessionStorage).setItem(key, value);
  },
  removeItem: (key: string) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  },
};
function Password({
  label = "Password",
  confirm = false,
}: {
  label?: string;
  confirm?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-control">
      <Field label={label}>
        <input
          name={confirm ? "confirm" : "password"}
          type={show ? "text" : "password"}
          autoComplete={confirm ? "new-password" : "current-password"}
          minLength={confirm ? 12 : undefined}
          maxLength={128}
          required
        />
      </Field>
      <button
        type="button"
        aria-label={
          show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
        }
        aria-pressed={show}
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
export function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-experience">
      <aside className="auth-story">
        <Link className="brand" to="/" aria-label="NYAVERIS AI home">
          NYAVERIS AI
        </Link>
        <div>
          <span className="eyebrow">A FAIRER WORKPLACE STARTS HERE</span>
          <h2>
            People first.
            <br />
            Proof at every step.
          </h2>
          <p>Fairness You Can Trace. Trust You Can Prove.</p>
          <div className="auth-orbit" aria-hidden="true">
            <ShieldCheck size={64} />
            <span>Fairness Twin</span>
            <span>ProofLoop</span>
            <span>SafeSignal</span>
          </div>
        </div>
        <small>Your workplace. Your records. Clearer together.</small>
      </aside>
      <section className="auth-panel">
        <Link
          className="auth-mobile-brand"
          to="/"
          aria-label="NYAVERIS AI home"
        >
          NYAVERIS AI
        </Link>
        <div className="auth-card">
          <ShieldCheck className="auth-emblem" />
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
type Props = {
  client: SupabaseClient | null;
  session: Session | null;
  googleEnabled: boolean;
  demo?: ReactNode;
};
export function AuthExperience({
  client,
  session,
  googleEnabled,
  demo,
}: Props) {
  const location = useLocation(),
    navigate = useNavigate();
  const mode = location.pathname;
  const signup = mode === "/signup",
    forgot = mode === "/forgot-password",
    reset = mode === "/reset-password",
    verify = mode === "/verify-email";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [remember, setRemember] = useState(
    () => localStorage.getItem("nyaveris-remember") !== "false",
  );
  const next = sessionStorage.getItem("nyaveris-invitation")
    ? "/invite"
    : "/app/home";
  async function google() {
    if (!client) return;
    setBusy(true);
    setError("");
    try {
      const r = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            window.location.origin +
            "/auth/callback?next=" +
            encodeURIComponent(next),
        },
      });
      if (r.error) throw r.error;
    } catch {
      setError(
        "Google sign-in could not start. Please retry or use email and password.",
      );
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      key={mode}
      title={
        signup
          ? "Create your account"
          : forgot
            ? "Forgot your password?"
            : reset
              ? "Set a new password"
              : verify
                ? "Check your email"
                : "Sign in"
      }
      subtitle={
        signup
          ? "Build a workplace where fairness is part of every day."
          : forgot
            ? "We’ll send instructions if this address can receive a reset email."
            : verify
              ? "Use the verification link to continue to NYAVERIS AI."
              : "Welcome back to a clearer working day."
      }
    >
      {verify ? (
        <>
          <p>
            Check your inbox and spam folder. Verification links expire; request
            a new email below if needed.
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!client || busy) return;
              const email = String(new FormData(e.currentTarget).get("email"));
              setBusy(true);
              try {
                await client.auth.resend({
                  type: "signup",
                  email,
                  options: {
                    emailRedirectTo: window.location.origin + "/auth/callback",
                  },
                });
                setMessage(
                  "If eligible, a verification email has been requested. Check your inbox.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email address">
              <input name="email" type="email" autoComplete="email" required />
            </Field>
            <Button disabled={busy || !client}>
              Request verification email
            </Button>
          </form>
          <Link to="/login">Return to sign in</Link>
        </>
      ) : (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!client || busy) return;
            const f = new FormData(e.currentTarget),
              email = String(f.get("email") ?? ""),
              password = String(f.get("password") ?? "");
            setError("");
            setMessage("");
            if (
              (signup || reset) &&
              (passwordIssues(password) || password !== f.get("confirm"))
            ) {
              setError(passwordIssues(password) || "Passwords must match.");
              return;
            }
            if (signup && !String(f.get("name") ?? "").trim()) {
              setError("Enter your full name.");
              return;
            }
            setBusy(true);
            try {
              if (forgot) {
                await client.auth.resetPasswordForEmail(email, {
                  redirectTo:
                    window.location.origin +
                    "/auth/callback?next=/reset-password",
                });
                setMessage(
                  "If this address is eligible, reset instructions have been requested. Check your inbox.",
                );
              } else if (reset) {
                if (!session)
                  throw new Error(
                    "Open the password reset link from your email first.",
                  );
                const r = await client.auth.updateUser({ password });
                if (r.error) throw r.error;
                await client.auth.signOut({ scope: "local" });
                navigate("/login");
              } else if (signup) {
                const r = await client.auth.signUp({
                  email,
                  password,
                  options: {
                    data: { full_name: String(f.get("name")) },
                    emailRedirectTo:
                      window.location.origin +
                      "/auth/callback?next=" +
                      encodeURIComponent(next),
                  },
                });
                if (r.error)
                  throw new Error(
                    "Account creation could not be completed. Retry later or sign in if you already have an account.",
                  );
                navigate(r.data.session ? next : "/verify-email");
              } else {
                localStorage.setItem("nyaveris-remember", String(remember));
                const r = await client.auth.signInWithPassword({
                  email,
                  password,
                });
                if (r.error)
                  throw new Error(
                    "Unable to sign in with these credentials. Check your details and email verification.",
                  );
                navigate(next);
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {signup && (
            <Field label="Full name">
              <input
                name="name"
                autoComplete="name"
                minLength={1}
                maxLength={100}
                required
              />
            </Field>
          )}
          {!reset && (
            <Field label="Email address">
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
              />
            </Field>
          )}
          {!forgot && <Password />}
          {(signup || reset) && (
            <>
              <small>
                Use at least 12 characters. Choose a unique passphrase you
                haven’t used elsewhere.
              </small>
              <Password label="Confirm password" confirm />
            </>
          )}
          {signup && (
            <label className="check-label">
              <input type="checkbox" required />{" "}
              <span>
                I agree to the <Link to="/terms">Terms</Link> and{" "}
                <Link to="/privacy">Privacy Policy</Link>.
              </span>
            </label>
          )}
          {!signup && !forgot && !reset && (
            <div className="auth-options">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />{" "}
                Remember my session
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          )}
          <Button
            disabled={busy || !client || (reset && !session)}
            type="submit"
          >
            {busy
              ? "Please wait…"
              : signup
                ? "Create account"
                : forgot
                  ? "Send reset instructions"
                  : reset
                    ? "Update password"
                    : "Sign in"}
            <ArrowRight size={16} />
          </Button>
          {reset && !session && (
            <p>
              Open your reset email in this browser to authorize a password
              change.
            </p>
          )}
        </form>
      )}
      {!forgot && !reset && !verify && (
        <>
          <div className="auth-divider">or</div>
          <Button
            variant="outline"
            disabled={busy || !client || !googleEnabled}
            onClick={() => void google()}
          >
            Continue with Google
          </Button>
          {!googleEnabled && (
            <small>
              Google sign-in is awaiting provider configuration. Email sign-in
              is available.
            </small>
          )}
          <p className="auth-switch">
            {signup ? "Already have an account? " : "New to NYAVERIS AI? "}
            <Link to={signup ? "/login" : "/signup"}>
              {signup ? "Sign in" : "Create account"}
            </Link>
          </p>
        </>
      )}
      {!client && (
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload authentication
        </Button>
      )}
      {!client && (
        <p role="status">
          Connecting to the authentication service. If this continues, reload
          the page or contact your administrator.
        </p>
      )}
      {error && (
        <div role="alert" className="error-banner">
          {error}
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {!signup && !forgot && !reset && !verify && demo}
    </AuthFrame>
  );
}
export function AuthCallback({ client }: { client: SupabaseClient | null }) {
  const navigate = useNavigate(),
    [error, setError] = useState("");
  const exchange = useRef<Promise<unknown> | null>(null);
  useEffect(() => {
    if (!client) return;
    let active = true;
    const params = new URLSearchParams(window.location.search),
      code = params.get("code"),
      next = safeAuthNext(params.get("next"));
    if (params.has("error") || !code) {
      setError(
        "This authentication link was cancelled, expired, or is incomplete. Please try again.",
      );
      return;
    }
    if (!exchange.current)
      exchange.current = client.auth.exchangeCodeForSession(code).then((r) => {
        if (r.error) throw r.error;
      });
    exchange.current
      .then(() => {
        if (active) {
          window.history.replaceState(null, "", "/auth/callback");
          navigate(
            sessionStorage.getItem("nyaveris-invitation") &&
              next !== "/reset-password"
              ? "/invite"
              : next,
            { replace: true },
          );
        }
      })
      .catch(() => {
        if (active)
          setError(
            "This link could not be verified. Request a fresh link in the browser where you started.",
          );
      });
    return () => {
      active = false;
    };
  }, [client, navigate]);
  return (
    <AuthFrame
      title="Confirming your identity"
      subtitle="Securely connecting your NYAVERIS AI account."
    >
      {error ? (
        <>
          <p role="alert">{error}</p>
          <Link to="/login">Return to sign in</Link>
        </>
      ) : (
        <p role="status">Please wait…</p>
      )}
    </AuthFrame>
  );
}
export function LegalPage({ privacy = false }: { privacy?: boolean }) {
  return (
    <AuthFrame
      title={privacy ? "Privacy Policy" : "Terms of Use"}
      subtitle="NYAVERIS AI · 31 October 2026"
    >
      <article className="legal-copy">
        {privacy ? (
          <>
            <h2>Information used by the platform</h2>
            <p>
              Account email and authentication are managed by Supabase Auth.
              Businesses provide contact details, employee profiles, shifts and
              payroll records to operate their workplace. Use only information
              necessary for employment administration.
            </p>
            <h2>Access and service providers</h2>
            <p>
              Authorized workplace administrators can access their
              organization’s workforce information. Employees can access their
              own permitted records. Hosting and database processing use Vercel
              and Supabase. Invitation email may use the configured Resend
              service. Saarthi AI explanations may use Google Gemini; anonymous
              safety tracking credentials must never be sent to AI.
            </p>
            <h2>Safety and retention</h2>
            <p>
              Anonymous safety cases use a private tracking credential. Keep it
              secure. Payroll and audit history are retained for accountability;
              deactivating access does not erase history. Contact your workplace
              administrator through the business contact details for access,
              correction and retention requests.
            </p>
          </>
        ) : (
          <>
            <h2>Responsible workplace use</h2>
            <p>
              Provide accurate information, use only organizations you own or
              are authorized to join, and protect your credentials.
              Administrators are responsible for lawful employment policies,
              invited access and the accuracy of payroll records.
            </p>
            <h2>Calculations and human review</h2>
            <p>
              NYAVERIS AI calculates against your saved workplace policies.
              Demonstration policies are examples. Wage discrepancies,
              scheduling alerts and AI explanations require human review and do
              not establish legal compliance.
            </p>
            <h2>Account access</h2>
            <p>
              Workplace access requires a verified account and authorized
              membership. Abuse, unauthorized access and interference with audit
              history are prohibited. Contact your workplace administrator about
              account access or business records.
            </p>
          </>
        )}
        <p>
          <Link to="/signup">Back to create account</Link>
        </p>
      </article>
    </AuthFrame>
  );
}
