# Levantamento de requisitos — App para nutricionista

> Versão 0.1 — rascunho de 2026-09-12, para validar com o nutricionista.
> Referência de mercado: [Nutrio](https://nutrio.com.br).

## 1. Visão geral

Sistema para o nutricionista gerenciar pacientes, anamnese e avaliações, com um
app para o paciente acompanhar a própria evolução.

O primeiro cliente é um único nutricionista. A arquitetura, porém, já nasce
preparada para virar SaaS: vários profissionais e clínicas, cada um com seus
dados isolados.

### Decisões tomadas

| Tema | Decisão |
|---|---|
| Público | Começa com um nutricionista; evolui para SaaS |
| Paciente | App nativo publicado na App Store e no Google Play |
| Nutricionista | Painel web (app nativo do profissional fica para depois — ver §8) |
| MVP | Cadastro de pacientes, anamnese e avaliação (antropometria, gasto energético, evolução) |
| IA | Fora do escopo |

## 2. Atores

- **Nutricionista** — dono dos dados clínicos; cadastra, avalia e acompanha pacientes.
- **Paciente** — acessa pelo app o que o nutricionista liberar e preenche formulários.
- **Administrador da plataforma** — (fase SaaS) gerencia contas de profissionais.
- **Secretária / outros profissionais da clínica** — (fase SaaS) acesso limitado por papel.

## 3. Referência: o que a Nutrio oferece

| Área | Funcionalidades | Fase aqui |
|---|---|---|
| Atendimento | Anamnese personalizável, pré-consulta, antropometria adulto/criança, gasto energético, evolução | **MVP** |
| Prescrição | Plano alimentar, lista de compras, receitas, materiais, pedido de exames e manipulados | Fase 2 |
| Agenda | Agenda, sincronização com Google Calendar, link de autoagendamento, WhatsApp automático | Fase 3 |
| Engajamento | Diário alimentar com fotos e feedback, metas | Fase 4 |
| Negócio | Plano Clínica, multiusuário, painel gerencial, importação de pacientes, assinatura | Fase 5 |
| Consulta online | Videochamada integrada | A definir |
| IA | Plano alimentar, leitura de exames em PDF, transcrição de consulta, sugestão de refeições | Fora do escopo |

**Oportunidade:** a única reclamação no app de paciente da Nutrio é a falta de
lembrete no horário das refeições. Incluir isso na Fase 4.

## 4. Requisitos funcionais — MVP

Prioridade: **M** = obrigatório no MVP, **S** = desejável no MVP.

### 4.1 Acesso e contas

| ID | Requisito | Prior. |
|---|---|---|
| RF-01 | Nutricionista faz login no painel web com e-mail e senha, com recuperação de senha | M |
| RF-02 | Nutricionista convida o paciente (e-mail ou link) para criar acesso ao app | M |
| RF-03 | Paciente faz login no app; primeiro acesso exige aceite do termo de consentimento (LGPD) | M |
| RF-04 | Autenticação em dois fatores para o nutricionista | S |
| RF-05 | Nutricionista cadastra seus dados profissionais (nome, CRN, contato, logo) usados em documentos | M |

### 4.2 Pacientes

| ID | Requisito | Prior. |
|---|---|---|
| RF-10 | Cadastrar paciente: nome, data de nascimento, sexo, CPF (opcional), contato, endereço, profissão, objetivo, observações | M |
| RF-11 | Listar, buscar e filtrar pacientes (nome, ativo/inativo, última consulta) | M |
| RF-12 | Arquivar paciente sem apagar o histórico clínico | M |
| RF-13 | Linha do tempo do paciente com consultas, anamneses e avaliações em ordem cronológica | M |
| RF-14 | Anexar arquivos ao paciente (exames em PDF, fotos) | S |
| RF-15 | Fotos de evolução (frente, lado, costas) comparáveis entre datas | S |

### 4.3 Anamnese

| ID | Requisito | Prior. |
|---|---|---|
| RF-20 | Modelos de anamnese criados pelo nutricionista: seções e perguntas de tipos texto, número, sim/não, múltipla escolha, escala e data | M |
| RF-21 | Modelo padrão já pronto: queixa principal, histórico clínico e familiar, medicamentos e suplementos, alergias e intolerâncias, hábitos intestinais, sono, estresse, atividade física, consumo de água e álcool, tabagismo, recordatório 24h e frequência alimentar, preferências e aversões | M |
| RF-22 | Pré-consulta: nutricionista envia um formulário que o paciente preenche pelo app antes da consulta | M |
| RF-23 | Nutricionista revisa e complementa as respostas durante a consulta | M |
| RF-24 | Anamnese finalizada fica registrada com data e autor; alterações posteriores geram nova versão, sem apagar a anterior | M |

### 4.4 Avaliação antropométrica e composição corporal

| ID | Requisito | Prior. |
|---|---|---|
| RF-30 | Registrar peso, altura, circunferências (pescoço, braço, cintura, abdômen, quadril, coxa, panturrilha etc.) e dobras cutâneas | M |
| RF-31 | Calcular IMC com classificação da OMS, relação cintura-quadril e cintura-estatura | M |
| RF-32 | Calcular % de gordura por protocolo à escolha: Jackson-Pollock 3 e 7 dobras, Durnin-Womersley, Petroski; conversão por Siri | M |
| RF-33 | Registrar manualmente resultado de bioimpedância (% gordura, massa magra, água, gordura visceral) | M |
| RF-34 | Derivar massa gorda e massa magra a partir do % de gordura | M |
| RF-35 | Crianças e adolescentes: escores-z pelas curvas da OMS (IMC/idade, peso/idade, estatura/idade) com classificação | S |
| RF-36 | Exibir a memória de cálculo (fórmula e valores usados) em cada resultado | M |

### 4.5 Gasto energético

| ID | Requisito | Prior. |
|---|---|---|
| RF-40 | Calcular taxa metabólica basal por fórmula à escolha: Harris-Benedict, Mifflin-St Jeor, FAO/OMS, Cunningham, Katch-McArdle | M |
| RF-41 | Aplicar fator de atividade para obter o gasto energético total | M |
| RF-42 | Definir meta calórica (déficit/superávit em kcal ou %) e distribuição de macronutrientes (% ou g/kg) | M |
| RF-43 | Salvar o cálculo vinculado à avaliação, para ser usado depois no plano alimentar (Fase 2) | M |

### 4.6 Evolução e relatórios

| ID | Requisito | Prior. |
|---|---|---|
| RF-50 | Gráficos de evolução por indicador (peso, % gordura, circunferências etc.) ao longo das avaliações | M |
| RF-51 | Tabela comparativa entre duas ou mais avaliações, com diferença absoluta e percentual | M |
| RF-52 | Gerar PDF da avaliação com identidade visual do nutricionista | S |

### 4.7 App do paciente (MVP)

| ID | Requisito | Prior. |
|---|---|---|
| RF-60 | Ver dados do próprio perfil e do nutricionista | M |
| RF-61 | Responder pré-consultas enviadas pelo nutricionista | M |
| RF-62 | Ver avaliações e gráficos de evolução que o nutricionista liberou | M |
| RF-63 | Receber notificação push de nova pré-consulta ou nova avaliação disponível | S |
| RF-64 | Solicitar exportação ou exclusão dos próprios dados (LGPD) | M |

## 5. Regras de negócio

- **RN-01** — Dados clínicos pertencem ao contexto do profissional/clínica e nunca são visíveis a outro profissional (isolamento de tenant).
- **RN-02** — Registros clínicos finalizados não são apagados nem sobrescritos; correções geram nova versão com data e autor.
- **RN-03** — O paciente só vê o que o nutricionista liberar explicitamente.
- **RN-04** — Paciente arquivado perde acesso ao app, mas o histórico é mantido pelo prazo legal.
- **RN-05** — Pedido de exclusão pelo paciente respeita a obrigação de guarda do prontuário: dados identificáveis são anonimizados quando a guarda for exigida.
- **RN-06** — Cálculos usam as fórmulas publicadas sem adaptação; toda fórmula precisa de caso de teste com valores de referência.

## 6. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | **LGPD:** dados de saúde são dados sensíveis — consentimento registrado, criptografia em trânsito (TLS) e em repouso, log de acesso a prontuário, política de privacidade e termos de uso |
| RNF-02 | **Multi-tenant desde o início:** todo dado vinculado a um tenant; isolamento garantido na camada de dados |
| RNF-03 | **Backup** automático diário com retenção e teste de restauração |
| RNF-04 | **Hospedagem** preferencialmente no Brasil |
| RNF-05 | **Plataformas:** app do paciente em iOS e Android; painel web em navegadores atuais, usável em tablet |
| RNF-06 | **Desempenho:** telas principais carregam em até 2 s em 4G |
| RNF-07 | **Acessibilidade:** contraste e tamanho de fonte adequados, compatível com leitor de tela |
| RNF-08 | **Idioma:** português do Brasil; datas, números e unidades no padrão brasileiro |
| RNF-09 | **Testes automatizados** obrigatórios para todos os cálculos (RF-31 a RF-42) |
| RNF-10 | **Auditoria:** registrar quem criou, alterou ou visualizou registros clínicos |

## 7. Roadmap após o MVP

| Fase | Escopo |
|---|---|
| 2 — Prescrição | Tabela de alimentos (TACO/TBCA) mais alimentos próprios; plano alimentar por refeição com macros e micros; substituições; medidas caseiras; lista de compras; PDF; receitas e materiais; pedido de exames e manipulados |
| 3 — Agenda | Agenda, link de autoagendamento, lembretes por WhatsApp, sincronização com Google Calendar, controle financeiro simples de consultas |
| 4 — Engajamento | Diário alimentar com fotos e feedback, metas, **lembrete no horário das refeições**, hidratação |
| 5 — SaaS | Cadastro self-service de profissionais, assinatura e cobrança, plano Clínica com papéis e agenda centralizada, painel gerencial, importação de pacientes, app nativo do profissional |

## 8. Pontos em aberto (validar com o nutricionista)

1. Qual o público principal dele (emagrecimento, esportistas, gestantes, crianças, clínico)? Isso muda protocolos e fórmulas obrigatórios.
2. Quais protocolos de dobras e fórmulas de gasto energético ele realmente usa?
3. Usa bioimpedância? Qual aparelho (para prever importação de dados no futuro)?
4. Quais perguntas da anamnese atual dele são indispensáveis? Pedir o formulário que ele usa hoje.
5. Qual sistema ele usa hoje e se será preciso migrar pacientes.
6. O nutricionista também precisa de app no celular desde o MVP, ou o painel web basta?
7. Prazo de guarda de prontuário exigido para nutrição — confirmar a norma vigente do CFN.
8. Emissão de recibos (Receita Saúde) entra em qual fase?
9. Videochamada integrada é necessária ou ele usa Meet/WhatsApp?

## 9. Decisões técnicas a tomar

- Framework do app nativo: Flutter ou React Native.
- Backend e banco de dados (com suporte a isolamento por tenant).
- Serviço de autenticação e de notificações push.
- Provedor de hospedagem e armazenamento de arquivos no Brasil.
- Conta de desenvolvedor Apple e Google em nome de quem.
