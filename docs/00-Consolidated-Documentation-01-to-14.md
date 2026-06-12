# CreditIQ Consolidated Documentation (01-14)

This document combines the top-level project documents currently present in the docs folder.

Included source documents:
- 01-Project-Overview.md
- 02-Industry-Standard-Delivery-Process.md
- 03-Product-Requirements-Document.md
- 04-System-Requirements-Specification.md
- 05-Solution-Architecture.md
- 06-Data-Governance-and-Security.md
- 07-Testing-and-Quality-Plan.md
- 08-Delivery-Plan-and-Sprints.md
- 09-Operations-and-Support-Runbook.md
- 10-Risk-Register.md
- 11-Go-To-Market-and-Client-Onboarding.md
- 12-Traceability-Matrix.md
- 14-Development-Quickstart.md

Note: There is currently no top-level 13 document in the docs folder.

---

01-Project-Overview

# Project Overview - CreditIQ Lite

## 1. Vision

Enable financial institutions to make faster, more consistent, and more transparent credit decisions using internal data driven risk scoring.

## 2. Problem Statement

Loan decisions are often delayed or inconsistent because borrower quality is assessed manually with varying standards. Institutions need a practical scoring support layer that works with existing internal data and constrained digital environments.

## 3. Product Definition

CreditIQ Lite is a decision-support application that:
- Ingests borrower-related data via CSV or Excel.
- Computes a score between 0 and 1000.
- Maps risk categories.
- Suggests loan decision posture.
- Produces explainable reasoning and printable report.
- Preserves an auditable trail including manual overrides.

## 4. In Scope (Phase 1)

- Internal data only (no credit bureau integration).
- Offline friendly deployment model.
- English user interface.
- Role-based access for scoring, review, override, and audit.

## 5. Out of Scope (Phase 1)

- Full loan origination workflow.
- Automated final approval.
- External bureau API integrations.
- Multilingual interface beyond English.

## 6. Target Users

- Loan Officer
- Credit Manager
- Risk Analyst
- Branch Operations
- Internal Auditor

## 7. Success Metrics

- 30-50 percent reduction in first-pass assessment time.
- Improved consistency of decisions across branches.
- 100 percent traceability for overrides.
- High user adoption by credit officers in pilot institutions.

## 8. Business Outcomes

- Better credit quality controls.
- Faster credit cycle time.
- Stronger governance and audit posture.
- Foundation for future analytics and model enhancements.

---

02-Industry-Standard-Delivery-Process

# Industry Standard Delivery Process - Step by Step

## 1. Discovery and Alignment

1. Define business objectives and measurable outcomes.
2. Identify stakeholders (business, risk, compliance, engineering, operations).
3. Capture current-state process and pain points.
4. Define target operating model for decision support.
5. Approve project charter, scope, assumptions, and constraints.

Deliverables:
- Project charter
- Stakeholder map
- Scope statement
- Initial risk log

## 2. Requirements Engineering

1. Run structured requirement workshops.
2. Convert needs into functional and non-functional requirements.
3. Define acceptance criteria for each requirement.
4. Define data requirements and quality thresholds.
5. Baseline requirements with formal sign-off.

Deliverables:
- PRD
- SRS
- Data dictionary draft
- Acceptance criteria catalog

## 3. Solution and Architecture Design

1. Select architecture style and deployment topology.
2. Define modules, interfaces, and integration boundaries.
3. Define security and compliance controls.
4. Produce data model and audit model.
5. Perform architecture review board approval.

Deliverables:
- Architecture document
- Security architecture
- Data model
- API contract draft

## 4. Planning and Governance Setup

1. Build roadmap and sprint plan.
2. Create delivery governance cadence.
3. Define change control process.
4. Define quality gates and release criteria.
5. Finalize environments plan (dev, test, staging, prod).

Deliverables:
- Delivery plan
- RAID log (risks, assumptions, issues, dependencies)
- Release governance checklist

## 5. Build and Implementation

1. Create version-controlled codebase structure.
2. Implement features incrementally by sprint.
3. Enforce coding standards and peer reviews.
4. Use CI checks for build and test quality.
5. Demonstrate completed increments to stakeholders.

Deliverables:
- Working software increments
- Demo records
- Updated technical documentation

## 6. Verification and Validation

1. Execute unit, integration, system, and UAT tests.
2. Validate requirement traceability end to end.
3. Conduct security and performance testing.
4. Validate data quality and scoring explainability.
5. Fix defects and re-test until exit criteria are met.

