import { env } from "cloudflare:workers";

import { getRuntimeConfig } from "../src/config";
import { ensureDeployment } from "../src/database";
import type { AppEnv } from "../src/types";

export const testEnv = env as unknown as AppEnv;
export const testConfig = getRuntimeConfig(testEnv);

export async function clearDatabase(): Promise<void> {
  await testEnv.DB.batch([
    testEnv.DB.prepare("DELETE FROM indexed_events"),
    testEnv.DB.prepare("DELETE FROM artifact_checks"),
    testEnv.DB.prepare("DELETE FROM tasks"),
    testEnv.DB.prepare("DELETE FROM protocol_state"),
    testEnv.DB.prepare("DELETE FROM sync_runs"),
    testEnv.DB.prepare("DELETE FROM sync_state"),
    testEnv.DB.prepare("DELETE FROM deployments"),
  ]);
  await ensureDeployment(testEnv.DB, testConfig, "2026-07-21T00:00:00.000Z");
}

export async function seedCompletedTask(): Promise<void> {
  const deployment = testConfig.contractAddress.toLowerCase();
  await testEnv.DB.batch([
    testEnv.DB
      .prepare(
        `INSERT INTO tasks
          (chain_id, deployment_address, task_id, creator, worker, reward_raw,
           metadata_uri, metadata_hash, result_uri, result_hash, status,
           created_block, created_tx_hash, accepted_block, accepted_tx_hash,
           submitted_block, submitted_tx_hash, completed_block,
           completed_tx_hash, updated_block)
         VALUES (?, ?, 1, ?, ?, '1000000', ?, ?, ?, ?, 3, 100, ?, 101, ?,
           102, ?, 103, ?, 103)`,
      )
      .bind(
        testConfig.chainId,
        deployment,
        "0x43bb96f5bc968a5878c54fdcb6d599d2cccf6a2d",
        "0x149e8a5bdf5fddec7ca1163aefc0bbff91c9dcad",
        "ipfs://bafy-task",
        `0x${"11".repeat(32)}`,
        "ipfs://bafy-result",
        `0x${"22".repeat(32)}`,
        `0x${"a1".repeat(32)}`,
        `0x${"a2".repeat(32)}`,
        `0x${"a3".repeat(32)}`,
        `0x${"a4".repeat(32)}`,
      ),
    testEnv.DB
      .prepare(
        `INSERT INTO artifact_checks
          (chain_id, deployment_address, task_id, kind, uri, expected_hash,
           actual_hash, verified, byte_length, title, description, checked_at)
         VALUES (?, ?, 1, 'metadata', ?, ?, ?, 1, 321, ?, ?, ?)`,
      )
      .bind(
        testConfig.chainId,
        deployment,
        "ipfs://bafy-task",
        `0x${"11".repeat(32)}`,
        `0x${"11".repeat(32)}`,
        "Indexed task",
        "Indexed description",
        "2026-07-21T00:01:00.000Z",
      ),
    testEnv.DB
      .prepare(
        `INSERT INTO artifact_checks
          (chain_id, deployment_address, task_id, kind, uri, expected_hash,
           actual_hash, verified, byte_length, checked_at)
         VALUES (?, ?, 1, 'result', ?, ?, ?, 1, 456, ?)`,
      )
      .bind(
        testConfig.chainId,
        deployment,
        "ipfs://bafy-result",
        `0x${"22".repeat(32)}`,
        `0x${"22".repeat(32)}`,
        "2026-07-21T00:02:00.000Z",
      ),
    testEnv.DB
      .prepare(
        `INSERT INTO protocol_state
          (chain_id, deployment_address, snapshot_block, contract_version,
           next_task_id, total_escrowed, updated_at)
         VALUES (?, ?, 200, '2.0.0', '2', '0', ?)`,
      )
      .bind(testConfig.chainId, deployment, "2026-07-21T00:03:00.000Z"),
    testEnv.DB
      .prepare(
        `UPDATE sync_state SET last_scanned_block = 200, chain_head_block = 212,
           finalized_block = 200, last_synced_at = ?
         WHERE chain_id = ? AND deployment_address = ?`,
      )
      .bind(
        "2026-07-21T00:03:00.000Z",
        testConfig.chainId,
        deployment,
      ),
    testEnv.DB
      .prepare(
        `INSERT INTO indexed_events
          (chain_id, deployment_address, transaction_hash, log_index,
           block_number, block_hash, event_name, task_id, actor, payload_json,
           indexed_at)
         VALUES (?, ?, ?, 0, 100, ?, 'TaskCreated', 1, ?, '{}', ?)`,
      )
      .bind(
        testConfig.chainId,
        deployment,
        `0x${"a1".repeat(32)}`,
        `0x${"b1".repeat(32)}`,
        "0x43bb96f5bc968a5878c54fdcb6d599d2cccf6a2d",
        "2026-07-21T00:03:00.000Z",
      ),
  ]);
}
