import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { abrirChromium } from '../../../testes/navegador.mjs';

const AQUI = new URL('.', import.meta.url).pathname;
const DIR = process.env.SAIDA ?? join(AQUI, 'telas');
const PACOTE = process.env.PACOTE ?? join(AQUI, 'telas', 'dist');
const SUPABASE = 'https://demonstracao.supabase.co';

const NUTRI = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const PACIENTE = 'dddddddd-dddd-4ddd-8ddd-000000000001';
const PACIENTE2 = 'dddddddd-dddd-4ddd-8ddd-000000000002';
const TENANT = '11111111-1111-4111-8111-000000000001';
const ANAMNESE = 'ffffffff-ffff-4fff-8fff-000000000001';
const PRE = 'ffffffff-ffff-4fff-8fff-000000000002';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
  sub: NUTRI, role: 'authenticated', aud: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 3600, email: 'nutri@demo.test',
})}.assinatura-de-demonstracao`;

const usuario = {
  id: NUTRI, aud: 'authenticated', role: 'authenticated', email: 'nutri@demo.test',
  email_confirmed_at: '2026-09-13T00:00:00Z', created_at: '2026-09-13T00:00:00Z',
  updated_at: '2026-09-13T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {},
};
const sessao = {
  access_token: jwt, token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'refresh-demo', user: usuario,
};

const perfil = { id: NUTRI, tipo: 'nutricionista', nome: 'Ana Ribeiro', telefone: '(11) 98888-0001' };
const membro = { id: 'm1', tenant_id: TENANT, usuario_id: NUTRI, papel: 'proprietario', crn: 'CRN-3 12345', ativo: true };

const vazias = {
  circ_pescoco: null, circ_braco: null, circ_coxa: null, circ_panturrilha: null,
  dobra_peitoral: null, dobra_axilar_media: null, dobra_triceps: null, dobra_biceps: null,
  dobra_subescapular: null, dobra_abdominal: null, dobra_supra_iliaca: null,
  dobra_coxa: null, dobra_panturrilha_medial: null,
  densidade_corporal: null, bioimpedancia: null, tmb: null, fator_atividade: null,
  avaliacao_raiz_id: null, observacoes: null, macros: null, memoria_calculo: null,
};

const pacientes = [
  {
    id: PACIENTE, tenant_id: TENANT, usuario_id: 'cccccccc-cccc-4ccc-8ccc-000000000001',
    nome: 'Marina Costa', data_nascimento: '1992-04-18', sexo: 'feminino',
    cpf: '52998224725', email: 'paciente@demo.test', telefone: '11977770002',
    profissao: 'Analista de sistemas',
    objetivo: 'Reduzir percentual de gordura mantendo massa magra',
    observacoes: 'Treina musculação 4x por semana. Relata sono irregular.',
    grupos: ['adulto'], arquivado_em: null, convidado_em: '2026-03-01T12:00:00Z',
    origem: 'local', criado_em: '2026-02-20T12:00:00Z',
  },
  {
    id: PACIENTE2, tenant_id: TENANT, usuario_id: null, nome: 'Rafael Lima',
    data_nascimento: '1985-11-02', sexo: 'masculino', cpf: null, email: null, telefone: null,
    profissao: null, objetivo: 'Ganho de massa muscular', observacoes: null,
    grupos: ['adulto', 'atleta'], arquivado_em: null, convidado_em: null,
    origem: 'nutrio', criado_em: '2026-07-04T12:00:00Z',
  },
];

const avaliacoes = [
  {
    id: 'av3', tenant_id: TENANT, paciente_id: PACIENTE, data_avaliacao: '2026-08-20',
    status: 'finalizada', versao: 1, substituida_por_id: null, liberada_em: '2026-08-20T14:00:00Z',
    peso: 68, altura: 165, circ_cintura: 80, circ_quadril: 99, circ_abdomen: 83,
    imc: 24.98, imc_classificacao: 'Eutrofia', rcq: 0.808, rce: 0.485,
    protocolo_composicao: 'nenhum', percentual_gordura: 26.8, massa_gorda: 18.22,
    massa_livre_gordura: 49.78, formula_energia: 'get_manual', formula_resulta_em: 'get',
    gasto_energetico_total: 1900, meta_calorica: 1600, origem: 'local', ...vazias,
  },
  {
    id: 'av2', tenant_id: TENANT, paciente_id: PACIENTE, data_avaliacao: '2026-05-10',
    status: 'finalizada', versao: 1, substituida_por_id: null, liberada_em: '2026-05-10T14:00:00Z',
    peso: 70.5, altura: 165, circ_cintura: 84, circ_quadril: 101, circ_abdomen: 87,
    imc: 25.9, imc_classificacao: 'Sobrepeso', rcq: 0.832, rce: 0.509,
    protocolo_composicao: 'nenhum', percentual_gordura: 29.4, massa_gorda: 20.73,
    massa_livre_gordura: 49.77, formula_energia: 'get_manual', formula_resulta_em: 'get',
    gasto_energetico_total: 1930, meta_calorica: 1630, origem: 'local', ...vazias,
  },
  {
    id: 'av1', tenant_id: TENANT, paciente_id: PACIENTE, data_avaliacao: '2026-03-01',
    status: 'finalizada', versao: 1, substituida_por_id: null, liberada_em: '2026-03-01T14:00:00Z',
    peso: 74, altura: 165, circ_cintura: 89, circ_quadril: 104, circ_abdomen: 92,
    imc: 27.18, imc_classificacao: 'Sobrepeso', rcq: 0.856, rce: 0.539,
    protocolo_composicao: 'nenhum', percentual_gordura: 32.1, massa_gorda: 23.75,
    massa_livre_gordura: 50.25, formula_energia: 'get_manual', formula_resulta_em: 'get',
    gasto_energetico_total: 1980, meta_calorica: 1680, origem: 'local', ...vazias,
  },
];

const anamneses = [
  {
    id: PRE, tenant_id: TENANT, paciente_id: PACIENTE, tipo: 'pre_consulta',
    status: 'rascunho', versao: 1, data_registro: '2026-09-13',
    enviada_em: '2026-09-13T12:00:00Z', respondida_em: null, liberada_em: null,
    substituida_por_id: null, finalizada_em: null, origem: 'local',
  },
  {
    id: ANAMNESE, tenant_id: TENANT, paciente_id: PACIENTE, tipo: 'anamnese',
    status: 'finalizada', versao: 1, data_registro: '2026-03-01',
    enviada_em: null, respondida_em: null, liberada_em: null,
    substituida_por_id: null, finalizada_em: '2026-03-01T13:30:00Z', origem: 'local',
  },
];

const enunciados = [
  ['Observações', 'Chega motivada, já tentou dieta por conta própria antes.'],
  ['Imagina que amanhã você acordou e atingiu o resultado. O que muda? O que vai ser diferente?', 'Conseguiria voltar a usar as roupas que gosta e teria mais disposição no fim do dia.'],
  ['Outras tentativas? Sozinho ou com profissional (o que gostou ou não gostou)? Liste para mim as 3 principais situações que você acredita terem sido suas maiores dificuldades para se manter na dieta.', null],
  ['Você prefere uma abordagem mais calma, com progressão, ou você é uma pessoa que gosta de se desafiar?', null],
  ['Mudança de peso recente? Nos últimos 3 a 6 meses? Histórico de peso.', 'Ganhou cerca de 5 kg nos últimos 8 meses, depois de mudar de emprego.'],
  ['Compromissos diários? Trabalho (profissão)? Estuda? Treino? (FA) Tem pausas? Geladeira?', null],
  ['Sono: horas? Acorda? Qualidade? Nota de 0 a 10? Horas ideais?', 'Dorme por volta das 0h30 e acorda 6h30. Qualidade nota 5. Acha que precisaria de 8 horas.'],
  ['Cafeína e estimulantes?', null],
  ['Como está o seu intestino, tem ido com que frequência ao banheiro? E como está a consistência das fezes?', 'Intestino preso, vai ao banheiro dia sim, dia não.'],
  ['Ciclo menstrual: regularidade, como sente durante a TPM? Como fica a alimentação? Doces? Exercícios?', 'Ciclo regular. Na TPM aumenta muito a vontade de doce e treina menos.'],
  ['Quem cozinha na sua casa?', 'Divide o preparo com o companheiro; cozinham no fim de semana para a semana.'],
  ['Onde você almoça? Lancha? Janta? Leva comida ou come em self-service?', null],
  ['Metas (hidratação, sono, exercícios etc.)', 'Beber 2,5 L de água por dia e dormir antes das 23h30.'],
];

const respostas = enunciados.map(([enunciado, valor], i) => ({
  id: `r${i + 1}`, anamnese_id: ANAMNESE, pergunta_id: `p${i + 1}`, ordem: i + 1,
  secao_titulo: 'Anamnese', enunciado, tipo: 'texto_longo', opcoes: null, valor,
}));

const modelos = [{ id: 'mod1', nome: 'Anamnese padrão', tipo: 'anamnese', padrao: true }];

// RF-05: o consultório, que é o que vai no documento e na tela do paciente.
const consultorio = {
  id: TENANT, nome: 'Consultório Ana Ribeiro',
  contato_email: 'contato@anaribeiro.test', contato_telefone: '(11) 3333-0001',
};

/** O que o painel tentou gravar, para o roteiro conferir no fim. */
const gravacoes = [];

function corpo(url, aceitaObjeto) {
  const u = new URL(url);
  const caminho = u.pathname.replace('/rest/v1/', '');
  const id = (u.searchParams.get('id') ?? '').replace('eq.', '');
  const paciente = (u.searchParams.get('paciente_id') ?? '').replace('eq.', '');
  const tipo = (u.searchParams.get('tipo') ?? '').replace('eq.', '');

  let dados;
  switch (caminho) {
    case 'perfis': dados = [perfil]; break;
    case 'membros': dados = [membro]; break;
    case 'pacientes': dados = id ? pacientes.filter((p) => p.id === id) : pacientes; break;
    case 'avaliacoes': dados = paciente ? avaliacoes.filter((a) => a.paciente_id === paciente) : avaliacoes; break;
    case 'anamneses':
      dados = anamneses.filter((a) => (id ? a.id === id : true) && (paciente ? a.paciente_id === paciente : true) && (tipo ? a.tipo === tipo : true));
      break;
    case 'respostas_anamnese': dados = respostas; break;
    case 'modelos_formulario': dados = tipo === 'pre_consulta' ? [] : modelos; break;
    case 'tenants': dados = [consultorio]; break;
    default: dados = [];
  }
  return aceitaObjeto ? (dados[0] ?? null) : dados;
}

// --- Empacota e serve o painel, como o roteiro do app faz. Antes disto era
// preciso deixar o `npm run dev` rodando noutro terminal, e esquecer disso
// dava um `ERR_CONNECTION_REFUSED` cru, sem dizer o que faltava.
//
// As chaves entram falsas de propósito: o navegador não fala com o Supabase
// aqui — quem responde é a interceptação lá embaixo —, e assim o roteiro não
// depende de haver um `.env` na máquina.
if (process.env.PACOTE === undefined) {
  console.log('Empacotando o painel (demora um pouco na primeira vez)…');
  execFileSync('npx', ['vite', 'build', '--outDir', PACOTE, '--emptyOutDir'], {
    cwd: join(AQUI, '..'),
    stdio: ['ignore', 'ignore', 'inherit'],
    env: {
      ...process.env,
      VITE_SUPABASE_URL: SUPABASE,
      VITE_SUPABASE_ANON_KEY: 'chave-anonima-de-demonstracao',
    },
  });
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Página só: o que não for arquivo cai no index.html e o React Router resolve.
const servidor = createServer(async (req, res) => {
  const caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  let arquivo = join(PACOTE, caminho);
  let corpo = await readFile(arquivo).catch(() => null);
  if (corpo === null) {
    arquivo = join(PACOTE, 'index.html');
    corpo = await readFile(arquivo);
  }
  res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' });
  res.end(corpo);
});

await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto));
const BASE = `http://127.0.0.1:${servidor.address().port}`;
console.log(`\nPainel em ${BASE}\n`);

