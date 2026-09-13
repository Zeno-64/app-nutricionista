import type { AnamneseDaLinhaDoTempo, AvaliacaoDaLinhaDoTempo } from '@nutri/calculos';
import { exigirSupabase } from './cliente';
import type { Paciente, PacienteCompleto } from './tipos';

const COLUNAS_PACIENTE =
  'id, nome, objetivo, arquivado_em, usuario_id, origem, data_nascimento, sexo, telefone, email, profissao, observacoes, grupos';

// Só o que a linha do tempo lê. Pedir `*` traria dobras e circunferências que
// a ficha não mostra, no celular e possivelmente na rede do paciente.
const COLUNAS_AVALIACAO =
  'id, data_avaliacao, status, versao, substituida_por_id, peso, imc, percentual_gordura, gasto_energetico_total, origem';

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

export async function listarAvaliacoesDaFicha(
  pacienteId: string,
): Promise<AvaliacaoDaLinhaDoTempo[]> {
  const { data, error } = await exigirSupabase()
    .from('avaliacoes')
    .select(COLUNAS_AVALIACAO)
    .eq('paciente_id', pacienteId)
    .order('data_avaliacao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AvaliacaoDaLinhaDoTempo[];
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
