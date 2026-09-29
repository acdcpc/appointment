
/** Nav check: the Book visit tab is gone; Home still books; staff nav intact. */
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

// signed-out mobile: tab bar
await page.setViewport({ width: 420, height: 880, isMobile: true, hasTouch: true });
await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await sleep(800);
const mobileNav = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('[role="tab"], a[role="link"]')].map((el) => (el.textContent || "").trim()).filter(Boolean);
  // bottom tab bar buttons live in the last fixed bar; collect visible tab labels instead:
  const tabs = [...document.querySelectorAll('div[role="tablist"] [role="tab"]')].map((el) => (el.textContent || "").trim());
  return { tabs, hasBookTab: tabs.some((t) => /Book visit|समय लिनुहोस्/.test(t)), body: document.body.innerText.slice(0, 10) };
});
check("mobile tab bar has no Book visit tab", !mobileNav.hasBookTab, mobileNav.tabs.join(" | ") || "tabs not matched by role");
const mobileCta = await page.evaluate(() => {
  const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /^Book a visit$/.test((d.textContent || "").trim()));
  return Boolean(leaf);
});
check("Home still offers the 'Book a visit' button", mobileCta);
if (mobileCta) {
  await page.evaluate(() => {
    const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /^Book a visit$/.test((d.textContent || "").trim()));
    (leaf?.closest("[tabindex]") || leaf?.parentElement || leaf)?.click();
  });
  await sleep(1500);
  const onBooking = await page.evaluate(() => /Choose an available day/.test(document.body.innerText));
  check("the Home button opens the booking flow", onBooking, page.url());
}

// signed-out desktop: top nav
await page.setViewport({ width: 1280, height: 860 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await sleep(800);
const desktopNav = await page.evaluate(() => {
  const bar = [...document.querySelectorAll("div")].find((d) => (d.textContent || "").includes("Associate Professor Dr. Anil Ojha, MBBS, MD, FCCH") && d.querySelectorAll("div").length < 40);
  const text = bar ? bar.innerText : "";
  return { text: text.split("\n").slice(0, 12).join(" / "), hasBook: /Book visit|समय लिनुहोस्/.test(text.split("Associate Professor")[0] || text) };
});
check("desktop top nav has no Book visit item", !desktopNav.hasBook, desktopNav.text);

// staff desktop: unchanged nav
await page.goto(`${BASE}/clinician`, { waitUntil: "networkidle2" });
await page.waitForSelector('input[aria-label="Clinic account email"]');
await page.type('input[aria-label="Clinic account email"]', "anilrajojha@pahs.edu.np", { delay: 10 });
await page.type('input[aria-label="Clinic account password"]', process.env.CLINIC_ADMIN_PASSWORD || "", { delay: 10 });
await page.click('[aria-label="Sign in to the clinic dashboard"]');
await sleep(4000);
await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await sleep(800);
const staffNav = await page.evaluate(() => document.body.innerText.slice(0, 400));
check("staff nav still shows its own tabs (no parent booking entries)", /Home|गृहपृष्ठ/.test(staffNav) && !/Book visit|समय लिनुहोस्/.test(staffNav.split("\n").slice(0, 12).join(" ")));

// direct /find still loads (route kept for links)
await page.goto(`${BASE}/find`, { waitUntil: "networkidle2" });
await sleep(600);
const findOk = await page.evaluate(() => document.body.innerText.length > 40);
check("the /find route itself still resolves", findOk);

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
