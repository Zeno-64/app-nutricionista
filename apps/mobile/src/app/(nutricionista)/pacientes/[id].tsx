import {
  ROTULOS_GRUPO,
  ROTULOS_SEXO,
  dataComIdade,
  formatarData,
  montarLinhaDoTempo,
  type ItemLinhaDoTempo,
} from '@nutri/calculos';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, Botao, Carregando, Cartao, Etiqueta, Secao, Texto, Vazio } from '@/componentes/ui';
import { useCarregamento } from '@/comum/useCarregamento';
import { Cores, Espaco, Superficie } from '@/constantes/tema';
import { mensagem, useSessao } from '@/sessao/Sessao';
import {
  carregarPaciente,
  definirLiberacao,
  enviarPreConsulta,
  listarAnamnesesDaFicha,
  listarAvaliacoesDaFicha,
  registrarVisualizacao,
} from '@/supabase/consultas';
import type { AvaliacaoDaFicha, PacienteCompleto } from '@/supabase/tipos';

interface Ficha {
  paciente: PacienteCompleto;
  itens: ItemLinhaDoTempo[];
  /** Indexada por id para o botão de liberar achar a avaliação da linha. */
  avaliacoes: Map<string, AvaliacaoDaFicha>;
}

interface Confirmacao {
  /** Onde ela aparece: `pre-consulta` ou o id da avaliação. */
  chave: string;
  pergunta: string;
  rotulo: string;
  acao: () => Promise<void>;
}

