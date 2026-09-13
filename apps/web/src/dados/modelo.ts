import type { CondicaoPergunta } from './anamnese';
import type { TipoFormulario, TipoPergunta } from './tipos';

/**
 * Edição de modelos de anamnese e de pré-consulta (RF-20, RF-22, RF-27).
 *
 * O modelo inteiro é editado em memória e gravado de uma vez: seção e pergunta
 * não existem soltas, e salvar pela metade deixaria o formulário quebrado. Por
 * isso tudo aqui é função pura sobre uma árvore, e a gravação é uma chamada só
 * (`salvar_modelo_formulario`, no banco).
 */

export interface PerguntaEditor {
  /** `null` enquanto a pergunta ainda não existe no banco. */
  id: string | null;
  enunciado: string;
  tipo: TipoPergunta;
  opcoes: string[];
  obrigatoria: boolean;
  condicao: CondicaoPergunta | null;
}

export interface SecaoEditor {
  id: string | null;
  titulo: string;
  perguntas: PerguntaEditor[];
}

export interface ModeloEditor {
  id: string | null;
  nome: string;
  descricao: string;
  tipo: TipoFormulario;
  ativo: boolean;
  padrao: boolean;
  secoes: SecaoEditor[];
}

export const ROTULOS_TIPO_PERGUNTA: Readonly<Record<TipoPergunta, string>> = {
  texto_longo: 'Texto longo',
  texto_curto: 'Texto curto',
  numero: 'Número',
  sim_nao: 'Sim ou não',
  multipla_escolha: 'Múltipla escolha',
  escala_0_10: 'Escala de 0 a 10',
  data: 'Data',
};

export const TIPOS_DE_PERGUNTA = Object.keys(ROTULOS_TIPO_PERGUNTA) as TipoPergunta[];

export function perguntaVazia(): PerguntaEditor {
  return {
    id: null,
    enunciado: '',
    tipo: 'texto_longo',
    opcoes: [],
    obrigatoria: false,
    condicao: null,
  };
}

export function secaoVazia(titulo = 'Nova seção'): SecaoEditor {
  return { id: null, titulo, perguntas: [perguntaVazia()] };
}

export function modeloVazio(tipo: TipoFormulario): ModeloEditor {
  return {
    id: null,
    nome: tipo === 'pre_consulta' ? 'Pré-consulta' : 'Anamnese',
    descricao: '',
    tipo,
    ativo: true,
    padrao: false,
    secoes: [secaoVazia(tipo === 'pre_consulta' ? 'Pré-consulta' : 'Anamnese')],
  };
}

// ---------------------------------------------------------------------------
// Movimentação
// ---------------------------------------------------------------------------

/** Move um item de posição. Fora dos limites, devolve a lista como estava. */
export function mover<T>(lista: readonly T[], de: number, para: number): T[] {
  if (de === para) return [...lista];
  if (de < 0 || de >= lista.length || para < 0 || para >= lista.length) return [...lista];

  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item as T);
  return copia;
}

export function moverSecao(modelo: ModeloEditor, de: number, para: number): ModeloEditor {
  return { ...modelo, secoes: mover(modelo.secoes, de, para) };
}

export function moverPergunta(
  modelo: ModeloEditor,
  secao: number,
  de: number,
  para: number,
): ModeloEditor {
  return alterarSecao(modelo, secao, (atual) => ({
    ...atual,
    perguntas: mover(atual.perguntas, de, para),
  }));
}

// ---------------------------------------------------------------------------
// Edição
// ---------------------------------------------------------------------------

function alterarSecao(
  modelo: ModeloEditor,
  indice: number,
  mudanca: (secao: SecaoEditor) => SecaoEditor,
): ModeloEditor {
  return {
    ...modelo,
    secoes: modelo.secoes.map((secao, i) => (i === indice ? mudanca(secao) : secao)),
  };
}

export function adicionarSecao(modelo: ModeloEditor): ModeloEditor {
  return { ...modelo, secoes: [...modelo.secoes, secaoVazia()] };
}

/** A última seção não sai: um modelo sem seção não tem onde pôr pergunta. */
export function removerSecao(modelo: ModeloEditor, indice: number): ModeloEditor {
  if (modelo.secoes.length <= 1) return modelo;
  return { ...modelo, secoes: modelo.secoes.filter((_, i) => i !== indice) };
}

export function renomearSecao(
  modelo: ModeloEditor,
  indice: number,
  titulo: string,
): ModeloEditor {
  return alterarSecao(modelo, indice, (secao) => ({ ...secao, titulo }));
}

export function adicionarPergunta(modelo: ModeloEditor, secao: number): ModeloEditor {
  return alterarSecao(modelo, secao, (atual) => ({
    ...atual,
    perguntas: [...atual.perguntas, perguntaVazia()],
  }));
}

export function removerPergunta(
  modelo: ModeloEditor,
  secao: number,
  indice: number,
): ModeloEditor {
  return alterarSecao(modelo, secao, (atual) => ({
    ...atual,
    perguntas: atual.perguntas.filter((_, i) => i !== indice),
  }));
}

