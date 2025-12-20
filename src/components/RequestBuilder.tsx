import { useEffect, useMemo, useState } from "react";
import type { HeaderRow, HttpMethod } from "../types";

export interface RequestBuilderValue {
  url: string;
  method: HttpMethod;
  headers: HeaderRow[];
}

interface RequestBuilderProps {
  value: RequestBuilderValue;
  onChange: (next: RequestBuilderValue) => void;
  onSubmit: () => void;
  submitting: boolean;
}

const DEFAULT_HEADERS: HeaderRow[] = [
  { id: "accept", key: "Accept", value: "application/json, text/plain;q=0.9" }
];

const createEmptyHeader = (): HeaderRow => ({
  id: crypto.randomUUID(),
  key: "",
  value: ""
});

export const RequestBuilder = ({
  value,
  onChange,
  onSubmit,
  submitting
}: RequestBuilderProps): JSX.Element => {
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched && value.headers.length === 0) {
      onChange({ ...value, headers: DEFAULT_HEADERS });
      setTouched(true);
    }
  }, [onChange, touched, value]);

  const isValidUrl = useMemo(() => {
    if (!value.url.trim()) {
      return false;
    }
    try {
      // eslint-disable-next-line no-new
      new URL(value.url);
      return true;
    } catch {
      return false;
    }
  }, [value.url]);

  const handleHeaderChange = (id: string, key: keyof Omit<HeaderRow, "id">, next: string) => {
    const headers = value.headers.map((row) =>
      row.id === id ? { ...row, [key]: next } : row
    );
    onChange({ ...value, headers });
  };

  const handleAddHeader = () => {
    onChange({ ...value, headers: [...value.headers, createEmptyHeader()] });
  };

  const handleRemoveHeader = (id: string) => {
    onChange({
      ...value,
      headers: value.headers.filter((row) => row.id !== id)
    });
  };

  const handleUrlChange = (next: string) => {
    onChange({ ...value, url: next });
  };

  const disabled = submitting || !isValidUrl;

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Request</span>
        <div className="pill-row">
          <span className="live-indicator">
            <span className="live-dot" aria-hidden="true" />
            <span>Live</span>
          </span>
        </div>
      </div>
      <div className="panel-body">
        <div className="url-row">
          <select
            className="select"
            value={value.method}
            onChange={(e) => {
              const method = e.target.value as HttpMethod;
              onChange({ ...value, method });
            }}
          >
            <option value="GET">GET</option>
          </select>
          <input
            className="input"
            placeholder="https://api.example.com/users"
            value={value.url}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
          <button
            type="button"
            className="btn"
            onClick={onSubmit}
            disabled={disabled}
          >
            {submitting ? (
              <>
                <span className="skeleton-row" style={{ width: 12 }} />
                Sending…
              </>
            ) : (
              <>
                <span>▶</span>
                Send
              </>
            )}
          </button>
        </div>

        {!isValidUrl && value.url.trim().length > 0 && (
          <div className="error-banner" style={{ marginTop: 6 }}>
            <div>
              <div className="error-label">Invalid URL</div>
              <div className="error-secondary">
                Please include the protocol, e.g.{" "}
                <code>https://api.example.com</code>.
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="label" style={{ marginBottom: 4, marginTop: 6 }}>
            <span>Headers</span>
            <span className="label-pill">Optional</span>
          </div>
          <table className="headers-table">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Key</th>
                <th>Value</th>
                <th className="headers-actions-cell">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Add header"
                    onClick={handleAddHeader}
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {value.headers.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      className="input"
                      placeholder="Authorization"
                      value={row.key}
                      onChange={(e) =>
                        handleHeaderChange(row.id, "key", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      placeholder="Bearer &lt;token&gt;"
                      value={row.value}
                      onChange={(e) =>
                        handleHeaderChange(row.id, "value", e.target.value)
                      }
                    />
                  </td>
                  <td className="headers-actions-cell">
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      aria-label="Remove header"
                      onClick={() => handleRemoveHeader(row.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {value.headers.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state">
                      No headers. Click + to add one.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


