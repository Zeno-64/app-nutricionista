import {
  FORMULAS_ENERGIA,
  PROTOCOLOS_COMPOSICAO,
  ROTULOS_CIRCUNFERENCIA,
  ROTULOS_DOBRA,
  ROTULOS_PUBLICO,
  ROTULOS_STATUS,
  agruparPorPublico,
  arredondar,
  buscarFormulas,
  obterFormulaEnergia,
  podeCalcular,
  type Circunferencia,
  type DobraCutanea,
  type FormulaEnergiaId,
  type ProtocoloId,
  type Sexo,
} from '@nutri/calculos';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { mensagem, useSessao } from '../../autenticacao/Sessao';
import { MemoriaDeCalculo } from '../../componentes/MemoriaDeCalculo';
import { Aviso, Botao, Campo, Cartao, Etiqueta, Selecao } from '../../componentes/ui';
import { salvarAvaliacao } from '../../dados/avaliacoes';
import { formatarNumero } from '../../dados/linhaDoTempo';
import {
  FORMULARIO_VAZIO,
  calcularAoVivo,
  medidasExigidas,
  type Bloco,
  type FormularioAvaliacao,
} from './calculoAoVivo';

const CIRCUNFERENCIAS = Object.keys(ROTULOS_CIRCUNFERENCIA) as Circunferencia[];
const DOBRAS = Object.keys(ROTULOS_DOBRA) as DobraCutanea[];

