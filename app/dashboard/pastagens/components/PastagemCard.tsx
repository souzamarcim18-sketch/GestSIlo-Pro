'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, ChevronRight, Leaf, Hammer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PastagemForm } from './PastagemForm';
import { DeletePastagemDialog } from './DeletePastagemDialog';
import { definirNecessitaReformaPastagemAction } from '../actions';
import type { PastagemComResumo } from '@/lib/types/pastagens';

// Espelha os valores do enum sistema_pastejo no banco
const SISTEMA_LABEL: Record<string, string> = {
  rotacionado: 'Rotacionado',
  continuo: 'Contínuo',
  semicontinuo: 'Semicontínuo',
  voisin: 'Voisin',
};

interface PastagemCardProps {
  pastagem: PastagemComResumo;
  isAdmin: boolean;
  onMutate: () => void;
}

export function PastagemCard({ pastagem, isAdmin, onMutate }: PastagemCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [togglingReforma, setTogglingReforma] = useState(false);

  const temAlertas = pastagem.piquetes.some(
    (p) => p.alerta_superlotacao || p.alerta_pronto_entrada || p.alerta_ocupacao_vencida
  );

  async function handleToggleNecessitaReforma(e: React.MouseEvent) {
    e.stopPropagation();
    setTogglingReforma(true);
    const result = await definirNecessitaReformaPastagemAction(pastagem.id, !pastagem.necessita_reforma);
    setTogglingReforma(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      pastagem.necessita_reforma
        ? 'Sinalização de reforma removida.'
        : 'Pastagem marcada como "necessita reforma".'
    );
    onMutate();
  }

  return (
    <>
      <Card
        role="article"
        onClick={() => router.push(`/dashboard/pastagens/${pastagem.id}`)}
        className={`p-5 cursor-pointer transition-all hover:shadow-md hover:border-border ${
          temAlertas || pastagem.necessita_reforma ? 'border-l-4 border-l-yellow-500/60' : ''
        }`}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg flex-shrink-0 bg-primary/10 border border-primary/20">
              <Leaf className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground truncate">{pastagem.nome}</h3>
                {pastagem.necessita_reforma && (
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
                    style={{ color: '#f5d000', background: 'rgba(245,208,0,0.1)', border: '1px solid rgba(245,208,0,0.25)' }}
                  >
                    <Hammer className="h-3 w-3" />
                    Necessita reforma
                  </span>
                )}
              </div>
              {pastagem.especie_forrageira && (
                <p className="text-xs text-muted-foreground truncate">{pastagem.especie_forrageira}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {SISTEMA_LABEL[pastagem.sistema_pastejo] ?? pastagem.sistema_pastejo}
            </Badge>
          </div>
        </div>

        {/* Área */}
        <div className="text-xs text-muted-foreground">
          Área total: <span className="text-foreground font-medium">{pastagem.area_total_ha.toLocaleString('pt-BR')} ha</span>
        </div>

        {/* Contadores de piquetes */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-sm font-bold text-green-400">{pastagem.em_pastejo}</div>
            <div className="text-xs text-muted-foreground">Pastejo</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400">{pastagem.em_descanso}</div>
            <div className="text-xs text-muted-foreground">Descanso</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-orange-400">{pastagem.em_reforma}</div>
            <div className="text-xs text-muted-foreground">Reforma</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-red-400">{pastagem.interditados}</div>
            <div className="text-xs text-muted-foreground">Interdit.</div>
          </div>
        </div>

        {/* Total de piquetes */}
        <div className="text-xs text-muted-foreground border-t border-border pt-3">
          {pastagem.total_piquetes} piquete{pastagem.total_piquetes !== 1 ? 's' : ''} cadastrado{pastagem.total_piquetes !== 1 ? 's' : ''}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleNecessitaReforma}
                  disabled={togglingReforma}
                  className={`h-7 px-2.5 text-xs gap-1 ${
                    pastagem.necessita_reforma
                      ? 'border-[#f5d000]/40 text-[#f5d000] hover:bg-[#f5d000]/10'
                      : ''
                  }`}
                >
                  <Hammer className="h-3 w-3" />
                  {pastagem.necessita_reforma ? 'Reforma sinalizada' : 'Necessita reforma'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen(true);
                  }}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                  className="h-7 px-2.5 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/35 gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Excluir
                </Button>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/pastagens/${pastagem.id}`)}
            className="h-7 px-3 text-xs gap-1"
          >
            Ver detalhes
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </Card>

      {/* Modal editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar pastagem</DialogTitle>
          </DialogHeader>
          <PastagemForm
            pastagem={pastagem}
            onSuccess={() => {
              setEditOpen(false);
              onMutate();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog excluir */}
      <DeletePastagemDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        pastagemId={pastagem.id}
        pastagemNome={pastagem.nome}
        onSuccess={onMutate}
      />
    </>
  );
}
