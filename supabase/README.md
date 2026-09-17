# Banco de dados

Postgres do Supabase, multi-tenant, com isolamento por RLS.

## Projeto de desenvolvimento

`Zeno-64's Project` — ref `igsbxhvoqqpuioajpfpi`, região `sa-east-1` (São Paulo,
RNF-04), Postgres 17. O esquema todo está aplicado lá desde 2026-09-13, com
dados de demonstração.

URL e chave anônima ficam no `.env` da raiz, que está no `.gitignore` — e por
isso **não sobrevivem a um ambiente novo**. Para remontar: a URL é
`https://igsbxhvoqqpuioajpfpi.supabase.co` e a chave anônima sai em
Project Settings → API Keys, no painel do Supabase. O formato está em
`.env.example`.

Para ligar o painel:

```sh
npm run web        # http://127.0.0.1:5173
```

Contas de demonstração (fictícias, só neste projeto de desenvolvimento):

| Conta | E-mail | Senha |
|---|---|---|
| Nutricionista | `nutri@demo.test` | `demonstracao123` |
| Paciente | `paciente@demo.test` | `demonstracao123` |

Os dados de demonstração são a nutricionista Ana Ribeiro, duas pacientes (uma
delas marcada como importada da Nutrio), uma anamnese finalizada com o
questionário da §4.4, uma pré-consulta aguardando resposta e três avaliações ao
longo de seis meses, liberadas para o paciente.

Para limpar tudo:

```sql
delete from public.tenants where id = '11111111-1111-4111-8111-000000000001';
delete from auth.users where email like '%@demo.test';
```

> O projeto estava pausado e foi religado em 2026-09-13 para receber o esquema.
> Pausar de novo é no painel do Supabase.

## Como rodar

O Supabase local precisa de Docker:

```sh
npx supabase start
npx supabase db reset   # aplica todas as migrations do zero
```

Sem Docker (é o caso do ambiente de nuvem onde parte disto foi escrita), dá
para aplicar e testar num Postgres comum:

```sh
./supabase/testes/subir-postgres.sh   # cria e sobe um cluster na porta 5433
npm run db:teste
```

O cluster não sobrevive ao fim do contêiner; rodar o script de novo recria.

O script `testes/recriar.sh` derruba o banco de teste, recria, aplica o shim,
todas as migrations em ordem e os testes de RLS. Passe `--sem-testes` para só
aplicar o esquema.

`testes/00_shim_supabase.sql` **não é migration**: cria o schema `auth`, os
papéis `anon`, `authenticated` e `service_role` e a função `auth.uid()`, que no
projeto real vêm do próprio Supabase. Ele imita inclusive o *default privilege*
do Supabase, que concede tudo em `public` a `anon` e `authenticated` — por isso
`20260913121000_permissoes.sql` começa revogando esse atalho e concede só o que
cada papel precisa.

## Como o esquema está organizado

| Migration | O que traz |
|---|---|
| `..._base.sql` | Schema `app`, tipos e os gatilhos genéricos: atualização, imutabilidade e recusa de alteração |
| `..._perfis_tenants_membros.sql` | Contas, consultórios e vínculo profissional; funções `app.e_membro` e `app.e_proprietario` |
| `..._pacientes.sql` | Cadastro do paciente e `app.e_o_proprio_paciente` |
| `..._formularios.sql` | Modelos de anamnese e pré-consulta, seções e perguntas |
| `..._anamneses.sql` | Anamneses, respostas, versionamento e resposta de pré-consulta pelo paciente |
| `..._avaliacoes.sql` | Avaliação antropométrica, composição corporal e gasto energético |
| `..._anexos.sql` | Exames, fotos de evolução e documentos da Nutrio |
| `..._consentimentos.sql` | Aceite de LGPD, somente inserção |
| `..._auditoria.sql` | Trilha de quem criou, alterou, apagou e visualizou |
| `..._modelo_padrao_anamnese.sql` | Questionário atual do nutricionista (§4.4) |
| `..._permissoes.sql` | Revoga o atalho de privilégio e concede o mínimo a `authenticated` |
| `..._salvar_modelo_formulario.sql` | Grava o modelo, suas seções e perguntas numa transação, preservando o id das perguntas |

