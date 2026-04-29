// Sensitive data filtering utilities for Sentry
// Exported functions are used via next.config.ts

export function filterSensitiveData(obj: Record<string, any>): void {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /api[_-]?key/i,
    /authorization/i,
    /bearer/i,
    /cpf/i,
    /cnpj/i,
    /email/i,
    /phone/i,
    /telefone/i,
    /celular/i,
    /latitude/i,
    /longitude/i,
    /coordinates/i,
    /endereco/i,
    /address/i,
    /proprietario/i,
    /owner/i,
    /fazenda/i,
    /cookie/i,
    /set-cookie/i,
    /x-auth/i,
    /session/i,
    /jwt/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i,
    /api[_-]?secret/i,
  ];

  const sensitiveEndpoints = [
    /\/auth\//i,
    /\/login/i,
    /\/register/i,
    /\/password/i,
    /\/reset/i,
  ];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (sensitivePatterns.some((pattern) => pattern.test(key))) {
        obj[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        obj[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        filterSensitiveData(value);
      }
    }
  }

  if (obj.url) {
    if (sensitiveEndpoints.some((pattern) => pattern.test(obj.url))) {
      obj.url = obj.url.replace(/[?&]([^=&]+)=[^&]*/g, '[$1]=***');
    }
  }
}

export function sanitizeString(str: string): string {
  if (str.includes('.') && str.split('.').length >= 2 && str.length > 100) {
    return '[JWT_REDACTED]';
  }

  if (str.match(/[\w\.-]+@[\w\.-]+\.\w+/)) {
    return '[EMAIL_REDACTED]';
  }

  if (str.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/) || str.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)) {
    return '[DOCUMENT_REDACTED]';
  }

  return str;
}
