import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Botao, Carregando, Texto, Titulo } from '@/componentes/ui';
import { Cores, Espaco } from '@/constantes/tema';
import { mensagem, useSessao } from '@/sessao/Sessao';
import { exigirSupabase } from '@/supabase/cliente';
import type { Avaliacao } from '@/supabase/tipos';

/**
 * RF-62: o paciente vê as avaliações que o nutricionista liberou.
 *
 * A consulta não filtra por liberação: a RLS já devolve só o que foi liberado
 * (RN-03). Filtrar de novo aqui daria a impressão errada de que a regra mora na
 * tela.
 */
export default function Evolucao() {
  const { perfil, sair } = useSessao();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await exigirSupabase()
      .from('avaliacoes')
      // Numa string só: o supabase-js infere o tipo do retorno a partir do
      // literal, e concatenar quebra essa inferência.
      .select('id, data_avaliacao, versao, peso, imc, imc_classificacao, percentual_gordura, massa_livre_gordura, gasto_energetico_total')
      .order('data_avaliacao', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Avaliacao[];
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

      {erro !== null && (
        <View style={estilos.margem}>
          <Aviso tom="erro">{erro}</Aviso>
        </View>
      )}

      {avaliacoes === null ? (
        <Carregando />
      ) : (
        <FlatList
          data={avaliacoes}
          keyExtractor={(avaliacao) => avaliacao.id}
          contentContainerStyle={estilos.lista}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={() => void aoPuxar()} />
          }
          ListEmptyComponent={
            <Text style={estilos.vazio}>
              Nenhuma avaliação liberada ainda. Assim que o seu nutricionista liberar, ela
              aparece aqui.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={estilos.item}>
              <View style={estilos.linhaItem}>
                <Text style={estilos.data}>{formatarData(item.data_avaliacao)}</Text>
                {item.versao > 1 && <Text style={estilos.etiqueta}>Versão {item.versao}</Text>}
              </View>
              <View style={estilos.medidas}>
                <Medida rotulo="Peso" valor={formatar(item.peso, 1, 'kg')} />
                <Medida
                  rotulo="IMC"
                  valor={
                    item.imc === null
                      ? null
                      : `${formatar(item.imc, 1, '')}${
                          item.imc_classificacao !== null ? ` · ${item.imc_classificacao}` : ''
                        }`
                  }
                />
                <Medida rotulo="Gordura" valor={formatar(item.percentual_gordura, 1, '%')} />
                <Medida rotulo="Massa magra" valor={formatar(item.massa_livre_gordura, 1, 'kg')} />
                <Medida rotulo="Gasto energético" valor={formatar(item.gasto_energetico_total, 0, 'kcal')} />
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Medida({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (valor === null) return null;
  return (
    <View style={estilos.medida}>
      <Text style={estilos.rotuloMedida}>{rotulo}</Text>
      <Text style={estilos.valorMedida}>{valor}</Text>
    </View>
  );
}

function formatar(valor: number | null, casas: number, unidade: string): string | null {
  if (valor === null) return null;
  const numero = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
  return unidade === '' ? numero : `${numero} ${unidade}`;
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
  margem: { paddingHorizontal: Espaco.medio },
  lista: { paddingHorizontal: Espaco.medio, paddingBottom: Espaco.grande, gap: Espaco.pequeno },
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
  medida: { gap: 2 },
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
