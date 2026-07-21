import { describe, expect, it } from "vitest";

import {
  getAvailableTaskAction,
  isTaskActionEvidenceReady,
} from "./task-action";

describe("getAvailableTaskAction", () => {
  it("maps open tasks to accept or creator cancellation", () => {
    expect(getAvailableTaskAction(0, "participant", true)).toBe("accept");
    expect(getAvailableTaskAction(0, "creator", true)).toBe("cancel");
  });

  it("allows only the assigned lifecycle role to progress work", () => {
    expect(getAvailableTaskAction(1, "worker", true)).toBe("submit");
    expect(getAvailableTaskAction(1, "participant", true)).toBeNull();
    expect(getAvailableTaskAction(2, "creator", true)).toBe("approve");
    expect(getAvailableTaskAction(2, "worker", true)).toBeNull();
  });

  it("returns no action without an explicit wallet connection or in terminal states", () => {
    expect(getAvailableTaskAction(0, "participant", false)).toBeNull();
    expect(getAvailableTaskAction(3, "creator", true)).toBeNull();
    expect(getAvailableTaskAction(4, "creator", true)).toBeNull();
  });

  it("blocks creator payment until the result commitment is verified", () => {
    expect(isTaskActionEvidenceReady("approve", false)).toBe(false);
    expect(isTaskActionEvidenceReady("approve", true)).toBe(true);
    expect(isTaskActionEvidenceReady("submit", false)).toBe(true);
  });
});
