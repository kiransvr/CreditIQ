-- CreditIQ Lite
-- Migration 005: add score and risk category fields for recommendation output

ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS recommended_score INTEGER,
ADD COLUMN IF NOT EXISTS recommended_risk_category VARCHAR(32);
