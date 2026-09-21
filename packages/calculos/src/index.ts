/**
 * @nutri/calculos — fórmulas, protocolos e o resto do domínio que o painel e o
 * app compartilham: a geometria do gráfico de evolução e a linha do tempo do
 * paciente moram aqui pelo mesmo motivo que as fórmulas — são regras, não
 * interface, e as duas telas precisam concordar.
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
export * from './formato';
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
export * from './evolucao/ponto';
export * from './evolucao/serie';
export * from './evolucao/grafico';

export * from './paciente/idade';
export * from './paciente/linhaDoTempo';
export * from './formulario/anamnese';
export * from './consentimento/termo';
