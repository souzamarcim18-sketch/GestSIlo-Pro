import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const fazendaId = request.nextUrl.searchParams.get('fazenda_id');

    if (!fazendaId) {
      return NextResponse.json(
        { error: 'fazenda_id é obrigatório' },
        { status: 400 }
      );
    }

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

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data, error } = await client
      .from('agendamentos_usuario')
      .select('id, fazenda_id, consultor_id, horario_disponivel_id, tipo, data_agendada, duracao_minutos, link_reuniao, observacoes, status, motivo_recusa, sugestao_nova_data, created_by, created_at, updated_at, deleted_at')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('data_agendada', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[GET /api/assessoria/agendamentos]', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

