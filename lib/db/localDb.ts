import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface GestSiloDB extends DBSchema {
  sync_queue: {
    key: number;
    value: {
      id?: number;
      tabela: string;
      operacao: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
      payload: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
  movimentacoes_silo: { key: string; value: any };
  atividades_campo: { key: string; value: any };
  movimentacoes_insumo: { key: string; value: any };
  financeiro: { key: string; value: any };
  uso_maquinas: { key: string; value: any };
  abastecimentos: { key: string; value: any };
  eventos_rebanho: {
    key: string;
    value: {
      id: string;
      animal_id: string;
      tipo_evento: 'cobertura' | 'diagnostico' | 'parto' | 'desmame' | 'secagem' | 'aborto' | 'descarte';
      data_evento: string;
      payload: Record<string, any>;
      _sync_status: 'pending' | 'synced' | 'error' | 'pendente_revisao';
      _created_at: number;
      _conflict_motivo?: string;
    };
    indexes: {
      'by-animal': string;
      'by-data': string;
      'by-tipo': string;
      'by-sync-status': string;
    };
  };
}

const DB_NAME = 'gestsilo-offline-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<GestSiloDB>> | null = null;

export const getDb = () => {
  if (typeof window === 'undefined') return null;
  
  if (!dbPromise) {
    dbPromise = openDB<GestSiloDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // V1: Criar stores iniciais
        if (oldVersion < 1) {
          // Store para a fila de sincronização
          const syncStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('by-timestamp', 'timestamp');

          // Stores para cache local de dados (para visualização offline)
          db.createObjectStore('movimentacoes_silo', { keyPath: 'id' });
          db.createObjectStore('atividades_campo', { keyPath: 'id' });
          db.createObjectStore('movimentacoes_insumo', { keyPath: 'id' });
          db.createObjectStore('financeiro', { keyPath: 'id' });
          db.createObjectStore('uso_maquinas', { keyPath: 'id' });
          db.createObjectStore('abastecimentos', { keyPath: 'id' });
        }

        // V2: Adicionar store para eventos reprodutivos
        if (oldVersion < 2) {
          const eventosStore = db.createObjectStore('eventos_rebanho', { keyPath: 'id' });
          eventosStore.createIndex('by-animal', 'animal_id');
          eventosStore.createIndex('by-data', 'data_evento');
          eventosStore.createIndex('by-tipo', 'tipo_evento');
          eventosStore.createIndex('by-sync-status', '_sync_status');
        }
      },
    });
  }
  return dbPromise;
};
