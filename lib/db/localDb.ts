import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface GestSiloDB extends DBSchema {
  sync_queue: {
    key: number;
    value: {
      id?: number;
      tabela: string;
      operacao: 'INSERT' | 'UPDATE' | 'DELETE';
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
}

const DB_NAME = 'gestsilo-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GestSiloDB>> | null = null;

export const getDb = () => {
  if (typeof window === 'undefined') return null;
  
  if (!dbPromise) {
    dbPromise = openDB<GestSiloDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
      },
    });
  }
  return dbPromise;
};
