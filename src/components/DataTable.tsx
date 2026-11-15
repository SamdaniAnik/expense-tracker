"use client";

import {
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  /** Plain text used for search (joined across columns). */
  searchText?: (row: T) => string;
  /** Value used for sorting. */
  sortValue?: (row: T) => string | number | null | undefined;
  cell: (row: T, index: number) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  width?: string;
};

type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100] as const;

export default function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchPlaceholder = "Search…",
  empty = "No matching rows.",
  pageSize: initialPageSize = 25,
  footer,
  pinnedRows,
  rowClassName,
  minWidth = "40rem",
  toolbarExtra,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T, index: number) => string;
  searchPlaceholder?: string;
  empty?: ReactNode;
  pageSize?: number;
  footer?: ReactNode;
  /** Always shown above filtered rows (e.g. beginning balances). */
  pinnedRows?: ReactNode;
  rowClassName?: (row: T, index: number) => string | undefined;
  minWidth?: string;
  toolbarExtra?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [sortId, setSortId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    if (!deferredQuery) return rows;
    return rows.filter((row) => {
      const hay = columns
        .map((c) => (c.searchText ? c.searchText(row) : ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(deferredQuery);
    });
  }, [rows, columns, deferredQuery]);

  const sorted = useMemo(() => {
    if (!sortId) return filtered;
    const col = columns.find((c) => c.id === sortId);
    if (!col?.sortValue) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [filtered, columns, sortId, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const slice = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(id: string) {
    const col = columns.find((c) => c.id === id);
    if (!col || col.sortable === false || !col.sortValue) return;
    if (sortId === id) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortId(id);
      setSortDir("asc");
    }
    setPage(0);
  }

  const from = sorted.length === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(sorted.length, (safePage + 1) * pageSize);

  return (
    <div className="dt">
      <div className="dt-toolbar">
        <div className="dt-search">
          <span className="dt-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="dt-search-input"
            aria-label="Search table"
          />
          {query ? (
            <button
              type="button"
              className="dt-clear"
              onClick={() => {
                setQuery("");
                setPage(0);
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="dt-toolbar-right">
          {toolbarExtra}
          <label className="dt-pagesize">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="dt-scroll">
        <table className="dt-table" style={{ minWidth }}>
          <thead>
            <tr>
              {columns.map((col) => {
                const canSort = col.sortable !== false && !!col.sortValue;
                const active = sortId === col.id;
                return (
                  <th
                    key={col.id}
                    className={[
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      col.headerClassName,
                      canSort ? "dt-sortable" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={canSort ? () => toggleSort(col.id) : undefined}
                    aria-sort={
                      active ? (sortDir === "asc" ? "ascending" : "descending") : undefined
                    }
                  >
                    <span className="dt-th-inner">
                      {col.header}
                      {canSort ? (
                        <span className={`dt-sort ${active ? "active" : ""}`} aria-hidden>
                          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pinnedRows}
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="dt-empty">
                  {empty}
                </td>
              </tr>
            ) : (
              slice.map((row, i) => {
                const absoluteIndex = safePage * pageSize + i;
                return (
                  <tr
                    key={getRowId(row, absoluteIndex)}
                    className={rowClassName?.(row, absoluteIndex)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={[
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                              ? "text-center"
                              : "text-left",
                          col.className,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {col.cell(row, absoluteIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
          {footer ? <tfoot>{footer}</tfoot> : null}
        </table>
      </div>

      <div className="dt-footer">
        <p className="dt-info">
          {sorted.length === 0
            ? "0 rows"
            : `Showing ${from}–${to} of ${sorted.length.toLocaleString()}${
                deferredQuery ? ` (filtered from ${rows.length.toLocaleString()})` : ""
              }`}
        </p>
        <div className="dt-pager">
          <button
            type="button"
            className="dt-page-btn"
            disabled={safePage <= 0}
            onClick={() => setPage(0)}
            aria-label="First page"
          >
            «
          </button>
          <button
            type="button"
            className="dt-page-btn"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="dt-page-label">
            Page {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="dt-page-btn"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            aria-label="Next page"
          >
            ›
          </button>
          <button
            type="button"
            className="dt-page-btn"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(pageCount - 1)}
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
