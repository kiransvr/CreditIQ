-- CreditIQ Lite
-- Migration 004: add recommendation fields generated during validation

ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS recommended_decision VARCHAR(64),
ADD COLUMN IF NOT EXISTS recommended_amount NUMERIC(14, 2),
ADD COLUMN IF NOT EXISTS recommendation_reasons JSONB;
