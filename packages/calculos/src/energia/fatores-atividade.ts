import type { StatusVerificacao } from '../tipos';

/**
 * Fator de atividade usado para transformar TMB em GET (RF-41).
 *
 * O fator é um dado que o nutricionista informa, não um coeficiente de fórmula:
 * `calcularGastoEnergetico` aceita qualquer valor numérico. A lista abaixo é
 * só a sugestão que aparece na interface.
 */
export interface FatorAtividadeSugerido {
  chave: string;
  rotulo: string;
  descricao: string;
  fator: number;
}

export const FATORES_ATIVIDADE_SUGERIDOS: readonly FatorAtividadeSugerido[] = [
  { chave: 'sedentario', rotulo: 'Sedentário', descricao: 'Pouco ou nenhum exercício', fator: 1.2 },
  { chave: 'leve', rotulo: 'Levemente ativo', descricao: 'Exercício leve, 1 a 3 dias por semana', fator: 1.375 },
  { chave: 'moderado', rotulo: 'Moderadamente ativo', descricao: 'Exercício moderado, 3 a 5 dias por semana', fator: 1.55 },
  { chave: 'intenso', rotulo: 'Muito ativo', descricao: 'Exercício intenso, 6 a 7 dias por semana', fator: 1.725 },
  { chave: 'muito_intenso', rotulo: 'Extremamente ativo', descricao: 'Exercício muito intenso ou trabalho físico', fator: 1.9 },
];

/**
 * A lista é uma convenção difundida, ainda sem fonte primária identificada —
 * ver `docs/verificacao-formulas.md`. Como o fator é entrada do nutricionista,
 * isso não bloqueia o cálculo, mas a interface deve deixar claro que são
 * sugestões editáveis.
 */
export const STATUS_FATORES_SUGERIDOS: StatusVerificacao = 'pendente';

/**
 * Níveis de atividade das equações EER, que entram na própria fórmula como
 * coeficiente PA — não confundir com o fator de atividade acima.
 */
export type NivelAtividade = 'sedentario' | 'pouco_ativo' | 'ativo' | 'muito_ativo';

export const ROTULOS_NIVEL_ATIVIDADE: Readonly<Record<NivelAtividade, string>> = {
  sedentario: 'Sedentário',
  pouco_ativo: 'Pouco ativo',
  ativo: 'Ativo',
  muito_ativo: 'Muito ativo',
};
