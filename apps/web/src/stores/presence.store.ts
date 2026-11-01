"use client";
import { create } from "zustand";
import { emptyPresence, presenceChange, presenceSnapshot, type PresenceState } from "@/lib/presence-state";
type Snapshot = Parameters<typeof presenceSnapshot>[1];
type Change = Parameters<typeof presenceChange>[1];
export const usePresenceStore = create<PresenceState & {
  healthy: boolean;
  health: (healthy: boolean) => void;
  clear: () => void;
  snapshot: (payload: Snapshot) => void;
  change: (payload: Change) => void;
  prune: (ids: string[]) => void;
}>((set) => ({
  ...emptyPresence(), healthy: false,
  health: (healthy) => set({ healthy }),
  clear: () => set({ ...emptyPresence(), healthy: false }),
  snapshot: (payload) => set((state) => presenceSnapshot(state, payload)),
  change: (payload) => set((state) => presenceChange(state, payload)),
  prune: (ids) => set((state) => {
    const allowed = new Set(["me", ...ids]);
    return { online: Object.fromEntries(Object.entries(state.online).filter(([id]) => allowed.has(id))), allowed: Object.fromEntries(Object.entries(state.allowed).filter(([id]) => allowed.has(id))) };
  }),
}));
