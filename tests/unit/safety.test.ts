import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "../../src");

const ALLOW_GIG_TERM_IN = new Set([
  // SAFETY documentation and platform-label enums are allowed to name platforms.
  path.resolve(SRC, "lib/types/db.ts"),
]);

const FORBIDDEN_PATTERNS: Array<{ name: string; rx: RegExp; allowFiles?: Set<string> }> = [
  { name: "Amazon Flex API host", rx: /flex\.amazon\.[a-z.]+/i },
  { name: "Amazon hostname in network call", rx: /https?:\/\/[a-z0-9.-]*amazon\.[a-z.]+/i },
  { name: "Uber API host", rx: /https?:\/\/[a-z0-9.-]*uber\.com/i },
  { name: "DoorDash API host", rx: /https?:\/\/[a-z0-9.-]*doordash\.com/i },
  { name: "Instacart API host", rx: /https?:\/\/[a-z0-9.-]*instacart\.com/i },
  { name: "Puppeteer import", rx: /from\s+["']puppeteer["']/ },
  { name: "Playwright in src", rx: /from\s+["']playwright["']/ },
  { name: "Selenium import", rx: /from\s+["']selenium-webdriver["']/ },
  { name: "Headless Chrome flag", rx: /headlessBrowser|chromium\.launch\(/i },
  { name: "Browser automation token", rx: /\bautoGrab|autoClick|autoAccept\b/ },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("SAFETY contract", () => {
  const files = walk(SRC);

  it("source tree is non-empty", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const pattern of FORBIDDEN_PATTERNS) {
    it(`contains no ${pattern.name}`, () => {
      const hits: Array<{ file: string; match: string }> = [];
      for (const file of files) {
        if (ALLOW_GIG_TERM_IN.has(file)) continue;
        const text = readFileSync(file, "utf8");
        const m = text.match(pattern.rx);
        if (m) hits.push({ file: path.relative(SRC, file), match: m[0] });
      }
      expect(hits, JSON.stringify(hits, null, 2)).toEqual([]);
    });
  }

  it("notification dispatcher only calls onesignal.com (no gig hosts)", () => {
    const dispatcher = readFileSync(
      path.resolve(SRC, "app/api/notifications/dispatch/route.ts"),
      "utf8"
    );
    const urls = dispatcher.match(/https?:\/\/[^\s"'`]+/g) ?? [];
    for (const url of urls) {
      expect(url, `dispatcher must not call ${url}`).toMatch(
        /^https?:\/\/(api\.)?onesignal\.com/
      );
    }
  });

  it("service worker never references gig-platform hosts", () => {
    const sw = readFileSync(path.resolve(SRC, "../public/sw.js"), "utf8");
    expect(sw).not.toMatch(/amazon|uber|doordash|instacart/i);
  });
});
