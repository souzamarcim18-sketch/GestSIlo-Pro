/**
 * Padrões de URLs e campos sensíveis que devem ser filtrados no Sentry
 * Evita vazamento de dados pessoais, tokens e informações críticas
 */

export const SENSITIVE_PATTERNS = {
  // Campos de dados
  fields: [
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
  ],

  // Endpoints que contêm dados sensíveis
  endpoints: [
    /\/auth\//i,
    /\/login/i,
    /\/register/i,
    /\/password/i,
    /\/reset/i,
    /\/profile/i,
    /\/user/i,
  ],

  // Padrões de valores a sanitizar
  values: {
    // JWT (estrutura: header.payload.signature)
    jwt: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    // Email
    email: /[\w\.-]+@[\w\.-]+\.\w+/,
    // CPF (XXX.XXX.XXX-XX)
    cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/,
    // CNPJ (XX.XXX.XXX/XXXX-XX)
    cnpj: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/,
    // Phone (brasileiro)
    phone: /\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})/,
  },
};

/**
 * Verifica se um campo é sensível
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_PATTERNS.fields.some((pattern) => pattern.test(fieldName));
}

/**
 * Verifica se uma URL é de um endpoint sensível
 */
export function isSensitiveEndpoint(url: string): boolean {
  return SENSITIVE_PATTERNS.endpoints.some((pattern) => pattern.test(url));
}

/**
 * Detecta o tipo de valor sensível
 */
export function getSensitiveValueType(
  value: string
): 'jwt' | 'email' | 'cpf' | 'cnpj' | 'phone' | null {
  if (SENSITIVE_PATTERNS.values.jwt.test(value)) return 'jwt';
  if (SENSITIVE_PATTERNS.values.email.test(value)) return 'email';
  if (SENSITIVE_PATTERNS.values.cpf.test(value)) return 'cpf';
  if (SENSITIVE_PATTERNS.values.cnpj.test(value)) return 'cnpj';
  if (SENSITIVE_PATTERNS.values.phone.test(value)) return 'phone';
  return null;
}
