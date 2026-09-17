import { useEffect, useState } from 'react';
import { mensagem, useSessao } from '../autenticacao/Sessao';
import { Aviso, Botao, Campo, Carregando, Cartao } from '../componentes/ui';
import {
  carregarConsultorio,
  salvarConsultorio,
  salvarMeuPerfil,
  salvarMeuRegistro,
  type Consultorio,
} from '../dados/consultas';

/**
 * RF-05: os dados profissionais que vão nos documentos e na tela do paciente.
 *
 * Três destinos diferentes, e cada um com uma regra: o perfil é do usuário, o
 * CRN é do vínculo e passa por função (a RLS filtra linha, não coluna), e o
 * consultório só o proprietário altera. A tela junta os três porque para quem
 * usa é tudo "meus dados".
 *
 * O logotipo ainda não está aqui: depende do Storage, que entra junto dos
 * anexos (RF-14).
 */
export function MeusDados() {
  const { usuario, perfil, membro, carregando } = useSessao();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [crn, setCrn] = useState('');
  const [consultorio, setConsultorio] = useState<Consultorio | null>(null);
  const [buscando, setBuscando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const ehProprietario = membro?.papel === 'proprietario';

  useEffect(() => {
    if (perfil === null) return;
    setNome(perfil.nome);
    setTelefone(perfil.telefone ?? '');
  }, [perfil]);

  useEffect(() => {
    setCrn(membro?.crn ?? '');
  }, [membro]);

  useEffect(() => {
    if (membro === null) {
      setBuscando(false);
      return;
    }
    let ativo = true;
    void (async () => {
      try {
        const dados = await carregarConsultorio(membro.tenant_id);
        if (ativo) setConsultorio(dados);
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      } finally {
        if (ativo) setBuscando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [membro]);

  async function salvar() {
    if (usuario === null || membro === null) return;
    setErro(null);
    setRecado(null);
    setSalvando(true);
    try {
      if (nome.trim() === '') throw new Error('O nome não pode ficar em branco.');

      await salvarMeuPerfil(usuario.id, {
        nome: nome.trim(),
        telefone: telefone.trim() === '' ? null : telefone.trim(),
      });
      await salvarMeuRegistro(crn);
      if (ehProprietario && consultorio !== null) {
        if (consultorio.nome.trim() === '') {
          throw new Error('O nome do consultório não pode ficar em branco.');
        }
        await salvarConsultorio(consultorio.id, {
          nome: consultorio.nome.trim(),
          contato_email: vazioVira(consultorio.contato_email),
          contato_telefone: vazioVira(consultorio.contato_telefone),
        });
      }
      // A sessão carregou perfil e vínculo no login; recarregar a página é o
      // jeito mais simples de o cabeçalho passar a mostrar o nome novo.
      setRecado('Dados salvos. Recarregue a página para ver o nome novo no topo.');
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando || buscando) return <Carregando />;

  if (membro === null) {
    return <Aviso tom="erro">Esta conta não tem vínculo ativo com nenhum consultório.</Aviso>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Meus dados</h1>
      <p className="text-sm text-slate-600">
        É o que aparece nos documentos gerados e na tela do paciente, quando ele abre o aplicativo.
      </p>

      {erro !== null && <Aviso tom="erro">{erro}</Aviso>}
      {recado !== null && <Aviso>{recado}</Aviso>}

      <Cartao titulo="Profissional">
        <div className="flex flex-col gap-3">
          <Campo rotulo="Nome" valor={nome} aoMudar={setNome} />
          <Campo rotulo="Telefone" valor={telefone} aoMudar={setTelefone} />
          <Campo rotulo="CRN" valor={crn} aoMudar={setCrn} placeholder="CRN-3 12345" />
        </div>
      </Cartao>

      <Cartao titulo="Consultório">
        {consultorio === null ? (
          <p className="text-sm text-slate-500">Consultório não encontrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <Campo
              rotulo="Nome"
              valor={consultorio.nome}
              aoMudar={(valor) => setConsultorio({ ...consultorio, nome: valor })}
            />
            <Campo
              rotulo="E-mail de contato"
              tipo="email"
              valor={consultorio.contato_email ?? ''}
              aoMudar={(valor) => setConsultorio({ ...consultorio, contato_email: valor })}
            />
            <Campo
              rotulo="Telefone de contato"
              valor={consultorio.contato_telefone ?? ''}
              aoMudar={(valor) => setConsultorio({ ...consultorio, contato_telefone: valor })}
            />
            {!ehProprietario && (
              <Aviso>
                Só quem é proprietário do consultório altera estes campos. O seu nome, telefone e
                CRN acima você mantém.
              </Aviso>
            )}
          </div>
        )}
      </Cartao>

      <div>
        <Botao onClick={() => void salvar()} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </Botao>
      </div>

      <p className="text-xs text-slate-500">
        O logotipo ainda não entra aqui: depende do armazenamento de arquivos, que vem junto dos
        anexos.
      </p>
    </div>
  );
}

function vazioVira(valor: string | null): string | null {
  return valor === null || valor.trim() === '' ? null : valor.trim();
}
