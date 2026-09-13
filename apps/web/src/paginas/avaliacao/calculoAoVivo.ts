import {
  ErroCalculo,
  calcularComposicao,
  calcularGastoEnergetico,
  calcularImc,
  calcularMacros,
  calcularMetaCalorica,
  calcularRce,
  calcularRcq,
  obterFormulaEnergia,
  obterProtocolo,
  percentualPelaMassaLivre,
  type Circunferencia,
  type DadosAvaliacao,
  type DadosEnergia,
  type DobraCutanea,
  type FormulaEnergiaId,
  type MemoriaCalculo,
  type ProtocoloId,
  type ResultadoComposicaoCorporal,
  type ResultadoGastoEnergetico,
  type ResultadoImc,
  type ResultadoMacros,
  type ResultadoMeta,
  type ResultadoRazao,
  type Sexo,
} from '@nutri/calculos';

/**
 * Cálculo ao vivo da tela de nova avaliação.
 *
 * Recebe o formulário como está digitado — texto, vírgula decimal, campos
 * incompletos — e devolve o que dá para calcular agora, com um aviso em
 * português no lugar de cada bloco que ainda não fecha. É função pura para
 * poder ser testada sem navegador nem banco.
 */

export interface FormularioAvaliacao {
  sexo: Sexo;
  idade: string;
  peso: string;
  altura: string;
  circunferencias: Partial<Record<Circunferencia, string>>;
  dobras: Partial<Record<DobraCutanea, string>>;
  protocolo: ProtocoloId;
  /** RF-36: MLG vinda de bioimpedância, quando houver. */
  massaLivreGordura: string;
  formula: FormulaEnergiaId;
  fatorAtividade: string;
  kcalPorKg: string;
  valorInformado: string;
  ajusteTipo: 'kcal' | 'percentual';
  ajusteValor: string;
  macrosModo: 'percentual' | 'gramasPorKg';
  proteina: string;
  carboidrato: string;
  gordura: string;
}

export interface Bloco<T> {
  valor: T | null;
  /** Motivo de o bloco não ter resultado, em texto para o nutricionista. */
  aviso: string | null;
}

export interface ResultadoAoVivo {
  imc: Bloco<ResultadoImc>;
  rcq: Bloco<ResultadoRazao>;
  rce: Bloco<ResultadoRazao>;
  composicao: Bloco<ResultadoComposicaoCorporal>;
  energia: Bloco<ResultadoGastoEnergetico>;
  meta: Bloco<ResultadoMeta>;
  macros: Bloco<ResultadoMacros>;
  /** Memórias de todos os blocos que calcularam, na ordem da tela (RF-38). */
  memorias: MemoriaCalculo[];
}

export const FORMULARIO_VAZIO: FormularioAvaliacao = {
  sexo: 'feminino',
  idade: '',
  peso: '',
  altura: '',
  circunferencias: {},
  dobras: {},
  protocolo: 'nenhum',
  massaLivreGordura: '',
  formula: 'get_manual',
  fatorAtividade: '',
  kcalPorKg: '',
  valorInformado: '',
  ajusteTipo: 'kcal',
  ajusteValor: '',
  macrosModo: 'percentual',
  proteina: '',
  carboidrato: '',
  gordura: '',
};

/** Lê número no padrão brasileiro: aceita vírgula decimal e ignora espaços. */
export function paraNumero(texto: string | undefined): number | undefined {
  if (texto === undefined) return undefined;
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '') return undefined;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : undefined;
}

function mapearMedidas<C extends string>(
  origem: Partial<Record<C, string>>,
): Partial<Record<C, number>> {
  const destino: Partial<Record<C, number>> = {};
  for (const [chave, texto] of Object.entries(origem) as [C, string][]) {
    const valor = paraNumero(texto);
    if (valor !== undefined) destino[chave] = valor;
  }
  return destino;
}

function vazio<T>(aviso: string | null = null): Bloco<T> {
  return { valor: null, aviso };
}

