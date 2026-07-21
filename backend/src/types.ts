import type { Address, Hex } from "viem";

export interface AppEnv {
  ALLOWED_ORIGINS: string;
  ARTIFACT_MAX_BYTES: string;
  ARTIFACT_TIMEOUT_MS: string;
  CHAIN_ID: string;
  CONTRACT_VERSION: string;
  DB: D1Database;
  EXPLORER_API_URL: string;
  FINALITY_CONFIRMATIONS: string;
  LOG_CHUNK_SIZE: string;
  MAX_CHUNKS_PER_RUN: string;
  REWARD_TOKEN_ADDRESS: Address;
  REWARD_TOKEN_DECIMALS: string;
  REWARD_TOKEN_SYMBOL: string;
  RPC_URL: string;
  START_BLOCK: string;
  TASK_BOUNTY_ADDRESS: Address;
}

export type LifecycleEventName =
  | "TaskAccepted"
  | "TaskCancelled"
  | "TaskCompleted"
  | "TaskCreated"
  | "WorkSubmitted";

export interface IndexedLifecycleEvent {
  actor: Address | null;
  blockHash: Hex;
  blockNumber: number;
  eventName: LifecycleEventName;
  logIndex: number;
  payload: Record<string, string>;
  taskId: number;
  transactionHash: Hex;
}

export interface SyncResult {
  eventsAdded: number;
  eventsSeen: number;
  fromBlock: number;
  status: "completed" | "skipped";
  toBlock: number;
}

export interface ArtifactCheckResult {
  actualHash: Hex;
  byteLength: number;
  description: string | null;
  title: string | null;
  verified: boolean;
}
