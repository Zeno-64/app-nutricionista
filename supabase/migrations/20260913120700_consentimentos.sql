-- Consentimento LGPD (RF-03, RNF-01).
--
-- Tabela somente de inserção: um aceite registrado não é alterado nem apagado.

create table public.consentimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  paciente_id uuid not null references public.pacientes (id) on delete restrict,
  usuario_id uuid references auth.users (id),

  tipo public.tipo_consentimento not null,
  versao_documento text not null,
  documento_hash text,
  aceito_em timestamptz not null default now(),
  endereco_ip inet,
  agente_usuario text,

  criado_em timestamptz not null default now()
);

comment on table public.consentimentos is
  'Registro de aceite do termo. Somente inserção: o histórico de consentimento '
  'é prova e não pode ser reescrito (RNF-01).';

create index consentimentos_paciente_idx
  on public.consentimentos (paciente_id, aceito_em desc);
create index consentimentos_tenant_idx on public.consentimentos (tenant_id);

create trigger consentimentos_somente_insercao
  before update or delete on public.consentimentos
  for each row execute function app.impedir_alteracao();

alter table public.consentimentos enable row level security;

create policy consentimentos_le_membro on public.consentimentos
  for select to authenticated
  using (app.e_membro(tenant_id));

create policy consentimentos_cria_membro on public.consentimentos
  for insert to authenticated
  with check (app.e_membro(tenant_id));

create policy consentimentos_le_o_proprio on public.consentimentos
  for select to authenticated
  using (app.e_o_proprio_paciente(paciente_id));

-- RF-03: no primeiro acesso, o próprio paciente aceita o termo.
create policy consentimentos_cria_o_proprio on public.consentimentos
  for insert to authenticated
  with check (app.e_o_proprio_paciente(paciente_id) and usuario_id = auth.uid());
