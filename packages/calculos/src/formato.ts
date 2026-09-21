/**
 * Formatação de número e data no padrão brasileiro (RNF-09).
 *
 * Mora aqui, e não na tela, porque o painel e o app mostram os mesmos valores:
 * o peso que o nutricionista lê na linha do tempo é o que o paciente vê no
 * app, e uma casa decimal a mais de um lado viraria dúvida sobre qual dos dois
 * está certo. Cada cópia dessas funções numa tela era uma chance de divergir.
 */

import { arredondar } from './numeros';

/** Número no padrão brasileiro, com as casas decimais fixas. */
export function formatarNumero(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** Data ISO (`2026-03-01`) no formato que se lê no Brasil. */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Valor arredondado com a unidade junto (`72,4 kg`).
 *
 * Unidade vazia sai só o número — é o caso do IMC, que não tem unidade.
 */
export function comUnidade(valor: number, casas: number, unidade: string): string {
  const numero = formatarNumero(arredondar(valor, casas), casas);
  return unidade === '' ? numero : `${numero} ${unidade}`;
}

/**
 * Diferença sempre com sinal, inclusive quando é positiva.
 *
 * O sentido da mudança é leitura de quem olha: perder 2 kg é bom para um
 * paciente e ruim para outro, então o número mostra a direção e cala o resto.
 * O sinal de menos é o U+2212, não o hífen, para não quebrar linha no meio.
 */
export function comSinal(valor: number, casas: number, unidade: string): string {
  const arredondado = arredondar(valor, casas);
  const sinal = arredondado > 0 ? '+' : arredondado < 0 ? '−' : '';
  return `${sinal}${comUnidade(Math.abs(arredondado), casas, unidade)}`;
}
