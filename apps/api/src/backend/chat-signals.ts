type Lease = { chatId: string; userId: string; audience: string[]; at: number; authorized: number };
type Options = {
  authorize: (conversationId: string, userId: string) => Promise<string[] | null>;
  publish: (audience: string[], detail: Record<string, unknown>) => Promise<void>;
  now?: () => number;
};
/** Ephemeral per-socket leases: zero database writes and no persisted typing records. */
export function createChatSignals(options: Options) {
  const leases = new Map<string, Lease>();
  const now = options.now || Date.now;
  const stop = async (peerId: string) => {
    const previous = leases.get(peerId);
    if (!previous) return;
    leases.delete(peerId);
    await options.publish(previous.audience, { conversationId: previous.chatId, userId: previous.userId, peerId, active: false });
  };
  return {
    stop,
    activeFor(userId: string, chats: ReadonlySet<string>) {
      const frames = [];
      for (const [peerId, lease] of leases) {
        const expiresInMs = 6500 - (now() - lease.at);
        if (expiresInMs > 0 && lease.userId !== userId && chats.has(lease.chatId) && lease.audience.includes(userId)) {
          frames.push({ conversationId: lease.chatId, userId: lease.userId, peerId, active: true, expiresInMs });
        }
      }
      return frames;
    },
    async control(userId: string, peerId: string, frame: Record<string, unknown>) {
      if (frame.kind !== 'chat.typing' || typeof frame.conversationId !== 'string' || frame.conversationId.length > 100 || typeof frame.active !== 'boolean') return;
      const previous = leases.get(peerId);
      if (!frame.active) { await stop(peerId); return; }
      if (previous?.chatId === frame.conversationId && now() - previous.at < 3000) return;
      if (previous && previous.chatId !== frame.conversationId) await stop(peerId);
      let audience = previous?.chatId === frame.conversationId && now() - previous.authorized < 30000 ? previous.audience : undefined;
      let authorized = previous?.authorized || 0;
      if (!audience) {
        audience = await options.authorize(frame.conversationId, userId) || undefined;
        if (!audience) { await stop(peerId); return; }
        authorized = now();
      }
      leases.set(peerId, { chatId: frame.conversationId, userId, audience, at: now(), authorized });
      await options.publish(audience, { conversationId: frame.conversationId, userId, peerId, active: true });
    },
  };
}
