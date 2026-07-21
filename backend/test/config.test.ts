import { describe, expect, it } from "vitest";

import { getRuntimeConfig } from "../src/config";
import type { AppEnv } from "../src/types";
import { testEnv } from "./helpers";

function configured(overrides: Partial<AppEnv> = {}): AppEnv {
  return { ...testEnv, ...overrides };
}

describe("runtime configuration", () => {
  it("parses the bounded production configuration", () => {
    const config = getRuntimeConfig(configured());
    expect(config.chainId).toBe(114);
    expect(config.logChunkSize).toBe(10_000);
    expect(config.maxChunksPerRun).toBe(8);
  });

  it("rejects a zero-sized log range", () => {
    expect(() =>
      getRuntimeConfig(configured({ LOG_CHUNK_SIZE: "0" })),
    ).toThrow("LOG_CHUNK_SIZE is outside the supported range.");
  });

  it("rejects a non-HTTPS remote CORS origin", () => {
    expect(() =>
      getRuntimeConfig(configured({ ALLOWED_ORIGINS: "http://example.com" })),
    ).toThrow("ALLOWED_ORIGINS contains an invalid origin.");
  });
});
