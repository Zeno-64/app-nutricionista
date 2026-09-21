/**
 * Da linha de `avaliacoes` para o ponto que a evolução usa (RF-50, RF-51).
 *
 * O mapa das vinte e poucas colunas estava escrito duas vezes, uma no painel e
 * outra no app, e as duas cópias já tinham começado a divergir: a do painel
 * dizia filtrar avaliação finalizada e não filtrava. Num gráfico clínico isso
 * não é detalhe de organização — é o histórico do paciente saindo diferente
 * conforme a tela por onde ele é olhado.
 *
 * O tipo de entrada é estrutural de propósito, como o da linha do tempo:
 * descreve só as colunas que a conversão lê, e o DTO do painel e o do app o
 * satisfazem sem conversão nenhuma.
 */

import type { Circunferencia, DobraCutanea } from '../tipos';
import type { PontoAvaliacao } from './indicadores';

/** As colunas de `avaliacoes` que a evolução lê. */
export interface LinhaDeAvaliacao {
  id: string;
  data_avaliacao: string;
  /** Preenchida quando uma versão nova substituiu esta (RN-02). */
  substituida_por_id: string | null;

  peso: number | null;
  imc: number | null;
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

/**
 * Medida não tomada é medida ausente, não medida zero: a coluna nula fica de
 * fora do mapa em vez de virar `0`, que o gráfico desenharia como uma queda.
 */
function semNulos<C extends string>(
  entradas: ReadonlyArray<readonly [C, number | null]>,
): Partial<Record<C, number>> {
  const destino: Partial<Record<C, number>> = {};
  for (const [chave, valor] of entradas) {
    if (valor !== null) destino[chave] = valor;
  }
  return destino;
}

export function paraPontoAvaliacao(avaliacao: LinhaDeAvaliacao): PontoAvaliacao {
  return {
    id: avaliacao.id,
    data: avaliacao.data_avaliacao,
    peso: avaliacao.peso,
    imc: avaliacao.imc,
    percentualGordura: avaliacao.percentual_gordura,
    massaGorda: avaliacao.massa_gorda,
    massaLivreGordura: avaliacao.massa_livre_gordura,
    gastoEnergeticoTotal: avaliacao.gasto_energetico_total,
    circunferencias: semNulos<Circunferencia>([
      ['pescoco', avaliacao.circ_pescoco],
      ['braco', avaliacao.circ_braco],
      ['cintura', avaliacao.circ_cintura],
      ['abdomen', avaliacao.circ_abdomen],
      ['quadril', avaliacao.circ_quadril],
      ['coxa', avaliacao.circ_coxa],
      ['panturrilha', avaliacao.circ_panturrilha],
    ]),
    dobras: semNulos<DobraCutanea>([
      ['peitoral', avaliacao.dobra_peitoral],
      ['axilarMedia', avaliacao.dobra_axilar_media],
      ['triceps', avaliacao.dobra_triceps],
      ['biceps', avaliacao.dobra_biceps],
      ['subescapular', avaliacao.dobra_subescapular],
      ['abdominal', avaliacao.dobra_abdominal],
      ['supraIliaca', avaliacao.dobra_supra_iliaca],
      ['coxa', avaliacao.dobra_coxa],
      ['panturrilhaMedial', avaliacao.dobra_panturrilha_medial],
    ]),
  };
}

/**
 * Só as versões vigentes entram na evolução (RN-02).
 *
 * A avaliação substituída continua no banco — prontuário não se apaga —, mas
 * quem manda no gráfico é a versão que está valendo. Sem isto a correção de um
 * peso apareceria como duas medidas no mesmo dia.
 */
export function pontosDaEvolucao(avaliacoes: readonly LinhaDeAvaliacao[]): PontoAvaliacao[] {
  return avaliacoes
    .filter((avaliacao) => avaliacao.substituida_por_id === null)
    .map(paraPontoAvaliacao);
}
