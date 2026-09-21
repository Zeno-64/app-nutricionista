/** Cores e espaçamentos do app. Um lugar só, para as telas não divergirem. */
export const Cores = {
  fundo: '#f8fafc',
  cartao: '#ffffff',
  borda: '#e2e8f0',
  texto: '#0f172a',
  textoSuave: '#64748b',
  primaria: '#047857',
  primariaClara: '#ecfdf5',
  atencao: '#b45309',
  atencaoFundo: '#fffbeb',
  erro: '#b91c1c',
  erroFundo: '#fef2f2',
} as const;

export const Espaco = {
  pequeno: 8,
  medio: 16,
  grande: 24,
} as const;

/**
 * A caixa branca sobre o fundo cinza, que é a forma de quase tudo no app:
 * cartão, item de lista, ficha.
 *
 * Estas cinco linhas estavam copiadas em cinco `StyleSheet` diferentes, com o
 * mesmo raio e a mesma borda em cada um — até alguém mudar um e não os outros.
 * O espaçamento entre os filhos fica de fora de propósito: é a única coisa que
 * varia de verdade entre um cartão e um item de lista.
 */
/**
 * O cabeçalho nativo, igual nas duas áreas.
 *
 * Vale usar o do sistema em vez de desenhar um: é dele que vêm o botão de
 * voltar e o gesto de arrastar da borda, que ninguém deveria reimplementar.
 * Só as cores são nossas.
 */
export const CabecalhoNativo = {
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal',
  headerTintColor: Cores.primaria,
  headerTitleStyle: { color: Cores.texto },
  headerStyle: { backgroundColor: Cores.cartao },
} as const;

export const Superficie = {
  cartao: {
    backgroundColor: Cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.medio,
  },
} as const;
