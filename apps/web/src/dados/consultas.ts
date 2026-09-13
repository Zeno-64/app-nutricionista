import { exigirSupabase } from './supabase.js';
import type { Anamnese, Avaliacao, Membro, Paciente, Perfil } from './tipos.js';

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

/** RNF-11: a visualização de prontuário também entra na auditoria. */
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
  if (error) throw error;
}
