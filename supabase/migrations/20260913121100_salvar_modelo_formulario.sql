-- Gravação do modelo de formulário inteiro numa chamada só (RF-20, RF-27).
--
-- Seção e pergunta não existem soltas: salvar pela metade deixaria o
-- formulário quebrado. Esta função recebe a árvore inteira em jsonb e sincroniza
-- tudo numa transação.
--
-- Três cuidados que o corpo resolve:
--
-- 1. **O id da pergunta é preservado.** `respostas_anamnese.pergunta_id` aponta
--    para ele, e é por esse id que a comparação com a anamnese anterior
--    emparelha as respostas (RF-26). Apagar e recriar tudo perderia esse
--    vínculo, então quem já tem id é atualizado, não recriado.
--
-- 2. **A reordenação passa por um estado negativo.** Há índice único em
--    (modelo_id, ordem) e em (secao_id, ordem); trocar duas perguntas de lugar
--    direto esbarraria no índice no meio do caminho. Por isso a ordem vigente é
--    primeiro invertida para negativa, que não colide com nenhuma ordem final.
--
-- 3. **SECURITY INVOKER de propósito.** A RLS precisa valer para quem chamou,
--    senão a função viraria um atalho para editar modelo de outro consultório.

create or replace function public.salvar_modelo_formulario(p_modelo jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid := nullif(p_modelo ->> 'tenant_id', '')::uuid;
  v_modelo_id uuid := nullif(p_modelo ->> 'id', '')::uuid;
  v_tipo public.tipo_formulario := (p_modelo ->> 'tipo')::public.tipo_formulario;
  v_padrao boolean := coalesce((p_modelo ->> 'padrao')::boolean, false);

  v_secoes_mantidas uuid[];
  v_perguntas_mantidas uuid[];

  v_secao jsonb;
  v_pergunta jsonb;
  v_secao_id uuid;
begin
  if v_tenant is null then
    raise exception 'O modelo precisa de tenant_id.' using errcode = 'null_value_not_allowed';
  end if;
  if jsonb_array_length(coalesce(p_modelo -> 'secoes', '[]'::jsonb)) = 0 then
    raise exception 'O modelo precisa de pelo menos uma seção.' using errcode = 'check_violation';
  end if;

  -- -------------------------------------------------------------------------
  -- Cabeçalho
  -- -------------------------------------------------------------------------
  if v_modelo_id is null then
    insert into public.modelos_formulario (
      tenant_id, tipo, nome, descricao, ativo, padrao, criado_por
    )
    values (
      v_tenant, v_tipo, p_modelo ->> 'nome', p_modelo ->> 'descricao',
      coalesce((p_modelo ->> 'ativo')::boolean, true), v_padrao, auth.uid()
    )
    returning id into v_modelo_id;
  else
    update public.modelos_formulario
    set nome = p_modelo ->> 'nome',
        descricao = p_modelo ->> 'descricao',
        ativo = coalesce((p_modelo ->> 'ativo')::boolean, true),
        padrao = v_padrao
    where id = v_modelo_id;

    -- A RLS pode ter filtrado a linha: sem acesso, nada foi atualizado.
    if not found then
      raise exception 'Modelo % não encontrado ou sem acesso.', v_modelo_id
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Um modelo padrão por tipo, por consultório (RF-21).
  if v_padrao then
    update public.modelos_formulario
    set padrao = false
    where tenant_id = v_tenant and tipo = v_tipo and id <> v_modelo_id and padrao;
  end if;

  -- -------------------------------------------------------------------------
  -- Some com o que saiu do modelo
  -- -------------------------------------------------------------------------
  select coalesce(array_agg(id), '{}')
  into v_secoes_mantidas
  from (
    select nullif(s ->> 'id', '')::uuid as id
    from jsonb_array_elements(p_modelo -> 'secoes') s
  ) t
  where id is not null;

  select coalesce(array_agg(id), '{}')
  into v_perguntas_mantidas
  from (
    select nullif(q ->> 'id', '')::uuid as id
    from jsonb_array_elements(p_modelo -> 'secoes') s,
         jsonb_array_elements(coalesce(s -> 'perguntas', '[]'::jsonb)) q
  ) t
  where id is not null;

  delete from public.perguntas_modelo
  where modelo_id = v_modelo_id and not (id = any (v_perguntas_mantidas));

  delete from public.secoes_modelo
  where modelo_id = v_modelo_id and not (id = any (v_secoes_mantidas));

  -- -------------------------------------------------------------------------
  -- Libera as ordens antes de reescrevê-las
  -- -------------------------------------------------------------------------
  update public.perguntas_modelo set ordem = -ordem where modelo_id = v_modelo_id;
  update public.secoes_modelo set ordem = -ordem where modelo_id = v_modelo_id;

  -- -------------------------------------------------------------------------
  -- Grava a árvore
  -- -------------------------------------------------------------------------
  for v_secao in select * from jsonb_array_elements(p_modelo -> 'secoes')
  loop
    v_secao_id := nullif(v_secao ->> 'id', '')::uuid;

    if v_secao_id is null then
      insert into public.secoes_modelo (tenant_id, modelo_id, ordem, titulo)
      values (v_tenant, v_modelo_id, (v_secao ->> 'ordem')::integer, v_secao ->> 'titulo')
      returning id into v_secao_id;
    else
      update public.secoes_modelo
      set ordem = (v_secao ->> 'ordem')::integer,
          titulo = v_secao ->> 'titulo'
      where id = v_secao_id and modelo_id = v_modelo_id;
    end if;

    for v_pergunta in
      select * from jsonb_array_elements(coalesce(v_secao -> 'perguntas', '[]'::jsonb))
    loop
      if nullif(v_pergunta ->> 'id', '') is null then
        insert into public.perguntas_modelo (
          tenant_id, modelo_id, secao_id, ordem, enunciado, tipo, opcoes, obrigatoria, condicao
        )
        values (
          v_tenant, v_modelo_id, v_secao_id, (v_pergunta ->> 'ordem')::integer,
          v_pergunta ->> 'enunciado', (v_pergunta ->> 'tipo')::public.tipo_pergunta,
          case when v_pergunta -> 'opcoes' = 'null'::jsonb then null else v_pergunta -> 'opcoes' end,
          coalesce((v_pergunta ->> 'obrigatoria')::boolean, false),
          case when v_pergunta -> 'condicao' = 'null'::jsonb then null else v_pergunta -> 'condicao' end
        );
      else
        update public.perguntas_modelo
        set secao_id = v_secao_id,
            ordem = (v_pergunta ->> 'ordem')::integer,
            enunciado = v_pergunta ->> 'enunciado',
            tipo = (v_pergunta ->> 'tipo')::public.tipo_pergunta,
            opcoes = case when v_pergunta -> 'opcoes' = 'null'::jsonb then null else v_pergunta -> 'opcoes' end,
            obrigatoria = coalesce((v_pergunta ->> 'obrigatoria')::boolean, false),
            condicao = case when v_pergunta -> 'condicao' = 'null'::jsonb then null else v_pergunta -> 'condicao' end
        where id = (v_pergunta ->> 'id')::uuid and modelo_id = v_modelo_id;
      end if;
    end loop;
  end loop;

  -- Sobrou ordem negativa? Alguma linha do banco não apareceu no payload e
  -- escapou da limpeza — melhor falhar do que deixar o modelo inconsistente.
  if exists (select 1 from public.secoes_modelo where modelo_id = v_modelo_id and ordem < 0)
     or exists (select 1 from public.perguntas_modelo where modelo_id = v_modelo_id and ordem < 0)
  then
    raise exception 'Sobrou seção ou pergunta fora do modelo enviado.'
      using errcode = 'internal_error';
  end if;

  return v_modelo_id;
end;
$$;

comment on function public.salvar_modelo_formulario(jsonb) is
  'Sincroniza o modelo, suas seções e perguntas numa transação, preservando o '
  'id das perguntas já usadas em anamneses (RF-20, RF-26, RF-27).';

revoke all on function public.salvar_modelo_formulario(jsonb) from public, anon;
grant execute on function public.salvar_modelo_formulario(jsonb) to authenticated;
