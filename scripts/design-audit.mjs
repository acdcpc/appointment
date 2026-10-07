
/**
 * Design audit — runs the design skill's UI completion check against the live
 * site in a real browser. Categories: icons/assets, typography/content,
 * colour/contrast, layout/spacing, multi-viewport responsiveness.
 *
 * Output: docs/audit/design-audit.json + console summary. Read-only.
 */
import puppeteer from "puppeteer-core";
import * as dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
dotenv.config();

const BASE = "https://rainbowclinic.pages.dev";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const auditFn = () => {
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (c) => { const m = (c || "").match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const srgb = (c) => { const p = parse(c); return p && p.length >= 3 ? p.slice(0, 3) : null; };
  const ratio = (fg, bg) => { const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
  // Structural containers use position:absolute;inset:0 (all four insets set) —
  // they are NOT floating overlays. A true overlay anchors with a partial inset
  // (e.g. bottom+right), or is fixed/sticky. Only check a few levels up: the
  // structural shell sits deep in every chain.
  // Overlays: fixed/sticky anywhere, or absolute anchored with real inset
  // values. Structural shells fill the screen with inset 0 (all four resolve to
  // 0px/auto) — those are NOT overlays. RNW resolves absolute positioning to
  // concrete top/left values, so "all four set" alone means nothing.
  const floating = (el) => { let n = el; let depth = 0; while (n && n !== document.body && depth < 8) { const cs = getComputedStyle(n); if (cs.position === "fixed" || cs.position === "sticky") return true; if (cs.position === "absolute") { const vals = [cs.top, cs.left, cs.bottom, cs.right]; const zeroFill = vals.every((v) => v === "auto" || parseFloat(v) === 0); if (!zeroFill) return true; } n = n.parentElement; depth++; } return false; };
  const visRect = (el) => { let r = el.getBoundingClientRect(); let n = el.parentElement; while (n) { const cs = getComputedStyle(n); if (cs.overflowX !== "visible" || cs.overflowY !== "visible") { const nr = n.getBoundingClientRect(); const l = Math.max(r.left, nr.left), rr = Math.min(r.right, nr.right), t = Math.max(r.top, nr.top), b = Math.min(r.bottom, nr.bottom); if (rr - l <= 1 || b - t <= 1) return null; r = { left: l, right: rr, top: t, bottom: b, width: rr - l, height: b - t }; } n = n.parentElement; } return r.width > 3 && r.height > 4 ? r : null; };
  const inViewport = (r) => r.bottom > 0 && r.top < innerHeight;

  const out = { contrast: [], tinyText: [], touchTargets: [], overlaps: [], images: [], emojiLeaves: [], accidentalOverflow: [], scrollers: [], counts: {} };
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2460}-\u{24FF}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}]/u;

  const textLeaves = [];
  for (const el of document.querySelectorAll("div, span")) {
    if (el.childElementCount !== 0) continue;
    const t = (el.textContent || "").trim();
    if (!t) continue;
    if (el.getAttribute("aria-hidden") === "true") continue;
    const r = visRect(el);
    if (!r || !inViewport(r)) continue;
    if (floating(el)) continue;
    const cs = getComputedStyle(el);
    if (Number(cs.opacity) < 0.9) continue;
    textLeaves.push({ el, t, r, cs });
  }

  // contrast + tiny text
  for (const { el, t, r, cs } of textLeaves) {
    const fg = srgb(cs.color);
    let node = el, bg = null;
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) { bg = c.slice(0, 3); break; }
      node = node.parentElement;
    }
    if (fg && bg) {
      const cr = ratio(fg, bg);
      const size = parseFloat(cs.fontSize) || 16;
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const min = large ? 3 : 4.5;
      if (cr < min) out.contrast.push({ text: t.slice(0, 40), ratio: Math.round(cr * 100) / 100, min, size, fg, bg });
    }
    const size = parseFloat(cs.fontSize) || 16;
    if (size < 12) out.tinyText.push({ text: t.slice(0, 40), size });
    if (emojiRe.test(t)) out.emojiLeaves.push({ text: t.slice(0, 40), size });
  }

  // touch targets
  for (const el of document.querySelectorAll('[role="button"], [role="link"], [role="tab"], [role="radio"], [role="checkbox"], a, button, [tabindex="0"]')) {
    const r = visRect(el);
    if (!r || !inViewport(r)) continue;
    if (floating(el)) continue;
    const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 32);
    if (!label) continue;
    if (r.width < 24 || r.height < 24) out.touchTargets.push({ label, w: Math.round(r.width), h: Math.round(r.height), sev: "high" });
    else if (r.width < 44 || r.height < 44) out.touchTargets.push({ label, w: Math.round(r.width), h: Math.round(r.height), sev: "low" });
  }

  // overlaps (visible text pairs)
  for (let i = 0; i < textLeaves.length; i++) {
    for (let j = i + 1; j < textLeaves.length; j++) {
      const a = textLeaves[i], b = textLeaves[j];
      const l = Math.max(a.r.left, b.r.left), rr = Math.min(a.r.right, b.r.right), t = Math.max(a.r.top, b.r.top), bo = Math.min(a.r.bottom, b.r.bottom);
      if (rr - l <= 4 || bo - t <= 4) continue;
      const area = (rr - l) * (bo - t);
      const minArea = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
      if (area > 0.2 * minArea) out.overlaps.push({ a: a.t.slice(0, 30), b: b.t.slice(0, 30) });
    }
  }

  // images
  for (const img of document.querySelectorAll("img")) {
    const r = img.getBoundingClientRect();
    if (r.width < 4) continue;
    if (!img.complete || img.naturalWidth === 0) out.images.push({ src: (img.currentSrc || img.src || "").slice(-60), broken: true });
  }

  // overflow: accidental (non-scroll containers wider than viewport box) + intentional scrollers
  const doc = document.documentElement;
  out.counts.docScrollWidth = doc.scrollWidth;
  out.counts.innerWidth = innerWidth;
  for (const el of document.querySelectorAll("div")) {
    if (el.clientWidth === 0) continue;
    if (el.scrollWidth > el.clientWidth + 2) {
      const cs = getComputedStyle(el);
      const scrollable = /(auto|scroll)/.test(cs.overflowX);
      if (scrollable) { if (out.scrollers.length < 12) out.scrollers.push({ w: el.clientWidth, sw: el.scrollWidth, sample: (el.textContent || "").trim().slice(0, 30) }); }
      else if (cs.overflowX === "visible") { if (out.accidentalOverflow.length < 12) out.accidentalOverflow.push({ w: el.clientWidth, sw: el.scrollWidth, sample: (el.textContent || "").trim().slice(0, 40) }); }
    }
  }
  return out;
};

