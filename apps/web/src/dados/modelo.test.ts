import {
  adicionarPergunta,
  adicionarSecao,
  alterarPergunta,
  duplicar,
  modeloVazio,
  mover,
  moverPergunta,
  moverSecao,
  paraEditor,
  paraPayload,
  perguntaVazia,
  removerPergunta,
  removerSecao,
  renomearSecao,
  validarModelo,
  type ModeloEditor,
} from './modelo';

function modelo(): ModeloEditor {
  return {
    id: 'mod1',
    nome: 'Anamnese padrão',
    descricao: '',
    tipo: 'anamnese',
    ativo: true,
    padrao: true,
    secoes: [
      {
        id: 's1',
        titulo: 'Objetivos',
        perguntas: [
          { ...perguntaVazia(), id: 'p1', enunciado: 'Qual é o seu objetivo?' },
          { ...perguntaVazia(), id: 'p2', enunciado: 'O que já tentou antes?' },
        ],
      },
      {
        id: 's2',
        titulo: 'Rotina',
        perguntas: [{ ...perguntaVazia(), id: 'p3', enunciado: 'Quem cozinha na sua casa?' }],
      },
    ],
  };
}

describe('mover item de lista', () => {
  it('leva o item para a posição pedida', () => {
    expect(mover(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(mover(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('não mexe quando origem e destino são iguais', () => {
    expect(mover(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('ignora posição fora da lista, em vez de estragar a ordem', () => {
    expect(mover(['a', 'b', 'c'], 0, 9)).toEqual(['a', 'b', 'c']);
    expect(mover(['a', 'b', 'c'], -1, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('edição da árvore do modelo', () => {
  it('move seção e pergunta sem perder nada', () => {
    const movido = moverSecao(modelo(), 1, 0);
    expect(movido.secoes.map((s) => s.id)).toEqual(['s2', 's1']);

    const reordenado = moverPergunta(modelo(), 0, 1, 0);
    expect(reordenado.secoes[0]?.perguntas.map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(reordenado.secoes[1]?.perguntas.map((p) => p.id)).toEqual(['p3']);
  });

  it('não altera o modelo original', () => {
    const original = modelo();
    moverSecao(original, 1, 0);
    expect(original.secoes.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('adiciona e remove seção, mas nunca fica sem nenhuma', () => {
    expect(adicionarSecao(modelo()).secoes).toHaveLength(3);
    expect(removerSecao(modelo(), 0).secoes.map((s) => s.id)).toEqual(['s2']);

    const comUmaSo = { ...modelo(), secoes: [modelo().secoes[0]!] };
    expect(removerSecao(comUmaSo, 0).secoes).toHaveLength(1);
  });

  it('renomeia a seção certa', () => {
    const renomeado = renomearSecao(modelo(), 1, 'Dia a dia');
    expect(renomeado.secoes.map((s) => s.titulo)).toEqual(['Objetivos', 'Dia a dia']);
  });

  it('adiciona e remove pergunta dentro da seção', () => {
    expect(adicionarPergunta(modelo(), 1).secoes[1]?.perguntas).toHaveLength(2);
    expect(removerPergunta(modelo(), 0, 0).secoes[0]?.perguntas.map((p) => p.id)).toEqual(['p2']);
  });

  it('limpa as alternativas quando a pergunta deixa de ser múltipla escolha', () => {
    const comOpcoes = alterarPergunta(modelo(), 0, 0, {
      tipo: 'multipla_escolha',
      opcoes: ['Sim', 'Não', 'Às vezes'],
    });
    expect(comOpcoes.secoes[0]?.perguntas[0]?.opcoes).toHaveLength(3);

    const virouTexto = alterarPergunta(comOpcoes, 0, 0, { tipo: 'texto_longo' });
    expect(virouTexto.secoes[0]?.perguntas[0]?.opcoes).toEqual([]);
  });
});

describe('validação do modelo (RF-20)', () => {
  it('aceita um modelo bem formado', () => {
    expect(validarModelo(modelo())).toEqual([]);
  });

  it('cobra nome, título de seção e enunciado', () => {
    const quebrado: ModeloEditor = {
      ...modelo(),
      nome: '  ',
      secoes: [{ id: null, titulo: '', perguntas: [perguntaVazia()] }],
    };
    const erros = validarModelo(quebrado).map((e) => e.mensagem);
    expect(erros).toContain('Dê um nome ao modelo.');
    expect(erros).toContain('A seção precisa de um título.');
    expect(erros).toContain('Escreva o enunciado da pergunta.');
  });

  it('exige pelo menos uma pergunta no modelo inteiro', () => {
    const semPerguntas: ModeloEditor = {
      ...modelo(),
      secoes: [{ id: 's1', titulo: 'Objetivos', perguntas: [] }],
    };
    expect(validarModelo(semPerguntas).map((e) => e.mensagem)).toContain(
      'O modelo precisa de pelo menos uma pergunta.',
    );
  });

  it('exige duas alternativas na múltipla escolha e recusa repetidas', () => {
    const umaSo = alterarPergunta(modelo(), 0, 0, {
      tipo: 'multipla_escolha',
      opcoes: ['Sim'],
    });
    expect(validarModelo(umaSo).map((e) => e.mensagem)).toContain(
      'Múltipla escolha precisa de pelo menos duas alternativas.',
    );

    const repetidas = alterarPergunta(modelo(), 0, 0, {
      tipo: 'multipla_escolha',
      opcoes: ['Sim', 'Sim ', 'Não'],
    });
    expect(validarModelo(repetidas).map((e) => e.mensagem)).toContain('Há alternativas repetidas.');
  });

  it('recusa condição sem critério (RF-22)', () => {
    const semCriterio = alterarPergunta(modelo(), 0, 0, {
      condicao: { campo: 'sexo' },
    });
    expect(validarModelo(semCriterio)[0]?.mensagem).toContain('A condição está sem critério');
  });

  it('aceita a condição do modelo padrão', () => {
    const comCondicao = alterarPergunta(modelo(), 0, 0, {
      condicao: { campo: 'sexo', igual: 'feminino' },
    });
    expect(validarModelo(comCondicao)).toEqual([]);
  });

  it('diz onde está cada problema', () => {
    const quebrado = alterarPergunta(modelo(), 1, 0, { enunciado: '' });
    expect(validarModelo(quebrado)[0]?.onde).toBe('Rotina, pergunta 1');
  });
});

describe('conversão para o banco', () => {
  it('numera seção e pergunta pela posição na tela', () => {
    const payload = paraPayload(moverSecao(modelo(), 1, 0), 't1') as {
      secoes: Array<{ id: string | null; ordem: number; perguntas: Array<{ ordem: number }> }>;
    };
    expect(payload.secoes.map((s) => [s.id, s.ordem])).toEqual([
      ['s2', 1],
      ['s1', 2],
    ]);
    expect(payload.secoes[1]?.perguntas.map((p) => p.ordem)).toEqual([1, 2]);
  });

  it('leva o tenant e apara os espaços', () => {
    const payload = paraPayload({ ...modelo(), nome: '  Anamnese  ' }, 't1') as Record<string, unknown>;
    expect(payload.tenant_id).toBe('t1');
    expect(payload.nome).toBe('Anamnese');
  });

  it('manda descrição vazia como null', () => {
    expect((paraPayload({ ...modelo(), descricao: '   ' }, 't1') as Record<string, unknown>).descricao)
      .toBeNull();
  });

  it('só manda alternativas em múltipla escolha, e sem as vazias', () => {
    const comOpcoes = alterarPergunta(modelo(), 0, 0, {
      tipo: 'multipla_escolha',
      opcoes: ['Sim', '  ', 'Não'],
    });
    const payload = paraPayload(comOpcoes, 't1') as {
      secoes: Array<{ perguntas: Array<{ opcoes: string[] | null }> }>;
    };
    expect(payload.secoes[0]?.perguntas[0]?.opcoes).toEqual(['Sim', 'Não']);
    expect(payload.secoes[0]?.perguntas[1]?.opcoes).toBeNull();
  });
});

describe('ida e volta com o banco', () => {
  it('remonta o editor na ordem gravada, agrupando por seção', () => {
    const editor = paraEditor(
      { id: 'mod1', nome: 'Anamnese', descricao: null, tipo: 'anamnese', ativo: true, padrao: true },
      [
        { id: 's2', ordem: 2, titulo: 'Rotina' },
        { id: 's1', ordem: 1, titulo: 'Objetivos' },
      ],
      [
        { id: 'p3', secao_id: 's2', ordem: 1, enunciado: 'C', tipo: 'texto_longo', opcoes: null, obrigatoria: false, condicao: null },
        { id: 'p2', secao_id: 's1', ordem: 2, enunciado: 'B', tipo: 'texto_longo', opcoes: null, obrigatoria: false, condicao: null },
        { id: 'p1', secao_id: 's1', ordem: 1, enunciado: 'A', tipo: 'texto_longo', opcoes: null, obrigatoria: false, condicao: null },
      ],
    );

    expect(editor.secoes.map((s) => s.titulo)).toEqual(['Objetivos', 'Rotina']);
    expect(editor.secoes[0]?.perguntas.map((p) => p.enunciado)).toEqual(['A', 'B']);
    expect(editor.secoes[1]?.perguntas.map((p) => p.enunciado)).toEqual(['C']);
    expect(editor.descricao).toBe('');
  });
});

describe('duplicar modelo', () => {
  it('zera os ids, para tudo entrar como registro novo', () => {
    const copia = duplicar(modelo(), 'Anamnese — atletas');

    expect(copia.id).toBeNull();
    expect(copia.nome).toBe('Anamnese — atletas');
    expect(copia.padrao).toBe(false);
    expect(copia.secoes.every((s) => s.id === null)).toBe(true);
    expect(copia.secoes.every((s) => s.perguntas.every((p) => p.id === null))).toBe(true);
    expect(copia.secoes[0]?.perguntas[0]?.enunciado).toBe('Qual é o seu objetivo?');
  });
});

describe('modelo em branco', () => {
  it('já nasce com uma seção e uma pergunta, para não abrir tela vazia', () => {
    const novo = modeloVazio('pre_consulta');
    expect(novo.tipo).toBe('pre_consulta');
    expect(novo.secoes).toHaveLength(1);
    expect(novo.secoes[0]?.perguntas).toHaveLength(1);
  });
});