function tentar<T>(calculo: () => T): Bloco<T> {
  try {
    return { valor: calculo(), aviso: null };
  } catch (erro) {
    if (erro instanceof ErroCalculo) return { valor: null, aviso: erro.message };
    throw erro;
  }
}

/** Converte o formulário nas medidas que o pacote de cálculos espera. */
export function montarDados(formulario: FormularioAvaliacao): DadosAvaliacao {
  const dados: DadosAvaliacao = {
    sexo: formulario.sexo,
    dobras: mapearMedidas(formulario.dobras),
    circunferencias: mapearMedidas(formulario.circunferencias),
  };

  const idade = paraNumero(formulario.idade);
  const peso = paraNumero(formulario.peso);
  const altura = paraNumero(formulario.altura);
  const mlg = paraNumero(formulario.massaLivreGordura);

  if (idade !== undefined) dados.idade = idade;
  if (peso !== undefined) dados.peso = peso;
  if (altura !== undefined) dados.altura = altura;
  if (mlg !== undefined) dados.massaLivreGordura = mlg;

  return dados;
}

export function calcularAoVivo(formulario: FormularioAvaliacao): ResultadoAoVivo {
  const dados = montarDados(formulario);
  const peso = dados.peso;
  const altura = dados.altura;
  const cintura = dados.circunferencias?.cintura;
  const quadril = dados.circunferencias?.quadril;

  const imc =
    peso !== undefined && altura !== undefined
      ? tentar(() => calcularImc(peso, altura))
      : vazio<ResultadoImc>('Informe peso e altura.');

  const rcq =
    cintura !== undefined && quadril !== undefined
      ? tentar(() => calcularRcq(cintura, quadril, formulario.sexo))
      : vazio<ResultadoRazao>('Informe as circunferências de cintura e quadril.');

  const rce =
    cintura !== undefined && altura !== undefined
      ? tentar(() => calcularRce(cintura, altura))
      : vazio<ResultadoRazao>('Informe a circunferência da cintura e a altura.');

  const composicao = calcularComposicaoAoVivo(formulario, dados);
  const energia = calcularEnergiaAoVivo(formulario, dados, composicao.valor);

  const ajuste = paraNumero(formulario.ajusteValor);
  const meta =
    energia.valor !== null && ajuste !== undefined
      ? tentar(() =>
          calcularMetaCalorica(energia.valor!.get, {
            tipo: formulario.ajusteTipo,
            valor: ajuste,
          }),
        )
      : vazio<ResultadoMeta>(
          energia.valor === null
            ? 'A meta depende do gasto energético.'
            : 'Informe o déficit ou superávit.',
        );

  const macros = calcularMacrosAoVivo(formulario, meta.valor, peso);

  const memorias = [
    imc.valor?.memoria,
    rcq.valor?.memoria,
    rce.valor?.memoria,
    ...(composicao.valor?.memorias ?? []),
    ...(energia.valor?.memorias ?? []),
    meta.valor?.memoria,
    macros.valor?.memoria,
  ].filter((memoria): memoria is MemoriaCalculo => memoria !== undefined);

  return { imc, rcq, rce, composicao, energia, meta, macros, memorias };
}

