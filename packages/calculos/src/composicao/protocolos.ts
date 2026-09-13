import { formatar, somar } from '../numeros.js';
import type { DadosAvaliacao, MemoriaCalculo, Sexo, StatusVerificacao } from '../tipos.js';
import type { Exigencias } from '../validacao.js';
import { obrigatorio } from '../validacao.js';

/**
 * Catálogo de protocolos de percentual de gordura (§4.5 dos requisitos).
 *
 * Cada entrada declara as medidas que exige, para o formulário destacar só
 * essas (RF-33), e o status de verificação (RN-06). Protocolos que ainda não
 * foram conferidos na fonte primária ficam listados mas não calculam — o
 * portão fica em `calcularComposicao`.
 *
 * Onde `calcular` é `null`, os coeficientes ainda não foram lidos na
 * publicação original. Não preencher de memória: ler a fonte indicada em
 * `docs/verificacao-formulas.md` e anotar lá antes de implementar.
 */

export type ProtocoloId =
  | 'nenhum'
  | 'pollock3'
  | 'pollock7'
  | 'faulkner'
  | 'guedes'
  | 'petroski'
  | 'durnin_womersley'
  | 'weltman';

/** O que a equação devolve antes da conversão de Siri (RF-34). */
export type ResultadoProtocolo = 'nenhum' | 'densidade' | 'percentual';

export interface SaidaProtocolo {
  /** g/cm³, quando o protocolo resulta em densidade. */
  densidadeCorporal?: number;
  /** %, quando o protocolo resulta em gordura direto. */
  percentualGordura?: number;
  memoria: MemoriaCalculo;
}

export interface ProtocoloComposicao {
  id: ProtocoloId;
  nome: string;
  referencia: string;
  status: StatusVerificacao;
  observacao?: string;
  resultado: ResultadoProtocolo;
  /** Medidas exigidas; vários protocolos pedem dobras diferentes por sexo. */
  exigencias: (sexo: Sexo) => Exigencias;
  calcular: ((dados: DadosAvaliacao) => SaidaProtocolo) | null;
}

const SEM_EXIGENCIA = (): Exigencias => ({});

// --------------------------------------------------------------------------
// Durnin & Womersley (1974)
// --------------------------------------------------------------------------

interface CoeficientesLog {
  c: number;
  m: number;
}

interface FaixaDurnin {
  /** Limite superior de idade, exclusivo. */
  abaixoDe: number;
  masculino: CoeficientesLog;
  feminino: CoeficientesLog;
}

/**
 * Coeficientes anotados em `docs/verificacao-formulas.md` a partir de fonte
 * secundária (topendsports.com). Status `parcial` até a leitura do artigo
 * original em Br J Nutr 32:77–97.
 */
export const FAIXAS_DURNIN_WOMERSLEY: readonly FaixaDurnin[] = [
  { abaixoDe: 17, masculino: { c: 1.1533, m: 0.0643 }, feminino: { c: 1.1369, m: 0.0598 } },
  { abaixoDe: 20, masculino: { c: 1.162, m: 0.063 }, feminino: { c: 1.1549, m: 0.0678 } },
  { abaixoDe: 30, masculino: { c: 1.1631, m: 0.0632 }, feminino: { c: 1.1599, m: 0.0717 } },
  { abaixoDe: 40, masculino: { c: 1.1422, m: 0.0544 }, feminino: { c: 1.1423, m: 0.0632 } },
  { abaixoDe: 50, masculino: { c: 1.162, m: 0.07 }, feminino: { c: 1.1333, m: 0.0612 } },
  { abaixoDe: Infinity, masculino: { c: 1.1715, m: 0.0779 }, feminino: { c: 1.1339, m: 0.0645 } },
];

export function coeficientesDurnin(idade: number, sexo: Sexo): CoeficientesLog {
  const faixa =
    FAIXAS_DURNIN_WOMERSLEY.find((f) => idade < f.abaixoDe) ??
    FAIXAS_DURNIN_WOMERSLEY[FAIXAS_DURNIN_WOMERSLEY.length - 1]!;
  return faixa[sexo];
}

const REFERENCIA_DURNIN =
  'Durnin J. V. G. A. & Womersley J., Br J Nutr 32:77–97, 1974';

