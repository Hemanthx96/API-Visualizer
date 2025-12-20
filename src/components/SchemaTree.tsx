import { useState } from "react";
import type { SchemaNode, SchemaType } from "../utils/inferSchema";

interface SchemaTreeProps {
  schema: SchemaNode;
  rootName?: string;
}

/**
 * Formats a schema type as a readable string (e.g., "string", "number[]", "User | null").
 */
const formatTypeString = (type: SchemaType, depth = 0): string => {
  switch (type.kind) {
    case "primitive":
      return type.type;
    case "array":
      const itemType = formatTypeString(type.itemSchema.type, depth + 1);
      return `${itemType}[]`;
    case "object":
      if (depth > 2) {
        // Avoid deeply nested inline objects
        return "{ ... }";
      }
      const fields = Object.entries(type.fields)
        .slice(0, 3)
        .map(([key, node]) => {
          const optional = node.optional ? "?" : "";
          const typeStr = formatTypeString(node.type, depth + 1);
          return `${key}${optional}: ${typeStr}`;
        });
      const more = Object.keys(type.fields).length > 3 ? ", ..." : "";
      return `{ ${fields.join(", ")}${more} }`;
    case "union":
      return type.types.map((t) => formatTypeString(t, depth + 1)).join(" | ");
  }
};

/**
 * Renders a single schema node in the tree.
 */
const SchemaNodeView = ({
  name,
  node,
  depth = 0,
}: {
  name: string;
  node: SchemaNode;
  depth?: number;
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const indent = depth * 20;
  const optional = node.optional ? "?" : "";

  const handleToggle = () => {
    // Only allow collapsing for objects and arrays
    if (node.type.kind === "object" || node.type.kind === "array") {
      setCollapsed((prev) => !prev);
    }
  };

  const canCollapse = node.type.kind === "object" || node.type.kind === "array";

  if (node.type.kind === "primitive") {
    return (
      <div className="schema-line" style={{ paddingLeft: `${indent}px` }}>
        <span className="schema-key">{name}</span>
        {optional && <span className="schema-optional">?</span>}
        <span className="schema-separator">: </span>
        <span className="schema-type schema-type-primitive">
          {node.type.type}
        </span>
      </div>
    );
  }

  if (node.type.kind === "union") {
    if (node.type.types.length === 0) {
      return (
        <div className="schema-line" style={{ paddingLeft: `${indent}px` }}>
          <span className="schema-key">{name}</span>
          {optional && <span className="schema-optional">?</span>}
          <span className="schema-separator">: </span>
          <span className="schema-type schema-type-union">unknown</span>
        </div>
      );
    }
    return (
      <div className="schema-line" style={{ paddingLeft: `${indent}px` }}>
        <span className="schema-key">{name}</span>
        {optional && <span className="schema-optional">?</span>}
        <span className="schema-separator">: </span>
        <span className="schema-type schema-type-union">
          {node.type.types.map((t, idx) => (
            <span key={idx}>
              {idx > 0 && <span className="schema-union-sep"> | </span>}
              <span>{formatTypeString(t)}</span>
            </span>
          ))}
        </span>
      </div>
    );
  }

  if (node.type.kind === "array") {
    const itemType = node.type.itemSchema.type;
    const isComplex = itemType.kind === "object" || itemType.kind === "array";

    return (
      <div>
        <div className="schema-line" style={{ paddingLeft: `${indent}px` }}>
          {canCollapse && (
            <span className="schema-toggle" onClick={handleToggle}>
              {collapsed ? "▶" : "▼"}
            </span>
          )}
          <span className="schema-key">{name}</span>
          {optional && <span className="schema-optional">?</span>}
          <span className="schema-separator">: </span>
          <span className="schema-type schema-type-array">
            {formatTypeString(itemType)}
            <span className="schema-array-bracket">[]</span>
          </span>
        </div>
        {!collapsed && isComplex && (
          <div style={{ paddingLeft: `${indent + 20}px` }}>
            <div className="schema-line">
              <span className="schema-comment">// array item:</span>
            </div>
            <SchemaNodeView
              name="[item]"
              node={node.type.itemSchema}
              depth={depth + 1}
            />
          </div>
        )}
      </div>
    );
  }

  // Object type
  const fieldEntries = Object.entries(node.type.fields);
  const isEmpty = fieldEntries.length === 0;

  return (
    <div>
      <div className="schema-line" style={{ paddingLeft: `${indent}px` }}>
        {canCollapse && (
          <span className="schema-toggle" onClick={handleToggle}>
            {collapsed ? "▶" : "▼"}
          </span>
        )}
        <span className="schema-key">{name}</span>
        {optional && <span className="schema-optional">?</span>}
        <span className="schema-separator">: </span>
        <span className="schema-type schema-type-object">{"{"}</span>
        {isEmpty && <span className="schema-type">{"}"}</span>}
        {collapsed && !isEmpty && (
          <span className="schema-collapsed-hint">
            {" "}
            // {fieldEntries.length} field{fieldEntries.length !== 1 ? "s" : ""}
          </span>
        )}
        {collapsed && !isEmpty && <span className="schema-type">{"}"}</span>}
      </div>
      {!collapsed && !isEmpty && (
        <>
          {fieldEntries.map(([fieldName, fieldNode]) => (
            <SchemaNodeView
              key={fieldName}
              name={fieldName}
              node={fieldNode}
              depth={depth + 1}
            />
          ))}
          <div className="schema-line" style={{ paddingLeft: `${indent}px` }}>
            <span className="schema-type schema-type-object">{"}"}</span>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * SchemaTree component: renders a JSON schema as an expandable/collapsible tree view.
 */
export const SchemaTree = ({
  schema,
  rootName = "root",
}: SchemaTreeProps): JSX.Element => {
  return (
    <div className="schema-viewer">
      <div className="schema-header">
        <span className="schema-title">Inferred Schema</span>
        <span className="schema-subtitle">TypeScript-like type definition</span>
      </div>
      <div className="schema-content">
        <SchemaNodeView name={rootName} node={schema} depth={0} />
      </div>
    </div>
  );
};
