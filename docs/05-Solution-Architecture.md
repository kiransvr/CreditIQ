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
