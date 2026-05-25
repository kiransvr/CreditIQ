import { useMemo, useState } from "react";

type UploadState = "idle" | "uploading" | "success" | "error";

export function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("Ready to upload borrower data.");

  const statusClassName = useMemo(() => `status ${status}`, [status]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setStatus("error");
      setMessage("Choose a CSV or XLSX file first.");
      return;
    }

    setStatus("uploading");
    setMessage("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("institutionId", "demo-bank");
    formData.append("templateVersion", "v1");

    try {
      const response = await fetch("http://localhost:8080/api/v1/uploads", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message ?? "Upload failed");
      }

      const body = await response.json();
      setStatus("success");
      setMessage(`Upload accepted with id ${body.uploadId}`);
    } catch (error) {
      setStatus("error");
      const fallback = "Upload failed due to a network or server error.";
      setMessage(error instanceof Error ? error.message : fallback);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>CreditIQ Lite</h1>
        <p>Phase 1 upload and validation starter interface.</p>

        <form onSubmit={onSubmit}>
          <label htmlFor="borrower-file">Borrower data file</label>
          <input
            id="borrower-file"
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <button type="submit" disabled={status === "uploading"}>
            {status === "uploading" ? "Uploading..." : "Upload"}
          </button>
        </form>

        <p className={statusClassName}>{message}</p>
      </section>
    </main>
  );
}
