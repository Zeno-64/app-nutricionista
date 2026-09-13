# Roadmap

Onde o projeto está, o que falta e em que ordem. Os requisitos completos estão
em [requisitos.md](requisitos.md); aqui é só o andamento.

Atualizado em 2026-09-13.

## Resumo

O alicerce está pronto: banco com as regras clínicas garantidas por gatilho e
RLS, catálogo completo de fórmulas, painel web cobrindo o atendimento inteiro e
app com as duas áreas de pé. 232 testes no workspace, 52 asserções no banco,
12 migrations.

O que falta se divide em três grupos, e vale entender a diferença:

1. **Um bloqueio que não se resolve com código** — nenhuma fórmula com
   coeficiente calcula, e não vai calcular até serem conferidas na fonte
   primária. Isso segura a entrega mais do que qualquer tela faltando.
2. **Funcionalidades que faltam** — anexos, PDF, convite do paciente, avaliação
   pelo celular, migração da Nutrio.
3. **O que só você pode responder** — prints da pré-consulta, nome do app,
   resposta da Nutrio.

## O bloqueio principal

**Nenhum protocolo de composição corporal e nenhuma fórmula de gasto energético
com coeficiente está liberado.** O catálogo tem os 8 protocolos e as 24
fórmulas, cada um com status e referência, mas quem tem coeficiente a conferir
recusa o cálculo. Calculam hoje: IMC com classificação, cintura-quadril,
cintura-estatura, massa gorda e MLG a partir de um % de gordura informado, meta
calórica, macros, fórmula de bolso e os valores manuais de TMB e GET.

Isso é a RN-06 funcionando como projetada, não um defeito. Para liberar cada
uma faltam duas metades:

- **Ler a publicação original** e anotar os coeficientes em
  [verificacao-formulas.md](verificacao-formulas.md). A rede desta sessão em
  nuvem recusa os domínios das publicações, então precisa de uma máquina com
  acesso aberto.
- **Um caso de referência** — o paciente fictício na Nutrio com o resultado de
  cada fórmula, para o teste comparar contra um valor que você reconhece.

**Siri vem primeiro:** sem ela, nenhum protocolo de densidade converte para
percentual de gordura, e cinco dos oito dependem disso.

## Pronto

### Banco (`supabase/`)

| O quê | Onde |
|---|---|
| Tenants, membros, perfis, pacientes | 12 migrations, esquema aplicado no projeto de desenvolvimento |
| Modelos de formulário, anamneses, avaliações, anexos, consentimentos | idem |
| RN-01 — `tenant_id` e RLS em toda tabela clínica | teste varre o catálogo do Postgres |
| RN-02 — gatilho recusa alterar registro finalizado; correção gera nova versão | `nova_versao_avaliacao`, `nova_versao_anamnese` |
| RN-03, RN-04, RN-08 | políticas e gatilho |
| RF-41 — `check` recusa fator de atividade em fórmula que já dá GET | dupla trava: banco e TypeScript |
| RNF-11 — auditoria de criação, alteração, exclusão e visualização | gatilho + `registrar_visualizacao` |
| Questionário atual da anamnese (§4.4) como modelo padrão | migration de dados |

### Cálculos (`packages/calculos`)

| O quê | Situação |
|---|---|
| RF-30 a RF-35, RF-38 — antropometria, composição, memória de cálculo | Estrutura pronta; só calcula o que não tem coeficiente a conferir |
| RF-40 a RF-45 — catálogo de 24 fórmulas, meta calórica, macros | idem |
| RF-50 — geometria do gráfico de evolução | Compartilhada entre painel e app |
| RF-13 — montagem da linha do tempo | idem |
| RF-20 a RF-26 — lógica do formulário, condicional e comparação | idem |
| RNF-10 — testes dos cálculos | 161 testes |

### Painel web (`apps/web`)

| ID | O quê |
|---|---|
| RF-01 | Login, recuperação de senha, rota por perfil |
| RF-10, RF-12, RF-16 | Cadastro e edição com validação de CPF e data, arquivamento, grupos |
| RF-11 | Lista com busca e filtro de arquivados |
| RF-13 | Linha do tempo |
| RF-20 a RF-27 | Modelos com 7 tipos de pergunta e condicional; anamnese e pré-consulta com versionamento e comparação |
| RF-30 a RF-45 | Nova avaliação com cálculo ao vivo e memória na tela |
| RF-50, RF-51 | Evolução com gráfico e tabela comparativa |
| RF-62 | Área do paciente com as avaliações liberadas |

### App (`apps/mobile`)

| ID | O quê |
|---|---|
| RF-01 | Login e rota por perfil |
| RF-55 | Lista, busca, ficha do paciente e linha do tempo |
| RF-57 | Enviar pré-consulta e liberar ou esconder avaliação |
| RF-61 | Paciente responde a pré-consulta, com gravação a cada campo |
| RF-62 | Avaliações liberadas com gráfico de evolução |

Roda no Expo Go, no navegador e, com o `eas.json`, como app instalado — ver
[testar-o-app.md](testar-o-app.md). Ícone, splash e versão no rodapé são
próprios; do template do Expo não sobrou nada.

**Para mandar ao cliente falta só a conta na Expo**, que é do Kevin: `eas login`
e `eas init` não têm como rodar daqui. O passo a passo, e o recado que vale
mandar junto com o link, estão em [testar-o-app.md](testar-o-app.md).

