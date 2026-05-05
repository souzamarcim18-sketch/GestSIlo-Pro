import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const ANIMAL_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENTO_ID_1 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EVENTO_ID_2 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EVENTO_ID_3 = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

if (typeof globalThis !== 'undefined' && !globalThis.crypto?.randomUUID) {
  if (!globalThis.crypto) {
    (globalThis as any).crypto = {};
  }
  globalThis.crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

describe('Rebanho Reprodução — Offline Sync', () => {
  let mockSupabase: any;
  let enqueue: any;
  let enqueueRpc: any;
  let syncAll: any;
  let getDb: any;
  let saveEventoLocal: any;
  let getEventosByAnimal: any;
  let getEventosByTipo: any;
  let getEventosPendentes: any;
  let getAllEventosLocais: any;
  let hydrateEventosFromServer: any;
  let markAsSynced: any;
  let markAsError: any;
  let deleteEventoLocal: any;

  beforeEach(async () => {
    // Importar dinamicamente se ainda não estiver feito
    if (!enqueue) {
      const syncQueue = await import('../../../lib/db/syncQueue');
      const localDb = await import('../../../lib/db/localDb');
      const eventosRb = await import('../../../lib/db/eventosRebanho');

      enqueue = syncQueue.enqueue;
      enqueueRpc = syncQueue.enqueueRpc;
      syncAll = syncQueue.syncAll;
      getDb = localDb.getDb;
      saveEventoLocal = eventosRb.saveEventoLocal;
      getEventosByAnimal = eventosRb.getEventosByAnimal;
      getEventosByTipo = eventosRb.getEventosByTipo;
      getEventosPendentes = eventosRb.getEventosPendentes;
      getAllEventosLocais = eventosRb.getAllEventosLocais;
      hydrateEventosFromServer = eventosRb.hydrateEventosFromServer;
      markAsSynced = eventosRb.markAsSynced;
      markAsError = eventosRb.markAsError;
      deleteEventoLocal = eventosRb.deleteEventoLocal;
    }

    // Limpar database manualmente
    const db = await getDb();
    if (db) {
      const tx = db.transaction(['sync_queue', 'eventos_rebanho'], 'readwrite');
      await Promise.all([tx.objectStore('sync_queue').clear(), tx.objectStore('eventos_rebanho').clear()]);
      await tx.done;
    }

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: { id: EVENTO_ID_1 }, error: null }),
        update: vi.fn().mockResolvedValue({ data: { id: EVENTO_ID_1 }, error: null }),
        delete: vi.fn().mockResolvedValue({ data: null, error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: ANIMAL_ID, status: 'Ativo' },
              error: null,
            }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [{ evento_id: EVENTO_ID_1, bezerros_criados: 1 }],
        error: null,
      }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Enfileiramento Offline', () => {
    it('enqueue() → INSERT na sync_queue, salva no cache local, sem chamar Supabase', async () => {
      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura',
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending',
        _created_at: Date.now(),
      });

      const db = await getDb();
      const queue = await db.getAll('sync_queue');

      expect(queue.length).toBe(1);
      expect(queue[0].tabela).toBe('eventos_rebanho');
      expect(queue[0].operacao).toBe('INSERT');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('enqueue() com UPDATE → atualiza cache e enfileira', async () => {
      await enqueue('eventos_rebanho', 'UPDATE', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        observacoes: 'Nova observação',
      });

      const db = await getDb();
      const queue = await db.getAll('sync_queue');

      expect(queue.length).toBe(1);
      expect(queue[0].operacao).toBe('UPDATE');
    });

    it('enqueue() com DELETE → marca para exclusão na fila', async () => {
      await enqueue('eventos_rebanho', 'DELETE', {
        id: EVENTO_ID_1,
      });

      const db = await getDb();
      const queue = await db.getAll('sync_queue');

      expect(queue.length).toBe(1);
      expect(queue[0].operacao).toBe('DELETE');
    });

    it('enqueueRpc() → salva com operacao=RPC e localPayload no cache', async () => {
      const eventoLocal = {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'parto' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      };

      await enqueueRpc('rpc_lancar_parto', { p_animal_id: ANIMAL_ID }, {
        tabela: 'eventos_rebanho',
        data: eventoLocal,
      });

      const db = await getDb();
      const queue = await db.getAll('sync_queue');

      expect(queue.length).toBe(1);
      expect(queue[0].operacao).toBe('RPC');
      expect(queue[0].payload.rpc).toBe('rpc_lancar_parto');

      const cached = await db.get('eventos_rebanho', EVENTO_ID_1);
      expect(cached).toBeDefined();
      expect(cached.animal_id).toBe(ANIMAL_ID);
    });

    it('saveEventoLocal() → cria evento com _sync_status=pending, retorna UUID, enfileira RPC', async () => {
      const eventoId = await saveEventoLocal(
        'cobertura',
        ANIMAL_ID,
        '2026-05-01',
        { observacoes: 'Teste' },
        'rpc_registrar_cobertura',
        { p_animal_id: ANIMAL_ID, p_data: '2026-05-01' }
      );

      expect(eventoId).toBeDefined();
      expect(typeof eventoId).toBe('string');

      const db = await getDb();
      const evento = await db.get('eventos_rebanho', eventoId);

      expect(evento).toBeDefined();
      expect(evento._sync_status).toBe('pending');
      expect(evento.animal_id).toBe(ANIMAL_ID);
      expect(evento.tipo_evento).toBe('cobertura');

      const queue = await db.getAll('sync_queue');
      expect(queue.length).toBe(1);
      expect(queue[0].operacao).toBe('RPC');
    });
  });

  describe('Sincronização ao Reconectar', () => {
    it('syncAll() com 3 eventos → processa fila, retorna {sincronizados:3, conflitos:0}', async () => {
      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura',
        data_evento: '2026-05-01',
        payload: {},
      });

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID,
        tipo_evento: 'diagnostico',
        data_evento: '2026-05-05',
        payload: {},
      });

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_3,
        animal_id: ANIMAL_ID,
        tipo_evento: 'parto',
        data_evento: '2026-05-10',
        payload: {},
      });

      const db = await getDb();
      expect(await db.count('sync_queue')).toBe(3);

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        update: vi.fn().mockResolvedValue({ data: {}, error: null }),
        delete: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await syncAll(mockSupabase);

      expect(result.sincronizados).toBe(3);
      expect(result.conflitos).toBe(0);
      expect(await db.count('sync_queue')).toBe(0);
    });

    it('syncAll() com fila vazia → retorna {sincronizados:0, conflitos:0}', async () => {
      const result = await syncAll(mockSupabase);

      expect(result.sincronizados).toBe(0);
      expect(result.conflitos).toBe(0);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('syncAll() processa UPDATE e DELETE além de INSERT', async () => {
      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura',
        data_evento: '2026-05-01',
        payload: {},
      });

      await enqueue('eventos_rebanho', 'UPDATE', {
        id: EVENTO_ID_2,
        observacoes: 'Atualizado',
      });

      await enqueue('eventos_rebanho', 'DELETE', {
        id: EVENTO_ID_3,
      });

      const db = await getDb();

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      });

      const result = await syncAll(mockSupabase);

      expect(result.sincronizados).toBe(3);
      expect(await db.count('sync_queue')).toBe(0);
    });

    it('syncAll() processa RPC da fila', async () => {
      await enqueueRpc('rpc_lancar_parto', { p_animal_id: ANIMAL_ID, p_data: '2026-05-01' });

      mockSupabase.rpc.mockResolvedValue({
        data: { resultado: 'sucesso' },
        error: null,
      });

      const result = await syncAll(mockSupabase);

      expect(result.sincronizados).toBe(1);

      const db = await getDb();
      expect(await db.count('sync_queue')).toBe(0);
    });
  });

  describe('Conflito Animal Morto', () => {
    it('Fila tem evento, detectarConflito retorna animal_morto → marca pendente_revisao', async () => {
      const db = await getDb();
      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura',
        data_evento: '2026-05-01',
        payload: {},
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: ANIMAL_ID, status: 'Morto' },
              error: null,
            }),
          }),
        }),
      });

      const result = await syncAll(mockSupabase);

      expect(result.conflitos).toBe(1);
      expect(result.sincronizados).toBe(0);

      const evento = await db.get('eventos_rebanho', EVENTO_ID_1);
      expect(evento._sync_status).toBe('pendente_revisao');
      expect(evento._conflict_motivo).toBe('animal_morto');
      expect(await db.count('sync_queue')).toBe(0);
    });

    it('Fila tem evento, animal status Vendido → marca conflito com motivo animal_vendido', async () => {
      const db = await getDb();
      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura',
        data_evento: '2026-05-01',
        payload: {},
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: ANIMAL_ID, status: 'Vendido' },
              error: null,
            }),
          }),
        }),
      });

      const result = await syncAll(mockSupabase);

      expect(result.conflitos).toBe(1);

      const evento = await db.get('eventos_rebanho', EVENTO_ID_1);
      expect(evento._conflict_motivo).toBe('animal_vendido');
    });

    it('Fila tem evento, animal Ativo → sincroniza normalmente sem conflito', async () => {
      const db = await getDb();
      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura',
        data_evento: '2026-05-01',
        payload: {},
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: ANIMAL_ID, status: 'Ativo' },
              error: null,
            }),
          }),
        }),
      });

      const result = await syncAll(mockSupabase);

      expect(result.sincronizados).toBe(1);
      expect(result.conflitos).toBe(0);

      const evento = await db.get('eventos_rebanho', EVENTO_ID_1);
      expect(evento._sync_status).not.toBe('pendente_revisao');
    });
  });

  describe('Resolução Manual via UI', () => {
    it('markAsError() → marca evento como error', async () => {
      const db = await getDb();
      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await markAsError(EVENTO_ID_1);

      const evento = await db.get('eventos_rebanho', EVENTO_ID_1);
      expect(evento._sync_status).toBe('error');
    });

    it('markAsSynced() → marca evento como synced', async () => {
      const db = await getDb();
      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await markAsSynced(EVENTO_ID_1);

      const evento = await db.get('eventos_rebanho', EVENTO_ID_1);
      expect(evento._sync_status).toBe('synced');
    });

    it('deleteEventoLocal() → remove evento do cache', async () => {
      const db = await getDb();
      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      expect(await db.get('eventos_rebanho', EVENTO_ID_1)).toBeDefined();

      await deleteEventoLocal(EVENTO_ID_1);

      expect(await db.get('eventos_rebanho', EVENTO_ID_1)).toBeUndefined();
    });

    it('hydrateEventosFromServer() preserva pending, sobrescreve synced', async () => {
      const db = await getDb();

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: { v: 1 },
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID,
        tipo_evento: 'diagnostico' as const,
        data_evento: '2026-05-05',
        payload: { v: 1 },
        _sync_status: 'synced' as const,
        _created_at: Date.now(),
      });

      const serverEventos = [
        {
          id: EVENTO_ID_1,
          animal_id: ANIMAL_ID,
          tipo_evento: 'cobertura' as const,
          data_evento: '2026-05-01',
          payload: { v: 2, atualizado: true },
        },
        {
          id: EVENTO_ID_2,
          animal_id: ANIMAL_ID,
          tipo_evento: 'diagnostico' as const,
          data_evento: '2026-05-05',
          payload: { v: 2, atualizado: true },
        },
        {
          id: EVENTO_ID_3,
          animal_id: ANIMAL_ID,
          tipo_evento: 'parto' as const,
          data_evento: '2026-05-10',
          payload: { novo: true },
        },
      ];

      await hydrateEventosFromServer(serverEventos);

      const evt1 = await db.get('eventos_rebanho', EVENTO_ID_1);
      expect(evt1._sync_status).toBe('pending');
      expect(evt1.payload.v).toBe(1);

      const evt2 = await db.get('eventos_rebanho', EVENTO_ID_2);
      expect(evt2._sync_status).toBe('synced');
      expect(evt2.payload.v).toBe(2);

      const evt3 = await db.get('eventos_rebanho', EVENTO_ID_3);
      expect(evt3).toBeDefined();
      expect(evt3.payload.novo).toBe(true);
    });
  });

  describe('Queries de Filtro', () => {
    it('getEventosByAnimal() retorna eventos de um animal, ordenados por data DESC', async () => {
      const db = await getDb();

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID,
        tipo_evento: 'diagnostico' as const,
        data_evento: '2026-05-10',
        payload: {},
        _sync_status: 'synced' as const,
        _created_at: Date.now(),
      });

      const eventos = await getEventosByAnimal(ANIMAL_ID);

      expect(eventos.length).toBe(2);
      expect(eventos[0].data_evento).toBe('2026-05-10');
      expect(eventos[1].data_evento).toBe('2026-05-01');
    });

    it('getEventosByTipo() retorna eventos de um tipo específico', async () => {
      const db = await getDb();

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-05',
        payload: {},
        _sync_status: 'synced' as const,
        _created_at: Date.now(),
      });

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_3,
        animal_id: ANIMAL_ID,
        tipo_evento: 'diagnostico' as const,
        data_evento: '2026-05-10',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      const coberturas = await getEventosByTipo('cobertura');

      expect(coberturas.length).toBe(2);
      expect(coberturas.every((e) => e.tipo_evento === 'cobertura')).toBe(true);
    });

    it('getEventosPendentes() retorna eventos com _sync_status=pending', async () => {
      const db = await getDb();

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID,
        tipo_evento: 'diagnostico' as const,
        data_evento: '2026-05-05',
        payload: {},
        _sync_status: 'synced' as const,
        _created_at: Date.now(),
      });

      const pendentes = await getEventosPendentes();

      expect(pendentes.length).toBe(1);
      expect(pendentes[0].id).toBe(EVENTO_ID_1);
    });

    it('getAllEventosLocais() retorna todos eventos, ordenados por data DESC', async () => {
      const db = await getDb();

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID,
        tipo_evento: 'diagnostico' as const,
        data_evento: '2026-05-10',
        payload: {},
        _sync_status: 'synced' as const,
        _created_at: Date.now(),
      });

      const todos = await getAllEventosLocais();

      expect(todos.length).toBe(2);
      expect(todos[0].data_evento).toBe('2026-05-10');
      expect(todos[1].data_evento).toBe('2026-05-01');
    });
  });

  describe('Idempotência', () => {
    it('Eventos com IDs diferentes são mantidos separados', async () => {
      const db = await getDb();

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID,
        tipo_evento: 'diagnostico' as const,
        data_evento: '2026-05-05',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      const evt1 = await db.get('eventos_rebanho', EVENTO_ID_1);
      const evt2 = await db.get('eventos_rebanho', EVENTO_ID_2);

      expect(evt1.id).not.toBe(evt2.id);
      expect(evt1.tipo_evento).toBe('cobertura');
      expect(evt2.tipo_evento).toBe('diagnostico');
    });

    it('Atualizar evento com mesmo ID sobrescreve a versão anterior', async () => {
      const db = await getDb();

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: { observacoes: 'v1' },
        _sync_status: 'pending' as const,
        _created_at: 1000,
      });

      let evt = await db.get('eventos_rebanho', EVENTO_ID_1);
      expect(evt.payload.observacoes).toBe('v1');

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: { observacoes: 'v2 atualizado' },
        _sync_status: 'pending' as const,
        _created_at: 1000,
      });

      evt = await db.get('eventos_rebanho', EVENTO_ID_1);
      expect(evt.payload.observacoes).toBe('v2 atualizado');
    });

    it('Fila com mesmo tipo de operação múltiplas vezes mantém todas', async () => {
      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura',
        data_evento: '2026-05-01',
        payload: {},
      });

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID,
        tipo_evento: 'diagnostico',
        data_evento: '2026-05-05',
        payload: {},
      });

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_3,
        animal_id: ANIMAL_ID,
        tipo_evento: 'parto',
        data_evento: '2026-05-10',
        payload: {},
      });

      const db = await getDb();
      const queue = await db.getAll('sync_queue');

      expect(queue.length).toBe(3);
      expect(queue.every((q) => q.operacao === 'INSERT')).toBe(true);
    });
  });

  describe('Múltiplos Eventos em Fila', () => {
    it('Fila com mix de INSERT/UPDATE/DELETE → processa todos em ordem', async () => {
      const db = await getDb();
      await db.put('eventos_rebanho', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura' as const,
        data_evento: '2026-05-01',
        payload: {},
        _sync_status: 'pending' as const,
        _created_at: Date.now(),
      });

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID,
        tipo_evento: 'diagnostico' as const,
        data_evento: '2026-05-05',
        payload: {},
        _sync_status: 'synced' as const,
        _created_at: Date.now(),
      });

      await db.put('eventos_rebanho', {
        id: EVENTO_ID_3,
        animal_id: ANIMAL_ID,
        tipo_evento: 'parto' as const,
        data_evento: '2026-05-10',
        payload: {},
        _sync_status: 'synced' as const,
        _created_at: Date.now(),
      });

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura',
        data_evento: '2026-05-01',
        payload: {},
      });

      await enqueue('eventos_rebanho', 'UPDATE', {
        id: EVENTO_ID_2,
        observacoes: 'atualizado',
      });

      await enqueue('eventos_rebanho', 'DELETE', {
        id: EVENTO_ID_3,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      });

      const result = await syncAll(mockSupabase);

      expect(result.sincronizados).toBe(3);
      expect(result.conflitos).toBe(0);
      expect(await db.count('sync_queue')).toBe(0);
    });

    it('Fila com eventos de animais diferentes → processa todos', async () => {
      const ANIMAL_ID_2 = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_1,
        animal_id: ANIMAL_ID,
        tipo_evento: 'cobertura',
        data_evento: '2026-05-01',
        payload: {},
      });

      await enqueue('eventos_rebanho', 'INSERT', {
        id: EVENTO_ID_2,
        animal_id: ANIMAL_ID_2,
        tipo_evento: 'diagnostico',
        data_evento: '2026-05-05',
        payload: {},
      });

      const db = await getDb();
      const queue = await db.getAll('sync_queue');

      expect(queue.length).toBe(2);
      expect(queue[0].payload.animal_id).toBe(ANIMAL_ID);
      expect(queue[1].payload.animal_id).toBe(ANIMAL_ID_2);
    });
  });
});
