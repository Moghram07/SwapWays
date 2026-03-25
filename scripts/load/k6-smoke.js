import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 25,
  duration: "2m",
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1500"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function smokeScenario() {
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    "health status is 200": (r) => r.status === 200,
  });

  const landing = http.get(`${BASE_URL}/`);
  check(landing, {
    "landing status is 200": (r) => r.status === 200,
  });

  sleep(1);
}
