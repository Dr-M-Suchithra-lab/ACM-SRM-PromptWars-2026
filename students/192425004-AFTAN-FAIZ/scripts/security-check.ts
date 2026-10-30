import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { parse } from "dotenv";
import assert from "node:assert/strict";

// Submission-scoped: does not scan other students or enforce repository-wide branch rules.
const root = process.cwd();
assert.ok(existsSync(resolve(root, "prompts.md")), "Run from the submission folder");
const excluded = new Set(["node_modules", ".local", "dist", "dist-server", "test-results", "playwright-report", ".git"]);
function walk(folder: string, skipGenerated: boolean): string[] {
  return readdirSync(folder).flatMap(name => {
    const path = resolve(folder, name);
    if (statSync(path).isDirectory()) return skipGenerated && excluded.has(name) ? [] : walk(path, skipGenerated);
    return [path];
  });
}
const values = { ...process.env, ...(process.env.SUBMISSION_ENV_FILE ? parse(readFileSync(process.env.SUBMISSION_ENV_FILE)) : {}) };
const secrets = Object.entries(values).filter(([key, value]) => /PASSWORD|SECRET|TOKEN|API_KEY|DATABASE_URL|DB_URL/.test(key) && value && value.length > 10).map(([, value]) => value!);
const patterns = [
  /AIza[0-9A-Za-z_-]{30,}/,
  /sb_secret_[0-9A-Za-z_-]{16,}/,
  /gh[pousr]_[0-9A-Za-z]{20,}/,
  /github_pat_[0-9A-Za-z_]{20,}/,
  /sk-(?:proj-)?[0-9A-Za-z_-]{30,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /postgres(?:ql)?:\/\/[^\s:'"]+:[^\s@'"]+@/,
  /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/,
];
const files = walk(root, true);
let bytes = 0;
for (const file of files) {
  const name = relative(root, file).replaceAll("\\", "/");
  assert.ok(!/(^|\/)\.env(?:\.|$)/.test(name) || name === ".env.example", `Private environment file: ${name}`);
  const buffer = readFileSync(file); bytes += buffer.length;
  const text = buffer.toString("utf8");
  for (const secret of secrets) assert.ok(!text.includes(secret), `Configured secret detected in ${name}`);
  for (const pattern of patterns) assert.ok(!pattern.test(text), `Credential signature detected in ${name}`);
}
let browserAssets = 0;
if (existsSync(resolve(root, "dist"))) {
  for (const file of walk(resolve(root, "dist"), false)) {
    const text = readFileSync(file, "utf8"); browserAssets++;
    for (const secret of secrets) assert.ok(!text.includes(secret), "Configured secret detected in browser build");
    for (const pattern of patterns) assert.ok(!pattern.test(text), "Credential signature detected in browser build");
  }
}
console.log(JSON.stringify({ status: "passed", filesScanned: files.length, sourceAndScreenshotBytes: bytes,
  configuredSecretValuesAbsent: true, credentialSignaturesAbsent: true, browserAssetsScanned: browserAssets,
  scope: "submission folder only", limitations: "Pattern and known-value scan; screenshot content reviewed separately" }, null, 2));
