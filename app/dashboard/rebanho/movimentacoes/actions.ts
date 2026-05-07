'use server';

import {
  registrarNascimento,
  registrarCompra,
  registrarVenda,
  registrarMorte,
  registrarDescarte,
  registrarAbateProprio,
  registrarTransferencia,
  type RegistrarNascimentoPayload,
  type RegistrarCompraPayload,
  type RegistrarVendaPayload,
  type RegistrarMortePayload,
  type RegistrarDescartePayload,
  type RegistrarAbatePropioPayload,
  type RegistrarTransferenciaPayload,
} from '@/lib/supabase/rebanho-movimentacoes';
import { getCurrentUserId } from '@/lib/auth/helpers';

interface MovimentacaoPayload {
  tipo: string;
  animal_id?: string;
  animal_ids?: string[];
  data_evento: string;
  fornecedor?: string;
  peso_entrada_kg?: number;
  valor_pago?: number;
  comprador?: string;
  peso_saida_kg?: number;
  valor_recebido?: number;
  causa_morte?: string;
  motivo_descarte?: string;
  peso_abate_kg?: number;
  rendimento_carcaca_pct?: number;
  lote_destino_id?: string;
  observacoes?: string;
}

export async function registrarMovimentacaoAction(payload: MovimentacaoPayload): Promise<{ success: boolean; error?: string }> {
  try {
    // Validar autenticação
    await getCurrentUserId();

    switch (payload.tipo) {
      case 'nascimento': {
        const p: RegistrarNascimentoPayload = {
          animal_id: payload.animal_id || '',
          data_evento: payload.data_evento,
          observacoes: payload.observacoes,
        };
        await registrarNascimento(p);
        return { success: true };
      }

      case 'compra': {
        const p: RegistrarCompraPayload = {
          animal_id: payload.animal_id || '',
          data_evento: payload.data_evento,
          fornecedor: payload.fornecedor || '',
          peso_entrada_kg: payload.peso_entrada_kg,
          valor_pago: payload.valor_pago,
          observacoes: payload.observacoes,
        };
        await registrarCompra(p);
        return { success: true };
      }

      case 'venda': {
        const p: RegistrarVendaPayload = {
          animal_ids: payload.animal_ids || [payload.animal_id || ''],
          data_evento: payload.data_evento,
          comprador: payload.comprador || '',
          peso_saida_kg: payload.peso_saida_kg,
          valor_recebido: payload.valor_recebido,
          observacoes: payload.observacoes,
        };
        await registrarVenda(p);
        return { success: true };
      }

      case 'morte': {
        const p: RegistrarMortePayload = {
          animal_id: payload.animal_id || '',
          data_evento: payload.data_evento,
          causa_morte: (payload.causa_morte || 'desconhecida') as any,
          observacoes: payload.observacoes,
        };
        await registrarMorte(p);
        return { success: true };
      }

      case 'descarte': {
        const p: RegistrarDescartePayload = {
          animal_id: payload.animal_id || '',
          data_evento: payload.data_evento,
          motivo_descarte: payload.motivo_descarte || '',
          observacoes: payload.observacoes,
        };
        await registrarDescarte(p);
        return { success: true };
      }

      case 'abate_proprio': {
        const p: RegistrarAbatePropioPayload = {
          animal_id: payload.animal_id || '',
          data_evento: payload.data_evento,
          peso_abate_kg: payload.peso_abate_kg || 0,
          rendimento_carcaca_pct: payload.rendimento_carcaca_pct,
          observacoes: payload.observacoes,
        };
        await registrarAbateProprio(p);
        return { success: true };
      }

      case 'transferencia_lote': {
        const p: RegistrarTransferenciaPayload = {
          animal_ids: payload.animal_ids || [payload.animal_id || ''],
          data_evento: payload.data_evento,
          lote_destino_id: payload.lote_destino_id || '',
          observacoes: payload.observacoes,
        };
        await registrarTransferencia(p);
        return { success: true };
      }

      default:
        return { success: false, error: 'Tipo de movimentação inválido' };
    }
  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar movimentação',
    };
  }
}
