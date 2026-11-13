"use client";
import { create } from "zustand";

type Overlay = "moment" | "edit-profile" | "support" | null;
interface AppState {
  overlay: Overlay;
  momentView: "photos" | "today";
  setMomentView: (view: "photos" | "today") => void;
  open: (overlay: Overlay) => void;
  toast: string;
  notify: (message: string) => void;
  clearToast: () => void;
  viewedStory: string | null;
  musicStoryId: string | null;
  editStoryMusic: (id: string | null) => void;
  viewedStoryOrigin?: "today";
  viewedStoryIndex: number;
  viewedStoryMomentId?: string;
  viewStory: (id: string | null, index?: number, momentId?: string, origin?: "today") => void;
}
export const useAppStore = create<AppState>((set) => ({
  overlay: null,
  momentView: "photos",
  setMomentView: (momentView) => set({ momentView }),
  open: (overlay) => set({ overlay }),
  toast: "",
  notify: (toast) => set({ toast }),
  clearToast: () => set({ toast: "" }),
  viewedStory: null,
  musicStoryId: null,
  editStoryMusic: (musicStoryId) => set({ musicStoryId }),
  viewedStoryIndex: 0,
  viewStory: (viewedStory, viewedStoryIndex = 0, viewedStoryMomentId, viewedStoryOrigin) =>
    set({ viewedStory, viewedStoryIndex, viewedStoryMomentId, viewedStoryOrigin }),
}));
