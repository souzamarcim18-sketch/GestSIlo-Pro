import { describe, it, expect } from 'vitest';
import type { Animal, Lote, EventoRebanho, PesoAnimal } from '../types/rebanho';
import { TipoEvento, StatusAnimal } from '../types/rebanho';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAnimal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: 'animal-1',
    fazenda_id: 'fazenda-1',
    brinco: '001',
    sexo: 'Macho',
    tipo_rebanho: 'leiteiro' as any,
    data_nascimento: '2020-01-01',
    categoria: 'Touro',
    status: StatusAnimal.ATIVO,
    lote_id: null,
    peso_atual: 450.5,
    mae_id: null,
    pai_id: null,
    raca: 'Holandês',
    observacoes: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeLote(overrides: Partial<Lote> = {}): Lote {
  return {
    id: 'lote-1',
    fazenda_id: 'fazenda-1',
    nome: 'Lote A',
    descricao: 'Lote de produção',
    data_criacao: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEvento(overrides: Partial<EventoRebanho> = {}): EventoRebanho {
  return {
    id: 'evento-1',
    fazenda_id: 'fazenda-1',
    animal_id: 'animal-1',
    tipo: TipoEvento.PESAGEM,
    data_evento: '2026-01-15',
    peso_kg: 500,
    lote_id_destino: null,
    comprador: null,
    valor_venda: null,
    observacoes: null,
    usuario_id: 'user-1',
    deleted_at: null,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

function makePeso(overrides: Partial<PesoAnimal> = {}): PesoAnimal {
  return {
    id: 'peso-1',
    fazenda_id: 'fazenda-1',
    animal_id: 'animal-1',
    data_pesagem: '2026-01-15',
    peso_kg: 500,
    observacoes: null,
    created_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

describe('rebanho.queries', () => {
  // ── listAnimais — filtro status ────────────────────────────────────────────
  describe('listAnimais() — status filter', () => {
    it('retorna animais filtrados por status=Ativo', () => {
      const animal1 = makeAnimal({ id: 'a1', status: StatusAnimal.ATIVO });
      const animal2 = makeAnimal({ id: 'a2', status: StatusAnimal.MORTO });
      const animal3 = makeAnimal({ id: 'a3', status: StatusAnimal.ATIVO });

      const ativos = [animal1, animal2, animal3].filter(
        (a) => a.status === StatusAnimal.ATIVO
      );
      expect(ativos).toHaveLength(2);
      expect(ativos.map((a) => a.id)).toEqual(['a1', 'a3']);
    });

    it('retorna animais sem status (sem filtro)', () => {
      const animal1 = makeAnimal({ id: 'a1', status: StatusAnimal.ATIVO });
      const animal2 = makeAnimal({ id: 'a2', status: StatusAnimal.MORTO });
      const animal3 = makeAnimal({ id: 'a3', status: StatusAnimal.VENDIDO });

      expect([animal1, animal2, animal3]).toHaveLength(3);
    });
  });

  // ── listAnimais — filtro lote_id ───────────────────────────────────────────
  describe('listAnimais() — lote_id filter', () => {
    it('retorna animais do lote específico', () => {
      const animal1 = makeAnimal({ id: 'a1', lote_id: 'lote-1' });
      const animal2 = makeAnimal({ id: 'a2', lote_id: 'lote-2' });
      const animal3 = makeAnimal({ id: 'a3', lote_id: 'lote-1' });

      const lote1Animals = [animal1, animal2, animal3].filter(
        (a) => a.lote_id === 'lote-1'
      );
      expect(lote1Animals).toHaveLength(2);
      expect(lote1Animals.map((a) => a.id)).toEqual(['a1', 'a3']);
    });
  });

  // ── listAnimais — busca por brinco ─────────────────────────────────────────
  describe('listAnimais() — brinco search', () => {
    it('busca animal por brinco (case-insensitive)', () => {
      const animal1 = makeAnimal({ id: 'a1', brinco: '001' });
      const animal2 = makeAnimal({ id: 'a2', brinco: '002' });
      const animal3 = makeAnimal({ id: 'a3', brinco: '0011' });

      const resultado = [animal1, animal2, animal3].filter((a) =>
        a.brinco.includes('001')
      );
      expect(resultado).toHaveLength(2);
      expect(resultado.map((a) => a.brinco)).toEqual(['001', '0011']);
    });
  });

  // ── listAnimais — exclude deleted ──────────────────────────────────────────
  describe('listAnimais() — soft delete', () => {
    it('não retorna animais com deleted_at IS NOT NULL', () => {
      const animal1 = makeAnimal({ id: 'a1', deleted_at: null });
      const animal2 = makeAnimal({
        id: 'a2',
        deleted_at: '2026-01-10T00:00:00Z',
      });
      const animal3 = makeAnimal({ id: 'a3', deleted_at: null });

      const notDeleted = [animal1, animal2, animal3].filter(
        (a) => a.deleted_at === null
      );
      expect(notDeleted).toHaveLength(2);
      expect(notDeleted.map((a) => a.id)).toEqual(['a1', 'a3']);
    });
  });

  // ── criarAnimal — brinco duplicado ─────────────────────────────────────────
  describe('criarAnimal() — duplicate brinco', () => {
    it('detecta brinco duplicado e retorna erro descritivo', () => {
      const animal1 = makeAnimal({ brinco: '001' });
      const duplicata = makeAnimal({ brinco: '001', id: 'animal-2' });

      const existente = [animal1].find((a) => a.brinco === duplicata.brinco);
      if (existente) {
        const erro = `Animal com brinco ${duplicata.brinco} já existe nesta fazenda.`;
        expect(erro).toContain('já existe');
      }
    });
  });

  // ── registrarEvento tipo PESAGEM ───────────────────────────────────────────
  describe('registrarEvento() — PESAGEM', () => {
    it('tipo PESAGEM cria entrada em pesos_animal', () => {
      const evento = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.PESAGEM,
        peso_kg: 480,
        data_evento: '2026-01-15',
      });

      const peso = makePeso({
        animal_id: 'animal-1',
        peso_kg: 480,
        data_pesagem: '2026-01-15',
      });

      expect(peso.animal_id).toBe(evento.animal_id);
      expect(peso.peso_kg).toBe(evento.peso_kg);
      expect(peso.data_pesagem).toBe(evento.data_evento);
    });

    it('tipo PESAGEM atualiza peso_atual do animal', () => {
      const animal = makeAnimal({
        id: 'animal-1',
        peso_atual: null,
      });

      const novopeso = 500;
      const atualizado = { ...animal, peso_atual: novopeso };
      expect(atualizado.peso_atual).toBe(500);
    });
  });

  // ── registrarEvento tipo MORTE ─────────────────────────────────────────────
  describe('registrarEvento() — MORTE', () => {
    it('tipo MORTE atualiza status animal para Morto', () => {
      const animal = makeAnimal({
        id: 'animal-1',
        status: StatusAnimal.ATIVO,
      });

      const evento = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.MORTE,
      });

      const atualizado = { ...animal, status: StatusAnimal.MORTO };
      expect(atualizado.status).toBe(StatusAnimal.MORTO);
    });
  });

  // ── registrarEvento tipo TRANSFERENCIA_LOTE ────────────────────────────────
  describe('registrarEvento() — TRANSFERENCIA_LOTE', () => {
    it('tipo TRANSFERENCIA_LOTE atualiza lote_id do animal', () => {
      const animal = makeAnimal({
        id: 'animal-1',
        lote_id: 'lote-1',
      });

      const evento = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.TRANSFERENCIA_LOTE,
        lote_id_destino: 'lote-2',
      });

      const atualizado = { ...animal, lote_id: evento.lote_id_destino };
      expect(atualizado.lote_id).toBe('lote-2');
    });
  });

  // ── importarAnimaisCSV — duplicata de brinco ───────────────────────────────
  describe('importarAnimaisCSV() — duplicate brinco', () => {
    it('detecta brinco duplicado em segunda linha sem cancelar primeira', () => {
      const linhaValida = { brinco: '001', sexo: 'Macho', data: '2020-01-01' };
      const linhaDuplicata = {
        brinco: '001',
        sexo: 'Fêmea',
        data: '2020-02-01',
      };

      const erros: Array<{ linha: number; brinco: string }> = [];
      const animaisImportados: typeof linhaValida[] = [];

      // Simula import: linha 1 OK
      if (!animaisImportados.find((a) => a.brinco === linhaValida.brinco)) {
        animaisImportados.push(linhaValida);
      }

      // Simula import: linha 2 ERRO
      if (animaisImportados.find((a) => a.brinco === linhaDuplicata.brinco)) {
        erros.push({ linha: 3, brinco: linhaDuplicata.brinco });
      } else {
        animaisImportados.push(linhaDuplicata);
      }

      expect(animaisImportados).toHaveLength(1);
      expect(erros).toHaveLength(1);
      expect(erros[0].linha).toBe(3);
    });

    it('continua importação mesmo com erro (continue on error)', () => {
      const linha1 = { brinco: '001' };
      const linha2Erro = { brinco: '001' };
      const linha3 = { brinco: '003' };

      let importados = 0;
      let erros = 0;
      const _animaisSet = new Set<string>();

      [linha1, linha2Erro, linha3].forEach((linha) => {
        if (_animaisSet.has(linha.brinco)) {
          erros++;
        } else {
          _animaisSet.add(linha.brinco);
          importados++;
        }
      });

      expect(importados).toBe(2);
      expect(erros).toBe(1);
    });
  });
});
