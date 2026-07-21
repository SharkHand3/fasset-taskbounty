import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchIndexedProtocol: vi.fn(),
  fetchIndexedTask: vi.fn(),
  fetchIndexedTasks: vi.fn(),
  getBlockNumber: vi.fn(),
  readContract: vi.fn(),
}));

vi.mock("@/config/api", () => ({ TASK_API_URL: "https://api.example" }));
vi.mock("@/lib/task-api", () => ({
  fetchIndexedProtocol: mocks.fetchIndexedProtocol,
  fetchIndexedTask: mocks.fetchIndexedTask,
  fetchIndexedTasks: mocks.fetchIndexedTasks,
}));
vi.mock("@/lib/public-client", () => ({
  publicClient: {
    getBlockNumber: mocks.getBlockNumber,
    readContract: mocks.readContract,
  },
}));

import { readProtocolOverview, readRecentTasks, readTask } from "./task-reader";
import type { ChainTask, ProtocolOverview } from "./task-types";

const creator = "0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D";
const zeroAddress = "0x0000000000000000000000000000000000000000";
const zeroHash = `0x${"00".repeat(32)}` as const;

function indexedTask(): ChainTask {
  return {
    creator,
    exists: true,
    id: 1n,
    metadataHash: `0x${"11".repeat(32)}`,
    metadataURI: "ipfs://task",
    resultHash: zeroHash,
    resultURI: "",
    reward: 1000000n,
    source: "indexer",
    status: 0,
    worker: zeroAddress,
  };
}

function indexedOverview(): ProtocolOverview {
  return {
    blockNumber: 200n,
    indexedThroughBlock: 200n,
    lagBlocks: 0n,
    latestTaskId: 1n,
    nextTaskId: 2n,
    source: "indexer",
    totalEscrowed: 1000000n,
    version: "2.0.0",
  };
}

beforeEach(() => vi.clearAllMocks());

describe("API-first task reads", () => {
  it("uses the indexer for protocol and marketplace reads", async () => {
    mocks.fetchIndexedProtocol.mockResolvedValue(indexedOverview());
    mocks.fetchIndexedTasks.mockResolvedValue([indexedTask()]);
    const result = await readRecentTasks();
    expect(result.overview.source).toBe("indexer");
    expect(result.tasks[0]?.source).toBe("indexer");
    expect(mocks.readContract).not.toHaveBeenCalled();
  });

  it("falls back to public RPC when the indexer is unavailable", async () => {
    mocks.fetchIndexedProtocol.mockRejectedValue(new Error("offline"));
    mocks.getBlockNumber.mockResolvedValue(220n);
    mocks.readContract.mockImplementation(
      ({ functionName }: { functionName: string }) => {
        if (functionName === "VERSION") return Promise.resolve("2.0.0");
        if (functionName === "nextTaskId") return Promise.resolve(2n);
        if (functionName === "totalEscrowed") return Promise.resolve(0n);
        return Promise.reject(new Error("unexpected call"));
      },
    );
    const result = await readProtocolOverview();
    expect(result).toMatchObject({ blockNumber: 220n, source: "rpc" });
  });

  it("can force a fresh RPC task read after a write", async () => {
    mocks.readContract.mockResolvedValue({
      creator,
      exists: true,
      metadataHash: `0x${"11".repeat(32)}`,
      metadataURI: "ipfs://task",
      resultHash: zeroHash,
      resultURI: "",
      reward: 1000000n,
      status: 0,
      worker: zeroAddress,
    });
    const result = await readTask(1n, { preferRpc: true });
    expect(result.source).toBe("rpc");
    expect(mocks.fetchIndexedTask).not.toHaveBeenCalled();
  });
});
