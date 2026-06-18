'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, CalendarDays, CheckCircle2, CircleDashed, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import {
  getStatusFolhaMensalAction,
  gerarFolhaMensalAction,
  removerSalarioFolhaAction,
  type LinhaFolhaCLT,
} from '../actions';

interface FolhaMensalCLTProps {
  isAdmin: boolean;
  onRefresh: () => void;
}

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function FolhaMensalCLT({ isAdmin, onRefresh }: FolhaMensalCLTProps) {
  const [mes, setMes] = useState(mesAtual());
  const [linhas, setLinhas] = useState<LinhaFolhaCLT[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(async (mesAno: string) => {
    setCarregando(true);
    const res = await getStatusFolhaMensalAction(mesAno);
    setCarregando(false);
    if ('error' in res) {
      toast.error(res.error);
      setLinhas([]);
      setTotal(0);
      return;
    }
    setLinhas(res.linhas);
    setTotal(res.total);
  }, []);

  useEffect(() => {
    carregar(mes);
  }, [mes, carregar]);

  async function handleGerar() {
    setGerando(true);
    const res = await gerarFolhaMensalAction(mes);
    setGerando(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    if (res.criados === 0) {
      toast.info('Nenhum salário pendente para este mês.');
    } else {
      toast.success(`${res.criados} salário(s) lançado(s) no financeiro.`);
    }
    await carregar(mes);
    onRefresh();
  }

  async function handleRemover(despesaId: string) {
    const res = await removerSalarioFolhaAction(despesaId);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success('Lançamento de salário removido.');
    await carregar(mes);
    onRefresh();
  }

  const pendentes = linhas.filter((l) => !l.ja_lancado && l.salario > 0).length;

  return (
    <div
      className="rounded-lg p-4 space-y-4"
      style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" style={{ color: '#738D45' }} />
          <h2 className="text-sm font-semibold text-foreground">Folha de Salários (CLT)</h2>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-9 w-[150px] text-sm"
          />
          {isAdmin && (
            <Button
              onClick={handleGerar}
              disabled={gerando || carregando || pendentes === 0}
              className="gap-2 font-semibold"
              style={{ background: '#738D45', color: '#fff' }}
            >
              {gerando && <Loader2 className="h-4 w-4 animate-spin" />}
              Gerar folha do mês
            </Button>
          )}
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum colaborador CLT ativo. Cadastre um colaborador com vínculo CLT para gerar a folha mensal.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            {linhas.map((l) => (
              <div
                key={l.colaborador_id}
                className="flex items-center justify-between px-3 py-2 rounded-md text-sm"
                style={{ background: '#161616' }}
              >
                <div className="flex items-center gap-2">
                  {l.ja_lancado ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-foreground">{l.nome}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">{formatBRL(l.salario)}</span>
                  {l.ja_lancado ? (
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="border-green-700 text-green-400 bg-green-950/30 text-xs"
                      >
                        Lançado
                      </Badge>
                      {isAdmin && l.despesa_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                          onClick={() => handleRemover(l.despesa_id!)}
                          title="Remover lançamento deste mês"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-700 text-amber-400 bg-amber-950/30 text-xs"
                    >
                      Pendente
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            className="flex items-center justify-between pt-2 text-sm"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-muted-foreground">
              Total folha do mês{pendentes > 0 ? ` · ${pendentes} pendente(s)` : ''}
            </span>
            <span className="text-lg font-bold" style={{ color: '#738D45' }}>
              {formatBRL(total)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
