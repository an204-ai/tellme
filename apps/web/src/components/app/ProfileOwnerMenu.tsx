"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { HeartHandshake, LogOut, MoreHorizontal, Pencil, Settings } from "lucide-react";
import { apiRepository, request } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";

export function ProfileOwnerMenu() {
  const router = useRouter();
  const query = useQueryClient();
  const open = useAppStore((state) => state.open);
  return <details className="content-menu profile-account-menu profile-owner-menu">
    <summary aria-label="Tùy chọn hồ sơ của bạn"><MoreHorizontal size={23} /></summary>
    <div className="menu-panel">
      <button type="button" aria-label="Chỉnh sửa hồ sơ" onClick={() => open("edit-profile")}><Pencil size={18} />Chỉnh sửa hồ sơ</button>
      <Link href="/community/settings" aria-label="Cài đặt"><Settings size={18} />Cài đặt</Link>
      <button type="button" aria-label="Ủng hộ Tellme" onClick={() => open("support")}><HeartHandshake size={18} />Ủng hộ Tellme</button>
      <button type="button" aria-label="Đăng xuất" onClick={async () => {
        try {
          await request("/auth/logout", { method: "POST" });
          apiRepository.clear(); query.clear(); router.replace("/auth/login"); router.refresh();
        } catch (failure) { useAppStore.getState().notify(failure instanceof Error ? failure.message : "Chưa đăng xuất được."); }
      }}><LogOut size={18} />Đăng xuất</button>
    </div>
  </details>;
}
