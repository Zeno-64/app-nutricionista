import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { mensagem } from '../autenticacao/Sessao.js';
import { Aviso, Botao, Campo, Carregando, Cartao, Etiqueta } from '../componentes/ui.js';
import { listarPacientes } from '../dados/consultas.js';
import { formatarData } from '../dados/linhaDoTempo.js';
import type { Paciente } from '../dados/tipos.js';

/** RF-11: listar, buscar e filtrar pacientes. */
export function Pacientes() {
  const [busca, setBusca] = useState('');
  const [incluirArquivados, setIncluirArquivados] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const temporizador = setTimeout(() => {
      void (async () => {
        try {
          const lista = await listarPacientes({ busca, incluirArquivados });
          if (ativo) {
            setPacientes(lista);
            setErro(null);
          }
        } catch (falha) {
          if (ativo) setErro(mensagem(falha));
        }
      })();
    }, 250);

    return () => {
      ativo = false;
      clearTimeout(temporizador);
    };
  }, [busca, incluirArquivados]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Pacientes</h1>
          <Link to="/pacientes/novo">
            <Botao>Novo paciente</Botao>
          </Link>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-64">
            <Campo rotulo="Buscar por nome" valor={busca} aoMudar={setBusca} placeholder="Nome do paciente" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={incluirArquivados}
              onChange={(evento) => setIncluirArquivados(evento.target.checked)}
              className="rounded border-slate-300"
            />
            Incluir arquivados
          </label>
        </div>
      </header>

      {erro !== null && <Aviso tom="erro">{erro}</Aviso>}

      <Cartao>
        {pacientes === null ? (
          <Carregando />
        ) : pacientes.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {busca === '' ? 'Nenhum paciente cadastrado ainda.' : 'Nenhum paciente com esse nome.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pacientes.map((paciente) => (
              <li key={paciente.id}>
                <Link
                  to={`/pacientes/${paciente.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-3 hover:bg-slate-50"
                >
                  <span>
                    <span className="font-medium text-slate-900">{paciente.nome}</span>
                    {paciente.objetivo !== null && (
                      <span className="ml-2 text-sm text-slate-500">{paciente.objetivo}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    {paciente.origem === 'nutrio' && <Etiqueta tom="roxo">Nutrio</Etiqueta>}
                    {paciente.arquivado_em !== null && <Etiqueta tom="ambar">Arquivado</Etiqueta>}
                    {paciente.usuario_id === null && <Etiqueta>Sem acesso ao app</Etiqueta>}
                    <span className="text-xs text-slate-400">
                      desde {formatarData(paciente.criado_em)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
