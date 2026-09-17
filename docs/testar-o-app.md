# Como testar o app

O app existe e funciona, mas ainda não está publicado em lugar nenhum: não há
build nas lojas, nem link de download, nem painel no ar. São quatro formas de
testar, da mais rápida para a mais parecida com o produto final.

Antes de qualquer uma delas, o `.env` da raiz precisa existir — veja
`.env.example` e `supabase/README.md`, que diz onde pegar a chave. Sem ele o app
abre e avisa na tela de login o que falta, em vez de quebrar.

## 1. No navegador, em dois minutos

A forma mais rápida de ver as telas, sem instalar nada no celular:

```sh
npm install
npm run mobile:navegador      # abre em http://localhost:8081
```

O app roda no navegador via `react-native-web`. Deixe a janela estreita (ou use
o modo celular do navegador) para ver no tamanho certo.

**O que isso não pega:** gesto, teclado do celular, desempenho real, câmera,
notificação. Serve para conferir tela, navegação e cálculo.

## 2. No seu celular, com o Expo Go

Instale o **Expo Go** na loja do seu celular (Android ou iPhone), e então:

```sh
npm run mobile
```

Aparece um QR Code no terminal. No Android, leia pelo próprio Expo Go; no
iPhone, pela câmera. O celular e o computador precisam estar na mesma rede
Wi-Fi — se não estiverem, rode `npm run mobile -- --tunnel`.

Isso funciona porque o app só usa bibliotecas que já vêm dentro do Expo Go. É o
app de verdade rodando no seu celular de verdade, com recarga automática a cada
salvamento.

**O que isso não pega:** ícone e nome próprios, splash, notificação push e
login por biometria — tudo isso é do app instalado, não do Expo Go.

## 3. Instalado no celular — e mandado para outra pessoa

Aqui o app vira um arquivo instalável de verdade, com ícone e nome, que você
manda por link para quem vai testar. **É o EAS Build que resolve isso**, com o
que a Expo chama de *distribuição interna*: o build sai da nuvem deles e vira um
link, sem passar por loja nenhuma. Não precisa de Android Studio nem de Mac.

