-- Permissões de tabela e de função para o papel "authenticated".
--
-- A RLS filtra as linhas, mas o Postgres exige também o GRANT. Esta migration
-- concentra as concessões para não depender de "default privileges" do
-- ambiente, e deixa explícito o que cada papel pode fazer.
--
-- "anon" não recebe nada: sem login não se lê dado clínico.
--
-- O Supabase concede ALL em public para anon e authenticated por "default
-- privileges", deixando só a RLS como barreira. Aqui esse atalho é desfeito
-- primeiro, para que a permissão seja o que está escrito abaixo e nada mais.
-- Toda migration que criar tabela nova precisa repetir esse par revoke/grant.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema app to authenticated;

-- As funções auxiliares são chamadas dentro das próprias políticas de RLS e,
-- por isso, precisam ser executáveis pelo usuário que faz a consulta.
grant execute on function app.usuario_atual() to authenticated;
grant execute on function app.e_membro(uuid) to authenticated;
grant execute on function app.papel_no_tenant(uuid) to authenticated;
grant execute on function app.e_proprietario(uuid) to authenticated;
grant execute on function app.e_o_proprio_paciente(uuid) to authenticated;
grant execute on function app.paciente_ve_anamnese(uuid) to authenticated;
grant execute on function app.paciente_responde_anamnese(uuid) to authenticated;

grant execute on function public.nova_versao_anamnese(uuid) to authenticated;
grant execute on function public.nova_versao_avaliacao(uuid) to authenticated;
grant execute on function public.finalizar_pre_consulta(uuid) to authenticated;
grant execute on function public.registrar_visualizacao(text, uuid, uuid) to authenticated;
grant execute on function public.criar_modelo_padrao_anamnese(uuid) to authenticated;

-- Conta e tenant
grant select, insert, update on public.perfis to authenticated;
grant select, update on public.tenants to authenticated;
grant select, insert, update, delete on public.membros to authenticated;

-- Cadastro clínico. Sem DELETE em pacientes: RF-12 manda arquivar.
grant select, insert, update on public.pacientes to authenticated;

-- Modelos de formulário
grant select, insert, update, delete on public.modelos_formulario to authenticated;
grant select, insert, update, delete on public.secoes_modelo to authenticated;
grant select, insert, update, delete on public.perguntas_modelo to authenticated;

-- Registros clínicos. O DELETE existe só para descartar rascunho; a política e
-- a trava de imutabilidade barram o que está finalizado.
grant select, insert, update, delete on public.anamneses to authenticated;
grant select, insert, update, delete on public.respostas_anamnese to authenticated;
grant select, insert, update, delete on public.avaliacoes to authenticated;
grant select, insert, update, delete on public.anexos to authenticated;

-- Somente inserção e leitura
grant select, insert on public.consentimentos to authenticated;
grant select on public.auditoria to authenticated;
