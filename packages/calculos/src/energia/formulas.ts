import { formatar } from '../numeros.js';
import type { DadosAvaliacao, GrupoPaciente, MemoriaCalculo, StatusVerificacao } from '../tipos.js';
import type { Exigencias } from '../validacao.js';
import { obrigatorio } from '../validacao.js';
import type { NivelAtividade } from './fatores-atividade.js';

/**
 * Catálogo de fórmulas de gasto energético (§4.6 dos requisitos).
 *
 * Onde `calcular` é `null`, os coeficientes ainda não foram lidos na
 * publicação original. Não preencher de memória: ler a fonte indicada em
 * `docs/verificacao-formulas.md`. O portão de status fica em
 * `calcularGastoEnergetico`.
 */

export type FormulaEnergiaId =
  | 'harris_benedict_1919'
  | 'harris_benedict_1984'
  | 'mifflin_st_jeor_1990'
  | 'fao_who_2004'
  | 'henry_rees_1991'
  | 'katch_mcardle_1996'
  | 'cunningham_1980'
  | 'eer_iom_2005'
  | 'eer_2023'
  | 'tinsley_peso_2018'
  | 'tinsley_mlg_2018'
  | 'ten_haaf_peso_2014'
  | 'ten_haaf_mlg_2014'
  | 'de_lorenzo_1999'
  | 'eer_iom_2005_infantil'
  | 'eer_2023_infantil'
  | 'schofield_1985_infantil'
  | 'fao_who_2004_infantil'
  | 'ms_2005_gestante'
  | 'eer_2023_gestante'
  | 'eer_2023_lactante'
  | 'bolso'
  | 'tmb_manual'
  | 'get_manual';

export type PublicoFormula =
  | 'adulto'
  | 'atleta'
  | 'infantil'
  | 'gestante'
  | 'lactante'
  | 'manual';

export const ROTULOS_PUBLICO: Readonly<Record<PublicoFormula, string>> = {
  adulto: 'Adulto',
  atleta: 'Atleta',
  infantil: 'Infantil',
  gestante: 'Gestante',
  lactante: 'Lactante',
  manual: 'Manual',
};

/**
 * O que a fórmula devolve. `null` marca as entradas que os requisitos ainda
 * listam como "a confirmar".
 */
export type ResultadoEnergia = 'tmb' | 'get' | null;

/** Dados de entrada, além das medidas da avaliação. */
export interface DadosEnergia extends DadosAvaliacao {
  /** Coeficiente PA das equações EER. */
  nivelAtividade?: NivelAtividade;
  /** Semanas. */
  idadeGestacional?: number;
  /** Meses após o parto. */
  mesesPosParto?: number;
  /** kcal por kg de peso, na fórmula de bolso. */
  kcalPorKg?: number;
  /** TMB ou GET digitado pelo nutricionista. */
  valorInformado?: number;
}

export interface SaidaFormula {
  valor: number;
  memoria: MemoriaCalculo;
}

export interface FormulaEnergia {
  id: FormulaEnergiaId;
  nome: string;
  publico: PublicoFormula;
  resultado: ResultadoEnergia;
  status: StatusVerificacao;
  referencia: string;
  observacao?: string;
  /** Medidas da avaliação que a fórmula exige. */
  exigencias: Exigencias;
  /** Entradas próprias da fórmula, fora das medidas. */
  entradasExtras: readonly (keyof DadosEnergia)[];
  /** Grupos do paciente para os quais a fórmula é sugerida (RF-43). */
  gruposSugeridos: readonly GrupoPaciente[];
  calcular: ((dados: DadosEnergia) => SaidaFormula) | null;
}

// --------------------------------------------------------------------------
// Fórmulas manuais — não têm coeficiente a conferir
// --------------------------------------------------------------------------

function calcularBolso(dados: DadosEnergia): SaidaFormula {
  const peso = obrigatorio(dados.peso, 'Peso');
  const kcalPorKg = obrigatorio(dados.kcalPorKg, 'kcal por kg');
  const valor = peso * kcalPorKg;

  return {
    valor,
    memoria: {
      formula: 'GET = peso × kcal/kg',
      referencia: 'Valor de kcal/kg definido pelo nutricionista',
      entradas: [
        { rotulo: 'Peso', valor: peso, unidade: 'kg' },
        { rotulo: 'kcal por kg', valor: kcalPorKg, unidade: 'kcal/kg' },
      ],
      passos: [
        {
          rotulo: 'GET',
          expressao: `${formatar(peso, 1)} × ${formatar(kcalPorKg, 1)}`,
          valor,
          unidade: 'kcal',
        },
      ],
    },
  };
}

