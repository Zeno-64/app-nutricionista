import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Botao, Campo, Carregando, Texto, Titulo } from '@/componentes/ui';
import { Cores, Espaco } from '@/constantes/tema';
import { mensagem, useSessao } from '@/sessao/Sessao';
import { exigirSupabase } from '@/supabase/cliente';
import type { Paciente } from '@/supabase/tipos';

/** RF-55: lista e busca de pacientes no celular. */
export default function Pacientes() {
  const { perfil, sair } = useSessao();
  const [busca, setBusca] = useState('');
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async (termo: string) => {
    let consulta = exigirSupabase()
      .from('pacientes')
      .select('id, nome, objetivo, arquivado_em, usuario_id, origem')
      .is('arquivado_em', null)
      .order('nome');

    if (termo.trim() !== '') consulta = consulta.ilike('nome', `%${termo.trim()}%`);

    const { data, error } = await consulta;
    if (error) throw error;
    return (data ?? []) as Paciente[];
  }, []);

  useEffect(() => {
    let ativo = true;
    const temporizador = setTimeout(() => {
      void (async () => {
        try {
          const lista = await carregar(busca);
          if (ativo) {
            setPacientes(lista);
            setErro(null);
          }
        } catch (falha) {
          if (ativo) setErro(mensagem(falha));
        }
      })();
    }, 250);

    return () => {
      ativo = false;
      clearTimeout(temporizador);
    };
  }, [busca, carregar]);

  async function aoPuxar() {
    setAtualizando(true);
    try {
      setPacientes(await carregar(busca));
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
            <RefreshControl refreshing={atualizando} onRefresh={() => void aoPuxar()} />
          }
          ListEmptyComponent={
            <Text style={estilos.vazio}>
              {busca === '' ? 'Nenhum paciente cadastrado ainda.' : 'Nenhum paciente com esse nome.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={estilos.item}>
              <Text style={estilos.nome}>{item.nome}</Text>
              <View style={estilos.detalhes}>
                {item.objetivo !== null && <Text style={estilos.detalhe}>{item.objetivo}</Text>}
                {item.origem === 'nutrio' && <Text style={estilos.etiqueta}>Nutrio</Text>}
                {item.usuario_id === null && (
                  <Text style={estilos.etiqueta}>Sem acesso ao app</Text>
                )}
              </View>
            </View>
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
  item: {
    backgroundColor: Cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.medio,
    gap: 4,
  },
  nome: { fontSize: 16, fontWeight: '600', color: Cores.texto },
  detalhes: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.pequeno },
  detalhe: { fontSize: 13, color: Cores.textoSuave },
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
