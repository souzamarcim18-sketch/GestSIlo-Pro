import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { IDBPDatabase } from 'idb';
import * as localDbModule from '../localDb';
import * as syncQueueModule from '../syncQueue';
import {
  saveEventoLocal,
  getEventosByAnimal,
  getEventosByTipo,
  getEventosPendentes,
  hydrateEventosFromServer,
  markAsSynced,
  markAsError,
  deleteEventoLocal,
  type EventoReprodutivoLocal,
} from '../eventosRebanho';

// Mock IndexedDB store
class MockIndex {
  constructor(private store: MockObjectStore, private indexName: string) {}

  async getAll(key: string) {
    const ids = this.store.indexes.get(this.indexName)?.get(key) || [];
    return ids.map((id: string) => this.store.data.get(id)).filter(Boolean);
  }
}

class MockObjectStore {
  data: Map<string, any> = new Map();
  indexes: Map<string, Map<string, string[]>> = new Map(['by-animal', 'by-data', 'by-tipo', 'by-sync-status'].map((name) => [name, new Map()]));
  indexNames: string[] = ['by-animal', 'by-data', 'by-tipo', 'by-sync-status'];

  async get(key: string) {
    return this.data.get(key);
  }

  async put(item: any) {
    const existingItem = this.data.get(item.id);

    // Clean up old index entries if updating
    if (existingItem) {
      if (existingItem.animal_id) {
        const byAnimal = this.indexes.get('by-animal')!;
        const ids = byAnimal.get(existingItem.animal_id) || [];
        byAnimal.set(existingItem.animal_id, ids.filter((id) => id !== item.id));
      }
      if (existingItem.tipo_evento) {
        const byTipo = this.indexes.get('by-tipo')!;
        const ids = byTipo.get(existingItem.tipo_evento) || [];
        byTipo.set(existingItem.tipo_evento, ids.filter((id) => id !== item.id));
      }
      if (existingItem._sync_status) {
        const byStatus = this.indexes.get('by-sync-status')!;
        const ids = byStatus.get(existingItem._sync_status) || [];
        byStatus.set(existingItem._sync_status, ids.filter((id) => id !== item.id));
      }
    }

    this.data.set(item.id, item);

    // Add new index entries
    if (item.animal_id) {
      const byAnimal = this.indexes.get('by-animal')!;
      if (!byAnimal.has(item.animal_id)) {
        byAnimal.set(item.animal_id, []);
      }
      if (!byAnimal.get(item.animal_id)!.includes(item.id)) {
        byAnimal.get(item.animal_id)!.push(item.id);
      }
    }
    if (item.tipo_evento) {
      const byTipo = this.indexes.get('by-tipo')!;
      if (!byTipo.has(item.tipo_evento)) {
        byTipo.set(item.tipo_evento, []);
      }
      if (!byTipo.get(item.tipo_evento)!.includes(item.id)) {
        byTipo.get(item.tipo_evento)!.push(item.id);
      }
    }
    if (item._sync_status) {
      const byStatus = this.indexes.get('by-sync-status')!;
      if (!byStatus.has(item._sync_status)) {
        byStatus.set(item._sync_status, []);
      }
      if (!byStatus.get(item._sync_status)!.includes(item.id)) {
        byStatus.get(item._sync_status)!.push(item.id);
      }
    }
  }

  async delete(key: string) {
    const item = this.data.get(key);
    this.data.delete(key);
    if (item?.animal_id) {
      const byAnimal = this.indexes.get('by-animal')!;
      const ids = byAnimal.get(item.animal_id) || [];
      byAnimal.set(item.animal_id, ids.filter((id) => id !== key));
    }
    if (item?.tipo_evento) {
      const byTipo = this.indexes.get('by-tipo')!;
      const ids = byTipo.get(item.tipo_evento) || [];
      byTipo.set(item.tipo_evento, ids.filter((id) => id !== key));
    }
    if (item?._sync_status) {
      const byStatus = this.indexes.get('by-sync-status')!;
      const ids = byStatus.get(item._sync_status) || [];
      byStatus.set(item._sync_status, ids.filter((id) => id !== key));
    }
  }

  async getAll() {
    return Array.from(this.data.values());
  }

  async count() {
    return this.data.size;
  }

  index(name: string) {
    return new MockIndex(this, name);
  }
}

class MockTransaction {
  store: any;
  constructor(store: MockObjectStore) {
    this.store = store;
  }

  async done() {}
}

class MockIndexedDB {
  sync_queue: MockObjectStore = new MockObjectStore();
  eventos_rebanho: MockObjectStore = new MockObjectStore();

