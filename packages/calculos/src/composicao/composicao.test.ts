import { FormulaIndisponivelError, MedidaFaltandoError } from '../erros.js';
import { arredondar } from '../numeros.js';
import type { DadosAvaliacao } from '../tipos.js';
import { validarDados } from '../validacao.js';
import { calcularComposicao, protocolosAtendidos } from './calcular.js';
import { derivarMassas, percentualPelaMassaLivre } from './massas.js';
import { PROTOCOLOS_COMPOSICAO, coeficientesDurnin, obterProtocolo } from './protocolos.js';
import { converterSiri } from './siri.js';

const HOMEM: DadosAvaliacao = {
  sexo: 'masculino',
  idade: 30,
  peso: 80,
  altura: 178,
  dobras: {
    biceps: 5,
    triceps: 10,
    subescapular: 12,
    supraIliaca: 15,
    panturrilhaMedial: 8,
  },
};

describe('catálogo de protocolos (§4.5)', () => {
  it('traz as oito opções da lista de requisitos, incluindo "Nenhum"', () => {
    expect(PROTOCOLOS_COMPOSICAO.map((p) => p.id)).toEqual([
      'nenhum',
      'pollock3',
      'pollock7',
      'faulkner',
      'guedes',
      'petroski',
      'durnin_womersley',
      'weltman',
    ]);
  });

  it('declara medidas diferentes por sexo onde o protocolo pede', () => {
    const pollock3 = obterProtocolo('pollock3');
    expect(pollock3.exigencias('masculino').dobras).toEqual(['peitoral', 'abdominal', 'coxa']);
    expect(pollock3.exigencias('feminino').dobras).toEqual(['triceps', 'supraIliaca', 'coxa']);
  });

  it('marca Weltman como protocolo sem dobras', () => {
    const weltman = obterProtocolo('weltman');
    expect(weltman.exigencias('masculino').dobras).toBeUndefined();
    expect(weltman.exigencias('masculino').circunferencias).toEqual(['abdomen']);
  });
});

describe('portão de verificação (RN-06)', () => {
  it('devolve null no protocolo "Nenhum"', () => {
    expect(calcularComposicao('nenhum', HOMEM)).toBeNull();
  });

  it.each(
    PROTOCOLOS_COMPOSICAO.filter((p) => p.status === 'pendente' || p.status === 'parcial').map(
      (p) => [p.id, p.status] as const,
    ),
  )('recusa o cálculo de %s enquanto o status for %s', (id) => {
    expect(() => calcularComposicao(id, HOMEM)).toThrow(FormulaIndisponivelError);
  });

  it('explica o motivo da recusa na mensagem', () => {
    expect(() => calcularComposicao('pollock7', HOMEM)).toThrow(/fonte primária/);
  });
});

describe('validação de medidas (RF-33)', () => {
  it('reporta de uma vez todas as dobras que faltam', () => {
    const exigencias = obterProtocolo('pollock7').exigencias('masculino');
    try {
      validarDados(HOMEM, exigencias);
      expect.unreachable('deveria ter recusado');
    } catch (erro) {
      expect(erro).toBeInstanceOf(MedidaFaltandoError);
      expect((erro as MedidaFaltandoError).medidas).toEqual([
        'Dobra peitoral',
        'Dobra axilar média',
        'Dobra abdominal',
        'Dobra coxa',
      ]);
    }
  });

  it('lista os protocolos que as medidas já registradas atendem', () => {
    expect(protocolosAtendidos(HOMEM)).toEqual(['petroski', 'durnin_womersley']);
  });
});

describe('Siri (1961)', () => {
  it('converte densidade em percentual de gordura', () => {
    expect(arredondar(converterSiri(1.05).percentualGordura, 2)).toBe(21.43);
  });
});

describe('massa gorda e massa livre de gordura (RF-35)', () => {
  it('deriva as massas do peso e do percentual', () => {
    const { massaGorda, massaLivreGordura } = derivarMassas(80, 20);
    expect(massaGorda).toBe(16);
    expect(massaLivreGordura).toBe(64);
  });

  it('faz o caminho inverso a partir da bioimpedância (RF-36)', () => {
    expect(percentualPelaMassaLivre(80, 64)).toBe(20);
  });
});

describe('coeficientes de Durnin & Womersley por faixa etária', () => {
  it.each([
    [16, 1.1533],
    [18, 1.162],
    [25, 1.1631],
    [35, 1.1422],
    [45, 1.162],
    [60, 1.1715],
  ])('usa a faixa certa para %s anos (homens)', (idade, c) => {
    expect(coeficientesDurnin(idade, 'masculino').c).toBe(c);
  });
});
