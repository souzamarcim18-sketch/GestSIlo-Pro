export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abastecimentos: {
        Row: {
          combustivel: string | null
          created_at: string | null
          created_by: string | null
          data: string
          fazenda_id: string
          fornecedor: string | null
          hodometro: number | null
          horimetro: number | null
          id: string
          litros: number | null
          maquina_id: string | null
          preco_litro: number | null
          valor: number | null
        }
        Insert: {
          combustivel?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: string
          fazenda_id: string
          fornecedor?: string | null
          hodometro?: number | null
          horimetro?: number | null
          id?: string
          litros?: number | null
          maquina_id?: string | null
          preco_litro?: number | null
          valor?: number | null
        }
        Update: {
          combustivel?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: string
          fazenda_id?: string
          fornecedor?: string | null
          hodometro?: number | null
          horimetro?: number | null
          id?: string
          litros?: number | null
          maquina_id?: string | null
          preco_litro?: number | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "abastecimentos_fazenda_id_fk"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
        ]
      }
      animais: {
        Row: {
          brinco: string
          categoria: string
          created_at: string
          data_nascimento: string
          data_parto_previsto: string | null
          data_proxima_secagem: string | null
          data_ultimo_parto: string | null
          deleted_at: string | null
          escore_condicao_corporal: number | null
          fazenda_id: string
          flag_repetidora: boolean | null
          id: string
          is_reprodutor: boolean
          lote_id: string | null
          mae_id: string | null
          numero_animal: string
          observacoes: string | null
          pai_id: string | null
          peso_atual: number | null
          raca: string | null
          reprodutor_vinculado_id: string | null
          sexo: string
          status: Database["public"]["Enums"]["status_animal"]
          status_reprodutivo: string | null
          tipo_rebanho: Database["public"]["Enums"]["categoria_animal"]
          updated_at: string
        }
        Insert: {
          brinco: string
          categoria?: string
          created_at?: string
          data_nascimento: string
          data_parto_previsto?: string | null
          data_proxima_secagem?: string | null
          data_ultimo_parto?: string | null
          deleted_at?: string | null
          escore_condicao_corporal?: number | null
          fazenda_id: string
          flag_repetidora?: boolean | null
          id?: string
          is_reprodutor?: boolean
          lote_id?: string | null
          mae_id?: string | null
          numero_animal: string
          observacoes?: string | null
          pai_id?: string | null
          peso_atual?: number | null
          raca?: string | null
          reprodutor_vinculado_id?: string | null
          sexo: string
          status?: Database["public"]["Enums"]["status_animal"]
          status_reprodutivo?: string | null
          tipo_rebanho?: Database["public"]["Enums"]["categoria_animal"]
          updated_at?: string
        }
        Update: {
          brinco?: string
          categoria?: string
          created_at?: string
          data_nascimento?: string
          data_parto_previsto?: string | null
          data_proxima_secagem?: string | null
          data_ultimo_parto?: string | null
          deleted_at?: string | null
          escore_condicao_corporal?: number | null
          fazenda_id?: string
          flag_repetidora?: boolean | null
          id?: string
          is_reprodutor?: boolean
          lote_id?: string | null
          mae_id?: string | null
          numero_animal?: string
          observacoes?: string | null
          pai_id?: string | null
          peso_atual?: number | null
          raca?: string | null
          reprodutor_vinculado_id?: string | null
          sexo?: string
          status?: Database["public"]["Enums"]["status_animal"]
          status_reprodutivo?: string | null
          tipo_rebanho?: Database["public"]["Enums"]["categoria_animal"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "animais_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animais_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animais_pai_id_fkey"
            columns: ["pai_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animais_reprodutor_vinculado_id_fkey"
            columns: ["reprodutor_vinculado_id"]
            isOneToOne: false
            referencedRelation: "reprodutores"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_campo: {
        Row: {
          al_mmolc_dm3: number | null
          b_mg_dm3: number | null
          ca_mmolc_dm3: number | null
          categoria_pulverizacao: string | null
          ciclo_id: string
          created_at: string | null
          created_by: string | null
          ctc_mmolc_dm3: number | null
          cu_mg_dm3: number | null
          custo_amostra_r: number | null
          custo_manual: number | null
          custo_por_hora_r: number | null
          custo_total: number
          data: string
          dose_ton_ha: number | null
          dose_unidade: string | null
          dose_valor: number | null
          espacamento_entre_linhas_cm: number | null
          fazenda_id: string
          fe_mg_dm3: number | null
          h_al_mmolc_dm3: number | null
          horas_colheita: number | null
          horas_compactacao: number | null
          horas_irrigacao: number | null
          horas_maquina: number | null
          horas_transporte: number | null
          id: string
          insumo_id: string | null
          k_mmolc_dm3: number | null
          lamina_mm: number | null
          maquina_colheita_id: string | null
          maquina_compactacao_id: string | null
          maquina_id: string | null
          maquina_transporte_id: string | null
          metodo_entrada: string | null
          mg_mmolc_dm3: number | null
          mn_mg_dm3: number | null
          mo_g_dm3: number | null
          observacoes: string | null
          p_mg_dm3: number | null
          permite_rebrota: boolean | null
          ph_cacl2: number | null
          populacao_plantas_ha: number | null
          produtividade_ton_ha: number | null
          s_mg_dm3: number | null
          sacos_ha: number | null
          sb_mmolc_dm3: number | null
          semente_id: string | null
          talhao_id: string
          tipo_operacao: string
          tipo_operacao_solo: string | null
          updated_at: string | null
          url_pdf_analise: string | null
          v_percent: number | null
          valor_terceirizacao_r: number | null
          volume_calda_l_ha: number | null
          zn_mg_dm3: number | null
        }
        Insert: {
          al_mmolc_dm3?: number | null
          b_mg_dm3?: number | null
          ca_mmolc_dm3?: number | null
          categoria_pulverizacao?: string | null
          ciclo_id: string
          created_at?: string | null
          created_by?: string | null
          ctc_mmolc_dm3?: number | null
          cu_mg_dm3?: number | null
          custo_amostra_r?: number | null
          custo_manual?: number | null
          custo_por_hora_r?: number | null
          custo_total?: number
          data: string
          dose_ton_ha?: number | null
          dose_unidade?: string | null
          dose_valor?: number | null
          espacamento_entre_linhas_cm?: number | null
          fazenda_id: string
          fe_mg_dm3?: number | null
          h_al_mmolc_dm3?: number | null
          horas_colheita?: number | null
          horas_compactacao?: number | null
          horas_irrigacao?: number | null
          horas_maquina?: number | null
          horas_transporte?: number | null
          id?: string
          insumo_id?: string | null
          k_mmolc_dm3?: number | null
          lamina_mm?: number | null
          maquina_colheita_id?: string | null
          maquina_compactacao_id?: string | null
          maquina_id?: string | null
          maquina_transporte_id?: string | null
          metodo_entrada?: string | null
          mg_mmolc_dm3?: number | null
          mn_mg_dm3?: number | null
          mo_g_dm3?: number | null
          observacoes?: string | null
          p_mg_dm3?: number | null
          permite_rebrota?: boolean | null
          ph_cacl2?: number | null
          populacao_plantas_ha?: number | null
          produtividade_ton_ha?: number | null
          s_mg_dm3?: number | null
          sacos_ha?: number | null
          sb_mmolc_dm3?: number | null
          semente_id?: string | null
          talhao_id: string
          tipo_operacao: string
          tipo_operacao_solo?: string | null
          updated_at?: string | null
          url_pdf_analise?: string | null
          v_percent?: number | null
          valor_terceirizacao_r?: number | null
          volume_calda_l_ha?: number | null
          zn_mg_dm3?: number | null
        }
        Update: {
          al_mmolc_dm3?: number | null
          b_mg_dm3?: number | null
          ca_mmolc_dm3?: number | null
          categoria_pulverizacao?: string | null
          ciclo_id?: string
          created_at?: string | null
          created_by?: string | null
          ctc_mmolc_dm3?: number | null
          cu_mg_dm3?: number | null
          custo_amostra_r?: number | null
          custo_manual?: number | null
          custo_por_hora_r?: number | null
          custo_total?: number
          data?: string
          dose_ton_ha?: number | null
          dose_unidade?: string | null
          dose_valor?: number | null
          espacamento_entre_linhas_cm?: number | null
          fazenda_id?: string
          fe_mg_dm3?: number | null
          h_al_mmolc_dm3?: number | null
          horas_colheita?: number | null
          horas_compactacao?: number | null
          horas_irrigacao?: number | null
          horas_maquina?: number | null
          horas_transporte?: number | null
          id?: string
          insumo_id?: string | null
          k_mmolc_dm3?: number | null
          lamina_mm?: number | null
          maquina_colheita_id?: string | null
          maquina_compactacao_id?: string | null
          maquina_id?: string | null
          maquina_transporte_id?: string | null
          metodo_entrada?: string | null
          mg_mmolc_dm3?: number | null
          mn_mg_dm3?: number | null
          mo_g_dm3?: number | null
          observacoes?: string | null
          p_mg_dm3?: number | null
          permite_rebrota?: boolean | null
          ph_cacl2?: number | null
          populacao_plantas_ha?: number | null
          produtividade_ton_ha?: number | null
          s_mg_dm3?: number | null
          sacos_ha?: number | null
          sb_mmolc_dm3?: number | null
          semente_id?: string | null
          talhao_id?: string
          tipo_operacao?: string
          tipo_operacao_solo?: string | null
          updated_at?: string | null
          url_pdf_analise?: string | null
          v_percent?: number | null
          valor_terceirizacao_r?: number | null
          volume_calda_l_ha?: number | null
          zn_mg_dm3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_campo_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_agricolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_campo_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_campo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_campo_maquina_colheita_id_fkey"
            columns: ["maquina_colheita_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_campo_maquina_compactacao_id_fkey"
            columns: ["maquina_compactacao_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_campo_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_campo_maquina_transporte_id_fkey"
            columns: ["maquina_transporte_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_campo_semente_id_fkey"
            columns: ["semente_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_campo_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          fazenda_id: string
          id: string
          motivo: string | null
          payload_anterior: Json | null
          payload_novo: Json | null
          registro_id: string
          tabela: string
          usuario_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          fazenda_id: string
          id?: string
          motivo?: string | null
          payload_anterior?: Json | null
          payload_novo?: Json | null
          registro_id: string
          tabela: string
          usuario_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          fazenda_id?: string
          id?: string
          motivo?: string | null
          payload_anterior?: Json | null
          payload_novo?: Json | null
          registro_id?: string
          tabela?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_bromatologicas: {
        Row: {
          amido: number | null
          avaliador: string | null
          created_at: string | null
          data: string
          fazenda_id: string
          fda: number | null
          fdn: number | null
          id: string
          momento: string
          ms: number | null
          ndt: number | null
          pb: number | null
          ph: number | null
          silo_id: string
          updated_at: string | null
        }
        Insert: {
          amido?: number | null
          avaliador?: string | null
          created_at?: string | null
          data: string
          fazenda_id: string
          fda?: number | null
          fdn?: number | null
          id?: string
          momento: string
          ms?: number | null
          ndt?: number | null
          pb?: number | null
          ph?: number | null
          silo_id: string
          updated_at?: string | null
        }
        Update: {
          amido?: number | null
          avaliador?: string | null
          created_at?: string | null
          data?: string
          fazenda_id?: string
          fda?: number | null
          fdn?: number | null
          id?: string
          momento?: string
          ms?: number | null
          ndt?: number | null
          pb?: number | null
          ph?: number | null
          silo_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_bromatologicas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_bromatologicas_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_psps: {
        Row: {
          avaliador: string | null
          created_at: string | null
          created_by: string | null
          data: string
          fazenda_id: string
          id: string
          kernel_processor: boolean | null
          momento: string
          peneira_19mm: number
          peneira_4_8mm: number
          peneira_8_19mm: number
          peneira_fundo_4mm: number
          silo_id: string
          tamanho_teorico_corte_mm: number | null
          tmp_mm: number | null
          updated_at: string | null
        }
        Insert: {
          avaliador?: string | null
          created_at?: string | null
          created_by?: string | null
          data: string
          fazenda_id: string
          id?: string
          kernel_processor?: boolean | null
          momento: string
          peneira_19mm: number
          peneira_4_8mm: number
          peneira_8_19mm: number
          peneira_fundo_4mm: number
          silo_id: string
          tamanho_teorico_corte_mm?: number | null
          tmp_mm?: number | null
          updated_at?: string | null
        }
        Update: {
          avaliador?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: string
          fazenda_id?: string
          id?: string
          kernel_processor?: boolean | null
          momento?: string
          peneira_19mm?: number
          peneira_4_8mm?: number
          peneira_8_19mm?: number
          peneira_fundo_4mm?: number
          silo_id?: string
          tamanho_teorico_corte_mm?: number | null
          tmp_mm?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_psps_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_psps_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_insumo: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      categorias_rebanho: {
        Row: {
          consumo_ms_kg_cab_dia: number
          created_at: string | null
          fazenda_id: string
          id: string
          nome: string
          quantidade_cabecas: number
        }
        Insert: {
          consumo_ms_kg_cab_dia: number
          created_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          quantidade_cabecas?: number
        }
        Update: {
          consumo_ms_kg_cab_dia?: number
          created_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          quantidade_cabecas?: number
        }
        Relationships: [
          {
            foreignKeyName: "categorias_rebanho_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos_agricolas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          cultura: string
          custo_total_estimado: number | null
          data_colheita_prevista: string
          data_colheita_real: string | null
          data_plantio: string
          fazenda_id: string
          id: string
          permite_rebrota: boolean | null
          produtividade_ton_ha: number | null
          talhao_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          cultura: string
          custo_total_estimado?: number | null
          data_colheita_prevista: string
          data_colheita_real?: string | null
          data_plantio: string
          fazenda_id: string
          id?: string
          permite_rebrota?: boolean | null
          produtividade_ton_ha?: number | null
          talhao_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          cultura?: string
          custo_total_estimado?: number | null
          data_colheita_prevista?: string
          data_colheita_real?: string | null
          data_plantio?: string
          fazenda_id?: string
          id?: string
          permite_rebrota?: boolean | null
          produtividade_ton_ha?: number | null
          talhao_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_agricolas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclos_agricolas_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_dap: {
        Row: {
          atividade_campo_id: string | null
          ciclo_id: string
          created_at: string | null
          cultura: string
          data_esperada: string | null
          data_realizada: string | null
          dias_apos_plantio: number
          dias_apos_plantio_final: number | null
          fazenda_id: string
          id: string
          status: string | null
          talhao_id: string
          tipo_operacao: string
          updated_at: string | null
        }
        Insert: {
          atividade_campo_id?: string | null
          ciclo_id: string
          created_at?: string | null
          cultura: string
          data_esperada?: string | null
          data_realizada?: string | null
          dias_apos_plantio: number
          dias_apos_plantio_final?: number | null
          fazenda_id: string
          id?: string
          status?: string | null
          talhao_id: string
          tipo_operacao: string
          updated_at?: string | null
        }
        Update: {
          atividade_campo_id?: string | null
          ciclo_id?: string
          created_at?: string | null
          cultura?: string
          data_esperada?: string | null
          data_realizada?: string | null
          dias_apos_plantio?: number
          dias_apos_plantio_final?: number | null
          fazenda_id?: string
          id?: string
          status?: string | null
          talhao_id?: string
          tipo_operacao?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_dap_atividade_campo_id_fkey"
            columns: ["atividade_campo_id"]
            isOneToOne: false
            referencedRelation: "atividades_campo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_dap_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_agricolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_dap_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_dap_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_parto_crias: {
        Row: {
          animal_criado_id: string | null
          created_at: string
          evento_id: string
          fazenda_id: string
          id: string
          peso_kg: number | null
          sexo: string
          vivo: boolean
        }
        Insert: {
          animal_criado_id?: string | null
          created_at?: string
          evento_id: string
          fazenda_id: string
          id?: string
          peso_kg?: number | null
          sexo: string
          vivo?: boolean
        }
        Update: {
          animal_criado_id?: string | null
          created_at?: string
          evento_id?: string
          fazenda_id?: string
          id?: string
          peso_kg?: number | null
          sexo?: string
          vivo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "eventos_parto_crias_animal_criado_id_fkey"
            columns: ["animal_criado_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_parto_crias_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_rebanho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_parto_crias_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_rebanho: {
        Row: {
          animal_id: string
          bypass_justificativa: string | null
          bypass_usuario_id: string | null
          causa_aborto: string | null
          comprador: string | null
          created_at: string
          data_evento: string
          deleted_at: string | null
          fazenda_id: string
          gemelar: boolean | null
          id: string
          idade_gestacional_dias: number | null
          lote_id_destino: string | null
          metodo_diagnostico: string | null
          motivo_descarte: string | null
          natimorto: boolean | null
          observacoes: string | null
          peso_kg: number | null
          reprodutor_id: string | null
          resultado_prenhez: string | null
          tipo: Database["public"]["Enums"]["tipo_evento_rebanho"]
          tipo_cobertura: string | null
          tipo_parto: string | null
          updated_at: string
          usuario_id: string
          valor_venda: number | null
        }
        Insert: {
          animal_id: string
          bypass_justificativa?: string | null
          bypass_usuario_id?: string | null
          causa_aborto?: string | null
          comprador?: string | null
          created_at?: string
          data_evento: string
          deleted_at?: string | null
          fazenda_id: string
          gemelar?: boolean | null
          id?: string
          idade_gestacional_dias?: number | null
          lote_id_destino?: string | null
          metodo_diagnostico?: string | null
          motivo_descarte?: string | null
          natimorto?: boolean | null
          observacoes?: string | null
          peso_kg?: number | null
          reprodutor_id?: string | null
          resultado_prenhez?: string | null
          tipo: Database["public"]["Enums"]["tipo_evento_rebanho"]
          tipo_cobertura?: string | null
          tipo_parto?: string | null
          updated_at?: string
          usuario_id: string
          valor_venda?: number | null
        }
        Update: {
          animal_id?: string
          bypass_justificativa?: string | null
          bypass_usuario_id?: string | null
          causa_aborto?: string | null
          comprador?: string | null
          created_at?: string
          data_evento?: string
          deleted_at?: string | null
          fazenda_id?: string
          gemelar?: boolean | null
          id?: string
          idade_gestacional_dias?: number | null
          lote_id_destino?: string | null
          metodo_diagnostico?: string | null
          motivo_descarte?: string | null
          natimorto?: boolean | null
          observacoes?: string | null
          peso_kg?: number | null
          reprodutor_id?: string | null
          resultado_prenhez?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento_rebanho"]
          tipo_cobertura?: string | null
          tipo_parto?: string | null
          updated_at?: string
          usuario_id?: string
          valor_venda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_rebanho_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_rebanho_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_rebanho_lote_id_destino_fkey"
            columns: ["lote_id_destino"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_rebanho_reprodutor_id_fkey"
            columns: ["reprodutor_id"]
            isOneToOne: false
            referencedRelation: "reprodutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_rebanho_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fazendas: {
        Row: {
          area_total: number | null
          created_at: string | null
          id: string
          latitude: number | null
          localizacao: string | null
          longitude: number | null
          nome: string
          owner_id: string
        }
        Insert: {
          area_total?: number | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          localizacao?: string | null
          longitude?: number | null
          nome: string
          owner_id?: string
        }
        Update: {
          area_total?: number | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          localizacao?: string | null
          longitude?: number | null
          nome?: string
          owner_id?: string
        }
        Relationships: []
      }
      financeiro: {
        Row: {
          categoria: string
          created_at: string | null
          data: string
          descricao: string
          fazenda_id: string | null
          forma_pagamento: string | null
          id: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string | null
          data?: string
          descricao: string
          fazenda_id?: string | null
          forma_pagamento?: string | null
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string | null
          data?: string
          descricao?: string
          fazenda_id?: string | null
          forma_pagamento?: string | null
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string
          atualizado_por: string | null
          categoria_id: string | null
          created_at: string | null
          criado_por: string | null
          custo_medio: number | null
          data_cadastro: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fazenda_id: string | null
          fornecedor: string | null
          id: string
          local_armazen: string | null
          nome: string
          observacoes: string | null
          preco_unitario: number | null
          teor_k_percent: number | null
          teor_n_percent: number | null
          teor_p_percent: number | null
          tipo_id: string | null
          unidade: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string
          atualizado_por?: string | null
          categoria_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          custo_medio?: number | null
          data_cadastro?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fazenda_id?: string | null
          fornecedor?: string | null
          id?: string
          local_armazen?: string | null
          nome: string
          observacoes?: string | null
          preco_unitario?: number | null
          teor_k_percent?: number | null
          teor_n_percent?: number | null
          teor_p_percent?: number | null
          tipo_id?: string | null
          unidade: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string
          atualizado_por?: string | null
          categoria_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          custo_medio?: number | null
          data_cadastro?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fazenda_id?: string | null
          fornecedor?: string | null
          id?: string
          local_armazen?: string | null
          nome?: string
          observacoes?: string | null
          preco_unitario?: number | null
          teor_k_percent?: number | null
          teor_n_percent?: number | null
          teor_p_percent?: number | null
          tipo_id?: string | null
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_insumo"
            referencedColumns: ["id"]
          },
        ]
      }
      lactacoes: {
        Row: {
          animal_id: string
          created_at: string
          data_fim_secagem: string | null
          data_inicio_parto: string
          deleted_at: string | null
          fazenda_id: string
          id: string
          observacoes: string | null
          producao_total_litros: number | null
          updated_at: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          data_fim_secagem?: string | null
          data_inicio_parto: string
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          observacoes?: string | null
          producao_total_litros?: number | null
          updated_at?: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          data_fim_secagem?: string | null
          data_inicio_parto?: string
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          observacoes?: string | null
          producao_total_litros?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lactacoes_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lactacoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          created_at: string
          data_criacao: string
          descricao: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_criacao?: string
          descricao?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_criacao?: string
          descricao?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          created_at: string | null
          created_by: string | null
          custo: number | null
          data: string
          data_prevista: string | null
          data_realizada: string | null
          descricao: string | null
          fazenda_id: string | null
          horimetro: number | null
          id: string
          mao_de_obra_tipo: string | null
          mao_de_obra_valor: number | null
          maquina_id: string | null
          pecas: Json | null
          proxima_manutencao: string | null
          proxima_manutencao_horimetro: number | null
          responsavel: string | null
          status: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custo?: number | null
          data: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          fazenda_id?: string | null
          horimetro?: number | null
          id?: string
          mao_de_obra_tipo?: string | null
          mao_de_obra_valor?: number | null
          maquina_id?: string | null
          pecas?: Json | null
          proxima_manutencao?: string | null
          proxima_manutencao_horimetro?: number | null
          responsavel?: string | null
          status?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custo?: number | null
          data?: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          fazenda_id?: string | null
          horimetro?: number | null
          id?: string
          mao_de_obra_tipo?: string | null
          mao_de_obra_valor?: number | null
          maquina_id?: string | null
          pecas?: Json | null
          proxima_manutencao?: string | null
          proxima_manutencao_horimetro?: number | null
          responsavel?: string | null
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_fazenda_id_fk"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinas: {
        Row: {
          ano: number | null
          consumo_medio_lh: number | null
          created_at: string | null
          custo_hora: number | null
          data_aquisicao: string | null
          fazenda_id: string | null
          horimetro_atual: number | null
          id: string
          identificacao: string | null
          largura_trabalho_metros: number | null
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          placa: string | null
          potencia_cv: number | null
          status: string | null
          tipo: string
          tratores_compativeis: string[] | null
          valor_aquisicao: number | null
          valor_residual: number | null
          vida_util_anos: number | null
          vida_util_horas: number | null
        }
        Insert: {
          ano?: number | null
          consumo_medio_lh?: number | null
          created_at?: string | null
          custo_hora?: number | null
          data_aquisicao?: string | null
          fazenda_id?: string | null
          horimetro_atual?: number | null
          id?: string
          identificacao?: string | null
          largura_trabalho_metros?: number | null
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          placa?: string | null
          potencia_cv?: number | null
          status?: string | null
          tipo: string
          tratores_compativeis?: string[] | null
          valor_aquisicao?: number | null
          valor_residual?: number | null
          vida_util_anos?: number | null
          vida_util_horas?: number | null
        }
        Update: {
          ano?: number | null
          consumo_medio_lh?: number | null
          created_at?: string | null
          custo_hora?: number | null
          data_aquisicao?: string | null
          fazenda_id?: string | null
          horimetro_atual?: number | null
          id?: string
          identificacao?: string | null
          largura_trabalho_metros?: number | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          placa?: string | null
          potencia_cv?: number | null
          status?: string | null
          tipo?: string
          tratores_compativeis?: string[] | null
          valor_aquisicao?: number | null
          valor_residual?: number | null
          vida_util_anos?: number | null
          vida_util_horas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maquinas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_insumo: {
        Row: {
          created_at: string | null
          criado_por: string | null
          data: string
          despesa_id: string | null
          destino_id: string | null
          destino_tipo: string | null
          id: string
          insumo_id: string | null
          observacoes: string | null
          origem: string | null
          quantidade: number
          responsavel: string | null
          sinal_ajuste: number | null
          tipo: string
          tipo_saida: string | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          criado_por?: string | null
          data?: string
          despesa_id?: string | null
          destino_id?: string | null
          destino_tipo?: string | null
          id?: string
          insumo_id?: string | null
          observacoes?: string | null
          origem?: string | null
          quantidade: number
          responsavel?: string | null
          sinal_ajuste?: number | null
          tipo: string
          tipo_saida?: string | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          criado_por?: string | null
          data?: string
          despesa_id?: string | null
          destino_id?: string | null
          destino_tipo?: string | null
          id?: string
          insumo_id?: string | null
          observacoes?: string | null
          origem?: string | null
          quantidade?: number
          responsavel?: string | null
          sinal_ajuste?: number | null
          tipo?: string
          tipo_saida?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_insumo_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_silo: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: string
          fazenda_id: string
          id: string
          observacao: string | null
          quantidade: number
          responsavel: string | null
          silo_id: string | null
          subtipo: string | null
          talhao_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data?: string
          fazenda_id: string
          id?: string
          observacao?: string | null
          quantidade: number
          responsavel?: string | null
          silo_id?: string | null
          subtipo?: string | null
          talhao_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: string
          fazenda_id?: string
          id?: string
          observacao?: string | null
          quantidade?: number
          responsavel?: string | null
          silo_id?: string | null
          subtipo?: string | null
          talhao_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_silo_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_silo_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros_reprodutivos_fazenda: {
        Row: {
          coberturas_para_repetidora: number | null
          created_at: string
          dias_gestacao: number | null
          dias_seca: number | null
          fazenda_id: string
          id: string
          janela_repetidora_dias: number | null
          meta_iep_dias: number | null
          meta_psm_dias: number | null
          meta_taxa_prenhez_pct: number | null
          pve_dias: number | null
          updated_at: string
        }
        Insert: {
          coberturas_para_repetidora?: number | null
          created_at?: string
          dias_gestacao?: number | null
          dias_seca?: number | null
          fazenda_id: string
          id?: string
          janela_repetidora_dias?: number | null
          meta_iep_dias?: number | null
          meta_psm_dias?: number | null
          meta_taxa_prenhez_pct?: number | null
          pve_dias?: number | null
          updated_at?: string
        }
        Update: {
          coberturas_para_repetidora?: number | null
          created_at?: string
          dias_gestacao?: number | null
          dias_seca?: number | null
          fazenda_id?: string
          id?: string
          janela_repetidora_dias?: number | null
          meta_iep_dias?: number | null
          meta_psm_dias?: number | null
          meta_taxa_prenhez_pct?: number | null
          pve_dias?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parametros_reprodutivos_fazenda_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: true
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos_confinamento: {
        Row: {
          created_at: string | null
          data_fim: string
          data_inicio: string
          fazenda_id: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          data_fim: string
          data_inicio: string
          fazenda_id: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          fazenda_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodos_confinamento_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesos_animal: {
        Row: {
          animal_id: string
          created_at: string
          data_pesagem: string
          fazenda_id: string
          id: string
          observacoes: string | null
          peso_kg: number
        }
        Insert: {
          animal_id: string
          created_at?: string
          data_pesagem: string
          fazenda_id: string
          id?: string
          observacoes?: string | null
          peso_kg: number
        }
        Update: {
          animal_id?: string
          created_at?: string
          data_pesagem?: string
          fazenda_id?: string
          id?: string
          observacoes?: string | null
          peso_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "pesos_animal_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesos_animal_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      planejamentos_silagem: {
        Row: {
          created_at: string | null
          fazenda_id: string
          id: string
          nome: string
          parametros: Json
          rebanho: Json
          resultados: Json
          sistema: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          parametros: Json
          rebanho: Json
          resultados: Json
          sistema: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          parametros?: Json
          rebanho?: Json
          resultados?: Json
          sistema?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planejamentos_silagem_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_manutencao: {
        Row: {
          ativo: boolean
          created_at: string
          data_base: string | null
          descricao: string
          fazenda_id: string
          horimetro_base: number | null
          id: string
          intervalo_dias: number | null
          intervalo_horas: number | null
          maquina_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_base?: string | null
          descricao: string
          fazenda_id: string
          horimetro_base?: number | null
          id?: string
          intervalo_dias?: number | null
          intervalo_horas?: number | null
          maquina_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_base?: string | null
          descricao?: string
          fazenda_id?: string
          horimetro_base?: number | null
          id?: string
          intervalo_dias?: number | null
          intervalo_horas?: number | null
          maquina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_manutencao_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_manutencao_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          fazenda_id: string | null
          id: string
          nome: string
          perfil: string
        }
        Insert: {
          created_at?: string | null
          email: string
          fazenda_id?: string | null
          id: string
          nome: string
          perfil?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          fazenda_id?: string | null
          id?: string
          nome?: string
          perfil?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      reprodutores: {
        Row: {
          created_at: string
          data_entrada: string | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          nome: string
          numero_registro: string | null
          observacoes: string | null
          raca: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_entrada?: string | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          numero_registro?: string | null
          observacoes?: string | null
          raca?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_entrada?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          numero_registro?: string | null
          observacoes?: string | null
          raca?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reprodutores_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      silos: {
        Row: {
          altura_m: number | null
          comprimento_m: number | null
          created_at: string | null
          cultura_ensilada: string | null
          custo_aquisicao_rs_ton: number | null
          custo_producao: number | null
          data_abertura_prevista: string | null
          data_abertura_real: string | null
          data_fechamento: string | null
          estoque_atual: number | null
          fazenda_id: string | null
          id: string
          insumo_inoculante_id: string | null
          insumo_lona_id: string | null
          largura_m: number | null
          materia_seca_percent: number | null
          nome: string
          observacoes_gerais: string | null
          talhao_id: string | null
          tipo: string
          volume_ensilado_ton_mv: number | null
        }
        Insert: {
          altura_m?: number | null
          comprimento_m?: number | null
          created_at?: string | null
          cultura_ensilada?: string | null
          custo_aquisicao_rs_ton?: number | null
          custo_producao?: number | null
          data_abertura_prevista?: string | null
          data_abertura_real?: string | null
          data_fechamento?: string | null
          estoque_atual?: number | null
          fazenda_id?: string | null
          id?: string
          insumo_inoculante_id?: string | null
          insumo_lona_id?: string | null
          largura_m?: number | null
          materia_seca_percent?: number | null
          nome: string
          observacoes_gerais?: string | null
          talhao_id?: string | null
          tipo: string
          volume_ensilado_ton_mv?: number | null
        }
        Update: {
          altura_m?: number | null
          comprimento_m?: number | null
          created_at?: string | null
          cultura_ensilada?: string | null
          custo_aquisicao_rs_ton?: number | null
          custo_producao?: number | null
          data_abertura_prevista?: string | null
          data_abertura_real?: string | null
          data_fechamento?: string | null
          estoque_atual?: number | null
          fazenda_id?: string | null
          id?: string
          insumo_inoculante_id?: string | null
          insumo_lona_id?: string | null
          largura_m?: number | null
          materia_seca_percent?: number | null
          nome?: string
          observacoes_gerais?: string | null
          talhao_id?: string | null
          tipo?: string
          volume_ensilado_ton_mv?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "silos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silos_insumo_inoculante_id_fkey"
            columns: ["insumo_inoculante_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silos_insumo_lona_id_fkey"
            columns: ["insumo_lona_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silos_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      talhoes: {
        Row: {
          area_ha: number
          created_at: string | null
          custo_producao: number | null
          fazenda_id: string
          id: string
          nome: string
          observacoes: string | null
          status: string
          tipo_solo: string
          updated_at: string | null
        }
        Insert: {
          area_ha: number
          created_at?: string | null
          custo_producao?: number | null
          fazenda_id: string
          id?: string
          nome: string
          observacoes?: string | null
          status?: string
          tipo_solo: string
          updated_at?: string | null
        }
        Update: {
          area_ha?: number
          created_at?: string | null
          custo_producao?: number | null
          fazenda_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          tipo_solo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talhoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_insumo: {
        Row: {
          ativo: boolean | null
          categoria_id: string
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_id: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_insumo_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_insumo"
            referencedColumns: ["id"]
          },
        ]
      }
      uso_maquinas: {
        Row: {
          area_ha: number | null
          created_at: string | null
          created_by: string | null
          data: string
          fazenda_id: string
          horas: number | null
          horimetro_fim: number | null
          horimetro_inicio: number | null
          id: string
          implemento_id: string | null
          km: number | null
          maquina_id: string | null
          origem: string | null
          talhao_id: string | null
          tipo_operacao: string | null
        }
        Insert: {
          area_ha?: number | null
          created_at?: string | null
          created_by?: string | null
          data?: string
          fazenda_id: string
          horas?: number | null
          horimetro_fim?: number | null
          horimetro_inicio?: number | null
          id?: string
          implemento_id?: string | null
          km?: number | null
          maquina_id?: string | null
          origem?: string | null
          talhao_id?: string | null
          tipo_operacao?: string | null
        }
        Update: {
          area_ha?: number | null
          created_at?: string | null
          created_by?: string | null
          data?: string
          fazenda_id?: string
          horas?: number | null
          horimetro_fim?: number | null
          horimetro_inicio?: number | null
          id?: string
          implemento_id?: string | null
          km?: number | null
          maquina_id?: string | null
          origem?: string | null
          talhao_id?: string | null
          tipo_operacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uso_maquinas_fazenda_id_fk"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uso_maquinas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uso_maquinas_implemento_id_fkey"
            columns: ["implemento_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uso_maquinas_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uso_maquinas_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_fazenda_and_link: {
        Args: {
          p_area_total?: number
          p_latitude?: number
          p_localizacao?: string
          p_longitude?: number
          p_nome: string
        }
        Returns: {
          area_total: number | null
          created_at: string | null
          id: string
          latitude: number | null
          localizacao: string | null
          longitude: number | null
          nome: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "fazendas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_insumos_abaixo_minimo: {
        Args: { p_fazenda_id: string }
        Returns: {
          ativo: boolean | null
          atualizado_em: string
          atualizado_por: string | null
          categoria_id: string | null
          created_at: string | null
          criado_por: string | null
          custo_medio: number | null
          data_cadastro: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fazenda_id: string | null
          fornecedor: string | null
          id: string
          local_armazen: string | null
          nome: string
          observacoes: string | null
          preco_unitario: number | null
          teor_k_percent: number | null
          teor_n_percent: number | null
          teor_p_percent: number | null
          tipo_id: string | null
          unidade: string
        }[]
        SetofOptions: {
          from: "*"
          to: "insumos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_meu_perfil: { Args: never; Returns: string }
      get_minha_fazenda_id: { Args: never; Returns: string }
      get_my_fazenda_id: { Args: never; Returns: string }
      get_my_perfil: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_gerente_or_admin: { Args: never; Returns: boolean }
      is_operador: { Args: never; Returns: boolean }
      posso_criar_fazenda: { Args: never; Returns: boolean }
      rpc_lancar_parto: {
        Args: {
          p_animal_id: string
          p_crias?: Json
          p_data_evento: string
          p_gemelar?: boolean
          p_natimorto?: boolean
          p_observacoes?: string
          p_tipo_parto: string
          p_usuario_id: string
        }
        Returns: {
          bezerros_criados: number
          evento_id: string
        }[]
      }
      sou_admin: { Args: never; Returns: boolean }
      sou_gerente_ou_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      categoria_animal: "leiteiro" | "corte"
      status_animal: "Ativo" | "Morto" | "Vendido"
      tipo_evento_rebanho:
        | "nascimento"
        | "pesagem"
        | "morte"
        | "venda"
        | "transferencia_lote"
        | "cobertura"
        | "diagnostico_prenhez"
        | "parto"
        | "secagem"
        | "aborto"
        | "descarte"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_animal: ["leiteiro", "corte"],
      status_animal: ["Ativo", "Morto", "Vendido"],
      tipo_evento_rebanho: [
        "nascimento",
        "pesagem",
        "morte",
        "venda",
        "transferencia_lote",
        "cobertura",
        "diagnostico_prenhez",
        "parto",
        "secagem",
        "aborto",
        "descarte",
      ],
    },
  },
} as const
