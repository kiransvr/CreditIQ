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
- No remaining engineering items for the two critical client updates; rollout and UAT compliance evidence still pending.

## 2026-06-12 - Golden Dataset Scoring Tests Completed

### What was implemented
- Added deterministic golden dataset tests for recommendation scoring internals covering F1-F6 feature extraction and policy-path behavior.
- Added reproducibility baseline assertion for weighted score output on a fixed input dataset.

### Files changed
- apps/api/src/services/recommendation.ts
- apps/api/src/services/recommendation.golden.test.ts

### Verification
- API golden test suite passed:
  - npx vitest run src/services/recommendation.golden.test.ts

## 2026-06-12 - Inflation/Devaluation Recalibration Completed

### What was implemented
- Added effective-dated market adjustment factor support for recommendation scoring.
- Added migration-backed config table for factor history (`score_market_adjustment_factors`) with seed data.
- Applied recalibration factor to post-quality raw score to produce adjusted score.
- Added explanation traceability output for:
  - factor source
  - effective date window
  - inflation and devaluation percentages
  - raw score before adjustment
  - adjusted score after recalibration
- Added golden tests asserting recalibration behavior and explanation traceability.

### Files changed
- apps/api/src/services/marketAdjustment.ts
- apps/api/src/services/recommendation.ts
- apps/api/src/services/recommendation.golden.test.ts
- apps/api/src/routes/uploads.ts
- apps/api/src/services/uploadRepository.ts
- apps/api/src/services/report.ts
- apps/api/db/migrations/008_add_score_market_adjustment_factors.sql
- packages/contracts/src/index.ts

### Verification
- API golden tests passed:
  - npx vitest run src/services/recommendation.golden.test.ts
- API package build passed:
  - npm run build --workspace @creditiq/api
- Monorepo build passed:
  - npm run build --workspaces --if-present
