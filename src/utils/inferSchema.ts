/**
 * Schema inference utility for JSON responses.
 * Recursively analyzes JSON data structures to infer TypeScript-like schemas.
 */

export type PrimitiveType = "string" | "number" | "boolean" | "null";

export type SchemaType =
  | { kind: "primitive"; type: PrimitiveType }
  | { kind: "array"; itemSchema: SchemaNode }
  | { kind: "object"; fields: Record<string, SchemaNode> }
  | { kind: "union"; types: SchemaType[] };

export interface SchemaNode {
  type: SchemaType;
  optional: boolean;
}

/**
 * Merges two schema types into a union if they differ, otherwise returns the common type.
 * Handles primitive types, arrays, objects, and unions.
 */
const mergeSchemaTypes = (a: SchemaType, b: SchemaType): SchemaType => {
  // If types are identical, return as-is
  if (JSON.stringify(a) === JSON.stringify(b)) {
    return a;
  }

  // If both are primitives and different, create union
  if (a.kind === "primitive" && b.kind === "primitive") {
    if (a.type !== b.type) {
      return { kind: "union", types: [a, b] };
    }
    return a;
  }

  // If both are arrays, merge item schemas
  if (a.kind === "array" && b.kind === "array") {
    const mergedItem = mergeSchemaNodes(a.itemSchema, b.itemSchema);
    return { kind: "array", itemSchema: mergedItem };
  }

  // If both are objects, merge fields recursively
  if (a.kind === "object" && b.kind === "object") {
    const allKeys = new Set([
      ...Object.keys(a.fields),
      ...Object.keys(b.fields),
    ]);
    const mergedFields: Record<string, SchemaNode> = {};

    for (const key of allKeys) {
      const fieldA = a.fields[key];
      const fieldB = b.fields[key];

      if (fieldA && fieldB) {
        mergedFields[key] = mergeSchemaNodes(fieldA, fieldB);
      } else if (fieldA) {
        mergedFields[key] = { ...fieldA, optional: true };
      } else if (fieldB) {
        mergedFields[key] = { ...fieldB, optional: true };
      }
    }

    return { kind: "object", fields: mergedFields };
  }

  // If one is a union, merge the other into it
  if (a.kind === "union") {
    return mergeIntoUnion(a, b);
  }
  if (b.kind === "union") {
    return mergeIntoUnion(b, a);
  }

  // Different kinds → create union
  return { kind: "union", types: [a, b] };
};

/**
 * Merges a schema type into an existing union, avoiding duplicates.
 */
const mergeIntoUnion = (
  union: { kind: "union"; types: SchemaType[] },
  other: SchemaType
): SchemaType => {
  // Check if the type already exists in the union
  const exists = union.types.some(
    (t) => JSON.stringify(t) === JSON.stringify(other)
  );
  if (exists) {
    return union;
  }

  return { kind: "union", types: [...union.types, other] };
};

/**
 * Merges two schema nodes, combining their types and optional flags.
 */
const mergeSchemaNodes = (a: SchemaNode, b: SchemaNode): SchemaNode => {
  const mergedType = mergeSchemaTypes(a.type, b.type);
  return {
    type: mergedType,
    optional: a.optional || b.optional, // Optional if either is optional
  };
};

/**
 * Infers the schema type for a single JSON value.
 */
const inferTypeForValue = (value: unknown): SchemaType => {
  if (value === null) {
    return { kind: "primitive", type: "null" };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      // Empty array: infer as array of unknown (could be anything)
      // Use a placeholder primitive type to indicate unknown
      return {
        kind: "array",
        itemSchema: {
          type: { kind: "primitive", type: "string" }, // Placeholder; will be refined if items are added
          optional: false,
        },
      };
    }

    // Merge schemas of all items
    const itemSchemas = value.map((item) => ({
      type: inferTypeForValue(item),
      optional: false,
    }));

    const merged = itemSchemas.reduce((acc, node) =>
      mergeSchemaNodes(acc, node)
    );
    return { kind: "array", itemSchema: merged };
  }

  if (typeof value === "object" && value !== null) {
    const fields: Record<string, SchemaNode> = {};
    for (const [key, val] of Object.entries(value)) {
      fields[key] = {
        type: inferTypeForValue(val),
        optional: false, // Will be determined during merging
      };
    }
    return { kind: "object", fields };
  }

  // Primitive types
  const primitiveType: PrimitiveType =
    typeof value === "string"
      ? "string"
      : typeof value === "number"
      ? "number"
      : typeof value === "boolean"
      ? "boolean"
      : "null";

  return { kind: "primitive", type: primitiveType };
};

/**
 * Infers the schema for a JSON response.
 * Handles objects, arrays of objects, and deeply nested structures.
 *
 * @param data - The JSON data to analyze
 * @returns A SchemaNode representing the inferred schema
 */
export const inferSchema = (data: unknown): SchemaNode => {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      // Empty array: return array schema with placeholder item type
      return {
        type: {
          kind: "array",
          itemSchema: {
            type: { kind: "primitive", type: "string" }, // Placeholder
            optional: false,
          },
        },
        optional: false,
      };
    }

    // Merge schemas across all array items
    const itemSchemas = data.map((item) => ({
      type: inferTypeForValue(item),
      optional: false,
    }));

    const merged = itemSchemas.reduce((acc, node) =>
      mergeSchemaNodes(acc, node)
    );
    return {
      type: { kind: "array", itemSchema: merged },
      optional: false,
    };
  }

  // Single object or primitive
  return {
    type: inferTypeForValue(data),
    optional: false,
  };
};
