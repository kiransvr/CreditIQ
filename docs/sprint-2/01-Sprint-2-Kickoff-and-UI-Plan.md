# Sprint 2 Kickoff and UI Plan

## 1. Sprint 2 Objective

Extend Sprint 1 ingestion baseline into scoring policy maturity, risk explainability, and stronger analyst-ready user experience.

## 2. Priority Outcomes

1. Finalize scoring and risk policy mapping with business stakeholders.
2. Improve recommendation explainability payload and UI presentation.
3. Replace vulnerable spreadsheet parsing dependency and harden file ingestion.
4. Complete non-functional readiness increments for UAT confidence.

## 3. UI Plan (Requested)

### Current UI Status

Current UI already supports upload, validate, fetch details, report download, and manual override.

### Sprint 2 UI Enhancements

1. Scoring explanation panel
- Show score contribution factors and weighted signals.
- Display policy notes for decision outcomes.

2. Validation diagnostics UX
- Row-level issue table with filter by error/warning.
- Highlight columns causing most failures.

3. Risk presentation
- Persistent risk badge and score trend block.
- Decision rationale grouped by category (data quality, cashflow, policy).

4. UAT usability improvements
- Guided demo mode with sample file shortcuts.
- Clear action feedback and retry patterns.

## 4. Engineering Tasks

1. Implement xlsx replacement with maintained parser library.
2. Add parser security tests for malicious payload keys and malformed sheets.
3. Extend API contract for richer scoring explanation payload.
4. Add UI tests for override flow, report download, and diagnostics table filtering.

## 5. Exit Criteria

1. Scoring/risk policy approved by Product and Risk leads.
2. Security vulnerability from xlsx removed.
3. UI enhancements accepted by Product Owner in demo.
4. Tests, lint, and build all passing with updated evidence pack.
