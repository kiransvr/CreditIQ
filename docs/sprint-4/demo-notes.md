# Sprint 4 Demo Notes

## Purpose

Use this script to demo the current CreditIQ Lite implementation end to end:

- file upload
- validation and recommendation results
- manual override for privileged roles
- audit log browsing and CSV export

## Prerequisites

- API running from `apps/api`
- Web app running from `apps/web`
- A demo file from `docs/sprint-1/demo-data/valid-borrowers.csv` or `docs/sprint-1/demo-data/invalid-borrowers.csv`
- A browser session with the web app open

## Demo Script

1. Open the main CreditIQ page.
2. Show the role selector and switch between `loan_officer`, `credit_manager`, and `auditor`.
3. Upload `valid-borrowers.csv` and point out the upload confirmation, score summary, risk category, and explainable reasons.
4. Enter the returned upload ID and click Validate Upload to show the diagnostics view.
5. Use Fetch Details to show the paged diagnostics list and filtering controls.
6. As `credit_manager` or `admin`, enter a manual override decision and reason, then submit it.
7. Switch to the Audit Log page.
8. Filter by action type and user, then use the search box to find a specific event.
9. Click Download CSV and show the exported audit file.

## Suggested Talking Points

- The system supports both CSV and XLSX intake.
- Validation is deterministic and designed for internal bank and MFI data.
- Overrides are restricted to privileged roles and are audit logged.
- The audit log supports filtering and export for review and compliance.

## Demo Checklist

- Build passes before the demo.
- API health endpoint responds.
- Demo data file is ready.
- Browser opens the web app without console errors.
- CSV export works from the audit log page.
