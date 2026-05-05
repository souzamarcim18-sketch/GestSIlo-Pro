# Fase 3 — Integração Wizard Planejamento com Rebanho: Especificação Técnica

**Status**: 🛠️ Especificação Técnica  
**Data**: 2026-05-05  
**Branch**: `feat/rebanho-modulo` (após merge de Fase 2)  
**Esforço Estimado**: 13.5h (1.5 dias) — T29–T34 (ação), T35 (doc)  

---

## 1. Função de Projeção: Assinatura e Tipos

### 1.1 Tipos TypeScript

```typescript
// lib/types/planejamento-silagem.ts (complementar)

/**
 * Representação de uma categoria animal no contexto de projeção.
 */
export interface CategoriaProjetada {
  id: string;  // ex: "vaca_lactando", "bezerro"
  nome: string; // ex: "Vaca Lactando"
  quantidade_atual: number; // quantas existem hoje
  quantidade_projetada: number; // quantas existirão em data_alvo
  variacao: number; // quantidade_projetada - quantidade_atual (pode ser negativa)
  alteracoes?: {
    partos_novos?: number; // crias nascidas
    mudancas_categoria?: number; // animais que mudaram de categoria
    descartes?: number; // vendidos/mortos
  };
}

/**
 * Snapshot completo de uma projeção de rebanho.
 * Gravado em planejamentos_silagem.rebanho_snapshot para auditoria.
 */
export interface RebanhoSnapshot {
  // Identificação temporal
  data_calculo: string; // ISO 8601, momento do cálculo (now())
  data_projecao: string; // ISO 8601, data para qual foi projetado

  // Composição por categoria
  composicao: Record<string, number>; // { "vaca_lactando": 42, "vaca_seca": 8, ... }

  // Auditoria e Rastreabilidade
  total_cabecas: number; // soma de todas as categorias na projeção
  total_animais_base: number; // quantos animais existiam em data_calculo
  partos_inclusos_na_projecao: number; // número de eventos de parto considerados
  mudancas_categoria_inclusos: number; // número de animais que mudaram de categoria
  descartes_inclusos: number; // vendidos/mortos considerados na projeção

  // Contexto do Cálculo
  tipo_rebanho: "Leite" | "Corte"; // sistema.tipo_rebanho no momento
  modo: "PROJETADO" | "MANUAL"; // como foi preenchido (projeção automática vs. entrada manual)
  usuario_editou: boolean; // se usuário modificou dados após projeção

  // Metadados Opcionais
  avisos?: string[]; // lista de questões identificadas (ex: "Muitos partos em 30 dias")
  versao_algoritmo: string; // ex: "1.0", para futuras migrações
}

/**
 * Resultado da projeção do rebanho para uma data específica.
 */
export interface RebanhoProjetado {
  // Identificação
  data_alvo: Date;
  data_calculo: Date;

  // Dados projetados
  categorias: CategoriaProjetada[];
  composicao: Record<string, number>; // mapa rápido para acesso
  total_cabecas: number;

  // Rastreabilidade
  fatores_aplicados: {
    partos_confirmados: number;
    mudancas_categoria: number;
    descartes: number;
    avisos: string[];
  };

  // Para criação do Snapshot
  toSnapshot(): RebanhoSnapshot;
}

/**
 * Resposta da detecção de rebanho no início do wizard.
 */
export interface DeteccaoRebanho {
  rebanho_detectado: boolean;
  data_ultimo_animal?: Date;
  razao?: "vazio" | "sem_acesso" | "nenhum"; // motivo da não-detecção
}

/**
 * Estado do Wizard atualizado com suporte a projeção.
 */
export interface WizardStateComRebanho extends WizardState {
  rebanho_modo?: "PROJETADO" | "MANUAL";
  rebanho_data_projecao?: Date;
  rebanho_ajuste_manual_ativado?: boolean;
  rebanho_snapshot?: RebanhoSnapshot;
}
```

---

## 2. Função Principal: `projetarRebanho()`

### 2.1 Assinatura

