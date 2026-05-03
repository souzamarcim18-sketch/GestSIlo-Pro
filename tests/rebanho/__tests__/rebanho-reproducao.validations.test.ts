import { describe, it, expect } from 'vitest';
import {
  criarCoberturaSchema,
  criarDiagnosticoSchema,
  criarPartoSchema,
  criarSecagemSchema,
  criarAbortoSchema,
  criarDescarteSchema,
  criarReprodutorSchema,
  atualizarParametrosReprodutivosSchema,
} from '@/lib/validations/rebanho-reproducao';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 1);
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 10);

// ========== CASOS VÁLIDOS (8) ==========

describe('Validações Rebanho Reprodução — Casos Válidos', () => {
  it('cobertura: válida com todos os campos', () => {
    const result = criarCoberturaSchema.safeParse({
      animal_id: validUUID,
      tipo_cobertura: 'monta_natural',
      data_evento: pastDate.toISOString().split('T')[0],
      reprodutor_id: validUUID,
      observacoes: 'Cobertura bem sucedida',
    });
    expect(result.success).toBe(true);
  });

  it('diagnóstico: válido com idade gestacional', () => {
    const result = criarDiagnosticoSchema.safeParse({
      animal_id: validUUID,
      metodo_diagnostico: 'ultrassom',
      resultado_prenhez: 'positivo',
      data_evento: pastDate.toISOString().split('T')[0],
      idade_gestacional_dias: 45,
    });
    expect(result.success).toBe(true);
  });

  it('parto: válido não gemelar com 1 cria', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'normal',
      data_evento: pastDate.toISOString().split('T')[0],
      gemelar: false,
      crias: [{ sexo: 'Fêmea', vivo: true }],
    });
    expect(result.success).toBe(true);
  });

  it('parto: válido gemelar com 2 crias', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'distocico',
      data_evento: pastDate.toISOString().split('T')[0],
      gemelar: true,
      crias: [
        { sexo: 'Macho', peso_kg: 35, vivo: true },
        { sexo: 'Fêmea', peso_kg: 32, vivo: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('secagem: válida', () => {
    const result = criarSecagemSchema.safeParse({
      animal_id: validUUID,
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(true);
  });

  it('aborto: válido com idade gestacional', () => {
    const result = criarAbortoSchema.safeParse({
      animal_id: validUUID,
      data_evento: pastDate.toISOString().split('T')[0],
      idade_gestacional_dias: 120,
      causa_aborto: 'Infecção uterina',
    });
    expect(result.success).toBe(true);
  });

  it('descarte: válido com motivo', () => {
    const result = criarDescarteSchema.safeParse({
      animal_id: validUUID,
      motivo_descarte: 'idade',
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(true);
  });

  it('reprodutor: válido com todos os campos', () => {
    const result = criarReprodutorSchema.safeParse({
      nome: 'Touro Brahma 01',
      tipo: 'touro',
      raca: 'Brahma',
      numero_registro: 'BR-2024-001',
      data_entrada: pastDate.toISOString().split('T')[0],
      observacoes: 'Reprodutor de qualidade',
    });
    expect(result.success).toBe(true);
  });
});

// ========== DATA FUTURA REJEITADA (8) ==========

describe('Validações Rebanho Reprodução — Data Futura Rejeitada', () => {
  const futureStr = futureDate.toISOString().split('T')[0];

  it('cobertura: rejeita data futura', () => {
    const result = criarCoberturaSchema.safeParse({
      animal_id: validUUID,
      tipo_cobertura: 'ia_convencional',
      data_evento: futureStr,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('não futura');
  });

  it('diagnóstico: rejeita data futura', () => {
    const result = criarDiagnosticoSchema.safeParse({
      animal_id: validUUID,
      metodo_diagnostico: 'palpacao',
      resultado_prenhez: 'negativo',
      data_evento: futureStr,
    });
    expect(result.success).toBe(false);
  });

  it('parto: rejeita data futura', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'normal',
      data_evento: futureStr,
      crias: [{ sexo: 'Fêmea', vivo: true }],
    });
    expect(result.success).toBe(false);
  });

  it('secagem: rejeita data futura', () => {
    const result = criarSecagemSchema.safeParse({
      animal_id: validUUID,
      data_evento: futureStr,
    });
    expect(result.success).toBe(false);
  });

  it('aborto: rejeita data futura', () => {
    const result = criarAbortoSchema.safeParse({
      animal_id: validUUID,
      data_evento: futureStr,
    });
    expect(result.success).toBe(false);
  });

  it('descarte: rejeita data futura', () => {
    const result = criarDescarteSchema.safeParse({
      animal_id: validUUID,
      motivo_descarte: 'reprodutivo',
      data_evento: futureStr,
    });
    expect(result.success).toBe(false);
  });

  it('reprodutor: rejeita data entrada futura', () => {
    const result = criarReprodutorSchema.safeParse({
      nome: 'Touro Teste',
      tipo: 'touro',
      data_entrada: futureStr,
    });
    expect(result.success).toBe(false);
  });

  it('parâmetros reprodutivos: aceita datas no passado (sem validação de data)', () => {
    const result = atualizarParametrosReprodutivosSchema.safeParse({
      dias_gestacao: 283,
    });
    expect(result.success).toBe(true);
  });
});

// ========== CAMPOS OBRIGATÓRIOS FALTANDO (8) ==========

describe('Validações Rebanho Reprodução — Campos Obrigatórios', () => {
  it('cobertura: animal_id obrigatório', () => {
    const result = criarCoberturaSchema.safeParse({
      tipo_cobertura: 'monta_natural',
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('diagnóstico: metodo_diagnostico obrigatório', () => {
    const result = criarDiagnosticoSchema.safeParse({
      animal_id: validUUID,
      resultado_prenhez: 'positivo',
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('parto: crias obrigatório', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'normal',
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('secagem: data_evento obrigatório', () => {
    const result = criarSecagemSchema.safeParse({
      animal_id: validUUID,
    });
    expect(result.success).toBe(false);
  });

  it('aborto: animal_id obrigatório', () => {
    const result = criarAbortoSchema.safeParse({
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('descarte: motivo_descarte obrigatório', () => {
    const result = criarDescarteSchema.safeParse({
      animal_id: validUUID,
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('reprodutor: nome obrigatório', () => {
    const result = criarReprodutorSchema.safeParse({
      tipo: 'touro',
    });
    expect(result.success).toBe(false);
  });

  it('reprodutor: tipo obrigatório', () => {
    const result = criarReprodutorSchema.safeParse({
      nome: 'Touro Teste',
    });
    expect(result.success).toBe(false);
  });
});

// ========== ENUMS FORA DO RANGE (8) ==========

describe('Validações Rebanho Reprodução — Enums Inválidos', () => {
  it('cobertura: tipo_cobertura inválido', () => {
    const result = criarCoberturaSchema.safeParse({
      animal_id: validUUID,
      tipo_cobertura: 'tipo_invalido',
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('diagnóstico: metodo_diagnostico inválido', () => {
    const result = criarDiagnosticoSchema.safeParse({
      animal_id: validUUID,
      metodo_diagnostico: 'xray',
      resultado_prenhez: 'positivo',
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('diagnóstico: resultado_prenhez inválido', () => {
    const result = criarDiagnosticoSchema.safeParse({
      animal_id: validUUID,
      metodo_diagnostico: 'ultrassom',
      resultado_prenhez: 'talvez',
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('parto: tipo_parto inválido', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'induzido',
      data_evento: pastDate.toISOString().split('T')[0],
      crias: [{ sexo: 'Fêmea', vivo: true }],
    });
    expect(result.success).toBe(false);
  });

  it('descarte: motivo_descarte inválido', () => {
    const result = criarDescarteSchema.safeParse({
      animal_id: validUUID,
      motivo_descarte: 'falta_de_leite',
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('reprodutor: tipo inválido', () => {
    const result = criarReprodutorSchema.safeParse({
      nome: 'Reprodutor',
      tipo: 'touro_voador',
    });
    expect(result.success).toBe(false);
  });

  it('parto: crias com sexo inválido', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'normal',
      data_evento: pastDate.toISOString().split('T')[0],
      crias: [{ sexo: 'Indefinido', vivo: true }],
    });
    expect(result.success).toBe(false);
  });

  it('parâmetros: dias_gestacao fora do range (min)', () => {
    const result = atualizarParametrosReprodutivosSchema.safeParse({
      dias_gestacao: 260,
    });
    expect(result.success).toBe(false);
  });
});

// ========== LIMITES NUMÉRICOS (8) ==========

describe('Validações Rebanho Reprodução — Limites Numéricos', () => {
  it('diagnóstico: idade_gestacional > 300', () => {
    const result = criarDiagnosticoSchema.safeParse({
      animal_id: validUUID,
      metodo_diagnostico: 'ultrassom',
      resultado_prenhez: 'positivo',
      data_evento: pastDate.toISOString().split('T')[0],
      idade_gestacional_dias: 301,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('máxima');
  });

  it('diagnóstico: idade_gestacional < 0', () => {
    const result = criarDiagnosticoSchema.safeParse({
      animal_id: validUUID,
      metodo_diagnostico: 'palpacao',
      resultado_prenhez: 'negativo',
      data_evento: pastDate.toISOString().split('T')[0],
      idade_gestacional_dias: -1,
    });
    expect(result.success).toBe(false);
  });

  it('aborto: idade_gestacional > 300', () => {
    const result = criarAbortoSchema.safeParse({
      animal_id: validUUID,
      data_evento: pastDate.toISOString().split('T')[0],
      idade_gestacional_dias: 350,
    });
    expect(result.success).toBe(false);
  });

  it('parto: peso_kg <= 0', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'normal',
      data_evento: pastDate.toISOString().split('T')[0],
      crias: [{ sexo: 'Macho', peso_kg: 0, vivo: true }],
    });
    expect(result.success).toBe(false);
  });

  it('parto: peso_kg negativo', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'normal',
      data_evento: pastDate.toISOString().split('T')[0],
      crias: [{ sexo: 'Fêmea', peso_kg: -10, vivo: true }],
    });
    expect(result.success).toBe(false);
  });

  it('reprodutor: nome muito curto', () => {
    const result = criarReprodutorSchema.safeParse({
      nome: 'A',
      tipo: 'touro',
    });
    expect(result.success).toBe(false);
  });

  it('parâmetros: dias_gestacao < 270', () => {
    const result = atualizarParametrosReprodutivosSchema.safeParse({
      dias_gestacao: 269,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Mínimo');
  });

  it('parâmetros: dias_gestacao > 295', () => {
    const result = atualizarParametrosReprodutivosSchema.safeParse({
      dias_gestacao: 296,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Máximo');
  });
});

// ========== PARTO: GEMELAR vs CRIAS.LENGTH (4) ==========

describe('Validações Rebanho Reprodução — Parto Gemelar', () => {
  it('parto gemelar=true com 2 crias: válido', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'normal',
      data_evento: pastDate.toISOString().split('T')[0],
      gemelar: true,
      crias: [
        { sexo: 'Macho', vivo: true },
        { sexo: 'Fêmea', vivo: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('parto gemelar=true com 1 cria: inválido', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'normal',
      data_evento: pastDate.toISOString().split('T')[0],
      gemelar: true,
      crias: [{ sexo: 'Macho', vivo: true }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('exatamente 2');
  });

  it('parto gemelar=false com 1 cria: válido', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'cesariana',
      data_evento: pastDate.toISOString().split('T')[0],
      gemelar: false,
      crias: [{ sexo: 'Fêmea', vivo: true }],
    });
    expect(result.success).toBe(true);
  });

  it('parto gemelar=false com 2 crias: inválido', () => {
    const result = criarPartoSchema.safeParse({
      animal_id: validUUID,
      tipo_parto: 'normal',
      data_evento: pastDate.toISOString().split('T')[0],
      gemelar: false,
      crias: [
        { sexo: 'Macho', vivo: true },
        { sexo: 'Fêmea', vivo: true },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('exatamente 1');
  });
});

// ========== TESTES ADICIONAIS DE STRING/LENGTH (4) ==========

describe('Validações Rebanho Reprodução — Limites de String', () => {
  it('cobertura: observacoes > 500 caracteres', () => {
    const result = criarCoberturaSchema.safeParse({
      animal_id: validUUID,
      tipo_cobertura: 'ia_convencional',
      data_evento: pastDate.toISOString().split('T')[0],
      observacoes: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('reprodutor: nome > 255 caracteres', () => {
    const result = criarReprodutorSchema.safeParse({
      nome: 'T'.repeat(256),
      tipo: 'touro',
    });
    expect(result.success).toBe(false);
  });

  it('diagnóstico: observacoes = 500 (no limit)', () => {
    const result = criarDiagnosticoSchema.safeParse({
      animal_id: validUUID,
      metodo_diagnostico: 'ultrassom',
      resultado_prenhez: 'positivo',
      data_evento: pastDate.toISOString().split('T')[0],
      observacoes: 'a'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('parâmetros: coberturas_para_repetidora = 2 (min)', () => {
    const result = atualizarParametrosReprodutivosSchema.safeParse({
      coberturas_para_repetidora: 2,
    });
    expect(result.success).toBe(true);
  });
});

// ========== TESTES DE INTEGRIDADE (4) ==========

describe('Validações Rebanho Reprodução — Integridade', () => {
  it('animal_id deve ser UUID válido', () => {
    const result = criarCoberturaSchema.safeParse({
      animal_id: 'not-a-uuid',
      tipo_cobertura: 'monta_natural',
      data_evento: pastDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('inválido');
  });

  it('reprodutor_id deve ser UUID válido quando preenchido', () => {
    const result = criarCoberturaSchema.safeParse({
      animal_id: validUUID,
      tipo_cobertura: 'ia_convencional',
      data_evento: pastDate.toISOString().split('T')[0],
      reprodutor_id: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('parâmetros: dias_seca deve ser inteiro', () => {
    const result = atualizarParametrosReprodutivosSchema.safeParse({
      dias_seca: 45.5,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('inteiro');
  });

  it('parâmetros: meta_taxa_prenhez_pct = 100 (max)', () => {
    const result = atualizarParametrosReprodutivosSchema.safeParse({
      meta_taxa_prenhez_pct: 100,
    });
    expect(result.success).toBe(true);
  });
});
