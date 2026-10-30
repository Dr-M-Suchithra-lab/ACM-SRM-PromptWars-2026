import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('i18n Message Consistency', () => {
  const languages = ['en', 'hi', 'bn', 'ta', 'pa', 'ur'];
  const messagesDir = path.resolve(__dirname, '../../messages');

  const loadedMessages: Record<string, Record<string, string>> = {};

  for (const lang of languages) {
    const filePath = path.join(messagesDir, `${lang}.json`);
    expect(fs.existsSync(filePath), `Message file for ${lang} must exist`).toBe(true);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    loadedMessages[lang] = content;
  }

  const enKeys = Object.keys(loadedMessages.en).sort();

  it('contains at least 80 translated keys in base language en', () => {
    expect(enKeys.length).toBeGreaterThanOrEqual(80);
  });

  for (const lang of ['hi', 'bn', 'ta', 'pa', 'ur']) {
    it(`verifies that ${lang} has identical keys to en without any missing keys`, () => {
      const currentKeys = Object.keys(loadedMessages[lang]).sort();
      const missingKeys = enKeys.filter((k) => !currentKeys.includes(k));
      const extraKeys = currentKeys.filter((k) => !enKeys.includes(k));

      expect(missingKeys, `Missing keys in ${lang}`).toEqual([]);
      expect(extraKeys, `Unexpected extra keys in ${lang}`).toEqual([]);
      expect(currentKeys.length).toBe(enKeys.length);
    });
  }
});