```typescript
// lib/supabase/rebanho-projection.ts (novo arquivo)

import { qServer } from '@/lib/supabase/queries-audit';
import type { RebanhoProjetado, CategoriaProjetada, RebanhoSnapshot } from '@/lib/types/planejamento-silagem';

/**
 * Projeta a composição do rebanho para uma data futura.
 *
 * Algoritmo:
 * 1. Busca animais atuais filtrados por status (vivo, não vendido)
 * 2. Busca eventos reprodutivos até data_alvo (partos, descartes)
 * 3. Busca configuração de categorias (ponto de transição por idade)
 * 4. Calcula nova composição por categoria:
 *    - Base: contagem de animais por categoria
 *    - Partos: incrementa cria (sexo determina categoria)
 *    - Mudanças de idade: Bezerro→Novilha→Vaca
 *    - Descartes: remove vendidos/mortos
 * 5. Monta snapshot com auditoria completa
 *
 * @param dataAlvo Date - data para qual projetar (default: hoje)
 * @param options.incluirPartos - considerar partos previstos (default: true)
 * @param options.incluirDescartes - considerar vendas/mortes (default: true)
 * @returns Promise<RebanhoProjetado> - composição projetada + metadados
 * @throws Error - se falhar em buscar dados (sem rebanho retorna composição vazia)
 */
export async function projetarRebanho(
  dataAlvo: Date = new Date(),
  options: {
    incluirPartos?: boolean;
    incluirDescartes?: boolean;
  } = {}
): Promise<RebanhoProjetado> {
  const { incluirPartos = true, incluirDescartes = true } = options;

  const dataAlvoISO = dataAlvo.toISOString().split('T')[0];
  const dataCalculo = new Date();

  try {
    // 1. Buscar animais vivos (status != 'morto' e sem evento de descarte antes de dataAlvo)
    const animais = await qServer.animais.listAtivos();

    // 2. Buscar categorias para mapeamento de transições
    const categorias = await qServer.categorias.getAll(); // TODO: criar query

    // 3. Buscar eventos reprodutivos até dataAlvo
    const partos = incluirPartos
      ? await qServer.eventosReproducao.listPartosAte(dataAlvoISO)
      : [];

    const descartes = incluirDescartes
      ? await qServer.eventosReproducao.listDescartesAte(dataAlvoISO)
      : [];

    // 4. Inicializar contadores por categoria
    const composicaoBase: Record<string, number> = {};
    categorias.forEach((cat) => {
      composicaoBase[cat.id] = 0;
    });

    // Contar animais atuais por categoria
    const animaisAtivos = animais.filter((a) => {
      const temDescarte = descartes.some((d) => d.animal_id === a.id);
      return !temDescarte;
    });

    animaisAtivos.forEach((animal) => {
      if (composicaoBase.hasOwnProperty(animal.categoria)) {
        composicaoBase[animal.categoria]++;
      }
    });

    // 5. Aplicar partos
    let partosInclusos = 0;
    partos.forEach((parto) => {
      partosInclusos++;

      // Cria nasce em categoria determinada pelo sexo
      const categoriaCria =
        parto.sexo_cria === "Fêmea" ? "novilha" : null; // machos descarte imediato (Leite)
      if (categoriaCria) {
        composicaoBase[categoriaCria]++;
      }

      // Mãe permanece em sua categoria (ou transita se aplicável)
      // Ex: Vaca Lactando após parto permanece Vaca Lactando
    });

    // 6. Aplicar mudanças de categoria por idade
    let mudancasCategoria = 0;
    animaisAtivos.forEach((animal) => {
      const idade_dias = Math.floor(
        (new Date(dataAlvoISO).getTime() - new Date(animal.data_nascimento).getTime()) /
        (1000 * 60 * 60 * 24)
      );

      // Transição Bezerro → Novilha (default 180 dias)
      if (
        animal.categoria === "bezerro" &&
        idade_dias >= 180
      ) {
        composicaoBase["bezerro"]--;
        composicaoBase["novilha"]++;
        mudancasCategoria++;
      }

      // Transição Novilha → Vaca Lactando
      // Condição: diagnóstico de prenhez positivo + data estimada do parto ≤ dataAlvo
      const diagnosticoPrenhez = partos.find((p) => p.animal_id === animal.id);
      if (
        animal.categoria === "novilha" &&
        diagnosticoPrenhez &&
        new Date(diagnosticoPrenhez.data_evento) <= new Date(dataAlvoISO)
      ) {
        composicaoBase["novilha"]--;
        composicaoBase["vaca_lactando"]++;
        mudancasCategoria++;
      }
    });

    // 7. Montar resposta
    const categoriasMapeadas: CategoriaProjetada[] = categorias.map((cat) => ({
      id: cat.id,
      nome: cat.nome,
      quantidade_atual: composicaoBase[cat.id] || 0,
      quantidade_projetada: composicaoBase[cat.id] || 0,
      variacao: (composicaoBase[cat.id] || 0) - (animaisAtivos.filter(a => a.categoria === cat.id).length || 0),
      alteracoes: {
        partos_novos: partos.filter((p) => p.sexo_cria === "Fêmea").length,
        mudancas_categoria: mudancasCategoria,
        descartes: descartes.length,
      },
    }));

    const totalCabecas = Object.values(composicaoBase).reduce((a, b) => a + b, 0);

    return {
      data_alvo: dataAlvo,
      data_calculo: dataCalculo,
      categorias: categoriasMapeadas,
      composicao: composicaoBase,
      total_cabecas: totalCabecas,
      fatores_aplicados: {
        partos_confirmados: partosInclusos,
        mudancas_categoria: mudancasCategoria,
        descartes: descartes.length,
        avisos: totalCabecas > 200 ? ["Rebanho grande, performance pode ser afetada"] : [],
      },
      toSnapshot(): RebanhoSnapshot {
        return {
          data_calculo: dataCalculo.toISOString(),
          data_projecao: dataAlvo.toISOString(),
          composicao: composicaoBase,
          total_cabecas: totalCabecas,
          total_animais_base: animaisAtivos.length,
          partos_inclusos_na_projecao: partosInclusos,
          mudancas_categoria_inclusos: mudancasCategoria,
          descartes_inclusos: descartes.length,
          tipo_rebanho: "Leite", // TODO: buscar do sistema atual
          modo: "PROJETADO",
          usuario_editou: false,
          versao_algoritmo: "1.0",
        };
      },
    };
  } catch (error) {
    console.error('[rebanho-projection] Erro ao projetar:', error);
    // Fallback: retorna rebanho vazio (para continuar wizard manualmente)
    return {
      data_alvo: dataAlvo,
      data_calculo: new Date(),
      categorias: [],
      composicao: {},
      total_cabecas: 0,
      fatores_aplicados: {
        partos_confirmados: 0,
        mudancas_categoria: 0,
        descartes: 0,
        avisos: ['Erro ao projetar rebanho, continuando manualmente'],
      },
      toSnapshot(): RebanhoSnapshot {
        return {
          data_calculo: new Date().toISOString(),
          data_projecao: dataAlvo.toISOString(),
          composicao: {},
          total_cabecas: 0,
          total_animais_base: 0,
          partos_inclusos_na_projecao: 0,
          mudancas_categoria_inclusos: 0,
          descartes_inclusos: 0,
          tipo_rebanho: "Leite",
          modo: "MANUAL",
          usuario_editou: false,
          versao_algoritmo: "1.0",
        };
      },
    };
  }
}

/**
 * Detecta se há rebanho cadastrado na fazenda.
 * Retorna diferenciação entre "vazio", "sem acesso" (sem plano) e "detectado".
 */
export async function detectarRebanho(): Promise<DeteccaoRebanho> {
  try {
    // Tentar listar animais (vai retornar 403 se sem acesso via RLS)
    const animais = await qServer.animais.list({ limit: 1 });
    return {
      rebanho_detectado: animais.length > 0,
      data_ultimo_animal: animais[0]?.created_at
        ? new Date(animais[0].created_at)
        : undefined,
    };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        rebanho_detectado: false,
        razao: "sem_acesso", // usuário sem plano
      };
    }
    console.error('[rebanho-projection] Erro ao detectar:', error);
    return {
      rebanho_detectado: false,
      razao: "nenhum",
    };
  }
}
```

