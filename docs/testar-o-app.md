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

## 3. Instalado no celular, sem passar pela loja

Aqui o app vira um arquivo instalável de verdade, com ícone e nome. É o que
serve para você usar no dia a dia e para entregar a um paciente de teste. Usa o
**EAS Build**, o serviço de build da Expo — a compilação acontece na nuvem
deles, não é preciso ter Android Studio nem Mac.

Uma vez só, crie uma conta em https://expo.dev e:

```sh
npx eas-cli login
npx eas-cli build:configure
```

Depois, a cada versão que quiser testar:

```sh
# Android: sai um .apk para instalar direto no aparelho
npx eas-cli build --profile teste --platform android

# iPhone: exige conta paga de desenvolvedor Apple (US$ 99/ano) e vai pelo
# TestFlight; sem ela, o iPhone só roda pelo Expo Go
npx eas-cli build --profile teste --platform ios
```

Ao terminar, o EAS devolve um link. No Android, abrir o link no celular baixa e
instala o APK. Os perfis de build estão em `apps/mobile/eas.json`:
`desenvolvimento` (com ferramentas de depuração), `teste` (o que você quer aqui)
e `producao` (para as lojas).

> O plano gratuito do EAS tem fila e um limite de builds por mês. Para testar
> algumas versões por mês, sobra.

## 4. Nas lojas

Só quando o app estiver pronto para pacientes de verdade. Antes disso faltam
três decisões suas, hoje provisórias em `apps/mobile/app.json`:

- o nome que aparece na loja e embaixo do ícone (hoje `Nutri`)
- o identificador do app (hoje `appnutricionista`), que **não muda depois de
  publicado**
- ícone e splash próprios, no lugar dos do template

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
