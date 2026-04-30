# SPEC — Módulo de Rebanho — Fase 1: Fundação

**Data**: 2026-04-30  
**Status**: Especificação Técnica Completa  
**Versão**: 1.0  
**Baseado em**: 01-prd.md (v1.1)

---

## 1. Migration SQL Completa

### 1.1 Enums (tipos PostgreSQL)

```sql
-- Categoria de animal (leiteiro ou corte)
CREATE TYPE categoria_animal AS ENUM ('leiteiro', 'corte');

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
  numero_animal TEXT NOT NULL,
  sexo TEXT NOT NULL CHECK (sexo IN ('Macho', 'Fêmea')),
  tipo_rebanho categoria_animal NOT NULL DEFAULT 'leiteiro',
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
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_animais_fazenda_id ON public.animais(fazenda_id);
CREATE INDEX idx_animais_fazenda_status ON public.animais(fazenda_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_animais_lote_id ON public.animais(lote_id);
CREATE INDEX idx_animais_numero_animal ON public.animais(fazenda_id, numero_animal);
CREATE INDEX idx_animais_data_nascimento ON public.animais(data_nascimento);
CREATE INDEX idx_animais_mae_id ON public.animais(mae_id);
CREATE INDEX idx_animais_pai_id ON public.animais(pai_id);

-- Partial Unique Index: numero_animal único por fazenda (apenas não-deletados)
CREATE UNIQUE INDEX idx_animais_numero_animal_unique_not_deleted 
  ON public.animais(fazenda_id, numero_animal) 
  WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.animais ENABLE ROW LEVEL SECURITY;

-- Política SELECT única: usuário vê animais da sua fazenda (deletados apenas se admin)
CREATE POLICY "animais_select" ON public.animais
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND 
    (deleted_at IS NULL OR sou_admin())
  );

CREATE POLICY "animais_insert" ON public.animais
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "animais_update" ON public.animais
  FOR UPDATE
  USING (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

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
  
  -- Constraint: nome único por fazenda
  CONSTRAINT lotes_nome_fazenda_id_unique UNIQUE (fazenda_id, nome)
);

-- Índices
CREATE INDEX idx_lotes_fazenda_id ON public.lotes(fazenda_id);

-- RLS
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotes_select_mesma_fazenda" ON public.lotes
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY "lotes_insert" ON public.lotes
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "lotes_update" ON public.lotes
  FOR UPDATE
  USING (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

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
  
  -- Constraint: peso_kg obrigatório e > 0 se tipo = pesagem
  CONSTRAINT eventos_rebanho_peso_pesagem_check 
    CHECK (
      tipo != 'pesagem' OR (peso_kg IS NOT NULL AND peso_kg > 0)
    ),
  
  -- Constraint: lote_id_destino obrigatório se tipo = transferencia_lote
  CONSTRAINT eventos_rebanho_lote_transferencia_check 
    CHECK (
      tipo != 'transferencia_lote' OR lote_id_destino IS NOT NULL
    )
);

-- Índices
CREATE INDEX idx_eventos_rebanho_fazenda_id ON public.eventos_rebanho(fazenda_id);
CREATE INDEX idx_eventos_rebanho_animal_id ON public.eventos_rebanho(animal_id);
CREATE INDEX idx_eventos_rebanho_tipo ON public.eventos_rebanho(tipo);
CREATE INDEX idx_eventos_rebanho_data_evento ON public.eventos_rebanho(data_evento DESC);

-- RLS
ALTER TABLE public.eventos_rebanho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_rebanho_select" ON public.eventos_rebanho
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND 
    (deleted_at IS NULL OR sou_admin())
  );

CREATE POLICY "eventos_rebanho_insert" ON public.eventos_rebanho
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "eventos_rebanho_update" ON public.eventos_rebanho
  FOR UPDATE
  USING (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

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
  
  -- Constraint: uma pesagem por animal por data
  CONSTRAINT pesos_animal_animal_data_unique UNIQUE (animal_id, data_pesagem)
);

-- Índices
CREATE INDEX idx_pesos_animal_fazenda_id ON public.pesos_animal(fazenda_id);
CREATE INDEX idx_pesos_animal_animal_id ON public.pesos_animal(animal_id);
CREATE INDEX idx_pesos_animal_data_pesagem ON public.pesos_animal(animal_id, data_pesagem DESC);

-- RLS
ALTER TABLE public.pesos_animal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pesos_animal_select_mesma_fazenda" ON public.pesos_animal
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY "pesos_animal_insert" ON public.pesos_animal
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());
```

### 1.6 Trigger: Validar Genealogia (mae_id, pai_id mesma fazenda)

```sql
CREATE OR REPLACE FUNCTION public.validar_genealogia_animal()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar mae_id: se preenchida, deve ser da mesma fazenda
  IF NEW.mae_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.animais 
      WHERE id = NEW.mae_id AND fazenda_id = NEW.fazenda_id
    ) THEN
      RAISE EXCEPTION 'Mãe deve ser um animal da mesma fazenda';
    END IF;
  END IF;

  -- Validar pai_id: se preenchido, deve ser da mesma fazenda
  IF NEW.pai_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.animais 
      WHERE id = NEW.pai_id AND fazenda_id = NEW.fazenda_id
    ) THEN
      RAISE EXCEPTION 'Pai deve ser um animal da mesma fazenda';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER animais_validar_genealogia_trigger
BEFORE INSERT OR UPDATE ON public.animais
FOR EACH ROW
EXECUTE FUNCTION public.validar_genealogia_animal();
```

### 1.7 Trigger: `set_fazenda_id` (animais, lotes, eventos_rebanho, pesos_animal)

