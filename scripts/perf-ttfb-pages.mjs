/**
 * Server-side document timing (TTFB + full download). Not Lighthouse / Core Web Vitals.
 * Usage: node scripts/perf-ttfb-pages.mjs [baseUrl]
 */
import http from "node:http";

const base = process.argv[2] || process.env.PERF_BASE_URL || "http://127.0.0.1:3000";

/** App Router `page.tsx` paths (concrete URLs — no dynamic segments except one feedback sample). */
const paths = [
  "/",
  "/en",
  "/ar",
  "/en/contact",
  "/en/login",
  "/en/register",
  "/en/forgot-password",
  "/en/reset-password",
  "/en/privacy",
  "/en/support",
  "/en/terms",
  "/contact",
  "/privacy",
  "/terms",
  "/support",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/dashboard",
  "/dashboard/account",
  "/dashboard/add-trade",
  "/dashboard/admin",
  "/dashboard/admin/analytics",
  "/dashboard/admin/feedback",
  "/dashboard/admin/flags",
  "/dashboard/admin/notifications",
  "/dashboard/admin/posts",
  "/dashboard/admin/users",
  "/dashboard/board",
  "/dashboard/browse",
  "/dashboard/feedback",
  "/dashboard/feedback/00000000-0000-0000-0000-000000000001",
  "/dashboard/install",
  "/dashboard/line-swap",
  "/dashboard/matches",
  "/dashboard/messages",
  "/dashboard/my-trades",
  "/dashboard/notifications",
  "/dashboard/profile",
  "/dashboard/schedule",
  "/dashboard/trade-board",
  "/dashboard/upgrade",
  "/api/health",
];

function get(u) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const req = http.get(
      u,
      { headers: { "User-Agent": "perf-ttfb-pages/1.1", Accept: "text/html,application/json,*/*" } },
      (res) => {
        const ttfbMs = Math.round(performance.now() - t0);
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const totalMs = Math.round(performance.now() - t0);
          const bytes = Buffer.concat(chunks).length;
          resolve({
            path: new URL(u).pathname,
            status: res.statusCode,
            ttfbMs,
            totalMs,
            bytes,
            redirect: res.headers.location || "",
          });
        });
      }
    );
    req.on("error", (e) =>
      resolve({ path: new URL(u).pathname, error: e.code || e.message })
    );
    req.setTimeout(60000, () => {
      req.destroy();
      resolve({ path: new URL(u).pathname, error: "TIMEOUT" });
    });
  });
}

console.log(`Base: ${base}\n`);
const rows = [];
for (const p of paths) {
  const u = base.replace(/\/$/, "") + (p.startsWith("/") ? p : `/${p}`);
  rows.push(await get(u));
}

function numSorter(a, b) {
  const av = a.ttfbMs ?? 1e9;
  const bv = b.ttfbMs ?? 1e9;
  return av - bv;
}

const ok = rows.filter((r) => !r.error && r.status && r.status < 500);
const ttfbs = ok.map((r) => r.ttfbMs).sort((a, b) => a - b);
const totals = ok.map((r) => r.totalMs).sort((a, b) => a - b);
const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))];

console.log(["path", "status", "ttfbMs", "totalMs", "bytes", "redirect/error"].join("\t"));
for (const r of [...rows].sort(numSorter)) {
  const extra = r.error || r.redirect || "";
  console.log(
    [r.path, r.status ?? "-", r.ttfbMs ?? "-", r.totalMs ?? "-", r.bytes ?? "-", extra].join("\t")
  );
}

if (ttfbs.length) {
  console.log("\n--- summary (routes with status < 500, no socket error) ---");
  console.log(`count\t${ttfbs.length}`);
  console.log(`ttfbMs min\t${ttfbs[0]}`);
  console.log(`ttfbMs p50\t${pct(ttfbs, 50)}`);
  console.log(`ttfbMs p90\t${pct(ttfbs, 90)}`);
  console.log(`ttfbMs max\t${ttfbs[ttfbs.length - 1]}`);
  console.log(`totalMs min\t${totals[0]}`);
  console.log(`totalMs p50\t${pct(totals, 50)}`);
  console.log(`totalMs p90\t${pct(totals, 90)}`);
  console.log(`totalMs max\t${totals[totals.length - 1]}`);
}

const failures = rows.filter((r) => r.error || !r.status || r.status >= 500);
if (failures.length) {
  console.log("\n--- attention ---");
  for (const r of failures) {
    console.log(`${r.path}\t${r.status ?? "-"}\t${r.error || ""}`);
  }
}
