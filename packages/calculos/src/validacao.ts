import { MedidaFaltandoError, MedidaInvalidaError } from './erros.js';
import { ROTULOS_CIRCUNFERENCIA, ROTULOS_DOBRA } from './rotulos.js';
import type { Circunferencia, DadosAvaliacao, DobraCutanea } from './tipos.js';

/** Medidas que uma fórmula ou protocolo exige para um dado sexo (RF-33). */
export interface Exigencias {
  idade?: boolean;
  peso?: boolean;
  altura?: boolean;
  massaLivreGordura?: boolean;
  dobras?: readonly DobraCutanea[];
  circunferencias?: readonly Circunferencia[];
}

export const EXIGENCIAS_VAZIAS: Exigencias = {};

function validarValor(valor: number | undefined, rotulo: string, faltando: string[]): void {
  if (valor === undefined || valor === null) {
    faltando.push(rotulo);
    return;
  }
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new MedidaInvalidaError(rotulo, valor);
  }
}

/**
 * Confere todas as medidas exigidas de uma vez e reporta as que faltam juntas,
 * para o formulário conseguir marcar todos os campos pendentes num só passe.
 */
export function validarDados(dados: DadosAvaliacao, exigencias: Exigencias): void {
  const faltando: string[] = [];

  if (exigencias.idade) validarValor(dados.idade, 'Idade', faltando);
  if (exigencias.peso) validarValor(dados.peso, 'Peso', faltando);
  if (exigencias.altura) validarValor(dados.altura, 'Altura', faltando);
  if (exigencias.massaLivreGordura) {
    validarValor(dados.massaLivreGordura, 'Massa livre de gordura', faltando);
  }

  for (const dobra of exigencias.dobras ?? []) {
    validarValor(dados.dobras?.[dobra], `Dobra ${ROTULOS_DOBRA[dobra].toLowerCase()}`, faltando);
  }

  for (const circunferencia of exigencias.circunferencias ?? []) {
    validarValor(
      dados.circunferencias?.[circunferencia],
      `Circunferência ${ROTULOS_CIRCUNFERENCIA[circunferencia].toLowerCase()}`,
      faltando,
    );
  }

  if (faltando.length > 0) throw new MedidaFaltandoError(faltando);
}

/** Lê uma medida já validada. Usado depois de `validarDados`. */
export function obrigatorio(valor: number | undefined, rotulo: string): number {
  if (valor === undefined || !Number.isFinite(valor) || valor <= 0) {
    throw new MedidaInvalidaError(rotulo, valor);
  }
  return valor;
}
