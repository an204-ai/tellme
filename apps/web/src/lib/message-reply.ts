import type { Message } from './types';
export function replyPreview(message: Pick<Message, 'text' | 'stickerId' | 'postId' | 'storyReply'>): string {
  return message.text || (message.stickerId ? 'Sticker' : message.postId ? 'Bài viết được chia sẻ' : message.storyReply ? 'Khoảnh khắc' : 'Tin nhắn');
}
export function replyQuote(message: Message): NonNullable<Message['replyTo']> {
  return { messageId: message.id, userId: message.own ? 'me' : message.userId || '', text: replyPreview(message), ...(message.stickerId ? { stickerId: message.stickerId } : {}) };
}