function calcularValorInformado(rotulo: 'TMB' | 'GET') {
  return (dados: DadosEnergia): SaidaFormula => {
    const valor = obrigatorio(dados.valorInformado, `${rotulo} informado`);
    return {
      valor,
      memoria: {
        formula: `${rotulo} informado manualmente`,
        referencia: 'Valor digitado pelo nutricionista',
        entradas: [{ rotulo, valor, unidade: 'kcal' }],
        passos: [{ rotulo, expressao: formatar(valor, 0), valor, unidade: 'kcal' }],
      },
    };
  };
}

// --------------------------------------------------------------------------
// Catálogo
// --------------------------------------------------------------------------

const ADULTO: readonly GrupoPaciente[] = ['adulto'];
const ADULTO_E_ATLETA: readonly GrupoPaciente[] = ['adulto', 'atleta'];
const TODOS: readonly GrupoPaciente[] = [
  'adulto',
  'crianca_adolescente',
  'gestante',
  'lactante',
  'atleta',
];

export const FORMULAS_ENERGIA: readonly FormulaEnergia[] = [
  {
    id: 'harris_benedict_1919',
    nome: 'Harris-Benedict (1919)',
    publico: 'adulto',
    resultado: 'tmb',
    status: 'pendente',
    referencia: 'Harris J. A. & Benedict F. G., Carnegie Institution of Washington, 1919',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['sexo'],
    gruposSugeridos: ADULTO,
    calcular: null,
  },
  {
    id: 'harris_benedict_1984',
    nome: 'Harris-Benedict (1984)',
    publico: 'adulto',
    resultado: 'tmb',
    status: 'pendente',
    referencia: 'Roza A. M. & Shizgal H. M., Am J Clin Nutr, 1984',
    observacao: 'Revisão dos coeficientes de 1919.',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['sexo'],
    gruposSugeridos: ADULTO,
    calcular: null,
  },
  {
    id: 'mifflin_st_jeor_1990',
    nome: 'Mifflin-St Jeor (1990)',
    publico: 'adulto',
    resultado: 'tmb',
    status: 'pendente',
    referencia: 'Mifflin M. D. et al., Am J Clin Nutr, 1990',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['sexo'],
    gruposSugeridos: ADULTO,
    calcular: null,
  },
  {
    id: 'fao_who_2004',
    nome: 'FAO/WHO (2004)',
    publico: 'adulto',
    resultado: 'tmb',
    status: 'pendente',
    referencia:
      'FAO/WHO/UNU, Human energy requirements, 2004, Tabela 5.2 — adota as ' +
      'equações de Schofield (1985)',
    observacao: 'Coeficientes por faixa etária.',
    exigencias: { idade: true, peso: true },
    entradasExtras: ['sexo'],
    gruposSugeridos: ADULTO,
    calcular: null,
  },
  {
    id: 'henry_rees_1991',
    nome: 'Henry & Rees (1991)',
    publico: 'adulto',
    resultado: 'tmb',
    status: 'pendente',
    referencia: 'Henry C. J. K. & Rees D. G., Eur J Clin Nutr, 1991',
    observacao: 'Coeficientes por faixa etária.',
    exigencias: { idade: true, peso: true },
    entradasExtras: ['sexo'],
    gruposSugeridos: ADULTO,
    calcular: null,
  },
  {
    id: 'katch_mcardle_1996',
    nome: 'Katch-McArdle (1996)',
    publico: 'adulto',
    resultado: 'tmb',
    status: 'pendente',
    referencia: 'Katch F. I. & McArdle W. D., edição de 1996',
    observacao: 'Usa a massa livre de gordura da mesma avaliação (RF-42).',
    exigencias: { massaLivreGordura: true },
    entradasExtras: [],
    gruposSugeridos: ADULTO_E_ATLETA,
    calcular: null,
  },
  {
    id: 'cunningham_1980',
    nome: 'Cunningham (1980)',
    publico: 'adulto',
    resultado: 'tmb',
    status: 'pendente',
    referencia: 'Cunningham J. J., Am J Clin Nutr, 1980',
    observacao: 'Usa a massa livre de gordura da mesma avaliação (RF-42).',
    exigencias: { massaLivreGordura: true },
    entradasExtras: [],
    gruposSugeridos: ADULTO_E_ATLETA,
    calcular: null,
  },
  {
    id: 'eer_iom_2005',
    nome: 'EER/IOM (2005)',
    publico: 'adulto',
    resultado: 'get',
    status: 'pendente',
    referencia: 'Institute of Medicine, Dietary Reference Intakes for Energy, 2005',
    observacao: 'Já resulta em GET: não aplicar fator de atividade (RF-41).',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['sexo', 'nivelAtividade'],
    gruposSugeridos: ADULTO,
    calcular: null,
  },
  {
    id: 'eer_2023',
    nome: 'EER (2023)',
    publico: 'adulto',
    resultado: 'get',
    status: 'pendente',
    referencia: 'NASEM, Dietary Reference Intakes for Energy, 2023, Tabela S-1',
    observacao: 'Já resulta em GET: não aplicar fator de atividade (RF-41).',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['sexo', 'nivelAtividade'],
    gruposSugeridos: ADULTO,
    calcular: null,
  },
  {
    id: 'tinsley_peso_2018',
    nome: 'Tinsley — por peso (2018)',
    publico: 'atleta',
    resultado: 'tmb',
    status: 'pendente',
    referencia:
      'Tinsley G. M., Graybeal A. J. & Moore M. L., Appl Physiol Nutr Metab, ' +
      '2019 (doi 10.1139/apnm-2018-0412)',
    exigencias: { peso: true },
    entradasExtras: [],
    gruposSugeridos: ['atleta'],
    calcular: null,
  },
  {
    id: 'tinsley_mlg_2018',
    nome: 'Tinsley — por MLG (2018)',
    publico: 'atleta',
    resultado: 'tmb',
    status: 'pendente',
    referencia:
      'Tinsley G. M., Graybeal A. J. & Moore M. L., Appl Physiol Nutr Metab, ' +
      '2019 (doi 10.1139/apnm-2018-0412)',
    exigencias: { massaLivreGordura: true },
    entradasExtras: [],
    gruposSugeridos: ['atleta'],
    calcular: null,
  },
  {
    id: 'ten_haaf_peso_2014',
    nome: 'Ten Haaf — por peso (2014)',
    publico: 'atleta',
    resultado: 'tmb',
    status: 'pendente',
    referencia: 'ten Haaf T. & Weijs P. J. M., PLoS One 9(10):e108460, 2014',
    observacao:
      'Resumos automáticos já devolveram coeficientes errados para esta ' +
      'fórmula — ler o artigo (acesso aberto) dígito por dígito.',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['sexo'],
    gruposSugeridos: ['atleta'],
    calcular: null,
  },
  {
    id: 'ten_haaf_mlg_2014',
    nome: 'Ten Haaf — por MLG (2014)',
    publico: 'atleta',
    resultado: 'tmb',
    status: 'pendente',
    referencia: 'ten Haaf T. & Weijs P. J. M., PLoS One 9(10):e108460, 2014',
    exigencias: { massaLivreGordura: true },
    entradasExtras: [],
    gruposSugeridos: ['atleta'],
    calcular: null,
  },
  {
    id: 'de_lorenzo_1999',
    nome: 'De Lorenzo (1999)',
    publico: 'atleta',
    resultado: 'tmb',
    status: 'pendente',
    referencia:
      'De Lorenzo A. et al., A new predictive equation to calculate resting ' +
      'metabolic rate in athletes, 1999',
    exigencias: { peso: true, altura: true },
    entradasExtras: [],
    gruposSugeridos: ['atleta'],
    calcular: null,
  },
  {
    id: 'eer_iom_2005_infantil',
    nome: 'EER/IOM (2005) — infantil',
    publico: 'infantil',
    resultado: 'get',
    status: 'pendente',
    referencia: 'Institute of Medicine, Dietary Reference Intakes for Energy, 2005',
    observacao: 'Já resulta em GET: não aplicar fator de atividade (RF-41).',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['sexo', 'nivelAtividade'],
    gruposSugeridos: ['crianca_adolescente'],
    calcular: null,
  },
  {
    id: 'eer_2023_infantil',
    nome: 'EER (2023) — infantil',
    publico: 'infantil',
    resultado: 'get',
    status: 'pendente',
    referencia: 'NASEM, Dietary Reference Intakes for Energy, 2023, Tabela S-1',
    observacao: 'Já resulta em GET: não aplicar fator de atividade (RF-41).',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['sexo', 'nivelAtividade'],
    gruposSugeridos: ['crianca_adolescente'],
    calcular: null,
  },
  {
    id: 'schofield_1985_infantil',
    nome: 'Schofield (1985) — infantil',
    publico: 'infantil',
    resultado: 'tmb',
    status: 'pendente',
    referencia: 'Schofield W. N., Hum Nutr Clin Nutr, 1985',
    observacao: 'Tem variante com altura; confirmar qual a Nutrio usa.',
    exigencias: { idade: true, peso: true },
    entradasExtras: ['sexo'],
    gruposSugeridos: ['crianca_adolescente'],
    calcular: null,
  },
  {
    id: 'fao_who_2004_infantil',
    nome: 'FAO/WHO (2004) — infantil',
    publico: 'infantil',
    resultado: null,
    status: 'pendente',
    referencia: 'FAO/WHO/UNU, Human energy requirements, 2004',
    observacao: 'Requisitos marcam o resultado (TMB ou GET) como a confirmar.',
    exigencias: { idade: true, peso: true },
    entradasExtras: ['sexo'],
    gruposSugeridos: ['crianca_adolescente'],
    calcular: null,
  },
  {
    id: 'ms_2005_gestante',
    nome: 'Ministério da Saúde (2005) — gestante',
    publico: 'gestante',
    resultado: null,
    status: 'pendente',
    referencia: 'Documento do Ministério da Saúde ainda não identificado',
    observacao:
      'Entradas prováveis: peso pré-gestacional e idade gestacional. ' +
      'Confirmar com o nutricionista ou com a Nutrio.',
    exigencias: {},
    entradasExtras: ['idadeGestacional'],
    gruposSugeridos: ['gestante'],
    calcular: null,
  },
  {
    id: 'eer_2023_gestante',
    nome: 'EER (2023) — gestante',
    publico: 'gestante',
    resultado: 'get',
    status: 'pendente',
    referencia: 'NASEM, Dietary Reference Intakes for Energy, 2023',
    observacao: 'Já resulta em GET: não aplicar fator de atividade (RF-41).',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['nivelAtividade', 'idadeGestacional'],
    gruposSugeridos: ['gestante'],
    calcular: null,
  },
  {
    id: 'eer_2023_lactante',
    nome: 'EER (2023) — lactante',
    publico: 'lactante',
    resultado: 'get',
    status: 'pendente',
    referencia: 'NASEM, Dietary Reference Intakes for Energy, 2023',
    observacao: 'Já resulta em GET: não aplicar fator de atividade (RF-41).',
    exigencias: { idade: true, peso: true, altura: true },
    entradasExtras: ['nivelAtividade', 'mesesPosParto'],
    gruposSugeridos: ['lactante'],
    calcular: null,
  },
  {
    id: 'bolso',
    nome: 'GET por fórmula de bolso',
    publico: 'manual',
    resultado: 'get',
    status: 'nao_requer_verificacao',
    referencia: 'Peso × kcal/kg definido pelo nutricionista',
    observacao: 'Já resulta em GET: não aplicar fator de atividade (RF-41).',
    exigencias: { peso: true },
    entradasExtras: ['kcalPorKg'],
    gruposSugeridos: TODOS,
    calcular: calcularBolso,
  },
  {
    id: 'tmb_manual',
    nome: 'Colocar TMB manualmente',
    publico: 'manual',
    resultado: 'tmb',
    status: 'nao_requer_verificacao',
    referencia: 'Valor digitado pelo nutricionista',
    exigencias: {},
    entradasExtras: ['valorInformado'],
    gruposSugeridos: TODOS,
    calcular: calcularValorInformado('TMB'),
  },
  {
    id: 'get_manual',
    nome: 'Colocar GET manualmente',
    publico: 'manual',
    resultado: 'get',
    status: 'nao_requer_verificacao',
    referencia: 'Valor digitado pelo nutricionista',
    observacao: 'Já resulta em GET: não aplicar fator de atividade (RF-41).',
    exigencias: {},
    entradasExtras: ['valorInformado'],
    gruposSugeridos: TODOS,
    calcular: calcularValorInformado('GET'),
  },
];

const POR_ID = new Map(FORMULAS_ENERGIA.map((f) => [f.id, f]));

export function obterFormulaEnergia(id: FormulaEnergiaId): FormulaEnergia {
  const formula = POR_ID.get(id);
  if (!formula) throw new Error(`Fórmula de gasto energético desconhecida: ${id}`);
  return formula;
}