export function alterarPergunta(
  modelo: ModeloEditor,
  secao: number,
  indice: number,
  mudanca: Partial<PerguntaEditor>,
): ModeloEditor {
  return alterarSecao(modelo, secao, (atual) => ({
    ...atual,
    perguntas: atual.perguntas.map((pergunta, i) => {
      if (i !== indice) return pergunta;
      const proxima = { ...pergunta, ...mudanca };
      // Só múltipla escolha guarda alternativas; o banco recusa o resto.
      if (proxima.tipo !== 'multipla_escolha') proxima.opcoes = [];
      return proxima;
    }),
  }));
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export interface ErroModelo {
  /** Caminho legível até o problema, para a tela apontar onde é. */
  onde: string;
  mensagem: string;
}

export function validarModelo(modelo: ModeloEditor): ErroModelo[] {
  const erros: ErroModelo[] = [];

  if (modelo.nome.trim() === '') {
    erros.push({ onde: 'Nome', mensagem: 'Dê um nome ao modelo.' });
  }
  if (modelo.secoes.length === 0) {
    erros.push({ onde: 'Seções', mensagem: 'O modelo precisa de pelo menos uma seção.' });
  }

  const totalDePerguntas = modelo.secoes.reduce((total, s) => total + s.perguntas.length, 0);
  if (totalDePerguntas === 0) {
    erros.push({ onde: 'Perguntas', mensagem: 'O modelo precisa de pelo menos uma pergunta.' });
  }

  modelo.secoes.forEach((secao, iSecao) => {
    const nomeSecao = secao.titulo.trim() === '' ? `Seção ${iSecao + 1}` : secao.titulo;

    if (secao.titulo.trim() === '') {
      erros.push({ onde: nomeSecao, mensagem: 'A seção precisa de um título.' });
    }

    secao.perguntas.forEach((pergunta, iPergunta) => {
      const onde = `${nomeSecao}, pergunta ${iPergunta + 1}`;

      if (pergunta.enunciado.trim() === '') {
        erros.push({ onde, mensagem: 'Escreva o enunciado da pergunta.' });
      }

      if (pergunta.tipo === 'multipla_escolha') {
        const preenchidas = pergunta.opcoes.filter((opcao) => opcao.trim() !== '');
        if (preenchidas.length < 2) {
          erros.push({ onde, mensagem: 'Múltipla escolha precisa de pelo menos duas alternativas.' });
        }
        if (new Set(preenchidas.map((o) => o.trim())).size !== preenchidas.length) {
          erros.push({ onde, mensagem: 'Há alternativas repetidas.' });
        }
      }

      if (pergunta.condicao !== null) {
        const { igual, diferente, em } = pergunta.condicao;
        const temCriterio =
          (igual ?? '') !== '' || (diferente ?? '') !== '' || (em ?? []).length > 0;
        if (!temCriterio) {
          erros.push({ onde, mensagem: 'A condição está sem critério. Escolha um valor ou tire a condição.' });
        }
      }
    });
  });

  return erros;
}

// ---------------------------------------------------------------------------
// Conversão para o banco
// ---------------------------------------------------------------------------

/**
 * Monta o payload de `salvar_modelo_formulario`. A ordem vem da posição na
 * lista, então arrastar na tela já é a ordem gravada.
 */
export function paraPayload(modelo: ModeloEditor, tenantId: string): Record<string, unknown> {
  return {
    id: modelo.id,
    tenant_id: tenantId,
    tipo: modelo.tipo,
    nome: modelo.nome.trim(),
    descricao: modelo.descricao.trim() === '' ? null : modelo.descricao.trim(),
    ativo: modelo.ativo,
    padrao: modelo.padrao,
    secoes: modelo.secoes.map((secao, iSecao) => ({
      id: secao.id,
      ordem: iSecao + 1,
      titulo: secao.titulo.trim(),
      perguntas: secao.perguntas.map((pergunta, iPergunta) => ({
        id: pergunta.id,
        ordem: iPergunta + 1,
        enunciado: pergunta.enunciado.trim(),
        tipo: pergunta.tipo,
        opcoes:
          pergunta.tipo === 'multipla_escolha'
            ? pergunta.opcoes.map((o) => o.trim()).filter((o) => o !== '')
            : null,
        obrigatoria: pergunta.obrigatoria,
        condicao: pergunta.condicao,
      })),
    })),
  };
}

/** Monta o editor a partir do que veio do banco. */
export function paraEditor(
  modelo: {
    id: string;
    nome: string;
    descricao: string | null;
    tipo: TipoFormulario;
    ativo: boolean;
    padrao: boolean;
  },
  secoes: ReadonlyArray<{ id: string; ordem: number; titulo: string }>,
  perguntas: ReadonlyArray<{
    id: string;
    secao_id: string;
    ordem: number;
    enunciado: string;
    tipo: TipoPergunta;
    opcoes: string[] | null;
    obrigatoria: boolean;
    condicao: CondicaoPergunta | null;
  }>,
): ModeloEditor {
  return {
    id: modelo.id,
    nome: modelo.nome,
    descricao: modelo.descricao ?? '',
    tipo: modelo.tipo,
    ativo: modelo.ativo,
    padrao: modelo.padrao,
    secoes: [...secoes]
      .sort((a, b) => a.ordem - b.ordem)
      .map((secao) => ({
        id: secao.id,
        titulo: secao.titulo,
        perguntas: perguntas
          .filter((pergunta) => pergunta.secao_id === secao.id)
          .sort((a, b) => a.ordem - b.ordem)
          .map((pergunta) => ({
            id: pergunta.id,
            enunciado: pergunta.enunciado,
            tipo: pergunta.tipo,
            opcoes: pergunta.opcoes ?? [],
            obrigatoria: pergunta.obrigatoria,
            condicao: pergunta.condicao,
          })),
      })),
  };
}

/** Cópia para "duplicar modelo": zera os ids, então tudo entra como novo. */
export function duplicar(modelo: ModeloEditor, nome: string): ModeloEditor {
  return {
    ...modelo,
    id: null,
    nome,
    padrao: false,
    secoes: modelo.secoes.map((secao) => ({
      ...secao,
      id: null,
      perguntas: secao.perguntas.map((pergunta) => ({ ...pergunta, id: null })),
    })),
  };
}
