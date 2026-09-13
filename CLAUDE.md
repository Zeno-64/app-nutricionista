# App para nutricionista

Sistema para um nutricionista (e, depois, vários, como SaaS) gerenciar
pacientes, anamnese e avaliações, com um app em que o paciente acompanha a
própria evolução. O nutricionista usa hoje a Nutrio e vai migrar de lá.

Requisitos completos em [docs/requisitos.md](docs/requisitos.md) — ler antes de
implementar. Status das fórmulas em
[docs/verificacao-formulas.md](docs/verificacao-formulas.md). Como rodar e
instalar o app em [docs/testar-o-app.md](docs/testar-o-app.md).

## Decisões tomadas

- **App:** React Native com Expo (expo-router). Um único app nas lojas com dois
  perfis, nutricionista e paciente; o login define qual área abre.
- **Painel web do nutricionista:** React + Vite + Tailwind 4 + TypeScript, no
  mesmo padrão dos outros projetos do Kevin (React 19, Vite 8, TS 6,
  `@tailwindcss/vite`).
- **Backend:** Supabase (Postgres, Auth, Storage), região de São Paulo.
  Multi-tenant desde o início, com isolamento por RLS.
- **Monorepo com npm workspaces:**
  - `apps/mobile` — Expo
  - `apps/web` — painel web
  - `packages/calculos` — fórmulas e protocolos em TypeScript puro, com Vitest
  - `supabase/` — config, migrations e testes de RLS
- O painel web usa a **mesma versão de React fixada pelo Expo**, para não haver
  duas cópias de React no workspace.
- Sem IA no escopo.

## Regras que não podem ser quebradas

- Toda tabela com dado clínico tem `tenant_id` e política de RLS.
- Registro clínico finalizado não é apagado nem sobrescrito; correção gera nova
  versão com data e autor.
- Uma fórmula só fica disponível no app depois de conferida em fonte primária e
  coberta por teste com valor de referência. Enquanto isso, fica no catálogo com
  status `pendente` e não calcula.
- Fórmulas EER já resultam em GET: nunca multiplicar por fator de atividade.
- Interface, documentação e mensagens de commit em português do Brasil.
- Import relativo sem extensão (`./x`, nunca `./x.js`): o Metro, do Expo, não
  resolve o `.js` que o TypeScript aceita, e o pacote de cálculos é
  compartilhado entre app e painel.
- Segredos (chaves do Supabase etc.) só em `.env`, nunca no repositório.

## Estado atual (2026-09-13)

Requisitos v0.2 fechados. Monorepo de pé, com as quatro partes andando:

- **`packages/calculos`** — catálogo completo das §4.5 e §4.6: 8 protocolos de
  composição corporal e 24 fórmulas de gasto energético, cada um com status,
  referência e as medidas que exige. Só calcula o que não tem coeficiente a
  conferir: IMC, RCQ, RCE, massa gorda e MLG, meta calórica e macros, fórmula de
  bolso e os valores manuais. O resto recusa o cálculo, e um teste de catálogo
  garante que nada escapa disso. Toda saída carrega memória de cálculo.
- **`supabase/`** — migrations de tenants, membros, pacientes, modelos de
  formulário, anamneses, avaliações, anexos, consentimentos e auditoria, com
  RLS, trava de imutabilidade, versionamento e testes. Detalhes em
  `supabase/README.md`.
- **`apps/web`** — login, rota por perfil, lista de pacientes, cadastro e edição
  com validação, arquivamento, linha do tempo, anamnese e pré-consulta com
  versionamento e comparação, nova avaliação com cálculo ao vivo e memória na
  tela, evolução com gráfico e tabela comparativa, e editor de modelos de
  anamnese e pré-consulta.
