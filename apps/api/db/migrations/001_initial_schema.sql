-- CreditIQ Lite initial schema
-- Sprint 1 baseline migration

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY,
  institution_code VARCHAR(64) NOT NULL UNIQUE,
  institution_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  username VARCHAR(120) NOT NULL UNIQUE,
  role_code VARCHAR(64) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(32) NOT NULL,
  template_version VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uploads_status_check CHECK (status IN ('received', 'validating', 'validated', 'failed'))
);

CREATE TABLE IF NOT EXISTS upload_rows (
  id UUID PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES uploads(id),
  row_number INTEGER NOT NULL,
  raw_payload_json JSONB NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (upload_id, row_number)
);

CREATE TABLE IF NOT EXISTS validation_issues (
  id UUID PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES uploads(id),
  row_number INTEGER NOT NULL,
  field_name VARCHAR(120) NOT NULL,
  issue_type VARCHAR(16) NOT NULL,
  issue_code VARCHAR(80) NOT NULL,
  issue_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT validation_issue_type_check CHECK (issue_type IN ('error', 'warning'))
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  action_type VARCHAR(80) NOT NULL,
  object_type VARCHAR(80) NOT NULL,
  object_id VARCHAR(120) NOT NULL,
  metadata_json JSONB,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_institution_uploaded_at ON uploads (institution_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_issues_upload_issue_type ON validation_issues (upload_id, issue_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_object ON audit_events (object_type, object_id);
