# SPEC — Módulo de Rebanho — Fase 1: Fundação

**Data**: 2026-04-30  
**Status**: Especificação Técnica Completa — Decisões Confirmadas  
**Versão**: 1.1  
**Baseado em**: 01-prd.md (v1.1)

---

## Decisões Confirmadas (Alterações vs PRD v1.0)

| Decisão | PRD v1.0 | Confirmado v1.1 |
|---|---|---|
| **Campo ID Animal** | numero_animal | **brinco** (TEXT NOT NULL) |
| **Permissão Operador** | CRUD animal, lançar evento | **APENAS lançar evento** (sem criar/editar animal, lote) |
| **Permissão Visualizador** | read-only | **read-only** (sem mudanças) |
| **Categoria** | Enum PostgreSQL | **TEXT calculado por trigger** |
| **Enum categoria_animal** | Existe | **Removido** |

---

## 1. Migration SQL Completa

### 1.1 Enums (tipos PostgreSQL)

```sql
-- Status de animal (Ativo, Morto, Vendido)
CREATE TYPE status_animal AS ENUM ('Ativo', 'Morto', 'Vendido');

-- Tipo de evento
CREATE TYPE tipo_evento_rebanho AS ENUM (
  'nascimento',
  'pesagem',
  'morte',
  'venda',
  'transferencia_lote'
);
```

### 1.2 Tabela `animais`

```sql
CREATE TABLE public.animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  brinco TEXT NOT NULL,
  sexo TEXT NOT NULL CHECK (sexo IN ('Macho', 'Fêmea')),
  tipo_rebanho TEXT NOT NULL DEFAULT 'leiteiro' CHECK (tipo_rebanho IN ('leiteiro', 'corte')),
  data_nascimento DATE NOT NULL CHECK (data_nascimento <= CURRENT_DATE),
  categoria TEXT NOT NULL DEFAULT 'Bezerro(a)',
  status status_animal NOT NULL DEFAULT 'Ativo',
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  peso_atual NUMERIC(6,2),
  mae_id UUID REFERENCES public.animais(id) ON DELETE SET NULL,
  pai_id UUID REFERENCES public.animais(id) ON DELETE SET NULL,
  raca TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint: genealogia na mesma fazenda
  CONSTRAINT animais_mae_id_fazenda_check 
    CHECK (mae_id IS NULL OR 
      (SELECT fazenda_id FROM public.animais WHERE id = mae_id) = fazenda_id),
  
  CONSTRAINT animais_pai_id_fazenda_check 
    CHECK (pai_id IS NULL OR 
      (SELECT fazenda_id FROM public.animais WHERE id = pai_id) = fazenda_id)
);

-- Índices
CREATE INDEX idx_animais_fazenda_id ON public.animais(fazenda_id);
CREATE INDEX idx_animais_fazenda_status ON public.animais(fazenda_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_animais_lote_id ON public.animais(lote_id);
CREATE INDEX idx_animais_mae_id ON public.animais(mae_id);
CREATE INDEX idx_animais_pai_id ON public.animais(pai_id);

-- Partial Unique Index: brinco único por fazenda (apenas não-deletados)
CREATE UNIQUE INDEX idx_animais_brinco_fazenda_id_not_deleted 
  ON public.animais(fazenda_id, brinco) 
  WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.animais ENABLE ROW LEVEL SECURITY;

-- SELECT: Administrador ou Operador ou Visualizador veem animais da fazenda (deletados apenas admin)
CREATE POLICY "animais_select" ON public.animais
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND 
    (deleted_at IS NULL OR sou_admin())
  );

-- INSERT: Apenas Administrador
CREATE POLICY "animais_insert" ON public.animais
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- UPDATE: Apenas Administrador
CREATE POLICY "animais_update" ON public.animais
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- DELETE: Apenas Administrador
CREATE POLICY "animais_delete" ON public.animais
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());
```

### 1.3 Tabela `lotes`

```sql
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT lotes_nome_fazenda_id_unique UNIQUE (fazenda_id, nome)
);

-- Índices
CREATE INDEX idx_lotes_fazenda_id ON public.lotes(fazenda_id);

-- RLS
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos veem lotes da fazenda
CREATE POLICY "lotes_select" ON public.lotes
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

-- INSERT: Apenas Administrador
CREATE POLICY "lotes_insert" ON public.lotes
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- UPDATE: Apenas Administrador
CREATE POLICY "lotes_update" ON public.lotes
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- DELETE: Apenas Administrador
CREATE POLICY "lotes_delete" ON public.lotes
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());
```

