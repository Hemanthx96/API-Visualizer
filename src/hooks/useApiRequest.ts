import axios, { AxiosError } from "axios";
import { useCallback, useState } from "react";
import type {
  ApiRequest,
  ApiResponseMetadata,
  ParsedResponse,
  RequestExecutionResult,
} from "../types";

export interface UseApiRequestState {
  loading: boolean;
  lastResult: RequestExecutionResult | null;
}

export interface UseApiRequestReturn extends UseApiRequestState {
  execute: (req: Omit<ApiRequest, "id" | "createdAt">) => Promise<void>;
}

const toLowercaseHeaders = (
  headers: Record<string, string>
): Record<string, string> => {
  const out: Record<string, string> = {};
  Object.entries(headers).forEach(([k, v]) => {
    out[k.toLowerCase()] = v;
  });
  return out;
};

const parseBody = (
  data: unknown,
  contentTypeHeader: string | undefined
): ParsedResponse => {
  const rawBody =
    typeof data === "string"
      ? data
      : data == null
      ? ""
      : // Axios already parsed JSON objects for us; stringify for raw view
        JSON.stringify(data);

  const contentType = contentTypeHeader?.toLowerCase() ?? "";
  if (
    contentType.includes("application/json") ||
    contentType.includes("+json")
  ) {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return {
        kind: "json",
        rawBody,
        jsonBody: parsed,
      };
    } catch {
      // fall through to text; invalid JSON should still be visible
    }
  }

  // Heuristic: looks like JSON even if content-type is wrong
  const trimmed = rawBody.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return {
        kind: "json",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        jsonBody: JSON.parse(trimmed),
        rawBody,
      };
    } catch {
      // ignore
    }
  }

  if (typeof data === "string") {
    return { kind: "text", rawBody };
  }

  return {
    kind: "unknown",
    rawBody,
  };
};

const computeSizeBytes = (data: unknown): number | null => {
  if (data == null) {
    return null;
  }
  try {
    const str = typeof data === "string" ? data : JSON.stringify(data);
    // UTF-8 bytes approximation: 2 bytes per char upper bound, good enough for diagnostics
    return str.length * 2;
  } catch {
    return null;
  }
};

export const useApiRequest = (): UseApiRequestReturn => {
  const [state, setState] = useState<UseApiRequestState>({
    loading: false,
    lastResult: null,
  });

  const execute = useCallback(
    async (reqInput: Omit<ApiRequest, "id" | "createdAt">): Promise<void> => {
      const id = crypto.randomUUID();
      const createdAt = Date.now();

      const request: ApiRequest = {
        ...reqInput,
        id,
        createdAt,
      };

      setState((prev) => ({ ...prev, loading: true }));

      const started = performance.now();

      try {
        const response = await axios.request({
          url: request.url,
          method: request.method,
          headers: request.headers,
          // For a GET-only client, we don't send a body
          validateStatus: () => true, // let us see 4xx / 5xx as "successful" responses
        });

        const durationMs = performance.now() - started;
        const responseHeaders: Record<string, string> = {};
        Object.entries(response.headers).forEach(([k, v]) => {
          responseHeaders[k] = Array.isArray(v) ? v.join(", ") : String(v);
        });

        const lower = toLowercaseHeaders(responseHeaders);
        const parsed = parseBody(response.data, lower["content-type"]);

        const metadata: ApiResponseMetadata = {
          status: response.status ?? null,
          statusText: response.statusText ?? null,
          durationMs,
          sizeBytes: computeSizeBytes(response.data),
          headers: responseHeaders,
          isError: response.status >= 400,
          errorMessage:
            response.status >= 400
              ? `HTTP ${response.status} ${response.statusText || ""}`.trim()
              : undefined,
        };

        setState({
          loading: false,
          lastResult: {
            request,
            parsed,
            metadata,
          },
        });
      } catch (err) {
        const durationMs = performance.now() - started;
        const axiosError = err as AxiosError;

        let message: string;
        if (axiosError.code === "ECONNABORTED") {
          message = "Request timed out. The server took too long to respond.";
        } else if (!axiosError.response) {
          // Common case for CORS / browser-blocked requests where Postman would still work.
          message =
            "This API blocks browser requests due to CORS or network restrictions. Try another public API or call it through a backend proxy.";
        } else {
          message =
            axiosError.message || "Network error while performing the request.";
        }

        const metadata: ApiResponseMetadata = {
          status: axiosError.response?.status ?? null,
          statusText: axiosError.response?.statusText ?? null,
          durationMs,
          sizeBytes: axiosError.response
            ? computeSizeBytes(axiosError.response.data)
            : null,
          headers: axiosError.response
            ? toLowercaseHeaders(
                Object.fromEntries(
                  Object.entries(axiosError.response.headers).map(([k, v]) => [
                    k,
                    Array.isArray(v) ? v.join(", ") : String(v),
                  ])
                )
              )
            : {},
          isError: true,
          errorMessage: message,
        };

        const parsed: ParsedResponse | null =
          axiosError.response != null
            ? parseBody(
                axiosError.response.data,
                String(axiosError.response.headers["content-type"] ?? "")
              )
            : null;

        setState({
          loading: false,
          lastResult: {
            request,
            parsed,
            metadata,
          },
        });
      }
    },
    []
  );

  return { ...state, execute };
};
