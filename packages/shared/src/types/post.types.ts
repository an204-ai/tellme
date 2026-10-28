import { PrivacyLevel } from "../constants/privacy";

export interface PostItem {
  id: string;
  authorId: string;
  content: string;
  privacyLevel: PrivacyLevel;
  isAnonymous: boolean;
  reactionCount: number;
  commentCount: number;
  media?: Array<{
    id: string;
    url: string;
    thumbnailUrl?: string;
    blurhash?: string;
  }>;
  createdAt: string;
}
