type WireMessage = { userId: string; replyTo?: { userId: string; [key: string]: unknown }; [key: string]: unknown };
/** Apply viewer identity to both the message and its quoted sender. */
export function realtimeMessage(message: WireMessage, viewerId: string) {
  return {
    ...message,
    userId: message.userId === viewerId ? 'me' : message.userId,
    own: message.userId === viewerId,
    ...(message.replyTo ? { replyTo: { ...message.replyTo, userId: message.replyTo.userId === viewerId ? 'me' : message.replyTo.userId } } : {}),
  };
}
