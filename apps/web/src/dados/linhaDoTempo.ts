/**
 * A linha do tempo (RF-13) mora em `@nutri/calculos`, junto com a geometria do
 * gráfico: são regras compartilhadas com o app, não interface do painel. Este
 * módulo continua existindo só para as telas não precisarem saber disso.
 */
export {
  formatarData,
  formatarNumero,
  montarLinhaDoTempo,
  type ItemLinhaDoTempo,
} from '@nutri/calculos';
