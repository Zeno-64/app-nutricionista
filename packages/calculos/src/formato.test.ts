import { describe, expect, it } from 'vitest';
import { comSinal, comUnidade, formatarData, formatarNumero } from './formato';

describe('formatarNumero', () => {
  it('usa vírgula decimal e ponto de milhar', () => {
    expect(formatarNumero(1234.5, 1)).toBe('1.234,5');
  });

  it('fixa as casas decimais pedidas, para a coluna não dançar', () => {
    expect(formatarNumero(72, 1)).toBe('72,0');
    expect(formatarNumero(2100, 0)).toBe('2.100');
  });
});

describe('formatarData', () => {
  it('escreve a data ISO no padrão brasileiro', () => {
    expect(formatarData('2026-03-01')).toBe('01/03/2026');
  });

  it('aceita o carimbo de data e hora e ignora a hora', () => {
    expect(formatarData('2026-03-01T13:45:00Z')).toBe('01/03/2026');
  });
});

describe('comUnidade', () => {
  it('junta o número e a unidade', () => {
    expect(comUnidade(72.35, 1, 'kg')).toBe('72,4 kg');
  });

  it('sem unidade sai só o número — é o caso do IMC', () => {
    expect(comUnidade(24.499, 1, '')).toBe('24,5');
  });

  it('arredonda antes de formatar, inclusive no caso que o binário erra', () => {
    expect(comUnidade(1.005, 2, '')).toBe('1,01');
  });
});

describe('comSinal', () => {
  it('marca o ganho com mais', () => {
    expect(comSinal(2.4, 1, 'kg')).toBe('+2,4 kg');
  });

  it('marca a perda com o sinal de menos tipográfico, não com hífen', () => {
    expect(comSinal(-2.4, 1, 'kg')).toBe('−2,4 kg');
    expect(comSinal(-2.4, 1, 'kg')).not.toContain('-');
  });

  it('não põe sinal quando não houve mudança', () => {
    expect(comSinal(0, 1, 'kg')).toBe('0,0 kg');
  });

  it('uma variação que arredonda para zero também sai sem sinal', () => {
    expect(comSinal(-0.04, 1, 'kg')).toBe('0,0 kg');
  });
});
