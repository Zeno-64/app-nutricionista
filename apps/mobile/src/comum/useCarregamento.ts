import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { mensagem } from '@/sessao/Sessao';

/**
 * Carregar dados numa tela: o primeiro carregamento, o erro em texto e o
 * "puxar para atualizar".
 *
 * Cada tela escrevia isso à mão — `useEffect`, bandeira `ativo`, `try/catch`,
 * mais um `aoPuxar` quase igual logo abaixo. Cinco cópias do mesmo cuidado, e
 * nenhum dos `aoPuxar` tinha o cuidado: quem puxava a lista e saía da tela
 * antes de a resposta voltar mexia numa tela que já não existia.
 *
 * Aqui o cuidado é um só. Cada carregamento leva um número, e só o último
 * manda no estado — o que protege dos dois jeitos de errar: a resposta que
 * chega depois de a tela sair, e a busca lenta que volta depois de uma rápida
 * e sobrescreve o resultado certo.
 */
export interface Carregamento<T> {
  /** `null` enquanto o primeiro carregamento não terminou. */
  dados: T | null;
  erro: string | null;
  /** Só do "puxar para atualizar" — o primeiro carregamento não marca. */
  atualizando: boolean;
  /**
   * Recarrega marcando `atualizando`: é o que o `RefreshControl` chama.
   *
   * Com `{ discreto: true }` recarrega sem marcar, para depois de uma
   * gravação — ali a tela já está travada e dizendo "Gravando…", e acender
   * também a roda de atualizar seria um aviso a mais para a mesma espera.
   */
  recarregar: (opcoes?: { discreto?: boolean }) => Promise<void>;
  /**
   * Mexe nos dados já carregados, sem ir ao banco. Aceita a forma com função
   * do `useState`, que é o que a tela usa para editar um item da lista.
   */
  definirDados: Dispatch<SetStateAction<T | null>>;
  definirErro: (erro: string | null) => void;
}

export function useCarregamento<T>(
  /** Precisa ser estável (`useCallback`): é ele que decide quando recarregar. */
  carregar: () => Promise<T>,
  /**
   * Espera este tanto de milissegundos antes de carregar. É para o campo de
   * busca, que senão dispara uma consulta por tecla digitada.
   */
  atraso = 0,
): Carregamento<T> {
  const [dados, definirDados] = useState<T | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const geracao = useRef(0);

  const executar = useCallback(async () => {
    const minha = (geracao.current += 1);
    try {
      const resultado = await carregar();
      if (geracao.current !== minha) return;
      definirDados(resultado);
      definirErro(null);
    } catch (falha) {
      if (geracao.current !== minha) return;
      definirErro(mensagem(falha));
    }
  }, [carregar]);

  useEffect(() => {
    if (atraso === 0) {
      void executar();
    }
    const temporizador = atraso === 0 ? undefined : setTimeout(() => void executar(), atraso);

    return () => {
      if (temporizador !== undefined) clearTimeout(temporizador);
      // Sair da tela, ou trocar o que se carrega, deixa para trás o que estava
      // voando: quando a resposta chegar, o número dela já não é o da vez.
      geracao.current += 1;
    };
  }, [executar, atraso]);

  const recarregar = useCallback(
    async ({ discreto = false }: { discreto?: boolean } = {}) => {
      if (discreto) {
        await executar();
        return;
      }
      setAtualizando(true);
      try {
        await executar();
      } finally {
        setAtualizando(false);
      }
    },
    [executar],
  );

  return { dados, erro, atualizando, recarregar, definirDados, definirErro };
}
