-- Adicionar coluna telefone na tabela agendamentos_usuario
ALTER TABLE agendamentos_usuario
ADD COLUMN telefone VARCHAR(20) NULL;

-- Adicionar constraint para garantir que telefone não fique vazio quando criado
ALTER TABLE agendamentos_usuario
ADD CONSTRAINT chk_telefone_not_empty CHECK (telefone IS NOT NULL);
