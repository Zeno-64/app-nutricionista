/**
 * Tipos compartilhados pelos cálculos de avaliação nutricional.
 *
 * Unidades adotadas em todo o pacote:
 * - peso em quilos (kg)
 * - altura em centímetros (cm)
 * - circunferências em centímetros (cm)
 * - dobras cutâneas em milímetros (mm)
 * - idade em anos completos
 * - energia em quilocalorias (kcal)
 *
 * Nenhum cálculo arredonda resultados intermediários: o arredondamento é
 * decisão de exibição e fica a cargo de quem consome o pacote.
 */

export type Sexo = 'masculino' | 'feminino';

/**
 * Grupos especiais do cadastro do paciente (RF-16). Servem para sugerir
 * fórmulas compatíveis (RF-43), nunca para impedir uma escolha.
 */
export type GrupoPaciente =
  | 'adulto'
  | 'crianca_adolescente'
  | 'gestante'
  | 'lactante'
  | 'atleta';

/** Pontos de dobra cutânea usados pelos protocolos da §4.5 dos requisitos. */
export type DobraCutanea =
  | 'peitoral'
  | 'axilarMedia'
  | 'triceps'
  | 'biceps'
  | 'subescapular'
  | 'abdominal'
  | 'supraIliaca'
  | 'coxa'
  | 'panturrilhaMedial';

/** Circunferências registradas na avaliação (RF-30). */
export type Circunferencia =
  | 'pescoco'
  | 'braco'
  | 'cintura'
  | 'abdomen'
  | 'quadril'
  | 'coxa'
  | 'panturrilha';

/** Dobras cutâneas em milímetros. */
export type Dobras = Partial<Record<DobraCutanea, number>>;

/** Circunferências em centímetros. */
export type Circunferencias = Partial<Record<Circunferencia, number>>;

/** Medidas de uma avaliação, usadas como entrada dos protocolos. */
export interface DadosAvaliacao {
  sexo: Sexo;
  /** Anos completos. */
  idade?: number;
  /** Quilos. */
  peso?: number;
  /** Centímetros. */
  altura?: number;
  dobras?: Dobras;
  circunferencias?: Circunferencias;
  /** Massa livre de gordura em kg, quando vem de bioimpedância (RF-36). */
  massaLivreGordura?: number;
}

/**
 * Situação de verificação de uma fórmula ou protocolo (RN-06).
 *
 * Só `verificada` e `nao_requer_verificacao` podem calcular. As demais ficam no
 * catálogo, aparecem na interface com o aviso correspondente e recusam o
 * cálculo — ver `docs/verificacao-formulas.md`.
 */
export type StatusVerificacao =
  /** Coeficientes conferidos na fonte primária e cobertos por teste de referência. */
  | 'verificada'
  /** Conferida só em fonte secundária: ainda não calcula. */
  | 'parcial'
  /** Ainda não conferida: não calcula. */
  | 'pendente'
  /** Não tem coeficiente a conferir (entrada manual, definição aritmética). */
  | 'nao_requer_verificacao';

/** Status em que o cálculo é liberado. */
export const STATUS_LIBERADOS: readonly StatusVerificacao[] = [
  'verificada',
  'nao_requer_verificacao',
];

export function podeCalcular(status: StatusVerificacao): boolean {
  return STATUS_LIBERADOS.includes(status);
}

/** Uma entrada da memória de cálculo (RF-38). */
export interface EntradaMemoria {
  rotulo: string;
  valor: number | string;
  unidade?: string;
}

/** Um passo intermediário da memória de cálculo (RF-38). */
export interface PassoMemoria {
  rotulo: string;
  /** Expressão com os números já substituídos, para conferência visual. */
  expressao: string;
  valor: number;
  unidade?: string;
}

/**
 * Memória de cálculo exibida ao nutricionista (RF-38): fórmula usada, fonte,
 * medidas que entraram e resultados intermediários.
 */
export interface MemoriaCalculo {
  formula: string;
  referencia: string;
  entradas: EntradaMemoria[];
  passos: PassoMemoria[];
}
