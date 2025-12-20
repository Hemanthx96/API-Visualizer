export type HttpMethod = "GET";

export interface HeaderRow {
  id: string;
  key: string;
  value: string;
}

export interface ApiRequest {
  id: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  createdAt: number;
}

export interface ApiResponseMetadata {
  status: number | null;
  statusText: string | null;
  durationMs: number | null;
  sizeBytes: number | null;
  headers: Record<string, string>;
  isError: boolean;
  errorMessage?: string;
}

export type ParsedResponseKind = "json" | "text" | "unknown";

export interface ParsedResponse {
  kind: ParsedResponseKind;
  rawBody: string;
  jsonBody?: unknown;
}

export interface RequestExecutionResult {
  request: ApiRequest;
  parsed: ParsedResponse | null;
  metadata: ApiResponseMetadata;
}


