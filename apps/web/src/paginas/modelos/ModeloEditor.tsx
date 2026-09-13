import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { mensagem, useSessao } from '../../autenticacao/Sessao';
import {
  AreaTexto,
  Aviso,
  Botao,
  BotaoIcone,
  CaixaDeSelecao,
  Campo,
  Carregando,
  Cartao,
  Selecao,
} from '../../componentes/ui';
import { ROTULOS_GRUPO } from '../../dados/paciente';
import { carregarModeloCompleto, salvarModelo } from '../../dados/consultas';
import {
  ROTULOS_TIPO_PERGUNTA,
  TIPOS_DE_PERGUNTA,
  adicionarPergunta,
  adicionarSecao,
  alterarPergunta,
  duplicar,
  modeloVazio,
  moverPergunta,
  moverSecao,
  removerPergunta,
  removerSecao,
  renomearSecao,
  validarModelo,
  type ModeloEditor as Modelo,
  type PerguntaEditor,
} from '../../dados/modelo';
import type { GrupoPaciente, TipoFormulario, TipoPergunta } from '../../dados/tipos';

const GRUPOS = Object.keys(ROTULOS_GRUPO) as GrupoPaciente[];

/**
 * RF-20, RF-22 e RF-27: monta o formulário com seções, perguntas de vários
 * tipos e pergunta condicional.
 *
 * O modelo é editado inteiro em memória e gravado de uma vez. Salvar seção por
 * seção deixaria o formulário quebrado se algo falhasse no meio.
 */
