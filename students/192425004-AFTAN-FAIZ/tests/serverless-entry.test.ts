import { it, expect } from "vitest";
import { buildSync } from "esbuild";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname, relative, basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

it("loads the unbundled Node ESM serverless entry and preserves public/auth boundaries", async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const local = resolve(root, ".local");
  mkdirSync(local, { recursive: true });
  const output = mkdtempSync(join(local, "serverless-entry-"));
  const entries = ["api", "server", "shared"].flatMap((directory) =>
    readdirSync(resolve(root, directory), { recursive: true })
      .map(String)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => resolve(root, directory, file)),
  );
  try {
    // No bundler resolution: emitted imports must work in native Node ESM,
    // just as the Vercel function must before it can serve its first request.
    buildSync({
      entryPoints: entries,
      outbase: root,
      outdir: output,
      bundle: false,
      platform: "node",
      format: "esm",
      target: "node24",
      logLevel: "silent",
    });
    writeFileSync(join(output, "package.json"), '{"type":"module"}');
    const env = { ...process.env };
    for (const key of Object.keys(env))
      if (
        /SUPABASE|PASSWORD|SECRET|TOKEN|API_KEY|GEMINI|RESEND|INVITATION/.test(
          key,
        )
      )
        delete env[key];
    Object.assign(env, {
      NODE_ENV: "production",
      ENABLE_SAAS: "false",
      ENABLE_DEMO: "false",
      GOOGLE_AUTH_ENABLED: "false",
      SUPABASE_URL: "https://synthetic.example.test",
      SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key",
    });
    const entry = pathToFileURL(join(output, "api/[...path].js")).href;
    const appModule = pathToFileURL(join(output, "server/app.js")).href;
    const script = `
      import assert from 'node:assert/strict';
      const nativeFetch = globalThis.fetch;
      globalThis.fetch = (input, options) => {
        assert.equal(new URL(String(input)).hostname, '127.0.0.1', 'No hosted requests allowed');
        return nativeFetch(input, options);
      };
      const { default: entry } = await import(${JSON.stringify(entry)});
      const { createApp } = await import(${JSON.stringify(appModule)});
      const serve = app => new Promise(resolve => {
        const server = app.listen(0, '127.0.0.1', () => resolve(server));
      });
      const server = await serve(entry);
      try {
        const origin = 'http://127.0.0.1:' + server.address().port;
        const health = await fetch(origin + '/api/health');
        assert.equal(health.status, 200);
        assert.equal((await health.json()).status, 'ok');
        const response = await fetch(origin + '/api/config');
        assert.equal(response.status, 200);
        const config = await response.json();
        assert.deepEqual(Object.keys(config).sort(), ['url','publishableKey','demoEnabled','saasEnabled','googleEnabled','aiConfigured'].sort());
        assert.equal(config.saasEnabled, false);
        assert.equal(config.googleEnabled, false);
        assert.equal(config.publishableKey, 'synthetic-public-key');
      } finally { await new Promise(resolve => server.close(resolve)); }
      // The actual auth handler, with only the database throttle substituted
      // so this test cannot create a hosted rate-limit bucket.
      const protectedServer = await serve(createApp({ rateGuard: async () => ({ allowed: true, retryAfter: 60 }) }));
      try {
        const response = await fetch('http://127.0.0.1:' + protectedServer.address().port + '/api/workspace');
        assert.equal(response.status, 401);
      } finally { await new Promise(resolve => protectedServer.close(resolve)); }
      console.log(JSON.stringify({ health: 200, config: 200, unauthenticatedWorkspace: 401, hostedRequests: 0 }));
    `;
    const result = await promisify(execFile)(
      process.execPath,
      ["--input-type=module", "--eval", script],
      {
        cwd: root,
        env,
        timeout: 15000,
      },
    );
    expect(JSON.parse(result.stdout)).toEqual({
      health: 200,
      config: 200,
      unauthenticatedWorkspace: 401,
      hostedRequests: 0,
    });
  } finally {
    if (
      dirname(output) !== local ||
      !basename(output).startsWith("serverless-entry-") ||
      relative(local, output).startsWith("..")
    )
      throw new Error("Refusing cleanup outside the generated test directory");
    rmSync(output, { recursive: true, force: true });
  }
}, 30000);
