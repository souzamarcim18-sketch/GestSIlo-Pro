'use client';

import { useState, useMemo } from 'react';
import { Pencil, ClipboardList, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatDate } from '@/lib/utils';
import { DeleteAtividadeDialog } from './DeleteAtividadeDialog';
import { TIPOS_ATIVIDADE, type AtividadeComColaboradores, type Colaborador } from '@/lib/types/mao-de-obra';

interface AtividadesListProps {
  atividades: AtividadeComColaboradores[];
  colaboradores: Colaborador[];
  isAdmin: boolean;
  onEdit: (a: AtividadeComColaboradores) => void;
  onRefresh: () => void;
}

export function AtividadesList({
  atividades,
  colaboradores,
  isAdmin,
  onEdit,
  onRefresh,
}: AtividadesListProps) {
  const [deletando, setDeletando] = useState<AtividadeComColaboradores | null>(null);
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const atividadesFiltradas = useMemo(() => {
    return atividades.filter((a) => {
      if (filtroColaborador && !a.colaboradores.some((c) => c.id === filtroColaborador)) {
        return false;
      }
      if (filtroTipo && a.tipo_atividade !== filtroTipo) return false;
      if (filtroDataInicio && a.data < filtroDataInicio) return false;
      if (filtroDataFim && a.data > filtroDataFim) return false;
      return true;
    });
  }, [atividades, filtroColaborador, filtroTipo, filtroDataInicio, filtroDataFim]);

  const totalPeriodo = atividadesFiltradas.reduce((acc, a) => acc + a.custo_final, 0);

  const temFiltros = filtroColaborador || filtroTipo || filtroDataInicio || filtroDataFim;

  function limparFiltros() {
    setFiltroColaborador('');
    setFiltroTipo('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
  }

  function getVinculo(a: AtividadeComColaboradores) {
    if (a.talhao_nome) return `Talhão: ${a.talhao_nome}`;
    if (a.silo_nome) return `Silo: ${a.silo_nome}`;
    if (a.maquina_nome) return `Máquina: ${a.maquina_nome}`;
    return null;
  }

  return (
    <>
      {/* Filtros */}
      <div
        className="rounded-lg p-4 space-y-3"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={filtroColaborador} onValueChange={(v) => setFiltroColaborador(v ?? '')}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent>
              {colaboradores.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v ?? '')}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Tipo de atividade" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_ATIVIDADE.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            className="h-9 text-sm"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
            placeholder="Data início"
          />
          <Input
            type="date"
            className="h-9 text-sm"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
            placeholder="Data fim"
          />
        </div>
        {temFiltros && (
          <button
            onClick={limparFiltros}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      {atividadesFiltradas.length === 0 ? (
        <div
          className="rounded-lg p-10 text-center"
          style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            {atividades.length === 0
              ? 'Nenhuma atividade registrada.'
              : 'Nenhuma atividade corresponde aos filtros.'}
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#161616', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Colaboradores</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Duração</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Vínculo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custo</th>
                {isAdmin && (
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {atividadesFiltradas.map((a, i) => {
                const vinculo = getVinculo(a);
                return (
                  <tr
                    key={a.id}
                    style={{
                      background: i % 2 === 0 ? '#1c1c1c' : '#222222',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {formatDate(a.data)}
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-[140px]">
                      <span className="block truncate" title={a.tipo_atividade}>
                        {a.tipo_atividade}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {a.colaboradores.map((c) => (
                          <Badge
                            key={c.id}
                            variant="outline"
                            className="text-xs border-none"
                            style={{ background: 'rgba(115,141,69,0.15)', color: '#a8c56a' }}
                          >
                            {c.nome}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {a.duracao_valor} {a.duracao_tipo === 'horas' ? 'h' : 'd'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {vinculo ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Link2 className="h-3 w-3" />
                          {vinculo}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                      {formatBRL(a.custo_final)}
                      {a.custo_manual !== null && (
                        <span className="ml-1 text-xs font-normal text-yellow-400" title="Custo manual">★</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(a)}
                            title="Editar atividade"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                            onClick={() => setDeletando(a)}
                            title="Excluir atividade"
                          >
                            <span className="text-xs">✕</span>
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Rodapé com total */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: '#161616', borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-xs text-muted-foreground">
              {atividadesFiltradas.length} atividade{atividadesFiltradas.length !== 1 ? 's' : ''} no período
            </span>
            <span className="text-sm font-semibold text-foreground">
              Total: <span style={{ color: '#738D45' }}>{formatBRL(totalPeriodo)}</span>
            </span>
          </div>
        </div>
      )}

      {deletando && (
        <DeleteAtividadeDialog
          atividade={deletando}
          isOpen
          onClose={() => setDeletando(null)}
          onSuccess={() => {
            setDeletando(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
