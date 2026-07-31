import { useMemo, useState } from "react";

export interface DataFrameTableProps {
  columns: string[];
  rows: string[][];
  rowCount: number;
  truncated: boolean;
}

type SortState = { column: number; direction: "asc" | "desc" } | null;

export function DataFrameTable({ columns, rows, rowCount, truncated }: DataFrameTableProps) {
  const [sort, setSort] = useState<SortState>(null);

  const sortedRows = useMemo(() => {
    if (sort === null) return rows;
    const { column, direction } = sort;
    const sign = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => sign * a[column].localeCompare(b[column]));
  }, [rows, sort]);

  function toggleSort(column: number) {
    setSort((current) => {
      if (current?.column !== column) return { column, direction: "asc" };
      if (current.direction === "asc") return { column, direction: "desc" };
      return null;
    });
  }

  return (
    <div className="border border-border">
      <div className="max-h-80 overflow-auto">
        <table className="w-full border-collapse font-mono text-sm">
          <thead className="sticky top-0 bg-card text-card-foreground">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className="cursor-pointer whitespace-nowrap px-2 py-1 text-left select-none"
                  onClick={() => toggleSort(index)}
                >
                  {column}
                  <span className="inline-block w-3 pl-2 text-center">
                    {sort?.column === index ? (sort.direction === "asc" ? "▲" : "▼") : ""}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="whitespace-nowrap px-2 py-1 text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="border-t border-border px-2 py-1 text-xs text-muted-foreground">
          showing first {rows.length} of {rowCount} rows
        </p>
      ) : null}
    </div>
  );
}
