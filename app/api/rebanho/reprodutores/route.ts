import { NextRequest, NextResponse } from 'next/server';
import { queryReprodutores } from '@/lib/supabase/rebanho-reproducao';
import { sou_operador_ou_admin, getCurrentFazendaId } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    const podeAcessar = await sou_operador_ou_admin();
    if (!podeAcessar) {
      return NextResponse.json(
        { erro: 'Permissão insuficiente' },
        { status: 403 }
      );
    }

    const pagina = request.nextUrl.searchParams.get('pagina') || '1';
    const limite = request.nextUrl.searchParams.get('limite') || '100';

    const { dados, total } = await queryReprodutores.list(
      parseInt(pagina, 10),
      parseInt(limite, 10)
    );

    return NextResponse.json({
      dados,
      total,
      pagina: parseInt(pagina, 10),
      limite: parseInt(limite, 10),
    });
  } catch (error) {
    console.error('Erro ao buscar reprodutores:', error);
    return NextResponse.json(
      { erro: 'Erro ao buscar reprodutores' },
      { status: 500 }
    );
  }
}
