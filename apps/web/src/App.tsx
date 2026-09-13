import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ProvedorDeSessao, useSessao } from './autenticacao/Sessao.js';
import { RotaProtegida } from './autenticacao/RotaProtegida.js';
import { Layout } from './componentes/Layout.js';
import { Carregando } from './componentes/ui.js';
import { Entrar } from './paginas/Entrar.js';
import { MinhaEvolucao } from './paginas/MinhaEvolucao.js';
import { Paciente } from './paginas/Paciente.js';
import { PacienteFormulario } from './paginas/PacienteFormulario.js';
import { Pacientes } from './paginas/Pacientes.js';
import { Anamnese } from './paginas/anamnese/Anamnese.js';
import { NovaAnamnese } from './paginas/anamnese/NovaAnamnese.js';
import { NovaAvaliacao } from './paginas/avaliacao/NovaAvaliacao.js';

export function App() {
  return (
    <ProvedorDeSessao>
      <BrowserRouter>
        <Routes>
          <Route path="/entrar" element={<Entrar />} />

          <Route element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route
              path="/pacientes"
              element={
                <RotaProtegida perfilExigido="nutricionista">
                  <Pacientes />
                </RotaProtegida>
              }
            />
            <Route
              path="/pacientes/novo"
              element={
                <RotaProtegida perfilExigido="nutricionista">
                  <PacienteFormulario />
                </RotaProtegida>
              }
            />
            <Route
              path="/pacientes/:id"
              element={
                <RotaProtegida perfilExigido="nutricionista">
                  <Paciente />
                </RotaProtegida>
              }
            />
            <Route
              path="/pacientes/:id/editar"
              element={
                <RotaProtegida perfilExigido="nutricionista">
                  <PacienteFormulario />
                </RotaProtegida>
              }
            />
            <Route
              path="/pacientes/:id/anamneses/nova"
              element={
                <RotaProtegida perfilExigido="nutricionista">
                  <NovaAnamnese />
                </RotaProtegida>
              }
            />
            <Route
              path="/anamneses/:id"
              element={
                <RotaProtegida perfilExigido="nutricionista">
                  <Anamnese />
                </RotaProtegida>
              }
            />
            <Route
              path="/pacientes/:id/avaliacoes/nova"
              element={
                <RotaProtegida perfilExigido="nutricionista">
                  <NovaAvaliacao />
                </RotaProtegida>
              }
            />
            <Route
              path="/minha-evolucao"
              element={
                <RotaProtegida perfilExigido="paciente">
                  <MinhaEvolucao />
                </RotaProtegida>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProvedorDeSessao>
  );
}

/** RF-01: o perfil da conta decide qual área abre. */
function Inicio() {
  const { usuario, perfil, carregando } = useSessao();
  if (carregando) return <Carregando />;
  if (usuario === null) return <Navigate to="/entrar" replace />;
  if (perfil === null) return <Carregando texto="Carregando o perfil…" />;
  return <Navigate to={perfil.tipo === 'nutricionista' ? '/pacientes' : '/minha-evolucao'} replace />;
}
