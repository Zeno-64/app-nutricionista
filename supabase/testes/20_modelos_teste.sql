-- Testes de salvar_modelo_formulario (RF-20, RF-22, RF-26, RF-27).
--
-- O que interessa aqui é a reordenação: há índice único em (modelo_id, ordem) e
-- em (secao_id, ordem), e o id da pergunta precisa sobreviver, senão a anamnese
-- já gravada perde o vínculo que a comparação usa.

\set ON_ERROR_STOP on
\timing off

begin;

create schema teste;

create or replace function teste.entrar(p_usuario uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function teste.sair()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create or replace function teste.ok(p_condicao boolean, p_mensagem text)
returns void language plpgsql as $$
begin
  if not p_condicao then
    raise exception 'TESTE FALHOU: %', p_mensagem;
  end if;
end;
$$;

grant usage on schema teste to authenticated;
grant execute on all functions in schema teste to authenticated;

-- ---------------------------------------------------------------------------
-- Cenário
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001', 'nutri.a@exemplo.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'nutri.b@exemplo.test');

insert into public.perfis (id, tipo, nome) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001', 'nutricionista', 'Nutri A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'nutricionista', 'Nutri B');

insert into public.tenants (id, nome) values
  ('11111111-1111-4111-8111-000000000001', 'Consultório A'),
  ('22222222-2222-4222-8222-000000000001', 'Consultório B');

