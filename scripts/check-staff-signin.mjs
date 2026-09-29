
/** Staff sign-in paths: fresh device + parent form auto-routing for authority emails. */
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
await page.setViewport({ width: 1280, height: 860 });

// 1. Fresh device: the clinic team sign-in page
await page.goto(`${BASE}/clinician`, { waitUntil: "networkidle2" });
await page.waitForFunction(() => /Clinic team sign in/.test(document.body.innerText), { timeout: 20000 });
check("fresh device: /clinician shows the clinic team sign-in form", true);
await page.screenshot({ path: "docs/screenshots/2026-09-29-clinic-signin.png" });

// 2. Parent sign-in form auto-routes the clinic admin email to the panel
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/parent-auth`, { waitUntil: "networkidle2" });
await sleep(600);
if (await page.$('[aria-label="Create account"]')) {
  await page.evaluate(() => {
    const link = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /^(Sign in|लग इन)$/.test((d.textContent || "").trim()));
    (link?.closest("[tabindex]") || link?.parentElement || link)?.click();
  });
  await sleep(500);
}
await page.waitForSelector('[aria-label="Parent email address"]', { timeout: 15000 });
await page.type('[aria-label="Parent email address"]', "anilrajojha@pahs.edu.np", { delay: 12 });
await page.type('[aria-label="Parent password"]', process.env.CLINIC_ADMIN_PASSWORD || "", { delay: 12 });
await page.click('[aria-label="Sign in"]');
await sleep(3500);
const urlAfter = page.url();
check("clinic admin signing in on the parent form lands on the clinic panel", urlAfter.includes("/clinician"), urlAfter.replace(BASE, ""));
const dashText = await page.evaluate(() => document.body.innerText);
check("the panel greets the admin", /Signed in as clinic admin|clinic dashboard/.test(dashText));
await page.screenshot({ path: "docs/screenshots/2026-09-29-admin-signed-in.png" });

// 3. Recognized device: the staff shell shows the Admin tab
await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await sleep(1200);
const homeText = await page.evaluate(() => document.body.innerText);
check("staff home greets the clinic", /Clinic home|क्लिनिक गृहपृष्ठ/.test(homeText));
check("the Admin entry is present for this device", /(^|\n)Admin(\n|$)|एडमिन/.test(homeText));

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
