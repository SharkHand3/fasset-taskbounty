import { beforeEach, describe, expect, it } from "vitest";

import worker from "../src/index";
import { clearDatabase, seedCompletedTask, testEnv } from "./helpers";

async function call(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://api.example${path}`, init), testEnv);
}

describe("read API", () => {
  beforeEach(async () => {
    await clearDatabase();
    await seedCompletedTask();
  });

  it("reports a healthy synchronized snapshot", async () => {
    const response = await call("/v1/health");
    const body = await response.json<Record<string, unknown>>();
    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).toContain('"status":"healthy"');
  });

  it("serves protocol values as precision-safe decimal strings", async () => {
    const response = await call("/v1/protocol");
    const body = await response.json<Record<string, unknown>>();
    expect(JSON.stringify(body)).toContain('"nextTaskId":"2"');
    expect(JSON.stringify(body)).toContain('"totalEscrowedRaw":"0"');
  });

  it("filters and paginates tasks", async () => {
    const response = await call("/v1/tasks?status=completed&limit=1");
    const body = await response.json<Record<string, unknown>>();
    const text = JSON.stringify(body);
    expect(response.status).toBe(200);
    expect(text).toContain('"id":"1"');
    expect(text).toContain('"verified":true');
    expect(text).toContain('"nextCursor":null');
  });

  it("serves task detail with artifact and event evidence", async () => {
    const response = await call("/v1/tasks/1");
    const text = JSON.stringify(await response.json<Record<string, unknown>>());
    expect(text).toContain('"title":"Indexed task"');
    expect(text).toContain('"eventName":"TaskCreated"');
    expect(text).toContain('"label":"Completed"');
  });

  it("rejects invalid filters and unknown tasks", async () => {
    expect((await call("/v1/tasks?limit=0")).status).toBe(400);
    expect((await call("/v1/tasks?status=unknown")).status).toBe(400);
    expect((await call("/v1/tasks/999")).status).toBe(404);
  });

  it("enforces the origin allowlist and read-only methods", async () => {
    expect(
      (
        await call("/v1/tasks", {
          headers: { origin: "https://malicious.example" },
        })
      ).status,
    ).toBe(403);
    expect((await call("/v1/tasks", { method: "POST" })).status).toBe(405);

    const allowed = await call("/v1/tasks", {
      headers: { origin: "https://fasset-taskbounty.pages.dev" },
    });
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://fasset-taskbounty.pages.dev",
    );
  });
});
