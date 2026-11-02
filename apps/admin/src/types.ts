export interface AuditEntry { _id: string; at: string; actorId: string; actor: string; action: string; targetType: string; targetId: string; reason: string }
export interface AdminUser { _id: string; name: string; username: string; avatar: string; email: string; createdAt: string; lastActiveAt?: string; emailVerifiedAt?: string; admin: boolean; suspended: boolean; suspension?: { reason: string; at: string; until?: string } }
export interface UserDetail { user: AdminUser; stats: Record<"posts" | "stories" | "comments" | "messages" | "sessions" | "reports", number>; history: AuditEntry[] }
export interface ContentEntry { _id: string; postId?: string; type: "post" | "story" | "comment"; authorId: string; author: string; text: string; images: string[]; at: string; day?: string; privacy: string; anonymous: boolean; moments?: number; moderation: { hidden: boolean; reason: string; at: string } | null }
export interface LogEntry { _id: string; at: string; level: string; service: string; event: string; route?: string; method?: string; status?: number; durationMs?: number; requestId?: string; jobId?: string; jobKind?: string; code?: string }
export interface DailyUsage { day: string; signups: number; posts: number; stories: number; moments: number; messages: number; comments: number; activeUsers: number | null }
export interface AnalyticsData { days: number; at: string; activityTrackingSince: string | null; series: DailyUsage[]; sessions: number; pendingReports: number; storage: { _id: string; count: number; processed: number }[]; verification: { _id: string; count: number }[] }
export interface InfrastructureData {
  at: string; environment: string;
  api: { uptimeSeconds: number; nodeVersion: string; platform: string; memory: { rss: number; heapUsed: number; heapTotal: number }; cpuSeconds: number; metrics: { count: number; errors: number; averageMs: number; maxMs: number; since: string; windowMinutes: number } };
  host: { cpus: number; loadAverage: number[]; totalMemoryBytes: number; freeMemoryBytes: number; disk: { totalBytes: number; availableBytes: number } | null };
  database: { ready: boolean; latencyMs: number; collections: number | null; storageBytes: number | null; dataBytes: number | null };
  redis: { ready: boolean; latencyMs: number | null; memoryBytes: number | null };
  workers: { name: string; ready: boolean; ageSeconds: number | null; lastHeartbeat: string | null }[];
  queues: { name: string; available: boolean; counts: Record<string, number> | null }[];
  backlog: { failed: number; oldestAt: string | null };
  integrations: { name: string; configured: boolean }[];
}
