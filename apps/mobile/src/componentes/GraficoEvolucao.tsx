import { arredondar, formatarDataCurta, projetarSerie, type SerieEvolucao } from '@nutri/calculos';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as TextoSvg } from 'react-native-svg';
import { Cores } from '@/constantes/tema';

/**
 * Gráfico de evolução no celular (RF-58, RF-62).
 *
 * A geometria e o `path` vêm de `@nutri/calculos`, os mesmos que o painel web
 * usa: a linha desenhada aqui e lá é idêntica.
 */
export function GraficoEvolucao({
  serie,
  largura,
  altura = 200,
}: {
  serie: SerieEvolucao;
  largura: number;
  altura?: number;
}) {
  const grafico = projetarSerie(
    serie,
    { largura, altura, margem: { topo: 12, direita: 12, base: 26, esquerda: 44 } },
    { marcasY: 3, marcasX: 4 },
  );
  const { desenho } = grafico;

  return (
    <View style={estilos.caixa}>
      <Svg width={largura} height={altura}>
        {grafico.eixoY.map((marca) => (
          <Line
            key={`linha-${marca.valor}`}
            x1={desenho.x}
            x2={desenho.x + desenho.largura}
            y1={marca.posicao}
            y2={marca.posicao}
            stroke={Cores.borda}
            strokeWidth={1}
          />
        ))}
        {grafico.eixoY.map((marca) => (
          <TextoSvg
            key={`rotulo-${marca.valor}`}
            x={desenho.x - 6}
            y={marca.posicao + 4}
            textAnchor="end"
            fontSize={10}
            fill={Cores.textoSuave}
          >
            {marca.rotulo}
          </TextoSvg>
        ))}

        {grafico.area !== '' && <Path d={grafico.area} fill={Cores.primaria} fillOpacity={0.1} />}
        {grafico.caminho !== '' && (
          <Path d={grafico.caminho} fill="none" stroke={Cores.primaria} strokeWidth={2} />
        )}

        {grafico.pontos.map((ponto) => (
          <Circle
            key={ponto.avaliacaoId}
            cx={ponto.x}
            cy={ponto.y}
            r={4}
            fill={Cores.cartao}
            stroke={Cores.primaria}
            strokeWidth={2}
          />
        ))}

        {grafico.eixoX.map((marca) => (
          <TextoSvg
            key={marca.valor}
            x={marca.posicao}
            y={altura - 8}
            textAnchor="middle"
            fontSize={10}
            fill={Cores.textoSuave}
          >
            {marca.rotulo}
          </TextoSvg>
        ))}
      </Svg>
    </View>
  );
}

/** Rótulo pronto do último ponto, para o resumo acima do gráfico. */
export function ultimoValor(serie: SerieEvolucao): string {
  return `${arredondar(serie.ultimo, serie.indicador.casas).toLocaleString('pt-BR', {
    minimumFractionDigits: serie.indicador.casas,
    maximumFractionDigits: serie.indicador.casas,
  })} ${serie.indicador.unidade}`;
}

export { formatarDataCurta };

const estilos = StyleSheet.create({
  caixa: { alignItems: 'center' },
});
