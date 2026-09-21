import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Aviso,
  Botao,
  Campo,
  Carregando,
  Etiqueta,
  Texto,
  Titulo,
  Vazio,
  Versao,
} from '@/componentes/ui';
import { useCarregamento } from '@/comum/useCarregamento';
import { Cores, Espaco, Superficie } from '@/constantes/tema';
import { useSessao } from '@/sessao/Sessao';
import { listarPacientes } from '@/supabase/consultas';

/** Sem isto, cada tecla digitada na busca vira uma consulta ao banco. */
const ESPERA_DA_BUSCA = 250;

/** RF-55: lista e busca de pacientes no celular. */
export default function Pacientes() {
  const { perfil, sair } = useSessao();
  const [busca, setBusca] = useState('');

  const carregar = useCallback(() => listarPacientes(busca), [busca]);
  const { dados: pacientes, erro, atualizando, recarregar } = useCarregamento(
    carregar,
    ESPERA_DA_BUSCA,
  );

  return (
    <SafeAreaView style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <View style={estilos.linhaCabecalho}>
          <Titulo>Pacientes</Titulo>
          <View style={estilos.botaoSair}>
            <Botao variante="secundario" aoTocar={() => void sair()}>
              Sair
            </Botao>
          </View>
        </View>
        {perfil !== null && <Texto suave>{perfil.nome}</Texto>}
        <Campo rotulo="Buscar por nome" valor={busca} aoMudar={setBusca} />
      </View>

      {erro !== null && (
        <View style={estilos.margem}>
          <Aviso tom="erro">{erro}</Aviso>
        </View>
      )}

      {pacientes === null ? (
        <Carregando />
      ) : (
        <FlatList
          data={pacientes}
          keyExtractor={(paciente) => paciente.id}
          contentContainerStyle={estilos.lista}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={() => void recarregar()} />
          }
          ListEmptyComponent={
            <Vazio>
              {busca === '' ? 'Nenhum paciente cadastrado ainda.' : 'Nenhum paciente com esse nome.'}
            </Vazio>
          }
          ListFooterComponent={<Versao />}
          renderItem={({ item }) => (
            <Link href={`/pacientes/${item.id}`} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir a ficha de ${item.nome}`}
                style={({ pressed }) => [estilos.item, pressed && estilos.itemTocado]}
              >
                <Text style={estilos.nome}>{item.nome}</Text>
                <View style={estilos.detalhes}>
                  {item.objetivo !== null && <Text style={estilos.detalhe}>{item.objetivo}</Text>}
                  {item.origem === 'nutrio' && <Etiqueta>Nutrio</Etiqueta>}
                  {item.usuario_id === null && <Etiqueta>Sem acesso ao app</Etiqueta>}
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  cabecalho: { padding: Espaco.medio, gap: Espaco.pequeno },
  linhaCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botaoSair: { minWidth: 84 },
  margem: { paddingHorizontal: Espaco.medio },
  lista: { paddingHorizontal: Espaco.medio, paddingBottom: Espaco.grande, gap: Espaco.pequeno },
  item: { ...Superficie.cartao, gap: 4 },
  itemTocado: { opacity: 0.6 },
  nome: { fontSize: 16, fontWeight: '600', color: Cores.texto },
  detalhes: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.pequeno },
  detalhe: { fontSize: 13, color: Cores.textoSuave },
});
