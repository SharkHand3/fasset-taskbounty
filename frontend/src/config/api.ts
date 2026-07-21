export const TASK_API_URL =
  process.env.NEXT_PUBLIC_TASK_API_URL?.replace(/\/$/, "") ||
  "https://fasset-taskbounty-api.zyf291436865.workers.dev";

export const TASK_API_TIMEOUT_MS = 4_000;