export function ModeloEditor() {
  const { id } = useParams<{ id: string }>();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const { membro } = useSessao();

  const ehNovo = id === undefined || id === 'novo';
  const ehDuplicata = parametros.get('duplicar') === '1';
  const tipoInicial: TipoFormulario =
    parametros.get('tipo') === 'pre_consulta' ? 'pre_consulta' : 'anamnese';

  const [modelo, setModelo] = useState<Modelo | null>(ehNovo ? modeloVazio(tipoInicial) : null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  useEffect(() => {
    if (ehNovo || id === undefined) return;
    let ativo = true;

    void (async () => {
      try {
        const carregado = await carregarModeloCompleto(id);
        if (!ativo) return;
        setModelo(ehDuplicata ? duplicar(carregado, `${carregado.nome} (cópia)`) : carregado);
        setErro(null);
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      }
    })();

    return () => {
      ativo = false;
    };
  }, [id, ehNovo, ehDuplicata]);

  const erros = useMemo(() => (modelo === null ? [] : validarModelo(modelo)), [modelo]);

  async function aoSalvar() {
    if (modelo === null) return;
    setTentouSalvar(true);
    if (erros.length > 0) return;

    if (membro === null) {
      setErro('Sem vínculo com um consultório: não dá para gravar o modelo.');
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      await salvarModelo(modelo, membro.tenant_id);
      navegar('/modelos');
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setSalvando(false);
    }
  }

  if (erro !== null && modelo === null) return <Aviso tom="erro">{erro}</Aviso>;
  if (modelo === null) return <Carregando />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/modelos" className="text-sm text-emerald-700 hover:underline">
            ← Modelos
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {modelo.id === null ? 'Novo modelo' : 'Editar modelo'}
          </h1>
        </div>
        <Botao disabled={salvando} onClick={() => void aoSalvar()}>
          {salvando ? 'Salvando…' : 'Salvar modelo'}
        </Botao>
      </header>

      {erro !== null && <Aviso tom="erro">{erro}</Aviso>}

      {tentouSalvar && erros.length > 0 && (
        <Aviso tom="erro">
          <span className="font-medium">Falta resolver antes de salvar:</span>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {erros.map((item, indice) => (
              <li key={`${item.onde}-${indice}`}>
                <span className="font-medium">{item.onde}:</span> {item.mensagem}
              </li>
            ))}
          </ul>
        </Aviso>
      )}

      <Cartao titulo="Identificação">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            rotulo="Nome do modelo"
            valor={modelo.nome}
            aoMudar={(nome) => setModelo({ ...modelo, nome })}
          />
          <Selecao<TipoFormulario>
            rotulo="Tipo"
            valor={modelo.tipo}
            aoMudar={(tipo) => setModelo({ ...modelo, tipo })}
          >
            <option value="anamnese">Anamnese — preenchida na consulta</option>
            <option value="pre_consulta">Pré-consulta — o paciente responde antes</option>
          </Selecao>
          <div className="sm:col-span-2">
            <AreaTexto
              rotulo="Descrição"
              valor={modelo.descricao}
              aoMudar={(descricao) => setModelo({ ...modelo, descricao })}
              linhas={2}
            />
          </div>
          <div className="flex flex-wrap gap-6 sm:col-span-2">
            <CaixaDeSelecao
              rotulo="Usar como modelo padrão deste tipo"
              marcada={modelo.padrao}
              aoMudar={(padrao) => setModelo({ ...modelo, padrao })}
            />
            <CaixaDeSelecao
              rotulo="Ativo"
              marcada={modelo.ativo}
              aoMudar={(ativo) => setModelo({ ...modelo, ativo })}
            />
          </div>
        </div>
      </Cartao>

      {modelo.secoes.map((secao, iSecao) => (
        <Cartao
          key={secao.id ?? `nova-${iSecao}`}
          titulo={`Seção ${iSecao + 1}`}
          acao={
            <div className="flex gap-1">
              <BotaoIcone
                rotulo="Mover seção para cima"
                aoTocar={() => setModelo(moverSecao(modelo, iSecao, iSecao - 1))}
                desabilitado={iSecao === 0}
              >
                ↑
              </BotaoIcone>
              <BotaoIcone
                rotulo="Mover seção para baixo"
                aoTocar={() => setModelo(moverSecao(modelo, iSecao, iSecao + 1))}
                desabilitado={iSecao === modelo.secoes.length - 1}
              >
                ↓
              </BotaoIcone>
              <BotaoIcone
                rotulo="Remover seção"
                perigo
                aoTocar={() => setModelo(removerSecao(modelo, iSecao))}
                desabilitado={modelo.secoes.length === 1}
              >
                Remover
              </BotaoIcone>
            </div>
          }
        >
          <div className="space-y-4">
            <Campo
              rotulo="Título da seção"
              valor={secao.titulo}
              aoMudar={(titulo) => setModelo(renomearSecao(modelo, iSecao, titulo))}
            />

            {secao.perguntas.map((pergunta, iPergunta) => (
              <EditorDePergunta
                key={pergunta.id ?? `nova-${iSecao}-${iPergunta}`}
                pergunta={pergunta}
                numero={iPergunta + 1}
                primeira={iPergunta === 0}
                ultima={iPergunta === secao.perguntas.length - 1}
                aoMudar={(mudanca) => setModelo(alterarPergunta(modelo, iSecao, iPergunta, mudanca))}
                aoMover={(destino) => setModelo(moverPergunta(modelo, iSecao, iPergunta, destino))}
                aoRemover={() => setModelo(removerPergunta(modelo, iSecao, iPergunta))}
              />
            ))}

            <Botao variante="secundario" onClick={() => setModelo(adicionarPergunta(modelo, iSecao))}>
              Adicionar pergunta
            </Botao>
          </div>
        </Cartao>
      ))}

      <Botao variante="secundario" onClick={() => setModelo(adicionarSecao(modelo))}>
        Adicionar seção
      </Botao>
    </div>
  );
}

