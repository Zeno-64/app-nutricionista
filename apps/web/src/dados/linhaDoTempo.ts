import type { Anamnese, Anexo, Avaliacao, ItemLinhaDoTempo } from './tipos';

/**
 * Monta a linha do tempo do paciente (RF-13): consultas, anamneses, avaliações
 * e anexos em ordem cronológica decrescente.
 *
 * Função pura de propósito — a ordenação e a rotulagem são o que erra na
 * prática, e assim dá para testar sem banco.
 */
export function montarLinhaDoTempo(
  avaliacoes: readonly Avaliacao[],
  anamneses: readonly Anamnese[],
  anexos: readonly Anexo[] = [],
): ItemLinhaDoTempo[] {
  const itens: ItemLinhaDoTempo[] = [];

  for (const avaliacao of avaliacoes) {
    // Versão substituída não aparece na linha do tempo: o histórico fica
    // guardado, mas quem manda é a versão vigente (RN-02).
    if (avaliacao.substituida_por_id !== null) continue;

    const partes: string[] = [];
    if (avaliacao.peso !== null) partes.push(`${formatarNumero(avaliacao.peso, 1)} kg`);
    if (avaliacao.imc !== null) partes.push(`IMC ${formatarNumero(avaliacao.imc, 1)}`);
    if (avaliacao.percentual_gordura !== null) {
      partes.push(`${formatarNumero(avaliacao.percentual_gordura, 1)}% de gordura`);
    }
    if (avaliacao.gasto_energetico_total !== null) {
      partes.push(`GET ${formatarNumero(avaliacao.gasto_energetico_total, 0)} kcal`);
    }

    itens.push({
      id: avaliacao.id,
      tipo: 'avaliacao',
      data: avaliacao.data_avaliacao,
      titulo: avaliacao.versao > 1 ? `Avaliação (versão ${avaliacao.versao})` : 'Avaliação',
      detalhe: partes.length > 0 ? partes.join(' · ') : null,
      status: avaliacao.status,
      origem: avaliacao.origem,
    });
  }

  for (const anamnese of anamneses) {
    itens.push({
      id: anamnese.id,
      tipo: anamnese.tipo === 'pre_consulta' ? 'pre_consulta' : 'anamnese',
      data: anamnese.data_registro,
      titulo: anamnese.tipo === 'pre_consulta' ? 'Pré-consulta' : 'Anamnese',
      detalhe:
        anamnese.tipo === 'pre_consulta' && anamnese.respondida_em === null
          ? 'Aguardando resposta do paciente'
          : null,
      status: anamnese.status,
      origem: anamnese.origem,
    });
  }

  for (const anexo of anexos) {
    itens.push({
      id: anexo.id,
      tipo: 'anexo',
      data: anexo.data_referencia ?? anexo.criado_em.slice(0, 10),
      titulo: rotuloCategoria(anexo.categoria),
      detalhe: anexo.nome_arquivo,
      status: null,
      origem: 'local',
    });
  }

  // Mais recente primeiro; empate desempata pelo título, para a ordem não
  // mudar de um carregamento para outro.
  return itens.sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    return a.titulo.localeCompare(b.titulo, 'pt-BR');
  });
}

function rotuloCategoria(categoria: string): string {
  const rotulos: Record<string, string> = {
    exame: 'Exame',
    foto_evolucao: 'Foto de evolução',
    plano_alimentar: 'Plano alimentar',
    documento_nutrio: 'Documento da Nutrio',
    outro: 'Anexo',
  };
  return rotulos[categoria] ?? 'Anexo';
}

export function formatarNumero(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}
