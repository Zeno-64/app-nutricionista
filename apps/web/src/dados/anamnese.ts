import type { GrupoPaciente, Paciente, TipoPergunta } from './tipos.js';
import type { Sexo } from '@nutri/calculos';

/**
 * Lógica da anamnese e da pré-consulta (RF-20 a RF-26).
 *
 * Tudo aqui é função pura: montar as respostas a partir do modelo, decidir se
 * uma pergunta condicional se aplica e comparar duas versões. A tela só desenha.
 */

export interface SecaoModelo {
  id: string;
  ordem: number;
  titulo: string;
}

/** RF-22: condição que decide se a pergunta aparece. */
export interface CondicaoPergunta {
  campo: 'sexo' | 'grupo';
  igual?: string;
  diferente?: string;
  em?: string[];
}

export interface PerguntaModelo {
  id: string;
  secao_id: string;
  ordem: number;
  enunciado: string;
  tipo: TipoPergunta;
  opcoes: string[] | null;
  obrigatoria: boolean;
  condicao: CondicaoPergunta | null;
}

export interface RespostaAnamnese {
  id: string;
  anamnese_id: string;
  pergunta_id: string | null;
  ordem: number;
  secao_titulo: string | null;
  enunciado: string;
  tipo: TipoPergunta;
  /** Alternativas copiadas do modelo, para a múltipla escolha (RN-02). */
  opcoes: string[] | null;
  valor: unknown;
}

/** O que a condição consulta. Vem do cadastro do paciente. */
export interface ContextoPaciente {
  sexo: Sexo | null;
  grupos: GrupoPaciente[];
}

export function contextoDoPaciente(paciente: Paciente): ContextoPaciente {
  return { sexo: paciente.sexo, grupos: paciente.grupos };
}

/**
 * RF-22: decide se a pergunta se aplica ao paciente.
 *
 * Sem condição, sempre se aplica. Condição que o cadastro ainda não tem como
 * responder — sexo em branco, por exemplo — resolve como "não se aplica", para
 * a pergunta não aparecer por engano num paciente a que ela não serve.
 */
export function perguntaSeAplica(
  condicao: CondicaoPergunta | null,
  contexto: ContextoPaciente,
): boolean {
  if (condicao === null) return true;

  const valores: string[] =
    condicao.campo === 'sexo'
      ? contexto.sexo === null
        ? []
        : [contexto.sexo]
      : contexto.grupos;

  if (valores.length === 0) return false;

  if (condicao.igual !== undefined) return valores.includes(condicao.igual);
  if (condicao.diferente !== undefined) return !valores.includes(condicao.diferente);
  if (condicao.em !== undefined) return valores.some((valor) => condicao.em!.includes(valor));

  return true;
}

/** Linha de resposta pronta para inserir, sem o id da anamnese. */
export interface RespostaParaCriar {
  pergunta_id: string;
  ordem: number;
  secao_titulo: string;
  enunciado: string;
  tipo: TipoPergunta;
  opcoes: string[] | null;
}

/**
 * Monta as respostas em branco a partir do modelo, já na ordem em que o
 * nutricionista verá, pulando as perguntas que não se aplicam.
 *
 * O enunciado é copiado: a anamnese finalizada precisa preservar a redação da
 * pergunta mesmo que o modelo mude depois (RN-02), e o paciente responde a
 * pré-consulta sem precisar de acesso ao modelo.
 *
 * A numeração é contínua entre as seções porque o banco exige ordem única por
 * anamnese.
 */
export function montarRespostas(
  secoes: readonly SecaoModelo[],
  perguntas: readonly PerguntaModelo[],
  contexto: ContextoPaciente,
): RespostaParaCriar[] {
  const tituloPorSecao = new Map(secoes.map((secao) => [secao.id, secao.titulo]));
  const ordemDaSecao = new Map(secoes.map((secao) => [secao.id, secao.ordem]));

  const aplicaveis = perguntas.filter((pergunta) => perguntaSeAplica(pergunta.condicao, contexto));

  const ordenadas = [...aplicaveis].sort((a, b) => {
    const secaoA = ordemDaSecao.get(a.secao_id) ?? Number.MAX_SAFE_INTEGER;
    const secaoB = ordemDaSecao.get(b.secao_id) ?? Number.MAX_SAFE_INTEGER;
    return secaoA !== secaoB ? secaoA - secaoB : a.ordem - b.ordem;
  });

  return ordenadas.map((pergunta, indice) => ({
    pergunta_id: pergunta.id,
    ordem: indice + 1,
    secao_titulo: tituloPorSecao.get(pergunta.secao_id) ?? '',
    enunciado: pergunta.enunciado,
    tipo: pergunta.tipo,
    opcoes: pergunta.opcoes,
  }));
}

