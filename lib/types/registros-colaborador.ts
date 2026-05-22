export type ReferenciaTipo =
  | 'atividade_campo'
  | 'cadastro_silo'
  | 'evento_manejo_pastagem'
  | 'evento_sanitario';

export interface RegistroColaborador {
  id: string;
  colaborador_id: string;
  referencia_tipo: ReferenciaTipo;
  referencia_id: string;
  fazenda_id: string;
  created_at: string;
}

export interface ColaboradorResumidoSelect {
  id: string;
  nome: string;
  funcao: string;
}
