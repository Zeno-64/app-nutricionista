# Verificação de fórmulas e protocolos

Regra RN-06 dos requisitos: nenhuma fórmula é liberada sem conferência na fonte
primária e teste com valor de referência.

## Método

1. **Fonte primária.** Ler os coeficientes no artigo, livro ou relatório
   original (referências abaixo).
2. **Caso de referência da Nutrio.** O nutricionista cadastra um paciente
   fictício na Nutrio e registra, com prints, o resultado de cada fórmula e
   protocolo para as mesmas medidas. Esses números viram testes: garantem que a
   fórmula está certa e que o resultado bate com o que ele já usa.
3. **Teste automatizado** em `packages/calculos` com os dois casos acima.

### Cuidado com pesquisa automática

Em 2026-09-12, resumos automáticos de páginas devolveram coeficientes errados:
- ten Haaf & Weijs (2014): o resumo trouxe `239 + 8,05 × peso + …`, que dá cerca
  de 1.100 kcal para um atleta de 70 kg — implausível. Não usar.
- Buscas que contêm os números esperados tendem a "confirmar" os próprios
  números da busca. Não serve como verificação.

Ler o texto da fonte diretamente (HTML ou PDF) e conferir dígito por dígito.

### Acesso às fontes no ambiente de nuvem

Em 2026-09-13, a sessão em nuvem não consegue abrir as fontes primárias: a
política de saída da rede recusa `www.fao.org`, `journals.plos.org` e os demais
domínios de publicação (resposta 403 do proxy). O WebFetch também é recusado, e
mesmo que passasse devolveria resumo gerado por modelo — exatamente o que a
seção acima proíbe como método de conferência.

Enquanto isso não se resolve, a conferência precisa ser feita em máquina com
acesso aberto, ou o ambiente precisa liberar os domínios das publicações. Por
isso todas as fórmulas com coeficiente continuam `pendente` ou `parcial` e o
pacote `packages/calculos` recusa o cálculo delas.

## Status

Legenda: **pendente** = ainda não conferida na fonte primária;
**parcial** = conferida em fonte secundária, falta a primária.

### Composição corporal

| Protocolo | Status | Fonte primária | Observações |
|---|---|---|---|
| Siri (1961) | pendente | Siri, 1961 | %G = 495 / DC − 450 |
| Pollock 3 (1978) | pendente | Jackson & Pollock, Br J Nutr, 1978 (homens); Jackson, Pollock & Ward, Med Sci Sports Exerc, 1980 (mulheres) | A Nutrio rotula as duas versões como 1978 |
| Pollock 7 (1978) | pendente | Idem | |
| Faulkner (1968) | pendente | Faulkner, 1968 | Resulta em % de gordura direto |
| Guedes (1994) | pendente | Guedes, 1994 | |
| Petroski (1995) — homens | parcial | Petroski, tese, UFSM, 1995 | DC = 1,10726863 − 0,00081201·Σ4 + 0,00000212·Σ4² − 0,00041761·idade; Σ4 = subescapular + tríceps + supra-ilíaca + panturrilha medial (fonte secundária: medesportepapers.com.br) |
| Petroski (1995) — mulheres | pendente | Idem | Circulam duas variantes: uma linear com constante 1,03465850 e uma quadrática com 1,02902361. A página medesportepapers publica a linear com erro de digitação (Σ4 ao quadrado sem termo linear, o que gera densidade negativa). Descobrir qual a Nutrio usa pelo caso de referência |
| Durnin & Womersley (1974) | parcial | Durnin & Womersley, Br J Nutr 32:77–97, 1974 | Tabela abaixo |
| Weltman (1988) | pendente | Weltman et al. — identificar as publicações exatas para homens e mulheres | Usa circunferência abdominal, peso e altura, não dobras |

**Durnin & Womersley** — DC = C − M · log10(bíceps + tríceps + subescapular +
supra-ilíaca), fonte secundária topendsports.com:

| Idade | C homens | M homens | C mulheres | M mulheres |
|---|---|---|---|---|
| < 17 | 1,1533 | 0,0643 | 1,1369 | 0,0598 |
| 17–19 | 1,1620 | 0,0630 | 1,1549 | 0,0678 |
| 20–29 | 1,1631 | 0,0632 | 1,1599 | 0,0717 |
| 30–39 | 1,1422 | 0,0544 | 1,1423 | 0,0632 |
| 40–49 | 1,1620 | 0,0700 | 1,1333 | 0,0612 |
| ≥ 50 | 1,1715 | 0,0779 | 1,1339 | 0,0645 |

