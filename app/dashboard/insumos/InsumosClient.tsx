'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, ArrowDownRight, ArrowUpRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useInsumosComRelacoes, useInsumosAbaixoMinimo } from '@/lib/hooks/useInsumos';
import { useUltimasEntradas, useUltimasSaidas } from '@/lib/hooks/useMovimentacoes';
import { useCategorias } from '@/lib/hooks/useCategorias';

import AlertsSection from './components/AlertsSection';
import UltimasMovimentacoes from './components/UltimasMovimentacoes';
import InsumosFilters from './components/InsumosFilters';
import InsumosList from './components/InsumosList';
import InsumoForm from './components/InsumoForm';
import SaidaForm from './components/SaidaForm';
import EntradaForm from './components/EntradaForm';
import AjusteInventario from './components/AjusteInventario';
import DeleteInsumoDialog from './components/DeleteInsumoDialog';
import HistoricoInsumoDialog from './components/HistoricoInsumoDialog';
import type { Insumo } from '@/types/insumos';

export function InsumosClient() {
  const [showNovoInsumo, setShowNovoInsumo] = useState(false);
  const [showEntrada, setShowEntrada] = useState(false);
  const [showSaida, setShowSaida] = useState(false);
  const [showAjuste, setShowAjuste] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [selectedInsumoPara, setSelectedInsumoPara] = useState<{ tipo: 'entrada' | 'saida' | 'ajuste' | 'delete'; id?: string }>({ tipo: 'saida' });
  const [insumoHistorico, setInsumoHistorico] = useState<Insumo | null>(null);

  const [filters, setFilters] = useState({ busca: '', categoria_id: '', tipo_id: '' });
  const queryClient = useQueryClient();
  const invalidateInsumos = () => {
    queryClient.invalidateQueries({ queryKey: ['insumos'] });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
  };

  const { data: insumos = [], isLoading: loadingInsumos } = useInsumosComRelacoes();
  const { data: criticos = [] } = useInsumosAbaixoMinimo();
  const { data: entradas = [] } = useUltimasEntradas();
  const { data: saidas = [] } = useUltimasSaidas();
  const { data: categorias = [] } = useCategorias();

  const totalCriticos = criticos.length;

  const handleEntradaClick = (insumoId: string) => {
    setSelectedInsumoPara({ tipo: 'entrada', id: insumoId });
    setShowEntrada(true);
  };

  const handleSaidaClick = (insumoId: string) => {
    setSelectedInsumoPara({ tipo: 'saida', id: insumoId });
    setShowSaida(true);
  };

  const handleAjusteClick = (insumoId: string) => {
    setSelectedInsumoPara({ tipo: 'ajuste', id: insumoId });
    setShowAjuste(true);
  };

  const handleDeleteClick = (insumo: typeof insumos[0]) => {
    setSelectedInsumoPara({ tipo: 'delete', id: insumo.id });
    setShowDelete(true);
  };

  const handleHistoricoClick = (insumo: Insumo) => {
    setInsumoHistorico(insumo);
    setShowHistorico(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Package} titulo="Gestão de Insumos">
        <Button variant="outline" onClick={() => { setSelectedInsumoPara({ tipo: 'entrada' }); setShowEntrada(true); }}>
          <ArrowDownRight className="mr-2 h-4 w-4" />
          Entrada
        </Button>
        <Button variant="outline" onClick={() => { setSelectedInsumoPara({ tipo: 'saida' }); setShowSaida(true); }}>
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Saída
        </Button>
        <Button onClick={() => setShowNovoInsumo(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Insumo
        </Button>
      </PageHeader>
      {totalCriticos > 0 && (
        <p className="text-sm text-destructive flex items-center gap-1 -mt-3">
          <AlertTriangle className="h-3 w-3" />
          {totalCriticos} insumo{totalCriticos > 1 ? 's' : ''} abaixo do estoque mínimo
        </p>
      )}

      <AlertsSection criticos={criticos} />
      <UltimasMovimentacoes entradas={entradas} saidas={saidas} />

      <InsumosFilters
        filters={filters}
        onChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
        onReset={() => setFilters({ busca: '', categoria_id: '', tipo_id: '' })}
        categorias={categorias}
        insumos={insumos}
      />

      <InsumosList
        insumos={insumos}
        categorias={categorias}
        filters={filters}
        loading={loadingInsumos}
        onEntradaClick={(insumo) => handleEntradaClick(insumo.id)}
        onSaidaClick={(insumo) => handleSaidaClick(insumo.id)}
        onAjusteClick={(insumo) => handleAjusteClick(insumo.id)}
        onDeleteClick={handleDeleteClick}
        onHistoricoClick={handleHistoricoClick}
      />

      <InsumoForm
        open={showNovoInsumo}
        onOpenChange={setShowNovoInsumo}
        categorias={categorias}
        onSuccess={invalidateInsumos}
      />

      <EntradaForm
        open={showEntrada}
        onOpenChange={setShowEntrada}
        insumos={insumos}
        insumoPredefined={selectedInsumoPara.tipo === 'entrada' ? selectedInsumoPara.id : undefined}
        onSuccess={invalidateInsumos}
      />

      <SaidaForm
        open={showSaida}
        onOpenChange={setShowSaida}
        insumos={insumos}
        insumoPredefined={selectedInsumoPara.tipo === 'saida' ? selectedInsumoPara.id : undefined}
        onSuccess={invalidateInsumos}
      />

      <AjusteInventario
        open={showAjuste}
        onOpenChange={setShowAjuste}
        insumos={insumos}
        insumoPredefined={selectedInsumoPara.tipo === 'ajuste' ? selectedInsumoPara.id : undefined}
        onSuccess={invalidateInsumos}
      />

      <DeleteInsumoDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        insumoId={selectedInsumoPara.tipo === 'delete' ? selectedInsumoPara.id : undefined}
        onSuccess={invalidateInsumos}
      />

      <HistoricoInsumoDialog
        insumo={insumoHistorico}
        open={showHistorico}
        onOpenChange={setShowHistorico}
      />
    </div>
  );
}
