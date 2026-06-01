# Sprint 1 Demo Execution Notes

## 1. Demo Assets

- Valid CSV: [../demo-data/valid-borrowers.csv](../demo-data/valid-borrowers.csv)
- Invalid CSV: [../demo-data/invalid-borrowers.csv](../demo-data/invalid-borrowers.csv)
- Valid XLSX: [../demo-data/valid-borrowers.xlsx](../demo-data/valid-borrowers.xlsx)

## 2. Environment

- API: http://localhost:8080
- Web: http://localhost:5173
- Auth context: header-based dev token and role headers

## 3. Execution Log Template

| Step | Actor Role | Input File | Expected Result | Actual Result | Status | Evidence |
|---|---|---|---|---|---|---|
| Login and access UI | loan_officer | N/A | Authorized access |  | Pending |  |
| Upload valid file | loan_officer | valid-borrowers.xlsx | Upload accepted with uploadId |  | Pending |  |
| Validate uploaded file | risk_analyst | N/A | Summary returned with score and risk |  | Pending |  |
| Upload invalid file | loan_officer | invalid-borrowers.csv | Row-level errors returned |  | Pending |  |
| Download report | auditor | N/A | CSV downloaded with summary and issues |  | Pending |  |
| Apply override | credit_manager | N/A | Override decision and reason recorded |  | Pending |  |
| Verify audit event | auditor/admin | N/A | Audit trail entry visible |  | Pending |  |

## 4. Product Owner Sign-Off Section

- Demo date:
- Product Owner:
- Decision: Pending
- Notes:
