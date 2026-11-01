export type PresenceState = { online: Record<string, true>; versions: Record<string, number>; allowed: Record<string, true>; revision: number };
export const emptyPresence = (): PresenceState => ({ online: {}, versions: {}, allowed: {}, revision: 0 });
export function presenceSnapshot(state: PresenceState, payload: { selfId: string; friendIds: string[]; onlineIds: string[]; revision: number }): PresenceState {
  const allowed: Record<string, true> = { me: true };
  payload.friendIds.forEach((id) => { if (id !== payload.selfId) allowed[id] = true; });
  const incoming = new Set(payload.onlineIds.map((id) => id === payload.selfId ? "me" : id));
  const online: Record<string, true> = {}, versions: Record<string, number> = {};
  for (const id of Object.keys(allowed)) {
    const newer = (state.versions[id] ?? -1) > payload.revision;
    if (newer ? state.online[id] : incoming.has(id)) online[id] = true;
    versions[id] = newer ? state.versions[id]! : payload.revision;
  }
  return { online, versions, allowed, revision: Math.max(state.revision, payload.revision) };
}
export function presenceChange(state: PresenceState, payload: { userId: string; online: boolean; revision: number }): PresenceState {
  if (!state.allowed[payload.userId] || payload.revision <= Math.max(state.revision, state.versions[payload.userId] ?? -1)) return state;
  const online = { ...state.online };
  if (payload.online) online[payload.userId] = true; else delete online[payload.userId];
  return { ...state, online, versions: { ...state.versions, [payload.userId]: payload.revision } };
}
