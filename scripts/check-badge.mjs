
import puppeteer from "puppeteer-core";
import * as dotenv from "dotenv";
dotenv.config();
const BASE = "https://rainbowclinic.pages.dev";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-first-run", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 860 });
await page.goto(`${BASE}/clinician`, { waitUntil: "networkidle2" });
await page.waitForSelector('input[aria-label="Clinic account email"]');
await page.type('input[aria-label="Clinic account email"]', "anilrajojha@pahs.edu.np", { delay: 10 });
await page.type('input[aria-label="Clinic account password"]', process.env.CLINIC_ADMIN_PASSWORD || "", { delay: 10 });
await page.click('[aria-label="Sign in to the clinic dashboard"]');
await sleep(4000);
await page.evaluate(() => localStorage.setItem("rainbow-color-scheme", "dark"));
await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await page.waitForFunction(() => /Clinic home|क्लिनिक गृहपृष्ठ/.test(document.body.innerText)).catch(() => {});
await sleep(600);
const badge = await page.evaluate(() => {
  const leaf = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && /^(Live environment|Staging|Local)$/.test((d.textContent || "").trim()));
  return leaf ? leaf.textContent.trim() : "badge not found";
});
console.log("BUILD-CONTEXT BADGE NOW READS:", badge);
await page.screenshot({ path: "docs/screenshots/2026-09-29-staff-home-dark.png" });
await browser.close();
process.exit(badge === "Live environment" ? 0 : 1);
