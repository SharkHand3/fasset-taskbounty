import assert from "node:assert/strict";

import { createPublicClient, http } from "viem";

const defaults = {
  apiUrl: "https://fasset-taskbounty-api.zyf291436865.workers.dev",
  chainId: 114,
  contract: "0x26281308BE46D9b499579CC8776615C69f29826F",
  rpcUrl: "https://coston2-api.flare.network/ext/C/rpc",
  taskId: 1n,
};

const apiUrl = (process.env.TASK_API_URL ?? defaults.apiUrl).replace(/\/$/, "");
const rpcUrl = process.env.COSTON2_RPC_URL ?? defaults.rpcUrl;
const taskId = BigInt(process.env.TASK_ID ?? defaults.taskId);

const abi = [
  {
    type: "function",
    name: "VERSION",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "nextTaskId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalEscrowed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getTask",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "worker", type: "address" },
          { name: "reward", type: "uint256" },
          { name: "metadataURI", type: "string" },
          { name: "metadataHash", type: "bytes32" },
          { name: "resultURI", type: "string" },
          { name: "resultHash", type: "bytes32" },
          { name: "status", type: "uint8" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
];

const client = createPublicClient({ transport: http(rpcUrl) });

function normalize(value) {
  return value.toLowerCase();
}

async function getJson(path) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  const payload = await response.json();
  assert.ok(payload && typeof payload === "object" && "data" in payload);
  return payload.data;
}

const [health, protocol, indexedTask] = await Promise.all([
  getJson("/v1/health"),
  getJson("/v1/protocol"),
  getJson(`/v1/tasks/${taskId}`),
]);

assert.equal(health.status, "healthy");
assert.equal(health.sync.lagBlocks, 0);
assert.equal(protocol.chainId, defaults.chainId);
assert.equal(normalize(protocol.contract), normalize(defaults.contract));

const snapshotBlock = BigInt(protocol.snapshotBlock);
const contractParameters = {
  address: defaults.contract,
  abi,
  blockNumber: snapshotBlock,
};

const [version, nextTaskId, totalEscrowed, onchainTask] = await Promise.all([
  client.readContract({ ...contractParameters, functionName: "VERSION" }),
  client.readContract({ ...contractParameters, functionName: "nextTaskId" }),
  client.readContract({ ...contractParameters, functionName: "totalEscrowed" }),
  client.readContract({
    ...contractParameters,
    functionName: "getTask",
    args: [taskId],
  }),
]);

assert.equal(protocol.contractVersion, version);
assert.equal(protocol.nextTaskId, nextTaskId.toString());
assert.equal(protocol.totalEscrowedRaw, totalEscrowed.toString());

assert.equal(indexedTask.id, taskId.toString());
assert.equal(normalize(indexedTask.creator), normalize(onchainTask.creator));
assert.equal(normalize(indexedTask.worker), normalize(onchainTask.worker));
assert.equal(indexedTask.rewardRaw, onchainTask.reward.toString());
assert.equal(indexedTask.metadataURI, onchainTask.metadataURI);
assert.equal(normalize(indexedTask.metadataHash), normalize(onchainTask.metadataHash));
assert.equal(indexedTask.resultURI, onchainTask.resultURI);
assert.equal(normalize(indexedTask.resultHash), normalize(onchainTask.resultHash));
assert.equal(indexedTask.status.code, onchainTask.status);
assert.equal(onchainTask.exists, true);

assert.equal(indexedTask.artifacts.metadata.verified, true);
assert.equal(
  normalize(indexedTask.artifacts.metadata.actualHash),
  normalize(indexedTask.artifacts.metadata.expectedHash),
);
assert.equal(indexedTask.artifacts.result.verified, true);
assert.equal(
  normalize(indexedTask.artifacts.result.actualHash),
  normalize(indexedTask.artifacts.result.expectedHash),
);

console.log(
  JSON.stringify(
    {
      result: "PASS",
      comparedAtSnapshotBlock: protocol.snapshotBlock,
      indexedThroughBlock: health.sync.indexedThroughBlock,
      contractVersion: version,
      nextTaskId: nextTaskId.toString(),
      task: {
        creator: onchainTask.creator,
        id: taskId.toString(),
        rewardRaw: onchainTask.reward.toString(),
        status: indexedTask.status.label,
        worker: onchainTask.worker,
      },
      totalEscrowedRaw: totalEscrowed.toString(),
      artifactsVerified: true,
    },
    null,
    2,
  ),
);
