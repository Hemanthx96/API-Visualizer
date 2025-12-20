import { SchemaNode } from "./inferSchema";

export type ChartType = "bar" | "line";

export interface ChartConfig {
  xField: string | null;
  yField: string | null;
  type: ChartType;
}

export interface ChartDatum {
  x: string | number;
  y: number;
}

/**
 * Extract numeric field names from a schema (array item schema recommended).
 */
export const getNumericFieldPaths = (schema: SchemaNode | null): string[] => {
  if (!schema) return [];
  const paths: string[] = [];

  const visit = (node: SchemaNode, prefix: string) => {
    if (node.type.kind === "object") {
      Object.entries(node.type.fields).forEach(([key, child]) => {
        const next = prefix ? `${prefix}.${key}` : key;
        visit(child, next);
      });
      return;
    }
    if (node.type.kind === "primitive" && node.type.type === "number") {
      paths.push(prefix);
    }
    if (node.type.kind === "union") {
      // Include if union contains number
      const hasNumber = node.type.types.some(
        (t) => t.kind === "primitive" && t.type === "number"
      );
      if (hasNumber) {
        paths.push(prefix);
      }
    }
    // Ignore arrays here; callers should pass item schema for array responses
  };

  visit(schema, "");
  return paths;
};

/**
 * Resolve nested value via dot path; returns undefined when missing.
 */
export const getValueAtPath = (item: Record<string, unknown>, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, item);
};

/**
 * Build chart-ready data from array-of-objects.
 * Filters out rows where yField is missing/non-numeric; allows string/number xField.
 */
export const buildChartData = (
  data: Array<Record<string, unknown>>,
  config: ChartConfig
): ChartDatum[] => {
  const { xField, yField } = config;
  if (!xField || !yField) return [];

  const rows: ChartDatum[] = [];
  let skippedMissingXY = 0;
  let skippedNonNumeric = 0;

  for (const row of data) {
    const xVal = getValueAtPath(row, xField);
    const yVal = getValueAtPath(row, yField);
    if (typeof yVal !== "number") {
      skippedNonNumeric += 1;
      continue; // enforce numeric Y
    }
    if (xVal == null) {
      skippedMissingXY += 1;
      continue;
    }

    rows.push({
      x: typeof xVal === "number" ? xVal : String(xVal),
      y: yVal,
    });
  }

  // #region agent log
  fetch("http://127.0.0.1:7243/ingest/a1f3ebfc-bca2-49cb-91f6-22ba8b379fbe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
      location: "buildChartData.ts:return",
      message: "chart data built",
      data: {
        inputRows: data.length,
        outputRows: rows.length,
        skippedMissingXY,
        skippedNonNumeric,
        xField,
        yField,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return rows;
};


