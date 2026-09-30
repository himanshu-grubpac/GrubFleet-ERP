import http from "k6/http";
import { check, sleep } from "k6";

const apiBase = (__ENV.K6_API_BASE_URL || "http://localhost:4000/api/v1").replace(
  /\/$/,
  "",
);
const organizationId = __ENV.K6_ORG_ID;
const accessToken = __ENV.K6_ACCESS_TOKEN;
const vus = Number(__ENV.K6_VUS || "5");
const duration = __ENV.K6_DURATION || "30s";

export const options = {
  vus,
  duration,
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

function authHeaders() {
  if (!accessToken || !organizationId) {
    throw new Error("Set K6_ACCESS_TOKEN and K6_ORG_ID");
  }
  return {
    Authorization: `Bearer ${accessToken}`,
    "x-organization-id": organizationId,
  };
}

export default function organisationListSmoke() {
  const headers = authHeaders();
  const query = `organizationId=${organizationId}&page=1&pageSize=20`;

  const locations = http.get(
    `${apiBase}/organisation/locations?${query}`,
    { headers },
  );
  check(locations, {
    "locations status 200": (r) => r.status === 200,
  });

  const employees = http.get(
    `${apiBase}/organisation/employees?${query}`,
    { headers },
  );
  check(employees, {
    "employees status 200": (r) => r.status === 200,
  });

  sleep(1);
}