async function runPage(page, cfg, width) {
  await page.setViewport({ width, height: cfg.mobile ? 880 : 860, isMobile: Boolean(cfg.mobile), hasTouch: Boolean(cfg.mobile) });
  await page.goto(`${BASE}${cfg.url}`, { waitUntil: "networkidle2" });
  if (cfg.reachConfirm) {
    await page.waitForFunction(() => /Choose an available day/.test(document.body.innerText)).catch(() => {});
    await page.evaluate(() => { const cell = [...document.querySelectorAll('[role="radio"]')].find((el) => /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test((el.getAttribute("aria-label") || "").trim()) && el.getAttribute("aria-disabled") !== "true"); cell?.click(); });
    await page.waitForFunction(() => /Choose a time/.test(document.body.innerText)).catch(() => {});
    await page.evaluate(() => { const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /^\d{1,2}:\d{2} (AM|PM)$/.test((d.textContent || "").trim())); (leaf?.closest("[tabindex]") || leaf?.parentElement || leaf)?.click(); });
    await page.waitForFunction(() => /Date of birth/.test(document.body.innerText)).catch(() => {});
  }
  if (cfg.waitForText) await page.waitForFunction((t) => document.body.innerText.includes(t), {}, cfg.waitForText).catch(() => {});
  await sleep(600);
  // scan at top + a couple of scroll stops for coverage
  const merged = { contrast: [], tinyText: [], touchTargets: [], overlaps: [], images: [], emojiLeaves: [], accidentalOverflow: [], scrollers: [], counts: {} };
  const stops = [0, 0.5, 1];
  for (const stop of stops) {
    await page.evaluate((f) => {
      const scrollers = [...document.querySelectorAll("div")].filter((d) => d.scrollHeight > d.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(d).overflowY));
      const el = scrollers.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
      if (el) el.scrollTop = f * (el.scrollHeight - el.clientHeight);
    }, stop);
    await sleep(200);
    const res = await page.evaluate(auditFn);
    for (const key of ["contrast", "tinyText", "touchTargets", "overlaps", "images", "accidentalOverflow"]) {
      for (const item of res[key]) { const sig = JSON.stringify(item); if (!merged[key].some((x) => JSON.stringify(x) === sig)) merged[key].push(item); }
    }
    if (!merged.counts.docScrollWidth || res.counts.docScrollWidth > merged.counts.docScrollWidth) { merged.counts = res.counts; merged.scrollers = res.scrollers; merged.emojiLeaves = res.emojiLeaves; }
  }
  return merged;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-first-run", "--hide-scrollbars"] });