/** RF-30 a RF-45: avaliação completa, com o cálculo acompanhando a digitação. */
export function NovaAvaliacao() {
  const { id: pacienteId } = useParams<{ id: string }>();
  const { usuario, membro } = useSessao();

  const [formulario, setFormulario] = useState<FormularioAvaliacao>(FORMULARIO_VAZIO);
  const [dataAvaliacao, setDataAvaliacao] = useState(new Date().toISOString().slice(0, 10));
  const [buscaFormula, setBuscaFormula] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const resultado = useMemo(() => calcularAoVivo(formulario), [formulario]);
  const exigencias = useMemo(
    () => medidasExigidas(formulario.protocolo, formulario.sexo),
    [formulario.protocolo, formulario.sexo],
  );
  const formulaEscolhida = obterFormulaEnergia(formulario.formula);
  const gruposDeFormula = useMemo(
    () => agruparPorPublico(buscarFormulas(buscaFormula)),
    [buscaFormula],
  );

  function alterar(mudanca: Partial<FormularioAvaliacao>) {
    setFormulario((atual) => ({ ...atual, ...mudanca }));
    setSalvo(null);
  }

  async function aoSalvar(finalizar: boolean) {
    if (pacienteId === undefined || membro === null || usuario === null) {
      setErro('Sem vínculo com um consultório: não dá para gravar a avaliação.');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const id = await salvarAvaliacao({
        tenantId: membro.tenant_id,
        pacienteId,
        dataAvaliacao,
        formulario,
        resultado,
        finalizar,
        usuarioId: usuario.id,
      });
      setSalvo(finalizar ? 'Avaliação finalizada.' : `Rascunho salvo (${id.slice(0, 8)}).`);
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/pacientes/${pacienteId}`} className="text-sm text-emerald-700 hover:underline">
            ← Voltar ao paciente
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">Nova avaliação</h1>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-44">
            <Campo rotulo="Data" tipo="date" valor={dataAvaliacao} aoMudar={setDataAvaliacao} />
          </div>
          <Botao variante="secundario" disabled={salvando} onClick={() => void aoSalvar(false)}>
            Salvar rascunho
          </Botao>
          <Botao disabled={salvando} onClick={() => void aoSalvar(true)}>
            Finalizar
          </Botao>
        </div>
      </header>

      {erro !== null && <Aviso tom="erro">{erro}</Aviso>}
      {salvo !== null && <Aviso tom="informacao">{salvo}</Aviso>}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <Cartao titulo="Medidas">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Selecao<Sexo>
                rotulo="Sexo"
                valor={formulario.sexo}
                aoMudar={(sexo) => alterar({ sexo })}
              >
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
              </Selecao>
              <Campo
                rotulo="Idade"
                unidade="anos"
                valor={formulario.idade}
                aoMudar={(idade) => alterar({ idade })}
                destacado={exigencias.idade === true}
              />
              <Campo
                rotulo="Peso"
                unidade="kg"
                valor={formulario.peso}
                aoMudar={(peso) => alterar({ peso })}
                destacado={exigencias.peso === true}
              />
              <Campo
                rotulo="Altura"
                unidade="cm"
                valor={formulario.altura}
                aoMudar={(altura) => alterar({ altura })}
                destacado={exigencias.altura === true}
              />
            </div>
          </Cartao>

          <Cartao titulo="Circunferências (cm)">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CIRCUNFERENCIAS.map((chave) => (
                <Campo
                  key={chave}
                  rotulo={ROTULOS_CIRCUNFERENCIA[chave]}
                  valor={formulario.circunferencias[chave] ?? ''}
                  aoMudar={(valor) =>
                    alterar({ circunferencias: { ...formulario.circunferencias, [chave]: valor } })
                  }
                  destacado={exigencias.circunferencias?.includes(chave) === true}
                />
              ))}
            </div>
          </Cartao>

          <Cartao
            titulo="Composição corporal"
            acao={<EtiquetaStatus id={formulario.protocolo} tipo="protocolo" />}
          >
            <div className="space-y-3">
              <Selecao<ProtocoloId>
                rotulo="Protocolo de percentual de gordura"
                valor={formulario.protocolo}
                aoMudar={(protocolo) => alterar({ protocolo })}
              >
                {PROTOCOLOS_COMPOSICAO.map((protocolo) => (
                  <option key={protocolo.id} value={protocolo.id}>
                    {protocolo.nome}
                    {!podeCalcular(protocolo.status) && ' — não confere ainda'}
                  </option>
                ))}
              </Selecao>

              <Campo
                rotulo="Massa livre de gordura (bioimpedância)"
                unidade="kg"
                valor={formulario.massaLivreGordura}
                aoMudar={(massaLivreGordura) => alterar({ massaLivreGordura })}
              />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {DOBRAS.map((chave) => (
                  <Campo
                    key={chave}
                    rotulo={ROTULOS_DOBRA[chave]}
                    unidade="mm"
                    valor={formulario.dobras[chave] ?? ''}
                    aoMudar={(valor) => alterar({ dobras: { ...formulario.dobras, [chave]: valor } })}
                    destacado={exigencias.dobras?.includes(chave) === true}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Os campos marcados são os que o protocolo escolhido exige.
              </p>
            </div>
          </Cartao>

          <Cartao
            titulo="Gasto energético"
            acao={<EtiquetaStatus id={formulario.formula} tipo="formula" />}
          >
            <div className="space-y-3">
              <Campo
                rotulo="Buscar fórmula"
                valor={buscaFormula}
                aoMudar={setBuscaFormula}
                placeholder="Mifflin, atleta, gestante…"
              />

              <Selecao<FormulaEnergiaId>
                rotulo="Fórmula"
                valor={formulario.formula}
                aoMudar={(formula) => alterar({ formula })}
              >
                {gruposDeFormula.map((grupo) => (
                  <optgroup key={grupo.publico} label={ROTULOS_PUBLICO[grupo.publico]}>
                    {grupo.formulas.map((formula) => (
                      <option key={formula.id} value={formula.id}>
                        {formula.nome}
                        {!podeCalcular(formula.status) && ' — não confere ainda'}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Selecao>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {formulaEscolhida.resultado === 'tmb' && (
                  <Campo
                    rotulo="Fator de atividade"
                    valor={formulario.fatorAtividade}
                    aoMudar={(fatorAtividade) => alterar({ fatorAtividade })}
                    destacado
                  />
                )}
                {formulaEscolhida.entradasExtras.includes('kcalPorKg') && (
                  <Campo
                    rotulo="kcal por kg"
                    valor={formulario.kcalPorKg}
                    aoMudar={(kcalPorKg) => alterar({ kcalPorKg })}
                    destacado
                  />
                )}
                {formulaEscolhida.entradasExtras.includes('valorInformado') && (
                  <Campo
                    rotulo={formulaEscolhida.resultado === 'get' ? 'GET' : 'TMB'}
                    unidade="kcal"
                    valor={formulario.valorInformado}
                    aoMudar={(valorInformado) => alterar({ valorInformado })}
                    destacado
                  />
                )}
              </div>

              {formulaEscolhida.resultado === 'get' && (
                <p className="text-xs text-slate-500">
                  Esta fórmula já resulta em GET: o nível de atividade entra nela mesma e não
                  existe fator de atividade a aplicar depois.
                </p>
              )}
            </div>
          </Cartao>

          <Cartao titulo="Meta calórica e macronutrientes">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Selecao<'kcal' | 'percentual'>
                  rotulo="Ajuste sobre o GET"
                  valor={formulario.ajusteTipo}
                  aoMudar={(ajusteTipo) => alterar({ ajusteTipo })}
                >
                  <option value="kcal">Em kcal</option>
                  <option value="percentual">Em percentual</option>
                </Selecao>
                <Campo
                  rotulo={formulario.ajusteTipo === 'kcal' ? 'Déficit ou superávit' : 'Percentual'}
                  unidade={formulario.ajusteTipo === 'kcal' ? 'kcal' : '%'}
                  valor={formulario.ajusteValor}
                  aoMudar={(ajusteValor) => alterar({ ajusteValor })}
                  placeholder="-500"
                />
              </div>

              <Selecao<'percentual' | 'gramasPorKg'>
                rotulo="Distribuição"
                valor={formulario.macrosModo}
                aoMudar={(macrosModo) => alterar({ macrosModo })}
              >
                <option value="percentual">Por percentual da meta</option>
                <option value="gramasPorKg">Por grama por quilo</option>
              </Selecao>

              <div className="grid grid-cols-3 gap-3">
                <Campo
                  rotulo="Proteína"
                  unidade={formulario.macrosModo === 'percentual' ? '%' : 'g/kg'}
                  valor={formulario.proteina}
                  aoMudar={(proteina) => alterar({ proteina })}
                />
                {formulario.macrosModo === 'percentual' && (
                  <Campo
                    rotulo="Carboidrato"
                    unidade="%"
                    valor={formulario.carboidrato}
                    aoMudar={(carboidrato) => alterar({ carboidrato })}
                  />
                )}
                <Campo
                  rotulo="Gordura"
                  unidade={formulario.macrosModo === 'percentual' ? '%' : 'g/kg'}
                  valor={formulario.gordura}
                  aoMudar={(gordura) => alterar({ gordura })}
                />
              </div>
              {formulario.macrosModo === 'gramasPorKg' && (
                <p className="text-xs text-slate-500">
                  O carboidrato fica com as calorias que sobram.
                </p>
              )}
            </div>
          </Cartao>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Cartao titulo="Resultado">
            <dl className="space-y-2">
              <Linha
                rotulo="IMC"
                bloco={resultado.imc}
                texto={(v) => `${formatarNumero(arredondar(v.imc, 2), 2)} — ${v.faixa.rotulo}`}
              />
              <Linha
                rotulo="Cintura-quadril"
                bloco={resultado.rcq}
                texto={(v) => formatarNumero(arredondar(v.razao, 2), 2)}
              />
              <Linha
                rotulo="Cintura-estatura"
                bloco={resultado.rce}
                texto={(v) => formatarNumero(arredondar(v.razao, 2), 2)}
              />
              <Linha
                rotulo="Gordura corporal"
                bloco={resultado.composicao}
                texto={(v) =>
                  `${formatarNumero(arredondar(v.percentualGordura, 1), 1)}%` +
                  (v.massaLivreGordura !== null
                    ? ` · MLG ${formatarNumero(arredondar(v.massaLivreGordura, 1), 1)} kg`
                    : '')
                }
              />
              <Linha
                rotulo="Gasto energético"
                bloco={resultado.energia}
                texto={(v) =>
                  `GET ${formatarNumero(arredondar(v.get, 0), 0)} kcal` +
                  (v.tmb !== null ? ` · TMB ${formatarNumero(arredondar(v.tmb, 0), 0)} kcal` : '')
                }
              />
              <Linha
                rotulo="Meta calórica"
                bloco={resultado.meta}
                texto={(v) => `${formatarNumero(arredondar(v.metaCalorica, 0), 0)} kcal`}
              />
              <Linha
                rotulo="Macronutrientes"
                bloco={resultado.macros}
                texto={(v) =>
                  `P ${formatarNumero(arredondar(v.proteina.gramas, 0), 0)} g · ` +
                  `C ${formatarNumero(arredondar(v.carboidrato.gramas, 0), 0)} g · ` +
                  `G ${formatarNumero(arredondar(v.gordura.gramas, 0), 0)} g`
                }
              />
            </dl>
          </Cartao>

          <Cartao titulo="Memória de cálculo">
            <MemoriaDeCalculo memorias={resultado.memorias} />
          </Cartao>
        </div>
      </div>
    </div>
  );
}

function Linha<T>({
  rotulo,
  bloco,
  texto,
}: {
  rotulo: string;
  bloco: Bloco<T>;
  texto: (valor: T) => string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-sm text-slate-600">{rotulo}</dt>
      <dd
        className={
          bloco.valor !== null
            ? 'text-sm font-semibold text-slate-900'
            : 'max-w-[60%] text-right text-xs text-slate-500'
        }
      >
        {bloco.valor !== null ? texto(bloco.valor) : bloco.aviso}
      </dd>
    </div>
  );
}

/** Deixa visível na tela o status de verificação da RN-06. */
function EtiquetaStatus({ id, tipo }: { id: string; tipo: 'protocolo' | 'formula' }) {
  const item =
    tipo === 'protocolo'
      ? PROTOCOLOS_COMPOSICAO.find((p) => p.id === id)
      : FORMULAS_ENERGIA.find((f) => f.id === id);
  if (item === undefined) return null;

  return (
    <Etiqueta tom={podeCalcular(item.status) ? 'verde' : 'ambar'}>
      {ROTULOS_STATUS[item.status]}
    </Etiqueta>
  );
}
