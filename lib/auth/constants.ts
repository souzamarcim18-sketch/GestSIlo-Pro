/**
 * Constantes de configuração para o fluxo de autenticação
 * Centraliza timeouts, retry intervals, debug flags e mensagens de erro
 */

// Timeouts (em milissegundos)
export const AUTH_PROFILE_FETCH_TIMEOUT_MS = 35000; // 35 segundos para buscar profile (primeira requisição pode ter cold start)
export const AUTH_REDIRECT_DELAY_MS = 500; // Aguardar antes de redirecionar (ms)

// Retry configuration
export const AUTH_RETRY_ATTEMPTS = 2; // Quantas vezes tentar novamente em caso de falha
export const AUTH_RETRY_DELAY_MS = 1000; // Delay entre tentativas (ms)

// Debug flags
export const DEBUG_AUTH =
  process.env.DEBUG_AUTH === "true" ||
  process.env.NODE_ENV === "development";

// Table names
export const PROFILES_TABLE_NAME = "profiles";

/**
 * Mensagens de erro padrão
 * Usado em componentes para exibir ao usuário
 */
export const AUTH_ERROR_MESSAGES = {
  PROFILE_FETCH_ERROR:
    "Erro ao carregar seu perfil. Tente novamente ou contacte suporte.",
  GENERIC_ERROR: "Erro de autenticação. Tente novamente.",
  NETWORK_ERROR: "Erro de conexão. Verifique sua internet.",
  PROFILE_NOT_FOUND: "Perfil não encontrado. Contate o administrador.",
  PERMISSION_DENIED: "Sem permissão para acessar este recurso.",
  TIMEOUT_ERROR:
    "Tempo limite excedido ao carregar perfil. Tente novamente.",
};

/**
 * RLS Policy Documentation
 * ========================
 * A tabela `profiles` deve ter Row Level Security (RLS) habilitado:
 *
 * ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
 *
 * Política SELECT sugerida (cada usuário lê seu próprio perfil):
 * CREATE POLICY "Users can read their own profile"
 *   ON profiles FOR SELECT
 *   USING (auth.uid() = id);
 *
 * Política INSERT (novo usuário insere seu próprio perfil):
 * CREATE POLICY "Users can insert their own profile"
 *   ON profiles FOR INSERT
 *   WITH CHECK (auth.uid() = id);
 *
 * Política UPDATE (usuário atualiza seu próprio perfil):
 * CREATE POLICY "Users can update their own profile"
 *   ON profiles FOR UPDATE
 *   USING (auth.uid() = id)
 *   WITH CHECK (auth.uid() = id);
 */
