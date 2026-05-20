import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

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
    const { nome, fazenda, localizacao, telefone, email, sugestao_dia, sugestao_horario, consultor_id } = body;

    // Validar campos obrigatórios
    if (!nome || !fazenda || !localizacao || !telefone || !email || !sugestao_dia || !sugestao_horario) {
      return NextResponse.json(
        { message: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }

    // Buscar dados do consultor para enviar email
    const { data: { user: consultorData } } = await client.auth.admin.getUserById(consultor_id);
    const consultorEmail = consultorData?.email || process.env.CONSULTOR_EMAIL || 'noreply@gestsilo.com.br';

    // Enviar email ao consultor
    await resend.emails.send({
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
            Esta solicitação foi enviada através do sistema GestSilo Pro.
          </p>
        </div>
      `,
    });

    // Criar registro em agendamentos_usuario para rastrear
    const { data: agendamento, error } = await client
      .from('agendamentos_usuario')
      .insert({
        fazenda_id: user.user_metadata?.fazenda_id || user.id,
        consultor_id,
        tipo: 'reuniao_video',
        data_agendada: new Date(sugestao_dia + 'T' + sugestao_horario).toISOString(),
        observacoes: `Solicitação de consulta - ${nome} (${telefone})`,
        status: 'solicitado',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar agendamento:', error);
    }

    return NextResponse.json(
      { message: 'Solicitação enviada com sucesso', data: agendamento },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    return NextResponse.json(
      { message: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
