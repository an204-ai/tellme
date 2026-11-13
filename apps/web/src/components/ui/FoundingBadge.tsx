"use client";

import { useId } from "react";
import { Sparkles } from "lucide-react";

/** A permanent thank-you for the first 100 accounts, never a user-editable profile field. */
export function FoundingBadge({ visible }: { visible?: boolean }) {
  const id = useId();
  if (!visible) return null;
  return <span className="founding-mark">
    <button type="button" className="founding-badge" popoverTarget={id} aria-label="Người mở lối — một trong 100 tài khoản đầu tiên" title="Người mở lối · 100 tài khoản đầu tiên"><Sparkles size={14} strokeWidth={2.3} /><span>Mở lối</span></button>
    <span id={id} popover="auto" className="founding-note"><Sparkles size={25} /><strong>Những người mở lối</strong><span>Dấu kỷ niệm dành cho 100 tài khoản đầu tiên đã có mặt cùng Tellme. Cảm ơn vì đã bắt đầu cùng nhau.</span></span>
  </span>;
}
