'use client';

/**
 * Mockups representativos das telas reais do dashboard GestSilo.
 * Todos usam dados MOCK estáticos — nenhum back-end, Supabase ou dado real.
 * Reproduzem visualmente os elementos-chave de cada módulo:
 * mesmos tokens de cor (#161616 surfaces, #00A651 verde de marca),
 * cards, tabelas, gauges, KPIs e badges das páginas verdadeiras.
 */

import type { ReactNode } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Leaf,
  Calculator,
  CalendarDays,
  Wheat,
} from 'lucide-react';

// ===== Shell comum: janela de app com topbar =====
function MockShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div
      className="rounded-[13px] overflow-hidden border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] flex flex-col w-full"
      style={{ background: '#161616' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8" style={{ background: '#1a1a1a' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded bg-[#00A651] flex items-center justify-center flex-shrink-0">
            <Wheat size={11} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground truncate leading-tight">{title}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground truncate leading-tight">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-semibold flex-shrink-0" style={{ background: 'rgba(0,166,81,0.12)', border: '1px solid rgba(0,166,81,0.25)', color: '#00A651' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#00A651]" />
          Fazenda MS
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-[10px] p-3 border border-white/10" style={{ background: '#1c1c1c' }}>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">{label}</p>
      <p className="text-xl font-extrabold leading-none" style={{ color: color ?? 'var(--foreground)' }}>{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Gauge({ pct, color }: { pct: number; color: string }) {
  // semicírculo simples (210° → -30°) reproduzindo o MiniGauge do SiloCard
  return (
    <div className="relative w-[88px] h-[88px] flex-shrink-0">
      <div className="absolute inset-0 rounded-full blur-lg opacity-[0.14]" style={{ background: color }} />
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[120deg]">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeDasharray={`${0.67 * 251} 251`} strokeLinecap="round" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${(pct / 100) * 0.67 * 251} 251`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold leading-none" style={{ color }}>{pct}%</span>
        <span className="text-[8px] text-muted-foreground mt-0.5">cheio</span>
      </div>
    </div>
  );
}

// ============================================================
// 1. SILOS — gauge + KPIs + cards (fiel ao SiloCard / SiloKpiStrip)
// ============================================================
export function MockupSilos() {
  const silos = [
    { nome: 'Silo 02 — Milho', cultura: 'Milho', pct: 78, ms: 32, status: 'Aberto', cor: '#00c45a', dot: '#f5a623' },
    { nome: 'Silo 04 — Sorgo', cultura: 'Sorgo', pct: 99, ms: 30, status: 'Fechado', cor: '#4aaae6', dot: '#9b59b6' },
  ];
  return (
    <MockShell title="Gestão de Silagens" subtitle="Estoque, qualidade e autonomia">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Kpi label="Ocupação" value="67%" sub="638 / 953 ton" color="#00A651" />
        <Kpi label="Autonomia" value="232" sub="dias de estoque" />
        <Kpi label="Consumo/dia" value="1.283" sub="kg/dia (30d)" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {silos.map((s) => (
          <div key={s.nome} className="rounded-[10px] border border-white/10 overflow-hidden" style={{ background: '#1c1c1c', borderLeft: `3px solid ${s.dot}` }}>
            <div className="flex items-start justify-between px-3 pt-2.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-foreground truncate">{s.nome}</p>
                <p className="text-[9px] text-muted-foreground">{s.cultura}</p>
              </div>
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded border ${s.status === 'Aberto' ? 'text-green-400 border-green-500/30 bg-green-500/15' : 'text-blue-400 border-blue-500/30 bg-blue-500/15'}`}>{s.status}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2">
              <Gauge pct={s.pct} color={s.cor} />
              <div className="flex flex-col gap-1.5 min-w-0">
                <div>
                  <p className="text-[8px] uppercase text-muted-foreground tracking-wide">Estoque</p>
                  <p className="text-[10px] font-semibold text-foreground">{(s.pct * 4).toFixed(0)} <span className="text-muted-foreground font-normal">/ {(s.pct * 5).toFixed(0)} ton</span></p>
                </div>
                <div>
                  <p className="text-[8px] uppercase text-muted-foreground tracking-wide">MS</p>
                  <p className="text-[10px] font-semibold text-foreground flex items-center gap-1">{s.ms}% <TrendingUp className="w-2.5 h-2.5 text-green-400" /></p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

// ============================================================
// 2. LAVOURAS / TALHÕES — cards de talhão com ciclo e produtividade
// ============================================================
export function MockupLavouras() {
  const talhoes = [
    { nome: 'Talhão Norte', cultura: 'Milho silagem', area: '12,5 ha', ciclo: 'Em colheita', prod: '48,2', cor: '#f5a623' },
    { nome: 'Talhão da Sede', cultura: 'Sorgo', area: '8,0 ha', ciclo: 'Plantio', prod: '—', cor: '#9b59b6' },
    { nome: 'Várzea Sul', cultura: 'Capim', area: '20,0 ha', ciclo: 'Planejado', prod: '—', cor: '#27ae60' },
  ];
  return (
    <MockShell title="Gestão de Lavouras e Talhões" subtitle="Ciclos agrícolas e custo de produção">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {talhoes.map((t) => (
          <div key={t.nome} className="rounded-[10px] border border-white/10 p-3" style={{ background: '#1c1c1c', borderLeft: `3px solid ${t.cor}` }}>
            <p className="text-[11px] font-semibold text-foreground truncate">{t.nome}</p>
            <p className="text-[9px] text-muted-foreground mb-2">{t.cultura} · {t.area}</p>
            <span className="inline-block text-[8px] font-semibold px-1.5 py-0.5 rounded-full mb-2" style={{ background: 'rgba(0,166,81,0.12)', color: '#00A651' }}>{t.ciclo}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-foreground">{t.prod}</span>
              <span className="text-[8px] text-muted-foreground">ton/ha</span>
            </div>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

// ============================================================
// 3. REBANHO — KPIs de acesso rápido + tabela de animais
// ============================================================
export function MockupRebanho() {
  const animais = [
    { brinco: 'BR-1042', sexo: 'Fêmea', cat: 'Vaca em Lactação', status: 'Ativo', peso: '512 kg', lote: 'Lote 1', cor: 'green' },
    { brinco: 'BR-0871', sexo: 'Macho', cat: 'Novilho', status: 'Ativo', peso: '348 kg', lote: 'Lote 3', cor: 'green' },
    { brinco: 'BR-0233', sexo: 'Fêmea', cat: 'Vaca Seca', status: 'Ativo', peso: '480 kg', lote: 'Lote 2', cor: 'green' },
  ];
  return (
    <MockShell title="Gestão do Rebanho" subtitle="Ficha, lotes, reprodução e sanidade">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Kpi label="Total Animais" value="184" sub="ativos" color="#00A651" />
        <Kpi label="Em Lactação" value="62" sub="vacas" />
        <Kpi label="GMD Médio" value="0,92" sub="kg/dia" color="#FED7AA" />
      </div>
      <div className="rounded-[10px] border border-white/10 overflow-hidden" style={{ background: '#1c1c1c' }}>
        <div className="grid grid-cols-[1fr_1fr_0.8fr_0.8fr] gap-2 px-3 py-1.5 border-b border-white/8 text-[8px] uppercase tracking-wide text-muted-foreground font-semibold">
          <span>Brinco</span><span>Categoria</span><span>Status</span><span>Peso</span>
        </div>
        {animais.map((a) => (
          <div key={a.brinco} className="grid grid-cols-[1fr_1fr_0.8fr_0.8fr] gap-2 px-3 py-1.5 border-b border-white/5 last:border-0 items-center">
            <span className="text-[10px] font-medium text-foreground">{a.brinco}</span>
            <span className="text-[9px] text-muted-foreground truncate">{a.cat}</span>
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full border border-green-600/40 text-green-500 w-fit">{a.status}</span>
            <span className="text-[9px] text-foreground">{a.peso}</span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

// ============================================================
// 4. PASTAGENS — KPIs + cards de piquete com UA/ha
// ============================================================
export function MockupPastagens() {
  const piquetes = [
    { nome: 'Piquete 1', status: 'Em pastejo', lote: 'Lote 1 · 24 animais', ua: 78, cor: '#00c45a' },
    { nome: 'Piquete 3', status: 'Descanso', lote: 'pronto p/ entrada', ua: 0, cor: '#4aaae6' },
  ];
  return (
    <MockShell title="Pastagens" subtitle="Pastejo rotacionado e UA/ha">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <Kpi label="Piquetes" value="12" />
        <Kpi label="Em pastejo" value="7" color="#00c45a" />
        <Kpi label="Descanso" value="4" color="#60a5fa" />
        <Kpi label="Alertas" value="1" color="#f5d000" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {piquetes.map((p) => (
          <div key={p.nome} className="rounded-[10px] border border-white/10 p-3" style={{ background: '#1c1c1c' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-foreground flex items-center gap-1"><Leaf size={11} className="text-[#00c45a]" />{p.nome}</p>
              <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${p.cor}22`, color: p.cor }}>{p.status}</span>
            </div>
            <p className="text-[9px] text-muted-foreground mb-2">{p.lote}</p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] uppercase text-muted-foreground tracking-wide">UA / ha</span>
              <span className="text-[9px] font-bold" style={{ color: p.cor }}>{p.ua}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${p.ua}%`, background: p.cor }} />
            </div>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

// ============================================================
// 5. BALANÇO FORRAGEIRO — 2 linhas de KPIs com autonomia líquida
// ============================================================
export function MockupBalanco() {
  return (
    <MockShell title="Balanço Forrageiro" subtitle="Consumo × demanda × oferta de pasto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        <Kpi label="Estoque Total" value="638" sub="t MV" />
        <Kpi label="Consumo Real/Dia" value="1.283" sub="kg/dia" />
        <Kpi label="Autonomia Real" value="232 dias" color="#4ade80" />
        <Kpi label="Aut. Projetada" value="198 dias" color="#4ade80" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-[10px] p-3 border border-green-600/25" style={{ background: '#1c1c1c' }}>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Oferta de Pasto</p>
          <p className="text-xl font-extrabold text-green-400 leading-none">2.940</p>
          <p className="text-[9px] text-muted-foreground mt-1">kg MS/dia</p>
        </div>
        <div className="rounded-[10px] p-3 border border-green-600/25" style={{ background: '#1c1c1c' }}>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Demanda Líquida</p>
          <p className="text-xl font-extrabold text-foreground leading-none">820</p>
          <p className="text-[9px] text-muted-foreground mt-1">kg MS/dia (após pasto)</p>
        </div>
        <div className="rounded-[10px] p-3 border border-green-600/25" style={{ background: '#1c1c1c' }}>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Aut. Silos (líquida)</p>
          <p className="text-sm font-bold mt-1"><span className="inline-flex px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">311 dias</span></p>
        </div>
        <div className="rounded-[10px] p-3 border border-green-600/25" style={{ background: '#1c1c1c' }}>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Piquetes Pastejo</p>
          <p className="text-xl font-extrabold text-green-400 leading-none">7</p>
          <p className="text-[9px] text-muted-foreground mt-1">época de chuvas</p>
        </div>
      </div>
    </MockShell>
  );
}

// ============================================================
// 6. PLANEJAMENTO / FERRAMENTAS — resumo do wizard + calculadora NPK
// ============================================================
export function MockupPlanejamento() {
  return (
    <MockShell title="Ferramentas de Planejamento" subtitle="Silagem · Compras · Calculadoras">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <Kpi label="Demanda MS Total" value="312 t" />
        <Kpi label="Demanda MO" value="1.040 t" sub="com perdas" />
        <Kpi label="Consumo Diário" value="2.850" sub="kg/dia" />
        <Kpi label="Área de Plantio" value="6,4 ha" color="#00A651" />
      </div>
      <div className="rounded-[10px] border border-white/10 p-3" style={{ background: '#1c1c1c' }}>
        <p className="text-[10px] font-bold text-foreground flex items-center gap-1.5 mb-2"><Calculator size={12} className="text-[#E9D5FF]" />Calculadora NPK — Opção mais econômica</p>
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Custo / ha" value="R$ 412" color="#00A651" />
          <Kpi label="Adubos" value="2" />
          <Kpi label="Margem N/P/K" value="+8%" color="#4ade80" />
        </div>
      </div>
    </MockShell>
  );
}

// ============================================================
// MÓDULOS EXTRAS (página dedicada)
// ============================================================
export function MockupFinanceiro() {
  return (
    <MockShell title="Gestão Financeira" subtitle="DRE, fluxo de caixa e lucratividade">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[10px] p-3 border border-white/10" style={{ background: '#1c1c1c' }}>
          <p className="text-[9px] uppercase text-muted-foreground tracking-wide mb-1 flex items-center gap-1"><TrendingUp size={10} className="text-[#00A651]" />Receitas</p>
          <p className="text-base font-extrabold text-[#00A651]">R$ 84.200</p>
        </div>
        <div className="rounded-[10px] p-3 border border-white/10" style={{ background: '#1c1c1c' }}>
          <p className="text-[9px] uppercase text-muted-foreground tracking-wide mb-1 flex items-center gap-1"><TrendingDown size={10} className="text-red-400" />Despesas</p>
          <p className="text-base font-extrabold text-red-400">R$ 51.870</p>
        </div>
        <div className="rounded-[10px] p-3 border border-white/10" style={{ background: '#1c1c1c' }}>
          <p className="text-[9px] uppercase text-muted-foreground tracking-wide mb-1 flex items-center gap-1"><Wallet size={10} className="text-[#00A651]" />Saldo</p>
          <p className="text-base font-extrabold text-[#00A651]">R$ 32.330</p>
        </div>
      </div>
      <div className="mt-2 rounded-[10px] border border-white/10 p-3 flex items-end gap-1.5 h-20" style={{ background: '#1c1c1c' }}>
        {[40, 65, 50, 80, 60, 90].map((h, i) => (
          <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i % 2 ? 'rgba(248,113,113,0.5)' : 'rgba(0,166,81,0.6)' }} />
        ))}
      </div>
    </MockShell>
  );
}

export function MockupFrota() {
  const maq = [
    { nome: 'Trator John Deere', status: 'Manutenção em 7 dias', cor: '#f5d000' },
    { nome: 'Colheitadeira', status: 'Em dia', cor: '#00c45a' },
  ];
  return (
    <MockShell title="Gestão de Frota e Maquinários" subtitle="Manutenção, abastecimento e custos">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Kpi label="Máquinas" value="8" />
        <Kpi label="Manut. pendentes" value="2" color="#f5d000" />
        <Kpi label="Custo/mês" value="R$ 9,2k" />
      </div>
      <div className="space-y-2">
        {maq.map((m) => (
          <div key={m.nome} className="rounded-[10px] border border-white/10 px-3 py-2 flex items-center justify-between" style={{ background: '#1c1c1c' }}>
            <span className="text-[10px] font-medium text-foreground">{m.nome}</span>
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${m.cor}22`, color: m.cor }}>{m.status}</span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

export function MockupInsumos() {
  const itens = [
    { nome: 'Ureia', est: 'baixo', pct: 18, cor: '#f87171' },
    { nome: 'Silagem inoculante', est: 'ok', pct: 72, cor: '#00c45a' },
    { nome: 'Defensivo X', est: 'médio', pct: 45, cor: '#f5d000' },
  ];
  return (
    <MockShell title="Gestão de Insumos" subtitle="Estoque mínimo e alertas">
      <div className="rounded-[10px] border border-red-500/20 px-3 py-2 mb-3 flex items-center gap-2" style={{ background: 'rgba(248,113,113,0.06)' }}>
        <AlertTriangle size={12} className="text-red-400" />
        <span className="text-[9px] text-red-400 font-semibold">1 insumo abaixo do estoque mínimo</span>
      </div>
      <div className="rounded-[10px] border border-white/10 overflow-hidden" style={{ background: '#1c1c1c' }}>
        {itens.map((i) => (
          <div key={i.nome} className="px-3 py-2 flex items-center gap-2 border-b border-white/5 last:border-0">
            <span className="text-[10px] text-foreground flex-1">{i.nome}</span>
            <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${i.pct}%`, background: i.cor }} />
            </div>
            <span className="text-[9px] font-bold w-8 text-right" style={{ color: i.cor }}>{i.pct}%</span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

export function MockupRelatorios() {
  const rels = ['Financeiro', 'Rebanho', 'Talhões', 'Silos', 'Frota', 'Pastagens'];
  return (
    <MockShell title="Relatórios e Análises" subtitle="15+ relatórios em XLSX e PDF">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {rels.map((r) => (
          <div key={r} className="rounded-[10px] border border-white/10 p-3" style={{ background: '#1c1c1c' }}>
            <p className="text-[10px] font-semibold text-foreground mb-2">{r}</p>
            <div className="flex gap-1.5">
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,166,81,0.15)', color: '#00A651' }}>XLSX</span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>PDF</span>
            </div>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

export function MockupProdutos() {
  const prod = [
    { nome: 'Milho em grão', cat: 'Grãos', est: '420 sc', cor: '#f5a623' },
    { nome: 'Leite', cat: 'Leite', est: '1.240 L', cor: '#a5f3fc' },
    { nome: 'Feno', cat: 'Feno', est: '85 fardos', cor: '#d9f99d' },
  ];
  return (
    <MockShell title="Gestão de Produtos" subtitle="Estoque, vendas e movimentações">
      <div className="grid grid-cols-3 gap-2">
        {prod.map((p) => (
          <div key={p.nome} className="rounded-[10px] border border-white/10 p-3" style={{ background: '#1c1c1c', borderLeft: `3px solid ${p.cor}` }}>
            <p className="text-[10px] font-semibold text-foreground truncate">{p.nome}</p>
            <p className="text-[8px] text-muted-foreground mb-1.5">{p.cat}</p>
            <p className="text-base font-extrabold text-foreground">{p.est}</p>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

export function MockupMaoDeObra() {
  return (
    <MockShell title="Mão de Obra" subtitle="Atividades e custo por colaborador">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Kpi label="Custo do mês" value="R$ 6,4k" color="#f87171" />
        <Kpi label="Atividades" value="38" />
        <Kpi label="Colaboradores" value="5" color="#E9D5FF" />
      </div>
      <div className="rounded-[10px] border border-white/10 overflow-hidden" style={{ background: '#1c1c1c' }}>
        {[
          { col: 'João', atv: 'Trato do rebanho', custo: 'R$ 320' },
          { col: 'Maria', atv: 'Ordenha', custo: 'R$ 280' },
        ].map((r) => (
          <div key={r.col} className="px-3 py-2 flex items-center justify-between border-b border-white/5 last:border-0">
            <div>
              <p className="text-[10px] font-medium text-foreground">{r.col}</p>
              <p className="text-[8px] text-muted-foreground">{r.atv}</p>
            </div>
            <span className="text-[9px] font-bold text-foreground">{r.custo}</span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

export function MockupAssessoria() {
  return (
    <MockShell title="Assessoria Agronômica" subtitle="Agendamento e bloco de notas">
      <div className="rounded-[10px] border border-white/10 p-3 mb-2" style={{ background: '#1c1c1c' }}>
        <p className="text-[10px] font-bold text-foreground flex items-center gap-1.5 mb-2"><CalendarDays size={12} className="text-[#00A651]" />Próxima reunião confirmada</p>
        <p className="text-[11px] text-foreground">Revisão de silagem — 18/06, 14h</p>
        <p className="text-[9px] text-muted-foreground">por vídeo · com a equipe GestSilo</p>
      </div>
      <div className="rounded-[10px] border border-white/10 p-3 space-y-1.5" style={{ background: '#1c1c1c' }}>
        {[
          { t: 'Verificar MS do Silo 02', cat: 'observação', cor: '#60a5fa' },
          { t: 'Dúvida sobre adubação', cat: 'dúvida', cor: '#f5d000' },
        ].map((n) => (
          <div key={n.t} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: n.cor }} />
            <span className="text-[10px] text-foreground flex-1">{n.t}</span>
            <span className="text-[8px] text-muted-foreground">{n.cat}</span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

export function MockupCalendario() {
  const dias = Array.from({ length: 21 }, (_, i) => i + 1);
  const eventos: Record<number, string> = { 3: '#00A651', 7: '#f5a623', 12: '#60a5fa', 18: '#9b59b6', 20: '#00c45a' };
  return (
    <MockShell title="Calendário de Operações" subtitle="Eventos de todos os módulos">
      <div className="grid grid-cols-7 gap-1">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-[8px] text-center text-muted-foreground font-semibold">{d}</span>
        ))}
        {dias.map((d) => (
          <div key={d} className="aspect-square rounded border border-white/8 flex flex-col items-center justify-center" style={{ background: '#1c1c1c' }}>
            <span className="text-[8px] text-muted-foreground">{d}</span>
            {eventos[d] && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: eventos[d] }} />}
          </div>
        ))}
      </div>
    </MockShell>
  );
}
