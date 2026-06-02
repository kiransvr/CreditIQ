# CreditIQ UI Redesign Brief

Owner: Product + Engineering
Audience: International banking and MFI clients
Status: Draft v1
Date: June 1, 2026

## 1. Goals
- Position CreditIQ as a credible, enterprise-grade credit decisioning product for international markets.
- Improve usability for loan officers, credit managers, risk analysts, and auditors.
- Establish a consistent design system across all screens.
- Support localization, accessibility, and white-label branding.

## 2. Design Principles
1. Decision-first: surface decision, score, risk, and rationale prominently.
2. Workflow-staged: guide users through Upload -> Validate -> Review -> Override -> Audit.
3. Role-aware: show only what the role can act on; speak business language, not enum values.
4. Trust by default: show environment, audit, security, and policy cues.
5. Localized and accessible: WCAG 2.1 AA, i18n, RTL ready.
6. White-label friendly: theme tokens and per-institution branding.

## 3. Design System
- Component library: MUI v6 standardized across all pages
- Tokens: color, spacing, typography, radius, elevation, motion
- Typography: Inter or Source Sans 3
- Color: brand primary, neutral grayscale, semantic (success, warning, error, info)
- Icons: lucide-react or MUI icons (single family)
- Charts: Recharts for waterfall, distribution, KPIs
- Density: comfortable on desktop, compact on tablet

## 4. Information Architecture
- Product shell: top app bar + left navigation
- Top bar: logo, environment badge, search, language switcher, notifications, user menu
- Left nav: Dashboard, Uploads, Decisions, Audit, Reports, Settings
- Page header pattern: title, contextual actions, status chips
- Global toasts for transient feedback; inline alerts for blocking issues

## 5. Roles and Friendly Labels
- loan_officer -> Loan Officer
- credit_manager -> Credit Manager
- risk_analyst -> Risk Analyst
- auditor -> Auditor
- admin -> Administrator

Role-aware visibility:
- Upload: Loan Officer, Credit Manager, Administrator
- Validate, Review, Report: Loan Officer, Credit Manager, Risk Analyst, Administrator, Auditor
- Override: Credit Manager, Administrator
- Audit: All roles (read only for non-Auditor)

## 6. Screen-by-Screen Specs

### 6.1 Dashboard (new)
Purpose: At-a-glance status for the user's institution.

Layout:
- KPI strip: uploads today, validations pending, average score, override rate
- Trend charts: score distribution, decision mix, risk category mix
- Recent uploads table with quick actions
- Alerts: failed uploads, policy breaches

Role notes:
- Loan Officer sees own uploads
- Credit Manager and Risk Analyst see institution-wide
- Auditor sees audit summary instead of operational KPIs

### 6.2 Uploads List (new)
Purpose: Manage and search uploads.

Layout:
- Filters: date range, status, decision, risk, owner
- Table columns: Upload ID, File, Status, Score, Decision, Risk, Owner, Created
- Row actions: Validate, Review, Download Report
- Bulk actions: export selected, archive

Empty state:
- "No uploads yet. Start by uploading a borrower file." with primary CTA

### 6.3 New Upload (refactor of current flow)
Purpose: Upload borrower file with clear validation.

Layout:
- Stepper: 1 Upload, 2 Validate, 3 Review, 4 Override
- Drag and drop file zone with size/type limits
- Template version selector
- Sample template link
- Submit primary button; cancel secondary

States:
- Idle, uploading (progress), success (with Upload ID), error (with code + retry)

Accessibility:
- Drop zone is keyboard accessible
- File input has proper label and aria-describedby

### 6.4 Upload Details / Review (refactor)
Purpose: Show validation outcome and decision context.

Layout (tabs):
- Summary: Decision card (score gauge, risk badge, suggested amount, top reasons)
- Diagnostics: filterable data grid (severity, row, field, code, message), CSV export
- Explainability: base score, component impacts waterfall, policy notes
- Override (role-gated): decision selector, reason textarea with min length helper, submit
- Audit: events for this upload

