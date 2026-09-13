import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { mensagem, useSessao } from '../../autenticacao/Sessao.js';
import { Aviso, Botao, CaixaDeSelecao, Carregando, Cartao, Selecao } from '../../componentes/ui.js';
import { contextoDoPaciente, montarRespostas } from '../../dados/anamnese.js';
import {
  carregarModelo,
  carregarPaciente,
  criarAnamnese,
  listarModelos,
  type ModeloResumo,
} from '../../dados/consultas.js';
import type { Paciente, TipoFormulario } from '../../dados/tipos.js';

/**
 * RF-20 e RF-23: escolhe o modelo e cria a anamnese ou a pré-consulta já com as
 * perguntas copiadas, pulando as que não se aplicam ao paciente (RF-22).
 */
export function NovaAnamnese() {
  const { id: pacienteId } = useParams<{ id: string }>();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const { usuario, membro } = useSessao();

  const tipoInicial: TipoFormulario =
    parametros.get('tipo') === 'pre_consulta' ? 'pre_consulta' : 'anamnese';

  const [tipo, setTipo] = useState<TipoFormulario>(tipoInicial);
  const [modelos, setModelos] = useState<ModeloResumo[] | null>(null);
  const [modeloId, setModeloId] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [enviarAoPaciente, setEnviarAoPaciente] = useState(tipoInicial === 'pre_consulta');
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (pacienteId === undefined) return;
    let ativo = true;
    void (async () => {
      try {
        const dados = await carregarPaciente(pacienteId);
        if (ativo) setPaciente(dados);
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      }
    })();
    return () => {
      ativo = false;
    };
  }, [pacienteId]);

  useEffect(() => {
    let ativo = true;
    setModelos(null);
    void (async () => {
      try {
        const lista = await listarModelos(tipo);
        if (!ativo) return;
        setModelos(lista);
        setModeloId(lista[0]?.id ?? '');
        setErro(null);
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      }
    })();
    return () => {
      ativo = false;
    };
  }, [tipo]);

  async function aoCriar() {
    if (pacienteId === undefined || paciente === null || membro === null || usuario === null) {
      setErro('Sem vínculo com um consultório: não dá para criar o formulário.');
      return;
    }
    if (modeloId === '') {
      setErro('Escolha um modelo.');
      return;
    }

    setErro(null);
    setCriando(true);
    try {
      const { secoes, perguntas } = await carregarModelo(modeloId);
      const respostas = montarRespostas(secoes, perguntas, contextoDoPaciente(paciente));

      const id = await criarAnamnese({
        tenantId: membro.tenant_id,
        pacienteId,
        modeloId,
        tipo,
        respostas,
        usuarioId: usuario.id,
        enviarAoPaciente,
      });
      navegar(`/anamneses/${id}`);
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setCriando(false);
    }
  }

  const avisoCondicional =
    paciente !== null && paciente.sexo === null
      ? 'O cadastro não tem o sexo do paciente, então as perguntas condicionais a ele ficam de fora.'
      : null;

  return (
    <div className="space-y-4">
      <header>
        <Link to={`/pacientes/${pacienteId}`} className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao paciente
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">
          {tipo === 'pre_consulta' ? 'Nova pré-consulta' : 'Nova anamnese'}
        </h1>
      </header>

      {erro !== null && <Aviso tom="erro">{erro}</Aviso>}

      <Cartao>
        <div className="space-y-4">
          <Selecao<TipoFormulario>
            rotulo="Tipo"
            valor={tipo}
            aoMudar={(novo) => {
              setTipo(novo);
              setEnviarAoPaciente(novo === 'pre_consulta');
            }}
          >
            <option value="anamnese">Anamnese — preenchida na consulta</option>
            <option value="pre_consulta">Pré-consulta — o paciente responde antes</option>
          </Selecao>

          {modelos === null ? (
            <Carregando texto="Carregando modelos…" />
          ) : modelos.length === 0 ? (
            <Aviso>
              Nenhum modelo de {tipo === 'pre_consulta' ? 'pré-consulta' : 'anamnese'} cadastrado
              ainda.
            </Aviso>
          ) : (
            <Selecao rotulo="Modelo" valor={modeloId} aoMudar={setModeloId}>
              {modelos.map((modelo) => (
                <option key={modelo.id} value={modelo.id}>
                  {modelo.nome}
                  {modelo.padrao && ' (padrão)'}
                </option>
              ))}
            </Selecao>
          )}

          <CaixaDeSelecao
            rotulo="Enviar ao paciente para ele responder pelo app"
            marcada={enviarAoPaciente}
            aoMudar={setEnviarAoPaciente}
          />

          {avisoCondicional !== null && <Aviso>{avisoCondicional}</Aviso>}

          <Botao
            disabled={criando || modelos === null || modelos.length === 0}
            onClick={() => void aoCriar()}
          >
            {criando ? 'Criando…' : 'Criar'}
          </Botao>
        </div>
      </Cartao>
    </div>
  );
}
