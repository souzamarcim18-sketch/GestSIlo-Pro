import { describe, it, expect } from 'vitest';
import { MODULO_CONFIG, MODULO_ICONE } from '@/lib/types/calendario';
import type { ModuloCalendario } from '@/lib/types/calendario';

const TODOS_OS_MODULOS: ModuloCalendario[] = [
  'lavoura_dap', 'lavoura_atividade', 'frota', 'rebanho', 'sanidade',
  'mao_obra', 'pastagem_manejo', 'pastagem_ocupacao', 'silo', 'insumo', 'produto',
];

describe('MODULO_CONFIG', () => {
  it('deve ter entrada para todos os 11 módulos', () => {
    for (const modulo of TODOS_OS_MODULOS) {
      expect(MODULO_CONFIG[modulo]).toBeDefined();
      expect(MODULO_CONFIG[modulo].label).toBeTruthy();
      expect(MODULO_CONFIG[modulo].colorClass).toBeTruthy();
      expect(MODULO_CONFIG[modulo].bgClass).toBeTruthy();
    }
  });

  it('deve ter exatamente 11 módulos no MODULO_CONFIG', () => {
    expect(Object.keys(MODULO_CONFIG).length).toBe(11);
  });
});

describe('MODULO_ICONE', () => {
  it('deve ter ícone para todos os 11 módulos', () => {
    for (const modulo of TODOS_OS_MODULOS) {
      expect(MODULO_ICONE[modulo]).toBeDefined();
    }
  });
});
