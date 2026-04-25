/**
 * Mobile / first-load performance — how to measure (classify: network, JS, server, data).
 *
 * 1) Network vs server TTFB: DevTools → Network → first document (Waiting / TTFB).
 * 2) JavaScript: Performance → Main thread, or Lighthouse TBT.
 * 3) Client data: Network → XHR/fetch to /api/* after first paint.
 * 4) Bundle: npm run analyze (treemap after build).
 */

import { request } from "node:http";

function headLocal(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const port = u.port || (u.protocol === "https:" ? 443 : 80);
    const req = request(
      { hostname: u.hostname, port, path: u.pathname || "/", method: "HEAD", timeout: 3000 },
      (res) => {
        res.resume();
        resolve({ ok: res.statusCode && res.statusCode < 500, status: res.statusCode });
      }
    );
    req.on("error", () => resolve({ ok: false, status: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: null });
    });
    req.end();
  });
}

const base = process.env.PERF_BASE_URL || "http://127.0.0.1:3000";
console.log("SwapWays — performance measurement checklist\n");
console.log(`Optional: HEAD ${base} (set PERF_BASE_URL for production smoke)`);
const r = await headLocal(base);
if (r.ok) {
  console.log(`  OK (${r.status}). For scores: npx lighthouse ${base} --view --only-categories=performance`);
} else {
  console.log("  (Start the app: npm run start) or set PERF_BASE_URL to your deployed URL.\n");
}
console.log("\nSee script comments for the four buckets (TTFB, JS, API waterfall, bundle).");
