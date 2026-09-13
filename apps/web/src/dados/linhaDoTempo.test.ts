import { montarLinhaDoTempo } from './linhaDoTempo.js';
import type { Anamnese, Avaliacao } from './tipos.js';

function avaliacao(ajustes: Partial<Avaliacao>): Avaliacao {
  return {
    id: 'a1',
    tenant_id: 't1',
    paciente_id: 'p1',
    data_avaliacao: '2026-09-01',
    status: 'finalizada',
    versao: 1,
    substituida_por_id: null,
    liberada_em: null,
    peso: 68.4,
    altura: 165,
    imc: 25.12,
    imc_classificacao: 'Sobrepeso',
    rcq: null,
    rce: null,
    protocolo_composicao: null,
    percentual_gordura: null,
    massa_gorda: null,
    massa_livre_gordura: null,
    formula_energia: null,
    formula_resulta_em: null,
    fator_atividade: null,
    tmb: null,
    gasto_energetico_total: null,
    meta_calorica: null,
    origem: 'local',
    ...ajustes,
  };
}

function anamnese(ajustes: Partial<Anamnese>): Anamnese {
  return {
    id: 'n1',
    tenant_id: 't1',
    paciente_id: 'p1',
    tipo: 'anamnese',
    status: 'finalizada',
    versao: 1,
    data_registro: '2026-08-01',
    enviada_em: null,
    respondida_em: null,
    finalizada_em: null,
    origem: 'local',
    ...ajustes,
  };
}

describe('linha do tempo do paciente (RF-13)', () => {
  it('ordena do mais recente para o mais antigo', () => {
    const itens = montarLinhaDoTempo(
      [avaliacao({ id: 'a1', data_avaliacao: '2026-06-01' }), avaliacao({ id: 'a2', data_avaliacao: '2026-09-01' })],
      [anamnese({ data_registro: '2026-07-01' })],
    );
    expect(itens.map((i) => i.id)).toEqual(['a2', 'n1', 'a1']);
  });

  it('esconde a versão que já foi substituída, sem perder a vigente (RN-02)', () => {
    const itens = montarLinhaDoTempo(
      [
        avaliacao({ id: 'a1', substituida_por_id: 'a2' }),
        avaliacao({ id: 'a2', versao: 2 }),
      ],
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
    const itens = montarLinhaDoTempo(
      [],
      [anamnese({ tipo: 'pre_consulta', status: 'rascunho', enviada_em: '2026-09-01T10:00:00Z' })],
    );
    expect(itens[0]?.titulo).toBe('Pré-consulta');
    expect(itens[0]?.detalhe).toBe('Aguardando resposta do paciente');
  });

  it('mantém a marca de origem dos registros importados (RN-07)', () => {
    const itens = montarLinhaDoTempo([avaliacao({ origem: 'nutrio' })], []);
    expect(itens[0]?.origem).toBe('nutrio');
  });
});
