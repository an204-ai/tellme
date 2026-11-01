"use client";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { communityKey } from "./use-community";
import { refreshFirstTimelinePage } from "@/lib/timeline-refresh";

export function useTimelineRefresh(kind: "posts" | "stories") {
  const client = useQueryClient();
  return useCallback(() => refreshFirstTimelinePage(client, ["tellme", kind, "pages"], communityKey), [client, kind]);
}
