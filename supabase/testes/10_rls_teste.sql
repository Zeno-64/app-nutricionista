-- Testes de RLS e das regras de negócio no banco.
--
-- Roda num Postgres comum, com o shim de supabase/testes/00_shim_supabase.sql.
-- Cada bloco troca o usuário autenticado e confere o que ele enxerga e o que
-- consegue escrever. Tudo dentro de uma transação, desfeita no fim.

\set ON_ERROR_STOP on
\timing off

begin;

-- ---------------------------------------------------------------------------
-- Apoio
-- ---------------------------------------------------------------------------

create schema teste;

-- Assume a identidade de um usuário logado, como o PostgREST faz.
create or replace function teste.entrar(p_usuario uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function teste.sair()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant usage on schema teste to authenticated;
grant execute on all functions in schema teste to authenticated;

create or replace function teste.ok(p_condicao boolean, p_mensagem text)
returns void
language plpgsql
as $$
begin
  if not p_condicao then
    raise exception 'TESTE FALHOU: %', p_mensagem;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cenário: dois consultórios independentes
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001', 'nutri.a@exemplo.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'nutri.b@exemplo.test'),
  ('cccccccc-cccc-4ccc-8ccc-000000000001', 'paciente.a@exemplo.test'),
  ('cccccccc-cccc-4ccc-8ccc-000000000002', 'paciente.arquivado@exemplo.test');

insert into public.perfis (id, tipo, nome) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001', 'nutricionista', 'Nutri A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'nutricionista', 'Nutri B'),
  ('cccccccc-cccc-4ccc-8ccc-000000000001', 'paciente', 'Paciente A'),
  ('cccccccc-cccc-4ccc-8ccc-000000000002', 'paciente', 'Paciente arquivado');

insert into public.tenants (id, nome) values
  ('11111111-1111-4111-8111-000000000001', 'Consultório A'),
  ('22222222-2222-4222-8222-000000000001', 'Consultório B');

