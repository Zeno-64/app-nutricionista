import { Stack } from 'expo-router/stack';
import { AceiteDoTermo } from '@/componentes/AceiteDoTermo';
import { AreaProtegida } from '@/componentes/AreaProtegida';
import { Cores } from '@/constantes/tema';

const CABECALHO = {
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal',
  headerTintColor: Cores.primaria,
  headerTitleStyle: { color: Cores.texto },
  headerStyle: { backgroundColor: Cores.cartao },
} as const;

export default function LayoutPaciente() {
  return (
    <AreaProtegida perfilExigido="paciente">
      {/* RF-03: o termo vem antes de qualquer tela da área, inclusive de quem
          chegou por link direto. */}
      <AceiteDoTermo>
        {/* A evolução desenha o próprio cabeçalho; daí em diante o cabeçalho é
            o nativo, que traz o voltar e o gesto de borda. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="pre-consultas/[id]" options={CABECALHO} />
          <Stack.Screen name="perfil" options={{ ...CABECALHO, title: 'Meu perfil' }} />
        </Stack>
      </AceiteDoTermo>
    </AreaProtegida>
  );
}