- **`apps/mobile`** — login, rota por perfil, lista de pacientes e, para o
  paciente, as avaliações liberadas com gráfico de evolução. O gráfico usa a
  mesma geometria do painel, calculada em `@nutri/calculos`. Roda no Expo Go
  (`npm run mobile`) ou no navegador (`npm run mobile:navegador`); para instalar
  no aparelho, o `eas.json` tem os perfis de build.

229 testes no workspace, mais 52 asserções no banco. Typecheck limpo nos
três pacotes, painel e app empacotam, console do navegador sem erro.

### Três bloqueios que dependem de fora

1. **Nenhuma fórmula com coeficiente foi liberada.** Faltam as duas metades da
   RN-06: a conferência na fonte primária e o caso de referência da Nutrio.
   A conferência não pôde ser feita aqui porque a política de rede da sessão em
   nuvem recusa os domínios das publicações (`www.fao.org`,
   `journals.plos.org` e os demais) — ver `docs/verificacao-formulas.md`.
   Precisa de máquina com acesso aberto, ou liberar esses domínios.
2. **Sem Docker no ambiente,** o Supabase local não sobe. As migrations rodam e
   são testadas num Postgres comum: `./supabase/testes/subir-postgres.sh` e
   depois `npm run db:teste`, que usa o shim de
   `supabase/testes/00_shim_supabase.sql`.
3. **A rede da sessão em nuvem recusa `*.supabase.co`,** então o navegador
   daqui não alcança o projeto. O painel e o app não puderam ser exercitados
   ponta a ponta a partir deste ambiente — na máquina do Kevin funcionam com
   `npm run web`. As telas foram conferidas rodando o painel e o app de verdade
   e interceptando as respostas HTTP com os mesmos dados do banco:
   `npm run telas:painel` e `npm run telas:app` repetem a conferência. O que
   some nessa troca é a RLS, testada no banco.

   **O esquema está aplicado no projeto de desenvolvimento** desde 2026-09-13,
   com dados de demonstração e contas de teste — ver `supabase/README.md`.
   As chaves estão no `.env` da raiz, fora do repositório.

Pendências com o Kevin:
- Prints do questionário de pré-consulta atual.
- Confirmar se a lista de fórmulas dos prints está completa.
- Paciente fictício cadastrado na Nutrio com os resultados de cada fórmula e
  protocolo, para servir de caso de teste (ver verificação de fórmulas).
- Resposta da Nutrio ao pedido de portabilidade dos dados.
- Nome do app e identificador nas lojas (bundle id). O `app.json` está com
  `Nutri` / `app-nutricionista` / `appnutricionista` como provisórios.

## Próximos passos

1. **Liberar as fórmulas** (RN-06), uma a uma: ler a fonte primária, anotar os
   coeficientes em `docs/verificacao-formulas.md`, implementar o `calcular`,
   escrever o teste com o valor de referência e só então virar o status. Siri
   vem primeiro: sem ela, nenhum protocolo de densidade calcula.
2. **Exercitar painel e app ponta a ponta** contra o projeto de
   desenvolvimento, numa máquina cuja rede alcance o Supabase. O esquema, os
   dados de demonstração e as contas de teste já estão lá.
3. **Painel:** convite do paciente para o app, anexos e fotos de evolução,
   PDF da avaliação.
4. **App:** ficha e linha do tempo do paciente, preencher anamnese e avaliação
   pelo celular, enviar pré-consulta e liberar avaliação, responder
   pré-consulta.
5. **Migração da Nutrio** (RF-80 a RF-87): tabelas de importação e relatório. As
   colunas `origem` e `origem_id` já existem nas tabelas clínicas, com índice
   único que impede duplicar numa reexecução.

## Como trabalhar

- Ao terminar uma tarefa: verificar (testes, build, console sem erro), commitar
  e dar push sem pedir confirmação.
- Ao pesquisar coeficientes na web, não colocar os números na busca e não
  confiar em resumos automáticos: ler o texto da fonte. Ver o motivo em
  docs/verificacao-formulas.md.
