import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createMiddlewareClient<Database>({
    req: request,
    res: response,
  });

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login";
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/app");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  if (isProtected && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/app/:path*", "/login"],
};