---

## 3. Migration SQL

### 3.1 Adicionar Coluna `rebanho_snapshot`

```sql
-- migrations/20260505_add_rebanho_snapshot_planejamentos_silagem.sql

ALTER TABLE planejamentos_silagem
ADD COLUMN rebanho_snapshot JSONB DEFAULT NULL;

COMMENT ON COLUMN planejamentos_silagem.rebanho_snapshot IS 
'Snapshot da projeção de rebanho no momento da criação da simulação. 
Inclui data_calculo, data_projecao, composicao, modo, e auditoria.
NULL indica simulação anterior a Fase 3 (sem integração de rebanho).
Não é atualizado ao re-editar a simulação, preservando o contexto original.';

-- Criar índice opcional para queries por modo de projeção
CREATE INDEX idx_planejamentos_silagem_rebanho_modo
ON planejamentos_silagem USING GIN (rebanho_snapshot)
WHERE rebanho_snapshot IS NOT NULL;
```

---

## 4. Modificações no Wizard (Etapa 2)

### 4.1 Detecção Automática

```typescript
// app/dashboard/planejamento-silagem/components/Etapa2Rebanho.tsx (refatorada)

'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CATEGORIAS_LEITE, CATEGORIAS_CORTE } from '@/lib/constants/planejamento-silagem';
import { projetarRebanho, detectarRebanho } from '@/lib/supabase/rebanho-projection';
import { RebanhoProjetado, RebanhoSnapshot } from '@/lib/types/planejamento-silagem';
import { WizardState } from '@/lib/types/planejamento-silagem';

interface Etapa2RebanhoProps {
  wizard: WizardState;
  onNext: (rebanho: Record<string, number>, snapshot?: RebanhoSnapshot) => void;
  onBack: () => void;
  errors: Record<string, string>;
}

export function Etapa2Rebanho({
  wizard,
  onNext,
  onBack,
  errors,
}: Etapa2RebanhoProps) {
  const categorias =
    wizard.sistema?.tipo_rebanho === 'Leite' ? CATEGORIAS_LEITE : CATEGORIAS_CORTE;

  // Estados de rebanho projetado
  const [rebanhoDetectado, setRebanhoDetectado] = useState(false);
  const [rebanhoProjetado, setRebanhoProjetado] = useState<RebanhoProjetado | null>(null);
  const [dataProjecao, setDataProjecao] = useState(new Date());
  const [ajusteManualAtivado, setAjusteManualAtivado] = useState(false);
  const [isCarregando, setIsCarregando] = useState(true);
  const [erroDeteccao, setErroDeteccao] = useState<string | null>(null);

  // Estado local de quantidades (pode vir de projeção ou entrada manual)
  const [quantidades, setQuantidades] = useState<Record<string, number>>(
    wizard.rebanho || {}
  );

  const totalCabecas = useMemo(() => {
    return Object.values(quantidades).reduce((a, b) => a + (b || 0), 0);
  }, [quantidades]);

  // 4.1.1 Detecção e Projeção Inicial
  useEffect(() => {
    async function carregarRebanho() {
      setIsCarregando(true);
      try {
        const deteccao = await detectarRebanho();
        setRebanhoDetectado(deteccao.rebanho_detectado);

        if (deteccao.rebanho_detectado) {
          // Projetar para hoje (customizável depois)
          const projetado = await projetarRebanho(new Date());
          setRebanhoProjetado(projetado);
          setDataProjecao(new Date());

          // Pré-preencher com dados projetados
          const novasQuantidades: Record<string, number> = {};
          categorias.forEach((cat) => {
            novasQuantidades[cat.id] = projetado.composicao[cat.id] || 0;
          });
          setQuantidades(novasQuantidades);

          toast.success(
            `✓ Rebanho detectado! Projetado para ${new Date().toLocaleDateString('pt-BR')}`
          );
        } else {
          if (deteccao.razao === 'sem_acesso') {
            setErroDeteccao(
              'Você não tem acesso ao módulo de Gestão de Rebanho. Assine um plano para usar projeção automática.'
            );
          }
          setQuantidades({});
        }
      } catch (error) {
        console.error('Erro ao carregar rebanho:', error);
        setErroDeteccao('Erro ao detectar rebanho. Continuando manualmente...');
        toast.error('Erro ao carregar rebanho');
      } finally {
        setIsCarregando(false);
      }
    }

    carregarRebanho();
  }, [wizard.sistema?.tipo_rebanho, categorias]);

  // 4.1.2 Manipuladores
  const handleQuantidadeChange = (catId: string, value: string) => {
    const num = parseInt(value, 10);
    setQuantidades((prev) => ({
      ...prev,
      [catId]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const handleAlterarDataProjecao = async () => {
    // TODO: DialogAlterarDataProjecao (diálogo + re-cálculo)
    const novaData = prompt(
      'Data para projeção (YYYY-MM-DD):',
      dataProjecao.toISOString().split('T')[0]
    );
    if (novaData) {
      try {
        const data = new Date(novaData);
        const projetado = await projetarRebanho(data);
        setRebanhoProjetado(projetado);
        setDataProjecao(data);

        const novasQuantidades: Record<string, number> = {};
        categorias.forEach((cat) => {
          novasQuantidades[cat.id] = projetado.composicao[cat.id] || 0;
        });
        setQuantidades(novasQuantidades);

        toast.success(`Projeção recalculada para ${data.toLocaleDateString('pt-BR')}`);
      } catch (error) {
        toast.error('Erro ao recalcular projeção');
      }
    }
  };

  const handleNext = () => {
    // Montar snapshot se houver projeção
    let snapshot: RebanhoSnapshot | undefined;
    if (rebanhoProjetado && !ajusteManualAtivado) {
      snapshot = rebanhoProjetado.toSnapshot();
    } else if (rebanhoProjetado && ajusteManualAtivado) {
      snapshot = rebanhoProjetado.toSnapshot();
      snapshot.usuario_editou = true; // marca edição
    }

    onNext(quantidades, snapshot);
  };

  if (isCarregando) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando rebanho...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rebanho</CardTitle>
          <CardDescription>
            {rebanhoDetectado && !ajusteManualAtivado
              ? 'Dados projetados com base no seu rebanho cadastrado'
              : 'Informe a quantidade de animais para cada categoria'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alerta de Projeção Bem-Sucedida */}
          {rebanhoDetectado && !ajusteManualAtivado && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✓ Rebanho detectado! Projetado para{' '}
                <strong>{dataProjecao.toLocaleDateString('pt-BR')}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Aviso de Sem Acesso */}
          {erroDeteccao && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{erroDeteccao}</AlertDescription>
            </Alert>
          )}

          {/* Controles de Ajuste */}
          {rebanhoDetectado && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded">
              <Checkbox
                id="ajuste-manual"
                checked={ajusteManualAtivado}
                onCheckedChange={(checked) => setAjusteManualAtivado(!!checked)}
              />
              <label htmlFor="ajuste-manual" className="cursor-pointer flex-1">
                Ajustar manualmente
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAlterarDataProjecao}
                disabled={ajusteManualAtivado}
              >
                📅 Alterar Data
              </Button>
            </div>
          )}

          {/* Tabela de Rebanho */}
          <div className="overflow-x-auto">
            <RebanhoProjetado
              categorias={categorias}
              quantidades={quantidades}
              rebanhoProjetado={rebanhoProjetado}
              ajusteManualAtivado={ajusteManualAtivado || !rebanhoDetectado}
              onQuantidadeChange={handleQuantidadeChange}
            />
          </div>

          {/* Validação */}
          {errors.rebanho && (
            <Alert variant="destructive">
              <AlertDescription>{errors.rebanho}</AlertDescription>
            </Alert>
          )}

          {totalCabecas === 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                Cadastre ao menos 1 animal para continuar
              </AlertDescription>
            </Alert>
          )}

          {/* CTA para Rebanho Vazio */}
          {!rebanhoDetectado && !erroDeteccao && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                📌 Você ainda não tem rebanho cadastrado.
                <br />
                <a
                  href="/dashboard/rebanho/animais"
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  Cadastre agora
                </a>{' '}
                para usar projeção automática, ou continue manualmente aqui.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Botões de Navegação */}
      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          onClick={handleNext}
          disabled={totalCabecas === 0}
          size="lg"
        >
          Próximo <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

## 5. Componente `RebanhoProjetado.tsx`

### 5.1 Novo Componente para Tabela

```typescript
// app/dashboard/planejamento-silagem/components/RebanhoProjetado.tsx

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { CATEGORIAS_LEITE } from '@/lib/constants/planejamento-silagem';
import { RebanhoProjetado as RebanhoProjetadoType } from '@/lib/types/planejamento-silagem';

