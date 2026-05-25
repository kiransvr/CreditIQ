# Development Quickstart

## 1. Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL (optional but recommended for persistence)

## 2. Configure environment

Create .env at repository root when using PostgreSQL:

DATABASE_URL=postgres://user:password@localhost:5432/creditiq

If DATABASE_URL is omitted, API runs with in-memory storage.

## 3. Install dependencies

Run from repository root:

npm install

## 4. Start API

npm run dev:api

API base URL: http://localhost:8080

## 5. Start Web App

Open another terminal in repository root:

npm run dev:web

Web URL: http://localhost:5173

## 6. Basic smoke checks

1. Open web app.
2. Select role in the UI (loan_officer, credit_manager, risk_analyst, or auditor).
3. Upload a CSV or XLSX file (auditor view hides upload).
4. Confirm upload accepted message.
5. Run Validate Upload in UI.
6. Fetch details and download report from UI.
7. Confirm API health endpoint returns ok at /api/v1/health.

## 7. Auth headers for API testing

Current Sprint 1 baseline uses header-driven auth context for development.

Include these headers when testing protected endpoints:

- Authorization: Bearer dev-token
- x-user-id: demo-user
- x-user-role: loan_officer
- x-institution-id: demo-bank

## 8. Validation endpoint payload

POST /api/v1/uploads/{uploadId}/validate can run in two modes.

Mode A (recommended): parse from uploaded file by uploadId:

{}

Mode B: provide rows directly:

{
	"rows": [
		{
			"customerId": "CUST-001",
			"accountOpeningDate": "2024-01-01",
			"monthlyInflow": 10000,
			"monthlyOutflow": 6000,
			"requestedLoanAmount": 50000,
			"requestedTenure": 12
		}
	]
}

## 9. List migrations

From repository root:

npm run db:migrations:list --workspace @creditiq/api

## 10. Build checks

npm run lint
npm run build
