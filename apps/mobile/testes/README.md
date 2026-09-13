# Conferência visual das telas do app

`telas.mjs` empacota o app para web, serve o resultado e percorre as telas num
navegador em tamanho de celular, tirando print de cada uma e reclamando de
qualquer erro no console.

```sh
node apps/mobile/testes/telas.mjs
```

Os prints saem em `apps/mobile/testes/telas/`, que está no `.gitignore`. O
empacotamento demora ~1 min; para repetir sem empacotar de novo, aponte para o
pacote já pronto:

```sh
PACOTE=apps/mobile/testes/telas/export node apps/mobile/testes/telas.mjs
```

## Por que empacota para web

O app roda no navegador via `react-native-web`, e é o mesmo código: os mesmos
componentes, o mesmo `expo-router`, o mesmo `@nutri/calculos`. O que muda é só
como cada `View` é desenhada. Isso deixa a conferência rodar sem emulador de
Android nem Mac — que é o caso do ambiente de nuvem onde parte deste projeto foi
escrita.

Não substitui abrir no celular: gesto, teclado e desempenho só aparecem lá. Veja
`docs/testar-o-app.md`.

## Por que finge as respostas do Supabase

O roteiro intercepta as chamadas HTTP e devolve os mesmos dados que estão no
projeto de desenvolvimento, porque a rede daquele ambiente recusa
`*.supabase.co`. A tela, a navegação e o cálculo são os reais — só o transporte
é simulado.

Uma coisa some nessa troca: **a RLS**. É o banco que decide o que o paciente
enxerga (RN-03), e aqui é o roteiro que decide. Por isso a parte de permissão é
testada no banco, em `supabase/testes/`, e não aqui.

## O que ele confere além do print

As telas que gravam são exercitadas de verdade: o roteiro toca no botão,
confirma e olha o que o app *tentou* escrever — que a liberação manda
`liberada_em`, que a pré-consulta sai com `enviada_em` preenchido, que só as
perguntas que se aplicam àquele paciente foram copiadas (RF-22), que cada tipo
de resposta chega no formato certo (texto, número, booleano, nota) e que o
envio final passa por `finalizar_pre_consulta`, não por um `update` direto. É o
mais perto que dá de um teste de integração sem banco.

## Três defeitos que ele já pegou

Valem como exemplo do que só aparece com o app montado:

- **`web.output` era `static`.** O Expo pré-renderizava cada rota no Node, e o
  cliente do Supabase lê a sessão do armazenamento logo ao subir — o que no Node
  não existe. O empacotamento para web quebrava inteiro. Virou `single`: o app
  é autenticado, não há o que pré-renderizar.
- **Entrar não levava a lugar nenhum.** O login dava certo, e a tela continuava
  sendo a de login: `index.tsx` roteia por perfil, mas `/entrar` não mandava
  ninguém embora depois que a sessão passava a existir. Acontecia também ao
  reabrir o app já logado.
- **`Alert.alert` não faz nada no navegador.** As confirmações de liberar
  avaliação e enviar pré-consulta tinham nascido com o `Alert` do React Native,
  que no `react-native-web` é um método vazio: o botão ficaria mudo para quem
  abrisse o app pelo navegador. Viraram confirmação na própria tela.

> Precisa do Playwright, no projeto ou global:
> `npm install --no-save playwright && npx playwright install chromium`.
