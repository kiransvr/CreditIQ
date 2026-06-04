# Product Requirements Document (PRD) - CreditIQ Lite

## 1. Product Goal

Provide an explainable internal-data-based scoring support platform that improves speed and consistency of credit assessment without replacing human decision authority.

## 2. Primary Users and Needs

- Loan Officer: Fast borrower risk insight and recommendation.
- Credit Manager: Consistent and reviewable scoring output.
- Risk Analyst: Transparent rationale and historical analysis.
- Auditor: Full traceability of decisions and overrides.

## 3. Functional Requirements

FR-001 Data Ingestion
- System shall accept borrower input through CSV and XLSX templates.

FR-002 Data Validation
- System shall validate mandatory fields and data type formats.
- System shall provide warnings for missing or inconsistent values.

FR-003 Scoring Engine
- System shall compute a score in the range 0 to 1000.
- System shall use defined scoring factors and weight logic.
- System shall include a confidence score or automatically mark the case for manual review when data quality or data completeness is low.
- System shall use five broad scoring areas for v1 formula design:
	- Account stability: longer active account should improve score.
	- Deposit regularity: regular deposits should improve score.
	- Balance behavior: stable or improving balance should improve score.
	- Repayment history: good past repayment should improve score; no past loan must not automatically reduce score.
	- Cashflow and debt burden: stronger repayment capacity should improve score; high existing debt should reduce score.

FR-004 Risk Categorization
- System shall map scores to risk categories.
- System shall support "Insufficient Data" output where needed.

FR-005 Recommendation Engine
- System shall recommend one of: proceed, lower amount, manual review, reject.
- System shall provide indicative loan amount suggestion.

FR-006 Explainability
- System shall display five plain-language reasons for the score result.

FR-007 Override Workflow
- Authorized users shall be able to override recommendation.
- Override action shall require reason text and be fully auditable.

FR-008 Reporting
- System shall generate printable borrower assessment report.

FR-009 Audit Trail
- System shall persist all scoring inputs, outputs, and user actions.

FR-010 User Access
- System shall enforce role-based access control.

## 4. Non-Functional Requirements

NFR-001 Availability
- System should run reliably in low-connectivity environments.

NFR-002 Performance
- Single borrower scoring response should complete within 3 seconds in normal load.

NFR-003 Security
- Data at rest and in transit must be protected.

NFR-004 Usability
- UI must be usable by non-technical credit staff with minimal training.

NFR-005 Auditability
- Every critical action must be time stamped and user stamped.

NFR-006 Maintainability
- Configuration-driven score ranges and category thresholds.

## 5. Risk Categories and Sample Data Requirements

- 800-1000: Very Good
- 650-799: Good
- 500-649: Moderate
- 350-499: Weak
- Below 350: High Risk
- Not enough data: Insufficient Data

Sample data requirements for client review and UAT:
- Current balance in account
- Number of deposits in the last 12 to 24 months
- Any defaults in the last 12 to 24 months
- Existing liabilities: total amount outstanding and monthly payment obligations

## 6. Acceptance Criteria (Sample)

- AC-001: Valid CSV upload is processed without manual intervention.
- AC-002: Invalid mandatory fields return clear error list.
- AC-003: Score output always remains within 0 to 1000.
- AC-004: Each assessment includes exactly five explanations.
- AC-005: Override cannot be saved without reason.
- AC-006: Assessment report can be printed or exported as PDF.
- AC-007: Sample upload template includes the required account balance, deposit activity, default history, and liabilities fields.
- AC-008: If confidence is below threshold, output includes confidence score and/or mandatory manual review flag.
- AC-009: Final score always remains within 0 to 1000 even after applying all scoring area factors.

## 7. Dependencies

- Institution-provided historical and current borrower data.
- Approved data template per institution.
- Security and hosting approval from client IT.

## 8. Open Decisions

- Final scoring formula and weights.
- Confidence scoring formula for partial data.
- Lending policy specific recommendation thresholds by institution.
