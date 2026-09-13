import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { Carregando } from '../componentes/ui.js';
import type { PerfilTipo } from '../dados/tipos.js';
import { useSessao } from './Sessao.js';

/**
 * RN-08 e RF-01: cada área é de um tipo de perfil. Quem entra na área errada é
 * mandado para a sua, em vez de ver tela vazia por falta de permissão.
 */
export function RotaProtegida({
  perfilExigido,
  children,
}: {
  perfilExigido: PerfilTipo;
  children: ReactNode;
}) {
  const { usuario, perfil, carregando } = useSessao();

  if (carregando) return <Carregando />;
  if (usuario === null) return <Navigate to="/entrar" replace />;
  if (perfil === null) return <Carregando texto="Carregando o perfil…" />;
  if (perfil.tipo !== perfilExigido) {
    return <Navigate to={perfil.tipo === 'nutricionista' ? '/pacientes' : '/minha-evolucao'} replace />;
  }

  return <>{children}</>;
}
