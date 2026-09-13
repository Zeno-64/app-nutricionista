import type { FormulaEnergiaId, ProtocoloId, Sexo } from '@nutri/calculos';

/**
 * Espelho das tabelas que o painel usa. No projeto com o Supabase ligado, dá
 * para trocar por `npx supabase gen types typescript`; enquanto o projeto de
 * desenvolvimento não existe, o tipo fica escrito à mão a partir das migrations.
 */

export type PerfilTipo = 'nutricionista' | 'paciente';
export type StatusRegistro = 'rascunho' | 'finalizada';
export type TipoFormulario = 'anamnese' | 'pre_consulta';
export type TipoPergunta =
  | 'texto_longo'
  | 'texto_curto'
  | 'numero'
  | 'sim_nao'
  | 'multipla_escolha'
  | 'escala_0_10'
  | 'data';
export type GrupoPaciente =
  | 'adulto'
  | 'crianca_adolescente'
  | 'gestante'
  | 'lactante'
  | 'atleta';

export interface Perfil {
  id: string;
  tipo: PerfilTipo;
  nome: string;
  telefone: string | null;
}

export interface Membro {
  id: string;
  tenant_id: string;
  usuario_id: string;
  papel: 'proprietario' | 'nutricionista' | 'secretaria';
  crn: string | null;
  ativo: boolean;
}

export interface Paciente {
  id: string;
  tenant_id: string;
  usuario_id: string | null;
  nome: string;
  data_nascimento: string | null;
  sexo: Sexo | null;
  cpf: string | null;
  email: string | null;
  profissao: string | null;
  telefone: string | null;
  objetivo: string | null;
  observacoes: string | null;
  grupos: GrupoPaciente[];
  arquivado_em: string | null;
  convidado_em: string | null;
  origem: 'local' | 'nutrio';
  criado_em: string;
}

export interface Avaliacao {
  id: string;
  tenant_id: string;
  paciente_id: string;
  data_avaliacao: string;
  status: StatusRegistro;
  versao: number;
  substituida_por_id: string | null;
  liberada_em: string | null;
  peso: number | null;
  altura: number | null;

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

  imc: number | null;
  imc_classificacao: string | null;
  rcq: number | null;
  rce: number | null;
  protocolo_composicao: ProtocoloId | null;
  percentual_gordura: number | null;
  massa_gorda: number | null;
  massa_livre_gordura: number | null;
  formula_energia: FormulaEnergiaId | null;
  formula_resulta_em: 'tmb' | 'get' | null;
  fator_atividade: number | null;
  tmb: number | null;
  gasto_energetico_total: number | null;
  meta_calorica: number | null;
  origem: 'local' | 'nutrio';
}

export interface Anamnese {
  id: string;
  tenant_id: string;
  paciente_id: string;
  tipo: TipoFormulario;
  status: StatusRegistro;
  versao: number;
  data_registro: string;
  enviada_em: string | null;
  respondida_em: string | null;
  liberada_em: string | null;
  substituida_por_id: string | null;
  finalizada_em: string | null;
  origem: 'local' | 'nutrio';
}

export interface Anexo {
  id: string;
  paciente_id: string;
  categoria: string;
  nome_arquivo: string;
  data_referencia: string | null;
  criado_em: string;
}

/** Uma entrada da linha do tempo do paciente (RF-13). */
export interface ItemLinhaDoTempo {
  id: string;
  tipo: 'avaliacao' | 'anamnese' | 'pre_consulta' | 'anexo';
  data: string;
  titulo: string;
  detalhe: string | null;
  status: StatusRegistro | null;
  origem: 'local' | 'nutrio';
}
