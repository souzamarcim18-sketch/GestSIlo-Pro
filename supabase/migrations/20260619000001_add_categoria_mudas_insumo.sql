-- supabase/migrations/20260619000001_add_categoria_mudas_insumo.sql
-- Adiciona a categoria "Mudas" ao catálogo global de categorias de insumo.
--
-- Motivação: as culturas Cana-de-açúcar, Capim Capiaçu, Capim Cameroon e Tifton
-- propagam-se por mudas/toletes (não por sementes). O produtor precisa controlar
-- o estoque dessas mudas como insumo e selecioná-las no plantio do talhão.
--
-- categorias_insumo é uma tabela global (sem fazenda_id, nome UNIQUE), por isso
-- basta um INSERT idempotente — espelha o seed em 20260416090400.
-- Não há subtipos para Mudas (como em Sementes/Inoculantes).

INSERT INTO categorias_insumo (nome, descricao) VALUES
  ('Mudas', 'Mudas e toletes para plantio vegetativo (cana, capiaçu, cameroon, tifton)')
ON CONFLICT (nome) DO NOTHING;
