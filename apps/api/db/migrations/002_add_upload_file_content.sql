-- CreditIQ Lite
-- Migration 002: persist uploaded file content for parsing by upload id

ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS file_content BYTEA;
