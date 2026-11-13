import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const rawNext = (await headers()).get("x-tellme-next") || "/community/today";
  const next = rawNext.startsWith("/community/") ? rawNext : "/community/today";
  const login = `/auth/login?next=${encodeURIComponent(next)}`;
  const sessionCookies = ["tellme_session", "tellme_qa_session"]
    .map((name) => jar.get(name))
    .filter((cookie) => !!cookie?.value)
    .map((cookie) => `${cookie!.name}=${encodeURIComponent(cookie!.value)}`).join("; ");
  if (!sessionCookies) redirect(login);
  let session: Response;
  try {
    session = await fetch(`${process.env.API_INTERNAL_URL || "http://127.0.0.1:4000"}/api/session`, {
      headers: { cookie: sessionCookies }, cache: "no-store", signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error("Chưa kết nối được Tellme. Bạn thử mở lại sau nhé.");
  }
  if (session.status === 401 || session.status === 403) redirect(login);
  if (!session.ok) throw new Error("Chưa xác minh được phiên đăng nhập. Bạn thử lại nhé.");
  return <AppShell>{children}</AppShell>;
}
