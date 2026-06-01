import { useEffect, useState, useMemo } from "react";
import { useState as useReactState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AuditLog from "./pages/AuditLog";
import { AppShell } from "./shell/AppShell";

type ScreenState = "idle" | "working" | "success" | "error";
type UserRole = "loan_officer" | "credit_manager" | "risk_analyst" | "auditor" | "admin";
type DiagnosticFilter = "all" | "errors" | "warnings";
type DiagnosticSort = "row" | "type" | "code";
type DiagnosticSortDirection = "asc" | "desc";

interface DiagnosticItem {
  type: "error" | "warning";
  row: number;
  field: string;
  code: string;
  message: string;
}

interface ScoreWaterfallStep {
  key: string;
  label: string;
  impact: number;
  startScore: number;
  endScore: number;
}

interface UploadSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
}

interface UploadDetails {
  uploadId: string;
  status: string;
  summary: UploadSummary;
  diagnostics: {
    items: DiagnosticItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  recommendation: {
    decision: string;
    suggestedAmount: number;
    score: number;
    riskCategory: string;
    reasons: string[];
    explanation: {
      baseScore: number;
      components: Array<{
        key: string;
        label: string;
        impact: number;
        detail: string;
      }>;
      policyNotes: string[];
    };
  };
  override: {
    decision: string;
    reason: string;
    overriddenBy: string;
    overriddenAt: string;
  } | null;
}

type RiskCategory = "low" | "medium" | "high" | "very_high";

function toRiskLabel(riskCategory: string): string {
  const labels: Record<RiskCategory, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    very_high: "Very High"
  };

  if (riskCategory in labels) {
    return labels[riskCategory as RiskCategory];
  }

  return "Unknown";
}

function toScoreBand(score: number): string {
  if (score >= 750) {
    return "Strong";
  }

  if (score >= 620) {
    return "Stable";
  }

  if (score >= 450) {
    return "Constrained";
  }

  return "Weak";
}

function toDecisionLabel(decision: string): string {
  if (decision === "lower_loan") {
    return "Lower Loan";
  }

  if (decision === "manual_review") {
    return "Manual Review";
  }

  return decision.charAt(0).toUpperCase() + decision.slice(1);
}

