import {
  INDICADORES,
  indicadoresComEvolucao,
  indicadoresMedidos,
  valorDoIndicador,
  type PontoAvaliacao,
} from './indicadores';
import { compararAvaliacoes, montarSerie } from './serie';
import { faixaDoEixo, passoRedondo, projetarSerie } from './grafico';
import { arredondar } from '../numeros';

function ponto(ajustes: Partial<PontoAvaliacao> & { id: string; data: string }): PontoAvaliacao {
  return {
    peso: null,
    imc: null,
    percentualGordura: null,
    massaGorda: null,
    massaLivreGordura: null,
    gastoEnergeticoTotal: null,
    circunferencias: {},
    dobras: {},
    ...ajustes,
  };
}

const HISTORICO: PontoAvaliacao[] = [
  ponto({ id: 'a2', data: '2026-05-10', peso: 70.5, imc: 25.9, circunferencias: { cintura: 84 } }),
  ponto({ id: 'a1', data: '2026-03-01', peso: 74, imc: 27.2, circunferencias: { cintura: 89 } }),
  ponto({ id: 'a3', data: '2026-08-20', peso: 68, imc: 25, circunferencias: { cintura: 80 } }),
];

describe('catálogo de indicadores', () => {
  it('cobre corpo, circunferências e dobras', () => {
    expect(INDICADORES.filter((i) => i.grupo === 'corpo')).toHaveLength(6);
    expect(INDICADORES.filter((i) => i.grupo === 'circunferencia')).toHaveLength(7);
    expect(INDICADORES.filter((i) => i.grupo === 'dobra')).toHaveLength(9);
  });

  it('lê medida aninhada de circunferência e de dobra', () => {
    const p = ponto({ id: 'x', data: '2026-01-01', circunferencias: { cintura: 80 }, dobras: { triceps: 12 } });
    expect(valorDoIndicador(p, 'circunferencia.cintura')).toBe(80);
    expect(valorDoIndicador(p, 'dobra.triceps')).toBe(12);
    expect(valorDoIndicador(p, 'dobra.biceps')).toBeNull();
  });

  it('só oferece evolução do que tem pelo menos duas medidas', () => {
    const pontos = [
      ponto({ id: 'a', data: '2026-01-01', peso: 70, imc: 25 }),
      ponto({ id: 'b', data: '2026-02-01', peso: 69 }),
    ];
    expect(indicadoresComEvolucao(pontos).map((i) => i.id)).toEqual(['peso']);
    expect(indicadoresMedidos(pontos).map((i) => i.id)).toEqual(['peso', 'imc']);
  });
});

describe('série de evolução (RF-50)', () => {
  it('ordena da avaliação mais antiga para a mais recente', () => {
    const serie = montarSerie(HISTORICO, 'peso');
    expect(serie?.pontos.map((p) => p.avaliacaoId)).toEqual(['a1', 'a2', 'a3']);
  });

  it('calcula variação absoluta e percentual com sinal', () => {
    const serie = montarSerie(HISTORICO, 'peso');
    expect(serie?.primeiro).toBe(74);
    expect(serie?.ultimo).toBe(68);
    expect(serie?.variacaoAbsoluta).toBe(-6);
    expect(arredondar(serie!.variacaoPercentual!, 2)).toBe(-8.11);
  });

  it('devolve mínimo e máximo para o eixo', () => {
    const serie = montarSerie(HISTORICO, 'peso');
    expect(serie?.minimo).toBe(68);
    expect(serie?.maximo).toBe(74);
  });

  it('ignora avaliação sem a medida', () => {
    const serie = montarSerie(
      [
        ponto({ id: 'a', data: '2026-01-01', peso: 80 }),
        ponto({ id: 'b', data: '2026-02-01' }),
        ponto({ id: 'c', data: '2026-03-01', peso: 78 }),
      ],
      'peso',
    );
    expect(serie?.pontos.map((p) => p.avaliacaoId)).toEqual(['a', 'c']);
  });

  it('devolve null quando o indicador nunca foi medido', () => {
    expect(montarSerie(HISTORICO, 'dobra.triceps')).toBeNull();
  });

  it('aceita série de um ponto só', () => {
    const serie = montarSerie([ponto({ id: 'a', data: '2026-01-01', peso: 80 })], 'peso');
    expect(serie?.pontos).toHaveLength(1);
    expect(serie?.variacaoAbsoluta).toBe(0);
  });
});

