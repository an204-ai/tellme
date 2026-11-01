export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api${path}`, { ...options, credentials: "same-origin", headers: { "Content-Type": "application/json", ...options.headers } }); }
  catch { throw new ApiError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.", 0); }
  const body = await response.json().catch(() => ({ error: "Máy chủ chưa sẵn sàng. Thử lại nhé." }));
  if (!response.ok) throw new ApiError(body.error || "Chưa xử lý được yêu cầu.", response.status);
  return body as T;
}
export const send = (path: string, body?: unknown) => api(path, { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
export interface Admin { name: string; email: string; verified: boolean; webUrl: string }
export interface Page<T> { items: T[]; total: number; nextCursor: number | null }
export const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
export const statusNames: Record<string, string> = { pending: "Đang chờ", dispatched: "Trong hàng đợi", completed: "Hoàn tất", failed: "Thất bại" };
export const reasonNames: Record<string, string> = { spam: "Spam hoặc làm phiền", harassment: "Quấy rối, bắt nạt", impersonation: "Giả mạo", scam: "Lừa đảo", inappropriate: "Nội dung không phù hợp", other: "Lý do khác" };
