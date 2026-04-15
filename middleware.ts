import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;
  
  const pathname = request.nextUrl.pathname;
  
  // 1. Jika sudah login dan mencoba akses halaman login, arahkan ke dashboard rolenya
  if (pathname.startsWith('/login')) {
    if (token && role) {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
    return NextResponse.next();
  }
  
  // 2. Akses ke Dashboard
  if (pathname.startsWith('/dashboard')) {
    // Jika belum login, lempar ke login
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Jika sudah login tapi mencoba akses rolenya orang lain
    if (role && !pathname.startsWith(`/dashboard/${role}`)) {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
