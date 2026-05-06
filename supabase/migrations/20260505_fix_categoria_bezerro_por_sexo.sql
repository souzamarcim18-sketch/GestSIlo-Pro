-- Migration: T38.1 Hotfix — Categorização de Bezerros por Sexo
-- Data: 2026-05-05
-- Descrição: Corrige bug na função recalcular_categoria_animal()
--            que categorizava TODOS os bezerros < 3 meses como 'Bezerra',
--            ignorando o sexo. Agora diferencia 'Bezerro' (macho) e 'Bezerra' (fêmea).
--
-- Bug: Linhas 267-268 (leiteiro) e 300-301 (corte) usavam v_categoria := 'Bezerra'
-- Fix: Usar CASE WHEN NEW.sexo para diferenciar Macho ('Bezerro') e Fêmea ('Bezerra')
--
-- Dependências: 20260502000002_rebanho_fase2_main.sql (já define a função original)

-- ==================== SEÇÃO 1: Recriar função com FIX ====================

CREATE OR REPLACE FUNCTION public.recalcular_categoria_animal()
RETURNS TRIGGER AS $$
DECLARE
  v_idade_anos NUMERIC;
  v_categoria TEXT;
BEGIN
  v_idade_anos := (CURRENT_DATE - NEW.data_nascimento) / 365.25;

  IF NEW.tipo_rebanho = 'leiteiro' THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Bezerro' ELSE 'Bezerra' END;
    ELSIF v_idade_anos < 1 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Bezerro' ELSE 'Bezerra' END;
    ELSIF v_idade_anos < 2 THEN
      -- Novilha considera status_reprodutivo se fêmea
      IF NEW.sexo = 'Fêmea' THEN
        v_categoria := CASE
          WHEN NEW.status_reprodutivo = 'prenha' THEN 'Novilha Prenha'
          ELSE 'Novilha'
        END;
      ELSE
        v_categoria := 'Novilho';
      END IF;
    ELSE
      -- Vaca > 2 anos considera status_reprodutivo se fêmea
      IF NEW.sexo = 'Fêmea' THEN
        v_categoria := CASE
          WHEN NEW.status_reprodutivo = 'lactacao' THEN 'Vaca em Lactação'
          WHEN NEW.status_reprodutivo = 'seca' THEN 'Vaca Seca'
          WHEN NEW.status_reprodutivo = 'prenha' THEN 'Vaca Prenha'
          ELSE 'Vaca Vazia'
        END;
      ELSE
        -- Macho > 2 anos = Touro se marcado com is_reprodutor=true, Novilho caso contrário
        IF NEW.is_reprodutor THEN
          v_categoria := 'Touro';
        ELSE
          v_categoria := 'Novilho';
        END IF;
      END IF;
    END IF;
  ELSIF NEW.tipo_rebanho = 'corte' THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Bezerro' ELSE 'Bezerra' END;
    ELSIF v_idade_anos < 1 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Bezerro' ELSE 'Bezerra' END;
    ELSIF v_idade_anos < 2 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Novilho' ELSE 'Novilha' END;
    ELSE
      IF NEW.sexo = 'Macho' THEN
        IF NEW.is_reprodutor THEN
          v_categoria := 'Touro';
        ELSE
          v_categoria := CASE
            WHEN NEW.status_reprodutivo = 'descartada' THEN 'Boi Descartado'
            ELSE 'Boi'
          END;
        END IF;
      ELSE
        v_categoria := CASE
          WHEN NEW.status_reprodutivo = 'descartada' THEN 'Fêmea Descartada'
          ELSE 'Vaca Matriz'
        END;
      END IF;
    END IF;
  END IF;

  NEW.categoria := v_categoria;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==================== SEÇÃO 2: Reprocessar animais afetados ====================

-- Força reprocessamento dos bezerros machos < 3 meses marcados como 'Bezerra'
-- O trigger BEFORE UPDATE dispara e recalcula a categoria corretamente

UPDATE public.animais
SET updated_at = NOW()
WHERE deleted_at IS NULL
  AND sexo = 'Macho'
  AND categoria = 'Bezerra'
  AND (CURRENT_DATE - data_nascimento) / 365.25 < 0.25;

-- ==================== FIM DA MIGRATION ====================
