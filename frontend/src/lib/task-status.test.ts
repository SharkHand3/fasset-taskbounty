import { describe, expect, it } from "vitest";

import { getTaskStatusLabel } from "./task-status";

describe("task status labels", () => {
  it("maps the completed enum value", () => {
    expect(getTaskStatusLabel(3)).toBe("Completed");
  });

  it("does not hide an unknown enum value", () => {
    expect(getTaskStatusLabel(9)).toBe("Unknown (9)");
  });
});
