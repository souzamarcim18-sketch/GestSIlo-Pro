'use client';

import { useState } from 'react';
import { AlertTriangle, Plus, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInsumos, useInsumosAbaixoMinimo } from '@/lib/hooks/useInsumos';
import { useUltimasEntradas, useUltimasSaidas } from '@/lib/hooks/useMovimentacoes';
import { useCategorias } from '@/lib/hooks/useCategorias';

import AlertsSection from './components/AlertsSection';
import UltimasMovimentacoes from './components/UltimasMovimentacoes';
import InsumosList from './components/InsumosList';
import InsumoForm from './components/InsumoForm';
import SaidaForm from './components/SaidaForm';
import AjusteInventario from './components/AjusteInventario';

export default function InsumosPage() {
  const [showNovoInsumo, setShowNovoInsumo] = useState(false);
  const [showSaida, setShowSaida] = useState(false);
  const [showAjuste, setShowAjuste] = useState(false);
  const [selectedInsumoPara, setSelectedInsumoPara] = useState<{ tipo: 'saida' | 'ajuste'; id?: string }>({ tipo: 'saida' });

  // Queries
  const { data: insumos = [], isLoading: loadingInsumos } = useInsumos();
  const { data: criticos = [] } = useInsumosAbaixoMinimo();
  const { data: entradas = [] } = useUltimasEntradas();
  const { data: saidas = [] } = useUltimasSaidas();
  const { data: categorias = [] } = useCategorias();

  const totalCriticos = criticos.length;

  const handleSaidaClick = (insumoId: string) => {
    setSelectedInsumoPara({ tipo: 'saida', id: insumoId });
    setShowSaida(true);
  };

  const handleAjusteClick = (insumoId: string) => {
    setSelectedInsumoPara({ tipo: 'ajuste', id: insumoId });
    setShowAjuste(true);
  };

  const handleRefresh = () => {
    // TanStack Query revalidará automaticamente
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estoque de Insumos</h2>
          {totalCriticos > 0 && (
            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              {totalCriticos} insumo{totalCriticos > 1 ? 's' : ''} abaixo do estoque mínimo
            </p>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowSaida(true)}
            className="flex-1 sm:flex-none"
          >
            <ArrowDownRight className="mr-2 h-4 w-4" />
            Saídas
          </Button>
          <Button
            onClick={() => setShowNovoInsumo(true)}
            className="flex-1 sm:flex-none"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Insumo
          </Button>
        </div>
      </div>

      {/* Alertas */}
      <AlertsSection criticos={criticos} />

      {/* Últimas Movimentações */}
      <UltimasMovimentacoes entradas={entradas} saidas={saidas} />

      {/* Tabela de Insumos */}
      <InsumosList
        insumos={insumos}
        categorias={categorias}
        loading={loadingInsumos}
        onSaidaClick={(insumo) => handleSaidaClick(insumo.id)}
        onAjusteClick={(insumo) => handleAjusteClick(insumo.id)}
      />

      {/* Dialogs */}
      <InsumoForm
        open={showNovoInsumo}
        onOpenChange={setShowNovoInsumo}
        categorias={categorias}
        onSuccess={handleRefresh}
      />

      <SaidaForm
        open={showSaida}
        onOpenChange={setShowSaida}
        insumos={insumos}
        insumoPredefined={selectedInsumoPara.tipo === 'saida' ? selectedInsumoPara.id : undefined}
        onSuccess={handleRefresh}
      />

      <AjusteInventario
        open={showAjuste}
        onOpenChange={setShowAjuste}
        insumos={insumos}
        insumoPredefined={selectedInsumoPara.tipo === 'ajuste' ? selectedInsumoPara.id : undefined}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
