import { ErroCalculo } from '../erros.js';
import { formatar } from '../numeros.js';
import type { MemoriaCalculo } from '../tipos.js';
import { obrigatorio } from '../validacao.js';

/**
 * Meta calórica e distribuição de macronutrientes (RF-44).
 *
 * São definições aritméticas sobre o GET já calculado. Os fatores de Atwater
 * (4 kcal/g para proteína e carboidrato, 9 kcal/g para gordura) são convenção
 * consolidada e entram aqui como constante nomeada.
 */

export const KCAL_POR_GRAMA = {
  proteina: 4,
  carboidrato: 4,
  gordura: 9,
} as const;

export type Macronutriente = keyof typeof KCAL_POR_GRAMA;

export const ROTULOS_MACRONUTRIENTE: Readonly<Record<Macronutriente, string>> = {
  proteina: 'Proteína',
  carboidrato: 'Carboidrato',
  gordura: 'Gordura',
};

/** Déficit ou superávit, em kcal ou em percentual do GET. */
export type AjusteMeta =
  | { tipo: 'kcal'; valor: number }
  | { tipo: 'percentual'; valor: number };

export interface ResultadoMeta {
  /** kcal. */
  metaCalorica: number;
  memoria: MemoriaCalculo;
}

export function calcularMetaCalorica(gastoEnergetico: number, ajuste: AjusteMeta): ResultadoMeta {
  const get = obrigatorio(gastoEnergetico, 'GET');

  const delta = ajuste.tipo === 'kcal' ? ajuste.valor : (get * ajuste.valor) / 100;
  const metaCalorica = get + delta;

  if (metaCalorica <= 0) {
    throw new ErroCalculo(
      `O ajuste de ${formatar(ajuste.valor)} ${ajuste.tipo === 'kcal' ? 'kcal' : '%'} ` +
        'zera ou inverte a meta calórica.',
    );
  }

  const sinal = delta >= 0 ? '+' : '−';
  const expressao =
    ajuste.tipo === 'kcal'
      ? `${formatar(get, 0)} ${sinal} ${formatar(Math.abs(delta), 0)}`
      : `${formatar(get, 0)} ${sinal} ${formatar(Math.abs(ajuste.valor))}% de ${formatar(get, 0)}`;

  return {
    metaCalorica,
    memoria: {
      formula: 'Meta calórica = GET ± ajuste',
      referencia: 'Ajuste definido pelo nutricionista',
      entradas: [
        { rotulo: 'GET', valor: get, unidade: 'kcal' },
        {
          rotulo: 'Ajuste',
          valor: ajuste.valor,
          unidade: ajuste.tipo === 'kcal' ? 'kcal' : '%',
        },
      ],
      passos: [{ rotulo: 'Meta calórica', expressao, valor: metaCalorica, unidade: 'kcal' }],
    },
  };
}

/**
 * Distribuição por percentual da meta ou por grama por quilo de peso.
 *
 * No modo `gramasPorKg` o nutricionista define proteína e gordura; o
 * carboidrato fica com as calorias restantes, como é praxe na prescrição.
 */
export type DistribuicaoMacros =
  | { modo: 'percentual'; proteina: number; carboidrato: number; gordura: number }
  | { modo: 'gramasPorKg'; proteina: number; gordura: number };

export interface PorcaoMacronutriente {
  gramas: number;
  kcal: number;
  /** Percentual da meta calórica. */
  percentual: number;
}

export interface ResultadoMacros {
  proteina: PorcaoMacronutriente;
  carboidrato: PorcaoMacronutriente;
  gordura: PorcaoMacronutriente;
  memoria: MemoriaCalculo;
}

function porcao(kcal: number, macro: Macronutriente, metaCalorica: number): PorcaoMacronutriente {
  return {
    gramas: kcal / KCAL_POR_GRAMA[macro],
    kcal,
    percentual: (kcal / metaCalorica) * 100,
  };
}

export function calcularMacros(
  metaCalorica: number,
  distribuicao: DistribuicaoMacros,
  peso?: number,
): ResultadoMacros {
  const meta = obrigatorio(metaCalorica, 'Meta calórica');

  let kcalProteina: number;
  let kcalGordura: number;
  let kcalCarboidrato: number;
  const entradas: MemoriaCalculo['entradas'] = [
    { rotulo: 'Meta calórica', valor: meta, unidade: 'kcal' },
  ];

  if (distribuicao.modo === 'percentual') {
    const soma = distribuicao.proteina + distribuicao.carboidrato + distribuicao.gordura;
    if (Math.abs(soma - 100) > 0.01) {
      throw new ErroCalculo(
        `Os percentuais de macronutrientes somam ${formatar(soma)}%, e precisam somar 100%.`,
      );
    }
    kcalProteina = (meta * distribuicao.proteina) / 100;
    kcalCarboidrato = (meta * distribuicao.carboidrato) / 100;
    kcalGordura = (meta * distribuicao.gordura) / 100;
    entradas.push(
      { rotulo: 'Proteína', valor: distribuicao.proteina, unidade: '%' },
      { rotulo: 'Carboidrato', valor: distribuicao.carboidrato, unidade: '%' },
      { rotulo: 'Gordura', valor: distribuicao.gordura, unidade: '%' },
    );
  } else {
    const pesoKg = obrigatorio(peso, 'Peso');
    kcalProteina = distribuicao.proteina * pesoKg * KCAL_POR_GRAMA.proteina;
    kcalGordura = distribuicao.gordura * pesoKg * KCAL_POR_GRAMA.gordura;
    kcalCarboidrato = meta - kcalProteina - kcalGordura;
    if (kcalCarboidrato < 0) {
      throw new ErroCalculo(
        'Proteína e gordura já passam da meta calórica: não sobra energia para o carboidrato.',
      );
    }
    entradas.push(
      { rotulo: 'Peso', valor: pesoKg, unidade: 'kg' },
      { rotulo: 'Proteína', valor: distribuicao.proteina, unidade: 'g/kg' },
      { rotulo: 'Gordura', valor: distribuicao.gordura, unidade: 'g/kg' },
    );
  }

  const proteina = porcao(kcalProteina, 'proteina', meta);
  const carboidrato = porcao(kcalCarboidrato, 'carboidrato', meta);
  const gordura = porcao(kcalGordura, 'gordura', meta);

  return {
    proteina,
    carboidrato,
    gordura,
    memoria: {
      formula: 'Gramas = kcal do macronutriente ÷ kcal por grama (4 / 4 / 9)',
      referencia: 'Fatores de Atwater',
      entradas,
      passos: [
        { rotulo: 'Proteína', expressao: `${formatar(kcalProteina, 0)} ÷ 4`, valor: proteina.gramas, unidade: 'g' },
        { rotulo: 'Carboidrato', expressao: `${formatar(kcalCarboidrato, 0)} ÷ 4`, valor: carboidrato.gramas, unidade: 'g' },
        { rotulo: 'Gordura', expressao: `${formatar(kcalGordura, 0)} ÷ 9`, valor: gordura.gramas, unidade: 'g' },
      ],
    },
  };
}
