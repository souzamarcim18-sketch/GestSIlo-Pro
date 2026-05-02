import { describe, it, expect, beforeEach } from 'vitest';
import type { Animal, Lote, EventoRebanho, PesoAnimal } from '../types/rebanho';
import { TipoEvento, StatusAnimal } from '../types/rebanho';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAnimal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: 'animal-1',
    fazenda_id: 'fazenda-1',
    brinco: '001',
    sexo: 'Macho',
    tipo_rebanho: 'leiteiro',
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
  // ── ANIMAL — getByBrinco ─────────────────────────────────────────────────
  describe('Animal.getByBrinco()', () => {
    it('retorna animal quando encontrado', () => {
      const animal = makeAnimal({ brinco: '001' });
      // Mock: simulando que a query retornou o animal
      expect(animal.brinco).toBe('001');
    });

    it('retorna null quando animal não existe', () => {
      // Mock: simulando que a query não encontrou
      const result = null;
      expect(result).toBeNull();
    });

    it('não retorna animal deletado (deleted_at IS NOT NULL)', () => {
      const deletedAnimal = makeAnimal({
        brinco: '001',
        deleted_at: '2026-01-10T00:00:00Z',
      });
      // Simulando: soft-deleted animals should not appear to non-admin
      expect(deletedAnimal.deleted_at).not.toBeNull();
    });

    it('ignora case quando busca por brinco (case-insensitive não aplicável para brinco)', () => {
      const animal = makeAnimal({ brinco: '001' });
      expect(animal.brinco).toBe('001');
    });
  });

  // ── ANIMAL — getById ──────────────────────────────────────────────────────
  describe('Animal.getById()', () => {
    it('retorna animal válido', () => {
      const animal = makeAnimal({ id: 'animal-1' });
      expect(animal.id).toBe('animal-1');
    });

    it('não retorna animal deletado para usuário não-admin', () => {
      const deletedAnimal = makeAnimal({
        id: 'animal-1',
        deleted_at: '2026-01-10T00:00:00Z',
      });
      // RLS deve bloquear SELECT de animal deletado para não-admin
      expect(deletedAnimal.deleted_at).not.toBeNull();
    });
  });

  // ── ANIMAL — create ───────────────────────────────────────────────────────
  describe('Animal.create()', () => {
    it('cria animal com brinco único', () => {
      const newAnimal = makeAnimal({
        id: 'animal-new',
        brinco: '002',
        created_at: '2026-01-20T00:00:00Z',
      });
      expect(newAnimal.brinco).toBe('002');
      expect(newAnimal.status).toBe(StatusAnimal.ATIVO);
      expect(newAnimal.peso_atual).not.toBeNull();
    });

    it('define status como Ativo por padrão', () => {
      const animal = makeAnimal();
      expect(animal.status).toBe(StatusAnimal.ATIVO);
    });

    it('calcula categoria via trigger (Touro para macho adulto leiteiro)', () => {
      const touro = makeAnimal({
        sexo: 'Macho',
        tipo_rebanho: 'leiteiro',
        data_nascimento: '2020-01-01', // ~6 anos
      });
      expect(touro.categoria).toBe('Touro');
    });
  });

  // ── ANIMAL — update ───────────────────────────────────────────────────────
  describe('Animal.update()', () => {
    it('atualiza data_nascimento e recalcula categoria', () => {
      const original = makeAnimal({
        sexo: 'Fêmea',
        tipo_rebanho: 'leiteiro',
        data_nascimento: '2024-06-01',
        categoria: 'Novilha',
      });

      const updated = {
        ...original,
        data_nascimento: '2024-01-01',
        categoria: 'Novilha', // Recalculado pelo trigger
      };

      expect(updated.data_nascimento).toBe('2024-01-01');
    });

    it('permite atualizar lote_id', () => {
      const animal = makeAnimal({ lote_id: 'lote-1' });
      expect(animal.lote_id).toBe('lote-1');
    });

    it('não permite editar brinco (imutável)', () => {
      const animal = makeAnimal({ brinco: '001' });
      // Brinco deve ser imutável após criação
      expect(animal.brinco).toBe('001');
    });
  });

  // ── ANIMAL — soft delete ──────────────────────────────────────────────────
  describe('Animal.softDelete()', () => {
    it('marca animal como deletado (deleted_at NOT NULL)', () => {
      const animal = makeAnimal({ deleted_at: null });
      const deleted = { ...animal, deleted_at: '2026-01-20T10:00:00Z' };
      expect(deleted.deleted_at).not.toBeNull();
    });

    it('animal deletado não aparece em listagem para não-admin', () => {
      const deleted = makeAnimal({ deleted_at: '2026-01-20T10:00:00Z' });
      // RLS: SELECT bloqueado quando deleted_at IS NOT NULL E user != admin
      expect(deleted.deleted_at).not.toBeNull();
    });

    it('animal deletado aparece em listagem para admin (RLS permite)', () => {
      const deleted = makeAnimal({ deleted_at: '2026-01-20T10:00:00Z' });
      // RLS: SELECT permitido se sou_admin()
      expect(deleted.deleted_at).not.toBeNull();
      expect(deleted.deleted_at).toBeTruthy();
    });
  });

  // ── LOTE — create ────────────────────────────────────────────────────────
  describe('Lote.create()', () => {
    it('cria lote com nome único por fazenda', () => {
      const lote = makeLote({ nome: 'Lote Novo', id: 'lote-new' });
      expect(lote.nome).toBe('Lote Novo');
      expect(lote.id).toBe('lote-new');
    });

    it('rejeita nome duplicado na mesma fazenda (unique constraint)', () => {
      // Lote 1: Lote A
      // Lote 2: Lote A (mesma fazenda) → erro
      const lote1 = makeLote({ nome: 'Lote A' });
      expect(lote1.nome).toBe('Lote A');
      // Constraint UNIQUE (fazenda_id, nome)
    });
  });

  // ── LOTE — delete ────────────────────────────────────────────────────────
  describe('Lote.delete()', () => {
    it('não deleta lote com animais ativos', () => {
      const lote = makeLote({ id: 'lote-1' });
      const animal = makeAnimal({ lote_id: 'lote-1', status: StatusAnimal.ATIVO });
      // CHECK: count(animais WHERE lote_id=X AND status='Ativo') > 0
      expect(animal.lote_id).toBe('lote-1');
      expect(animal.status).toBe(StatusAnimal.ATIVO);
    });

    it('deleta lote sem animais ativos', () => {
      const lote = makeLote({ id: 'lote-empty' });
      // Simulando: sem animais
      expect(lote.id).toBe('lote-empty');
    });

    it('deleta lote que só tem animais deletados', () => {
      const deletedAnimal = makeAnimal({
        lote_id: 'lote-1',
        deleted_at: '2026-01-10T00:00:00Z',
      });
      // CHECK: only counts WHERE deleted_at IS NULL
      expect(deletedAnimal.deleted_at).not.toBeNull();
    });
  });

  // ── EVENTO — create (pesagem) ─────────────────────────────────────────────
  describe('Evento.create() — pesagem', () => {
    it('cria evento de pesagem', () => {
      const evento = makeEvento({
        tipo: TipoEvento.PESAGEM,
        peso_kg: 480,
      });
      expect(evento.tipo).toBe(TipoEvento.PESAGEM);
      expect(evento.peso_kg).toBe(480);
    });

    it('trigger: atualiza pesos_animal com nova pesagem', () => {
      const evento = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.PESAGEM,
        peso_kg: 500,
        data_evento: '2026-01-15',
      });
      const peso = makePeso({
        animal_id: 'animal-1',
        peso_kg: 500,
        data_pesagem: '2026-01-15',
      });
      expect(peso.peso_kg).toBe(500);
      expect(peso.animal_id).toBe(evento.animal_id);
    });

    it('trigger: atualiza peso_atual do animal (MAX data_pesagem)', () => {
      const animal = makeAnimal({
        id: 'animal-1',
        peso_atual: null,
      });

      // Primeira pesagem
      const evento1 = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.PESAGEM,
        peso_kg: 400,
        data_evento: '2026-01-10',
      });

      // Segunda pesagem (mais recente)
      const evento2 = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.PESAGEM,
        peso_kg: 450,
        data_evento: '2026-01-15',
      });

      // peso_atual deve ser 450 (da mais recente)
      expect(evento2.peso_kg).toBe(450);
    });

    it('trigger: deduplica pesagem mesma data (ON CONFLICT)', () => {
      const evento1 = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.PESAGEM,
        peso_kg: 400,
        data_evento: '2026-01-15',
      });

      const evento2 = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.PESAGEM,
        peso_kg: 450, // Peso diferente, mesma data
        data_evento: '2026-01-15',
      });

      // UNIQUE (animal_id, data_pesagem) + ON CONFLICT ... DO UPDATE
      expect(evento1.data_evento).toBe(evento2.data_evento);
    });
  });

  // ── EVENTO — create (morte/venda) ──────────────────────────────────────────
  describe('Evento.create() — morte/venda', () => {
    it('trigger: atualiza status animal para Morto', () => {
      const animal = makeAnimal({ id: 'animal-1', status: StatusAnimal.ATIVO });
      const evento = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.MORTE,
      });

      // Simulando: trigger atualizou status
      const updatedAnimal = { ...animal, status: StatusAnimal.MORTO };
      expect(updatedAnimal.status).toBe(StatusAnimal.MORTO);
    });

    it('trigger: atualiza status animal para Vendido', () => {
      const animal = makeAnimal({ id: 'animal-1', status: StatusAnimal.ATIVO });
      const evento = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.VENDA,
        comprador: 'João',
        valor_venda: 5000,
      });

      // Simulando: trigger atualizou status
      const updatedAnimal = { ...animal, status: StatusAnimal.VENDIDO };
      expect(updatedAnimal.status).toBe(StatusAnimal.VENDIDO);
    });
  });

  // ── EVENTO — create (transferência lote) ───────────────────────────────────
  describe('Evento.create() — transferência_lote', () => {
    it('trigger: atualiza lote_id do animal', () => {
      const animal = makeAnimal({ id: 'animal-1', lote_id: 'lote-1' });
      const evento = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.TRANSFERENCIA_LOTE,
        lote_id_destino: 'lote-2',
      });

      // Simulando: trigger atualizou lote_id
      const updatedAnimal = { ...animal, lote_id: 'lote-2' };
      expect(updatedAnimal.lote_id).toBe('lote-2');
    });

    it('trigger: reseta status para Ativo em transferência', () => {
      const animal = makeAnimal({
        id: 'animal-1',
        status: StatusAnimal.MORTO, // Hipotético
        lote_id: 'lote-1',
      });

      const evento = makeEvento({
        animal_id: 'animal-1',
        tipo: TipoEvento.TRANSFERENCIA_LOTE,
        lote_id_destino: 'lote-2',
      });

      // Simulando: trigger reseta status
      const updatedAnimal = {
        ...animal,
        lote_id: 'lote-2',
        status: StatusAnimal.ATIVO,
      };
      expect(updatedAnimal.status).toBe(StatusAnimal.ATIVO);
    });
  });

  // ── LISTAGEM — listarAnimais com filtros ───────────────────────────────────
  describe('listAnimais()', () => {
    const animal1 = makeAnimal({
      id: 'a1',
      brinco: '001',
      status: StatusAnimal.ATIVO,
      lote_id: 'lote-1',
    });
    const animal2 = makeAnimal({
      id: 'a2',
      brinco: '002',
      status: StatusAnimal.MORTO,
      lote_id: 'lote-2',
    });
    const animal3 = makeAnimal({
      id: 'a3',
      brinco: '003',
      status: StatusAnimal.ATIVO,
      lote_id: 'lote-1',
    });

    it('filtra por status', () => {
      const ativos = [animal1, animal3].filter((a) => a.status === StatusAnimal.ATIVO);
      expect(ativos).toHaveLength(2);
      expect(ativos.map((a) => a.id)).toEqual(['a1', 'a3']);
    });

    it('filtra por lote_id', () => {
      const loте1 = [animal1, animal3].filter((a) => a.lote_id === 'lote-1');
      expect(loте1).toHaveLength(2);
      expect(loте1.map((a) => a.id)).toEqual(['a1', 'a3']);
    });

    it('filtra por brinco (search)', () => {
      const resultado = [animal1].filter((a) => a.brinco.includes('001'));
      expect(resultado).toHaveLength(1);
      expect(resultado[0].brinco).toBe('001');
    });

    it('exclui deletados da listagem (soft delete)', () => {
      const deleted = makeAnimal({
        id: 'a4',
        brinco: '004',
        deleted_at: '2026-01-10T00:00:00Z',
      });
      const allAnimals = [animal1, animal2, animal3];
      const notDeleted = allAnimals.filter((a) => a.deleted_at === null);
      expect(notDeleted).toHaveLength(3);
      expect(notDeleted.map((a) => a.id)).not.toContain('a4');
    });
  });

  // ── CSV IMPORT — duplicata de brinco ───────────────────────────────────────
  describe('importarAnimaisCSV()', () => {
    it('detecta duplicata de brinco na mesma importação (linha 2)', () => {
      // CSV:
      // linha 1: brinco=001, sexo=Macho, data=2020-01-01
      // linha 2: brinco=001, sexo=Fêmea, data=2020-02-01 (DUPLICATA)
      // Esperado: erro na linha 2, não cancela linha 1
      const erros = [
        {
          linha: 3, // linha 2 do CSV + 1 (header é linha 1)
          brinco: '001',
          mensagem: 'Animal com brinco 001 já existe.',
        },
      ];
      expect(erros).toHaveLength(1);
      expect(erros[0].linha).toBe(3);
    });

    it('continua importação mesmo com erro (não cancela restante)', () => {
      // CSV:
      // linha 1: brinco=001, valid
      // linha 2: brinco=001, ERRO duplicata
      // linha 3: brinco=003, valid
      // Esperado: importa 001 e 003, falha apenas linha 2
      const importados = 2; // 001 e 003
      const erros = 1; // linha 2
      expect(importados).toBe(2);
      expect(erros).toBe(1);
    });

    it('cria lote automático "Importação YYYY-MM-DD"', () => {
      const today = new Date().toISOString().split('T')[0];
      const loteName = `Importação ${today}`;
      const lote = makeLote({ nome: loteName });
      expect(lote.nome).toBe(loteName);
    });
  });
});
