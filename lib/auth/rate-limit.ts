import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('⚠️ Rate limiting desativado: UPSTASH_REDIS_REST_URL ou UPSTASH_REDIS_REST_TOKEN não configurados');
}

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Rate limit para login: 5 tentativas por minuto por IP
export const loginRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:login',
    })
  : null;

// Rate limit para registro: 5 tentativas por hora por IP
export const registerRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
      prefix: 'ratelimit:register',
    })
  : null;

// Rate limit para recuperação de senha: 3 tentativas por hora por IP
export const forgotPasswordRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:forgot-password',
    })
  : null;

export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<{ success: boolean; remaining?: number; resetIn?: number }> {
  if (!limiter) {
    return { success: true };
  }

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return {
      success,
      remaining: Math.max(0, remaining),
      resetIn: reset ? Math.ceil((reset - Date.now()) / 1000) : undefined,
    };
  } catch (error) {
    console.error('Erro ao verificar rate limit:', error);
    return { success: true };
  }
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}
