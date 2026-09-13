-- Pacientes (RF-10 a RF-16).
--
-- RN-04: paciente arquivado perde o acesso ao app, mas o histórico clínico fica.
-- RN-07: registro importado mantém a data original e a marca de origem.

create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  -- Preenchido quando o paciente aceita o convite e cria a conta do app (RF-02).
  usuario_id uuid references auth.users (id) on delete set null,

  nome text not null,
  data_nascimento date,
  sexo public.sexo,
  cpf text,
  email text,
  telefone text,
  endereco jsonb,
  profissao text,
  objetivo text,
  observacoes text,

  -- RF-16: um paciente pode estar em mais de um grupo (gestante e atleta, por exemplo).
  grupos public.grupo_paciente[] not null default '{}',

  -- RF-12: arquivar sem apagar.
  arquivado_em timestamptz,
  -- RF-87: paciente importado só recebe convite quando o nutricionista decidir.
  convidado_em timestamptz,

  origem public.origem_registro not null default 'local',
  origem_id text,

  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id),
  atualizado_em timestamptz not null default now(),

  constraint pacientes_nome_preenchido check (btrim(nome) <> ''),
  constraint pacientes_origem_id_coerente
    check ((origem = 'local') = (origem_id is null))
);

comment on table public.pacientes is
  'Cadastro do paciente. Uma conta do app (usuario_id) só existe depois do convite.';

-- RF-85: reexecutar a importação não pode duplicar paciente.
create unique index pacientes_origem_unica
  on public.pacientes (tenant_id, origem, origem_id)
  where origem_id is not null;

create unique index pacientes_cpf_unico
  on public.pacientes (tenant_id, cpf)
  where cpf is not null;

create unique index pacientes_usuario_unico
  on public.pacientes (usuario_id)
  where usuario_id is not null;

-- RF-11: listar, buscar e filtrar.
create index pacientes_busca_idx on public.pacientes (tenant_id, lower(nome));
create index pacientes_ativos_idx on public.pacientes (tenant_id) where arquivado_em is null;

create trigger pacientes_atualizacao
  before update on public.pacientes
  for each row execute function app.marcar_atualizacao();

-- ---------------------------------------------------------------------------
-- Função de RLS que depende de "pacientes"
-- ---------------------------------------------------------------------------

create or replace function app.e_o_proprio_paciente(p_paciente uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.pacientes p
    where p.id = p_paciente
      and p.usuario_id = auth.uid()
      and p.arquivado_em is null
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.pacientes enable row level security;

create policy pacientes_le_membro on public.pacientes
  for select to authenticated
  using (app.e_membro(tenant_id));

create policy pacientes_cria_membro on public.pacientes
  for insert to authenticated
  with check (app.e_membro(tenant_id));

create policy pacientes_atualiza_membro on public.pacientes
  for update to authenticated
  using (app.e_membro(tenant_id))
  with check (app.e_membro(tenant_id));

-- Sem política de DELETE de propósito: RF-12 manda arquivar, não apagar.

-- RF-60: o paciente vê o próprio cadastro; RN-04 corta o acesso se arquivado.
create policy pacientes_le_o_proprio on public.pacientes
  for select to authenticated
  using (usuario_id = auth.uid() and arquivado_em is null);
