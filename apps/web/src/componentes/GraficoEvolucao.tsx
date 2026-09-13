import { arredondar, formatarDataCurta, projetarSerie, type SerieEvolucao } from '@nutri/calculos';
import { formatarNumero } from '../dados/linhaDoTempo';

/**
 * Gráfico de evolução (RF-50). A geometria vem de `@nutri/calculos`; aqui só
 * desenha. O mesmo cálculo alimenta o gráfico do app.
 */
export function GraficoEvolucao({
  serie,
  largura = 720,
  altura = 260,
}: {
  serie: SerieEvolucao;
  largura?: number;
  altura?: number;
}) {
  const grafico = projetarSerie(
    serie,
    { largura, altura, margem: { topo: 16, direita: 16, base: 28, esquerda: 52 } },
    { marcasY: 4, marcasX: 5 },
  );

  const { desenho } = grafico;

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Evolução de ${serie.indicador.rotulo}`}
    >
      {grafico.eixoY.map((marca) => (
        <g key={marca.valor}>
          <line
            x1={desenho.x}
            x2={desenho.x + desenho.largura}
            y1={marca.posicao}
            y2={marca.posicao}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <text
            x={desenho.x - 8}
            y={marca.posicao + 4}
            textAnchor="end"
            className="fill-slate-400 text-[11px]"
          >
            {marca.rotulo}
          </text>
        </g>
      ))}

      {grafico.area !== '' && <path d={grafico.area} fill="#047857" fillOpacity={0.08} />}
      {grafico.caminho !== '' && (
        <path d={grafico.caminho} fill="none" stroke="#047857" strokeWidth={2} strokeLinejoin="round" />
      )}

      {grafico.pontos.map((ponto) => (
        <g key={ponto.avaliacaoId}>
          <circle cx={ponto.x} cy={ponto.y} r={4} fill="#ffffff" stroke="#047857" strokeWidth={2} />
          <title>
            {`${formatarDataCurta(ponto.data)}: ${formatarNumero(
              arredondar(ponto.valor, serie.indicador.casas),
              serie.indicador.casas,
            )} ${serie.indicador.unidade}`}
          </title>
        </g>
      ))}

      {grafico.eixoX.map((marca) => (
        <text
          key={marca.valor}
          x={marca.posicao}
          y={altura - 8}
          textAnchor="middle"
          className="fill-slate-400 text-[11px]"
        >
          {marca.rotulo}
        </text>
      ))}
    </svg>
  );
}
