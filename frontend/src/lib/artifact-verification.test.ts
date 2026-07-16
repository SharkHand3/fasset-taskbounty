import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { verifyArtifactBytes } from "./artifact-verification";

const taskHash =
  "0x346a8ed27a9ace38c3463718bf1043bd2d590a974a86c426fd8f0d245dda534b";
const resultHash =
  "0x59f387788cb0121d7a9d6ba319e5580923037dfb3eb8e8e46e0c88cfa81177ce";

describe("artifact byte verification", () => {
  it("matches the immutable task manifest", async () => {
    const bytes = await readFile(
      new URL("../../../docs/v2-integration-task.json", import.meta.url),
    );

    const verification = verifyArtifactBytes(bytes, taskHash);

    expect(verification.matches).toBe(true);
    expect(verification.actualHash).toBe(taskHash);
    expect(verification.byteLength).toBeGreaterThan(0);
  });

  it("matches the immutable result manifest", async () => {
    const bytes = await readFile(
      new URL("../../../docs/v2-integration-result.json", import.meta.url),
    );

    const verification = verifyArtifactBytes(bytes, resultHash);

    expect(verification.matches).toBe(true);
    expect(verification.actualHash).toBe(resultHash);
  });

  it("detects a one-byte content change", () => {
    const verification = verifyArtifactBytes(
      new TextEncoder().encode("changed"),
      taskHash,
    );

    expect(verification.matches).toBe(false);
    expect(verification.actualHash).not.toBe(taskHash);
  });
});
