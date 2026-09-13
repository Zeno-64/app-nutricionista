import { Stack } from 'expo-router/stack';
import { AreaProtegida } from '@/componentes/AreaProtegida';
import { Cores } from '@/constantes/tema';

export default function LayoutPaciente() {
  return (
    <AreaProtegida perfilExigido="paciente">
      {/* A evolução desenha o próprio cabeçalho; da pré-consulta em diante o
          cabeçalho é o nativo, que traz o voltar e o gesto de borda. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="pre-consultas/[id]"
          options={{
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
            headerTintColor: Cores.primaria,
            headerTitleStyle: { color: Cores.texto },
            headerStyle: { backgroundColor: Cores.cartao },
          }}
        />
      </Stack>
    </AreaProtegida>
  );
}
