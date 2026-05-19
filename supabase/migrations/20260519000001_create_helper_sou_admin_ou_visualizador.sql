-- Helper RLS: retorna true para Administrador ou Visualizador (bloqueia Operador)
CREATE OR REPLACE FUNCTION public.sou_admin_ou_visualizador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    auth.jwt() -> 'user_metadata' ->> 'perfil' IN ('Administrador', 'Visualizador'),
    false
  );
$$;
