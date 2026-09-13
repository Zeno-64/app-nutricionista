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
  peso: number | null;
  imc: number | null;
  imc_classificacao: string | null;
  percentual_gordura: number | null;
  massa_livre_gordura: number | null;
  gasto_energetico_total: number | null;
}
