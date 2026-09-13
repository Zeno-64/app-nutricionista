import {
  FORMULARIO_VAZIO,
  calcularAoVivo,
  medidasExigidas,
  paraNumero,
} from './calculoAoVivo.js';
import type { FormularioAvaliacao } from './calculoAoVivo.js';

function formulario(ajustes: Partial<FormularioAvaliacao>): FormularioAvaliacao {
  return { ...FORMULARIO_VAZIO, ...ajustes };
}

describe('leitura de número no padrão brasileiro', () => {
  it.each([
    ['68,4', 68.4],
    ['68.4', 68.4],
    [' 70 ', 70],
  ])('lê %s como %s', (texto, esperado) => {
    expect(paraNumero(texto)).toBe(esperado);
  });

  it.each(['', '   ', 'abc'])('devolve undefined para %j', (texto) => {
    expect(paraNumero(texto)).toBeUndefined();
  });
});

describe('índices antropométricos ao vivo', () => {
  it('calcula IMC assim que peso e altura chegam', () => {
    const { imc } = calcularAoVivo(formulario({ peso: '70', altura: '175' }));
    expect(imc.valor?.faixa.chave).toBe('eutrofia');
    expect(imc.aviso).toBeNull();
  });

  it('explica o que falta enquanto o formulário está incompleto', () => {
    const { imc, rcq, rce } = calcularAoVivo(formulario({ peso: '70' }));
    expect(imc.valor).toBeNull();
    expect(imc.aviso).toBe('Informe peso e altura.');
    expect(rcq.aviso).toContain('cintura e quadril');
    expect(rce.aviso).toContain('cintura');
  });

  it('calcula as razões com as circunferências digitadas', () => {
    const resultado = calcularAoVivo(
      formulario({
        sexo: 'masculino',
        altura: '178',
        circunferencias: { cintura: '90', quadril: '100' },
      }),
    );
    expect(resultado.rcq.valor?.risco).toBe('substancialmente_aumentado');
    expect(resultado.rce.valor?.razao).toBeCloseTo(0.5056, 4);
  });
});

describe('composição corporal ao vivo', () => {
  it('avisa, sem quebrar, que o protocolo ainda não foi conferido (RN-06)', () => {
    const { composicao } = calcularAoVivo(
      formulario({
        sexo: 'masculino',
        idade: '30',
        peso: '80',
        altura: '178',
        protocolo: 'pollock3',
        dobras: { peitoral: '8', abdominal: '14', coxa: '11' },
      }),
    );
    expect(composicao.valor).toBeNull();
    expect(composicao.aviso).toContain('fonte primária');
  });

  it('mostra o status antes da falta de medida, que seria conversa inútil', () => {
    // Durnin & Womersley está "parcial": não adianta pedir as dobras se o
    // protocolo não calcula de qualquer jeito.
    const { composicao } = calcularAoVivo(
      formulario({ sexo: 'masculino', idade: '30', protocolo: 'durnin_womersley' }),
    );
    expect(composicao.aviso).toContain('não está disponível para cálculo');
    expect(composicao.aviso).toContain('parcial');
  });

  it('lista as medidas que o protocolo exige, para a tela destacar (RF-33)', () => {
    expect(medidasExigidas('durnin_womersley', 'masculino').dobras).toEqual([
      'biceps',
      'triceps',
      'subescapular',
      'supraIliaca',
    ]);
    expect(medidasExigidas('pollock3', 'feminino').dobras).toEqual([
      'triceps',
      'supraIliaca',
      'coxa',
    ]);
  });

  it('usa a bioimpedância como fonte de percentual quando não há protocolo (RF-36)', () => {
    const { composicao } = calcularAoVivo(
      formulario({ peso: '80', massaLivreGordura: '64' }),
    );
    expect(composicao.valor?.percentualGordura).toBe(20);
    expect(composicao.valor?.massaGorda).toBe(16);
  });
});

