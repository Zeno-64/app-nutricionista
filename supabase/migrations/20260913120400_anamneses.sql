-- Anamneses e pré-consultas (RF-23 a RF-26, RF-61).
--
-- RN-02: registro finalizado não é apagado nem sobrescrito; correção gera nova
--        versão com data e autor.
-- RN-03: o paciente só vê o que o nutricionista liberar.

create table public.anamneses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  paciente_id uuid not null references public.pacientes (id) on delete restrict,
  modelo_id uuid references public.modelos_formulario (id) on delete set null,

  tipo public.tipo_formulario not null,
  preenchida_por public.preenchido_por not null default 'nutricionista',
  status public.status_registro not null default 'rascunho',

  -- Cadeia de versões: a raiz é a primeira versão, e cada correção aponta para
  -- a que a substituiu.
  versao integer not null default 1,
  anamnese_raiz_id uuid references public.anamneses (id) on delete restrict,
  substituida_por_id uuid references public.anamneses (id) on delete restrict,

  -- RF-23: pré-consulta enviada ao paciente antes da consulta.
  enviada_em timestamptz,
  respondida_em timestamptz,
  -- RN-03: liberação explícita para o paciente ver.
  liberada_em timestamptz,

  finalizada_em timestamptz,
  finalizada_por uuid references auth.users (id),

  -- RN-07: a migração preserva a data original do registro.
  data_registro date not null default current_date,
  origem public.origem_registro not null default 'local',
  origem_id text,

  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id),
  atualizado_em timestamptz not null default now(),

  constraint anamneses_finalizada_tem_data
    check (status <> 'finalizada' or finalizada_em is not null),
  constraint anamneses_versao_positiva check (versao >= 1),
  constraint anamneses_origem_id_coerente
    check ((origem = 'local') = (origem_id is null))
);

comment on column public.anamneses.anamnese_raiz_id is
  'Primeira versão da cadeia. Nulo na própria raiz.';

create unique index anamneses_origem_unica
  on public.anamneses (tenant_id, origem, origem_id)
  where origem_id is not null;

create index anamneses_paciente_idx
  on public.anamneses (paciente_id, data_registro desc);
create index anamneses_tenant_idx on public.anamneses (tenant_id);
create index anamneses_raiz_idx on public.anamneses (anamnese_raiz_id);

create trigger anamneses_atualizacao
  before update on public.anamneses
  for each row execute function app.marcar_atualizacao();

create trigger anamneses_imutavel
  before update or delete on public.anamneses
  for each row execute function app.impedir_alteracao_finalizada();

-- ---------------------------------------------------------------------------
-- Respostas
--
-- O enunciado e o tipo são copiados do modelo na criação: assim a anamnese
-- finalizada preserva a redação da pergunta mesmo que o modelo mude (RN-02), e
-- o paciente responde a pré-consulta sem precisar de acesso ao modelo.
-- ---------------------------------------------------------------------------

create table public.respostas_anamnese (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  anamnese_id uuid not null references public.anamneses (id) on delete cascade,
  pergunta_id uuid references public.perguntas_modelo (id) on delete set null,

  ordem integer not null,
  secao_titulo text,
  enunciado text not null,
  tipo public.tipo_pergunta not null,
  -- Alternativas oferecidas, copiadas junto com o enunciado: a anamnese
  -- finalizada precisa preservar as opções que existiam na hora (RN-02).
  opcoes jsonb,
  -- Resposta em jsonb para caber qualquer tipo de pergunta. Nulo = sem resposta.
  valor jsonb,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (anamnese_id, ordem)
);

create index respostas_anamnese_tenant_idx on public.respostas_anamnese (tenant_id);

create trigger respostas_anamnese_atualizacao
  before update on public.respostas_anamnese
  for each row execute function app.marcar_atualizacao();

-- Resposta de anamnese finalizada também não muda mais (RN-02).
create or replace function app.impedir_alteracao_de_filho_finalizado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tabela_pai constant text := tg_argv[0];
  v_coluna_fk constant text := tg_argv[1];
  v_pai uuid;
  v_status public.status_registro;
begin
  v_pai := ((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)
             ->> v_coluna_fk)::uuid;

  execute format('select status from public.%I where id = $1', v_tabela_pai)
    into v_status
    using v_pai;

  if v_status = 'finalizada' then
    raise exception
      'Registro clínico finalizado não pode ser alterado (RN-02). Gere uma nova versão.'
      using errcode = 'restrict_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger respostas_anamnese_imutavel
  before update or delete on public.respostas_anamnese
  for each row
  execute function app.impedir_alteracao_de_filho_finalizado('anamneses', 'anamnese_id');

-- ---------------------------------------------------------------------------
-- Nova versão (RF-25 / RN-02)
-- ---------------------------------------------------------------------------

