/**
 * Idade em anos completos.
 *
 * Estava só no painel, e o app tinha duas reimplementações — uma na ficha do
 * paciente, outra na tela do próprio cadastro. Três cópias da mesma conta de
 * aniversário, e as do app não tratavam data inválida: `'abc'.split('-')` vira
 * `NaN` e a tela escrevia "NaN anos". Agora é uma função só, testada.
 *
 * A idade alimenta fórmula de gasto energético e protocolo de dobras, então
 * errar aqui não é detalhe de exibição.
 */

import { formatarData } from '../formato';

/**
 * Anos completos entre o nascimento e a data de referência, ou `null` se a
 * data não for uma data ISO válida.
 *
 * `hoje` é parâmetro para o teste não depender do dia em que roda — e porque
 * a idade no cadastro é conferida contra a data da consulta, não contra agora.
 */
export function idadeEmAnos(dataNascimento: string, hoje = new Date()): number | null {
  // `T00:00:00` sem fuso: a data ISO pura é interpretada como UTC, e no Brasil
  // isso joga o aniversário para o dia anterior.
  const nascimento = new Date(`${dataNascimento.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return null;

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade -= 1;
  return idade;
}

/**
 * A data de nascimento com a idade junto (`18/04/1992 · 34 anos`), que é como
 * a ficha e o cadastro a mostram: quem lê quer os dois de uma vez.
 *
 * Sem data, não sai nada. Com data que não dá para interpretar, sai a data
 * como veio — errar a idade em silêncio seria pior do que não mostrá-la.
 */
export function dataComIdade(nascimento: string | null, hoje = new Date()): string | null {
  if (nascimento === null || nascimento.trim() === '') return null;
  const anos = idadeEmAnos(nascimento, hoje);
  return anos === null
    ? formatarData(nascimento)
    : `${formatarData(nascimento)} · ${anos} anos`;
}
