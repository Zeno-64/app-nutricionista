import { arredondar, type MemoriaCalculo } from '@nutri/calculos';
import { formatarNumero } from '../dados/linhaDoTempo';

/**
 * RF-38: mostra a memória de cálculo — fórmula, fonte, medidas que entraram e
 * cada resultado intermediário. É o que permite ao nutricionista conferir a
 * conta em vez de confiar na tela.
 */
export function MemoriaDeCalculo({ memorias }: { memorias: readonly MemoriaCalculo[] }) {
  if (memorias.length === 0) {
    return <p className="text-sm text-slate-500">Nada calculado ainda.</p>;
  }

  return (
    <div className="space-y-5">
      {memorias.map((memoria, indice) => (
        <article key={`${memoria.formula}-${indice}`} className="text-sm">
          <h3 className="font-medium text-slate-800">{memoria.formula}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{memoria.referencia}</p>

          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {memoria.entradas.map((entrada) => (
              <div key={entrada.rotulo} className="flex gap-1">
                <dt className="text-slate-500">{entrada.rotulo}:</dt>
                <dd className="font-medium">
                  {typeof entrada.valor === 'number'
                    ? formatarNumero(entrada.valor, casasDe(entrada.valor))
                    : entrada.valor}
                  {entrada.unidade !== undefined && ` ${entrada.unidade}`}
                </dd>
              </div>
            ))}
          </dl>

          <ol className="mt-2 space-y-1">
            {memoria.passos.map((passo) => (
              <li
                key={passo.rotulo}
                className="flex flex-wrap items-baseline gap-2 rounded bg-slate-50 px-2 py-1"
              >
                <span className="text-xs text-slate-500">{passo.rotulo}</span>
                <code className="text-xs text-slate-700">{passo.expressao}</code>
                <span className="text-xs text-slate-400">=</span>
                <span className="text-xs font-semibold text-slate-900">
                  {formatarNumero(arredondar(passo.valor, casasDe(passo.valor)), casasDe(passo.valor))}
                  {passo.unidade !== undefined && ` ${passo.unidade}`}
                </span>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}

/** Densidade corporal precisa de mais casas que peso ou kcal. */
function casasDe(valor: number): number {
  if (Math.abs(valor) >= 1000) return 0;
  if (Math.abs(valor) < 2) return 4;
  return 2;
}
