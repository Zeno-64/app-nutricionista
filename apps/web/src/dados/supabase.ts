import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const chaveAnonima = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * O painel só conversa com o Supabase se as duas variáveis estiverem no `.env`.
 * Sem elas, a aplicação sobe e explica o que falta, em vez de quebrar numa tela
 * branca — o que acontece com frequência em máquina recém-clonada.
 */
export const supabaseConfigurado = Boolean(url && chaveAnonima);

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url as string, chaveAnonima as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function exigirSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
    );
  }
  return supabase;
}
