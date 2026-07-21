import { isHex, maxUint256, parseUnits, type Address, type Hex } from "viem";

import { rewardTokenDecimals } from "../config/deployments";

export function parseRewardInput(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) return null;

  try {
    const reward = parseUnits(normalized, rewardTokenDecimals);
    return reward > 0n && reward <= maxUint256 ? reward : null;
  } catch {
    return null;
  }
}

export function parseContentHash(value: string): Hex | null {
  const normalized = value.trim();
  return isHex(normalized) && /^0x[0-9a-fA-F]{64}$/.test(normalized)
    ? normalized
    : null;
}

export function createPublishingIntentKey(input: {
  account: Address;
  allowance: bigint | undefined;
  chainId: number | undefined;
  metadataHash: Hex;
  metadataURI: string;
  nextTaskId: bigint | undefined;
  reward: bigint;
}): string {
  return [
    input.account.toLowerCase(),
    input.chainId ?? "none",
    input.allowance?.toString() ?? "loading",
    input.nextTaskId?.toString() ?? "loading",
    input.reward.toString(),
    input.metadataHash.toLowerCase(),
    input.metadataURI.trim(),
  ].join(":");
}

export function canSendReviewedTransaction(input: {
  gasReady: boolean;
  hasSubmission: boolean;
  reviewed: boolean;
  simulationReady: boolean;
  writePending: boolean;
}): boolean {
  return (
    input.simulationReady &&
    input.gasReady &&
    input.reviewed &&
    !input.writePending &&
    !input.hasSubmission
  );
}
