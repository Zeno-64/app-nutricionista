import {
  contextoDoPaciente,
  montarRespostas,
  type AnamneseDaLinhaDoTempo,
  type PerguntaModelo,
  type RespostaAnamnese,
  type SecaoModelo,
} from '@nutri/calculos';
import { exigirSupabase } from './cliente';
import type {
  Avaliacao,
  AvaliacaoDaFicha,
  MeuCadastro,
  Nutricionista,
  Paciente,
  PacienteCompleto,
  PreConsulta,
  PreConsultaResumo,
} from './tipos';

const COLUNAS_PACIENTE =
  'id, nome, objetivo, arquivado_em, usuario_id, origem, data_nascimento, sexo, telefone, email, profissao, observacoes, grupos';

// Só o que a linha do tempo lê. Pedir `*` traria dobras e circunferências que
// a ficha não mostra, no celular e possivelmente na rede do paciente.
const COLUNAS_AVALIACAO =
  'id, data_avaliacao, status, versao, substituida_por_id, peso, imc, percentual_gordura, gasto_energetico_total, origem, liberada_em';

const COLUNAS_ANAMNESE = 'id, tipo, status, data_registro, respondida_em, origem';

export async function listarPacientes(termo: string): Promise<Paciente[]> {
  let consulta = exigirSupabase()
    .from('pacientes')
    .select('id, nome, objetivo, arquivado_em, usuario_id, origem')
    .is('arquivado_em', null)
    .order('nome');

  if (termo.trim() !== '') consulta = consulta.ilike('nome', `%${termo.trim()}%`);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as Paciente[];
}

export async function carregarPaciente(id: string): Promise<PacienteCompleto | null> {
  const { data, error } = await exigirSupabase()
    .from('pacientes')
    .select(COLUNAS_PACIENTE)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as PacienteCompleto | null) ?? null;
}

