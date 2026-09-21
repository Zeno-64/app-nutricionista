import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Cores, Espaco, Superficie } from '@/constantes/tema';

export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Texto({
  children,
  suave = false,
}: {
  children: ReactNode;
  suave?: boolean;
}) {
  return <Text style={suave ? estilos.textoSuave : estilos.texto}>{children}</Text>;
}

export function Campo({
  rotulo,
  valor,
  aoMudar,
  aoSair,
  segredo = false,
  tipoTeclado = 'default',
  linhas = 1,
  desabilitado = false,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  aoSair?: () => void;
  segredo?: boolean;
  tipoTeclado?: 'default' | 'email-address' | 'decimal-pad';
  /** Mais de uma linha vira caixa de texto, para resposta comprida. */
  linhas?: number;
  desabilitado?: boolean;
  placeholder?: string;
}) {
  const comprido = linhas > 1;
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        onBlur={aoSair}
        editable={!desabilitado}
        secureTextEntry={segredo}
        keyboardType={tipoTeclado}
        multiline={comprido}
        numberOfLines={comprido ? linhas : undefined}
        placeholder={placeholder}
        placeholderTextColor={Cores.textoSuave}
        // O texto livre da anamnese é frase, não identificador: só o login
        // precisa desligar a maiúscula automática e o corretor.
        autoCapitalize={comprido ? 'sentences' : 'none'}
        autoCorrect={comprido}
        style={[
          estilos.entrada,
          comprido && { minHeight: 24 * linhas, textAlignVertical: 'top' },
          desabilitado && estilos.entradaDesabilitada,
        ]}
      />
    </View>
  );
}

export function Botao({
  children,
  aoTocar,
  desabilitado = false,
  variante = 'primario',
}: {
  children: ReactNode;
  aoTocar: () => void;
  desabilitado?: boolean;
  variante?: 'primario' | 'secundario';
}) {
  const ehPrimario = variante === 'primario';
  return (
    <Pressable
      onPress={aoTocar}
      disabled={desabilitado}
      style={({ pressed }) => [
        estilos.botao,
        ehPrimario ? estilos.botaoPrimario : estilos.botaoSecundario,
        (pressed || desabilitado) && estilos.botaoApagado,
      ]}
    >
      <Text style={ehPrimario ? estilos.textoBotaoPrimario : estilos.textoBotaoSecundario}>
        {children}
      </Text>
    </Pressable>
  );
}

/**
 * Escolha entre poucas alternativas, em fichas que se toca.
 *
 * Não usa o seletor nativo de propósito: com três a onze opções, a ficha
 * mostra tudo de uma vez e responde a um toque só — num formulário longo, um
 * seletor que abre e fecha a cada pergunta cansa. Também é o que dá para
 * conferir no navegador, onde o componente nativo do `@expo/ui` não aparece.
 */
