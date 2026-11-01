import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import { refreshTogether } from "./refresh-feedback.ts";

/** Refresh the active first page, never replay all previously loaded infinite pages. */
export async function refreshFirstTimelinePage(client: QueryClient, key: QueryKey, metadataKey: QueryKey) {
  await Promise.all([client.cancelQueries({ queryKey: key }), client.cancelQueries({ queryKey: metadataKey })]);
  client.setQueriesData<InfiniteData<unknown>>({ queryKey: key, type: "active" }, (old) => old ? { ...old, pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) } : old);
  await refreshTogether([
    () => client.refetchQueries({ queryKey: key, type: "active" }, { throwOnError: true }),
    () => client.refetchQueries({ queryKey: metadataKey, type: "active" }, { throwOnError: true }),
  ]);
  const paused = [...client.getQueryCache().findAll({ queryKey: key, type: "active" }), ...client.getQueryCache().findAll({ queryKey: metadataKey, type: "active" })]
    .some((query) => query.state.fetchStatus === "paused");
  if (paused) throw new Error("Refresh is waiting for a network connection.");
}
