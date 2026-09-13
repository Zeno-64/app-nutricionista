import { FormulaIndisponivelError } from '../erros';
import type { DadosAvaliacao, MemoriaCalculo } from '../tipos';
import { podeCalcular } from '../tipos';
import { validarDados } from '../validacao';
import { derivarMassas } from './massas';
import type { ProtocoloId } from './protocolos';
import { PROTOCOLOS_COMPOSICAO, obterProtocolo } from './protocolos';
import { SIRI, converterSiri } from './siri';

export interface ResultadoComposicaoCorporal {
  protocolo: ProtocoloId;
  /** g/cm³, quando o protocolo passa por densidade. */
  densidadeCorporal: number | null;
  /** %. */
  percentualGordura: number;
  /** kg; só quando o peso foi informado. */
  massaGorda: number | null;
  /** kg; só quando o peso foi informado. */
  massaLivreGordura: number | null;
  /** Memórias na ordem em que os cálculos aconteceram (RF-38). */
  memorias: MemoriaCalculo[];
}

/**
 * Calcula a composição corporal pelo protocolo escolhido (RF-32 a RF-35).
 *
 * Devolve `null` para o protocolo "Nenhum". Recusa o cálculo, com
 * `FormulaIndisponivelError`, enquanto o protocolo — ou a conversão de Siri de
 * que ele depende — não estiver conferido na fonte primária (RN-06).
 */
export function calcularComposicao(
  id: ProtocoloId,
  dados: DadosAvaliacao,
): ResultadoComposicaoCorporal | null {
  const protocolo = obterProtocolo(id);

  if (protocolo.resultado === 'nenhum') return null;

  if (!podeCalcular(protocolo.status) || protocolo.calcular === null) {
    throw new FormulaIndisponivelError(protocolo.id, protocolo.nome, protocolo.status);
  }

  validarDados(dados, protocolo.exigencias(dados.sexo));

  const saida = protocolo.calcular(dados);
  const memorias: MemoriaCalculo[] = [saida.memoria];

  let densidadeCorporal: number | null = null;
  let percentualGordura: number;

  if (saida.densidadeCorporal !== undefined) {
    // RF-34: densidade vira percentual pela equação de Siri, que tem portão próprio.
    if (!podeCalcular(SIRI.status)) {
      throw new FormulaIndisponivelError('siri', SIRI.nome, SIRI.status);
    }
    densidadeCorporal = saida.densidadeCorporal;
    const siri = converterSiri(densidadeCorporal);
    percentualGordura = siri.percentualGordura;
    memorias.push(siri.memoria);
  } else if (saida.percentualGordura !== undefined) {
    percentualGordura = saida.percentualGordura;
  } else {
    throw new Error(
      `Protocolo "${protocolo.nome}" não devolveu densidade nem percentual de gordura.`,
    );
  }

  let massaGorda: number | null = null;
  let massaLivreGordura: number | null = null;

  if (dados.peso !== undefined) {
    const massas = derivarMassas(dados.peso, percentualGordura);
    massaGorda = massas.massaGorda;
    massaLivreGordura = massas.massaLivreGordura;
    memorias.push(massas.memoria);
  }

  return {
    protocolo: protocolo.id,
    densidadeCorporal,
    percentualGordura,
    massaGorda,
    massaLivreGordura,
    memorias,
  };
}

/**
 * Protocolos compatíveis com as medidas já registradas, para a interface poder
 * indicar quais dá para usar sem pedir medida nova (RF-33).
 */
export function protocolosAtendidos(dados: DadosAvaliacao): ProtocoloId[] {
  return PROTOCOLOS_COMPOSICAO.filter((protocolo) => {
    if (protocolo.resultado === 'nenhum') return false;
    try {
      validarDados(dados, protocolo.exigencias(dados.sexo));
      return true;
    } catch {
      return false;
    }
  }).map((protocolo) => protocolo.id);
}
