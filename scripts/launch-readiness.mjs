import "dotenv/config";
import { config } from "dotenv";

config({ path: ".env.local", override: true });

const required = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "MATCH_REFRESH_SECRET",
  "CRON_SECRET",
  "ADMIN_EMAIL",
];

const recommended = [
  "POSTHOG_PROJECT_API_KEY",
  "ANALYTICS_HASH_SALT",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_VERIFICATION_SALT",
];

function isSet(name) {
  return Boolean(process.env[name] && process.env[name].trim().length > 0);
}

let ok = true;
console.log("Launch readiness env check");
console.log("--------------------------");
for (const name of required) {
  if (!isSet(name)) {
    ok = false;
    console.error(`MISSING required env: ${name}`);
  }
}

for (const name of recommended) {
  if (!isSet(name)) {
    console.warn(`WARN recommended env not set: ${name}`);
  }
}

if (process.env.ALLOW_ANY_EMAIL_FOR_TESTING === "true") {
  ok = false;
  console.error("ALLOW_ANY_EMAIL_FOR_TESTING must be false/unset for launch.");
}

if (isSet("NEXTAUTH_SECRET") && process.env.NEXTAUTH_SECRET.length < 32) {
  ok = false;
  console.error("NEXTAUTH_SECRET is too short; use at least 32 characters.");
}

if (ok) {
  console.log("PASS: launch env baseline looks good.");
  process.exit(0);
}

console.error("FAIL: launch readiness check failed.");
process.exit(1);
