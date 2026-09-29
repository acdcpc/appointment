
/** Profile tab check: Practice team + Danger zone gone; one delete message. */
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
await page.goto(`${BASE}/clinician`, { waitUntil: "networkidle2" });
await page.waitForSelector('input[aria-label="Clinic account email"]');
await page.type('input[aria-label="Clinic account email"]', "anilrajojha@pahs.edu.np", { delay: 10 });
await page.type('input[aria-label="Clinic account password"]', process.env.CLINIC_ADMIN_PASSWORD || "", { delay: 10 });
await page.click('[aria-label="Sign in to the clinic dashboard"]');
await sleep(4000);

await page.goto(`${BASE}/profile`, { waitUntil: "networkidle2" });
await page.waitForFunction(() => /Delete my account|मेरो खाता मेटाउनुहोस्/.test(document.body.innerText), { timeout: 20000 });
await sleep(600);
const text = await page.evaluate(() => document.body.innerText);
check("no Practice team section", !/Practice team|क्लिनिक टिम/.test(text));
check("no clinician-dashboard card in Profile", !/Dr\. Ojha clinician dashboard|क्लिनिसियन ड्यासबोर्ड/.test(text));
check("no Danger zone label", !/Danger zone|जोखिम क्षेत्र/.test(text));
check("delete control present", /Delete my account|मेरो खाता मेटाउनुहोस्/.test(text));
check("the single message is present (either language)", /Removes your account and child profile from the app\./.test(text) || /खाता र बच्चाको प्रोफाइल एपबाट हट्छ।/.test(text));
check("the old extra sentence is gone", !/A record is kept/.test(text) && !/सुरक्षित रहन्छ/.test(text));
check("Practice information section still present", /Practice information|क्लिनिक जानकारी/.test(text));

await page.evaluate(() => {
  const scrollers = [...document.querySelectorAll("div")].filter((d) => d.scrollHeight > d.clientHeight + 40);
  scrollers.forEach((d) => d.scrollTop = d.scrollHeight);
});
await sleep(500);
await page.screenshot({ path: "docs/screenshots/2026-09-29-profile-bottom.png" });

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
