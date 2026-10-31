import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/locales";

type Messages = { [key: string]: string | Messages };

const load = (locale: string): Messages =>
  JSON.parse(readFileSync(new URL(`../../../src/messages/${locale}.json`, import.meta.url), "utf8"));

function flatten(messages: Messages, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(messages).flatMap(([key, value]) =>
      typeof value === "string" ? [[`${prefix}${key}`, value]] : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );
}

/** ICU placeholders like {name} or {count, plural, …} — the variable names only. */
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort();

const english = flatten(load("en"));

describe("translations", () => {
  it.each(locales.filter((l) => l !== "en"))("%s has exactly the English keys", (locale) => {
    expect(Object.keys(flatten(load(locale))).sort()).toEqual(Object.keys(english).sort());
  });

  it.each(locales.filter((l) => l !== "en"))("%s keeps every placeholder and leaves nothing empty", (locale) => {
    const messages = flatten(load(locale));
    for (const [key, text] of Object.entries(english)) {
      if (text.trim()) expect(messages[key]?.trim(), key).toBeTruthy();
      expect([...new Set(placeholders(messages[key]))], key).toEqual([...new Set(placeholders(text))]);
    }
  });
});
