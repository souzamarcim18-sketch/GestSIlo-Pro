'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import type { FiltrosRelatorio } from '@/lib/types/planejamento-compras';

interface TalhaoOption {
  id: string;
  nome: string;
}

interface FiltrosRelatorioProps {
  filtros: FiltrosRelatorio;
  talhoes: TalhaoOption[];
  onChange: (filtros: FiltrosRelatorio) => void;
}

export default function FiltrosRelatorio({ filtros, talhoes, onChange }: FiltrosRelatorioProps) {
  function update(partial: Partial<FiltrosRelatorio>) {
    onChange({ ...filtros, ...partial });
  }

  function limpar() {
    onChange({});
  }

  const temFiltro =
    !!filtros.data_inicio ||
    !!filtros.data_fim ||
    !!filtros.talhao_id ||
    !!filtros.status_atividade ||
    !!filtros.apenas_com_necessidade;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-border/40 bg-card/30 p-4">
      {/* Período de */}
      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <Label className="text-xs text-muted-foreground">De</Label>
        <Input
          type="date"
          className="text-sm h-8"
          value={filtros.data_inicio ?? ''}
          onChange={(e) => update({ data_inicio: e.target.value || undefined })}
        />
      </div>

      {/* Período até */}
      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <Label className="text-xs text-muted-foreground">Até</Label>
        <Input
          type="date"
          className="text-sm h-8"
          value={filtros.data_fim ?? ''}
          onChange={(e) => update({ data_fim: e.target.value || undefined })}
        />
      </div>

      {/* Talhão */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label className="text-xs text-muted-foreground">Talhão</Label>
        <Select
          value={filtros.talhao_id ?? '_todos'}
          onValueChange={(v) => update({ talhao_id: v === '_todos' ? undefined : (v as string) })}
        >
          <SelectTrigger className="text-sm h-8">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_todos">Todos</SelectItem>
            {talhoes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status da atividade */}
      <div className="flex flex-col gap-1.5 min-w-[150px]">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select
          value={filtros.status_atividade ?? '_todos'}
          onValueChange={(v) =>
            update({
              status_atividade:
                v === '_todos'
                  ? undefined
                  : (v as FiltrosRelatorio['status_atividade']),
            })
          }
        >
          <SelectTrigger className="text-sm h-8">
            <SelectValue placeholder="Planejada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_todos">Todas</SelectItem>
            <SelectItem value="planejada">Planejada</SelectItem>
            <SelectItem value="executada">Executada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Toggle apenas com necessidade */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Apenas com necessidade</Label>
        <div className="flex items-center h-8 gap-2">
          <Checkbox
            id="apenas-necessidade"
            checked={!!filtros.apenas_com_necessidade}
            onCheckedChange={(checked) =>
              update({ apenas_com_necessidade: checked === true ? true : undefined })
            }
          />
          <Label htmlFor="apenas-necessidade" className="text-sm cursor-pointer">
            Ocultar estoque suficiente
          </Label>
        </div>
      </div>

      {/* Limpar filtros */}
      {temFiltro && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={limpar}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
