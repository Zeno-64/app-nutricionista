import { calcularComposicao } from './composicao/calcular';
import { PROTOCOLOS_COMPOSICAO } from './composicao/protocolos';
import { SIRI } from './composicao/siri';
import { calcularGastoEnergetico } from './energia/calcular';
import { FORMULAS_ENERGIA } from './energia/formulas';
import { podeCalcular } from './tipos';

/**
 * Regra que não pode ser quebrada (CLAUDE.md, RN-06): enquanto uma fórmula não
 * for conferida na fonte primária e coberta por teste com valor de referência,
 * ela fica no catálogo mas não calcula.
 */
describe('nenhum cálculo escapa do portão de verificação', () => {
  it('só "verificada" e "nao_requer_verificacao" liberam o cálculo', () => {
    expect(podeCalcular('verificada')).toBe(true);
    expect(podeCalcular('nao_requer_verificacao')).toBe(true);
    expect(podeCalcular('parcial')).toBe(false);
    expect(podeCalcular('pendente')).toBe(false);
  });

  it('todo protocolo não liberado recusa o cálculo', () => {
    const dados = {
      sexo: 'masculino',
      idade: 30,
      peso: 80,
      altura: 178,
      dobras: {
        peitoral: 8,
        axilarMedia: 9,
        triceps: 10,
        biceps: 5,
        subescapular: 12,
        abdominal: 14,
        supraIliaca: 15,
        coxa: 11,
        panturrilhaMedial: 8,
      },
      circunferencias: { abdomen: 88 },
    } as const;

    for (const protocolo of PROTOCOLOS_COMPOSICAO) {
      if (protocolo.resultado === 'nenhum' || podeCalcular(protocolo.status)) continue;
      expect(() => calcularComposicao(protocolo.id, dados)).toThrow();
    }
  });

  it('todo protocolo de densidade depende de Siri, que ainda não foi conferida', () => {
    expect(podeCalcular(SIRI.status)).toBe(false);
    const dependem = PROTOCOLOS_COMPOSICAO.filter((p) => p.resultado === 'densidade');
    expect(dependem.length).toBeGreaterThan(0);
    for (const protocolo of dependem) {
      expect(() =>
        calcularComposicao(protocolo.id, { sexo: 'masculino', idade: 30, peso: 80, altura: 178 }),
      ).toThrow();
    }
  });

  it('toda fórmula de energia não liberada recusa o cálculo', () => {
    for (const formula of FORMULAS_ENERGIA) {
      if (podeCalcular(formula.status)) continue;
      const fator = formula.resultado === 'get' ? undefined : 1.55;
      expect(() =>
        calcularGastoEnergetico(
          formula.id,
          {
            sexo: 'masculino',
            idade: 30,
            peso: 70,
            altura: 175,
            massaLivreGordura: 56,
            nivelAtividade: 'ativo',
            idadeGestacional: 20,
            mesesPosParto: 3,
          },
          fator,
        ),
      ).toThrow();
    }
  });

  it('o que calcula hoje é só o que não tem coeficiente a conferir', () => {
    const liberados = [
      ...PROTOCOLOS_COMPOSICAO.filter((p) => podeCalcular(p.status)).map((p) => p.id),
      ...FORMULAS_ENERGIA.filter((f) => podeCalcular(f.status)).map((f) => f.id),
    ];
    expect(liberados).toEqual(['nenhum', 'bolso', 'tmb_manual', 'get_manual']);
  });
});
