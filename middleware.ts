import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verificarToken } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Painel admin GestSilo (/gestsilo-admin) ──────────────────────────────
  // Sistema completamente separado do Supabase Auth dos produtores.
  // Autenticação própria via JWT em cookie httpOnly.
  if (
    pathname.startsWith('/gestsilo-admin') &&
    pathname !== '/gestsilo-admin/login'
  ) {
    const token = request.cookies.get('gestsilo_admin_token')?.value;
    const payload = token ? verificarToken(token) : null;
    if (!payload) {
      return NextResponse.redirect(new URL('/gestsilo-admin/login', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/gestsilo-admin')) {
    // /gestsilo-admin/login — sem cookie necessário, renderiza direto
    return NextResponse.next();
  }
  // ── Fim do bloco admin GestSilo ──────────────────────────────────────────
  // Gera nonce único por request para CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const csp = [
    `default-src 'self'`,
    // strict-dynamic permite scripts carregados por scripts com nonce (ex: Sentry, Supabase)
    // unsafe-eval apenas em dev (Next.js HMR)
    `script-src 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // script-src-elem cobre <script src="..."> — hosts explícitos para terceiros
    `script-src-elem 'self' 'nonce-${nonce}' https://*.supabase.co https://*.vercel.live https://*.vercel-scripts.com`,
    // unsafe-inline em style-src é necessário: Next.js/Tailwind injeta <style> via runtime
    // client-side sem acesso ao nonce SSR. O risco de XSS via CSS é substancialmente menor
    // que via JS — a proteção crítica está em script-src (nonce + strict-dynamic).
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io https://*.ingest.sentry.io`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');

  let supabaseResponse = NextResponse.next({ request });
  // Injeta CSP e expõe nonce para o layout via header interno
  supabaseResponse.headers.set('Content-Security-Policy', csp);
  supabaseResponse.headers.set('x-nonce', nonce);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          supabaseResponse.cookies.set(name, value, options);
        },
        remove(name: string, options: Record<string, unknown>) {
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

  // Protected routes: redirect to /login if not authenticated
  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/operador');

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.set('Content-Security-Policy', csp);
    return redirectResponse;
  }

  const perfil = user?.user_metadata?.perfil as string | undefined;
  const isOperadorTentandoDashboard =
    perfil === 'Operador' && request.nextUrl.pathname.startsWith('/dashboard');
  if (isOperadorTentandoDashboard) {
    const redirectResponse = NextResponse.redirect(new URL('/operador', request.url));
    redirectResponse.headers.set('Content-Security-Policy', csp);
    return redirectResponse;
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
    '/gestsilo-admin/:path*',
    '/dashboard/:path*',
    '/operador/:path*',
    '/login',
    '/register',
    '/auth/:path*',
    '/auth/callback',
  ],
};
