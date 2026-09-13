import { FatorAtividadeNaoAplicavelError, FormulaIndisponivelError, MedidaFaltandoError } from '../erros';
import { formatar } from '../numeros';
import type { GrupoPaciente, MemoriaCalculo } from '../tipos';
import { podeCalcular } from '../tipos';
import { validarDados } from '../validacao';
import type { DadosEnergia, FormulaEnergia, FormulaEnergiaId, PublicoFormula } from './formulas';
import { FORMULAS_ENERGIA, obterFormulaEnergia } from './formulas';

export interface ResultadoGastoEnergetico {
  formula: FormulaEnergiaId;
  /** kcal; `null` quando a fórmula já devolve GET. */
  tmb: number | null;
  /** `null` quando a fórmula já devolve GET. */
  fatorAtividade: number | null;
  /** kcal. */
  get: number;
  memorias: MemoriaCalculo[];
}

/**
 * Calcula o gasto energético pela fórmula escolhida (RF-40 a RF-42).
 *
 * Regra da RF-41, garantida aqui: fórmulas que resultam em TMB exigem fator de
 * atividade para chegar ao GET; fórmulas que já resultam em GET recusam o fator,
 * porque o nível de atividade já entra na própria equação.
 */
export function calcularGastoEnergetico(
  id: FormulaEnergiaId,
  dados: DadosEnergia,
  fatorAtividade?: number,
): ResultadoGastoEnergetico {
  const formula = obterFormulaEnergia(id);

  // A trava da RF-41 vem antes do portão de status: usar fator de atividade
  // numa fórmula EER é erro de uso, e o aviso vale mesmo para fórmulas que
  // ainda não calculam.
  if (formula.resultado === 'get' && fatorAtividade !== undefined) {
    throw new FatorAtividadeNaoAplicavelError(formula.nome);
  }

  if (!podeCalcular(formula.status) || formula.calcular === null) {
    throw new FormulaIndisponivelError(formula.id, formula.nome, formula.status);
  }

  if (formula.resultado === 'tmb' && fatorAtividade === undefined) {
    throw new MedidaFaltandoError(['Fator de atividade']);
  }

  validarDados(dados, formula.exigencias);

  const saida = formula.calcular(dados);
  const memorias: MemoriaCalculo[] = [saida.memoria];

  if (formula.resultado === 'get') {
    return { formula: formula.id, tmb: null, fatorAtividade: null, get: saida.valor, memorias };
  }

  const fator = fatorAtividade!;
  const gastoTotal = saida.valor * fator;

  memorias.push({
    formula: 'GET = TMB × fator de atividade',
    referencia: 'Fator de atividade informado pelo nutricionista',
    entradas: [
      { rotulo: 'TMB', valor: saida.valor, unidade: 'kcal' },
      { rotulo: 'Fator de atividade', valor: fator },
    ],
    passos: [
      {
        rotulo: 'GET',
        expressao: `${formatar(saida.valor, 0)} × ${formatar(fator, 3)}`,
        valor: gastoTotal,
        unidade: 'kcal',
      },
    ],
  });

  return {
    formula: formula.id,
    tmb: saida.valor,
    fatorAtividade: fator,
    get: gastoTotal,
    memorias,
  };
}

// --------------------------------------------------------------------------
// Seleção de fórmula na interface (RF-40 e RF-43)
// --------------------------------------------------------------------------

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Busca por nome, referência ou público, ignorando acento e caixa (RF-40). */
export function buscarFormulas(termo: string): FormulaEnergia[] {
  const alvo = normalizar(termo);
  if (alvo === '') return [...FORMULAS_ENERGIA];
  return FORMULAS_ENERGIA.filter((formula) =>
    normalizar(`${formula.nome} ${formula.referencia} ${formula.publico}`).includes(alvo),
  );
}

/** Agrupa por público, na ordem em que a lista aparece na interface (RF-40). */
export function agruparPorPublico(
  formulas: readonly FormulaEnergia[] = FORMULAS_ENERGIA,
): Array<{ publico: PublicoFormula; formulas: FormulaEnergia[] }> {
  const ordem: PublicoFormula[] = ['adulto', 'atleta', 'infantil', 'gestante', 'lactante', 'manual'];
  return ordem
    .map((publico) => ({
      publico,
      formulas: formulas.filter((formula) => formula.publico === publico),
    }))
    .filter((grupo) => grupo.formulas.length > 0);
}

/** Fórmulas sugeridas para o grupo do paciente, sem impedir outra escolha (RF-43). */
export function formulasSugeridas(grupo: GrupoPaciente): FormulaEnergia[] {
  return FORMULAS_ENERGIA.filter((formula) => formula.gruposSugeridos.includes(grupo));
}

/** Fórmulas que já podem calcular hoje (RN-06). */
export function formulasDisponiveis(): FormulaEnergia[] {
  return FORMULAS_ENERGIA.filter((formula) => podeCalcular(formula.status));
}
