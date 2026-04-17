-- supabase/migrations/20260416090600_rls_policies_insumos_completo.sql
-- RLS Policies para insumos, categorias, tipos, movimentacoes

-- CATEGORIAS (acesso global — SELECT público, INSERT/UPDATE bloqueado)
CREATE POLICY "categorias_select_public" ON categorias_insumo
  FOR SELECT USING (TRUE);

-- TIPOS (acesso global — SELECT público, INSERT/UPDATE bloqueado)
CREATE POLICY "tipos_select_public" ON tipos_insumo
  FOR SELECT USING (TRUE);

-- INSUMOS (isolado por fazenda_id)
CREATE POLICY "insumos_select_by_fazenda" ON insumos
  FOR SELECT USING (
    fazenda_id IN (
      SELECT fazenda_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "insumos_insert_by_fazenda" ON insumos
  FOR INSERT WITH CHECK (
    fazenda_id IN (
      SELECT fazenda_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "insumos_update_by_fazenda" ON insumos
  FOR UPDATE USING (
    fazenda_id IN (
      SELECT fazenda_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "insumos_delete_by_fazenda" ON insumos
  FOR DELETE USING (
    fazenda_id IN (
      SELECT fazenda_id FROM profiles WHERE id = auth.uid()
    )
  );

-- MOVIMENTACOES (isolado via JOIN com insumos)
CREATE POLICY "movimentacoes_select_by_fazenda" ON movimentacoes_insumo
  FOR SELECT USING (
    insumo_id IN (
      SELECT id FROM insumos
      WHERE fazenda_id IN (
        SELECT fazenda_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "movimentacoes_insert_by_fazenda" ON movimentacoes_insumo
  FOR INSERT WITH CHECK (
    insumo_id IN (
      SELECT id FROM insumos
      WHERE fazenda_id IN (
        SELECT fazenda_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "movimentacoes_update_by_fazenda" ON movimentacoes_insumo
  FOR UPDATE USING (
    insumo_id IN (
      SELECT id FROM insumos
      WHERE fazenda_id IN (
        SELECT fazenda_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "movimentacoes_delete_by_fazenda" ON movimentacoes_insumo
  FOR DELETE USING (
    insumo_id IN (
      SELECT id FROM insumos
      WHERE fazenda_id IN (
        SELECT fazenda_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "insumos_select_by_fazenda" ON insumos IS
  'Usuário vê apenas insumos de sua fazenda (via profiles.fazenda_id)';