insert into public.membros (tenant_id, usuario_id, papel) values
  ('11111111-1111-4111-8111-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', 'proprietario'),
  ('22222222-2222-4222-8222-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'proprietario');

insert into public.pacientes (id, tenant_id, usuario_id, nome, sexo, data_nascimento) values
  ('dddddddd-dddd-4ddd-8ddd-000000000001', '11111111-1111-4111-8111-000000000001',
   'cccccccc-cccc-4ccc-8ccc-000000000001', 'Paciente A', 'feminino', '1990-05-10'),
  ('dddddddd-dddd-4ddd-8ddd-000000000002', '22222222-2222-4222-8222-000000000001',
   null, 'Paciente B', 'masculino', '1985-02-20');

insert into public.pacientes (id, tenant_id, usuario_id, nome, arquivado_em) values
  ('dddddddd-dddd-4ddd-8ddd-000000000003', '11111111-1111-4111-8111-000000000001',
   'cccccccc-cccc-4ccc-8ccc-000000000002', 'Paciente arquivado', now());

-- ---------------------------------------------------------------------------
-- RN-01: isolamento por tenant
-- ---------------------------------------------------------------------------

select teste.entrar('aaaaaaaa-aaaa-4aaa-8aaa-000000000001');

select teste.ok(
  (select count(*) from public.pacientes) = 2,
  'nutricionista A deveria ver os 2 pacientes do consultório dele'
);
select teste.ok(
  not exists (select 1 from public.pacientes where nome = 'Paciente B'),
  'nutricionista A não pode ver paciente de outro consultório (RN-01)'
);
select teste.ok(
  (select count(*) from public.tenants) = 1,
  'nutricionista A só enxerga o próprio tenant'
);

-- Não consegue gravar dentro do tenant alheio.
do $$
begin
  begin
    insert into public.pacientes (tenant_id, nome)
    values ('22222222-2222-4222-8222-000000000001', 'Intruso');
    raise exception 'TESTE FALHOU: gravou paciente em tenant alheio';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select teste.sair();

select teste.entrar('bbbbbbbb-bbbb-4bbb-8bbb-000000000001');
select teste.ok(
  (select count(*) from public.pacientes) = 1,
  'nutricionista B só vê o paciente do consultório B'
);
select teste.sair();

-- ---------------------------------------------------------------------------
-- RF-60 e RN-04: o que o paciente enxerga
-- ---------------------------------------------------------------------------

select teste.entrar('cccccccc-cccc-4ccc-8ccc-000000000001');
select teste.ok(
  (select count(*) from public.pacientes) = 1,
  'paciente vê só o próprio cadastro (RF-60)'
);
select teste.ok(
  (select nome from public.pacientes) = 'Paciente A',
  'paciente vê o cadastro certo'
);
select teste.sair();

select teste.entrar('cccccccc-cccc-4ccc-8ccc-000000000002');
select teste.ok(
  (select count(*) from public.pacientes) = 0,
  'paciente arquivado perde o acesso ao app (RN-04)'
);
select teste.sair();

-- ---------------------------------------------------------------------------
-- RN-08: o perfil da conta não é trocado pelo usuário
-- ---------------------------------------------------------------------------

select teste.entrar('cccccccc-cccc-4ccc-8ccc-000000000001');
do $$
begin
  begin
    update public.perfis set tipo = 'nutricionista'
    where id = 'cccccccc-cccc-4ccc-8ccc-000000000001';
    raise exception 'TESTE FALHOU: paciente virou nutricionista (RN-08)';
  exception
    when restrict_violation then null;
  end;
end;
$$;
select teste.sair();

-- ---------------------------------------------------------------------------
-- RF-41: fator de atividade no banco
-- ---------------------------------------------------------------------------

select teste.entrar('aaaaaaaa-aaaa-4aaa-8aaa-000000000001');

do $$
begin
  begin
    insert into public.avaliacoes (
      tenant_id, paciente_id, formula_energia, formula_resulta_em, fator_atividade
    )
    values (
      '11111111-1111-4111-8111-000000000001', 'dddddddd-dddd-4ddd-8ddd-000000000001',
      'eer_2023', 'get', 1.55
    );
    raise exception 'TESTE FALHOU: aceitou fator de atividade em fórmula EER (RF-41)';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.avaliacoes (
      tenant_id, paciente_id, formula_energia, formula_resulta_em, fator_atividade
    )
    values (
      '11111111-1111-4111-8111-000000000001', 'dddddddd-dddd-4ddd-8ddd-000000000001',
      'mifflin_st_jeor_1990', 'tmb', null
    );
    raise exception 'TESTE FALHOU: aceitou fórmula de TMB sem fator de atividade (RF-41)';
  exception
    when check_violation then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- RN-02: registro finalizado não muda nem some
-- ---------------------------------------------------------------------------

insert into public.avaliacoes (
  id, tenant_id, paciente_id, data_avaliacao, peso, altura,
  formula_energia, formula_resulta_em, fator_atividade, tmb, gasto_energetico_total,
  status, finalizada_em, finalizada_por
)
values (
  'eeeeeeee-eeee-4eee-8eee-000000000001',
  '11111111-1111-4111-8111-000000000001',
  'dddddddd-dddd-4ddd-8ddd-000000000001',
  '2026-09-01', 68.4, 165,
  'tmb_manual', 'tmb', 1.375, 1400, 1925,
  'finalizada', now(), 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001'
);

do $$
begin
  begin
    update public.avaliacoes set peso = 70
    where id = 'eeeeeeee-eeee-4eee-8eee-000000000001';
    raise exception 'TESTE FALHOU: sobrescreveu avaliação finalizada (RN-02)';
  exception
    when restrict_violation then null;
  end;

  -- A política de DELETE só alcança rascunho, então aqui não sobra linha para
  -- apagar e o comando não chega ao gatilho.
  delete from public.avaliacoes where id = 'eeeeeeee-eeee-4eee-8eee-000000000001';
  perform teste.ok(
    exists (select 1 from public.avaliacoes where id = 'eeeeeeee-eeee-4eee-8eee-000000000001'),
    'avaliação finalizada sumiu apesar da política de DELETE (RN-02)'
  );
end;
$$;

-- A segunda camada: mesmo sem RLS no caminho, o gatilho barra.
select teste.sair();
do $$
begin
  begin
    delete from public.avaliacoes where id = 'eeeeeeee-eeee-4eee-8eee-000000000001';
    raise exception 'TESTE FALHOU: o gatilho deixou apagar avaliação finalizada (RN-02)';
  exception
    when restrict_violation then null;
  end;

  begin
    update public.avaliacoes set peso = 99
    where id = 'eeeeeeee-eeee-4eee-8eee-000000000001';
    raise exception 'TESTE FALHOU: o gatilho deixou alterar avaliação finalizada (RN-02)';
  exception
    when restrict_violation then null;
  end;
end;
$$;
select teste.entrar('aaaaaaaa-aaaa-4aaa-8aaa-000000000001');

-- A correção gera nova versão, e a anterior continua lá.
do $$
declare
  v_nova uuid;
begin
  v_nova := public.nova_versao_avaliacao('eeeeeeee-eeee-4eee-8eee-000000000001');

  perform teste.ok(
    (select versao from public.avaliacoes where id = v_nova) = 2,
    'a nova versão da avaliação deveria ser a 2'
  );
  perform teste.ok(
    (select status from public.avaliacoes where id = v_nova) = 'rascunho',
    'a nova versão nasce em rascunho'
  );
  perform teste.ok(
    (select avaliacao_raiz_id from public.avaliacoes where id = v_nova)
      = 'eeeeeeee-eeee-4eee-8eee-000000000001',
    'a nova versão aponta para a raiz'
  );
  perform teste.ok(
    (select peso from public.avaliacoes where id = v_nova) = 68.4,
    'a nova versão copia as medidas'
  );
  perform teste.ok(
    (select substituida_por_id from public.avaliacoes
      where id = 'eeeeeeee-eeee-4eee-8eee-000000000001') = v_nova,
    'a versão anterior aponta para a que a substituiu'
  );
  perform teste.ok(
    (select count(*) from public.avaliacoes
      where paciente_id = 'dddddddd-dddd-4ddd-8ddd-000000000001') = 2,
    'a versão anterior continua no histórico'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RN-03 e RF-62: o paciente só vê o que foi liberado
-- ---------------------------------------------------------------------------

select teste.sair();
select teste.entrar('cccccccc-cccc-4ccc-8ccc-000000000001');
select teste.ok(
  (select count(*) from public.avaliacoes) = 0,
  'paciente não vê avaliação antes da liberação (RN-03)'
);
select teste.sair();

select teste.entrar('aaaaaaaa-aaaa-4aaa-8aaa-000000000001');
update public.avaliacoes set liberada_em = now()
where id = 'eeeeeeee-eeee-4eee-8eee-000000000001';
select teste.sair();

select teste.entrar('cccccccc-cccc-4ccc-8ccc-000000000001');
select teste.ok(
  (select count(*) from public.avaliacoes) = 1,
  'paciente vê a avaliação liberada (RF-62)'
);
select teste.sair();

-- ---------------------------------------------------------------------------
-- RF-23 e RF-61: pré-consulta
-- ---------------------------------------------------------------------------

select teste.entrar('aaaaaaaa-aaaa-4aaa-8aaa-000000000001');

insert into public.anamneses (
  id, tenant_id, paciente_id, tipo, preenchida_por, enviada_em, criado_por
)
values (
  'ffffffff-ffff-4fff-8fff-000000000001',
  '11111111-1111-4111-8111-000000000001',
  'dddddddd-dddd-4ddd-8ddd-000000000001',
  'pre_consulta', 'paciente', now(), 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001'
);

insert into public.respostas_anamnese (tenant_id, anamnese_id, ordem, enunciado, tipo)
values (
  '11111111-1111-4111-8111-000000000001',
  'ffffffff-ffff-4fff-8fff-000000000001',
  1, 'Você tem alguma alergia alimentar?', 'texto_longo'
);

select teste.sair();

select teste.entrar('cccccccc-cccc-4ccc-8ccc-000000000001');

select teste.ok(
  (select count(*) from public.anamneses) = 1,
  'paciente vê a pré-consulta enviada (RF-23)'
);
select teste.ok(
  (select count(*) from public.respostas_anamnese) = 1,
  'paciente vê as perguntas da pré-consulta'
);

update public.respostas_anamnese set valor = to_jsonb('Nenhuma'::text)
where anamnese_id = 'ffffffff-ffff-4fff-8fff-000000000001';

select teste.ok(
  (select valor from public.respostas_anamnese) = to_jsonb('Nenhuma'::text),
  'paciente responde a pré-consulta (RF-61)'
);

select public.finalizar_pre_consulta('ffffffff-ffff-4fff-8fff-000000000001');

select teste.ok(
  (select status from public.anamneses where id = 'ffffffff-ffff-4fff-8fff-000000000001')
    = 'finalizada',
  'pré-consulta fica finalizada depois de respondida'
);

-- Depois de finalizada, nem o paciente nem a trava deixam mudar a resposta.
do $$
declare
  v_afetadas integer;
begin
  begin
    update public.respostas_anamnese set valor = to_jsonb('Mudei de ideia'::text)
    where anamnese_id = 'ffffffff-ffff-4fff-8fff-000000000001';
    get diagnostics v_afetadas = row_count;
    perform teste.ok(v_afetadas = 0, 'resposta de pré-consulta finalizada mudou (RN-02)');
  exception
    when restrict_violation then null;
  end;
end;
$$;

select teste.sair();

-- ---------------------------------------------------------------------------
-- RNF-11: auditoria
-- ---------------------------------------------------------------------------

select teste.entrar('aaaaaaaa-aaaa-4aaa-8aaa-000000000001');

select teste.ok(
  exists (
    select 1 from public.auditoria
    where tabela = 'avaliacoes'
      and acao = 'criar'
      and registro_id = 'eeeeeeee-eeee-4eee-8eee-000000000001'
      and usuario_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001'
  ),
  'a criação da avaliação deveria estar na auditoria (RNF-11)'
);

select public.registrar_visualizacao(
  'avaliacoes', 'eeeeeeee-eeee-4eee-8eee-000000000001',
  'dddddddd-dddd-4ddd-8ddd-000000000001'
);

select teste.ok(
  exists (select 1 from public.auditoria where acao = 'visualizar'),
  'a visualização de prontuário deveria estar na auditoria (RNF-01)'
);

do $$
declare
  v_antes bigint;
begin
  select count(*) into v_antes from public.auditoria;
  begin
    delete from public.auditoria;
  exception
    -- Sem GRANT de DELETE o Postgres recusa antes; com ele, a falta de
    -- política de DELETE faz a RLS filtrar tudo e o gatilho barra o resto.
    when restrict_violation or insufficient_privilege then null;
  end;
  perform teste.ok(
    (select count(*) from public.auditoria) = v_antes,
    'linha de auditoria sumiu: a trilha precisa ser somente de inserção (RNF-11)'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RF-03: consentimento é somente inserção
-- ---------------------------------------------------------------------------

insert into public.consentimentos (tenant_id, paciente_id, tipo, versao_documento)
values (
  '11111111-1111-4111-8111-000000000001',
  'dddddddd-dddd-4ddd-8ddd-000000000001',
  'lgpd_tratamento_dados', 'v1'
);

do $$
begin
  begin
    update public.consentimentos set versao_documento = 'v2';
    raise exception 'TESTE FALHOU: alterou consentimento registrado';
  exception
    -- Sem GRANT de UPDATE a recusa vem do Postgres; o gatilho é a segunda camada.
    when restrict_violation or insufficient_privilege then null;
  end;

  perform teste.ok(
    (select count(*) from public.consentimentos where versao_documento = 'v1') = 1,
    'o consentimento registrado deveria continuar na versão v1'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RF-21 e RF-22: modelo padrão de anamnese
-- ---------------------------------------------------------------------------

do $$
declare
  v_modelo uuid;
begin
  v_modelo := public.criar_modelo_padrao_anamnese('11111111-1111-4111-8111-000000000001');

  perform teste.ok(
    (select count(*) from public.perguntas_modelo where modelo_id = v_modelo) = 13,
    'o modelo padrão tem as 13 perguntas da §4.4'
  );
  perform teste.ok(
    (select enunciado from public.perguntas_modelo where modelo_id = v_modelo and ordem = 1)
      = 'Observações',
    'a primeira pergunta do modelo padrão é "Observações"'
  );
  perform teste.ok(
    (select condicao from public.perguntas_modelo where modelo_id = v_modelo and ordem = 10)
      = jsonb_build_object('campo', 'sexo', 'igual', 'feminino'),
    'a pergunta de ciclo menstrual é condicional (RF-22)'
  );
  perform teste.ok(
    (select count(*) from public.perguntas_modelo
      where modelo_id = v_modelo and condicao is not null) = 1,
    'só a pergunta de ciclo menstrual é condicional'
  );
end;
$$;

select teste.sair();

-- ---------------------------------------------------------------------------
-- Toda tabela com dado clínico tem tenant_id e RLS ligada
-- ---------------------------------------------------------------------------

do $$
declare
  v_sem_rls text[];
  v_sem_tenant text[];
begin
  select array_agg(c.relname order by c.relname) into v_sem_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

  perform teste.ok(
    v_sem_rls is null,
    'estas tabelas do schema public estão sem RLS: ' || coalesce(array_to_string(v_sem_rls, ', '), '')
  );

  select array_agg(t.tablename order by t.tablename) into v_sem_tenant
  from pg_tables t
  where t.schemaname = 'public'
    and t.tablename in (
      'pacientes', 'anamneses', 'respostas_anamnese', 'avaliacoes',
      'anexos', 'consentimentos', 'auditoria',
      'modelos_formulario', 'secoes_modelo', 'perguntas_modelo'
    )
    and not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = t.tablename
        and c.column_name = 'tenant_id'
    );

  perform teste.ok(
    v_sem_tenant is null,
    'estas tabelas clínicas estão sem tenant_id: ' || coalesce(array_to_string(v_sem_tenant, ', '), '')
  );
end;
$$;

rollback;

\echo 'Testes de RLS: OK'
