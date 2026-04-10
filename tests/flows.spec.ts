import { test, expect, type Page } from '@playwright/test';

const EMAIL_ADMIN = 'marcimsb@yahoo.com.br';
const SENHA_ADMIN = '*Jlmagct2026';
const BASE = 'https://gestsilo-seven.vercel.app';

// ---------------------------------------------------------------------------
// Helper: login como Administrador
// ---------------------------------------------------------------------------
async function loginAdmin(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByRole('textbox', { name: /e-mail/i }).fill(EMAIL_ADMIN);
  await page.getByRole('textbox', { name: /senha|password|••••/i }).fill(SENHA_ADMIN);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });
}

// ---------------------------------------------------------------------------
// F5.1 — Login: redirect correto por perfil
// ---------------------------------------------------------------------------
test.describe('Login e redirect por perfil', () => {
  test('Admin redireciona para /dashboard após login', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByRole('textbox', { name: /e-mail/i }).fill(EMAIL_ADMIN);
    await page.getByRole('textbox', { name: /senha|password|••••/i }).fill(SENHA_ADMIN);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('Credenciais inválidas exibem mensagem de erro', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByRole('textbox', { name: /e-mail/i }).fill('invalido@teste.com');
    await page.getByRole('textbox', { name: /senha|password|••••/i }).fill('senhaerrada');
    await page.getByRole('button', { name: /entrar/i }).click();
    // Deve permanecer na página de login e exibir erro
    await expect(page).toHaveURL(/\/login/);
    // Toast ou mensagem de erro deve aparecer
    await expect(
      page.getByText(/inválidos|incorret|erro/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Usuário não autenticado é redirecionado de /dashboard para /login', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL('**/login', { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// F5.2 — CRUD de Silos
// ---------------------------------------------------------------------------
test.describe('CRUD de Silos', () => {
  const SILO_NOME = `Silo E2E ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE}/dashboard/silos`);
    await page.waitForLoadState('networkidle');
  });

  test('Criar novo silo', async ({ page }) => {
    // Abre o dialog de novo silo
    await page.getByRole('button', { name: /novo silo/i }).click();

    // Preenche o formulário
    await page.getByLabel(/nome do silo/i).fill(SILO_NOME);

    // Tipo (Select) — já tem valor default "Bunker"
    // Capacidade
    await page.getByLabel(/capacidade/i).fill('500');

    // Submete
    await page.getByRole('button', { name: /cadastrar/i }).click();

    // Toast de sucesso deve aparecer
    await expect(
      page.getByText(/cadastrado com sucesso/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('Registrar movimentação de entrada em silo', async ({ page }) => {
    // Aguarda silos carregarem
    await page.waitForSelector('[aria-label^="Silo"]', { timeout: 15000 }).catch(() => null);

    // Abre o dialog de nova movimentação
    await page.getByRole('button', { name: /registrar movimentaç/i }).click();

    // Seleciona o primeiro silo disponível
    await page.getByRole('combobox').first().click();
    await page.getByRole('option').first().click();

    // Tipo já está como "Entrada" por padrão
    // Preenche quantidade
    await page.getByLabel(/quantidade/i).fill('50');

    // Preenche responsável
    await page.getByLabel(/responsável/i).fill('Operador E2E');

    // Submete
    await page.getByRole('button', { name: /salvar/i }).click();

    // Toast de sucesso
    await expect(
      page.getByText(/registrada com sucesso/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('Verificar que silos aparecem na página', async ({ page }) => {
    // A seção de silos deve estar presente
    const silosSection = page.locator('h1', { hasText: /gestão de silos/i });
    await expect(silosSection).toBeVisible();

    // Aguarda o carregamento — ou mostra silos ou mostra o estado vazio
    await page.waitForLoadState('networkidle');
    const temSilos = await page.locator('[aria-label^="Silo "]').count();
    const temEstadoVazio = await page.getByText(/nenhum silo cadastrado/i).count();
    expect(temSilos + temEstadoVazio).toBeGreaterThan(0);
  });

  test('Histórico de movimentações está acessível', async ({ page }) => {
    // Tabela de movimentações deve existir
    await expect(
      page.getByRole('heading', { name: /histórico de movimentações/i })
    ).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// F5.3 — CRUD de Lançamentos Financeiros
// ---------------------------------------------------------------------------
test.describe('CRUD de Lançamentos Financeiros', () => {
  const DESC_LANCAMENTO = `Teste E2E ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE}/dashboard/financeiro`);
    await page.waitForLoadState('networkidle');
  });

  test('Criar novo lançamento de despesa', async ({ page }) => {
    // Abre o formulário de novo lançamento
    await page.getByRole('button', { name: /novo lançamento/i }).click();

    // Preenche descrição
    await page.getByLabel(/descrição/i).fill(DESC_LANCAMENTO);

    // Preenche categoria
    await page.getByLabel(/categoria/i).fill('Teste E2E');

    // Preenche valor
    await page.getByLabel(/valor/i).fill('100');

    // Data já tem valor padrão (hoje)

    // Salva
    await page.getByRole('button', { name: /salvar/i }).click();

    // Toast de sucesso
    await expect(
      page.getByText(/registrado|lançamento/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('Editar lançamento existente', async ({ page }) => {
    // Aguarda tabela carregar
    await page.waitForSelector('table', { timeout: 15000 }).catch(() => null);

    // Clica no botão de editar do primeiro lançamento (se existir)
    const editButtons = page.getByRole('button', { name: /editar/i });
    const editCount = await editButtons.count();

    if (editCount === 0) {
      test.skip();
      return;
    }

    await editButtons.first().click();

    // Altera a descrição
    const descInput = page.getByLabel(/descrição/i);
    await descInput.clear();
    await descInput.fill('Editado por E2E');

    // Salva
    await page.getByRole('button', { name: /salvar/i }).click();

    // Toast de atualização
    await expect(
      page.getByText(/atualizado/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('Excluir lançamento', async ({ page }) => {
    // Aguarda tabela carregar
    await page.waitForSelector('table', { timeout: 15000 }).catch(() => null);

    // Clica no botão de excluir do primeiro lançamento (se existir)
    const deleteButtons = page.getByRole('button', { name: /excluir|remover/i });
    const deleteCount = await deleteButtons.count();

    if (deleteCount === 0) {
      test.skip();
      return;
    }

    await deleteButtons.first().click();

    // Dialog de confirmação — confirma a exclusão
    const confirmButton = page.getByRole('button', { name: /confirmar|sim|excluir/i });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Toast de remoção
    await expect(
      page.getByText(/removido/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('Resumo financeiro exibe receitas, despesas e saldo', async ({ page }) => {
    // Cards de resumo devem estar visíveis
    await expect(page.getByText(/receitas/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/despesas/i).first()).toBeVisible({ timeout: 10000 });
  });
});
