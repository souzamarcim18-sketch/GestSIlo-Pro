import { describe, it, expect, vi } from 'vitest'
import {
  verificarAutonomiaSilagem,
  verificarPerdasSilagem,
  verificarOcupacoesVencidas,
  verificarPiquetesProntos,
  verificarAlertasFazenda,
  AlertaEmail,
} from '@/lib/services/alertas-email'
import { gerarEmailAlertasFazenda } from '@/lib/email/templates/alertas-fazenda'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type MockSupabase = SupabaseClient<Database>

const FAZENDA_ID = 'fazenda-test-uuid'

/**
 * Cria um mock encadeável do Supabase onde cada call a `from()` retorna
 * a resposta correspondente na sequência `respostas`.
 */
function criarSupabaseMockSequencial(respostas: unknown[]): MockSupabase {
  let callCount = 0
  const mockFrom = vi.fn().mockImplementation(() => {
    const idx = callCount++
    const data = respostas[idx] ?? []
    const promise = Promise.resolve({ data, error: null })
    const chain: Record<string, unknown> = {}
    const returnSelf = vi.fn().mockReturnValue(chain)
    Object.assign(chain, {
      select: returnSelf,
      eq: returnSelf,
      gte: returnSelf,
      lt: returnSelf,
      is: returnSelf,
      then: (res: unknown, rej: unknown) => promise.then(res as never, rej as never),
      catch: (fn: unknown) => promise.catch(fn as never),
    })
    return chain
  })
  return { from: mockFrom } as unknown as MockSupabase
}

