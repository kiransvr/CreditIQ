# Sprint 1 User Stories

## Priority P1

### US-001 File Upload
As a loan officer, I want to upload borrower data in CSV/XLSX format so that I can start a credit assessment quickly.

Acceptance criteria:
1. User can upload supported formats only.
2. Unsupported formats are rejected with clear error.
3. Upload record is created with status.

### US-002 Mandatory Field Validation
As a credit officer, I want mandatory fields validated so that incomplete files are identified before scoring.

Acceptance criteria:
1. Missing mandatory fields are listed by row and column.
2. Validation response includes pass or fail status.
3. Validation report can be downloaded.

### US-003 Data Type and Format Validation
As an operations user, I want date and numeric formats validated so that wrong data does not break processing.

Acceptance criteria:
1. Date fields follow configured format.
2. Numeric fields reject text and malformed symbols.
3. Row-level error messages are deterministic.

### US-004 Data Quality Warnings
As a risk analyst, I want warnings for suspicious or inconsistent values so that I can assess confidence.

Acceptance criteria:
1. Warning catalog includes type and severity.
2. Warnings do not block processing unless configured.
3. Warning summary appears in validation response.

### US-005 Role-Based Access Baseline
As an admin, I want role-based access controls so that only authorized users can upload and review data.

Acceptance criteria:
1. User must be authenticated to access upload APIs.
2. Access denied response returned for unauthorized role.
3. Actions are logged with user id and timestamp.

## Priority P2

### US-006 Re-Upload Corrected File
As a loan officer, I want to re-upload corrected files so that I can quickly fix issues and continue.

Acceptance criteria:
1. Previous run remains in history.
2. New run links to source correction cycle.
3. Latest run status is visible.
