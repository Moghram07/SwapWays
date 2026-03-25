import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    ramp_up: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "3m", target: 120 },
        { duration: "2m", target: 200 },
      ],
      gracefulRampDown: "30s",
    },
    spike_probe: {
      executor: "ramping-vus",
      startTime: "7m",
      startVUs: 50,
      stages: [
        { duration: "1m", target: 300 },
        { duration: "1m", target: 80 },
      ],
      gracefulRampDown: "15s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1500", "p(99)<2500"],
    "http_req_duration{endpoint:health}": ["p(95)<500"],
    "http_req_duration{endpoint:landing}": ["p(95)<1200"],
    "http_req_duration{endpoint:login}": ["p(95)<1200"],
  },
};

export default function stagedScenario() {
  group("Public pages", () => {
    const landing = http.get(`${BASE_URL}/`, { tags: { endpoint: "landing" } });
    check(landing, {
      "landing status is 200": (r) => r.status === 200,
    });

    const login = http.get(`${BASE_URL}/login`, { tags: { endpoint: "login" } });
    check(login, {
      "login status is 200": (r) => r.status === 200,
    });
  });

  group("Health and session probes", () => {
    const health = http.get(`${BASE_URL}/api/health`, { tags: { endpoint: "health" } });
    check(health, {
      "health status is 200": (r) => r.status === 200,
    });

    const session = http.get(`${BASE_URL}/api/auth/session`, { tags: { endpoint: "auth-session" } });
    check(session, {
      "session endpoint is reachable": (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(1);
}
