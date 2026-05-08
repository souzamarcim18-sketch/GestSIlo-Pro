import { getDb } from './localDb';
import { enqueueRpc } from './syncQueue';

export interface EventoReprodutivoLocal {
  id: string;
  animal_id: string;
  tipo_evento: 'cobertura' | 'diagnostico' | 'parto' | 'desmame' | 'secagem' | 'aborto' | 'descarte';
  data_evento: string;
  payload: Record<string, any>;
  _sync_status: 'pending' | 'synced' | 'error' | 'pendente_revisao';
  _created_at: number;
  _conflict_motivo?: string;
}

// Salva um evento reprodutivo localmente com otimismo de UI
// e enfileira para sincronização via RPC quando online
export async function saveEventoLocal(
  tipoEvento: 'cobertura' | 'diagnostico' | 'parto' | 'desmame' | 'secagem' | 'aborto' | 'descarte',
  animalId: string,
  dataEvento: string,
  payload: Record<string, any>,
  rpcName: string,
  rpcParams: Record<string, any>
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('IndexedDB não disponível');

  const eventoId = crypto.randomUUID();
  const now = Date.now();

  const evento: EventoReprodutivoLocal = {
    id: eventoId,
    animal_id: animalId,
    tipo_evento: tipoEvento,
    data_evento: dataEvento,
    payload,
    _sync_status: 'pending',
    _created_at: now,
  };

  // 1. Salva localmente para otimismo da UI
  await db.put('eventos_rebanho', evento);

  // 2. Enfileira RPC para sincronização quando online
  await enqueueRpc(rpcName, rpcParams, {
    tabela: 'eventos_rebanho',
    data: evento,
  });

  return eventoId;
}

// Recupera eventos de um animal específico do cache local
export async function getEventosByAnimal(animalId: string): Promise<EventoReprodutivoLocal[]> {
  const db = await getDb();
  if (!db) return [];

  const tx = db.transaction('eventos_rebanho', 'readonly');
  const index = tx.store.index('by-animal');
  const eventos = await index.getAll(animalId);

  return eventos.sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());
}

// Recupera eventos por tipo
export async function getEventosByTipo(
  tipoEvento: 'cobertura' | 'diagnostico' | 'parto' | 'desmame' | 'secagem'
): Promise<EventoReprodutivoLocal[]> {
  const db = await getDb();
  if (!db) return [];

  const tx = db.transaction('eventos_rebanho', 'readonly');
  const index = tx.store.index('by-tipo');
  const eventos = await index.getAll(tipoEvento);

  return eventos.sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());
}

// Recupera eventos que ainda estão pendentes de sincronização
export async function getEventosPendentes(): Promise<EventoReprodutivoLocal[]> {
  const db = await getDb();
  if (!db) return [];

  const tx = db.transaction('eventos_rebanho', 'readonly');
  const index = tx.store.index('by-sync-status');
  const eventos = await index.getAll('pending');

  return eventos.sort((a, b) => a._created_at - b._created_at);
}

// Sincroniza eventos do servidor para o cache local
// Sobrescreve eventos synced, preserva pending
export async function hydrateEventosFromServer(
  serverEventos: Array<Omit<EventoReprodutivoLocal, '_sync_status' | '_created_at'> & { id: string }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const tx = db.transaction('eventos_rebanho', 'readwrite');

  for (const serverEvento of serverEventos) {
    // Verificar se existe localmente
    const existente = await tx.store.get(serverEvento.id);

    // Se não existe ou está synced, atualizar com dados do servidor
    if (!existente || existente._sync_status === 'synced') {
      const now = Date.now();
      await tx.store.put({
        ...serverEvento,
        _sync_status: 'synced',
        _created_at: existente?._created_at || now,
      });
    }
    // Se está pending ou error, deixar como está (dados locais têm prioridade)
  }

  await tx.done;
}

// Marca um evento como sincronizado após sucesso no servidor
export async function markAsSynced(eventoId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const evento = await db.get('eventos_rebanho', eventoId);
  if (evento) {
    await db.put('eventos_rebanho', {
      ...evento,
      _sync_status: 'synced',
    });
  }
}

// Marca um evento como erro durante sincronização
export async function markAsError(eventoId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const evento = await db.get('eventos_rebanho', eventoId);
  if (evento) {
    await db.put('eventos_rebanho', {
      ...evento,
      _sync_status: 'error',
    });
  }
}

// Remove um evento do cache local
export async function deleteEventoLocal(eventoId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete('eventos_rebanho', eventoId);
}

// Recupera TODOS os eventos locais com status de sincronização
export async function getAllEventosLocais(): Promise<EventoReprodutivoLocal[]> {
  const db = await getDb();
  if (!db) return [];

  const tx = db.transaction('eventos_rebanho', 'readonly');
  const eventos = await tx.store.getAll();

  return eventos.sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());
}
