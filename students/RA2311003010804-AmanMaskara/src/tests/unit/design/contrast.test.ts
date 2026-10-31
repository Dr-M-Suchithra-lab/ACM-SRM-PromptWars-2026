import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the real design tokens so a palette change can never silently break WCAG AA.
const css = readFileSync(new URL("../../../src/app/globals.css", import.meta.url), "utf8");
const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
const tokens = Object.fromEntries(
  [...rootBlock.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, hex]) => [name, hex]),
);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = "#ffffff";
const AA_TEXT = 4.5;

describe("design tokens meet WCAG AA", () => {
  it.each([
    ["ink", "bg"],
    ["ink", "surface"],
    ["ink-2", "bg"],
    ["ink-2", "surface"],
    ["ink-2", "surface-2"],
    ["primary", "bg"],
    ["primary", "primary-soft"],
    ["primary-strong", "primary-soft"],
    ["ink", "accent"],
    ["danger", "danger-soft"],
    ["success", "success-soft"],
    ["warning-ink", "warning-soft"],
  ])("%s on %s", (fg, bg) => {
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(["primary", "danger", "success", "warning", "info"])("white text on %s", (bg) => {
    expect(contrast(WHITE, tokens[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("parsed every token", () => {
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(18);
  });
});
