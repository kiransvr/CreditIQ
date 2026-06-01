import { expect, test } from "@playwright/test";

test.describe("CreditIQ web smoke", () => {
  test("renders landing page and upload controls", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "CreditIQ Lite" })).toBeVisible();
    await expect(page.getByLabel("Role")).toHaveValue("loan_officer");
    await expect(page.getByLabel("Borrower data file")).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload File" })).toBeVisible();
  });

  test("auditor role hides upload form", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Role").selectOption("auditor");

    await expect(page.getByText("Auditor view: upload is hidden")).toBeVisible();
    await expect(page.getByLabel("Borrower data file")).toHaveCount(0);
  });

  test("navigates to audit log with mocked API", async ({ page }) => {
    await page.route("**/api/v1/audit/events?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] })
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Audit Log" }).click();

    await expect(page.getByRole("heading", { name: "Audit Log", exact: true })).toBeVisible();
    await expect(page.getByText("Time")).toBeVisible();

    await page.getByRole("button", { name: "Main" }).click();
    await expect(page.getByRole("heading", { name: "CreditIQ Lite" })).toBeVisible();
  });
});
