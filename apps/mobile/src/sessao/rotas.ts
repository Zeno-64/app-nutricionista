import type { PerfilTipo } from '@/supabase/tipos';

/**
 * RF-01: um app só nas lojas, e o perfil da conta decide qual área abre.
 *
 * A regra estava escrita em dois lugares — na raiz, que redireciona quem abre
 * o app, e na `AreaProtegida`, que manda de volta quem cai na área errada. Duas
 * cópias da mesma decisão: um terceiro tipo de perfil seria corrigido num lugar
 * e esquecido no outro.
 */
export function rotaDoPerfil(tipo: PerfilTipo): '/pacientes' | '/evolucao' {
  return tipo === 'nutricionista' ? '/pacientes' : '/evolucao';
}