interface RebanhoProjetadoProps {
  categorias: typeof CATEGORIAS_LEITE;
  quantidades: Record<string, number>;
  rebanhoProjetado: RebanhoProjetadoType | null;
  ajusteManualAtivado: boolean;
  onQuantidadeChange: (catId: string, value: string) => void;
}

export function RebanhoProjetado({
  categorias,
  quantidades,
  rebanhoProjetado,
  ajusteManualAtivado,
  onQuantidadeChange,
}: RebanhoProjetadoProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoria</TableHead>
          {rebanhoProjetado && !ajusteManualAtivado && (
            <>
              <TableHead className="text-right">Projetado</TableHead>
              <TableHead className="text-right">Atual</TableHead>
            </>
          )}
          <TableHead className="text-right">PV (kg)</TableHead>
          <TableHead className="text-right">CMS base (kg/dia)</TableHead>
          <TableHead className="text-right">% Silagem</TableHead>
          <TableHead className="text-right">Qtd. Cabeças</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categorias.map((cat) => {
          const projetado = rebanhoProjetado?.composicao[cat.id] || 0;
          const atual = quantidades[cat.id] || 0;

          return (
            <TableRow key={cat.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{cat.nome}</p>
                  <p className="text-xs text-muted-foreground">{cat.id}</p>
                </div>
              </TableCell>
              {rebanhoProjetado && !ajusteManualAtivado && (
                <>
                  <TableCell className="text-right text-sm">
                    {projetado}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {atual}
                  </TableCell>
                </>
              )}
              <TableCell className="text-right text-sm">
                {cat.pv_ref_kg}
              </TableCell>
              <TableCell className="text-right text-sm">
                {cat.cms_base_kg_dia.toFixed(1)}
              </TableCell>
              <TableCell className="text-right text-sm">
                {(cat.pct_silagem_base * 100).toFixed(0)}%
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={quantidades[cat.id] || 0}
                  onChange={(e) => onQuantidadeChange(cat.id, e.target.value)}
                  disabled={!ajusteManualAtivado && rebanhoProjetado !== null}
                  className="w-16 text-right"
                  placeholder="0"
                />
              </TableCell>
            </TableRow>
          );
        })}
        {/* Linha de totais */}
        <TableRow className="bg-muted/50 font-bold">
          <TableCell colSpan={rebanhoProjetado && !ajusteManualAtivado ? 2 : 1}>
            Total
          </TableCell>
          {rebanhoProjetado && !ajusteManualAtivado && <TableCell />}
          <TableCell colSpan={4} />
          <TableCell className="text-right">
            {Object.values(quantidades).reduce((a, b) => a + (b || 0), 0)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
```

---

## 6. Integração com Server Actions

### 6.1 Atualizar `actions.ts`

```typescript
// app/dashboard/planejamento-silagem/actions.ts (atualizado)

'use server';

import { revalidatePath } from 'next/cache';
import { qServer } from '@/lib/supabase/queries-audit';
import type { PlanejamentoSilagem, RebanhoSnapshot } from '@/lib/types/planejamento-silagem';

/**
 * Salvar planejamento com snapshot opcional de rebanho.
 */
export async function savePlanejamentoAction(
  payload: Omit<PlanejamentoSilagem, 'id' | 'created_at' | 'fazenda_id'>,
  rebanhoSnapshot?: RebanhoSnapshot
): Promise<{ success: boolean; data?: PlanejamentoSilagem; error?: string }> {
  try {
    const payloadComSnapshot = {
      ...payload,
      rebanho_snapshot: rebanhoSnapshot || null,
    };

    const result = await qServer.planejamentosSilagem.create(payloadComSnapshot as any);
    revalidatePath('/dashboard/planejamento-silagem/historico');
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Erro ao salvar planejamento:', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      success: false,
      error: mensagem,
    };
  }
}

// (demais Server Actions permanecem igual: listPlanejamentosAction, getPlanejamentoAction, etc.)
```

---

## 7. Exibição de Histórico com Snapshot

### 7.1 Histórico: Informar Modo de Projeção

```typescript
// app/dashboard/planejamento-silagem/historico/components/TabelaHistorico.tsx (complemento)

// Na coluna de informações adicionais, exibir:
{planejamento.rebanho_snapshot && (
  <span className="text-xs text-muted-foreground">
    {planejamento.rebanho_snapshot.modo === 'PROJETADO'
      ? `📊 Projetado em ${new Date(planejamento.rebanho_snapshot.data_projecao).toLocaleDateString('pt-BR')}`
      : '🖊️ Manual'}
  </span>
)}
```

---

## 8. Retrocompatibilidade

### 8.1 Tratamento de Simulações Antigas

```typescript
// Ao carregar histórico ou editar:
const simulacao = await getPlanejamentoAction(id);

if (!simulacao.data?.rebanho_snapshot) {
  console.log('Simulação manual anterior a Fase 3, sem snapshot');
  // Continua funcionando normalmente
} else {
  console.log(
    `Projetada em ${simulacao.data.rebanho_snapshot.data_projecao} ` +
    `com ${simulacao.data.rebanho_snapshot.total_cabecas} cabeças`
  );
  // Exibir informação no histórico
}
```

---

## 9. Ordem de Implementação (T29–T35)

### Fases de Ação (T29–T34): ~13h

| Task | Descrição | Tempo | Dependências |
|------|-----------|-------|--------------|
| **T29** | Criar migration para `rebanho_snapshot` | 30min | — |
| **T30** | Definir tipos: `RebanhoSnapshot`, `CategoriaProjetada`, `RebanhoProjetado` | 1h | T29 |
| **T31** | Implementar `projetarRebanho()` + `detectarRebanho()` | 3h | T30 (+ queries de animais/eventos) |
| **T32** | Testes unitários de `projetarRebanho()` (vazio, 1 parto, 10+ partos, futuro) | 2h | T31 |
| **T33** | Refatorar `Etapa2Rebanho.tsx` + criar `RebanhoProjetado.tsx` + integrar snapshot | 4h | T30, T31 |
| **T34** | Testes integrais + E2E do wizard (detecção → projeção → salvar) | 2.5h | T33 |

### Documentação & Resumo (T35): ~0.5h

| Task | Descrição | Tempo |
|------|-----------|-------|
| **T35** | Atualizar CLAUDE.md, README, comentários de código + validação final | 0.5h |
| — | **Total** | **~13.5h (1.5 dias)** |

---

## 10. Checklist de Implementação

### 10.1 Banco de Dados
- [ ] Migration executada: `rebanho_snapshot` adicionado a `planejamentos_silagem`
- [ ] Índice GIN criado para queries futuras
- [ ] Coluna é JSONB e nullable
- [ ] Tipos TypeScript gerados: `npm run db:types`

### 10.2 Tipos e Interfaces
- [ ] `RebanhoSnapshot` exportado de `lib/types/planejamento-silagem.ts`
- [ ] `RebanhoProjetado` com método `toSnapshot()`
- [ ] `DeteccaoRebanho` diferencia "vazio", "sem_acesso"
- [ ] `WizardState` estendido com campos de projeção

### 10.3 Função `projetarRebanho()`
- [ ] Implementado em `lib/supabase/rebanho-projection.ts`
- [ ] Retorna projeção correta para:
  - [ ] Rebanho vazio (composição: {}, total: 0)
  - [ ] Rebanho com 1 parturiente (incrementa cria)
  - [ ] Rebanho com 10+ parturientes
  - [ ] Data futura > 1 ano (sem overflow)
- [ ] Tempo < 300ms mesmo para 500+ cabeças
- [ ] Fallback para rebanho vazio em caso de erro (não bloqueia wizard)
- [ ] Testes cobrem todos os casos acima

### 10.4 UI: Etapa2Rebanho
- [ ] Detecção automática ao carregar (useEffect)
- [ ] Alerta verde quando rebanho detectado
- [ ] Checkbox "Ajustar Manualmente" habilita inputs
- [ ] Botão "📅 Alterar Data" funciona (re-projeta)
- [ ] CTA inteligente quando:
  - [ ] Rebanho detectado (mostra "cadastre agora" com link)
  - [ ] Sem acesso (plano) (mostra mensagem de upgrade)
- [ ] Inputs desabilitados até checkbox marcado
- [ ] Toast ao carregar projeção com sucesso
- [ ] Tratamento de erros (fallback para manual)

### 10.5 Snapshot & Persistência
- [ ] `savePlanejamentoAction()` aceita opcional `rebanhoSnapshot`
- [ ] Snapshot preenchido ao salvar simulação de Fase 3+
- [ ] Snapshot = null para simulações antigas (retrocompat)
- [ ] `usuario_editou` = true quando usuário altera após projeção
- [ ] Histórico carrega e exibe modo ("📊 Projetado em 20/06" vs "🖊️ Manual")

### 10.6 Retrocompatibilidade
- [ ] Simulações antigas (sem snapshot) carregam sem erro
- [ ] Histórico exibe mix de simulações antigas (snapshot=null) e novas
- [ ] Re-editar simulação antiga não quebra (apenas atualiza nome/parâmetros)
- [ ] Usuários sem rebanho continuam usando modo manual

### 10.7 Testes (Vitest)
- [ ] 100+ testes novos (total > 340)
- [ ] Testes de projeção:
  - [ ] Rebanho pequeno (10 cabeças)
  - [ ] Rebanho médio (100 cabeças)
  - [ ] Rebanho grande (500+ cabeças)
  - [ ] Rebanho vazio
  - [ ] Com partos, mudanças de categoria, descartes
- [ ] Testes de detecção:
  - [ ] Com rebanho
  - [ ] Sem rebanho (vazio)
  - [ ] Sem acesso (403)
- [ ] Testes de UI (Etapa2Rebanho):
  - [ ] Renderiza tabela corretamente
  - [ ] Inputs desabilitados até checkbox
  - [ ] Mudança de data re-projeta
  - [ ] Erros tratados com toast
- [ ] Testes de snapshot:
  - [ ] Gravado ao salvar
  - [ ] Histórico exibe modo
  - [ ] Retrocompat com antigas

### 10.8 Performance & Load
- [ ] Projeção < 300ms para 500+ cabeças (medir com `console.time()`)
- [ ] Histórico com 100 simulações carrega < 500ms
- [ ] Lighthouse: sem regressão (LCP, CLS, FCP)
- [ ] Cache: projeção cacheada no state, invalidada ao mudar data

### 10.9 Documentação
- [ ] README: como usar projeção
- [ ] Comentários no código (tipos, funções críticas)
- [ ] Decisões arquiteturais registradas em CLAUDE.md (se aplicável)
- [ ] Exemplos de snapshot em documentação de schema

### 10.10 Verificações Finais
- [ ] `npm run build` sem erros
- [ ] `npm run test` — 340+ testes passando
- [ ] `npm run lint` — sem warnings
- [ ] Histórico visual (Lighthouse ≥ 82/100)
- [ ] Regressão testada: fluxo manual sem rebanho ainda funciona
- [ ] Fluxo completo: detect → projeta → pré-preenche → salvar → histórico

---

## 11. Decisões Arquiteturais Confirmadas

1. **Cálculo em Server Action** (não Postgres function)
   - Flexibilidade para ajustes futuros
   - Fácil logging e debugging
   - Cache no React state

2. **Snapshot Imutável**
   - Preserva contexto original (qual era o rebanho na data)
   - Flag `usuario_editou` registra se foi alterado após projeção
   - Não é atualizado ao re-editar simulação

3. **Modo "Manual" no Fallback**
   - Se erro ao projetar: wizard continua (não é bloqueante)
   - Toast informa ao usuário
   - Snapshot retorna vazio com `modo: 'MANUAL'`

4. **Inputs Desabilitados por Padrão**
   - Quando rebanho detectado e projeção OK: inputs são read-only (disabled)
   - Checkbox "Ajustar Manualmente" libera edição (UX clara)
   - Evita confusão entre valores projetados e digitados

---

## 12. Próximos Passos Pós-Fase 3

### Fase 3.1 (Opcional)
- [ ] Export PDF com snapshot ("Rebanho projetado em 20/06/2026: 85 cabeças")
- [ ] Notificação se > 20 partos previstos (muito movimento)
- [ ] Cache em IndexedDB para offline

### Fase 3.2+ (Roadmap)
- [ ] Integração com Notificações (partos próximos)
- [ ] Comparativo histórico (simulação de Fase 2 vs. Fase 3)
- [ ] API pública para consultar projeção (3rd-party integrações)

---

**Documento finalizado em 2026-05-05**
