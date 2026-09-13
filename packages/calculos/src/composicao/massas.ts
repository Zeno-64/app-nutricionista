import { formatar } from '../numeros.js';
import type { MemoriaCalculo } from '../tipos.js';
import { obrigatorio } from '../validacao.js';

/**
 * Massa gorda e massa livre de gordura a partir do percentual de gordura
 * (RF-35). São definições aritméticas, sem coeficiente a conferir.
 */

export interface ResultadoMassas {
  /** kg. */
  massaGorda: number;
  /** kg. */
  massaLivreGordura: number;
  memoria: MemoriaCalculo;
}

export function derivarMassas(peso: number, percentualGordura: number): ResultadoMassas {
  const pesoKg = obrigatorio(peso, 'Peso');
  const massaGorda = (pesoKg * percentualGordura) / 100;
  const massaLivreGordura = pesoKg - massaGorda;

  return {
    massaGorda,
    massaLivreGordura,
    memoria: {
      formula: 'MG = peso × %G ÷ 100; MLG = peso − MG',
      referencia: 'Definição aritmética',
      entradas: [
        { rotulo: 'Peso', valor: pesoKg, unidade: 'kg' },
        { rotulo: 'Percentual de gordura', valor: percentualGordura, unidade: '%' },
      ],
      passos: [
        {
          rotulo: 'Massa gorda',
          expressao: `${formatar(pesoKg, 1)} × ${formatar(percentualGordura)} ÷ 100`,
          valor: massaGorda,
          unidade: 'kg',
        },
        {
          rotulo: 'Massa livre de gordura',
          expressao: `${formatar(pesoKg, 1)} − ${formatar(massaGorda)}`,
          valor: massaLivreGordura,
          unidade: 'kg',
        },
      ],
    },
  };
}

/** Caminho inverso: a bioimpedância informa a MLG e o %G sai dela (RF-36). */
export function percentualPelaMassaLivre(peso: number, massaLivreGordura: number): number {
  const pesoKg = obrigatorio(peso, 'Peso');
  const mlg = obrigatorio(massaLivreGordura, 'Massa livre de gordura');
  return ((pesoKg - mlg) / pesoKg) * 100;
}