### 1.4 Tabela `eventos_rebanho`

```sql
CREATE TABLE public.eventos_rebanho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animais(id) ON DELETE CASCADE,
  tipo tipo_evento_rebanho NOT NULL,
  data_evento DATE NOT NULL CHECK (data_evento <= CURRENT_DATE),
  peso_kg NUMERIC(6,2),
  lote_id_destino UUID REFERENCES public.lotes(id) ON DELETE RESTRICT,
  comprador TEXT,
  valor_venda NUMERIC(12,2),
  observacoes TEXT,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT eventos_rebanho_peso_pesagem_check 
    CHECK (tipo != 'pesagem' OR (peso_kg IS NOT NULL AND peso_kg > 0)),
  
  CONSTRAINT eventos_rebanho_lote_transferencia_check 
    CHECK (tipo != 'transferencia_lote' OR lote_id_destino IS NOT NULL)
);

-- Índices
CREATE INDEX idx_eventos_rebanho_fazenda_id ON public.eventos_rebanho(fazenda_id);
CREATE INDEX idx_eventos_rebanho_animal_id ON public.eventos_rebanho(animal_id);
CREATE INDEX idx_eventos_rebanho_tipo ON public.eventos_rebanho(tipo);
CREATE INDEX idx_eventos_rebanho_data_evento ON public.eventos_rebanho(data_evento DESC);

-- RLS
ALTER TABLE public.eventos_rebanho ENABLE ROW LEVEL SECURITY;

-- SELECT: Administrador, Operador, Visualizador veem (deletados apenas admin)
CREATE POLICY "eventos_rebanho_select" ON public.eventos_rebanho
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND 
    (deleted_at IS NULL OR sou_admin())
  );

-- INSERT: Administrador e Operador
CREATE POLICY "eventos_rebanho_insert" ON public.eventos_rebanho
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

-- UPDATE: Nenhum (eventos imutáveis)
CREATE POLICY "eventos_rebanho_update" ON public.eventos_rebanho
  FOR UPDATE
  USING (FALSE);

-- DELETE: Apenas Administrador
CREATE POLICY "eventos_rebanho_delete" ON public.eventos_rebanho
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());
```

### 1.5 Tabela `pesos_animal`

```sql
CREATE TABLE public.pesos_animal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animais(id) ON DELETE CASCADE,
  data_pesagem DATE NOT NULL,
  peso_kg NUMERIC(6,2) NOT NULL CHECK (peso_kg > 0),
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT pesos_animal_animal_data_unique UNIQUE (animal_id, data_pesagem)
);

-- Índices
CREATE INDEX idx_pesos_animal_fazenda_id ON public.pesos_animal(fazenda_id);
CREATE INDEX idx_pesos_animal_animal_id ON public.pesos_animal(animal_id);
CREATE INDEX idx_pesos_animal_data_pesagem ON public.pesos_animal(animal_id, data_pesagem DESC);

-- RLS
ALTER TABLE public.pesos_animal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pesos_animal_select" ON public.pesos_animal
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY "pesos_animal_insert" ON public.pesos_animal
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());
```

### 1.6 Trigger: `set_fazenda_id` (BEFORE INSERT)

```sql
-- Animais
CREATE OR REPLACE FUNCTION public.set_animais_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER animais_set_fazenda_id_trigger
BEFORE INSERT ON public.animais
FOR EACH ROW
EXECUTE FUNCTION public.set_animais_fazenda_id();

-- Lotes
CREATE OR REPLACE FUNCTION public.set_lotes_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER lotes_set_fazenda_id_trigger
BEFORE INSERT ON public.lotes
FOR EACH ROW
EXECUTE FUNCTION public.set_lotes_fazenda_id();

-- Eventos_rebanho
CREATE OR REPLACE FUNCTION public.set_eventos_rebanho_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_set_fazenda_id_trigger
BEFORE INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.set_eventos_rebanho_fazenda_id();

-- Pesos_animal
CREATE OR REPLACE FUNCTION public.set_pesos_animal_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER pesos_animal_set_fazenda_id_trigger
BEFORE INSERT ON public.pesos_animal
FOR EACH ROW
EXECUTE FUNCTION public.set_pesos_animal_fazenda_id();
```

