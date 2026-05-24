import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { Database } from '@/types/supabase'
import { verificarAlertasFazenda, ResumoCronJob } from '@/lib/services/alertas-email'
import { gerarEmailAlertasFazenda } from '@/lib/email/templates/alertas-fazenda'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: fazendas, error } = await supabaseAdmin
    .from('fazendas')
    .select('id, nome')

  if (error || !fazendas) {
    console.error('[cron/alertas] Falha ao buscar fazendas:', error)
    return NextResponse.json({ error: 'Falha ao buscar fazendas' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gestsilo.com'

  const resultados = await Promise.allSettled(
    fazendas.map(async (fazenda) => {
      const alertas = await verificarAlertasFazenda(fazenda.id, supabaseAdmin)
      if (alertas.length === 0) return 'sem_alertas'

      const adminEmail = await buscarEmailAdmin(fazenda.id, supabaseAdmin)
      if (!adminEmail) {
        console.warn(`[cron/alertas] Fazenda ${fazenda.id} sem Admin cadastrado`)
        return 'sem_admin'
      }

      await resend.emails.send({
        from: 'GestSilo <noreply@gestsilo.com.br>',
        to: adminEmail,
        subject: `⚠️ GestSilo — ${alertas.length} alerta(s) na sua fazenda`,
        html: gerarEmailAlertasFazenda(fazenda.nome, alertas, appUrl),
      })
      return 'enviado'
    })
  )

  const contagem: ResumoCronJob = { enviados: 0, sem_alertas: 0, erros: 0 }

  for (const resultado of resultados) {
    if (resultado.status === 'rejected') {
      console.error('[cron/alertas] Falha em fazenda:', resultado.reason)
      contagem.erros++
    } else if (resultado.value === 'enviado') {
      contagem.enviados++
    } else {
      contagem.sem_alertas++
    }
  }

  return NextResponse.json(contagem, { status: 200 })
}

async function buscarEmailAdmin(
  fazendaId: string,
  supabase: ReturnType<typeof createClient<Database>>
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('fazenda_id', fazendaId)
    .eq('perfil', 'Administrador')
    .limit(1)
    .single()

  return data?.email ?? null
}
