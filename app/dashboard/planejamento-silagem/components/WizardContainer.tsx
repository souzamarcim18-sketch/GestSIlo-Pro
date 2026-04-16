'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  WizardState,
  ResultadosPlanejamento,
  AlertaPlanejamento,
  DefinicaoSistema,
  ParametrosPlanejamento,
} from '@/lib/types/planejamento-silagem';
import {
  Etapa1SistemaSchema,
  Etapa2RebanhoSchema,
  Etapa3ParametrosSchema,
} from '@/lib/validators/planejamento-silagem';
import {
  CATEGORIAS_LEITE,
  CATEGORIAS_CORTE,
  FATORES_SISTEMA,
  DEFAULTS_PARAMETROS,
} from '@/lib/constants/planejamento-silagem';
import {
  calcularCategoriaComAjustes,
  calcularResultados,
  gerarAlertasDinamicos,
} from '@/lib/services/planejamento-silagem';
import { Breadcrumb } from './Breadcrumb';
import { Etapa1Sistema } from './Etapa1Sistema';
import { Etapa2Rebanho } from './Etapa2Rebanho';
import { Etapa3Parametros } from './Etapa3Parametros';
import { Etapa4Resultados } from './Etapa4Resultados';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function WizardContainer() {
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [wizard, setWizard] = useState<WizardState>({
    sistema: null,
    rebanho: {},
    parametros: null,
  });
  const [resultados, setResultados] = useState<ResultadosPlanejamento | null>(null);
  const [alertas, setAlertas] = useState<AlertaPlanejamento[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleNextEtapa1 = (data: {
    tipo_rebanho: string;
    sistema_producao: string;
  }) => {
    const validacao = Etapa1SistemaSchema.safeParse(data);
    if (!validacao.success) {
      const errosMap: Record<string, string> = {};
      validacao.error.flatten().fieldErrors;
      Object.entries(validacao.error.flatten().fieldErrors).forEach(([key, messages]) => {
        if (messages && messages.length > 0) {
          errosMap[key] = messages[0];
        }
      });
      setErros(errosMap);
      return;
    }

    // Obter fatores
    const sistema_key = data.sistema_producao as keyof typeof FATORES_SISTEMA;
    const fatores = FATORES_SISTEMA[sistema_key];

    const novoSistema: DefinicaoSistema = {
      tipo_rebanho: data.tipo_rebanho as 'Leite' | 'Corte',
      sistema_producao: data.sistema_producao as
        | 'pasto'
        | 'semiconfinado'
        | 'confinado',
      fator_consumo: fatores.consumo,
      fator_silagem: fatores.silagem,
    };

    setWizard((prev) => ({
      ...prev,
      sistema: novoSistema,
    }));
    setErros({});
    setEtapaAtual(2);
  };

  const handleNextEtapa2 = (rebanho: Record<string, number>) => {
    const validacao = Etapa2RebanhoSchema.safeParse({ rebanho });
    if (!validacao.success) {
      const errosMap: Record<string, string> = {};
      const flattened = validacao.error.flatten();
      if (flattened.formErrors && flattened.formErrors.length > 0) {
        errosMap['rebanho'] = flattened.formErrors[0];
      }
      Object.entries(flattened.fieldErrors).forEach(([key, messages]) => {
        if (messages && messages.length > 0) {
          errosMap[key] = messages[0];
        }
      });
      setErros(errosMap);
      return;
    }

    setWizard((prev) => ({
      ...prev,
      rebanho,
    }));
    setErros({});
    setEtapaAtual(3);
  };

  const handleNextEtapa3 = (parametros: ParametrosPlanejamento) => {
    const validacao = Etapa3ParametrosSchema.safeParse(parametros);
    if (!validacao.success) {
      const errosMap: Record<string, string> = {};
      validacao.error.flatten().fieldErrors;
      Object.entries(validacao.error.flatten().fieldErrors).forEach(([key, messages]) => {
        if (messages && messages.length > 0) {
          errosMap[key] = messages[0];
        }
      });
      setErros(errosMap);
      return;
    }

    if (!wizard.sistema) {
      setErros({ sistema: 'Sistema não definido' });
      return;
    }

    setWizard((prev) => ({
      ...prev,
      parametros,
    }));

    // Calcular resultados
    const categorias = wizard.sistema.tipo_rebanho === 'Leite'
      ? CATEGORIAS_LEITE
      : CATEGORIAS_CORTE;

    const categoriasComQuantidade = categorias
      .map((cat) => ({
        ...cat,
        quantidade_cabecas: wizard.rebanho[cat.id] || 0,
      }))
      .filter((cat) => cat.quantidade_cabecas > 0);

    const categoriasAjustadas = categoriasComQuantidade.map((cat) =>
      calcularCategoriaComAjustes(
        cat,
        cat.quantidade_cabecas,
        wizard.sistema!.fator_consumo,
        wizard.sistema!.fator_silagem
      )
    );

    const resultadosCalculados = calcularResultados(
      categoriasAjustadas,
      parametros.periodo_dias,
      parametros.teor_ms_percent,
      parametros.perdas_percent,
      parametros.produtividade_ton_mo_ha,
      parametros.taxa_retirada_kg_m2_dia
    );

    const alertasDinamicos = gerarAlertasDinamicos(
      parametros,
      resultadosCalculados,
      wizard.sistema
    );

    setResultados(resultadosCalculados);
    setAlertas(alertasDinamicos);
    setErros({});
    setEtapaAtual(4);
  };

  const handleBackEtapa = () => {
    setEtapaAtual((prev) => Math.max(prev - 1, 1));
    setErros({});
  };

  const handleSaveEtapa4 = async (nome: string) => {
    if (!nome.trim()) {
      setErros({ nome: 'Nome do planejamento é obrigatório' });
      return;
    }

    if (!wizard.sistema || !wizard.parametros || !resultados) {
      setErros({ wizard: 'Dados incompletos' });
      return;
    }

    setIsSaving(true);
    try {
      // Montar payload
      const categorias = wizard.sistema.tipo_rebanho === 'Leite'
        ? CATEGORIAS_LEITE
        : CATEGORIAS_CORTE;

      const rebanhoArray = categorias
        .map((cat) => ({
          ...cat,
          quantidade_cabecas: wizard.rebanho[cat.id] || 0,
        }))
        .filter((cat) => cat.quantidade_cabecas > 0);

      const payload = {
        nome,
        sistema: wizard.sistema,
        rebanho: rebanhoArray,
        parametros: wizard.parametros,
        resultados,
      };

      // Chamada ao servidor seria aqui
      // Por enquanto, apenas simular sucesso
      console.log('Saving planejamento:', payload);

      toast.success('Planejamento salvo com sucesso!');

      // Reset wizard
      setEtapaAtual(1);
      setWizard({
        sistema: null,
        rebanho: {},
        parametros: null,
      });
      setResultados(null);
      setAlertas([]);
      setErros({});
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6 md:p-8">
      <Breadcrumb
        etapaAtual={etapaAtual}
        labels={['Sistema', 'Rebanho', 'Parâmetros', 'Resultados']}
      />

      <div className="mt-8">
        {etapaAtual === 1 && (
          <Etapa1Sistema
            wizard={wizard}
            onNext={handleNextEtapa1}
            errors={erros}
          />
        )}

        {etapaAtual === 2 && (
          <Etapa2Rebanho
            wizard={wizard}
            onNext={handleNextEtapa2}
            onBack={handleBackEtapa}
            errors={erros}
          />
        )}

        {etapaAtual === 3 && (
          <Etapa3Parametros
            wizard={wizard}
            onNext={handleNextEtapa3}
            onBack={handleBackEtapa}
            errors={erros}
          />
        )}

        {etapaAtual === 4 && resultados && (
          <Etapa4Resultados
            wizard={wizard}
            resultados={resultados}
            alertas={alertas}
            onBack={handleBackEtapa}
            onSave={handleSaveEtapa4}
            isSaving={isSaving}
          />
        )}
      </div>
    </Card>
  );
}
