'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FATORES_SISTEMA } from '@/lib/constants/planejamento-silagem';
import { WizardState } from '@/lib/types/planejamento-silagem';
import { cn } from '@/lib/utils';

interface Etapa1SistemaProps {
  wizard: WizardState;
  onNext: (data: { tipo_rebanho: string; sistema_producao: string }) => void;
  errors: Record<string, string>;
}

export function Etapa1Sistema({ wizard, onNext, errors }: Etapa1SistemaProps) {
  const [tipoRebanho, setTipoRebanho] = useState(
    wizard.sistema?.tipo_rebanho || ''
  );
  const [sistemaProd, setSistemaProd] = useState(
    wizard.sistema?.sistema_producao || ''
  );

  const handleNext = () => {
    onNext({
      tipo_rebanho: tipoRebanho,
      sistema_producao: sistemaProd,
    });
  };

  const getSystemInfo = (sistema: string) => {
    const system = FATORES_SISTEMA[sistema as keyof typeof FATORES_SISTEMA];
    if (!system) return null;
    return {
      consumo: (system.consumo * 100).toFixed(0),
      silagem: (system.silagem * 100).toFixed(0),
    };
  };

  const systemInfo = sistemaProd ? getSystemInfo(sistemaProd) : null;

  return (
    <div className="space-y-6">
      {/* Tipo de Rebanho */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipo de Rebanho</CardTitle>
          <CardDescription>
            Selecione o tipo de rebanho para o planejamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div
              className={cn(
                'flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted',
                tipoRebanho === 'Leite' && 'bg-primary/10 border-primary'
              )}
              onClick={() => setTipoRebanho('Leite')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setTipoRebanho('Leite')}
            >
              <input
                type="radio"
                id="leite"
                name="tipo_rebanho"
                value="Leite"
                checked={tipoRebanho === 'Leite'}
                onChange={() => setTipoRebanho('Leite')}
                className="w-4 h-4"
              />
              <Label htmlFor="leite" className="cursor-pointer flex-1 font-medium">
                🥛 Leite
              </Label>
              <span className="text-xs text-muted-foreground">
                Vacas leiteiras, novilhas e bezerras
              </span>
            </div>

            <div
              className={cn(
                'flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted',
                tipoRebanho === 'Corte' && 'bg-primary/10 border-primary'
              )}
              onClick={() => setTipoRebanho('Corte')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setTipoRebanho('Corte')}
            >
              <input
                type="radio"
                id="corte"
                name="tipo_rebanho"
                value="Corte"
                checked={tipoRebanho === 'Corte'}
                onChange={() => setTipoRebanho('Corte')}
                className="w-4 h-4"
              />
              <Label htmlFor="corte" className="cursor-pointer flex-1 font-medium">
                🐄 Corte
              </Label>
              <span className="text-xs text-muted-foreground">
                Animais para terminação e reposição
              </span>
            </div>
          </div>
          {errors.tipo_rebanho && (
            <Alert variant="destructive">
              <AlertDescription>{errors.tipo_rebanho}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sistema de Produção */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sistema de Produção</CardTitle>
          <CardDescription>
            Selecione o modelo de produção utilizado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div
              className={cn(
                'flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted',
                sistemaProd === 'pasto' && 'bg-primary/10 border-primary'
              )}
              onClick={() => setSistemaProd('pasto')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSistemaProd('pasto')}
            >
              <input
                type="radio"
                id="pasto"
                name="sistema_producao"
                value="pasto"
                checked={sistemaProd === 'pasto'}
                onChange={() => setSistemaProd('pasto')}
                className="w-4 h-4"
              />
              <Label htmlFor="pasto" className="cursor-pointer flex-1 font-medium">
                🌾 Pasto + Suplementação
              </Label>
            </div>

            <div
              className={cn(
                'flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted',
                sistemaProd === 'semiconfinado' && 'bg-primary/10 border-primary'
              )}
              onClick={() => setSistemaProd('semiconfinado')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSistemaProd('semiconfinado')}
            >
              <input
                type="radio"
                id="semiconfinado"
                name="sistema_producao"
                value="semiconfinado"
                checked={sistemaProd === 'semiconfinado'}
                onChange={() => setSistemaProd('semiconfinado')}
                className="w-4 h-4"
              />
              <Label htmlFor="semiconfinado" className="cursor-pointer flex-1 font-medium">
                🏢 Semi-confinado
              </Label>
              <span className="text-xs text-muted-foreground">(Referência)</span>
            </div>

            <div
              className={cn(
                'flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted',
                sistemaProd === 'confinado' && 'bg-primary/10 border-primary'
              )}
              onClick={() => setSistemaProd('confinado')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSistemaProd('confinado')}
            >
              <input
                type="radio"
                id="confinado"
                name="sistema_producao"
                value="confinado"
                checked={sistemaProd === 'confinado'}
                onChange={() => setSistemaProd('confinado')}
                className="w-4 h-4"
              />
              <Label htmlFor="confinado" className="cursor-pointer flex-1 font-medium">
                🏭 Confinado
              </Label>
            </div>
          </div>
          {errors.sistema_producao && (
            <Alert variant="destructive">
              <AlertDescription>{errors.sistema_producao}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Info box com fatores */}
      {sistemaProd && systemInfo && (
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
          <CardHeader>
            <CardTitle className="text-sm">Fatores do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consumo:</span>
              <span className="font-medium">{systemInfo.consumo}% da base</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Silagem:</span>
              <span className="font-medium">{systemInfo.silagem}% da base</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Próximo */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={!tipoRebanho || !sistemaProd}
          size="lg"
        >
          Próximo <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
