import { describe, expect, it } from 'vitest';
import { dataComIdade, idadeEmAnos } from './idade';

const HOJE = new Date('2026-09-21T12:00:00');

describe('idadeEmAnos', () => {
  it('conta anos completos', () => {
    expect(idadeEmAnos('1992-04-18', HOJE)).toBe(34);
  });

  it('desconta um ano de quem ainda não fez aniversário', () => {
    expect(idadeEmAnos('1992-12-31', HOJE)).toBe(33);
  });

  it('no dia do aniversário a idade já virou', () => {
    expect(idadeEmAnos('1992-09-21', HOJE)).toBe(34);
  });

  it('na véspera ainda não virou', () => {
    expect(idadeEmAnos('1992-09-22', HOJE)).toBe(33);
  });

  // A data ISO pura é lida como UTC: sem a hora local, quem nasceu no dia 1º
  // seria contado como nascido no dia 31 do mês anterior, no fuso do Brasil.
  it('não escorrega um dia por causa do fuso', () => {
    expect(idadeEmAnos('2000-01-01', new Date('2026-01-01T03:00:00'))).toBe(26);
  });

  it('data inválida devolve null em vez de NaN', () => {
    expect(idadeEmAnos('')).toBeNull();
    expect(idadeEmAnos('não é data')).toBeNull();
    expect(idadeEmAnos('2026-13-45')).toBeNull();
  });

  it('aceita o carimbo de data e hora da coluna do banco', () => {
    expect(idadeEmAnos('1992-04-18T00:00:00Z', HOJE)).toBe(34);
  });

  it('data no futuro sai negativa, para o cadastro poder recusar', () => {
    expect(idadeEmAnos('2030-01-01', HOJE)).toBeLessThan(0);
  });
});

describe('dataComIdade', () => {
  it('mostra a data e a idade juntas', () => {
    expect(dataComIdade('1992-04-18', HOJE)).toBe('18/04/1992 · 34 anos');
  });

  it('sem data de nascimento não mostra nada', () => {
    expect(dataComIdade(null, HOJE)).toBeNull();
    expect(dataComIdade('', HOJE)).toBeNull();
  });

  // Era o defeito das cópias que viviam nas telas do app: a data estranha
  // escapava e a tela escrevia "NaN anos".
  it('data que não dá para interpretar sai sem idade, nunca como NaN', () => {
    const texto = dataComIdade('não é data', HOJE);
    expect(texto).not.toContain('NaN');
    expect(texto).not.toContain('anos');
  });
});
