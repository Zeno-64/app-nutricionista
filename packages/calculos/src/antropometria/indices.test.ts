import { arredondar } from '../numeros.js';
import { calcularRce, calcularRcq } from './indices.js';

describe('relação cintura-quadril', () => {
  it('divide cintura por quadril', () => {
    expect(arredondar(calcularRcq(90, 100, 'masculino').razao, 2)).toBe(0.9);
  });

  it('usa ponto de corte 0,90 para homens', () => {
    expect(calcularRcq(89, 100, 'masculino').risco).toBe('baixo');
    expect(calcularRcq(90, 100, 'masculino').risco).toBe('substancialmente_aumentado');
  });

  it('usa ponto de corte 0,85 para mulheres', () => {
    expect(calcularRcq(84, 100, 'feminino').risco).toBe('baixo');
    expect(calcularRcq(85, 100, 'feminino').risco).toBe('substancialmente_aumentado');
  });
});

describe('relação cintura-estatura', () => {
  it('divide cintura por estatura', () => {
    expect(arredondar(calcularRce(85, 170).razao, 2)).toBe(0.5);
  });

  it.each([
    [80, 'baixo'],
    [85, 'aumentado'],
    [100, 'aumentado'],
    [102, 'substancialmente_aumentado'],
  ])('classifica cintura %s cm em 170 cm como %s', (cintura, esperado) => {
    expect(calcularRce(cintura, 170).risco).toBe(esperado);
  });
});
