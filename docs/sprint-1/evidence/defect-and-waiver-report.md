# Sprint 1 Defect and Waiver Report

## 1. Snapshot

- Date: 2026-05-26
- Scope: Sprint 1 (upload, validation, RBAC baseline, report export)
- Source of evidence:
  - [lint-output.txt](lint-output.txt)
  - [test-output.txt](test-output.txt)
  - [build-output.txt](build-output.txt)

## 2. Defect Summary

| Severity | Open | Closed in Sprint | Notes |
|---|---:|---:|---|
| Critical | 0 | 0 | No critical defects reported in current sprint evidence |
| High | 0 | 0 | No high defects reported in current sprint evidence |
| Medium | 0 | 0 | No medium defects formally logged in this artifact |
| Low | 0 | 0 | No low defects formally logged in this artifact |

## 3. Known Risk Notes (Non-Blocking for Sprint 1)

1. Dependency risk remains for xlsx package with no upstream fix currently available.
2. Parser hardening has been applied to reduce exploitability risk for malicious keys.
3. Planned mitigation in Sprint 2: replace xlsx with a maintained parser alternative.

## 4. Waiver Register

| Waiver ID | Item | Severity | Owner | Expiry | Status | Reason |
|---|---|---|---|---|---|---|
| WVR-S1-001 | xlsx dependency vulnerability pending package replacement | High | Engineering Lead | Sprint 2 end | Requested | No upstream patch available; mitigation and replacement planned |

## 5. Sign-Off

| Role | Name | Decision | Date | Comments |
|---|---|---|---|---|
| QA Lead |  | Pending |  | Confirm defect snapshot and waiver recommendation |
| Product Owner |  | Pending |  | Approve non-blocking waiver for carry-forward |
| Engineering Lead |  | Pending |  | Commit to Sprint 2 replacement task |
