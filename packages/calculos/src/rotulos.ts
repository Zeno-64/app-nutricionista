import type { Circunferencia, DobraCutanea, Sexo, StatusVerificacao } from './tipos';

export const ROTULOS_DOBRA: Readonly<Record<DobraCutanea, string>> = {
  peitoral: 'Peitoral',
  axilarMedia: 'Axilar média',
  triceps: 'Tríceps',
  biceps: 'Bíceps',
  subescapular: 'Subescapular',
  abdominal: 'Abdominal',
  supraIliaca: 'Supra-ilíaca',
  coxa: 'Coxa',
  panturrilhaMedial: 'Panturrilha medial',
};

export const ROTULOS_CIRCUNFERENCIA: Readonly<Record<Circunferencia, string>> = {
  pescoco: 'Pescoço',
  braco: 'Braço',
  cintura: 'Cintura',
  abdomen: 'Abdômen',
  quadril: 'Quadril',
  coxa: 'Coxa',
  panturrilha: 'Panturrilha',
};

export const ROTULOS_SEXO: Readonly<Record<Sexo, string>> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
};

/** Texto curto de status, para o aviso ao lado da fórmula na interface. */
export const ROTULOS_STATUS: Readonly<Record<StatusVerificacao, string>> = {
  verificada: 'Conferida na fonte primária',
  parcial: 'Conferida só em fonte secundária — não calcula',
  pendente: 'Não conferida — não calcula',
  nao_requer_verificacao: 'Sem coeficiente a conferir',
};
