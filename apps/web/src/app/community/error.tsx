"use client";
import { Button, Empty } from "@/components/ui/Primitives";
export default function ErrorScreen({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <Empty
      title="Câu chuyện tạm gián đoạn"
      text="Giao diện gặp một lỗi nhỏ. Thử mở lại màn hình này nhé."
      action={<Button onClick={reset}>Thử lại</Button>}
    />
  );
}
