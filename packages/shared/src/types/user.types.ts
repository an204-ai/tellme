export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  status: "active" | "suspended" | "deleted";
  createdAt: string;
}
