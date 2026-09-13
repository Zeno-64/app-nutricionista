import {
  agruparPorSecao,
  compararVersoes,
  montarRespostas,
  pendencias,
  perguntaSeAplica,
  respondida,
  valorEmTexto,
  type ContextoPaciente,
  type PerguntaModelo,
  type RespostaAnamnese,
  type SecaoModelo,
} from './anamnese.js';

const SECOES: SecaoModelo[] = [
  { id: 's2', ordem: 2, titulo: 'Rotina' },
  { id: 's1', ordem: 1, titulo: 'Objetivos' },
];

function pergunta(ajustes: Partial<PerguntaModelo> & { id: string }): PerguntaModelo {
  return {
    secao_id: 's1',
    ordem: 1,
    enunciado: 'Pergunta',
    tipo: 'texto_longo',
    opcoes: null,
    obrigatoria: false,
    condicao: null,
    ...ajustes,
  };
}

function resposta(ajustes: Partial<RespostaAnamnese> & { id: string }): RespostaAnamnese {
  return {
    anamnese_id: 'a1',
    pergunta_id: null,
    ordem: 1,
    secao_titulo: 'Objetivos',
    enunciado: 'Pergunta',
    tipo: 'texto_longo',
    opcoes: null,
    valor: null,
    ...ajustes,
  };
}

const MULHER: ContextoPaciente = { sexo: 'feminino', grupos: ['adulto'] };
const HOMEM: ContextoPaciente = { sexo: 'masculino', grupos: ['adulto'] };

describe('pergunta condicional (RF-22)', () => {
  it('sem condição, sempre aparece', () => {
    expect(perguntaSeAplica(null, HOMEM)).toBe(true);
  });

  it('aplica a condição de ciclo menstrual do modelo padrão', () => {
    const condicao = { campo: 'sexo' as const, igual: 'feminino' };
    expect(perguntaSeAplica(condicao, MULHER)).toBe(true);
    expect(perguntaSeAplica(condicao, HOMEM)).toBe(false);
  });

  it('não arrisca quando o cadastro não tem o dado', () => {
    expect(perguntaSeAplica({ campo: 'sexo', igual: 'feminino' }, { sexo: null, grupos: [] }))
      .toBe(false);
  });

  it('entende diferente e em', () => {
    expect(perguntaSeAplica({ campo: 'sexo', diferente: 'masculino' }, MULHER)).toBe(true);
    expect(
      perguntaSeAplica({ campo: 'grupo', em: ['gestante', 'lactante'] }, {
        sexo: 'feminino',
        grupos: ['gestante'],
      }),
    ).toBe(true);
    expect(perguntaSeAplica({ campo: 'grupo', em: ['atleta'] }, MULHER)).toBe(false);
  });
});

describe('montagem das respostas a partir do modelo', () => {
  const PERGUNTAS: PerguntaModelo[] = [
    pergunta({ id: 'p3', secao_id: 's2', ordem: 1, enunciado: 'Quem cozinha na sua casa?' }),
    pergunta({ id: 'p1', secao_id: 's1', ordem: 1, enunciado: 'Qual é o seu objetivo?' }),
    pergunta({
      id: 'p2',
      secao_id: 's1',
      ordem: 2,
      enunciado: 'Ciclo menstrual?',
      condicao: { campo: 'sexo', igual: 'feminino' },
    }),
  ];

  it('ordena por seção e depois por pergunta, numerando de forma contínua', () => {
    const criadas = montarRespostas(SECOES, PERGUNTAS, MULHER);
    expect(criadas.map((r) => [r.ordem, r.pergunta_id])).toEqual([
      [1, 'p1'],
      [2, 'p2'],
      [3, 'p3'],
    ]);
  });

  it('pula a pergunta que não se aplica e mantém a numeração sem buraco', () => {
    const criadas = montarRespostas(SECOES, PERGUNTAS, HOMEM);
    expect(criadas.map((r) => [r.ordem, r.pergunta_id])).toEqual([
      [1, 'p1'],
      [2, 'p3'],
    ]);
  });

  it('copia enunciado e seção, para a anamnese não depender do modelo depois (RN-02)', () => {
    const [primeira] = montarRespostas(SECOES, PERGUNTAS, MULHER);
    expect(primeira?.enunciado).toBe('Qual é o seu objetivo?');
    expect(primeira?.secao_titulo).toBe('Objetivos');
    expect(primeira?.tipo).toBe('texto_longo');
  });

  it('copia as alternativas da múltipla escolha junto (RN-02)', () => {
    const criadas = montarRespostas(
      [{ id: 's1', ordem: 1, titulo: 'Objetivos' }],
      [
        pergunta({
          id: 'p1',
          tipo: 'multipla_escolha',
          opcoes: ['Café', 'Chá', 'Nenhum'],
          enunciado: 'O que você bebe de manhã?',
        }),
      ],
      MULHER,
    );
    expect(criadas[0]?.opcoes).toEqual(['Café', 'Chá', 'Nenhum']);
  });
});

