import {
  comSinal,
  comUnidade,
  formatarData,
  indicadoresComEvolucao,
  montarSerie,
  type IndicadorId,
} from '@nutri/calculos';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { GraficoEvolucao } from '@/componentes/GraficoEvolucao';
import {
  Aviso,
  Botao,
  Carregando,
  Cartao,
  Etiqueta,
  Secao,
  Titulo,
  Vazio,
  Versao,
} from '@/componentes/ui';
import { useCarregamento } from '@/comum/useCarregamento';
import { Cores, Espaco, Superficie } from '@/constantes/tema';
import { useSessao } from '@/sessao/Sessao';
import { listarMinhasAvaliacoes, listarPreConsultasPendentes } from '@/supabase/consultas';
import { pontosDaEvolucao } from '@/supabase/evolucao';

/**
 * RF-62: o paciente vê as avaliações que o nutricionista liberou, com o gráfico
 * de evolução (RF-50), e a pré-consulta que estiver esperando resposta.
 */
export default function Evolucao() {
  const { perfil, sair } = useSessao();
  const { width } = useWindowDimensions();
  const [indicador, setIndicador] = useState<IndicadorId>('peso');

  const carregar = useCallback(async () => {
    const [avaliacoes, pendentes] = await Promise.all([
      listarMinhasAvaliacoes(),
      listarPreConsultasPendentes(),
    ]);
    return { avaliacoes, pendentes };
  }, []);

  const { dados, erro, atualizando, recarregar } = useCarregamento(carregar);
  const avaliacoes = dados?.avaliacoes ?? null;
  const pendentes = dados?.pendentes ?? [];

  const pontos = useMemo(
    () => (avaliacoes === null ? [] : pontosDaEvolucao(avaliacoes)),
    [avaliacoes],
  );
  const disponiveis = useMemo(() => indicadoresComEvolucao(pontos), [pontos]);

  const escolhido = disponiveis.some((item) => item.id === indicador)
    ? indicador
    : (disponiveis[0]?.id ?? null);
  const serie = escolhido === null ? null : montarSerie(pontos, escolhido);

  const larguraDoGrafico = Math.max(260, width - Espaco.medio * 4);

  return (
    <SafeAreaView style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <View style={estilos.linhaCabecalho}>
          <Titulo>Minha evolução</Titulo>
          <View style={estilos.botaoSair}>
            <Botao variante="secundario" aoTocar={() => void sair()}>
              Sair
            </Botao>
          </View>
        </View>
        {/* RF-60: é por aqui que se chega ao próprio cadastro e ao contato do
            nutricionista. O nome já estava na tela; virar link é o caminho mais
            curto, sem disputar espaço com o botão de sair. */}
        <Link href="/perfil" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver meus dados e meu nutricionista"
            style={({ pressed }) => [estilos.linhaPerfil, pressed && estilos.chamadaTocada]}
          >
            <Text style={estilos.nomeDoPerfil}>{perfil?.nome ?? 'Meu perfil'}</Text>
            <Text style={estilos.irParaPerfil}>Meu perfil ›</Text>
          </Pressable>
        </Link>
      </View>

      {avaliacoes === null ? (
        <Carregando />
      ) : (
        <ScrollView
          contentContainerStyle={estilos.conteudo}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={() => void recarregar()} />
          }
        >
          {erro !== null && <Aviso tom="erro">{erro}</Aviso>}

          {/* RF-61: a pré-consulta esperando resposta vem antes de tudo — é a
              única coisa nesta tela que pede uma ação do paciente. */}
          {pendentes.map((pendente) => (
            <Link key={pendente.id} href={`/pre-consultas/${pendente.id}`} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Responder a pré-consulta"
                style={({ pressed }) => [estilos.chamada, pressed && estilos.chamadaTocada]}
              >
                <Text style={estilos.chamadaTitulo}>Pré-consulta para responder</Text>
                <Text style={estilos.chamadaTexto}>
                  Seu nutricionista enviou um questionário para antes da consulta. Toque para
                  responder.
                </Text>
              </Pressable>
            </Link>
          ))}

          {avaliacoes.length === 0 ? (
            <Vazio>
              Nenhuma avaliação liberada ainda. Assim que o seu nutricionista liberar, ela aparece
              aqui.
            </Vazio>
          ) : (
            <>
              {serie !== null && (
                <Cartao>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={estilos.fichas}>
                      {disponiveis.map((item) => {
                        const ativo = item.id === escolhido;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => setIndicador(item.id)}
                            style={[estilos.ficha, ativo && estilos.fichaAtiva]}
                          >
                            <Text style={ativo ? estilos.fichaTextoAtivo : estilos.fichaTexto}>
                              {item.rotulo}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>

                  <GraficoEvolucao serie={serie} largura={larguraDoGrafico} />

                  <View style={estilos.resumo}>
                    <Resumo
                      rotulo="Primeira"
                      valor={comUnidade(
                        serie.primeiro,
                        serie.indicador.casas,
                        serie.indicador.unidade,
                      )}
                    />
                    <Resumo
                      rotulo="Última"
                      valor={comUnidade(
                        serie.ultimo,
                        serie.indicador.casas,
                        serie.indicador.unidade,
                      )}
                    />
                    <Resumo
                      rotulo="Variação"
                      valor={comSinal(
                        serie.variacaoAbsoluta,
                        serie.indicador.casas,
                        serie.indicador.unidade,
                      )}
                    />
                  </View>
                </Cartao>
              )}

              {disponiveis.length === 0 && (
                <Aviso>
                  A evolução aparece quando houver pelo menos duas avaliações com a mesma medida.
                </Aviso>
              )}

              <Secao>Avaliações</Secao>
              {avaliacoes.map((avaliacao) => (
                <View key={avaliacao.id} style={estilos.item}>
                  <View style={estilos.linhaItem}>
                    <Text style={estilos.data}>{formatarData(avaliacao.data_avaliacao)}</Text>
                    {avaliacao.versao > 1 && <Etiqueta>Versão {avaliacao.versao}</Etiqueta>}
                  </View>
                  <View style={estilos.medidas}>
                    <Medida rotulo="Peso" valor={ouNada(avaliacao.peso, 1, 'kg')} />
                    <Medida
                      rotulo="IMC"
                      valor={
                        avaliacao.imc === null
                          ? null
                          : `${comUnidade(avaliacao.imc, 1, '')}${
                              avaliacao.imc_classificacao !== null
                                ? ` · ${avaliacao.imc_classificacao}`
                                : ''
                            }`
                      }
                    />
                    <Medida rotulo="Gordura" valor={ouNada(avaliacao.percentual_gordura, 1, '%')} />
                    <Medida rotulo="Massa magra" valor={ouNada(avaliacao.massa_livre_gordura, 1, 'kg')} />
                    <Medida
                      rotulo="Gasto energético"
                      valor={ouNada(avaliacao.gasto_energetico_total, 0, 'kcal')}
                    />
                  </View>
                </View>
              ))}
            </>
          )}

          <Versao />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View>
      <Text style={estilos.rotuloMedida}>{rotulo}</Text>
      <Text style={estilos.valorMedida}>{valor}</Text>
    </View>
  );
}

function Medida({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (valor === null) return null;
  return (
    <View>
      <Text style={estilos.rotuloMedida}>{rotulo}</Text>
      <Text style={estilos.valorMedida}>{valor}</Text>
    </View>
  );
}

/** Medida que pode não ter sido tomada: sem valor, a linha não aparece. */
function ouNada(valor: number | null, casas: number, unidade: string): string | null {
  return valor === null ? null : comUnidade(valor, casas, unidade);
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  cabecalho: { padding: Espaco.medio, gap: Espaco.pequeno },
  linhaCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botaoSair: { minWidth: 84 },
  linhaPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Espaco.pequeno,
    // Alvo de toque confortável sem virar um botão dentro do cabeçalho.
    paddingVertical: 6,
  },
  nomeDoPerfil: { fontSize: 14, color: Cores.textoSuave, flexShrink: 1 },
  irParaPerfil: { fontSize: 14, color: Cores.primaria, fontWeight: '500' },
  conteudo: { paddingHorizontal: Espaco.medio, paddingBottom: Espaco.grande, gap: Espaco.pequeno },
  fichas: { flexDirection: 'row', gap: Espaco.pequeno },
  ficha: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Cores.borda,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fichaAtiva: { backgroundColor: Cores.primariaClara, borderColor: Cores.primaria },
  fichaTexto: { fontSize: 13, color: Cores.textoSuave },
  fichaTextoAtivo: { fontSize: 13, color: Cores.primaria, fontWeight: '600' },
  resumo: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.grande },
  item: { ...Superficie.cartao, gap: Espaco.pequeno },
  linhaItem: { flexDirection: 'row', alignItems: 'center', gap: Espaco.pequeno },
  data: { fontSize: 16, fontWeight: '600', color: Cores.texto },
  medidas: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.medio },
  rotuloMedida: { fontSize: 12, color: Cores.textoSuave },
  valorMedida: { fontSize: 15, fontWeight: '500', color: Cores.texto },
  chamada: {
    ...Superficie.cartao,
    backgroundColor: Cores.primariaClara,
    borderColor: Cores.primaria,
    gap: 4,
  },
  chamadaTocada: { opacity: 0.7 },
  chamadaTitulo: { fontSize: 16, fontWeight: '600', color: Cores.primaria },
  chamadaTexto: { fontSize: 14, color: Cores.texto },
});
