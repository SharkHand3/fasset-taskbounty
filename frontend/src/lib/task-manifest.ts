import {
  activeDeployment,
  rewardTokenAddress,
  rewardTokenDecimals,
  rewardTokenSymbol,
} from "../config/deployments";
import { coston2 } from "../config/network";

export interface TaskManifestView {
  acceptanceCriteria: string[];
  deliverables: string[];
  description: string;
  network?: {
    chainId: number;
    name?: string;
  };
  reward?: {
    decimals: number;
    rawAmount: string;
    token: string;
    tokenAddress?: string;
  };
  schemaVersion: string;
  taskBounty?: {
    address: string;
    version: string;
  };
  title: string;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export function parseTaskManifest(value: unknown): TaskManifestView {
  if (!value || typeof value !== "object") {
    throw new Error("Task manifest must be a JSON object.");
  }

  const record = value as Record<string, unknown>;
  if (typeof record.title !== "string" || record.title.trim().length === 0) {
    throw new Error("Task manifest requires a non-empty title.");
  }
  if (
    typeof record.description !== "string" ||
    record.description.trim().length === 0
  ) {
    throw new Error("Task manifest requires a non-empty description.");
  }

  const manifest: TaskManifestView = {
    acceptanceCriteria: stringArray(record.acceptanceCriteria),
    deliverables: stringArray(record.deliverables),
    description: record.description.trim(),
    schemaVersion:
      typeof record.schemaVersion === "string" ? record.schemaVersion : "unknown",
    title: record.title.trim(),
  };

  if (record.reward && typeof record.reward === "object") {
    const reward = record.reward as Record<string, unknown>;
    if (
      typeof reward.token === "string" &&
      typeof reward.rawAmount === "string" &&
      typeof reward.decimals === "number"
    ) {
      manifest.reward = {
        decimals: reward.decimals,
        rawAmount: reward.rawAmount,
        token: reward.token,
        tokenAddress:
          typeof reward.tokenAddress === "string" ? reward.tokenAddress : undefined,
      };
    }
  }

  if (record.network && typeof record.network === "object") {
    const network = record.network as Record<string, unknown>;
    if (typeof network.chainId === "number") {
      manifest.network = {
        chainId: network.chainId,
        name: typeof network.name === "string" ? network.name : undefined,
      };
    }
  }

  if (record.taskBounty && typeof record.taskBounty === "object") {
    const taskBounty = record.taskBounty as Record<string, unknown>;
    if (
      typeof taskBounty.address === "string" &&
      typeof taskBounty.version === "string"
    ) {
      manifest.taskBounty = {
        address: taskBounty.address,
        version: taskBounty.version,
      };
    }
  }

  return manifest;
}

export function getManifestPublishingError(
  manifest: TaskManifestView,
  expectedReward: bigint,
): string | null {
  if (manifest.schemaVersion !== "2.0") return "Manifest schemaVersion must be 2.0.";
  if (!manifest.reward) return "Manifest reward details are missing.";
  if (manifest.reward.token !== rewardTokenSymbol) {
    return `Manifest reward token must be ${rewardTokenSymbol}.`;
  }
  if (manifest.reward.tokenAddress?.toLowerCase() !== rewardTokenAddress.toLowerCase()) {
    return "Manifest reward token address does not match the configured FTestXRP contract.";
  }
  if (manifest.reward.decimals !== rewardTokenDecimals) {
    return `Manifest reward decimals must be ${rewardTokenDecimals}.`;
  }
  if (!/^(0|[1-9]\d*)$/.test(manifest.reward.rawAmount)) {
    return "Manifest reward rawAmount must be a canonical integer string.";
  }
  if (manifest.reward.rawAmount.length > 78) {
    return "Manifest reward rawAmount exceeds uint256 precision.";
  }
  if (BigInt(manifest.reward.rawAmount) !== expectedReward) {
    return "Manifest reward does not match the transaction reward.";
  }
  if (manifest.network?.chainId !== coston2.id) {
    return `Manifest network must be Coston2 chainId ${coston2.id}.`;
  }
  if (
    !manifest.taskBounty ||
    manifest.taskBounty.address.toLowerCase() !== activeDeployment.address.toLowerCase()
  ) {
    return "Manifest TaskBounty address does not match the active deployment.";
  }
  if (manifest.taskBounty.version !== activeDeployment.contractVersion) {
    return "Manifest TaskBounty version does not match the active deployment.";
  }
  return null;
}

export function createTaskManifestDraft(input: {
  acceptanceCriteria: string[];
  deliverables: string[];
  description: string;
  reward: string;
  title: string;
}): string {
  return `${JSON.stringify(
    {
      schemaVersion: "2.0",
      title: input.title.trim(),
      description: input.description.trim(),
      deliverables: input.deliverables.map((item) => item.trim()).filter(Boolean),
      acceptanceCriteria: input.acceptanceCriteria
        .map((item) => item.trim())
        .filter(Boolean),
      reward: {
        token: rewardTokenSymbol,
        tokenAddress: rewardTokenAddress,
        rawAmount: input.reward,
        decimals: rewardTokenDecimals,
      },
      network: {
        name: coston2.name,
        chainId: coston2.id,
      },
      taskBounty: {
        address: activeDeployment.address,
        version: activeDeployment.contractVersion,
      },
    },
    null,
    2,
  )}\n`;
}
