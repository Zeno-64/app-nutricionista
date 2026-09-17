import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { HASH_TERMO, TERMO_PACIENTE, VERSAO_TERMO, textoDoTermo } from './termo';

describe('termo de consentimento', () => {
  // O hash vai junto de cada aceite registrado no banco. Se o texto mudar sem
  // que o hash e a versão mudem, o que está gravado passa a apontar para um
  // documento que não é mais aquele — e aí não é prova de nada.
  it('o hash corresponde ao texto', () => {
    const calculado = createHash('sha256').update(textoDoTermo(), 'utf8').digest('hex');
    expect(
      calculado,
      `O termo mudou. Atualize HASH_TERMO para "${calculado}" e suba a VERSAO_TERMO.`,
    ).toBe(HASH_TERMO);
  });

  it('a versão é uma data ISO, para ordenar sozinha', () => {
    expect(VERSAO_TERMO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('toda seção tem título e ao menos um parágrafo', () => {
    for (const secao of TERMO_PACIENTE) {
      expect(secao.titulo.trim()).not.toBe('');
      expect(secao.paragrafos.length).toBeGreaterThan(0);
      for (const paragrafo of secao.paragrafos) expect(paragrafo.trim()).not.toBe('');
    }
  });

  it('diz o essencial que a LGPD exige que se diga', () => {
    const texto = textoDoTermo().toLowerCase();
    // Finalidade, compartilhamento, direitos e quem responde. Não substitui
    // revisão jurídica; pega o texto esvaziado por uma edição descuidada.
    expect(texto).toContain('13.709');
    expect(texto).toContain('controlador');
    expect(texto).toContain('retirar');
    expect(texto).toContain('exportar');
  });
});
