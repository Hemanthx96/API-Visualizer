import { useMemo, useState } from "react";
import { DualScrollContainer } from "./DualScrollContainer";

interface DataTableProps<T extends Record<string, unknown>> {
  rows: T[];
}

type SortDirection = "asc" | "desc";

interface SortState {
  column: string;
  direction: SortDirection;
}

export const inferColumns = <T extends Record<string, unknown>>(
  rows: T[]
): string[] => {
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      keys.add(key);
    });
  });
  return Array.from(keys);
};

const PAGE_SIZE = 10;

export const DataTable = <T extends Record<string, unknown>>({
  rows,
}: DataTableProps<T>): JSX.Element => {
  const columns = useMemo(() => inferColumns(rows), [rows]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { column, direction } = sort;
    return [...filtered].sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as === bs) return 0;
      const cmp = as < bs ? -1 : 1;
      return direction === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const paged = sorted.slice(
    pageSafe * PAGE_SIZE,
    pageSafe * PAGE_SIZE + PAGE_SIZE
  );

  const handleSortClick = (column: string) => {
    setPage(0);
    setSort((prev) => {
      if (!prev || prev.column !== column) {
        return { column, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { column, direction: "desc" };
      }
      return null;
    });
  };

  const renderPagination = (compact = false) => (
    <div
      className={`table-pagination ${
        compact ? "table-pagination-compact" : ""
      }`}
    >
      <span className="table-pagination-text">
        Page {pageSafe + 1} of {pageCount}
      </span>
      <div className="pill-row">
        <button
          type="button"
          className="btn-ghost btn-ghost-sm"
          disabled={pageSafe === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          ‹ Prev
        </button>
        <button
          type="button"
          className="btn-ghost btn-ghost-sm"
          disabled={pageSafe >= pageCount - 1}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        >
          Next ›
        </button>
      </div>
    </div>
  );

  return (
    <div className="table-container">
      <div className="table-toolbar">
        <input
          className="input table-search"
          placeholder="Filter rows…"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
        />
        <div className="table-toolbar-meta">
          <div className="label">
            <span className="label-pill">
              {filtered.length} / {rows.length} rows
            </span>
          </div>
          {/* Top pagination, compact inline style */}
          {renderPagination(true)}
        </div>
      </div>

      <DualScrollContainer className="table-scroll-wrapper">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => {
                  const isActive = sort?.column === col;
                  const indicator = !isActive
                    ? ""
                    : sort?.direction === "asc"
                    ? "▲"
                    : "▼";
                  return (
                    <th
                      key={col}
                      className="th-sortable"
                      onClick={() => handleSortClick(col)}
                    >
                      {col}
                      {indicator && (
                        <span className="sort-indicator">{indicator}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paged.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col}>{String(row[col] ?? "")}</td>
                  ))}
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={columns.length || 1}>
                    <div className="empty-state">No rows to display.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DualScrollContainer>

      {/* Bottom pagination, matching the screenshot-style footer controls */}
      {renderPagination()}
    </div>
  );
};
