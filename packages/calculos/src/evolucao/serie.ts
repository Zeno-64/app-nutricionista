import type { Indicador, IndicadorId, PontoAvaliacao } from './indicadores';
import { indicadoresMedidos, obterIndicador, valorDoIndicador } from './indicadores';

/**
 * Séries de evolução e comparação entre avaliações (RF-50, RF-51).
 *
 * A diferença sai com sinal e sem julgamento: quem decide se subir é bom é o
 * nutricionista, olhando o objetivo do paciente.
 */

export interface PontoSerie {
  avaliacaoId: string;
  data: string;
  valor: number;
}

export interface SerieEvolucao {
  indicador: Indicador;
  pontos: PontoSerie[];
  minimo: number;
  maximo: number;
  primeiro: number;
  ultimo: number;
  /** último − primeiro. */
  variacaoAbsoluta: number;
  /** Em percentual do primeiro. `null` quando o primeiro é zero. */
  variacaoPercentual: number | null;
}

function porData(a: { data: string }, b: { data: string }): number {
  return a.data < b.data ? -1 : a.data > b.data ? 1 : 0;
}

/**
 * Monta a série de um indicador, da avaliação mais antiga para a mais recente.
 *
 * Devolve `null` quando não há ponto medido. Uma série com um ponto só é
 * válida — a tela mostra o valor sem linha.
 */
export function montarSerie(
  pontos: readonly PontoAvaliacao[],
  id: IndicadorId,
): SerieEvolucao | null {
  const indicador = obterIndicador(id);

  const medidos: PontoSerie[] = [...pontos]
    .sort(porData)
    .map((ponto) => ({
      avaliacaoId: ponto.id,
      data: ponto.data,
      valor: valorDoIndicador(ponto, id),
    }))
    .filter((ponto): ponto is PontoSerie => ponto.valor !== null);

  if (medidos.length === 0) return null;

  const valores = medidos.map((ponto) => ponto.valor);
  const primeiro = valores[0]!;
  const ultimo = valores[valores.length - 1]!;
  const variacaoAbsoluta = ultimo - primeiro;

  return {
    indicador,
    pontos: medidos,
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
    primeiro,
    ultimo,
    variacaoAbsoluta,
    variacaoPercentual: primeiro === 0 ? null : (variacaoAbsoluta / primeiro) * 100,
  };
}

export interface LinhaComparacao {
  indicador: Indicador;
  /** Um valor por avaliação, na ordem cronológica. `null` onde não foi medido. */
  valores: (number | null)[];
  /** Entre a primeira e a última medida existentes. `null` se houver menos de duas. */
  diferencaAbsoluta: number | null;
  diferencaPercentual: number | null;
}

export interface Comparacao {
  /** Cabeçalho da tabela: as avaliações em ordem cronológica. */
  avaliacoes: Array<{ id: string; data: string }>;
  linhas: LinhaComparacao[];
}

/**
 * RF-51: tabela comparativa entre duas ou mais avaliações, com diferença
 * absoluta e percentual.
 *
 * A diferença ignora os buracos: compara a primeira com a última medida que
 * existem, não a primeira e a última coluna. Assim uma avaliação sem dobras no
 * meio não zera a comparação das dobras.
 */
export function compararAvaliacoes(pontos: readonly PontoAvaliacao[]): Comparacao {
  const ordenados = [...pontos].sort(porData);

  const linhas = indicadoresMedidos(ordenados).map((indicador) => {
    const valores = ordenados.map((ponto) => valorDoIndicador(ponto, indicador.id));
    const existentes = valores.filter((valor): valor is number => valor !== null);

    if (existentes.length < 2) {
      return {
        indicador,
        valores,
        diferencaAbsoluta: null,
        diferencaPercentual: null,
      };
    }

    const primeiro = existentes[0]!;
    const ultimo = existentes[existentes.length - 1]!;
    const diferencaAbsoluta = ultimo - primeiro;

    return {
      indicador,
      valores,
      diferencaAbsoluta,
      diferencaPercentual: primeiro === 0 ? null : (diferencaAbsoluta / primeiro) * 100,
    };
  });

  return {
    avaliacoes: ordenados.map((ponto) => ({ id: ponto.id, data: ponto.data })),
    linhas,
  };
}