const navegador = await abrirChromium();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const problemas = [];
pagina.on('console', (m) => { if (m.type() === 'error') problemas.push(m.text()); });
pagina.on('pageerror', (e) => problemas.push(e.message));

await pagina.route('**/auth/v1/**', (rota) => {
  const url = rota.request().url();
  const corpoResposta = url.includes('/user') ? usuario : sessao;
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpoResposta) });
});

await pagina.route('**/rest/v1/**', (rota) => {
  const req = rota.request();
  const aceitaObjeto = (req.headers()['accept'] ?? '').includes('pgrst.object');
  if (req.method() !== 'GET') {
    const tabela = new URL(req.url()).pathname.replace('/rest/v1/', '');
    gravacoes.push({ metodo: req.method(), tabela, corpo: req.postDataJSON() });
    return rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aceitaObjeto ? {} : []) });
  }
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo(req.url(), aceitaObjeto)) });
});

async function tela(nome, caminho, preparar) {
  await pagina.goto(`${BASE}${caminho}`, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(900);
  if (preparar) await preparar();
  await pagina.screenshot({ path: `${DIR}/${nome}.png`, fullPage: true });
  const titulo = await pagina.locator('h1').first().innerText().catch(() => '—');
  console.log(`${nome.padEnd(24)} ${caminho.padEnd(46)} h1: ${titulo}`);
}

// 1. Login, antes de autenticar
await pagina.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
await pagina.waitForTimeout(500);
await pagina.getByRole('textbox', { name: 'E-mail' }).fill('nutri@demo.test');
await pagina.locator('input[type="password"]').fill('demonstracao123');
await pagina.screenshot({ path: `${DIR}/01-login.png` });
console.log('01-login                 /entrar');

// Autentica e segue
await pagina.getByRole('button', { name: 'Entrar' }).click();
await pagina.waitForTimeout(1500);

await tela('02-pacientes', '/pacientes');
await tela('03-paciente', `/pacientes/${PACIENTE}`);
await tela('04-evolucao', `/pacientes/${PACIENTE}/evolucao`);
await tela('05-anamnese', `/anamneses/${ANAMNESE}`);
await tela('06-anamnese-comparada', `/anamneses/${ANAMNESE}`, async () => {
  const botao = pagina.getByRole('button', { name: 'Comparar com a anterior' });
  if (await botao.count()) { await botao.click(); await pagina.waitForTimeout(400); }
});
await tela('07-cadastro', '/pacientes/novo');
await tela('08-nova-anamnese', `/pacientes/${PACIENTE}/anamneses/nova`);
await tela('09-nova-avaliacao', `/pacientes/${PACIENTE}/avaliacoes/nova`, async () => {
  const campo = (nome) => pagina.getByRole('textbox', { name: nome, exact: true });
  await campo('Peso (kg)').fill('68');
  await campo('Altura (cm)').fill('165');
  await campo('Cintura').fill('80');
  await campo('Quadril').fill('99');
  await pagina.getByRole('combobox', { name: 'Fórmula' }).selectOption('get_manual');
  await pagina.getByRole('textbox', { name: /^GET \(kcal\)/ }).fill('1900');
  await campo('Déficit ou superávit (kcal)').fill('-300');
  await campo('Proteína (%)').fill('30');
  await campo('Carboidrato (%)').fill('40');
  await campo('Gordura (%)').fill('30');
  await pagina.waitForTimeout(500);
});

// RF-05: os dados profissionais, que alimentam o documento e a tela do paciente
await tela('10-meus-dados', '/meus-dados', async () => {
  await pagina.getByRole('textbox', { name: 'CRN' }).fill('CRN-3 54321');
  await pagina.getByRole('textbox', { name: 'Telefone', exact: true }).fill('(11) 98888-9999');
  await pagina.getByRole('textbox', { name: 'Telefone de contato' }).fill('(11) 3333-4444');
  await pagina.waitForTimeout(200);
});

const antesDeSalvar = gravacoes.length;
await pagina.getByRole('button', { name: 'Salvar' }).click();
await pagina.waitForTimeout(1200);
const salvou = gravacoes.slice(antesDeSalvar);
const achar = (tabela) => salvou.find((g) => g.tabela.startsWith(tabela));
console.log(
  '  gravou o perfil:',
  achar('perfis')?.corpo?.telefone ?? 'NÃO',
  '| o CRN por função:',
  achar('rpc/atualizar_meu_registro')?.corpo?.p_crn ?? 'NÃO',
  '| o consultório:',
  achar('tenants')?.corpo?.contato_telefone ?? 'NÃO',
);

console.log('\nERROS NO CONSOLE:', problemas.length === 0 ? 'nenhum' : problemas.join(' ;; '));
await navegador.close();
servidor.close();
