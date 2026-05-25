# Sprint 1 Engineering Tasks

## 1. Backend Tasks

1. Create upload API endpoint with file size and extension checks.
2. Implement CSV parser module with header mapping.
3. Implement XLSX parser module with sheet validation.
4. Create validation rules engine for mandatory and typed fields.
5. Build warning rules framework and severity mapping.
6. Persist upload metadata, validation result, and error details.
7. Add audit logging for upload and validation events.
8. Standardize API error envelope structure.

## 2. Frontend Tasks

1. Build upload screen with drag-and-drop and browse options.
2. Display file validation status and progress states.
3. Render row-level error grid and warning summary.
4. Implement re-upload action flow for corrected files.
5. Add role-based guard for protected screens.

## 3. QA Tasks

1. Create test cases for all P1 acceptance criteria.
2. Create positive and negative test datasets.
3. Execute API and UI validation tests.
4. Validate audit log and access control behavior.
5. Report defects with severity and reproduction evidence.

## 4. DevOps Tasks

1. Set up branch policy and pull request checks.
2. Add CI pipeline for lint, unit tests, and build.
3. Configure environment variables for dev and test.
4. Add baseline application logging and health endpoint.

## 5. Estimation (Story Points)

- Backend: 20
- Frontend: 13
- QA: 8
- DevOps: 5
- Total planned capacity: 46 points

## 6. Task Dependencies

1. API contract finalized before frontend integration.
2. Validation rule catalog finalized before test finalization.
3. RBAC roles confirmed before UI access guard completion.
