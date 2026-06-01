import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuditLog from "./AuditLog";

// Mock fetch
import { vi } from "vitest";

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            {
              id: "1",
              actor_user_id: "user1",
              action_type: "upload_created",
              object_type: "upload",
              object_id: "abc123",
              metadata_json: { fileName: "file.csv" },
              created_at: new Date().toISOString(),
            },
            {
              id: "2",
              actor_user_id: "user2",
              action_type: "upload_validated",
              object_type: "upload",
              object_id: "def456",
              metadata_json: { totalRows: 10 },
              created_at: new Date().toISOString(),
            },
          ],
        }),
    }) as any
  );
});

afterEach(() => {
  vi.resetAllMocks();
});

test("renders audit log table and filters", async () => {
  render(<AuditLog />);
  expect(screen.getByText(/Loading audit log/i)).toBeInTheDocument();
  await waitFor(() => screen.getByText(/Audit Log/i));
  expect(screen.getByText("user1")).toBeInTheDocument();
  expect(screen.getByText("upload_created")).toBeInTheDocument();
  expect(screen.getByText("user2")).toBeInTheDocument();
  expect(screen.getByText("upload_validated")).toBeInTheDocument();

  // Filter by action (first combobox is Action)
  const actionSelect = screen.getAllByRole('combobox')[0]!;
  await userEvent.click(actionSelect);
  await userEvent.click(screen.getByRole('option', { name: 'upload_created' }));
  expect(screen.getByText("user1")).toBeInTheDocument();
  expect(screen.queryByText("user2")).not.toBeInTheDocument();

  // Filter by user (second combobox is User)
  const userSelect = screen.getAllByRole('combobox')[1]!;
  await userEvent.click(userSelect);
  await userEvent.click(screen.getByRole('option', { name: 'user2' }));
  expect(screen.getByText("user2")).toBeInTheDocument();
  expect(screen.queryByText("user1")).not.toBeInTheDocument();

  // Search
  // Debug: log all input placeholders
  // Use label for search input
  const searchInput = screen.getByLabelText(/Quick search/i);
  await userEvent.type(searchInput, "def456");
  expect(screen.getByText("def456")).toBeInTheDocument();
});
