import Constants from 'expo-constants';
import { HASH_TERMO, TERMO_PACIENTE, VERSAO_TERMO } from '@nutri/calculos';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Botao, CarregandoTela, Texto, Titulo } from '@/componentes/ui';
import { Cores, Espaco } from '@/constantes/tema';
import { mensagem, useSessao } from '@/sessao/Sessao';
import { meuVinculo, registrarAceiteDoTermo, versaoAceitaDoTermo } from '@/supabase/consultas';

/**
 * RF-03 e RNF-01: no primeiro acesso, o paciente aceita o termo de
 * consentimento antes de qualquer outra tela.
 *
 * É um portão, não uma rota. Rota se contorna com link direto — e o app abre
 * por link (`scheme`), então `/evolucao` chegaria antes do termo. Envolvendo a
 * área inteira, não há caminho que passe por fora.
 *
 * O aceite é por versão: se o termo mudar, quem aceitou o anterior vê a tela
 * de novo, porque foi outro documento que ele leu.
 */
export function AceiteDoTermo({ children }: { children: ReactNode }) {
  const { usuario } = useSessao();
  const [versaoAceita, setVersaoAceita] = useState<string | null | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const versao = await versaoAceitaDoTermo();
        if (ativo) {
          setVersaoAceita(versao);
          setErro(null);
        }
      } catch (falha) {
        // Sem saber se aceitou, o portão fica fechado: é o lado seguro.
        if (ativo) {
          setVersaoAceita(null);
          setErro(mensagem(falha));
        }
      }
    })();
    return () => {
      ativo = false;
    };
  }, [usuario]);

  const aceitar = useCallback(async () => {
    setErro(null);
    setEnviando(true);
    try {
      const vinculo = await meuVinculo();
      if (vinculo === null || usuario === null) {
        throw new Error('Não encontramos o seu cadastro para registrar o aceite.');
      }
      await registrarAceiteDoTermo({
        pacienteId: vinculo.id,
        tenantId: vinculo.tenant_id,
        usuarioId: usuario.id,
        versao: VERSAO_TERMO,
        hash: HASH_TERMO,
        agente: `${Platform.OS} ${Constants.expoConfig?.version ?? '?'}`,
      });
      setVersaoAceita(VERSAO_TERMO);
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setEnviando(false);
    }
  }, [usuario]);

  if (versaoAceita === undefined) return <CarregandoTela />;
  if (versaoAceita === VERSAO_TERMO) return <>{children}</>;

  const jaAceitouOutra = versaoAceita !== null;

  return (
    <SafeAreaView style={estilos.tela}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Titulo>{jaAceitouOutra ? 'O termo foi atualizado' : 'Antes de começar'}</Titulo>
        <Texto suave>
          {jaAceitouOutra
            ? 'Mudamos o texto desde o seu último aceite. Leia e confirme para continuar.'
            : 'Seus dados de saúde só entram no aplicativo depois que você concordar com isto.'}
        </Texto>

        {TERMO_PACIENTE.map((secao) => (
          <View key={secao.titulo} style={estilos.secao}>
            <Text style={estilos.tituloDaSecao}>{secao.titulo}</Text>
            {secao.paragrafos.map((paragrafo) => (
              <Text key={paragrafo} style={estilos.paragrafo}>
                {paragrafo}
              </Text>
            ))}
          </View>
        ))}

        <Text style={estilos.versao}>Versão do termo: {VERSAO_TERMO}</Text>

        {erro !== null && <Aviso tom="erro">{erro}</Aviso>}

        <Botao aoTocar={() => void aceitar()} desabilitado={enviando}>
          {enviando ? 'Registrando…' : 'Li e concordo'}
        </Botao>
        <Texto suave>
          Se não concordar, feche o aplicativo e fale com o seu nutricionista — sem este aceite não
          há como usá-lo.
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: {
    padding: Espaco.medio,
    paddingBottom: Espaco.grande,
    gap: Espaco.pequeno,
  },
  secao: { gap: 4, marginTop: Espaco.pequeno },
  tituloDaSecao: { fontSize: 15, fontWeight: '600', color: Cores.texto },
  paragrafo: { fontSize: 14, color: Cores.texto, lineHeight: 20 },
  versao: {
    marginTop: Espaco.medio,
    marginBottom: Espaco.pequeno,
    fontSize: 12,
    color: Cores.textoSuave,
  },
});
