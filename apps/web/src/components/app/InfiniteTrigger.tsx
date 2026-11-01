"use client";
import { useEffect, useRef } from "react";
import { Button, Loader } from "@/components/ui/Primitives";
import { useTimelineRefreshing } from "@/components/ui/PullToRefresh";

export function InfiniteTrigger({
  hasNextPage,
  fetching,
  error,
  loadMore,
  label = "Đang tải thêm câu chuyện…",
}: {
  hasNextPage: boolean;
  fetching: boolean;
  error?: boolean;
  loadMore: () => unknown;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const refreshing = useTimelineRefreshing();
  const action = useRef(loadMore);
  action.current = loadMore;
  useEffect(() => {
    const node = ref.current;
    if (!node || !hasNextPage || fetching || error || refreshing) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void action.current();
        }
      },
      { root: node.closest(".pull-refresh-viewport"), rootMargin: "650px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, fetching, error, refreshing]);
  if (!hasNextPage && !fetching) return null;
  return (
    <div className="infinite-trigger" ref={ref}>
      {fetching ? (
        <Loader small label={label} />
      ) : error ? (
        <Button variant="secondary" onClick={() => void loadMore()}>
          Thử tải lại
        </Button>
      ) : null}
    </div>
  );
}
