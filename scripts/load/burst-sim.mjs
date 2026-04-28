import { performance } from "node:perf_hooks";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ENDPOINTS = (process.env.ENDPOINTS || "/api/health,/").split(",").map((s) => s.trim()).filter(Boolean);
const CONCURRENCY = Number(process.env.CONCURRENCY || 1000);
const ROUNDS = Number(process.env.ROUNDS || 3);
const PER_USER_DELAY_MS = Number(process.env.PER_USER_DELAY_MS || 0);

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function pseudoIp(i) {
  const a = 10;
  const b = (i % 250) + 1;
  const c = ((Math.floor(i / 250) % 250) + 1);
  const d = ((Math.floor(i / 500) % 250) + 1);
  return `${a}.${b}.${c}.${d}`;
}

async function hit(url, i) {
  if (PER_USER_DELAY_MS > 0) {
    await new Promise((r) => setTimeout(r, (i % 7) * PER_USER_DELAY_MS));
  }
  const started = performance.now();
  try {
    const res = await fetch(url, {
      headers: {
        "x-forwarded-for": pseudoIp(i),
      },
    });
    await res.arrayBuffer();
    const elapsed = performance.now() - started;
    return { ok: res.ok, status: res.status, elapsed };
  } catch {
    const elapsed = performance.now() - started;
    return { ok: false, status: 0, elapsed };
  }
}

async function runEndpoint(path) {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const all = [];

  for (let round = 1; round <= ROUNDS; round += 1) {
    const jobs = Array.from({ length: CONCURRENCY }, (_, i) => hit(url, i + round * 10000));
    const results = await Promise.all(jobs);
    all.push(...results);
    const statuses = new Map();
    for (const r of results) statuses.set(r.status, (statuses.get(r.status) || 0) + 1);
    console.log(
      `[round ${round}/${ROUNDS}] ${path} ->`,
      Object.fromEntries([...statuses.entries()].sort((a, b) => a[0] - b[0]))
    );
  }

  const latencies = all.map((r) => r.elapsed).sort((a, b) => a - b);
  const ok = all.filter((r) => r.ok).length;
  const statusCounts = new Map();
  for (const r of all) statusCounts.set(r.status, (statusCounts.get(r.status) || 0) + 1);

  const summary = {
    endpoint: path,
    totalRequests: all.length,
    successRatePct: Number(((ok / all.length) * 100).toFixed(2)),
    p50Ms: Number(percentile(latencies, 50).toFixed(1)),
    p95Ms: Number(percentile(latencies, 95).toFixed(1)),
    p99Ms: Number(percentile(latencies, 99).toFixed(1)),
    maxMs: Number(percentile(latencies, 100).toFixed(1)),
    statuses: Object.fromEntries([...statusCounts.entries()].sort((a, b) => a[0] - b[0])),
  };

  console.log("\nSummary:", JSON.stringify(summary, null, 2), "\n");
  return summary;
}

async function main() {
  console.log(
    `Running burst simulation: base=${BASE_URL}, endpoints=${ENDPOINTS.join(" ")}, concurrency=${CONCURRENCY}, rounds=${ROUNDS}`
  );
  for (const endpoint of ENDPOINTS) {
    await runEndpoint(endpoint);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
