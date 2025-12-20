import type { ApiRequest, RequestExecutionResult } from "../types";

interface HistoryPanelProps {
  items: RequestExecutionResult[];
  onReplay: (request: ApiRequest) => void;
}

export const HistoryPanel = ({ items, onReplay }: HistoryPanelProps): JSX.Element => {
  const sorted = [...items].sort(
    (a, b) => b.request.createdAt - a.request.createdAt
  );

  return (
    <div className="panel panel-history">
      <div className="panel-header">
        <span className="panel-title">Recent</span>
        <span className="label-pill">{items.length}/5</span>
      </div>
      <div className="panel-body">
        {sorted.length === 0 && (
          <div className="empty-state">
            Your last five requests will appear here for quick replay.
          </div>
        )}
        {sorted.length > 0 && (
          <ul className="history-list">
            {sorted.map((item) => (
              <li key={item.request.id}>
                <button
                  type="button"
                  className="history-item-btn"
                  onClick={() => onReplay(item.request)}
                >
                  <div className="history-title">
                    <span className="history-method">{item.request.method}</span>
                    <span className="history-url">{item.request.url}</span>
                  </div>
                  <div className="history-meta-row">
                    <span>
                      {item.metadata.status
                        ? `HTTP ${item.metadata.status}`
                        : "No response"}
                    </span>
                    {item.metadata.durationMs != null && (
                      <span className="chip-soft">
                        {item.metadata.durationMs.toFixed(1)} ms
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};


