import { describe, it, expect } from 'vitest';
import {
  insumoFormSchema,
  saidaFormSchema,
  ajusteInventarioSchema,
  type InsumoFormData,
  type SaidaFormData,
  type AjusteInventarioData,
} from '@/lib/validations/insumos';

// ---------------------------------------------------------------------------
// TESTES: SCHEMA INSUMOFROM
// ---------------------------------------------------------------------------

describe('insumoFormSchema', () => {
  const validInsumo: InsumoFormData = {
    nome: 'Ureia',
    categoria_id: '550e8400-e29b-41d4-a716-446655440000',
    tipo_id: '550e8400-e29b-41d4-a716-446655440001',
    unidade: 'kg',
    quantidade_entrada: 100,
    valor_unitario: 10.5,
    fornecedor: 'Syngenta',
    local_armazen: 'Galpão 1',
    estoque_minimo: 10,
    registrar_como_despesa: true,
    observacoes: 'Lote validado',
  };

  it('aceita insumo válido (happy path)', () => {
    const resultado = insumoFormSchema.safeParse(validInsumo);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data).toEqual(validInsumo);
    }
  });

  it('rejeita se nome < 2 caracteres', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      nome: 'U', // 1 char
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.nome).toBeDefined();
    }
  });

  it('rejeita se categoria_id inválido (não UUID)', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      categoria_id: 'not-a-uuid',
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita tipo_id nullable (para categorias sem subcategorias)', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      tipo_id: null,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita quantidade_entrada <= 0', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      quantidade_entrada: 0,
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita quantidade_entrada negativa', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      quantidade_entrada: -10,
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita valor_unitario = 0 (doação)', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      valor_unitario: 0,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita valor_unitario negativo', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      valor_unitario: -10,
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita fornecedor vazio', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      fornecedor: '',
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita local_armazen vazio', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      local_armazen: '',
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita observacoes opcional', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      observacoes: undefined,
    });
    expect(resultado.success).toBe(true);
  });

  it('aceita registrar_como_despesa=false', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      registrar_como_despesa: false,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita estoque_minimo negativo', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      estoque_minimo: -5,
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita estoque_minimo = 0', () => {
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      estoque_minimo: 0,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita se nome muito longo (> 255)', () => {
    const longName = 'a'.repeat(256);
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      nome: longName,
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita nome com 255 caracteres (máximo)', () => {
    const maxName = 'a'.repeat(255);
    const resultado = insumoFormSchema.safeParse({
      ...validInsumo,
      nome: maxName,
    });
    expect(resultado.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TESTES: SCHEMA SAIDAFORM
// ---------------------------------------------------------------------------

describe('saidaFormSchema', () => {
  const validSaida: SaidaFormData = {
    insumo_id: '550e8400-e29b-41d4-a716-446655440000',
    tipo_saida: 'USO_INTERNO',
    quantidade: 50,
    valor_unitario: 10.5,
    destino_tipo: 'talhao',
    destino_id: '550e8400-e29b-41d4-a716-446655440002',
    responsavel: 'João',
    data: '2026-04-17',
  };

  it('aceita saída válida (happy path)', () => {
    const resultado = saidaFormSchema.safeParse(validSaida);
    expect(resultado.success).toBe(true);
  });

  it('rejeita tipo_saida inválido', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      tipo_saida: 'TIPO_INVALIDO' as any,
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita quantidade <= 0', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      quantidade: 0,
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita valor_unitario = 0 (destruição)', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      valor_unitario: 0,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita responsavel vazio', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      responsavel: '',
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita data vazia', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      data: '',
    });
    expect(resultado.success).toBe(false);
  });

  it('obriga destino_tipo e destino_id para USO_INTERNO', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      tipo_saida: 'USO_INTERNO',
      destino_tipo: undefined,
      destino_id: undefined,
    });
    expect(resultado.success).toBe(false);
  });

  it('permite destino_id vazio para DESCARTE', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      tipo_saida: 'DESCARTE',
      destino_tipo: undefined,
      destino_id: undefined,
    });
    expect(resultado.success).toBe(true);
  });

  it('permite destino_texto para VENDA', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      tipo_saida: 'VENDA',
      destino_texto: 'Cliente: Fazenda XYZ',
      destino_tipo: undefined,
      destino_id: undefined,
    });
    expect(resultado.success).toBe(true);
  });

  it('valida UUID para destino_id se presente', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      destino_id: 'not-a-uuid',
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita observacoes opcional', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      observacoes: undefined,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita insumo_id inválido (não UUID)', () => {
    const resultado = saidaFormSchema.safeParse({
      ...validSaida,
      insumo_id: 'invalid-uuid',
    });
    expect(resultado.success).toBe(false);
  });

  it('valida todos tipos_saida aceitos', () => {
    const tipos = ['USO_INTERNO', 'TRANSFERENCIA', 'VENDA', 'DEVOLUCAO', 'DESCARTE', 'TROCA'];
    tipos.forEach((tipo) => {
      const resultado = saidaFormSchema.safeParse({
        ...validSaida,
        tipo_saida: tipo as any,
        destino_tipo: tipo === 'USO_INTERNO' ? 'talhao' : undefined,
        destino_id: tipo === 'USO_INTERNO' ? '550e8400-e29b-41d4-a716-446655440002' : undefined,
      });
      expect(resultado.success).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// TESTES: SCHEMA AJUSTEINVENTARIO
// ---------------------------------------------------------------------------

describe('ajusteInventarioSchema', () => {
  const validAjuste: AjusteInventarioData = {
    insumo_id: '550e8400-e29b-41d4-a716-446655440000',
    estoque_real: 80,
    motivo: 'Inventário realizado: encontrado 10kg faltando',
  };

  it('aceita ajuste válido (happy path)', () => {
    const resultado = ajusteInventarioSchema.safeParse(validAjuste);
    expect(resultado.success).toBe(true);
  });

  it('rejeita insumo_id inválido (não UUID)', () => {
    const resultado = ajusteInventarioSchema.safeParse({
      ...validAjuste,
      insumo_id: 'not-a-uuid',
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita estoque_real negativo', () => {
    const resultado = ajusteInventarioSchema.safeParse({
      ...validAjuste,
      estoque_real: -10,
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita estoque_real = 0 (consumo total)', () => {
    const resultado = ajusteInventarioSchema.safeParse({
      ...validAjuste,
      estoque_real: 0,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita motivo < 5 caracteres', () => {
    const resultado = ajusteInventarioSchema.safeParse({
      ...validAjuste,
      motivo: 'Test', // 4 chars
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita motivo com 5 caracteres (mínimo)', () => {
    const resultado = ajusteInventarioSchema.safeParse({
      ...validAjuste,
      motivo: 'Teste', // 5 chars
    });
    expect(resultado.success).toBe(true);
  });

  it('aceita motivo longo detalhado', () => {
    const resultado = ajusteInventarioSchema.safeParse({
      ...validAjuste,
      motivo: 'Inventário físico completo realizado em 2026-04-17. Encontrado diferença de 10kg devido a vazamento de saco.',
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita estoque_real não numérico', () => {
    const resultado = ajusteInventarioSchema.safeParse({
      ...validAjuste,
      estoque_real: 'não é número' as any,
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita estoque_real com decimais', () => {
    const resultado = ajusteInventarioSchema.safeParse({
      ...validAjuste,
      estoque_real: 80.5,
    });
    expect(resultado.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TESTES: COBERTURA DE CASOS EXTREMOS
// ---------------------------------------------------------------------------

describe('Edge Cases em Validações', () => {
  it('insumoFormSchema com valores mínimos válidos', () => {
    const resultado = insumoFormSchema.safeParse({
      nome: 'A'.repeat(2), // Mínimo
      categoria_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo_id: null,
      unidade: 'kg',
      quantidade_entrada: 0.01, // Muito pequeno mas positivo
      valor_unitario: 0,
      fornecedor: 'F',
      local_armazen: 'L',
      estoque_minimo: 0,
      registrar_como_despesa: false,
    });
    expect(resultado.success).toBe(true);
  });

  it('saidaFormSchema com valores grandes', () => {
    const resultado = saidaFormSchema.safeParse({
      insumo_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo_saida: 'VENDA',
      quantidade: 999999,
      valor_unitario: 999999.99,
      responsavel: 'A'.repeat(255),
      data: '2099-12-31',
    });
    expect(resultado.success).toBe(true);
  });

  it('ajusteInventarioSchema com estoque_real muito grande', () => {
    const resultado = ajusteInventarioSchema.safeParse({
      insumo_id: '550e8400-e29b-41d4-a716-446655440000',
      estoque_real: 1000000,
      motivo: 'Ajuste maior de 1 milhão de unidades (produto a granel)',
    });
    expect(resultado.success).toBe(true);
  });
});
