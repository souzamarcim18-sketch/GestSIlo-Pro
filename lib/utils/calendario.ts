import type { EventoCalendario } from '@/lib/types/calendario';

// --- Tipos de linha (subset dos campos usados na normalização) ---

export interface EventoDapRow {
  id: string;
  tipo_operacao: string;
  cultura: string | null;
  status: string | null;
  data_esperada: string | null;
  data_realizada: string | null;
  talhao_id: string | null;
  talhoes: { nome?: string } | null;
}

export interface AtividadeCampoRow {
  id: string;
  tipo_operacao: string;
  data: string;
  talhao_id: string | null;
  talhoes: { nome?: string } | null;
}

export interface ManutencaoRow {
  id: string;
  tipo: string;
  descricao: string | null;
  status: string | null;
  data_prevista: string | null;
  data_realizada: string | null;
  proxima_manutencao: string | null;
  maquinas: { nome?: string } | null;
}

export interface EventoRebanhoRow {
  id: string;
  tipo: string;
  descricao: string | null;
  data_evento: string;
  animal_id: string | null;
  animais: { brinco?: string | null; nome?: string | null } | null;
}

export interface EventoSanitarioRow {
  id: string;
  tipo: string;
  descricao?: string | null; // alias para observacoes ou vacina_nome dependendo do contexto
  data_evento: string;
  data_proxima_dose: string | null;
  animal_id: string | null;
}

export interface OcupacaoPiqueteRow {
  id: string;
  data_entrada: string;
  data_saida_real: string | null;
  data_saida_prevista: string | null;
  lotes: { nome?: string } | null;
  piquetes: { nome?: string; pastagem_id?: string } | null;
}

// --- Funções de normalização puras ---

export function normalizarEventoDap(row: EventoDapRow, hoje: string): EventoCalendario {
  const talhaoNome = row.talhoes?.nome ?? '';
  const data = row.data_esperada ?? hoje;
  const isAtrasado = row.status === 'Planejado' && data < hoje;
  return {
    id: row.id,
    fonte: 'eventos_dap',
    modulo: 'lavoura_dap',
    titulo: `${row.tipo_operacao} — ${talhaoNome}`,
    subtitulo: row.cultura ?? undefined,
    data,
    status: (row.status === 'Realizado' ? 'realizado' : isAtrasado ? 'atrasado' : 'planejado') as EventoCalendario['status'],
    href: '/dashboard/talhoes',
    talhaoId: row.talhao_id ?? undefined,
  };
}

export function normalizarAtividadeCampo(row: AtividadeCampoRow): EventoCalendario {
  return {
    id: row.id,
    fonte: 'atividades_campo',
    modulo: 'lavoura_atividade',
    titulo: `${row.tipo_operacao} — ${row.talhoes?.nome ?? ''}`,
    data: row.data,
    status: 'realizado',
    href: '/dashboard/talhoes',
    talhaoId: row.talhao_id ?? undefined,
  };
}

export function normalizarManutencao(row: ManutencaoRow, hoje: string): EventoCalendario[] {
  const maquinaNome = row.maquinas?.nome ?? '';
  const titulo = `${row.tipo} — ${maquinaNome}`;
  const eventos: EventoCalendario[] = [];

  const dataEvento = row.data_realizada ?? row.data_prevista;
  if (dataEvento) {
    const isConcluida = row.status === 'concluida';
    const isAtrasada = !isConcluida && !!row.data_prevista && row.data_prevista < hoje;
    eventos.push({
      id: row.id,
      fonte: 'manutencoes',
      modulo: 'frota',
      titulo,
      subtitulo: row.descricao ?? undefined,
      data: dataEvento,
      status: isConcluida ? 'concluido' : isAtrasada ? 'atrasado' : 'planejado',
      href: '/dashboard/frota',
    });
  }

  if (row.proxima_manutencao && row.proxima_manutencao >= hoje) {
    eventos.push({
      id: `${row.id}_proxima`,
      fonte: 'manutencoes',
      modulo: 'frota',
      titulo: `Próxima manutenção — ${maquinaNome}`,
      subtitulo: row.tipo,
      data: row.proxima_manutencao,
      status: 'planejado',
      href: '/dashboard/frota',
    });
  }

  return eventos;
}

export function normalizarEventoRebanho(row: EventoRebanhoRow): EventoCalendario {
  const animal = row.animais;
  const animalLabel = animal?.brinco ?? animal?.nome ?? '';
  return {
    id: row.id,
    fonte: 'eventos_rebanho',
    modulo: 'rebanho',
    titulo: `${row.tipo}${animalLabel ? ` — ${animalLabel}` : ''}`,
    subtitulo: row.descricao ?? undefined,
    data: row.data_evento,
    status: 'realizado',
    href: row.animal_id ? `/dashboard/rebanho/${row.animal_id}` : '/dashboard/rebanho',
  };
}

export function normalizarEventoSanitario(row: EventoSanitarioRow, hoje: string): EventoCalendario[] {
  const eventos: EventoCalendario[] = [];

  eventos.push({
    id: row.id,
    fonte: 'eventos_sanitarios',
    modulo: 'sanidade',
    titulo: row.tipo,
    subtitulo: row.descricao ?? undefined,
    data: row.data_evento,
    status: 'realizado',
    href: '/dashboard/rebanho/sanidade',
  });

  if (row.data_proxima_dose && row.data_proxima_dose >= hoje) {
    eventos.push({
      id: `${row.id}_proxima_dose`,
      fonte: 'eventos_sanitarios',
      modulo: 'sanidade',
      titulo: `Próxima dose — ${row.tipo}`,
      subtitulo: row.descricao ?? undefined,
      data: row.data_proxima_dose,
      status: 'planejado',
      href: '/dashboard/rebanho/sanidade',
    });
  }

  return eventos;
}

export function normalizarOcupacaoPiquete(row: OcupacaoPiqueteRow): EventoCalendario[] {
  const piquete = row.piquetes;
  const lote = row.lotes;
  const href = piquete?.pastagem_id
    ? `/dashboard/pastagens/${piquete.pastagem_id}`
    : '/dashboard/pastagens';
  const eventos: EventoCalendario[] = [];

  eventos.push({
    id: `${row.id}_entrada`,
    fonte: 'ocupacoes_piquete',
    modulo: 'pastagem_ocupacao',
    titulo: `Entrada no piquete — ${piquete?.nome ?? ''}`,
    subtitulo: lote?.nome,
    data: row.data_entrada,
    status: 'realizado',
    href,
  });

  if (row.data_saida_real) {
    eventos.push({
      id: `${row.id}_saida_real`,
      fonte: 'ocupacoes_piquete',
      modulo: 'pastagem_ocupacao',
      titulo: `Saída do piquete — ${piquete?.nome ?? ''}`,
      subtitulo: lote?.nome,
      data: row.data_saida_real,
      status: 'realizado',
      href,
    });
  } else if (row.data_saida_prevista) {
    eventos.push({
      id: `${row.id}_saida_prevista`,
      fonte: 'ocupacoes_piquete',
      modulo: 'pastagem_ocupacao',
      titulo: `Saída prevista — ${piquete?.nome ?? ''}`,
      subtitulo: lote?.nome,
      data: row.data_saida_prevista,
      status: 'planejado',
      href,
    });
  }

  return eventos;
}
