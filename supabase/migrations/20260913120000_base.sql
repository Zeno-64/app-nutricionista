-- Base do esquema: tipos, schema auxiliar e funções de gatilho.
--
-- Regras que este arquivo sustenta:
-- - RN-01: isolamento por tenant, via funções usadas nas políticas de RLS.
-- - RN-02: registro clínico finalizado não é apagado nem sobrescrito.
-- - RNF-11: auditoria de quem criou, alterou ou apagou registro clínico.

create schema if not exists app;
comment on schema app is
  'Funções auxiliares de RLS, imutabilidade e auditoria. Não expor na API.';

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.perfil_tipo as enum ('nutricionista', 'paciente');

create type public.papel_membro as enum ('proprietario', 'nutricionista', 'secretaria');

-- As fórmulas de composição corporal e gasto energético têm coeficientes por
-- sexo biológico; por isso o domínio é binário aqui.
create type public.sexo as enum ('masculino', 'feminino');

create type public.grupo_paciente as enum (
  'adulto',
  'crianca_adolescente',
  'gestante',
  'lactante',
  'atleta'
);

create type public.tipo_formulario as enum ('anamnese', 'pre_consulta');

create type public.tipo_pergunta as enum (
  'texto_longo',
  'texto_curto',
  'numero',
  'sim_nao',
  'multipla_escolha',
  'escala_0_10',
  'data'
);

create type public.status_registro as enum ('rascunho', 'finalizada');

create type public.preenchido_por as enum ('nutricionista', 'paciente');

-- RN-07: registro importado fica identificado como vindo da Nutrio.
create type public.origem_registro as enum ('local', 'nutrio');

create type public.categoria_anexo as enum (
  'exame',
  'foto_evolucao',
  'plano_alimentar',
  'documento_nutrio',
  'outro'
);

create type public.angulo_foto as enum ('frente', 'lado', 'costas');

create type public.tipo_consentimento as enum ('lgpd_tratamento_dados', 'termos_de_uso');

create type public.acao_auditoria as enum (
  'criar',
  'alterar',
  'apagar',
  'visualizar',
  'liberar',
  'arquivar'
);

-- ---------------------------------------------------------------------------
-- Funções de apoio às políticas de RLS
--
-- As que consultam tabelas ficam na migration da própria tabela, logo depois
-- do CREATE TABLE. São SECURITY DEFINER de propósito: a política de uma tabela
-- precisa consultar "membros" e "pacientes" sem disparar a RLS dessas tabelas,
-- o que geraria recursão. O search_path fica fixo para a função não ser
-- sequestrada.
-- ---------------------------------------------------------------------------

-- Toda função deste projeto fixa o search_path. Sem isso, quem chama pode
-- apontar o caminho para um schema próprio e fazer a função usar uma tabela ou
-- um operador plantado no lugar do original.
create or replace function app.usuario_atual()
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos genéricos
-- ---------------------------------------------------------------------------

create or replace function app.marcar_atualizacao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- RN-02: registro clínico finalizado não é apagado nem sobrescrito.
--
-- Três colunas continuam podendo mudar, porque nenhuma delas é conteúdo
-- clínico: a que aponta para a versão substituta, o carimbo de atualização e a
-- liberação para o paciente (RN-03 e RF-57, que são decisão de visibilidade
-- tomada depois de finalizar).
create or replace function app.impedir_alteracao_finalizada()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  ignorados text[] := array['substituida_por_id', 'atualizado_em', 'liberada_em'];
begin
  if tg_op = 'DELETE' then
    if old.status = 'finalizada' then
      raise exception
        'Registro clínico finalizado não pode ser apagado (RN-02). Gere uma nova versão.'
        using errcode = 'restrict_violation';
    end if;
    return old;
  end if;

  if old.status = 'finalizada' then
    if (to_jsonb(new) - ignorados) is distinct from (to_jsonb(old) - ignorados) then
      raise exception
        'Registro clínico finalizado não pode ser alterado (RN-02). Gere uma nova versão.'
        using errcode = 'restrict_violation';
    end if;
  end if;

  return new;
end;
$$;

-- Tabelas que só aceitam inserção: consentimento e auditoria.
create or replace function app.impedir_alteracao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception '% em %.% não é permitido: a tabela é somente de inserção.',
    tg_op, tg_table_schema, tg_table_name
    using errcode = 'restrict_violation';
end;
$$;
