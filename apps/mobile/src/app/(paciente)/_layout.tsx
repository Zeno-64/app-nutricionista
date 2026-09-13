import { Stack } from 'expo-router';
import { AreaProtegida } from '@/componentes/AreaProtegida';

export default function LayoutPaciente() {
  return (
    <AreaProtegida perfilExigido="paciente">
      <Stack screenOptions={{ headerShown: false }} />
    </AreaProtegida>
  );
}
