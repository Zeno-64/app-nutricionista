# Levantamento de requisitos — App para nutricionista

> Versão 0.2 — 2026-09-12. Rascunho para validar com o nutricionista.
> Referência de mercado e sistema atual: [Nutrio](https://nutrio.com.br).

## 1. Visão geral

Sistema para o nutricionista gerenciar pacientes, anamnese e avaliações, com um
app em que o paciente acompanha a própria evolução.

O primeiro cliente é um único nutricionista, que hoje usa a Nutrio e vai migrar
os pacientes de lá. A arquitetura já nasce preparada para virar SaaS: vários
profissionais e clínicas, cada um com seus dados isolados.

### Decisões tomadas

| Tema | Decisão |
|---|---|
| Público | Começa com um nutricionista; evolui para SaaS |
| App | **Um único app** nas lojas (iOS e Android); o login define o perfil: nutricionista ou paciente |
| Computador | Painel web para o nutricionista, além do app |
| MVP | Cadastro de pacientes, anamnese, avaliação (antropometria, dobras, gasto energético), evolução e **migração da Nutrio** |
| Fórmulas e protocolos | Paridade com o que a Nutrio oferece hoje (§4.5 e §4.6) |
| Bioimpedância | Não usa hoje; entra como desejável (registro manual) |
| Migração | Trazer da Nutrio **tudo o que for possível** |
| IA | Fora do escopo |

## 2. Atores

- **Nutricionista** — dono dos dados clínicos; usa o app e o painel web.
- **Paciente** — usa o app; vê o que o nutricionista liberar e preenche formulários.
- **Administrador da plataforma** — (fase SaaS) gerencia contas de profissionais.
- **Secretária / outros profissionais da clínica** — (fase SaaS) acesso limitado por papel.

## 3. Referência: o que a Nutrio oferece

| Área | Funcionalidades | Fase aqui |
|---|---|---|
| Atendimento | Anamnese personalizável, pré-consulta, antropometria adulto/criança, gasto energético, evolução | **MVP** |
| Prescrição | Plano alimentar, lista de compras, receitas, materiais, pedido de exames e manipulados | Fase 2 |
| Agenda | Agenda, sincronização com Google Calendar, link de autoagendamento, WhatsApp automático | Fase 3 |
| Engajamento | Diário alimentar com fotos e feedback, metas | Fase 4 |
| Negócio | Plano Clínica, multiusuário, painel gerencial, assinatura | Fase 5 |
| Consulta online | Videochamada integrada | A definir |
| IA | Plano alimentar, leitura de exames em PDF, transcrição de consulta, sugestão de refeições | Fora do escopo |

**Oportunidades de diferencial:**
- A única reclamação no app de paciente da Nutrio é a falta de lembrete no
  horário das refeições (entra na Fase 4).
- A Nutrio não documenta exportação de dados: os termos de uso não falam do
  assunto e a política de privacidade só prevê portabilidade "se tecnicamente
  viável", mediante pedido. Aqui a exportação completa será self-service (RF-86).

## 4. Requisitos funcionais — MVP

Prioridade: **M** = obrigatório no MVP, **S** = desejável no MVP.
Canal: **App** = app nas lojas, **Web** = painel web. Quando não indicado, vale para os dois.

### 4.1 Acesso e contas

| ID | Requisito | Prior. |
|---|---|---|
| RF-01 | Login com e-mail e senha, com recuperação de senha; o mesmo app abre a área do nutricionista ou do paciente conforme o perfil da conta | M |
| RF-02 | Nutricionista convida o paciente (e-mail, WhatsApp ou link) para criar acesso ao app | M |
| RF-03 | No primeiro acesso, o paciente aceita o termo de consentimento (LGPD) | M |
| RF-04 | Autenticação em dois fatores para o nutricionista | S |
| RF-05 | Nutricionista cadastra seus dados profissionais (nome, CRN, contato, logo) usados em documentos | M |
| RF-06 | Login por biometria no app, depois do primeiro acesso | S |

### 4.2 Pacientes

| ID | Requisito | Prior. |
|---|---|---|
| RF-10 | Cadastrar paciente: nome, data de nascimento, sexo, CPF (opcional), contato, endereço, profissão, objetivo, observações | M |
| RF-11 | Listar, buscar e filtrar pacientes (nome, ativo/inativo, última consulta) | M |
| RF-12 | Arquivar paciente sem apagar o histórico clínico | M |
| RF-13 | Linha do tempo do paciente com consultas, anamneses e avaliações em ordem cronológica | M |
| RF-14 | Anexar arquivos ao paciente (exames em PDF, fotos), inclusive pela câmera do app | M |
| RF-15 | Fotos de evolução (frente, lado, costas) comparáveis entre datas | S |
| RF-16 | Grupos especiais no cadastro: criança/adolescente, gestante (idade gestacional), lactante, atleta — usados para sugerir fórmulas e esconder perguntas que não se aplicam | M |

### 4.3 Anamnese

| ID | Requisito | Prior. |
|---|---|---|
| RF-20 | Modelos de anamnese criados pelo nutricionista, com seções e perguntas de tipos texto longo, texto curto, número, sim/não, múltipla escolha, escala 0–10 e data | M |
| RF-21 | Modelo padrão já pronto com o questionário que ele usa hoje (§4.4) | M |
| RF-22 | Pergunta condicional, exibida só quando se aplica (ex.: ciclo menstrual só para pacientes do sexo feminino) | S |
| RF-23 | Pré-consulta: nutricionista envia um formulário que o paciente preenche pelo app antes da consulta | M |
| RF-24 | Nutricionista revisa e complementa as respostas durante a consulta | M |
| RF-25 | Anamnese finalizada fica registrada com data e autor; alterações posteriores geram nova versão, sem apagar a anterior | M |
| RF-26 | Ver as respostas da anamnese anterior ao lado da atual, para comparar | S |
| RF-27 | Criação e edição de modelos pode ficar só no painel web | S |

### 4.4 Modelo padrão de anamnese

Questionário atual do nutricionista, na ordem em que aparece no sistema dele.
Todas as perguntas são de texto livre.

1. Observações
2. Imagina que amanhã você acordou e atingiu o resultado. O que muda? O que vai ser diferente?
3. Outras tentativas? Sozinho ou com profissional (o que gostou ou não gostou)? Liste para mim as 3 principais situações que você acredita terem sido suas maiores dificuldades para se manter na dieta.
4. Você prefere uma abordagem mais calma, com progressão, ou você é uma pessoa que gosta de se desafiar?
5. Mudança de peso recente? Nos últimos 3 a 6 meses? Histórico de peso.
6. Compromissos diários? Trabalho (profissão)? Estuda? Treino? (FA) Tem pausas? Geladeira?
7. Sono: horas? Acorda? Qualidade? Nota de 0 a 10? Horas ideais?
8. Cafeína e estimulantes?
9. Como está o seu intestino, tem ido com que frequência ao banheiro? E como está a consistência das fezes?
10. Ciclo menstrual: regularidade, como sente durante a TPM? Como fica a alimentação? Doces? Exercícios?
11. Quem cozinha na sua casa?
12. Onde você almoça? Lancha? Janta? Leva comida ou come em self-service?
13. Metas (hidratação, sono, exercícios etc.)

> A anamnese tem só essas perguntas: as demais ficam na **pré-consulta**, um
> questionário separado que o paciente responde antes (RF-23). Durante a
> consulta, o nutricionista precisa ver as respostas da pré-consulta junto com a
> anamnese. Falta levantar as perguntas da pré-consulta.

### 4.5 Avaliação antropométrica e composição corporal

| ID | Requisito | Prior. |
|---|---|---|
| RF-30 | Registrar peso, altura, circunferências (pescoço, braço, cintura, abdômen, quadril, coxa, panturrilha etc.) e dobras cutâneas em mm | M |
| RF-31 | Calcular IMC com classificação da OMS, relação cintura-quadril e cintura-estatura | M |
| RF-32 | Escolher o protocolo de cálculo de % de gordura na lista abaixo, incluindo a opção "Nenhum" | M |
| RF-33 | O formulário destaca só as medidas exigidas pelo protocolo escolhido; trocar de protocolo recalcula com as medidas já registradas | M |
| RF-34 | Protocolos que resultam em densidade corporal convertem para % de gordura pela equação de Siri | M |
| RF-35 | Derivar massa gorda e massa livre de gordura (MLG) a partir do % de gordura | M |
| RF-36 | Registrar manualmente resultado de bioimpedância (% gordura, MLG, água, gordura visceral) e usá-lo como fonte de MLG | S |
| RF-37 | Crianças e adolescentes: escores-z pelas curvas da OMS (IMC/idade, peso/idade, estatura/idade) com classificação | S |
| RF-38 | Exibir a memória de cálculo (fórmula, medidas e resultado intermediário) | M |

**Protocolos de % de gordura**

| Protocolo | Medidas exigidas | Resultado |
|---|---|---|
| Nenhum | — | — |
| Pollock 3 (1978) | Idade e 3 dobras — homens: peitoral, abdominal, coxa; mulheres: tríceps, supra-ilíaca, coxa | Densidade → % gordura |
| Pollock 7 (1978) | Idade e 7 dobras: peitoral, axilar média, tríceps, subescapular, abdominal, supra-ilíaca, coxa | Densidade → % gordura |
| Faulkner (1968) | Tríceps, subescapular, supra-ilíaca, abdominal | % gordura direto |
| Guedes (1994) | Homens: tríceps, supra-ilíaca, abdominal; mulheres: subescapular, supra-ilíaca, coxa | Densidade → % gordura |
| Petroski (1995) | Idade e 4 dobras — homens: subescapular, tríceps, supra-ilíaca, panturrilha; mulheres: axilar média, supra-ilíaca, coxa, panturrilha (mulheres também peso e altura) | Densidade → % gordura |
| Durnin & Womersley (1974) | Idade e 4 dobras: bíceps, tríceps, subescapular, supra-ilíaca (coeficientes por faixa etária) | Densidade → % gordura |
| Weltman (1988) — obesos | **Não usa dobras:** circunferência abdominal, peso e altura | % gordura direto |

> Pontos de medida e coeficientes serão conferidos na publicação original de
> cada protocolo antes da implementação (RN-06).

### 4.6 Gasto energético

| ID | Requisito | Prior. |
|---|---|---|
| RF-40 | Escolher a fórmula numa lista **com busca**, agrupada por público (adulto, atleta, infantil, gestante/lactante, manual) | M |
| RF-41 | Fórmulas que resultam em TMB pedem fator de atividade para obter o GET; fórmulas EER já resultam em GET e **não** aplicam fator de atividade de novo | M |
| RF-42 | Fórmulas baseadas em MLG usam a composição corporal da mesma avaliação ou pedem a MLG manualmente | M |
| RF-43 | Sugerir as fórmulas compatíveis com o grupo do paciente (RF-16), sem impedir a escolha de outra | S |
| RF-44 | Definir meta calórica (déficit/superávit em kcal ou %) e distribuição de macronutrientes (% ou g/kg) | M |
| RF-45 | Salvar o cálculo vinculado à avaliação, para uso no plano alimentar (Fase 2) | M |

**Catálogo de fórmulas**

| Fórmula | Público | Resultado | Entradas |
|---|---|---|---|
| Harris-Benedict (1919) | Adulto | TMB | Sexo, idade, peso, altura |
| Harris-Benedict (1984) | Adulto | TMB | Sexo, idade, peso, altura |
| Mifflin-St Jeor (1990) | Adulto | TMB | Sexo, idade, peso, altura |
| FAO/WHO (2004) | Adulto | TMB | Sexo, idade, peso (coeficientes por faixa etária) |
| Henry & Rees (1991) | Adulto | TMB | Sexo, idade, peso (coeficientes por faixa etária) |
| Katch-McArdle (1996) | Adulto | TMB | MLG |
| Cunningham (1980) | Adulto | TMB | MLG |
| EER/IOM (2005) | Adulto | GET | Sexo, idade, peso, altura, nível de atividade |
| EER (2023) | Adulto | GET | Sexo, idade, peso, altura, nível de atividade |
| Tinsley — por peso (2018) | Atleta | TMB | Peso |
| Tinsley — por MLG (2018) | Atleta | TMB | MLG |
| Ten Haaf — por peso (2014) | Atleta | TMB | Sexo, idade, peso, altura |
| Ten Haaf — por MLG (2014) | Atleta | TMB | MLG |
| De Lorenzo (1999) | Atleta | TMB | Peso, altura |
| EER/IOM (2005) — infantil | Infantil | GET | Sexo, idade, peso, altura, nível de atividade |
| EER (2023) — infantil | Infantil | GET | Sexo, idade, peso, altura, nível de atividade |
| Schofield (1985) — infantil | Infantil | TMB | Sexo, idade, peso (e altura, na variante com altura) |
| FAO/WHO (2004) — infantil | Infantil | A confirmar | Sexo, idade, peso |
| Ministério da Saúde (2005) — gestante | Gestante | A confirmar | A confirmar (peso pré-gestacional e idade gestacional, provavelmente) |
| EER (2023) — gestante | Gestante | GET | A confirmar (inclui idade gestacional) |
| EER (2023) — lactante | Lactante | GET | A confirmar (inclui tempo pós-parto) |
| GET por fórmula de bolso | Manual | GET | Peso × kcal/kg |
| Colocar TMB manualmente | Manual | TMB | Valor da TMB |
| Colocar GET manualmente | Manual | GET | Valor do GET |

> A lista foi montada a partir de quatro prints do seletor da Nutrio; pode ter
> ficado alguma fórmula entre um print e outro. Todas entram no MVP para não
> perder nada do que ele usa hoje. As entradas marcadas "a confirmar" serão
> fechadas com a publicação original.

### 4.7 Evolução e relatórios

| ID | Requisito | Prior. |
|---|---|---|
| RF-50 | Gráficos de evolução por indicador (peso, % gordura, circunferências, dobras) ao longo das avaliações | M |
| RF-51 | Tabela comparativa entre duas ou mais avaliações, com diferença absoluta e percentual | M |
| RF-52 | Gerar PDF da avaliação com identidade visual do nutricionista e compartilhar pelo app | S |

### 4.8 App — área do nutricionista

| ID | Requisito | Prior. |
|---|---|---|
| RF-55 | Lista e busca de pacientes, linha do tempo e ficha do paciente | M |
| RF-56 | Preencher anamnese e registrar avaliação completa (medidas, dobras, gasto energético) pelo celular ou tablet | M |
| RF-57 | Enviar pré-consulta e liberar avaliações para o paciente | M |
| RF-58 | Ver gráficos de evolução | M |
| RF-59 | Configurações, modelos de anamnese e migração ficam no painel web | M |

### 4.9 App — área do paciente

| ID | Requisito | Prior. |
|---|---|---|
| RF-60 | Ver dados do próprio perfil e do nutricionista | M |
| RF-61 | Responder pré-consultas enviadas pelo nutricionista | M |
| RF-62 | Ver avaliações e gráficos de evolução que o nutricionista liberou | M |
| RF-63 | Receber notificação push de nova pré-consulta ou nova avaliação disponível | S |
| RF-64 | Solicitar exportação ou exclusão dos próprios dados (LGPD) | M |

### 4.10 Migração da Nutrio

| ID | Requisito | Prior. |
|---|---|---|
| RF-80 | Importar cadastro de pacientes | M |
| RF-81 | Importar anamneses com a data original (perguntas e respostas como texto) | M |
| RF-82 | Importar histórico de avaliações (medidas, dobras, protocolo, gasto energético) para manter os gráficos de evolução | M |
| RF-83 | Importar planos alimentares; até o módulo de plano existir (Fase 2), ficam como anexo PDF ou texto no paciente | M |
| RF-84 | Quando um dado não puder ser estruturado, anexar o PDF gerado pela Nutrio à linha do tempo do paciente | M |
| RF-85 | Importação gera relatório (importados, ignorados, com erro e motivo), marca a origem de cada registro e pode ser reexecutada sem duplicar pacientes | M |
| RF-86 | Nutricionista exporta todos os seus dados a qualquer momento (planilha/JSON e PDFs), sem precisar pedir ao suporte | M |
| RF-87 | Pacientes importados só recebem convite para o app quando o nutricionista decidir | M |

**Estratégia de migração** (em ordem de preferência):

1. **Pedido de portabilidade à Nutrio.** A política de privacidade dela prevê
   entrega dos dados "em formato estruturado", se tecnicamente viável. O pedido
   deve partir do nutricionista, dono da conta, pelo contato@nutrio.com.br,
   perguntando o formato (CSV, Excel, JSON) e quais dados vêm (pacientes,
   anamneses, avaliações, planos).
2. **Extração pela conta dele** no app.nutrio.com.br, se a exportação não vier
   ou vier incompleta. Antes, conferir se os termos de uso permitem acesso
   automatizado.
3. **Planilha modelo e PDFs**, como último recurso: cadastro por planilha e
   histórico anexado em PDF.

Pelos termos de uso da Nutrio (cláusula 5), a conta continua acessível só
para leitura depois que a assinatura acaba, mas o prazo de retenção não é
informado. **Não cancelar a Nutrio antes de concluir e validar a migração.**

## 5. Regras de negócio

- **RN-01** — Dados clínicos pertencem ao contexto do profissional/clínica e nunca são visíveis a outro profissional (isolamento de tenant).
- **RN-02** — Registros clínicos finalizados não são apagados nem sobrescritos; correções geram nova versão com data e autor.
- **RN-03** — O paciente só vê o que o nutricionista liberar explicitamente.
- **RN-04** — Paciente arquivado perde acesso ao app, mas o histórico é mantido pelo prazo legal.
- **RN-05** — Pedido de exclusão pelo paciente respeita a obrigação de guarda do prontuário: dados identificáveis são anonimizados quando a guarda for exigida.
- **RN-06** — Cálculos usam as fórmulas publicadas sem adaptação; toda fórmula e todo protocolo precisa de caso de teste com valores de referência conferidos.
- **RN-07** — Registros importados mantêm a data original e ficam identificados como vindos da Nutrio.
- **RN-08** — O perfil da conta (nutricionista ou paciente) é definido no cadastro e não pode ser trocado pelo próprio usuário.

## 6. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | **LGPD:** dados de saúde são dados sensíveis — consentimento registrado, criptografia em trânsito (TLS) e em repouso, log de acesso a prontuário, política de privacidade e termos de uso |
| RNF-02 | **Multi-tenant desde o início:** todo dado vinculado a um tenant; isolamento garantido na camada de dados |
| RNF-03 | **Backup** automático diário com retenção e teste de restauração |
| RNF-04 | **Hospedagem** preferencialmente no Brasil |
| RNF-05 | **Plataformas:** um app para iOS e Android; painel web em navegadores atuais, usável em tablet |
| RNF-06 | **Desempenho:** telas principais carregam em até 2 s em 4G |
| RNF-07 | **Conexão instável:** anamnese e avaliação em andamento no app são salvas localmente como rascunho até sincronizar (desejável no MVP) |
| RNF-08 | **Acessibilidade:** contraste e tamanho de fonte adequados, compatível com leitor de tela |
| RNF-09 | **Idioma:** português do Brasil; datas, números e unidades no padrão brasileiro |
| RNF-10 | **Testes automatizados** obrigatórios para todos os cálculos (§4.5 e §4.6) |
| RNF-11 | **Auditoria:** registrar quem criou, alterou ou visualizou registros clínicos |

## 7. Roadmap após o MVP

| Fase | Escopo |
|---|---|
| 2 — Prescrição | Tabela de alimentos (TACO/TBCA) e alimentos próprios; plano alimentar por refeição com macros e micros; substituições; medidas caseiras; lista de compras; PDF; receitas e materiais; pedido de exames e manipulados; converter planos importados da Nutrio |
| 3 — Agenda | Agenda, link de autoagendamento, lembretes por WhatsApp, sincronização com Google Calendar, controle financeiro simples de consultas |
| 4 — Engajamento | Diário alimentar com fotos e feedback, metas, **lembrete no horário das refeições**, hidratação |
| 5 — SaaS | Cadastro self-service de profissionais, assinatura e cobrança, plano Clínica com papéis e agenda centralizada, painel gerencial, importação de outros sistemas (Dietbox, WebDiet, planilhas) |

## 8. Pontos em aberto

1. Perguntas do questionário de pré-consulta atual (prints, como os da anamnese).
2. A lista de fórmulas dos prints está completa?
3. Resposta da Nutrio ao pedido de portabilidade: formato e dados incluídos.
4. Prazo de guarda de prontuário exigido para nutrição — confirmar a norma vigente do CFN.
5. Emissão de recibos (Receita Saúde) entra em qual fase?
6. Videochamada integrada é necessária ou ele usa Meet/WhatsApp?
7. Paciente fictício na Nutrio com o resultado de cada fórmula e protocolo, para servir de caso de teste (ver `docs/verificacao-formulas.md`).

## 9. Decisões técnicas

| Tema | Decisão |
|---|---|
| App | React Native com Expo (expo-router), um app com dois perfis |
| Painel web | React + Vite + Tailwind + TypeScript |
| Backend | Supabase (Postgres, Auth, Storage) na região de São Paulo, com isolamento por tenant via RLS |
| Organização | Monorepo com npm workspaces; cálculos num pacote compartilhado entre app, painel e importador |
| Notificações push | Expo Notifications |

Em aberto: nome do app e identificador nas lojas; contas de desenvolvedor Apple
e Google em nome de quem.
