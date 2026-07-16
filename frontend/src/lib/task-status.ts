export const taskStatusLabels = [
  "Open",
  "In progress",
  "Submitted",
  "Completed",
  "Cancelled",
] as const;

export function getTaskStatusLabel(status: number): string {
  return taskStatusLabels[status] ?? `Unknown (${status})`;
}
