import { useEffect, useState } from 'react';
import { mensagem, useSessao } from '../autenticacao/Sessao.js';
import { Aviso, Carregando, Cartao, Etiqueta } from '../componentes/ui.js';
import { exigirSupabase } from '../dados/supabase.js';
import { formatarData, formatarNumero } from '../dados/linhaDoTempo.js';
import type { Avaliacao } from '../dados/tipos.js';

/**
 * RF-62: o paciente vê as avaliações que o nutricionista liberou. A RLS já
 * limita a consulta ao que está liberado — a tela não precisa filtrar de novo.
 */
export function MinhaEvolucao() {
  const { perfil } = useSessao();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const { data, error } = await exigirSupabase()
          .from('avaliacoes')
          .select('*')
          .order('data_avaliacao', { ascending: false });
        if (error) throw error;
        if (ativo) {
          setAvaliacoes((data ?? []) as Avaliacao[]);
          setErro(null);
        }
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  if (erro !== null) return <Aviso tom="erro">{erro}</Aviso>;
  if (avaliacoes === null) return <Carregando />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">
        Minha evolução{perfil !== null && `, ${perfil.nome.split(' ')[0]}`}
      </h1>

      <Cartao>
        {avaliacoes.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhuma avaliação liberada ainda. Assim que a nutricionista ou o nutricionista
            liberar, ela aparece aqui.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {avaliacoes.map((avaliacao) => (
              <li key={avaliacao.id} className="flex flex-wrap items-center gap-3 py-3">
                <time className="w-24 text-sm text-slate-500">
                  {formatarData(avaliacao.data_avaliacao)}
                </time>
                <span className="flex flex-wrap gap-3 text-sm text-slate-800">
                  {avaliacao.peso !== null && <span>{formatarNumero(avaliacao.peso, 1)} kg</span>}
                  {avaliacao.imc !== null && <span>IMC {formatarNumero(avaliacao.imc, 1)}</span>}
                  {avaliacao.percentual_gordura !== null && (
                    <span>{formatarNumero(avaliacao.percentual_gordura, 1)}% de gordura</span>
                  )}
                </span>
                {avaliacao.versao > 1 && <Etiqueta>Versão {avaliacao.versao}</Etiqueta>}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
