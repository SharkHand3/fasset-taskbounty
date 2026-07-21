import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchIndexedProtocol,
  fetchIndexedTask,
  fetchIndexedTasks,
} from "./task-api";

const apiUrl = "https://api.example";
const contract = "0x26281308BE46D9b499579CC8776615C69f29826F";
const creator = "0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D";
const hash = `0x${"11".repeat(32)}`;
const zeroHash = `0x${"00".repeat(32)}`;

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function task(id = "1") {
  return {
    creator,
    id,
    metadataHash: hash,
    metadataURI: "ipfs://task",
    resultHash: zeroHash,
    resultURI: "",
    rewardRaw: "1000000",
    status: { code: 0, label: "Open" },
    worker: "0x0000000000000000000000000000000000000000",
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("TaskBounty read API client", () => {
  it("validates and maps a protocol snapshot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          chainId: 114,
          contract,
          contractVersion: "2.0.0",
          latestTaskId: "1",
          nextTaskId: "2",
          snapshotBlock: 33000000,
          sync: { indexedThroughBlock: 33000000, lagBlocks: 0 },
          totalEscrowedRaw: "0",
        }),
      ),
    );
    const result = await fetchIndexedProtocol(apiUrl);
    expect(result).toMatchObject({
      blockNumber: 33000000n,
      latestTaskId: 1n,
      source: "indexer",
      totalEscrowed: 0n,
    });
  });

  it("maps precision-safe task fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(task())));
    const result = await fetchIndexedTask(apiUrl, 1n);
    expect(result).toMatchObject({
      creator,
      id: 1n,
      reward: 1000000n,
      source: "indexer",
      worker: "0x0000000000000000000000000000000000000000",
    });
  });

  it("maps a paginated task list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ items: [task("2"), task("1")] })),
    );
    expect((await fetchIndexedTasks(apiUrl, 24)).map((item) => item.id)).toEqual([
      2n,
      1n,
    ]);
  });

  it("rejects a mismatched deployment and malformed hashes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          chainId: 114,
          contract: creator,
          contractVersion: "2.0.0",
          latestTaskId: "1",
          nextTaskId: "2",
          snapshotBlock: 1,
          sync: { indexedThroughBlock: 1, lagBlocks: 0 },
          totalEscrowedRaw: "0",
        }),
      ),
    );
    await expect(fetchIndexedProtocol(apiUrl)).rejects.toThrow(
      "does not match",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ ...task(), metadataHash: "0x12" })),
    );
    await expect(fetchIndexedTask(apiUrl, 1n)).rejects.toThrow(
      "metadata hash",
    );
  });

  it("rejects a response for a different task ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(task("2"))));
    await expect(fetchIndexedTask(apiUrl, 1n)).rejects.toThrow(
      "different task ID",
    );
  });
});
