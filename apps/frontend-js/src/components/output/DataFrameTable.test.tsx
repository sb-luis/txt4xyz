import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataFrameTable } from "./DataFrameTable";

const columns = ["name", "age"];
const rows = [
  ["bob", "30"],
  ["alice", "25"],
];

// A dataset with enough locally-delivered rows to cover a full first page --
// mirrors the worker always shipping min(rowCount, 500) rows up front.
const largeRows: (string | null)[][] = Array.from({ length: 60 }, (_, i) => [
  `user${i}`,
  String(i),
]);

describe("DataFrameTable", () => {
  it("renders the initial page from `rows` without calling fetchPage", () => {
    const fetchPage = vi.fn();
    render(
      <DataFrameTable columns={columns} rows={rows} rowCount={2} fetchPage={fetchPage} />,
    );
    expect(screen.getByText("name")).toBeTruthy();
    expect(screen.getByText("bob")).toBeTruthy();
    expect(screen.getByText("alice")).toBeTruthy();
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("requests a sorted page from the worker when a column header is clicked", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      rows: [["alice", "25"]],
      rowCount: 2,
    });
    render(
      <DataFrameTable columns={columns} rows={rows} rowCount={2} fetchPage={fetchPage} />,
    );

    fireEvent.click(screen.getByText("name"));
    expect(fetchPage).toHaveBeenCalledWith(0, 50, { columnIndex: 0, direction: "asc" });

    await waitFor(() => expect(screen.getByText("alice")).toBeTruthy());

    fireEvent.click(screen.getByText("name"));
    expect(fetchPage).toHaveBeenLastCalledWith(0, 50, { columnIndex: 0, direction: "desc" });
  });

  it("requests the next page at the current page size when paging forward", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      rows: [["carol", "40"]],
      rowCount: 100,
    });
    render(
      <DataFrameTable columns={columns} rows={largeRows} rowCount={100} fetchPage={fetchPage} />,
    );
    expect(fetchPage).not.toHaveBeenCalled();

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(50, 50, null));
  });

  it("shows a stale-run notice and disables interaction when the fetch rejects", async () => {
    const fetchPage = vi.fn().mockRejectedValue(new Error("expired"));
    render(
      <DataFrameTable columns={columns} rows={largeRows} rowCount={100} fetchPage={fetchPage} />,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() =>
      expect(screen.getByText(/rerun to sort or page through it/i)).toBeTruthy(),
    );
    expect(screen.getByText("user0")).toBeTruthy();
    expect((buttons[buttons.length - 1] as HTMLButtonElement).disabled).toBe(true);
  });

  it("hides a column's cells when it's unchecked from the columns menu", async () => {
    const fetchPage = vi.fn();
    render(
      <DataFrameTable columns={columns} rows={rows} rowCount={2} fetchPage={fetchPage} />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: /columns/i }), { button: 0 });
    const ageToggle = await screen.findByRole("menuitemcheckbox", { name: "age" });
    fireEvent.click(ageToggle);

    await waitFor(() => expect(screen.queryByText("30")).toBeNull());
    expect(screen.getByText("bob")).toBeTruthy();
  });
});
