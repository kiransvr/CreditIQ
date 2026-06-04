# System Requirements Specification (SRS) - CreditIQ Lite

## 1. System Context

CreditIQ Lite is a web application deployed on institution-controlled infrastructure with optional offline operation characteristics.

## 2. Logical Components

- UI Application
- Data Upload and Validation Service
- Scoring Service
- Recommendation Service
- Reporting Service
- Audit and Logging Service
- Authentication and Authorization Service
- Relational Database

## 3. Data Inputs

Mandatory baseline fields:
- Customer ID
- Branch ID
- Account opening date
- Current balance in account
- Monthly inflow
- Monthly outflow
- Number of deposits in the last 12 to 24 months
- Any defaults in the last 12 to 24 months
- Existing liabilities: total amount outstanding
- Existing liabilities: monthly payment obligations
- Requested loan amount
- Requested tenure

Optional fields:
- Deposit regularity metrics
- Previous loan repayment details
- Additional outstanding debt details beyond mandatory liabilities fields

## 4. Processing Requirements

- Validate schema and field types.
- Normalize date and numeric fields.
- Compute intermediate indicators.
- Apply weighted scoring formula across five areas: account stability, deposit regularity, balance behavior, repayment history, and cashflow/debt burden.
- Ensure repayment-history logic does not penalize customers only because they have no prior loan history.
- Compute confidence score from data quality/completeness, or force manual review when confidence is below policy threshold.
- Generate explanations and category.
- Constrain final score output to range 0 to 1000.
- Persist record and emit report object.

## 5. API Requirements (Initial)

- POST /api/v1/assessments/upload
- POST /api/v1/assessments/score
- GET /api/v1/assessments/{id}
- POST /api/v1/assessments/{id}/override
- GET /api/v1/assessments/{id}/report

## 6. Security Requirements

- Role-based access control for all endpoints.
- Authenticated sessions with inactivity timeout.
- Input file malware and format checks.
- Immutable audit logging for sensitive actions.

## 7. Performance Requirements

- <= 3 sec median assessment for single borrower.
- <= 10 sec for small batch processing (up to 100 records) in pilot.

## 8. Reliability and Recovery

- Daily backups with verification.
- RPO: 24 hours maximum in Phase 1.
- RTO: 8 hours maximum in Phase 1.

## 9. Compliance and Audit

- Retain assessment records for policy-defined period.
- Capture who, what, when, and why for each override.

## 10. Error Handling

- Return deterministic validation messages.
- Differentiate data validation errors from system failures.
- Provide operator guidance for recoverable issues.
