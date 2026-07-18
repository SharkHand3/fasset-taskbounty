import type { Address } from "viem";

import { integrationParticipants } from "../config/deployments";
import { coston2 } from "../config/network";

export type WalletRole =
  | "task-1-creator"
  | "task-1-worker"
  | "new-participant";

export type WalletNetworkState = "coston2" | "disconnected" | "wrong-network";

export function getWalletRole(address: Address | undefined): WalletRole {
  if (!address) return "new-participant";

  const normalizedAddress = address.toLowerCase();
  if (normalizedAddress === integrationParticipants.creator.toLowerCase()) {
    return "task-1-creator";
  }
  if (normalizedAddress === integrationParticipants.worker.toLowerCase()) {
    return "task-1-worker";
  }
  return "new-participant";
}

export function getWalletRoleLabel(role: WalletRole): string {
  switch (role) {
    case "task-1-creator":
      return "Task #1 Creator";
    case "task-1-worker":
      return "Task #1 Worker";
    case "new-participant":
      return "New testnet participant";
  }
}

export function getWalletNetworkState(
  chainId: number | undefined,
): WalletNetworkState {
  if (chainId === undefined) return "disconnected";
  return chainId === coston2.id ? "coston2" : "wrong-network";
}

export function shortenAddress(address: Address): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}
