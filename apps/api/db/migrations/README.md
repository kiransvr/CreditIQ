# Database Migrations

This folder contains SQL migrations for CreditIQ Lite.

## Current baseline

- 001_initial_schema.sql
- 002_add_upload_file_content.sql

## Apply manually (PostgreSQL)

1. Ensure target database exists.
2. Run:

psql "$DATABASE_URL" -f apps/api/db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f apps/api/db/migrations/002_add_upload_file_content.sql

## Notes

- Migration engine integration can be added in Sprint 2.
- Keep all future migrations append-only and numbered.
