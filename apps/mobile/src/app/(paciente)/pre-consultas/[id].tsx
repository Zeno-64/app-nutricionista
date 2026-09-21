import { agruparPorSecao, respondida, type RespostaAnamnese } from '@nutri/calculos';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, Botao, Campo, Carregando, Escolha, Texto } from '@/componentes/ui';
import { useCarregamento } from '@/comum/useCarregamento';
import { Cores, Espaco } from '@/constantes/tema';
import { mensagem } from '@/sessao/Sessao';
import {
  carregarPreConsulta,
  finalizarPreConsulta,
  salvarResposta,
} from '@/supabase/consultas';

/**
 * RF-61: o paciente responde a pré-consulta que o nutricionista enviou.
 *
 * Cada resposta é gravada assim que o campo perde o foco, e não só no fim: o
 * questionário é longo, e perder o que já foi digitado porque o app foi para
 * segundo plano seria o pior jeito de estrear com o paciente.
 */
export default function ResponderPreConsulta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [gravando, setGravando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const carregar = useCallback(() => carregarPreConsulta(id), [id]);
  const { dados, erro, recarregar, definirDados, definirErro } = useCarregamento(carregar);

  const anamnese = dados?.anamnese ?? null;
  const respostas = dados?.respostas ?? null;
  const encerrada = anamnese !== null && anamnese.status !== 'rascunho';

  /** Mexe só na tela; o banco é avisado quando o campo perde o foco. */
  function mudar(respostaId: string, valor: unknown) {
    definirDados((atuais) =>
      atuais === null
        ? atuais
        : {
            ...atuais,
            respostas: atuais.respostas.map((r) =>
              r.id === respostaId ? { ...r, valor } : r,
            ),
          },
    );
  }

  async function gravar(respostaId: string, valor: unknown) {
    if (encerrada) return;
    try {
      await salvarResposta(respostaId, valor);
      definirErro(null);
    } catch (falha) {
      definirErro(`Não consegui gravar esta resposta: ${mensagem(falha)}`);
    }
  }

  async function enviar() {
    setGravando(true);
    try {
      await finalizarPreConsulta(id);
      await recarregar({ discreto: true });
      setConfirmando(false);
    } catch (falha) {
      definirErro(mensagem(falha));
    } finally {
      setGravando(false);
    }
  }

  if (erro !== null && respostas === null) {
    return (
      <View style={estilos.tela}>
        <Stack.Screen options={{ title: 'Pré-consulta' }} />
        <View style={estilos.conteudo}>
          <Aviso tom="erro">{erro}</Aviso>
        </View>
      </View>
    );
  }

  if (respostas === null || anamnese === null) {
    return (
      <View style={estilos.tela}>
        <Stack.Screen options={{ title: 'Pré-consulta' }} />
        <Carregando />
      </View>
    );
  }

  const respondidas = respostas.filter(respondida).length;
  const secoes = agruparPorSecao(respostas);

  return (
    <KeyboardAvoidingView
      style={estilos.tela}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Pré-consulta' }} />
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        {erro !== null && <Aviso tom="erro">{erro}</Aviso>}

        {encerrada ? (
          <Aviso>
            Respostas enviadas. Seu nutricionista vai ver tudo antes da consulta; daqui não dá
            mais para mudar.
          </Aviso>
        ) : (
          <View style={estilos.cabecalho}>
            <Texto suave>
              Responda o que conseguir — o que ficar em branco vocês veem juntos na consulta. Cada
              resposta é guardada na hora.
            </Texto>
            <Text style={estilos.andamento}>
              {respondidas} de {respostas.length} respondidas
            </Text>
          </View>
        )}

        {secoes.map((grupo) => (
          <View key={grupo.secao} style={estilos.secao}>
            {grupo.secao !== '' && <Text style={estilos.tituloSecao}>{grupo.secao}</Text>}
            {grupo.respostas.map((resposta) => (
              <View key={resposta.id} style={estilos.cartao}>
                <CampoDaResposta
                  resposta={resposta}
                  desabilitado={encerrada}
                  aoMudar={(valor) => mudar(resposta.id, valor)}
                  aoGravar={(valor) => void gravar(resposta.id, valor)}
                />
              </View>
            ))}
          </View>
        ))}

        {!encerrada && (
          <View style={estilos.rodape}>
            {confirmando ? (
              <View style={estilos.confirmacao}>
                {/* A pré-consulta não distingue pergunta obrigatória: a
                    resposta gravada copia enunciado, tipo e opções do modelo
                    (RN-02), mas não a obrigatoriedade. Enquanto for assim, o
                    aviso fala do que está em branco, sem prometer conferência
                    que não existe. */}
                <Texto suave>
                  {respondidas < respostas.length
                    ? 'Ainda há perguntas em branco. Enviar mesmo assim?'
                    : 'Depois de enviar, as respostas não podem mais ser mudadas por aqui.'}
                </Texto>
                <View style={estilos.botoes}>
                  <View style={estilos.botao}>
                    <Botao
                      variante="secundario"
                      aoTocar={() => setConfirmando(false)}
                      desabilitado={gravando}
                    >
                      Voltar
                    </Botao>
                  </View>
                  <View style={estilos.botao}>
                    <Botao aoTocar={() => void enviar()} desabilitado={gravando}>
                      {gravando ? 'Enviando…' : 'Enviar'}
                    </Botao>
                  </View>
                </View>
              </View>
            ) : (
              <Botao aoTocar={() => setConfirmando(true)} desabilitado={gravando}>
                Enviar respostas
              </Botao>
            )}
          </View>
        )}

        {encerrada && (
          <View style={estilos.rodape}>
            <Botao variante="secundario" aoTocar={() => router.back()}>
              Voltar
            </Botao>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const SIM_NAO = [
  { valor: true, rotulo: 'Sim' },
  { valor: false, rotulo: 'Não' },
] as const;

const NOTAS = Array.from({ length: 11 }, (_, nota) => ({ valor: nota, rotulo: String(nota) }));

function CampoDaResposta({
  resposta,
  desabilitado,
  aoMudar,
  aoGravar,
}: {
  resposta: RespostaAnamnese;
  desabilitado: boolean;
  aoMudar: (valor: unknown) => void;
  aoGravar: (valor: unknown) => void;
}) {
  const comoTexto =
    resposta.valor === null || resposta.valor === undefined ? '' : String(resposta.valor);

  switch (resposta.tipo) {
    case 'sim_nao':
      return (
        <Escolha<boolean>
          rotulo={resposta.enunciado}
          valor={typeof resposta.valor === 'boolean' ? resposta.valor : null}
          opcoes={SIM_NAO}
          desabilitado={desabilitado}
          aoEscolher={(valor) => {
            aoMudar(valor);
            aoGravar(valor);
          }}
        />
      );

    case 'multipla_escolha':
      return (
        <Escolha<string>
          rotulo={resposta.enunciado}
          valor={comoTexto === '' ? null : comoTexto}
          opcoes={(resposta.opcoes ?? []).map((opcao) => ({ valor: opcao, rotulo: opcao }))}
          desabilitado={desabilitado}
          aoEscolher={(valor) => {
            aoMudar(valor);
            aoGravar(valor);
          }}
        />
      );

    case 'escala_0_10':
      return (
        <Escolha<number>
          rotulo={resposta.enunciado}
          valor={typeof resposta.valor === 'number' ? resposta.valor : null}
          opcoes={NOTAS}
          desabilitado={desabilitado}
          aoEscolher={(valor) => {
            aoMudar(valor);
            aoGravar(valor);
          }}
        />
      );

    case 'texto_longo':
      return (
        <Campo
          rotulo={resposta.enunciado}
          valor={comoTexto}
          linhas={4}
          desabilitado={desabilitado}
          aoMudar={aoMudar}
          aoSair={() => aoGravar(resposta.valor)}
          placeholder={desabilitado ? '' : 'Escreva à vontade'}
        />
      );

    case 'numero':
      return (
        <Campo
          rotulo={resposta.enunciado}
          valor={comoTexto}
          tipoTeclado="decimal-pad"
          desabilitado={desabilitado}
          aoMudar={aoMudar}
          aoSair={() => aoGravar(resposta.valor)}
        />
      );

    case 'data':
    case 'texto_curto':
      return (
        <Campo
          rotulo={resposta.enunciado}
          valor={comoTexto}
          desabilitado={desabilitado}
          aoMudar={aoMudar}
          aoSair={() => aoGravar(resposta.valor)}
          placeholder={resposta.tipo === 'data' && !desabilitado ? 'dd/mm/aaaa' : undefined}
        />
      );
  }
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: {
    padding: Espaco.medio,
    paddingBottom: Espaco.grande * 2,
    gap: Espaco.pequeno,
  },
  cabecalho: { gap: 4, marginBottom: Espaco.pequeno },
  andamento: { fontSize: 13, color: Cores.primaria, fontWeight: '600' },
  secao: { gap: Espaco.pequeno, marginTop: Espaco.pequeno },
  tituloSecao: {
    fontSize: 13,
    fontWeight: '600',
    color: Cores.textoSuave,
    textTransform: 'uppercase',
  },
  cartao: {
    backgroundColor: Cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.medio,
  },
  rodape: { marginTop: Espaco.grande },
  confirmacao: { gap: Espaco.pequeno },
  botoes: { flexDirection: 'row', gap: Espaco.pequeno },
  botao: { flex: 1 },
});
