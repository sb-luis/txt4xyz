import { useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type CellContext,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DataframeSort } from "@/lib/python/protocol";
import type { DataframePage } from "@/lib/python/runner";

export interface DataFrameTableProps {
  columns: string[];
  rows: (string | null)[][];
  rowCount: number;
  fetchPage: (
    offset: number,
    limit: number,
    sort: DataframeSort | null,
  ) => Promise<DataframePage>;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function renderCell({ getValue }: CellContext<(string | null)[], unknown>) {
  const value = getValue<string | null>();
  return value === null ? <span className="text-muted-foreground italic">null</span> : value;
}

export function DataFrameTable({ columns, rows, rowCount, fetchPage }: DataFrameTableProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sort, setSort] = useState<DataframeSort | null>(null);
  const [displayRows, setDisplayRows] = useState(() => rows.slice(0, pageSize));
  const [totalRows, setTotalRows] = useState(rowCount);
  const [loading, setLoading] = useState(false);
  const [staleError, setStaleError] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const requestSeq = useRef(0);

  useEffect(() => {
    const offset = pageIndex * pageSize;
    // The first, unsorted page is already sitting in `rows` from the initial
    // display message -- no need to round-trip to the worker for it, as long
    // as enough of it was actually delivered to cover the requested page size.
    if (pageIndex === 0 && sort === null && rows.length >= Math.min(pageSize, rowCount)) {
      setDisplayRows(rows.slice(offset, offset + pageSize));
      setTotalRows(rowCount);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    fetchPage(offset, pageSize, sort)
      .then((page) => {
        if (seq !== requestSeq.current) return;
        setDisplayRows(page.rows);
        setTotalRows(page.rowCount);
        setStaleError(null);
      })
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) return;
        setStaleError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, [pageIndex, pageSize, sort, rows, rowCount, fetchPage]);

  function toggleSort(columnIndex: number) {
    if (staleError) return;
    setSort((current) => {
      if (current?.columnIndex !== columnIndex) return { columnIndex, direction: "asc" };
      if (current.direction === "asc") return { columnIndex, direction: "desc" };
      return null;
    });
    setPageIndex(0);
  }

  const tableColumns = useMemo<ColumnDef<(string | null)[]>[]>(
    () =>
      columns.map((column, index) => ({
        id: String(index),
        header: column,
        accessorFn: (row) => row[index],
        cell: renderCell,
      })),
    [columns],
  );

  const table = useReactTable({
    data: displayRows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  });

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className="border border-border">
      <div className="flex items-center justify-end border-b border-border px-2 py-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs">
              <SlidersHorizontal />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllLeafColumns().map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
                onSelect={(event) => event.preventDefault()}
              >
                {String(column.columnDef.header)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="max-h-80 overflow-auto">
        <Table className="font-mono text-sm">
          <TableHeader className="sticky top-0 bg-card text-card-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnIndex = Number(header.column.id);
                  const active = sort?.columnIndex === columnIndex;
                  return (
                    <TableHead
                      key={header.id}
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort(columnIndex)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {active ? (
                          sort.direction === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground" />
                        )}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={loading ? "opacity-50" : undefined}>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1 text-xs text-muted-foreground">
        {staleError ? (
          <span>output is from a previous run — rerun to sort or page through it</span>
        ) : (
          <span>
            {totalRows} rows total, page {pageIndex + 1} of {pageCount}
          </span>
        )}
        <div className="flex items-center gap-1">
          <select
            className="rounded-md border border-input bg-transparent px-1 py-0.5 text-xs"
            value={pageSize}
            disabled={Boolean(staleError)}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPageIndex(0);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon-xs"
            disabled={Boolean(staleError) || pageIndex === 0}
            onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            disabled={Boolean(staleError) || pageIndex + 1 >= pageCount}
            onClick={() => setPageIndex((index) => Math.min(pageCount - 1, index + 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
