# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Se a rede recusar docs.expo.dev

É o caso do ambiente de nuvem onde parte deste projeto foi escrita: `WebFetch`
volta `EGRESS_BLOCKED`. O plugin oficial da Expo alcança a documentação por
outro caminho, e traz 24 skills (`expo-router`, `eas-app-stores`,
`expo-upgrade`, `expo-ui` e outras) com o conteúdo embutido.

```sh
git clone --depth 1 https://github.com/expo/skills.git /root/expo-skills
claude plugin marketplace add /root/expo-skills
claude plugin install expo@expo-plugins
```

O clone é raso e sem submódulo de propósito: `claude plugin marketplace add
expo/skills` falha porque o repositório tem um submódulo privado
(`expo/eval-experiments`) e o clone aborta nele.

Depois disso, `mcp__Expo__search_documentation` e `mcp__Expo__read_documentation`
leem as páginas versionadas. As skills carregam sozinhas quando o assunto
aparece.
