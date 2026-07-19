import { describe, expect, it } from "vitest";

import {
  createTaskManifestDraft,
  getManifestPublishingError,
  parseTaskManifest,
} from "./task-manifest";

describe("task manifest product model", () => {
  it("parses the product fields used by task cards and detail pages", () => {
    expect(
      parseTaskManifest({
        schemaVersion: "2.0",
        title: " Build an indexer ",
        description: " Stream TaskBounty events. ",
        deliverables: ["Source", 1, "Tests"],
        acceptanceCriteria: ["All tests pass"],
      }),
    ).toEqual({
      schemaVersion: "2.0",
      title: "Build an indexer",
      description: "Stream TaskBounty events.",
      deliverables: ["Source", "Tests"],
      acceptanceCriteria: ["All tests pass"],
    });
  });

  it("rejects manifests without product-facing essentials", () => {
    expect(() => parseTaskManifest(null)).toThrow("JSON object");
    expect(() => parseTaskManifest({ description: "Only description" })).toThrow(
      "title",
    );
    expect(() => parseTaskManifest({ title: "Only title" })).toThrow(
      "description",
    );
  });

  it("generates deterministic downloadable JSON with a trailing newline", () => {
    const draft = createTaskManifestDraft({
      acceptanceCriteria: ["Public tests pass"],
      deliverables: ["Source commit"],
      description: "Implement the requested integration.",
      reward: "1000000",
      title: "Integration task",
    });

    expect(draft.endsWith("\n")).toBe(true);
    const parsed = parseTaskManifest(JSON.parse(draft));
    expect(parsed.title).toBe("Integration task");
    expect(getManifestPublishingError(parsed, 1_000_000n)).toBeNull();
    expect(getManifestPublishingError(parsed, 2_000_000n)).toContain(
      "transaction reward",
    );
  });
});
