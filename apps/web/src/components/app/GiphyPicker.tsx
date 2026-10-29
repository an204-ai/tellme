"use client";
import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { findGiphyMixed, type GiphyCursor } from "@/lib/giphy";
import type { CommentMedia } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button, Loader, SearchInput } from "@/components/ui/Primitives";

export function GiphyPicker({
  onSelect,
  onClose,
}: {
  onSelect: (media: CommentMedia) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const result = useInfiniteQuery({
    queryKey: ["giphy", "mixed", query],
    initialPageParam: { gif: 0, sticker: 0 } as GiphyCursor,
    queryFn: ({ pageParam, signal }) =>
      findGiphyMixed(query, pageParam, signal),
    getNextPageParam: (page) => page.next,
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const items = result.data?.pages.flatMap((page) => page.items) || [];
  return (
    <Modal title="GIF và sticker" className="giphy-dialog" onClose={onClose}>
      <div className="giphy-controls">
        <SearchInput
          placeholder="Tìm GIF và sticker…"
          aria-label="Tìm GIF hoặc sticker"
          value={search}
          maxLength={50}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="giphy-results">
        {result.isPending ? (
          <Loader label="Đang tìm trên Giphy…" />
        ) : result.isError ? (
          <div className="giphy-error">
            <p role="alert">{result.error.message}</p>
            <Button variant="secondary" onClick={() => void result.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <div className="giphy-grid">
              {items.map((media) => (
                <button
                  type="button"
                  key={`${media.kind}-${media.id}`}
                  aria-label={`Chọn ${media.alt}`}
                  className={media.kind === "sticker" ? "sticker-result" : ""}
                  onClick={() => {
                    const { preview, ...selection } = media;
                    onSelect(selection);
                    onClose();
                  }}
                >
                  <img src={media.preview} alt={media.alt} loading="lazy" />
                </button>
              ))}
            </div>
            {items.length === 0 && (
              <p className="giphy-empty">
                Không có kết quả. Thử một từ khóa khác nhé.
              </p>
            )}
            {result.hasNextPage && (
              <Button
                variant="secondary"
                disabled={result.isFetchingNextPage}
                onClick={() => void result.fetchNextPage()}
              >
                {result.isFetchingNextPage ? "Đang tải…" : "Xem thêm"}
              </Button>
            )}
          </>
        )}
      </div>
      <a
        className="giphy-attribution"
        href="https://giphy.com"
        target="_blank"
        rel="noreferrer"
      >
        Powered by <strong>GIPHY</strong>
      </a>
    </Modal>
  );
}