Decision card details:
- Score gauge (0 to 1000) with band label (Strong, Stable, Constrained, Weak)
- Risk badge with semantic color
- Decision chip with friendly label
- Suggested amount formatted by locale and currency
- Top 3 reasons; "View all" expands

Diagnostics grid:
- Virtualized rows
- Quick chips: All, Errors, Warnings
- Search with debounced input
- Column sort and resize
- Export current view as CSV

### 6.5 Override Workflow (refactor)
Purpose: Capture justified overrides with audit trail.

Layout:
- Banner: current decision and the proposed override
- Decision selector: Proceed, Lower Loan, Manual Review, Reject
- Reason textarea: minimum 10 characters with live counter
- Policy reference selector (optional)
- Confirmation modal with diff: from -> to

Post-submit:
- Toast: "Override saved"
- Audit tab updates immediately

### 6.6 Audit Log (refactor)
Purpose: Searchable, exportable audit history.

Layout:
- Filters: date, action, user, object type, object id, metadata search
- Data grid: time, user, action chip, object, friendly details
- Row drawer: full event JSON with copy
- Export: CSV and JSON
- Saved views for common queries

### 6.7 Reports (new)
Purpose: Generate and download institutional reports.

Layout:
- Templates: Decision summary, Risk distribution, Override trail
- Filters: date range, branch, role, status
- Output formats: CSV, XLSX, PDF
- Recent downloads list

### 6.8 Settings
Purpose: User and institution configuration.

Sections:
- Profile and preferences (language, density, theme)
- Institution branding (logo, primary color) - admin only
- API and webhooks - admin only
- Role and access mapping - admin only

## 7. Localization
- Library: react-i18next
- Default locale: en
- Pilot locales: en-IN, ar (RTL), es
- Format: numbers, currency, dates via Intl
- All strings externalized to JSON
- Language switcher in top bar; persists per user

## 8. Accessibility
- Target: WCAG 2.1 AA
- Keyboard navigation across all flows
- Visible focus states
- Color not the only indicator (use icons + text)
- Form inputs labeled, errors associated with aria-describedby
- Automated: @axe-core/playwright in e2e

## 9. Trust and Security UX
- Environment badge (UAT / Production) in top bar
- Session timer with auto-refresh prompt
- Data residency footer note
- Last login timestamp in user menu
- Visible link to audit for every transactional screen

## 10. Theming and White Label
- Per-institution theme: logo, primary color, accent color
- Theme tokens applied at runtime
- Export and import theme JSON
- Preview before publish

## 11. Empty, Loading, and Error States
- Empty: short message + primary CTA + optional learn-more
- Loading: skeletons for cards, tables, charts; do not block whole screen
- Error: friendly text, error code, retry, contact support link

## 12. Telemetry
- Page view, action click, error, override submitted
- Performance: TTFB, LCP, CLS on key pages
- Privacy: no PII in event payloads

## 13. Non-Functional Targets
- LCP under 2.5s on broadband
- Largest table virtualized at 10k rows
- E2E suite passing on every PR

## 14. Phased Delivery
- Phase 1: Design system + product shell + role labels
- Phase 2: Dashboard + Uploads list + New Upload refactor
- Phase 3: Review tabs + Override refactor + Audit refactor
- Phase 4: Reports + Settings
- Phase 5: i18n + RTL + Accessibility hardening
- Phase 6: White-label theming + Telemetry

## 15. Acceptance Criteria (per phase, summary)
- All screens use shared theme tokens and components
- No raw enum values shown to users
- Keyboard reachable; axe scans clean on key pages
- Locale switch updates strings, numbers, dates, currency
- E2E suite covers each refactored screen

## 16. Open Questions
- Target pilot countries and required locales
- Required certifications (SOC 2, ISO 27001) and how they reflect in UI
- Currency model: single per institution or multi
- White-label scope: logo + color only, or full theme

## 17. Next Steps
1. Approve principles, phases, and pilot locales
2. Lock design system choice (MUI v6)
3. Wireframe Dashboard, Review, Override, Audit
4. Start Phase 1 implementation (shell + theme + labels)
