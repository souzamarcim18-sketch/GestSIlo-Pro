'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CATEGORIAS_LEITE, CATEGORIAS_CORTE } from '@/lib/constants/planejamento-silagem';
import { WizardState } from '@/lib/types/planejamento-silagem';

interface Etapa2RebanhoProps {
  wizard: WizardState;
  onNext: (rebanho: Record<string, number>) => void;
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

  const [quantidades, setQuantidades] = useState<Record<string, number>>(
    wizard.rebanho || {}
  );

  const totalCabecas = useMemo(() => {
    return Object.values(quantidades).reduce((a, b) => a + (b || 0), 0);
  }, [quantidades]);

  const handleQuantidadeChange = (catId: string, value: string) => {
    const num = parseInt(value, 10);
    setQuantidades((prev) => ({
      ...prev,
      [catId]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const handleNext = () => {
    onNext(quantidades);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rebanho</CardTitle>
          <CardDescription>
            Informe a quantidade de animais para cada categoria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabela */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">PV (kg)</TableHead>
                  <TableHead className="text-right">CMS base (kg/dia)</TableHead>
                  <TableHead className="text-right">% Silagem</TableHead>
                  <TableHead className="text-right">Qtd. Cabeças</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{cat.nome}</p>
                        <p className="text-xs text-muted-foreground">{cat.id}</p>
                      </div>
                    </TableCell>
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
                        onChange={(e) =>
                          handleQuantidadeChange(cat.id, e.target.value)
                        }
                        className="w-16 text-right"
                        placeholder="0"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {/* Linha de totais */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right">
                    {totalCabecas}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
        </CardContent>
      </Card>

      {/* Botões */}
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
