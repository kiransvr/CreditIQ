# CreditIQ

CreditIQ is a credit scoring decision-support platform for banks and MFIs, starting with Ethiopia-focused operational constraints.

This repository currently contains the business and delivery documentation required to launch the first production-grade version (CreditIQ Lite).

## Documentation Index

- [Project Overview](docs/01-Project-Overview.md)
- [Industry Standard Delivery Process](docs/02-Industry-Standard-Delivery-Process.md)
- [Product Requirements Document](docs/03-Product-Requirements-Document.md)
- [System Requirements Specification](docs/04-System-Requirements-Specification.md)
- [Solution Architecture](docs/05-Solution-Architecture.md)
- [Data Governance and Security](docs/06-Data-Governance-and-Security.md)
- [Testing and Quality Plan](docs/07-Testing-and-Quality-Plan.md)
- [Delivery Plan and Sprints](docs/08-Delivery-Plan-and-Sprints.md)
- [Operations and Support Runbook](docs/09-Operations-and-Support-Runbook.md)
- [Risk Register](docs/10-Risk-Register.md)
- [Go To Market and Client Onboarding](docs/11-Go-To-Market-and-Client-Onboarding.md)
- [Traceability Matrix](docs/12-Traceability-Matrix.md)
- [Sprint 1 Execution Pack](docs/13-Sprint-1-Execution-Pack.md)
- [Sprint 1 User Stories](docs/sprint-1/01-User-Stories.md)
- [Sprint 1 Engineering Tasks](docs/sprint-1/02-Engineering-Tasks.md)
- [Sprint 1 API Contract v1](docs/sprint-1/03-API-Contract-v1.md)
- [Sprint 1 Database Schema Draft](docs/sprint-1/04-Database-Schema-Draft.md)
- [Sprint 1 Definition of Done](docs/sprint-1/05-Definition-of-Done-and-Acceptance.md)
- [Sprint 1 QA and UAT Closure Checklist](docs/sprint-1/06-Sprint-1-QA-UAT-Closure-Checklist.md)
- [Sprint 1 Evidence - Defect and Waiver Report](docs/sprint-1/evidence/defect-and-waiver-report.md)
- [Sprint 1 Evidence - Release Notes](docs/sprint-1/evidence/sprint-1-release-notes.md)
- [Sprint 1 Evidence - Demo Execution Notes](docs/sprint-1/evidence/demo-execution-notes.md)
- [Sprint 2 Kickoff and UI Plan](docs/sprint-2/01-Sprint-2-Kickoff-and-UI-Plan.md)
- [Development Quickstart](docs/14-Development-Quickstart.md)
- [Client Update Implementation Plan](docs/16-Client-Update-Implementation-Plan.md)
- [Implementation Log (When and What)](docs/17-Implementation-Log.md)

## Current Product Scope (Phase 1)

CreditIQ Lite:
- Uses internal bank or MFI data only.
- Accepts Excel or CSV upload in Phase 1.
- Generates a borrower score (0-1000) and risk category.
- Provides explainable scoring reasons.
- Produces loan recommendation support output.
- Supports manual override with audit trail.

## How to Use This Documentation

1. Start with the delivery process document to align all stakeholders.
2. Validate and sign off the PRD and SRS before implementation.
3. Use architecture, security, and quality documents during build.
4. Use sprint and operations documents for execution readiness.
5. Keep all documents versioned with release tags.

## Governance

- Document owner: Product + Engineering + Risk
- Review cadence: Bi-weekly during build, monthly post-launch
- Versioning: Semantic documentation versions (for example v1.0, v1.1)

## Monorepo Structure

- apps/api: Express TypeScript API scaffold
- apps/web: React TypeScript web scaffold
- packages/contracts: Shared API and DTO contracts
