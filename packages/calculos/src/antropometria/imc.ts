import { formatar } from '../numeros.js';
import type { MemoriaCalculo } from '../tipos.js';
import { obrigatorio } from '../validacao.js';

/**
 * Índice de Massa Corporal e classificação da OMS (RF-31).
 *
 * O IMC é uma definição aritmética (peso ÷ altura²), não uma equação com
 * coeficientes ajustados, por isso calcula desde já. A tabela de faixas está
 * registrada em `docs/verificacao-formulas.md`, seção "Tabelas de
 * classificação", para conferência no documento da OMS.
 */

export const FONTE_IMC =
  'OMS, Obesity: preventing and managing the global epidemic, ' +
  'WHO Technical Report Series 894, 2000 — classificação para adultos';

export type ClassificacaoImc =
  | 'magreza_grave'
  | 'magreza_moderada'
  | 'magreza_leve'
  | 'eutrofia'
  | 'sobrepeso'
  | 'obesidade_grau_1'
  | 'obesidade_grau_2'
  | 'obesidade_grau_3';

export interface FaixaImc {
  chave: ClassificacaoImc;
  rotulo: string;
  /** Limite inferior, inclusive. */
  min: number;
  /** Limite superior, exclusivo. `null` na última faixa. */
  max: number | null;
}

/** Faixas da OMS para adultos, em ordem crescente. Intervalos semiabertos. */
export const FAIXAS_IMC_OMS: readonly FaixaImc[] = [
  { chave: 'magreza_grave', rotulo: 'Magreza grave', min: -Infinity, max: 16 },
  { chave: 'magreza_moderada', rotulo: 'Magreza moderada', min: 16, max: 17 },
  { chave: 'magreza_leve', rotulo: 'Magreza leve', min: 17, max: 18.5 },
  { chave: 'eutrofia', rotulo: 'Eutrofia', min: 18.5, max: 25 },
  { chave: 'sobrepeso', rotulo: 'Sobrepeso', min: 25, max: 30 },
  { chave: 'obesidade_grau_1', rotulo: 'Obesidade grau I', min: 30, max: 35 },
  { chave: 'obesidade_grau_2', rotulo: 'Obesidade grau II', min: 35, max: 40 },
  { chave: 'obesidade_grau_3', rotulo: 'Obesidade grau III', min: 40, max: null },
];

export interface ResultadoImc {
  /** kg/m². */
  imc: number;
  faixa: FaixaImc;
  memoria: MemoriaCalculo;
}

/** Classifica um IMC já calculado nas faixas da OMS para adultos. */
export function classificarImc(imc: number): FaixaImc {
  const faixa = FAIXAS_IMC_OMS.find((f) => imc >= f.min && (f.max === null || imc < f.max));
  // A lista cobre toda a reta real; o `??` existe só para satisfazer o tipo.
  return faixa ?? FAIXAS_IMC_OMS[FAIXAS_IMC_OMS.length - 1]!;
}

/**
 * Calcula o IMC a partir do peso (kg) e da altura (cm).
 *
 * A classificação vale para adultos. Crianças e adolescentes usam escores-z das
 * curvas da OMS (RF-37), ainda não implementados.
 */
export function calcularImc(peso: number, altura: number): ResultadoImc {
  const pesoKg = obrigatorio(peso, 'Peso');
  const alturaCm = obrigatorio(altura, 'Altura');
  const alturaM = alturaCm / 100;
  const imc = pesoKg / (alturaM * alturaM);
  const faixa = classificarImc(imc);

  const memoria: MemoriaCalculo = {
    formula: 'IMC = peso ÷ altura²',
    referencia: FONTE_IMC,
    entradas: [
      { rotulo: 'Peso', valor: pesoKg, unidade: 'kg' },
      { rotulo: 'Altura', valor: alturaCm, unidade: 'cm' },
    ],
    passos: [
      {
        rotulo: 'Altura em metros',
        expressao: `${formatar(alturaCm, 1)} ÷ 100`,
        valor: alturaM,
        unidade: 'm',
      },
      {
        rotulo: 'IMC',
        expressao: `${formatar(pesoKg, 1)} ÷ ${formatar(alturaM, 2)}²`,
        valor: imc,
        unidade: 'kg/m²',
      },
    ],
  };

  return { imc, faixa, memoria };
}
