import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const next = request.nextUrl.pathname === "/"
    ? "/community/today"
    : request.nextUrl.pathname + request.nextUrl.search;
  if (!request.cookies.get("tellme_session")?.value && !request.cookies.get("tellme_qa_session")?.value) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }
  // The server layout verifies this cookie with the API before rendering any app content.
  const headers = new Headers(request.headers);
  headers.set("x-tellme-next", next);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/", "/community/:path*"] };
