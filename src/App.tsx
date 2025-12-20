import { useEffect, useMemo, useState } from "react";
import {
  RequestBuilder,
  type RequestBuilderValue,
} from "./components/RequestBuilder";
import { ResponseViewer } from "./components/ResponseViewer";
import { HistoryPanel } from "./components/HistoryPanel";
import { useApiRequest } from "./hooks/useApiRequest";
import type { ApiRequest, HeaderRow, RequestExecutionResult } from "./types";

const HISTORY_KEY = "api-visualizer:lastRequests";
const HISTORY_LIMIT = 5;

const fromHeaderRows = (rows: HeaderRow[]): Record<string, string> => {
  const out: Record<string, string> = {};
  rows.forEach((row) => {
    if (!row.key.trim()) return;
    out[row.key] = row.value;
  });
  return out;
};

const toHeaderRows = (headers: Record<string, string>): HeaderRow[] =>
  Object.entries(headers).map(([key, value]) => ({
    id: crypto.randomUUID(),
    key,
    value,
  }));

const parseHistory = (raw: string | null): RequestExecutionResult[] => {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as RequestExecutionResult[];
    // Defensive: only keep items that look like ours
    return value.filter(
      (item) =>
        typeof item.request?.url === "string" &&
        typeof item.request?.method === "string" &&
        typeof item.request?.createdAt === "number"
    );
  } catch {
    return [];
  }
};

export const App = (): JSX.Element => {
  const { loading, lastResult, execute } = useApiRequest();
  const [builder, setBuilder] = useState<RequestBuilderValue>({
    url: "",
    method: "GET",
    headers: [],
  });
  const [history, setHistory] = useState<RequestExecutionResult[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(HISTORY_KEY);
    setHistory(parseHistory(stored));
    const theme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(theme);
  }, []);

  // Mirror the React darkMode state into a CSS class so the whole theme
  // (including backgrounds) can swap without relying on inline styles.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (darkMode) {
      body.classList.add("theme-dark");
    } else {
      body.classList.remove("theme-dark");
    }
  }, [darkMode]);

  const persistHistory = (items: RequestExecutionResult[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(items.slice(0, HISTORY_LIMIT))
    );
  };

  const handleSubmit = async () => {
    await execute({
      url: builder.url,
      method: builder.method,
      headers: fromHeaderRows(builder.headers),
    });
  };

  useEffect(() => {
    if (!lastResult) return;
    setHistory((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.request.url === lastResult.request.url &&
          item.request.method === lastResult.request.method &&
          JSON.stringify(item.request.headers) ===
            JSON.stringify(lastResult.request.headers)
      );

      const withoutDuplicate =
        existingIndex >= 0
          ? prev.filter((_, idx) => idx !== existingIndex)
          : prev;
      const updated = [lastResult, ...withoutDuplicate].slice(0, HISTORY_LIMIT);
      persistHistory(updated);
      return updated;
    });
  }, [lastResult]);

  const handleReplay = (request: ApiRequest) => {
    setBuilder({
      url: request.url,
      method: request.method,
      headers: toHeaderRows(request.headers),
    });
    void execute({
      url: request.url,
      method: request.method,
      headers: request.headers,
    });
  };

  const themeLabel = useMemo(() => (darkMode ? "Dark" : "Light"), [darkMode]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title-block">
          <h1 className="app-title">API Explorer</h1>
          <p className="app-subtitle">
            Lightweight Postman-style client for exploring JSON APIs visually.
          </p>
        </div>
        <div className="pill-row">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setDarkMode((prev) => !prev)}
          >
            <span className="btn-ghost-icon">{darkMode ? "🌙" : "☀️"}</span>
            {themeLabel} mode
          </button>
        </div>
      </header>

      <main className="app-main">
        <HistoryPanel items={history} onReplay={handleReplay} />
        <RequestBuilder
          value={builder}
          onChange={setBuilder}
          onSubmit={handleSubmit}
          submitting={loading}
        />
        <ResponseViewer
          result={lastResult}
          loading={loading}
          previousResult={history.length > 1 ? history[1] : null}
        />
      </main>
    </div>
  );
};
