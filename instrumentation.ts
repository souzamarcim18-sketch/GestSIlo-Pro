// Sentry instrumentation for Next.js
// This file is automatically loaded by Next.js and initializes Sentry

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization is handled automatically by @sentry/nextjs
    // when withSentryConfig is applied to the Next.js config
    await import('@sentry/nextjs');
  }
}
