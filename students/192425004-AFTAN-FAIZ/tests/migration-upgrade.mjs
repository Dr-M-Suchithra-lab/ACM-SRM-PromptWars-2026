// Isolated upgrade rehearsal only: no environment credentials or network clients.
import { PGlite } from "../.local/saas-db/node_modules/@electric-sql/pglite/dist/index.js";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite();
let assertions = 0;
const check = (value) => {
  assert.ok(value);
  assertions++;
};
const scalar = async (sql) => Object.values((await db.query(sql)).rows[0])[0];
const migrationName = "20261031042154_workforce_saas.sql";
const migration = readFileSync(
  resolve(root, "supabase/migrations", migrationName),
  "utf8",
);
try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema extensions;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  const foundation = readdirSync(resolve(root, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql") && name < "20261028")
    .sort();
  check(foundation.length === 5);
  for (const name of foundation) {
    await db.exec(
      readFileSync(resolve(root, "supabase/migrations", name), "utf8").replace(
        /create extension if not exists pgcrypto with schema extensions;/i,
        "",
      ),
    );
  }
  for (let i = 1; i <= 4; i++)
    await db.query("insert into auth.users values($1,$2,now())", [
      "20000000-0000-4000-8000-00000000000" + i,
      `synthetic-${i}@example.test`,
    ]);
  await db.exec(readFileSync(resolve(root, "supabase/seed.sql"), "utf8"));
  const existing = (
    await db.query(
      "select schemaname,tablename from pg_tables where schemaname in ('public','private','auth') order by 1,2",
    )
  ).rows;
  const snapshot = async () => {
    const result = {};
    for (const { schemaname, tablename } of existing) {
      // Compare every pre-existing row and column, ignoring only the two new columns.
      const where =
        tablename === "sector_configurations"
          ? " where id in ('construction','healthcare')"
          : "";
      result[schemaname + "." + tablename] = await scalar(
        `select coalesce(jsonb_agg(row order by row::text),'[]') from (select to_jsonb(t)-array['active','cancelled_at'] as row from ${schemaname}.${tablename} t${where}) q`,
      );
    }
    return result;
  };
  const before = await snapshot();
  check((await scalar("select count(*)::int from public.organizations")) === 2);
  // Force a failure at the end of the migration; all preceding DDL must roll back.
  let failed = false;
  try {
    await db.exec("begin;" + migration + ";select 1/0;commit;");
  } catch {
    failed = true;
    await db.exec("rollback;");
  }
  check(failed);
  check(await scalar("select to_regclass('public.business_settings') is null"));
  assert.deepEqual(await snapshot(), before);
  assertions++;
  await db.exec("begin;" + migration + ";commit;");
  const after = await snapshot();
  for (const key of Object.keys(before)) {
    assert.deepEqual(after[key], before[key], key + " changed existing data");
    assertions++;
  }
  check(
    await scalar("select bool_and(active) from public.organization_members"),
  );
  check(
    await scalar("select bool_and(cancelled_at is null) from public.shifts"),
  );
  check(
    (await scalar(
      "select count(*)::int from public.sector_configurations where id='generic'",
    )) === 1,
  );
  for (const name of [
    "business_settings",
    "user_profiles",
    "employee_profiles",
    "organization_invitations",
    "business_events",
  ]) {
    check((await scalar(`select count(*)::int from public.${name}`)) === 0);
    check(
      await scalar(
        `select relrowsecurity from pg_class where oid='public.${name}'::regclass`,
      ),
    );
    check(
      !(await scalar(
        `select has_table_privilege('anon','public.${name}','select')`,
      )),
    );
    check(
      !(await scalar(
        `select has_table_privilege('authenticated','public.${name}','insert,update,delete')`,
      )),
    );
  }
  check(
    !(await scalar(
      "select has_function_privilege('anon','public.saas_action(text,uuid,jsonb)','execute')",
    )),
  );
  check(
    await scalar(
      "select has_function_privilege('authenticated','public.saas_action(text,uuid,jsonb)','execute')",
    ),
  );
  check(
    !(await scalar(
      "select prosecdef from pg_proc where oid='public.saas_action(text,uuid,jsonb)'::regprocedure",
    )),
  );
  check(
    !(await scalar(
      "select has_table_privilege('authenticated','private.invitation_credentials','select,insert,update,delete')",
    )),
  );
  console.log(
    JSON.stringify({
      status: "passed",
      assertions,
      foundationMigrations: foundation.length,
      performanceMigrationIncluded: false,
      forcedFailureRolledBack: true,
      existingTablesCompared: existing.length,
      existingRowsPreserved: true,
      hostedRequests: 0,
      migration: migrationName,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({ status: "failed", assertions, message: error.message }),
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