### 1.7 Trigger: `update_updated_at` (BEFORE UPDATE)

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER animais_update_updated_at_trigger
BEFORE UPDATE ON public.animais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER lotes_update_updated_at_trigger
BEFORE UPDATE ON public.lotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER eventos_rebanho_update_updated_at_trigger
BEFORE UPDATE ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### 1.8 Trigger: Atualizar `peso_atual` e `pesos_animal` em Pesagem (AFTER INSERT)

```sql
CREATE OR REPLACE FUNCTION public.atualizar_peso_atual_pesagem()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'pesagem' AND NEW.peso_kg IS NOT NULL THEN
    -- Inserir em pesos_animal
    INSERT INTO public.pesos_animal (animal_id, data_pesagem, peso_kg, fazenda_id)
    VALUES (NEW.animal_id, NEW.data_evento, NEW.peso_kg, NEW.fazenda_id)
    ON CONFLICT (animal_id, data_pesagem) DO UPDATE
    SET peso_kg = EXCLUDED.peso_kg;
    
    -- Atualizar peso_atual do animal (MAX peso_kg)
    UPDATE public.animais
    SET peso_atual = (
      SELECT peso_kg 
      FROM public.pesos_animal 
      WHERE animal_id = NEW.animal_id 
      ORDER BY data_pesagem DESC 
      LIMIT 1
    )
    WHERE id = NEW.animal_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_pesagem_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_peso_atual_pesagem();
```

### 1.9 Trigger: Atualizar `status` em Morte/Venda (AFTER INSERT)

```sql
CREATE OR REPLACE FUNCTION public.atualizar_status_morte_venda()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'morte' THEN
    UPDATE public.animais SET status = 'Morto' WHERE id = NEW.animal_id;
  ELSIF NEW.tipo = 'venda' THEN
    UPDATE public.animais SET status = 'Vendido' WHERE id = NEW.animal_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_morte_venda_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_status_morte_venda();
```

### 1.10 Trigger: Atualizar `lote_id` em Transferência (AFTER INSERT)

```sql
CREATE OR REPLACE FUNCTION public.atualizar_lote_transferencia()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'transferencia_lote' AND NEW.lote_id_destino IS NOT NULL THEN
    UPDATE public.animais 
    SET lote_id = NEW.lote_id_destino, status = 'Ativo'
    WHERE id = NEW.animal_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_transferencia_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_lote_transferencia();
```

### 1.11 Trigger: Recalcular Categoria Automática (BEFORE INSERT/UPDATE)

```sql
CREATE OR REPLACE FUNCTION public.recalcular_categoria_animal()
RETURNS TRIGGER AS $$
DECLARE
  v_idade_anos NUMERIC;
  v_categoria TEXT;
BEGIN
  v_idade_anos := (CURRENT_DATE - NEW.data_nascimento) / 365.25;
  
  IF NEW.tipo_rebanho = 'leiteiro' THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := 'Bezerro(a)';
    ELSIF v_idade_anos < 1 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Macho Jovem' ELSE 'Fêmea Jovem' END;
    ELSIF v_idade_anos < 2 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Novilho' ELSE 'Novilha' END;
    ELSE
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Touro' ELSE 'Vaca' END;
    END IF;
  ELSIF NEW.tipo_rebanho = 'corte' THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := 'Bezerro(a)';
    ELSIF v_idade_anos < 1 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Macho Jovem' ELSE 'Fêmea Jovem' END;
    ELSIF v_idade_anos < 2 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Novilho' ELSE 'Novilha' END;
    ELSE
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Boi' ELSE 'Novilha' END;
    END IF;
  END IF;
  
  NEW.categoria := v_categoria;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER animais_recalcular_categoria_trigger
BEFORE INSERT OR UPDATE ON public.animais
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_categoria_animal();
```

---

## 2. Tipos TypeScript

### Arquivo: `lib/types/rebanho.ts`

