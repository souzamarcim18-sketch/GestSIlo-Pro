-- Migration para o item 4.5 - Modo Operador

-- Garantir que o perfil 'Operador' existe na restrição (já existe no schema inicial, mas reforçamos aqui)
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_perfil_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_perfil_check CHECK (perfil IN ('Administrador', 'Operador', 'Visualizador'));

-- Comentário sobre a funcionalidade
COMMENT ON TABLE movimentacoes_silo IS 'Registra entradas, saídas e perdas de silagem, inclusive via Modo Operador';

-- Nenhuma alteração estrutural necessária, pois usamos as tabelas existentes.
