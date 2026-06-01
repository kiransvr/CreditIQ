import { expect, test } from "@playwright/test";

const baseDetails = {
  uploadId: "upl_override_001",
  status: "validated",
  summary: {
    totalRows: 10,
    validRows: 9,
    errorRows: 1,
    warningRows: 0
  },
  diagnostics: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1
  },
  recommendation: {
    decision: "proceed",
    suggestedAmount: 100000,
    score: 680,
    riskCategory: "medium",
    reasons: ["Acceptable risk profile"],
    explanation: {
      baseScore: 500,
      components: [
        { key: "income", label: "Income stability", impact: 90, detail: "Consistent inflows" }
      ],
      policyNotes: []
    }
  },
  override: null as null | Record<string, unknown>
};

const overriddenDetails = {
  ...baseDetails,
  override: {
    decision: "manual_review",
    reason: "Need additional KYC verification before disbursal",
    overriddenBy: "credit_manager_1",
    overriddenAt: new Date("2026-06-01T10:00:00Z").toISOString()
  }
};

test.describe("Override workflow", () => {
  test("credit_manager submits a manual override", async ({ page }) => {
    await page.route("**/api/v1/uploads/upl_override_001?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(baseDetails)
      });
    });

    await page.route("**/api/v1/uploads/upl_override_001/override", async (route) => {
      expect(route.request().method()).toBe("POST");
      const payload = route.request().postDataJSON() as { decision: string; reason: string };
      expect(payload.decision).toBe("manual_review");
      expect(payload.reason.length).toBeGreaterThanOrEqual(10);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(overriddenDetails)
      });
    });

    await page.goto("/");
    await page.getByRole("combobox", { name: "Role" }).click();
    await page.getByRole("option", { name: "Credit Manager" }).click();

    await page.getByLabel("Upload ID").fill("upl_override_001");
    await page.getByRole("button", { name: "Fetch Details" }).click();

    await expect(page.getByText("Manual Override")).toBeVisible();

    await page.getByLabel("Decision").click();
    await page.getByRole("option", { name: "manual_review" }).click();
    await page
      .getByLabel("Reason")
      .fill("Need additional KYC verification before disbursal");

    await page.getByRole("button", { name: "Submit Override" }).click();

    await expect(page.getByText("Override decision: manual_review")).toBeVisible();
    await expect(
      page.getByText("Override reason: Need additional KYC verification before disbursal")
    ).toBeVisible();
    await expect(page.getByText("Overridden by: credit_manager_1")).toBeVisible();
  });
});
