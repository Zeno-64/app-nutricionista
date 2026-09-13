import type { Circunferencia, DobraCutanea, PontoAvaliacao } from '@nutri/calculos';
import type { Avaliacao } from './tipos';

/**
 * Converte a linha da tabela de avaliações no ponto que o pacote de cálculos
 * usa para montar séries e comparações (RF-50, RF-51).
 *
 * A avaliação substituída por outra versão fica de fora: o histórico continua
 * no banco, mas quem manda no gráfico é a versão vigente (RN-02).
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
  const circunferencias = semNulos<Circunferencia>([
    ['pescoco', avaliacao.circ_pescoco],
    ['braco', avaliacao.circ_braco],
    ['cintura', avaliacao.circ_cintura],
    ['abdomen', avaliacao.circ_abdomen],
    ['quadril', avaliacao.circ_quadril],
    ['coxa', avaliacao.circ_coxa],
    ['panturrilha', avaliacao.circ_panturrilha],
  ]);

  const dobras = semNulos<DobraCutanea>([
    ['peitoral', avaliacao.dobra_peitoral],
    ['axilarMedia', avaliacao.dobra_axilar_media],
    ['triceps', avaliacao.dobra_triceps],
    ['biceps', avaliacao.dobra_biceps],
    ['subescapular', avaliacao.dobra_subescapular],
    ['abdominal', avaliacao.dobra_abdominal],
    ['supraIliaca', avaliacao.dobra_supra_iliaca],
    ['coxa', avaliacao.dobra_coxa],
    ['panturrilhaMedial', avaliacao.dobra_panturrilha_medial],
  ]);

  return {
    id: avaliacao.id,
    data: avaliacao.data_avaliacao,
    peso: avaliacao.peso,
    imc: avaliacao.imc,
    percentualGordura: avaliacao.percentual_gordura,
    massaGorda: avaliacao.massa_gorda,
    massaLivreGordura: avaliacao.massa_livre_gordura,
    gastoEnergeticoTotal: avaliacao.gasto_energetico_total,
    circunferencias,
    dobras,
  };
}

/** Só as versões vigentes e finalizadas entram na evolução. */
export function pontosDaEvolucao(avaliacoes: readonly Avaliacao[]): PontoAvaliacao[] {
  return avaliacoes
    .filter((avaliacao) => avaliacao.substituida_por_id === null)
    .map(paraPontoAvaliacao);
}
