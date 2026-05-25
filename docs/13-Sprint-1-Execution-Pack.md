# Sprint 1 Execution Pack

## 1. Objective

Deliver a production-ready first slice of CreditIQ Lite focused on reliable data ingestion, data validation, initial role access, and foundation services.

## 2. Sprint Goal

By the end of Sprint 1, the team can upload borrower data files, receive deterministic validation results, and persist validated data for downstream scoring.

## 3. Duration and Team

- Sprint duration: 2 weeks
- Team: Product Owner, Engineering Lead, Backend Engineer, Frontend Engineer, QA Engineer, DevOps support

## 4. Scope In

- CSV and XLSX upload endpoint and UI flow
- Validation engine for mandatory fields and formats
- Data quality warning framework
- Authentication and basic RBAC skeleton
- Persistence model for borrower upload records
- Error handling standardization
- Foundational test suite for ingestion and validation

## 5. Scope Out

- Final scoring logic
- Full recommendation engine
- Printable assessment report
- Override workflow UI and policy enforcement

## 6. Sprint 1 Document Set

- User stories: [docs/sprint-1/01-User-Stories.md](sprint-1/01-User-Stories.md)
- Engineering tasks: [docs/sprint-1/02-Engineering-Tasks.md](sprint-1/02-Engineering-Tasks.md)
- API contract: [docs/sprint-1/03-API-Contract-v1.md](sprint-1/03-API-Contract-v1.md)
- Database schema draft: [docs/sprint-1/04-Database-Schema-Draft.md](sprint-1/04-Database-Schema-Draft.md)
- Definition of Done: [docs/sprint-1/05-Definition-of-Done-and-Acceptance.md](sprint-1/05-Definition-of-Done-and-Acceptance.md)

## 7. Sprint Risks to Watch

- Source data variation across institutions
- Late finalization of mandatory field policy
- XLSX parser edge case handling
- User-role assumptions changing mid sprint

## 8. Sprint Exit Criteria

- All P1 stories completed and accepted
- No open critical defects
- No open high defects without approved waiver
- API and DB artifacts baselined for Sprint 2 scoring work
