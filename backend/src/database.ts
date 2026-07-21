import type { RuntimeConfig } from "./config";
import type { IndexedLifecycleEvent } from "./types";

const zeroAddress = "0x0000000000000000000000000000000000000000";
const zeroHash = `0x${"00".repeat(32)}`;

interface DeploymentRow {
  contract_version: string;
  reward_token_address: string;
  start_block: number;
}

export async function ensureDeployment(
  db: D1Database,
  config: RuntimeConfig,
  now: string,
): Promise<void> {
  const address = config.contractAddress.toLowerCase();
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO deployments
          (chain_id, address, contract_version, reward_token_address, start_block, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        config.chainId,
        address,
        config.contractVersion,
        config.rewardTokenAddress.toLowerCase(),
        config.startBlock,
        now,
      ),
    db
      .prepare(
        `INSERT OR IGNORE INTO sync_state
          (chain_id, deployment_address, last_scanned_block, chain_head_block, finalized_block)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        config.chainId,
        address,
        config.startBlock - 1,
        config.startBlock - 1,
        config.startBlock - 1,
      ),
  ]);

  const deployment = await db
    .prepare(
      `SELECT contract_version, reward_token_address, start_block
       FROM deployments WHERE chain_id = ? AND address = ?`,
    )
    .bind(config.chainId, address)
    .first<DeploymentRow>();
  if (
    !deployment ||
    deployment.contract_version !== config.contractVersion ||
    deployment.reward_token_address !== config.rewardTokenAddress.toLowerCase() ||
    deployment.start_block !== config.startBlock
  ) {
    throw new Error("Persisted deployment identity does not match runtime configuration.");
  }
}

export function eventStatements(
  db: D1Database,
  config: RuntimeConfig,
  event: IndexedLifecycleEvent,
  now: string,
): { eventStatementIndex: number; statements: D1PreparedStatement[] } {
  const deployment = config.contractAddress.toLowerCase();
  const common = [config.chainId, deployment, event.taskId];
  const statements: D1PreparedStatement[] = [];

  switch (event.eventName) {
    case "TaskCreated": {
      statements.push(
        db
          .prepare(
            `INSERT INTO tasks
              (chain_id, deployment_address, task_id, creator, worker, reward_raw,
               metadata_uri, metadata_hash, result_uri, result_hash, status,
               created_block, created_tx_hash, updated_block)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, 0, ?, ?, ?)
             ON CONFLICT(chain_id, deployment_address, task_id) DO UPDATE SET
               creator = excluded.creator,
               reward_raw = excluded.reward_raw,
               metadata_uri = excluded.metadata_uri,
               metadata_hash = excluded.metadata_hash,
               created_block = excluded.created_block,
               created_tx_hash = excluded.created_tx_hash`,
          )
          .bind(
            ...common,
            event.payload.creator,
            zeroAddress,
            event.payload.reward,
            event.payload.metadataURI,
            event.payload.metadataHash,
            zeroHash,
            event.blockNumber,
            event.transactionHash,
            event.blockNumber,
          ),
        db
          .prepare(
            `INSERT INTO artifact_checks
              (chain_id, deployment_address, task_id, kind, uri, expected_hash)
             VALUES (?, ?, ?, 'metadata', ?, ?)
             ON CONFLICT(chain_id, deployment_address, task_id, kind) DO UPDATE SET
               uri = excluded.uri,
               expected_hash = excluded.expected_hash,
               verified = CASE
                 WHEN artifact_checks.uri = excluded.uri
                  AND artifact_checks.expected_hash = excluded.expected_hash
                 THEN artifact_checks.verified ELSE 0 END,
               checked_at = CASE
                 WHEN artifact_checks.uri = excluded.uri
                  AND artifact_checks.expected_hash = excluded.expected_hash
                 THEN artifact_checks.checked_at ELSE NULL END`,
          )
          .bind(
            ...common,
            event.payload.metadataURI,
            event.payload.metadataHash,
          ),
      );
      break;
    }
    case "TaskAccepted": {
      statements.push(
        db
          .prepare(
            `UPDATE tasks SET worker = ?, status = 1, accepted_block = ?,
               accepted_tx_hash = ?, updated_block = MAX(updated_block, ?)
             WHERE chain_id = ? AND deployment_address = ? AND task_id = ?`,
          )
          .bind(
            event.payload.worker,
            event.blockNumber,
            event.transactionHash,
            event.blockNumber,
            ...common,
          ),
      );
      break;
    }
    case "WorkSubmitted": {
      statements.push(
        db
          .prepare(
            `UPDATE tasks SET result_uri = ?, result_hash = ?, status = 2,
               submitted_block = ?, submitted_tx_hash = ?,
               updated_block = MAX(updated_block, ?)
             WHERE chain_id = ? AND deployment_address = ? AND task_id = ?`,
          )
          .bind(
            event.payload.resultURI,
            event.payload.resultHash,
            event.blockNumber,
            event.transactionHash,
            event.blockNumber,
            ...common,
          ),
        db
          .prepare(
            `INSERT INTO artifact_checks
              (chain_id, deployment_address, task_id, kind, uri, expected_hash)
             VALUES (?, ?, ?, 'result', ?, ?)
             ON CONFLICT(chain_id, deployment_address, task_id, kind) DO UPDATE SET
               uri = excluded.uri,
               expected_hash = excluded.expected_hash,
               verified = CASE
                 WHEN artifact_checks.uri = excluded.uri
                  AND artifact_checks.expected_hash = excluded.expected_hash
                 THEN artifact_checks.verified ELSE 0 END,
               checked_at = CASE
                 WHEN artifact_checks.uri = excluded.uri
                  AND artifact_checks.expected_hash = excluded.expected_hash
                 THEN artifact_checks.checked_at ELSE NULL END`,
          )
          .bind(...common, event.payload.resultURI, event.payload.resultHash),
      );
      break;
    }
    case "TaskCompleted": {
      statements.push(
        db
          .prepare(
            `UPDATE tasks SET status = 3, completed_block = ?,
               completed_tx_hash = ?, updated_block = MAX(updated_block, ?)
             WHERE chain_id = ? AND deployment_address = ? AND task_id = ?`,
          )
          .bind(
            event.blockNumber,
            event.transactionHash,
            event.blockNumber,
            ...common,
          ),
      );
      break;
    }
    case "TaskCancelled": {
      statements.push(
        db
          .prepare(
            `UPDATE tasks SET status = 4, cancelled_block = ?,
               cancelled_tx_hash = ?, updated_block = MAX(updated_block, ?)
             WHERE chain_id = ? AND deployment_address = ? AND task_id = ?`,
          )
          .bind(
            event.blockNumber,
            event.transactionHash,
            event.blockNumber,
            ...common,
          ),
      );
      break;
    }
  }

  const eventStatementIndex = statements.length;
  statements.push(
    db
      .prepare(
        `INSERT OR IGNORE INTO indexed_events
          (chain_id, deployment_address, transaction_hash, log_index,
           block_number, block_hash, event_name, task_id, actor, payload_json,
           indexed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        config.chainId,
        deployment,
        event.transactionHash,
        event.logIndex,
        event.blockNumber,
        event.blockHash,
        event.eventName,
        event.taskId,
        event.actor,
        JSON.stringify(event.payload),
        now,
      ),
  );

  return { eventStatementIndex, statements };
}
