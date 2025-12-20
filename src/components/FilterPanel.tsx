import { useMemo } from "react";
import { collectFilterableFields, FilterRule, StringFilterMode } from "../utils/applyFilters";
import { SchemaNode } from "../utils/inferSchema";

interface FilterPanelProps {
  schema: SchemaNode | null;
  dataCount: number;
  filteredCount: number;
  filters: FilterRule[];
  onChange: (next: FilterRule[]) => void;
}

const createDefaultFilter = (fieldPath: string, kind: FilterRule["type"]): FilterRule => {
  const id = crypto.randomUUID();
  switch (kind) {
    case "string":
      return { id, type: "string", path: fieldPath, mode: "contains", value: "" };
    case "number":
      return { id, type: "number", path: fieldPath };
    case "boolean":
      return { id, type: "boolean", path: fieldPath, value: true };
    case "exists":
    default:
      return { id, type: "exists", path: fieldPath, mode: "exists" };
  }
};

export const FilterPanel = ({
  schema,
  dataCount,
  filteredCount,
  filters,
  onChange,
}: FilterPanelProps): JSX.Element => {
  const fields = useMemo(() => {
    if (!schema) return [];
    // If schema is an array, use its item schema; otherwise use as-is
    const node =
      schema.type.kind === "array" ? schema.type.itemSchema : schema;
    return collectFilterableFields(node);
  }, [schema]);

  const fieldOptions = fields.filter((f) => f.kind !== "unknown");

  const addFilter = () => {
    const first = fieldOptions[0];
    if (!first) return;
    const defaultType =
      first.kind === "string"
        ? "string"
        : first.kind === "number"
        ? "number"
        : first.kind === "boolean"
        ? "boolean"
        : "exists";
    onChange([...filters, createDefaultFilter(first.path, defaultType)]);
  };

  const updateFilter = (id: string, patch: Partial<FilterRule>) => {
    onChange(
      filters.map((f) => (f.id === id ? { ...f, ...patch } as FilterRule : f))
    );
  };

  const removeFilter = (id: string) => {
    onChange(filters.filter((f) => f.id !== id));
  };

  const clearFilters = () => onChange([]);

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <div className="filter-count">
          Filters {filters.length > 0 ? `${filteredCount} / ${dataCount}` : `${dataCount}`}
        </div>
        <div className="filter-actions">
          <button
            type="button"
            className="btn-ghost btn-ghost-sm"
            onClick={addFilter}
            disabled={!fieldOptions.length}
          >
            + Add filter
          </button>
          <button
            type="button"
            className="btn-ghost btn-ghost-sm"
            onClick={clearFilters}
            disabled={!filters.length}
          >
            Clear all
          </button>
        </div>
      </div>

      {filters.length === 0 && (
        <div className="filter-empty">
          {fieldOptions.length === 0
            ? "No filterable fields detected for this data."
            : "Add filters to narrow large responses."}
        </div>
      )}

      {filters.map((filter) => {
        const field = fieldOptions.find((f) => f.path === filter.path);
        const type = filter.type;

        return (
          <div key={filter.id} className="filter-row">
            <select
              className="select select-sm"
              value={filter.path}
              onChange={(e) => {
                const nextPath = e.target.value;
                const nextField = fieldOptions.find((f) => f.path === nextPath);
                if (!nextField) return;
                const nextType =
                  nextField.kind === "string"
                    ? "string"
                    : nextField.kind === "number"
                    ? "number"
                    : nextField.kind === "boolean"
                    ? "boolean"
                    : "exists";
                updateFilter(filter.id, createDefaultFilter(nextPath, nextType));
              }}
            >
              {fieldOptions.map((opt) => (
                <option key={opt.path} value={opt.path}>
                  {opt.path}
                </option>
              ))}
            </select>

            {type === "string" && (
              <>
                <select
                  className="select select-sm"
                  value={filter.mode}
                  onChange={(e) =>
                    updateFilter(filter.id, {
                      mode: e.target.value as StringFilterMode,
                    })
                  }
                >
                  <option value="contains">contains</option>
                  <option value="startsWith">starts with</option>
                </select>
                <input
                  className="input input-sm"
                  placeholder="text…"
                  value={filter.value}
                  onChange={(e) =>
                    updateFilter(filter.id, { value: e.target.value })
                  }
                />
              </>
            )}

            {type === "number" && (
              <>
                <input
                  className="input input-sm"
                  type="number"
                  placeholder="min"
                  value={filter.min ?? ""}
                  onChange={(e) =>
                    updateFilter(filter.id, {
                      min: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
                <input
                  className="input input-sm"
                  type="number"
                  placeholder="max"
                  value={filter.max ?? ""}
                  onChange={(e) =>
                    updateFilter(filter.id, {
                      max: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </>
            )}

            {type === "boolean" && (
              <select
                className="select select-sm"
                value={filter.value ? "true" : "false"}
                onChange={(e) =>
                  updateFilter(filter.id, { value: e.target.value === "true" })
                }
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            )}

            {type === "exists" && (
              <select
                className="select select-sm"
                value={filter.mode}
                onChange={(e) =>
                  updateFilter(filter.id, {
                    mode: e.target.value as "exists" | "missing",
                  })
                }
              >
                <option value="exists">exists</option>
                <option value="missing">missing</option>
              </select>
            )}

            <button
              type="button"
              className="btn-ghost btn-ghost-sm"
              onClick={() => removeFilter(filter.id)}
            >
              Remove
            </button>
          </div>
        );
      })}
    </div>
  );
};