```typescript
/**
 * Tipos TypeScript para o módulo de Rebanho
 * Baseado em: SPEC-rebanho.md (v1.1 — Decisões Confirmadas)
 */

// ========== ENUMS ==========

export enum StatusAnimal {
  ATIVO = 'Ativo',
  MORTO = 'Morto',
  VENDIDO = 'Vendido',
}

export enum TipoEvento {
  NASCIMENTO = 'nascimento',
  PESAGEM = 'pesagem',
  MORTE = 'morte',
  VENDA = 'venda',
  TRANSFERENCIA_LOTE = 'transferencia_lote',
}

// ========== INTERFACES PRINCIPAIS ==========

export interface Animal {
  id: string;
  fazenda_id: string;
  brinco: string; // Campo identificador único por fazenda
  sexo: 'Macho' | 'Fêmea';
  tipo_rebanho: 'leiteiro' | 'corte';
  data_nascimento: string; // ISO date
  categoria: string; // Computed: 'Bezerro(a)', 'Macho Jovem', 'Fêmea Jovem', 'Novilho', 'Novilha', 'Vaca', 'Touro', 'Boi'
  status: StatusAnimal;
  lote_id: string | null;
  peso_atual: number | null;
  mae_id: string | null;
  pai_id: string | null;
  raca: string | null;
  observacoes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lote {
  id: string;
  fazenda_id: string;
  nome: string;
  descricao: string | null;
  data_criacao: string;
  created_at: string;
  updated_at: string;
}

export interface EventoRebanho {
  id: string;
  fazenda_id: string;
  animal_id: string;
  tipo: TipoEvento;
  data_evento: string; // ISO date
  peso_kg: number | null;
  lote_id_destino: string | null;
  comprador: string | null;
  valor_venda: number | null;
  observacoes: string | null;
  usuario_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PesoAnimal {
  id: string;
  fazenda_id: string;
  animal_id: string;
  data_pesagem: string; // ISO date
  peso_kg: number;
  observacoes: string | null;
  created_at: string;
}

// ========== PAYLOADS DISCRIMINADOS ==========

export type EventoPayloadBase = {
  animal_id: string;
  data_evento: string;
  observacoes?: string;
};

export type EventoNascimentoPayload = EventoPayloadBase & {
  tipo: TipoEvento.NASCIMENTO;
};

export type EventoPesagemPayload = EventoPayloadBase & {
  tipo: TipoEvento.PESAGEM;
  peso_kg: number;
};

export type EventoMortePayload = EventoPayloadBase & {
  tipo: TipoEvento.MORTE;
};

export type EventoVendaPayload = EventoPayloadBase & {
  tipo: TipoEvento.VENDA;
  comprador?: string;
  valor_venda?: number;
};

export type EventoTransferenciaLotePayload = EventoPayloadBase & {
  tipo: TipoEvento.TRANSFERENCIA_LOTE;
  lote_id_destino: string;
};

export type EventoPayload =
  | EventoNascimentoPayload
  | EventoPesagemPayload
  | EventoMortePayload
  | EventoVendaPayload
  | EventoTransferenciaLotePayload;

// ========== INPUTS ==========

export type AnimalInput = Omit<Animal, 'id' | 'fazenda_id' | 'categoria' | 'peso_atual' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type LoteInput = Omit<Lote, 'id' | 'fazenda_id' | 'data_criacao' | 'created_at' | 'updated_at'>;
export type EventoRebanhoInput = Omit<EventoRebanho, 'id' | 'fazenda_id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// ========== CSV ==========

export interface AnimalCSVRow {
  brinco: string;
  sexo: 'Macho' | 'Fêmea';
  data_nascimento: string; // ISO ou DD/MM/YYYY
  tipo_rebanho?: 'leiteiro' | 'corte';
  lote?: string;
  raca?: string;
  observacoes?: string;
}

export interface CSVImportResult {
  total_linhas: number;
  importados: number;
  erros: Array<{ linha: number; brinco: string; mensagem: string }>;
  lote_criado_id?: string;
  lote_criado_nome?: string;
}

// ========== OFFLINE SYNC ==========

export interface EventoRebanhoSyncQueue {
  id: string;
  payload: EventoPayload;
  usuario_id: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'erro';
  tentativas: number;
  erro_mensagem?: string;
  criado_em: number;
  enviado_em?: number;
}
```

---

## 3. Schemas Zod

### Arquivo: `lib/validations/rebanho.ts`

