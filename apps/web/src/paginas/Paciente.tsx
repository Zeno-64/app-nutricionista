import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { mensagem } from '../autenticacao/Sessao.js';
import { Aviso, Botao, Carregando, Cartao, Etiqueta } from '../componentes/ui.js';
import { carregarPaciente, listarAnamneses, listarAvaliacoes } from '../dados/consultas.js';
import { formatarData, montarLinhaDoTempo } from '../dados/linhaDoTempo.js';
import type { ItemLinhaDoTempo, Paciente as PacienteDTO } from '../dados/tipos.js';

/** RF-13: linha do tempo do paciente, em ordem cronológica. */
export function Paciente() {
  const { id } = useParams<{ id: string }>();
  const [paciente, setPaciente] = useState<PacienteDTO | null>(null);
  const [itens, setItens] = useState<ItemLinhaDoTempo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) return;
    let ativo = true;

    void (async () => {
      try {
        const [dados, avaliacoes, anamneses] = await Promise.all([
          carregarPaciente(id),
          listarAvaliacoes(id),
          listarAnamneses(id),
        ]);
        if (!ativo) return;
        setPaciente(dados);
        setItens(montarLinhaDoTempo(avaliacoes, anamneses));
        setErro(null);
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      }
    })();

    return () => {
      ativo = false;
    };
  }, [id]);

  if (erro !== null) return <Aviso tom="erro">{erro}</Aviso>;
  if (paciente === null || itens === null) return <Carregando />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/pacientes" className="text-sm text-emerald-700 hover:underline">
            ← Pacientes
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{paciente.nome}</h1>
          <p className="text-sm text-slate-500">
            {paciente.data_nascimento !== null && `Nascimento ${formatarData(paciente.data_nascimento)}`}
            {paciente.objetivo !== null && ` · ${paciente.objetivo}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/pacientes/${paciente.id}/editar`}>
            <Botao variante="secundario">Editar cadastro</Botao>
          </Link>
          <Link to={`/pacientes/${paciente.id}/anamneses/nova?tipo=pre_consulta`}>
            <Botao variante="secundario">Enviar pré-consulta</Botao>
          </Link>
          <Link to={`/pacientes/${paciente.id}/anamneses/nova`}>
            <Botao variante="secundario">Nova anamnese</Botao>
          </Link>
          <Link to={`/pacientes/${paciente.id}/avaliacoes/nova`}>
            <Botao>Nova avaliação</Botao>
          </Link>
        </div>
      </header>

      {paciente.arquivado_em !== null && (
        <Aviso>Paciente arquivado. O histórico continua aqui, mas ele perde o acesso ao app.</Aviso>
      )}

      {paciente.grupos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {paciente.grupos.map((grupo) => (
            <Etiqueta key={grupo} tom="verde">
              {rotuloGrupo(grupo)}
            </Etiqueta>
          ))}
        </div>
      )}

      <Cartao titulo="Linha do tempo">
        {itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhuma anamnese ou avaliação registrada ainda.
          </p>
        ) : (
          <ol className="space-y-3">
            {itens.map((item) => (
              <li key={`${item.tipo}-${item.id}`} className="flex gap-3">
                <time className="w-24 shrink-0 pt-0.5 text-xs text-slate-500">
                  {formatarData(item.data)}
                </time>
                <div className="flex-1 border-l border-slate-200 pb-1 pl-4">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                    {item.tipo === 'anamnese' || item.tipo === 'pre_consulta' ? (
                      <Link to={`/anamneses/${item.id}`} className="hover:underline">
                        {item.titulo}
                      </Link>
                    ) : (
                      item.titulo
                    )}
                    {item.status === 'rascunho' && <Etiqueta tom="ambar">Rascunho</Etiqueta>}
                    {item.origem === 'nutrio' && <Etiqueta tom="roxo">Nutrio</Etiqueta>}
                  </p>
                  {item.detalhe !== null && (
                    <p className="mt-0.5 text-sm text-slate-600">{item.detalhe}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Cartao>
    </div>
  );
}

function rotuloGrupo(grupo: string): string {
  const rotulos: Record<string, string> = {
    adulto: 'Adulto',
    crianca_adolescente: 'Criança ou adolescente',
    gestante: 'Gestante',
    lactante: 'Lactante',
    atleta: 'Atleta',
  };
  return rotulos[grupo] ?? grupo;
}
