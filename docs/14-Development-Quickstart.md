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

## 6. Build checks

npm run lint
npm run build
