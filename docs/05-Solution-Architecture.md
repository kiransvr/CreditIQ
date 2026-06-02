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
