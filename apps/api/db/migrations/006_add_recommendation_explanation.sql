-- CreditIQ Lite
-- Migration 006: add structured recommendation explanation payload

ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS recommendation_explanation JSONB;
