import { expect, test } from "@playwright/test";

const sampleDetails = {
  uploadId: "upl_demo_001",
  status: "validated",
  summary: {
    totalRows: 50,
    validRows: 48,
    errorRows: 1,
    warningRows: 1
  },
  diagnostics: {
    items: [
      { type: "error", row: 3, field: "income", code: "INCOME_INVALID", message: "Income must be positive" },
      { type: "warning", row: 7, field: "dob", code: "DOB_NEAR_LIMIT", message: "Age near policy limit" }
    ],
    total: 2,
    page: 1,
    pageSize: 10,
    totalPages: 1
  },
  recommendation: {
    decision: "proceed",
    suggestedAmount: 250000,
    score: 720,
    riskCategory: "low",
    reasons: ["Stable income", "Low DTI"],
    explanation: {
      baseScore: 500,
      components: [
        { key: "income", label: "Income stability", impact: 120, detail: "Steady payroll history" },
        { key: "dti", label: "Debt to income", impact: 100, detail: "DTI within policy" }
      ],
      policyNotes: ["Within institution risk appetite"]
    }
  },
  override: null
};

test.describe("Upload happy-path", () => {
  test("uploads a file and shows validation summary", async ({ page }) => {
    await page.route("**/api/v1/uploads", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ uploadId: sampleDetails.uploadId })
      });
    });

    await page.route("**/api/v1/uploads/upl_demo_001/validate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sampleDetails)
      });
    });

    await page.route("**/api/v1/uploads/upl_demo_001?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sampleDetails)
      });
    });

    await page.goto("/");

    await page
      .getByLabel("Borrower data file")
      .setInputFiles({
        name: "borrowers.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("name,income\nAlice,50000\n", "utf-8")
      });

    await page.getByRole("button", { name: "Upload File" }).click();
    await expect(page.getByLabel("Upload ID")).toHaveValue(sampleDetails.uploadId);

    await page.getByRole("button", { name: "Validate Upload" }).click();

    await expect(page.getByRole("heading", { name: "Validation Summary" })).toBeVisible();
    await expect(page.getByText("Total rows: 50")).toBeVisible();
    await expect(page.getByText("Decision: Proceed")).toBeVisible();
    await expect(page.getByText("Risk: Low")).toBeVisible();
  });
});
