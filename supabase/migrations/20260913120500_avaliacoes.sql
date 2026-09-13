-- Avaliação antropométrica, composição corporal e gasto energético
-- (RF-30 a RF-38, RF-40 a RF-45, RF-57, RF-62).
--
-- RN-02: avaliação finalizada não é apagada nem sobrescrita.
-- RN-03: o paciente só vê a avaliação que o nutricionista liberar.

create type public.resultado_formula as enum ('tmb', 'get');

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  paciente_id uuid not null references public.pacientes (id) on delete restrict,

  data_avaliacao date not null default current_date,
  status public.status_registro not null default 'rascunho',

  versao integer not null default 1,
  avaliacao_raiz_id uuid references public.avaliacoes (id) on delete restrict,
  substituida_por_id uuid references public.avaliacoes (id) on delete restrict,
  liberada_em timestamptz,

  -- RF-30: medidas básicas, em kg e cm.
  peso numeric(6, 2),
  altura numeric(5, 1),

  -- Circunferências em cm.
  circ_pescoco numeric(5, 1),
  circ_braco numeric(5, 1),
  circ_cintura numeric(5, 1),
  circ_abdomen numeric(5, 1),
  circ_quadril numeric(5, 1),
  circ_coxa numeric(5, 1),
  circ_panturrilha numeric(5, 1),

  -- Dobras cutâneas em mm.
  dobra_peitoral numeric(5, 1),
  dobra_axilar_media numeric(5, 1),
  dobra_triceps numeric(5, 1),
  dobra_biceps numeric(5, 1),
  dobra_subescapular numeric(5, 1),
  dobra_abdominal numeric(5, 1),
  dobra_supra_iliaca numeric(5, 1),
  dobra_coxa numeric(5, 1),
  dobra_panturrilha_medial numeric(5, 1),

  -- RF-31: índices derivados.
  imc numeric(6, 2),
  imc_classificacao text,
  rcq numeric(5, 3),
  rce numeric(5, 3),

  -- RF-32 a RF-35: identificadores do catálogo de @nutri/calculos.
  protocolo_composicao text,
  densidade_corporal numeric(7, 5),
  percentual_gordura numeric(5, 2),
  massa_gorda numeric(6, 2),
  massa_livre_gordura numeric(6, 2),

  -- RF-36: bioimpedância registrada à mão (% gordura, MLG, água, gordura visceral).
  bioimpedancia jsonb,

  -- RF-40 a RF-42: gasto energético.
  formula_energia text,
  formula_resulta_em public.resultado_formula,
  fator_atividade numeric(4, 3),
  tmb numeric(7, 2),
  gasto_energetico_total numeric(7, 2),

  -- RF-44: meta calórica e macronutrientes.
  meta_calorica numeric(7, 2),
  macros jsonb,

  -- RF-38: memória de cálculo congelada no registro, como foi mostrada.
  memoria_calculo jsonb,

  observacoes text,

  -- RN-07: a migração preserva a data original.
  origem public.origem_registro not null default 'local',
  origem_id text,

  finalizada_em timestamptz,
  finalizada_por uuid references auth.users (id),
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id),
  atualizado_em timestamptz not null default now(),

  constraint avaliacoes_finalizada_tem_data
    check (status <> 'finalizada' or finalizada_em is not null),
  constraint avaliacoes_versao_positiva check (versao >= 1),
  constraint avaliacoes_origem_id_coerente
    check ((origem = 'local') = (origem_id is null)),

  -- RF-41, no próprio banco: fórmula que resulta em TMB precisa de fator de
  -- atividade para virar GET; fórmula que já resulta em GET não aceita fator.
  constraint avaliacoes_fator_atividade_coerente
    check (
      formula_resulta_em is null
      or (formula_resulta_em = 'tmb') = (fator_atividade is not null)
    ),
  constraint avaliacoes_formula_tem_resultado
    check ((formula_energia is null) = (formula_resulta_em is null))
);

comment on constraint avaliacoes_fator_atividade_coerente on public.avaliacoes is
  'RF-41: fórmula EER já resulta em GET e nunca é multiplicada por fator de atividade.';