function formatImpact(impact: number): string {
  if (impact > 0) {
    return `+${impact}`;
  }

  return `${impact}`;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export function App() {
  const [showAuditLog, setShowAuditLog] = useReactState(false);
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<UserRole>("loan_officer");
  const [uploadId, setUploadId] = useState("");
  const [overrideDecision, setOverrideDecision] = useState("manual_review");
  const [overrideReason, setOverrideReason] = useState("");
  const [diagnosticFilter, setDiagnosticFilter] = useState<DiagnosticFilter>("all");
  const [diagnosticSort, setDiagnosticSort] = useState<DiagnosticSort>("row");
  const [diagnosticSortDirection, setDiagnosticSortDirection] = useState<DiagnosticSortDirection>("asc");
  const [diagnosticQuery, setDiagnosticQuery] = useState("");
  const [diagnosticPage, setDiagnosticPage] = useState(1);
  const [diagnosticPageSize, setDiagnosticPageSize] = useState(10);
  const [state, setState] = useState<ScreenState>("idle");
  const [message, setMessage] = useState("Ready. Upload a file or fetch an existing upload.");
  const [details, setDetails] = useState<UploadDetails | null>(null);

  const statusClassName = useMemo(() => `status ${state}`, [state]);
  const riskClassName = useMemo(
    () => `risk-badge ${details ? details.recommendation.riskCategory : "unknown"}`,
    [details]
  );
  const scoreFillWidth = useMemo(() => `${Math.min(Math.max(details?.recommendation.score ?? 0, 0), 1000) / 10}%`, [details]);
  // Diagnostics counts for quick filter chips
  const diagnosticCounts = details?.diagnostics
    ? {
        all: details.diagnostics.total,
        errors: details.diagnostics.items.filter((d) => d.type === "error").length,
        warnings: details.diagnostics.items.filter((d) => d.type === "warning").length
      }
    : ({ all: 0, errors: 0, warnings: 0 });

  // Fetch diagnostics page when any diagnostics-related state changes
  useEffect(() => {
    if (!uploadId) return;
    async function fetchDiagnosticsPage() {
      setState("working");
      setMessage("Fetching diagnostics...");
      try {
        const params = new URLSearchParams({
          page: String(diagnosticPage),
          pageSize: String(diagnosticPageSize),
          filter: diagnosticFilter,
          sort: diagnosticSort,
          direction: diagnosticSortDirection,
        });
        if (diagnosticQuery) params.append("search", diagnosticQuery);
        const response = await fetch(`${apiBaseUrl}/api/v1/uploads/${uploadId}?${params.toString()}`, {
          headers: getAuthHeaders()
        });
        if (!response.ok) {
          throw new Error(await parseError(response));
        }
        const body = await response.json();
        setDetails(body);
        setState("success");
        setMessage(`Loaded details for ${body.uploadId}`);
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Could not fetch diagnostics.");
      }
    }
    fetchDiagnosticsPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId, diagnosticPage, diagnosticPageSize, diagnosticFilter, diagnosticSort, diagnosticSortDirection, diagnosticQuery]);

  function onDiagnosticSortChange(nextSort: DiagnosticSort) {
    if (nextSort === diagnosticSort) {
      setDiagnosticSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setDiagnosticSort(nextSort);
    setDiagnosticSortDirection("asc");
  }
  const waterfallSteps = useMemo<ScoreWaterfallStep[]>(() => {
    if (!details) {
      return [];
    }

    let runningScore = details.recommendation.explanation.baseScore;
    return details.recommendation.explanation.components.map((component) => {
      const startScore = runningScore;
      runningScore += component.impact;
      return {
        key: component.key,
        label: component.label,
        impact: component.impact,
        startScore,
        endScore: runningScore
      };
    });
  }, [details]);

  function getAuthHeaders(): Record<string, string> {
    return {
      Authorization: "Bearer dev-token",
      "x-user-id": "web-user",
      "x-user-role": role,
      "x-institution-id": "demo-bank"
    };
  }

  async function parseError(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { message?: string };
      return body.message ?? `Request failed with status ${response.status}`;
    } catch {
      return `Request failed with status ${response.status}`;
    }
  }

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setState("error");
      setMessage("Choose a CSV or XLSX file first.");
      return;
    }

    setState("working");
    setMessage("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("institutionId", "demo-bank");
    formData.append("templateVersion", "v1");

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/uploads`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const body = (await response.json()) as { uploadId: string };
      setUploadId(body.uploadId);
      setDiagnosticFilter("all");
      setDiagnosticSort("row");
      setDiagnosticSortDirection("asc");
      setDiagnosticQuery("");
      setState("success");
      setMessage(`Upload accepted with id ${body.uploadId}`);
      setDetails(null);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  async function validateUpload() {
    if (!uploadId.trim()) {
      setState("error");
      setMessage("Enter or upload an uploadId first.");
      return;
    }

    setState("working");
    setMessage("Validating upload from stored file...");

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/uploads/${uploadId}/validate`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const body = (await response.json()) as UploadDetails;
      setDetails(body);
      setDiagnosticFilter("all");
      setDiagnosticSort("row");
      setDiagnosticSortDirection("asc");
      setDiagnosticQuery("");
      setState("success");
      setMessage(`Validation complete for ${body.uploadId}`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Validation failed.");
    }
  }

  async function fetchUploadDetails() {
    if (!uploadId.trim()) {
      setState("error");
      setMessage("Enter an uploadId to fetch details.");
      return;
    }
    setDiagnosticPage(1);
    setDiagnosticFilter("all");
    setDiagnosticSort("row");
    setDiagnosticSortDirection("asc");
    setDiagnosticQuery("");
    // Diagnostics will be fetched by useEffect
  }

  async function downloadReport() {
    if (!uploadId.trim()) {
      setState("error");
      setMessage("Enter an uploadId to download report.");
      return;
    }

    setState("working");
    setMessage("Preparing report download...");

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/uploads/${uploadId}/report`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `upload-${uploadId}-report.csv`;
      anchor.click();
      URL.revokeObjectURL(url);

      setState("success");
      setMessage(`Report download started for ${uploadId}`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Report download failed.");
    }
  }

  async function submitOverride() {
    if (!uploadId.trim()) {
      setState("error");
      setMessage("Enter an uploadId before override.");
      return;
    }

    if (overrideReason.trim().length < 10) {
      setState("error");
      setMessage("Override reason must be at least 10 characters.");
      return;
    }

    setState("working");
    setMessage("Submitting override...");

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/uploads/${uploadId}/override`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          decision: overrideDecision,
          reason: overrideReason
        })
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const body = (await response.json()) as UploadDetails;
      setDetails(body);
      setDiagnosticFilter("all");
      setDiagnosticSort("row");
      setDiagnosticSortDirection("asc");
      setDiagnosticQuery("");
      setState("success");
      setMessage(`Override saved for ${body.uploadId}`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Override failed.");
    }
  }

  const useShell =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("shell") === "1";

  const pageContent = (
    <>
      <nav style={{ marginBottom: 16 }}>
        <button onClick={() => setShowAuditLog(false)} disabled={!showAuditLog}>
          Main
        </button>
        <button onClick={() => setShowAuditLog(true)} disabled={showAuditLog}>
          Audit Log
        </button>
      </nav>
      {showAuditLog ? (
        <AuditLog />
      ) : (
        <section className="card">
          <header className="hero">
            <p className="eyebrow">Credit Decision Support for Financial Institutions</p>
            <h1>CreditIQ Lite</h1>
            <p className="hero-copy">Role-aware upload, validation, scoring, and override workflow for branch and risk teams.</p>
            <div className="hero-chips" aria-label="context chips">
              <span className="chip">Bank and MFI operations</span>
              <span className="chip">CSV and XLSX ingestion</span>
              <span className="chip">Explainable recommendation</span>
            </div>
          </header>

          <div className="toolbar">
            <label htmlFor="role">Role</label>
            <select id="role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              <option value="loan_officer">loan_officer</option>
              <option value="credit_manager">credit_manager</option>
              <option value="risk_analyst">risk_analyst</option>
              <option value="auditor">auditor</option>
              <option value="admin">admin</option>
            </select>
          </div>

          {role !== "auditor" ? (
            <form onSubmit={uploadFile} className="upload-form">
              <label htmlFor="borrower-file">Borrower data file</label>
              <input
                id="borrower-file"
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <button type="submit" disabled={state === "working"}>
                {state === "working" ? "Working..." : "Upload File"}
              </button>
            </form>
          ) : (
            <p className="note">Auditor view: upload is hidden; you can fetch existing upload and download report.</p>
          )}

          {!useShell ? (
            <div className="actions" aria-label="upload actions">
            <label htmlFor="upload-id">Upload ID</label>
            <input
              id="upload-id"
              type="text"
              value={uploadId}
              onChange={(event) => setUploadId(event.target.value)}
              placeholder="Paste uploadId"
            />

            <div className="action-buttons">
              <button type="button" onClick={validateUpload} disabled={state === "working"}>
                Validate Upload
              </button>
              <button type="button" onClick={fetchUploadDetails} disabled={state === "working"}>
                Fetch Details
              </button>
              <button type="button" onClick={downloadReport} disabled={state === "working"}>
                Download Report
              </button>
            </div>
            </div>
          ) : null}

          {role === "credit_manager" || role === "admin" ? (
            <section className="override-panel">
              <h2>Manual Override</h2>
              <label htmlFor="override-decision">Decision</label>
              <select
                id="override-decision"
                value={overrideDecision}
                onChange={(event) => setOverrideDecision(event.target.value)}
              >
                <option value="proceed">proceed</option>
              <option value="lower_loan">lower_loan</option>
              <option value="manual_review">manual_review</option>
              <option value="reject">reject</option>
            </select>
            <label htmlFor="override-reason">Reason</label>
            <textarea
              id="override-reason"
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Mandatory override justification"
            />
            <button type="button" onClick={submitOverride} disabled={state === "working"}>
              Submit Override
            </button>
          </section>
        ) : null}

        {details ? (
          <section className="summary">
            <h2>Validation Summary</h2>
            <div className="metric-grid">
              <p>Upload: {details.uploadId}</p>
              <p>Status: {details.status}</p>
              <p>Total rows: {details.summary.totalRows}</p>
              <p>Valid rows: {details.summary.validRows}</p>
              <p>Error rows: {details.summary.errorRows}</p>
              <p>Warning rows: {details.summary.warningRows}</p>
            </div>
            <div className="summary-row">
              <span className="decision-badge">Decision: {toDecisionLabel(details.recommendation.decision)}</span>
              <span className={riskClassName}>Risk: {toRiskLabel(details.recommendation.riskCategory)}</span>
            </div>
            <p>Suggested amount: {details.recommendation.suggestedAmount}</p>

            <div className="score-block" aria-label="Borrower score">
              <div className="score-header">
                <span>Borrower score</span>
                <strong>{details.recommendation.score} / 1000</strong>
              </div>
              <div className="score-meter" role="progressbar" aria-valuemin={0} aria-valuemax={1000} aria-valuenow={details.recommendation.score}>
                <div className="score-fill" style={{ width: scoreFillWidth }} />
              </div>
              <p className="score-band">Score band: {toScoreBand(details.recommendation.score)}</p>
            </div>

            <div className="rationale">
              <h3>Decision rationale</h3>
              {details.recommendation.reasons.length > 0 ? (
                <ul>
                  {details.recommendation.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : (
                <p>No rationale returned.</p>
              )}
            </div>

            <div className="explanation" aria-label="Score explanation">
              <h3>Score explanation</h3>
              <p>Base score: {details.recommendation.explanation.baseScore}</p>

              <div className="waterfall" aria-label="Score waterfall">
                <h4>Score waterfall</h4>
                <div className="waterfall-row">
                  <span>Base</span>
                  <div className="waterfall-track">
                    <div
                      className="waterfall-fill base"
                      style={{ width: `${Math.min(Math.max(details.recommendation.explanation.baseScore, 0), 1000) / 10}%` }}
                    />
                  </div>
                  <strong>{details.recommendation.explanation.baseScore}</strong>
                </div>
                {waterfallSteps.length > 0 ? (
                  waterfallSteps.map((step) => (
                    <div className="waterfall-row" key={`${step.key}-${step.label}-${step.endScore}`}>
                      <span>{step.label}</span>
                      <div className="waterfall-track">
                        <div
                          className={`waterfall-fill ${step.impact >= 0 ? "positive" : "negative"}`}
                          style={{ width: `${Math.min(Math.max(step.endScore, 0), 1000) / 10}%` }}
                        />
                      </div>
                      <strong>{formatImpact(step.impact)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="waterfall-empty">No component deltas in this run.</p>
                )}
                <p className="waterfall-final">Final score: {details.recommendation.score}</p>
              </div>

              <h4>Component impacts</h4>
              {details.recommendation.explanation.components.length > 0 ? (
                <ul className="component-list">
                  {details.recommendation.explanation.components.map((component) => (
                    <li key={`${component.key}-${component.label}`}>
                      <strong>{component.label}</strong>
                      <span className="impact-chip">{formatImpact(component.impact)}</span>
                      <p>{component.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No score components available.</p>
              )}

              <h4>Policy notes</h4>
              {details.recommendation.explanation.policyNotes.length > 0 ? (
                <ul>
                  {details.recommendation.explanation.policyNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : (
                <p>No policy notes returned.</p>
              )}
            </div>

            <div className="diagnostics" aria-label="Row diagnostics">
              {useShell ? (
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Row diagnostics
                    </Typography>

                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }} role="group" aria-label="Quick diagnostics filters">
                      <Chip
                        label={`All (${diagnosticCounts.all})`}
                        clickable
                        color={diagnosticFilter === "all" ? "primary" : "default"}
                        variant={diagnosticFilter === "all" ? "filled" : "outlined"}
                        onClick={() => setDiagnosticFilter("all")}
                      />
                      <Chip
                        label={`Errors (${diagnosticCounts.errors})`}
                        clickable
                        color={diagnosticFilter === "errors" ? "error" : "default"}
                        variant={diagnosticFilter === "errors" ? "filled" : "outlined"}
                        onClick={() => setDiagnosticFilter("errors")}
                      />
                      <Chip
                        label={`Warnings (${diagnosticCounts.warnings})`}
                        clickable
                        color={diagnosticFilter === "warnings" ? "warning" : "default"}
                        variant={diagnosticFilter === "warnings" ? "filled" : "outlined"}
                        onClick={() => setDiagnosticFilter("warnings")}
                      />
                    </Stack>

                    <Box
                      sx={{
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }
                      }}
                    >
                      <FormControl size="small">
                        <InputLabel id="shell-diagnostic-filter-label">Diagnostic filter</InputLabel>
                        <Select
                          labelId="shell-diagnostic-filter-label"
                          label="Diagnostic filter"
                          value={diagnosticFilter}
                          onChange={(event) => setDiagnosticFilter(event.target.value as DiagnosticFilter)}
                        >
                          <MenuItem value="all">all</MenuItem>
                          <MenuItem value="errors">errors</MenuItem>
                          <MenuItem value="warnings">warnings</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        id="shell-diagnostic-query"
                        size="small"
                        label="Search diagnostics"
                        value={diagnosticQuery}
                        onChange={(event) => setDiagnosticQuery(event.target.value)}
                        placeholder="Search by field, code, or message"
                      />

                      <FormControl size="small">
                        <InputLabel id="shell-diagnostic-sort-label">Diagnostic sort</InputLabel>
                        <Select
                          labelId="shell-diagnostic-sort-label"
                          label="Diagnostic sort"
                          value={diagnosticSort}
                          onChange={(event) => {
                            setDiagnosticSort(event.target.value as DiagnosticSort);
                            setDiagnosticSortDirection("asc");
                          }}
                        >
                          <MenuItem value="row">row</MenuItem>
                          <MenuItem value="type">type</MenuItem>
                          <MenuItem value="code">code</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl size="small">
                        <InputLabel id="shell-diagnostic-page-size-label">Rows per page</InputLabel>
                        <Select
                          labelId="shell-diagnostic-page-size-label"
                          label="Rows per page"
                          value={String(diagnosticPageSize)}
                          onChange={(event) => {
                            setDiagnosticPageSize(Number.parseInt(event.target.value, 10));
                            setDiagnosticPage(1);
                          }}
                        >
                          <MenuItem value="10">10</MenuItem>
                          <MenuItem value="25">25</MenuItem>
                          <MenuItem value="50">50</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      Showing {details.diagnostics?.items?.length ?? 0} of {details.diagnostics?.total ?? 0} diagnostics
                    </Typography>

                    {details?.diagnostics?.items?.length > 0 ? (
                      <>
                        <TableContainer>
                          <Table size="small" aria-label="Row diagnostics">
                            <TableHead>
                              <TableRow>
                                <TableCell>
                                  <Button size="small" onClick={() => onDiagnosticSortChange("type")}>
                                    Type {diagnosticSort === "type" ? `(${diagnosticSortDirection})` : ""}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <Button size="small" onClick={() => onDiagnosticSortChange("row")}>
                                    Row {diagnosticSort === "row" ? `(${diagnosticSortDirection})` : ""}
                                  </Button>
                                </TableCell>
                                <TableCell>Field</TableCell>
                                <TableCell>
                                  <Button size="small" onClick={() => onDiagnosticSortChange("code")}>
                                    Code {diagnosticSort === "code" ? `(${diagnosticSortDirection})` : ""}
                                  </Button>
                                </TableCell>
                                <TableCell>Message</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {details.diagnostics.items.map((entry) => (
                                <TableRow key={`${entry.type}-${entry.row}-${entry.field}-${entry.code}-${entry.message}`} hover>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      label={entry.type}
                                      color={entry.type === "error" ? "error" : "warning"}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell>{entry.row}</TableCell>
                                  <TableCell>{entry.field}</TableCell>
                                  <TableCell>{entry.code}</TableCell>
                                  <TableCell>{entry.message}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }} aria-label="Diagnostics pagination">
                          <Typography variant="body2" color="text.secondary">
                            Page {details.diagnostics.page} of {details.diagnostics.totalPages}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Button
                              type="button"
                              onClick={() => setDiagnosticPage((current) => Math.max(1, current - 1))}
                              disabled={details.diagnostics.page <= 1}
                              size="small"
                              variant="outlined"
                            >
                              Previous
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setDiagnosticPage((current) => Math.min(details.diagnostics.totalPages, current + 1))}
                              disabled={details.diagnostics.page >= details.diagnostics.totalPages}
                              size="small"
                              variant="outlined"
                            >
                              Next
                            </Button>
                          </Stack>
                        </Box>
                      </>
                    ) : (
                      <Alert severity="info">No diagnostics match this filter.</Alert>
                    )}
                  </Stack>
                </Paper>
              ) : (
                <>
                  <div className="diagnostics-header">
                    <h3>Row diagnostics</h3>
                    <div className="quick-filters" role="group" aria-label="Quick diagnostics filters">
                      <button
                        type="button"
                        className="quick-filter-chip"
                        aria-pressed={diagnosticFilter === "all"}
                        onClick={() => setDiagnosticFilter("all")}
                      >
                        All ({diagnosticCounts.all})
                      </button>
                      <button
                        type="button"
                        className="quick-filter-chip"
                        aria-pressed={diagnosticFilter === "errors"}
                        onClick={() => setDiagnosticFilter("errors")}
                      >
                        Errors ({diagnosticCounts.errors})
                      </button>
                      <button
                        type="button"
                        className="quick-filter-chip"
                        aria-pressed={diagnosticFilter === "warnings"}
                        onClick={() => setDiagnosticFilter("warnings")}
                      >
                        Warnings ({diagnosticCounts.warnings})
                      </button>
                    </div>
                    <label htmlFor="diagnostic-filter">Diagnostic filter</label>
                    <select
                      id="diagnostic-filter"
                      value={diagnosticFilter}
                      onChange={(event) => setDiagnosticFilter(event.target.value as DiagnosticFilter)}
                    >
                      <option value="all">all</option>
                      <option value="errors">errors</option>
                      <option value="warnings">warnings</option>
                    </select>
                    <label htmlFor="diagnostic-query">Search diagnostics</label>
                    <input
                      id="diagnostic-query"
                      type="text"
                      value={diagnosticQuery}
                      onChange={(event) => setDiagnosticQuery(event.target.value)}
                      placeholder="Search by field, code, or message"
                    />
                    <label htmlFor="diagnostic-sort">Diagnostic sort</label>
                    <select
                      id="diagnostic-sort"
                      value={diagnosticSort}
                      onChange={(event) => {
                        setDiagnosticSort(event.target.value as DiagnosticSort);
                        setDiagnosticSortDirection("asc");
                      }}
                    >
                      <option value="row">row</option>
                      <option value="type">type</option>
                      <option value="code">code</option>
                    </select>
                    <label htmlFor="diagnostic-page-size">Rows per page</label>
                    <select
                      id="diagnostic-page-size"
                      value={String(diagnosticPageSize)}
                      onChange={(event) => setDiagnosticPageSize(Number.parseInt(event.target.value, 10))}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                    <p className="diagnostics-meta">
                      Showing {details.diagnostics?.items?.length ?? 0} of {details.diagnostics?.total ?? 0} diagnostics
                    </p>
                  </div>

                  {details?.diagnostics?.items?.length > 0 ? (
                    <div className="diagnostics-table-wrap">
                      <table className="diagnostics-table">
                        <thead>
                          <tr>
                            <th scope="col" aria-sort={diagnosticSort === "type" ? (diagnosticSortDirection === "asc" ? "ascending" : "descending") : "none"}>
                              <button type="button" className="sort-toggle" onClick={() => onDiagnosticSortChange("type")}>
                                Type
                              </button>
                            </th>
                            <th scope="col" aria-sort={diagnosticSort === "row" ? (diagnosticSortDirection === "asc" ? "ascending" : "descending") : "none"}>
                              <button type="button" className="sort-toggle" onClick={() => onDiagnosticSortChange("row")}>
                                Row
                              </button>
                            </th>
                            <th scope="col">Field</th>
                            <th scope="col" aria-sort={diagnosticSort === "code" ? (diagnosticSortDirection === "asc" ? "ascending" : "descending") : "none"}>
                              <button type="button" className="sort-toggle" onClick={() => onDiagnosticSortChange("code")}>
                                Code
                              </button>
                            </th>
                            <th scope="col">Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.diagnostics.items.map((entry) => (
                            <tr key={`${entry.type}-${entry.row}-${entry.field}-${entry.code}-${entry.message}`}>
                              <td>{entry.type}</td>
                              <td>{entry.row}</td>
                              <td>{entry.field}</td>
                              <td>{entry.code}</td>
                              <td>{entry.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="pagination-controls" aria-label="Diagnostics pagination">
                        <p className="pagination-meta">
                          Page {details.diagnostics.page} of {details.diagnostics.totalPages}
                        </p>
                        <div className="pagination-buttons">
                          <button
                            type="button"
                            onClick={() => setDiagnosticPage((current) => Math.max(1, current - 1))}
                            disabled={details.diagnostics.page <= 1}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiagnosticPage((current) => Math.min(details.diagnostics.totalPages, current + 1))}
                            disabled={details.diagnostics.page >= details.diagnostics.totalPages}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="diagnostics-empty">No diagnostics match this filter.</p>
                  )}
                </>
              )}
            </div>

            {details.override ? (
              <>
                <p>Override decision: {details.override.decision}</p>
                <p>Override reason: {details.override.reason}</p>
                <p>Overridden by: {details.override.overriddenBy}</p>
                <p>Overridden at: {new Date(details.override.overriddenAt).toLocaleString()}</p>
              </>
            ) : (
              <p>No override recorded.</p>
            )}
          </section>
        ) : null}

        {!useShell ? <p className={statusClassName}>{message}</p> : null}
      </section>
    )}
  </>
  );

  const shellRoleLabel = role
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
  const shellTotalRows = details?.summary.totalRows ?? 0;
  const shellErrorRows = details?.summary.errorRows ?? 0;
  const shellRisk = details ? toRiskLabel(details.recommendation.riskCategory) : "Pending";
  const shellStatusSeverity =
    state === "error" ? "error" : state === "success" ? "success" : state === "working" ? "warning" : "info";

  if (useShell) {
    return (
      <AppShell
        environment="Development"
        role={role}
        onRoleChange={(nextRole) => setRole(nextRole)}
        section={showAuditLog ? "audit" : "main"}
        onSectionChange={(next) => setShowAuditLog(next === "audit")}
      >
        <section className="shell-dashboard" aria-label="CreditIQ Dashboard">
          <header className="shell-header">
            <p className="shell-kicker">International-ready operations console</p>
            <h2>{showAuditLog ? "Audit & Compliance" : "Portfolio Intake Dashboard"}</h2>
            <p>
              Active role: <strong>{shellRoleLabel}</strong>
            </p>
          </header>

          <section className="shell-kpi-grid" aria-label="Portfolio metrics">
            <article className="shell-kpi-card">
              <p className="shell-kpi-label">Rows Processed</p>
              <p className="shell-kpi-value">{shellTotalRows}</p>
            </article>
            <article className="shell-kpi-card">
              <p className="shell-kpi-label">Error Rows</p>
              <p className="shell-kpi-value">{shellErrorRows}</p>
            </article>
            <article className="shell-kpi-card">
              <p className="shell-kpi-label">Risk Band</p>
              <p className="shell-kpi-value">{shellRisk}</p>
            </article>
          </section>

          {!showAuditLog ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Upload Operations
                </Typography>
                <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr 1fr" } }}>
                  <TextField
                    id="shell-upload-id"
                    label="Upload ID"
                    value={uploadId}
                    onChange={(event) => setUploadId(event.target.value)}
                    placeholder="Paste uploadId"
                    size="small"
                  />
                  <Button variant="contained" onClick={validateUpload} disabled={state === "working"}>
                    Validate Upload
                  </Button>
                  <Button variant="outlined" onClick={fetchUploadDetails} disabled={state === "working"}>
                    Fetch Details
                  </Button>
                </Box>
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  <Button variant="outlined" onClick={downloadReport} disabled={state === "working"}>
                    Download Report
                  </Button>
                  {(role === "credit_manager" || role === "admin") && (
                    <Button variant="contained" color="secondary" onClick={submitOverride} disabled={state === "working" || overrideReason.trim().length < 10}>
                      Submit Override
                    </Button>
                  )}
                </Box>
                <Alert severity={shellStatusSeverity}>{message}</Alert>
              </Stack>
            </Paper>
          ) : null}

          <section className="shell-stage">{pageContent}</section>
        </section>
      </AppShell>
    );
  }

  return <main className="page">{pageContent}</main>;
}
