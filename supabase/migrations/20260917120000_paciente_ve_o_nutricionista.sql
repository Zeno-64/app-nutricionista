-- O paciente vê quem cuida dele (RF-60).
--
-- Até aqui o paciente não enxergava nada do lado do nutricionista: `perfis`
-- devolve só a própria linha, e `tenants` e `membros` só para quem é membro.
-- Está certo — é a RN-01 — mas deixa o app do paciente sem como responder à
-- pergunta mais simples que ele tem: quem é meu nutricionista e como falo com
-- ele.
--
-- A saída é uma função SECURITY DEFINER, e não políticas novas. Abrir `perfis`,
-- `tenants` e `membros` para o paciente seriam três políticas, cada uma um
-- caminho a mais por onde vazar linha de outro consultório, e a de `perfis`
-- passaria a deixar um usuário ler a linha de outro. A função escolhe as
-- colunas uma vez, no servidor, e não devolve nenhuma outra.

create or replace function public.meu_nutricionista()
returns table (
  profissional_nome text,
  profissional_telefone text,
  crn text,
  papel public.papel_membro,
  consultorio_nome text,
  consultorio_email text,
  consultorio_telefone text,
  logo_caminho text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    perfil.nome,
    perfil.telefone,
    membro.crn,
    membro.papel,
    consultorio.nome,
    consultorio.contato_email,
    consultorio.contato_telefone,
    consultorio.logo_caminho
  from public.pacientes paciente
    join public.tenants consultorio
      on consultorio.id = paciente.tenant_id
    join public.membros membro
      on membro.tenant_id = consultorio.id
     and membro.ativo
     -- A secretária é membro do consultório, mas não atende: o paciente
     -- perguntou quem cuida dele, não quem trabalha lá.
     and membro.papel in ('proprietario', 'nutricionista')
    join public.perfis perfil
      on perfil.id = membro.usuario_id
  where paciente.usuario_id = auth.uid()
    and paciente.arquivado_em is null
  order by (membro.papel = 'proprietario') desc, perfil.nome;
$$;

comment on function public.meu_nutricionista() is
  'Uma linha por profissional que atende no consultório de quem chamou, com o contato do consultório junto (RF-60). Hoje é sempre uma linha; `pacientes` não guarda quem é o responsável, então numa clínica com vários o paciente vê a equipe, com o proprietário primeiro. Secretaria fica de fora. Quem não é paciente de consultório nenhum — o próprio nutricionista, por exemplo — não recebe nada, e paciente arquivado também não (RN-04).';

grant execute on function public.meu_nutricionista() to authenticated;
