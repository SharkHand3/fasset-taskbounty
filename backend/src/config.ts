import { getAddress, type Address } from "viem";

import type { AppEnv } from "./types";

export interface RuntimeConfig {
  allowedOrigins: Set<string>;
  artifactMaxBytes: number;
  artifactTimeoutMs: number;
  chainId: number;
  contractAddress: Address;
  contractVersion: string;
  explorerApiUrl: string;
  finalityConfirmations: number;
  logChunkSize: number;
  maxChunksPerRun: number;
  rewardTokenAddress: Address;
  rewardTokenDecimals: number;
  rewardTokenSymbol: string;
  rpcUrl: string;
  startBlock: number;
}

function integerInRange(
  value: string,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an integer.`);
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new Error(`${name} is outside the supported range.`);
  }
  return parsed;
}

export function getRuntimeConfig(env: AppEnv): RuntimeConfig {
  const rpcUrl = new URL(env.RPC_URL);
  if (rpcUrl.protocol !== "https:") throw new Error("RPC_URL must use HTTPS.");
  const explorerApiUrl = new URL(env.EXPLORER_API_URL);
  if (
    explorerApiUrl.protocol !== "https:" ||
    explorerApiUrl.hostname !== "coston2-explorer.flare.network"
  ) {
    throw new Error("EXPLORER_API_URL must use the Coston2 HTTPS explorer.");
  }

  const allowedOrigins = new Set(
    env.ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  if (allowedOrigins.size === 0) {
    throw new Error("ALLOWED_ORIGINS must contain at least one origin.");
  }
  for (const origin of allowedOrigins) {
    const parsed = new URL(origin);
    if (
      parsed.origin !== origin ||
      (parsed.protocol !== "https:" &&
        parsed.hostname !== "localhost" &&
        parsed.hostname !== "127.0.0.1")
    ) {
      throw new Error("ALLOWED_ORIGINS contains an invalid origin.");
    }
  }
  if (!env.CONTRACT_VERSION.trim() || !env.REWARD_TOKEN_SYMBOL.trim()) {
    throw new Error("Contract version and reward token symbol are required.");
  }

  return {
    allowedOrigins,
    artifactMaxBytes: integerInRange(
      env.ARTIFACT_MAX_BYTES,
      "ARTIFACT_MAX_BYTES",
      1,
      1_048_576,
    ),
    artifactTimeoutMs: integerInRange(
      env.ARTIFACT_TIMEOUT_MS,
      "ARTIFACT_TIMEOUT_MS",
      1,
      30_000,
    ),
    chainId: integerInRange(env.CHAIN_ID, "CHAIN_ID", 1, 2_147_483_647),
    contractAddress: getAddress(env.TASK_BOUNTY_ADDRESS),
    contractVersion: env.CONTRACT_VERSION,
    explorerApiUrl: explorerApiUrl.toString(),
    finalityConfirmations: integerInRange(
      env.FINALITY_CONFIRMATIONS,
      "FINALITY_CONFIRMATIONS",
      0,
      10_000,
    ),
    logChunkSize: integerInRange(
      env.LOG_CHUNK_SIZE,
      "LOG_CHUNK_SIZE",
      1,
      10_000,
    ),
    maxChunksPerRun: integerInRange(
      env.MAX_CHUNKS_PER_RUN,
      "MAX_CHUNKS_PER_RUN",
      1,
      8,
    ),
    rewardTokenAddress: getAddress(env.REWARD_TOKEN_ADDRESS),
    rewardTokenDecimals: integerInRange(
      env.REWARD_TOKEN_DECIMALS,
      "REWARD_TOKEN_DECIMALS",
      0,
      255,
    ),
    rewardTokenSymbol: env.REWARD_TOKEN_SYMBOL.trim(),
    rpcUrl: rpcUrl.toString(),
    startBlock: integerInRange(
      env.START_BLOCK,
      "START_BLOCK",
      0,
      Number.MAX_SAFE_INTEGER,
    ),
  };
}
