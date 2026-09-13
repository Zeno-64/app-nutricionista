import { FatorAtividadeNaoAplicavelError, FormulaIndisponivelError, MedidaFaltandoError } from '../erros.js';
import { arredondar } from '../numeros.js';
import {
  agruparPorPublico,
  buscarFormulas,
  calcularGastoEnergetico,
  formulasDisponiveis,
  formulasSugeridas,
} from './calcular.js';
import { FORMULAS_ENERGIA, obterFormulaEnergia } from './formulas.js';

describe('catálogo de fórmulas (§4.6)', () => {
  it('traz as 24 fórmulas da lista de requisitos', () => {
    expect(FORMULAS_ENERGIA).toHaveLength(24);
  });

  it('não repete identificador', () => {
    const ids = FORMULAS_ENERGIA.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('dá referência a toda fórmula', () => {
    for (const formula of FORMULAS_ENERGIA) {
      expect(formula.referencia.trim()).not.toBe('');
    }
  });

  it('agrupa por público na ordem da interface (RF-40)', () => {
    expect(agruparPorPublico().map((g) => g.publico)).toEqual([
      'adulto',
      'atleta',
      'infantil',
      'gestante',
      'lactante',
      'manual',
    ]);
  });

  it('busca ignorando acento e caixa (RF-40)', () => {
    expect(buscarFormulas('mifflin').map((f) => f.id)).toEqual(['mifflin_st_jeor_1990']);
    expect(buscarFormulas('GESTANTE').map((f) => f.id)).toEqual([
      'ms_2005_gestante',
      'eer_2023_gestante',
    ]);
    expect(buscarFormulas('infantil').length).toBe(4);
    expect(buscarFormulas('')).toHaveLength(FORMULAS_ENERGIA.length);
  });

  it('sugere as fórmulas do grupo do paciente sem esconder as outras (RF-43)', () => {
    const atleta = formulasSugeridas('atleta').map((f) => f.id);
    expect(atleta).toContain('tinsley_peso_2018');
    expect(atleta).toContain('ten_haaf_mlg_2014');
    expect(atleta).not.toContain('eer_2023_gestante');
    expect(formulasSugeridas('crianca_adolescente').map((f) => f.id)).toContain(
      'schofield_1985_infantil',
    );
  });
});

describe('EER não recebe fator de atividade (RF-41)', () => {
  it.each(FORMULAS_ENERGIA.filter((f) => f.resultado === 'get').map((f) => [f.id] as const))(
    'recusa fator de atividade em %s',
    (id) => {
      expect(() => calcularGastoEnergetico(id, { sexo: 'masculino', peso: 70 }, 1.55)).toThrow(
        FatorAtividadeNaoAplicavelError,
      );
    },
  );

  it('a recusa vale inclusive para as fórmulas já liberadas', () => {
    expect(() =>
      calcularGastoEnergetico('get_manual', { sexo: 'masculino', valorInformado: 2200 }, 1.55),
    ).toThrow(/já resulta em GET/);
  });
});

describe('portão de verificação (RN-06)', () => {
  it.each(
    FORMULAS_ENERGIA.filter((f) => f.status === 'pendente' || f.status === 'parcial').map(
      (f) => [f.id] as const,
    ),
  )('recusa o cálculo de %s', (id) => {
    const formula = obterFormulaEnergia(id);
    const fator = formula.resultado === 'get' ? undefined : 1.55;
    expect(() =>
      calcularGastoEnergetico(
        id,
        { sexo: 'masculino', idade: 30, peso: 70, altura: 175, massaLivreGordura: 56 },
        fator,
      ),
    ).toThrow(FormulaIndisponivelError);
  });

  it('libera apenas as três entradas manuais', () => {
    expect(formulasDisponiveis().map((f) => f.id)).toEqual(['bolso', 'tmb_manual', 'get_manual']);
  });
});

describe('fórmulas manuais', () => {
  it('calcula o GET de bolso por peso × kcal/kg', () => {
    const resultado = calcularGastoEnergetico('bolso', {
      sexo: 'masculino',
      peso: 70,
      kcalPorKg: 30,
    });
    expect(resultado.get).toBe(2100);
    expect(resultado.tmb).toBeNull();
    expect(resultado.fatorAtividade).toBeNull();
  });

  it('aplica o fator de atividade sobre a TMB informada', () => {
    const resultado = calcularGastoEnergetico(
      'tmb_manual',
      { sexo: 'feminino', valorInformado: 1500 },
      1.55,
    );
    expect(resultado.tmb).toBe(1500);
    expect(arredondar(resultado.get, 2)).toBe(2325);
    expect(resultado.memorias).toHaveLength(2);
  });

  it('exige fator de atividade quando a fórmula resulta em TMB (RF-41)', () => {
    expect(() =>
      calcularGastoEnergetico('tmb_manual', { sexo: 'feminino', valorInformado: 1500 }),
    ).toThrow(MedidaFaltandoError);
  });

  it('usa o GET informado como está', () => {
    expect(
      calcularGastoEnergetico('get_manual', { sexo: 'masculino', valorInformado: 2200 }).get,
    ).toBe(2200);
  });

  it('cobra o peso na fórmula de bolso', () => {
    expect(() =>
      calcularGastoEnergetico('bolso', { sexo: 'masculino', kcalPorKg: 30 }),
    ).toThrow(MedidaFaltandoError);
  });
});
