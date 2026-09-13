-- Contas, tenants e vínculo profissional.
--
-- RN-01: dado clínico pertence ao tenant e nunca é visível a outro profissional.
-- RN-08: o perfil da conta é definido no cadastro e não pode ser trocado pelo
--        próprio usuário.
-- RF-05: dados profissionais (CRN, contato, logo) usados em documentos.

-- ---------------------------------------------------------------------------
-- Perfis: estende auth.users com o tipo de conta
-- ---------------------------------------------------------------------------

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  tipo public.perfil_tipo not null,
  nome text not null,
  telefone text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis is
  'Uma linha por conta. O tipo decide qual área do app abre no login (RF-01).';

create trigger perfis_atualizacao
  before update on public.perfis
  for each row execute function app.marcar_atualizacao();

-- RN-08: o tipo não muda. Só o service_role, usado pelo suporte, consegue
-- corrigir um cadastro feito errado.
create or replace function app.impedir_troca_de_perfil()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.tipo is distinct from old.tipo and current_user <> 'service_role' then
    raise exception
      'O perfil da conta não pode ser trocado pelo usuário (RN-08).'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger perfis_tipo_imutavel
  before update on public.perfis
  for each row execute function app.impedir_troca_de_perfil();

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  logo_caminho text,
  contato_email text,
  contato_telefone text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.tenants is
  'Consultório ou clínica. Toda tabela com dado clínico aponta para um tenant.';

create trigger tenants_atualizacao
  before update on public.tenants
  for each row execute function app.marcar_atualizacao();

-- ---------------------------------------------------------------------------
-- Membros: vínculo de um profissional com um tenant
-- ---------------------------------------------------------------------------

create table public.membros (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  papel public.papel_membro not null default 'nutricionista',
  crn text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, usuario_id)
);

comment on column public.membros.crn is
  'Registro profissional usado nos documentos gerados (RF-05).';

create index membros_usuario_idx on public.membros (usuario_id) where ativo;
create index membros_tenant_idx on public.membros (tenant_id);

create trigger membros_atualizacao
  before update on public.membros
  for each row execute function app.marcar_atualizacao();

-- ---------------------------------------------------------------------------
-- Funções de RLS que dependem de "membros"
-- ---------------------------------------------------------------------------

create or replace function app.e_membro(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.membros m
    where m.tenant_id = p_tenant
      and m.usuario_id = auth.uid()
      and m.ativo
  );
$$;

create or replace function app.papel_no_tenant(p_tenant uuid)
returns public.papel_membro
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.papel
  from public.membros m
  where m.tenant_id = p_tenant
    and m.usuario_id = auth.uid()
    and m.ativo
  limit 1;
$$;

create or replace function app.e_proprietario(p_tenant uuid)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select app.papel_no_tenant(p_tenant) = 'proprietario';
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.perfis enable row level security;
alter table public.tenants enable row level security;
alter table public.membros enable row level security;

create policy perfis_le_o_proprio on public.perfis
  for select to authenticated
  using (id = auth.uid());

create policy perfis_atualiza_o_proprio on public.perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- O perfil é criado junto com a conta; o usuário só pode criar o dele.
create policy perfis_cria_o_proprio on public.perfis
  for insert to authenticated
  with check (id = auth.uid());

create policy tenants_le_membro on public.tenants
  for select to authenticated
  using (app.e_membro(id));

create policy tenants_atualiza_proprietario on public.tenants
  for update to authenticated
  using (app.e_proprietario(id))
  with check (app.e_proprietario(id));

create policy membros_le_do_tenant on public.membros
  for select to authenticated
  using (app.e_membro(tenant_id));

create policy membros_gerencia_proprietario on public.membros
  for all to authenticated
  using (app.e_proprietario(tenant_id))
  with check (app.e_proprietario(tenant_id));