/** RF-55 e RF-13: ficha do paciente e linha do tempo no celular. */
export default function FichaDoPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario, membro } = useSessao();
  const [ocupado, setOcupado] = useState(false);
  // A confirmação é uma linha na própria tela, não um diálogo do sistema: o
  // `Alert` do React Native não faz nada no navegador, e é assim que o app é
  // conferido aqui e aberto por `npm run mobile:navegador`.
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  const carregar = useCallback(async (): Promise<Ficha> => {
    const [paciente, avaliacoes, anamneses] = await Promise.all([
      carregarPaciente(id),
      listarAvaliacoesDaFicha(id),
      listarAnamnesesDaFicha(id),
    ]);
    if (paciente === null) throw new Error('Paciente não encontrado.');
    return {
      paciente,
      itens: montarLinhaDoTempo(avaliacoes, anamneses),
      avaliacoes: new Map(avaliacoes.map((avaliacao) => [avaliacao.id, avaliacao])),
    };
  }, [id]);

  const {
    dados: ficha,
    erro,
    atualizando,
    recarregar,
    definirErro,
  } = useCarregamento(carregar);

  // RNF-11: abrir a ficha é acesso a prontuário e entra na auditoria — uma vez
  // por ficha aberta, e só depois de ela abrir de verdade. Puxar para
  // atualizar não é uma visualização nova.
  const auditada = useRef<string | null>(null);
  useEffect(() => {
    if (ficha === null || auditada.current === id) return;
    auditada.current = id;
    void registrarVisualizacao(id);
  }, [ficha, id]);

  /** Uma ação que grava: trava a tela, recarrega no fim e nunca engole o erro. */
  async function executar(acao: () => Promise<void>) {
    setConfirmacao(null);
    setOcupado(true);
    try {
      await acao();
      await recarregar({ discreto: true });
    } catch (falha) {
      definirErro(mensagem(falha));
    } finally {
      setOcupado(false);
    }
  }

  function aoEnviarPreConsulta() {
    if (ficha === null) return;
    const { paciente } = ficha;

    if (membro === null || usuario === null) {
      definirErro('Sessão sem vínculo de consultório. Entre de novo.');
      return;
    }
    if (paciente.usuario_id === null) {
      definirErro(
        'Este paciente ainda não tem acesso ao app, então não teria como responder. ' +
          'Convide-o pelo painel primeiro.',
      );
      return;
    }

    definirErro(null);
    setConfirmacao({
      chave: 'pre-consulta',
      pergunta: `${paciente.nome} recebe o questionário para responder pelo app.`,
      rotulo: 'Enviar',
      acao: () =>
        enviarPreConsulta({
          tenantId: membro.tenant_id,
          pacienteId: paciente.id,
          usuarioId: usuario.id,
          sexo: paciente.sexo,
          grupos: paciente.grupos,
        }).then(() => undefined),
    });
  }

  function aoTrocarLiberacao(avaliacao: AvaliacaoDaFicha) {
    const liberando = avaliacao.liberada_em === null;
    definirErro(null);
    setConfirmacao({
      chave: avaliacao.id,
      pergunta: liberando
        ? 'O paciente passa a ver esta avaliação no app dele.'
        : 'O paciente deixa de ver esta avaliação. O registro continua aqui.',
      rotulo: liberando ? 'Liberar' : 'Ocultar',
      acao: () => definirLiberacao('avaliacoes', avaliacao.id, liberando),
    });
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

  const { paciente, itens, avaliacoes } = ficha;

  return (
    <View style={estilos.tela}>
      <Stack.Screen options={{ title: titulo }} />
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={() => void recarregar()} />
        }
      >
        {erro !== null && <Aviso tom="erro">{erro}</Aviso>}

        {paciente.arquivado_em !== null && (
          <Aviso>
            Paciente arquivado. O histórico continua aqui, mas ele perde o acesso ao app.
          </Aviso>
        )}

        <Cartao compacto>
          <Text style={estilos.nome}>{paciente.nome}</Text>
          {paciente.objetivo !== null && <Texto suave>{paciente.objetivo}</Texto>}

          {paciente.grupos.length > 0 && (
            <View style={estilos.etiquetas}>
              {paciente.grupos.map((grupo) => (
                <Etiqueta key={grupo}>{ROTULOS_GRUPO[grupo]}</Etiqueta>
              ))}
            </View>
          )}

          <View style={estilos.dados}>
            <Dado rotulo="Nascimento" valor={dataComIdade(paciente.data_nascimento)} />
            <Dado
              rotulo="Sexo"
              valor={paciente.sexo === null ? null : ROTULOS_SEXO[paciente.sexo]}
            />
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
        </Cartao>

        {/* RF-57: as duas ações que fazem sentido no celular, entre consultas. */}
        <View style={estilos.acoes}>
          {confirmacao !== null && confirmacao.chave === 'pre-consulta' ? (
            <Confirmar
              confirmacao={confirmacao}
              ocupado={ocupado}
              aoConfirmar={() => void executar(confirmacao.acao)}
              aoCancelar={() => setConfirmacao(null)}
            />
          ) : (
            <Botao variante="secundario" aoTocar={aoEnviarPreConsulta} desabilitado={ocupado}>
              Enviar pré-consulta
            </Botao>
          )}
        </View>

        <Secao>Linha do tempo</Secao>

        {itens.length === 0 ? (
          <Vazio>Nenhuma anamnese ou avaliação registrada ainda.</Vazio>
        ) : (
          itens.map((item) => {
            const avaliacao = item.tipo === 'avaliacao' ? avaliacoes.get(item.id) : undefined;
            const liberada = avaliacao !== undefined && avaliacao.liberada_em !== null;

            return (
              <View key={`${item.tipo}-${item.id}`} style={estilos.item}>
                <Text style={estilos.data}>{formatarData(item.data)}</Text>
                <View style={estilos.linhaItem}>
                  <Text style={estilos.titulo}>{item.titulo}</Text>
                  {item.status === 'rascunho' && <Etiqueta>Rascunho</Etiqueta>}
                  {item.origem === 'nutrio' && <Etiqueta>Nutrio</Etiqueta>}
                  {liberada && <Etiqueta destaque>Liberada</Etiqueta>}
                </View>
                {item.detalhe !== null && <Text style={estilos.detalhe}>{item.detalhe}</Text>}

                {/* RN-03: só a avaliação finalizada vale ser liberada. */}
                {avaliacao !== undefined && avaliacao.status === 'finalizada' && (
                  <View style={estilos.acaoDoItem}>
                    {confirmacao !== null && confirmacao.chave === avaliacao.id ? (
                      <Confirmar
                        confirmacao={confirmacao}
                        ocupado={ocupado}
                        aoConfirmar={() => void executar(confirmacao.acao)}
                        aoCancelar={() => setConfirmacao(null)}
                      />
                    ) : (
                      <Botao
                        variante="secundario"
                        desabilitado={ocupado}
                        aoTocar={() => aoTrocarLiberacao(avaliacao)}
                      >
                        {liberada ? 'Ocultar do paciente' : 'Liberar para o paciente'}
                      </Botao>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function Confirmar({
  confirmacao,
  ocupado,
  aoConfirmar,
  aoCancelar,
}: {
  confirmacao: Confirmacao;
  ocupado: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  return (
    <View style={estilos.confirmacao}>
      <Text style={estilos.detalhe}>{confirmacao.pergunta}</Text>
      <View style={estilos.botoesConfirmacao}>
        <View style={estilos.botaoConfirmacao}>
          <Botao variante="secundario" aoTocar={aoCancelar} desabilitado={ocupado}>
            Cancelar
          </Botao>
        </View>
        <View style={estilos.botaoConfirmacao}>
          <Botao aoTocar={aoConfirmar} desabilitado={ocupado}>
            {ocupado ? 'Gravando…' : confirmacao.rotulo}
          </Botao>
        </View>
      </View>
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

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: {
    padding: Espaco.medio,
    paddingBottom: Espaco.grande,
    gap: Espaco.pequeno,
  },
  nome: { fontSize: 20, fontWeight: '600', color: Cores.texto },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.pequeno },
  dados: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.medio, marginTop: 4 },
  dado: { minWidth: 130 },
  observacoes: { marginTop: 4, gap: 2 },
  acoes: { marginTop: Espaco.pequeno },
  acaoDoItem: { marginTop: Espaco.pequeno },
  confirmacao: { gap: Espaco.pequeno },
  botoesConfirmacao: { flexDirection: 'row', gap: Espaco.pequeno },
  botaoConfirmacao: { flex: 1 },
  item: { ...Superficie.cartao, gap: 2 },
  linhaItem: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Espaco.pequeno },
  data: { fontSize: 12, color: Cores.textoSuave },
  titulo: { fontSize: 16, fontWeight: '600', color: Cores.texto },
  detalhe: { fontSize: 14, color: Cores.textoSuave },
  rotulo: { fontSize: 12, color: Cores.textoSuave },
  texto: { fontSize: 15, color: Cores.texto },
});
