import { handleApiRequest } from "./api";
import { syncDeployment } from "./indexer";
import type { AppEnv } from "./types";

export default {
  async fetch(request: Request, env: AppEnv): Promise<Response> {
    return handleApiRequest(request, env);
  },
  async scheduled(
    _controller: ScheduledController,
    env: AppEnv,
    context: ExecutionContext,
  ): Promise<void> {
    context.waitUntil(
      syncDeployment(env).catch((error: unknown) => {
        console.error("TaskBounty index sync failed", error);
      }),
    );
  },
} satisfies ExportedHandler<AppEnv>;
