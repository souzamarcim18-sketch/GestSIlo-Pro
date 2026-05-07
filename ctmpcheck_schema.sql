-- Verificar o tipo exato de tipo_rebanho
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'animais' AND column_name = 'tipo_rebanho';

-- Verificar constraints em tipo_rebanho
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'animais' AND table_schema = 'public'
  AND constraint_name LIKE '%tipo%';
