export interface AdminUser { _id: string; name: string; username: string; avatar: string; email: string; createdAt: string; emailVerifiedAt?: string; admin: boolean; suspended: boolean; suspension?: { reason: string; at: string; until?: string } }
export interface UserDetail { user: AdminUser; stats: Record<"stories" | "messages" | "sessions" | "reports", number> }
export interface ContentEntry { _id: string; type: "story"; authorId: string; author: string; text: string; images: string[]; at: string; day?: string; privacy: string; moments?: number; moderation: { hidden: boolean; reason: string; at: string } | null }
export interface InfrastructureData {
  at: string;
  environment: string;
  requestsPerMinute: number;
  traffic: { hour: string; count: number }[];
  host: { totalMemoryBytes: number; freeMemoryBytes: number; disk: { totalBytes: number; availableBytes: number } | null };
  cloudinary: { ready: boolean; storageBytes: number | null };
  connections: { name: string; state: "connected" | "unavailable" | "configured" | "disabled" }[];
}
