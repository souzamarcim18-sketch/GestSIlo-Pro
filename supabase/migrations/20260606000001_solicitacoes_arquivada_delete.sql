-- Migration: solicitacoes_arquivada_delete
-- Adiciona status 'arquivada' e coluna arquivada_em à tabela solicitacoes_acesso

-- 1. Remover CHECK constraint existente e recriar incluindo 'arquivada'
ALTER TABLE solicitacoes_acesso
  DROP CONSTRAINT IF EXISTS solicitacoes_acesso_status_check;

ALTER TABLE solicitacoes_acesso
  ADD CONSTRAINT solicitacoes_acesso_status_check
  CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'arquivada'));

-- 2. Coluna arquivada_em para rastreabilidade
ALTER TABLE solicitacoes_acesso
  ADD COLUMN IF NOT EXISTS arquivada_em timestamptz;
