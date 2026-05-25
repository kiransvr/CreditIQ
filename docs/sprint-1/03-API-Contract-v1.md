# API Contract v1 (Sprint 1)

## 1. API Style

- REST over HTTPS
- JSON responses
- Versioned routes under /api/v1

## 2. Endpoints

### POST /api/v1/uploads
Purpose: Upload CSV/XLSX borrower data file.

Request:
- Content-Type: multipart/form-data
- Fields:
  - file: binary
  - institutionId: string
  - templateVersion: string

Response 201:
{
  "uploadId": "upl_001",
  "status": "received",
  "receivedAt": "2026-05-25T10:30:00Z"
}

Error 400:
{
  "code": "INVALID_FILE_TYPE",
  "message": "Only CSV and XLSX are supported",
  "details": []
}

### POST /api/v1/uploads/{uploadId}/validate
Purpose: Run validation rules and generate result report.

Behavior:
- If request body contains rows, those rows are validated.
- If rows are omitted, API parses the originally uploaded CSV/XLSX file and validates parsed rows.

Response 200:
{
  "uploadId": "upl_001",
  "status": "validated",
  "summary": {
    "totalRows": 120,
    "validRows": 105,
    "errorRows": 15,
    "warningRows": 22
  },
  "errors": [
    {
      "row": 12,
      "field": "monthlyInflow",
      "code": "REQUIRED_FIELD_MISSING",
      "message": "monthlyInflow is mandatory"
    }
  ],
  "warnings": [
    {
      "row": 44,
      "field": "averageBalance",
      "code": "VALUE_OUTLIER",
      "message": "averageBalance significantly differs from peer values"
    }
  ],
  "recommendation": {
    "decision": "manual_review",
    "suggestedAmount": 1200,
    "reasons": [
      "Mandatory fields are missing or invalid, so manager review is required."
    ]
  }
}

### GET /api/v1/uploads/{uploadId}
Purpose: Fetch upload and validation status.

Response 200:
{
  "uploadId": "upl_001",
  "status": "validated",
  "fileName": "borrowers-may.xlsx",
  "createdBy": "user_123",
  "receivedAt": "2026-05-25T10:30:00Z",
  "summary": {
    "totalRows": 120,
    "validRows": 105,
    "errorRows": 15,
    "warningRows": 22
  },
  "errors": [],
  "warnings": [],
  "recommendation": {
    "decision": "manual_review",
    "suggestedAmount": 1200,
    "reasons": [
      "Mandatory fields are missing or invalid, so manager review is required."
    ]
  },
  "override": {
    "decision": "manual_review",
    "reason": "Data quality concerns require manager review.",
    "overriddenBy": "manager.user",
    "overriddenAt": "2026-05-25T12:00:00Z"
  }
}

### POST /api/v1/uploads/{uploadId}/override
Purpose: Apply manual override with mandatory reason.

Allowed roles:
- credit_manager
- admin

Request body:
{
  "decision": "proceed|lower_loan|manual_review|reject",
  "reason": "Minimum 10 characters"
}

Response 200:
- Returns updated upload details including override block.

### GET /api/v1/uploads/{uploadId}/report
Purpose: Download validation report.

Response 200:
- Content-Type: text/csv
- Content-Disposition: attachment; filename=upload-{uploadId}-report.csv

## 3. Security

- Bearer token required for all endpoints.
- Role check required for upload and validate actions.
- Development headers currently supported:
  - Authorization: Bearer dev-token
  - x-user-id: demo-user
  - x-user-role: loan_officer | credit_manager | risk_analyst | admin
  - x-institution-id: demo-bank

## 4. Validation payload (implemented)

POST /api/v1/uploads/{uploadId}/validate body:

{
  "rows": [
    {
      "customerId": "CUST-001",
      "accountOpeningDate": "2024-01-01",
      "monthlyInflow": 10000,
      "monthlyOutflow": 6000,
      "requestedLoanAmount": 50000,
      "requestedTenure": 12
    }
  ]
}

POST /api/v1/uploads/{uploadId}/validate body can also be empty:

{}

## 5. Persistence mode

- When DATABASE_URL is configured, upload and validation data are persisted in PostgreSQL.
- When DATABASE_URL is not configured, API uses an in-memory repository for local development.
- Uploaded file bytes are persisted and used for parse-on-validate flow.

## 6. Error Envelope Standard

{
  "code": "STRING_CODE",
  "message": "Human readable message",
  "details": [
    {
      "field": "fieldName",
      "issue": "issue description"
    }
  ],
  "traceId": "request-trace-id"
}
