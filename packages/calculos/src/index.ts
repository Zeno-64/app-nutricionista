/**
 * @nutri/calculos — fórmulas e protocolos de avaliação nutricional.
 *
 * Regra que atravessa o pacote (RN-06): uma fórmula só calcula depois de
 * conferida na fonte primária e coberta por teste com valor de referência.
 * As demais ficam no catálogo, com status, e recusam o cálculo com
 * `FormulaIndisponivelError`. O andamento está em
 * `docs/verificacao-formulas.md`.
 */

export * from './tipos';
export * from './erros';
export * from './numeros';
export * from './rotulos';
export * from './validacao';

export * from './antropometria/imc';
export * from './antropometria/indices';

export * from './composicao/siri';
export * from './composicao/massas';
export * from './composicao/protocolos';
export * from './composicao/calcular';

export * from './energia/fatores-atividade';
export * from './energia/formulas';
export * from './energia/calcular';
export * from './energia/meta';

export * from './evolucao/indicadores';
export * from './evolucao/serie';
export * from './evolucao/grafico';
