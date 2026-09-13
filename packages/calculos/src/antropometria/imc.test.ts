import { MedidaInvalidaError } from '../erros';
import { arredondar } from '../numeros';
import { FAIXAS_IMC_OMS, calcularImc, classificarImc } from './imc';

describe('IMC', () => {
  it('calcula peso ÷ altura² com a altura em centímetros', () => {
    const { imc } = calcularImc(70, 175);
    expect(arredondar(imc, 2)).toBe(22.86);
  });

  it('classifica como eutrofia um adulto de 70 kg e 1,75 m', () => {
    expect(calcularImc(70, 175).faixa.chave).toBe('eutrofia');
  });

  it.each([
    [15.9, 'magreza_grave'],
    [16, 'magreza_moderada'],
    [16.99, 'magreza_moderada'],
    [17, 'magreza_leve'],
    [18.49, 'magreza_leve'],
    [18.5, 'eutrofia'],
    [24.99, 'eutrofia'],
    [25, 'sobrepeso'],
    [29.99, 'sobrepeso'],
    [30, 'obesidade_grau_1'],
    [35, 'obesidade_grau_2'],
    [40, 'obesidade_grau_3'],
    [55, 'obesidade_grau_3'],
  ])('classifica IMC %s como %s', (imc, esperado) => {
    expect(classificarImc(imc).chave).toBe(esperado);
  });

  it('cobre a reta sem buraco entre as faixas', () => {
    for (let i = 1; i < FAIXAS_IMC_OMS.length; i += 1) {
      expect(FAIXAS_IMC_OMS[i]!.min).toBe(FAIXAS_IMC_OMS[i - 1]!.max);
    }
  });

  it('recusa medida zerada ou negativa', () => {
    expect(() => calcularImc(0, 175)).toThrow(MedidaInvalidaError);
    expect(() => calcularImc(70, -175)).toThrow(MedidaInvalidaError);
  });

  it('devolve memória de cálculo com fonte e passos (RF-38)', () => {
    const { memoria } = calcularImc(70, 175);
    expect(memoria.referencia).toContain('OMS');
    expect(memoria.entradas).toHaveLength(2);
    expect(memoria.passos.map((p) => p.rotulo)).toEqual(['Altura em metros', 'IMC']);
  });
});
