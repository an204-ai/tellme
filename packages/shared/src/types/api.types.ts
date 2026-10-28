export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  meta?: {
    nextCursor?: string;
    total?: number;
  };
}
