# Client Update Implementation Plan (Critical + Next)

Date: 2026-06-11
Owner: Engineering Lead
Status: Draft for execution

## 1. Scope

This plan addresses:
- Critical-1: Fairness audit gate before deployment and FAIRNESS_AUDIT logging.
- Critical-2: Prohibited-feature hard block with fail-loud assertion.
- Follow-on alignment: scoring pipeline migration to the 6-group weighted model and exact feature-calculation rules.

## 2. Changes Implemented Now (Critical)

### 2.1 Database
- Added migration: apps/api/db/migrations/007_add_fairness_audit.sql
- New table: fairness_audit
  - id
  - retraining_run_id
  - model_version
  - threshold_percent
  - overall_status (pass/fail)
  - reweighting_required
  - result_json
  - created_at

### 2.2 API Contracts
- Added POST /api/v1/fairness/audits
  - Runs fairness audit on scored applicants grouped by:
    - Gender: Male vs Female
    - Location: Urban vs Rural
    - Age: Under 30 vs 30+
  - Controls comparison by balanceProfile + depositBehaviorProfile
  - Applies threshold: 8%
  - Sets reweightingRequired = true when threshold exceeded
  - Persists result to FAIRNESS_AUDIT table
- Added GET /api/v1/fairness/audits
  - Returns audit log entries for regulator/internal audit requests

### 2.3 Scoring Pipeline Protection
- Added prohibited-feature assertion in validation flow before scoring/recommendation.
- Fails loudly with code PROHIBITED_FEATURE_PRESENT if any prohibited field appears in feature vector.
- Prohibited classes blocked:
  - Gender
  - Religion
  - Ethnicity
  - Tribe/Clan
  - Political affiliation
  - Marital status
  - Number of children
  - Disability status
  - HIV status

### 2.4 Tests
- Added API test: fairness audit persistence + reweighting trigger on >8% gap.
- Added API test: fairness audit retrieval for auditor role.
- Added API test: prohibited-feature payload rejection.

## 3. Remaining Work (Required to Fully Match Updated Requirement)

### 3.1 Scoring Engine Redesign (6 groups)
Implement exact weighted groups:
- Account Stability: 25%
- Balance Behaviour: 22%
- Deposit Regularity: 20%
- Repayment History: 18%
- Spending Patterns: 10%
- Overdraft Exposure: 5%

### 3.2 Exact Feature Calculations (F1-F6)
Implement deterministic calculations:
- F1 tenure_days
- F2 monthly closing balance average (6M)
- F3 12M balance slope via linear regression
- F4 deposit coefficient of variation
- F5 on-time repayment rate with no-prior-loan neutral logic
- F6 unauthorized overdraft days

### 3.3 Inflation/Devaluation Recalibration
- Add market adjustment factor module (inflation/devaluation).
- Add config table and effective-dated factor history.
- Add explanation output showing adjusted vs raw score.

## 4. Rollout Gates (Must Pass)

### Gate A: Data and Schema Gate
- Migration 007 applied in all environments.
- FAIRNESS_AUDIT table queryable by auditor role.
- Migration 008 applied in all environments.
- SCORE_MARKET_ADJUSTMENT_FACTORS table queryable with an active effective-dated factor.

### Gate B: Fairness Gate
- Audit executed for each retraining run.
- No deployment when overallStatus=fail.
- Reweighting ticket auto-generated when fail.

### Gate C: Feature-Safety Gate
- Any prohibited field causes hard fail.
- CI includes prohibited-feature regression test.

### Gate D: Scoring Fidelity Gate
- Golden dataset confirms exact F1-F6 outputs and group-weighted score.
- Score remains constrained 0-1000.

### Gate E: UAT and Compliance Gate
- UAT scenarios pass.
- NBE export/readout sample approved.

## 5. Effort Estimate

- Completed now (Critical implementation): 1.5 to 2.0 engineer-days
- Remaining scoring redesign and feature math: 5 to 7 engineer-days
- Inflation/devaluation adjustment + config + tests: 2 to 3 engineer-days
- UAT hardening and compliance evidence pack: 2 to 3 engineer-days

Total remaining after current critical patch: 9 to 13 engineer-days

## 6. Sprint Split Proposal

### Sprint 5 (Current)
- Done:
  - Fairness audit API and persistence
  - Prohibited-feature hard assertion
  - Regression tests for both
  - Golden dataset tests for deterministic F1-F6 and score reproducibility
  - Inflation/devaluation recalibration module with adjusted-score traceability output
- In-progress:
  - Environment migration rollout for 007
  - Environment migration rollout for 008
  - API contract publication update

### Sprint 6 (Next)
- Scoring engine migration to 6-group weighted framework
- Exact F1-F6 feature calculation implementation
- Dataset-level verification and snapshot tests

### Sprint 7
- Inflation/devaluation recalibration module
- Governance dashboards/report exports for regulator request format
- Full compliance sign-off and go-live gate rehearsal

## 7. Risks and Controls

- Risk: Input source lacks fields required for F1-F6.
  - Control: data contract revision + fallback policies + missing-data scoring rules.
- Risk: Historical data quality affects fairness conclusions.
  - Control: minimum sample criteria per profile pair before pass/fail decision.
- Risk: Schema migration drift between environments.
  - Control: migration verification checklist in deployment pipeline.