```typescript
import { z } from 'zod';
import { TipoEvento } from '@/lib/types/rebanho';

// ========== ANIMAL ==========

export const criarAnimalSchema = z.object({
  brinco: z
    .string()
    .min(1, 'Brinco obrigatório')
    .max(255, 'Máximo 255 caracteres'),
  sexo: z.enum(['Macho', 'Fêmea'], { message: 'Sexo deve ser Macho ou Fêmea' }),
  tipo_rebanho: z.enum(['leiteiro', 'corte']).default('leiteiro'),
  data_nascimento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data de nascimento deve ser válida e não futura'),
  lote_id: z.string().uuid('Lote inválido').nullable().optional(),
  mae_id: z.string().uuid('Mãe inválida').nullable().optional(),
  pai_id: z.string().uuid('Pai inválido').nullable().optional(),
  raca: z.string().max(255).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export const editarAnimalSchema = z.object({
  data_nascimento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data de nascimento deve ser válida e não futura')
    .optional(),
  lote_id: z.string().uuid('Lote inválido').nullable().optional(),
  mae_id: z.string().uuid('Mãe inválida').nullable().optional(),
  pai_id: z.string().uuid('Pai inválido').nullable().optional(),
  raca: z.string().max(255).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export type CriarAnimalInput = z.infer<typeof criarAnimalSchema>;
export type EditarAnimalInput = z.infer<typeof editarAnimalSchema>;

// ========== LOTE ==========

export const criarLoteSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  descricao: z.string().max(500).optional().nullable(),
});

export const editarLoteSchema = criarLoteSchema;

export type CriarLoteInput = z.infer<typeof criarLoteSchema>;

// ========== EVENTOS ==========

export const criarEventoNascimentoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.NASCIMENTO),
  data_evento: z.string().refine((val) => {
    const date = new Date(val);
    return date <= new Date() && !isNaN(date.getTime());
  }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export const criarEventoPesagemSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.PESAGEM),
  data_evento: z.string().refine((val) => {
    const date = new Date(val);
    return date <= new Date() && !isNaN(date.getTime());
  }, 'Data do evento deve ser válida e não futura'),
  peso_kg: z.number().positive('Peso deve ser maior que 0').max(2000),
  observacoes: z.string().optional().nullable(),
});

export const criarEventoMorteSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.MORTE),
  data_evento: z.string().refine((val) => {
    const date = new Date(val);
    return date <= new Date() && !isNaN(date.getTime());
  }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export const criarEventoVendaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.VENDA),
  data_evento: z.string().refine((val) => {
    const date = new Date(val);
    return date <= new Date() && !isNaN(date.getTime());
  }, 'Data do evento deve ser válida e não futura'),
  comprador: z.string().max(255).optional().nullable(),
  valor_venda: z.number().nonnegative().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export const criarEventoTransferenciaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.TRANSFERENCIA_LOTE),
  data_evento: z.string().refine((val) => {
    const date = new Date(val);
    return date <= new Date() && !isNaN(date.getTime());
  }, 'Data do evento deve ser válida e não futura'),
  lote_id_destino: z.string().uuid('Lote destino inválido'),
  observacoes: z.string().optional().nullable(),
});

export const criarEventoSchema = z.union([
  criarEventoNascimentoSchema,
  criarEventoPesagemSchema,
  criarEventoMorteSchema,
  criarEventoVendaSchema,
  criarEventoTransferenciaSchema,
]);

export type CriarEventoInput = z.infer<typeof criarEventoSchema>;

// ========== CSV ==========

export const animalCSVRowSchema = z.object({
  brinco: z.string().min(1, 'Brinco obrigatório').max(255),
  sexo: z.enum(['Macho', 'Fêmea']),
  data_nascimento: z
    .string()
    .refine((val) => {
      const isoDate = new Date(val);
      if (!isNaN(isoDate.getTime()) && isoDate <= new Date()) return true;
      const [d, m, y] = val.split('/');
      if (d && m && y) {
        const date = new Date(`${y}-${m}-${d}`);
        return date <= new Date() && !isNaN(date.getTime());
      }
      return false;
    }, 'Data inválida (use ISO ou DD/MM/YYYY)')
    .transform((val) => {
      const isoDate = new Date(val);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0];
      }
      const [d, m, y] = val.split('/');
      return `${y}-${m}-${d}`;
    }),
  tipo_rebanho: z.enum(['leiteiro', 'corte']).default('leiteiro'),
  lote: z.string().optional().nullable(),
  raca: z.string().max(255).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export type AnimalCSVRowInput = z.infer<typeof animalCSVRowSchema>;
```

---

## 4. Camada de Dados: Assinaturas

### Arquivo: `lib/supabase/rebanho.ts`