### Gasto energético

| Fórmula | Status | Fonte primária |
|---|---|---|
| Harris-Benedict (1919) | pendente | Harris & Benedict, Carnegie Institution of Washington, 1919 |
| Harris-Benedict (1984) | pendente | Roza & Shizgal, Am J Clin Nutr, 1984 |
| Mifflin-St Jeor (1990) | pendente | Mifflin et al., Am J Clin Nutr, 1990 |
| Katch-McArdle (1996) | pendente | Katch & McArdle, livro, edição de 1996 |
| Cunningham (1980) | pendente | Cunningham, Am J Clin Nutr, 1980 |
| FAO/WHO (2004) adulto e infantil | pendente | FAO/WHO/UNU, *Human energy requirements*, 2004, Tabela 5.2 (fao.org/4/y5686e) — adota as equações de Schofield (1985) |
| Schofield (1985) infantil | pendente | Schofield, Hum Nutr Clin Nutr, 1985 |
| Henry & Rees (1991) | pendente | Henry & Rees, Eur J Clin Nutr, 1991 |
| EER/IOM (2005) adulto e infantil | pendente | Institute of Medicine, DRI for Energy, 2005 |
| EER (2023) adulto, infantil, gestante, lactante | pendente | NASEM, DRI for Energy, 2023, Tabela S-1 (NCBI Bookshelf NBK591034) |
| Tinsley (2018) por peso e por MLG | pendente | Tinsley, Graybeal & Moore, Appl Physiol Nutr Metab, 2019 (doi 10.1139/apnm-2018-0412) |
| ten Haaf (2014) por peso e por MLG | pendente | ten Haaf & Weijs, PLoS One 9(10):e108460, 2014 — acesso aberto |
| De Lorenzo (1999) | pendente | De Lorenzo et al., "A new predictive equation to calculate resting metabolic rate in athletes", 1999 |
| Ministério da Saúde (2005) — gestante | pendente | Identificar o documento; perguntar ao nutricionista ou à Nutrio |
| GET por fórmula de bolso | não precisa | Peso × kcal/kg informado pelo nutricionista |
| TMB e GET manuais | não precisa | Valor informado |

## Tabelas de classificação

Não são equações com coeficiente ajustado, e sim faixas publicadas. O pacote
`packages/calculos` já as aplica, porque o cálculo em si (uma razão entre
medidas) é definição aritmética. Os pontos de corte ainda precisam ser
conferidos no documento original.

| Tabela | Status | Fonte a conferir | Onde está no código |
|---|---|---|---|
| Faixas de IMC para adultos | parcial | OMS, *Obesity: preventing and managing the global epidemic*, WHO Technical Report Series 894, 2000 | `antropometria/imc.ts` |
| Ponto de corte de RCQ (0,90 homens / 0,85 mulheres) | parcial | OMS, *Waist circumference and waist–hip ratio*, 2008 | `antropometria/indices.ts` |
| Ponto de corte de RCE (0,50 e 0,60) | parcial | Ashwell M. & Gibson S. | `antropometria/indices.ts` |
| Escores-z infantis (IMC/idade, peso/idade, estatura/idade) | pendente | Curvas da OMS — precisa dos dados LMS de referência | ainda não implementado (RF-37) |

## Fatores de atividade sugeridos

A lista de 1,2 a 1,9 que aparece na interface (`energia/fatores-atividade.ts`) é
convenção difundida, sem fonte primária identificada. Não bloqueia o cálculo
porque o fator é dado que o nutricionista informa, e o campo aceita qualquer
valor — mas a interface precisa deixar claro que são sugestões editáveis, e a
fonte ainda deve ser localizada.

## O que já calcula

Só o que não tem coeficiente a conferir. Garantido pelo teste
`packages/calculos/src/catalogo.test.ts`:

- IMC, RCQ e RCE, com as ressalvas das tabelas de classificação acima
- massa gorda e massa livre de gordura a partir do percentual (e o caminho
  inverso, a partir da bioimpedância)
- meta calórica e distribuição de macronutrientes
- GET por fórmula de bolso, TMB manual e GET manual

Todo o resto está no catálogo, aparece na interface com o status e recusa o
cálculo com `FormulaIndisponivelError`.
