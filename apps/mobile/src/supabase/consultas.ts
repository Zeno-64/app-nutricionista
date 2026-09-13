import {
  contextoDoPaciente,
  montarRespostas,
  type AnamneseDaLinhaDoTempo,
  type PerguntaModelo,
  type SecaoModelo,
} from '@nutri/calculos';
import { exigirSupabase } from './cliente';
import type { AvaliacaoDaFicha, Paciente, PacienteCompleto } from './tipos';

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
