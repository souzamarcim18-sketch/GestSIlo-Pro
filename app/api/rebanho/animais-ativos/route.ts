import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Animal } from '@/lib/types/rebanho';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('animais')
      .select(
        'id, brinco, sexo, categoria, peso_atual, data_nascimento, lote_id'
      )
      .eq('status', 'Ativo')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json(
        { error: 'Failed to fetch animals' },
        { status: 500 }
      );
    }

    const animais = data as Pick<
      Animal,
      'id' | 'brinco' | 'sexo' | 'categoria' | 'peso_atual' | 'data_nascimento' | 'lote_id'
    >[];

    return Response.json({
      animais,
      total: animais.length,
    });
  } catch (error) {
    console.error('Error in GET /api/rebanho/animais-ativos:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
