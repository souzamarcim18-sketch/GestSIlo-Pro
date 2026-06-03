import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/admin-auth';

export function POST() {
  const response = NextResponse.redirect(
    new URL('/gestsilo-admin/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  );
  clearAdminCookie(response);
  return response;
}
