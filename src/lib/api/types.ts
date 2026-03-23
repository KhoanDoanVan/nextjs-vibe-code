export type ApiMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export interface ApiResponse<TData> {
  status: number;
  message: string;
  path: string;
  data: TData;
}
