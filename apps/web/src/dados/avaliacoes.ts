import { obterFormulaEnergia } from '@nutri/calculos';
import type { FormularioAvaliacao, ResultadoAoVivo } from '../paginas/avaliacao/calculoAoVivo.js';
import { paraNumero } from '../paginas/avaliacao/calculoAoVivo.js';
import { exigirSupabase } from './supabase.js';

/**
 * Grava a avaliação com o cálculo já feito (RF-45) e a memória como foi
 * mostrada na tela (RF-38).
 *
 * `formula_resulta_em` vai junto de propósito: é ele que deixa o banco checar a
 * RF-41, recusando fator de atividade em fórmula que já resulta em GET.
 */
export async function salvarAvaliacao(parametros: {
  tenantId: string;
  pacienteId: string;
  dataAvaliacao: string;
  formulario: FormularioAvaliacao;
  resultado: ResultadoAoVivo;
  finalizar: boolean;
  usuarioId: string;
}): Promise<string> {
  const { formulario, resultado } = parametros;
  const formula = obterFormulaEnergia(formulario.formula);
  const usouFormula = resultado.energia.valor !== null;

  const linha = {
    tenant_id: parametros.tenantId,
    paciente_id: parametros.pacienteId,
    data_avaliacao: parametros.dataAvaliacao,
    status: parametros.finalizar ? 'finalizada' : 'rascunho',
    ...(parametros.finalizar
      ? { finalizada_em: new Date().toISOString(), finalizada_por: parametros.usuarioId }
      : {}),

    peso: paraNumero(formulario.peso) ?? null,
    altura: paraNumero(formulario.altura) ?? null,

    circ_pescoco: paraNumero(formulario.circunferencias.pescoco) ?? null,
    circ_braco: paraNumero(formulario.circunferencias.braco) ?? null,
    circ_cintura: paraNumero(formulario.circunferencias.cintura) ?? null,
    circ_abdomen: paraNumero(formulario.circunferencias.abdomen) ?? null,
    circ_quadril: paraNumero(formulario.circunferencias.quadril) ?? null,
    circ_coxa: paraNumero(formulario.circunferencias.coxa) ?? null,
    circ_panturrilha: paraNumero(formulario.circunferencias.panturrilha) ?? null,

    dobra_peitoral: paraNumero(formulario.dobras.peitoral) ?? null,
    dobra_axilar_media: paraNumero(formulario.dobras.axilarMedia) ?? null,
    dobra_triceps: paraNumero(formulario.dobras.triceps) ?? null,
    dobra_biceps: paraNumero(formulario.dobras.biceps) ?? null,
    dobra_subescapular: paraNumero(formulario.dobras.subescapular) ?? null,
    dobra_abdominal: paraNumero(formulario.dobras.abdominal) ?? null,
    dobra_supra_iliaca: paraNumero(formulario.dobras.supraIliaca) ?? null,
    dobra_coxa: paraNumero(formulario.dobras.coxa) ?? null,
    dobra_panturrilha_medial: paraNumero(formulario.dobras.panturrilhaMedial) ?? null,

    imc: resultado.imc.valor?.imc ?? null,
    imc_classificacao: resultado.imc.valor?.faixa.rotulo ?? null,
    rcq: resultado.rcq.valor?.razao ?? null,
    rce: resultado.rce.valor?.razao ?? null,

    protocolo_composicao: formulario.protocolo,
    densidade_corporal: resultado.composicao.valor?.densidadeCorporal ?? null,
    percentual_gordura: resultado.composicao.valor?.percentualGordura ?? null,
    massa_gorda: resultado.composicao.valor?.massaGorda ?? null,
    massa_livre_gordura: resultado.composicao.valor?.massaLivreGordura ?? null,

    formula_energia: usouFormula ? formula.id : null,
    formula_resulta_em: usouFormula ? formula.resultado : null,
    fator_atividade: resultado.energia.valor?.fatorAtividade ?? null,
    tmb: resultado.energia.valor?.tmb ?? null,
    gasto_energetico_total: resultado.energia.valor?.get ?? null,

    meta_calorica: resultado.meta.valor?.metaCalorica ?? null,
    macros: resultado.macros.valor
      ? {
          proteina: resultado.macros.valor.proteina,
          carboidrato: resultado.macros.valor.carboidrato,
          gordura: resultado.macros.valor.gordura,
        }
      : null,

    memoria_calculo: resultado.memorias,
    criado_por: parametros.usuarioId,
  };

  const { data, error } = await exigirSupabase()
    .from('avaliacoes')
    .insert(linha)
    .select('id')
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}