-- SECURITY INVOKER de propósito: a RLS precisa valer para quem chamou, senão a
-- função viraria um atalho para versionar anamnese de outro consultório.
create or replace function public.nova_versao_anamnese(p_anamnese uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_antiga public.anamneses;
  v_nova_id uuid;
begin
  select * into v_antiga from public.anamneses where id = p_anamnese;
  if not found then
    raise exception 'Anamnese % não encontrada.', p_anamnese using errcode = 'no_data_found';
  end if;
  if v_antiga.status <> 'finalizada' then
    raise exception 'Só faz sentido versionar anamnese finalizada; esta está em %.',
      v_antiga.status using errcode = 'restrict_violation';
  end if;
  if v_antiga.substituida_por_id is not null then
    raise exception 'Esta versão já foi substituída pela anamnese %.',
      v_antiga.substituida_por_id using errcode = 'restrict_violation';
  end if;

  insert into public.anamneses (
    tenant_id, paciente_id, modelo_id, tipo, preenchida_por, status,
    versao, anamnese_raiz_id, enviada_em, respondida_em, liberada_em,
    data_registro, origem, origem_id, criado_por
  )
  values (
    v_antiga.tenant_id, v_antiga.paciente_id, v_antiga.modelo_id, v_antiga.tipo,
    v_antiga.preenchida_por, 'rascunho',
    v_antiga.versao + 1, coalesce(v_antiga.anamnese_raiz_id, v_antiga.id),
    v_antiga.enviada_em, v_antiga.respondida_em, null,
    v_antiga.data_registro, v_antiga.origem, null, auth.uid()
  )
  returning id into v_nova_id;

  insert into public.respostas_anamnese (
    tenant_id, anamnese_id, pergunta_id, ordem, secao_titulo, enunciado, tipo, opcoes, valor
  )
  select tenant_id, v_nova_id, pergunta_id, ordem, secao_titulo, enunciado, tipo, opcoes, valor
  from public.respostas_anamnese
  where anamnese_id = p_anamnese;

  -- Única alteração que a trava de imutabilidade permite numa linha finalizada.
  update public.anamneses set substituida_por_id = v_nova_id where id = p_anamnese;

  return v_nova_id;
end;
$$;

comment on function public.nova_versao_anamnese(uuid) is
  'Copia uma anamnese finalizada para uma nova versão em rascunho e marca a '
  'anterior como substituída, sem apagar nada (RN-02).';

-- ---------------------------------------------------------------------------
-- Funções de visibilidade para o paciente
-- ---------------------------------------------------------------------------

create or replace function app.paciente_ve_anamnese(p_anamnese uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.anamneses a
    where a.id = p_anamnese
      and app.e_o_proprio_paciente(a.paciente_id)
      and (
        (a.tipo = 'pre_consulta' and a.enviada_em is not null)
        or a.liberada_em is not null
      )
  );
$$;

create or replace function app.paciente_responde_anamnese(p_anamnese uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.anamneses a
    where a.id = p_anamnese
      and a.tipo = 'pre_consulta'
      and a.status = 'rascunho'
      and a.enviada_em is not null
      and app.e_o_proprio_paciente(a.paciente_id)
  );
$$;

-- O paciente encerra a pré-consulta por aqui, em vez de ganhar UPDATE na tabela.
create or replace function public.finalizar_pre_consulta(p_anamnese uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.paciente_responde_anamnese(p_anamnese) then
    raise exception 'Pré-consulta % não está disponível para você responder.', p_anamnese
      using errcode = 'insufficient_privilege';
  end if;

  update public.anamneses
  set status = 'finalizada',
      respondida_em = now(),
      finalizada_em = now(),
      finalizada_por = auth.uid()
  where id = p_anamnese;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.anamneses enable row level security;
alter table public.respostas_anamnese enable row level security;

create policy anamneses_le_membro on public.anamneses
  for select to authenticated
  using (app.e_membro(tenant_id));

create policy anamneses_cria_membro on public.anamneses
  for insert to authenticated
  with check (app.e_membro(tenant_id));

create policy anamneses_atualiza_membro on public.anamneses
  for update to authenticated
  using (app.e_membro(tenant_id))
  with check (app.e_membro(tenant_id));

-- Rascunho pode ser descartado; finalizada nunca (a trava também barra).
create policy anamneses_apaga_rascunho on public.anamneses
  for delete to authenticated
  using (app.e_membro(tenant_id) and status = 'rascunho');

create policy anamneses_le_paciente on public.anamneses
  for select to authenticated
  using (
    app.e_o_proprio_paciente(paciente_id)
    and (
      (tipo = 'pre_consulta' and enviada_em is not null)
      or liberada_em is not null
    )
  );

create policy respostas_anamnese_membro on public.respostas_anamnese
  for all to authenticated
  using (app.e_membro(tenant_id))
  with check (app.e_membro(tenant_id));

create policy respostas_anamnese_le_paciente on public.respostas_anamnese
  for select to authenticated
  using (app.paciente_ve_anamnese(anamnese_id));

-- RF-61: o paciente responde a pré-consulta enquanto ela está em rascunho.
create policy respostas_anamnese_responde_paciente on public.respostas_anamnese
  for update to authenticated
  using (app.paciente_responde_anamnese(anamnese_id))
  with check (app.paciente_responde_anamnese(anamnese_id));
