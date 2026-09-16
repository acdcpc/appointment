/**
 * Expo's static export writes one HTML file per route (parent-auth.html,
 * booking.html, …). Static hosts that map URLs to directories (Cloudflare
 * Pages, and Netlify's pretty URLs) serve /parent-auth from
 * parent-auth/index.html — so copy each route file to that shape. Without this
 * every deep link falls back to index.html and boots the wrong screen.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const dist = "dist";
const skip = new Set(["index.html", "+not-found.html", "_sitemap.html"]);

function walk(dir, prefix = "") {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, prefix ? `${prefix}/${entry}` : entry);
      continue;
    }
    if (!entry.endsWith(".html") || skip.has(entry)) continue;
    const routeName = basename(entry, ".html");
    const prettyDir = join(dist, prefix ? prefix : "", routeName);
    if (existsSync(join(prettyDir, "index.html"))) continue;
    mkdirSync(prettyDir, { recursive: true });
    copyFileSync(full, join(prettyDir, "index.html"));
  }
}

walk(dist);
console.log("expanded static routes into directory indexes");
