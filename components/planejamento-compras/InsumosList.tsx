'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  removerInsumoDoPlanejamentoAction,
  atualizarQuantidadeInsumoAction,
} from '@/app/dashboard/planejamento-compras/actions';
import type { PlanejamentoInsumoComInsumo } from '@/lib/types/planejamento-compras';

interface InsumosListProps {
  insumos: PlanejamentoInsumoComInsumo[];
  isAdmin: boolean;
  onChanged?: () => void;
}

function InsumoRow({
  item,
  isAdmin,
  onChanged,
}: {
  item: PlanejamentoInsumoComInsumo;
  isAdmin: boolean;
  onChanged?: () => void;
}) {
  // Estado local para o input — re-inicializado via key={item.id + item.quantidade} no parent
  const [quantidade, setQuantidade] = useState(String(item.quantidade));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQuantidadeChange(value: string) {
    setQuantidade(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const parsed = parseFloat(value);
      if (!parsed || parsed <= 0 || parsed === item.quantidade) return;
      setSaving(true);
      const result = await atualizarQuantidadeInsumoAction({ id: item.id, quantidade: parsed });
      setSaving(false);
      if ('error' in result) {
        toast.error(result.error);
        setQuantidade(String(item.quantidade));
      } else {
        onChanged?.();
      }
    }, 800);
  }

  async function handleRemove() {
    setRemoving(true);
    const result = await removerInsumoDoPlanejamentoAction(item.id);
    setRemoving(false);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Insumo removido');
      onChanged?.();
    }
  }

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 px-3 text-sm">
        {item.insumo.nome}
        {!item.insumo.ativo && (
          <span className="ml-2 text-xs text-muted-foreground">(Inativo)</span>
        )}
      </td>
      <td className="py-2 px-3 text-sm text-muted-foreground">{item.insumo.unidade}</td>
      <td className="py-2 px-3 text-sm text-muted-foreground">{item.insumo.estoque_atual}</td>
      <td className="py-2 px-3">
        {isAdmin ? (
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={quantidade}
            onChange={(e) => handleQuantidadeChange(e.target.value)}
            className="h-7 w-24 text-sm"
            disabled={saving}
          />
        ) : (
          <span className="text-sm">{item.quantidade}</span>
        )}
      </td>
      {isAdmin && (
        <td className="py-2 px-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
            onClick={handleRemove}
            disabled={removing}
            aria-label="Remover insumo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </td>
      )}
    </tr>
  );
}

export default function InsumosList({ insumos, isAdmin, onChanged }: InsumosListProps) {
  if (insumos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum insumo vinculado ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border/40">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/40 bg-muted/30">
            <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Insumo</th>
            <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unidade</th>
            <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Em estoque</th>
            <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qtd. planejada</th>
            {isAdmin && <th className="py-2 px-3" />}
          </tr>
        </thead>
        <tbody>
          {insumos.map((item) => (
            <InsumoRow key={`${item.id}-${item.quantidade}`} item={item} isAdmin={isAdmin} onChanged={onChanged} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
