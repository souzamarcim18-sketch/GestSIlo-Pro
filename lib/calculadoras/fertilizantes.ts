/**
 * Banco de dados de fertilizantes e gerenciamento de localStorage.
 * Mantém 15 fertilizantes padrão + suporte a customizados.
 * Fonte: SPEC-calculadoras.md v1.1
 */

import { Fertilizante } from './tipos-calculadoras';

// ========== FUNÇÕES UTILITÁRIAS ==========
/** Converte preço do saco de 50kg para preço por kg */
export function precoKg(preco_saco_50kg: number): number {
  return preco_saco_50kg / 50;
}

// ========== 16 FERTILIZANTES PADRÃO ==========
/**
 * Banco de fertilizantes padrão com teores reais de mercado (2026)
 * Preços: média de cotação em região Centro-Oeste (base: abril/2026)
 * Preços em R$/saco de 50kg (como o produtor compra)
 */
export const FERTILIZANTES_PADRAO: Fertilizante[] = [
  // Nitrogenados puros
  {
    id: 'ureia',
    nome: 'Ureia 45%',
    teor_n_percent: 45,
    teor_p_percent: 0,
    teor_k_percent: 0,
    preco_saco_50kg: 160.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'nit-amonio',
    nome: 'Nitrato de Amônio 34%',
    teor_n_percent: 34,
    teor_p_percent: 0,
    teor_k_percent: 0,
    preco_saco_50kg: 175.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'sulf-amonio',
    nome: 'Sulfato de Amônio 21%',
    teor_n_percent: 21,
    teor_p_percent: 0,
    teor_k_percent: 0,
    preco_saco_50kg: 140.0,
    unidade: 'kg',
    customizado: false,
  },

  // Fosfatados puros
  {
    id: 'map',
    nome: 'MAP 11-52-00',
    teor_n_percent: 11,
    teor_p_percent: 52,
    teor_k_percent: 0,
    preco_saco_50kg: 225.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'dap',
    nome: 'DAP 18-46-00',
    teor_n_percent: 18,
    teor_p_percent: 46,
    teor_k_percent: 0,
    preco_saco_50kg: 240.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'stp',
    nome: 'Superfosfato Triplo 0-46-00',
    teor_n_percent: 0,
    teor_p_percent: 46,
    teor_k_percent: 0,
    preco_saco_50kg: 190.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'sts',
    nome: 'Superfosfato Simples 0-18-00',
    teor_n_percent: 0,
    teor_p_percent: 18,
    teor_k_percent: 0,
    preco_saco_50kg: 125.0,
    unidade: 'kg',
    customizado: false,
  },

  // Potássicos puros
  {
    id: 'kcl',
    nome: 'Cloreto de Potássio 0-0-60',
    teor_n_percent: 0,
    teor_p_percent: 0,
    teor_k_percent: 60,
    preco_saco_50kg: 210.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'nit-potassio',
    nome: 'Nitrato de Potássio 13-0-44',
    teor_n_percent: 13,
    teor_p_percent: 0,
    teor_k_percent: 44,
    preco_saco_50kg: 300.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'sulf-potassio',
    nome: 'Sulfato de Potássio 0-0-50',
    teor_n_percent: 0,
    teor_p_percent: 0,
    teor_k_percent: 50,
    preco_saco_50kg: 275.0,
    unidade: 'kg',
    customizado: false,
  },

  // Formulados NPK comuns
  {
    id: 'npk-20-05-20',
    nome: 'NPK 20-05-20',
    teor_n_percent: 20,
    teor_p_percent: 5,
    teor_k_percent: 20,
    preco_saco_50kg: 195.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'npk-10-10-10',
    nome: 'NPK 10-10-10',
    teor_n_percent: 10,
    teor_p_percent: 10,
    teor_k_percent: 10,
    preco_saco_50kg: 160.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'npk-04-14-08',
    nome: 'NPK 04-14-08',
    teor_n_percent: 4,
    teor_p_percent: 14,
    teor_k_percent: 8,
    preco_saco_50kg: 140.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'npk-05-25-25',
    nome: 'NPK 05-25-25',
    teor_n_percent: 5,
    teor_p_percent: 25,
    teor_k_percent: 25,
    preco_saco_50kg: 205.0,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'npk-08-28-16',
    nome: 'NPK 08-28-16',
    teor_n_percent: 8,
    teor_p_percent: 28,
    teor_k_percent: 16,
    preco_saco_50kg: 215.0,
    unidade: 'kg',
    customizado: false,
  },

  // Cálcicos
  {
    id: 'nit-calcio',
    nome: 'Nitrato de Cálcio 15.5-0-0',
    teor_n_percent: 15.5,
    teor_p_percent: 0,
    teor_k_percent: 0,
    preco_saco_50kg: 190.0,
    unidade: 'kg',
    customizado: false,
  },
];

// ========== GERENCIAMENTO DE LOCALSTORAGE ==========
const STORAGE_KEY = 'gestsilo_fertilizantes_custom';

export function loadFertilizantesCustomizados(): Fertilizante[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveFertilizantesCustomizados(
  fertilizantes: Fertilizante[]
): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fertilizantes));
  } catch {
    console.error('Erro ao salvar fertilizantes customizados');
  }
}

export function addFertilizanteCustomizado(
  fert: Omit<Fertilizante, 'id' | 'customizado'>
): Fertilizante {
  const novo: Fertilizante = {
    ...fert,
    id: `custom_${Date.now()}`,
    customizado: true,
  };

  const customizados = loadFertilizantesCustomizados();
  customizados.push(novo);
  saveFertilizantesCustomizados(customizados);

  return novo;
}

export function updateFertilizanteCustomizado(
  id: string,
  updates: Partial<Fertilizante>
): void {
  const customizados = loadFertilizantesCustomizados();
  const index = customizados.findIndex((f) => f.id === id);
  if (index >= 0) {
    customizados[index] = { ...customizados[index], ...updates };
    saveFertilizantesCustomizados(customizados);
  }
}

export function deleteFertilizanteCustomizado(id: string): void {
  const customizados = loadFertilizantesCustomizados();
  saveFertilizantesCustomizados(customizados.filter((f) => f.id !== id));
}

export function getAllFertilizantes(): Fertilizante[] {
  return [...FERTILIZANTES_PADRAO, ...loadFertilizantesCustomizados()];
}

export function getFertilizanteById(id: string): Fertilizante | undefined {
  return getAllFertilizantes().find((f) => f.id === id);
}

export function updatePrecosCustomizados(
  priceUpdates: Record<string, number>
): void {
  const customizados = loadFertilizantesCustomizados();

  // Atualizar preços dos customizados (R$/saco de 50kg)
  customizados.forEach((fert) => {
    if (priceUpdates[fert.id]) {
      fert.preco_saco_50kg = priceUpdates[fert.id];
    }
  });

  saveFertilizantesCustomizados(customizados);
}