```typescript
/**
 * Queries para módulo Rebanho — ASSINATURAS APENAS
 */

import type {
  Animal,
  Lote,
  EventoRebanho,
  AnimalInput,
  LoteInput,
  EventoRebanhoInput,
  CSVImportResult,
} from '@/lib/types/rebanho';

export interface AnimaisQueries {
  list(filtros?: { status?: string; lote_id?: string; sexo?: string }, pagina?: number, limite?: number): Promise<{ dados: Animal[]; total: number }>;
  getById(id: string): Promise<Animal>;
  getByBrinco(brinco: string): Promise<Animal | null>;
  create(payload: AnimalInput): Promise<Animal>;
  update(id: string, payload: Partial<AnimalInput>): Promise<Animal>;
  remove(id: string): Promise<void>;
  listAtivos(): Promise<Animal[]>;
  search(query: string, limite?: number): Promise<Animal[]>;
}

export interface LotesQueries {
  list(pagina?: number, limite?: number): Promise<{ dados: Lote[]; total: number }>;
  getById(id: string): Promise<Lote>;
  create(payload: LoteInput): Promise<Lote>;
  update(id: string, payload: Partial<LoteInput>): Promise<Lote>;
  remove(id: string): Promise<void>;
  countAnimaisAtivos(lote_id: string): Promise<number>;
  getByNome(nome: string): Promise<Lote | null>;
}

export interface EventosQueries {
  listPorAnimal(animal_id: string): Promise<EventoRebanho[]>;
  list(filtros?: { tipo?: string; data_inicio?: string; data_fim?: string }, pagina?: number, limite?: number): Promise<{ dados: EventoRebanho[]; total: number }>;
  getById(id: string): Promise<EventoRebanho>;
  create(payload: EventoRebanhoInput & { usuario_id: string }): Promise<EventoRebanho>;
  remove(id: string): Promise<void>;
}

export const rebanhoQueries = {
  animais: {} as AnimaisQueries,
  lotes: {} as LotesQueries,
  eventos: {} as EventosQueries,
};
```

---

## 5. Server Actions — Assinaturas

### Arquivo: `app/dashboard/rebanho/actions.ts`

```typescript
'use server';

import type {
  CriarAnimalInput,
  EditarAnimalInput,
  CriarLoteInput,
  CriarEventoInput,
  CSVImportResult,
} from '@/lib/types/rebanho';

// Apenas Administrador pode criar/editar/deletar animais e lotes
export async function criarAnimalAction(formData: unknown): Promise<{ success: boolean; animal_id?: string; erro?: string }>;
export async function editarAnimalAction(id: string, formData: unknown): Promise<{ success: boolean; erro?: string }>;
export async function deletarAnimalAction(id: string): Promise<{ success: boolean; erro?: string }>;

export async function criarLoteAction(formData: unknown): Promise<{ success: boolean; lote_id?: string; erro?: string }>;
export async function editarLoteAction(id: string, formData: unknown): Promise<{ success: boolean; erro?: string }>;
export async function deletarLoteAction(id: string): Promise<{ success: boolean; erro?: string }>;

export async function transferirAnimaisEmMassaAction(
  animal_ids: string[],
  lote_id_destino: string,
): Promise<{ success: boolean; transferidos?: number; erro?: string }>;

// Administrador e Operador podem lançar eventos
export async function lancarEventoAction(formData: unknown): Promise<{ success: boolean; evento_id?: string; erro?: string }>;
export async function deletarEventoAction(id: string): Promise<{ success: boolean; erro?: string }>;

// Apenas Administrador pode importar CSV
export async function importarCSVAction(formData: FormData): Promise<CSVImportResult>;

// Offline sync para todos
export async function sincronizarEventosOfflineAction(eventos: any[]): Promise<{ success: boolean; sincronizados?: number; erro?: string }>;
```

---

## 6. Árvore de Arquivos

```
docs/features/rebanho/fase-1-fundacao/
├── 01-prd.md
└── 02-spec.md (este arquivo)

lib/
├── types/
│   └── rebanho.ts (novo)
├── validations/
│   └── rebanho.ts (novo)
└── supabase/
    └── rebanho.ts (novo)

app/dashboard/rebanho/
├── page.tsx (listagem animais)
├── [id]/
│   ├── page.tsx (detalhe animal)
│   ├── editar.tsx
│   └── eventos.tsx
├── lotes/
│   ├── page.tsx (listagem lotes)
│   ├── [id]/page.tsx
│   └── criar.tsx
├── importar/page.tsx
├── actions.ts
└── layout.tsx

components/rebanho/
├── AnimalListagem.tsx
├── AnimalDetalhes.tsx
├── AnimalFormDialog.tsx
├── EventoFormDialog.tsx
├── LoteListagem.tsx
├── LoteFormDialog.tsx
├── CSVImportDialog.tsx
├── EventoTabs.tsx
├── GenealogyTree.tsx
└── offline-status-banner.tsx

tests/rebanho/__tests__/
├── rebanho.queries.test.ts
├── rebanho.validations.test.ts
├── rebanho.csv-import.test.ts
└── rebanho.offline-sync.test.ts
```

