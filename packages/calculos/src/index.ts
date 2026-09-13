/**
 * @nutri/calculos — fórmulas e protocolos de avaliação nutricional.
 *
 * Regra que atravessa o pacote (RN-06): uma fórmula só calcula depois de
 * conferida na fonte primária e coberta por teste com valor de referência.
 * As demais ficam no catálogo, com status, e recusam o cálculo com
 * `FormulaIndisponivelError`. O andamento está em
 * `docs/verificacao-formulas.md`.
 */

export * from './tipos.js';
export * from './erros.js';
export * from './numeros.js';
export * from './rotulos.js';
export * from './validacao.js';

export * from './antropometria/imc.js';
export * from './antropometria/indices.js';

export * from './composicao/siri.js';
export * from './composicao/massas.js';
export * from './composicao/protocolos.js';
export * from './composicao/calcular.js';

export * from './energia/fatores-atividade.js';
export * from './energia/formulas.js';
export * from './energia/calcular.js';
export * from './energia/meta.js';
