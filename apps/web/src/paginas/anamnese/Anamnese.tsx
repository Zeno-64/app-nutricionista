import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { mensagem, useSessao } from '../../autenticacao/Sessao.js';
import {
  AreaTexto,
  Aviso,
  Botao,
  Campo,
  Carregando,
  Cartao,
  Etiqueta,
  Selecao,
} from '../../componentes/ui.js';
import {
  agruparPorSecao,
  compararVersoes,
  valorEmTexto,
  type ComparacaoResposta,
  type RespostaAnamnese,
} from '../../dados/anamnese.js';
import {
  carregarAnamnese,
  carregarAnamneseAnterior,
  definirLiberacao,
  finalizarAnamnese,
  novaVersaoAnamnese,
  salvarResposta,
} from '../../dados/consultas.js';
import { formatarData } from '../../dados/linhaDoTempo.js';
import type { Anamnese as AnamneseDTO } from '../../dados/tipos.js';

/**
 * Preenchimento e leitura de anamnese e pré-consulta (RF-24 a RF-26).
 *
 * Enquanto está em rascunho, cada resposta é gravada ao sair do campo. Depois de
 * finalizada, a tela fica só de leitura: correção sai por nova versão, que o
 * banco cria sem apagar a anterior (RN-02).
 */
export function Anamnese() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const { usuario } = useSessao();

  const [anamnese, setAnamnese] = useState<AnamneseDTO | null>(null);
  const [respostas, setRespostas] = useState<RespostaAnamnese[]>([]);
  const [comparacao, setComparacao] = useState<ComparacaoResposta[] | null>(null);
  const [mostrarAnterior, setMostrarAnterior] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const recarregar = useCallback(async (anamneseId: string) => {
    const { anamnese: cabecalho, respostas: linhas } = await carregarAnamnese(anamneseId);
    setAnamnese(cabecalho);
    setRespostas(linhas);
    return { cabecalho, linhas };
  }, []);

  useEffect(() => {
    if (id === undefined) return;
    let ativo = true;
    setCarregando(true);

    void (async () => {
      try {
        const { cabecalho, linhas } = await recarregar(id);
        if (!ativo) return;

        // RF-26: a anterior fica ao lado, para comparar.
        const anterior = await carregarAnamneseAnterior(
          cabecalho.paciente_id,
          cabecalho.tipo,
          cabecalho.data_registro,
        );
        if (!ativo) return;
        setComparacao(anterior === null ? null : compararVersoes(linhas, anterior.respostas));
        setErro(null);
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [id, recarregar]);

  const editavel = anamnese?.status === 'rascunho';

  function alterarLocal(respostaId: string, valor: unknown) {
    setRespostas((atuais) =>
      atuais.map((resposta) => (resposta.id === respostaId ? { ...resposta, valor } : resposta)),
    );
  }

  async function gravar(respostaId: string, valor: unknown) {
    try {
      await salvarResposta(respostaId, valor);
      setErro(null);
    } catch (falha) {
      setErro(mensagem(falha));
    }
  }

  async function aoFinalizar() {
    if (id === undefined || usuario === null) return;
    setOcupado(true);
    setErro(null);
    try {
      await finalizarAnamnese(id, usuario.id);
      await recarregar(id);
      setRecado('Anamnese finalizada. Para corrigir, gere uma nova versão.');
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setOcupado(false);
    }
  }

  async function aoCorrigir() {
    if (id === undefined) return;
    setOcupado(true);
    setErro(null);
    try {
      const novoId = await novaVersaoAnamnese(id);
      navegar(`/anamneses/${novoId}`);
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setOcupado(false);
    }
  }

  async function aoLiberar() {
    if (id === undefined || anamnese === null) return;
    setOcupado(true);
    setErro(null);
    try {
      const liberando = anamnese.liberada_em === null;
      await definirLiberacao('anamneses', id, liberando);
      await recarregar(id);
      setRecado(liberando ? 'Liberada para o paciente.' : 'Liberação retirada.');
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setOcupado(false);
    }
  }

  if (carregando) return <Carregando />;
  if (anamnese === null) return <Aviso tom="erro">{erro ?? 'Anamnese não encontrada.'}</Aviso>;

  const grupos = agruparPorSecao(respostas);
  const emBranco = respostas.filter((resposta) => valorEmTexto(resposta) === '').length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to={`/pacientes/${anamnese.paciente_id}`}
            className="text-sm text-emerald-700 hover:underline"
          >
            ← Voltar ao paciente
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {anamnese.tipo === 'pre_consulta' ? 'Pré-consulta' : 'Anamnese'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{formatarData(anamnese.data_registro)}</span>
            {anamnese.versao > 1 && <Etiqueta>Versão {anamnese.versao}</Etiqueta>}
            <Etiqueta tom={editavel ? 'ambar' : 'verde'}>
              {editavel ? 'Rascunho' : 'Finalizada'}
            </Etiqueta>
            {anamnese.tipo === 'pre_consulta' && anamnese.enviada_em !== null && (
              <Etiqueta tom={anamnese.respondida_em === null ? 'ambar' : 'verde'}>
                {anamnese.respondida_em === null ? 'Aguardando o paciente' : 'Respondida'}
              </Etiqueta>
            )}
            {anamnese.liberada_em !== null && <Etiqueta tom="verde">Liberada</Etiqueta>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {comparacao !== null && (
            <Botao variante="secundario" onClick={() => setMostrarAnterior((atual) => !atual)}>
              {mostrarAnterior ? 'Esconder a anterior' : 'Comparar com a anterior'}
            </Botao>
          )}
          {editavel ? (
            <Botao disabled={ocupado} onClick={() => void aoFinalizar()}>
              Finalizar
            </Botao>
          ) : (
            <>
              <Botao variante="secundario" disabled={ocupado} onClick={() => void aoLiberar()}>
                {anamnese.liberada_em === null ? 'Liberar ao paciente' : 'Retirar liberação'}
              </Botao>
              <Botao disabled={ocupado} onClick={() => void aoCorrigir()}>
                Corrigir em nova versão
              </Botao>
            </>
          )}
        </div>
      </header>

      {erro !== null && <Aviso tom="erro">{erro}</Aviso>}
      {recado !== null && <Aviso tom="informacao">{recado}</Aviso>}
      {editavel && emBranco > 0 && (
        <Aviso>
          {emBranco === 1
            ? 'Uma pergunta ainda está sem resposta.'
            : `${emBranco} perguntas ainda estão sem resposta.`}{' '}
          Dá para finalizar assim mesmo.
        </Aviso>
      )}

      <div className={mostrarAnterior ? 'grid gap-4 lg:grid-cols-2' : ''}>
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <Cartao key={grupo.secao} titulo={grupo.secao === '' ? 'Perguntas' : grupo.secao}>
              <div className="space-y-4">
                {grupo.respostas.map((resposta) => (
                  <CampoResposta
                    key={resposta.id}
                    resposta={resposta}
                    editavel={editavel}
                    aoMudar={(valor) => alterarLocal(resposta.id, valor)}
                    aoSair={(valor) => void gravar(resposta.id, valor)}
                  />
                ))}
              </div>
            </Cartao>
          ))}
        </div>

        {mostrarAnterior && comparacao !== null && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Cartao titulo="Anamnese anterior">
              <ol className="space-y-3">
                {comparacao.map((item, indice) => (
                  <li key={`${item.enunciado}-${indice}`} className="text-sm">
                    <p className="text-slate-600">{item.enunciado}</p>
                    <p
                      className={
                        item.mudou
                          ? 'mt-0.5 rounded bg-amber-50 px-2 py-1 text-slate-800'
                          : 'mt-0.5 text-slate-800'
                      }
                    >
                      {item.anterior === null || item.anterior === ''
                        ? '—'
                        : item.anterior}
                    </p>
                  </li>
                ))}
              </ol>
            </Cartao>
          </div>
        )}
      </div>
    </div>
  );
}

