"use client";

import { Button, Empty } from "@/components/ui/Primitives";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return <main className="connection-error">
    <Empty title="Chưa kết nối được Tellme"
      text="Kết nối đang gián đoạn. Bạn thử mở lại sau một chút nhé."
      action={<Button onClick={reset}>Thử kết nối lại</Button>} />
  </main>;
}
