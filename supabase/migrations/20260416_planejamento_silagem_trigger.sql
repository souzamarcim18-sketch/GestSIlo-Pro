-- =====================================================================
-- Trigger para atualizar updated_at automaticamente
-- =====================================================================
--
-- IMPORTANTE: Este trigger é OPCIONAL e deve ser executado manualmente
-- no Supabase SQL Editor se desejar implementar edição de planejamentos.
--
-- Para executar:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá para SQL Editor
-- 3. Cole este conteúdo
-- 4. Clique em "Run"
--
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_planejamentos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_updated_at_planejamentos
  BEFORE UPDATE ON planejamentos_silagem
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_planejamentos();

-- =====================================================================
-- Verificação
-- =====================================================================
-- Você pode verificar se o trigger foi criado com:
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'planejamentos_silagem';
-- =====================================================================
