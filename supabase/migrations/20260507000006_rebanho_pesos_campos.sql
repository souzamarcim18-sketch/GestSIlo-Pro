-- Migration F: Adicionar metodo e condicao_corporal a pesos_animal + trigger direto

BEGIN;

-- Método de pesagem
ALTER TABLE public.pesos_animal
  ADD COLUMN IF NOT EXISTS metodo TEXT NOT NULL DEFAULT 'balanca'
  CHECK (metodo IN ('balanca', 'estimativa_visual'));

-- Escore de condição corporal (ECC) — escala 1-5
ALTER TABLE public.pesos_animal
  ADD COLUMN IF NOT EXISTS condicao_corporal SMALLINT NULL
  CHECK (condicao_corporal IS NULL OR (condicao_corporal >= 1 AND condicao_corporal <= 5));

-- Trigger: atualizar animais.peso_atual quando peso inserido DIRETAMENTE em pesos_animal
-- (o trigger via eventos_rebanho já existe; este cobre inserção direta da aba Pesagens)
CREATE OR REPLACE FUNCTION public.pesos_animal_atualizar_peso_atual()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.animais
  SET peso_atual = (
    SELECT peso_kg
    FROM public.pesos_animal
    WHERE animal_id = NEW.animal_id
    ORDER BY data_pesagem DESC, created_at DESC
    LIMIT 1
  )
  WHERE id = NEW.animal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS pesos_animal_atualizar_peso_atual_trigger ON public.pesos_animal;
CREATE TRIGGER pesos_animal_atualizar_peso_atual_trigger
AFTER INSERT ON public.pesos_animal
FOR EACH ROW
EXECUTE FUNCTION public.pesos_animal_atualizar_peso_atual();

-- Policy de UPDATE para pesos (faltava — permite apenas admin corrigir pesagem)
DROP POLICY IF EXISTS "pesos_animal_update" ON public.pesos_animal;
CREATE POLICY "pesos_animal_update" ON public.pesos_animal
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- Policy de DELETE para pesos (faltava)
DROP POLICY IF EXISTS "pesos_animal_delete" ON public.pesos_animal;
CREATE POLICY "pesos_animal_delete" ON public.pesos_animal
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

COMMIT;
