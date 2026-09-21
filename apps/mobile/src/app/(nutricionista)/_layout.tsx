import { Stack } from 'expo-router/stack';
import { AreaProtegida } from '@/componentes/AreaProtegida';
import { CabecalhoNativo } from '@/constantes/tema';

export default function LayoutNutricionista() {
  return (
    <AreaProtegida perfilExigido="nutricionista">
      {/* A lista desenha o próprio cabeçalho, com busca e o botão de sair. Da
          ficha em diante o cabeçalho é o nativo. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="pacientes/[id]" options={CabecalhoNativo} />
      </Stack>
    </AreaProtegida>
  );
}
