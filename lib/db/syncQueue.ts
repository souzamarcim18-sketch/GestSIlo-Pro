import { SupabaseClient } from '@supabase/supabase-js';
import { getDb } from './localDb';

export type TableName =
  | 'movimentacoes_silo'
  | 'atividades_campo'
  | 'movimentacoes_insumo'
  | 'financeiro'
  | 'uso_maquinas'
  | 'abastecimentos'
  | 'eventos_rebanho';

export type Operation = 'INSERT' | 'UPDATE' | 'DELETE';

export async function enqueue(tabela: TableName, operacao: Operation, payload: any) {
  const db = await getDb();
  if (!db) return;

  const timestamp = Date.now();

  // Salva na fila de sincronização
  await db.add('sync_queue', {
    tabela,
    operacao,
    payload,
    timestamp,
  });

  // Opcional: Atualiza o cache local imediatamente para que o usuário veja a mudança
  if (operacao === 'INSERT' && payload.id) {
    await db.put(tabela, payload);
  } else if (operacao === 'DELETE' && payload.id) {
    await db.delete(tabela, payload.id);
  } else if (operacao === 'UPDATE' && payload.id) {
    await db.put(tabela, payload);
  }
}

export async function enqueueRpc(
  rpcName: string,
  params: Record<string, any>,
  localPayload?: { tabela: 'eventos_rebanho'; data: any }
) {
  const db = await getDb();
  if (!db) return;

  const timestamp = Date.now();

  // Salva na fila de sincronização com operacao='RPC'
  await db.add('sync_queue', {
    tabela: localPayload?.tabela || 'eventos_rebanho',
    operacao: 'RPC',
    payload: {
      rpc: rpcName,
      params,
    },
    timestamp,
  });

  // Se houver payload local, salva no cache para otimismo da UI
  if (localPayload?.data && localPayload.data.id) {
    await db.put(localPayload.tabela, localPayload.data);
  }
}

async function detectarConflito(
  supabase: SupabaseClient,
  tabela: string,
  payload: any
): Promise<{ conflito: boolean; motivo?: string }> {
  if (tabela !== 'eventos_rebanho') return { conflito: false };

  const animalId = payload?.animal_id;
  if (!animalId) return { conflito: false };

  try {
    const { data } = await supabase
      .from('animais')
      .select('id, status')
      .eq('id', animalId)
      .single();

    if (data?.status && ['Morto', 'Vendido'].includes(data.status)) {
      return { conflito: true, motivo: `animal_${data.status.toLowerCase()}` };
    }
  } catch (err) {
    // Em caso de erro ao buscar animal, considerar como sem conflito
  }

  return { conflito: false };
}

export async function syncAll(supabase: SupabaseClient): Promise<{ sincronizados: number; conflitos: number }> {
  const db = await getDb();
  if (!db) return { sincronizados: 0, conflitos: 0 };

  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const actions = await store.getAll();

  if (actions.length === 0) return { sincronizados: 0, conflitos: 0 };

  if (process.env.NODE_ENV === 'development') {
    console.log(`[SyncQueue] Sincronizando ${actions.length} ações pendentes...`);
  }

  let sincronizados = 0;
  let conflitos = 0;

  for (const action of actions) {
    try {
      // Verificar conflitos para eventos_rebanho
      const conflito = await detectarConflito(supabase, action.tabela, action.payload);

      if (conflito.conflito) {
        // Marcar evento como pendente_revisao no IndexedDB (eventos_rebanho cache)
        if (action.tabela === 'eventos_rebanho') {
          try {
            const eventoId = action.payload?.id;
            if (eventoId) {
              const evento = await db.get('eventos_rebanho', eventoId);
              if (evento) {
                evento._sync_status = 'pendente_revisao';
                evento._conflict_motivo = conflito.motivo;
                await db.put('eventos_rebanho', evento);
              }
            }
          } catch (err) {
            if (process.env.NODE_ENV === 'development') {
              console.error('[SyncQueue] Erro ao marcar conflito em eventos_rebanho:', err);
            }
          }
        }
        conflitos++;
        // Remove da fila sem tentar enviar
        await db.delete('sync_queue', action.id!);
        continue;
      }

      let result;

      if (action.operacao === 'INSERT') {
        result = await supabase.from(action.tabela).insert(action.payload);
      } else if (action.operacao === 'UPDATE') {
        // Assume que o payload tem o ID para o filtro
        const { id, ...data } = action.payload;
        result = await supabase.from(action.tabela).update(data).eq('id', id);
      } else if (action.operacao === 'DELETE') {
        result = await supabase.from(action.tabela).delete().eq('id', action.payload.id);
      } else if (action.operacao === 'RPC') {
        const { rpc, params } = action.payload;
        result = await supabase.rpc(rpc, params);
      }

      if (result?.error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[SyncQueue] Erro ao sincronizar ${action.tabela}:`, result.error);
        }
      } else {
        // Sucesso, remove da fila
        await db.delete('sync_queue', action.id!);
        sincronizados++;
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[SyncQueue] Falha na rede durante sincronização de ${action.tabela}:`, err);
      }
      // Mantém na fila para tentar novamente depois
      break;
    }
  }

  return { sincronizados, conflitos };
}

export async function getSyncStatus() {
  const db = await getDb();
  if (!db) return { pendentes: 0 };

  const count = await db.count('sync_queue');
  return { pendentes: count };
}

export async function getSyncConflitos() {
  const db = await getDb();
  if (!db) return [];

  const conflitos = await db.getAllFromIndex('eventos_rebanho', 'by-sync-status', 'pendente_revisao');
  return conflitos || [];
}
