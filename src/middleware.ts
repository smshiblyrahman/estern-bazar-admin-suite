import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const ADMIN_PATH = /^\/admin(\/|$)/;
const SUPER_ADMIN_PATH = /^\/super-admin(\/|$)/;
const CALL_AGENT_PATH = /^\/call-agent(\/|$)/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const needsAuth = ADMIN_PATH.test(pathname) || SUPER_ADMIN_PATH.test(pathname) || CALL_AGENT_PATH.test(pathname);
  if (!needsAuth) return NextResponse.next();

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  const role = (token as any).role as string;
  if (SUPER_ADMIN_PATH.test(pathname) && role !== 'SUPER_ADMIN') {
    const url = req.nextUrl.clone();
    url.pathname = '/403';
    return NextResponse.rewrite(url);
  }

  if (ADMIN_PATH.test(pathname) && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/403';
    return NextResponse.rewrite(url);
  }

  if (CALL_AGENT_PATH.test(pathname) && !['CALL_AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/403';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/call-agent/:path*'],
};


