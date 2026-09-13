/** Recorte das tabelas que o app usa. Espelha as migrations de `supabase/`. */

export type PerfilTipo = 'nutricionista' | 'paciente';

export interface Perfil {
  id: string;
  tipo: PerfilTipo;
  nome: string;
}

export interface Paciente {
  id: string;
  nome: string;
  objetivo: string | null;
  arquivado_em: string | null;
  usuario_id: string | null;
  origem: 'local' | 'nutrio';
}

export interface Avaliacao {
  id: string;
  data_avaliacao: string;
  versao: number;
  substituida_por_id: string | null;
  peso: number | null;
  imc: number | null;
  imc_classificacao: string | null;
  percentual_gordura: number | null;
  massa_gorda: number | null;
  massa_livre_gordura: number | null;
  gasto_energetico_total: number | null;

  circ_pescoco: number | null;
  circ_braco: number | null;
  circ_cintura: number | null;
  circ_abdomen: number | null;
  circ_quadril: number | null;
  circ_coxa: number | null;
  circ_panturrilha: number | null;

  dobra_peitoral: number | null;
  dobra_axilar_media: number | null;
  dobra_triceps: number | null;
  dobra_biceps: number | null;
  dobra_subescapular: number | null;
  dobra_abdominal: number | null;
  dobra_supra_iliaca: number | null;
  dobra_coxa: number | null;
  dobra_panturrilha_medial: number | null;
}
