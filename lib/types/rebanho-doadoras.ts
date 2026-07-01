import type { EspecieRebanho } from '@/lib/types/rebanho-reproducao';

// Doadora de oócitos (FIV/OPU). Pode ser interna (fêmea do rebanho, animal_id
// preenchido) ou externa (de outra fazenda, animal_id nulo). Segmentada por
// espécie, ao lado de reprodutores.
export interface Doadora {
  id: string;
  fazenda_id: string;
  animal_id: string | null;
  origem: 'interna' | 'externa';
  tipo_rebanho: EspecieRebanho;
  nome: string;
  raca: string | null;
  numero_registro: string | null;
  data_entrada: string | null;
  observacoes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
