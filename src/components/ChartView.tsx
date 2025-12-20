import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  buildChartData,
  ChartConfig,
  ChartType,
  getNumericFieldPaths,
} from "../utils/buildChartData";
import { SchemaNode } from "../utils/inferSchema";
// #region agent note
// Debug instrumentation is added per system instructions. Do not remove until post-fix verification.
// #endregion

interface ChartViewProps {
  data: Array<Record<string, unknown>>;
  schema: SchemaNode | null;
}

const chartTypes: { label: string; value: ChartType }[] = [
  { label: "Bar", value: "bar" },
  { label: "Line", value: "line" },
];

export const ChartView = ({ data, schema }: ChartViewProps): JSX.Element => {
  const numericFields = useMemo(() => getNumericFieldPaths(schema), [schema]);
  const xOptions = useMemo(() => collectAllFields(schema), [schema]);

  const [config, setConfig] = useState<ChartConfig>(() => {
    const yField = numericFields[0] ?? null;
    const xField = yField ? findFirstNonNumericField(schema, yField) : xOptions[0] ?? null;
    return { xField, yField, type: "bar" };
  });

  // #region agent log
  fetch("http://127.0.0.1:7243/ingest/a1f3ebfc-bca2-49cb-91f6-22ba8b379fbe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "A",
      location: "ChartView.tsx:init",
      message: "chart init",
      data: {
        dataLength: data.length,
        numericFields,
        xOptions,
        initialConfig: config,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  useEffect(() => {
    setConfig((prev) => {
      const nextY =
        prev.yField && numericFields.includes(prev.yField)
          ? prev.yField
          : numericFields[0] ?? null;
      const nextX = prev.xField ?? findFirstNonNumericField(schema, nextY) ?? xOptions[0] ?? null;
      return { ...prev, yField: nextY, xField: nextX };
    });
  }, [numericFields, schema, xOptions]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/a1f3ebfc-bca2-49cb-91f6-22ba8b379fbe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
        location: "ChartView.tsx:configEffect",
        message: "config updated after schema change",
        data: { config, numericFieldsCount: numericFields.length, xOptionsCount: xOptions.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [config, numericFields.length, xOptions.length]);

  const chartData = useMemo(() => buildChartData(data, config), [data, config]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/a1f3ebfc-bca2-49cb-91f6-22ba8b379fbe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
        location: "ChartView.tsx:dataComputed",
        message: "chart data computed",
        data: { chartDataLength: chartData.length, config },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [chartData, config]);

  const renderChart = () => {
    if (!config.xField || !config.yField) {
      return (
        <div className="empty-state">
          Select both X and Y fields to render a chart.
        </div>
      );
    }
    if (chartData.length === 0) {
      return (
        <div className="empty-state">
          No chartable data (missing X values or numeric Y values).
        </div>
      );
    }

    // Balanced margins to keep plot centered
    const chartMargin = { top: 8, right: 32, bottom: 52, left: 56 };

    const commonAxes = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          dataKey="x"
          stroke="var(--text-muted)"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          angle={-25}
          textAnchor="end"
          label={
            config.xField
              ? {
                  value: config.xField,
                  position: "insideBottom",
                  offset: -12,
                  fill: "var(--text-muted)",
                  style: { fontSize: 12 },
                }
              : undefined
          }
        />
        <YAxis
          stroke="var(--text-muted)"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          label={
            config.yField
              ? {
                  value: config.yField,
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  fill: "var(--text-muted)",
                  style: { fontSize: 12 },
                }
              : undefined
          }
        />
        <Tooltip />
      </>
    );

    if (config.type === "bar") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={chartMargin}>
            {commonAxes}
            <Bar dataKey="y" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={chartMargin}>
          {commonAxes}
          <Line
            type="monotone"
            dataKey="y"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 2, stroke: "var(--accent)", fill: "var(--accent)" }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="chart-panel">
      <div className="chart-config">
        <div className="chart-config-row">
          <label className="chart-label">Chart</label>
          <select
            className="select select-sm"
            value={config.type}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, type: e.target.value as ChartType }))
            }
          >
            {chartTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="chart-config-row">
          <label className="chart-label">X field</label>
          <select
            className="select select-sm"
            value={config.xField ?? ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, xField: e.target.value || null }))
            }
          >
            <option value="">Select…</option>
            {xOptions.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </div>
        <div className="chart-config-row">
          <label className="chart-label">Y field</label>
          <select
            className="select select-sm"
            value={config.yField ?? ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, yField: e.target.value || null }))
            }
          >
            <option value="">Select numeric…</option>
            {numericFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!data.length && (
        <div className="empty-state">No data to chart. Run a request first.</div>
      )}
      {data.length > 0 && numericFields.length === 0 && (
        <div className="empty-state">No numeric fields detected for charting.</div>
      )}
      {renderChart()}
    </div>
  );
};

const collectAllFields = (schema: SchemaNode | null): string[] => {
  if (!schema) return [];
  const fields: string[] = [];
  const visit = (node: SchemaNode, prefix: string) => {
    if (node.type.kind === "object") {
      Object.entries(node.type.fields).forEach(([key, child]) => {
        const next = prefix ? `${prefix}.${key}` : key;
        visit(child, next);
      });
      return;
    }
    if (node.type.kind === "primitive" || node.type.kind === "union") {
      fields.push(prefix);
      return;
    }
  };
  visit(schema, "");
  return fields;
};

const findFirstNonNumericField = (
  schema: SchemaNode | null,
  excluded?: string | null
): string | null => {
  if (!schema) return null;
  const fields = collectAllFields(schema).filter((p) => p !== excluded);
  return fields[0] ?? null;
};

