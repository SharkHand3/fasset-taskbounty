import { describe, expect, it } from "vitest";

import { resolveArtifactURI } from "./artifact-uri";

describe("resolveArtifactURI", () => {
  it("routes content-addressed schemes through supported public gateways", () => {
    expect(resolveArtifactURI("ipfs://bafy123/manifest.json")).toBe(
      "https://ipfs.io/ipfs/bafy123/manifest.json",
    );
    expect(resolveArtifactURI("ar://transaction-id")).toBe(
      "https://arweave.net/transaction-id",
    );
  });

  it("keeps supported version-pinned HTTPS URLs", () => {
    const uri = "https://raw.githubusercontent.com/org/repo/commit/task.json";
    expect(resolveArtifactURI(uri)).toBe(uri);
  });

  it("rejects mutable or unexpected browser request targets", () => {
    expect(() => resolveArtifactURI("http://example.com/task.json")).toThrow();
    expect(() => resolveArtifactURI("https://example.com/task.json")).toThrow();
    expect(() => resolveArtifactURI("ipfs://../secret")).toThrow();
  });
});