insert into public.membros (tenant_id, usuario_id, papel) values
  ('11111111-1111-4111-8111-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', 'proprietario'),
  ('22222222-2222-4222-8222-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'proprietario');

select teste.entrar('aaaaaaaa-aaaa-4aaa-8aaa-000000000001');

-- ---------------------------------------------------------------------------
-- Criação
-- ---------------------------------------------------------------------------

do $$
declare
  v_modelo uuid;
begin
  v_modelo := public.salvar_modelo_formulario(jsonb_build_object(
    'id', null,
    'tenant_id', '11111111-1111-4111-8111-000000000001',
    'tipo', 'pre_consulta',
    'nome', 'Pré-consulta',
    'descricao', 'Formulário que o paciente responde antes da consulta.',
    'ativo', true,
    'padrao', true,
    'secoes', jsonb_build_array(
      jsonb_build_object('id', null, 'ordem', 1, 'titulo', 'Rotina', 'perguntas', jsonb_build_array(
        jsonb_build_object('id', null, 'ordem', 1, 'enunciado', 'Quantas refeições faz por dia?',
                           'tipo', 'numero', 'opcoes', null, 'obrigatoria', true, 'condicao', null),
        jsonb_build_object('id', null, 'ordem', 2, 'enunciado', 'Bebe café?',
                           'tipo', 'multipla_escolha',
                           'opcoes', jsonb_build_array('Nunca', 'Às vezes', 'Todo dia'),
                           'obrigatoria', false, 'condicao', null)
      )),
      jsonb_build_object('id', null, 'ordem', 2, 'titulo', 'Saúde', 'perguntas', jsonb_build_array(
        jsonb_build_object('id', null, 'ordem', 1, 'enunciado', 'Ciclo menstrual regular?',
                           'tipo', 'sim_nao', 'opcoes', null, 'obrigatoria', false,
                           'condicao', jsonb_build_object('campo', 'sexo', 'igual', 'feminino'))
      ))
    )
  ));

  perform teste.ok(
    (select count(*) from public.secoes_modelo where modelo_id = v_modelo) = 2,
    'o modelo novo deveria ter 2 seções'
  );
  perform teste.ok(
    (select count(*) from public.perguntas_modelo where modelo_id = v_modelo) = 3,
    'o modelo novo deveria ter 3 perguntas'
  );
  perform teste.ok(
    (select opcoes from public.perguntas_modelo where modelo_id = v_modelo and ordem = 2 limit 1)
      = jsonb_build_array('Nunca', 'Às vezes', 'Todo dia'),
    'as alternativas da múltipla escolha deveriam ter sido gravadas'
  );
  perform teste.ok(
    (select condicao from public.perguntas_modelo
      where modelo_id = v_modelo and enunciado like 'Ciclo%')
      = jsonb_build_object('campo', 'sexo', 'igual', 'feminino'),
    'a condição da pergunta deveria ter sido gravada (RF-22)'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Reordenar, mover entre seções e remover — preservando os ids
-- ---------------------------------------------------------------------------

do $$
declare
  v_modelo uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_p1 uuid;
  v_p2 uuid;
  v_p3 uuid;
begin
  select id into v_modelo from public.modelos_formulario where tipo = 'pre_consulta';
  select id into v_s1 from public.secoes_modelo where modelo_id = v_modelo and titulo = 'Rotina';
  select id into v_s2 from public.secoes_modelo where modelo_id = v_modelo and titulo = 'Saúde';
  select id into v_p1 from public.perguntas_modelo where secao_id = v_s1 and ordem = 1;
  select id into v_p2 from public.perguntas_modelo where secao_id = v_s1 and ordem = 2;
  select id into v_p3 from public.perguntas_modelo where secao_id = v_s2 and ordem = 1;

  -- Inverte as seções, troca as duas perguntas de lugar, move a terceira de
  -- seção e acrescenta uma nova.
  perform public.salvar_modelo_formulario(jsonb_build_object(
    'id', v_modelo,
    'tenant_id', '11111111-1111-4111-8111-000000000001',
    'tipo', 'pre_consulta',
    'nome', 'Pré-consulta',
    'descricao', null,
    'ativo', true,
    'padrao', true,
    'secoes', jsonb_build_array(
      jsonb_build_object('id', v_s2, 'ordem', 1, 'titulo', 'Saúde', 'perguntas', jsonb_build_array(
        jsonb_build_object('id', v_p2, 'ordem', 1, 'enunciado', 'Bebe café?',
                           'tipo', 'multipla_escolha',
                           'opcoes', jsonb_build_array('Nunca', 'Todo dia'),
                           'obrigatoria', false, 'condicao', null)
      )),
      jsonb_build_object('id', v_s1, 'ordem', 2, 'titulo', 'Rotina', 'perguntas', jsonb_build_array(
        jsonb_build_object('id', v_p1, 'ordem', 1, 'enunciado', 'Quantas refeições faz por dia?',
                           'tipo', 'numero', 'opcoes', null, 'obrigatoria', true, 'condicao', null),
        jsonb_build_object('id', null, 'ordem', 2, 'enunciado', 'Pratica exercício?',
                           'tipo', 'sim_nao', 'opcoes', null, 'obrigatoria', false, 'condicao', null)
      ))
    )
  ));

  perform teste.ok(
    (select ordem from public.secoes_modelo where id = v_s2) = 1
      and (select ordem from public.secoes_modelo where id = v_s1) = 2,
    'as seções deveriam ter trocado de ordem'
  );
  perform teste.ok(
    (select secao_id from public.perguntas_modelo where id = v_p2) = v_s2,
    'a pergunta do café deveria ter mudado de seção, mantendo o id'
  );
  perform teste.ok(
    (select opcoes from public.perguntas_modelo where id = v_p2)
      = jsonb_build_array('Nunca', 'Todo dia'),
    'as alternativas deveriam ter sido atualizadas'
  );
  perform teste.ok(
    not exists (select 1 from public.perguntas_modelo where id = v_p3),
    'a pergunta tirada do modelo deveria ter sumido'
  );
  perform teste.ok(
    (select count(*) from public.perguntas_modelo where modelo_id = v_modelo) = 3,
    'o modelo deveria ficar com 3 perguntas'
  );
  perform teste.ok(
    not exists (select 1 from public.perguntas_modelo where modelo_id = v_modelo and ordem < 0)
      and not exists (select 1 from public.secoes_modelo where modelo_id = v_modelo and ordem < 0),
    'não pode sobrar ordem negativa depois de gravar'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RF-26: a resposta já gravada continua ligada à pergunta depois da edição
-- ---------------------------------------------------------------------------

do $$
declare
  v_modelo uuid;
  v_p1 uuid;
  v_paciente uuid;
  v_anamnese uuid;
begin
  select id into v_modelo from public.modelos_formulario where tipo = 'pre_consulta';
  select id into v_p1 from public.perguntas_modelo
    where modelo_id = v_modelo and enunciado like 'Quantas%';

  insert into public.pacientes (tenant_id, nome, sexo)
  values ('11111111-1111-4111-8111-000000000001', 'Paciente A', 'feminino')
  returning id into v_paciente;

  insert into public.anamneses (tenant_id, paciente_id, modelo_id, tipo, criado_por)
  values ('11111111-1111-4111-8111-000000000001', v_paciente, v_modelo, 'pre_consulta',
          'aaaaaaaa-aaaa-4aaa-8aaa-000000000001')
  returning id into v_anamnese;

  insert into public.respostas_anamnese (
    tenant_id, anamnese_id, pergunta_id, ordem, secao_titulo, enunciado, tipo, valor
  )
  values ('11111111-1111-4111-8111-000000000001', v_anamnese, v_p1, 1, 'Rotina',
          'Quantas refeições faz por dia?', 'numero', to_jsonb(4));

  -- Renomeia a pergunta no modelo.
  perform public.salvar_modelo_formulario(jsonb_build_object(
    'id', v_modelo,
    'tenant_id', '11111111-1111-4111-8111-000000000001',
    'tipo', 'pre_consulta', 'nome', 'Pré-consulta', 'descricao', null,
    'ativo', true, 'padrao', true,
    'secoes', jsonb_build_array(
      jsonb_build_object('id', (select id from public.secoes_modelo where modelo_id = v_modelo and titulo = 'Rotina'),
        'ordem', 1, 'titulo', 'Rotina', 'perguntas', jsonb_build_array(
          jsonb_build_object('id', v_p1, 'ordem', 1,
                             'enunciado', 'Quantas refeições você faz por dia?',
                             'tipo', 'numero', 'opcoes', null, 'obrigatoria', true, 'condicao', null)
      ))
    )
  ));

  perform teste.ok(
    (select pergunta_id from public.respostas_anamnese where anamnese_id = v_anamnese) = v_p1,
    'a resposta deveria continuar ligada à pergunta (RF-26)'
  );
  perform teste.ok(
    (select enunciado from public.respostas_anamnese where anamnese_id = v_anamnese)
      = 'Quantas refeições faz por dia?',
    'a resposta preserva a redação de quando foi feita, não a do modelo novo (RN-02)'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RN-01: ninguém grava modelo no consultório alheio
-- ---------------------------------------------------------------------------

select teste.sair();
select teste.entrar('bbbbbbbb-bbbb-4bbb-8bbb-000000000001');

do $$
declare
  v_modelo uuid;
begin
  select id into v_modelo from public.modelos_formulario limit 1;

  begin
    perform public.salvar_modelo_formulario(jsonb_build_object(
      'id', v_modelo,
      'tenant_id', '11111111-1111-4111-8111-000000000001',
      'tipo', 'pre_consulta', 'nome', 'Invasão', 'descricao', null,
      'ativo', true, 'padrao', false,
      'secoes', jsonb_build_array(
        jsonb_build_object('id', null, 'ordem', 1, 'titulo', 'X', 'perguntas', jsonb_build_array(
          jsonb_build_object('id', null, 'ordem', 1, 'enunciado', 'Y', 'tipo', 'texto_curto',
                             'opcoes', null, 'obrigatoria', false, 'condicao', null)
        ))
      )
    ));
    raise exception 'TESTE FALHOU: gravou modelo em consultório alheio (RN-01)';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select teste.sair();

-- O nutricionista B não enxerga nem o modelo, nem a pergunta do consultório A.
select teste.entrar('bbbbbbbb-bbbb-4bbb-8bbb-000000000001');
select teste.ok(
  (select count(*) from public.modelos_formulario) = 0,
  'nutricionista B não pode ver modelo de outro consultório (RN-01)'
);
select teste.ok(
  (select count(*) from public.perguntas_modelo) = 0,
  'nutricionista B não pode ver pergunta de outro consultório (RN-01)'
);
select teste.sair();

-- ---------------------------------------------------------------------------
-- RF-21: um modelo padrão por tipo, por consultório
-- ---------------------------------------------------------------------------

select teste.entrar('aaaaaaaa-aaaa-4aaa-8aaa-000000000001');

do $$
begin
  perform public.criar_modelo_padrao_anamnese('11111111-1111-4111-8111-000000000001');

  perform public.salvar_modelo_formulario(jsonb_build_object(
    'id', null,
    'tenant_id', '11111111-1111-4111-8111-000000000001',
    'tipo', 'anamnese', 'nome', 'Anamnese para atletas', 'descricao', null,
    'ativo', true, 'padrao', true,
    'secoes', jsonb_build_array(
      jsonb_build_object('id', null, 'ordem', 1, 'titulo', 'Treino', 'perguntas', jsonb_build_array(
        jsonb_build_object('id', null, 'ordem', 1, 'enunciado', 'Quantos treinos por semana?',
                           'tipo', 'numero', 'opcoes', null, 'obrigatoria', true, 'condicao', null)
      ))
    )
  ));

  perform teste.ok(
    (select count(*) from public.modelos_formulario
      where tipo = 'anamnese' and padrao) = 1,
    'só um modelo de anamnese pode ser o padrão do consultório'
  );
  perform teste.ok(
    (select nome from public.modelos_formulario where tipo = 'anamnese' and padrao)
      = 'Anamnese para atletas',
    'o padrão deveria ter passado para o modelo recém-marcado'
  );
  perform teste.ok(
    (select count(*) from public.modelos_formulario where tipo = 'pre_consulta' and padrao) = 1,
    'marcar padrão numa anamnese não pode desmarcar o padrão da pré-consulta'
  );
end;
$$;

select teste.sair();

rollback;

\echo 'Testes de modelos: OK'