export function Escolha<T extends string | number | boolean>({
  rotulo,
  valor,
  opcoes,
  aoEscolher,
  desabilitado = false,
}: {
  rotulo: string;
  valor: T | null;
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>;
  aoEscolher: (valor: T | null) => void;
  desabilitado?: boolean;
}) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <View style={estilos.fichas}>
        {opcoes.map((opcao) => {
          const ativa = valor === opcao.valor;
          return (
            <Pressable
              key={String(opcao.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativa, disabled: desabilitado }}
              disabled={desabilitado}
              // Tocar de novo na escolhida limpa: é a única forma de voltar a
              // "sem resposta" sem uma opção extra em toda pergunta.
              onPress={() => aoEscolher(ativa ? null : opcao.valor)}
              style={({ pressed }) => [
                estilos.ficha,
                ativa && estilos.fichaAtiva,
                (pressed || desabilitado) && estilos.botaoApagado,
              ]}
            >
              <Text style={ativa ? estilos.fichaTextoAtivo : estilos.fichaTexto}>
                {opcao.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Aviso({
  children,
  tom = 'atencao',
}: {
  children: ReactNode;
  tom?: 'atencao' | 'erro';
}) {
  const ehErro = tom === 'erro';
  return (
    <View style={[estilos.aviso, ehErro ? estilos.avisoErro : estilos.avisoAtencao]}>
      <Text style={{ color: ehErro ? Cores.erro : Cores.atencao }}>{children}</Text>
    </View>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <View style={estilos.carregando}>
      <ActivityIndicator color={Cores.primaria} />
      <Text style={estilos.textoSuave}>{texto}</Text>
    </View>
  );
}

/**
 * A espera que ocupa a tela inteira, no meio: enquanto a sessão é conferida e
 * ainda não há o que desenhar em volta.
 */
export function CarregandoTela({ texto }: { texto?: string }) {
  return (
    <View style={estilos.telaDeEspera}>
      <Carregando {...(texto === undefined ? {} : { texto })} />
    </View>
  );
}

export function Cartao({
  children,
  /** Junta os filhos, para cartão de muitos dados curtos em vez de blocos. */
  compacto = false,
}: {
  children: ReactNode;
  compacto?: boolean;
}) {
  return (
    <View style={compacto ? estilos.cartaoCompacto : estilos.cartao}>{children}</View>
  );
}

/**
 * Título de uma faixa da tela, em versalete: "Linha do tempo", "Meus dados".
 *
 * O espaço acima é do chamador porque é decisão de layout: no meio de uma
 * rolagem longa a faixa precisa respirar, logo abaixo de um cabeçalho não.
 */
export function Secao({
  children,
  espacoAcima = Espaco.medio,
}: {
  children: ReactNode;
  espacoAcima?: number;
}) {
  return <Text style={[estilos.secao, { marginTop: espacoAcima }]}>{children}</Text>;
}

/** Selo curto ao lado de um item: "Rascunho", "Nutrio", "Liberada". */
export function Etiqueta({
  children,
  /** Em verde, para o que o nutricionista acabou de ligar. */
  destaque = false,
}: {
  children: ReactNode;
  destaque?: boolean;
}) {
  return (
    <Text style={destaque ? estilos.etiquetaDestaque : estilos.etiqueta}>{children}</Text>
  );
}

/** A frase que ocupa o lugar de uma lista vazia. */
export function Vazio({ children }: { children: ReactNode }) {
  return <Text style={estilos.vazio}>{children}</Text>;
}

/**
 * Qual versão está rodando, discreta no rodapé.
 *
 * Não é enfeite: numa distribuição de teste o cliente relata um problema por
 * mensagem, e é por este número que se sabe de qual build ele está falando —
 * senão a primeira pergunta de toda conversa vira "você já atualizou?".
 *
 * O número entre parênteses é o do build, que o EAS incrementa sozinho a cada
 * envio. Ele só existe no app instalado: no Expo Go e no navegador aparece só
 * a versão do `app.json`.
 */
export function Versao() {
  const versao = Constants.expoConfig?.version ?? '?';
  const build =
    Constants.platform?.ios?.buildNumber ?? Constants.platform?.android?.versionCode ?? null;
  return (
    <Text style={estilos.versao}>
      {build === null ? `Versão ${versao}` : `Versão ${versao} (${build})`}
    </Text>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 22, fontWeight: '600', color: Cores.texto },
  texto: { fontSize: 15, color: Cores.texto },
  textoSuave: { fontSize: 14, color: Cores.textoSuave },
  campo: { gap: 4 },
  rotulo: { fontSize: 13, color: Cores.textoSuave },
  entrada: {
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: Cores.cartao,
    color: Cores.texto,
  },
  entradaDesabilitada: { backgroundColor: Cores.fundo, color: Cores.textoSuave },
  botao: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botaoPrimario: { backgroundColor: Cores.primaria },
  botaoSecundario: { borderWidth: 1, borderColor: Cores.borda, backgroundColor: Cores.cartao },
  botaoApagado: { opacity: 0.6 },
  textoBotaoPrimario: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  textoBotaoSecundario: { color: Cores.texto, fontWeight: '500', fontSize: 15 },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.pequeno },
  ficha: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Cores.borda,
    backgroundColor: Cores.cartao,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  fichaAtiva: { borderColor: Cores.primaria, backgroundColor: Cores.primariaClara },
  fichaTexto: { fontSize: 14, color: Cores.textoSuave },
  fichaTextoAtivo: { fontSize: 14, color: Cores.primaria, fontWeight: '600' },
  aviso: { borderRadius: 10, borderWidth: 1, padding: Espaco.pequeno + 4 },
  avisoAtencao: { borderColor: '#fcd34d', backgroundColor: Cores.atencaoFundo },
  avisoErro: { borderColor: '#fecaca', backgroundColor: Cores.erroFundo },
  carregando: { paddingVertical: Espaco.grande, alignItems: 'center', gap: Espaco.pequeno },
  telaDeEspera: { flex: 1, justifyContent: 'center' },
  cartao: { ...Superficie.cartao, gap: Espaco.medio },
  cartaoCompacto: { ...Superficie.cartao, gap: Espaco.pequeno },
  secao: {
    fontSize: 13,
    fontWeight: '600',
    color: Cores.textoSuave,
    textTransform: 'uppercase',
  },
  etiqueta: {
    fontSize: 12,
    color: Cores.textoSuave,
    backgroundColor: Cores.fundo,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    // Sem isto o fundo arredondado vaza nos cantos, no Android.
    overflow: 'hidden',
  },
  etiquetaDestaque: {
    fontSize: 12,
    color: Cores.primaria,
    backgroundColor: Cores.primariaClara,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  vazio: { textAlign: 'center', color: Cores.textoSuave, paddingVertical: Espaco.grande },
  versao: {
    fontSize: 12,
    color: Cores.textoSuave,
    textAlign: 'center',
    paddingVertical: Espaco.medio,
  },
});
