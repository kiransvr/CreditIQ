# Definition of Done and Acceptance Checklist (Sprint 1)

## 1. Definition of Done

1. Code implemented and peer reviewed.
2. Unit tests added and passing.
3. Integration tests for APIs passing.
4. QA test cases executed for all P1 stories.
5. No open critical defects.
6. No open high defects without product and QA waiver.
7. API contract and schema documentation updated.
8. Audit logging validated for security-sensitive actions.
9. Release notes prepared for sprint increment.

## 2. Acceptance Checklist

### Functional
- Upload supports CSV and XLSX.
- Mandatory validation works per configured fields.
- Format validation catches malformed data.
- Error and warning reporting is clear and traceable.
- Re-upload path works for corrected data.

### Security
- Auth required for upload endpoints.
- Unauthorized roles blocked.
- Audit event generated for uploads and validations.

### Quality
- Test evidence attached in sprint review.
- Requirement mapping updated in traceability matrix.
- Demo completed with product owner sign-off.

## 3. Sprint Demo Script

1. Login as authorized user.
2. Upload valid file and show successful validation.
3. Upload invalid file and show row-level errors.
4. Show warning report with non-blocking issues.
5. Show audit trail entry for both scenarios.

## 4. Carry-Forward Rule

Any story failing acceptance moves to next sprint with documented blocker, impact, and revised estimate.
