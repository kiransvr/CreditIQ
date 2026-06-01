# UI Regression Test Plan

## Goal
Build a UI-level regression suite for the CreditIQ web app that verifies the most important user journeys and catches regressions before release.

## Proposed Stack
- Playwright Test
- TypeScript
- Headless Chromium for CI
- HTML and JUnit reporting

## Initial Scope
- Authentication and session handling
- Core borrower and audit flows
- Validation and error-state coverage
- Role-based access checks
- Smoke suite for deployment verification

## Delivery Phases
1. Framework setup
2. Critical-path smoke tests
3. Broader regression coverage
4. CI integration and reporting
5. Stabilization and flaky test cleanup

## Working Rules
- Keep tests independent
- Prefer stable accessibility-based selectors
- Seed or reset test data for repeatability
- Capture screenshots and traces on failures
- Treat flaky tests as defects

## Next Step
Create the first Playwright test project structure and add the smoke cases.
