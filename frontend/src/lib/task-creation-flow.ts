import type { Address, Hex } from "viem";

import type {
  WalletNetworkState,
  WalletRole,
} from "./wallet-identity";

export type ManifestVerificationState =
  | "checking"
  | "mismatch"
  | "unavailable"
  | "verified";

export type TaskCreationReadiness =
  | "allowance-excessive"
  | "allowance-required"
  | "chain-read-error"
  | "disconnected"
  | "insufficient-balance"
  | "manifest-checking"
  | "manifest-mismatch"
  | "manifest-unavailable"
  | "reading-chain-state"
  | "ready"
  | "task-created"
  | "unexpected-escrow"
  | "unexpected-task-id"
  | "wrong-network"
  | "wrong-role";

export interface TaskCreationReadinessInput {
  allowance: bigint | undefined;
  balance: bigint | undefined;
  expectedTaskId: bigint;
  hasReadError: boolean;
  isConnected: boolean;
  manifestState: ManifestVerificationState;
  networkState: WalletNetworkState;
  nextTaskId: bigint | undefined;
  reward: bigint;
  role: WalletRole;
  totalEscrowed: bigint | undefined;
}

export interface TaskCreationWalletGateInput {
  gasEstimateSucceeded: boolean;
  hasSubmission: boolean;
  readiness: TaskCreationReadiness;
  reviewed: boolean;
  simulationPassed: boolean;
  writePending: boolean;
}

export function canOpenTaskCreationWallet({
  gasEstimateSucceeded,
  hasSubmission,
  readiness,
  reviewed,
  simulationPassed,
  writePending,
}: TaskCreationWalletGateInput): boolean {
  return (
    readiness === "ready" &&
    simulationPassed &&
    gasEstimateSucceeded &&
    reviewed &&
    !writePending &&
    !hasSubmission
  );
}

export function getTaskCreationReadiness({
  allowance,
  balance,
  expectedTaskId,
  hasReadError,
  isConnected,
  manifestState,
  networkState,
  nextTaskId,
  reward,
  role,
  totalEscrowed,
}: TaskCreationReadinessInput): TaskCreationReadiness {
  if (!isConnected) return "disconnected";
  if (networkState !== "coston2") return "wrong-network";
  if (role !== "task-1-creator") return "wrong-role";
  if (hasReadError) return "chain-read-error";
  if (
    allowance === undefined ||
    balance === undefined ||
    nextTaskId === undefined ||
    totalEscrowed === undefined
  ) {
    return "reading-chain-state";
  }
  if (nextTaskId > expectedTaskId) return "task-created";
  if (nextTaskId < expectedTaskId) return "unexpected-task-id";
  if (totalEscrowed !== 0n) return "unexpected-escrow";
  if (manifestState === "checking") return "manifest-checking";
  if (manifestState === "unavailable") return "manifest-unavailable";
  if (manifestState === "mismatch") return "manifest-mismatch";
  if (balance < reward) return "insufficient-balance";
  if (allowance < reward) return "allowance-required";
  if (allowance > reward) return "allowance-excessive";
  return "ready";
}

export function getTaskCreationReadinessMessage(
  readiness: TaskCreationReadiness,
): string {
  switch (readiness) {
    case "allowance-excessive":
      return "The current allowance is larger than the exact Task #2 reward. This guarded demo will not use an over-broad allowance.";
    case "allowance-required":
      return "TaskBounty V2 needs an exact 1 FTestXRP allowance before Task #2 can be simulated.";
    case "chain-read-error":
      return "A required Coston2 state read failed. Retry after the public RPC recovers.";
    case "disconnected":
      return "Connect the dedicated Creator test wallet first.";
    case "insufficient-balance":
      return "The Creator needs at least 1 FTestXRP to fund the new escrow.";
    case "manifest-checking":
      return "Retrieving the version-pinned Task #2 manifest and recomputing its Keccak-256 hash.";
    case "manifest-mismatch":
      return "The retrieved manifest bytes do not match the configured on-chain commitment. Signing is blocked.";
    case "manifest-unavailable":
      return "The version-pinned Task #2 manifest could not be retrieved. Signing is blocked.";
    case "reading-chain-state":
      return "Reading allowance, balance, nextTaskId, and totalEscrowed from Coston2.";
    case "ready":
      return "All public guards passed. Simulate createTask before opening MetaMask.";
    case "task-created":
      return "Task #2 has already been created. This one-shot control is now locked.";
    case "unexpected-escrow":
      return "The live escrow liability is not the zero-value baseline expected by this integration step.";
    case "unexpected-task-id":
      return "The live nextTaskId is behind the expected Task #2 baseline.";
    case "wrong-network":
      return "Switch the connected wallet to Coston2 (chainId 114).";
    case "wrong-role":
      return "Select the dedicated Creator account; Worker and unrelated accounts cannot create this integration task.";
  }
}

export function getTaskCreationIntentKey(
  account: Address,
  chainId: number | undefined,
  allowance: bigint | undefined,
  balance: bigint | undefined,
  nextTaskId: bigint | undefined,
  totalEscrowed: bigint | undefined,
  metadataHash: Hex,
): string {
  return [
    account.toLowerCase(),
    chainId ?? "none",
    allowance?.toString() ?? "loading",
    balance?.toString() ?? "loading",
    nextTaskId?.toString() ?? "loading",
    totalEscrowed?.toString() ?? "loading",
    metadataHash.toLowerCase(),
  ].join(":");
}