function calcularDurninWomersley(dados: DadosAvaliacao): SaidaProtocolo {
  const idade = obrigatorio(dados.idade, 'Idade');
  const biceps = obrigatorio(dados.dobras?.biceps, 'Dobra bíceps');
  const triceps = obrigatorio(dados.dobras?.triceps, 'Dobra tríceps');
  const subescapular = obrigatorio(dados.dobras?.subescapular, 'Dobra subescapular');
  const supraIliaca = obrigatorio(dados.dobras?.supraIliaca, 'Dobra supra-ilíaca');

  const soma = somar([biceps, triceps, subescapular, supraIliaca]);
  const { c, m } = coeficientesDurnin(idade, dados.sexo);
  const log = Math.log10(soma);
  const densidadeCorporal = c - m * log;

  return {
    densidadeCorporal,
    memoria: {
      formula: 'DC = C − M × log₁₀(Σ4 dobras)',
      referencia: REFERENCIA_DURNIN,
      entradas: [
        { rotulo: 'Idade', valor: idade, unidade: 'anos' },
        { rotulo: 'Bíceps', valor: biceps, unidade: 'mm' },
        { rotulo: 'Tríceps', valor: triceps, unidade: 'mm' },
        { rotulo: 'Subescapular', valor: subescapular, unidade: 'mm' },
        { rotulo: 'Supra-ilíaca', valor: supraIliaca, unidade: 'mm' },
      ],
      passos: [
        { rotulo: 'Σ4 dobras', expressao: `${formatar(biceps, 1)} + ${formatar(triceps, 1)} + ${formatar(subescapular, 1)} + ${formatar(supraIliaca, 1)}`, valor: soma, unidade: 'mm' },
        { rotulo: 'log₁₀(Σ4)', expressao: `log₁₀(${formatar(soma, 1)})`, valor: log },
        { rotulo: 'Densidade corporal', expressao: `${c} − ${m} × ${formatar(log, 5)}`, valor: densidadeCorporal, unidade: 'g/cm³' },
      ],
    },
  };
}

// --------------------------------------------------------------------------
// Petroski (1995)
// --------------------------------------------------------------------------

const REFERENCIA_PETROSKI = 'Petroski E. L., tese de doutorado, UFSM, 1995';

/** Coeficientes masculinos anotados em `docs/verificacao-formulas.md`. */
export const PETROSKI_MASCULINO = {
  constante: 1.10726863,
  soma: -0.00081201,
  somaQuadrado: 0.00000212,
  idade: -0.00041761,
} as const;

function calcularPetroski(dados: DadosAvaliacao): SaidaProtocolo {
  if (dados.sexo === 'feminino') {
    // Duas variantes circulam para mulheres e os requisitos ainda não dizem
    // qual a Nutrio usa. Não implementar antes de resolver pelo caso de
    // referência (docs/verificacao-formulas.md).
    throw new Error(
      'Petroski (1995) para mulheres ainda não tem coeficientes definidos — ' +
        'ver docs/verificacao-formulas.md.',
    );
  }

  const idade = obrigatorio(dados.idade, 'Idade');
  const subescapular = obrigatorio(dados.dobras?.subescapular, 'Dobra subescapular');
  const triceps = obrigatorio(dados.dobras?.triceps, 'Dobra tríceps');
  const supraIliaca = obrigatorio(dados.dobras?.supraIliaca, 'Dobra supra-ilíaca');
  const panturrilha = obrigatorio(dados.dobras?.panturrilhaMedial, 'Dobra panturrilha medial');

  const soma = somar([subescapular, triceps, supraIliaca, panturrilha]);
  const c = PETROSKI_MASCULINO;
  const densidadeCorporal =
    c.constante + c.soma * soma + c.somaQuadrado * soma * soma + c.idade * idade;

  return {
    densidadeCorporal,
    memoria: {
      formula: 'DC = 1,10726863 − 0,00081201·Σ4 + 0,00000212·Σ4² − 0,00041761·idade',
      referencia: REFERENCIA_PETROSKI,
      entradas: [
        { rotulo: 'Idade', valor: idade, unidade: 'anos' },
        { rotulo: 'Subescapular', valor: subescapular, unidade: 'mm' },
        { rotulo: 'Tríceps', valor: triceps, unidade: 'mm' },
        { rotulo: 'Supra-ilíaca', valor: supraIliaca, unidade: 'mm' },
        { rotulo: 'Panturrilha medial', valor: panturrilha, unidade: 'mm' },
      ],
      passos: [
        { rotulo: 'Σ4 dobras', expressao: `${formatar(subescapular, 1)} + ${formatar(triceps, 1)} + ${formatar(supraIliaca, 1)} + ${formatar(panturrilha, 1)}`, valor: soma, unidade: 'mm' },
        { rotulo: 'Densidade corporal', expressao: `${c.constante} − ${Math.abs(c.soma)}×${formatar(soma, 1)} + ${c.somaQuadrado}×${formatar(soma, 1)}² − ${Math.abs(c.idade)}×${idade}`, valor: densidadeCorporal, unidade: 'g/cm³' },
      ],
    },
  };
}

