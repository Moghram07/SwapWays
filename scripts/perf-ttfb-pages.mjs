/**
 * Quick server TTFB / full-document timing (Node). Not a browser Lighthouse score.
 * Usage: node scripts/perf-ttfb-pages.mjs [baseUrl]
 */
import http from "node:http";

const base = process.argv[2] || process.env.PERF_BASE_URL || "http://127.0.0.1:3000";
const paths = [
  "/",
  "/en",
  "/en/login",
  "/terms",
  "/privacy",
  "/support",
  "/dashboard",
  "/dashboard/board",
  "/dashboard/add-trade",
  "/dashboard/schedule",
  "/dashboard/matches",
  "/dashboard/messages",
  "/dashboard/account",
  "/dashboard/profile",
  "/dashboard/notifications",
  "/dashboard/browse",
  "/dashboard/line-swap",
  "/dashboard/install",
  "/dashboard/feedback",
  "/api/health",
];

function get(u) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const req = http.get(
      u,
      { headers: { "User-Agent": "perf-ttfb-pages/1.0", Accept: "text/html,application/json" } },
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
    req.setTimeout(20000, () => {
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
console.log(
  ["path", "status", "ttfbMs", "totalMs", "bytes", "redirect/error"].join("\t")
);
for (const r of rows) {
  const extra = r.error || r.redirect || "";
  console.log(
    [r.path, r.status ?? "-", r.ttfbMs ?? "-", r.totalMs ?? "-", r.bytes ?? "-", extra].join("\t")
  );
}
