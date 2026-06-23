import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name, value }) =>
    name.startsWith("sb-") && name.includes("auth-token") && Boolean(value),
  );
}

function withSecurityHeaders(response: NextResponse) {
  const scriptSrc = process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com"
    : "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com";
    const upgrade =
      process.env.NODE_ENV === "production"
        ? "; upgrade-insecure-requests"
        : "";
  

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; base-uri 'self'; object-src 'none'; 
    frame-ancestors 'none'; form-action 'self'; ${scriptSrc}; 
    style-src 'self' 'unsafe-inline'; img-src 'self' data: 
    blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; 
    frame-src https://api.razorpay.com https://checkout.razorpay.com; 
   media-src 'self' blob: https:; worker-src 'self' blob:${upgrade}`
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = hasSupabaseSessionCookie(request);
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/usage-history");

  if (isProtected && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (hasSession && (pathname === "/login" || pathname === "/signup")) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.url)),
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
