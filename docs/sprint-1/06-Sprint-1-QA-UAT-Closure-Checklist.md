# Sprint 1 QA and UAT Closure Checklist

## 1. Purpose

This checklist is the execution artifact for Sprint 1 closure.
It maps Definition of Done and acceptance criteria to evidence, status, owners, and sign-off.

## 2. Current Snapshot

- Snapshot date: 2026-05-26
- Engineering health:
  - Lint: passing
  - Build: passing
  - API tests: passing
  - Web tests: passing
- Sprint closure state: In progress (evidence pack prepared, governance sign-off pending)

## 3. Definition of Done Tracking

| DoD Item | Status | Evidence | Owner | Notes |
|---|---|---|---|---|
| Code implemented and peer reviewed | Partial | Implemented features across API and web | Engineering Lead | PR links and reviewer approvals still to be attached |
| Unit tests added and passing | Done | [test-output.txt](evidence/test-output.txt) | Backend and Frontend Engineers | Latest automated run recorded |
| Integration tests for APIs passing | Done | [test-output.txt](evidence/test-output.txt) | Backend Engineer | Includes upload/validate/fetch/report flow |
| QA test cases executed for all P1 stories | Partial | [demo-execution-notes.md](evidence/demo-execution-notes.md) | QA Lead | Manual execution entries remain to be completed |
| No open critical defects | Partial | [defect-and-waiver-report.md](evidence/defect-and-waiver-report.md) | QA Lead | Confirm with tracker export before final sign-off |
| No open high defects without waiver | Partial | [defect-and-waiver-report.md](evidence/defect-and-waiver-report.md) | QA Lead and Product Owner | Waiver WVR-S1-001 pending approval |
| API contract and schema docs updated | Done | API contract and migration docs updated | Backend Engineer | Confirm final review by Product and QA |
| Audit logging validated for security-sensitive actions | Partial | Audit events implemented for upload, validate, override | Backend Engineer and QA Lead | Add validation evidence from DB query/log capture |
| Release notes prepared for sprint increment | Done | [sprint-1-release-notes.md](evidence/sprint-1-release-notes.md) | Product Owner | Ready for final approval |

## 4. Acceptance Checklist Tracking

### Functional

| Criteria | Status | Evidence | Gap |
|---|---|---|---|
| Upload supports CSV and XLSX | Done | Upload route and parser implemented | None |
| Mandatory validation works per configured fields | Done | Validation rules and passing tests | None |
| Format validation catches malformed data | Done | Validation rules and tests | Add QA screenshot evidence |
| Error and warning reporting is clear and traceable | Done | API response model and report CSV | Add QA artifact for traceability walkthrough |
| Re-upload path works for corrected data | Partial | Same workflow supports repeat uploads | Add explicit QA scenario evidence |

### Security

| Criteria | Status | Evidence | Gap |
|---|---|---|---|
| Auth required for upload endpoints | Done | Middleware auth checks and tests | None |
| Unauthorized roles blocked | Done | Role checks and unauthorized test coverage | None |
| Audit event generated for uploads and validations | Partial | Audit writes implemented in repository | QA validation evidence pending |

### Quality

| Criteria | Status | Evidence | Gap |
|---|---|---|---|
| Test evidence attached in sprint review | Done | [lint-output.txt](evidence/lint-output.txt), [test-output.txt](evidence/test-output.txt), [build-output.txt](evidence/build-output.txt) | None |
| Requirement mapping updated in traceability matrix | Partial | Traceability doc exists | Mapping update confirmation pending |
| Demo completed with product owner sign-off | Partial | [demo-execution-notes.md](evidence/demo-execution-notes.md) | Demo run entries and PO sign-off pending |

## 5. Mandatory Evidence Pack for Closure

Attach the following artifacts before marking Sprint 1 as closed:

1. Test run evidence
- Command outputs for lint, build, and tests.
- Timestamp and environment notes.

2. QA execution matrix
- P1 story-by-story pass/fail report.
- Defect IDs linked to each failed step.

3. Defect and waiver report
- Open critical and high defect summary.
- Approved waiver notes for any unresolved high defects.

4. Demo and sign-off proof
- Demo checklist completion notes.
- Product Owner acceptance sign-off.

5. Release note
- Sprint scope delivered.
- Known limitations and carry-forward items.

## 6. Sprint Demo Execution Log

| Step | Expected Result | Actual Result | Status | Evidence Ref |
|---|---|---|---|---|
| Login as authorized user | Access granted | Demo template prepared | Partial | [demo-execution-notes.md](evidence/demo-execution-notes.md) |
| Upload valid file | Upload accepted with uploadId | Demo template prepared with sample files | Partial | [demo-execution-notes.md](evidence/demo-execution-notes.md) |
| Upload invalid file | Row-level errors shown | Demo template prepared with invalid dataset | Partial | [demo-execution-notes.md](evidence/demo-execution-notes.md) |
| Show warning report | Non-blocking warnings visible | Covered by automated validation flow evidence | Partial | [test-output.txt](evidence/test-output.txt) |
| Show audit trail entry | Audit event visible for actions | Implementation complete, manual evidence pending | Partial | [defect-and-waiver-report.md](evidence/defect-and-waiver-report.md) |

## 7. Carry-Forward Register

| Story or Task | Reason for carry-forward | Impact | New target sprint |
|---|---|---|---|
| xlsx dependency replacement | No upstream fix for current package vulnerability | Security and compliance risk | Sprint 2 |

## 8. Sign-Off

| Role | Name | Decision | Date | Comments |
|---|---|---|---|---|
| Product Owner |  | Pending |  |  |
| Engineering Lead |  | Pending |  |  |
| QA Lead |  | Pending |  |  |
| Risk Lead |  | Pending |  |  |

## 9. Final Closure Rule

Sprint 1 can be marked Closed only when:

1. All Pending items above are resolved or formally waived.
2. Sign-off table is completed by Product Owner, Engineering Lead, and QA Lead.
3. Carry-forward items are documented with impact and target sprint.
