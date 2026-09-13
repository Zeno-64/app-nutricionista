-- Anexos do paciente: exames, fotos de evolução e documentos da Nutrio
-- (RF-14, RF-15, RF-84).

create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  paciente_id uuid not null references public.pacientes (id) on delete restrict,
  anamnese_id uuid references public.anamneses (id) on delete set null,
  avaliacao_id uuid references public.avaliacoes (id) on delete set null,

  categoria public.categoria_anexo not null default 'outro',
  -- RF-15: fotos de evolução comparáveis entre datas.
  angulo public.angulo_foto,

  caminho_storage text not null unique,
  nome_arquivo text not null,
  tipo_mime text,
  tamanho_bytes bigint,
  data_referencia date,
  descricao text,

  -- RN-03: o paciente só vê o anexo que o nutricionista liberar.
  liberado_em timestamptz,

  origem public.origem_registro not null default 'local',
  origem_id text,

  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id),

  constraint anexos_angulo_so_em_foto
    check (angulo is null or categoria = 'foto_evolucao'),
  constraint anexos_origem_id_coerente
    check ((origem = 'local') = (origem_id is null))
);

create unique index anexos_origem_unica
  on public.anexos (tenant_id, origem, origem_id)
  where origem_id is not null;

create index anexos_paciente_idx on public.anexos (paciente_id, data_referencia desc);
create index anexos_tenant_idx on public.anexos (tenant_id);

alter table public.anexos enable row level security;

create policy anexos_membro on public.anexos
  for all to authenticated
  using (app.e_membro(tenant_id))
  with check (app.e_membro(tenant_id));

create policy anexos_le_paciente on public.anexos
  for select to authenticated
  using (app.e_o_proprio_paciente(paciente_id) and liberado_em is not null);
