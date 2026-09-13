import { exigirSupabase } from './supabase';
import type {
  PerguntaModelo,
  RespostaAnamnese,
  RespostaParaCriar,
  SecaoModelo,
} from './anamnese';
import type { ModeloEditor } from './modelo';
import { paraEditor, paraPayload } from './modelo';
import type { Anamnese, Avaliacao, Membro, Paciente, Perfil, TipoFormulario } from './tipos';

/** Consultas do painel. A RLS já limita as linhas ao tenant do usuário. */

export async function carregarPerfil(usuarioId: string): Promise<Perfil | null> {
  const { data, error } = await exigirSupabase()
    .from('perfis')
    .select('id, tipo, nome, telefone')
    .eq('id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data as Perfil | null;
}

export async function carregarMembro(usuarioId: string): Promise<Membro | null> {
  const { data, error } = await exigirSupabase()
    .from('membros')
    .select('id, tenant_id, usuario_id, papel, crn, ativo')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true)
    .maybeSingle();
  if (error) throw error;
  return data as Membro | null;
}

export interface FiltroPacientes {
  busca?: string;
  incluirArquivados?: boolean;
}

/** RF-11: listar, buscar e filtrar pacientes. */
export async function listarPacientes(filtro: FiltroPacientes = {}): Promise<Paciente[]> {
  let consulta = exigirSupabase()
    .from('pacientes')
    .select('*')
    .order('nome', { ascending: true });

  if (!filtro.incluirArquivados) consulta = consulta.is('arquivado_em', null);
  if (filtro.busca?.trim()) consulta = consulta.ilike('nome', `%${filtro.busca.trim()}%`);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as Paciente[];
}

export async function carregarPaciente(id: string): Promise<Paciente | null> {
  const { data, error } = await exigirSupabase()
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Paciente | null;
}