## Falta

Em ordem sugerida. A numeração é a ordem de ataque, não prioridade do
requisito.

### 1. Liberar as fórmulas (RN-06)

Uma a uma: ler a fonte, anotar os coeficientes, implementar, testar contra o
valor de referência, virar o status. Siri primeiro. **É o que trava a entrega
para uso real** — sem isso o nutricionista não consegue fazer uma avaliação
completa no sistema.

### 2. Exercitar ponta a ponta

Painel e app contra o projeto de desenvolvimento, numa máquina cuja rede
alcance o Supabase. O esquema, os dados de demonstração e as contas de teste já
estão lá. As telas foram conferidas com as respostas HTTP interceptadas — o que
não passa por essa conferência é justamente a RLS, que é testada no banco.

### 3. Fechar o ciclo do paciente

| ID | O quê | Por quê agora |
|---|---|---|
| RF-02 | Convite do paciente para o app | Precisa de função de servidor: o convite por e-mail usa a chave de service role, que não pode ir para o app nem para o painel. **É o que falta para o ciclo fechar de verdade** — hoje o paciente de demonstração já existe, mas não há como criar um novo |
| RF-03 | Aceite do termo de consentimento no primeiro acesso | A tabela existe, a tela não. É LGPD, não é opcional |
| RF-60 | Paciente vê o próprio perfil e o do nutricionista | Fecha a área do paciente |

### 4. Completar o atendimento

| ID | O quê |
|---|---|
| RF-56 | Preencher anamnese e registrar avaliação completa pelo celular |
| RF-14 | Anexar exames e documentos, inclusive pela câmera |
| RF-15 | Fotos de evolução comparáveis entre datas |
| RF-52 | PDF da avaliação com a identidade visual dele |
| RF-05 | Cadastro dos dados profissionais (CRN, contato, logo) usados no PDF |
| RF-58 | Gráficos de evolução na área do nutricionista do app |
| RF-36 | Registrar resultado de bioimpedância (a coluna existe, a tela não) |

### 5. Migração da Nutrio (RF-80 a RF-87)

Tabelas de importação e relatório. As colunas `origem` e `origem_id` já existem
nas tabelas clínicas, com índice único que impede duplicar numa reexecução —
a fundação está pronta, falta o importador.

Depende de saber **em que formato os dados vêm**, o que ainda está com a
Nutrio. Enquanto isso não chega, dá para adiantar as tabelas de importação e o
relatório.

> **Não cancelar a Nutrio antes de concluir e validar a migração.** Pelos termos
> de uso, a conta fica só para leitura depois que a assinatura acaba, e o prazo
> de retenção não é informado.

### 6. Desejáveis que sobraram

| ID | O quê |
|---|---|
| RF-04 | Dois fatores para o nutricionista |
| RF-06 | Login por biometria |
| RF-37 | Escore-z infantil pelas curvas da OMS |
| RF-63 | Notificação push |
| RF-64 | Paciente pede exportação ou exclusão dos próprios dados (LGPD) |
| RNF-07 | Rascunho local enquanto não sincroniza |

### 7. Antes de publicar nas lojas

- Nome do app e identificador — o `app.json` está com `Nutri` e
  `com.appnutricionista.nutri` como provisórios. Trocar é de graça enquanto for
  só build de teste; depois de publicado numa loja, o identificador **não muda
  mais**
- Ícone e splash definitivos, no lugar da folha provisória de
  `apps/mobile/scripts/gerar-icones.mjs`
- Política de privacidade publicada — Apple e Google exigem, e o app trata dado
  de saúde
- Contas: Google Play (US$ 25, uma vez) e Apple Developer (US$ 99/ano)
- Ligar a proteção contra senha vazada no painel do Supabase

## O que depende de você

| O quê | Para quê |
|---|---|
| **Conta na Expo** | É o único passo que falta para o cliente instalar o app. O resto está pronto — ver [testar-o-app.md](testar-o-app.md) |
| Prints do questionário de pré-consulta atual | Montar o modelo padrão da pré-consulta, como já foi feito com a anamnese |
| Confirmar se a lista de fórmulas dos prints está completa | Pode ter ficado alguma entre um print e outro |
| Paciente fictício na Nutrio com o resultado de cada fórmula | É metade da RN-06 — sem isso nenhuma fórmula é liberada |
| Resposta da Nutrio ao pedido de portabilidade | Define o formato do importador |
| Nome do app e identificador nas lojas | Trava a publicação |
| Prazo de guarda de prontuário do CFN | Define a política de exclusão (RN-05) |

## Depois do MVP

As fases já desenhadas em [requisitos.md](requisitos.md), resumidas:

| Fase | Escopo |
|---|---|
| 2 — Prescrição | Tabela de alimentos (TACO/TBCA), plano alimentar por refeição, substituições, lista de compras, PDF, receitas |
| 3 — Agenda | Agenda, autoagendamento, lembretes por WhatsApp, Google Calendar, financeiro simples |
| 4 — Engajamento | Diário alimentar com fotos, metas, lembretes de refeição e hidratação |
| 5 — SaaS | Cadastro self-service, assinatura e cobrança, plano Clínica, importação de outros sistemas |
