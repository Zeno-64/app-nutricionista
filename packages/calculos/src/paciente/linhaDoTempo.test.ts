import {
  montarLinhaDoTempo,
  type AnamneseDaLinhaDoTempo,
  type AvaliacaoDaLinhaDoTempo,
} from './linhaDoTempo';

function avaliacao(ajustes: Partial<AvaliacaoDaLinhaDoTempo>): AvaliacaoDaLinhaDoTempo {
  return {
    id: 'a1',
    data_avaliacao: '2026-09-01',
    status: 'finalizada',
    versao: 1,
    substituida_por_id: null,
    peso: 68.4,
    imc: 25.12,
    percentual_gordura: null,
    gasto_energetico_total: null,
    origem: 'local',
    ...ajustes,
  };
}

function anamnese(ajustes: Partial<AnamneseDaLinhaDoTempo>): AnamneseDaLinhaDoTempo {
  return {
    id: 'n1',
    tipo: 'anamnese',
    status: 'finalizada',
    data_registro: '2026-08-01',
    respondida_em: null,
    origem: 'local',
    ...ajustes,
  };
}

describe('linha do tempo do paciente (RF-13)', () => {
  it('ordena do mais recente para o mais antigo', () => {
    const itens = montarLinhaDoTempo(
      [
        avaliacao({ id: 'a1', data_avaliacao: '2026-06-01' }),
        avaliacao({ id: 'a2', data_avaliacao: '2026-09-01' }),
      ],
      [anamnese({ data_registro: '2026-07-01' })],
    );
    expect(itens.map((i) => i.id)).toEqual(['a2', 'n1', 'a1']);
  });

  it('esconde a versão que já foi substituída, sem perder a vigente (RN-02)', () => {
    const itens = montarLinhaDoTempo(
      [avaliacao({ id: 'a1', substituida_por_id: 'a2' }), avaliacao({ id: 'a2', versao: 2 })],
      [],
    );
    expect(itens.map((i) => i.id)).toEqual(['a2']);
    expect(itens[0]?.titulo).toBe('Avaliação (versão 2)');
  });

  it('resume as medidas da avaliação', () => {
    const itens = montarLinhaDoTempo([avaliacao({ gasto_energetico_total: 1925 })], []);
    expect(itens[0]?.detalhe).toBe('68,4 kg · IMC 25,1 · GET 1.925 kcal');
  });

  it('marca a pré-consulta que o paciente ainda não respondeu', () => {
    const itens = montarLinhaDoTempo([], [anamnese({ tipo: 'pre_consulta', status: 'rascunho' })]);
    expect(itens[0]?.titulo).toBe('Pré-consulta');
    expect(itens[0]?.detalhe).toBe('Aguardando resposta do paciente');
  });

  it('não cobra resposta da pré-consulta que o paciente já respondeu', () => {
    const itens = montarLinhaDoTempo(
      [],
      [anamnese({ tipo: 'pre_consulta', respondida_em: '2026-08-02T10:00:00Z' })],
    );
    expect(itens[0]?.detalhe).toBeNull();
  });

  it('mantém a marca de origem dos registros importados (RN-07)', () => {
    const itens = montarLinhaDoTempo([avaliacao({ origem: 'nutrio' })], []);
    expect(itens[0]?.origem).toBe('nutrio');
  });

  it('desempata pelo título quando a data é a mesma', () => {
    const itens = montarLinhaDoTempo(
      [avaliacao({ id: 'a1', data_avaliacao: '2026-08-01' })],
      [anamnese({ id: 'n1', data_registro: '2026-08-01' })],
    );
    expect(itens.map((i) => i.titulo)).toEqual(['Anamnese', 'Avaliação']);
  });

  it('põe o anexo na data de referência, e no envio quando não há', () => {
    const itens = montarLinhaDoTempo([], [], [
      {
        id: 'x1',
        categoria: 'exame',
        nome_arquivo: 'hemograma.pdf',
        data_referencia: '2026-07-15',
        criado_em: '2026-09-10T12:00:00Z',
      },
      {
        id: 'x2',
        categoria: 'foto_evolucao',
        nome_arquivo: 'frente.jpg',
        data_referencia: null,
        criado_em: '2026-09-10T12:00:00Z',
      },
    ]);
    expect(itens.map((i) => [i.titulo, i.data])).toEqual([
      ['Foto de evolução', '2026-09-10'],
      ['Exame', '2026-07-15'],
    ]);
  });
});