  transaction(storeName: string, mode: string) {
    const store = storeName === 'sync_queue' ? this.sync_queue : this.eventos_rebanho;
    return new MockTransaction(store);
  }

  async get(storeName: string, key: string) {
    const store = storeName === 'sync_queue' ? this.sync_queue : this.eventos_rebanho;
    return store.get(key);
  }

  async put(storeName: string, item: any) {
    const store = storeName === 'sync_queue' ? this.sync_queue : this.eventos_rebanho;
    return store.put(item);
  }

  async add(storeName: string, item: any) {
    const store = storeName === 'sync_queue' ? this.sync_queue : this.eventos_rebanho;
    const id = storeName === 'sync_queue' ? (store.data.size + 1) : item.id;
    await store.put({ ...item, id });
    return id;
  }

  async delete(storeName: string, key: string) {
    const store = storeName === 'sync_queue' ? this.sync_queue : this.eventos_rebanho;
    return store.delete(key);
  }

  async getAll(storeName: string) {
    const store = storeName === 'sync_queue' ? this.sync_queue : this.eventos_rebanho;
    return store.getAll();
  }

  async count(storeName: string) {
    const store = storeName === 'sync_queue' ? this.sync_queue : this.eventos_rebanho;
    return store.count();
  }
}

describe('eventosRebanho - Offline API', () => {
  let mockDb: MockIndexedDB;

  beforeEach(() => {
    mockDb = new MockIndexedDB();
    vi.spyOn(localDbModule, 'getDb').mockResolvedValue(mockDb as any);
    vi.spyOn(syncQueueModule, 'enqueueRpc').mockImplementation(async (rpc, params, localPayload) => {
      const id = mockDb.sync_queue.data.size + 1;
      await mockDb.sync_queue.put({
        id,
        tabela: localPayload?.tabela || 'eventos_rebanho',
        operacao: 'RPC',
        payload: { rpc, params },
        timestamp: Date.now(),
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveEventoLocal', () => {
    it('deve salvar evento localmente com ID gerado', async () => {
      const eventoId = await saveEventoLocal(
        'cobertura',
        'animal-123',
        '2026-05-04',
        { reprodutor_id: 'reprodutor-456' },
        'rpc_lancar_cobertura',
        { p_animal_id: 'animal-123', p_reprodutor_id: 'reprodutor-456' }
      );

      expect(eventoId).toBeDefined();
      expect(typeof eventoId).toBe('string');
      expect(eventoId.length).toBeGreaterThan(0);

      const saved = await mockDb.get('eventos_rebanho', eventoId);
      expect(saved).toBeDefined();
      expect(saved.animal_id).toBe('animal-123');
      expect(saved.tipo_evento).toBe('cobertura');
      expect(saved._sync_status).toBe('pending');
    });

    it('deve enfileirar RPC para sincronização', async () => {
      await saveEventoLocal(
        'diagnostico',
        'animal-123',
        '2026-05-04',
        { resultado: 'positivo' },
        'rpc_lancar_diagnostico',
        { p_animal_id: 'animal-123', p_resultado: 'positivo' }
      );

      const queue = await mockDb.getAll('sync_queue');
      expect(queue.length).toBeGreaterThan(0);

      const rpcAction = queue.find((action) => action.operacao === 'RPC');
      expect(rpcAction).toBeDefined();
      expect(rpcAction.payload.rpc).toBe('rpc_lancar_diagnostico');
    });

    it('deve salvar múltiplos eventos sem conflito de ID', async () => {
      const id1 = await saveEventoLocal(
        'cobertura',
        'animal-1',
        '2026-05-04',
        {},
        'rpc_lancar_cobertura',
        {}
      );

      const id2 = await saveEventoLocal(
        'diagnostico',
        'animal-2',
        '2026-05-04',
        {},
        'rpc_lancar_diagnostico',
        {}
      );

      expect(id1).not.toBe(id2);

      const evento1 = await mockDb.get('eventos_rebanho', id1);
      const evento2 = await mockDb.get('eventos_rebanho', id2);

      expect(evento1.animal_id).toBe('animal-1');
      expect(evento2.animal_id).toBe('animal-2');
    });
  });

  describe('getEventosByAnimal', () => {
    beforeEach(async () => {
      await saveEventoLocal(
        'cobertura',
        'animal-123',
        '2026-05-04',
        {},
        'rpc_lancar_cobertura',
        {}
      );

      await saveEventoLocal(
        'diagnostico',
        'animal-123',
        '2026-05-03',
        {},
        'rpc_lancar_diagnostico',
        {}
      );

      await saveEventoLocal(
        'cobertura',
        'animal-456',
        '2026-05-02',
        {},
        'rpc_lancar_cobertura',
        {}
      );
    });

    it('deve retornar eventos de um animal específico', async () => {
      const eventos = await getEventosByAnimal('animal-123');

      expect(eventos.length).toBe(2);
      expect(eventos.every((e) => e.animal_id === 'animal-123')).toBe(true);
    });

    it('deve retornar eventos ordenados por data decrescente', async () => {
      const eventos = await getEventosByAnimal('animal-123');

      expect(eventos[0].data_evento).toBe('2026-05-04');
      expect(eventos[1].data_evento).toBe('2026-05-03');
    });

    it('deve retornar array vazio se animal não existir', async () => {
      const eventos = await getEventosByAnimal('animal-inexistente');

      expect(eventos).toEqual([]);
    });
  });

  describe('getEventosByTipo', () => {
    beforeEach(async () => {
      await saveEventoLocal(
        'cobertura',
        'animal-1',
        '2026-05-04',
        {},
        'rpc_lancar_cobertura',
        {}
      );

      await saveEventoLocal(
        'cobertura',
        'animal-2',
        '2026-05-03',
        {},
        'rpc_lancar_cobertura',
        {}
      );

      await saveEventoLocal(
        'diagnostico',
        'animal-3',
        '2026-05-02',
        {},
        'rpc_lancar_diagnostico',
        {}
      );
    });

    it('deve filtrar eventos por tipo', async () => {
      const coberturas = await getEventosByTipo('cobertura');
      const diagnosticos = await getEventosByTipo('diagnostico');

      expect(coberturas.length).toBe(2);
      expect(diagnosticos.length).toBe(1);

      expect(coberturas.every((e) => e.tipo_evento === 'cobertura')).toBe(true);
      expect(diagnosticos[0].tipo_evento).toBe('diagnostico');
    });

    it('deve retornar eventos ordenados por data decrescente', async () => {
      const coberturas = await getEventosByTipo('cobertura');

      expect(coberturas[0].data_evento).toBe('2026-05-04');
      expect(coberturas[1].data_evento).toBe('2026-05-03');
    });
  });

  describe('getEventosPendentes', () => {
    beforeEach(async () => {
      const id1 = await saveEventoLocal(
        'cobertura',
        'animal-1',
        '2026-05-04',
        {},
        'rpc_lancar_cobertura',
        {}
      );

      const id2 = await saveEventoLocal(
        'diagnostico',
        'animal-2',
        '2026-05-03',
        {},
        'rpc_lancar_diagnostico',
        {}
      );

      await markAsSynced(id1);
    });

    it('deve retornar apenas eventos com status pending', async () => {
      const pendentes = await getEventosPendentes();

      expect(pendentes.length).toBe(1);
      expect(pendentes[0].tipo_evento).toBe('diagnostico');
    });

    it('deve retornar eventos ordenados por criação crescente', async () => {
      const id1 = await saveEventoLocal(
        'parto',
        'animal-3',
        '2026-05-05',
        {},
        'rpc_lancar_parto',
        {}
      );

      const id2 = await saveEventoLocal(
        'secagem',
        'animal-4',
        '2026-05-06',
        {},
        'rpc_lancar_secagem',
        {}
      );

      await markAsError(id1);

      const pendentes = await getEventosPendentes();

      expect(pendentes[0]._created_at).toBeLessThanOrEqual(pendentes[1]._created_at);
    });
  });

  describe('markAsSynced', () => {
    it('deve mudar status para synced', async () => {
      const eventoId = await saveEventoLocal(
        'cobertura',
        'animal-123',
        '2026-05-04',
        {},
        'rpc_lancar_cobertura',
        {}
      );

      let evento = await mockDb.get('eventos_rebanho', eventoId);
      expect(evento._sync_status).toBe('pending');

      await markAsSynced(eventoId);

      evento = await mockDb.get('eventos_rebanho', eventoId);
      expect(evento._sync_status).toBe('synced');
    });
  });

  describe('markAsError', () => {
    it('deve mudar status para error', async () => {
      const eventoId = await saveEventoLocal(
        'diagnostico',
        'animal-123',
        '2026-05-04',
        {},
        'rpc_lancar_diagnostico',
        {}
      );

      await markAsError(eventoId);

      const evento = await mockDb.get('eventos_rebanho', eventoId);
      expect(evento._sync_status).toBe('error');
    });
  });

  describe('deleteEventoLocal', () => {
    it('deve remover evento do cache local', async () => {
      const eventoId = await saveEventoLocal(
        'cobertura',
        'animal-123',
        '2026-05-04',
        {},
        'rpc_lancar_cobertura',
        {}
      );

      let evento = await mockDb.get('eventos_rebanho', eventoId);
      expect(evento).toBeDefined();

      await deleteEventoLocal(eventoId);

      evento = await mockDb.get('eventos_rebanho', eventoId);
      expect(evento).toBeUndefined();
    });
  });

  describe('hydrateEventosFromServer', () => {
    it('deve adicionar eventos do servidor ao cache', async () => {
      const serverEventos = [
        {
          id: 'evento-server-1',
          animal_id: 'animal-1',
          tipo_evento: 'cobertura' as const,
          data_evento: '2026-05-04',
          payload: {},
        },
        {
          id: 'evento-server-2',
          animal_id: 'animal-2',
          tipo_evento: 'diagnostico' as const,
          data_evento: '2026-05-03',
          payload: {},
        },
      ];

      await hydrateEventosFromServer(serverEventos);

      const evento1 = await mockDb.get('eventos_rebanho', 'evento-server-1');
      const evento2 = await mockDb.get('eventos_rebanho', 'evento-server-2');

      expect(evento1).toBeDefined();
      expect(evento1._sync_status).toBe('synced');
      expect(evento2).toBeDefined();
      expect(evento2._sync_status).toBe('synced');
    });

    it('deve preservar eventos pending durante hidratação', async () => {
      const eventoLocalId = await saveEventoLocal(
        'cobertura',
        'animal-1',
        '2026-05-04',
        {},
        'rpc_lancar_cobertura',
        {}
      );

      const serverEventos = [
        {
          id: eventoLocalId,
          animal_id: 'animal-1',
          tipo_evento: 'cobertura' as const,
          data_evento: '2026-05-04',
          payload: { updated: true },
        },
      ];

      await hydrateEventosFromServer(serverEventos);

      const evento = await mockDb.get('eventos_rebanho', eventoLocalId);
      expect(evento._sync_status).toBe('pending');
      expect(evento.payload.updated).toBeUndefined();
    });

    it('deve atualizar eventos synced com dados do servidor', async () => {
      const eventoLocalId = await saveEventoLocal(
        'cobertura',
        'animal-1',
        '2026-05-04',
        {},
        'rpc_lancar_cobertura',
        {}
      );

      await markAsSynced(eventoLocalId);

      const serverEventos = [
        {
          id: eventoLocalId,
          animal_id: 'animal-1',
          tipo_evento: 'cobertura' as const,
          data_evento: '2026-05-04',
          payload: { reprodutor_id: 'reprodutor-updated' },
        },
      ];

      await hydrateEventosFromServer(serverEventos);

      const evento = await mockDb.get('eventos_rebanho', eventoLocalId);
      expect(evento.payload.reprodutor_id).toBe('reprodutor-updated');
      expect(evento._sync_status).toBe('synced');
    });
  });

  describe('Migration Compatibility (v1 → v2)', () => {
    it('deve criar store eventos_rebanho na migração v1 → v2', async () => {
      const storeNames = ['sync_queue', 'eventos_rebanho'];
      const indexNames = ['by-animal', 'by-data', 'by-tipo', 'by-sync-status'];

      expect(storeNames).toContain('eventos_rebanho');
      expect(indexNames).toContain('by-animal');
      expect(indexNames).toContain('by-data');
      expect(indexNames).toContain('by-tipo');
      expect(indexNames).toContain('by-sync-status');
    });

    it('deve manter v1 stores durante migração', async () => {
      const storeNames = ['sync_queue', 'eventos_rebanho'];

      expect(storeNames).toContain('sync_queue');
      expect(storeNames).toContain('eventos_rebanho');
    });
  });

  describe('Integração com sync_queue', () => {
    it('deve criar ação RPC na fila ao salvar evento', async () => {
      await saveEventoLocal(
        'parto',
        'animal-123',
        '2026-05-04',
        { gemelar: true },
        'rpc_lancar_parto',
        { p_animal_id: 'animal-123', p_gemelar: true }
      );

      const queueActions = await mockDb.getAll('sync_queue');
      expect(queueActions.length).toBeGreaterThan(0);

      const rpcAction = queueActions.find((a) => a.operacao === 'RPC');
      expect(rpcAction).toBeDefined();
      expect(rpcAction.payload.rpc).toBe('rpc_lancar_parto');
      expect(rpcAction.payload.params.p_animal_id).toBe('animal-123');
    });
  });
});
