import {
  formatarData,
  montarLinhaDoTempo,
  type ItemLinhaDoTempo,
} from '@nutri/calculos';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, Carregando, Texto } from '@/componentes/ui';
import { Cores, Espaco } from '@/constantes/tema';
import { mensagem } from '@/sessao/Sessao';
import {
  carregarPaciente,
  listarAnamnesesDaFicha,
  listarAvaliacoesDaFicha,
  registrarVisualizacao,
} from '@/supabase/consultas';
import type { GrupoPaciente, PacienteCompleto } from '@/supabase/tipos';

interface Ficha {
  paciente: PacienteCompleto;
  itens: ItemLinhaDoTempo[];
}

/** RF-55 e RF-13: ficha do paciente e linha do tempo no celular. */
export default function FichaDoPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async (): Promise<Ficha> => {
    const [paciente, avaliacoes, anamneses] = await Promise.all([
      carregarPaciente(id),
      listarAvaliacoesDaFicha(id),
      listarAnamnesesDaFicha(id),
    ]);
    if (paciente === null) throw new Error('Paciente não encontrado.');
    return { paciente, itens: montarLinhaDoTempo(avaliacoes, anamneses) };
  }, [id]);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const dados = await carregar();
        if (!ativo) return;
        setFicha(dados);
        setErro(null);
        void registrarVisualizacao(id);
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      }
    })();
    return () => {
      ativo = false;
    };
  }, [carregar, id]);

  async function aoPuxar() {
    setAtualizando(true);
    try {
      setFicha(await carregar());
      setErro(null);
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setAtualizando(false);
    }
  }

  // O título do cabeçalho nativo é o nome do paciente assim que ele chega.
  const titulo = ficha?.paciente.nome ?? 'Ficha';

  if (erro !== null && ficha === null) {
    return (
      <View style={estilos.tela}>
        <Stack.Screen options={{ title: 'Ficha' }} />
        <View style={estilos.conteudo}>
          <Aviso tom="erro">{erro}</Aviso>
        </View>
      </View>
    );
  }

  if (ficha === null) {
    return (
      <View style={estilos.tela}>
        <Stack.Screen options={{ title: titulo }} />
        <Carregando />
      </View>
    );
  }

  const { paciente, itens } = ficha;

  return (
    <View style={estilos.tela}>
      <Stack.Screen options={{ title: titulo }} />
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => void aoPuxar()} />}
      >
        {erro !== null && <Aviso tom="erro">{erro}</Aviso>}

        {paciente.arquivado_em !== null && (
          <Aviso>
            Paciente arquivado. O histórico continua aqui, mas ele perde o acesso ao app.
          </Aviso>
        )}

        <View style={estilos.cartao}>
          <Text style={estilos.nome}>{paciente.nome}</Text>
          {paciente.objetivo !== null && <Texto suave>{paciente.objetivo}</Texto>}

          {paciente.grupos.length > 0 && (
            <View style={estilos.etiquetas}>
              {paciente.grupos.map((grupo) => (
                <Text key={grupo} style={estilos.etiqueta}>
                  {ROTULOS_GRUPO[grupo] ?? grupo}
                </Text>
              ))}
            </View>
          )}

          <View style={estilos.dados}>
            <Dado rotulo="Nascimento" valor={comIdade(paciente.data_nascimento)} />
            <Dado rotulo="Sexo" valor={ROTULOS_SEXO[paciente.sexo ?? 'ausente']} />
            <Dado rotulo="Telefone" valor={paciente.telefone} />
            <Dado rotulo="E-mail" valor={paciente.email} />
            <Dado rotulo="Profissão" valor={paciente.profissao} />
            <Dado
              rotulo="Acesso ao app"
              valor={paciente.usuario_id === null ? 'Ainda não convidado' : 'Ativo'}
            />
          </View>

          {paciente.observacoes !== null && (
            <View style={estilos.observacoes}>
              <Text style={estilos.rotulo}>Observações</Text>
              <Text style={estilos.texto}>{paciente.observacoes}</Text>
            </View>
          )}
        </View>

        <Text style={estilos.subtitulo}>Linha do tempo</Text>

        {itens.length === 0 ? (
          <Text style={estilos.vazio}>Nenhuma anamnese ou avaliação registrada ainda.</Text>
        ) : (
          itens.map((item) => (
            <View key={`${item.tipo}-${item.id}`} style={estilos.item}>
              <Text style={estilos.data}>{formatarData(item.data)}</Text>
              <View style={estilos.linhaItem}>
                <Text style={estilos.titulo}>{item.titulo}</Text>
                {item.status === 'rascunho' && <Text style={estilos.etiqueta}>Rascunho</Text>}
                {item.origem === 'nutrio' && <Text style={estilos.etiqueta}>Nutrio</Text>}
              </View>
              {item.detalhe !== null && <Text style={estilos.detalhe}>{item.detalhe}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (valor === null) return null;
  return (
    <View style={estilos.dado}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.texto}>{valor}</Text>
    </View>
  );
}

const ROTULOS_GRUPO: Record<GrupoPaciente, string> = {
  adulto: 'Adulto',
  crianca_adolescente: 'Criança ou adolescente',
  gestante: 'Gestante',
  lactante: 'Lactante',
  atleta: 'Atleta',
};

const ROTULOS_SEXO: Record<string, string | null> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  ausente: null,
};

/**
 * A data de nascimento vem com a idade junto: é o que o nutricionista procura
 * na ficha, e várias fórmulas dependem dela.
 */
function comIdade(nascimento: string | null): string | null {
  if (nascimento === null) return null;
  const [ano, mes, dia] = nascimento.slice(0, 10).split('-').map(Number);
  if (ano === undefined || mes === undefined || dia === undefined) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const mesAtual = hoje.getMonth() + 1;
  if (mesAtual < mes || (mesAtual === mes && hoje.getDate() < dia)) idade -= 1;

  return `${formatarData(nascimento)} · ${idade} anos`;
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: {
    padding: Espaco.medio,
    paddingBottom: Espaco.grande,
    gap: Espaco.pequeno,
  },
  cartao: {
    backgroundColor: Cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.medio,
    gap: Espaco.pequeno,
  },
  nome: { fontSize: 20, fontWeight: '600', color: Cores.texto },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.pequeno },
  dados: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.medio, marginTop: 4 },
  dado: { minWidth: 130 },
  observacoes: { marginTop: 4, gap: 2 },
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
    gap: 2,
  },
  linhaItem: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Espaco.pequeno },
  data: { fontSize: 12, color: Cores.textoSuave },
  titulo: { fontSize: 16, fontWeight: '600', color: Cores.texto },
  detalhe: { fontSize: 14, color: Cores.textoSuave },
  rotulo: { fontSize: 12, color: Cores.textoSuave },
  texto: { fontSize: 15, color: Cores.texto },
  vazio: { textAlign: 'center', color: Cores.textoSuave, paddingVertical: Espaco.grande },
  etiqueta: {
    fontSize: 12,
    color: Cores.textoSuave,
    backgroundColor: Cores.fundo,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
});
