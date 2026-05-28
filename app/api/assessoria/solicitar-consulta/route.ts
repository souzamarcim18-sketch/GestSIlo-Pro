import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { z } from 'zod';

const solicitarConsultaSchema = z.object({
  nome: z.string().min(1),
  fazenda: z.string().min(1),
  localizacao: z.string().min(1),
  telefone: z.string().min(1),
  email: z.string().email(),
  sugestao_dia: z.string().min(1),
  sugestao_horario: z.string().min(1),
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = solicitarConsultaSchema.safeParse({
      ...body,
      telefone: String(body.telefone || '').trim(),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const { nome, fazenda, localizacao, telefone, email, sugestao_dia, sugestao_horario } = parsed.data;

    console.log('[solicitar-consulta] Dados recebidos:', { nome, fazenda, localizacao, telefone, email, sugestao_dia, sugestao_horario });

    // Buscar fazenda_id do usuário
    const { data: minha_fazenda_id } = await client.rpc('get_minha_fazenda_id');

    // Enviar email ao consultor
    const consultorEmail = process.env.NEXT_PUBLIC_CONSULTOR_EMAIL || 'gestsilo.app@gmail.com';

    try {
      const emailResult = await resend.emails.send({
        from: 'GestSilo <noreply@gestsilo.com.br>',
        to: consultorEmail,
        subject: `Nova Solicitação de Consulta - ${nome}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #00c45a;">Nova Solicitação de Consulta Agronômica</h2>

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Dados do Solicitante:</h3>
              <p><strong>Nome:</strong> ${nome}</p>
              <p><strong>Fazenda:</strong> ${fazenda}</p>
              <p><strong>Localização:</strong> ${localizacao}</p>
              <p><strong>Telefone/WhatsApp:</strong> ${telefone}</p>
              <p><strong>Email:</strong> ${email}</p>

              <h3 style="color: #333;">Sugestão de Data e Hora:</h3>
              <p><strong>Data:</strong> ${sugestao_dia}</p>
              <p><strong>Horário:</strong> ${sugestao_horario}</p>
            </div>

            <p style="color: #888; font-size: 12px; margin-top: 30px;">
              Esta solicitação foi enviada através do sistema GestSilo.
            </p>
          </div>
        `,
      });
      console.log('[solicitar-consulta] Email enviado com sucesso:', emailResult);
    } catch (emailError) {
      console.error('[solicitar-consulta] Erro ao enviar email:', emailError);
    }

    // Criar registro em agendamentos_usuario para rastrear
    const dataAgendada = new Date(sugestao_dia + 'T' + sugestao_horario).toISOString();

    const observacoes = `Solicitação de consulta - ${nome} | Tel: ${telefone} | Email: ${email}`;

    console.log('[solicitar-consulta] Tentando inserir:', {
      fazenda_id: minha_fazenda_id || user.id,
      horario_disponivel_id: null,
      tipo: 'reuniao_video',
      data_agendada: dataAgendada,
      observacoes,
      status: 'solicitado',
    });

    const { data: agendamento, error } = await client
      .from('agendamentos_usuario')
      .insert({
        fazenda_id: minha_fazenda_id || user.id,
        horario_disponivel_id: null,
        tipo: 'reuniao_video',
        data_agendada: dataAgendada,
        observacoes: observacoes,
        status: 'solicitado',
        telefone: telefone,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar agendamento:', error);
      throw new Error(`Erro ao registrar solicitação: ${error.message}`);
    }

    return NextResponse.json(
      { message: 'Solicitação enviada com sucesso', data: agendamento },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { message: `Erro: ${errorMsg}` },
      { status: 500 }
    );
  }
}
