# Data Governance and Security

## 1. Data Classification

- Confidential: borrower financial and profile data.
- Internal: scoring outputs and operational reports.
- Restricted: authentication credentials and access logs.

## 2. Data Governance Principles

- Data minimization: collect only required fields.
- Purpose limitation: use data only for credit assessment support.
- Traceability: preserve source and transformation history.
- Accountability: assign data owner and system owner.

## 3. Access Control Model

Roles:
- Loan Officer: create and view assessments.
- Credit Manager: review and approve actions.
- Risk Analyst: analyze performance and trends.
- Auditor: read-only complete audit access.
- System Admin: environment and user administration.

## 4. Security Controls

- Enforce unique user accounts.
- Strong password policy or enterprise identity integration.
- TLS for all web traffic.
- Encryption for backups and report exports.
- Immutable audit trail for critical user actions.

## 5. Audit Requirements

Capture:
- user id
- timestamp
- client location or branch
- action type
- object id
- before and after values for overrides
- reason text for override

## 6. Retention and Disposal

- Retain records according to client regulatory policy.
- Support secure purge based on approved retention schedule.

## 7. Incident Response (Minimum)

1. Detect and classify incident.
2. Contain affected systems.
3. Preserve logs and evidence.
4. Notify stakeholders.
5. Recover service.
6. Conduct post incident review.
