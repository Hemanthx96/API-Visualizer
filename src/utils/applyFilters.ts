import { PrimitiveType, SchemaNode, SchemaType } from "./inferSchema";

export type FieldKind = "string" | "number" | "boolean" | "unknown";

export interface FilterableField {
  path: string; // dot-notation (e.g., user.address.city)
  kind: FieldKind;
  optional: boolean;
}

export type StringFilterMode = "contains" | "startsWith";
export type ExistsFilterMode = "exists" | "missing";

export type FilterRule =
  | {
      id: string;
      type: "string";
      path: string;
      mode: StringFilterMode;
      value: string;
    }
  | {
      id: string;
      type: "number";
      path: string;
      min?: number;
      max?: number;
    }
  | {
      id: string;
      type: "boolean";
      path: string;
      value: boolean;
    }
  | {
      id: string;
      type: "exists";
      path: string;
      mode: ExistsFilterMode;
    };

/**
 * Resolve a nested field from an object using dot notation without mutating the source.
 * Returns undefined if any segment is missing.
 */
const getValueAtPath = (item: Record<string, unknown>, path: string): unknown => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, item);
};

const matchesFilter = (value: unknown, filter: FilterRule): boolean => {
  switch (filter.type) {
    case "string": {
      if (value == null) return false;
      const text = String(value).toLowerCase();
      const term = filter.value.toLowerCase();
      if (filter.mode === "contains") {
        return text.includes(term);
      }
      return text.startsWith(term);
    }
    case "number": {
      if (typeof value !== "number") return false;
      if (filter.min != null && value < filter.min) return false;
      if (filter.max != null && value > filter.max) return false;
      return true;
    }
    case "boolean": {
      if (typeof value !== "boolean") return false;
      return value === filter.value;
    }
    case "exists": {
      const exists = value !== undefined;
      return filter.mode === "exists" ? exists : !exists;
    }
    default:
      return true;
  }
};

/**
 * Apply an array of filters to data without mutating the original.
 * Filters are AND-composed; an item must satisfy all filters to be kept.
 */
export const applyFilters = <T extends Record<string, unknown>>(
  data: T[],
  filters: FilterRule[]
): T[] => {
  if (!filters.length) return data;
  return data.filter((item) =>
    filters.every((filter) => {
      const value = getValueAtPath(item, filter.path);
      return matchesFilter(value, filter);
    })
  );
};

/**
 * Collect filterable fields (string, number, boolean, optional) from a schema.
 * Traverses objects recursively and flattens paths with dot notation.
 */
export const collectFilterableFields = (
  schema: SchemaNode | null,
  basePath = ""
): FilterableField[] => {
  if (!schema) return [];

  const fields: FilterableField[] = [];

  const visit = (node: SchemaNode, pathPrefix: string) => {
    const kind = node.type.kind;

    if (kind === "object") {
      Object.entries(node.type.fields).forEach(([key, child]) => {
        const nextPath = pathPrefix ? `${pathPrefix}.${key}` : key;
        visit(child, nextPath);
      });
      return;
    }

    if (kind === "primitive") {
      const mapped: FieldKind =
        node.type.type === "string"
          ? "string"
          : node.type.type === "number"
          ? "number"
          : node.type.type === "boolean"
          ? "boolean"
          : "unknown";
      fields.push({ path: pathPrefix, kind: mapped, optional: node.optional });
      return;
    }

    if (kind === "union") {
      // Flatten unions of primitives only; mixed kinds are treated as unknown
      const primitiveTypes = node.type.types
        .map((t) => (t.kind === "primitive" ? t.type : null))
        .filter((t): t is PrimitiveType => t != null);

      if (primitiveTypes.length === node.type.types.length) {
        // If union of primitives, include as unknown to avoid incorrect coercion
        fields.push({ path: pathPrefix, kind: "unknown", optional: node.optional });
      }
      return;
    }

    // Arrays are handled at the item level (callers should pass itemSchema for array responses)
  };

  visit(schema, basePath);
  return fields;
};

