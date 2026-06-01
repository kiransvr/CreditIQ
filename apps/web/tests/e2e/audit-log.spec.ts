import { expect, test } from "@playwright/test";

const auditEvents = [
  {
    id: "evt_1",
    actor_user_id: "loan_officer_1",
    action_type: "upload_created",
    object_type: "upload",
    object_id: "upl_demo_001",
    metadata_json: { fileName: "borrowers.csv", templateVersion: "v1" },
    created_at: new Date("2026-06-01T09:00:00Z").toISOString()
  },
  {
    id: "evt_2",
    actor_user_id: "credit_manager_1",
    action_type: "upload_overridden",
    object_type: "upload",
    object_id: "upl_demo_001",
    metadata_json: { decision: "manual_review", reason: "KYC pending" },
    created_at: new Date("2026-06-01T10:00:00Z").toISOString()
  }
];

test.describe("Audit log", () => {
  test("loads events, filters by action, and triggers CSV download", async ({ page }) => {
    await page.route("**/api/v1/audit/events?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: auditEvents })
      });
    });

    await page.route("**/api/v1/audit/events/export", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        headers: { "content-disposition": "attachment; filename=AuditEvents.csv" },
        body: "id,actor\nevt_1,loan_officer_1\n"
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Audit Log" }).click();

    await expect(page.getByRole("heading", { name: "Audit Log", exact: true })).toBeVisible();
    await expect(page.getByText("loan_officer_1")).toBeVisible();
    await expect(page.getByText("credit_manager_1")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("AuditEvents.csv");

    await expect(page.getByText("CSV downloaded!")).toBeVisible();
  });
});