```sql
-- Trigger para animais
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

-- Trigger para lotes
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

-- Trigger para eventos_rebanho
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

-- Trigger para pesos_animal
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

### 1.8 Trigger: `update_updated_at`

```sql
-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para animais
CREATE TRIGGER animais_update_updated_at_trigger
BEFORE UPDATE ON public.animais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para lotes
CREATE TRIGGER lotes_update_updated_at_trigger
BEFORE UPDATE ON public.lotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para eventos_rebanho
CREATE TRIGGER eventos_rebanho_update_updated_at_trigger
BEFORE UPDATE ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### 1.9 Trigger: Atualizar `peso_atual` em Pesagem

```sql
CREATE OR REPLACE FUNCTION public.atualizar_peso_atual_pesagem()
RETURNS TRIGGER AS $$
BEGIN
  -- Se evento é do tipo pesagem, criar registro em pesos_animal
  -- e atualizar peso_atual no animal
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

### 1.10 Trigger: Atualizar `status` em Morte/Venda

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

### 1.11 Trigger: Validar `lote_id_destino` em Transferência

```sql
CREATE OR REPLACE FUNCTION public.validar_lote_transferencia()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tipo = transferencia_lote, validar que lote_id_destino existe e pertence à mesma fazenda
  IF NEW.tipo = 'transferencia_lote' THEN
    IF NEW.lote_id_destino IS NULL THEN
      RAISE EXCEPTION 'Lote destino é obrigatório para transferência de lote';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.lotes 
      WHERE id = NEW.lote_id_destino AND fazenda_id = NEW.fazenda_id
    ) THEN
      RAISE EXCEPTION 'Lote destino deve pertencer à mesma fazenda';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_validar_lote_transferencia_trigger
BEFORE INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.validar_lote_transferencia();
```

### 1.12 Trigger: Atualizar `lote_id` em Transferência

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

### 1.13 Trigger: Recalcular Categoria Automática

```sql
CREATE OR REPLACE FUNCTION public.recalcular_categoria_animal()
RETURNS TRIGGER AS $$
DECLARE
  v_idade_anos NUMERIC;
  v_categoria TEXT;
BEGIN
  -- Calcular idade em anos
  v_idade_anos := (CURRENT_DATE - NEW.data_nascimento) / 365.25;
  
  -- Computar categoria baseado em tipo_rebanho + sexo + idade
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
 * Baseado em: SPEC-rebanho.md (2026-04-30)
 */

// ========== ENUMS ==========

export enum TipoRebanho {
  LEITEIRO = 'leiteiro',
  CORTE = 'corte',
}

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
  numero_animal: string;
  sexo: 'Macho' | 'Fêmea';
  tipo_rebanho: TipoRebanho;
  data_nascimento: string; // ISO date
  categoria: string;
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
  lote_id_destino: string | null; // Obrigatório se tipo = transferencia_lote
  comprador: string | null; // Opcional em venda
  valor_venda: number | null; // Opcional em venda
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

// ========== PAYLOADS DISCRIMINADOS POR TIPO DE EVENTO ==========

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
  comprador?: string; // Opcional
  valor_venda?: number; // Opcional
};

export type EventoTransferenciaLotePayload = EventoPayloadBase & {
  tipo: TipoEvento.TRANSFERENCIA_LOTE;
  lote_id_destino: string; // Obrigatório
};

export type EventoPayload =
  | EventoNascimentoPayload
  | EventoPesagemPayload
  | EventoMortePayload
  | EventoVendaPayload
  | EventoTransferenciaLotePayload;

// ========== INPUTS PARA CRIAÇÃO/EDIÇÃO ==========

export type AnimalInput = Omit<Animal, 'id' | 'fazenda_id' | 'categoria' | 'peso_atual' | 'created_at' | 'updated_at' | 'deleted_at'>;

export type LoteInput = Omit<Lote, 'id' | 'fazenda_id' | 'data_criacao' | 'created_at' | 'updated_at'>;

export type EventoRebanhoInput = Omit<EventoRebanho, 'id' | 'fazenda_id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  usuario_id?: string; // opcional na UI, preenchido no servidor
};

export type PesoAnimalInput = Omit<PesoAnimal, 'id' | 'fazenda_id' | 'created_at'>;

// ========== CSV ROW ==========

export interface AnimalCSVRow {
  numero_animal: string;
  sexo: 'Macho' | 'Fêmea';
  data_nascimento: string; // ISO date ou DD/MM/YYYY
  tipo_rebanho?: 'leiteiro' | 'corte';
  lote?: string; // nome do lote (será criado se não existir)
  raca?: string;
  observacoes?: string;
}

// ========== VALIDAÇÃO CSV ==========

export interface AnimalCSVValidationResult {
  linha: number;
  numero_animal: string;
  status: 'sucesso' | 'erro';
  mensagem?: string;
}

export interface CSVImportResult {
  total_linhas: number;
  importados: number;
  erros: AnimalCSVValidationResult[];
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
  criado_em: number; // timestamp ms
  enviado_em?: number;
}
```

---

## 3. Schemas Zod

### Arquivo: `lib/validations/rebanho.ts`

```typescript
// lib/validations/rebanho.ts

import { z } from 'zod';
import { TipoRebanho, TipoEvento } from '@/lib/types/rebanho';

// ========== ANIMAL ==========

export const criarAnimalSchema = z.object({
  numero_animal: z
    .string()
    .min(1, 'Número do animal obrigatório')
    .max(255, 'Máximo 255 caracteres'),
  sexo: z.enum(['Macho', 'Fêmea'], { message: 'Sexo deve ser Macho ou Fêmea' }),
  tipo_rebanho: z
    .enum(['leiteiro', 'corte'], { message: 'Tipo de rebanho inválido' })
    .default('leiteiro'),
  data_nascimento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data de nascimento deve ser válida e não futura'),
  lote_id: z.string().uuid('Lote inválido').nullable().optional(),
  mae_id: z.string().uuid('Mãe inválida').nullable().optional(),
  pai_id: z.string().uuid('Pai inválido').nullable().optional(),
  raca: z
    .string()
    .max(255, 'Máximo 255 caracteres')
    .optional()
    .nullable(),
  observacoes: z
    .string()
    .optional()
    .nullable(),
});

