# App do nutricionista e do paciente

React Native com Expo (expo-router). Um app só nas lojas, com duas áreas: o
login define qual abre (RF-01).

```sh
npm run mobile              # QR Code para abrir no Expo Go, no celular
npm run mobile:navegador    # o mesmo app no navegador, sem celular
```

Para instalar de verdade no aparelho, ou publicar, veja
[docs/testar-o-app.md](../../docs/testar-o-app.md) — os perfis de build do EAS
estão em `eas.json`.

Precisa de `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no
`.env` da raiz (ver `.env.example`). Sem essas variáveis o app abre e diz o que
falta na tela de login, em vez de quebrar.

## Rotas

| Rota | Quem vê |
|---|---|
| `/` | Redireciona conforme o perfil da conta |
| `/entrar` | Qualquer um sem sessão |
| `/pacientes` | Nutricionista — lista e busca |
| `/pacientes/[id]` | Nutricionista — ficha, linha do tempo e as ações da RF-57 |
| `/evolucao` | Paciente — avaliações liberadas e gráfico de evolução |
| `/perfil` | Paciente — o próprio cadastro e quem cuida dele |
| `/pre-consultas/[id]` | Paciente — responder a pré-consulta que recebeu |

As duas áreas ficam em grupos (`(nutricionista)` e `(paciente)`), cada um com um
layout que confere o perfil e manda embora quem entrou na área errada.

## Decisões

- **A sessão vive no AsyncStorage,** não no navegador: é o que o supabase-js
  precisa para manter o login entre aberturas do app.
- **A tela do paciente não filtra por liberação.** A RLS já devolve só a
  avaliação liberada (RN-03); filtrar de novo na tela daria a impressão errada
  de que a regra mora no aplicativo.
- **O gráfico compartilha a geometria com o painel.** `@nutri/calculos`
  devolve as coordenadas e o `path` do SVG; o `react-native-svg` daqui e o
  `<svg>` do navegador desenham exatamente a mesma linha.
- **A linha do tempo também é compartilhada,** pelo mesmo motivo: o que ela
  esconde (versão substituída, RN-02) e o que ela cobra (pré-consulta sem
  resposta) são regras clínicas, não decisão de tela. Mora em
  `@nutri/calculos`, com tipos de entrada estruturais que o DTO do app e o do
  painel satisfazem sem conversão.
- **O cabeçalho da ficha é o nativo,** só ele. A lista continua desenhando o
  próprio, porque tem busca e o botão de sair; da ficha em diante quem manda é
  o `Stack`, que traz o voltar e o gesto de arrastar da borda de graça.
- **Confirmação na própria tela, não `Alert.alert`.** O `Alert` do React Native
  é um método vazio no `react-native-web`: no navegador o botão não faria nada,
  em silêncio — e é assim que as telas são conferidas aqui e que
  `npm run mobile:navegador` abre o app. A confirmação em linha tem um caminho
  de código só, funciona em toda plataforma e dá para testar.
- **A sessão carrega o vínculo (`membros`) junto do perfil.** É de lá que sai o
  `tenant_id` de qualquer gravação do nutricionista. O paciente não tem linha
  em `membros`, e a consulta volta vazia sem erro.
- **Quem o paciente vê do outro lado quem monta é o banco.** A RLS fecha
  `perfis`, `membros` e `tenants` para ele — e continua fechando: a tela de
  perfil chama `meu_nutricionista()`, uma função que escolhe as colunas no
  servidor. Abrir as três tabelas seriam três políticas novas, e a de `perfis`
  passaria a deixar um usuário ler a linha de outro.
- **O perfil do paciente é só leitura,** e a tela diz isso. Ele não tem
  política de `update` em `pacientes`: quem mantém o cadastro é o
  nutricionista. Mostrar um campo que o banco recusaria seria pior do que a
  frase.
- **A pré-consulta grava cada resposta ao sair do campo,** não só no fim. O
  questionário é longo e o app pode ir para segundo plano no meio; perder o que
  já foi digitado seria o pior jeito de estrear com o paciente. O envio final
  é só a chamada de `finalizar_pre_consulta`.
- **Quem encerra a pré-consulta é a função do banco.** O paciente nunca ganha
  `update` em `anamneses` — só em `respostas_anamnese`, e só enquanto a
  pré-consulta está em rascunho. A trava é da RLS, não da tela.
- **Escolha em fichas, não no seletor nativo.** Com três a onze opções, a ficha
  mostra tudo de uma vez e responde a um toque; num formulário longo, um
  seletor que abre e fecha a cada pergunta cansa. E o componente nativo do
  `@expo/ui` não aparece no navegador, onde as telas são conferidas.
- **Imports relativos sem extensão:** o Metro não resolve o `.js` que o
  TypeScript aceita, e isso quebrava o bundle assim que o app passou a
  importar o pacote de cálculos.
- **O `expo-env.d.ts` é gerado pelo script de typecheck** quando não existe. O
  Expo só o cria no primeiro `expo start`, e sem ele o `tsc` quebra em clone
  novo.
- **`web.output` é `single`, não `static`.** O `static` pré-renderiza cada rota
  no Node, e o cliente do Supabase lê a sessão do armazenamento assim que sobe —
  no Node não existe `window`, e o empacotamento para web quebrava inteiro. Num
  app inteiro autenticado não há o que pré-renderizar.
- **`/entrar` redireciona quem já tem sessão.** O `index.tsx` é quem sabe qual
  área abrir para cada perfil; a tela de login só o chama de volta. Sem isso o
  login dava certo e a tela não mudava.
- **O ícone é desenhado em código,** em `scripts/gerar-icones.mjs`, e não vem de
  um editor de imagem. Dá para gerar em qualquer tamanho, reler o que a marca é
  e ajustar de onde não há editor — que é o caso do ambiente em nuvem onde parte
  deste projeto foi escrita. É provisório de qualquer forma.
- **A versão aparece no rodapé** do login e das duas áreas. Numa distribuição de
  teste isso não é enfeite: o cliente relata um problema por mensagem, e é por
  esse número que se sabe de qual build ele fala. O número entre parênteses é o
  do build, que só existe no app instalado.

## O que falta

- Preencher anamnese e avaliação pelo celular (RF-56). Atenção a um ponto que
  já existe no painel: a resposta de pergunta numérica é gravada como texto
  (`"67,8"`), do jeito que foi digitada. Serve para a pré-consulta, onde ninguém
  calcula em cima; a avaliação vai precisar de número de verdade.
- Notificação push (RF-63) e login por biometria (RF-06)
- Rascunho local enquanto não sincroniza (RNF-07)
- Nome do app e identificador nas lojas: ainda pendente com o Kevin. O `app.json`
  está com `Nutri` / `app-nutricionista` / `appnutricionista` como provisórios.
- Identidade visual: o ícone e o splash são uma folha provisória, gerada por
  `npm run icones`. Servem para o app não se apresentar como o template do
  Expo; não substituem a marca que o Kevin escolher.
