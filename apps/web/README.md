# Painel web do nutricionista

React + Vite + Tailwind 4 + TypeScript.

```sh
npm run dev --workspace @nutri/web
```

Precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` da raiz (ver
`.env.example`). Sem essas variáveis o painel sobe e mostra na tela de login o
que falta configurar, em vez de quebrar.

## Decisões

- **React 19.2.3, exatamente a versão que o Expo fixa.** O `overrides` do
  `package.json` da raiz garante uma cópia só de React no workspace.
- **react-router na linha 7.** A 8 exige `react >= 19.2.7`, o que brigaria com
  a versão fixada pelo Expo. A API que o painel usa é a mesma nas duas.
- **O cálculo mora em `@nutri/calculos`,** não na tela. `calculoAoVivo.ts` é uma
  função pura que recebe o formulário como está digitado — texto, vírgula
  decimal, campos pela metade — e devolve o que dá para calcular agora, com um
  aviso em português no lugar de cada bloco que ainda não fecha. Por ser pura,
  é testada sem navegador.
- **Status de verificação na tela.** Protocolo e fórmula que ainda não foram
  conferidos na fonte primária aparecem na lista com "não confere ainda" e, ao
  serem escolhidos, explicam no lugar do resultado por que não calculam (RN-06).

## O que já tem

- Login com e-mail e senha e recuperação de senha (RF-01)
- Rota por perfil: nutricionista e paciente não se misturam (RN-08)
- Lista de pacientes com busca e filtro de arquivados (RF-11)
- Cadastro e edição de paciente, com validação de CPF, data e grupos, e
  arquivamento (RF-10, RF-12, RF-16)
- Linha do tempo do paciente (RF-13)
- Anamnese e pré-consulta: criação a partir do modelo pulando as perguntas que
  não se aplicam, preenchimento, finalização, nova versão e comparação com a
  anterior (RF-20 a RF-26)
- Nova avaliação com cálculo ao vivo e memória de cálculo (RF-30 a RF-45)
- Área do paciente com as avaliações liberadas (RF-62)

## O que falta

- Convite do paciente para o app (RF-02): precisa de função de servidor, porque
  o convite por e-mail usa a chave de service role
- Criação e edição de modelos de formulário (RF-20, RF-27) — hoje só existe o
  modelo padrão criado pela função do banco
- Anexos e fotos de evolução (RF-14, RF-15)
- Gráficos de evolução e tabela comparativa (RF-50, RF-51)
- PDF da avaliação (RF-52)
- Migração da Nutrio (RF-80 a RF-87)
