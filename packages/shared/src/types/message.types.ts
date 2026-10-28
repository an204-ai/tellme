export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "post_share" | "story_share";
  createdAt: string;
}
