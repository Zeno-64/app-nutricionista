import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Cores, Espaco } from '@/constantes/tema';

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
  segredo = false,
  tipoTeclado = 'default',
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  segredo?: boolean;
  tipoTeclado?: 'default' | 'email-address';
}) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        secureTextEntry={segredo}
        keyboardType={tipoTeclado}
        autoCapitalize="none"
        autoCorrect={false}
        style={estilos.entrada}
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

export function Cartao({ children }: { children: ReactNode }) {
  return <View style={estilos.cartao}>{children}</View>;
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
  botao: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botaoPrimario: { backgroundColor: Cores.primaria },
  botaoSecundario: { borderWidth: 1, borderColor: Cores.borda, backgroundColor: Cores.cartao },
  botaoApagado: { opacity: 0.6 },
  textoBotaoPrimario: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  textoBotaoSecundario: { color: Cores.texto, fontWeight: '500', fontSize: 15 },
  aviso: { borderRadius: 10, borderWidth: 1, padding: Espaco.pequeno + 4 },
  avisoAtencao: { borderColor: '#fcd34d', backgroundColor: Cores.atencaoFundo },
  avisoErro: { borderColor: '#fecaca', backgroundColor: Cores.erroFundo },
  carregando: { paddingVertical: Espaco.grande, alignItems: 'center', gap: Espaco.pequeno },
  cartao: {
    backgroundColor: Cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.medio,
    gap: Espaco.medio,
  },
});
