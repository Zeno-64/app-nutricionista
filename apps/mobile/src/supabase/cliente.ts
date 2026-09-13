import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chaveAnonima = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Sem as variáveis no `.env`, o app abre e explica o que falta em vez de
 * quebrar. O mesmo comportamento do painel web.
 */
export const supabaseConfigurado = Boolean(url && chaveAnonima);

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url as string, chaveAnonima as string, {
      auth: {
        // No celular a sessão vive no armazenamento do app, não no navegador.
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function exigirSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.',
    );
  }
  return supabase;
}
