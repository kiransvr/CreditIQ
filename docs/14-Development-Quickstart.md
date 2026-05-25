# Development Quickstart

## 1. Prerequisites

- Node.js 20+
- npm 10+

## 2. Install dependencies

Run from repository root:

npm install

## 3. Start API

npm run dev:api

API base URL: http://localhost:8080

## 4. Start Web App

Open another terminal in repository root:

npm run dev:web

Web URL: http://localhost:5173

## 5. Basic smoke checks

1. Open web app.
2. Upload a CSV or XLSX file.
3. Confirm upload accepted message.
4. Confirm API health endpoint returns ok at /api/v1/health.

## 6. Auth headers for API testing

Current Sprint 1 baseline uses header-driven auth context for development.

Include these headers when testing protected endpoints:

- Authorization: Bearer dev-token
- x-user-id: demo-user
- x-user-role: loan_officer
- x-institution-id: demo-bank

## 7. Validation endpoint payload

POST /api/v1/uploads/{uploadId}/validate expects:

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

## 8. List migrations

From repository root:

npm run db:migrations:list --workspace @creditiq/api

## 9. Build checks

npm run lint
npm run build