// ──────────────────────────────────────────────────────────────────────────
// verificarAutonomiaSilagem
// ──────────────────────────────────────────────────────────────────────────
describe('verificarAutonomiaSilagem', () => {
  it('retorna alerta quando autonomia < 30 dias', async () => {
    // estoque = 5000 kg, consumo = 6000/30 = 200/dia → autonomia = 25 dias
    const silos = [{ id: 'silo-1', nome: 'Silo Norte' }]
    const todasMovs = [{ quantidade: 5000, tipo: 'Entrada' }]
    const movs30d = [{ quantidade: 6000, tipo: 'Saída', subtipo: 'Consumo' }]

    const supabase = criarSupabaseMockSequencial([silos, todasMovs, movs30d])
    const alertas = await verificarAutonomiaSilagem(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(1)
    expect(alertas[0].tipo).toBe('autonomia_silagem')
    expect(alertas[0].detalhe).toContain('Silo Norte')
    expect(alertas[0].detalhe).toContain('25 dias')
  })

  it('retorna [] quando autonomia >= 30 dias', async () => {
    // estoque = 10000 kg, consumo = 3000/30 = 100/dia → autonomia = 100 dias
    const silos = [{ id: 'silo-1', nome: 'Silo Sul' }]
    const todasMovs = [{ quantidade: 10000, tipo: 'Entrada' }]
    const movs30d = [{ quantidade: 3000, tipo: 'Saída', subtipo: 'Consumo' }]

    const supabase = criarSupabaseMockSequencial([silos, todasMovs, movs30d])
    const alertas = await verificarAutonomiaSilagem(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(0)
  })

  it('boundary: autonomia exatamente 30 dias retorna []', async () => {
    // estoque = 3000 kg, consumo = 3000/30 = 100/dia → autonomia = 30 (não < 30)
    const silos = [{ id: 'silo-1', nome: 'Silo Centro' }]
    const todasMovs = [{ quantidade: 3000, tipo: 'Entrada' }]
    const movs30d = [{ quantidade: 3000, tipo: 'Saída', subtipo: 'Consumo' }]

    const supabase = criarSupabaseMockSequencial([silos, todasMovs, movs30d])
    const alertas = await verificarAutonomiaSilagem(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(0)
  })

  it('retorna [] quando consumo diário = 0 (sem saídas nos últimos 30 dias)', async () => {
    const silos = [{ id: 'silo-1', nome: 'Silo Leste' }]
    const todasMovs = [{ quantidade: 5000, tipo: 'Entrada' }]
    const movs30d: unknown[] = []

    const supabase = criarSupabaseMockSequencial([silos, todasMovs, movs30d])
    const alertas = await verificarAutonomiaSilagem(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(0)
  })

  it('dois silos: apenas o abaixo do threshold gera alerta', async () => {
    const silos = [
      { id: 'silo-1', nome: 'Silo Crítico' },
      { id: 'silo-2', nome: 'Silo Ok' },
    ]
    // silo-1: estoque 3000, consumo 200/dia → autonomia 15 dias
    const todasMovs1 = [{ quantidade: 3000, tipo: 'Entrada' }]
    const movs30d1 = [{ quantidade: 6000, tipo: 'Saída', subtipo: 'Consumo' }]
    // silo-2: estoque 10000, consumo 100/dia → autonomia 100 dias
    const todasMovs2 = [{ quantidade: 10000, tipo: 'Entrada' }]
    const movs30d2 = [{ quantidade: 3000, tipo: 'Saída', subtipo: 'Consumo' }]

    const supabase = criarSupabaseMockSequencial([silos, todasMovs1, movs30d1, todasMovs2, movs30d2])
    const alertas = await verificarAutonomiaSilagem(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(1)
    expect(alertas[0].detalhe).toContain('Silo Crítico')
  })
})

// ──────────────────────────────────────────────────────────────────────────
// verificarPerdasSilagem
// ──────────────────────────────────────────────────────────────────────────
describe('verificarPerdasSilagem', () => {
  it('retorna alerta quando perdas > 20%', async () => {
    const silos = [{ id: 'silo-1', nome: 'Silo Norte' }]
    const saidas = [
      { quantidade: 750, subtipo: 'Consumo' },
      { quantidade: 250, subtipo: 'Perda' },
    ]

    const supabase = criarSupabaseMockSequencial([silos, saidas])
    const alertas = await verificarPerdasSilagem(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(1)
    expect(alertas[0].tipo).toBe('perdas_silagem')
    expect(alertas[0].detalhe).toContain('25%')
  })

  it('boundary: perdas exatamente 20% retorna []', async () => {
    const silos = [{ id: 'silo-1', nome: 'Silo Sul' }]
    const saidas = [
      { quantidade: 800, subtipo: 'Consumo' },
      { quantidade: 200, subtipo: 'Perda' },
    ]

    const supabase = criarSupabaseMockSequencial([silos, saidas])
    const alertas = await verificarPerdasSilagem(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(0)
  })

  it('retorna [] quando perdas = 0', async () => {
    const silos = [{ id: 'silo-1', nome: 'Silo Centro' }]
    const saidas = [{ quantidade: 1000, subtipo: 'Consumo' }]

    const supabase = criarSupabaseMockSequencial([silos, saidas])
    const alertas = await verificarPerdasSilagem(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(0)
  })

  it('retorna [] quando totalSaidas = 0', async () => {
    const silos = [{ id: 'silo-1', nome: 'Silo Leste' }]
    const saidas: unknown[] = []

    const supabase = criarSupabaseMockSequencial([silos, saidas])
    const alertas = await verificarPerdasSilagem(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// verificarOcupacoesVencidas
// ──────────────────────────────────────────────────────────────────────────
describe('verificarOcupacoesVencidas', () => {
  it('retorna alerta para ocupação vencida', async () => {
    const ocupacoes = [
      {
        id: 'ocup-1',
        data_saida_prevista: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        piquetes: { nome: 'Piquete A' },
      },
    ]

    const supabase = criarSupabaseMockSequencial([ocupacoes])
    const alertas = await verificarOcupacoesVencidas(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(1)
    expect(alertas[0].tipo).toBe('ocupacao_vencida')
    expect(alertas[0].detalhe).toContain('Piquete A')
  })

  it('retorna [] quando query retorna vazio (data_saida_real preenchida filtra no banco)', async () => {
    const supabase = criarSupabaseMockSequencial([[]])
    const alertas = await verificarOcupacoesVencidas(FAZENDA_ID, supabase)
    expect(alertas).toHaveLength(0)
  })

  it('retorna [] quando prazo futuro (query filtra no banco)', async () => {
    const supabase = criarSupabaseMockSequencial([[]])
    const alertas = await verificarOcupacoesVencidas(FAZENDA_ID, supabase)
    expect(alertas).toHaveLength(0)
  })

  it('retorna 3 alertas para 3 ocupações vencidas', async () => {
    const ocupacoes = [
      { id: 'o1', data_saida_prevista: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), piquetes: { nome: 'Piquete A' } },
      { id: 'o2', data_saida_prevista: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), piquetes: { nome: 'Piquete B' } },
      { id: 'o3', data_saida_prevista: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), piquetes: { nome: 'Piquete C' } },
    ]

    const supabase = criarSupabaseMockSequencial([ocupacoes])
    const alertas = await verificarOcupacoesVencidas(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(3)
  })

  it('retorna [] quando não há ocupações vencidas', async () => {
    const supabase = criarSupabaseMockSequencial([[]])
    const alertas = await verificarOcupacoesVencidas(FAZENDA_ID, supabase)
    expect(alertas).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// verificarPiquetesProntos
// ──────────────────────────────────────────────────────────────────────────
describe('verificarPiquetesProntos', () => {
  it('retorna alerta para piquete Descanso com updated_at > 3 dias atrás', async () => {
    const piquetes = [
      {
        id: 'piq-1',
        nome: 'Piquete 01',
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    const supabase = criarSupabaseMockSequencial([piquetes])
    const alertas = await verificarPiquetesProntos(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(1)
    expect(alertas[0].tipo).toBe('piquete_pronto')
    expect(alertas[0].detalhe).toContain('Piquete 01')
  })

  it('retorna [] quando updated_at recente (query filtra no banco)', async () => {
    const supabase = criarSupabaseMockSequencial([[]])
    const alertas = await verificarPiquetesProntos(FAZENDA_ID, supabase)
    expect(alertas).toHaveLength(0)
  })

  it('retorna [] quando status diferente de Descanso (query filtra no banco)', async () => {
    const supabase = criarSupabaseMockSequencial([[]])
    const alertas = await verificarPiquetesProntos(FAZENDA_ID, supabase)
    expect(alertas).toHaveLength(0)
  })

  it('retorna [] quando não há piquetes prontos', async () => {
    const supabase = criarSupabaseMockSequencial([[]])
    const alertas = await verificarPiquetesProntos(FAZENDA_ID, supabase)
    expect(alertas).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// verificarAlertasFazenda — testa via mocks inline das sub-funções
// ──────────────────────────────────────────────────────────────────────────
describe('verificarAlertasFazenda', () => {
  it('retorna [] quando fazenda não tem alertas (sem silos/piquetes/ocupações)', async () => {
    // Todas as 4 queries retornam [] → silos=[], piquetes=[], ocupações=[]
    const supabase = criarSupabaseMockSequencial([[], [], [], []])
    const alertas = await verificarAlertasFazenda(FAZENDA_ID, supabase)
    expect(alertas).toHaveLength(0)
  })

  it('concatena alertas de todas as verificações', async () => {
    // verificarAlertasFazenda executa as 4 funções em Promise.all (paralelo).
    // O mock precisa ser baseado na tabela acessada, não na ordem de chamada.
    const silosData = [{ id: 'silo-1', nome: 'Silo A' }]
    const ocupacoesData = [{
      id: 'o1',
      data_saida_prevista: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      piquetes: { nome: 'Piquete X' },
    }]
    const piquetesData = [{
      id: 'piq-1',
      nome: 'Piquete Y',
      updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    }]

    // Mock baseado no nome da tabela para lidar com chamadas paralelas
    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      let resultData: unknown = []
      if (tabela === 'silos') resultData = silosData
      if (tabela === 'ocupacoes_piquete') resultData = ocupacoesData
      if (tabela === 'piquetes') resultData = piquetesData
      if (tabela === 'movimentacoes_silo') {
        // Retornar dados que geram: estoque 3000 kg, consumo 200/dia → autonomia 15d
        // e perdas 25%
        resultData = [
          { quantidade: 3000, tipo: 'Entrada', subtipo: null },
          { quantidade: 6000, tipo: 'Saída', subtipo: 'Consumo' },
          { quantidade: 250, tipo: 'Saída', subtipo: 'Perda' },
        ]
      }
      const promise = Promise.resolve({ data: resultData, error: null })
      const chain: Record<string, unknown> = {}
      const returnSelf = vi.fn().mockReturnValue(chain)
      Object.assign(chain, {
        select: returnSelf,
        eq: returnSelf,
        gte: returnSelf,
        lt: returnSelf,
        is: returnSelf,
        then: (res: unknown, rej: unknown) => promise.then(res as never, rej as never),
        catch: (fn: unknown) => promise.catch(fn as never),
      })
      return chain
    })
    const supabase = { from: mockFrom } as unknown as MockSupabase
    const alertas = await verificarAlertasFazenda(FAZENDA_ID, supabase)

    const tipos = alertas.map((a) => a.tipo)
    expect(tipos).toContain('autonomia_silagem')
    expect(tipos).toContain('ocupacao_vencida')
    expect(tipos).toContain('piquete_pronto')
  })

  it('exceção em uma verificação não cancela as demais', async () => {
    // Criar supabase que falha na segunda chamada (verificarPerdasSilagem precisa de silos como 1ª query)
    let callCount = 0
    const mockFrom = vi.fn().mockImplementation(() => {
      const idx = callCount++
      // Calls: 0=silos(auto), 1=todasMovs(auto), 2=movs30d(auto), 3=silos(perdas) → lança erro
      // Calls: 4=ocupacoes, 5=piquetes
      let promise: Promise<{ data: unknown; error: null }>
      if (idx === 3) {
        promise = Promise.reject(new Error('Falha simulada'))
      } else if (idx === 0) {
        // autonomia: sem silos → retorna []
        promise = Promise.resolve({ data: [], error: null })
      } else if (idx === 4) {
        promise = Promise.resolve({ data: [], error: null })
      } else if (idx === 5) {
        promise = Promise.resolve({ data: [], error: null })
      } else {
        promise = Promise.resolve({ data: [], error: null })
      }
      const chain: Record<string, unknown> = {}
      const returnSelf = vi.fn().mockReturnValue(chain)
      Object.assign(chain, {
        select: returnSelf,
        eq: returnSelf,
        gte: returnSelf,
        lt: returnSelf,
        is: returnSelf,
        then: (res: unknown, rej: unknown) => promise.then(res as never, rej as never),
        catch: (fn: unknown) => promise.catch(fn as never),
      })
      return chain
    })
    const supabase = { from: mockFrom } as unknown as MockSupabase

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const alertas = await verificarAlertasFazenda(FAZENDA_ID, supabase)

    // Não deve ter lançado exceção — deve retornar (pode ser [] pois silos vazios)
    expect(Array.isArray(alertas)).toBe(true)
    consoleSpy.mockRestore()
  })

  it('retorna 2 alertas do mesmo tipo quando verificarOcupacoesVencidas retorna 2 itens', async () => {
    const ocupacoes = [
      { id: 'o1', data_saida_prevista: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), piquetes: { nome: 'Piquete A' } },
      { id: 'o2', data_saida_prevista: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), piquetes: { nome: 'Piquete B' } },
    ]
    // sem silos → autonomia e perdas retornam []
    // sem piquetes → piquetesProntos retorna []
    const supabase = criarSupabaseMockSequencial([[], [], ocupacoes, []])
    const alertas = await verificarAlertasFazenda(FAZENDA_ID, supabase)

    expect(alertas).toHaveLength(2)
    expect(alertas.every((a) => a.tipo === 'ocupacao_vencida')).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// gerarEmailAlertasFazenda
// ──────────────────────────────────────────────────────────────────────────
describe('gerarEmailAlertasFazenda', () => {
  const APP_URL = 'https://gestsilo.com'
  const FAZENDA_NOME = 'Fazenda Santa Rita'

  it('email com 1 alerta contém nome da fazenda, contagem e link do dashboard', () => {
    const alertas: AlertaEmail[] = [
      { tipo: 'autonomia_silagem', detalhe: 'Silo com pouco estoque.' },
    ]
    const html = gerarEmailAlertasFazenda(FAZENDA_NOME, alertas, APP_URL)

    expect(html).toContain(FAZENDA_NOME)
    expect(html).toContain('1 alerta(s)')
    expect(html).toContain('⚠️')
    expect(html).toContain(`${APP_URL}/dashboard`)
  })

  it('email com múltiplos alertas mostra contagem correta', () => {
    const alertas: AlertaEmail[] = [
      { tipo: 'autonomia_silagem', detalhe: 'Alerta 1' },
      { tipo: 'perdas_silagem', detalhe: 'Alerta 2' },
      { tipo: 'ocupacao_vencida', detalhe: 'Alerta 3' },
    ]
    const html = gerarEmailAlertasFazenda(FAZENDA_NOME, alertas, APP_URL)

    expect(html).toContain('3 alerta(s)')
  })

  it('tipo autonomia_silagem tem título "Silagem com estoque baixo"', () => {
    const alertas: AlertaEmail[] = [
      { tipo: 'autonomia_silagem', detalhe: 'detalhe' },
    ]
    const html = gerarEmailAlertasFazenda(FAZENDA_NOME, alertas, APP_URL)
    expect(html).toContain('Silagem com estoque baixo')
  })

  it('CTA aponta para dashboard', () => {
    const alertas: AlertaEmail[] = [{ tipo: 'piquete_pronto', detalhe: 'detalhe' }]
    const html = gerarEmailAlertasFazenda(FAZENDA_NOME, alertas, APP_URL)
    expect(html).toContain(`${APP_URL}/dashboard`)
  })

  it('nome da fazenda aparece no rodapé', () => {
    const alertas: AlertaEmail[] = [{ tipo: 'perdas_silagem', detalhe: 'detalhe' }]
    const html = gerarEmailAlertasFazenda(FAZENDA_NOME, alertas, APP_URL)
    expect(html).toContain(`Administrador da fazenda ${FAZENDA_NOME}`)
  })
})
