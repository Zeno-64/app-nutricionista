-- Modelo padrão de anamnese (RF-21), com o questionário da §4.4 dos requisitos.
--
-- É o questionário que o nutricionista usa hoje, na ordem em que aparece no
-- sistema dele. Todas as perguntas são de texto livre. A pergunta sobre ciclo
-- menstrual é condicional (RF-22).
--
-- As demais perguntas ficam na pré-consulta, que ainda depende dos prints do
-- questionário atual (pendência com o Kevin).

create or replace function public.criar_modelo_padrao_anamnese(p_tenant uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_modelo_id uuid;
  v_secao_id uuid;
  v_enunciados text[] := array[
    'Observações',
    'Imagina que amanhã você acordou e atingiu o resultado. O que muda? O que vai ser diferente?',
    'Outras tentativas? Sozinho ou com profissional (o que gostou ou não gostou)? Liste para mim as 3 principais situações que você acredita terem sido suas maiores dificuldades para se manter na dieta.',
    'Você prefere uma abordagem mais calma, com progressão, ou você é uma pessoa que gosta de se desafiar?',
    'Mudança de peso recente? Nos últimos 3 a 6 meses? Histórico de peso.',
    'Compromissos diários? Trabalho (profissão)? Estuda? Treino? (FA) Tem pausas? Geladeira?',
    'Sono: horas? Acorda? Qualidade? Nota de 0 a 10? Horas ideais?',
    'Cafeína e estimulantes?',
    'Como está o seu intestino, tem ido com que frequência ao banheiro? E como está a consistência das fezes?',
    'Ciclo menstrual: regularidade, como sente durante a TPM? Como fica a alimentação? Doces? Exercícios?',
    'Quem cozinha na sua casa?',
    'Onde você almoça? Lancha? Janta? Leva comida ou come em self-service?',
    'Metas (hidratação, sono, exercícios etc.)'
  ];
  v_indice integer;
begin
  insert into public.modelos_formulario (tenant_id, tipo, nome, descricao, padrao, criado_por)
  values (
    p_tenant,
    'anamnese',
    'Anamnese padrão',
    'Questionário usado hoje pelo nutricionista (§4.4 dos requisitos).',
    true,
    auth.uid()
  )
  returning id into v_modelo_id;

  insert into public.secoes_modelo (tenant_id, modelo_id, ordem, titulo)
  values (p_tenant, v_modelo_id, 1, 'Anamnese')
  returning id into v_secao_id;

  for v_indice in 1 .. array_length(v_enunciados, 1) loop
    insert into public.perguntas_modelo (
      tenant_id, modelo_id, secao_id, ordem, enunciado, tipo, condicao
    )
    values (
      p_tenant,
      v_modelo_id,
      v_secao_id,
      v_indice,
      v_enunciados[v_indice],
      'texto_longo',
      -- RF-22: ciclo menstrual só aparece para paciente do sexo feminino.
      case when v_indice = 10
        then jsonb_build_object('campo', 'sexo', 'igual', 'feminino')
      end
    );
  end loop;

  return v_modelo_id;
end;
$$;

comment on function public.criar_modelo_padrao_anamnese(uuid) is
  'Cria, no tenant informado, o modelo de anamnese padrão da §4.4 dos requisitos (RF-21).';
