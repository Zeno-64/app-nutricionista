import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Botao, Campo, Cartao, Texto, Titulo, Versao } from '@/componentes/ui';
import { Cores, Espaco } from '@/constantes/tema';
import { mensagem, useSessao } from '@/sessao/Sessao';
import { supabaseConfigurado } from '@/supabase/cliente';

/** RF-01: login com e-mail e senha, com recuperação de senha. */
export default function Entrar() {
  const { usuario, entrar, recuperarSenha } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEntrar() {
    setErro(null);
    setRecado(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setEnviando(false);
    }
  }

  async function aoRecuperar() {
    if (email.trim() === '') {
      setErro('Escreva o e-mail para receber o link de recuperação.');
      return;
    }
    setErro(null);
    try {
      await recuperarSenha(email);
      setRecado('Se esse e-mail tiver conta, o link de recuperação chega em instantes.');
    } catch (falha) {
      setErro(mensagem(falha));
    }
  }

  // Quem já tem sessão não fica na tela de login: volta para a raiz, que é
  // quem sabe qual área abrir para o perfil (RF-01). Sem isto, entrar dá certo
  // e a tela continua a mesma — inclusive ao reabrir o app já logado.
  if (usuario !== null) return <Redirect href="/" />;

  return (
    <SafeAreaView style={estilos.tela}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.centro}
      >
        <View style={estilos.cabecalho}>
          <Titulo>Entrar</Titulo>
          <Texto suave>Use o e-mail e a senha da sua conta.</Texto>
        </View>

        {!supabaseConfigurado && (
          <Aviso tom="erro">
            Falta configurar o Supabase: defina EXPO_PUBLIC_SUPABASE_URL e
            EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.
          </Aviso>
        )}

        <Cartao>
          <Campo rotulo="E-mail" valor={email} aoMudar={setEmail} tipoTeclado="email-address" />
          <Campo rotulo="Senha" valor={senha} aoMudar={setSenha} segredo />

          {erro !== null && <Aviso tom="erro">{erro}</Aviso>}
          {recado !== null && <Aviso>{recado}</Aviso>}

          <Botao aoTocar={() => void aoEntrar()} desabilitado={enviando || !supabaseConfigurado}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Botao>

          <Pressable onPress={() => void aoRecuperar()}>
            <Text style={estilos.link}>Esqueci a senha</Text>
          </Pressable>
        </Cartao>

        <Versao />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  centro: { flex: 1, justifyContent: 'center', padding: Espaco.medio, gap: Espaco.medio },
  cabecalho: { gap: 4 },
  link: { color: Cores.primaria, textAlign: 'center', fontSize: 14 },
});
