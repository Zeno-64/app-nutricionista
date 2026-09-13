import type { Circunferencia, DobraCutanea, PontoAvaliacao } from '@nutri/calculos';
import type { Avaliacao } from './tipos';

/**
 * Converte a linha de avaliação no ponto que `@nutri/calculos` usa para montar
 * a série de evolução. O mesmo cálculo roda no painel web.
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

export function paraPontoAvaliacao(avaliacao: Avaliacao): PontoAvaliacao {
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

/** Só as versões vigentes entram na evolução (RN-02). */
export function pontosDaEvolucao(avaliacoes: readonly Avaliacao[]): PontoAvaliacao[] {
  return avaliacoes
    .filter((avaliacao) => avaliacao.substituida_por_id === null)
    .map(paraPontoAvaliacao);
}
