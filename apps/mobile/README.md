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
| `/pacientes/[id]` | Nutricionista — ficha e linha do tempo |
| `/evolucao` | Paciente — avaliações liberadas e gráfico de evolução |

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

## O que falta

- Preencher anamnese e avaliação pelo celular (RF-56)
- Enviar pré-consulta e liberar avaliação (RF-57)
- Responder pré-consulta, do lado do paciente (RF-61)
- Notificação push (RF-63) e login por biometria (RF-06)
- Rascunho local enquanto não sincroniza (RNF-07)
- Nome do app e identificador nas lojas: ainda pendente com o Kevin. O `app.json`
  está com `Nutri` / `app-nutricionista` / `appnutricionista` como provisórios.
- Limpar o que sobrou do template: `@expo/ui`, `expo-glass-effect`,
  `expo-symbols`, `expo-image`, `expo-device`, `expo-font` e `expo-web-browser`
  estão nas dependências e não são usados por nenhuma tela. Ícone e splash
  também ainda são os do template.
