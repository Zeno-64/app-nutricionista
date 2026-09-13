import type { ReactNode } from 'react';

export function Cartao({
  titulo,
  acao,
  children,
}: {
  titulo?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {titulo !== undefined && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
            {titulo}
          </h2>
          {acao}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Botao({
  children,
  tipo = 'button',
  variante = 'primario',
  disabled,
  onClick,
}: {
  children: ReactNode;
  tipo?: 'button' | 'submit';
  variante?: 'primario' | 'secundario';
  disabled?: boolean;
  onClick?: () => void;
}) {
  const estilo =
    variante === 'primario'
      ? 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-slate-300'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400';
  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${estilo}`}
    >
      {children}
    </button>
  );
}

export function Campo({
  rotulo,
  valor,
  aoMudar,
  tipo = 'text',
  unidade,
  destacado = false,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  tipo?: 'text' | 'email' | 'password' | 'date';
  unidade?: string;
  /** RF-33: medida exigida pelo protocolo escolhido. */
  destacado?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span
        className={`mb-1 block text-xs font-medium ${
          destacado ? 'text-emerald-800' : 'text-slate-600'
        }`}
      >
        {rotulo}
        {unidade !== undefined && <span className="text-slate-400"> ({unidade})</span>}
        {destacado && <span className="ml-1 text-emerald-700">•</span>}
      </span>
      <input
        type={tipo}
        value={valor}
        placeholder={placeholder}
        onChange={(evento) => aoMudar(evento.target.value)}
        inputMode={tipo === 'text' ? 'decimal' : undefined}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
          destacado
            ? 'border-emerald-400 bg-emerald-50/40 focus:ring-emerald-200'
            : 'border-slate-300 bg-white focus:ring-emerald-200'
        }`}
      />
    </label>
  );
}

export function Selecao<T extends string>({
  rotulo,
  valor,
  aoMudar,
  children,
}: {
  rotulo: string;
  valor: T;
  aoMudar: (valor: T) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{rotulo}</span>
      <select
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value as T)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
      >
        {children}
      </select>
    </label>
  );
}

export function Aviso({
  children,
  tom = 'atencao',
}: {
  children: ReactNode;
  tom?: 'atencao' | 'erro' | 'informacao';
}) {
  const estilos = {
    atencao: 'border-amber-200 bg-amber-50 text-amber-900',
    erro: 'border-red-200 bg-red-50 text-red-900',
    informacao: 'border-sky-200 bg-sky-50 text-sky-900',
  } as const;
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm ${estilos[tom]}`}>{children}</p>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{texto}</p>;
}

export function Etiqueta({ children, tom = 'neutro' }: { children: ReactNode; tom?: 'neutro' | 'verde' | 'ambar' | 'roxo' }) {
  const estilos = {
    neutro: 'bg-slate-100 text-slate-600',
    verde: 'bg-emerald-100 text-emerald-800',
    ambar: 'bg-amber-100 text-amber-800',
    roxo: 'bg-violet-100 text-violet-800',
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estilos[tom]}`}>
      {children}
    </span>
  );
}

export function AreaTexto({
  rotulo,
  valor,
  aoMudar,
  linhas = 3,
  desabilitado = false,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  linhas?: number;
  desabilitado?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{rotulo}</span>
      <textarea
        value={valor}
        rows={linhas}
        disabled={desabilitado}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

export function Erro({ children }: { children: string | undefined }) {
  if (children === undefined) return null;
  return <p className="mt-1 text-xs text-red-700">{children}</p>;
}

export function CaixaDeSelecao({
  rotulo,
  marcada,
  aoMudar,
}: {
  rotulo: string;
  marcada: boolean;
  aoMudar: (marcada: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={marcada}
        onChange={(evento) => aoMudar(evento.target.checked)}
        className="rounded border-slate-300"
      />
      {rotulo}
    </label>
  );
}
