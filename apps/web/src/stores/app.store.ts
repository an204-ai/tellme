"use client";
import type { PhotoMoment } from "@/components/app/MomentCard";
import { create } from "zustand";

type Overlay = "moment" | "edit-profile" | "support" | "photo-groups" | null;
interface AppState {
  overlay: Overlay;
  momentView: "photos" | "today";
  cameraRequest: number;
  activeMoment: PhotoMoment | null;
  photoDestination: string | null;
  setPhotoDestination: (id: string | null) => void;
  setActiveMoment: (moment: PhotoMoment | null) => void;
  setMomentView: (view: "photos" | "today") => void;
  open: (overlay: Overlay) => void;
  toast: string;
  notify: (message: string) => void;
  clearToast: () => void;
  feedback: { title: string; text?: string } | null;
  showFeedback: (title: string, text?: string) => void;
  clearFeedback: () => void;
  pendingUpload: { moment: PhotoMoment; status: "uploading" | "done" | "error"; retry: () => void } | null;
  setPendingUpload: (upload: AppState["pendingUpload"]) => void;
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
  cameraRequest: 0,
  activeMoment: null,
  photoDestination: null,
  setPhotoDestination: (photoDestination) => set({ photoDestination }),
  setActiveMoment: (activeMoment) => set({ activeMoment }),
  setMomentView: (momentView) => set((state) => ({ momentView, cameraRequest: state.cameraRequest + Number(momentView === "photos") })),
  open: (overlay) => set({ overlay }),
  toast: "",
  notify: (toast) => set({ toast }),
  clearToast: () => set({ toast: "" }),
  feedback: null,
  showFeedback: (title, text) => set({ feedback: { title, text } }),
  clearFeedback: () => set({ feedback: null }),
  pendingUpload: null,
  setPendingUpload: (pendingUpload) => set({ pendingUpload }),
  viewedStory: null,
  musicStoryId: null,
  editStoryMusic: (musicStoryId) => set({ musicStoryId }),
  viewedStoryIndex: 0,
  viewStory: (viewedStory, viewedStoryIndex = 0, viewedStoryMomentId, viewedStoryOrigin) =>
    set({ viewedStory, viewedStoryIndex, viewedStoryMomentId, viewedStoryOrigin }),
}));