## Regras garantidas no banco

Não dependem de a aplicação lembrar de aplicá-las:

- **RN-01** — toda tabela clínica tem `tenant_id` e política de RLS; um
  profissional nunca alcança o dado de outro. O teste confere as duas coisas
  varrendo o catálogo do Postgres.
- **RN-02** — gatilho recusa `UPDATE` e `DELETE` em registro finalizado. As
  únicas colunas que continuam podendo mudar são `substituida_por_id`,
  `atualizado_em` e `liberada_em`, nenhuma delas conteúdo clínico. A correção
  sai por `nova_versao_avaliacao` e `nova_versao_anamnese`, que copiam o
  registro para uma nova versão e amarram a anterior.
- **RN-03** — o paciente só enxerga avaliação, anamnese e anexo com marca de
  liberação, mais a pré-consulta que lhe foi enviada.
- **RN-04** — paciente arquivado deixa de enxergar qualquer coisa pelo app,
  sem que nada saia do histórico.
- **RN-08** — gatilho recusa a troca do tipo de perfil da conta.
- **RF-60** — o paciente vê quem cuida dele por `meu_nutricionista()`, e não
  por política nova em `perfis`, `membros` e `tenants`. Seriam três políticas,
  cada uma um caminho a mais para vazar linha de outro consultório, e a de
  `perfis` passaria a deixar um usuário ler a linha de outro. A função escolhe
  as colunas no servidor, deixa a secretaria de fora e não devolve nada a
  paciente arquivado.
- **RF-41** — `check` recusa fator de atividade em fórmula que já resulta em
  GET, e exige o fator na que resulta em TMB.
- **RNF-11** — gatilho grava criação, alteração e exclusão na auditoria; a
  visualização entra por `registrar_visualizacao`.
- **RF-26** — editar um modelo não desliga a anamnese já preenchida:
  `salvar_modelo_formulario` atualiza a pergunta em vez de recriá-la, então o
  `pergunta_id` que a resposta guarda continua valendo.

## Segurança conferida

O linter do Supabase rodou depois de aplicar o esquema e apontou duas coisas
reais, já corrigidas na migration de permissões e na de endurecimento:

- **`search_path` solto em 9 funções.** Sem `search_path` fixo, quem chama pode
  apontar o caminho para um schema próprio e fazer a função usar uma tabela ou
  um operador plantado no lugar do original. Agora toda função fixa o caminho.
- **`EXECUTE` concedido a `PUBLIC`.** O Postgres concede por padrão em toda
  função nova e o PostgREST expõe o schema `public` como RPC, então
  `/rest/v1/rpc/finalizar_pre_consulta` e `/rest/v1/rpc/registrar_visualizacao`
  estavam alcançáveis sem login. As duas checam permissão por dentro, mas não
  havia motivo para deixá-las expostas. O `revoke` agora cobre funções e
  rotinas, não só tabelas.

Sobra um aviso que é ajuste de painel, não de código: **proteção contra senha
vazada está desligada**. Vale ligar em Authentication → Policies.

`public.rls_auto_enable` também aparece no linter: é um gatilho de evento que o
próprio Supabase instala para ligar RLS em tabela nova. Não é do projeto e já
tem `search_path` fixo.

## O que ainda falta

- Tabelas de importação da Nutrio (RF-85): as colunas `origem` e `origem_id` já
  existem em pacientes, anamneses, avaliações e anexos, com índice único que
  impede duplicar na reexecução, mas o relatório de importação ainda não tem
  tabela.
- Solicitações de exportação e exclusão pelo paciente (RF-64).
- Buckets e políticas de Storage para anexos.
- Curvas da OMS para escore-z infantil (RF-37).
