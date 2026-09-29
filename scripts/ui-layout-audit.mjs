
/** Focused geometry audit of the booking date-of-birth area + refreshed shot. */
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
await page.setViewport({ width: 420, height: 880, isMobile: true, hasTouch: true });

await page.goto(`${BASE}/booking`, { waitUntil: "networkidle2" });
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
await sleep(400);

const geo = await page.evaluate(() => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), w: Math.round(r.width) }; };
  const leafByText = (re) => [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && re.test((d.textContent || "").trim()));
  const chipByLabel = (re) => [...document.querySelectorAll('[role="radio"]')].find((el) => re.test(el.getAttribute("aria-label") || ""));
  const scrollerOf = (chip) => { let n = chip; while (n && n.parentElement && getComputedStyle(n.parentElement).overflowX === "visible") n = n.parentElement; return n ? n.parentElement : null; };
  const yearChip = chipByLabel(/^(Year|वर्ष) 20\d{2}$/);
  const monthChip = chipByLabel(/^(Month|महिना) [A-Z][a-z]{2}$/);
  const dayChip = chipByLabel(/^(Day|दिन) \d{1,2}$/);
  const ageInput = document.querySelector('input[aria-label="Child age in years"]');
  const out = {
    yearChip: yearChip ? rect(yearChip) : null,
    monthChip: monthChip ? rect(monthChip) : null,
    dayChip: dayChip ? rect(dayChip) : null,
    ageLabel: leafByText(/^Age$/) ? rect(leafByText(/^Age$/)) : null,
    ageInput: ageInput ? rect(ageInput) : null,
    dobLabel: leafByText(/^Date of birth \(optional\)$/) ? rect(leafByText(/^Date of birth \(optional\)$/)) : null,
    checkbox: leafByText(/Date of birth not known/) ? rect(leafByText(/Date of birth not known/)) : null,
    scrollRows: [yearChip, monthChip, dayChip].map((chip) => {
      const s = chip ? scrollerOf(chip) : null;
      return s ? { scrollWidth: s.scrollWidth, clientWidth: s.clientWidth } : null;
    }),
  };
  return out;
});

const order = ["dobLabel", "yearChip", "monthChip", "dayChip", "ageLabel"];
let previous = null, ordered = true, detail = "";
for (const key of order) {
  const r = geo[key];
  if (!r) { ordered = false; detail = `${key} missing`; break; }
  if (previous && r.top < previous.bottom - 2) { ordered = false; detail = `${key}.top ${r.top} < ${previous.name}.bottom ${previous.bottom}`; break; }
  previous = { name: key, bottom: r.bottom };
}
check("DOB rows and the Age row stack without overlap", ordered, detail || "clean vertical order");
check("year chips form a horizontal scroller", Boolean(geo.scrollRows[0] && geo.scrollRows[0].scrollWidth > geo.scrollRows[0].clientWidth), JSON.stringify(geo.scrollRows[0]));
check("year chip sits inside the viewport", Boolean(geo.yearChip) && geo.yearChip.left >= 0 && geo.yearChip.right <= 421, JSON.stringify(geo.yearChip));

await page.evaluate(() => {
  const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /Date of birth \(optional\)/.test(d.textContent || ""));
  leaf?.scrollIntoView({ block: "start" });
});
await sleep(500);
await page.screenshot({ path: "docs/screenshots/2026-09-29-booking-dob-full.png", fullPage: true });

console.log("\ngeometry:", JSON.stringify(geo));
await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
