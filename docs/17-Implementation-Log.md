# Implementation Log (When and What)

## 2026-06-11 - Critical Compliance Patch

### What was implemented
- Added prohibited feature hard-block assertion before scoring in upload validation flow.
- Added fairness audit API endpoints:
  - POST /api/v1/fairness/audits
  - GET /api/v1/fairness/audits
- Added FAIRNESS_AUDIT persistence migration (007_add_fairness_audit.sql).
- Added structured policy violation error handling for loud failures.
- Added regression tests for:
  - prohibited feature rejection
  - fairness audit persistence and retrieval

### Files changed (high level)
- apps/api/src/services/policyGuard.ts
- apps/api/src/routes/uploads.ts
- apps/api/src/errors/policyViolation.ts
- apps/api/src/middleware/errorHandler.ts
- apps/api/src/services/fairnessAudit.ts
- apps/api/src/services/fairnessAuditRepository.ts
- apps/api/src/routes/fairness.ts
- apps/api/src/app.ts
- apps/api/db/migrations/007_add_fairness_audit.sql
- apps/api/src/routes/fairness.test.ts
- apps/api/src/routes/uploads.test.ts

### Verification
- Build: passed (npm run build)
- API test environment: existing repository-level test discovery/config mismatch remains and is tracked.

## 2026-06-11 - Scoring Model Alignment Work (In Progress)

### What was started
- Refactored recommendation engine toward six-group weighted model structure:
  - Account Stability (25%)
  - Balance Behaviour (22%)
  - Deposit Regularity (20%)
  - Repayment History (18%)
  - Spending Patterns (10%)
  - Overdraft Exposure (5%)
- Added feature construction helpers for F1-F6 style inputs with fallback fields.
- Updated explanation payload to show weighted group contributions.

### File changed
- apps/api/src/services/recommendation.ts

### Next steps
- Complete exact formula parity for all F1-F6 calculation rules.
- Add golden dataset tests for score reproducibility.
- Wire inflation/devaluation recalibration factor after scoring parity.

## 2026-06-11 - High Priority Scoring Update Completed

### What was implemented
- Completed high-priority expansion of scoring pipeline to include explicit F1-F6 feature computation paths.
- Added deterministic helpers for:
  - F2 monthly closing balance normalization for dormant months.
  - F3 12-month linear regression slope calculation.
  - F4 deposit CV calculation with rule-based 999 assignment for insufficient deposit months.
  - F5 on-time repayment rate computation using installments due/on-time when provided, and neutral treatment when no prior loans.
  - F6 unauthorized overdraft day/times/depth derivation from explicit metrics or daily balances fallback.
- Kept backward compatibility with existing payloads via fallback aliases and defaults.

### File changed
- apps/api/src/services/recommendation.ts

### Verification
- Build: passed (npm run build at repo root).

### Remaining
- Add golden dataset tests that lock expected outputs for each F1-F6 formula case.
- Add inflation/devaluation recalibration factor and adjusted-score traceability output.
