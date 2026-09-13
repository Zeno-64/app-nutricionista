import {
  arredondar,
  compararAvaliacoes,
  indicadoresComEvolucao,
  montarSerie,
  type IndicadorId,
} from '@nutri/calculos';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { mensagem } from '../autenticacao/Sessao';
import { GraficoEvolucao } from '../componentes/GraficoEvolucao';
import { Aviso, Carregando, Cartao, Selecao } from '../componentes/ui';
import { carregarPaciente, listarAvaliacoes } from '../dados/consultas';
import { pontosDaEvolucao } from '../dados/evolucao';
import { formatarData, formatarNumero } from '../dados/linhaDoTempo';
import type { Avaliacao, Paciente } from '../dados/tipos';

/** RF-50 e RF-51: gráficos de evolução e tabela comparativa. */
export function Evolucao() {
  const { id } = useParams<{ id: string }>();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[] | null>(null);
  const [indicador, setIndicador] = useState<IndicadorId>('peso');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) return;
    let ativo = true;
    void (async () => {
      try {
        const [dados, lista] = await Promise.all([carregarPaciente(id), listarAvaliacoes(id)]);
        if (!ativo) return;
        setPaciente(dados);
        setAvaliacoes(lista);
        setErro(null);
      } catch (falha) {
        if (ativo) setErro(mensagem(falha));
      }
    })();
    return () => {
      ativo = false;
    };
  }, [id]);

  const pontos = useMemo(() => (avaliacoes === null ? [] : pontosDaEvolucao(avaliacoes)), [avaliacoes]);
  const disponiveis = useMemo(() => indicadoresComEvolucao(pontos), [pontos]);
  const comparacao = useMemo(() => compararAvaliacoes(pontos), [pontos]);

  // Se o indicador escolhido não tem evolução, cai no primeiro que tem.
  const escolhido = disponiveis.some((item) => item.id === indicador)
    ? indicador
    : (disponiveis[0]?.id ?? null);

  const serie = escolhido === null ? null : montarSerie(pontos, escolhido);

  if (erro !== null) return <Aviso tom="erro">{erro}</Aviso>;
  if (avaliacoes === null || paciente === null) return <Carregando />;

  return (
    <div className="space-y-4">
      <header>
        <Link to={`/pacientes/${id}`} className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao paciente
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Evolução de {paciente.nome}</h1>
      </header>

      {pontos.length === 0 ? (
        <Cartao>
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhuma avaliação registrada ainda.
          </p>
        </Cartao>
      ) : (
        <>
          <Cartao
            titulo="Gráfico"
            acao={
              disponiveis.length > 0 ? (
                <div className="w-64">
                  <Selecao<IndicadorId>
                    rotulo=""
                    valor={escolhido ?? 'peso'}
                    aoMudar={setIndicador}
                  >
                    {disponiveis.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.rotulo}
                        {item.unidade !== '' && ` (${item.unidade})`}
                      </option>
                    ))}
                  </Selecao>
                </div>
              ) : undefined
            }
          >
            {serie === null ? (
              <p className="py-6 text-center text-sm text-slate-500">
                É preciso pelo menos duas avaliações com a mesma medida para desenhar a evolução.
              </p>
            ) : (
              <div className="space-y-3">
                <GraficoEvolucao serie={serie} />
                <dl className="flex flex-wrap gap-6 text-sm">
                  <Resumo
                    rotulo="Primeira"
                    valor={`${formatarNumero(arredondar(serie.primeiro, serie.indicador.casas), serie.indicador.casas)} ${serie.indicador.unidade}`}
                    detalhe={undefined}
                  />
                  <Resumo
                    rotulo="Última"
                    valor={`${formatarNumero(arredondar(serie.ultimo, serie.indicador.casas), serie.indicador.casas)} ${serie.indicador.unidade}`}
                    detalhe={undefined}
                  />
                  <Resumo
                    rotulo="Variação"
                    valor={comSinal(serie.variacaoAbsoluta, serie.indicador.casas, serie.indicador.unidade)}
                    detalhe={
                      serie.variacaoPercentual === null
                        ? undefined
                        : comSinal(serie.variacaoPercentual, 1, '%')
                    }
                  />
                  <Resumo
                    rotulo="Avaliações"
                    valor={String(serie.pontos.length)}
                    detalhe={undefined}
                  />
                </dl>
              </div>
            )}
          </Cartao>

          <Cartao titulo="Comparação entre as avaliações">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 pr-4 font-medium text-slate-600">Indicador</th>
                    {comparacao.avaliacoes.map((avaliacao) => (
                      <th key={avaliacao.id} className="py-2 pr-4 font-medium text-slate-600">
                        {formatarData(avaliacao.data)}
                      </th>
                    ))}
                    <th className="py-2 pr-4 text-right font-medium text-slate-600">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {comparacao.linhas.map((linha) => (
                    <tr key={linha.indicador.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4 text-slate-700">
                        {linha.indicador.rotulo}
                        <span className="text-slate-400"> ({linha.indicador.unidade})</span>
                      </td>
                      {linha.valores.map((valor, indice) => (
                        <td
                          key={comparacao.avaliacoes[indice]?.id ?? indice}
                          className="py-2 pr-4 text-slate-900"
                        >
                          {valor === null
                            ? '—'
                            : formatarNumero(
                                arredondar(valor, linha.indicador.casas),
                                linha.indicador.casas,
                              )}
                        </td>
                      ))}
                      <td className="py-2 pr-4 text-right font-medium text-slate-900">
                        {linha.diferencaAbsoluta === null ? (
                          '—'
                        ) : (
                          <>
                            {comSinal(linha.diferencaAbsoluta, linha.indicador.casas, '')}
                            {linha.diferencaPercentual !== null && (
                              <span className="ml-2 font-normal text-slate-500">
                                {comSinal(linha.diferencaPercentual, 1, '%')}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              A diferença é entre a primeira e a última medida que existem, então uma avaliação sem
              aquela medida no meio não atrapalha a conta.
            </p>
          </Cartao>
        </>
      )}
    </div>
  );
}

function Resumo({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  detalhe: string | undefined;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="font-semibold text-slate-900">
        {valor}
        {detalhe !== undefined && <span className="ml-2 font-normal text-slate-500">{detalhe}</span>}
      </dd>
    </div>
  );
}

/** Diferença sempre com sinal: o sentido da mudança é leitura do nutricionista. */
function comSinal(valor: number, casas: number, unidade: string): string {
  const arredondado = arredondar(valor, casas);
  const sinal = arredondado > 0 ? '+' : arredondado < 0 ? '−' : '';
  const numero = formatarNumero(Math.abs(arredondado), casas);
  return `${sinal}${numero}${unidade === '' ? '' : ` ${unidade}`}`;
}
