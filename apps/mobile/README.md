# App do nutricionista e do paciente

React Native com Expo (expo-router). Um app só nas lojas, com duas áreas: o
login define qual abre (RF-01).

```sh
npm run start --workspace @nutri/mobile
```

Precisa de `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no
`.env` da raiz (ver `.env.example`). Sem essas variáveis o app abre e diz o que
falta na tela de login, em vez de quebrar.

## Rotas

| Rota | Quem vê |
|---|---|
| `/` | Redireciona conforme o perfil da conta |
| `/entrar` | Qualquer um sem sessão |
| `/pacientes` | Nutricionista |
| `/evolucao` | Paciente |

As duas áreas ficam em grupos (`(nutricionista)` e `(paciente)`), cada um com um
layout que confere o perfil e manda embora quem entrou na área errada.

## Decisões

- **A sessão vive no AsyncStorage,** não no navegador: é o que o supabase-js
  precisa para manter o login entre aberturas do app.
- **A tela do paciente não filtra por liberação.** A RLS já devolve só a
  avaliação liberada (RN-03); filtrar de novo na tela daria a impressão errada
  de que a regra mora no aplicativo.
- **O `expo-env.d.ts` é gerado pelo script de typecheck** quando não existe. O
  Expo só o cria no primeiro `expo start`, e sem ele o `tsc` quebra em clone
  novo.

## O que falta

- Ficha e linha do tempo do paciente no celular (RF-55)
- Preencher anamnese e avaliação pelo celular (RF-56)
- Enviar pré-consulta e liberar avaliação (RF-57)
- Responder pré-consulta, do lado do paciente (RF-61)
- Gráficos de evolução (RF-58)
- Notificação push (RF-63) e login por biometria (RF-06)
- Rascunho local enquanto não sincroniza (RNF-07)
- Nome do app e identificador nas lojas: ainda pendente com o Kevin. O `app.json`
  está com `Nutri` / `app-nutricionista` / `appnutricionista` como provisórios.
