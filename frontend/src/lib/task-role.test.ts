import { describe, expect, it } from "vitest";

import { integrationParticipants } from "../config/deployments";
import { getTaskRole, getTaskRoleLabel } from "./task-role";

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe("dynamic task role", () => {
  it("derives roles from the current task instead of a hard-coded task ID", () => {
    expect(
      getTaskRole(
        integrationParticipants.creator,
        integrationParticipants.creator,
        integrationParticipants.worker,
      ),
    ).toBe("creator");
    expect(
      getTaskRole(
        integrationParticipants.worker,
        integrationParticipants.creator,
        integrationParticipants.worker,
      ),
    ).toBe("worker");
  });

  it("treats unassigned and unrelated accounts as participants", () => {
    expect(
      getTaskRole(undefined, integrationParticipants.creator, zeroAddress),
    ).toBe("participant");
    expect(
      getTaskRole(
        "0x0000000000000000000000000000000000000001",
        integrationParticipants.creator,
        integrationParticipants.worker,
      ),
    ).toBe("participant");
  });

  it("provides product-facing labels", () => {
    expect(getTaskRoleLabel("creator")).toBe("Creator");
    expect(getTaskRoleLabel("worker")).toBe("Assigned worker");
    expect(getTaskRoleLabel("participant")).toBe("Participant");
  });
});
