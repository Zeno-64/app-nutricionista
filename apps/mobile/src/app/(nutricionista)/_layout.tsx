import { Stack } from 'expo-router';
import { AreaProtegida } from '@/componentes/AreaProtegida';

export default function LayoutNutricionista() {
  return (
    <AreaProtegida perfilExigido="nutricionista">
      <Stack screenOptions={{ headerShown: false }} />
    </AreaProtegida>
  );
}
