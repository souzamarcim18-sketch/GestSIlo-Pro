'use server';

// Serviço de pendências da "Operação do dia" (Fase 3 — SPEC-rebanho345 §6.3.3, P3.1).
//
// Regra inviolável: NÃO há fonte de verdade nova. Este serviço apenas LÊ os
// alertas que outras superfícies já calculam (sanidade, indicadores) e os
// agrega numa lista priorizada e classificada. O serviço de alertas é
// compartilhado com o "Resumo executivo" da Fase 4 (§5.2).

import {
  listAlertasVacinacao,
} from './rebanho-sanitario';
import {
  listAnimaisComPartoPrevisto,
  listVacasSecasComPartoPrevisto,
  listAnimaisSemPesagem,
  type AlertaAnimal,
} from './rebanho-indicadores';
import type { AlertaSanitario } from '@/lib/types/rebanho-sanitario';
import type {
  Pendencia,
  ResumoOperacaoDia,
} from '@/lib/types/rebanho-pendencias';
import {
  montarPendencias,
  type EntradasPendencias,
} from '@/lib/utils/rebanho-pendencias';

/**
 * Carrega as pendências da Operação do dia.
 *
 * Reaproveita exatamente as mesmas janelas e queries usadas na página de
 * Indicadores (parto 30d, vaca seca 15d, sem pesagem 60d, vacinação 30d),
 * garantindo que "Operação do dia" mostre as MESMAS pendências (R-3.4).
 */
export async function getResumoOperacaoDia(): Promise<ResumoOperacaoDia> {
  const [vacinacoes, partosPrevistos, vacasSecas, semPesagem] =
    await Promise.all([
      listAlertasVacinacao(30),
      listAnimaisComPartoPrevisto(30),
      listVacasSecasComPartoPrevisto(15),
      listAnimaisSemPesagem(60),
    ]);

  const entradas: EntradasPendencias = {
    vacinacoes: vacinacoes as AlertaSanitario[],
    partosPrevistos: partosPrevistos as AlertaAnimal[],
    vacasSecas: vacasSecas as AlertaAnimal[],
    semPesagem: semPesagem as AlertaAnimal[],
  };

  // Serialização defensiva mantida no padrão das demais leituras de rebanho.
  const resumo = montarPendencias(entradas);
  return JSON.parse(JSON.stringify(resumo)) as ResumoOperacaoDia;
}

export type { Pendencia, ResumoOperacaoDia };
