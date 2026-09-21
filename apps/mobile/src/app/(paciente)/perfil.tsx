import { ROTULOS_GRUPO, ROTULOS_SEXO, dataComIdade } from '@nutri/calculos';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Carregando, Cartao, Texto } from '@/componentes/ui';
import { useCarregamento } from '@/comum/useCarregamento';
import { Cores, Espaco } from '@/constantes/tema';
import { carregarMeuCadastro, carregarMeuNutricionista } from '@/supabase/consultas';

/**
 * RF-60: o paciente vê o próprio cadastro e quem cuida dele.
 *
 * Só leitura. O paciente não tem política de `update` em `pacientes`, e é de
 * propósito: quem mantém o cadastro é o nutricionista. A tela diz isso em vez
 * de oferecer um campo que o banco recusaria.
 */
export default function Perfil() {
  const carregar = useCallback(async () => {
    const [cadastro, equipe] = await Promise.all([
      carregarMeuCadastro(),
      carregarMeuNutricionista(),
    ]);
    return { cadastro, equipe };
  }, []);

  const { dados, erro } = useCarregamento(carregar);

  if (erro !== null) {
    return (
      <SafeAreaView style={estilos.tela} edges={['bottom']}>
        <View style={estilos.conteudo}>
          <Aviso tom="erro">{erro}</Aviso>
        </View>
      </SafeAreaView>
    );
  }

  if (dados === null) return <Carregando />;

  const { cadastro, equipe } = dados;
  // O consultório é o mesmo em toda linha; quem varia é o profissional.
  const consultorio = equipe[0] ?? null;

  return (
    <SafeAreaView style={estilos.tela} edges={['bottom']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Text style={estilos.secao}>Meus dados</Text>
        <Cartao>
          {cadastro === null ? (
            <Texto suave>Não encontramos o seu cadastro.</Texto>
          ) : (
            <>
              <Dado rotulo="Nome" valor={cadastro.nome} />
              <Dado rotulo="Nascimento" valor={dataComIdade(cadastro.data_nascimento)} />
              <Dado
                rotulo="Sexo"
                valor={cadastro.sexo === null ? null : ROTULOS_SEXO[cadastro.sexo]}
              />
              <Dado rotulo="Telefone" valor={cadastro.telefone} />
              <Dado rotulo="E-mail" valor={cadastro.email} />
              <Dado rotulo="Profissão" valor={cadastro.profissao} />
              <Dado rotulo="Objetivo" valor={cadastro.objetivo} />
              <Dado
                rotulo="Grupos"
                valor={
                  cadastro.grupos.length === 0
                    ? null
                    : cadastro.grupos.map((grupo) => ROTULOS_GRUPO[grupo]).join(', ')
                }
              />
              <Texto suave>
                Para corrigir alguma coisa, fale com o seu nutricionista: é ele quem mantém o
                cadastro.
              </Texto>
            </>
          )}
        </Cartao>

        <Text style={estilos.secao}>
          {equipe.length > 1 ? 'Quem cuida de você' : 'Meu nutricionista'}
        </Text>
        {equipe.length === 0 ? (
          <Cartao>
            <Texto suave>Ainda não há um nutricionista ligado à sua conta.</Texto>
          </Cartao>
        ) : (
          equipe.map((profissional) => (
            <Cartao key={`${profissional.profissional_nome}-${profissional.crn ?? ''}`}>
              <Dado rotulo="Nome" valor={profissional.profissional_nome} />
              <Dado rotulo="CRN" valor={profissional.crn} />
              <Dado rotulo="Telefone" valor={profissional.profissional_telefone} />
            </Cartao>
          ))
        )}

        {consultorio !== null && (
          <>
            <Text style={estilos.secao}>Consultório</Text>
            <Cartao>
              <Dado rotulo="Nome" valor={consultorio.consultorio_nome} />
              <Dado rotulo="E-mail" valor={consultorio.consultorio_email} />
              <Dado rotulo="Telefone" valor={consultorio.consultorio_telefone} />
            </Cartao>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Um dado do cadastro. O que não foi preenchido simplesmente não aparece. */
function Dado({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (valor === null || valor.trim() === '') return null;
  return (
    <View style={estilos.dado}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: {
    padding: Espaco.medio,
    paddingBottom: Espaco.grande,
    gap: Espaco.pequeno,
  },
  secao: {
    marginTop: Espaco.pequeno,
    fontSize: 13,
    fontWeight: '600',
    color: Cores.textoSuave,
    textTransform: 'uppercase',
  },
  dado: { gap: 2 },
  rotulo: { fontSize: 12, color: Cores.textoSuave },
  valor: { fontSize: 15, color: Cores.texto },
});
