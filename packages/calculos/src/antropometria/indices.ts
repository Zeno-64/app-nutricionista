import { formatar } from '../numeros.js';
import type { MemoriaCalculo, Sexo } from '../tipos.js';
import { obrigatorio } from '../validacao.js';

/**
 * Relação cintura-quadril (RCQ) e relação cintura-estatura (RCE) — RF-31.
 *
 * Os dois são razões entre medidas, sem coeficiente ajustado, e calculam desde
 * já. Os pontos de corte estão registrados em `docs/verificacao-formulas.md`,
 * seção "Tabelas de classificação", para conferência na fonte.
 */

export const FONTE_RCQ =
  'OMS, Waist circumference and waist–hip ratio: report of a WHO expert ' +
  'consultation, Genebra, 2008';

export const FONTE_RCE =
  'Ashwell M. & Gibson S., relação cintura-estatura como triagem de risco ' +
  'cardiometabólico — ponto de corte 0,5';

export type RiscoCardiometabolico = 'baixo' | 'aumentado' | 'substancialmente_aumentado';

export const ROTULOS_RISCO: Readonly<Record<RiscoCardiometabolico, string>> = {
  baixo: 'Risco baixo',
  aumentado: 'Risco aumentado',
  substancialmente_aumentado: 'Risco substancialmente aumentado',
};

/** Ponto de corte de RCQ por sexo, acima do qual o risco é substancial. */
export const CORTE_RCQ: Readonly<Record<Sexo, number>> = {
  masculino: 0.9,
  feminino: 0.85,
};

export interface ResultadoRazao {
  razao: number;
  risco: RiscoCardiometabolico;
  memoria: MemoriaCalculo;
}

/** Relação cintura-quadril: cintura ÷ quadril, ambas em cm. */
export function calcularRcq(cintura: number, quadril: number, sexo: Sexo): ResultadoRazao {
  const cinturaCm = obrigatorio(cintura, 'Circunferência da cintura');
  const quadrilCm = obrigatorio(quadril, 'Circunferência do quadril');
  const razao = cinturaCm / quadrilCm;
  const corte = CORTE_RCQ[sexo];

  const memoria: MemoriaCalculo = {
    formula: 'RCQ = cintura ÷ quadril',
    referencia: FONTE_RCQ,
    entradas: [
      { rotulo: 'Cintura', valor: cinturaCm, unidade: 'cm' },
      { rotulo: 'Quadril', valor: quadrilCm, unidade: 'cm' },
      { rotulo: 'Ponto de corte', valor: formatar(corte), unidade: '' },
    ],
    passos: [
      {
        rotulo: 'RCQ',
        expressao: `${formatar(cinturaCm, 1)} ÷ ${formatar(quadrilCm, 1)}`,
        valor: razao,
      },
    ],
  };

  return {
    razao,
    risco: razao >= corte ? 'substancialmente_aumentado' : 'baixo',
    memoria,
  };
}

/** Relação cintura-estatura: cintura ÷ altura, ambas em cm. */
export function calcularRce(cintura: number, altura: number): ResultadoRazao {
  const cinturaCm = obrigatorio(cintura, 'Circunferência da cintura');
  const alturaCm = obrigatorio(altura, 'Altura');
  const razao = cinturaCm / alturaCm;

  const memoria: MemoriaCalculo = {
    formula: 'RCE = cintura ÷ estatura',
    referencia: FONTE_RCE,
    entradas: [
      { rotulo: 'Cintura', valor: cinturaCm, unidade: 'cm' },
      { rotulo: 'Altura', valor: alturaCm, unidade: 'cm' },
    ],
    passos: [
      {
        rotulo: 'RCE',
        expressao: `${formatar(cinturaCm, 1)} ÷ ${formatar(alturaCm, 1)}`,
        valor: razao,
      },
    ],
  };

  let risco: RiscoCardiometabolico = 'baixo';
  if (razao >= 0.6) risco = 'substancialmente_aumentado';
  else if (razao >= 0.5) risco = 'aumentado';

  return { razao, risco, memoria };
}
