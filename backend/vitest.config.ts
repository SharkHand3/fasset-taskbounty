import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations"),
  );
  return {
    plugins: [
      cloudflareTest({
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
        wrangler: { configPath: "./wrangler.jsonc" },
      }),
    ],
    test: {
      coverage: { enabled: false },
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
