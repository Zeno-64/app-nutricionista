import {
  FORMULARIO_PACIENTE_VAZIO,
  cpfValido,
  formatarCpf,
  gruposSugeridos,
  idadeEmAnos,
  paraLinha,
  temErro,
  validarPaciente,
  type FormularioPaciente,
} from './paciente';

const HOJE = new Date('2026-09-13T12:00:00');

function formulario(ajustes: Partial<FormularioPaciente>): FormularioPaciente {
  return { ...FORMULARIO_PACIENTE_VAZIO, nome: 'Maria Silva', ...ajustes };
}

describe('CPF', () => {
  // Números montados a partir dos dígitos verificadores, não de pessoa real.
  it.each(['529.982.247-25', '52998224725', '111.444.777-35'])('aceita %s', (cpf) => {
    expect(cpfValido(cpf)).toBe(true);
  });

  it.each([
    ['529.982.247-26', 'dígito verificador errado'],
    ['111.111.111-11', 'sequência repetida'],
    ['1234567890', 'dígitos de menos'],
    ['', 'vazio'],
  ])('recusa %s (%s)', (cpf) => {
    expect(cpfValido(cpf)).toBe(false);
  });

  it('formata com pontos e traço', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
  });
});

describe('idade', () => {
  it('conta anos completos', () => {
    expect(idadeEmAnos('1990-05-10', HOJE)).toBe(36);
  });

  it('não conta o aniversário que ainda não chegou', () => {
    expect(idadeEmAnos('1990-12-25', HOJE)).toBe(35);
  });

  it('devolve null para data inválida', () => {
    expect(idadeEmAnos('não é data', HOJE)).toBeNull();
  });
});

describe('validação do cadastro (RF-10)', () => {
  it('aceita um cadastro só com nome', () => {
    expect(temErro(validarPaciente(formulario({}), HOJE))).toBe(false);
  });

  it('cobra o nome', () => {
    expect(validarPaciente(formulario({ nome: '   ' }), HOJE).nome).toContain('obrigatório');
  });

  it('recusa data de nascimento no futuro', () => {
    expect(validarPaciente(formulario({ dataNascimento: '2030-01-01' }), HOJE).dataNascimento)
      .toContain('futuro');
  });

  it('recusa idade absurda', () => {
    expect(validarPaciente(formulario({ dataNascimento: '1850-01-01' }), HOJE).dataNascimento)
      .toContain('130');
  });

  it('recusa CPF inválido, mas aceita CPF em branco', () => {
    expect(validarPaciente(formulario({ cpf: '111.111.111-11' }), HOJE).cpf).toBe('CPF inválido.');
    expect(validarPaciente(formulario({ cpf: '' }), HOJE).cpf).toBeUndefined();
  });

  it('recusa e-mail malformado', () => {
    expect(validarPaciente(formulario({ email: 'maria@' }), HOJE).email).toBe('E-mail inválido.');
  });

  it('recusa grupos que se contradizem (RF-16)', () => {
    expect(validarPaciente(formulario({ grupos: ['gestante'], sexo: 'masculino' }), HOJE).grupos)
      .toContain('Gestante');
    expect(validarPaciente(formulario({ grupos: ['adulto', 'crianca_adolescente'] }), HOJE).grupos)
      .toContain('Escolha entre');
  });
});

describe('conversão para a linha do banco', () => {
  it('manda null no lugar de texto vazio', () => {
    const linha = paraLinha(formulario({ objetivo: '   ' }), 't1');
    expect(linha.objetivo).toBeNull();
    expect(linha.email).toBeNull();
  });

  it('grava o CPF só com dígitos', () => {
    expect(paraLinha(formulario({ cpf: '529.982.247-25' }), 't1').cpf).toBe('52998224725');
  });

  it('leva o tenant e o nome sem espaço sobrando', () => {
    const linha = paraLinha(formulario({ nome: '  Maria Silva  ' }), 't1');
    expect(linha.tenant_id).toBe('t1');
    expect(linha.nome).toBe('Maria Silva');
  });
});

describe('sugestão de grupo pela idade (RF-16)', () => {
  it('sugere criança ou adolescente abaixo de 19', () => {
    expect(gruposSugeridos('2012-01-01', HOJE)).toEqual(['crianca_adolescente']);
  });

  it('sugere adulto a partir de 19', () => {
    expect(gruposSugeridos('1990-05-10', HOJE)).toEqual(['adulto']);
  });

  it('não sugere nada sem data', () => {
    expect(gruposSugeridos('', HOJE)).toEqual([]);
  });
});
