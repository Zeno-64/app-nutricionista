import { Stack } from 'expo-router/stack';
import { AreaProtegida } from '@/componentes/AreaProtegida';
import { Cores } from '@/constantes/tema';

export default function LayoutNutricionista() {
  return (
    <AreaProtegida perfilExigido="nutricionista">
      {/*
        A lista desenha o próprio cabeçalho, com busca e o botão de sair. Da
        ficha em diante o cabeçalho é o nativo: é ele que traz o voltar e o
        gesto de arrastar da borda, que ninguém deveria reimplementar.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="pacientes/[id]"
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