---

## 7. Estratégia CSV

### Fluxo

1. Upload arquivo CSV (máx 10MB)
2. Parse com Papa.parse() no cliente
3. Preview primeiras 5 linhas com mapping
4. Admin confirma mapping
5. Server: validar cada linha (Zod)
6. Detecção de duplicatas por (brinco, fazenda_id)
7. Criar lote "Importação YYYY-MM-DD" se não existir
8. Bulk insert atômico em transação
9. Criar evento "nascimento" para cada animal
10. Retornar CSVImportResult com erros

### Validação Linha a Linha

- **brinco**: obrigatório, unique por fazenda (soft delete respeitado)
- **sexo**: Macho ou Fêmea
- **data_nascimento**: ISO ou DD/MM/YYYY, ≤ hoje
- **tipo_rebanho**: leiteiro ou corte (default leiteiro)
- **lote**: nome (criado se não existir)
- **raca**: opcional
- **observacoes**: opcional

---

## 8. Offline & Sync (IndexedDB)

### Estrutura

```typescript
events_rebanho_sync_queue: {
  id: string (nanoid)
  payload: EventoPayload
  usuario_id: string
  status: 'pendente' | 'enviando' | 'enviado' | 'erro'
  tentativas: number
  erro_mensagem?: string
  criado_em: number (timestamp ms)
  enviado_em?: number
}
```

### Fluxo

1. Evento lançado offline → enfileirado em IndexedDB
2. Toast: "Evento enfileirado"
3. Ao reconectar: sincronizar automaticamente
4. Se conflito (animal deletado/morto/vendido): pedir confirmação
5. Toast final: "X eventos sincronizados"

---

## 9. Ordem de Implementação (T5–T15)

### T5: Fundação (Migration SQL + Tipos + Zod)

- [ ] Migration SQL (tabelas, enums, índices, RLS, triggers)
- [ ] Tipos TypeScript (lib/types/rebanho.ts)
- [ ] Schemas Zod (lib/validations/rebanho.ts)
- **Critério**: `npm run build` sem erros; RLS testado

### T6: Queries + Tests

- [ ] Implementar lib/supabase/rebanho.ts
- [ ] Testes Vitest ≥ 80% cobertura
- **Critério**: `npm run test` com queries testadas

### T7: Server Actions

- [ ] Implementar app/dashboard/rebanho/actions.ts
- [ ] Validação com Zod
- **Critério**: Ações testadas; permissões por perfil validadas

### T8: CSV Import

- [ ] Importação com validação linha a linha
- [ ] Detecção de duplicatas por brinco
- [ ] Bulk insert atômico
- **Critério**: 100 animais em < 30s

### T9: UI Listagem & CRUD (Admin)

- [ ] AnimalListagem, AnimalFormDialog, LoteListagem, LoteFormDialog
- [ ] Páginas rebanho/page.tsx, lotes/page.tsx
- **Critério**: Admin consegue criar animal/lote; UI mobile-responsive

### T10: Detalhe & Genealogia

- [ ] AnimalDetalhes, GenealogyTree, navegação recursiva
- [ ] Página [id]/page.tsx
- **Critério**: Genealogia renderiza; links funcionam

### T11: Eventos & Lançamento (Admin + Operador)

- [ ] EventoFormDialog (mobile-first)
- [ ] EventoTabs (abas por tipo)
- [ ] Validação discriminada
- **Critério**: Lançar pesagem em < 3 toques; sem erros

### T12: CSV Import UI

- [ ] CSVImportDialog com preview e mapeamento
- [ ] Exibição de resultado + relatório de erros
- [ ] Página importar/page.tsx
- **Critério**: 100 animais importados em < 30s

### T13: Offline & Sync

