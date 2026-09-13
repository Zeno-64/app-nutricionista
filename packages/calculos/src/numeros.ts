/** Utilitários numéricos. Nenhum cálculo do pacote arredonda internamente. */

/**
 * Arredonda para exibição, corrigindo o erro de representação binária que faz
 * `Math.round(1.005 * 100) / 100` devolver 1 em vez de 1,01.
 */
export function arredondar(valor: number, casas = 2): number {
  if (!Number.isFinite(valor)) return valor;
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON * Math.abs(valor)) * fator) / fator;
}

/** Soma uma lista de medidas. */
export function somar(valores: readonly number[]): number {
  return valores.reduce((total, valor) => total + valor, 0);
}

/** Formata um número no padrão brasileiro, para a memória de cálculo (RNF-09). */
export function formatar(valor: number, casas = 2): string {
  return arredondar(valor, casas).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });
}