describe('gasto energético ao vivo', () => {
  it('aceita o GET informado à mão', () => {
    const { energia } = calcularAoVivo(
      formulario({ formula: 'get_manual', valorInformado: '2200' }),
    );
    expect(energia.valor?.get).toBe(2200);
    expect(energia.valor?.fatorAtividade).toBeNull();
  });

  it('aplica o fator de atividade sobre a TMB informada', () => {
    const { energia } = calcularAoVivo(
      formulario({ formula: 'tmb_manual', valorInformado: '1500', fatorAtividade: '1,55' }),
    );
    expect(energia.valor?.tmb).toBe(1500);
    expect(energia.valor?.get).toBeCloseTo(2325, 6);
  });

  it('cobra o fator de atividade quando a fórmula resulta em TMB (RF-41)', () => {
    const { energia } = calcularAoVivo(
      formulario({ formula: 'tmb_manual', valorInformado: '1500' }),
    );
    expect(energia.valor).toBeNull();
    expect(energia.aviso).toContain('Fator de atividade');
  });

  it('nunca manda fator de atividade para fórmula que já resulta em GET (RF-41)', () => {
    // Mesmo com o campo preenchido, a fórmula EER não recebe o fator.
    const { energia } = calcularAoVivo(
      formulario({ formula: 'get_manual', valorInformado: '2200', fatorAtividade: '1,55' }),
    );
    expect(energia.valor?.get).toBe(2200);
    expect(energia.valor?.fatorAtividade).toBeNull();
  });

  it('avisa que a fórmula ainda não foi conferida (RN-06)', () => {
    const { energia } = calcularAoVivo(
      formulario({
        formula: 'mifflin_st_jeor_1990',
        idade: '30',
        peso: '70',
        altura: '175',
        fatorAtividade: '1,55',
      }),
    );
    expect(energia.valor).toBeNull();
    expect(energia.aviso).toContain('fonte primária');
  });

  it('calcula a fórmula de bolso com o peso da avaliação', () => {
    const { energia } = calcularAoVivo(
      formulario({ formula: 'bolso', peso: '70', kcalPorKg: '30' }),
    );
    expect(energia.valor?.get).toBe(2100);
  });
});

describe('meta e macronutrientes ao vivo', () => {
  const base = formulario({
    peso: '70',
    altura: '175',
    formula: 'get_manual',
    valorInformado: '2500',
    ajusteTipo: 'kcal',
    ajusteValor: '-500',
  });

  it('encadeia GET, meta e macros', () => {
    const resultado = calcularAoVivo({
      ...base,
      macrosModo: 'percentual',
      proteina: '30',
      carboidrato: '40',
      gordura: '30',
    });
    expect(resultado.meta.valor?.metaCalorica).toBe(2000);
    expect(resultado.macros.valor?.proteina.gramas).toBe(150);
    expect(resultado.macros.valor?.carboidrato.gramas).toBe(200);
  });

  it('distribui por grama por quilo usando o peso da avaliação', () => {
    const resultado = calcularAoVivo({
      ...base,
      macrosModo: 'gramasPorKg',
      proteina: '2',
      gordura: '1',
    });
    expect(resultado.macros.valor?.proteina.gramas).toBe(140);
    expect(resultado.macros.valor?.carboidrato.gramas).toBe(202.5);
  });

  it('avisa quando os percentuais não fecham 100', () => {
    const resultado = calcularAoVivo({
      ...base,
      proteina: '30',
      carboidrato: '30',
      gordura: '30',
    });
    expect(resultado.macros.aviso).toContain('100%');
  });

  it('não tenta a meta sem gasto energético', () => {
    const resultado = calcularAoVivo(formulario({ ajusteValor: '-500' }));
    expect(resultado.meta.aviso).toContain('gasto energético');
  });
});

describe('memória de cálculo (RF-38)', () => {
  it('junta a memória de todos os blocos que calcularam', () => {
    const resultado = calcularAoVivo(
      formulario({
        peso: '70',
        altura: '175',
        circunferencias: { cintura: '80', quadril: '100' },
        formula: 'get_manual',
        valorInformado: '2500',
        ajusteTipo: 'percentual',
        ajusteValor: '-20',
        proteina: '30',
        carboidrato: '40',
        gordura: '30',
      }),
    );

    expect(resultado.memorias.map((m) => m.formula)).toEqual([
      'IMC = peso ÷ altura²',
      'RCQ = cintura ÷ quadril',
      'RCE = cintura ÷ estatura',
      'GET informado manualmente',
      'Meta calórica = GET ± ajuste',
      'Gramas = kcal do macronutriente ÷ kcal por grama (4 / 4 / 9)',
    ]);
    for (const memoria of resultado.memorias) {
      expect(memoria.referencia.trim()).not.toBe('');
      expect(memoria.passos.length).toBeGreaterThan(0);
    }
  });
});
