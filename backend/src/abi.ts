import { parseAbi } from "viem";

const eventSignatures = [
  "event TaskCreated(uint256 indexed taskId, address indexed creator, bytes32 indexed metadataHash, uint256 reward, string metadataURI)",
  "event TaskAccepted(uint256 indexed taskId, address indexed worker)",
  "event WorkSubmitted(uint256 indexed taskId, address indexed worker, bytes32 indexed resultHash, string resultURI)",
  "event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 reward)",
  "event TaskCancelled(uint256 indexed taskId, address indexed creator, uint256 refund)",
] as const;

export const taskBountyEvents = parseAbi(eventSignatures);

export const taskBountyV2Abi = parseAbi([
  "function VERSION() view returns (string)",
  "function nextTaskId() view returns (uint256)",
  "function totalEscrowed() view returns (uint256)",
  ...eventSignatures,
]);