const page = await browser.newPage();
page.setDefaultTimeout(45000);
mkdirSync("docs/audit", { recursive: true });
const report = {};

async function signIn() {
  await page.setViewport({ width: 1280, height: 860 });
  await page.goto(`${BASE}/clinician`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[aria-label="Clinic account email"]');
  await page.type('input[aria-label="Clinic account email"]', "anilrajojha@pahs.edu.np", { delay: 8 });
  await page.type('input[aria-label="Clinic account password"]', process.env.CLINIC_ADMIN_PASSWORD || "", { delay: 8 });
  await page.click('[aria-label="Sign in to the clinic dashboard"]');
  await sleep(3500);
}

// Staff pages
await signIn();
for (const cfg of [
  { name: "staff-home", url: "/", staff: true, widths: [420, 768, 1280] },
  { name: "clinician", url: "/clinician", staff: true, widths: [420, 1280] },
  { name: "settings", url: "/settings", staff: true, widths: [420, 1280] },
  { name: "growth", url: "/growth", staff: true, widths: [420, 1280] },
  { name: "profile", url: "/profile", staff: true, widths: [420, 1280] },
]) {
  report[cfg.name] = {};
  for (const w of cfg.widths) {
    await page.evaluate(() => localStorage.setItem("rainbow-color-scheme", "dark"));
    report[cfg.name][w] = await runPage(page, cfg, w);
    if (w === 1280 || (cfg.widths.includes(420) && w === 420)) await page.screenshot({ path: `docs/audit/${cfg.name}-${w}.png` });
  }
}
await page.evaluate(() => localStorage.setItem("rainbow-color-scheme", "light"));

// Guest pages
await page.evaluate(() => localStorage.clear());
for (const cfg of [
  { name: "home-guest", url: "/", widths: [360, 420, 768, 1280], mobile: true },
  { name: "onboarding", url: "/onboarding", widths: [360, 420], mobile: true },
  { name: "parent-auth", url: "/parent-auth", widths: [360, 420], mobile: true },
  { name: "about", url: "/about", widths: [420], mobile: true },
  { name: "booking", url: "/booking", widths: [360, 420, 768], mobile: true, reachConfirm: true },
]) {
  report[cfg.name] = {};
  for (const w of cfg.widths) {
    report[cfg.name][w] = await runPage(page, cfg, w);
    if (w === cfg.widths[0] || w === 420) await page.screenshot({ path: `docs/audit/${cfg.name}-${w}.png` });
  }
}

await browser.close();
writeFileSync("docs/audit/design-audit.json", JSON.stringify(report, null, 1));

// console summary
let totals = { contrast: 0, tinyText: 0, touchTargets: 0, overlaps: 0, images: 0, accidentalOverflow: 0 };
for (const [name, widths] of Object.entries(report)) {
  for (const [w, res] of Object.entries(widths)) {
    const issues = [];
    if (res.counts.docScrollWidth > res.counts.innerWidth + 1) issues.push(`h-scroll(${res.counts.docScrollWidth}>${res.counts.innerWidth})`);
    for (const k of Object.keys(totals)) { totals[k] += res[k].length; if (res[k].length) issues.push(`${k}:${res[k].length}`); }
    if (issues.length) console.log(`${name}@${w}: ${issues.join(" ")}`);
  }
}
console.log("\nTOTALS:", JSON.stringify(totals));
process.exit(0);
