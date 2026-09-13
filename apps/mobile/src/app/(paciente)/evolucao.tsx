import {
  arredondar,
  indicadoresComEvolucao,
  montarSerie,
  type IndicadorId,
} from '@nutri/calculos';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { GraficoEvolucao } from '@/componentes/GraficoEvolucao';
import { Aviso, Botao, Carregando, Texto, Titulo } from '@/componentes/ui';
import { Cores, Espaco } from '@/constantes/tema';
import { mensagem, useSessao } from '@/sessao/Sessao';
import { exigirSupabase } from '@/supabase/cliente';
import { pontosDaEvolucao } from '@/supabase/evolucao';
import type { Avaliacao } from '@/supabase/tipos';

const COLUNAS =
  'id, data_avaliacao, versao, substituida_por_id, peso, imc, imc_classificacao, percentual_gordura, massa_gorda, massa_livre_gordura, gasto_energetico_total, circ_pescoco, circ_braco, circ_cintura, circ_abdomen, circ_quadril, circ_coxa, circ_panturrilha, dobra_peitoral, dobra_axilar_media, dobra_triceps, dobra_biceps, dobra_subescapular, dobra_abdominal, dobra_supra_iliaca, dobra_coxa, dobra_panturrilha_medial';

/**
 * RF-62: o paciente vê as avaliações que o nutricionista liberou, com o gráfico
 * de evolução (RF-50).
 *
 * A consulta não filtra por liberação: a RLS já devolve só o que foi liberado
 * (RN-03). Filtrar de novo aqui daria a impressão errada de que a regra mora na
 * tela.
 */
export default function Evolucao() {
  const { perfil, sair } = useSessao();
  const { width } = useWindowDimensions();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[] | null>(null);
  const [indicador, setIndicador] = useState<IndicadorId>('peso');
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await exigirSupabase()
      .from('avaliacoes')
      .select(COLUNAS)
      .order('data_avaliacao', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Avaliacao[];
  }, []);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const lista = await carregar();
        if (ativo) {
          setAvaliacoes(lista);
          setErro(null);
        }
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      }
    })();
    return () => {
      ativo = false;
    };
  }, [carregar]);

  async function aoPuxar() {
    setAtualizando(true);
    try {
      setAvaliacoes(await carregar());
      setErro(null);
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setAtualizando(false);
    }
  }

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
        {perfil !== null && <Texto suave>{perfil.nome}</Texto>}
      </View>

      {avaliacoes === null ? (
        <Carregando />
      ) : (
        <ScrollView
          contentContainerStyle={estilos.conteudo}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={() => void aoPuxar()} />
          }
        >
          {erro !== null && <Aviso tom="erro">{erro}</Aviso>}

          {avaliacoes.length === 0 ? (
            <Text style={estilos.vazio}>
              Nenhuma avaliação liberada ainda. Assim que o seu nutricionista liberar, ela aparece
              aqui.
            </Text>
          ) : (
            <>
              {serie !== null && (
                <View style={estilos.cartao}>
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
                      valor={formatar(serie.primeiro, serie.indicador.casas, serie.indicador.unidade)}
                    />
                    <Resumo
                      rotulo="Última"
                      valor={formatar(serie.ultimo, serie.indicador.casas, serie.indicador.unidade)}
                    />
                    <Resumo
                      rotulo="Variação"
                      valor={comSinal(serie.variacaoAbsoluta, serie.indicador.casas, serie.indicador.unidade)}
                    />
                  </View>
                </View>
              )}

              {disponiveis.length === 0 && (
                <Aviso>
                  A evolução aparece quando houver pelo menos duas avaliações com a mesma medida.
                </Aviso>
              )}

              <Text style={estilos.subtitulo}>Avaliações</Text>
              {avaliacoes.map((avaliacao) => (
                <View key={avaliacao.id} style={estilos.item}>
                  <View style={estilos.linhaItem}>
                    <Text style={estilos.data}>{formatarData(avaliacao.data_avaliacao)}</Text>
                    {avaliacao.versao > 1 && (
                      <Text style={estilos.etiqueta}>Versão {avaliacao.versao}</Text>
                    )}
                  </View>
                  <View style={estilos.medidas}>
                    <Medida rotulo="Peso" valor={ouNada(avaliacao.peso, 1, 'kg')} />
                    <Medida
                      rotulo="IMC"
                      valor={
                        avaliacao.imc === null
                          ? null
                          : `${formatar(avaliacao.imc, 1, '')}${
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

function formatar(valor: number, casas: number, unidade: string): string {
  const numero = arredondar(valor, casas).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
  return unidade === '' ? numero : `${numero} ${unidade}`;
}

function ouNada(valor: number | null, casas: number, unidade: string): string | null {
  return valor === null ? null : formatar(valor, casas, unidade);
}

/** A diferença sai com sinal; o sentido da mudança quem lê é o nutricionista. */
function comSinal(valor: number, casas: number, unidade: string): string {
  const arredondado = arredondar(valor, casas);
  const sinal = arredondado > 0 ? '+' : arredondado < 0 ? '−' : '';
  return `${sinal}${formatar(Math.abs(arredondado), casas, unidade)}`;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  cabecalho: { padding: Espaco.medio, gap: Espaco.pequeno },
  linhaCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botaoSair: { minWidth: 84 },
  conteudo: { paddingHorizontal: Espaco.medio, paddingBottom: Espaco.grande, gap: Espaco.pequeno },
  cartao: {
    backgroundColor: Cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.medio,
    gap: Espaco.medio,
  },
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
  subtitulo: {
    marginTop: Espaco.medio,
    fontSize: 13,
    fontWeight: '600',
    color: Cores.textoSuave,
    textTransform: 'uppercase',
  },
  item: {
    backgroundColor: Cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.medio,
    gap: Espaco.pequeno,
  },
  linhaItem: { flexDirection: 'row', alignItems: 'center', gap: Espaco.pequeno },
  data: { fontSize: 16, fontWeight: '600', color: Cores.texto },
  medidas: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.medio },
  rotuloMedida: { fontSize: 12, color: Cores.textoSuave },
  valorMedida: { fontSize: 15, fontWeight: '500', color: Cores.texto },
  etiqueta: {
    fontSize: 12,
    color: Cores.textoSuave,
    backgroundColor: Cores.fundo,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  vazio: { textAlign: 'center', color: Cores.textoSuave, paddingVertical: Espaco.grande },
});
