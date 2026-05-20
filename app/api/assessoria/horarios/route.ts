import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const consultorId = request.nextUrl.searchParams.get('consultor_id');

    if (!consultorId) {
      return NextResponse.json(
        { error: 'consultor_id é obrigatório' },
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

    let query = client
      .from('horarios_disponiveis_consultor')
      .select('id, data_hora, duracao_minutos')
      .eq('consultor_id', consultorId)
      .eq('disponivel', true)
      .gte('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/assessoria/horarios]', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[GET /api/assessoria/horarios]', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
