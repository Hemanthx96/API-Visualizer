import { useState } from "react";

interface JsonViewerProps {
  value: unknown;
}

type NodePath = string;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatScalar = (value: unknown): { text: string; className: string } => {
  if (value === null) {
    return { text: "null", className: "json-null" };
  }
  switch (typeof value) {
    case "string":
      return { text: `"${value}"`, className: "json-string" };
    case "number":
      return { text: String(value), className: "json-number" };
    case "boolean":
      return { text: String(value), className: "json-boolean" };
    default:
      return { text: JSON.stringify(value), className: "json-string" };
  }
};

export const JsonViewer = ({ value }: JsonViewerProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState<Record<NodePath, boolean>>({});

  const toggle = (path: NodePath) => {
    setCollapsed((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderValue = (val: unknown, depth: number, basePath: NodePath): JSX.Element[] => {
    const indent = "  ".repeat(depth);
    const result: JSX.Element[] = [];

    if (Array.isArray(val)) {
      const path = basePath || "root";
      const isCollapsed = collapsed[path] ?? false;
      const header = `${indent}[${isCollapsed ? `… ${val.length} item(s)` : ""}`;

      result.push(
        <div key={`${path}-open`} className="json-line">
          <span
            className={`json-toggle ${isCollapsed ? "json-collapsed" : ""}`}
            onClick={() => toggle(path)}
          >
            {isCollapsed ? "▶" : "▼"}
          </span>
          <span>{header}</span>
          {!isCollapsed && val.length === 0 && <span>]</span>}
        </div>
      );

      if (!isCollapsed && val.length > 0) {
        val.forEach((item, index) => {
          const childPath = `${path}.${index}`;
          const children = renderValue(item, depth + 1, childPath);
          children.forEach((child, i) => {
            result.push(
              <div key={`${childPath}-${i}`} className="json-line">
                {child.props.children}
              </div>
            );
          });
        });

        result.push(
          <div key={`${path}-close`} className="json-line">
            {indent}]
          </div>
        );
      }

      return result;
    }

    if (isPlainObject(val)) {
      const entries = Object.entries(val);
      const path = basePath || "root";
      const isCollapsed = collapsed[path] ?? false;
      const header = `${indent}{${isCollapsed ? `… ${entries.length} key(s)` : ""}`;

      result.push(
        <div key={`${path}-open`} className="json-line">
          <span
            className={`json-toggle ${isCollapsed ? "json-collapsed" : ""}`}
            onClick={() => toggle(path)}
          >
            {isCollapsed ? "▶" : "▼"}
          </span>
          <span>{header}</span>
          {!isCollapsed && entries.length === 0 && <span>{'}'}</span>}
        </div>
      );

      if (!isCollapsed && entries.length > 0) {
        entries.forEach(([k, v]) => {
          const childPath = `${path}.${k}`;
          if (isPlainObject(v) || Array.isArray(v)) {
            const childLines = renderValue(v, depth + 1, childPath);
            const [first, ...rest] = childLines;
            result.push(
              <div key={`${childPath}-first`} className="json-line">
                {"  ".repeat(depth + 1)}
                <span className="json-key">{k}</span>
                <span>: </span>
                {first?.props.children}
              </div>
            );
            rest.forEach((child, i) => {
              result.push(
                <div key={`${childPath}-${i}`} className="json-line">
                  {child.props.children}
                </div>
              );
            });
          } else {
            const scalar = formatScalar(v);
            result.push(
              <div key={childPath} className="json-line">
                {"  ".repeat(depth + 1)}
                <span className="json-key">{k}</span>
                <span>: </span>
                <span className={scalar.className}>{scalar.text}</span>
              </div>
            );
          }
        });

        result.push(
          <div key={`${path}-close`} className="json-line">
            {indent}
            {'}'}
          </div>
        );
      }

      return result;
    }

    const scalar = formatScalar(val);
    result.push(
      <div key={basePath} className="json-line">
        {indent}
        <span className={scalar.className}>{scalar.text}</span>
      </div>
    );
    return result;
  };

  return <div className="json-viewer">{renderValue(value, 0, "root")}</div>;
};


