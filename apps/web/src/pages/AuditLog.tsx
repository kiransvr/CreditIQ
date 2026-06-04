
import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import DownloadIcon from "@mui/icons-material/Download";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import type { ShellLanguage } from "../shell/AppShell";

interface AuditEvent {
  id: string;
  actor_user_id: string;
  action_type: string;
  object_type: string;
  object_id: string;
  metadata_json: any;
  created_at: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

interface AuditI18n {
  loadingAuditLog: string;
  failedToFetchAuditEvents: string;
  failedToDownloadCsv: string;
  creditIqAuditLog: string;
  downloadCsv: string;
  auditLog: string;
  startDate: string;
  endDate: string;
  action: string;
  user: string;
  objectType: string;
  objectId: string;
  metadataSearch: string;
  quickSearchLocal: string;
  all: string;
  time: string;
  object: string;
  details: string;
  csvDownloaded: string;
  rows: string;
  score: string;
  risk: string;
  decision: string;
  reason: string;
  file: string;
  template: string;
}

const AUDIT_I18N: Record<ShellLanguage, AuditI18n> = {
  en: {
    loadingAuditLog: "Loading audit log...",
    failedToFetchAuditEvents: "Failed to fetch audit events",
    failedToDownloadCsv: "Failed to download CSV",
    creditIqAuditLog: "CreditIQ Audit Log",
    downloadCsv: "Download CSV",
    auditLog: "Audit Log",
    startDate: "Start Date",
    endDate: "End Date",
    action: "Action",
    user: "User",
    objectType: "Object Type",
    objectId: "Object ID",
    metadataSearch: "Metadata search",
    quickSearchLocal: "Quick search (local)",
    all: "All",
    time: "Time",
    object: "Object",
    details: "Details",
    csvDownloaded: "CSV downloaded!",
    rows: "Rows",
    score: "Score",
    risk: "Risk",
    decision: "Decision",
    reason: "Reason",
    file: "File",
    template: "Template"
  },
  "en-IN": {
    loadingAuditLog: "Loading audit log...",
    failedToFetchAuditEvents: "Failed to fetch audit events",
    failedToDownloadCsv: "Failed to download CSV",
    creditIqAuditLog: "CreditIQ Audit Log",
    downloadCsv: "Download CSV",
    auditLog: "Audit Log",
    startDate: "Start Date",
    endDate: "End Date",
    action: "Action",
    user: "User",
    objectType: "Object Type",
    objectId: "Object ID",
    metadataSearch: "Metadata search",
    quickSearchLocal: "Quick search (local)",
    all: "All",
    time: "Time",
    object: "Object",
    details: "Details",
    csvDownloaded: "CSV downloaded!",
    rows: "Rows",
    score: "Score",
    risk: "Risk",
    decision: "Decision",
    reason: "Reason",
    file: "File",
    template: "Template"
  },
  es: {
    loadingAuditLog: "Cargando registro de auditoria...",
    failedToFetchAuditEvents: "No se pudo obtener eventos de auditoria",
    failedToDownloadCsv: "No se pudo descargar CSV",
    creditIqAuditLog: "Registro de auditoria CreditIQ",
    downloadCsv: "Descargar CSV",
    auditLog: "Registro de auditoria",
    startDate: "Fecha inicio",
    endDate: "Fecha fin",
    action: "Accion",
    user: "Usuario",
    objectType: "Tipo de objeto",
    objectId: "ID de objeto",
    metadataSearch: "Busqueda en metadatos",
    quickSearchLocal: "Busqueda rapida (local)",
    all: "Todos",
    time: "Hora",
    object: "Objeto",
    details: "Detalles",
    csvDownloaded: "CSV descargado!",
    rows: "Filas",
    score: "Puntaje",
    risk: "Riesgo",
    decision: "Decision",
    reason: "Motivo",
    file: "Archivo",
    template: "Plantilla"
  },
  ar: {
    loadingAuditLog: "جاري تحميل سجل التدقيق...",
    failedToFetchAuditEvents: "تعذر جلب احداث التدقيق",
    failedToDownloadCsv: "تعذر تنزيل CSV",
    creditIqAuditLog: "سجل تدقيق CreditIQ",
    downloadCsv: "تنزيل CSV",
    auditLog: "سجل التدقيق",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    action: "الإجراء",
    user: "المستخدم",
    objectType: "نوع الكائن",
    objectId: "معرف الكائن",
    metadataSearch: "بحث البيانات الوصفية",
    quickSearchLocal: "بحث سريع (محلي)",
    all: "الكل",
    time: "الوقت",
    object: "الكائن",
    details: "التفاصيل",
    csvDownloaded: "تم تنزيل CSV!",
    rows: "الصفوف",
    score: "النتيجة",
    risk: "المخاطر",
    decision: "القرار",
    reason: "السبب",
    file: "الملف",
    template: "القالب"
  },
  "am-ET": {
    loadingAuditLog: "የኦዲት ማስታወሻ በመጫን ላይ...",
    failedToFetchAuditEvents: "የኦዲት ክስተቶችን ማምጣት አልተሳካም",
    failedToDownloadCsv: "CSV ማውረድ አልተሳካም",
    creditIqAuditLog: "CreditIQ የኦዲት ማስታወሻ",
    downloadCsv: "CSV አውርድ",
    auditLog: "የኦዲት ማስታወሻ",
    startDate: "መጀመሪያ ቀን",
    endDate: "መጨረሻ ቀን",
    action: "እርምጃ",
    user: "ተጠቃሚ",
    objectType: "የነገር አይነት",
    objectId: "የነገር መለያ",
    metadataSearch: "ሜታዳታ ፍለጋ",
    quickSearchLocal: "ፈጣን ፍለጋ (አካባቢ)",
    all: "ሁሉም",
    time: "ሰዓት",
    object: "ነገር",
    details: "ዝርዝር",
    csvDownloaded: "CSV ወርዷል!",
    rows: "ረድፎች",
    score: "ውጤት",
    risk: "አደጋ",
    decision: "ውሳኔ",
    reason: "ምክንያት",
    file: "ፋይል",
    template: "ቅጥ"
  }
};

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers?.get?.("content-type") ?? "";

  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${fallbackMessage} (received non-JSON response)`);
  }

  if (typeof response.text === "function") {
    const rawBody = await response.text();

    try {
      return JSON.parse(rawBody) as T;
    } catch {
      throw new Error(`${fallbackMessage} (received non-JSON response)`);
    }
  }

  if (typeof response.json === "function") {
    try {
      return (await response.json()) as T;
    } catch {
      throw new Error(`${fallbackMessage} (received non-JSON response)`);
    }
  }

  throw new Error(`${fallbackMessage} (received non-JSON response)`);
}

async function parseApiError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const body = await parseJsonResponse<{ message?: string; error?: string; details?: string }>(response, fallbackMessage);
    return body.message ?? body.error ?? body.details ?? `${fallbackMessage} (${response.status})`;
  } catch {
    return `${fallbackMessage} (${response.status})`;
  }
}

function MetadataDetail({ action, meta, t }: { action: string; meta: any; t: AuditI18n }) {
  if (!meta || typeof meta !== "object") return <span style={{ color: "#aaa" }}>—</span>;

  if (action === "upload_created") {
    return (
      <span style={{ fontSize: "0.85em" }}>
        <b>{t.file}:</b> {meta.fileName ?? "—"}&nbsp;&nbsp;
        <b>{t.template}:</b> {meta.templateVersion ?? "—"}
      </span>
    );
  }

  if (action === "upload_validated") {
    const rec = meta.recommendation;
    return (
      <span style={{ fontSize: "0.85em" }}>
        <b>{t.rows}:</b> {meta.totalRows ?? "—"}&nbsp;
        <span style={{ color: "#c62828" }}>✗ {meta.errorRows ?? 0} errors</span>&nbsp;
        <span style={{ color: "#f57c00" }}>⚠ {meta.warningRows ?? 0} warnings</span>
        {rec && (
          <>&nbsp;&nbsp;<b>{t.decision}:</b>&nbsp;
            <span style={{
              padding: "1px 6px",
              borderRadius: 4,
              fontSize: "0.9em",
              fontWeight: 700,
              background:
                rec.decision === "proceed" ? "#e8f5e9" :
                rec.decision === "reject" ? "#ffebee" :
                rec.decision === "lower_loan" ? "#fff3e0" : "#f3e5f5",
              color:
                rec.decision === "proceed" ? "#2e7d32" :
                rec.decision === "reject" ? "#c62828" :
                rec.decision === "lower_loan" ? "#e65100" : "#6a1b9a",
            }}>
              {rec.decision?.replace(/_/g, " ")}
            </span>&nbsp;
            <b>{t.score}:</b> {rec.score ?? "—"}&nbsp;
            <b>{t.risk}:</b> {rec.riskCategory ?? "—"}
          </>
        )}
      </span>
    );
  }

  if (action === "upload_overridden") {
    return (
      <span style={{ fontSize: "0.85em" }}>
        <b>{t.decision}:</b>&nbsp;
        <span style={{
          padding: "1px 6px",
          borderRadius: 4,
          fontWeight: 700,
          background: meta.decision === "proceed" ? "#e8f5e9" : meta.decision === "reject" ? "#ffebee" : "#fff3e0",
          color: meta.decision === "proceed" ? "#2e7d32" : meta.decision === "reject" ? "#c62828" : "#e65100",
        }}>
          {meta.decision?.replace(/_/g, " ")}
        </span>&nbsp;&nbsp;
        <b>{t.reason}:</b> {meta.reason ?? "—"}
      </span>
    );
  }

  // fallback for unknown action types
  return (
    <span style={{ fontSize: "0.82em", color: "#555" }}>
      {Object.entries(meta)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? "…" : v}`)
        .join(" · ")}
    </span>
  );
}


