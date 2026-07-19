import type { Address } from "viem";

export type TaskRole = "creator" | "participant" | "worker";

export function getTaskRole(
  account: Address | undefined,
  creator: Address,
  worker: Address,
): TaskRole {
  if (!account) return "participant";

  const normalized = account.toLowerCase();
  if (normalized === creator.toLowerCase()) return "creator";
  if (
    worker !== "0x0000000000000000000000000000000000000000" &&
    normalized === worker.toLowerCase()
  ) {
    return "worker";
  }
  return "participant";
}

export function getTaskRoleLabel(role: TaskRole): string {
  switch (role) {
    case "creator":
      return "Creator";
    case "worker":
      return "Assigned worker";
    case "participant":
      return "Participant";
  }
}