Deliverables:
- Test evidence
- Defect reports
- UAT sign-off
- Go-live readiness report

## 7. Deployment and Go-Live

1. Execute production release plan with rollback path.
2. Migrate baseline reference data.
3. Conduct smoke tests in production.
4. Train business users and support teams.
5. Hypercare support for first 2-4 weeks.

Deliverables:
- Release report
- Training completion record
- Hypercare tracker

## 8. Operate and Improve

1. Run monitoring, incident, and support processes.
2. Measure KPIs and model outcomes.
3. Perform periodic risk and compliance audits.
4. Prioritize enhancements from real usage.
5. Plan Phase 2 integrations and scaling.

Deliverables:
- Operations dashboard
- Post implementation review
- Enhancement backlog

## 9. Quality Gates (Mandatory)

- Gate 1: Charter and scope approved.
- Gate 2: PRD and SRS approved.
- Gate 3: Architecture and security approved.
- Gate 4: Test and UAT passed.
- Gate 5: Go-live readiness approved.
- Gate 6: Post go-live stability achieved.

## 10. Recommended Governance Cadence

- Daily: Engineering standup
- Weekly: Project status and RAID review
- Bi-weekly: Sprint review and planning
- Monthly: Steering committee and budget review
- Quarterly: Product strategy and compliance review

---

03-Product-Requirements-Document

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

---

04-System-Requirements-Specification

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

---

05-Solution-Architecture

# Solution Architecture - CreditIQ Lite

## 1. Architecture Style

Modular monolith for Phase 1 with clear internal service boundaries. This allows faster delivery and simpler operations while preserving a migration path to microservices if scale requires.

## 2. High Level Design

1. User uploads borrower file through UI.
2. Validation module checks structure and quality.
3. Scoring module computes weighted score.
4. Recommendation module maps score to action.
5. Explanation module produces five reasons.
6. Report module generates printable output.
7. Audit module records all events.

## 3. Deployment Topology

- Application server (on-prem or private VM)
- Database server (PostgreSQL or SQL Server)
- Optional file storage for uploaded templates and generated reports

## 4. Data Flow Principles

- No external bureau calls in Phase 1.
- Normalize incoming data before scoring.
- Version each scoring configuration set.
- Persist input snapshot used for each score for traceability.

## 5. Configuration Management

Configurable without code changes:
- Score band thresholds
- Risk category labels
- Recommendation policy thresholds
- Mandatory field list by institution

## 6. Security Architecture

- Role segregation: maker, checker, approver, auditor, admin
- Least privilege access controls
- Encryption in transit (TLS) and at rest
- Periodic access review

## 7. Scalability Path

Future optional decomposition:
- Independent scoring service
- Independent reporting service
- Event stream for analytics

## 8. Architecture Decisions

- ADR-001: Modular monolith selected for speed and operational simplicity.
- ADR-002: CSV/XLSX ingest first, API integration later.
- ADR-003: Internal-data-only model for phase 1 feasibility.

## 9. Technology Stack (Current Implementation)

### 9.1 Platform and Monorepo

- Node.js 20+ runtime
- npm workspaces monorepo
- TypeScript 5.8.x across API, Web, and shared contracts

### 9.2 Frontend (Web)

- React 18.3.x
- Vite 8.x build/dev server
- Material UI 9.x (with Emotion styling engine)
- Browser E2E tests with Playwright 1.55.x
- Component/unit tests with Vitest + Testing Library

### 9.3 Backend (API)

- Express 4.21.x REST API
- Request validation with Zod 3.24.x
- File upload handling with Multer
- CSV/XLSX parsing support (including read-excel-file)
- PostgreSQL integration via pg 8.13.x

### 9.4 Persistence Modes

- PostgreSQL persistence when DB configuration is present
- In-memory persistence fallback for local/dev runs

### 9.5 Shared Package

- Shared contracts package for cross-app TypeScript types

### 9.6 Build, Quality, and Testing

- Type checking via TypeScript (noEmit lint scripts)
- API tests: Vitest and Supertest
- Web tests: Vitest + Playwright
- CI workflow includes build/lint and web E2E stages

---

06-Data-Governance-and-Security

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

---

07-Testing-and-Quality-Plan

# Testing and Quality Plan

## 1. Testing Strategy

Use risk-based multi-layer testing:
- Unit tests for scoring and validation rules.
- Integration tests for API and persistence flow.
- System tests for full assessment lifecycle.
- UAT with credit officers and risk managers.

## 2. Test Coverage Areas

