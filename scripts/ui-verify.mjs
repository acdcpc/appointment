/**
 * Visual + functional verification of the recently reported UI fixes, run in
 * headless Chrome against the deployed site. Produces screenshots under
 * docs/screenshots/ and PASS/FAIL lines. Makes no writes: it never confirms a
 * booking and never signs out.
 */
import puppeteer from "puppeteer-core";
import * as dotenv from "dotenv";
import { mkdirSync } from "node:fs";

dotenv.config();

const BASE = "https://rainbowclinic.pages.dev";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "docs/screenshots";
const results = [];
const check = (name, ok, detail = "") => {
  results.push([name, ok, detail]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Measures contrast of the leaf element whose text matches labelRe, against
// the first non-transparent ancestor background (the effective canvas).
const measure = (labelRe, flags = "") => `(() => {
  const re = new RegExp(${JSON.stringify(labelRe)}, ${JSON.stringify(flags)});
  const leaves = [...document.querySelectorAll("div,span")].filter((d) => d.childElementCount === 0 && re.test((d.textContent || "").trim()));
  const el = leaves[0];
  if (!el) return null;
  const parse = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const fg = parse(getComputedStyle(el).color).slice(0, 3);
  let node = el, bg = null;
  while (node) {
    const c = parse(getComputedStyle(node).backgroundColor);
    if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) { bg = c.slice(0, 3); break; }
    node = node.parentElement;
  }
  if (!bg) return null;
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return { fg, bg, ratio: Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100, text: (el.textContent || "").trim().slice(0, 40) };
})()`;

async function signIn(page) {
  const attempts = [
    ["anilrajojha@pahs.edu.np", process.env.CLINIC_ADMIN_PASSWORD || ""],
    ["thisispratha@gmail.com", process.env.SUPER_ADMIN_PASSWORD || ""],
  ];
  for (const [email, password] of attempts) {
    if (!password) continue;
    await page.goto(`${BASE}/clinician`, { waitUntil: "networkidle2", timeout: 60000 });
    try {
      await page.waitForSelector('input[aria-label="Clinic account email"]', { timeout: 15000 });
    } catch { continue; }
    await page.type('input[aria-label="Clinic account email"]', email, { delay: 15 });
    await page.type('input[aria-label="Clinic account password"]', password, { delay: 15 });
    await page.click('[aria-label="Sign in to the clinic dashboard"]');
    await sleep(4000);
    const signedIn = await page.evaluate(() => !document.querySelector('input[aria-label="Clinic account email"]'));
    if (signedIn) return email;
  }
  return null;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-first-run", "--no-default-browser-check", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);

  // ---------- 1. Staff home in dark mode (the owner's screenshot) ----------
  await page.setViewport({ width: 1280, height: 860 });
  const account = await signIn(page);
  check("clinic staff account signs in", Boolean(account), account ?? "no attempt succeeded");
  if (account) {
    await page.evaluate(() => {
      localStorage.setItem("rainbow-color-scheme", "dark");
      localStorage.setItem("rainbow-language", "en");
    });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    try {
      await page.waitForFunction(() => /Clinic home|क्लिनिक गृहपृष्ठ/.test(document.body.innerText), { timeout: 20000 });
    } catch { /* falls through to the checks below */ }
    await sleep(600);
    await page.screenshot({ path: `${OUT}/2026-09-29-staff-home-dark.png` });
    const heading = await page.evaluate(measure("^(Clinic home|क्लिनिक गृहपृष्ठ)$"));
    check("staff home heading is readable on the dark canvas", Boolean(heading) && heading.ratio >= 4.5, heading ? `ratio ${heading.ratio} (text ${heading.fg.join(",")} on ${heading.bg.join(",")})` : "heading not found");
    if (heading) check("the canvas really is dark", heading.bg[0] < 60 && heading.bg[1] < 60 && heading.bg[2] < 60, heading.bg.join(","));
    const eyebrow = await page.evaluate(measure("^RAINBOW CHILD DEVELOPMENT CLINIC$"));
    check("the eyebrow label is readable", Boolean(eyebrow) && eyebrow.ratio >= 3, eyebrow ? `ratio ${eyebrow.ratio}` : "not found");
    const signout = await page.evaluate(measure("^(Sign out|लग आउट)$"));
    check("the Sign out button text is readable", Boolean(signout) && signout.ratio >= 4.5, signout ? `ratio ${signout.ratio}` : "not found");
  }

  // ---------- 2. Onboarding scroll (the first iPhone report) ----------
  await page.setViewport({ width: 420, height: 880, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle2" });
  await sleep(500);
  const scrollable = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll("div")].filter((d) => d.scrollHeight > d.clientHeight + 40);
    if (!candidates.length) return null;
    const el = candidates.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
    el.scrollTop = el.scrollHeight;
    return { overflow: el.scrollHeight - el.clientHeight };
  });
  await sleep(400);
  const cta = await page.evaluate(() => {
    const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /Get started|सुरु गरौँ/.test(d.textContent || ""));
    if (!leaf) return null;
    const r = leaf.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), viewport: window.innerHeight };
  });
  check("onboarding has a scrollable region", Boolean(scrollable), scrollable ? `${scrollable.overflow}px of overflow` : "none found");
  check("the bottom CTA scrolls fully into view", Boolean(cta) && cta.bottom <= cta.viewport && cta.top >= 0, cta ? `CTA ${cta.top}–${cta.bottom}px in a ${cta.viewport}px viewport` : "CTA not found");
  await page.screenshot({ path: `${OUT}/2026-09-29-onboarding-bottom.png` });

  // ---------- 3. Booking: calendar + A.D./B.S. picker at phone width ----------
  await page.goto(`${BASE}/booking`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => document.body.innerText.includes("Choose an available day"), { timeout: 20000 });
  await sleep(400);
  const monthHeader = await page.evaluate(() => /(January|February|March|April|May|June|July|August|September|October|November|December) 20\d{2}/.test(document.body.innerText));
  check("calendar month header is rendered", monthHeader);
  await page.screenshot({ path: `${OUT}/2026-09-29-booking-calendar.png`, fullPage: false });

  const dayClicked = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('[role="radio"]')].filter((el) => /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test((el.getAttribute("aria-label") || "").trim()) && el.getAttribute("aria-disabled") !== "true");
    if (!cells.length) return false;
    cells[0].click();
    return true;
  });
  check("an open calendar day is selectable", dayClicked);
  await page.waitForFunction(() => document.body.innerText.includes("Choose a time"), { timeout: 15000 });
  const timeClicked = await page.evaluate(() => {
    const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /^\d{1,2}:\d{2} (AM|PM)$/.test((d.textContent || "").trim()));
    if (!leaf) return false;
    (leaf.closest('[tabindex]') || leaf.parentElement || leaf).click();
    return true;
  });
  check("a time slot is selectable", timeClicked);
  await page.waitForFunction(() => /Date of birth/.test(document.body.innerText), { timeout: 15000 });
  await page.evaluate(() => {
    const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /Date of birth \(optional\)/.test(d.textContent || ""));
    leaf?.scrollIntoView({ block: "center" });
  });
  await sleep(400);
  await page.screenshot({ path: `${OUT}/2026-09-29-booking-dob.png` });

  const pickChip = (pattern) => page.evaluate((src) => {
    const re = new RegExp(src);
    const el = [...document.querySelectorAll('[role="radio"]')].find((e) => re.test(e.getAttribute("aria-label") || "") && e.getAttribute("aria-disabled") !== "true");
    if (!el) return false;
    el.click();
    return true;
  }, pattern);

  // A.D. path
  check("year chip selectable", await pickChip("^(Year|वर्ष) 20\\d{2}$"));
  check("month chip selectable", await pickChip("^(Month|महिना) [A-Z][a-z]{2}$"));
  check("day chip selectable", await pickChip("^(Day|दिन) \\d{1,2}$"));
  await sleep(500);
  const adFilled = await page.evaluate(() => {
    const years = document.querySelector('input[aria-label="Child age in years"]');
    const months = document.querySelector('input[aria-label="Child age in months"]');
    return { years: years?.value ?? "", months: months?.value ?? "" };
  });
  check("picking a date fills the age automatically", /^\d+$/.test(adFilled.years) && /^\d+$/.test(adFilled.months), `${adFilled.years} y ${adFilled.months} m`);

  // B.S. path (switch calendar resets the pickers — pick again)
  check("Bikram Sambat mode selectable", await pickChip("^(Nepali date \\(B\\.S\\.\\)|नेपाली मिति)"));
  check("B.S. year chip selectable", await pickChip("^(Year|वर्ष) 20\\d{2}$"));
  check("B.S. month chip selectable", await pickChip("^(Month|महिना) Baisakh$"));
  check("B.S. day chip selectable", await pickChip("^(Day|दिन) \\d{1,2}$"));
  await sleep(500);
  const bsPreview = await page.evaluate(() => {
    const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /\(A\.D\.\)|\(ई\.सं\.\)/.test(d.textContent || "") && /\(B\.S\.\)|\(वि\.सं\.\)/.test(d.textContent || ""));
    return leaf ? leaf.textContent.trim() : null;
  });
  check("the picker previews both calendars", Boolean(bsPreview), bsPreview ? bsPreview.slice(0, 110) : "preview not found");
  await page.screenshot({ path: `${OUT}/2026-09-29-booking-dob-bs.png` });

  await browser.close();

  const failed = results.filter(([, ok]) => !ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error("ui-verify crashed:", error.message);
  process.exit(1);
});
