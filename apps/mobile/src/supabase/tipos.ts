import type { AvaliacaoDaLinhaDoTempo } from '@nutri/calculos';

/** Recorte das tabelas que o app usa. Espelha as migrations de `supabase/`. */

export type PerfilTipo = 'nutricionista' | 'paciente';

export interface Perfil {
  id: string;
  tipo: PerfilTipo;
  nome: string;
}

export type GrupoPaciente =
  | 'adulto'
  | 'crianca_adolescente'
  | 'gestante'
  | 'lactante'
  | 'atleta';

export interface Paciente {
  id: string;
  nome: string;
  objetivo: string | null;
  arquivado_em: string | null;
  usuario_id: string | null;
  origem: 'local' | 'nutrio';
}

/** A ficha traz o cadastro inteiro; a lista se contenta com o recorte acima. */
export interface PacienteCompleto extends Paciente {
  data_nascimento: string | null;
  sexo: 'masculino' | 'feminino' | null;
  telefone: string | null;
  email: string | null;
  profissao: string | null;
  observacoes: string | null;
  grupos: GrupoPaciente[];
}

/**
 * A avaliação como a ficha precisa dela: o que a linha do tempo lê, mais a
 * marca de liberação, que é o que o botão de liberar liga e desliga (RN-03).
 */
export interface AvaliacaoDaFicha extends AvaliacaoDaLinhaDoTempo {
  liberada_em: string | null;
}

/** Vínculo do nutricionista com o consultório. É de lá que sai o `tenant_id`. */
export interface Membro {
  id: string;
  tenant_id: string;
  papel: 'proprietario' | 'colaborador';
  ativo: boolean;
}

export interface Anamnese {
  id: string;
  tipo: 'anamnese' | 'pre_consulta';
  status: 'rascunho' | 'finalizada';
  data_registro: string;
  respondida_em: string | null;
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
