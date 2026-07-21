import { describe, expect, it } from "vitest";

import {
  readBoundedBytes,
  resolveArtifactUri,
  resolveSafeRedirect,
} from "../src/artifact";

describe("artifact boundary", () => {
  it("resolves only supported immutable URI forms", () => {
    expect(resolveArtifactUri("ipfs://bafy123/path.json")).toBe(
      "https://ipfs.io/ipfs/bafy123/path.json",
    );
    expect(resolveArtifactUri(`ar://${"a".repeat(43)}`)).toBe(
      `https://arweave.net/${"a".repeat(43)}`,
    );
    expect(
      resolveArtifactUri(
        `https://raw.githubusercontent.com/acme/repo/${"a".repeat(40)}/task.json`,
      ),
    ).toContain("raw.githubusercontent.com");
    expect(() => resolveArtifactUri("https://example.com/task.json")).toThrow(
      "Artifact URI",
    );
  });

  it("prevents redirects from escaping the artifact host allowlist", () => {
    expect(
      resolveSafeRedirect(
        "https://ipfs.io/ipfs/bafy123",
        "/ipfs/bafy456",
      ),
    ).toBe("https://ipfs.io/ipfs/bafy456");
    expect(() =>
      resolveSafeRedirect(
        "https://ipfs.io/ipfs/bafy123",
        "https://private.example/artifact",
      ),
    ).toThrow("not allowlisted");
  });

  it("rejects declared and streamed responses over the byte limit", async () => {
    const declared = new Response("small", {
      headers: { "content-length": "100" },
    });
    await expect(readBoundedBytes(declared, 10)).rejects.toThrow("byte limit");

    const streamed = new Response(new Uint8Array(11));
    await expect(readBoundedBytes(streamed, 10)).rejects.toThrow("byte limit");
  });

  it("returns exact response bytes within the limit", async () => {
    const bytes = await readBoundedBytes(new Response("hello"), 5);
    expect(new TextDecoder().decode(bytes)).toBe("hello");
  });
});
