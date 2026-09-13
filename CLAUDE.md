# App para nutricionista

Sistema para um nutricionista (e, depois, vários, como SaaS) gerenciar
pacientes, anamnese e avaliações, com um app em que o paciente acompanha a
própria evolução. O nutricionista usa hoje a Nutrio e vai migrar de lá.

Requisitos completos em [docs/requisitos.md](docs/requisitos.md) — ler antes de
implementar. Status das fórmulas em
[docs/verificacao-formulas.md](docs/verificacao-formulas.md).

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
- Segredos (chaves do Supabase etc.) só em `.env`, nunca no repositório.

## Estado atual (2026-09-12)

Requisitos v0.2 fechados para o MVP. Nenhum código escrito ainda.

Pendências com o Kevin:
- Prints do questionário de pré-consulta atual.
- Confirmar se a lista de fórmulas dos prints está completa.
- Paciente fictício cadastrado na Nutrio com os resultados de cada fórmula e
  protocolo, para servir de caso de teste (ver verificação de fórmulas).
- Resposta da Nutrio ao pedido de portabilidade dos dados.
- Nome do app e identificador nas lojas (bundle id).

## Próximos passos

1. **Monorepo:** `package.json` raiz com workspaces; `apps/mobile` com
   `create-expo-app` (template default); `apps/web`; `packages/calculos`.
2. **`packages/calculos`:** IMC, RCQ, RCE; protocolos de dobras; Siri; massa
   gorda e MLG; gasto energético; meta calórica e macros. Catálogo com todas as
   opções da §4.5 e §4.6 dos requisitos, cada uma com status.
3. **`supabase/migrations`:** tenants, membros, pacientes, modelos de formulário
   (anamnese e pré-consulta), anamneses, avaliações, anexos, consentimentos,
   auditoria; RLS; trigger de imutabilidade; testes de RLS. O Supabase local
   precisa de Docker — se o ambiente não tiver, usar um projeto de
   desenvolvimento com credenciais no `.env`.
4. **Painel web:** login, pacientes, linha do tempo, nova avaliação com cálculo
   ao vivo.
5. **App:** login, rota por perfil, lista de pacientes (nutricionista) e
   avaliações liberadas (paciente).

## Como trabalhar

- Ao terminar uma tarefa: verificar (testes, build, console sem erro), commitar
  e dar push sem pedir confirmação.
- Ao pesquisar coeficientes na web, não colocar os números na busca e não
  confiar em resumos automáticos: ler o texto da fonte. Ver o motivo em
  docs/verificacao-formulas.md.
