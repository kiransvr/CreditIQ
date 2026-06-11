# Database Migrations

This folder contains SQL migrations for CreditIQ Lite.

## Current baseline

- 001_initial_schema.sql
- 002_add_upload_file_content.sql
- 003_add_upload_override_fields.sql
- 004_add_recommendation_fields.sql
- 005_add_score_risk_fields.sql
- 006_add_recommendation_explanation.sql
- 007_add_fairness_audit.sql

## Apply manually (PostgreSQL)

1. Ensure target database exists.
2. Run:

psql "$DATABASE_URL" -f apps/api/db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f apps/api/db/migrations/002_add_upload_file_content.sql
psql "$DATABASE_URL" -f apps/api/db/migrations/003_add_upload_override_fields.sql
psql "$DATABASE_URL" -f apps/api/db/migrations/004_add_recommendation_fields.sql
psql "$DATABASE_URL" -f apps/api/db/migrations/005_add_score_risk_fields.sql
psql "$DATABASE_URL" -f apps/api/db/migrations/006_add_recommendation_explanation.sql
psql "$DATABASE_URL" -f apps/api/db/migrations/007_add_fairness_audit.sql

## Notes

- Migration engine integration can be added in Sprint 2.
- Keep all future migrations append-only and numbered.
