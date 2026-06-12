# Sprint 5 Evidence

## Gate A Schema Verification Evidence

### Migration Inventory Check
- Command: `npm run db:migrations:list --workspace @creditiq/api`
- Expected includes:
	- `007_add_fairness_audit.sql`
	- `008_add_score_market_adjustment_factors.sql`
- Evidence:
	- [ ] CLI output attached (dev)
	- [ ] CLI output attached (uat)

### Database Verification Queries (Run Per Environment)
- `SELECT to_regclass('public.fairness_audit') AS fairness_audit_table;`
- `SELECT to_regclass('public.score_market_adjustment_factors') AS market_adjustment_table;`
- `SELECT COUNT(*) AS active_factors
	 FROM score_market_adjustment_factors
	 WHERE effective_from <= NOW()
		 AND (effective_to IS NULL OR effective_to >= NOW());`

### Expected Results
- `fairness_audit_table` is not null
- `market_adjustment_table` is not null
- `active_factors >= 1`

### Environment Sign-off
- Dev:
	- [ ] Migration 007 verified
	- [ ] Migration 008 verified
	- [ ] Verified by:
	- [ ] Date:
- UAT:
	- [ ] Migration 007 verified
	- [ ] Migration 008 verified
	- [ ] Verified by:
	- [ ] Date:
- Production:
	- [ ] Migration 007 verified
	- [ ] Migration 008 verified
	- [ ] Verified by:
	- [ ] Date:

## Gate D Scoring Fidelity Evidence

### Golden Dataset Test Execution
- Command: `npx vitest run src/services/recommendation.golden.test.ts`
- Run from: `apps/api`
- Expected:
	- Test file passes
	- Assertions cover deterministic F1-F6 extraction and weighted score reproducibility
	- Recalibration traceability assertion passes (raw score vs adjusted score)
- Evidence:
	- [x] Test output attached (timestamp)
	- [x] Pass count recorded
	- Result: 1 test file passed, 4 tests passed on 2026-06-12

### Score Range Integrity Check
- Command (workspace build sanity): `npm run build --workspaces --if-present`
- Expected:
	- Build passes for API, web, and contracts
	- No scoring service compile/type errors
- Evidence:
	- [x] Build output attached
	- [x] Verified by: GitHub Copilot session verification
	- [x] Date: 2026-06-12

### Portfolio-Level Rule Validation
- Validate and record with at least one UAT dataset sample:
	- [ ] Returned score remains within `0-1000`
	- [ ] Risk category mapping aligns to thresholds:
		- `>= 750` -> low
		- `620-749` -> medium
		- `450-619` -> high
		- `< 450` -> very_high
	- [ ] Explanation includes weighted signals and score trend
	- [ ] Explanation includes market adjustment details (factor, inflation/devaluation, raw vs adjusted)

### Gate D Sign-off
- [x] Gate D passed in Dev
- [ ] Gate D passed in UAT
- [ ] Sign-off owner (Risk Lead):
- [ ] Sign-off owner (Engineering Lead):
- [ ] Date: 

## Gate E UAT and Compliance Evidence

### UAT Functional Scenario Checklist
- [ ] Login and role context works for target SME roles
- [ ] Upload CSV/XLSX succeeds
- [ ] Validation diagnostics rendered correctly
- [ ] Recommendation output generated with explanation
- [ ] Override flow works for authorized role
- [ ] Report download succeeds
- [ ] Audit visibility confirmed

### UAT Quality Exit Criteria
- [ ] No open critical defects
- [ ] No open high defects without approved waiver
- [ ] UAT sign-off completed by business owner
- [ ] Requirement traceability updated

### Compliance/Regulatory Evidence (NBE Readout)
- [ ] Sample output includes score, risk category, and recommendation rationale
- [ ] Fairness audit endpoints verified and records retrievable
- [ ] Prohibited feature hard-block evidence attached
- [ ] Market recalibration evidence attached (effective factor and score trace)
- [ ] Evidence package reviewed by Risk + Compliance

### Gate E Sign-off
- [ ] Gate E passed in UAT
- [ ] Go/No-Go decision recorded
- [ ] Sign-off owner (QA Lead):
- [ ] Sign-off owner (Product Owner):
- [ ] Sign-off owner (Risk/Compliance):
- [ ] Date:

## UAT Evidence
- (Attach UAT execution output and results)

## Defect Closure Evidence
- (Attach defect closure reports)

## Demo Evidence
- (Attach demo recording/screenshots/notes)

## Freeze Compliance Evidence
- (Attach freeze exception log and approval records)
