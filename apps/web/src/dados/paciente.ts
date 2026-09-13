import type { GrupoPaciente, Paciente } from './tipos';
import type { Sexo } from '@nutri/calculos';

/**
 * Cadastro de paciente (RF-10, RF-16): formulário, validação e conversão para a
 * linha do banco. É lógica pura, testada sem banco — validação de CPF e de data
 * é onde a tela erra na prática.
 */

export interface FormularioPaciente {
  nome: string;
  dataNascimento: string;
  sexo: Sexo | '';
  cpf: string;
  email: string;
  telefone: string;
  profissao: string;
  objetivo: string;
  observacoes: string;
  grupos: GrupoPaciente[];
}

export const FORMULARIO_PACIENTE_VAZIO: FormularioPaciente = {
  nome: '',
  dataNascimento: '',
  sexo: '',
  cpf: '',
  email: '',
  telefone: '',
  profissao: '',
  objetivo: '',
  observacoes: '',
  grupos: [],
};

export const ROTULOS_GRUPO: Readonly<Record<GrupoPaciente, string>> = {
  adulto: 'Adulto',
  crianca_adolescente: 'Criança ou adolescente',
  gestante: 'Gestante',
  lactante: 'Lactante',
  atleta: 'Atleta',
};

/** Erros por campo, para a tela marcar cada um no lugar certo. */
export type ErrosPaciente = Partial<Record<keyof FormularioPaciente, string>>;

export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

/** Valida CPF pelos dois dígitos verificadores. */
export function cpfValido(cpf: string): boolean {
  const digitos = apenasDigitos(cpf);
  if (digitos.length !== 11) return false;
  // Sequências repetidas passam na conta dos dígitos, mas não são CPF.
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  const verificador = (ate: number): number => {
    let soma = 0;
    for (let i = 0; i < ate; i += 1) {
      soma += Number(digitos[i]) * (ate + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return verificador(9) === Number(digitos[9]) && verificador(10) === Number(digitos[10]);
}

export function formatarCpf(cpf: string): string {
  const d = apenasDigitos(cpf).slice(0, 11);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Idade em anos completos na data de referência. */
export function idadeEmAnos(dataNascimento: string, hoje = new Date()): number | null {
  const nascimento = new Date(`${dataNascimento}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return null;

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade -= 1;
  return idade;
}

export function validarPaciente(
  formulario: FormularioPaciente,
  hoje = new Date(),
): ErrosPaciente {
  const erros: ErrosPaciente = {};

  if (formulario.nome.trim() === '') {
    erros.nome = 'O nome é obrigatório.';
  }

  if (formulario.dataNascimento !== '') {
    const idade = idadeEmAnos(formulario.dataNascimento, hoje);
    if (idade === null) {
      erros.dataNascimento = 'Data inválida.';
    } else if (idade < 0) {
      erros.dataNascimento = 'A data de nascimento está no futuro.';
    } else if (idade > 130) {
      erros.dataNascimento = 'Confira a data: a idade passou de 130 anos.';
    }
  }

  if (formulario.cpf.trim() !== '' && !cpfValido(formulario.cpf)) {
    erros.cpf = 'CPF inválido.';
  }

  if (formulario.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.email)) {
    erros.email = 'E-mail inválido.';
  }

  // RF-16: os grupos guiam a sugestão de fórmula, então não podem se contradizer.
  if (formulario.grupos.includes('gestante') && formulario.sexo === 'masculino') {
    erros.grupos = 'Gestante não combina com sexo masculino.';
  }
  if (formulario.grupos.includes('adulto') && formulario.grupos.includes('crianca_adolescente')) {
    erros.grupos = 'Escolha entre adulto e criança ou adolescente, não os dois.';
  }

  return erros;
}

export function temErro(erros: ErrosPaciente): boolean {
  return Object.keys(erros).length > 0;
}

/** Converte o formulário na linha do banco. Campo vazio vira null, não ''. */
export function paraLinha(
  formulario: FormularioPaciente,
  tenantId: string,
): Record<string, unknown> {
  const ouNulo = (texto: string): string | null => {
    const limpo = texto.trim();
    return limpo === '' ? null : limpo;
  };

  return {
    tenant_id: tenantId,
    nome: formulario.nome.trim(),
    data_nascimento: ouNulo(formulario.dataNascimento),
    sexo: formulario.sexo === '' ? null : formulario.sexo,
    cpf: formulario.cpf.trim() === '' ? null : apenasDigitos(formulario.cpf),
    email: ouNulo(formulario.email),
    telefone: formulario.telefone.trim() === '' ? null : apenasDigitos(formulario.telefone),
    profissao: ouNulo(formulario.profissao),
    objetivo: ouNulo(formulario.objetivo),
    observacoes: ouNulo(formulario.observacoes),
    grupos: formulario.grupos,
  };
}

/** Preenche o formulário a partir de um paciente já gravado. */
export function paraFormulario(paciente: Paciente): FormularioPaciente {
  return {
    nome: paciente.nome,
    dataNascimento: paciente.data_nascimento ?? '',
    sexo: paciente.sexo ?? '',
    cpf: paciente.cpf === null ? '' : formatarCpf(paciente.cpf),
    email: paciente.email ?? '',
    telefone: paciente.telefone ?? '',
    profissao: paciente.profissao ?? '',
    objetivo: paciente.objetivo ?? '',
    observacoes: paciente.observacoes ?? '',
    grupos: paciente.grupos,
  };
}

/**
 * Grupos sugeridos pela idade, para a tela propor sem decidir pelo
 * nutricionista (RF-16).
 */
export function gruposSugeridos(dataNascimento: string, hoje = new Date()): GrupoPaciente[] {
  const idade = idadeEmAnos(dataNascimento, hoje);
  if (idade === null || idade < 0) return [];
  return idade < 19 ? ['crianca_adolescente'] : ['adulto'];
}