- [ ] Enfileiramento em IndexedDB
- [ ] Sincronização automática
- [ ] Detecção de conflitos
- [ ] offline-status-banner
- **Critério**: Lançar evento offline → sincronizar sem erros

### T14: Permissões & RLS

- [ ] Validar RLS (Admin CRUD, Operador eventos, Visualizador lê)
- [ ] Esconder botões conforme perfil
- [ ] Testes de autorização
- **Critério**: Operador não consegue criar animal; Visualizador não vê botões

### T15: API & Integração

- [ ] GET /api/rebanho/animais-ativos?fazenda_id=X
- [ ] Retornar: id, brinco, sexo, categoria, peso_atual, data_nascimento
- [ ] Testes E2E
- **Critério**: API responde em < 500ms

---

## 10. Checklist de Aceite

### Funcionalidade

- [ ] Criar animal (brinco, sexo, data nascimento, tipo rebanho)
- [ ] Editar animal (data nascimento → recalcula categoria)
- [ ] Soft delete animal (deletado apenas se sem eventos)
- [ ] Listar animais com filtros (status, sexo, lote, categoria)
- [ ] Buscar por brinco
- [ ] Criar/editar/deletar lote
- [ ] Importar CSV (brinco obrigatório, validação linha a linha, detecção duplicatas)
- [ ] Lançar 5 tipos evento (nascimento, pesagem, morte, venda, transferência)
- [ ] Listar eventos por animal
- [ ] Transferência em massa (multiselect)
- [ ] Genealogia (mãe ← animal → pai, navegação recursiva)
- [ ] Categoria automática recalculada

### Permissões

- [ ] Admin: CRUD animal, CRUD lote, lançar evento, deletar evento, importar CSV
- [ ] Operador: apenas lançar evento (sem criar/editar animal/lote)
- [ ] Visualizador: apenas leitura

### Offline

- [ ] Evento offline enfileirado em IndexedDB
- [ ] Sincronização automática ao reconectar
- [ ] Detecção de conflitos (animal deletado, morto, vendido)
- [ ] UI para resolução (confirmar ou descartar)

### Segurança

- [ ] RLS em 4 tabelas (animais, lotes, eventos, pesos)
- [ ] Filtro por fazenda_id obrigatório
- [ ] Soft delete respeitado (admin vê deletados)
- [ ] Eventos imutáveis (sem UPDATE)

### Qualidade

- [ ] `npm run build` sem erros TypeScript
- [ ] `npm run lint` sem erros ESLint
- [ ] `npm run test` ≥ 237 testes passando
- [ ] Cobertura ≥ 80% em lib/supabase/rebanho.ts
- [ ] Sem `type any`
- [ ] Props interfaces explícitas
- [ ] Hooks com dependências corretas

### Mobile

- [ ] Tela de evento mobile-first (campos 48px+, teclado numérico)
- [ ] Grid responsivo (2–3 colunas)
- [ ] Paginação (25 por página mobile)

### API

- [ ] GET /api/rebanho/animais-ativos retorna (id, brinco, sexo, categoria, peso_atual, data_nascimento)
- [ ] Resposta em < 500ms
- [ ] Apenas status='Ativo'

---

## 11. Notas Importantes

### Campo 'brinco'

- Identificador único por animal dentro de fazenda
- TEXT NOT NULL
- Índice unique partial: `(fazenda_id, brinco) WHERE deleted_at IS NULL`
- Imutável após criação

### Permissões (DECISÃO CONFIRMADA)

- **Admin**: CRUD animais, CRUD lotes, lançar/deletar evento, importar CSV, ver deletados
- **Operador**: APENAS lançar evento (não cria animal, não cria lote, não edita, não deleta)
- **Visualizador**: read-only

### Categoria (DECISÃO CONFIRMADA)

- TEXT NOT NULL, não enum
- Calculado por trigger SQL antes do INSERT/UPDATE
- Valores: 'Bezerro(a)', 'Macho Jovem', 'Fêmea Jovem', 'Novilho', 'Novilha', 'Vaca', 'Touro', 'Boi'
- Recalculado sempre que tipo_rebanho, sexo ou data_nascimento muda

### Performance

- Índices em fazenda_id, status, brinco, data_pesagem
- Bulk import: 500 linhas em < 10s
- Listagem 1000+ animais: < 2s
- Busca tempo real: < 500ms

---

**FIM DA ESPECIFICAÇÃO — Versão 1.1 (Decisões Confirmadas)**
