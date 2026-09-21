import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { CarregandoTela } from '@/componentes/ui';
import { rotaDoPerfil } from '@/sessao/rotas';
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

  if (carregando) return <CarregandoTela />;
  if (usuario === null) return <Redirect href="/entrar" />;
  if (perfil === null) return <CarregandoTela texto="Carregando o perfil…" />;
  if (perfil.tipo !== perfilExigido) return <Redirect href={rotaDoPerfil(perfil.tipo)} />;

  return <>{children}</>;
}
