import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          supabaseResponse.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          supabaseResponse.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  // IMPORTANT: do not add logic between createServerClient and getUser()
  // as it may cause hard-to-debug session refresh issues.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log('MIDDLEWARE DEBUG:', {
    pathname: request.nextUrl.pathname,
    hasUser: !!user,
    userError: error?.message,
    cookieNames: request.cookies.getAll().map(c => c.name)
  });

  const { pathname } = request.nextUrl;

  // Protected routes: redirect to /login if not authenticated
  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/operador');

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // Auth routes: NOT redirecting from /login or /register even if authenticated
  // Reason: Middleware runs on server before client AuthProvider initializes
  // Risk: Race condition where middleware redirects /login → /dashboard, but
  // AuthProvider hasn't loaded user/profile yet on client, causing layout redirect loop
  // Solution: Leave redirect responsibility to client useEffect in login/register pages
  // They have direct access to AuthProvider context and can wait for profile loading
  const isAuthRoute =
    pathname === '/login' || pathname === '/register';

  // Just validate auth on these routes, don't redirect
  // (client handles redirect via useEffect when profile loads)
  if (isAuthRoute && user) {
    // User is authenticated, let client decide next action via useEffect
    // This prevents redirect before profile loading is complete
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/operador/:path*',
    '/login',
    '/register',
  ],
};
