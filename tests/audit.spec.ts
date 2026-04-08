import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';

const EMAIL = 'marcimsb@yahoo.com.br';
const SENHA  = '*Jlmagct2026';
const BASE   = 'https://gestsilo-seven.vercel.app';

const rotasPublicas = ['/', '/login', '/register'];

const rotasProtegidas = [
  '/operador',
  '/dashboard',
  '/dashboard/calculadoras',
  '/dashboard/configuracoes',
  '/dashboard/financeiro',
  '/dashboard/frota',
  '/dashboard/insumos',
  '/dashboard/rebanho',
  '/dashboard/relatorios',
  '/dashboard/silos',
  '/dashboard/simulador',
  '/dashboard/talhoes',
];

interface ViolacaoResumo {
  id: string;
  impact: string;
  description: string;
  nodes: number;
}

interface RelatorioRota {
  rota: string;
  tipo: 'publica' | 'protegida';
  totalViolacoes: number;
  violacoes: ViolacaoResumo[];
}

const relatorio: RelatorioRota[] = [];

async function fazerLogin(page: any) {
  await page.goto(`${BASE}/login`);
  await page.getByRole('textbox', { name: 'seu@email.com' }).fill(EMAIL);
  await page.getByRole('link', { name: 'Esqueceu a senha?' }).press('Tab');
  await page.getByRole('textbox', { name: '••••••••' }).fill(SENHA);
  await page.getByRole('button', { name: 'Entrar na plataforma' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

async function auditarPagina(page: any, rota: string, tipo: 'publica' | 'protegida') {
  await page.goto(`${BASE}${rota}`);
  await page.waitForLoadState('networkidle');

  const resultado = await new AxeBuilder({ page }).analyze();

  const violacoes: ViolacaoResumo[] = resultado.violations.map(v => ({
    id: v.id,
    impact: v.impact ?? 'unknown',
    description: v.description,
    nodes: v.nodes.length,
  }));

  relatorio.push({ rota, tipo, totalViolacoes: violacoes.length, violacoes });
}

function getImpactIcon(impact: string): string {
  if (impact === 'critical') return '[CRITICAL]';
  if (impact === 'serious')  return '[SERIOUS] ';
  if (impact === 'moderate') return '[MODERATE]';
  return '[MINOR]   ';
}

function salvarRelatorio() {
  fs.writeFileSync('audit-relatorio.json', JSON.stringify(relatorio, null, 2), 'utf-8');

  const linhas: string[] = [];
  const sep = '='.repeat(60);
  const div = '-'.repeat(60);

  linhas.push(sep);
  linhas.push('  RELATORIO DE ACESSIBILIDADE - GestSiloPRO');
  linhas.push('  Gerado em: ' + new Date().toLocaleString('pt-BR'));
  linhas.push(sep);

  const totalRotas     = relatorio.length;
  const rotasComErro   = relatorio.filter(r => r.totalViolacoes > 0).length;
  const totalViolacoes = relatorio.reduce((a, r) => a + r.totalViolacoes, 0);

  linhas.push('');
  linhas.push('RESUMO GERAL');
  linhas.push('  Rotas auditadas : ' + totalRotas);
  linhas.push('  Rotas com erro  : ' + rotasComErro);
  linhas.push('  Total violacoes : ' + totalViolacoes);
  linhas.push('');

  // Ranking
  const contagem: Record<string, { impact: string; count: number; rotas: string[] }> = {};
  for (const r of relatorio) {
    for (const v of r.violacoes) {
      if (!contagem[v.id]) {
        contagem[v.id] = { impact: v.impact, count: 0, rotas: [] };
      }
      contagem[v.id].count++;
      contagem[v.id].rotas.push(r.rota);
    }
  }

  const ranking = Object.entries(contagem).sort((a, b) => b[1].count - a[1].count);

  linhas.push('RANKING - VIOLACOES MAIS FREQUENTES');
  linhas.push(div);
  for (const [id, info] of ranking) {
    linhas.push(getImpactIcon(info.impact) + ' ' + id);
    linhas.push('  Aparece em ' + info.count + ' pagina(s): ' + info.rotas.join(', '));
  }

  // Detalhes por rota
  linhas.push('');
  linhas.push('DETALHES POR ROTA');
  linhas.push(div);
  for (const r of relatorio) {
    const status = r.totalViolacoes === 0 ? '[OK]  ' : '[FAIL]';
    linhas.push('');
    linhas.push(status + ' ' + r.rota + ' (' + r.tipo + ') - ' + r.totalViolacoes + ' violacao(oes)');
    for (const v of r.violacoes) {
      linhas.push('  ' + getImpactIcon(v.impact) + ' ' + v.id + ' - ' + v.description + ' [' + v.nodes + ' elemento(s)]');
    }
  }

  linhas.push('');
  linhas.push(sep);

  const conteudo = linhas.join('\n');
  fs.writeFileSync('audit-relatorio.txt', conteudo, 'utf-8');
  console.log(conteudo);
}

// ── Testes publicos ──────────────────────────────────────────
test.describe('Paginas Publicas', () => {
  for (const rota of rotasPublicas) {
    test('Auditoria: ' + rota, async ({ page }) => {
      await auditarPagina(page, rota, 'publica');
    });
  }
});

// ── Testes protegidos ────────────────────────────────────────
test.describe('Paginas Protegidas (com login)', () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page);
  });

  for (const rota of rotasProtegidas) {
    test('Auditoria: ' + rota, async ({ page }) => {
      await auditarPagina(page, rota, 'protegida');
    });
  }
});

// ── Gera relatorio ao final ──────────────────────────────────
test('Gerar relatorio final', async () => {
  salvarRelatorio();
});
