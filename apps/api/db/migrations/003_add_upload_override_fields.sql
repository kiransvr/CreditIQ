-- CreditIQ Lite
-- Migration 003: add manual override fields for upload decisions

ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS override_decision VARCHAR(64),
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS overridden_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ;
