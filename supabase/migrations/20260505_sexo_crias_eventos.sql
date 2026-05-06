-- Migration: Fase 4 Rebanho — Sexo de Criações em Eventos de Parto
-- Data: 2026-05-05
-- Descrição: Adiciona coluna sexo_crias em eventos_rebanho para cálculo preciso de taxas por sexo
-- Padrão: NULL até preenchimento (Operador preenche ao registrar parto)

ALTER TABLE public.eventos_rebanho
ADD COLUMN sexo_crias TEXT CHECK (sexo_crias IN ('Macho', 'Fêmea', 'Misto')) DEFAULT NULL;

COMMENT ON COLUMN public.eventos_rebanho.sexo_crias IS
'Sexo da(s) cria(s) em evento de parto. Obrigatório para registrar corretamente bezerros e calcular taxa de natalidade.
Valores válidos: Macho, Fêmea, Misto (gemelar com sexos diferentes).
NULL: Partos registrados antes da migration (históricos) — contam como bezerros sem distinção de sexo.
Operador pode editar parto antigo para preencher sexo_crias após migration.';
