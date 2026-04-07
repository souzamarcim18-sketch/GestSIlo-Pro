import { SupabaseClient } from '@supabase/supabase-js';

interface OfflineAction {
  tabela: 'movimentacoes_silo';
  payload: Record<string, any>;
  timestamp: number;
}

export function enqueue(action: OfflineAction) {
  if (typeof window === 'undefined') return;
  const queue: OfflineAction[] = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  queue.push(action);
  localStorage.setItem('offline_queue', JSON.stringify(queue));
}

export async function syncQueue(supabase: SupabaseClient) {
  if (typeof window === 'undefined') return;
  const queue: OfflineAction[] = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  if (queue.length === 0) return;

  console.log(`[OfflineQueue] Sincronizando ${queue.length} ações...`);
  
  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      const { error } = await supabase.from(action.tabela).insert(action.payload);
      if (error) {
        console.error(`[OfflineQueue] Erro ao sincronizar ação:`, error);
        remaining.push(action);
      }
    } catch (err) {
      console.error(`[OfflineQueue] Falha na rede durante sincronização:`, err);
      remaining.push(action);
    }
  }

  if (remaining.length === 0) {
    localStorage.removeItem('offline_queue');
  } else {
    localStorage.setItem('offline_queue', JSON.stringify(remaining));
  }
}
