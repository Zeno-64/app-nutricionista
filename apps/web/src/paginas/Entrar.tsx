import { useState } from 'react';
import { Navigate } from 'react-router';
import { mensagem, useSessao } from '../autenticacao/Sessao';
import { Aviso, Botao, Campo, Cartao } from '../componentes/ui';
import { supabaseConfigurado } from '../dados/supabase';

/** RF-01: login com e-mail e senha, com recuperação de senha. */
export function Entrar() {
  const { usuario, perfil, entrar, recuperarSenha } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario !== null && perfil !== null) {
    return <Navigate to={perfil.tipo === 'nutricionista' ? '/pacientes' : '/minha-evolucao'} replace />;
  }

  async function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setRecado(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setEnviando(false);
    }
  }

  async function aoRecuperar() {
    if (email.trim() === '') {
      setErro('Escreva o e-mail para receber o link de recuperação.');
      return;
    }
    setErro(null);
    try {
      await recuperarSenha(email);
      setRecado('Se esse e-mail tiver conta, o link de recuperação chega em instantes.');
    } catch (falha) {
      setErro(mensagem(falha));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <div className="w-full space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Painel do nutricionista</h1>
          <p className="mt-1 text-sm text-slate-500">Entre com e-mail e senha.</p>
        </div>

        {!supabaseConfigurado && (
          <Aviso tom="erro">
            Falta configurar o Supabase: defina <code>VITE_SUPABASE_URL</code> e{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code>.
          </Aviso>
        )}

        <Cartao>
          <form onSubmit={aoEnviar} className="space-y-4">
            <Campo rotulo="E-mail" tipo="email" valor={email} aoMudar={setEmail} />
            <Campo rotulo="Senha" tipo="password" valor={senha} aoMudar={setSenha} />

            {erro !== null && <Aviso tom="erro">{erro}</Aviso>}
            {recado !== null && <Aviso tom="informacao">{recado}</Aviso>}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => void aoRecuperar()}
                className="text-sm text-emerald-700 underline-offset-2 hover:underline"
              >
                Esqueci a senha
              </button>
              <Botao tipo="submit" disabled={enviando || !supabaseConfigurado}>
                {enviando ? 'Entrando…' : 'Entrar'}
              </Botao>
            </div>
          </form>
        </Cartao>
      </div>
    </main>
  );
}
