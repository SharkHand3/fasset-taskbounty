import type { Address } from "viem";

import { rewardTokenDecimals } from "../config/deployments";
import type {
  WalletNetworkState,
  WalletRole,
} from "./wallet-identity";

export const exactApprovalAmount = 10n ** BigInt(rewardTokenDecimals);

export type ApprovalReadiness =
  | "allowance-satisfied"
  | "chain-read-error"
  | "disconnected"
  | "insufficient-balance"
  | "reading-chain-state"
  | "ready"
  | "wrong-network"
  | "wrong-role";

export interface ApprovalReadinessInput {
  allowance: bigint | undefined;
  balance: bigint | undefined;
  hasReadError: boolean;
  isConnected: boolean;
  networkState: WalletNetworkState;
  role: WalletRole;
}

export function getApprovalReadiness({
  allowance,
  balance,
  hasReadError,
  isConnected,
  networkState,
  role,
}: ApprovalReadinessInput): ApprovalReadiness {
  if (!isConnected) return "disconnected";
  if (networkState !== "coston2") return "wrong-network";
  if (role !== "task-1-creator") return "wrong-role";
  if (hasReadError) return "chain-read-error";
  if (allowance === undefined || balance === undefined) {
    return "reading-chain-state";
  }
  if (allowance === exactApprovalAmount) return "allowance-satisfied";
  if (balance < exactApprovalAmount) return "insufficient-balance";
  return "ready";
}

export function getApprovalReadinessMessage(
  readiness: ApprovalReadiness,
): string {
  switch (readiness) {
    case "allowance-satisfied":
      return "The exact 1 FTestXRP allowance is already confirmed on Coston2.";
    case "chain-read-error":
      return "The Coston2 balance or allowance read failed. Retry after the public RPC recovers.";
    case "disconnected":
      return "Connect the dedicated Creator test wallet first.";
    case "insufficient-balance":
      return "The Creator needs at least 1 FTestXRP before this approval can be prepared.";
    case "reading-chain-state":
      return "Reading the Creator balance and current allowance from Coston2.";
    case "ready":
      return "All guards passed. Run the public-RPC simulation before opening MetaMask.";
    case "wrong-network":
      return "Switch the connected wallet to Coston2 (chainId 114).";
    case "wrong-role":
      return "Select the dedicated Task #1 Creator account; Worker and unrelated accounts cannot use this control.";
  }
}

export function getApprovalIntentKey(
  account: Address,
  chainId: number | undefined,
  currentAllowance: bigint | undefined,
): string {
  return `${account.toLowerCase()}:${chainId ?? "none"}:${
    currentAllowance?.toString() ?? "loading"
  }:${exactApprovalAmount.toString()}`;
}
