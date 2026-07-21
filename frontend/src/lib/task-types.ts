import type { Address, Hex } from "viem";

export type TaskDataSource = "indexer" | "rpc";

export interface ChainTask {
  creator: Address;
  exists: boolean;
  id: bigint;
  metadataHash: Hex;
  metadataURI: string;
  resultHash: Hex;
  resultURI: string;
  reward: bigint;
  source: TaskDataSource;
  status: number;
  worker: Address;
}

export interface ProtocolOverview {
  blockNumber: bigint;
  indexedThroughBlock?: bigint;
  lagBlocks?: bigint;
  latestTaskId: bigint;
  nextTaskId: bigint;
  source: TaskDataSource;
  totalEscrowed: bigint;
  version: string;
}
