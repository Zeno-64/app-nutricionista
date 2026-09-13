# Conferência visual das telas

`telas.mjs` roda o painel de verdade num navegador e percorre as nove telas,
tirando print de cada uma e reclamando de qualquer erro no console.

```sh
npm run dev --workspace @nutri/web -- --port 4180   # num terminal
node apps/web/testes/telas.mjs                      # noutro
```

Os prints saem em `apps/web/testes/telas/`, que está no `.gitignore`.

## Por que ele finge as respostas do Supabase

O script intercepta as chamadas HTTP e devolve os mesmos dados que estão no
projeto de desenvolvimento. O componente, o roteamento e o cálculo são os
reais — só o transporte é simulado.

Isso existe por um motivo prático: a rede do ambiente de nuvem onde parte deste
projeto foi escrita recusa `*.supabase.co`, então o navegador de lá não alcança
o banco. Numa máquina com rede aberta, dá para conferir as telas contra o
Supabase de verdade, com as contas de demonstração de `supabase/README.md` — e
aí o script serve mais como roteiro do que como simulação.

Não substitui os testes do Vitest: a lógica de cálculo, de validação e de
anamnese é testada direto, sem navegador. O que este script pega é o que só
aparece montado — HTML inválido, erro de hidratação, tela que não renderiza.

> Precisa do Playwright (`npx playwright install chromium`) ou de um Chromium
> já instalado, como o do ambiente de nuvem.
