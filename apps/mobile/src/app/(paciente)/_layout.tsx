import { Stack } from 'expo-router/stack';
import { AceiteDoTermo } from '@/componentes/AceiteDoTermo';
import { AreaProtegida } from '@/componentes/AreaProtegida';
import { CabecalhoNativo } from '@/constantes/tema';

export default function LayoutPaciente() {
  return (
    <AreaProtegida perfilExigido="paciente">
      {/* RF-03: o termo vem antes de qualquer tela da área, inclusive de quem
          chegou por link direto. */}
      <AceiteDoTermo>
        {/* A evolução desenha o próprio cabeçalho; daí em diante é o nativo. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="pre-consultas/[id]" options={CabecalhoNativo} />
          <Stack.Screen name="perfil" options={{ ...CabecalhoNativo, title: 'Meu perfil' }} />
        </Stack>
      </AceiteDoTermo>
    </AreaProtegida>
  );
}