export const editarAnimalSchema = z.object({
  sexo: z
    .enum(['Macho', 'Fêmea'], { message: 'Sexo deve ser Macho ou Fêmea' })
    .optional(),
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
  raca: z
    .string()
    .max(255, 'Máximo 255 caracteres')
    .optional()
    .nullable(),
  observacoes: z
    .string()
    .optional()
    .nullable(),
});

export type CriarAnimalInput = z.infer<typeof criarAnimalSchema>;
export type EditarAnimalInput = z.infer<typeof editarAnimalSchema>;

// ========== LOTE ==========

export const criarLoteSchema = z.object({
  nome: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(255, 'Máximo 255 caracteres'),
  descricao: z
    .string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .nullable(),
});

export const editarLoteSchema = criarLoteSchema;

export type CriarLoteInput = z.infer<typeof criarLoteSchema>;
export type EditarLoteInput = z.infer<typeof editarLoteSchema>;

// ========== EVENTOS — NASCIMENTO ==========

export const criarEventoNascimentoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.NASCIMENTO),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoNascimentoInput = z.infer<typeof criarEventoNascimentoSchema>;

// ========== EVENTOS — PESAGEM ==========

export const criarEventoPesagemSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.PESAGEM),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  peso_kg: z
    .number()
    .positive('Peso deve ser maior que 0')
    .max(2000, 'Peso máximo: 2000 kg'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoPesagemInput = z.infer<typeof criarEventoPesagemSchema>;

// ========== EVENTOS — MORTE ==========

export const criarEventoMorteSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.MORTE),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoMorteInput = z.infer<typeof criarEventoMorteSchema>;

// ========== EVENTOS — VENDA ==========

export const criarEventoVendaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.VENDA),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
  comprador: z.string().max(255, 'Máximo 255 caracteres').optional().nullable(),
  valor_venda: z.number().nonnegative('Valor não pode ser negativo').optional().nullable(),
});

export type CriarEventoVendaInput = z.infer<typeof criarEventoVendaSchema>;

// ========== EVENTOS — TRANSFERÊNCIA DE LOTE ==========

