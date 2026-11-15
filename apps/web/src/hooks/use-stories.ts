"use client";
import { useMemo } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRepository } from "@/lib/api-repository";
import { communityKey } from "./use-community";

export function useProfilePerson(username: string, enabled: boolean) {
  const client = useQueryClient();
  return useQuery({
    queryKey: ["tellme", "person", username],
    enabled,
    staleTime: 60000,
    retry: false,
    queryFn: async () => {
      const person = await apiRepository.getPerson(username);
      client.setQueryData(communityKey, apiRepository.snapshot());
      return person;
    },
  });
}

export function useStoryPages(enabled: boolean, author?: string) {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["tellme", "stories", "pages", author || "all"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = await apiRepository.getStoriesPage(pageParam, 6, author);
      client.setQueryData(communityKey, apiRepository.snapshot());
      return page;
    },
    getNextPageParam: (page) => page.nextCursor,
    enabled,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
  const stories = useMemo(() => [...new Map((query.data?.pages.flatMap((page) => page.items) || []).map((story) => [story.id, story])).values()], [query.data]);
  return { ...query, stories };
}
