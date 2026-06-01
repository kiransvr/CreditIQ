import { expect, test } from "@playwright/test";

const uploadId = "upl_diag_001";

function makeDiagnostic(row: number, type: "error" | "warning") {
  return {
    type,
    row,
    field: type === "error" ? "income" : "dob",
    code: type === "error" ? "INCOME_INVALID" : "DOB_NEAR_LIMIT",
    message:
      type === "error"
        ? `Row ${row}: income must be positive`
        : `Row ${row}: age near policy limit`
  };
}

function buildDetails(params: {
  page: number;
  pageSize: number;
  filter: "all" | "errors" | "warnings";
}) {
  const all = Array.from({ length: 30 }, (_, index) =>
    makeDiagnostic(index + 1, index % 2 === 0 ? "error" : "warning")
  );

  const filtered =
    params.filter === "all"
      ? all
      : params.filter === "errors"
        ? all.filter((d) => d.type === "error")
        : all.filter((d) => d.type === "warning");

  const start = (params.page - 1) * params.pageSize;
  const items = filtered.slice(start, start + params.pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / params.pageSize));

  return {
    uploadId,
    status: "validated",
    summary: {
      totalRows: 30,
      validRows: 0,
      errorRows: all.filter((d) => d.type === "error").length,
      warningRows: all.filter((d) => d.type === "warning").length
    },
    diagnostics: {
      items,
      total: filtered.length,
      page: params.page,
      pageSize: params.pageSize,
      totalPages
    },
    recommendation: {
      decision: "manual_review",
      suggestedAmount: 0,
      score: 540,
      riskCategory: "high",
      reasons: ["Multiple validation issues"],
      explanation: {
        baseScore: 500,
        components: [],
        policyNotes: []
      }
    },
    override: null
  };
}

test.describe("Diagnostics filter and pagination", () => {
  test("filters by errors and paginates", async ({ page }) => {
    await page.route(`**/api/v1/uploads/${uploadId}?*`, async (route) => {
      const url = new URL(route.request().url());
      const filter = (url.searchParams.get("filter") ?? "all") as
        | "all"
        | "errors"
        | "warnings";
      const pageNum = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
      const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "10", 10);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildDetails({ page: pageNum, pageSize, filter }))
      });
    });

    await page.goto("/");
    await page.getByLabel("Upload ID").fill(uploadId);
    await page.getByRole("button", { name: "Fetch Details" }).click();

    await expect(page.getByText("Row diagnostics")).toBeVisible();
    await expect(page.getByText("Showing 10 of 30 diagnostics")).toBeVisible();

    await page.getByRole("button", { name: /^Errors \(/ }).click();
    await expect(page.getByText("Showing 10 of 15 diagnostics")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(page.getByText("Showing 5 of 15 diagnostics")).toBeVisible();
  });
});
