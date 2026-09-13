# Banco de dados

Postgres do Supabase, multi-tenant, com isolamento por RLS.

## Como rodar

O Supabase local precisa de Docker:

```sh
npx supabase start
npx supabase db reset   # aplica todas as migrations do zero
```

Sem Docker (é o caso do ambiente de nuvem onde parte disto foi escrita), dá
para aplicar e testar num Postgres comum:

```sh
# sobe um cluster qualquer na porta 5433 e então:
npm run db:teste
```

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
- **RF-41** — `check` recusa fator de atividade em fórmula que já resulta em
  GET, e exige o fator na que resulta em TMB.
- **RNF-11** — gatilho grava criação, alteração e exclusão na auditoria; a
  visualização entra por `registrar_visualizacao`.

## O que ainda falta

- Tabelas de importação da Nutrio (RF-85): as colunas `origem` e `origem_id` já
  existem em pacientes, anamneses, avaliações e anexos, com índice único que
  impede duplicar na reexecução, mas o relatório de importação ainda não tem
  tabela.
- Solicitações de exportação e exclusão pelo paciente (RF-64).
- Buckets e políticas de Storage para anexos.
- Curvas da OMS para escore-z infantil (RF-37).
