import { arredondar, formatar } from '../numeros';
import type { SerieEvolucao } from './serie';

/**
 * Geometria do gráfico de evolução (RF-50).
 *
 * É cálculo puro, sem nada de desenho: devolve coordenadas e um `path` do SVG.
 * O mesmo `path` serve no `<svg>` do navegador e no `react-native-svg` do app,
 * então painel e celular desenham exatamente a mesma linha.
 */

export interface Margem {
  topo: number;
  direita: number;
  base: number;
  esquerda: number;
}

export interface CaixaGrafico {
  largura: number;
  altura: number;
  margem: Margem;
}

export interface PontoProjetado {
  avaliacaoId: string;
  data: string;
  valor: number;
  x: number;
  y: number;
}

export interface MarcaEixo {
  valor: number;
  rotulo: string;
  posicao: number;
}

export interface GraficoProjetado {
  pontos: PontoProjetado[];
  /** Atributo `d` da linha. Vazio quando há um ponto só. */
  caminho: string;
  /** Atributo `d` da área sob a linha, fechada na base. */
  area: string;
  eixoY: MarcaEixo[];
  eixoX: MarcaEixo[];
  faixa: { minimo: number; maximo: number };
  /** Retângulo interno, já descontadas as margens. */
  desenho: { x: number; y: number; largura: number; altura: number };
}

function emMilissegundos(data: string): number {
  return Date.parse(`${data.slice(0, 10)}T00:00:00Z`);
}

/**
 * Passo "redondo" para as marcas do eixo: 1, 2, 2,5 ou 5 vezes uma potência de
 * dez. É o que faz o eixo mostrar 70, 72, 74 em vez de 70, 71,3333, 72,6667.
 */
export function passoRedondo(intervalo: number, marcasDesejadas: number): number {
  if (intervalo <= 0 || marcasDesejadas <= 0) return 1;

  const bruto = intervalo / marcasDesejadas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const normalizado = bruto / potencia;

  const multiplicador = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 2.5 ? 2.5 : normalizado <= 5 ? 5 : 10;

  return multiplicador * potencia;
}

/**
 * Faixa do eixo Y com uma folga, para a linha não encostar na borda.
 *
 * Quando todos os valores são iguais, inventa uma faixa em torno deles — sem
 * isso a divisão pela amplitude seria por zero e a linha sumiria.
 */
export function faixaDoEixo(
  minimo: number,
  maximo: number,
): { minimo: number; maximo: number } {
  if (minimo === maximo) {
    const folga = minimo === 0 ? 1 : Math.abs(minimo) * 0.05;
    return { minimo: minimo - folga, maximo: maximo + folga };
  }
  const folga = (maximo - minimo) * 0.1;
  return { minimo: minimo - folga, maximo: maximo + folga };
}

export interface OpcoesGrafico {
  /** Quantidade aproximada de marcas no eixo Y. */
  marcasY?: number;
  /** Quantidade máxima de datas rotuladas no eixo X. */
  marcasX?: number;
}

export function projetarSerie(
  serie: SerieEvolucao,
  caixa: CaixaGrafico,
  opcoes: OpcoesGrafico = {},
): GraficoProjetado {
  const { margem } = caixa;
  const largura = Math.max(0, caixa.largura - margem.esquerda - margem.direita);
  const altura = Math.max(0, caixa.altura - margem.topo - margem.base);
  const desenho = { x: margem.esquerda, y: margem.topo, largura, altura };

  const faixa = faixaDoEixo(serie.minimo, serie.maximo);
  const amplitude = faixa.maximo - faixa.minimo;

  const tempos = serie.pontos.map((ponto) => emMilissegundos(ponto.data));
  const primeiroTempo = Math.min(...tempos);
  const ultimoTempo = Math.max(...tempos);
  const duracao = ultimoTempo - primeiroTempo;

  const paraX = (tempo: number): number =>
    // Com uma data só, ou todas iguais, o ponto fica no meio.
    duracao === 0 ? desenho.x + largura / 2 : desenho.x + ((tempo - primeiroTempo) / duracao) * largura;

  const paraY = (valor: number): number =>
    desenho.y + altura - ((valor - faixa.minimo) / amplitude) * altura;

  const pontos: PontoProjetado[] = serie.pontos.map((ponto, indice) => ({
    avaliacaoId: ponto.avaliacaoId,
    data: ponto.data,
    valor: ponto.valor,
    x: paraX(tempos[indice]!),
    y: paraY(ponto.valor),
  }));

  const caminho =
    pontos.length < 2
      ? ''
      : pontos
          .map((ponto, indice) => `${indice === 0 ? 'M' : 'L'}${arredondar(ponto.x, 2)} ${arredondar(ponto.y, 2)}`)
          .join(' ');

  const area =
    pontos.length < 2
      ? ''
      : `${caminho} L${arredondar(pontos[pontos.length - 1]!.x, 2)} ${arredondar(desenho.y + altura, 2)}` +
        ` L${arredondar(pontos[0]!.x, 2)} ${arredondar(desenho.y + altura, 2)} Z`;

  const passo = passoRedondo(amplitude, opcoes.marcasY ?? 4);
  const eixoY: MarcaEixo[] = [];
  const inicio = Math.ceil(faixa.minimo / passo) * passo;
  for (let valor = inicio; valor <= faixa.maximo + passo / 1000; valor += passo) {
    // A soma repetida acumula erro binário; o arredondamento limpa o rótulo.
    const limpo = arredondar(valor, 6);
    eixoY.push({
      valor: limpo,
      rotulo: formatar(limpo, serie.indicador.casas),
      posicao: paraY(limpo),
    });
  }

  const maximoDeMarcasX = Math.max(2, opcoes.marcasX ?? 4);
  const salto = Math.max(1, Math.ceil(pontos.length / maximoDeMarcasX));
  const eixoX: MarcaEixo[] = pontos
    .filter((_, indice) => indice % salto === 0 || indice === pontos.length - 1)
    .map((ponto) => ({
      valor: emMilissegundos(ponto.data),
      rotulo: formatarDataCurta(ponto.data),
      posicao: ponto.x,
    }));

  return { pontos, caminho, area, eixoY, eixoX, faixa, desenho };
}

/** Data curta para o eixo, no padrão brasileiro (RNF-09). */
export function formatarDataCurta(data: string): string {
  const [, mes, dia] = data.slice(0, 10).split('-');
  return `${dia}/${mes}`;
}
