/**
 * A lógica da anamnese e da pré-consulta (RF-20 a RF-26) mora em
 * `@nutri/calculos`: o app preenche o mesmo formulário, e qual pergunta se
 * aplica a este paciente tem de dar a mesma resposta nos dois. Este módulo
 * continua existindo só para as telas não precisarem saber disso.
 */
export {
  agruparPorSecao,
  compararVersoes,
  contextoDoPaciente,
  montarRespostas,
  pendencias,
  perguntaSeAplica,
  respondida,
  valorEmTexto,
  type ComparacaoResposta,
  type CondicaoPergunta,
  type ContextoPaciente,
  type PerguntaModelo,
  type RespostaAnamnese,
  type RespostaParaCriar,
  type SecaoModelo,
  type TipoPergunta,
} from '@nutri/calculos';
