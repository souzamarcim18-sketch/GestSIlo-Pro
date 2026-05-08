'use server';

import { queryMovimentacoes, type MovimentacaoListItem } from './rebanho-movimentacoes';

export async function getHistoricoAnimalAction(animal_id: string): Promise<MovimentacaoListItem[]> {
  return queryMovimentacoes.getHistoricoAnimal(animal_id);
}
