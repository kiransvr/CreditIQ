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
  ]
}

### GET /api/v1/uploads/{uploadId}
Purpose: Fetch upload and validation status.

Response 200:
{
  "uploadId": "upl_001",
  "status": "validated",
  "fileName": "borrowers-may.xlsx",
  "createdBy": "user_123",
  "createdAt": "2026-05-25T10:30:00Z"
}

### GET /api/v1/uploads/{uploadId}/report
Purpose: Download validation report.

Response 200:
- Content-Type: application/pdf or text/csv

## 3. Security

- Bearer token required for all endpoints.
- Role check required for upload and validate actions.

## 4. Error Envelope Standard

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
