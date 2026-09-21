import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Carregando } from '@/componentes/ui';
import { useSessao } from '@/sessao/Sessao';
import type { PerfilTipo } from '@/supabase/tipos';

/**
 * RF-01 e RN-08: cada área é de um tipo de perfil. Quem cai na área errada vai
 * para a sua, em vez de ver uma tela vazia por falta de permissão.
 */
export function AreaProtegida({
  perfilExigido,
  children,
}: {
  perfilExigido: PerfilTipo;
  children: ReactNode;
}) {
  const { usuario, perfil, carregando } = useSessao();

  if (carregando) {
    return (
      <View style={estilos.centro}>
        <Carregando />
      </View>
    );
  }
  if (usuario === null) return <Redirect href="/entrar" />;
  if (perfil === null) {
    return (
      <View style={estilos.centro}>
        <Carregando texto="Carregando o perfil…" />
      </View>
    );
  }
  if (perfil.tipo !== perfilExigido) {
    return <Redirect href={perfil.tipo === 'nutricionista' ? '/pacientes' : '/evolucao'} />;
  }

  return <>{children}</>;
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center' },
});