export const criarEventoTransferenciaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.TRANSFERENCIA_LOTE),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  lote_id_destino: z.string().uuid('Lote destino obrigatório e inválido'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoTransferenciaInput = z.infer<typeof criarEventoTransferenciaSchema>;

// ========== EVENTO GENÉRICO ==========

export const criarEventoSchema = z.union([
  criarEventoNascimentoSchema,
  criarEventoPesagemSchema,
  criarEventoMorteSchema,
  criarEventoVendaSchema,
  criarEventoTransferenciaSchema,
]);

export type CriarEventoInput = z.infer<typeof criarEventoSchema>;

// ========== CSV IMPORT ==========

export const animalCSVRowSchema = z.object({
  numero_animal: z
    .string()
    .min(1, 'Número do animal obrigatório')
    .max(255),
  sexo: z.enum(['Macho', 'Fêmea'], { message: 'Sexo deve ser Macho ou Fêmea' }),
  data_nascimento: z
    .string()
    .refine((val) => {
      // Aceita ISO ou DD/MM/YYYY
      const isoDate = new Date(val);
      if (!isNaN(isoDate.getTime()) && isoDate <= new Date()) return true;
      
      const ddmmyyyy = val.split('/');
      if (ddmmyyyy.length === 3) {
        const date = new Date(`${ddmmyyyy[2]}-${ddmmyyyy[1]}-${ddmmyyyy[0]}`);
        return date <= new Date() && !isNaN(date.getTime());
      }
      return false;
    }, 'Data de nascimento inválida (use ISO ou DD/MM/YYYY)')
    .transform((val) => {
      // Normalizar para ISO
      const isoDate = new Date(val);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0];
      }
      const [d, m, y] = val.split('/');
      return `${y}-${m}-${d}`;
    }),
  tipo_rebanho: z
    .enum(['leiteiro', 'corte'])
    .default('leiteiro'),
  lote: z.string().optional().nullable(),
  raca: z.string().max(255).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export type AnimalCSVRowInput = z.infer<typeof animalCSVRowSchema>;

export const importarCSVSchema = z.object({
  arquivo: z.instanceof(File, { message: 'Arquivo inválido' })
    .refine((file) => file.type === 'text/csv' || file.name.endsWith('.csv'), 'Apenas arquivo CSV')
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Máximo 10MB'),
  criar_lote_automatico: z.boolean().default(true),
});

export type ImportarCSVInput = z.infer<typeof importarCSVSchema>;
```

---

## 4. Camada de Dados: Queries Supabase

### Arquivo: `lib/supabase/rebanho.ts`

```typescript
/**
 * Camada de acesso a dados para o módulo Rebanho
 * Padrão: ASSINATURAS APENAS (sem implementação nesta spec)
 */

import type {
  Animal,
  Lote,
  EventoRebanho,
  PesoAnimal,
  AnimalInput,
  LoteInput,
  EventoRebanhoInput,
  PesoAnimalInput,
  CSVImportResult,
} from '@/lib/types/rebanho';

// ========== ANIMAIS ==========

export interface AnimaisQueries {
  // Listar animais da fazenda com filtros opcionais
  list(
    filtros?: {
      status?: string;
      lote_id?: string;
      categoria?: string;
      sexo?: string;
    },
    pagina?: number,
    limite?: number,
  ): Promise<{ dados: Animal[]; total: number }>;

  // Buscar animal por ID
  getById(id: string): Promise<Animal>;

  // Buscar animal por número (dentro da fazenda)
  getByNumero(numero_animal: string): Promise<Animal | null>;

  // Criar animal
  create(payload: AnimalInput): Promise<Animal>;

  // Atualizar animal
  update(id: string, payload: Partial<AnimalInput>): Promise<Animal>;

  // Soft delete animal
  remove(id: string): Promise<void>;

  // Listar animais ativos (para Planejamento de Silagem)
  listAtivos(): Promise<Animal[]>;

  // Buscar por query (número ou nome)
  search(query: string, limite?: number): Promise<Animal[]>;

  // Contar animais por status
  countPorStatus(): Promise<Record<string, number>>;
}

// ========== LOTES ==========

export interface LotesQueries {
  // Listar lotes da fazenda
  list(pagina?: number, limite?: number): Promise<{ dados: Lote[]; total: number }>;

  // Buscar lote por ID
  getById(id: string): Promise<Lote>;

  // Criar lote
  create(payload: LoteInput): Promise<Lote>;

  // Atualizar lote
  update(id: string, payload: Partial<LoteInput>): Promise<Lote>;

  // Deletar lote (com validações)
  remove(id: string): Promise<void>;

  // Contar animais ativos em um lote
  countAnimaisAtivos(lote_id: string): Promise<number>;

  // Buscar lotes por nome (para importação)
  getByNome(nome: string): Promise<Lote | null>;
}

// ========== EVENTOS ==========

export interface EventosQueries {
  // Listar eventos de um animal
  listPorAnimal(animal_id: string): Promise<EventoRebanho[]>;

  // Listar eventos da fazenda (com filtros opcionais)
  list(
    filtros?: {
      tipo?: string;
      data_inicio?: string;
      data_fim?: string;
    },
    pagina?: number,
    limite?: number,
  ): Promise<{ dados: EventoRebanho[]; total: number }>;

  // Buscar evento por ID
  getById(id: string): Promise<EventoRebanho>;

  // Criar evento (com rLS obrigatório)
  create(payload: EventoRebanhoInput & { usuario_id: string }): Promise<EventoRebanho>;

  // Soft delete evento (apenas admin)
  remove(id: string): Promise<void>;

  // Listar pesos de um animal
  listPesos(animal_id: string): Promise<PesoAnimal[]>;
}

// ========== PESOS ==========

export interface PesosQueries {
  // Listar pesos de um animal
  listPorAnimal(animal_id: string): Promise<PesoAnimal[]>;

  // Buscar peso mais recente de um animal
  getUltimoPeso(animal_id: string): Promise<PesoAnimal | null>;

  // Criar registro de peso
  create(payload: PesoAnimalInput): Promise<PesoAnimal>;
}

// ========== IMPORTAÇÃO CSV ==========

export interface ImportacaoQueries {
  // Processar arquivo CSV
  importarCSV(
    arquivo: File,
    criarLoteAutomatico?: boolean,
  ): Promise<CSVImportResult>;

  // Validar linha de CSV
  validarLinhaCSV(
    linha: number,
    dados: Record<string, string>,
  ): Promise<{ valido: boolean; erro?: string }>;

  // Bulk insert de animais (com transação)
  bulkInsertAnimais(animais: AnimalInput[], lote_id: string): Promise<Animal[]>;
}

// ========== OBJETO EXPORTADO ==========

export const rebanhoQueries = {
  animais: {} as AnimaisQueries,
  lotes: {} as LotesQueries,
  eventos: {} as EventosQueries,
  pesos: {} as PesosQueries,
  importacao: {} as ImportacaoQueries,
};
```

---

## 5. Server Actions

### Arquivo: `app/dashboard/rebanho/actions.ts`

```typescript
/**
 * Server Actions para o módulo Rebanho
 * Padrão: ASSINATURAS APENAS (sem implementação nesta spec)
 */

'use server';

import type {
  CriarAnimalInput,
  EditarAnimalInput,
  CriarLoteInput,
  EditarLoteInput,
  CriarEventoInput,
  ImportarCSVInput,
  CSVImportResult,
} from '@/lib/types/rebanho';

// ========== ANIMAIS ==========

/**
 * Cria um novo animal na fazenda do usuário.
 * Valida com Zod e aplica RLS no servidor.
 */
export async function criarAnimalAction(
  formData: unknown,
): Promise<{ success: boolean; animal_id?: string; erro?: string }>;

/**
 * Edita um animal existente.
 * Recalcula categoria se data_nascimento mudar.
 */
export async function editarAnimalAction(
  id: string,
  formData: unknown,
): Promise<{ success: boolean; erro?: string }>;

/**
 * Soft delete de um animal (apenas admin).
 * Bloqueia se animal tiver eventos.
 */
export async function deletarAnimalAction(
  id: string,
): Promise<{ success: boolean; erro?: string }>;

// ========== LOTES ==========

/**
 * Cria um novo lote na fazenda.
 */
export async function criarLoteAction(
  formData: unknown,
): Promise<{ success: boolean; lote_id?: string; erro?: string }>;

/**
 * Edita lote existente.
 */
export async function editarLoteAction(
  id: string,
  formData: unknown,
): Promise<{ success: boolean; erro?: string }>;

/**
 * Deleta lote (apenas admin).
 * Bloqueia se tiver animais ativos.
 */
export async function deletarLoteAction(
  id: string,
): Promise<{ success: boolean; erro?: string }>;

/**
 * Transfere múltiplos animais entre lotes.
 * Cria evento de tipo "transferencia_lote" para cada animal.
 */
export async function transferirAnimaisEmMassaAction(
  animal_ids: string[],
  lote_id_destino: string,
): Promise<{ success: boolean; transferidos?: number; erro?: string }>;

// ========== EVENTOS ==========

/**
 * Lança um novo evento.
 * Dispara triggers para atualizar status, peso_atual, lote_id conforme tipo.
 */
export async function lancarEventoAction(
  formData: unknown,
): Promise<{ success: boolean; evento_id?: string; erro?: string }>;

/**
 * Soft delete de evento (apenas admin).
 */
export async function deletarEventoAction(
  id: string,
): Promise<{ success: boolean; erro?: string }>;

// ========== IMPORTAÇÃO CSV ==========

/**
 * Processa importação de CSV.
 * Valida cada linha, cria lote automaticamente se necessário,
 * bulk inserts animais, cria evento de "nascimento" para cada.
 * Retorna relatório com erros (se houver).
 */
export async function importarCSVAction(
  formData: FormData,
): Promise<CSVImportResult>;

/**
 * Gera relatório de erros da importação em CSV.
 */
export async function gerarRelatorioErrosImportacao(
  erros: { linha: number; numero_animal: string; mensagem: string }[],
): Promise<Blob>;

// ========== OFFLINE SYNC (IndexedDB) ==========

/**
 * Sincroniza eventos enfileirados localmente com servidor.
 * Chamado automaticamente ao reconectar.
 * Retorna contagem de eventos sincronizados.
 */
export async function sincronizarEventosOfflineAction(
  eventos: any[], // EventoRebanhoSyncQueue[]
): Promise<{ success: boolean; sincronizados?: number; erro?: string }>;
```

---

## 6. Árvore de Arquivos a Criar

```
docs/
└── features/
    └── rebanho/
        └── fase-1-fundacao/
            ├── 01-prd.md (existente)
            └── 02-spec.md (ESTE ARQUIVO)

lib/
├── types/
│   └── rebanho.ts (novo)
├── validations/
│   └── rebanho.ts (novo)
└── supabase/
    └── rebanho.ts (novo)

app/dashboard/
└── rebanho/
    ├── page.tsx (listagem de animais)
    ├── [id]/
    │   ├── page.tsx (detalhe de animal)
    │   ├── editar.tsx (dialog de edição)
    │   └── eventos.tsx (tab de eventos)
    ├── criar/
    │   └── page.tsx (dialog de novo animal)
    ├── importar/
    │   └── page.tsx (página de importação CSV)
    ├── lotes/
    │   ├── page.tsx (listagem de lotes)
    │   ├── [id]/
    │   │   ├── page.tsx (detalhe de lote)
    │   │   └── editar.tsx (dialog de edição)
    │   └── criar.tsx (dialog de novo lote)
    └── actions.ts (server actions)

components/
└── rebanho/
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

tests/
└── rebanho/
    ├── __tests__/
    │   ├── rebanho.queries.test.ts
    │   ├── rebanho.validations.test.ts
    │   ├── rebanho.csv-import.test.ts
    │   └── rebanho.offline-sync.test.ts
    └── fixtures/
        └── rebanho-fixtures.ts

lib/db/
└── syncQueue.ts (atualizar para EventoRebanhoSyncQueue)

api/
└── app/dashboard/rebanho/
    └── animais-ativos/
        └── route.ts (GET para Planejamento de Silagem)
```

---

## 7. Estratégia de Importação CSV

### 7.1 Fluxo Geral

```
1. Usuário seleciona arquivo CSV
2. UI valida tipo (text/csv) e tamanho (< 10MB)
3. Parse manual: Papa.parse() no cliente
4. Preview: exibir primeiras 5 linhas com mapping
5. Admin ajusta mapping de colunas (opcional)
6. Clica "Importar"
7. FormData enviado para Server Action
8. Server:
   - Reler CSV com Papa.parse()
   - Validar cada linha com animalCSVRowSchema
   - Coletar erros por linha
   - Se tem erros > 0 e usuário não confirmou: retornar para re-confirmação
   - Criar lote "Importação YYYY-MM-DD" se não existir
   - Bulk insert de animais em transação atômica
   - Para cada animal, criar evento de "nascimento" com data_evento = data_nascimento
   - Retornar CSVImportResult com relatório
9. UI exibe: "X animais importados com sucesso. Y erros em linhas Z."
10. Link para download de relatório de erros (CSV)
```

### 7.2 Validação Linha a Linha

```typescript
// Pseudocódigo
async function validarLinhaCSV(
  linha: number,
  dados: AnimalCSVRow,
): Promise<AnimalCSVValidationResult> {
  const resultado: AnimalCSVValidationResult = {
    linha,
    numero_animal: dados.numero_animal,
    status: 'sucesso',
  };

  // 1. Validar com Zod
  try {
    animalCSVRowSchema.parse(dados);
  } catch (err) {
    resultado.status = 'erro';
    resultado.mensagem = err.message; // Mensagem do Zod em português
    return resultado;
  }

  // 2. Validar unicidade de numero_animal por fazenda
  const existente = await q.animais.getByNumero(dados.numero_animal);
  if (existente) {
    resultado.status = 'erro';
    resultado.mensagem = `Animal ${dados.numero_animal} já existe nesta fazenda`;
    return resultado;
  }

  // 3. Validar referências (lote, mae_id, pai_id)
  if (dados.lote) {
    const lote = await q.lotes.getByNome(dados.lote);
    if (!lote && !criarLoteAutomatico) {
      resultado.status = 'erro';
      resultado.mensagem = `Lote "${dados.lote}" não existe`;
      return resultado;
    }
  }

  return resultado;
}
```

### 7.3 Detecção de Duplicatas

```typescript
// Validação no servidor antes do insert
async function validarDuplicatas(
  animais: AnimalInput[],
): Promise<{ duplicatas: Array<{ numero_animal: string; indice: number }> }> {
  const numeros = new Map<string, number[]>();
  const duplicatas: Array<{ numero_animal: string; indice: number }> = [];

  animais.forEach((animal, idx) => {
    const num = animal.numero_animal;
    if (!numeros.has(num)) {
      numeros.set(num, []);
    }
    numeros.get(num)!.push(idx);
  });

  numeros.forEach((indices, numero) => {
    if (indices.length > 1) {
      indices.forEach((idx) => {
        duplicatas.push({ numero_animal: numero, indice: idx });
      });
    }
  });

  return { duplicatas };
}
```

### 7.4 Bulk Insert em Transação

```typescript
// Pseudocódigo
async function bulkInsertAnimais(
  animais: AnimalInput[],
  lote_id: string,
): Promise<Animal[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Insert animais
  const { data: animaisInseridos, error: errorAnimais } = await supabase
    .from('animais')
    .insert(animais.map((a) => ({ ...a, lote_id })))
    .select('id, numero_animal, data_nascimento');

  if (errorAnimais) throw errorAnimais;

  // 2. Criar eventos de "nascimento" para cada animal
  const eventosNascimento = animaisInseridos.map((animal) => ({
    animal_id: animal.id,
    tipo: 'nascimento',
    data_evento: animal.data_nascimento,
    observacoes: 'Evento de nascimento importado via CSV',
    usuario_id: (await getCurrentUserId()),
  }));

  const { error: errorEventos } = await supabase
    .from('eventos_rebanho')
    .insert(eventosNascimento);

  if (errorEventos) throw errorEventos;

  return animaisInseridos;
}
```

---

## 8. Estratégia Offline: IndexedDB → Fila → Sync

### 8.1 Armazenamento Local (IndexedDB)

```typescript
// Estrutura IndexedDB
const dbName = 'gestsilo-pro';
const version = 2; // incrementar quando adicionar tabelas

const stores = {
  // Tabela existente
  silos_sync_queue: {
    keyPath: 'id',
    indexes: [{ name: 'status' }],
  },
  // NOVA: Tabela para eventos de rebanho
  eventos_rebanho_sync_queue: {
    keyPath: 'id',
    indexes: [{ name: 'status' }, { name: 'criado_em' }],
  },
};
```

### 8.2 Fluxo de Enfileiramento (Offline)

```typescript
// Quando usuário lança evento sem conexão:
async function lancarEventoOffline(
  payload: EventoPayload,
): Promise<void> {
  const queueItem: EventoRebanhoSyncQueue = {
    id: nanoid(),
    payload,
    usuario_id: currentUser.id,
    status: 'pendente',
    tentativas: 0,
    criado_em: Date.now(),
  };

  // 1. Inserir em IndexedDB
  const db = await openDB(dbName, version);
  await db.put('eventos_rebanho_sync_queue', queueItem);

  // 2. Renderizar localmente (optimistic update)
  // Estado local da tela atualiza imediatamente

  // 3. Toast: "Evento enfileirado. Sincronizando quando conectar..."
  toast.info(`Evento enfileirado. Sincronizando em ${timeToSync}min...`);
}
```

### 8.3 Sincronização Automática

```typescript
// Hook: useEventoRebanhoSync() — executado em useEffect na página
// Monitora online/offline status
useEffect(() => {
  const handleOnline = async () => {
    const queue = await getEventsFromQueue('pendente');
    
    if (queue.length === 0) {
      toast.success('Offline — nada para sincronizar');
      return;
    }

    toast.loading(`Sincronizando ${queue.length} eventos...`);

    try {
      const result = await sincronizarEventosOfflineAction(queue);
      
      if (result.success) {
        // Remover da fila
        for (const item of queue) {
          await removeFromQueue(item.id);
        }
        toast.success(`${result.sincronizados} eventos sincronizados`);
      } else {
        toast.error(result.erro);
      }
    } catch (error) {
      toast.error('Falha ao sincronizar. Tentando novamente...');
      // Retry automático em 30s (até 3 tentativas)
    }
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}, []);
```

### 8.4 Detecção de Conflitos & Resolução

```typescript
// Se um evento falhar:
async function sincronizarComRetry(
  queueItem: EventoRebanhoSyncQueue,
  maxTentativas: number = 3,
): Promise<{ sucesso: boolean; erro?: string }> {
  if (queueItem.tentativas >= maxTentativas) {
    return {
      sucesso: false,
      erro: `Falha após ${maxTentativas} tentativas`,
    };
  }

  try {
    const result = await lancarEventoAction(queueItem.payload);
    if (result.success) {
      await removeFromQueue(queueItem.id);
      return { sucesso: true };
    }
  } catch (error: any) {
    // Classificar erro
    if (error.code === 'ANIMAL_NAO_ENCONTRADO') {
      // Animal foi deletado — pedir confirmação ao usuário
      return {
        sucesso: false,
        erro: 'Animal foi deletado. Descartar evento?',
      };
    } else if (error.code === 'ANIMAL_MORTO_OU_VENDIDO') {
      // Animal mudou de status — pedir confirmação
      return {
        sucesso: false,
        erro: 'Animal já foi vendido/morreu. Descartar evento?',
      };
    }

    // Retry genérico
    queueItem.tentativas++;
    queueItem.erro_mensagem = error.message;
    await updateQueue(queueItem);

    return {
      sucesso: false,
      erro: `Tentativa ${queueItem.tentativas}/${maxTentativas} falhou`,
    };
  }
}

// UI: Notificação persistente com ações
// "Falha ao sincronizar evento. [Tentar Novamente] [Ver Fila] [Descartar]"
```

---

## 9. Ordem de Implementação (T5–T15)

### Iteração T5 (Fundação)

- [ ] T5.1: Criar migration SQL (tabelas, enums, índices, RLS, triggers)
- [ ] T5.2: Gerar tipos TypeScript (`lib/types/rebanho.ts`)
- [ ] T5.3: Criar schemas Zod (`lib/validations/rebanho.ts`)

**Critério de Conclusão**: `npm run build` sem erros; `npm run db:types` sincroniza; `npm run test` passa

---

### Iteração T6 (Camada de Dados)

- [ ] T6.1: Implementar queries em `lib/supabase/rebanho.ts`
  - `animais.list()`, `animais.getById()`, `animais.create()`, `animais.update()`, `animais.remove()`
  - `lotes.list()`, `lotes.create()`, `lotes.update()`, `lotes.remove()`
  - `eventos.create()`, `eventos.listPorAnimal()`, `eventos.remove()`
  - `pesos.listPorAnimal()`, `pesos.create()`
- [ ] T6.2: Adicionar `rebanhoQueries` a `q` em `queries-audit.ts`
- [ ] T6.3: Testes para queries (Vitest) — mínimo 80% cobertura

**Critério de Conclusão**: Testes passam; `npm run test` ≥ 237 testes

---

### Iteração T7 (Server Actions)

- [ ] T7.1: Implementar Server Actions em `app/dashboard/rebanho/actions.ts`
  - `criarAnimalAction()`, `editarAnimalAction()`, `deletarAnimalAction()`
  - `criarLoteAction()`, `editarLoteAction()`, `deletarLoteAction()`, `transferirAnimaisEmMassaAction()`
  - `lancarEventoAction()`, `deletarEventoAction()`
- [ ] T7.2: Validação com Zod + testes
- [ ] T7.3: Integração com Sentry (logs)

**Critério de Conclusão**: Testes de ação passam; sem erros TypeScript

---

### Iteração T8 (Importação CSV)

- [ ] T8.1: Implementar `importarCSVAction()` com validação linha a linha
- [ ] T8.2: Detectar duplicatas por `numero_animal`
- [ ] T8.3: Bulk insert atômico em transação
- [ ] T8.4: Gerar relatório de erros (CSV)
- [ ] T8.5: Testes para CSV import (incluindo edge cases)

**Critério de Conclusão**: 500 linhas importadas em < 10s; testes cobrem 80%

---

### Iteração T9 (UI — Listagem & CRUD)

- [ ] T9.1: Componente `AnimalListagem.tsx` (grid, filtros, paginação, busca)
- [ ] T9.2: Dialog `AnimalFormDialog.tsx` (criar/editar animal)
- [ ] T9.3: Dialog `LoteFormDialog.tsx` (criar/editar lote)
- [ ] T9.4: Componente `LoteListagem.tsx` (grid de lotes)
- [ ] T9.5: Página `app/dashboard/rebanho/page.tsx`
- [ ] T9.6: Página `app/dashboard/rebanho/lotes/page.tsx`

**Critério de Conclusão**: Adicionar 100+ animais manualmente em < 5 min; UI responsiva mobile

---

### Iteração T10 (UI — Detalhe & Genealogia)

- [ ] T10.1: Página `app/dashboard/rebanho/[id]/page.tsx` (detalhe de animal)
- [ ] T10.2: Componente `AnimalDetalhes.tsx` (cabeçalho, info gerais, peso atual)
- [ ] T10.3: Componente `GenealogyTree.tsx` (árvore Mãe ← Animal → Pai)
- [ ] T10.4: Navegação recursiva em genealogia
- [ ] T10.5: Tab "Visão Geral", "Eventos", "Genealogia"

**Critério de Conclusão**: Genealogia renderiza sem erros; links funcionam

---

### Iteração T11 (UI — Eventos & Lançamento)

- [ ] T11.1: Dialog `EventoFormDialog.tsx` (mobile-first, teclado numérico)
- [ ] T11.2: Componente `EventoTabs.tsx` (abas por tipo de evento)
- [ ] T11.3: Validação discriminada por `tipo` de evento
- [ ] T11.4: Tab "Eventos" em detalhe de animal
- [ ] T11.5: Botão flutuante (+) para novo evento

**Critério de Conclusão**: Lançar pesagem em < 3 toques no mobile; UI não quebra

---

### Iteração T12 (UI — CSV Import)

- [ ] T12.1: Página `app/dashboard/rebanho/importar/page.tsx`
- [ ] T12.2: Dialog `CSVImportDialog.tsx`
  - Upload de arquivo
  - Preview de primeiras 5 linhas
  - Mapping ajustável de colunas
  - Confirmação antes de importar
- [ ] T12.3: Exibição de resultado + link para relatório de erros
- [ ] T12.4: Streaming de progresso ("X/Y animais importados...")

**Critério de Conclusão**: 100 animais importados em < 30 segundos; relatório de erros baixável

---

### Iteração T13 (Offline & Sync)

- [ ] T13.1: Atualizar `lib/db/syncQueue.ts` para `EventoRebanhoSyncQueue`
- [ ] T13.2: Implementar `useEventoRebanhoSync()` hook
- [ ] T13.3: Componente `offline-status-banner.tsx` (indicador no header)
- [ ] T13.4: Enfileiramento automático em evento sem conexão
- [ ] T13.5: Sincronização automática ao reconectar
- [ ] T13.6: Detecção de conflitos (animal deletado, morto, vendido)
- [ ] T13.7: UI para resolução de conflitos (confirmar ou descartar)
- [ ] T13.8: Testes para offline/sync

**Critério de Conclusão**: Lançar evento offline → reconectar → sincronizar sem erros

---

### Iteração T14 (Permissões & RLS)

- [ ] T14.1: Verificar RLS em todas as 4 tabelas (animais, lotes, eventos, pesos)
- [ ] T14.2: Validar perfis (Admin, Operador, Visualizador)
- [ ] T14.3: Esconder botões DELETE/EDITAR conforme perfil na UI
- [ ] T14.4: Testes de autorização (RLS + Server Actions)

**Critério de Conclusão**: Admin consegue deletar; Operador consegue lançar evento; Visualizador só lê

---

### Iteração T15 (API & Integração com Planejamento)

- [ ] T15.1: Criar rota `GET /api/rebanho/animais-ativos?fazenda_id=X`
- [ ] T15.2: Retornar: id, numero_animal, sexo, categoria, peso_atual, data_nascimento
- [ ] T15.3: Testes de API
- [ ] T15.4: Integração dummy com Planejamento (consumir dados)
- [ ] T15.5: Testes E2E básicos (criar animal → lançar evento → validar em API)

**Critério de Conclusão**: `curl GET /api/rebanho/animais-ativos` retorna JSON válido

---

## 10. Checklist de Aceite — Fase 1

### Funcionalidade

- [ ] CRUD completo de animais (criar, listar, editar, soft delete)
- [ ] CRUD de lotes com contagem de animais
- [ ] Importação CSV com:
  - [ ] Validação linha a linha (Zod)
  - [ ] Preview com mapeamento de colunas
  - [ ] Criação automática de lote "Importação YYYY-MM-DD"
  - [ ] Bulk insert atômico
  - [ ] Evento de "nascimento" criado para cada animal
  - [ ] Relatório de erros (CSV)
- [ ] 5 tipos de evento lançáveis:
  - [ ] Nascimento → status = Ativo
  - [ ] Pesagem → cria registro em `pesos_animal`, atualiza `peso_atual`
  - [ ] Morte → status = Morto, animal não recebe novos eventos
  - [ ] Venda → status = Vendido, animal não recebe novos eventos
  - [ ] Transferência de Lote → atualiza `lote_id`, status = Ativo
- [ ] Listagem de eventos por animal com paginação
- [ ] Categoria automática recalculada quando data_nascimento muda
- [ ] Genealogia (mãe_id, pai_id) com navegação em árvore
- [ ] Transferência de lote em massa (multiselect + ação em lote)
- [ ] Filtros na listagem:
  - [ ] Por status (Ativo, Morto, Vendido)
  - [ ] Por sexo (Macho, Fêmea)
  - [ ] Por lote
  - [ ] Por categoria
  - [ ] Por intervalo de data nascimento
- [ ] Busca em tempo real por número/nome
- [ ] Soft delete com `deleted_at`
  - [ ] Admin vê deletados via checkbox
  - [ ] Operador/Visualizador não veem

### Offline & Sincronização

- [ ] Evento lançado offline enfileirado em IndexedDB
- [ ] Sincronização automática ao reconectar
- [ ] Indicador de status offline no header
- [ ] Detecção de conflitos (animal deletado, morto, vendido)
- [ ] Resolução de conflitos via UI (confirmar ou descartar)
- [ ] Toast com contagem de eventos sincronizados

### Segurança & RLS

- [ ] RLS em `animais`, `lotes`, `eventos_rebanho`, `pesos_animal`
- [ ] Filtro por `fazenda_id` obrigatório em todas as queries
- [ ] Dupla garantia: `eq('fazenda_id', fazendaId)` + RLS
- [ ] Soft delete respeitado em RLS:
  - [ ] Admin vê todos
  - [ ] Operador/Visualizador veem apenas não-deletados
- [ ] Permissões por perfil (Admin, Operador, Visualizador):
  - [ ] Admin: criar, editar, deletar, importar, ver deletados
  - [ ] Operador: criar, editar, lançar evento, transferir lote
  - [ ] Visualizador: apenas leitura
- [ ] Botões DELETE/EDITAR escondidos conforme perfil

### Mobile & UI

- [ ] Tela de lançamento de evento mobile-first
  - [ ] Campos com min 48px altura
  - [ ] Teclado numérico para peso_kg
- [ ] Grid responsivo (2–3 colunas conforme viewport)
- [ ] Empty states com ícone + mensagem
- [ ] Loading states com Loader2
- [ ] Paginação (50 por página desktop, 25 mobile)
- [ ] Breadcrumbs funcionais

### Tipagem & Qualidade

- [ ] `npm run build` sem erros TypeScript
- [ ] `npm run lint` sem erros ESLint
- [ ] Tipos gerados automaticamente via `npm run db:types`
- [ ] Nenhum `type any`
- [ ] Props interfaces explícitas
- [ ] Hooks com dependências corretas (sem `eslint-disable react-hooks/exhaustive-deps`)

### Testes & Documentação

- [ ] Testes Vitest ≥ 80% cobertura em `lib/supabase/rebanho.ts`
- [ ] Testes de validação Zod
- [ ] Testes de CSV import (incluindo edge cases)
- [ ] Testes de offline/sync
- [ ] Testes de RLS
- [ ] `npm run test` com 237+ testes passando
- [ ] E2E tests (criar animal → lançar evento → validar)

### API & Integração

- [ ] `GET /api/rebanho/animais-ativos?fazenda_id=X` retorna:
  - [ ] id, numero_animal, sexo, categoria, peso_atual, data_nascimento
  - [ ] Apenas status = Ativo
  - [ ] Filtra por fazenda_id
- [ ] Resposta JSON válida e performática (< 500ms)

### Dados Prontos

- [ ] Produtor consegue cadastrar 100 animais em < 30 min (via CSV)
- [ ] Lançamento de evento em < 3 toques (mobile)
- [ ] Dashboard com visão viva do rebanho (animais, lotes, eventos)
- [ ] Dados prontos para consumo por Planejamento de Silagem (T3)

---

## 11. Notas Importantes

### Triggers SQL

- **Ordem de execução BEFORE INSERT**: `validar_genealogia_animal` → `set_animais_fazenda_id` → `validar_lote_transferencia` (se tipo=transferencia_lote) → validações de CHECK constraints → INSERT
- **Ordem de execução AFTER INSERT**: `recalcular_categoria_animal` → `update_updated_at_column` → `atualizar_peso_atual_pesagem` / `atualizar_status_morte_venda` / `atualizar_lote_transferencia`
- **Transferência de Lote**: lote_id_destino é armazenado em coluna dedicada (não mais JSON em observacoes). Trigger AFTER INSERT atualiza animal.lote_id automaticamente.

### Performance

- Índices em `(fazenda_id, status)`, `(fazenda_id, numero_animal)`, `(animal_id, data_pesagem DESC)` garantem < 500ms para buscas
- Importação de 500 linhas: < 10s com bulk insert atômico
- Listagem de 1000+ animais: < 2s com índices e paginação

### Compatibilidade com Planejamento de Silagem (T3)

- API `GET /api/rebanho/animais-ativos` fornece dados necessários para cálculo de requisição de MS
- Campo `peso_atual` é computed: MAX(peso_kg) from `pesos_animal` → sincroniza automaticamente
- Categoria é computada por trigger → sempre atualizada

---

**FIM DA ESPECIFICAÇÃO — Versão 1.0 (Implementação Pronta)**