function CampoResposta({
  resposta,
  editavel,
  aoMudar,
  aoSair,
}: {
  resposta: RespostaAnamnese;
  editavel: boolean;
  aoMudar: (valor: unknown) => void;
  aoSair: (valor: unknown) => void;
}) {
  if (!editavel) {
    const texto = valorEmTexto(resposta);
    return (
      <div>
        <p className="text-xs font-medium text-slate-600">{resposta.enunciado}</p>
        <p className="mt-1 text-sm whitespace-pre-wrap text-slate-900">
          {texto === '' ? <span className="text-slate-400">Sem resposta</span> : texto}
        </p>
      </div>
    );
  }

  const comoTexto = typeof resposta.valor === 'string' ? resposta.valor : '';

  switch (resposta.tipo) {
    case 'texto_longo':
      return (
        <div onBlur={() => aoSair(resposta.valor)}>
          <AreaTexto rotulo={resposta.enunciado} valor={comoTexto} aoMudar={aoMudar} linhas={3} />
        </div>
      );

    case 'sim_nao':
      return (
        <Selecao<'' | 'sim' | 'nao'>
          rotulo={resposta.enunciado}
          valor={resposta.valor === true ? 'sim' : resposta.valor === false ? 'nao' : ''}
          aoMudar={(escolha) => {
            const valor = escolha === '' ? null : escolha === 'sim';
            aoMudar(valor);
            aoSair(valor);
          }}
        >
          <option value="">Sem resposta</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </Selecao>
      );

    case 'multipla_escolha':
      return (
        <Selecao<string>
          rotulo={resposta.enunciado}
          valor={comoTexto}
          aoMudar={(escolha) => {
            const valor = escolha === '' ? null : escolha;
            aoMudar(valor);
            aoSair(valor);
          }}
        >
          <option value="">Sem resposta</option>
          {(resposta.opcoes ?? []).map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </Selecao>
      );

    case 'escala_0_10':
      return (
        <Selecao<string>
          rotulo={resposta.enunciado}
          valor={resposta.valor === null || resposta.valor === undefined ? '' : String(resposta.valor)}
          aoMudar={(escolha) => {
            const valor = escolha === '' ? null : Number(escolha);
            aoMudar(valor);
            aoSair(valor);
          }}
        >
          <option value="">Sem resposta</option>
          {Array.from({ length: 11 }, (_, nota) => (
            <option key={nota} value={String(nota)}>
              {nota}
            </option>
          ))}
        </Selecao>
      );

    case 'numero':
    case 'texto_curto':
    case 'data':
      return (
        <div onBlur={() => aoSair(resposta.valor)}>
          <Campo
            rotulo={resposta.enunciado}
            tipo={resposta.tipo === 'data' ? 'date' : 'text'}
            valor={comoTexto}
            aoMudar={aoMudar}
          />
        </div>
      );
  }
}
