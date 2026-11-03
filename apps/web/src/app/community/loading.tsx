"use client";

import { useEffect, useState } from "react";
import { Button, Loader } from "@/components/ui/Primitives";

// The URL can update before the route stream completes, so give the fallback
// its own recovery even after the tab navigation has committed.
export default function Loading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!slow) return <Loader label="Đang mở trang…" />;
  return <div className="loading-state" role="status">
    <p>Trang đang mở lâu hơn bình thường.</p>
    <Button onClick={() => window.location.reload()}>Tải lại trang này</Button>
  </div>;
}
