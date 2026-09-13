/** Erros de cálculo. Todos herdam de `ErroCalculo` para facilitar o tratamento. */
export class ErroCalculo extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/**
 * A fórmula ou protocolo existe no catálogo mas ainda não foi conferido na
 * fonte primária, então não calcula (RN-06).
 */
export class FormulaIndisponivelError extends ErroCalculo {
  constructor(
    readonly id: string,
    readonly nome: string,
    readonly status: string,
  ) {
    super(
      `"${nome}" ainda não está disponível para cálculo (status: ${status}). ` +
        'Uma fórmula só é liberada depois de conferida na fonte primária e ' +
        'coberta por teste com valor de referência — ver docs/verificacao-formulas.md.',
    );
  }
}

/** Falta uma medida exigida pela fórmula escolhida. */
export class MedidaFaltandoError extends ErroCalculo {
  constructor(readonly medidas: string[]) {
    super(
      medidas.length === 1
        ? `Falta a medida obrigatória: ${medidas[0]}.`
        : `Faltam medidas obrigatórias: ${medidas.join(', ')}.`,
    );
  }
}

/** Medida presente, mas fora da faixa aceitável (zero, negativa ou não finita). */
export class MedidaInvalidaError extends ErroCalculo {
  constructor(
    readonly medida: string,
    readonly valor: unknown,
  ) {
    super(`Medida inválida em "${medida}": ${String(valor)}.`);
  }
}

/**
 * Fórmulas EER já resultam em GET: aplicar fator de atividade sobre elas
 * contaria a atividade duas vezes (RF-41).
 */
export class FatorAtividadeNaoAplicavelError extends ErroCalculo {
  constructor(readonly nome: string) {
    super(
      `"${nome}" já resulta em GET: não aplique fator de atividade — ` +
        'o nível de atividade já entra na própria fórmula (RF-41).',
    );
  }
}