interface AuditLogProps {
  language?: ShellLanguage;
}

export default function AuditLog({ language = "en" }: AuditLogProps) {
  const t = AUDIT_I18N[language] ?? AUDIT_I18N.en;
  const [showSuccess, setShowSuccess] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [objectTypeFilter, setObjectTypeFilter] = useState("");
  const [objectIdFilter, setObjectIdFilter] = useState("");
  const [metadataSearch, setMetadataSearch] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function fetchAuditEvents(params: URLSearchParams): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/v1/audit/events?${params.toString()}`);

    if (!response.ok) {
      throw new Error(await parseApiError(response, t.failedToFetchAuditEvents));
    }

    const data = await parseJsonResponse<{ items?: AuditEvent[] }>(response, t.failedToFetchAuditEvents);
    setEvents(data.items ?? []);
  }

  // Fetch audit events with filters
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.append("page", "1");
    params.append("pageSize", "100");
    if (actionFilter) params.append("actionType", actionFilter);
    if (userFilter) params.append("actorUserId", userFilter);
    if (objectTypeFilter) params.append("objectType", objectTypeFilter);
    if (objectIdFilter) params.append("objectId", objectIdFilter);
    if (metadataSearch) params.append("metadataSearch", metadataSearch);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    fetchAuditEvents(params)
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
          setError(err instanceof Error ? err.message : t.failedToFetchAuditEvents);
        setLoading(false);
      });
        }, [actionFilter, userFilter, objectTypeFilter, objectIdFilter, metadataSearch, startDate, endDate, t.failedToFetchAuditEvents]);

  const filtered = events.filter((e) => {
    if (actionFilter && e.action_type !== actionFilter) return false;
    if (userFilter && e.actor_user_id !== userFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        e.action_type.toLowerCase().includes(s) ||
        e.actor_user_id.toLowerCase().includes(s) ||
        e.object_type.toLowerCase().includes(s) ||
        e.object_id.toLowerCase().includes(s) ||
        JSON.stringify(e.metadata_json).toLowerCase().includes(s)
      );
    }
    return true;
  });


  const uniqueActions = Array.from(new Set(events.map((e) => e.action_type)));
  const uniqueUsers = Array.from(new Set(events.map((e) => e.actor_user_id)));
  const uniqueObjectTypes = Array.from(new Set(events.map((e) => e.object_type)));
  const uniqueObjectIds = Array.from(new Set(events.map((e) => e.object_id)));

  if (loading) return <div>{t.loadingAuditLog}</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  // Download CSV handler
  const handleDownloadCSV = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/audit/events/export`);
      if (!res.ok) throw new Error(t.failedToDownloadCsv);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AuditEvents.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setShowSuccess(true);
    } catch (err) {
      alert(t.failedToDownloadCsv);
    }
  };

  // --- MUI UI ---
  return (
    <Box sx={{ bgcolor: "#f5f6fa", minHeight: "100vh" }}>
      <AppBar position="static" color="primary" elevation={2}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <span style={{ fontWeight: 700, letterSpacing: 1 }}>{t.creditIqAuditLog}</span>
          </Typography>
          <Button
            color="inherit"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCSV}
            sx={{ ml: 2 }}
          >
            {t.downloadCsv}
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4, p: 2 }}>
        <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            {t.auditLog}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
            <TextField
              label={t.startDate}
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              size="small"
            />
            <TextField
              label={t.endDate}
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              size="small"
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t.action}</InputLabel>
              <Select
                label={t.action}
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
              >
                <MenuItem value="">{t.all}</MenuItem>
                {uniqueActions.map((a) => (
                  <MenuItem key={a} value={a}>{a}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t.user}</InputLabel>
              <Select
                label={t.user}
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
              >
                <MenuItem value="">{t.all}</MenuItem>
                {uniqueUsers.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t.objectType}</InputLabel>
              <Select
                label={t.objectType}
                value={objectTypeFilter}
                onChange={e => setObjectTypeFilter(e.target.value)}
              >
                <MenuItem value="">{t.all}</MenuItem>
                {uniqueObjectTypes.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t.objectId}</InputLabel>
              <Select
                label={t.objectId}
                value={objectIdFilter}
                onChange={e => setObjectIdFilter(e.target.value)}
              >
                <MenuItem value="">{t.all}</MenuItem>
                {uniqueObjectIds.map((id) => (
                  <MenuItem key={id} value={id}>{id}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t.metadataSearch}
              value={metadataSearch}
              onChange={e => setMetadataSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
            />
            <TextField
              label={t.quickSearchLocal}
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
            />
          </Box>

          {loading ? (
            <Typography>{t.loadingAuditLog}</Typography>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          ) : (
            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t.time}</TableCell>
                    <TableCell>{t.user}</TableCell>
                    <TableCell>{t.action}</TableCell>
                    <TableCell>{t.object}</TableCell>
                    <TableCell>{t.details}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                      <TableCell>{e.actor_user_id}</TableCell>
                      <TableCell>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: "0.78em",
                          fontWeight: 600,
                          background:
                            e.action_type === "upload_created" ? "#e3f2fd" :
                            e.action_type === "upload_validated" ? "#e8f5e9" :
                            e.action_type === "upload_overridden" ? "#fff3e0" : "#f3e5f5",
                          color:
                            e.action_type === "upload_created" ? "#1565c0" :
                            e.action_type === "upload_validated" ? "#2e7d32" :
                            e.action_type === "upload_overridden" ? "#e65100" : "#6a1b9a",
                        }}>
                          {e.action_type.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span style={{ fontWeight: 500 }}>{e.object_type}</span>
                        <span style={{ color: "#888", fontSize: "0.8em", marginLeft: 4 }}>
                          {String(e.object_id).length > 8 ? `${String(e.object_id).slice(0, 8)}…` : e.object_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <MetadataDetail action={e.action_type} meta={e.metadata_json} t={t} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ width: '100%' }}>
          {t.csvDownloaded}
        </Alert>
      </Snackbar>
    </Box>
  );
}
