-- Auditoria de registros clínicos (RNF-11).
--
-- Registra quem criou, alterou, apagou ou visualizou. Criação, alteração e
-- exclusão entram por gatilho; visualização entra pela função
-- public.registrar_visualizacao, chamada pela aplicação.

create table public.auditoria (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  usuario_id uuid,
  acao public.acao_auditoria not null,
  tabela text not null,
  registro_id uuid,
  paciente_id uuid,
  dados_antes jsonb,
  dados_depois jsonb,
  endereco_ip inet,
  criado_em timestamptz not null default now()
);

comment on table public.auditoria is
  'Trilha somente de inserção. Não tem chave estrangeira de propósito: a trilha '
  'sobrevive à remoção do registro auditado.';

create index auditoria_tenant_idx on public.auditoria (tenant_id, criado_em desc);
create index auditoria_registro_idx on public.auditoria (tabela, registro_id);
create index auditoria_paciente_idx on public.auditoria (paciente_id, criado_em desc);

create trigger auditoria_somente_insercao
  before update or delete on public.auditoria
  for each row execute function app.impedir_alteracao();

-- ---------------------------------------------------------------------------
-- Gatilho de auditoria
-- ---------------------------------------------------------------------------

create or replace function app.auditar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_antes jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_depois jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_linha jsonb := coalesce(v_depois, v_antes);
  v_acao public.acao_auditoria;
begin
  v_acao := case tg_op
              when 'INSERT' then 'criar'
              when 'UPDATE' then 'alterar'
              else 'apagar'
            end::public.acao_auditoria;

  insert into public.auditoria (
    tenant_id, usuario_id, acao, tabela, registro_id, paciente_id,
    dados_antes, dados_depois
  )
  values (
    (v_linha ->> 'tenant_id')::uuid,
    auth.uid(),
    v_acao,
    tg_table_name,
    (v_linha ->> 'id')::uuid,
    (v_linha ->> 'paciente_id')::uuid,
    v_antes,
    v_depois
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger pacientes_auditoria
  after insert or update or delete on public.pacientes
  for each row execute function app.auditar();

create trigger anamneses_auditoria
  after insert or update or delete on public.anamneses
  for each row execute function app.auditar();

create trigger avaliacoes_auditoria
  after insert or update or delete on public.avaliacoes
  for each row execute function app.auditar();

create trigger anexos_auditoria
  after insert or update or delete on public.anexos
  for each row execute function app.auditar();

-- ---------------------------------------------------------------------------
-- Registro de visualização de prontuário (RNF-01, RNF-11)
-- ---------------------------------------------------------------------------

create or replace function public.registrar_visualizacao(
  p_tabela text,
  p_registro uuid,
  p_paciente uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.pacientes where id = p_paciente;
  if v_tenant is null then
    raise exception 'Paciente % não encontrado.', p_paciente using errcode = 'no_data_found';
  end if;

  if not (app.e_membro(v_tenant) or app.e_o_proprio_paciente(p_paciente)) then
    raise exception 'Sem acesso ao prontuário do paciente %.', p_paciente
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.auditoria (tenant_id, usuario_id, acao, tabela, registro_id, paciente_id)
  values (v_tenant, auth.uid(), 'visualizar', p_tabela, p_registro, p_paciente);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: a trilha é lida pelo tenant, e escrita só por gatilho ou função
-- ---------------------------------------------------------------------------

alter table public.auditoria enable row level security;

create policy auditoria_le_membro on public.auditoria
  for select to authenticated
  using (app.e_membro(tenant_id));
