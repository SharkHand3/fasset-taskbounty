import { describe, expect, it } from "vitest";

import {
  canSendReviewedTransaction,
  parseContentHash,
  parseRewardInput,
} from "./task-publishing";

describe("parseRewardInput", () => {
  it("converts a display amount into six-decimal token units", () => {
    expect(parseRewardInput("1.25")).toBe(1_250_000n);
    expect(parseRewardInput("0.000001")).toBe(1n);
  });

  it("rejects zero, negative, excessive precision, and malformed values", () => {
    expect(parseRewardInput("0")).toBeNull();
    expect(parseRewardInput("-1")).toBeNull();
    expect(parseRewardInput("1.0000001")).toBeNull();
    expect(parseRewardInput("one")).toBeNull();
    expect(parseRewardInput(`${2n ** 256n}`)).toBeNull();
  });
});

describe("parseContentHash", () => {
  it("accepts exactly 32 bytes", () => {
    expect(parseContentHash(`0x${"ab".repeat(32)}`)).toBe(
      `0x${"ab".repeat(32)}`,
    );
    expect(parseContentHash(`0x${"ab".repeat(31)}`)).toBeNull();
  });
});

describe("canSendReviewedTransaction", () => {
  it("requires simulation, gas estimate, and explicit review", () => {
    expect(
      canSendReviewedTransaction({
        gasReady: true,
        hasSubmission: false,
        reviewed: true,
        simulationReady: true,
        writePending: false,
      }),
    ).toBe(true);
  });

  it("locks after a transaction has been submitted", () => {
    expect(
      canSendReviewedTransaction({
        gasReady: true,
        hasSubmission: true,
        reviewed: true,
        simulationReady: true,
        writePending: false,
      }),
    ).toBe(false);
  });
});