- File ingestion and schema validation
- Missing data handling and confidence logic
- Score range integrity
- Risk category mapping
- Recommendation correctness
- Explanation quality and readability
- Override controls and audit records
- Report generation
- Access control and security behavior

## 3. Entry and Exit Criteria

Entry:
- Requirements baselined
- Test environment ready
- Test data sets prepared

Exit:
- No open critical defects
- No open high defects without approved waiver
- UAT sign-off complete
- Traceability matrix coverage complete

## 4. Defect Management

Severity levels:
- Critical: security breach, data corruption, wrong decision logic
- High: core feature unusable
- Medium: workaround exists
- Low: cosmetic or minor issue

## 5. Non Functional Testing

- Performance test for single and small batch processing.
- Security testing for auth, authorization, and file upload vectors.
- Recovery drill for backup restore scenario.

## 6. Quality Metrics

- Defect density by module
- Test pass percentage
- Reopen defect rate
- Requirement coverage percentage
- UAT acceptance score

---

08-Delivery-Plan-and-Sprints

# Delivery Plan and Sprint Roadmap

## 1. Delivery Model

Agile delivery with 2-week sprints and stage-gate governance.

## 2. Approved Client Sprint Plan

Total scope: 32 user stories across 6 sprints.

Sprint 1
- Foundation - CBS Connector + Data Pipeline

Sprint 2
- Scoring Engine - Model Integration + SHAP Reasons

Sprint 3
- Batch Mode + Loan Recommendations + Error Handling

Sprint 4
- Real-Time API + Loan Officer Dashboard

Sprint 5
- Fairness Audit + Drift Detection + Security

Sprint 6
- Fine-Tuning + Pilot Deployment + Training + Go-Live

### Current Sprint Transition Status

- Sprint roadmap synced to approved 6-sprint client sequence.
- Story-level allocation is tracked under sprint-specific story documents.
- Sprint 6 planning and readiness artifacts are now part of the active roadmap.
- During freeze, only critical bug fixes, security fixes, and approved demo blockers are allowed.

## 3. Milestones

- M1: Requirements and architecture signed off.
- M2: Core scoring workflow complete.
- M3: End to end system ready for UAT.
- M4: Production go-live.

## 4. Governance Cadence

- Daily engineering sync
- Weekly project review
- Bi-weekly sprint review
- Monthly steering committee

## 5. RACI (Simplified)

- Product Owner: requirement decisions and acceptance
- Engineering Lead: implementation quality and delivery
- Risk Lead: scoring and policy sign-off
- QA Lead: test quality and release recommendation
- Project Manager: timeline and governance tracking

---

09-Operations-and-Support-Runbook

# Operations and Support Runbook

## 1. Operational Model

- Support window: business hours with critical incident escalation path.
- Support tiers: L1 (operations), L2 (application), L3 (engineering).

## 2. Standard Operating Procedures

Daily:
- Verify service health.
- Verify background jobs and queues.
- Verify previous day backup completion.

Weekly:
- Review audit anomalies.
- Review failed uploads and validation trends.
- Review user access changes.

Monthly:
- Patch maintenance cycle.
- Capacity and performance review.
- Access recertification review.

## 3. Incident Management

Severity model:
- Sev1: service unavailable or critical data risk
- Sev2: core function degraded
- Sev3: non-critical defect

Workflow:
1. Triage
2. Assign owner
3. Mitigate
4. Resolve
5. RCA within agreed SLA

## 4. Backup and Recovery

- Daily full database backup.
- Weekly restore test in non-production.
- Store encrypted backup artifacts.

## 5. Change Management

- All production changes require approved change record.
- Release notes required for every deployment.
- Rollback plan mandatory before deployment approval.

## 6. Monitoring KPIs

- Uptime percentage
- Assessment processing latency
- Error rate by module
- Incident MTTR
- Failed upload ratio

---

10-Risk-Register

# Risk Register

## 1. Project and Product Risks

| ID | Risk | Impact | Probability | Mitigation | Owner |
|---|---|---|---|---|---|
| R-01 | Poor source data quality | High | High | Validation rules, confidence scoring, data correction loop | Product + Risk |
| R-02 | Undefined scoring policy details | High | Medium | Formal scoring workshop and sign-off | Risk Lead |
| R-03 | Low user adoption | High | Medium | Early demos, training, simple UX | Product Owner |
| R-04 | Security control gaps | High | Medium | Security review and penetration checks | Security Lead |
| R-05 | Timeline slippage | Medium | Medium | Scope control and milestone gates | Project Manager |
| R-06 | Infrastructure readiness delays | Medium | Medium | Early infra checklist and owner tracking | IT Ops |
| R-07 | Regulatory expectation mismatch | High | Low | Compliance review before go-live | Compliance |
| R-08 | Over-reliance on score without human review | High | Medium | Mandatory policy messaging and override controls | Business Lead |

