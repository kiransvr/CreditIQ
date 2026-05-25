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
