import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type SupabaseAdminClient = SupabaseClient<Database>

type TipoAlertaEmail =
  | 'autonomia_silagem'
  | 'perdas_silagem'
  | 'ocupacao_vencida'
  | 'piquete_pronto'

export type AlertaEmail = {
  tipo: TipoAlertaEmail
  detalhe: string
}

export type ResultadoVerificacaoFazenda = {
  fazendaId: string
  fazendaNome: string
  alertas: AlertaEmail[]
  adminEmail: string | null
}

export type ResumoCronJob = {
  enviados: number
  sem_alertas: number
  erros: number
}

export async function verificarAutonomiaSilagem(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]> {
  const { data: silos } = await supabase
    .from('silos')
    .select('id, nome')
    .eq('fazenda_id', fazendaId)

  if (!silos || silos.length === 0) return []

  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const alertas = await Promise.all(
    silos.map(async (silo) => {
      const [{ data: todasMovs }, { data: movs30d }] = await Promise.all([
        supabase
          .from('movimentacoes_silo')
          .select('quantidade, tipo')
          .eq('silo_id', silo.id),
        supabase
          .from('movimentacoes_silo')
          .select('quantidade, tipo, subtipo')
          .eq('silo_id', silo.id)
          .gte('data', trintaDiasAtras),
      ])

      const entradas = (todasMovs ?? [])
        .filter((m) => m.tipo === 'Entrada')
        .reduce((s, m) => s + (m.quantidade ?? 0), 0)
      const saidas = (todasMovs ?? [])
        .filter((m) => m.tipo === 'Saída')
        .reduce((s, m) => s + (m.quantidade ?? 0), 0)
      const estoqueAtual = entradas - saidas

      const consumoTotal30d = (movs30d ?? [])
        .filter(
          (m) =>
            m.tipo === 'Saída' &&
            m.subtipo !== 'Descarte' &&
            m.subtipo !== 'Perda'
        )
        .reduce((s, m) => s + (m.quantidade ?? 0), 0)
      const consumoDiario = consumoTotal30d / 30

      if (consumoDiario === 0) return null

      const autonomiaDias = estoqueAtual / consumoDiario
      if (autonomiaDias >= 30) return null

      return {
        tipo: 'autonomia_silagem' as TipoAlertaEmail,
        detalhe: `O silo **${silo.nome}** tem apenas **${Math.floor(autonomiaDias)} dias** de silagem restante (abaixo do mínimo de 30 dias).`,
      }
    })
  )

  return alertas.filter((a): a is AlertaEmail => a !== null)
}

export async function verificarPerdasSilagem(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]> {
  const { data: silos } = await supabase
    .from('silos')
    .select('id, nome')
    .eq('fazenda_id', fazendaId)

  if (!silos || silos.length === 0) return []

  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const alertas = await Promise.all(
    silos.map(async (silo) => {
      const { data: saidas } = await supabase
        .from('movimentacoes_silo')
        .select('quantidade, subtipo')
        .eq('silo_id', silo.id)
        .eq('tipo', 'Saída')
        .gte('data', trintaDiasAtras)

      const totalSaidas = (saidas ?? []).reduce((s, m) => s + (m.quantidade ?? 0), 0)
      if (totalSaidas === 0) return null

      const totalPerdas = (saidas ?? [])
        .filter((m) => m.subtipo === 'Perda')
        .reduce((s, m) => s + (m.quantidade ?? 0), 0)
      const taxaPerdas = totalPerdas / totalSaidas

      if (taxaPerdas <= 0.2) return null

      return {
        tipo: 'perdas_silagem' as TipoAlertaEmail,
        detalhe: `O silo **${silo.nome}** registrou **${Math.round(taxaPerdas * 100)}%** de perdas nos últimos 30 dias (acima do limite de 20%).`,
      }
    })
  )

  return alertas.filter((a): a is AlertaEmail => a !== null)
}

export async function verificarOcupacoesVencidas(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]> {
  const agora = new Date().toISOString()

  const { data: ocupacoes } = await supabase
    .from('ocupacoes_piquete')
    .select('id, data_saida_prevista, piquetes(nome)')
    .eq('fazenda_id', fazendaId)
    .is('data_saida_real', null)
    .lt('data_saida_prevista', agora)

  if (!ocupacoes || ocupacoes.length === 0) return []

  return ocupacoes.map((row) => {
    const nomePiquete = (row.piquetes as unknown as { nome: string }).nome
    const dataFormatada = new Date(row.data_saida_prevista!).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return {
      tipo: 'ocupacao_vencida' as TipoAlertaEmail,
      detalhe: `O piquete **${nomePiquete}** tem animais que deveriam ter saído em **${dataFormatada}** e ainda estão ocupando o pasto.`,
    }
  })
}

export async function verificarPiquetesProntos(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]> {
  const tresDiasAtras = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: piquetes } = await supabase
    .from('piquetes')
    .select('id, nome, updated_at')
    .eq('fazenda_id', fazendaId)
    .eq('status', 'Descanso')
    .lt('updated_at', tresDiasAtras)

  if (!piquetes || piquetes.length === 0) return []

  return piquetes.map((piquete) => ({
    tipo: 'piquete_pronto' as TipoAlertaEmail,
    detalhe: `O piquete **${piquete.nome}** está em descanso há mais de 3 dias e pode estar pronto para receber animais.`,
  }))
}

export async function verificarAlertasFazenda(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]> {
  const resultados = await Promise.all([
    verificarAutonomiaSilagem(fazendaId, supabase).catch((err) => {
      console.error(`[alertas-email] autonomia_silagem fazenda ${fazendaId}:`, err)
      return [] as AlertaEmail[]
    }),
    verificarPerdasSilagem(fazendaId, supabase).catch((err) => {
      console.error(`[alertas-email] perdas_silagem fazenda ${fazendaId}:`, err)
      return [] as AlertaEmail[]
    }),
    verificarOcupacoesVencidas(fazendaId, supabase).catch((err) => {
      console.error(`[alertas-email] ocupacao_vencida fazenda ${fazendaId}:`, err)
      return [] as AlertaEmail[]
    }),
    verificarPiquetesProntos(fazendaId, supabase).catch((err) => {
      console.error(`[alertas-email] piquete_pronto fazenda ${fazendaId}:`, err)
      return [] as AlertaEmail[]
    }),
  ])
  return resultados.flat()
}
