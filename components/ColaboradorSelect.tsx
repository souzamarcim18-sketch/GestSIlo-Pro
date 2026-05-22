'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listColaboradoresAtivosParaSelect } from '@/lib/supabase/registros-colaborador';

interface ColaboradorSelectProps {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
}

export function ColaboradorSelect({ value, onChange, disabled }: ColaboradorSelectProps) {
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string; funcao: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listColaboradoresAtivosParaSelect()
      .then(setColaboradores)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? undefined : v ?? undefined)}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue placeholder={loading ? 'Carregando...' : 'Colaborador responsável (opcional)'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Nenhum</SelectItem>
        {colaboradores.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nome} — {c.funcao}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