export async function listarAvaliacoesDaFicha(pacienteId: string): Promise<AvaliacaoDaFicha[]> {
  const { data, error } = await exigirSupabase()
    .from('avaliacoes')
    .select(COLUNAS_AVALIACAO)
    .eq('paciente_id', pacienteId)
    .order('data_avaliacao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AvaliacaoDaFicha[];
}

export async function listarAnamnesesDaFicha(
  pacienteId: string,
): Promise<AnamneseDaLinhaDoTempo[]> {
  const { data, error } = await exigirSupabase()
    .from('anamneses')
    .select(COLUNAS_ANAMNESE)
    .eq('paciente_id', pacienteId)
    .order('data_registro', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AnamneseDaLinhaDoTempo[];
}

/**
 * RN-03: o paciente só vê o que o nutricionista liberar. É o mesmo `update`
 * do painel — quem garante que ninguém libera o paciente dos outros é a RLS.
 */
export async function definirLiberacao(
  tabela: 'anamneses' | 'avaliacoes',
  id: string,
  liberado: boolean,
): Promise<void> {
  const { error } = await exigirSupabase()
    .from(tabela)
    .update({ liberada_em: liberado ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

/**
 * RF-57 e RF-23: manda a pré-consulta para o paciente responder no app.
 *
 * Usa o modelo padrão de pré-consulta e copia as perguntas que se aplicam a
 * este paciente (RF-22). O enunciado vai junto de propósito: a pré-consulta
 * respondida não pode mudar de texto porque alguém editou o modelo depois
 * (RN-02).
 */
export async function enviarPreConsulta(parametros: {
  tenantId: string;
  pacienteId: string;
  usuarioId: string;
  sexo: 'masculino' | 'feminino' | null;
  grupos: PacienteCompleto['grupos'];
}): Promise<string> {
  const supabase = exigirSupabase();

  const { data: modelos, error: erroModelo } = await supabase
    .from('modelos_formulario')
    .select('id, nome, padrao')
    .eq('tipo', 'pre_consulta')
    .eq('ativo', true)
    .order('padrao', { ascending: false })
    .order('nome')
    .limit(1);
  if (erroModelo) throw erroModelo;

  const modeloId = (modelos ?? [])[0]?.id as string | undefined;
  if (modeloId === undefined) {
    throw new Error(
      'Nenhum modelo de pré-consulta ativo. Crie um no painel, em Modelos, antes de enviar.',
    );
  }

  const [secoes, perguntas] = await Promise.all([
    supabase.from('secoes_modelo').select('id, ordem, titulo').eq('modelo_id', modeloId),
    supabase
      .from('perguntas_modelo')
      .select('id, secao_id, ordem, enunciado, tipo, opcoes, obrigatoria, condicao')
      .eq('modelo_id', modeloId),
  ]);
  if (secoes.error) throw secoes.error;
  if (perguntas.error) throw perguntas.error;

  const respostas = montarRespostas(
    (secoes.data ?? []) as SecaoModelo[],
    (perguntas.data ?? []) as PerguntaModelo[],
    contextoDoPaciente({ sexo: parametros.sexo, grupos: parametros.grupos }),
  );

  const { data, error } = await supabase
    .from('anamneses')
    .insert({
      tenant_id: parametros.tenantId,
      paciente_id: parametros.pacienteId,
      modelo_id: modeloId,
      tipo: 'pre_consulta',
      preenchida_por: 'paciente',
      enviada_em: new Date().toISOString(),
      criado_por: parametros.usuarioId,
    })
    .select('id')
    .single();
  if (error) throw error;

  const anamneseId = (data as { id: string }).id;

  if (respostas.length > 0) {
    const { error: erroRespostas } = await supabase.from('respostas_anamnese').insert(
      respostas.map((resposta) => ({
        ...resposta,
        tenant_id: parametros.tenantId,
        anamnese_id: anamneseId,
      })),
    );
    if (erroRespostas) throw erroRespostas;
  }

  return anamneseId;
}

// ---------------------------------------------------------------------------
// Área do paciente (RF-61)
// ---------------------------------------------------------------------------

const COLUNAS_RESPOSTA =
  'id, anamnese_id, pergunta_id, ordem, secao_titulo, enunciado, tipo, opcoes, valor';

// Aqui o `*` seria quase honesto — o paciente vê a avaliação inteira —, mas a
// lista nominal é o que diz qual coluna a tela usa, e o que quebra o build se
// uma sair da migration.
const COLUNAS_MINHA_AVALIACAO = [
  'id, data_avaliacao, versao, substituida_por_id',
  'peso, imc, imc_classificacao, percentual_gordura, massa_gorda, massa_livre_gordura',
  'gasto_energetico_total',
  'circ_pescoco, circ_braco, circ_cintura, circ_abdomen, circ_quadril, circ_coxa, circ_panturrilha',
  'dobra_peitoral, dobra_axilar_media, dobra_triceps, dobra_biceps, dobra_subescapular',
  'dobra_abdominal, dobra_supra_iliaca, dobra_coxa, dobra_panturrilha_medial',
].join(', ');

/**
 * RF-62: as avaliações que o paciente pode ver, da mais recente para a mais
 * antiga.
 *
 * Sem filtro de liberação: a RLS já devolve só o que o nutricionista liberou
 * (RN-03). Repetir o filtro aqui daria a impressão errada de que a regra mora
 * na tela.
 */
export async function listarMinhasAvaliacoes(): Promise<Avaliacao[]> {
  const { data, error } = await exigirSupabase()
    .from('avaliacoes')
    .select(COLUNAS_MINHA_AVALIACAO)
    .order('data_avaliacao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Avaliacao[];
}

/**
 * As pré-consultas que o paciente ainda precisa responder.
 *
 * A consulta não filtra por paciente: a RLS devolve só as dele, e só as que
 * foram enviadas (RN-03). Repetir o filtro aqui daria a impressão errada de
 * que a regra mora na tela.
 */
export async function listarPreConsultasPendentes(): Promise<PreConsultaResumo[]> {
  const { data, error } = await exigirSupabase()
    .from('anamneses')
    .select('id, data_registro, enviada_em')
    .eq('tipo', 'pre_consulta')
    .eq('status', 'rascunho')
    .order('enviada_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PreConsultaResumo[];
}

export async function carregarPreConsulta(
  id: string,
): Promise<{ anamnese: PreConsulta; respostas: RespostaAnamnese[] }> {
  const supabase = exigirSupabase();
  const [cabecalho, respostas] = await Promise.all([
    supabase
      .from('anamneses')
      .select('id, tipo, status, data_registro, enviada_em, respondida_em')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('respostas_anamnese')
      .select(COLUNAS_RESPOSTA)
      .eq('anamnese_id', id)
      .order('ordem'),
  ]);
  if (cabecalho.error) throw cabecalho.error;
  if (respostas.error) throw respostas.error;
  if (cabecalho.data === null) throw new Error('Pré-consulta não encontrada.');

  return {
    anamnese: cabecalho.data as PreConsulta,
    respostas: (respostas.data ?? []) as unknown as RespostaAnamnese[],
  };
}

export async function salvarResposta(id: string, valor: unknown): Promise<void> {
  const { error } = await exigirSupabase()
    .from('respostas_anamnese')
    .update({ valor })
    .eq('id', id);
  if (error) throw error;
}

/**
 * RF-61: o paciente encerra a pré-consulta pela função do banco, não por um
 * `update` na tabela — ele nunca ganha permissão de alterar a anamnese em si.
 */
export async function finalizarPreConsulta(id: string): Promise<void> {
  const { error } = await exigirSupabase().rpc('finalizar_pre_consulta', {
    p_anamnese: id,
  });
  if (error) throw error;
}

// Sem `observacoes`: ver o comentário de `MeuCadastro`.
const COLUNAS_MEU_CADASTRO =
  'id, nome, objetivo, arquivado_em, usuario_id, origem, data_nascimento, sexo, telefone, email, profissao, grupos';

/**
 * RF-60: o cadastro do próprio paciente.
 *
 * Sem filtro por usuário, pelo mesmo motivo das outras consultas do paciente:
 * a RLS devolve só a linha dele. O `maybeSingle` é seguro porque um usuário
 * tem no máximo um paciente — o índice `pacientes_usuario_unico` garante.
 */
export async function carregarMeuCadastro(): Promise<MeuCadastro | null> {
  const { data, error } = await exigirSupabase()
    .from('pacientes')
    .select(COLUNAS_MEU_CADASTRO)
    .maybeSingle();
  if (error) throw error;
  return (data as MeuCadastro | null) ?? null;
}

/**
 * RF-60: quem atende o paciente e como falar com o consultório.
 *
 * Vem de uma função do banco porque a RLS fecha `perfis`, `membros` e
 * `tenants` para o paciente, e assim continua: a função escolhe as colunas no
 * servidor em vez de abrir as três tabelas.
 */
export async function carregarMeuNutricionista(): Promise<Nutricionista[]> {
  const { data, error } = await exigirSupabase().rpc('meu_nutricionista');
  if (error) throw error;
  return (data ?? []) as Nutricionista[];
}

/**
 * O mínimo para gravar em nome do paciente: quem ele é e de qual consultório.
 * O `tenant_id` fica fora de `MeuCadastro` porque não é dado que ele veja — é
 * o que a linha precisa carregar para a RLS aceitar a gravação (RN-01).
 */
export async function meuVinculo(): Promise<{ id: string; tenant_id: string } | null> {
  const { data, error } = await exigirSupabase()
    .from('pacientes')
    .select('id, tenant_id')
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string; tenant_id: string } | null) ?? null;
}

/**
 * RF-03: a versão do termo que o paciente já aceitou, ou `null` se nenhuma.
 *
 * A RLS devolve só os aceites dele. Pega o mais recente: se o termo mudou de
 * versão, o aceite antigo não vale mais e a tela volta a aparecer.
 */
export async function versaoAceitaDoTermo(): Promise<string | null> {
  const { data, error } = await exigirSupabase()
    .from('consentimentos')
    .select('versao_documento')
    .eq('tipo', 'lgpd_tratamento_dados')
    .order('aceito_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as { versao_documento: string } | null)?.versao_documento ?? null;
}

/**
 * RF-03: registra o aceite. A tabela é somente de inserção, com gatilho — um
 * consentimento registrado não é reescrito nem apagado (RNF-01).
 *
 * `endereco_ip` fica em branco de propósito: o endereço que o app enxerga é o
 * dele mesmo, não serve de prova. `agente_usuario` vai porque diz de qual
 * plataforma e versão veio o aceite, o que ajuda o suporte.
 */
export async function registrarAceiteDoTermo(parametros: {
  pacienteId: string;
  tenantId: string;
  usuarioId: string;
  versao: string;
  hash: string;
  agente: string;
}): Promise<void> {
  const { error } = await exigirSupabase().from('consentimentos').insert({
    paciente_id: parametros.pacienteId,
    tenant_id: parametros.tenantId,
    usuario_id: parametros.usuarioId,
    tipo: 'lgpd_tratamento_dados',
    versao_documento: parametros.versao,
    documento_hash: parametros.hash,
    agente_usuario: parametros.agente,
  });
  if (error) throw error;
}

/**
 * RNF-11: abrir a ficha de um paciente é acesso a prontuário, e entra na
 * trilha de auditoria. Falhar aqui não pode derrubar a tela — o registro é
 * obrigação nossa, não do nutricionista que só quis ver a ficha.
 */
export async function registrarVisualizacao(pacienteId: string): Promise<void> {
  const { error } = await exigirSupabase().rpc('registrar_visualizacao', {
    p_tabela: 'pacientes',
    p_registro: pacienteId,
    p_paciente: pacienteId,
  });
  if (error) console.warn('Não foi possível registrar a visualização:', error.message);
}