O passo a passo está em [Mandar o app para o cliente
testar](#mandar-o-app-para-o-cliente-testar), logo abaixo — é a mesma coisa,
só que contada do começo.

## Mandar o app para o cliente testar

Sim, o Expo resolve — mas resolve **bem no Android e caro no iPhone**. Vale
saber a diferença antes de começar.

| | Android | iPhone |
|---|---|---|
| Como chega | Link do EAS, abre e instala o APK | TestFlight |
| Custo | Zero, fora a fila do plano gratuito do EAS | **US$ 99/ano** da conta Apple Developer |
| Espera | Minutos | Minutos, mais o processamento da Apple |
| Atualizar | Novo link a cada build | Aparece sozinho no TestFlight |

**Não existe caminho gratuito para o iPhone.** Nem TestFlight nem distribuição
interna funcionam sem a conta paga — a interna ainda exige registrar o aparelho
de cada testador. Sem pagar, no iPhone só resta o Expo Go, que precisa do seu
computador rodando o servidor: serve para você mostrar o app, não para deixar
alguém usar por conta.

O repositório já está pronto para isso: `eas.json` tem os perfis, o `app.json`
tem o identificador e o ícone, e o app mostra a versão no rodapé. **O que falta
é a conta na Expo** — ela é sua, e não dá para criar daqui.

### Uma vez só

**1. Conta e projeto.** Crie a conta em https://expo.dev e, no projeto:

```sh
npm install -g eas-cli
eas login
cd apps/mobile && eas init      # cria o projeto e grava o id no app.json
```

O `eas init` acrescenta `extra.eas.projectId` e `owner` ao `app.json`. Commite:
sem eles nenhum build sabe a que projeto pertence.

**2. As chaves do Supabase.** É o passo que mais dá errado: as variáveis
`EXPO_PUBLIC_*` são embutidas no momento do build, e o `.env` não vai para o
repositório nem para a nuvem. Sem isso o build termina bem e o app abre dizendo
que falta configurar o Supabase.

```sh
eas env:set --environment preview --visibility plaintext \
  --name EXPO_PUBLIC_SUPABASE_URL --value "https://igsbxhvoqqpuioajpfpi.supabase.co"
eas env:set --environment preview --visibility sensitive \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<a chave anônima, do .env>"
```

O perfil `teste` do `eas.json` aponta para o ambiente `preview`, então é de lá
que ele lê. `eas env:list --environment preview` confere o que ficou gravado.

A visibilidade só decide quem enxerga o valor no painel e nos registros da
Expo: qualquer `EXPO_PUBLIC_*` acaba dentro do pacote do app, que é legível por
quem instalar. É por isso que a chave anônima pode ir aí — quem protege os
dados é a RLS, não o segredo da chave. Nenhuma chave de service role entra
neste caminho.

Dá para fazer o mesmo pelo painel, em *Project settings → Environment
variables*. O item **Environment variables** que aparece na barra lateral da
conta é outra coisa: vale para todos os projetos da conta, e se mistura com os
do projeto na hora do build.

**3. Ligue o repositório do GitHub** ao projeto. Não é obrigatório para buildar
da sua máquina, mas é o que permite disparar um build sem ela — inclusive de uma
sessão do Claude Code, que alcança a API da Expo mas não tem como fazer
`eas login`. A Expo pede quatro coisas:

- sua conta do GitHub ligada à da Expo, em *Account settings → Overview → User
  settings → Connections*;
- o app do GitHub da Expo instalado na sua conta do GitHub (ele pede a
  permissão na hora);
- o repositório ligado ao projeto, em *Project settings → GitHub*, com a **base
  directory** valendo `apps/mobile` — sem isso ele procura o app na raiz do
  monorepo e não acha;
- **um build que já tenha dado certo da sua máquina**, para cada plataforma. É
  pré-requisito da Expo, não capricho: o build pelo GitHub não é o primeiro.

O `image: "latest"` que o `eas.json` já traz nos perfis também é exigência
desse caminho.

### A cada versão

```sh
cd apps/mobile
eas build --profile teste --platform android
```

O EAS devolve um link (também fica em https://expo.dev, no painel do projeto).
Mande esse link para o cliente: ele abre no celular, baixa e instala. O Android
pergunta se aceita instalar de fora da Play Store — é normal e ele só precisa
confirmar.

O número do build sobe sozinho a cada envio (`autoIncrement` no perfil `teste`),
e é ele que aparece entre parênteses no rodapé do app. **Suba também o `version`
do `app.json`** quando a mudança for grande o bastante para o cliente perceber —
é por esse par que se sabe de qual versão ele está falando quando relata algo.

Para iPhone, depois de pagar a conta Apple:

```sh
eas build --profile teste --platform ios --auto-submit
```

Daí o cliente instala o **TestFlight** na App Store e aceita o convite que
chega por e-mail. As versões seguintes aparecem sozinhas para ele.

> O plano gratuito do EAS tem fila e limite de builds por mês. Para algumas
> versões por mês, sobra.

### O recado que vai junto

Metade dos "defeitos" de um teste guiado é o testador descobrindo sozinho o que
ainda não existe. Vale mandar algo assim junto com o link:

> Este é um teste, não a versão final. Na primeira vez que entrar como
> paciente, aparece o termo de consentimento — é exigência da LGPD, e sem
> aceitar não dá para seguir. Para entrar, use o e-mail e a senha que
> te mandei — a lista de pacientes já vem com dados de demonstração, pode mexer
> à vontade que nada aí é real.
>
> O que dá para fazer hoje: ver a lista e a ficha de cada paciente com a linha
> do tempo, enviar uma pré-consulta e liberar uma avaliação para o paciente ver.
> Entrando com a conta de paciente, dá para responder a pré-consulta e ver o
> gráfico de evolução.
>
> O que ainda **não** funciona, e não precisa reportar:
>
> - **Nenhum cálculo de gordura corporal ou gasto energético sai.** É de
>   propósito: as fórmulas só são ligadas depois de conferidas na publicação
>   original, uma a uma.
> - Não dá para cadastrar paciente, preencher avaliação nem anexar exame pelo
>   celular — isso é pelo painel no computador.
> - O ícone é provisório.
>
> Quando algo parecer errado, me manda o print **com o rodapé da tela de login
> ou da lista**, onde aparece o número da versão.

### Antes de mandar, confira

- **O identificador do app** está provisório: `com.appnutricionista.nutri`, no
  `app.json`. Enquanto for só teste, mudar é de graça — depois de publicado numa
  loja, **não muda mais**. Decida antes da primeira publicação.
- **O ícone é uma folha provisória**, gerada por
  `npm run icones --workspace @nutri/mobile`. Não é mais o do Expo, mas também
  não é identidade visual: quando você decidir a sua, troque os PNGs de
  `apps/mobile/assets/images` ou as medidas do script que os gera.
- **Nenhuma fórmula com coeficiente calcula** (RN-06) — está no recado acima
  porque é o que mais confunde quem testa.
- **O app precisa alcançar o Supabase.** Da rede do cliente isso funciona; do
  ambiente de nuvem onde parte do projeto foi escrito, não.

## 4. Nas lojas

Só quando o app estiver pronto para pacientes de verdade. Antes disso faltam
três decisões suas, hoje provisórias em `apps/mobile/app.json`:

- o nome que aparece na loja e embaixo do ícone (hoje `Nutri`)
- o identificador do app (hoje `com.appnutricionista.nutri`), que **não muda
  depois de publicado**
- ícone e splash definitivos, no lugar da folha provisória

E, do lado burocrático: conta Google Play (US$ 25, uma vez) e conta Apple
Developer (US$ 99/ano), mais política de privacidade publicada — os dois
exigem, e o app trata dado de saúde.

## E o painel web?

Mesma situação: roda localmente, não está no ar.

```sh
npm run web        # http://127.0.0.1:5173
```

Para colocar no ar, o painel é um site estático (`npm run build --workspace
@nutri/web` gera `apps/web/dist`), então serve qualquer hospedagem de estático —
Vercel, Netlify, Cloudflare Pages. As variáveis `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` precisam ser configuradas lá também. Isso ainda não foi
feito e não tem domínio escolhido.

## Contas para entrar

Estão no `supabase/README.md`. Resumindo: `nutri@demo.test` abre a área do
nutricionista e `paciente@demo.test` a do paciente, as duas com a senha
`demonstracao123`, no projeto de desenvolvimento.

## Conferir as telas sem abrir nada

Existe um roteiro que empacota o app, percorre as telas num navegador e tira
print de cada uma, reclamando de qualquer erro no console:

```sh
node apps/mobile/testes/telas.mjs      # app
node apps/web/testes/telas.mjs         # painel (com o painel rodando na 4180)
```

É o que se usa para conferir visualmente de uma máquina sem celular à mão. Os
detalhes estão em `apps/mobile/testes/README.md`.

## O que você vai encontrar hoje

No app: login, e daí a lista de pacientes (nutricionista) ou o gráfico de
evolução com as avaliações liberadas (paciente). É pouco de propósito — a maior
parte do trabalho até aqui foi o painel, o banco e as regras clínicas. O que
falta no celular está listado em `apps/mobile/README.md`.
