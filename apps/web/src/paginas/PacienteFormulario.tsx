import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Sexo } from '@nutri/calculos';
import { mensagem, useSessao } from '../autenticacao/Sessao.js';
import {
  AreaTexto,
  Aviso,
  Botao,
  CaixaDeSelecao,
  Campo,
  Carregando,
  Cartao,
  Erro,
  Selecao,
} from '../componentes/ui.js';
import {
  atualizarPaciente,
  carregarPaciente,
  criarPaciente,
  definirArquivamento,
} from '../dados/consultas.js';
import {
  FORMULARIO_PACIENTE_VAZIO,
  ROTULOS_GRUPO,
  gruposSugeridos,
  paraFormulario,
  paraLinha,
  temErro,
  validarPaciente,
  type ErrosPaciente,
  type FormularioPaciente,
} from '../dados/paciente.js';
import type { GrupoPaciente, Paciente } from '../dados/tipos.js';

const GRUPOS = Object.keys(ROTULOS_GRUPO) as GrupoPaciente[];

/** RF-10, RF-12 e RF-16: cadastrar, editar e arquivar paciente. */
export function PacienteFormulario() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const { usuario, membro } = useSessao();

  const ehEdicao = id !== undefined;
  const [formulario, setFormulario] = useState<FormularioPaciente>(FORMULARIO_PACIENTE_VAZIO);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [erros, setErros] = useState<ErrosPaciente>({});
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(ehEdicao);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (id === undefined) return;
    let ativo = true;
    void (async () => {
      try {
        const dados = await carregarPaciente(id);
        if (!ativo) return;
        if (dados === null) {
          setErro('Paciente não encontrado.');
        } else {
          setPaciente(dados);
          setFormulario(paraFormulario(dados));
        }
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [id]);

  function alterar(mudanca: Partial<FormularioPaciente>) {
    setFormulario((atual) => {
      const proximo = { ...atual, ...mudanca };
      // RF-16: ao informar a data, sugere o grupo sem sobrescrever escolha feita.
      if (mudanca.dataNascimento !== undefined && atual.grupos.length === 0) {
        proximo.grupos = gruposSugeridos(mudanca.dataNascimento);
      }
      return proximo;
    });
    setErros({});
  }

  function alternarGrupo(grupo: GrupoPaciente, marcado: boolean) {
    alterar({
      grupos: marcado
        ? [...formulario.grupos, grupo]
        : formulario.grupos.filter((atual) => atual !== grupo),
    });
  }

  async function aoSalvar() {
    const encontrados = validarPaciente(formulario);
    setErros(encontrados);
    if (temErro(encontrados)) return;

    if (membro === null || usuario === null) {
      setErro('Sem vínculo com um consultório: não dá para gravar o cadastro.');
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      const linha = paraLinha(formulario, membro.tenant_id);
      if (ehEdicao && id !== undefined) {
        await atualizarPaciente(id, linha);
        navegar(`/pacientes/${id}`);
      } else {
        const novoId = await criarPaciente(linha, usuario.id);
        navegar(`/pacientes/${novoId}`);
      }
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setSalvando(false);
    }
  }

  async function aoArquivar() {
    if (id === undefined || paciente === null) return;
    const arquivando = paciente.arquivado_em === null;
    setErro(null);
    try {
      await definirArquivamento(id, arquivando);
      setPaciente({ ...paciente, arquivado_em: arquivando ? new Date().toISOString() : null });
    } catch (falha) {
      setErro(mensagem(falha));
    }
  }

  if (carregando) return <Carregando />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={ehEdicao ? `/pacientes/${id}` : '/pacientes'}
            className="text-sm text-emerald-700 hover:underline"
          >
            ← Voltar
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {ehEdicao ? 'Editar paciente' : 'Novo paciente'}
          </h1>
        </div>
        <div className="flex gap-3">
          {ehEdicao && paciente !== null && (
            <Botao variante="secundario" onClick={() => void aoArquivar()}>
              {paciente.arquivado_em === null ? 'Arquivar' : 'Desarquivar'}
            </Botao>
          )}
          <Botao disabled={salvando} onClick={() => void aoSalvar()}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Botao>
        </div>
      </header>

      {erro !== null && <Aviso tom="erro">{erro}</Aviso>}
      {paciente?.arquivado_em != null && (
        <Aviso>
          Paciente arquivado. O histórico continua aqui, mas ele perde o acesso ao app.
        </Aviso>
      )}

      <Cartao titulo="Identificação">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo rotulo="Nome" valor={formulario.nome} aoMudar={(nome) => alterar({ nome })} />
            <Erro>{erros.nome}</Erro>
          </div>
          <div>
            <Campo
              rotulo="Data de nascimento"
              tipo="date"
              valor={formulario.dataNascimento}
              aoMudar={(dataNascimento) => alterar({ dataNascimento })}
            />
            <Erro>{erros.dataNascimento}</Erro>
          </div>
          <Selecao<Sexo | ''>
            rotulo="Sexo"
            valor={formulario.sexo}
            aoMudar={(sexo) => alterar({ sexo })}
          >
            <option value="">Não informado</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
          </Selecao>
          <div>
            <Campo rotulo="CPF" valor={formulario.cpf} aoMudar={(cpf) => alterar({ cpf })} />
            <Erro>{erros.cpf}</Erro>
          </div>
          <Campo
            rotulo="Profissão"
            valor={formulario.profissao}
            aoMudar={(profissao) => alterar({ profissao })}
          />
        </div>
      </Cartao>

      <Cartao titulo="Contato">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Campo
              rotulo="E-mail"
              tipo="email"
              valor={formulario.email}
              aoMudar={(email) => alterar({ email })}
            />
            <Erro>{erros.email}</Erro>
          </div>
          <Campo
            rotulo="Telefone"
            valor={formulario.telefone}
            aoMudar={(telefone) => alterar({ telefone })}
          />
        </div>
      </Cartao>

      <Cartao titulo="Acompanhamento">
        <div className="space-y-3">
          <AreaTexto
            rotulo="Objetivo"
            valor={formulario.objetivo}
            aoMudar={(objetivo) => alterar({ objetivo })}
            linhas={2}
          />
          <AreaTexto
            rotulo="Observações"
            valor={formulario.observacoes}
            aoMudar={(observacoes) => alterar({ observacoes })}
          />
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">
              Grupos — guiam a sugestão de fórmula e escondem perguntas que não se aplicam
            </p>
            <div className="flex flex-wrap gap-4">
              {GRUPOS.map((grupo) => (
                <CaixaDeSelecao
                  key={grupo}
                  rotulo={ROTULOS_GRUPO[grupo]}
                  marcada={formulario.grupos.includes(grupo)}
                  aoMudar={(marcada) => alternarGrupo(grupo, marcada)}
                />
              ))}
            </div>
            <Erro>{erros.grupos}</Erro>
          </div>
        </div>
      </Cartao>
    </div>
  );
}