function calcularComposicaoAoVivo(
  formulario: FormularioAvaliacao,
  dados: DadosAvaliacao,
): Bloco<ResultadoComposicaoCorporal> {
  // RF-36: com a MLG da bioimpedância, o percentual sai dela e dispensa protocolo.
  if (formulario.protocolo === 'nenhum') {
    if (dados.peso !== undefined && dados.massaLivreGordura !== undefined) {
      return tentar(() => {
        const percentual = percentualPelaMassaLivre(dados.peso!, dados.massaLivreGordura!);
        return {
          protocolo: 'nenhum' as ProtocoloId,
          densidadeCorporal: null,
          percentualGordura: percentual,
          massaGorda: dados.peso! - dados.massaLivreGordura!,
          massaLivreGordura: dados.massaLivreGordura!,
          memorias: [
            {
              formula: '%G = (peso − MLG) ÷ peso × 100',
              referencia: 'Bioimpedância registrada manualmente (RF-36)',
              entradas: [
                { rotulo: 'Peso', valor: dados.peso!, unidade: 'kg' },
                { rotulo: 'Massa livre de gordura', valor: dados.massaLivreGordura!, unidade: 'kg' },
              ],
              passos: [
                {
                  rotulo: 'Percentual de gordura',
                  expressao: `(${dados.peso} − ${dados.massaLivreGordura}) ÷ ${dados.peso} × 100`,
                  valor: percentual,
                  unidade: '%',
                },
              ],
            },
          ],
        };
      });
    }
    return vazio<ResultadoComposicaoCorporal>('Escolha um protocolo de percentual de gordura.');
  }

  const bloco = tentar(() => calcularComposicao(formulario.protocolo, dados));
  if (bloco.valor === null && bloco.aviso === null) {
    return vazio<ResultadoComposicaoCorporal>('Protocolo sem resultado.');
  }
  return bloco as Bloco<ResultadoComposicaoCorporal>;
}

function calcularEnergiaAoVivo(
  formulario: FormularioAvaliacao,
  dados: DadosAvaliacao,
  composicao: ResultadoComposicaoCorporal | null,
): Bloco<ResultadoGastoEnergetico> {
  const formula = obterFormulaEnergia(formulario.formula);

  const entrada: DadosEnergia = { ...dados };

  // RF-42: fórmula baseada em MLG usa a composição desta mesma avaliação.
  const mlgDaComposicao = composicao?.massaLivreGordura;
  if (entrada.massaLivreGordura === undefined && mlgDaComposicao !== null && mlgDaComposicao !== undefined) {
    entrada.massaLivreGordura = mlgDaComposicao;
  }

  const kcalPorKg = paraNumero(formulario.kcalPorKg);
  if (kcalPorKg !== undefined) entrada.kcalPorKg = kcalPorKg;

  const valorInformado = paraNumero(formulario.valorInformado);
  if (valorInformado !== undefined) entrada.valorInformado = valorInformado;

  // RF-41: só passa fator de atividade para fórmula que resulta em TMB.
  const fator = formula.resultado === 'tmb' ? paraNumero(formulario.fatorAtividade) : undefined;

  return tentar(() => calcularGastoEnergetico(formulario.formula, entrada, fator));
}

function calcularMacrosAoVivo(
  formulario: FormularioAvaliacao,
  meta: ResultadoMeta | null,
  peso: number | undefined,
): Bloco<ResultadoMacros> {
  if (meta === null) return vazio<ResultadoMacros>('Os macros dependem da meta calórica.');

  const proteina = paraNumero(formulario.proteina);
  const gordura = paraNumero(formulario.gordura);

  if (formulario.macrosModo === 'percentual') {
    const carboidrato = paraNumero(formulario.carboidrato);
    if (proteina === undefined || carboidrato === undefined || gordura === undefined) {
      return vazio<ResultadoMacros>('Informe os três percentuais.');
    }
    return tentar(() =>
      calcularMacros(meta.metaCalorica, {
        modo: 'percentual',
        proteina,
        carboidrato,
        gordura,
      }),
    );
  }

  if (proteina === undefined || gordura === undefined) {
    return vazio<ResultadoMacros>('Informe proteína e gordura em g/kg.');
  }
  return tentar(() =>
    calcularMacros(meta.metaCalorica, { modo: 'gramasPorKg', proteina, gordura }, peso),
  );
}

/** Medidas que o protocolo escolhido exige, para a tela destacá-las (RF-33). */
export function medidasExigidas(protocolo: ProtocoloId, sexo: Sexo) {
  return obterProtocolo(protocolo).exigencias(sexo);
}
