PRAGMA foreign_keys = ON;

CREATE TABLE deployments (
  chain_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  reward_token_address TEXT NOT NULL,
  start_block INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (chain_id, address)
);

CREATE TABLE sync_state (
  chain_id INTEGER NOT NULL,
  deployment_address TEXT NOT NULL,
  last_scanned_block INTEGER NOT NULL,
  chain_head_block INTEGER NOT NULL,
  finalized_block INTEGER NOT NULL,
  last_synced_at TEXT,
  last_error TEXT,
  lock_token TEXT,
  lock_until TEXT,
  PRIMARY KEY (chain_id, deployment_address),
  FOREIGN KEY (chain_id, deployment_address)
    REFERENCES deployments (chain_id, address) ON DELETE CASCADE
);

CREATE TABLE protocol_state (
  chain_id INTEGER NOT NULL,
  deployment_address TEXT NOT NULL,
  snapshot_block INTEGER NOT NULL,
  contract_version TEXT NOT NULL,
  next_task_id TEXT NOT NULL,
  total_escrowed TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (chain_id, deployment_address),
  FOREIGN KEY (chain_id, deployment_address)
    REFERENCES deployments (chain_id, address) ON DELETE CASCADE
);

CREATE TABLE tasks (
  chain_id INTEGER NOT NULL,
  deployment_address TEXT NOT NULL,
  task_id INTEGER NOT NULL CHECK (task_id > 0),
  creator TEXT NOT NULL,
  worker TEXT NOT NULL,
  reward_raw TEXT NOT NULL,
  metadata_uri TEXT NOT NULL,
  metadata_hash TEXT NOT NULL,
  result_uri TEXT NOT NULL DEFAULT '',
  result_hash TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000000000000000000000000000',
  status INTEGER NOT NULL CHECK (status BETWEEN 0 AND 4),
  created_block INTEGER NOT NULL,
  created_tx_hash TEXT NOT NULL,
  accepted_block INTEGER,
  accepted_tx_hash TEXT,
  submitted_block INTEGER,
  submitted_tx_hash TEXT,
  completed_block INTEGER,
  completed_tx_hash TEXT,
  cancelled_block INTEGER,
  cancelled_tx_hash TEXT,
  updated_block INTEGER NOT NULL,
  PRIMARY KEY (chain_id, deployment_address, task_id),
  FOREIGN KEY (chain_id, deployment_address)
    REFERENCES deployments (chain_id, address) ON DELETE CASCADE
);

CREATE INDEX tasks_status_id_idx
  ON tasks (chain_id, deployment_address, status, task_id DESC);
CREATE INDEX tasks_creator_id_idx
  ON tasks (chain_id, deployment_address, creator, task_id DESC);
CREATE INDEX tasks_worker_id_idx
  ON tasks (chain_id, deployment_address, worker, task_id DESC);

CREATE TABLE indexed_events (
  chain_id INTEGER NOT NULL,
  deployment_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  block_hash TEXT NOT NULL,
  event_name TEXT NOT NULL,
  task_id INTEGER NOT NULL,
  actor TEXT,
  payload_json TEXT NOT NULL,
  indexed_at TEXT NOT NULL,
  PRIMARY KEY (chain_id, deployment_address, transaction_hash, log_index),
  FOREIGN KEY (chain_id, deployment_address, task_id)
    REFERENCES tasks (chain_id, deployment_address, task_id) ON DELETE CASCADE
);

CREATE INDEX indexed_events_task_idx
  ON indexed_events (chain_id, deployment_address, task_id, block_number, log_index);

CREATE TABLE artifact_checks (
  chain_id INTEGER NOT NULL,
  deployment_address TEXT NOT NULL,
  task_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('metadata', 'result')),
  uri TEXT NOT NULL,
  expected_hash TEXT NOT NULL,
  actual_hash TEXT,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  byte_length INTEGER,
  title TEXT,
  description TEXT,
  checked_at TEXT,
  error TEXT,
  PRIMARY KEY (chain_id, deployment_address, task_id, kind),
  FOREIGN KEY (chain_id, deployment_address, task_id)
    REFERENCES tasks (chain_id, deployment_address, task_id) ON DELETE CASCADE
);

CREATE INDEX artifact_checks_retry_idx
  ON artifact_checks (verified, checked_at);

CREATE TABLE sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  deployment_address TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  from_block INTEGER NOT NULL,
  to_block INTEGER NOT NULL,
  events_seen INTEGER NOT NULL DEFAULT 0,
  events_added INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  error TEXT
);

CREATE INDEX sync_runs_deployment_idx
  ON sync_runs (chain_id, deployment_address, id DESC);
