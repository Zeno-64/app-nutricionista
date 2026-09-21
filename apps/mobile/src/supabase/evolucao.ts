/**
 * A conversão da linha de `avaliacoes` no ponto da evolução mora em
 * `@nutri/calculos`, junto da geometria do gráfico: o painel e o app precisam
 * concordar sobre qual medida entra e qual versão vale (RN-02). Este módulo
 * continua existindo só para as telas não precisarem saber disso.
 */
export { paraPontoAvaliacao, pontosDaEvolucao } from '@nutri/calculos';