create unique index avaliacoes_origem_unica
  on public.avaliacoes (tenant_id, origem, origem_id)
  where origem_id is not null;

-- RF-13 e RF-50: linha do tempo e gráficos de evolução.
create index avaliacoes_paciente_idx
  on public.avaliacoes (paciente_id, data_avaliacao desc);
create index avaliacoes_tenant_idx on public.avaliacoes (tenant_id);
create index avaliacoes_raiz_idx on public.avaliacoes (avaliacao_raiz_id);

create trigger avaliacoes_atualizacao
  before update on public.avaliacoes
  for each row execute function app.marcar_atualizacao();

create trigger avaliacoes_imutavel
  before update or delete on public.avaliacoes
  for each row execute function app.impedir_alteracao_finalizada();

-- ---------------------------------------------------------------------------
-- Nova versão (RN-02)
-- ---------------------------------------------------------------------------

create or replace function public.nova_versao_avaliacao(p_avaliacao uuid)
returns uuid
language plpgsql
as $$
declare
  v_antiga public.avaliacoes;
  v_nova_id uuid;
begin
  select * into v_antiga from public.avaliacoes where id = p_avaliacao;
  if not found then
    raise exception 'Avaliação % não encontrada.', p_avaliacao using errcode = 'no_data_found';
  end if;
  if v_antiga.status <> 'finalizada' then
    raise exception 'Só faz sentido versionar avaliação finalizada; esta está em %.',
      v_antiga.status using errcode = 'restrict_violation';
  end if;
  if v_antiga.substituida_por_id is not null then
    raise exception 'Esta versão já foi substituída pela avaliação %.',
      v_antiga.substituida_por_id using errcode = 'restrict_violation';
  end if;

  -- Copia todas as medidas e resultados, trocando só as colunas de controle.
  -- O jsonb evita repetir a lista de colunas e sobrevive a novas medidas.
  insert into public.avaliacoes
  select (jsonb_populate_record(
    null::public.avaliacoes,
    to_jsonb(v_antiga) || jsonb_build_object(
      'id', gen_random_uuid(),
      'status', 'rascunho',
      'versao', v_antiga.versao + 1,
      'avaliacao_raiz_id', coalesce(v_antiga.avaliacao_raiz_id, v_antiga.id),
      'substituida_por_id', null,
      'liberada_em', null,
      'finalizada_em', null,
      'finalizada_por', null,
      -- A correção é registro local, mesmo quando corrige algo vindo da Nutrio.
      'origem', 'local',
      'origem_id', null,
      'criado_em', now(),
      'criado_por', auth.uid(),
      'atualizado_em', now()
    )
  )).*
  returning id into v_nova_id;

  -- Única alteração que a trava de imutabilidade permite numa linha finalizada.
  update public.avaliacoes set substituida_por_id = v_nova_id where id = p_avaliacao;

  return v_nova_id;
end;
$$;

comment on function public.nova_versao_avaliacao(uuid) is
  'Copia uma avaliação finalizada para uma nova versão em rascunho e marca a '
  'anterior como substituída, sem apagar nada (RN-02).';

-- ---------------------------------------------------------------------------
-- Visibilidade para o paciente (RF-62)
-- ---------------------------------------------------------------------------

alter table public.avaliacoes enable row level security;

create policy avaliacoes_le_membro on public.avaliacoes
  for select to authenticated
  using (app.e_membro(tenant_id));

create policy avaliacoes_cria_membro on public.avaliacoes
  for insert to authenticated
  with check (app.e_membro(tenant_id));

create policy avaliacoes_atualiza_membro on public.avaliacoes
  for update to authenticated
  using (app.e_membro(tenant_id))
  with check (app.e_membro(tenant_id));

create policy avaliacoes_apaga_rascunho on public.avaliacoes
  for delete to authenticated
  using (app.e_membro(tenant_id) and status = 'rascunho');

create policy avaliacoes_le_paciente on public.avaliacoes
  for select to authenticated
  using (
    app.e_o_proprio_paciente(paciente_id)
    and liberada_em is not null
    and status = 'finalizada'
  );
