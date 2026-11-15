"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "./Modal";

/** A compact, dismissible explanation; never inherits the browser's span/popover sizing. */
export function FoundingBadge({ visible }: { visible?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!visible) return null;
  return <span className="founding-mark">
    <button type="button" className="founding-badge" aria-haspopup="dialog" aria-expanded={expanded} aria-label="Tìm hiểu dấu Mở lối" onClick={() => setExpanded(true)}><Sparkles size={14} strokeWidth={2.3} /><span>Mở lối</span></button>
    {expanded && <Modal title="Những người mở lối" className="founding-info-dialog" onClose={() => setExpanded(false)}><div className="founding-info"><Sparkles size={32} /><p>Dấu kỷ niệm dành cho 100 tài khoản đầu tiên đã có mặt cùng Tellme. Cảm ơn vì đã bắt đầu cùng nhau.</p></div></Modal>}
  </span>;
}
