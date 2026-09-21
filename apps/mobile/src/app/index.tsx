import { Redirect } from 'expo-router';
import { CarregandoTela } from '@/componentes/ui';
import { rotaDoPerfil } from '@/sessao/rotas';
import { useSessao } from '@/sessao/Sessao';

/** RF-01: um app só nas lojas; o perfil da conta decide qual área abre. */
export default function Inicio() {
  const { usuario, perfil, carregando } = useSessao();

  if (carregando) return <CarregandoTela />;
  if (usuario === null) return <Redirect href="/entrar" />;
  if (perfil === null) return <CarregandoTela texto="Carregando o perfil…" />;

  return <Redirect href={rotaDoPerfil(perfil.tipo)} />;
}
