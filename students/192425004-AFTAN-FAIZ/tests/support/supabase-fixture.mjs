// Test-only Supabase adapter. Real PostgreSQL SQL/RLS, synthetic Auth service.
// Never imported by application code. No network or hosted credentials are used.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createHmac,
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
  scryptSync,
} from "node:crypto";
export async function createFixture(root, origin) {
  const { PGlite } = await import(
    pathToFileURL(
      resolve(
        root,
        ".local/saas-db/node_modules/@electric-sql/pglite/dist/index.js",
      ),
    ).href
  );
  const db = new PGlite(),
    users = new Map(),
    codes = new Map(),
    mail = new Map(),
    refresh = new Map(),
    revoked = new Set(),
    jwtKey = randomBytes(32);
  const password = "isolated synthetic passphrase 2026";
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create schema extensions;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const file of readdirSync(resolve(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(
      readFileSync(resolve(root, "supabase/migrations", file), "utf8").replace(
        /create extension if not exists pgcrypto with schema extensions;/i,
        "",
      ),
    );
  await db.exec("reset statement_timeout;reset lock_timeout");
  const hash = (v) =>
    scryptSync(v, "isolated-fixture-only", 32).toString("hex");
  async function addUser(
    email,
    id = randomUUID(),
    confirmed = true,
    pass = password,
    metadata = {},
  ) {
    if (users.has(email)) return users.get(email);
    const user = {
      id,
      email,
      email_confirmed_at: confirmed ? new Date().toISOString() : null,
      aud: "authenticated",
      role: "authenticated",
      user_metadata: metadata,
      created_at: new Date().toISOString(),
    };
    await db.query("insert into auth.users values($1,$2,$3)", [
      id,
      email,
      user.email_confirmed_at,
    ]);
    users.set(email, { user, passwordHash: hash(pass) });
    return users.get(email);
  }
  for (const [i, name] of [
    "construction.worker",
    "construction.admin",
    "healthcare.worker",
    "healthcare.admin",
    "safety.gateway",
  ].entries())
    await addUser(
      name + "@demo.fairshift.example",
      "20000000-0000-4000-8000-" + String(i + 1).padStart(12, "0"),
    );
  await db.exec(readFileSync(resolve(root, "supabase/seed.sql"), "utf8"));
  await db.exec(
    "insert into private.gateway_accounts values('20000000-0000-4000-8000-000000000005')",
  );
  function issue(user) {
    const head = Buffer.from(
        JSON.stringify({ alg: "HS256", typ: "JWT" }),
      ).toString("base64url"),
      payload = Buffer.from(
        JSON.stringify({
          sub: user.id,
          exp: Math.floor(Date.now() / 1000) + 3600,
          email: user.email,
          role: "authenticated",
        }),
      ).toString("base64url"),
      message = head + "." + payload;
    const access_token =
        message +
        "." +
        createHmac("sha256", jwtKey).update(message).digest("base64url"),
      refresh_token = randomBytes(32).toString("hex");
    refresh.set(refresh_token, user.id);
    return {
      access_token,
      refresh_token,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user,
    };
  }
  function identity(token) {
    try {
      if (revoked.has(token)) return null;
      const parts = token.split("."),
        expected = createHmac("sha256", jwtKey)
          .update(parts[0] + "." + parts[1])
          .digest(),
        actual = Buffer.from(parts[2], "base64url");
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        return null;
      const p = JSON.parse(Buffer.from(parts[1], "base64url"));
      return p.exp > Date.now() / 1000
        ? [...users.values()].find((u) => u.user.id === p.sub)?.user
        : null;
    } catch {
      return null;
    }
  }
  async function scoped(token, sql, args = []) {
    const u = identity(token);
    return db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
        u?.id ?? "",
      ]);
      await tx.exec("set local role " + (u ? "authenticated" : "anon"));
      return tx.query(sql, args);
    });
  }
  const ident = (s) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Error("Invalid identifier");
    return '"' + s + '"';
  };
  const failure = (e) => ({
    data: null,
    error: {
      code: e.code ?? "TEST_ADAPTER",
      message: "Isolated database operation rejected",
    },
  });
  function client(token) {
    return {
      auth: {
        getUser: async (t) => ({
          data: { user: identity(t ?? token) },
          error: identity(t ?? token)
            ? null
            : { message: "Invalid synthetic identity" },
        }),
        signInWithPassword: async ({ email, password: p }) => {
          const entry = users.get(email);
          return entry &&
            entry.passwordHash === hash(p) &&
            entry.user.email_confirmed_at
            ? {
                data: issue(entry.user),
                error: null,
                ...{ data: { user: entry.user, session: issue(entry.user) } },
              }
            : {
                data: { user: null, session: null },
                error: { message: "Invalid synthetic login" },
              };
        },
      },
      rpc: async (name, params) => {
        try {
          const entries = Object.entries(params);
          const call = entries
            .map(([k], i) => ident(k) + " => $" + (i + 1))
            .join(",");
          const r = await scoped(
            token,
            `select public.${ident(name)}(${call}) as result`,
            entries.map(([, v]) => v),
          );
          return { data: r.rows[0].result, error: null };
        } catch (e) {
          return failure(e);
        }
      },
      from: (name) => {
        const filters = [],
          orders = [];
        let columns = "*",
          offset = 0,
          limit = 500,
          one = false,
          optional = false;
        const q = {
          select: (c) => {
            columns = c;
            return q;
          },
          eq: (key, v) => {
            filters.push([key, v]);
            return q;
          },
          limit: (n) => {
            limit = n;
            return q;
          },
          range: (a, b) => {
            offset = a;
            limit = b - a + 1;
            return q;
          },
          order: (key) => {
            orders.push(key);
            return q;
          },
          single: () => {
            one = true;
            return q;
          },
          maybeSingle: () => {
            one = true;
            optional = true;
            return q;
          },
          then: (resolve, reject) => {
            const run = async () => {
              try {
                const cols =
                    columns === "*"
                      ? "*"
                      : columns.split(",").map(ident).join(","),
                  where = filters.length
                    ? " where " +
                      filters
                        .map(([k], i) => ident(k) + "=$" + (i + 1))
                        .join(" and ")
                    : "",
                  order = orders.length
                    ? " order by " + orders.map(ident).join(",")
                    : "";
                const result = await scoped(
                  token,
                  `select ${cols} from public.${ident(name)}${where}${order} limit ${Number(limit)} offset ${Number(offset)}`,
                  filters.map(([, v]) => v),
                );
                if (
                  one &&
                  (result.rows.length > 1 ||
                    (!optional && result.rows.length === 0))
                )
                  return { data: null, error: { code: "PGRST116" } };
                const rows = JSON.parse(JSON.stringify(result.rows));
                // PostgREST returns SQL DATE as YYYY-MM-DD, not a timestamp.
                for (const field of result.fields ?? [])
                  if (field.dataTypeID === 1082)
                    for (const row of rows)
                      if (row[field.name])
                        row[field.name] = row[field.name].slice(0, 10);
                return { data: one ? (rows[0] ?? null) : rows, error: null };
              } catch (e) {
                return failure(e);
              }
            };
            return run().then(resolve, reject);
          },
        };
        return q;
      },
    };
  }
  function challenge(email, body, redirect) {
    const code = randomBytes(24).toString("hex");
    if (!String(redirect).startsWith(origin + "/auth/callback"))
      throw Error("Untrusted fixture redirect");
    codes.set(code, {
      email,
      challenge: body.code_challenge,
      expires: Date.now() + 300000,
    });
    const link = new URL(redirect);
    link.searchParams.set("code", code);
    mail.set(email, link.href);
  }
  function authRoutes(app, key) {
    app.post("/auth/v1/signup", async (req, res) => {
      const b = req.body;
      if (!b.email?.endsWith("@example.test"))
        return res.status(400).json({ msg: "Synthetic test email required" });
      const e = await addUser(b.email, undefined, false, b.password, b.data);
      challenge(b.email, b, req.query.redirect_to ?? origin + "/auth/callback");
      res.json(e.user);
    });
    app.post("/auth/v1/token", async (req, res) => {
      const b = req.body;
      let user;
      if (req.query.grant_type === "password") {
        const e = users.get(b.email);
        if (
          e &&
          e.passwordHash === hash(b.password) &&
          e.user.email_confirmed_at
        )
          user = e.user;
      } else if (req.query.grant_type === "pkce") {
        const c = codes.get(b.auth_code);
        if (
          c &&
          c.expires > Date.now() &&
          createHash("sha256").update(b.code_verifier).digest("base64url") ===
            c.challenge
        ) {
          codes.delete(b.auth_code);
          const e = users.get(c.email);
          e.user.email_confirmed_at = new Date().toISOString();
          await db.query(
            "update auth.users set email_confirmed_at=now() where id=$1",
            [e.user.id],
          );
          user = e.user;
        }
      } else if (req.query.grant_type === "refresh_token")
        user = [...users.values()].find(
          (e) => e.user.id === refresh.get(b.refresh_token),
        )?.user;
      if (!user)
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "Synthetic credentials or verification invalid",
        });
      res.json(issue(user));
    });
    app.all("/auth/v1/user", (req, res) => {
      const user = identity(req.headers.authorization?.slice(7));
      if (!user) return res.status(401).json({ msg: "Invalid session" });
      if (req.method === "PUT" && req.body.password)
        users.get(user.email).passwordHash = hash(req.body.password);
      res.json(user);
    });
    app.post("/auth/v1/logout", (req, res) => {
      revoked.add(req.headers.authorization?.slice(7));
      res.json({});
    });
    for (const route of ["recover", "resend"])
      app.post("/auth/v1/" + route, (req, res) => {
        if (users.has(req.body.email))
          challenge(
            req.body.email,
            req.body,
            req.query.redirect_to ??
              origin + "/auth/callback?next=/reset-password",
          );
        res.json({});
      });
    app.get("/__qa/mail", (req, res) => {
      if (req.headers["x-qa-key"] !== key) return res.sendStatus(403);
      res.json({ link: mail.get(req.query.email) ?? null });
    });
  }
  return {
    db,
    client,
    authRoutes,
    password,
    gateway: () =>
      client(
        issue(users.get("safety.gateway@demo.fairshift.example").user)
          .access_token,
      ),
    close: () => db.close(),
  };
}
