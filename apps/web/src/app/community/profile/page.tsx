"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCommunity } from "@/hooks/use-community";
import { Loader } from "@/components/ui/Primitives";
export default function Page() {
  const { data } = useCommunity();
  const router = useRouter();
  const me = data?.people.find((person) => person.id === "me");
  useEffect(() => {
    if (me) router.replace(`/community/profile/${me.username}`);
  }, [me, router]);
  return <Loader label="Đang mở hồ sơ…" />;
}