describe('tabela comparativa (RF-51)', () => {
  it('põe as avaliações em ordem cronológica no cabeçalho', () => {
    expect(compararAvaliacoes(HISTORICO).avaliacoes.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
  });

  it('traz uma linha por indicador medido, com a diferença', () => {
    const { linhas } = compararAvaliacoes(HISTORICO);
    const peso = linhas.find((linha) => linha.indicador.id === 'peso');
    expect(peso?.valores).toEqual([74, 70.5, 68]);
    expect(peso?.diferencaAbsoluta).toBe(-6);
    expect(arredondar(peso!.diferencaPercentual!, 2)).toBe(-8.11);
  });

  it('compara a primeira com a última medida existente, pulando os buracos', () => {
    const { linhas } = compararAvaliacoes([
      ponto({ id: 'a', data: '2026-01-01', dobras: { triceps: 20 } }),
      ponto({ id: 'b', data: '2026-02-01' }),
      ponto({ id: 'c', data: '2026-03-01', dobras: { triceps: 16 } }),
    ]);
    const triceps = linhas.find((linha) => linha.indicador.id === 'dobra.triceps');
    expect(triceps?.valores).toEqual([20, null, 16]);
    expect(triceps?.diferencaAbsoluta).toBe(-4);
  });

  it('não inventa diferença com uma medida só', () => {
    const { linhas } = compararAvaliacoes([
      ponto({ id: 'a', data: '2026-01-01', peso: 70 }),
      ponto({ id: 'b', data: '2026-02-01' }),
    ]);
    expect(linhas[0]?.diferencaAbsoluta).toBeNull();
    expect(linhas[0]?.diferencaPercentual).toBeNull();
  });
});

describe('geometria do gráfico', () => {
  const CAIXA = { largura: 400, altura: 200, margem: { topo: 10, direita: 10, base: 20, esquerda: 40 } };

  it('escolhe passo redondo para o eixo', () => {
    expect(passoRedondo(10, 5)).toBe(2);
    expect(passoRedondo(6, 4)).toBe(2);
    expect(passoRedondo(0.5, 5)).toBe(0.1);
    expect(passoRedondo(1000, 4)).toBe(250);
  });

  it('abre uma faixa quando todos os valores são iguais', () => {
    const faixa = faixaDoEixo(70, 70);
    expect(faixa.maximo).toBeGreaterThan(faixa.minimo);
  });

  it('projeta os pontos dentro da área de desenho', () => {
    const serie = montarSerie(HISTORICO, 'peso')!;
    const grafico = projetarSerie(serie, CAIXA);

    expect(grafico.pontos).toHaveLength(3);
    for (const p of grafico.pontos) {
      expect(p.x).toBeGreaterThanOrEqual(grafico.desenho.x);
      expect(p.x).toBeLessThanOrEqual(grafico.desenho.x + grafico.desenho.largura);
      expect(p.y).toBeGreaterThanOrEqual(grafico.desenho.y);
      expect(p.y).toBeLessThanOrEqual(grafico.desenho.y + grafico.desenho.altura);
    }
  });

  it('espaça pelo tempo real, não por posição na lista', () => {
    const serie = montarSerie(HISTORICO, 'peso')!;
    const { pontos } = projetarSerie(serie, CAIXA);
    // 01/03 a 10/05 são 70 dias; 10/05 a 20/08 são 102. O segundo trecho é maior.
    const primeiroTrecho = pontos[1]!.x - pontos[0]!.x;
    const segundoTrecho = pontos[2]!.x - pontos[1]!.x;
    expect(segundoTrecho).toBeGreaterThan(primeiroTrecho);
  });

  it('desenha o valor maior mais acima que o menor', () => {
    const serie = montarSerie(HISTORICO, 'peso')!;
    const { pontos } = projetarSerie(serie, CAIXA);
    expect(pontos[0]!.y).toBeLessThan(pontos[2]!.y);
  });

  it('gera caminho de linha e de área que o SVG entende', () => {
    const serie = montarSerie(HISTORICO, 'peso')!;
    const { caminho, area } = projetarSerie(serie, CAIXA);
    expect(caminho.startsWith('M')).toBe(true);
    expect(caminho.split('L')).toHaveLength(3);
    expect(area.endsWith('Z')).toBe(true);
  });

  it('não desenha linha com um ponto só', () => {
    const serie = montarSerie([ponto({ id: 'a', data: '2026-01-01', peso: 80 })], 'peso')!;
    const grafico = projetarSerie(serie, CAIXA);
    expect(grafico.caminho).toBe('');
    expect(grafico.pontos[0]!.x).toBe(CAIXA.margem.esquerda + 350 / 2);
  });

  it('rotula o eixo Y com números redondos e o X com data brasileira', () => {
    const serie = montarSerie(HISTORICO, 'peso')!;
    const { eixoY, eixoX } = projetarSerie(serie, CAIXA);
    expect(eixoY.length).toBeGreaterThan(1);
    for (const marca of eixoY) expect(marca.rotulo).not.toMatch(/\d{3,}$/);
    expect(eixoX[0]?.rotulo).toBe('01/03');
    expect(eixoX[eixoX.length - 1]?.rotulo).toBe('20/08');
  });
});
