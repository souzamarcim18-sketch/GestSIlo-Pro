/**
 * Logging condicional para fluxo de autenticação
 * Evita poluição de console em produção
 * Habilita debug com DEBUG_AUTH=true ou NODE_ENV=development
 */

import { DEBUG_AUTH } from "./constants";

/**
 * Log de informações sobre autenticação
 * Apenas executa em desenvolvimento ou com DEBUG_AUTH=true
 */
export function authLog(...args: any[]): void {
  if (!DEBUG_AUTH) {
    return;
  }

  const timestamp = new Date().toISOString();
  console.log(`[AUTH ${timestamp}]`, ...args);
}

/**
 * Log de erros de autenticação
 * Sempre executa (importante para debug em produção)
 * Em produção, poderia ser integrado com Sentry/LogRocket
 */
export function authError(...args: any[]): void {
  const timestamp = new Date().toISOString();

  // Parse objects to string for better console display
  const parsedArgs = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === 'object' && arg !== null) {
      return JSON.stringify(arg, null, 2);
    }
    return arg;
  });

  console.error(`[AUTH ERROR ${timestamp}]`, ...parsedArgs);

  // Integração futura com serviço de logging externo
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureMessage(args.join(' '), 'error');
  // }
}

/**
 * Log de avisos de autenticação
 * Útil para race conditions, timeouts, comportamentos inesperados
 */
export function authWarn(...args: any[]): void {
  if (!DEBUG_AUTH) {
    return;
  }

  const timestamp = new Date().toISOString();
  console.warn(`[AUTH WARN ${timestamp}]`, ...args);
}
