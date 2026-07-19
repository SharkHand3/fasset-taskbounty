import type { TaskRole } from "./task-role";

export type TaskAction = "accept" | "approve" | "cancel" | "submit";

export function getAvailableTaskAction(
  status: number,
  role: TaskRole,
  isConnected: boolean,
): TaskAction | null {
  if (!isConnected) return null;
  if (status === 0) return role === "creator" ? "cancel" : "accept";
  if (status === 1 && role === "worker") return "submit";
  if (status === 2 && role === "creator") return "approve";
  return null;
}
