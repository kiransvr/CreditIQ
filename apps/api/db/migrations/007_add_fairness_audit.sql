-- CreditIQ Lite
-- Migration 007: add fairness audit persistence table

CREATE TABLE IF NOT EXISTS fairness_audit (
  id UUID PRIMARY KEY,
  retraining_run_id VARCHAR(120) NOT NULL,
  model_version VARCHAR(80) NOT NULL,
  threshold_percent NUMERIC(5,2) NOT NULL,
  overall_status VARCHAR(8) NOT NULL,
  reweighting_required BOOLEAN NOT NULL,
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fairness_audit_status_check CHECK (overall_status IN ('pass', 'fail'))
);

CREATE INDEX IF NOT EXISTS idx_fairness_audit_created_at ON fairness_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fairness_audit_run ON fairness_audit (retraining_run_id, model_version);
