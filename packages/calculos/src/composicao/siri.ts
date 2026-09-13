import { formatar } from '../numeros.js';
import type { MemoriaCalculo, StatusVerificacao } from '../tipos.js';

/**
 * Conversão de densidade corporal em percentual de gordura (RF-34).
 *
 * A equação está escrita, mas o portão de status em `calcularComposicao`
 * impede o uso enquanto ela não for conferida na publicação original —
 * ver `docs/verificacao-formulas.md`.
 */
export const SIRI = {
  nome: 'Siri (1961)',
  referencia:
    'Siri W. E., Body composition from fluid spaces and density: analysis of ' +
    'methods, 1961',
  status: 'pendente' as StatusVerificacao,
  observacao: 'Coeficientes 495 e 450 anotados nos requisitos; falta conferir na fonte.',
} as const;

export interface ResultadoSiri {
  percentualGordura: number;
  memoria: MemoriaCalculo;
}

/**
 * %G = 495 ÷ DC − 450, com a densidade corporal em g/cm³.
 *
 * Não chame diretamente: passe por `calcularComposicao`, que aplica o portão
 * de verificação da RN-06.
 */
export function converterSiri(densidadeCorporal: number): ResultadoSiri {
  const percentualGordura = 495 / densidadeCorporal - 450;

  return {
    percentualGordura,
    memoria: {
      formula: '%G = 495 ÷ DC − 450',
      referencia: SIRI.referencia,
      entradas: [
        { rotulo: 'Densidade corporal', valor: densidadeCorporal, unidade: 'g/cm³' },
      ],
      passos: [
        {
          rotulo: 'Percentual de gordura',
          expressao: `495 ÷ ${formatar(densidadeCorporal, 5)} − 450`,
          valor: percentualGordura,
          unidade: '%',
        },
      ],
    },
  };
}
