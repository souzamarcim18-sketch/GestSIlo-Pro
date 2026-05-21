'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AnotacaoAssessoria } from '@/lib/types/assessoria';
import { formatDate } from '@/lib/utils';

interface AnotacoesListProps {
  anotacoes: AnotacaoAssessoria[];
  onEdit: (anotacao: AnotacaoAssessoria) => void;
  onDelete: (id: string) => void;
  onMarcarResolvida: (id: string, resolvida: boolean) => void;
}

const categoriaConfig: Record<string, { label: string; color: string }> = {
  duvida: { label: 'Dúvida', color: 'bg-blue-900/40 text-blue-300' },
  observacao_campo: { label: 'Observação de Campo', color: 'bg-green-900/40 text-green-300' },
  sugestao: { label: 'Sugestão', color: 'bg-purple-900/40 text-purple-300' },
  outro: { label: 'Outro', color: 'bg-muted text-muted-foreground' },
};

const prioridadeConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'text-muted-foreground' },
  normal: { label: 'Normal', color: 'text-blue-400' },
  alta: { label: 'Alta', color: 'text-orange-400' },
  urgente: { label: 'Urgente', color: 'text-red-400' },
};

export default function AnotacoesList({
  anotacoes,
  onEdit,
  onDelete,
  onMarcarResolvida,
}: AnotacoesListProps) {
  if (anotacoes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma anotação criada. Comece a registrar suas dúvidas e observações!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {anotacoes.map((nota) => {
        const categConfig = categoriaConfig[nota.categoria];
        const priorConfig = prioridadeConfig[nota.prioridade];

        return (
          <div
            key={nota.id}
            className={`border border-border rounded-lg p-4 space-y-3 bg-card transition-opacity ${
              nota.resolvida ? 'opacity-50' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3
                  className={`font-semibold ${nota.resolvida ? 'line-through text-muted-foreground' : ''}`}
                >
                  {nota.titulo}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{nota.conteudo}</p>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(nota)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(nota.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Deletar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Badge className={categConfig.color}>{categConfig.label}</Badge>
              <Badge variant="outline" className={priorConfig.color}>
                {priorConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(nota.created_at)}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarcarResolvida(nota.id, !nota.resolvida)}
                className="ml-auto flex items-center gap-1"
              >
                {nota.resolvida ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs">Marcar como Pendente</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-xs">Marcar como Resolvida</span>
                  </>
                )}
              </Button>
            </div>

            {nota.assessor_resposta && (
              <div className="border-l-2 border-border pl-3 rounded">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Resposta do Assessor:</p>
                <p className="text-sm">{nota.assessor_resposta}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