export async function listarAvaliacoes(pacienteId: string): Promise<Avaliacao[]> {
  const { data, error } = await exigirSupabase()
    .from('avaliacoes')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('data_avaliacao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Avaliacao[];
}

export async function listarAnamneses(pacienteId: string): Promise<Anamnese[]> {
  const { data, error } = await exigirSupabase()
    .from('anamneses')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('data_registro', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Anamnese[];
}

/**
 * RNF-11: a visualização de prontuário também entra na auditoria.
 *
 * Falhar aqui não derruba a tela: registrar é obrigação nossa, não de quem só
 * quis abrir a ficha. O erro vai para o console, e a trilha do banco continua
 * sendo a fonte da verdade sobre o que foi gravado.
 */
export async function registrarVisualizacao(
  tabela: string,
  registroId: string,
  pacienteId: string,
): Promise<void> {
  const { error } = await exigirSupabase().rpc('registrar_visualizacao', {
    p_tabela: tabela,
    p_registro: registroId,
    p_paciente: pacienteId,
  });
  if (error) console.warn('Não foi possível registrar a visualização:', error.message);
}

// ---------------------------------------------------------------------------
// Cadastro de paciente (RF-10, RF-12)
// ---------------------------------------------------------------------------

export async function criarPaciente(
  linha: Record<string, unknown>,
  usuarioId: string,
): Promise<string> {
  const { data, error } = await exigirSupabase()
    .from('pacientes')
    .insert({ ...linha, criado_por: usuarioId })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function atualizarPaciente(
  id: string,
  linha: Record<string, unknown>,
): Promise<void> {
  // O tenant não muda numa edição; mandá-lo de volta só criaria chance de erro.
  const { tenant_id: _ignorado, ...campos } = linha;
  const { error } = await exigirSupabase().from('pacientes').update(campos).eq('id', id);
  if (error) throw error;
}

/** RF-12: arquivar sem apagar o histórico. `null` desarquiva. */
export async function definirArquivamento(id: string, arquivado: boolean): Promise<void> {
  const { error } = await exigirSupabase()
    .from('pacientes')
    .update({ arquivado_em: arquivado ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Modelos e anamneses (RF-20 a RF-26)
// ---------------------------------------------------------------------------

export interface ModeloResumo {
  id: string;
  nome: string;
  tipo: TipoFormulario;
  padrao: boolean;
}

export async function listarModelos(tipo: TipoFormulario): Promise<ModeloResumo[]> {
  const { data, error } = await exigirSupabase()
    .from('modelos_formulario')
    .select('id, nome, tipo, padrao')
    .eq('tipo', tipo)
    .eq('ativo', true)
    .order('padrao', { ascending: false })
    .order('nome');
  if (error) throw error;
  return (data ?? []) as ModeloResumo[];
}

export async function carregarModelo(
  modeloId: string,
): Promise<{ secoes: SecaoModelo[]; perguntas: PerguntaModelo[] }> {
  const supabase = exigirSupabase();
  const [secoes, perguntas] = await Promise.all([
    supabase.from('secoes_modelo').select('id, ordem, titulo').eq('modelo_id', modeloId),
    supabase
      .from('perguntas_modelo')
      .select('id, secao_id, ordem, enunciado, tipo, opcoes, obrigatoria, condicao')
      .eq('modelo_id', modeloId),
  ]);
  if (secoes.error) throw secoes.error;
  if (perguntas.error) throw perguntas.error;
  return {
    secoes: (secoes.data ?? []) as SecaoModelo[],
    perguntas: (perguntas.data ?? []) as PerguntaModelo[],
  };
}

/**
 * Cria a anamnese (ou a pré-consulta) já com as respostas em branco, montadas a
 * partir do modelo. As perguntas que não se aplicam ao paciente ficam de fora
 * (RF-22), e o enunciado é copiado para a anamnese não depender do modelo
 * depois (RN-02).
 */
export async function criarAnamnese(parametros: {
  tenantId: string;
  pacienteId: string;
  modeloId: string;
  tipo: TipoFormulario;
  respostas: readonly RespostaParaCriar[];
  usuarioId: string;
  enviarAoPaciente: boolean;
}): Promise<string> {
  const supabase = exigirSupabase();

  const { data, error } = await supabase
    .from('anamneses')
    .insert({
      tenant_id: parametros.tenantId,
      paciente_id: parametros.pacienteId,
      modelo_id: parametros.modeloId,
      tipo: parametros.tipo,
      preenchida_por: parametros.enviarAoPaciente ? 'paciente' : 'nutricionista',
      // RF-23: a pré-consulta só aparece para o paciente depois de enviada.
      enviada_em: parametros.enviarAoPaciente ? new Date().toISOString() : null,
      criado_por: parametros.usuarioId,
    })
    .select('id')
    .single();
  if (error) throw error;

  const anamneseId = (data as { id: string }).id;

  if (parametros.respostas.length > 0) {
    const { error: erroRespostas } = await supabase.from('respostas_anamnese').insert(
      parametros.respostas.map((resposta) => ({
        ...resposta,
        tenant_id: parametros.tenantId,
        anamnese_id: anamneseId,
      })),
    );
    if (erroRespostas) throw erroRespostas;
  }

  return anamneseId;
}

export async function carregarAnamnese(
  id: string,
): Promise<{ anamnese: Anamnese; respostas: RespostaAnamnese[] }> {
  const supabase = exigirSupabase();
  const [cabecalho, respostas] = await Promise.all([
    supabase.from('anamneses').select('*').eq('id', id).single(),
    supabase
      .from('respostas_anamnese')
      .select('id, anamnese_id, pergunta_id, ordem, secao_titulo, enunciado, tipo, opcoes, valor')
      .eq('anamnese_id', id)
      .order('ordem'),
  ]);
  if (cabecalho.error) throw cabecalho.error;
  if (respostas.error) throw respostas.error;
  return {
    anamnese: cabecalho.data as Anamnese,
    respostas: (respostas.data ?? []) as RespostaAnamnese[],
  };
}

export async function salvarResposta(id: string, valor: unknown): Promise<void> {
  const { error } = await exigirSupabase()
    .from('respostas_anamnese')
    .update({ valor })
    .eq('id', id);
  if (error) throw error;
}

/** RF-25: finalizada, fica registrada com data e autor. */
export async function finalizarAnamnese(id: string, usuarioId: string): Promise<void> {
  const { error } = await exigirSupabase()
    .from('anamneses')
    .update({
      status: 'finalizada',
      finalizada_em: new Date().toISOString(),
      finalizada_por: usuarioId,
    })
    .eq('id', id);
  if (error) throw error;
}

/** RN-02: correção não sobrescreve; gera nova versão pela função do banco. */
export async function novaVersaoAnamnese(id: string): Promise<string> {
  const { data, error } = await exigirSupabase().rpc('nova_versao_anamnese', {
    p_anamnese: id,
  });
  if (error) throw error;
  return data as string;
}

/** RN-03: liberar para o paciente ver. */
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

/** RF-26: anamnese finalizada imediatamente anterior, para comparar. */
export async function carregarAnamneseAnterior(
  pacienteId: string,
  tipo: TipoFormulario,
  antesDe: string,
): Promise<{ anamnese: Anamnese; respostas: RespostaAnamnese[] } | null> {
  const { data, error } = await exigirSupabase()
    .from('anamneses')
    .select('id')
    .eq('paciente_id', pacienteId)
    .eq('tipo', tipo)
    .eq('status', 'finalizada')
    .is('substituida_por_id', null)
    .lt('data_registro', antesDe)
    .order('data_registro', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data === null) return null;
  return carregarAnamnese((data as { id: string }).id);
}

// ---------------------------------------------------------------------------
// Edição de modelos (RF-20, RF-27)
// ---------------------------------------------------------------------------

export interface ModeloNaLista extends ModeloResumo {
  descricao: string | null;
  ativo: boolean;
  atualizado_em: string;
  perguntas: number;
}

/** Todos os modelos do consultório, ativos e inativos, com a contagem de perguntas. */
export async function listarTodosModelos(): Promise<ModeloNaLista[]> {
  const { data, error } = await exigirSupabase()
    .from('modelos_formulario')
    .select('id, nome, tipo, padrao, descricao, ativo, atualizado_em, perguntas_modelo(count)')
    .order('tipo')
    .order('padrao', { ascending: false })
    .order('nome');
  if (error) throw error;

  return (data ?? []).map((linha) => {
    const { perguntas_modelo: contagem, ...resto } = linha as Record<string, unknown> & {
      perguntas_modelo: Array<{ count: number }>;
    };
    return { ...resto, perguntas: contagem[0]?.count ?? 0 } as ModeloNaLista;
  });
}

export async function carregarModeloCompleto(modeloId: string): Promise<ModeloEditor> {
  const supabase = exigirSupabase();
  const [cabecalho, estrutura] = await Promise.all([
    supabase
      .from('modelos_formulario')
      .select('id, nome, descricao, tipo, ativo, padrao')
      .eq('id', modeloId)
      .single(),
    carregarModelo(modeloId),
  ]);
  if (cabecalho.error) throw cabecalho.error;

  return paraEditor(
    cabecalho.data as Parameters<typeof paraEditor>[0],
    estrutura.secoes,
    estrutura.perguntas as Parameters<typeof paraEditor>[2],
  );
}

/**
 * Grava o modelo inteiro numa chamada só. Seção e pergunta não existem soltas:
 * salvar pela metade deixaria o formulário quebrado, então quem monta a
 * transação é o banco.
 */
export async function salvarModelo(modelo: ModeloEditor, tenantId: string): Promise<string> {
  const { data, error } = await exigirSupabase().rpc('salvar_modelo_formulario', {
    p_modelo: paraPayload(modelo, tenantId),
  });
  if (error) throw error;
  return data as string;
}

/** RF-27: desativar em vez de apagar — modelo usado tem anamnese apontando para ele. */
export async function definirModeloAtivo(modeloId: string, ativo: boolean): Promise<void> {
  const { error } = await exigirSupabase()
    .from('modelos_formulario')
    .update({ ativo })
    .eq('id', modeloId);
  if (error) throw error;
}
