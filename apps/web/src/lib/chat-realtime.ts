import { create } from 'zustand';
export type TypingPeer = { conversationId: string; userId: string; peerId: string; expires: number };
export const useChatRealtime = create<{ peers: Record<string, TypingPeer>; revision: number }>(() => ({ peers: {}, revision: 0 }));
let socket: WebSocket | null = null;
export function attachChatSocket(value: WebSocket | null) {
  socket = value;
  useChatRealtime.setState((state) => ({ peers: {}, revision: state.revision + 1 }));
}
export function sendTyping(conversationId: string, active: boolean) {
  if (socket?.readyState !== 1) return;
  socket.send(JSON.stringify({ kind: 'chat.typing', conversationId, active }));
}
export function receiveTyping(frame: { conversationId: string; userId: string; peerId: string; active: boolean; expiresInMs?: number }) {
  if (frame.userId === 'me') return;
  useChatRealtime.setState((state) => {
    const peers = { ...state.peers };
    const duration = typeof frame.expiresInMs === "number" && Number.isFinite(frame.expiresInMs)
      ? Math.max(0, Math.min(6500, frame.expiresInMs))
      : 6500;
    if (frame.active) peers[frame.peerId] = { ...frame, expires: Date.now() + duration };
    else delete peers[frame.peerId];
    return { peers };
  });
}
export function pruneTyping() {
  const peers = useChatRealtime.getState().peers;
  if (Object.values(peers).some((peer) => peer.expires <= Date.now()))
    useChatRealtime.setState({ peers: Object.fromEntries(Object.entries(peers).filter(([, peer]) => peer.expires > Date.now())) });
}

export function watchConversation(conversationId?: string, visibleIds: string[] = []) {
  const conversationIds = [...new Set([...(conversationId ? [conversationId] : []), ...visibleIds])].slice(0, 16);
  if (socket?.readyState === 1) socket.send(JSON.stringify({ kind: "chat.watch", conversationId: conversationId || null, conversationIds }));
}
