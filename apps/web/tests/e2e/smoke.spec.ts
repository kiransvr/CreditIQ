import { expect, test, type Page } from "@playwright/test";

async function setShellRole(page: Page, roleLabel: string) {
  await page.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: roleLabel }).click();
}

test.describe("CreditIQ web smoke", () => {
  test("renders landing page and upload controls", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "CreditIQ" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Role" })).toContainText("Loan Officer");
    await expect(page.getByLabel("Borrower data file")).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload File" })).toBeVisible();
  });

  test("auditor role hides upload form", async ({ page }) => {
    await page.goto("/");

    await setShellRole(page, "Auditor");

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

    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect(page.getByRole("heading", { name: "CreditIQ" })).toBeVisible();
  });
});
