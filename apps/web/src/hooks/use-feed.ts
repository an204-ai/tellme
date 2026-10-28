import { useInfiniteQuery } from "@tanstack/react-query";

export const useFeed = () => {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: async () => ({ items: [] }),
    initialPageParam: "" as string,
    getNextPageParam: () => undefined
  });
};
