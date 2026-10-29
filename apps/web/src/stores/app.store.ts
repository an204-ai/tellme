"use client";
import { create } from "zustand";

type Overlay = "composer" | "moment" | "edit-profile" | null;
interface AppState {
  overlay: Overlay;
  open: (overlay: Overlay) => void;
  toast: string;
  notify: (message: string) => void;
  clearToast: () => void;
  search: string;
  setSearch: (search: string) => void;
  viewedStory: string | null;
  viewedStoryIndex: number;
  viewedStoryMomentId?: string;
  viewStory: (id: string | null, index?: number, momentId?: string) => void;
}
export const useAppStore = create<AppState>((set) => ({
  overlay: null,
  open: (overlay) => set({ overlay }),
  toast: "",
  notify: (toast) => set({ toast }),
  clearToast: () => set({ toast: "" }),
  search: "",
  setSearch: (search) => set({ search }),
  viewedStory: null,
  viewedStoryIndex: 0,
  viewStory: (viewedStory, viewedStoryIndex = 0, viewedStoryMomentId) =>
    set({ viewedStory, viewedStoryIndex, viewedStoryMomentId }),
}));
