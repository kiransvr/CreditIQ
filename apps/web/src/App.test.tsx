import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("App recommendation summary", () => {
  it("renders score, risk badge, and rationale after fetch details", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          uploadId: "upl_123",
          status: "validated",
          summary: {
            totalRows: 3,
            validRows: 2,
            errorRows: 1,
            warningRows: 1
          },
          recommendation: {
            decision: "manual_review",
            suggestedAmount: 1200,
            score: 540,
            riskCategory: "high",
            explanation: {
              baseScore: 700,
              components: [
                {
                  key: "data_quality",
                  label: "Data quality errors",
                  impact: -120,
                  detail: "1 rows contain blocking validation errors."
                }
              ],
              policyNotes: ["Policy rule: blocking validation errors force manual_review."]
            },
            reasons: [
              "Validated 3 rows with 1 error rows and 1 warning rows.",
              "Calculated borrower score is 540 with high risk category."
            ]
          },
          override: null,
          errors: [
            {
              row: 2,
              field: "monthly_income",
              code: "REQUIRED",
              message: "Monthly income is required"
            }
          ],
          warnings: [
            {
              row: 3,
              field: "national_id",
              code: "FORMAT",
              message: "National ID format looks unusual"
            }
          ]
        })
      } as Response);

    render(<App />);

    const uploadIdInput = screen.getByLabelText("Upload ID");
    await userEvent.type(uploadIdInput, "upl_123");

    const fetchButton = screen.getByRole("button", { name: "Fetch Details" });
    await userEvent.click(fetchButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Decision: Manual Review")).toBeInTheDocument();
    expect(screen.getByText("Risk: High")).toBeInTheDocument();
    expect(screen.getByText("Borrower score")).toBeInTheDocument();
    expect(screen.getByText("540 / 1000")).toBeInTheDocument();
    expect(screen.getByText("Score band: Constrained")).toBeInTheDocument();
    expect(screen.getByText("Decision rationale")).toBeInTheDocument();
    expect(screen.getByText("Calculated borrower score is 540 with high risk category.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Score explanation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Score waterfall" })).toBeInTheDocument();
    expect(screen.getByText("Base score: 700")).toBeInTheDocument();
    expect(screen.getByText("Final score: 540")).toBeInTheDocument();
    expect(screen.getAllByText("Data quality errors").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("-120").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Policy rule: blocking validation errors force manual_review.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Row diagnostics" })).toBeInTheDocument();
    expect(screen.getByText("Monthly income is required")).toBeInTheDocument();
    expect(screen.getByText("National ID format looks unusual")).toBeInTheDocument();
    expect(screen.getByText("Showing 2 of 2 diagnostics")).toBeInTheDocument();
  });

  it("shows an API error message when fetch details fails", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          message: "Upload was not found"
        })
      } as Response);

    render(<App />);

    const uploadIdInput = screen.getByLabelText("Upload ID");
    await userEvent.type(uploadIdInput, "missing_upload");

    const fetchButton = screen.getByRole("button", { name: "Fetch Details" });
    await userEvent.click(fetchButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Upload was not found")).toBeInTheDocument();
  });

  it("shows and hides role-specific UI controls", async () => {
    render(<App />);

    expect(screen.queryByRole("heading", { name: "Manual Override" })).not.toBeInTheDocument();

    const roleSelect = screen.getByLabelText("Role");
    await userEvent.selectOptions(roleSelect, "credit_manager");
    expect(screen.getByRole("heading", { name: "Manual Override" })).toBeInTheDocument();

    await userEvent.selectOptions(roleSelect, "auditor");
    expect(screen.queryByRole("heading", { name: "Manual Override" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Auditor view: upload is hidden; you can fetch existing upload and download report.")
    ).toBeInTheDocument();
  });

  it("filters diagnostics between all, errors, and warnings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        uploadId: "upl_diag",
        status: "validated",
        summary: {
          totalRows: 2,
          validRows: 1,
          errorRows: 1,
          warningRows: 1
        },
        recommendation: {
          decision: "manual_review",
          suggestedAmount: 1000,
          score: 500,
          riskCategory: "high",
          explanation: {
            baseScore: 700,
            components: [],
            policyNotes: []
          },
          reasons: ["Review recommended due to diagnostics."]
        },
        errors: [
          {
            row: 5,
            field: "monthly_income",
            code: "REQUIRED",
            message: "Monthly income is required"
          }
        ],
        warnings: [
          {
            row: 8,
            field: "phone",
            code: "FORMAT",
            message: "Phone format looks unusual"
          }
        ],
        override: null
      })
    } as Response);

    render(<App />);

    await userEvent.type(screen.getByLabelText("Upload ID"), "upl_diag");
    await userEvent.click(screen.getByRole("button", { name: "Fetch Details" }));

    await waitFor(() => {
      expect(screen.getByText("Showing 2 of 2 diagnostics")).toBeInTheDocument();
    });

    const filter = screen.getByLabelText("Diagnostic filter");

    await userEvent.selectOptions(filter, "errors");
    expect(screen.getByText("Monthly income is required")).toBeInTheDocument();
    expect(screen.queryByText("Phone format looks unusual")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2 diagnostics")).toBeInTheDocument();

    await userEvent.selectOptions(filter, "warnings");
    expect(screen.queryByText("Monthly income is required")).not.toBeInTheDocument();
    expect(screen.getByText("Phone format looks unusual")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2 diagnostics")).toBeInTheDocument();

    expect(screen.getByText("Final score: 500")).toBeInTheDocument();
    expect(screen.getByText("No component deltas in this run.")).toBeInTheDocument();
    expect(screen.getByText("No score components available.")).toBeInTheDocument();
    expect(screen.getByText("No policy notes returned.")).toBeInTheDocument();
  });

  it("sorts diagnostics by row, type, and code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        uploadId: "upl_sort",
        status: "validated",
        summary: {
          totalRows: 3,
          validRows: 0,
          errorRows: 2,
          warningRows: 1
        },
        recommendation: {
          decision: "manual_review",
          suggestedAmount: 700,
          score: 420,
          riskCategory: "very_high",
          explanation: {
            baseScore: 700,
            components: [],
            policyNotes: []
          },
          reasons: ["Review recommended due to diagnostics."]
        },
        errors: [
          {
            row: 9,
            field: "monthly_income",
            code: "ZETA",
            message: "Monthly income is invalid"
          },
          {
            row: 4,
            field: "tenure_months",
            code: "BETA",
            message: "Tenure must be positive"
          }
        ],
        warnings: [
          {
            row: 2,
            field: "phone",
            code: "ALPHA",
            message: "Phone format looks unusual"
          }
        ],
        override: null
      })
    } as Response);

    render(<App />);

    await userEvent.type(screen.getByLabelText("Upload ID"), "upl_sort");
    await userEvent.click(screen.getByRole("button", { name: "Fetch Details" }));

    await waitFor(() => {
      expect(screen.getByText(/Showing\s+3\s+of\s+3\s+diagnostics/i)).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText("Diagnostic sort");
    const table = screen.getByRole("table");

    function firstDataRowCells(): string[] {
      const rows = within(table).getAllByRole("row");
      const firstDataRow = rows[1];
      if (!firstDataRow) {
        throw new Error("Expected diagnostics table to include at least one data row.");
      }

      const cells = within(firstDataRow).getAllByRole("cell");
      return cells.map((cell) => cell.textContent ?? "");
    }

    expect(firstDataRowCells()).toEqual(["warning", "ROW-2", "ROW-2", "phone", "ALPHA", "Phone format looks unusual"]);

    await userEvent.selectOptions(sortSelect, "type");
    expect(firstDataRowCells()).toEqual(["error", "ROW-4", "ROW-4", "tenure_months", "BETA", "Tenure must be positive"]);

    await userEvent.selectOptions(sortSelect, "code");
    expect(firstDataRowCells()).toEqual(["warning", "ROW-2", "ROW-2", "phone", "ALPHA", "Phone format looks unusual"]);
  });

  it("sorts diagnostics from table headers and toggles direction", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        uploadId: "upl_header_sort",
        status: "validated",
        summary: {
          totalRows: 3,
          validRows: 0,
          errorRows: 2,
          warningRows: 1
        },
        recommendation: {
          decision: "manual_review",
          suggestedAmount: 800,
          score: 410,
          riskCategory: "very_high",
          explanation: {
            baseScore: 700,
            components: [],
            policyNotes: []
          },
          reasons: ["Review recommended due to diagnostics."]
        },
        errors: [
          {
            row: 9,
            field: "monthly_income",
            code: "ZETA",
            message: "Monthly income is invalid"
          },
          {
            row: 4,
            field: "tenure_months",
            code: "BETA",
            message: "Tenure must be positive"
          }
        ],
        warnings: [
          {
            row: 2,
            field: "phone",
            code: "ALPHA",
            message: "Phone format looks unusual"
          }
        ],
        override: null
      })
    } as Response);

    render(<App />);

    await userEvent.type(screen.getByLabelText("Upload ID"), "upl_header_sort");
    await userEvent.click(screen.getByRole("button", { name: "Fetch Details" }));

    await waitFor(() => {
      expect(screen.getByText(/Showing\s+3\s+of\s+3\s+diagnostics/i)).toBeInTheDocument();
    });

    const table = screen.getByRole("table");
    const rowHeader = screen.getByRole("button", { name: /Customer ID/i });
    const typeHeader = screen.getByRole("button", { name: "Type" });

    function firstDataRowCells(): string[] {
      const rows = within(table).getAllByRole("row");
      const firstDataRow = rows[1];
      if (!firstDataRow) {
        throw new Error("Expected diagnostics table to include at least one data row.");
      }

      const cells = within(firstDataRow).getAllByRole("cell");
      return cells.map((cell) => cell.textContent ?? "");
    }

    expect(firstDataRowCells()).toEqual(["warning", "ROW-2", "ROW-2", "phone", "ALPHA", "Phone format looks unusual"]);

    await userEvent.click(rowHeader);
    await waitFor(() => {
      expect(firstDataRowCells()).toEqual(["error", "ROW-9", "ROW-9", "monthly_income", "ZETA", "Monthly income is invalid"]);
    });

    await userEvent.click(typeHeader);
    await waitFor(() => {
      expect(firstDataRowCells()).toEqual(["error", "ROW-4", "ROW-4", "tenure_months", "BETA", "Tenure must be positive"]);
    });

    await userEvent.click(typeHeader);
    await waitFor(() => {
      expect(firstDataRowCells()).toEqual(["warning", "ROW-2", "ROW-2", "phone", "ALPHA", "Phone format looks unusual"]);
    });
  });

  it("searches diagnostics by field, code, and message", async () => {
    const diagnostics = [
      { type: "error", row: 2, field: "monthly_income", code: "REQUIRED", message: "Monthly income is required" },
      { type: "error", row: 6, field: "tenure_months", code: "RANGE", message: "Tenure must be between 1 and 60" },
      { type: "warning", row: 8, field: "phone", code: "FORMAT", message: "Phone format looks unusual" }
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        uploadId: "upl_search",
        status: "validated",
        summary: {
          totalRows: 3,
          validRows: 0,
          errorRows: 2,
          warningRows: 1
        },
        recommendation: {
          decision: "manual_review",
          suggestedAmount: 850,
          score: 430,
          riskCategory: "very_high",
          explanation: {
            baseScore: 700,
            components: [],
            policyNotes: []
          },
          reasons: ["Review recommended due to diagnostics."]
        },
        diagnostics: {
          items: diagnostics,
          total: diagnostics.length,
          page: 1,
          pageSize: 10,
          totalPages: 1
        },
        errors: [],
        warnings: [],
        override: null
      })
    } as Response);

    render(<App />);

    await userEvent.type(screen.getByLabelText("Upload ID"), "upl_search");
    await userEvent.click(screen.getByRole("button", { name: "Fetch Details" }));

    await waitFor(() => {
      expect(screen.getByText(/Showing\s+3\s+of\s+3\s+diagnostics/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText("Search diagnostics");

    await userEvent.type(searchInput, "range");
    expect(screen.getByText(/Showing\s+1\s+of\s+3\s+diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText("Tenure must be between 1 and 60")).toBeInTheDocument();
    expect(screen.queryByText("Monthly income is required")).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "phone format");
    expect(screen.getByText(/Showing\s+1\s+of\s+3\s+diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText("Phone format looks unusual")).toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "no-match-term");
    expect(screen.getByText(/Showing\s+0\s+of\s+3\s+diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText("No diagnostics match this filter.")).toBeInTheDocument();
  });

  it("supports quick diagnostics filter chips", async () => {
    const diagnostics = [
      { type: "error", row: 3, field: "monthly_income", code: "REQUIRED", message: "Monthly income is required" },
      { type: "warning", row: 7, field: "phone", code: "FORMAT", message: "Phone format looks unusual" }
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        uploadId: "upl_chips",
        status: "validated",
        summary: {
          totalRows: 2,
          validRows: 0,
          errorRows: 1,
          warningRows: 1
        },
        recommendation: {
          decision: "manual_review",
          suggestedAmount: 900,
          score: 470,
          riskCategory: "high",
          explanation: {
            baseScore: 700,
            components: [],
            policyNotes: []
          },
          reasons: ["Review recommended due to diagnostics."]
        },
        diagnostics: {
          items: diagnostics,
          total: diagnostics.length,
          page: 1,
          pageSize: 10,
          totalPages: 1
        },
        errors: [],
        warnings: [],
        override: null
      })
    } as Response);

    render(<App />);

    await userEvent.type(screen.getByLabelText("Upload ID"), "upl_chips");
    await userEvent.click(screen.getByRole("button", { name: "Fetch Details" }));

    await waitFor(() => {
      expect(screen.getByText(/Showing\s+2\s+of\s+2\s+diagnostics/i)).toBeInTheDocument();
    });

    const errorsChip = screen.getByRole("button", { name: "Errors (1)" });
    const warningsChip = screen.getByRole("button", { name: "Warnings (1)" });
    const allChip = screen.getByRole("button", { name: "All (2)" });

    await userEvent.click(errorsChip);
    expect(screen.getByText(/Showing\s+1\s+of\s+2\s+diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText("Monthly income is required")).toBeInTheDocument();
    expect(screen.queryByText("Phone format looks unusual")).not.toBeInTheDocument();

    await userEvent.click(warningsChip);
    expect(screen.getByText(/Showing\s+1\s+of\s+2\s+diagnostics/i)).toBeInTheDocument();
    expect(screen.queryByText("Monthly income is required")).not.toBeInTheDocument();
    expect(screen.getByText("Phone format looks unusual")).toBeInTheDocument();

    await userEvent.click(allChip);
    expect(screen.getByText(/Showing\s+2\s+of\s+2\s+diagnostics/i)).toBeInTheDocument();
  });

  it("paginates diagnostics for larger datasets", async () => {


    const manyErrors = Array.from({ length: 12 }, (_, index) => ({
      type: "error",
      row: index + 1,
      field: "monthly_income",
      code: "REQUIRED",
      message: `Monthly income is required #${index + 1}`
    }));

    let currentPage = 1;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      // Simulate pagination by checking the URL
      const url = input instanceof Request ? input.url : input;
      const urlStr = typeof url === "string" ? url : url.toString();
      const pageMatch = urlStr.match(/page=(\d+)/);
      if (pageMatch) currentPage = Number(pageMatch[1]);
      const pageSize = 10;
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      const pagedItems = manyErrors.slice(start, end);
      return {
        ok: true,
        json: async () => ({
          uploadId: "upl_paged",
          status: "validated",
          summary: {
            totalRows: 12,
            validRows: 0,
            errorRows: 12,
            warningRows: 0
          },
          recommendation: {
            decision: "manual_review",
            suggestedAmount: 0,
            score: 390,
            riskCategory: "very_high",
            explanation: {
              baseScore: 700,
              components: [],
              policyNotes: []
            },
            reasons: ["Review recommended due to diagnostics."]
          },
          diagnostics: {
            items: pagedItems,
            total: manyErrors.length,
            page: currentPage,
            pageSize,
            totalPages: 2
          },
          errors: [],
          warnings: [],
          override: null
        })
      } as Response;
    });

    render(<App />);

    await userEvent.type(screen.getByLabelText("Upload ID"), "upl_paged");
    await userEvent.click(screen.getByRole("button", { name: "Fetch Details" }));

    await waitFor(() => {
      expect(screen.getByText(/Showing\s+10\s+of\s+12\s+diagnostics/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Monthly income is required #1")).toBeInTheDocument();
    expect(screen.queryByText("Monthly income is required #11")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Monthly income is required #11")).toBeInTheDocument();
    expect(screen.queryByText("Monthly income is required #1")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Monthly income is required #1")).toBeInTheDocument();
  });
});
