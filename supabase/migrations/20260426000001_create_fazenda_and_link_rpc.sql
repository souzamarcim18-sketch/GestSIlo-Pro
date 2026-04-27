-- =====================================================
-- RPC: create_fazenda_and_link
-- Cria uma fazenda e vincula ao profile do usuário
-- de forma atômica (transação única)
-- =====================================================

create or replace function public.create_fazenda_and_link(
  p_nome text,
  p_localizacao text default null,
  p_area_total numeric default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns public.fazendas
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid(); v_fazenda public.fazendas; begin -- 1. Verificar autenticação if v_user_id is null then raise exception 'Usuário não autenticado' using errcode = '28000'; end if; -- 2. Validações básicas (defesa em profundidade) if p_nome is null or length(trim(p_nome)) = 0 then raise exception 'Nome da fazenda é obrigatório' using errcode = '22023'; end if; if p_area_total is not null and p_area_total <= 0 then raise exception 'Área total deve ser maior que zero' using errcode = '22023'; end if; if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then raise exception 'Latitude inválida (deve estar entre -90 e 90)' using errcode = '22023'; end if; if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then raise exception 'Longitude inválida (deve estar entre -180 e 180)' using errcode = '22023'; end if; -- 3. Inserir fazenda insert into public.fazendas ( nome, localizacao, area_total, latitude, longitude, owner_id ) values ( trim(p_nome), p_localizacao, p_area_total, p_latitude, p_longitude, v_user_id ) returning * into v_fazenda; -- 4. Vincular fazenda ao profile do usuário update public.profiles set fazenda_id = v_fazenda.id where id = v_user_id; -- 5. Retornar a fazenda criada return v_fazenda; end;
$$;

-- =====================================================
-- Permissões: permitir que usuários autenticados executem
-- =====================================================

revoke all on function public.create_fazenda_and_link(text, text, numeric, double precision, double precision) from public;

grant execute on function public.create_fazenda_and_link(text, text, numeric, double precision, double precision) to authenticated;

-- =====================================================
-- Comentário de documentação
-- =====================================================

comment on function public.create_fazenda_and_link is
  'Cria uma fazenda e vincula ao profile do usuário autenticado em transação atômica. Usa auth.uid() para identificar o dono.';
