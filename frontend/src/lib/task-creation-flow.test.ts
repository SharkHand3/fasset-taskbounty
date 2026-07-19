import { describe, expect, it } from "vitest";

import { integrationParticipants } from "../config/deployments";
import { task2Manifest } from "../config/task-2";
import {
  canOpenTaskCreationWallet,
  getTaskCreationIntentKey,
  getTaskCreationReadiness,
  getTaskCreationReadinessMessage,
} from "./task-creation-flow";

const readyInput = {
  allowance: task2Manifest.reward,
  balance: 8_000_000n,
  expectedTaskId: task2Manifest.expectedTaskId,
  hasReadError: false,
  isConnected: true,
  manifestState: "verified" as const,
  networkState: "coston2" as const,
  nextTaskId: task2Manifest.expectedTaskId,
  reward: task2Manifest.reward,
  role: "task-1-creator" as const,
  totalEscrowed: 0n,
};

describe("task creation flow", () => {
  it("requires the exact reward allowance and sufficient balance", () => {
    expect(getTaskCreationReadiness(readyInput)).toBe("ready");
    expect(
      getTaskCreationReadiness({ ...readyInput, allowance: 999_999n }),
    ).toBe("allowance-required");
    expect(
      getTaskCreationReadiness({ ...readyInput, allowance: 1_000_001n }),
    ).toBe("allowance-excessive");
    expect(
      getTaskCreationReadiness({ ...readyInput, balance: 999_999n }),
    ).toBe("insufficient-balance");
  });

  it("requires Creator, Coston2, successful reads, and the exact baseline", () => {
    expect(
      getTaskCreationReadiness({ ...readyInput, isConnected: false }),
    ).toBe("disconnected");
    expect(
      getTaskCreationReadiness({
        ...readyInput,
        networkState: "wrong-network",
      }),
    ).toBe("wrong-network");
    expect(
      getTaskCreationReadiness({ ...readyInput, role: "task-1-worker" }),
    ).toBe("wrong-role");
    expect(
      getTaskCreationReadiness({ ...readyInput, hasReadError: true }),
    ).toBe("chain-read-error");
    expect(
      getTaskCreationReadiness({ ...readyInput, nextTaskId: undefined }),
    ).toBe("reading-chain-state");
    expect(
      getTaskCreationReadiness({ ...readyInput, nextTaskId: 1n }),
    ).toBe("unexpected-task-id");
    expect(
      getTaskCreationReadiness({ ...readyInput, totalEscrowed: 1n }),
    ).toBe("unexpected-escrow");
  });

  it("locks the one-shot control after Task #2 exists", () => {
    expect(
      getTaskCreationReadiness({ ...readyInput, nextTaskId: 3n }),
    ).toBe("task-created");
  });

  it("blocks signing until the pinned manifest bytes are verified", () => {
    expect(
      getTaskCreationReadiness({ ...readyInput, manifestState: "checking" }),
    ).toBe("manifest-checking");
    expect(
      getTaskCreationReadiness({ ...readyInput, manifestState: "unavailable" }),
    ).toBe("manifest-unavailable");
    expect(
      getTaskCreationReadiness({ ...readyInput, manifestState: "mismatch" }),
    ).toBe("manifest-mismatch");
  });

  it("opens MetaMask only after every createTask gate passes", () => {
    const gate = {
      gasEstimateSucceeded: true,
      hasSubmission: false,
      readiness: "ready" as const,
      reviewed: true,
      simulationPassed: true,
      writePending: false,
    };

    expect(canOpenTaskCreationWallet(gate)).toBe(true);
    expect(
      canOpenTaskCreationWallet({ ...gate, gasEstimateSucceeded: false }),
    ).toBe(false);
    expect(
      canOpenTaskCreationWallet({ ...gate, hasSubmission: true }),
    ).toBe(false);
    expect(canOpenTaskCreationWallet({ ...gate, reviewed: false })).toBe(false);
    expect(
      canOpenTaskCreationWallet({ ...gate, simulationPassed: false }),
    ).toBe(false);
    expect(
      canOpenTaskCreationWallet({ ...gate, writePending: true }),
    ).toBe(false);
  });

  it("invalidates an old review when any material chain input changes", () => {
    const base = getTaskCreationIntentKey(
      integrationParticipants.creator,
      114,
      1_000_000n,
      8_000_000n,
      2n,
      0n,
      task2Manifest.hash,
    );

    expect(base).not.toBe(
      getTaskCreationIntentKey(
        integrationParticipants.worker,
        114,
        1_000_000n,
        8_000_000n,
        2n,
        0n,
        task2Manifest.hash,
      ),
    );
    expect(base).not.toBe(
      getTaskCreationIntentKey(
        integrationParticipants.creator,
        114,
        0n,
        8_000_000n,
        2n,
        0n,
        task2Manifest.hash,
      ),
    );
    expect(base).not.toBe(
      getTaskCreationIntentKey(
        integrationParticipants.creator,
        114,
        1_000_000n,
        8_000_000n,
        3n,
        1_000_000n,
        task2Manifest.hash,
      ),
    );
  });

  it("has an explicit explanation for every guarded state", () => {
    const states = [
      "allowance-excessive",
      "allowance-required",
      "chain-read-error",
      "disconnected",
      "insufficient-balance",
      "manifest-checking",
      "manifest-mismatch",
      "manifest-unavailable",
      "reading-chain-state",
      "ready",
      "task-created",
      "unexpected-escrow",
      "unexpected-task-id",
      "wrong-network",
      "wrong-role",
    ] as const;

    for (const state of states) {
      expect(getTaskCreationReadinessMessage(state).length).toBeGreaterThan(20);
    }
  });
});
