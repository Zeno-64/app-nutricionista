import { describe, expect, it } from 'vitest';
import { paraPontoAvaliacao, pontosDaEvolucao, type LinhaDeAvaliacao } from './ponto';

function linha(campos: Partial<LinhaDeAvaliacao> = {}): LinhaDeAvaliacao {
  return {
    id: 'a1',
    data_avaliacao: '2026-03-01',
    substituida_por_id: null,
    peso: null,
    imc: null,
    percentual_gordura: null,
    massa_gorda: null,
    massa_livre_gordura: null,
    gasto_energetico_total: null,
    circ_pescoco: null,
    circ_braco: null,
    circ_cintura: null,
    circ_abdomen: null,
    circ_quadril: null,
    circ_coxa: null,
    circ_panturrilha: null,
    dobra_peitoral: null,
    dobra_axilar_media: null,
    dobra_triceps: null,
    dobra_biceps: null,
    dobra_subescapular: null,
    dobra_abdominal: null,
    dobra_supra_iliaca: null,
    dobra_coxa: null,
    dobra_panturrilha_medial: null,
    ...campos,
  };
}

describe('paraPontoAvaliacao', () => {
  it('leva as medidas do corpo para os nomes do domínio', () => {
    const ponto = paraPontoAvaliacao(
      linha({ peso: 72.4, imc: 24.9, percentual_gordura: 26.8, gasto_energetico_total: 1900 }),
    );
    expect(ponto).toMatchObject({
      id: 'a1',
      data: '2026-03-01',
      peso: 72.4,
      imc: 24.9,
      percentualGordura: 26.8,
      gastoEnergeticoTotal: 1900,
    });
  });

  it('a medida não tomada some do mapa, em vez de virar zero', () => {
    const ponto = paraPontoAvaliacao(linha({ circ_cintura: 78, dobra_triceps: 18 }));
    expect(ponto.circunferencias).toEqual({ cintura: 78 });
    expect(ponto.dobras).toEqual({ triceps: 18 });
    expect('quadril' in ponto.circunferencias).toBe(false);
  });

  // Zero é medida, ausência não é: a distinção some se a conversão usar `??`.
  it('zero é um valor medido e continua no mapa', () => {
    const ponto = paraPontoAvaliacao(linha({ dobra_abdominal: 0 }));
    expect(ponto.dobras).toEqual({ abdominal: 0 });
  });

  it('traduz cada dobra e cada circunferência para o nome certo', () => {
    const ponto = paraPontoAvaliacao(
      linha({
        circ_pescoco: 1,
        circ_braco: 2,
        circ_cintura: 3,
        circ_abdomen: 4,
        circ_quadril: 5,
        circ_coxa: 6,
        circ_panturrilha: 7,
        dobra_peitoral: 11,
        dobra_axilar_media: 12,
        dobra_triceps: 13,
        dobra_biceps: 14,
        dobra_subescapular: 15,
        dobra_abdominal: 16,
        dobra_supra_iliaca: 17,
        dobra_coxa: 18,
        dobra_panturrilha_medial: 19,
      }),
    );
    expect(ponto.circunferencias).toEqual({
      pescoco: 1,
      braco: 2,
      cintura: 3,
      abdomen: 4,
      quadril: 5,
      coxa: 6,
      panturrilha: 7,
    });
    expect(ponto.dobras).toEqual({
      peitoral: 11,
      axilarMedia: 12,
      triceps: 13,
      biceps: 14,
      subescapular: 15,
      abdominal: 16,
      supraIliaca: 17,
      coxa: 18,
      panturrilhaMedial: 19,
    });
  });
});

describe('pontosDaEvolucao', () => {
  // RN-02: a corrigida continua no banco, mas o gráfico mostra a que vale.
  it('deixa de fora a avaliação substituída por outra versão', () => {
    const pontos = pontosDaEvolucao([
      linha({ id: 'antiga', substituida_por_id: 'nova' }),
      linha({ id: 'nova' }),
    ]);
    expect(pontos.map((ponto) => ponto.id)).toEqual(['nova']);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(pontosDaEvolucao([])).toEqual([]);
  });
});
