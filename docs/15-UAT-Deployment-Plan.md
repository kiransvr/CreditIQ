# UAT Deployment Plan - CreditIQ Lite

Target date: today, 11:00 PM

## 1. Goal

Provide SMEs with a stable public UAT environment using the current demo stack, without replatforming before sign-off.

## 2. Deployment Recommendation

Use the current Node.js + React + Express application for UAT.

Recommended low-cost UAT hosting pattern:
- Web app: free static hosting with HTTPS
- API: low-cost or free Node hosting with HTTPS
- Database: free Postgres tier for UAT data only
- CI/CD: GitHub Actions

Selected vendor stack for UAT:
- Web app: Vercel
- API: Render
- Database: Neon PostgreSQL
- DNS and TLS: Cloudflare free tier, if needed

Deployment URL mapping:
- Web app base URL: Vercel project URL
- API base URL: Render service URL
- Database connection: Neon PostgreSQL connection string
- Optional custom domain: Cloudflare-managed domain later, after UAT is stable

If you need the fastest possible launch tonight, deploy the existing app as-is to a public UAT URL and keep production planning separate.

## 3. Scope for Tonight

Only deploy what SMEs need to validate:
- login/role context
- file upload
- validation flow
- recommendation output
- override flow
- report download
- audit visibility

Do not add new business features before UAT.

## 4. Pre-Deployment Checklist

1. Confirm `npm run build` succeeds for the repo.
2. Confirm `npm run lint` succeeds.
3. Confirm the API health endpoint responds correctly.
4. Confirm the web app loads without local-only URLs.
5. Confirm UAT environment variables are set.
6. Confirm sample SME test users are ready.
7. Confirm rollback plan is documented.

## 4.1 Required Environment Variables

API on Render:
- `PORT` = auto-managed by Render, app listens on this value
- `NODE_ENV` = `production`
- `DATABASE_URL` = Neon connection string
- `CORS_ORIGIN` = Vercel web app URL

Web on Vercel:
- `VITE_API_BASE_URL` = Render API URL

Database on Neon:
- no app-side settings beyond `DATABASE_URL`

## 5. Deployment Steps

### Phase 1 - Environment setup

1. Create separate UAT environment variables for API and web.
2. Configure database connection for UAT.
3. Set public base URLs for frontend and backend.
4. Enable HTTPS.

### Phase 2 - Build and deploy

1. Deploy API.
2. Deploy web app.
3. Verify API-to-web connectivity.
4. Seed a small UAT dataset.
5. Confirm `/api/v1/health` is reachable through the Render URL.
6. Confirm the web app points to the Render URL through `VITE_API_BASE_URL`.

### Phase 3 - Smoke test

1. Open the public UAT URL.
2. Log in as each SME role.
3. Upload a sample CSV or XLSX file.
4. Validate the upload.
5. Confirm score and recommendation output.
6. Test manual override for an authorized role.
7. Download the report.
8. Verify audit trail details.

## 6. Go/No-Go Criteria

Go only if:
- build and lint pass
- UAT URL is reachable
- upload/validate/report flows work end to end
- SME roles can test successfully
- audit details are visible

No-go if:
- uploads fail
- validation is incorrect
- report download fails
- auth context is broken
- audit trail is missing

## 7. SME UAT Controls

- Use test data only.
- Limit access to 3-5 SME accounts initially.
- Keep the release scope frozen for the first UAT round.
- Collect defects in one shared log.

## 8. First 3 Days After Launch

Day 1:
- confirm access and fix blocking issues

Day 2:
- collect SME feedback and patch high-priority defects

Day 3:
- rerun smoke tests and confirm stability

## 9. Rollback Plan

If a critical issue appears:
1. Stop new SME testing.
2. Revert the latest deployment.
3. Restore the last known good database snapshot if needed.
4. Notify SMEs with the new test window.

## 10. Owner Checklist

- Deployment owner: engineering
- UAT coordinator: product or delivery lead
- SME sign-off owner: business lead
- Incident owner: engineering