## 2. Risk Review Cadence

- Weekly risk review in project forum.
- Monthly executive review for top risks.
- Immediate escalation for Sev1 risk events.

---

11-Go-To-Market-and-Client-Onboarding

# Go To Market and Client Onboarding

## 1. Positioning

CreditIQ Lite is a practical, explainable credit decision-support product for institutions that want fast implementation with existing internal data.

## 2. Ideal Customer Profile

- Banks and MFIs with manual or semi-manual credit assessment.
- Institutions with branch-driven lending and inconsistent decision patterns.
- Institutions with limited integration readiness in early phase.

## 3. Commercial Packaging (Suggested)

- Package A: Pilot (single institution, limited branches)
- Package B: Growth (multi-branch roll-out)
- Package C: Enterprise (custom integrations and analytics roadmap)

## 4. Onboarding Process

1. Qualification call and value assessment.
2. Demo using sample client-like dataset.
3. Data template sharing and readiness check.
4. Pilot proposal and commercial sign-off.
5. Environment setup and user onboarding.
6. Training and hypercare support.

## 5. Client Onboarding Deliverables

- Signed pilot scope
- Client data template
- Named client SPOCs
- Environment and access checklist
- Training pack
- Support matrix

## 6. Adoption Metrics

- Number of active underwriters
- Assessments completed per week
- Override rate
- Turnaround time reduction
- User satisfaction score

---

12-Traceability-Matrix

# Traceability Matrix

| Requirement ID | Requirement Summary | Design Reference | Build Reference | Test Reference | Status |
|---|---|---|---|---|---|
| FR-001 | Upload borrower data | Architecture Sec 2 | Upload module | Ingestion tests | Planned |
| FR-002 | Validate data quality | SRS Sec 4 | Validation module | Validation tests | Planned |
| FR-003 | Calculate score | Architecture Sec 2 | Scoring engine | Scoring tests | Planned |
| FR-004 | Map risk category | PRD Sec 5 | Risk mapping logic | Category tests | Planned |
| FR-005 | Recommendation output | PRD Sec 3 | Recommendation engine | Recommendation tests | Planned |
| FR-006 | Explainability reasons | PRD Sec 3 | Explanation module | Explainability tests | Planned |
| FR-007 | Manual override with reason | PRD Sec 3 | Override workflow | Override tests | Planned |
| FR-008 | Printable report | PRD Sec 3 | Report module | Report tests | Planned |
| FR-009 | Audit trail | Security Sec 5 | Audit module | Audit tests | Planned |
| FR-010 | RBAC | Security Sec 3 | Auth and access layer | Access tests | Planned |

---

14-Development-Quickstart

# Development Quickstart

## 1. Local Prerequisites

- Node.js 20 or later
- npm 10 or later
- PostgreSQL 15 or later (optional for in-memory local mode)

## 2. Install and Run

```bash
npm install
npm run dev:api
npm run dev:web
```

Default local endpoints:
- API: http://localhost:8080
- Web: http://localhost:5173

## 3. Environment Variables

API supports optional `.env` values:
- PORT=8080
- DATABASE_URL=<postgres connection string>

If `DATABASE_URL` is not provided, API runs with in-memory persistence.

## 4. Common Commands

```bash
npm run build
npm run lint
npm run test
npm run dev:api
npm run dev:web
```

## 5. Project Structure

- `apps/api` - Express API and business logic
- `apps/web` - React web application
- `packages/contracts` - shared contracts/types
- `docs` - delivery and project documentation

## 6. Recommended Workflow

1. Pull latest code.
2. Install dependencies.
3. Run lint and tests.
4. Start API and Web.
5. Validate sample upload flow.

## 7. Current UI Test Commands

```bash
npm run test:e2e --workspace @creditiq/web
npm run test:e2e:headed --workspace @creditiq/web
npm run test:e2e:ui --workspace @creditiq/web
```

## 8. Demo Data

Use existing sample data under:
- `docs/sprint-1/demo-data`

## 9. Notes

- Current local API supports CSV and XLSX uploads.
- Web app includes role-based demo flows.
- Diagnostics, override, and audit log flows are covered by E2E tests.
