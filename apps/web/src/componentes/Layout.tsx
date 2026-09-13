import { Link, Outlet } from 'react-router';
import { useSessao } from '../autenticacao/Sessao.js';
import { Botao } from './ui.js';

export function Layout() {
  const { perfil, sair } = useSessao();
  const ehNutricionista = perfil?.tipo === 'nutricionista';

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-4">
            <Link
              to={ehNutricionista ? '/pacientes' : '/minha-evolucao'}
              className="font-semibold text-slate-900"
            >
              Nutri
            </Link>
            {ehNutricionista && (
              <Link to="/pacientes" className="text-sm text-slate-600 hover:text-slate-900">
                Pacientes
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            {perfil !== null && <span className="text-sm text-slate-500">{perfil.nome}</span>}
            <Botao variante="secundario" onClick={() => void sair()}>
              Sair
            </Botao>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
