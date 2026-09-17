-- Dados profissionais do nutricionista (RF-05).
--
-- O CRN já existe em `membros`, e o contato do consultório em `tenants`. O que
-- faltava era o profissional conseguir manter o próprio registro: a política
-- `membros_gerencia_proprietario` só deixa o dono do consultório escrever em
-- `membros`, então num consultório com mais de um nutricionista ninguém além
-- do dono consegue preencher o próprio CRN — e é ele que vai no documento e na
-- tela do paciente (RF-60).
--
-- Abrir `membros` para o próprio usuário com uma política seria pior: a RLS
-- filtra linha, não coluna, e o GRANT de UPDATE vale para a linha inteira.
-- Quem pudesse atualizar a própria linha poderia se promover a `proprietario`.
-- Por isso a função: ela escreve uma coluna só.

create or replace function public.atualizar_meu_registro(p_crn text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_linhas integer;
begin
  update public.membros
  set crn = nullif(btrim(p_crn), '')
  where usuario_id = auth.uid()
    and ativo;

  get diagnostics v_linhas = row_count;

  if v_linhas = 0 then
    raise exception 'Nenhum vínculo ativo para a conta atual.'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

comment on function public.atualizar_meu_registro(text) is
  'Grava o CRN do profissional na própria linha de `membros` (RF-05). Escreve só essa coluna: dar UPDATE na linha inteira deixaria qualquer membro se promover a proprietário.';

grant execute on function public.atualizar_meu_registro(text) to authenticated;
