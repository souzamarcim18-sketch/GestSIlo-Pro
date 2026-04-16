'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ParametrosPlanejamento } from '@/lib/types/planejamento-silagem';

interface AlertasFixosProps {
  parametros: ParametrosPlanejamento;
}

export function AlertasFixos({ parametros }: AlertasFixosProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alertas Técnicos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <AlertDescription className="text-sm">
            Valores estimados com base em parâmetros médios. Ajuste conforme
            manejo real e orientação de nutricionista.
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertDescription className="text-sm">
            Inclui margem de segurança de <strong>{parametros.perdas_percent}%</strong>{' '}
            para perdas.
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertDescription className="text-sm">
            Dietas com maior proporção de concentrado reduzem a participação da
            silagem. Consulte um nutricionista para otimizar a relação
            volumoso:concentrado.
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertDescription className="text-sm">
            A área do painel frontal indica o tamanho <strong>MÁXIMO</strong> para
            manter taxa de retirada ≥{' '}
            <strong>{parametros.taxa_retirada_kg_m2_dia} kg/m²/dia</strong>,
            minimizando deterioração aeróbia (Bernardes et al., 2021).
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
