import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Страницы приложения требуют сессии. Проверяем только наличие cookie —
// подпись проверяют route handlers и серверные компоненты.
// Mini App сначала попадает на /, где происходит вход по initData.
export function proxy(req: NextRequest) {
  const hasSession = process.env.NEXT_PUBLIC_DEMO === "1" || Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = req.nextUrl;
  if (!hasSession && pathname.startsWith("/t/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/t/:path*"],
};
