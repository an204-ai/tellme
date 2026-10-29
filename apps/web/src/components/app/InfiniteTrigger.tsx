"use client";
import { useEffect, useRef } from "react";
import { Button, Loader } from "@/components/ui/Primitives";

export function InfiniteTrigger({
  hasNextPage,
  fetching,
  error,
  loadMore,
}: {
  hasNextPage: boolean;
  fetching: boolean;
  error?: boolean;
  loadMore: () => unknown;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const action = useRef(loadMore);
  action.current = loadMore;
  useEffect(() => {
    const node = ref.current;
    if (!node || !hasNextPage || fetching || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void action.current();
        }
      },
      { rootMargin: "650px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, fetching, error]);
  if (!hasNextPage && !fetching) return null;
  return (
    <div className="infinite-trigger" ref={ref}>
      {fetching ? (
        <Loader small label="Đang tải thêm câu chuyện…" />
      ) : error ? (
        <Button variant="secondary" onClick={() => void loadMore()}>
          Thử tải lại
        </Button>
      ) : null}
    </div>
  );
}
