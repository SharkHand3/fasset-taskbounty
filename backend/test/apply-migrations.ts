import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";

import type { AppEnv } from "../src/types";

const testEnv = env as unknown as AppEnv & { TEST_MIGRATIONS: D1Migration[] };
await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