/** Agrupa as respostas por seção, preservando a ordem. */
export function agruparPorSecao(
  respostas: readonly RespostaAnamnese[],
): Array<{ secao: string; respostas: RespostaAnamnese[] }> {
  const grupos: Array<{ secao: string; respostas: RespostaAnamnese[] }> = [];

  for (const resposta of [...respostas].sort((a, b) => a.ordem - b.ordem)) {
    const titulo = resposta.secao_titulo ?? '';
    const ultimo = grupos[grupos.length - 1];
    if (ultimo !== undefined && ultimo.secao === titulo) {
      ultimo.respostas.push(resposta);
    } else {
      grupos.push({ secao: titulo, respostas: [resposta] });
    }
  }

  return grupos;
}

/** Uma resposta vazia é aquela que o paciente ainda não tocou. */
export function respondida(resposta: RespostaAnamnese): boolean {
  const { valor } = resposta;
  if (valor === null || valor === undefined) return false;
  if (typeof valor === 'string') return valor.trim() !== '';
  if (Array.isArray(valor)) return valor.length > 0;
  return true;
}

/** Perguntas obrigatórias ainda em branco, que impedem finalizar. */
export function pendencias(
  respostas: readonly RespostaAnamnese[],
  obrigatorias: ReadonlySet<string>,
): RespostaAnamnese[] {
  return respostas.filter(
    (resposta) =>
      resposta.pergunta_id !== null &&
      obrigatorias.has(resposta.pergunta_id) &&
      !respondida(resposta),
  );
}

/** Texto de exibição de uma resposta, qualquer que seja o tipo da pergunta. */
export function valorEmTexto(resposta: RespostaAnamnese): string {
  const { valor, tipo } = resposta;
  if (valor === null || valor === undefined) return '';
  if (tipo === 'sim_nao') return valor === true ? 'Sim' : valor === false ? 'Não' : '';
  if (tipo === 'data' && typeof valor === 'string' && valor !== '') {
    const [ano, mes, dia] = valor.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }
  if (Array.isArray(valor)) return valor.join(', ');
  if (typeof valor === 'number') return valor.toLocaleString('pt-BR');
  return String(valor);
}

export interface ComparacaoResposta {
  enunciado: string;
  atual: string;
  anterior: string | null;
  mudou: boolean;
}

/**
 * RF-26: põe a anamnese anterior ao lado da atual.
 *
 * O par sai pelo `pergunta_id` quando ele existe nos dois lados; quando não
 * existe — registro importado da Nutrio, por exemplo (RN-07) — cai no
 * enunciado, que é o que sobra para reconhecer a mesma pergunta.
 */
export function compararVersoes(
  atuais: readonly RespostaAnamnese[],
  anteriores: readonly RespostaAnamnese[],
): ComparacaoResposta[] {
  const porPergunta = new Map<string, RespostaAnamnese>();
  const porEnunciado = new Map<string, RespostaAnamnese>();

  for (const anterior of anteriores) {
    if (anterior.pergunta_id !== null) porPergunta.set(anterior.pergunta_id, anterior);
    porEnunciado.set(anterior.enunciado, anterior);
  }

  return [...atuais]
    .sort((a, b) => a.ordem - b.ordem)
    .map((resposta) => {
      const anterior =
        (resposta.pergunta_id !== null ? porPergunta.get(resposta.pergunta_id) : undefined) ??
        porEnunciado.get(resposta.enunciado);

      const textoAtual = valorEmTexto(resposta);
      const textoAnterior = anterior === undefined ? null : valorEmTexto(anterior);

      return {
        enunciado: resposta.enunciado,
        atual: textoAtual,
        anterior: textoAnterior,
        mudou: textoAnterior !== null && textoAnterior !== textoAtual,
      };
    });
}
