# Sprint 1 Release Notes

## 1. Release Scope

Sprint 1 delivered the first production-ready CreditIQ Lite ingestion slice.

### Delivered

1. File upload for CSV and XLSX with size/type checks.
2. Validation engine for mandatory fields, type checks, and warnings.
3. Role-based access baseline for protected operations.
4. Upload details retrieval and report CSV export.
5. Manual override workflow with reason capture.
6. Recommendation output enhanced with score and risk category.
7. Web UI flow for upload, validate, fetch, report, and override.
8. API and web automated tests with passing status.

### Documentation Updated

1. API contract including recommendation score/risk fields.
2. Sprint 1 QA/UAT closure checklist.
3. Sprint 1 evidence pack artifacts.

## 2. Verification Summary

- Lint: Pass
- Build: Pass
- Tests: Pass

See evidence files in this folder:
- [lint-output.txt](lint-output.txt)
- [test-output.txt](test-output.txt)
- [build-output.txt](build-output.txt)

## 3. Known Limitations

1. Formal manual QA evidence and role sign-off are still pending completion.
2. xlsx dependency vulnerability remains and is planned for replacement in Sprint 2.
3. Final business-scoring policy calibration remains part of Sprint 2 scope.

## 4. Carry-Forward to Sprint 2

1. Complete sign-off workflow and waivers.
2. Replace xlsx parser dependency.
3. Expand scoring policy and UX with full analyst-facing details.
