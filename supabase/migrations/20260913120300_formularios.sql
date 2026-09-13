-- Modelos de anamnese e de pré-consulta (RF-20, RF-22, RF-27).
--
-- Os modelos ficam restritos ao tenant. O paciente nunca lê o modelo: quando o
-- nutricionista envia uma pré-consulta, o sistema já cria as linhas de resposta
-- com o enunciado copiado (ver 20260913120400_anamneses.sql). Isso mantém o
-- modelo privado e garante que uma anamnese finalizada preserve a redação das
-- perguntas mesmo se o modelo mudar depois (RN-02).

create table public.modelos_formulario (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  tipo public.tipo_formulario not null,
  nome text not null,
  descricao text,
  versao integer not null default 1,
  ativo boolean not null default true,
  -- RF-21: modelo que já vem pronto com o questionário atual do nutricionista.
  padrao boolean not null default false,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id),
  atualizado_em timestamptz not null default now()
);

create index modelos_formulario_tenant_idx
  on public.modelos_formulario (tenant_id, tipo) where ativo;

create trigger modelos_formulario_atualizacao
  before update on public.modelos_formulario
  for each row execute function app.marcar_atualizacao();

create table public.secoes_modelo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  modelo_id uuid not null references public.modelos_formulario (id) on delete cascade,
  ordem integer not null,
  titulo text not null,
  criado_em timestamptz not null default now(),
  unique (modelo_id, ordem),
  -- Permite a chave composta em perguntas_modelo, que amarra a seção ao modelo.
  unique (id, modelo_id)
);

create table public.perguntas_modelo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  modelo_id uuid not null references public.modelos_formulario (id) on delete cascade,
  secao_id uuid not null,
  ordem integer not null,
  enunciado text not null,
  tipo public.tipo_pergunta not null,
  -- Alternativas da múltipla escolha, como array JSON de texto.
  opcoes jsonb,
  obrigatoria boolean not null default false,
  -- RF-22: pergunta condicional, ex. {"campo": "sexo", "igual": "feminino"}.
  condicao jsonb,
  criado_em timestamptz not null default now(),

  unique (secao_id, ordem),
  foreign key (secao_id, modelo_id)
    references public.secoes_modelo (id, modelo_id) on delete cascade,
  constraint perguntas_opcoes_so_em_multipla_escolha
    check (tipo = 'multipla_escolha' or opcoes is null)
);

create index perguntas_modelo_modelo_idx on public.perguntas_modelo (modelo_id);

-- ---------------------------------------------------------------------------
-- RLS: modelo é assunto do tenant, o paciente não enxerga
-- ---------------------------------------------------------------------------

alter table public.modelos_formulario enable row level security;
alter table public.secoes_modelo enable row level security;
alter table public.perguntas_modelo enable row level security;

create policy modelos_formulario_membro on public.modelos_formulario
  for all to authenticated
  using (app.e_membro(tenant_id))
  with check (app.e_membro(tenant_id));

create policy secoes_modelo_membro on public.secoes_modelo
  for all to authenticated
  using (app.e_membro(tenant_id))
  with check (app.e_membro(tenant_id));

create policy perguntas_modelo_membro on public.perguntas_modelo
  for all to authenticated
  using (app.e_membro(tenant_id))
  with check (app.e_membro(tenant_id));