describe('agrupamento por seção', () => {
  it('junta as respostas seguidas da mesma seção', () => {
    const grupos = agruparPorSecao([
      resposta({ id: 'r2', ordem: 2, secao_titulo: 'Objetivos' }),
      resposta({ id: 'r3', ordem: 3, secao_titulo: 'Rotina' }),
      resposta({ id: 'r1', ordem: 1, secao_titulo: 'Objetivos' }),
    ]);
    expect(grupos.map((g) => [g.secao, g.respostas.length])).toEqual([
      ['Objetivos', 2],
      ['Rotina', 1],
    ]);
  });
});

describe('resposta preenchida', () => {
  it.each([
    [null, false],
    ['', false],
    ['   ', false],
    ['Nenhuma', true],
    [0, true],
    [false, true],
    [[], false],
    [['a'], true],
  ])('valor %j conta como respondida: %s', (valor, esperado) => {
    expect(respondida(resposta({ id: 'r1', valor }))).toBe(esperado);
  });

  it('lista as obrigatórias que ainda faltam', () => {
    const faltando = pendencias(
      [
        resposta({ id: 'r1', pergunta_id: 'p1', valor: null }),
        resposta({ id: 'r2', pergunta_id: 'p2', valor: 'ok' }),
        resposta({ id: 'r3', pergunta_id: 'p3', valor: null }),
      ],
      new Set(['p1', 'p2']),
    );
    expect(faltando.map((r) => r.pergunta_id)).toEqual(['p1']);
  });
});

describe('valor em texto', () => {
  it.each([
    [{ tipo: 'sim_nao' as const, valor: true }, 'Sim'],
    [{ tipo: 'sim_nao' as const, valor: false }, 'Não'],
    [{ tipo: 'data' as const, valor: '2026-09-13' }, '13/09/2026'],
    [{ tipo: 'escala_0_10' as const, valor: 7 }, '7'],
    [{ tipo: 'multipla_escolha' as const, valor: ['Café', 'Chá'] }, 'Café, Chá'],
    [{ tipo: 'texto_longo' as const, valor: null }, ''],
  ])('formata %j como %s', (ajustes, esperado) => {
    expect(valorEmTexto(resposta({ id: 'r1', ...ajustes }))).toBe(esperado);
  });
});

describe('comparação com a anamnese anterior (RF-26)', () => {
  it('emparelha pela pergunta e marca o que mudou', () => {
    const comparacao = compararVersoes(
      [
        resposta({ id: 'a', pergunta_id: 'p1', ordem: 1, enunciado: 'Sono?', valor: 'Ruim' }),
        resposta({ id: 'b', pergunta_id: 'p2', ordem: 2, enunciado: 'Intestino?', valor: 'Bom' }),
      ],
      [
        resposta({ id: 'x', pergunta_id: 'p1', ordem: 1, enunciado: 'Sono?', valor: 'Bom' }),
        resposta({ id: 'y', pergunta_id: 'p2', ordem: 2, enunciado: 'Intestino?', valor: 'Bom' }),
      ],
    );
    expect(comparacao).toEqual([
      { enunciado: 'Sono?', atual: 'Ruim', anterior: 'Bom', mudou: true },
      { enunciado: 'Intestino?', atual: 'Bom', anterior: 'Bom', mudou: false },
    ]);
  });

  it('cai no enunciado quando não há pergunta em comum, como em registro importado', () => {
    const comparacao = compararVersoes(
      [resposta({ id: 'a', pergunta_id: 'p1', enunciado: 'Sono?', valor: 'Ruim' })],
      [resposta({ id: 'x', pergunta_id: null, enunciado: 'Sono?', valor: 'Bom' })],
    );
    expect(comparacao[0]).toEqual({
      enunciado: 'Sono?',
      atual: 'Ruim',
      anterior: 'Bom',
      mudou: true,
    });
  });

  it('marca como sem par a pergunta que não existia antes', () => {
    const comparacao = compararVersoes(
      [resposta({ id: 'a', pergunta_id: 'p9', enunciado: 'Nova pergunta', valor: 'Sim' })],
      [],
    );
    expect(comparacao[0]?.anterior).toBeNull();
    expect(comparacao[0]?.mudou).toBe(false);
  });
});
