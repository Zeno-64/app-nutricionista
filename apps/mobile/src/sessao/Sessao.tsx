import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase, supabaseConfigurado } from '@/supabase/cliente';
import type { Perfil } from '@/supabase/tipos';

interface EstadoSessao {
  usuario: User | null;
  perfil: Perfil | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
}

const Contexto = createContext<EstadoSessao | null>(null);

export function ProvedorDeSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(supabaseConfigurado);

  useEffect(() => {
    if (!supabase) return;
    let ativo = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setUsuario(data.session?.user ?? null);
      if (data.session === null) setCarregando(false);
    });

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!ativo) return;
      setUsuario(sessao?.user ?? null);
      if (sessao === null) {
        setPerfil(null);
        setCarregando(false);
      }
    });

    return () => {
      ativo = false;
      inscricao.subscription.unsubscribe();
    };
  }, []);

  // RF-01: o perfil da conta decide qual área do app abre.
  useEffect(() => {
    if (usuario === null || !supabase) return;
    let ativo = true;
    setCarregando(true);

    void (async () => {
      const { data } = await supabase
        .from('perfis')
        .select('id, tipo, nome')
        .eq('id', usuario.id)
        .maybeSingle();
      if (!ativo) return;
      setPerfil((data as Perfil | null) ?? null);
      setCarregando(false);
    })();

    return () => {
      ativo = false;
    };
  }, [usuario]);

  const entrar = useCallback(async (email: string, senha: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(traduzirErroDeLogin(error.message));
  }, []);

  const sair = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const recuperarSenha = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  }, []);

  const valor = useMemo<EstadoSessao>(
    () => ({ usuario, perfil, carregando, entrar, sair, recuperarSenha }),
    [usuario, perfil, carregando, entrar, sair, recuperarSenha],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): EstadoSessao {
  const contexto = useContext(Contexto);
  if (contexto === null) {
    throw new Error('useSessao precisa estar dentro de <ProvedorDeSessao>.');
  }
  return contexto;
}

export function mensagem(falha: unknown): string {
  return falha instanceof Error ? falha.message : String(falha);
}

function traduzirErroDeLogin(original: string): string {
  if (/invalid login credentials/i.test(original)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(original)) return 'Confirme o e-mail antes de entrar.';
  return original;
}
