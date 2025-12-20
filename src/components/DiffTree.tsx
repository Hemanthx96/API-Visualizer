import { useState } from "react";
import type { DiffNode, DiffStatus } from "../utils/diffJson";

interface DiffTreeProps {
  diff: DiffNode;
  rootName?: string;
}

/**
 * Formats a value for display in the diff view.
 * Handles primitives, objects, arrays, null, and undefined.
 */
const formatValue = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.length} item${value.length !== 1 ? "s" : ""}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return `{${keys.length} key${keys.length !== 1 ? "s" : ""}}`;
  }
  return String(value);
};

/**
 * Gets the CSS class name for a diff status.
 */
const getStatusClass = (status: DiffStatus): string => {
  switch (status) {
    case "added":
      return "diff-added";
    case "removed":
      return "diff-removed";
    case "changed":
      return "diff-changed";
    case "unchanged":
      return "diff-unchanged";
  }
};

/**
 * Renders a single diff node in the tree.
 */
const DiffNodeView = ({
  name,
  node,
  depth = 0,
}: {
  name: string;
  node: DiffNode;
  depth?: number;
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const indent = depth * 20;
  const statusClass = getStatusClass(node.status);
  const canCollapse = node.children || node.arrayItems;

  const handleToggle = () => {
    if (canCollapse) {
      setCollapsed((prev) => !prev);
    }
  };

  // Render array items
  if (node.arrayItems) {
    const isEmpty = node.arrayItems.length === 0;
    const hasChanges = node.status !== "unchanged";

    return (
      <div>
        <div className={`diff-line ${statusClass}`} style={{ paddingLeft: `${indent}px` }}>
          {canCollapse && (
            <span className="diff-toggle" onClick={handleToggle}>
              {collapsed ? "▶" : "▼"}
            </span>
          )}
          <span className="diff-key">{name}</span>
          <span className="diff-separator">: </span>
          <span className="diff-type">array</span>
          {collapsed && !isEmpty && (
            <span className="diff-collapsed-hint">
              {" "}
              // {node.arrayItems.length} item{node.arrayItems.length !== 1 ? "s" : ""}
              {hasChanges && <span className={`diff-status-badge ${statusClass}`}>{node.status}</span>}
            </span>
          )}
        </div>
        {!collapsed && !isEmpty && (
          <>
            {node.arrayItems.map((item, idx) => (
              <DiffNodeView key={idx} name={`[${idx}]`} node={item} depth={depth + 1} />
            ))}
          </>
        )}
      </div>
    );
  }

  // Render object with children
  if (node.children) {
    const fieldEntries = Object.entries(node.children);
    const isEmpty = fieldEntries.length === 0;
    const hasChanges = node.status !== "unchanged";

    return (
      <div>
        <div className={`diff-line ${statusClass}`} style={{ paddingLeft: `${indent}px` }}>
          {canCollapse && (
            <span className="diff-toggle" onClick={handleToggle}>
              {collapsed ? "▶" : "▼"}
            </span>
          )}
          <span className="diff-key">{name}</span>
          <span className="diff-separator">: </span>
          <span className="diff-type">{"{"}</span>
          {isEmpty && <span className="diff-type">{"}"}</span>}
          {collapsed && !isEmpty && (
            <span className="diff-collapsed-hint">
              {" "}
              // {fieldEntries.length} field{fieldEntries.length !== 1 ? "s" : ""}
              {hasChanges && <span className={`diff-status-badge ${statusClass}`}>{node.status}</span>}
            </span>
          )}
          {collapsed && !isEmpty && <span className="diff-type">{"}"}</span>}
        </div>
        {!collapsed && !isEmpty && (
          <>
            {fieldEntries.map(([fieldName, fieldNode]) => (
              <DiffNodeView key={fieldName} name={fieldName} node={fieldNode} depth={depth + 1} />
            ))}
            <div className={`diff-line ${statusClass}`} style={{ paddingLeft: `${indent}px` }}>
              <span className="diff-type">{"}"}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Render primitive or changed value
  const showBothValues = node.status === "changed" && node.oldValue !== undefined && node.newValue !== undefined;

  return (
    <div className={`diff-line ${statusClass}`} style={{ paddingLeft: `${indent}px` }}>
      <span className="diff-key">{name}</span>
      <span className="diff-separator">: </span>
      {showBothValues ? (
        <>
          <span className="diff-old-value">{formatValue(node.oldValue)}</span>
          <span className="diff-arrow"> → </span>
          <span className="diff-new-value">{formatValue(node.newValue)}</span>
        </>
      ) : node.status === "added" ? (
        <span className="diff-new-value">{formatValue(node.newValue)}</span>
      ) : node.status === "removed" ? (
        <span className="diff-old-value">{formatValue(node.oldValue)}</span>
      ) : (
        <span className="diff-value">{formatValue(node.newValue ?? node.oldValue)}</span>
      )}
      {node.status !== "unchanged" && (
        <span className={`diff-status-badge ${statusClass}`}>{node.status}</span>
      )}
    </div>
  );
};

/**
 * DiffTree component: renders a JSON diff as an expandable/collapsible tree view.
 */
export const DiffTree = ({ diff, rootName = "root" }: DiffTreeProps): JSX.Element => {
  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <span className="diff-title">Response Diff</span>
        <span className="diff-subtitle">Comparing previous vs current response</span>
      </div>
      <div className="diff-legend">
        <span className="diff-legend-item">
          <span className="diff-legend-color diff-added"></span>
          Added
        </span>
        <span className="diff-legend-item">
          <span className="diff-legend-color diff-removed"></span>
          Removed
        </span>
        <span className="diff-legend-item">
          <span className="diff-legend-color diff-changed"></span>
          Changed
        </span>
        <span className="diff-legend-item">
          <span className="diff-legend-color diff-unchanged"></span>
          Unchanged
        </span>
      </div>
      <div className="diff-content">
        <DiffNodeView name={rootName} node={diff} depth={0} />
      </div>
    </div>
  );
};

