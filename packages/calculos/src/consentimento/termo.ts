/**
 * Termo de consentimento do paciente (RF-03, RNF-01).
 *
 * Mora aqui, e não numa tabela, por um motivo: o que o paciente aceitou é
 * prova, e código versionado pelo git é mais fácil de auditar do que uma linha
 * que alguém pode ter editado. O banco guarda **qual versão** foi aceita e o
 * hash do texto; o texto em si é este arquivo.
 *
 * Para mudar o termo: altere o texto, suba a `VERSAO_TERMO` e rode os testes —
 * eles recalculam o hash e falham dizendo o valor novo. Quem já aceitou a
 * versão anterior volta a ver a tela, porque o aceite é por versão.
 *
 * > **Ainda não passou por advogado.** O texto descreve o que o sistema faz de
 * > verdade, mas antes do primeiro paciente real ele precisa de revisão
 * > jurídica — e do prazo de guarda de prontuário do CFN, que está pendente
 * > com o Kevin e é o único ponto onde o texto foge do específico.
 */

export const VERSAO_TERMO = '2026-09-17';

/**
 * SHA-256 do texto, em hexadecimal. Conferido por teste: editar o termo sem
 * atualizar isto quebra o teste, que é justamente a intenção — o hash vai
 * junto de cada aceite, e precisa corresponder ao texto que a pessoa leu.
 */
export const HASH_TERMO = '6f3babe0c8a6a2a527cc7812b8e4f93d634cbb09c9d58f92371eef4c265cb476';

export interface SecaoTermo {
  titulo: string;
  paragrafos: readonly string[];
}

export const TERMO_PACIENTE: readonly SecaoTermo[] = [
  {
    titulo: 'O que este aplicativo guarda sobre você',
    paragrafos: [
      'Seu cadastro (nome, data de nascimento, sexo, contato, profissão e objetivo) e o seu acompanhamento nutricional: respostas de anamnese e de pré-consulta, medidas corporais, resultados de avaliação e os documentos que o seu nutricionista anexar.',
      'Dados de saúde são dados pessoais sensíveis pela Lei Geral de Proteção de Dados (Lei 13.709/2018). É por isso que este aceite existe.',
    ],
  },
  {
    titulo: 'Para que servem',
    paragrafos: [
      'Para o seu atendimento nutricional e para o acompanhamento da sua evolução ao longo do tempo. Nada mais.',
      'Seus dados não são vendidos, não são usados para publicidade e não são compartilhados com outras empresas para fins próprios delas.',
    ],
  },
  {
    titulo: 'Quem pode ver',
    paragrafos: [
      'Você e o consultório que lhe atende. O sistema separa os dados de cada consultório, e um profissional de outro consultório não alcança os seus.',
      'Todo acesso ao seu prontuário fica registrado: quem abriu, o quê e quando.',
    ],
  },
  {
    titulo: 'Onde ficam',
    paragrafos: [
      'Em servidores no Brasil, na região de São Paulo, operados pela Supabase Inc. como nossa fornecedora de infraestrutura. Os dados trafegam criptografados e ficam criptografados em repouso.',
    ],
  },
  {
    titulo: 'Seus direitos',
    paragrafos: [
      'Você pode pedir, a qualquer momento, para ver, corrigir ou exportar os seus dados, e pode retirar este consentimento. É só falar com o seu nutricionista, cujo contato está na tela do seu perfil.',
      'Retirar o consentimento interrompe o uso do aplicativo para o seu acompanhamento. Parte do que já foi registrado pode precisar ser guardada mesmo assim: prontuário tem prazo de guarda obrigatório, e nesse caso o que for possível é anonimizado.',
    ],
  },
  {
    titulo: 'Quem responde por isso',
    paragrafos: [
      'O nutricionista ou o consultório que lhe atende é o controlador dos seus dados, e é com ele que você fala sobre qualquer um dos direitos acima.',
    ],
  },
];

/** O texto exato que o hash cobre. É o que a tela mostra, na mesma ordem. */
export function textoDoTermo(): string {
  return TERMO_PACIENTE.map(
    (secao) => `${secao.titulo}\n${secao.paragrafos.join('\n')}`,
  ).join('\n\n');
}
