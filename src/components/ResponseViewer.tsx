import { useEffect, useMemo, useState } from "react";
import type { ParsedResponse, RequestExecutionResult } from "../types";
import { JsonViewer } from "./JsonViewer";
import { DataTable, inferColumns } from "./DataTable";
import { SchemaTree } from "./SchemaTree";
import { inferSchema } from "../utils/inferSchema";
import { DiffTree } from "./DiffTree";
import { diffJson } from "../utils/diffJson";
import { DualScrollContainer } from "./DualScrollContainer";
import { applyFilters, FilterRule } from "../utils/applyFilters";
import { FilterPanel } from "./FilterPanel";
import { ChartView } from "./ChartView";

type TabId = "raw" | "table" | "chart" | "schema" | "diff" | "meta";

interface ResponseViewerProps {
  result: RequestExecutionResult | null;
  loading: boolean;
  previousResult?: RequestExecutionResult | null;
}

const isArrayOfObjects = (
  value: unknown
): value is Array<Record<string, unknown>> =>
  Array.isArray(value) &&
  value.every((item) => item && typeof item === "object");

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractTableCandidate = (
  parsed: ParsedResponse | null
): Array<Record<string, unknown>> | null => {
  if (!parsed || parsed.kind !== "json" || parsed.jsonBody == null) return null;

  const body = parsed.jsonBody;

  if (isArrayOfObjects(body)) {
    return body;
  }

  if (isObject(body)) {
    const firstArray = Object.values(body).find(isArrayOfObjects);
    if (firstArray) {
      return firstArray;
    }
  }

  return null;
};

const deriveItemSchema = (
  schema: ReturnType<typeof inferSchema>
): ReturnType<typeof inferSchema> => {
  if (!schema) return null;
  if (schema.type.kind === "array") {
    return schema.type.itemSchema;
  }
  if (schema.type.kind === "object") {
    const firstArrayField = Object.values(schema.type.fields).find(
      (field) => field.type.kind === "array"
    );
    if (firstArrayField && firstArrayField.type.kind === "array") {
      return firstArrayField.type.itemSchema;
    }
  }
  return schema;
};

