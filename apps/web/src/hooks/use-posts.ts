"use client";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRepository } from "@/lib/api-repository";
import { communityKey } from "./use-community";
import type { PostFilters } from "@/lib/types";

export function usePostPages(filters: PostFilters, enabled: boolean) {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["tellme", "posts", "pages", filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = await apiRepository.getPostsPage(filters, pageParam, 6);
      client.setQueryData(communityKey, apiRepository.snapshot());
      return page;
    },
    getNextPageParam: (page) => page.nextCursor,
    enabled,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  return {
    ...query,
    posts: query.data?.pages.flatMap((page) => page.items) || [],
    total: query.data?.pages[0]?.total || 0,
  };
}
export function usePost(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["tellme", "posts", "detail", id],
    queryFn: () => apiRepository.getPost(id),
    enabled,
  });
}

export function useProfileActivity(authorId: string | undefined) {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["tellme", "posts", "profile-activity", authorId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = await apiRepository.getProfilePage(authorId!, pageParam, 6);
      client.setQueryData(communityKey, apiRepository.snapshot());
      return page;
    },
    getNextPageParam: (page) => page.nextCursor,
    enabled: !!authorId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  return {
    ...query,
    items: query.data?.pages.flatMap((page) => page.items) || [],
  };
}

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
