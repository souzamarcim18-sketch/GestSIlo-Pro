'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DEFAULTS_PARAMETROS,
  RANGES_PARAMETROS,
} from '@/lib/constants/planejamento-silagem';
import { ParametrosPlanejamento, WizardState } from '@/lib/types/planejamento-silagem';

interface Etapa3ParametrosProps {
  wizard: WizardState;
  onNext: (parametros: ParametrosPlanejamento) => void;
  onBack: () => void;
  errors: Record<string, string>;
}

export function Etapa3Parametros({
  wizard,
  onNext,
  onBack,
  errors,
}: Etapa3ParametrosProps) {
  const [periodo, setPeriodo] = useState(
    wizard.parametros?.periodo_dias || DEFAULTS_PARAMETROS.periodo_dias
  );
  const [cultura, setCultura] = useState(
    wizard.parametros?.cultura || DEFAULTS_PARAMETROS.cultura
  );
  const [teorMs, setTeorMs] = useState(
    wizard.parametros?.teor_ms_percent || DEFAULTS_PARAMETROS.teor_ms_percent
  );
  const [perdas, setPerdas] = useState(
    wizard.parametros?.perdas_percent || DEFAULTS_PARAMETROS.perdas_percent
  );
  const [produtividade, setProdutividade] = useState(
    wizard.parametros?.produtividade_ton_mo_ha ||
      DEFAULTS_PARAMETROS.produtividade_ton_mo_ha
  );
  const [taxaRetirada, setTaxaRetirada] = useState(
    wizard.parametros?.taxa_retirada_kg_m2_dia ||
      DEFAULTS_PARAMETROS.taxa_retirada_kg_m2_dia
  );

  // Ajustar range de produtividade conforme cultura
  const prodRange =
    cultura === 'Milho'
      ? RANGES_PARAMETROS.produtividade_milho
      : RANGES_PARAMETROS.produtividade_sorgo;

  const handleCulturaChange = (novasCultura: string | null) => {
    if (!novasCultura) return;

    setCultura(novasCultura as 'Milho' | 'Sorgo');
    // Ajustar produtividade se necessário
    if (
      novasCultura === 'Milho' &&
      produtividade < RANGES_PARAMETROS.produtividade_milho.min
    ) {
      setProdutividade(50);
    } else if (
      novasCultura === 'Sorgo' &&
      produtividade > RANGES_PARAMETROS.produtividade_sorgo.max
    ) {
      setProdutividade(40);
    }
  };

  const handleNext = () => {
    const parametros: ParametrosPlanejamento = {
      periodo_dias: periodo,
      cultura: cultura as 'Milho' | 'Sorgo',
      teor_ms_percent: teorMs,
      perdas_percent: perdas,
      produtividade_ton_mo_ha: produtividade,
      taxa_retirada_kg_m2_dia: taxaRetirada,
    };

    onNext(parametros);
  };

  const getCulturaNome = (c: string) => (c === 'Milho' ? 'Milho' : 'Sorgo');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parâmetros de Planejamento</CardTitle>
          <CardDescription>
            Informe os parâmetros para cálculo da demanda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Período */}
          <div className="space-y-2">
            <Label htmlFor="periodo">
              Período de Fornecimento (dias)
            </Label>
            <Input
              id="periodo"
              type="number"
              min={RANGES_PARAMETROS.periodo_dias.min}
              max={RANGES_PARAMETROS.periodo_dias.max}
              value={periodo}
              onChange={(e) =>
                setPeriodo(parseInt(e.target.value, 10) || 1)
              }
              placeholder="180"
            />
            <p className="text-xs text-muted-foreground">
              Entre {RANGES_PARAMETROS.periodo_dias.min} e{' '}
              {RANGES_PARAMETROS.periodo_dias.max} dias
            </p>
            {errors.periodo_dias && (
              <Alert variant="destructive">
                <AlertDescription>{errors.periodo_dias}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Cultura */}
          <div className="space-y-2">
            <Label htmlFor="cultura">Cultura da Silagem</Label>
            <Select value={cultura} onValueChange={handleCulturaChange}>
              <SelectTrigger id="cultura">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Milho">Milho</SelectItem>
                <SelectItem value="Sorgo">Sorgo</SelectItem>
              </SelectContent>
            </Select>
            {errors.cultura && (
              <Alert variant="destructive">
                <AlertDescription>{errors.cultura}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Teor MS */}
          <div className="space-y-2">
            <Label htmlFor="teor-ms">Teor de Matéria Seca (%)</Label>
            <Input
              id="teor-ms"
              type="number"
              min={RANGES_PARAMETROS.teor_ms_percent.min}
              max={RANGES_PARAMETROS.teor_ms_percent.max}
              value={teorMs}
              onChange={(e) =>
                setTeorMs(parseFloat(e.target.value) || 25)
              }
              placeholder="33"
              step="1"
            />
            <p className="text-xs text-muted-foreground">
              Entre {RANGES_PARAMETROS.teor_ms_percent.min}% e{' '}
              {RANGES_PARAMETROS.teor_ms_percent.max}%
            </p>
            {errors.teor_ms_percent && (
              <Alert variant="destructive">
                <AlertDescription>{errors.teor_ms_percent}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Perdas */}
          <div className="space-y-2">
            <Label htmlFor="perdas">Perdas Estimadas (%)</Label>
            <Input
              id="perdas"
              type="number"
              min={RANGES_PARAMETROS.perdas_percent.min}
              max={RANGES_PARAMETROS.perdas_percent.max}
              value={perdas}
              onChange={(e) =>
                setPerdas(parseFloat(e.target.value) || 15)
              }
              placeholder="20"
              step="1"
            />
            <p className="text-xs text-muted-foreground">
              Entre {RANGES_PARAMETROS.perdas_percent.min}% e{' '}
              {RANGES_PARAMETROS.perdas_percent.max}%
            </p>
            {errors.perdas_percent && (
              <Alert variant="destructive">
                <AlertDescription>{errors.perdas_percent}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Produtividade */}
          <div className="space-y-2">
            <Label htmlFor="produtividade">
              Produtividade Esperada ({getCulturaNome(cultura)}) (ton MO/ha)
            </Label>
            <Input
              id="produtividade"
              type="number"
              min={prodRange.min}
              max={prodRange.max}
              value={produtividade}
              onChange={(e) =>
                setProdutividade(parseFloat(e.target.value) || prodRange.min)
              }
              placeholder={DEFAULTS_PARAMETROS.produtividade_ton_mo_ha.toString()}
              step="1"
            />
            <p className="text-xs text-muted-foreground">
              Entre {prodRange.min} e {prodRange.max} ton MO/ha
            </p>
            {errors.produtividade_ton_mo_ha && (
              <Alert variant="destructive">
                <AlertDescription>
                  {errors.produtividade_ton_mo_ha}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Taxa Retirada */}
          <div className="space-y-2">
            <Label htmlFor="taxa-retirada">
              Taxa de Retirada (kg/m²/dia)
            </Label>
            <Input
              id="taxa-retirada"
              type="number"
              min={RANGES_PARAMETROS.taxa_retirada.min}
              max={RANGES_PARAMETROS.taxa_retirada.max}
              value={taxaRetirada}
              onChange={(e) =>
                setTaxaRetirada(parseFloat(e.target.value) || 200)
              }
              placeholder="250"
              step="10"
            />
            <p className="text-xs text-muted-foreground">
              Entre {RANGES_PARAMETROS.taxa_retirada.min} e{' '}
              {RANGES_PARAMETROS.taxa_retirada.max} kg/m²/dia
            </p>
            {errors.taxa_retirada_kg_m2_dia && (
              <Alert variant="destructive">
                <AlertDescription>
                  {errors.taxa_retirada_kg_m2_dia}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handleNext} size="lg">
          Calcular <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
