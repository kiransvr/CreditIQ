# Operations and Support Runbook

## 1. Operational Model

- Support window: business hours with critical incident escalation path.
- Support tiers: L1 (operations), L2 (application), L3 (engineering).

## 2. Standard Operating Procedures

Daily:
- Verify service health.
- Verify background jobs and queues.
- Verify previous day backup completion.

Weekly:
- Review audit anomalies.
- Review failed uploads and validation trends.
- Review user access changes.

Monthly:
- Patch maintenance cycle.
- Capacity and performance review.
- Access recertification review.

## 3. Incident Management

Severity model:
- Sev1: service unavailable or critical data risk
- Sev2: core function degraded
- Sev3: non-critical defect

Workflow:
1. Triage
2. Assign owner
3. Mitigate
4. Resolve
5. RCA within agreed SLA

## 4. Backup and Recovery

- Daily full database backup.
- Weekly restore test in non-production.
- Store encrypted backup artifacts.

## 5. Change Management

- All production changes require approved change record.
- Release notes required for every deployment.
- Rollback plan mandatory before deployment approval.

## 6. Monitoring KPIs

- Uptime percentage
- Assessment processing latency
- Error rate by module
- Incident MTTR
- Failed upload ratio
