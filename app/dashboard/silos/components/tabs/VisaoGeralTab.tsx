'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Silo, type Talhao } from '@/lib/supabase';
import { calcularDensidade } from '@/lib/supabase/silos';

interface VisaoGeralTabProps {
  silo: Silo;
  talhao: Talhao | null;
  custo: { custoPorTonelada: number; custoTotal: number } | null;
  densidade: number | null;
  insumoLona: string | null;
  insumoInoculante: string | null;
}

export function VisaoGeralTab({
  silo,
  talhao,
  custo,
  densidade,
  insumoLona,
  insumoInoculante,
}: VisaoGeralTabProps) {
  return (
    <div className="space-y-6">

      {/* 1. Dados do Silo */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Dados do Silo</CardTitle>
          <CardDescription>Informações básicas de estrutura e capacidade</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-semibold text-lg">{silo.nome}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Tipo de Estrutura</p>
            <Badge variant="secondary">{silo.tipo}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Volume Ensilado</p>
            <p className="font-semibold text-lg">
              {silo.volume_ensilado_ton_mv ? `${silo.volume_ensilado_ton_mv} ton` : '-'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Cultura Ensilada</p>
            <p className="font-medium">{silo.cultura_ensilada || 'Não informada'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Matéria Seca Original</p>
            <p className="font-semibold text-lg">{silo.materia_seca_percent || '-'}%</p>
          </div>
          {silo.comprimento_m && silo.largura_m && silo.altura_m && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Dimensões</p>
              <p className="font-medium">
                {silo.comprimento_m} m × {silo.largura_m} m × {silo.altura_m} m
              </p>
            </div>
          )}
          {silo.comprimento_m && silo.largura_m && silo.altura_m && silo.volume_ensilado_ton_mv && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Densidade</p>
              {(() => {
                const dens = calcularDensidade(
                  silo.volume_ensilado_ton_mv,
                  silo.comprimento_m,
                  silo.largura_m,
                  silo.altura_m
                );
                const indicator = dens >= 650 ? '🟢' : dens >= 550 ? '🟡' : '🔴';
                return (
                  <div className="flex items-center gap-2">
                    <span>{indicator}</span>
                    <p className="font-medium">{dens.toFixed(0)} kg/m³</p>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Rastreabilidade & Custo */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Rastreabilidade & Custo</CardTitle>
          <CardDescription>Informações de produção e economia</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {silo.talhao_id && talhao && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Talhão de Origem</p>
              <p className="font-medium">{talhao.nome}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {silo.talhao_id ? 'Custo de Produção' : 'Custo de Aquisição'}
            </p>
            {custo !== null ? (
              <p className="font-semibold text-lg text-green-700">
                R$ {custo.custoPorTonelada.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                /ton
              </p>
            ) : (
              <p className="font-medium">-</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Custo Total Estimado</p>
            {custo !== null ? (
              <p className="font-semibold text-lg">
                R$ {custo.custoTotal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            ) : (
              <p className="font-medium">-</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Datas */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Datas Importantes</CardTitle>
          <CardDescription>Ciclos de armazenamento</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Fechamento</p>
            <p className="font-medium">
              {silo.data_fechamento
                ? new Date(silo.data_fechamento).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {silo.data_abertura_real ? 'Abertura Real' : 'Previsão de Abertura'}
            </p>
            <p className="font-medium">
              {silo.data_abertura_real
                ? new Date(silo.data_abertura_real).toLocaleDateString('pt-BR')
                : silo.data_abertura_prevista
                  ? new Date(silo.data_abertura_prevista).toLocaleDateString('pt-BR')
                  : '-'}
            </p>
          </div>
          {silo.data_fechamento && silo.data_abertura_real && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Dias de Fermentação</p>
              <p className="font-medium">
                {Math.floor(
                  (new Date(silo.data_abertura_real).getTime() -
                    new Date(silo.data_fechamento).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                dias
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Insumos */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Insumos Utilizados</CardTitle>
          <CardDescription>Materiais consumidos no processo de silagem</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Lona</p>
            <p className="font-medium">{insumoLona || '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Inoculante</p>
            <p className="font-medium">{insumoInoculante || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* 5. Observações */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Observações</CardTitle>
          <CardDescription>Anotações e detalhes adicionais</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {silo.observacoes_gerais || 'Nenhuma observação registrada'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
