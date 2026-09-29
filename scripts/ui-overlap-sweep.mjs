
/**
 * Layout overlap sweep: walks each main screen in a real browser and flags any
 * two text elements whose VISIBLE rectangles intersect (clipped ancestors
 * respected). Floating badges are reported separately, not failed.
 */
import puppeteer from "puppeteer-core";
import * as dotenv from "dotenv";
dotenv.config();
const BASE = "https://rainbowclinic.pages.dev";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (n, ok, d = "") => { results.push([n, ok, d]); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-first-run", "--hide-scrollbars"] });
const page = await browser.newPage();
page.setDefaultTimeout(45000);

const overlayFn = () => {
  const intersect = (a, b) => {
    const l = Math.max(a.left, b.left), r = Math.min(a.right, b.right), t = Math.max(a.top, b.top), bo = Math.min(a.bottom, b.bottom);
    return r - l > 4 && bo - t > 4 ? { l, r, t, bo, area: (r - l) * (bo - t) } : null;
  };
  const floating = (el) => {
    let n = el;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      if (cs.position === "fixed" || cs.position === "sticky") return true;
      if (cs.position === "absolute" && (cs.top !== "auto" || cs.bottom !== "auto" || cs.left !== "auto" || cs.right !== "auto")) return true;
      n = n.parentElement;
    }
    return false;
  };
  const visibleRect = (el) => {
    let r = el.getBoundingClientRect();
    let n = el.parentElement;
    while (n) {
      const cs = getComputedStyle(n);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        const nr = n.getBoundingClientRect();
        const l = Math.max(r.left, nr.left), rr = Math.min(r.right, nr.right), t = Math.max(r.top, nr.top), b = Math.min(r.bottom, nr.bottom);
        if (rr - l <= 1 || b - t <= 1) return null;
        r = { left: l, right: rr, top: t, bottom: b, width: rr - l, height: b - t };
      }
      n = n.parentElement;
    }
    return r.width > 3 && r.height > 4 ? r : null;
  };
  const leaves = [];
  for (const el of document.querySelectorAll("div, span")) {
    if (el.childElementCount !== 0) continue;
    const t = (el.textContent || "").trim();
    if (t.length < 2 || t.length > 80) continue;
    if (el.getAttribute("aria-hidden") === "true") continue;
    const r = visibleRect(el);
    if (!r) continue;
    leaves.push({ t: t.slice(0, 40), el, r, float: floating(el) });
  }
  const pairs = [];
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      const x = intersect(a.r, b.r);
      if (!x) continue;
      const minArea = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
      if (x.area < 0.2 * minArea) continue;
      pairs.push({ a: a.t, b: b.t, floating: a.float || b.float, area: Math.round(x.area) });
    }
  }
  return pairs;
};

async function sweep(name, opts) {
  await page.setViewport({ width: opts.width, height: opts.height, isMobile: Boolean(opts.mobile), hasTouch: Boolean(opts.mobile) });
  await page.goto(`${BASE}${opts.url}`, { waitUntil: "networkidle2" });
  if (opts.reachConfirm) {
    await page.waitForFunction(() => /Choose an available day/.test(document.body.innerText));
    await page.evaluate(() => {
      const cell = [...document.querySelectorAll('[role="radio"]')].find((el) => /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test((el.getAttribute("aria-label") || "").trim()) && el.getAttribute("aria-disabled") !== "true");
      cell?.click();
    });
    await page.waitForFunction(() => /Choose a time/.test(document.body.innerText));
    await page.evaluate(() => {
      const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /^\d{1,2}:\d{2} (AM|PM)$/.test((d.textContent || "").trim()));
      (leaf?.closest("[tabindex]") || leaf?.parentElement || leaf)?.click();
    });
    await page.waitForFunction(() => /Date of birth/.test(document.body.innerText));
  }
  if (opts.waitForText) await page.waitForFunction((t) => document.body.innerText.includes(t), {}, opts.waitForText).catch(() => {});
  await sleep(500);

  const seen = new Set();
  const all = [];
  for (let step = 0; step < 22; step++) {
    const state = await page.evaluate((scrollTop) => {
      const scrollers = [...document.querySelectorAll("div")].filter((d) => d.scrollHeight > d.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(d).overflowY));
      const el = scrollers.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
      if (el) el.scrollTop = scrollTop;
      return el ? { max: el.scrollHeight - el.clientHeight, at: el.scrollTop } : { max: 0, at: 0 };
    }, step * 520);
    await sleep(140);
    const pairs = await page.evaluate(overlayFn);
    for (const p of pairs) {
      const key = `${p.a}|${p.b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(p);
    }
    if (state.max <= state.at + 10) break;
  }
  const real = all.filter((p) => !p.floating);
  const floats = all.filter((p) => p.floating);
  check(`${name}: no overlapping text in the page body`, real.length === 0, real.length ? `${real.length} overlap(s): ` + real.slice(0, 3).map((p) => `"${p.a}" × "${p.b}"`).join("; ") : "clean");
  if (floats.length) console.log(`  note: ${floats.length} floating-badge overlap(s) (expected for a fixed pill): ` + floats.slice(0, 2).map((p) => `"${p.a}" × "${p.b}"`).join("; "));
  await page.evaluate(() => { const scrollers = [...document.querySelectorAll("div")].filter((d) => d.scrollHeight > d.clientHeight + 40); scrollers.forEach((d) => d.scrollTop = 0); });
  await page.screenshot({ path: `docs/screenshots/sweep-${name}.png` });
}

// staff sign-in
await page.setViewport({ width: 1280, height: 860 });
await page.goto(`${BASE}/clinician`, { waitUntil: "networkidle2" });
await page.waitForSelector('input[aria-label="Clinic account email"]');
await page.type('input[aria-label="Clinic account email"]', "anilrajojha@pahs.edu.np", { delay: 10 });
await page.type('input[aria-label="Clinic account password"]', process.env.CLINIC_ADMIN_PASSWORD || "", { delay: 10 });
await page.click('[aria-label="Sign in to the clinic dashboard"]');
await sleep(4000);

await page.evaluate(() => localStorage.setItem("rainbow-color-scheme", "dark"));
await sweep("home-dark-desktop", { url: "/", width: 1280, height: 860, waitForText: "Clinic" });
await sweep("clinician-dark-desktop", { url: "/clinician", width: 1280, height: 860 });
await sweep("growth-dark-desktop", { url: "/growth", width: 1280, height: 860 });

await page.evaluate(() => localStorage.setItem("rainbow-color-scheme", "light"));
await sweep("home-light-desktop", { url: "/", width: 1280, height: 860, waitForText: "Clinic" });

// signed-out pages
await page.evaluate(() => localStorage.clear());
await sweep("onboarding-mobile", { url: "/onboarding", width: 420, height: 880, mobile: true });
await sweep("booking-mobile", { url: "/booking", width: 420, height: 880, mobile: true, reachConfirm: true });
await sweep("find-mobile", { url: "/find", width: 420, height: 880, mobile: true });

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} sweeps clean`);
process.exit(failed.length ? 1 : 0);