function EditorDePergunta({
  pergunta,
  numero,
  primeira,
  ultima,
  aoMudar,
  aoMover,
  aoRemover,
}: {
  pergunta: PerguntaEditor;
  numero: number;
  primeira: boolean;
  ultima: boolean;
  aoMudar: (mudanca: Partial<PerguntaEditor>) => void;
  aoMover: (destino: number) => void;
  aoRemover: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">Pergunta {numero}</span>
        <div className="flex gap-1">
          <BotaoIcone rotulo="Mover pergunta para cima" aoTocar={() => aoMover(numero - 2)} desabilitado={primeira}>
            ↑
          </BotaoIcone>
          <BotaoIcone rotulo="Mover pergunta para baixo" aoTocar={() => aoMover(numero)} desabilitado={ultima}>
            ↓
          </BotaoIcone>
          <BotaoIcone rotulo="Remover pergunta" perigo aoTocar={aoRemover}>
            Remover
          </BotaoIcone>
        </div>
      </div>

      <div className="space-y-3">
        <AreaTexto
          rotulo="Enunciado"
          valor={pergunta.enunciado}
          aoMudar={(enunciado) => aoMudar({ enunciado })}
          linhas={2}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Selecao<TipoPergunta>
            rotulo="Tipo de resposta"
            valor={pergunta.tipo}
            aoMudar={(tipo) => aoMudar({ tipo })}
          >
            {TIPOS_DE_PERGUNTA.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ROTULOS_TIPO_PERGUNTA[tipo]}
              </option>
            ))}
          </Selecao>

          <div className="flex items-end pb-2">
            <CaixaDeSelecao
              rotulo="Resposta obrigatória"
              marcada={pergunta.obrigatoria}
              aoMudar={(obrigatoria) => aoMudar({ obrigatoria })}
            />
          </div>
        </div>

        {pergunta.tipo === 'multipla_escolha' && (
          <EditorDeAlternativas
            opcoes={pergunta.opcoes}
            aoMudar={(opcoes) => aoMudar({ opcoes })}
          />
        )}

        <EditorDeCondicao
          condicao={pergunta.condicao}
          aoMudar={(condicao) => aoMudar({ condicao })}
        />
      </div>
    </div>
  );
}

function EditorDeAlternativas({
  opcoes,
  aoMudar,
}: {
  opcoes: string[];
  aoMudar: (opcoes: string[]) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-600">Alternativas</p>
      <div className="space-y-2">
        {opcoes.map((opcao, indice) => (
          <div key={indice} className="flex items-center gap-2">
            <input
              value={opcao}
              onChange={(evento) =>
                aoMudar(opcoes.map((atual, i) => (i === indice ? evento.target.value : atual)))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <BotaoIcone
              rotulo={`Remover alternativa ${indice + 1}`}
              perigo
              aoTocar={() => aoMudar(opcoes.filter((_, i) => i !== indice))}
            >
              Remover
            </BotaoIcone>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => aoMudar([...opcoes, ''])}
        className="mt-2 text-sm text-emerald-700 hover:underline"
      >
        Adicionar alternativa
      </button>
    </div>
  );
}

/**
 * RF-22: pergunta que só aparece para parte dos pacientes — como a de ciclo
 * menstrual, que o modelo padrão restringe ao sexo feminino.
 */
function EditorDeCondicao({
  condicao,
  aoMudar,
}: {
  condicao: PerguntaEditor['condicao'];
  aoMudar: (condicao: PerguntaEditor['condicao']) => void;
}) {
  const modo = condicao === null ? 'sempre' : condicao.campo === 'sexo' ? 'sexo' : 'grupo';

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Selecao<'sempre' | 'sexo' | 'grupo'>
        rotulo="Quando mostrar"
        valor={modo}
        aoMudar={(novo) => {
          if (novo === 'sempre') aoMudar(null);
          else if (novo === 'sexo') aoMudar({ campo: 'sexo', igual: 'feminino' });
          else aoMudar({ campo: 'grupo', em: ['gestante'] });
        }}
      >
        <option value="sempre">Sempre</option>
        <option value="sexo">Só para um sexo</option>
        <option value="grupo">Só para certos grupos</option>
      </Selecao>

      {modo === 'sexo' && (
        <Selecao<'feminino' | 'masculino'>
          rotulo="Sexo"
          valor={(condicao?.igual as 'feminino' | 'masculino') ?? 'feminino'}
          aoMudar={(igual) => aoMudar({ campo: 'sexo', igual })}
        >
          <option value="feminino">Feminino</option>
          <option value="masculino">Masculino</option>
        </Selecao>
      )}

      {modo === 'grupo' && (
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">Grupos</p>
          <div className="flex flex-wrap gap-3">
            {GRUPOS.map((grupo) => {
              const marcados = condicao?.em ?? [];
              return (
                <CaixaDeSelecao
                  key={grupo}
                  rotulo={ROTULOS_GRUPO[grupo]}
                  marcada={marcados.includes(grupo)}
                  aoMudar={(marcada) =>
                    aoMudar({
                      campo: 'grupo',
                      em: marcada
                        ? [...marcados, grupo]
                        : marcados.filter((atual) => atual !== grupo),
                    })
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
