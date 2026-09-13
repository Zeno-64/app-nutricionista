import { ROTULOS_CIRCUNFERENCIA, ROTULOS_DOBRA } from '../rotulos';
import type { Circunferencia, DobraCutanea } from '../tipos';

/**
 * Indicadores acompanhados ao longo das avaliações (RF-50, RF-51).
 *
 * O módulo é descritivo de propósito: devolve o valor e a diferença com sinal,
 * e não diz se a mudança foi boa ou ruim. Peso que cai é melhora para quem quer
 * emagrecer e piora para quem quer ganhar massa — esse julgamento é do
 * nutricionista, não do programa.
 */

export type IndicadorId =
  | 'peso'
  | 'imc'
  | 'percentualGordura'
  | 'massaGorda'
  | 'massaLivreGordura'
  | 'gastoEnergeticoTotal'
  | `circunferencia.${Circunferencia}`
  | `dobra.${DobraCutanea}`;

export interface Indicador {
  id: IndicadorId;
  rotulo: string;
  unidade: string;
  /** Casas decimais na exibição. */
  casas: number;
  grupo: 'corpo' | 'circunferencia' | 'dobra';
}

/** Um ponto da linha do tempo: as medidas de uma avaliação. */
export interface PontoAvaliacao {
  id: string;
  /** Data no formato aaaa-mm-dd. */
  data: string;
  peso: number | null;
  imc: number | null;
  percentualGordura: number | null;
  massaGorda: number | null;
  massaLivreGordura: number | null;
  gastoEnergeticoTotal: number | null;
  circunferencias: Partial<Record<Circunferencia, number>>;
  dobras: Partial<Record<DobraCutanea, number>>;
}

const INDICADORES_DE_CORPO: readonly Indicador[] = [
  { id: 'peso', rotulo: 'Peso', unidade: 'kg', casas: 1, grupo: 'corpo' },
  { id: 'imc', rotulo: 'IMC', unidade: 'kg/m²', casas: 1, grupo: 'corpo' },
  { id: 'percentualGordura', rotulo: 'Gordura corporal', unidade: '%', casas: 1, grupo: 'corpo' },
  { id: 'massaGorda', rotulo: 'Massa gorda', unidade: 'kg', casas: 1, grupo: 'corpo' },
  {
    id: 'massaLivreGordura',
    rotulo: 'Massa livre de gordura',
    unidade: 'kg',
    casas: 1,
    grupo: 'corpo',
  },
  {
    id: 'gastoEnergeticoTotal',
    rotulo: 'Gasto energético',
    unidade: 'kcal',
    casas: 0,
    grupo: 'corpo',
  },
];

const INDICADORES_DE_CIRCUNFERENCIA: readonly Indicador[] = (
  Object.keys(ROTULOS_CIRCUNFERENCIA) as Circunferencia[]
).map((chave) => ({
  id: `circunferencia.${chave}` as IndicadorId,
  rotulo: ROTULOS_CIRCUNFERENCIA[chave],
  unidade: 'cm',
  casas: 1,
  grupo: 'circunferencia' as const,
}));

const INDICADORES_DE_DOBRA: readonly Indicador[] = (
  Object.keys(ROTULOS_DOBRA) as DobraCutanea[]
).map((chave) => ({
  id: `dobra.${chave}` as IndicadorId,
  rotulo: ROTULOS_DOBRA[chave],
  unidade: 'mm',
  casas: 1,
  grupo: 'dobra' as const,
}));

export const INDICADORES: readonly Indicador[] = [
  ...INDICADORES_DE_CORPO,
  ...INDICADORES_DE_CIRCUNFERENCIA,
  ...INDICADORES_DE_DOBRA,
];

const POR_ID = new Map(INDICADORES.map((indicador) => [indicador.id, indicador]));

export function obterIndicador(id: IndicadorId): Indicador {
  const indicador = POR_ID.get(id);
  if (indicador === undefined) throw new Error(`Indicador desconhecido: ${id}`);
  return indicador;
}

/** Lê o valor de um indicador num ponto. `null` quando a medida não foi tomada. */
export function valorDoIndicador(ponto: PontoAvaliacao, id: IndicadorId): number | null {
  if (id.startsWith('circunferencia.')) {
    const chave = id.slice('circunferencia.'.length) as Circunferencia;
    return ponto.circunferencias[chave] ?? null;
  }
  if (id.startsWith('dobra.')) {
    const chave = id.slice('dobra.'.length) as DobraCutanea;
    return ponto.dobras[chave] ?? null;
  }
  const valor = ponto[id as keyof PontoAvaliacao];
  return typeof valor === 'number' ? valor : null;
}

/**
 * Indicadores que têm pelo menos dois pontos medidos — os únicos que rendem
 * uma linha de evolução. A lista sai na ordem do catálogo, para o seletor da
 * tela não dançar entre um carregamento e outro.
 */
export function indicadoresComEvolucao(pontos: readonly PontoAvaliacao[]): Indicador[] {
  return INDICADORES.filter(
    (indicador) =>
      pontos.filter((ponto) => valorDoIndicador(ponto, indicador.id) !== null).length >= 2,
  );
}

/** Indicadores com ao menos uma medida, para a tabela comparativa. */
export function indicadoresMedidos(pontos: readonly PontoAvaliacao[]): Indicador[] {
  return INDICADORES.filter((indicador) =>
    pontos.some((ponto) => valorDoIndicador(ponto, indicador.id) !== null),
  );
}
