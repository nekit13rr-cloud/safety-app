import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Добавляем заголовок, отключающий кэширование
  const response = NextResponse.next();
  response.headers.set('x-middleware-cache', 'no-cache');
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};