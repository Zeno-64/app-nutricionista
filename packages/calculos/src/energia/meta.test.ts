import { ErroCalculo } from '../erros.js';
import { arredondar } from '../numeros.js';
import { calcularMacros, calcularMetaCalorica } from './meta.js';

describe('meta calórica (RF-44)', () => {
  it('aplica déficit em kcal', () => {
    expect(calcularMetaCalorica(2500, { tipo: 'kcal', valor: -500 }).metaCalorica).toBe(2000);
  });

  it('aplica superávit em kcal', () => {
    expect(calcularMetaCalorica(2500, { tipo: 'kcal', valor: 300 }).metaCalorica).toBe(2800);
  });

  it('aplica déficit percentual', () => {
    expect(calcularMetaCalorica(2500, { tipo: 'percentual', valor: -20 }).metaCalorica).toBe(2000);
  });

  it('recusa ajuste que zera a meta', () => {
    expect(() => calcularMetaCalorica(2000, { tipo: 'kcal', valor: -2000 })).toThrow(ErroCalculo);
  });
});

describe('distribuição de macronutrientes (RF-44)', () => {
  it('distribui por percentual', () => {
    const macros = calcularMacros(2000, {
      modo: 'percentual',
      proteina: 30,
      carboidrato: 40,
      gordura: 30,
    });
    expect(macros.proteina.gramas).toBe(150);
    expect(macros.carboidrato.gramas).toBe(200);
    expect(arredondar(macros.gordura.gramas, 2)).toBe(66.67);
    expect(macros.proteina.kcal).toBe(600);
  });

  it('recusa percentuais que não somam 100', () => {
    expect(() =>
      calcularMacros(2000, { modo: 'percentual', proteina: 30, carboidrato: 30, gordura: 30 }),
    ).toThrow(/somam 90/);
  });

  it('distribui por grama por quilo e sobra carboidrato', () => {
    const macros = calcularMacros(2000, { modo: 'gramasPorKg', proteina: 2, gordura: 1 }, 70);
    expect(macros.proteina.gramas).toBe(140);
    expect(macros.gordura.gramas).toBe(70);
    expect(macros.carboidrato.gramas).toBe(202.5);
    expect(arredondar(macros.proteina.percentual, 1)).toBe(28);
  });

  it('recusa quando proteína e gordura já passam da meta', () => {
    expect(() =>
      calcularMacros(1200, { modo: 'gramasPorKg', proteina: 3, gordura: 2 }, 90),
    ).toThrow(/não sobra energia/);
  });

  it('cobra o peso no modo grama por quilo', () => {
    expect(() => calcularMacros(2000, { modo: 'gramasPorKg', proteina: 2, gordura: 1 })).toThrow();
  });
});