export const ResponseViewer = ({
  result,
  loading,
  previousResult,
}: ResponseViewerProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabId>("raw");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filters, setFilters] = useState<FilterRule[]>([]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  // Apply fullscreen class to body when active
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add("response-fullscreen-active");
    } else {
      document.body.classList.remove("response-fullscreen-active");
    }
    return () => {
      document.body.classList.remove("response-fullscreen-active");
    };
  }, [isFullscreen]);

  const tableData = useMemo(
    () => extractTableCandidate(result?.parsed ?? null),
    [result]
  );
  const hasTable = !!tableData && tableData.length > 0;

  const meta = result?.metadata;
  const parsed = result?.parsed;

  const schema = useMemo(() => {
    if (parsed?.kind === "json" && parsed.jsonBody != null) {
      return inferSchema(parsed.jsonBody);
    }
    return null;
  }, [parsed]);

  const itemSchema = useMemo(() => deriveItemSchema(schema), [schema]);

  useEffect(() => {
    if (!hasTable) {
      setFilters([]);
    }
  }, [hasTable]);

  const filteredTableData = useMemo(() => {
    if (!hasTable || !tableData) return tableData;
    return applyFilters(tableData, filters);
  }, [tableData, hasTable, filters]);

  const derivedTableInfo = useMemo(() => {
    if (!tableData || tableData.length === 0) return null;
    const cols = inferColumns(tableData);
    return { rows: tableData.length, columns: cols.length };
  }, [tableData]);

  const statusLabel = useMemo(() => {
    if (!meta) return "Idle";
    if (loading) return "Loading…";
    if (meta.isError) return "Error";
    return "OK";
  }, [meta, loading]);

  const statusColorClass = useMemo(() => {
    if (!meta) return "status-dot-pending";
    if (loading) return "status-dot-pending";
    if (meta.isError) return "status-dot-error";
    return "status-dot-success";
  }, [meta, loading]);

  return (
    <div className={`panel ${isFullscreen ? "panel-fullscreen" : ""}`}>
      <div className="panel-header">
        <span className="panel-title">Response</span>
        <div className="pill-row">
          <span className="status-chip">
            <span className={`status-dot ${statusColorClass}`} />
            <span className="chip-label">{statusLabel}</span>
            {meta?.status != null && (
              <span className="chip-value">
                {meta.status}
                {meta.statusText ? ` · ${meta.statusText}` : ""}
              </span>
            )}
          </span>
          {meta?.durationMs != null && (
            <span className="chip-soft">
              <span className="chip-label">Time</span>{" "}
              <span className="chip-value">
                {meta.durationMs.toFixed(1)} ms
              </span>
            </span>
          )}
          <button
            type="button"
            className="btn-ghost btn-ghost-sm"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? "Exit fullscreen (ESC)" : "Enter fullscreen"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <span className="fullscreen-icon">{isFullscreen ? "⤺" : "⤢"}</span>
            <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        </div>
      </div>

      <div className="panel-body">
        {meta?.isError && meta.errorMessage && (
          <div className="error-banner">
            <div>
              <div className="error-label">Request failed</div>
              <div>{meta.errorMessage}</div>
              <div className="error-secondary">
                You can still inspect any response body and headers below.
              </div>
            </div>
          </div>
        )}

        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === "raw" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("raw")}
          >
            Raw JSON
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "table" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("table")}
            disabled={parsed?.kind !== "json" || !parsed.jsonBody}
          >
            Table / Object
            {derivedTableInfo && (
              <span className="tab-badge">
                {derivedTableInfo.rows} × {derivedTableInfo.columns}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "chart" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("chart")}
            disabled={!hasTable}
          >
            Chart
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "schema" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("schema")}
            disabled={parsed?.kind !== "json" || !parsed.jsonBody}
          >
            Schema
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "diff" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("diff")}
            disabled={
              parsed?.kind !== "json" ||
              !parsed.jsonBody ||
              !previousResult?.parsed?.jsonBody
            }
            title={
              !previousResult?.parsed?.jsonBody
                ? "Run at least 2 requests to compare responses"
                : "Compare with previous response"
            }
          >
            Diff
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "meta" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("meta")}
          >
            Metadata
          </button>
        </div>

        <div className="tab-content">
          {loading && (
            <div className="empty-state">
              <div style={{ width: "100%", maxWidth: 360 }}>
                <div className="skeleton-row" style={{ marginBottom: 6 }} />
                <div
                  className="skeleton-row"
                  style={{ marginBottom: 6, width: "90%" }}
                />
                <div
                  className="skeleton-row"
                  style={{ marginBottom: 6, width: "80%" }}
                />
              </div>
            </div>
          )}
          {!loading && !result && (
            <div className="empty-state empty-state-hint">
              <p className="empty-state-title">
                Send a request to see the response here.
              </p>
              <p className="empty-state-subtitle">
                Try a public JSON API such as{" "}
                <code>https://jsonplaceholder.typicode.com/posts</code>
              </p>
            </div>
          )}

          {!loading && result && activeTab === "raw" && (
            <>
              {parsed?.kind === "json" && parsed.jsonBody != null && (
                <DualScrollContainer>
                  <JsonViewer value={parsed.jsonBody} />
                </DualScrollContainer>
              )}
              {parsed && parsed.kind !== "json" && (
                <DualScrollContainer>
                  <div className="json-viewer">
                    <div className="json-line">
                      {parsed.rawBody || "<empty body>"}
                    </div>
                  </div>
                </DualScrollContainer>
              )}
              {!parsed && (
                <div className="empty-state">
                  No response body was returned.
                </div>
              )}
            </>
          )}

          {!loading && result && activeTab === "table" && (
            <>
              {hasTable && tableData && (
                <FilterPanel
                  schema={itemSchema}
                  dataCount={tableData.length}
                  filteredCount={filteredTableData?.length ?? tableData.length}
                  filters={filters}
                  onChange={setFilters}
                />
              )}
              {/* Array-of-objects → rich tabular experience */}
              {hasTable && filteredTableData && <DataTable rows={filteredTableData} />}
              {/* Object → simple key–value inspector */}
              {!hasTable &&
                parsed?.kind === "json" &&
                parsed.jsonBody &&
                isObject(parsed.jsonBody) && (
                  <table className="kv-table">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(parsed.jsonBody).map(([k, v]) => (
                        <tr key={k}>
                          <td className="kv-key">{k}</td>
                          <td className="kv-value">
                            {isObject(v) || Array.isArray(v)
                              ? JSON.stringify(v)
                              : String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              {!hasTable &&
                parsed?.kind === "json" &&
                parsed.jsonBody &&
                !isObject(parsed.jsonBody) && (
                  <div className="empty-state">
                    This JSON is not an object or an array of objects, so a
                    table view is not available.
                  </div>
                )}
              {!parsed && (
                <div className="empty-state">
                  No JSON body available to render as a table.
                </div>
              )}
            </>
          )}

          {!loading && result && activeTab === "chart" && (
            <>
              {hasTable && filteredTableData && (
                <ChartView data={filteredTableData} schema={itemSchema} />
              )}
              {!hasTable && (
                <div className="empty-state">
                  Charts are available only for array-of-object responses.
                </div>
              )}
            </>
          )}

          {!loading && result && activeTab === "schema" && (
            <>
              {parsed?.kind === "json" && parsed.jsonBody != null ? (
                <SchemaTree schema={schema} />
              ) : (
                <div className="empty-state">
                  Schema view is only available for JSON responses.
                </div>
              )}
            </>
          )}

          {!loading && result && activeTab === "diff" && (
            <>
              {parsed?.kind === "json" &&
              parsed.jsonBody != null &&
              previousResult?.parsed?.kind === "json" &&
              previousResult.parsed.jsonBody != null ? (
                <DiffTree
                  diff={diffJson(
                    previousResult.parsed.jsonBody,
                    parsed.jsonBody
                  )}
                />
              ) : (
                <div className="empty-state">
                  Diff view requires both a previous and current JSON response.
                  <br />
                  <span style={{ fontSize: "11px", opacity: 0.8 }}>
                    Run a request, then run it again to compare responses.
                  </span>
                </div>
              )}
            </>
          )}

          {!loading && result && activeTab === "meta" && (
            <div>
              <div className="metadata-grid">
                <div className="metadata-card">
                  <div className="metadata-label">Status</div>
                  <div className="metadata-value">
                    {meta?.status ?? "—"}
                    {meta?.statusText ? ` · ${meta.statusText}` : ""}
                  </div>
                </div>
                <div className="metadata-card">
                  <div className="metadata-label">Time</div>
                  <div className="metadata-value">
                    {meta?.durationMs != null
                      ? `${meta.durationMs.toFixed(1)} ms`
                      : "—"}
                  </div>
                </div>
                <div className="metadata-card">
                  <div className="metadata-label">Size (approx.)</div>
                  <div className="metadata-value">
                    {meta?.sizeBytes != null ? `${meta.sizeBytes} B` : "—"}
                  </div>
                  <div className="metadata-secondary">
                    Computed from the textual response body.
                  </div>
                </div>
                <div className="metadata-card">
                  <div className="metadata-label">Kind</div>
                  <div className="metadata-value">
                    {parsed?.kind === "json"
                      ? "JSON"
                      : parsed?.kind === "text"
                      ? "Text"
                      : parsed?.kind === "unknown"
                      ? "Unknown"
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="label" style={{ margin: "10px 0 4px" }}>
                Response headers
              </div>
              <div className="metadata-card metadata-headers">
                {meta && Object.keys(meta.headers).length > 0 ? (
                  <table className="kv-table">
                    <thead>
                      <tr>
                        <th>Header</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(meta.headers).map(([k, v]) => (
                        <tr key={k}>
                          <td className="kv-key">{k}</td>
                          <td className="kv-value">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">No headers returned.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
