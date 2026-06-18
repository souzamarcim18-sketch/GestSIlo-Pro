'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  listProdutos,
  listMovimentacoesProduto,
} from '@/lib/supabase/produtos';
import { q } from '@/lib/supabase/queries-audit';

import AlertsSection from './components/AlertsSection';
import UltimasMovimentacoes from './components/UltimasMovimentacoes';
import ProdutosFilters, { type ProdutosFiltersState } from './components/ProdutosFilters';
import ProdutosList from './components/ProdutosList';
import ProdutoForm from './components/ProdutoForm';
import EntradaForm from './components/EntradaForm';
import SaidaForm from './components/SaidaForm';
import AjusteInventario from './components/AjusteInventario';
import DeleteProdutoDialog from './components/DeleteProdutoDialog';
import type { Database } from '@/types/supabase';

type ProdutoRow = Database['public']['Tables']['produtos']['Row'];
type CategoriaProdutoRow = Database['public']['Tables']['categorias_produto']['Row'];

interface Props {
  isAdmin: boolean;
  initialCategorias: CategoriaProdutoRow[];
}

export function ProdutosClient({ isAdmin, initialCategorias }: Props) {
  const queryClient = useQueryClient();

  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [showEntrada, setShowEntrada] = useState(false);
  const [showSaida, setShowSaida] = useState(false);
  const [showAjuste, setShowAjuste] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoRow | undefined>();

  const [filters, setFilters] = useState<ProdutosFiltersState>({ busca: '', categoria_id: '', status: '' });

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ['produtos', 'list'],
    queryFn: () => listProdutos({ ativo: true }),
    staleTime: 1000 * 60,
  });

  const categorias = initialCategorias;

  // Insumos para o select de destino em saídas tipo TRANSFERENCIA_INSUMO.
  const { data: insumos = [] } = useQuery({
    queryKey: ['insumos', 'list', 'transferencia'],
    queryFn: () => q.insumos.list(),
    staleTime: 1000 * 60,
    enabled: isAdmin,
  });

  const { data: todasMovs = [] } = useQuery({
    queryKey: ['movimentacoes_produto', 'recentes', produtos.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (!produtos.length) return [];
      const results = await Promise.all(
        produtos.slice(0, 5).map((p) => listMovimentacoesProduto(p.id, 10))
      );
      const flat = results.flat();
      return flat.map((mov) => {
        const prod = produtos.find((p) => p.id === mov.produto_id);
        return { ...mov, produto_nome: prod?.nome, produto_unidade: prod?.unidade };
      });
    },
    enabled: produtos.length > 0,
    staleTime: 1000 * 30,
  });

  const criticos = useMemo(
    () => produtos.filter((p) => p.estoque_atual < p.estoque_minimo),
    [produtos]
  );

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['produtos'] });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes_produto'] });
  }

  function handleEntradaClick(produto: ProdutoRow) { setSelectedProduto(produto); setShowEntrada(true); }
  function handleSaidaClick(produto: ProdutoRow) { setSelectedProduto(produto); setShowSaida(true); }
  function handleAjusteClick(produto: ProdutoRow) { setSelectedProduto(produto); setShowAjuste(true); }
  function handleEditClick(produto: ProdutoRow) { setSelectedProduto(produto); setShowNovoProduto(true); }
  function handleDeleteClick(produto: ProdutoRow) { setSelectedProduto(produto); setShowDelete(true); }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Gestão de Produtos</h2>
          {criticos.length > 0 && (
            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              {criticos.length} produto{criticos.length > 1 ? 's' : ''} abaixo do estoque mínimo
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setShowEntrada(true)} className="flex-1 sm:flex-none">
              <ArrowDownRight className="mr-2 h-4 w-4" />
              Entrada
            </Button>
            <Button variant="outline" onClick={() => setShowSaida(true)} className="flex-1 sm:flex-none">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Saída
            </Button>
            <Button onClick={() => { setSelectedProduto(undefined); setShowNovoProduto(true); }} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        )}
      </div>

      <AlertsSection criticos={criticos} />
      <UltimasMovimentacoes movimentacoes={todasMovs} />

      <ProdutosFilters
        filters={filters}
        onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
        onReset={() => setFilters({ busca: '', categoria_id: '', status: '' })}
        categorias={categorias}
      />

      <ProdutosList
        produtos={produtos}
        categorias={categorias}
        filters={filters}
        loading={loadingProdutos}
        isAdmin={isAdmin}
        onEntradaClick={handleEntradaClick}
        onSaidaClick={handleSaidaClick}
        onAjusteClick={handleAjusteClick}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />

      <ProdutoForm
        open={showNovoProduto}
        onOpenChange={(v) => { setShowNovoProduto(v); if (!v) setSelectedProduto(undefined); }}
        categorias={categorias}
        produto={selectedProduto}
        onSuccess={handleRefresh}
      />

      <EntradaForm
        open={showEntrada}
        onOpenChange={(v) => { setShowEntrada(v); if (!v) setSelectedProduto(undefined); }}
        produtos={produtos}
        produtoPredefined={selectedProduto?.id}
        onSuccess={handleRefresh}
      />

      <SaidaForm
        open={showSaida}
        onOpenChange={(v) => { setShowSaida(v); if (!v) setSelectedProduto(undefined); }}
        produtos={produtos}
        insumos={insumos}
        produtoPredefined={selectedProduto?.id}
        onSuccess={handleRefresh}
      />

      <AjusteInventario
        open={showAjuste}
        onOpenChange={(v) => { setShowAjuste(v); if (!v) setSelectedProduto(undefined); }}
        produtos={produtos}
        produtoPredefined={selectedProduto?.id}
        onSuccess={handleRefresh}
      />

      <DeleteProdutoDialog
        open={showDelete}
        onOpenChange={(v) => { setShowDelete(v); if (!v) setSelectedProduto(undefined); }}
        produtoId={selectedProduto?.id}
        produtoNome={selectedProduto?.nome}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
