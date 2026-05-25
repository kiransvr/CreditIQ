import { useMemo, useState } from "react";

type ScreenState = "idle" | "working" | "success" | "error";
type UserRole = "loan_officer" | "credit_manager" | "risk_analyst" | "auditor";

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
  errors: Array<{ row: number; field: string; code: string; message: string }>;
  warnings: Array<{ row: number; field: string; code: string; message: string }>;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export function App() {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<UserRole>("loan_officer");
  const [uploadId, setUploadId] = useState("");
  const [state, setState] = useState<ScreenState>("idle");
  const [message, setMessage] = useState("Ready. Upload a file or fetch an existing upload.");
  const [details, setDetails] = useState<UploadDetails | null>(null);

  const statusClassName = useMemo(() => `status ${state}`, [state]);

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

    setState("working");
    setMessage("Fetching upload details...");

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/uploads/${uploadId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const body = (await response.json()) as UploadDetails;
      setDetails(body);
      setState("success");
      setMessage(`Loaded details for ${body.uploadId}`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not fetch upload details.");
    }
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

  return (
    <main className="page">
      <section className="card">
        <h1>CreditIQ Lite</h1>
        <p>Role-aware upload, validate, and report workflow.</p>

        <div className="toolbar">
          <label htmlFor="role">Role</label>
          <select id="role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            <option value="loan_officer">loan_officer</option>
            <option value="credit_manager">credit_manager</option>
            <option value="risk_analyst">risk_analyst</option>
            <option value="auditor">auditor</option>
          </select>
        </div>

        {role !== "auditor" ? (
          <form onSubmit={uploadFile}>
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

        <div className="actions">
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

        {details ? (
          <section className="summary">
            <h2>Validation Summary</h2>
            <p>Upload: {details.uploadId}</p>
            <p>Status: {details.status}</p>
            <p>Total rows: {details.summary.totalRows}</p>
            <p>Valid rows: {details.summary.validRows}</p>
            <p>Error rows: {details.summary.errorRows}</p>
            <p>Warning rows: {details.summary.warningRows}</p>
          </section>
        ) : null}

        <p className={statusClassName}>{message}</p>
      </section>
    </main>
  );
}
