import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { mensagem } from '../../autenticacao/Sessao';
import { Aviso, Botao, Carregando, Cartao, Etiqueta } from '../../componentes/ui';
import { definirModeloAtivo, listarTodosModelos, type ModeloNaLista } from '../../dados/consultas';
import { formatarData } from '../../dados/linhaDoTempo';

/**
 * RF-20 e RF-27: modelos de anamnese e de pré-consulta, criados e editados no
 * painel. Sem esta tela a pré-consulta não sai do papel — não havia como criar
 * o formulário que o paciente responde.
 */
export function Modelos() {
  const [modelos, setModelos] = useState<ModeloNaLista[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setModelos(await listarTodosModelos());
      setErro(null);
    } catch (falha) {
      setErro(mensagem(falha));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alternarAtivo(modelo: ModeloNaLista) {
    try {
      await definirModeloAtivo(modelo.id, !modelo.ativo);
      await carregar();
    } catch (falha) {
      setErro(mensagem(falha));
    }
  }

  if (erro !== null) return <Aviso tom="erro">{erro}</Aviso>;
  if (modelos === null) return <Carregando />;

  const porTipo = [
    { tipo: 'anamnese' as const, titulo: 'Anamnese', lista: modelos.filter((m) => m.tipo === 'anamnese') },
    { tipo: 'pre_consulta' as const, titulo: 'Pré-consulta', lista: modelos.filter((m) => m.tipo === 'pre_consulta') },
  ];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Modelos de formulário</h1>
        <p className="mt-1 text-sm text-slate-500">
          A anamnese é preenchida na consulta; a pré-consulta é respondida pelo paciente pelo app.
        </p>
      </header>

      {porTipo.map((grupo) => (
        <Cartao
          key={grupo.tipo}
          titulo={grupo.titulo}
          acao={
            <Link to={`/modelos/novo?tipo=${grupo.tipo}`}>
              <Botao variante="secundario">Novo modelo</Botao>
            </Link>
          }
        >
          {grupo.lista.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">
              {grupo.tipo === 'pre_consulta'
                ? 'Nenhum modelo de pré-consulta ainda. Sem um modelo, não dá para enviar pré-consulta ao paciente.'
                : 'Nenhum modelo de anamnese ainda.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {grupo.lista.map((modelo) => (
                <li key={modelo.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                      <Link to={`/modelos/${modelo.id}`} className="hover:underline">
                        {modelo.nome}
                      </Link>
                      {modelo.padrao && <Etiqueta tom="verde">Padrão</Etiqueta>}
                      {!modelo.ativo && <Etiqueta tom="ambar">Inativo</Etiqueta>}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {modelo.perguntas === 1 ? '1 pergunta' : `${modelo.perguntas} perguntas`}
                      {' · alterado em '}
                      {formatarData(modelo.atualizado_em)}
                      {modelo.descricao !== null && ` · ${modelo.descricao}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Botao variante="secundario" onClick={() => void alternarAtivo(modelo)}>
                      {modelo.ativo ? 'Desativar' : 'Reativar'}
                    </Botao>
                    <Link to={`/modelos/${modelo.id}?duplicar=1`}>
                      <Botao variante="secundario">Duplicar</Botao>
                    </Link>
                    <Link to={`/modelos/${modelo.id}`}>
                      <Botao>Editar</Botao>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      ))}

      <p className="text-xs text-slate-500">
        Modelo não se apaga, se desativa: anamnese já preenchida aponta para ele. E editar um
        modelo não mexe no que já foi respondido — a anamnese guarda a redação de quando foi feita.
      </p>
    </div>
  );
}
