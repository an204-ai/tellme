"use client";
import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Bookmark, BookmarkMinus, Camera, EyeOff, FileText, Undo2 } from "lucide-react";
import { useCommunity, communityKey } from "@/hooks/use-community";
import { request, timeAgo } from "@/lib/api-repository";
import type { ArchiveItem, ArchivePage } from "@/lib/types";
import { useAppStore } from "@/stores/app.store";
import { Button, Empty, Loader, PrivacyIcon, privacyNames } from "@/components/ui/Primitives";
import { InfiniteTrigger } from "@/components/app/InfiniteTrigger";

export function ArchiveScreen({ initialView = "saved" }: { initialView?: "saved" | "hidden" }) {
  const { data } = useCommunity();
  const [view, setView] = useState<"saved" | "hidden">(initialView);
  const [busy, setBusy] = useState("");
  const notify = useAppStore((state) => state.notify);
  const viewStory = useAppStore((state) => state.viewStory);
  const client = useQueryClient();
  const archive = useInfiniteQuery({
    queryKey: ["tellme", "archive", view], initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => request<ArchivePage>(`/archive?view=${view}&cursor=${pageParam}&limit=12`, { signal }),
    getNextPageParam: (page) => page.nextCursor,
    enabled: !!data && data.authenticated !== false,
  });
  const change = async (item: ArchiveItem) => {
    if (busy) return;
    setBusy(`${item.kind}:${item.id}`);
    const path = `/${item.kind === "post" ? "posts" : "stories"}/${item.id}`;
    try {
      await request(view === "hidden" ? `${path}/hidden` : `${path}/saved`, view === "hidden" ? { method: "DELETE" } : { method: "PUT", body: JSON.stringify({ saved: false }) });
      await Promise.all([
        client.invalidateQueries({ queryKey: communityKey }), client.invalidateQueries({ queryKey: ["tellme", "archive"] }),
        client.invalidateQueries({ queryKey: ["tellme", "posts"] }), client.invalidateQueries({ queryKey: ["tellme", "stories"] }),
        client.invalidateQueries({ queryKey: ["tellme", "saved-stories"] }),
      ]);
      notify(view === "hidden" ? "Đã hiện lại nội dung." : "Đã bỏ lưu nội dung.");
    } catch (error) { notify(error instanceof Error ? error.message : "Chưa cập nhật được. Bạn thử lại nhé."); }
    finally { setBusy(""); }
  };
  if (!data) return <Loader />;
  const items = archive.data?.pages.flatMap((page) => page.items) || [];
  return <div className="archive-space">
    <h1 className="sr-only">Kho lưu trữ</h1>
    <div className="archive-navigation" aria-label="Loại nội dung lưu trữ">
      {(["saved", "hidden"] as const).map((value) => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)}>
        {value === "saved" ? <Bookmark size={19} /> : <EyeOff size={19} />}{value === "saved" ? "Đã lưu" : "Đã ẩn"}
      </button>)}
    </div>
    <p className="archive-context">{view === "saved" ? "Bài viết và chuỗi khoảnh khắc bạn muốn xem lại." : "Nội dung bạn đã ẩn khỏi bảng tin và Tell me now. Bạn có thể hiện lại từng mục."}</p>
    {archive.isPending ? <Loader label="Đang mở kho lưu trữ…" /> : archive.isError && !items.length ? <Empty icon={<Archive size={30} />} title="Chưa mở được kho lưu trữ" text="Bạn thử tải lại nhé." action={<Button onClick={() => void archive.refetch()}>Thử lại</Button>} /> : !items.length ? <Empty icon={view === "saved" ? <Bookmark size={30} /> : <EyeOff size={30} />} title={view === "saved" ? "Chưa có nội dung đã lưu" : "Chưa có nội dung đã ẩn"} text={view === "saved" ? "Chọn Lưu trong menu ba chấm của bài viết hoặc chuỗi khoảnh khắc để giữ lại ở đây." : "Chọn Ẩn khỏi bảng tin trong menu ba chấm của nội dung bạn không muốn thấy."} action={<Link href="/community/feed" className="text-link">Về Khám phá</Link>} /> : <>
      <div className="archive-list">
        {items.map((item) => <article key={`${item.kind}:${item.id}`} className="archive-row" aria-label={`${item.kind === "post" ? "Bài viết" : "Chuỗi khoảnh khắc"} của ${item.anonymousIdentity?.name || item.person?.name || "Một người kể chuyện"}`}>
          <div className="archive-thumbnail">{item.image ? <img src={item.image} alt="" loading="lazy" /> : <FileText size={28} />}</div>
          <div className="archive-row-body">
            <div className="archive-row-meta">{item.kind === "story" ? <Camera size={15} /> : <FileText size={15} />}<span>{item.kind === "story" ? `${item.count} khoảnh khắc` : "Bài viết"}</span><span aria-hidden="true">·</span><time dateTime={item.at}>{timeAgo(item.at)}</time><span title={privacyNames[item.privacy]} aria-label={privacyNames[item.privacy]}><PrivacyIcon value={item.privacy} size={14} /></span></div>
            <strong>{item.anonymousIdentity?.name || item.person?.name || "Một người kể chuyện"}</strong>
            <p>{item.text || "Một chút ngày đi làm."}</p>
            <div className="archive-row-actions">
              {item.kind === "post" ? <Link href={`/post/${item.id}?from=archive&view=${view}`}>Xem bài viết</Link> : <button type="button" onClick={() => viewStory(item.id)}>Xem khoảnh khắc</button>}
              <button type="button" disabled={!!busy} onClick={() => void change(item)}>
                {view === "hidden" ? <Undo2 size={15} /> : <BookmarkMinus size={15} />}{busy === `${item.kind}:${item.id}` ? "Đang cập nhật…" : view === "hidden" ? "Hiện lại" : "Bỏ lưu"}
              </button>
            </div>
          </div>
        </article>)}
      </div>
      <InfiniteTrigger hasNextPage={!!archive.hasNextPage} fetching={archive.isFetchingNextPage} error={archive.isFetchNextPageError} loadMore={() => archive.fetchNextPage()} />
    </>}
  </div>;
}
