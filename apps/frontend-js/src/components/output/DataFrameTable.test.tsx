import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataFrameTable } from "./DataFrameTable";

const columns = ["name", "age"];
const rows = [
  ["bob", "30"],
  ["alice", "25"],
];

describe("DataFrameTable", () => {
  it("renders columns and rows", () => {
    render(<DataFrameTable columns={columns} rows={rows} rowCount={2} truncated={false} />);
    expect(screen.getByText("name")).toBeTruthy();
    expect(screen.getByText("bob")).toBeTruthy();
    expect(screen.getByText("alice")).toBeTruthy();
  });

  it("toggles sort order when a column header is clicked", () => {
    render(<DataFrameTable columns={columns} rows={rows} rowCount={2} truncated={false} />);
    const cellsBefore = screen.getAllByRole("cell").map((cell) => cell.textContent);
    expect(cellsBefore).toEqual(["bob", "30", "alice", "25"]);

    fireEvent.click(screen.getByText("name"));
    const cellsAsc = screen.getAllByRole("cell").map((cell) => cell.textContent);
    expect(cellsAsc).toEqual(["alice", "25", "bob", "30"]);

    fireEvent.click(screen.getByText(/name/));
    const cellsDesc = screen.getAllByRole("cell").map((cell) => cell.textContent);
    expect(cellsDesc).toEqual(["bob", "30", "alice", "25"]);
  });

  it("shows a truncation footer only when truncated", () => {
    const { rerender } = render(
      <DataFrameTable columns={columns} rows={rows} rowCount={2} truncated={false} />,
    );
    expect(screen.queryByText(/showing first/i)).toBeNull();

    rerender(<DataFrameTable columns={columns} rows={rows} rowCount={600} truncated={true} />);
    expect(screen.getByText(/showing first 2 of 600 rows/i)).toBeTruthy();
  });
});
