import { describe, expect, it } from "vitest";

import { integrationParticipants } from "../config/deployments";
import {
  canOpenApprovalWallet,
  exactApprovalAmount,
  getApprovalIntentKey,
  getApprovalReadiness,
  getApprovalReadinessMessage,
} from "./approval-flow";

const readyInput = {
  allowance: 0n,
  balance: 8_000_000n,
  hasReadError: false,
  isConnected: true,
  networkState: "coston2" as const,
  role: "task-1-creator" as const,
};

describe("approval flow", () => {
  it("uses an exact one-token amount at six decimals", () => {
    expect(exactApprovalAmount).toBe(1_000_000n);
  });

  it("opens the wallet only after every pre-signing gate passes", () => {
    const readyGate = {
      gasEstimateSucceeded: true,
      hasSubmission: false,
      readiness: "ready" as const,
      reviewed: true,
      simulationPassed: true,
      writePending: false,
    };

    expect(canOpenApprovalWallet(readyGate)).toBe(true);
    expect(
      canOpenApprovalWallet({ ...readyGate, gasEstimateSucceeded: false }),
    ).toBe(false);
    expect(canOpenApprovalWallet({ ...readyGate, hasSubmission: true })).toBe(
      false,
    );
    expect(canOpenApprovalWallet({ ...readyGate, reviewed: false })).toBe(false);
    expect(
      canOpenApprovalWallet({ ...readyGate, simulationPassed: false }),
    ).toBe(false);
    expect(canOpenApprovalWallet({ ...readyGate, writePending: true })).toBe(
      false,
    );
  });

  it("requires connection, Coston2, and the Creator role", () => {
    expect(getApprovalReadiness({ ...readyInput, isConnected: false })).toBe(
      "disconnected",
    );
    expect(
      getApprovalReadiness({
        ...readyInput,
        networkState: "wrong-network",
      }),
    ).toBe("wrong-network");
    expect(
      getApprovalReadiness({ ...readyInput, role: "task-1-worker" }),
    ).toBe("wrong-role");
  });

  it("waits for public reads and rejects an insufficient balance", () => {
    expect(getApprovalReadiness({ ...readyInput, allowance: undefined })).toBe(
      "reading-chain-state",
    );
    expect(getApprovalReadiness({ ...readyInput, balance: undefined })).toBe(
      "reading-chain-state",
    );
    expect(
      getApprovalReadiness({
        ...readyInput,
        balance: exactApprovalAmount - 1n,
      }),
    ).toBe("insufficient-balance");
  });

  it("stops when either public chain-state read fails", () => {
    expect(getApprovalReadiness({ ...readyInput, hasReadError: true })).toBe(
      "chain-read-error",
    );
  });

  it("distinguishes a ready approval from an already exact allowance", () => {
    expect(getApprovalReadiness(readyInput)).toBe("ready");
    expect(
      getApprovalReadiness({
        ...readyInput,
        allowance: exactApprovalAmount,
      }),
    ).toBe("allowance-satisfied");
  });

  it("changes the simulation intent when account, chain, or allowance changes", () => {
    const base = getApprovalIntentKey(
      integrationParticipants.creator,
      114,
      0n,
    );
    expect(base).not.toBe(
      getApprovalIntentKey(integrationParticipants.worker, 114, 0n),
    );
    expect(base).not.toBe(
      getApprovalIntentKey(integrationParticipants.creator, 1, 0n),
    );
    expect(base).not.toBe(
      getApprovalIntentKey(integrationParticipants.creator, 114, 1n),
    );
  });

  it("returns an explicit explanation for every guarded state", () => {
    const states = [
      "allowance-satisfied",
      "chain-read-error",
      "disconnected",
      "insufficient-balance",
      "reading-chain-state",
      "ready",
      "wrong-network",
      "wrong-role",
    ] as const;

    for (const state of states) {
      expect(getApprovalReadinessMessage(state).length).toBeGreaterThan(20);
    }
  });
});