// --------------------------------------------------------------------------
// Catálogo
// --------------------------------------------------------------------------

export const PROTOCOLOS_COMPOSICAO: readonly ProtocoloComposicao[] = [
  {
    id: 'nenhum',
    nome: 'Nenhum',
    referencia: '—',
    status: 'nao_requer_verificacao',
    observacao: 'A avaliação fica sem estimativa de percentual de gordura.',
    resultado: 'nenhum',
    exigencias: SEM_EXIGENCIA,
    calcular: null,
  },
  {
    id: 'pollock3',
    nome: 'Pollock 3 dobras (1978)',
    referencia:
      'Jackson A. S. & Pollock M. L., Br J Nutr, 1978 (homens); ' +
      'Jackson, Pollock & Ward, Med Sci Sports Exerc, 1980 (mulheres)',
    status: 'pendente',
    observacao: 'A Nutrio rotula as duas versões como 1978.',
    resultado: 'densidade',
    exigencias: (sexo) => ({
      idade: true,
      dobras:
        sexo === 'masculino'
          ? ['peitoral', 'abdominal', 'coxa']
          : ['triceps', 'supraIliaca', 'coxa'],
    }),
    calcular: null,
  },
  {
    id: 'pollock7',
    nome: 'Pollock 7 dobras (1978)',
    referencia: 'Jackson A. S. & Pollock M. L., Br J Nutr, 1978',
    status: 'pendente',
    resultado: 'densidade',
    exigencias: () => ({
      idade: true,
      dobras: [
        'peitoral',
        'axilarMedia',
        'triceps',
        'subescapular',
        'abdominal',
        'supraIliaca',
        'coxa',
      ],
    }),
    calcular: null,
  },
  {
    id: 'faulkner',
    nome: 'Faulkner (1968)',
    referencia: 'Faulkner J. A., 1968',
    status: 'pendente',
    observacao: 'Resulta em percentual de gordura direto, sem passar por Siri.',
    resultado: 'percentual',
    exigencias: () => ({
      dobras: ['triceps', 'subescapular', 'supraIliaca', 'abdominal'],
    }),
    calcular: null,
  },
  {
    id: 'guedes',
    nome: 'Guedes (1994)',
    referencia: 'Guedes D. P., 1994',
    status: 'pendente',
    resultado: 'densidade',
    exigencias: (sexo) => ({
      dobras:
        sexo === 'masculino'
          ? ['triceps', 'supraIliaca', 'abdominal']
          : ['subescapular', 'supraIliaca', 'coxa'],
    }),
    calcular: null,
  },
  {
    id: 'petroski',
    nome: 'Petroski (1995)',
    referencia: REFERENCIA_PETROSKI,
    status: 'parcial',
    observacao:
      'Coeficientes masculinos vindos de fonte secundária; os femininos têm ' +
      'duas variantes em circulação e continuam indefinidos.',
    resultado: 'densidade',
    exigencias: (sexo) =>
      sexo === 'masculino'
        ? {
            idade: true,
            dobras: ['subescapular', 'triceps', 'supraIliaca', 'panturrilhaMedial'],
          }
        : {
            idade: true,
            peso: true,
            altura: true,
            dobras: ['axilarMedia', 'supraIliaca', 'coxa', 'panturrilhaMedial'],
          },
    calcular: calcularPetroski,
  },
  {
    id: 'durnin_womersley',
    nome: 'Durnin & Womersley (1974)',
    referencia: REFERENCIA_DURNIN,
    status: 'parcial',
    observacao: 'Coeficientes por faixa etária vindos de fonte secundária.',
    resultado: 'densidade',
    exigencias: () => ({
      idade: true,
      dobras: ['biceps', 'triceps', 'subescapular', 'supraIliaca'],
    }),
    calcular: calcularDurninWomersley,
  },
  {
    id: 'weltman',
    nome: 'Weltman (1988) — obesos',
    referencia: 'Weltman A. et al., 1988 — identificar as publicações exatas por sexo',
    status: 'pendente',
    observacao: 'Não usa dobras: circunferência abdominal, peso e altura.',
    resultado: 'percentual',
    exigencias: () => ({
      peso: true,
      altura: true,
      circunferencias: ['abdomen'],
    }),
    calcular: null,
  },
];

const POR_ID = new Map(PROTOCOLOS_COMPOSICAO.map((p) => [p.id, p]));

export function obterProtocolo(id: ProtocoloId): ProtocoloComposicao {
  const protocolo = POR_ID.get(id);
  if (!protocolo) throw new Error(`Protocolo desconhecido: ${id}`);
  return protocolo;
}
