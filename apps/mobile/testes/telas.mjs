// Conferência visual das telas do app.
//
// Empacota o app para web (`expo export --platform web`), serve o resultado e
// percorre as telas num navegador, tirando print de cada uma e reclamando de
// qualquer erro no console. As respostas do Supabase são interceptadas — o
// porquê está no README ao lado.
//
//   node apps/mobile/testes/telas.mjs
//
// Os prints saem em apps/mobile/testes/telas/, que está no .gitignore.
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { abrirChromium } from '../../../testes/navegador.mjs';

const AQUI = new URL('.', import.meta.url).pathname;
const SAIDA = process.env.SAIDA ?? join(AQUI, 'telas');
const PACOTE = process.env.PACOTE ?? join(AQUI, 'telas', 'export');
const SUPABASE = 'https://demonstracao.supabase.co';

// --- Dados de demonstração, os mesmos que estão no projeto de desenvolvimento.
const NUTRI = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const PACIENTE = 'cccccccc-cccc-4ccc-8ccc-000000000001';
const TENANT = '11111111-1111-4111-8111-000000000001';

const perfis = {
  'nutri@demo.test': { id: NUTRI, tipo: 'nutricionista', nome: 'Ana Ribeiro' },
  'paciente@demo.test': { id: PACIENTE, tipo: 'paciente', nome: 'Marina Costa' },
};

const pacientes = [
  {
    id: 'dddddddd-dddd-4ddd-8ddd-000000000001',
    nome: 'Marina Costa',
    objetivo: 'Reduzir percentual de gordura mantendo massa magra',
    arquivado_em: null,
    usuario_id: PACIENTE,
    origem: 'local',
    data_nascimento: '1992-04-18',
    sexo: 'feminino',
    telefone: '(11) 97777-0002',
    email: 'paciente@demo.test',
    profissao: 'Analista de sistemas',
    observacoes: 'Treina musculação 4x por semana. Relata sono irregular.',
    grupos: ['adulto'],
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-000000000002',
    nome: 'Rafael Lima',
    objetivo: 'Ganho de massa muscular',
    arquivado_em: null,
    usuario_id: null,
    origem: 'nutrio',
    data_nascimento: '1985-11-02',
    sexo: 'masculino',
    telefone: null,
    email: null,
    profissao: null,
    observacoes: null,
    grupos: ['adulto', 'atleta'],
  },
];

const membro = { id: 'm1', tenant_id: TENANT, papel: 'proprietario', ativo: true };

const modeloPreConsulta = { id: 'mod-pre', nome: 'Pré-consulta padrão', padrao: true };
const secoesDoModelo = [{ id: 's1', ordem: 1, titulo: 'Antes da consulta' }];

// A terceira pergunta é condicional (RF-22): só vale para paciente do sexo
// feminino. Como a demonstração é a Marina, ela tem de sair nas respostas.
const perguntasDoModelo = [
  { id: 'p1', secao_id: 's1', ordem: 1, enunciado: 'Como foi a semana?', tipo: 'texto_longo', opcoes: null, obrigatoria: false, condicao: null },
  { id: 'p2', secao_id: 's1', ordem: 2, enunciado: 'Peso de hoje', tipo: 'numero', opcoes: null, obrigatoria: false, condicao: null },
  { id: 'p3', secao_id: 's1', ordem: 3, enunciado: 'Como está o ciclo menstrual?', tipo: 'texto_longo', opcoes: null, obrigatoria: false, condicao: { campo: 'sexo', igual: 'feminino' } },
  { id: 'p4', secao_id: 's1', ordem: 4, enunciado: 'Treinou quantas vezes?', tipo: 'numero', opcoes: null, obrigatoria: false, condicao: { campo: 'grupo', igual: 'atleta' } },
];

const PRE_CONSULTA = 'ffffffff-ffff-4fff-8fff-000000000002';

// As respostas em branco que o paciente vai preencher, uma de cada tipo que a
// tela desenha diferente.
const respostasDaPreConsulta = [
  { id: 'r1', anamnese_id: PRE_CONSULTA, pergunta_id: 'p1', ordem: 1, secao_titulo: 'Antes da consulta', enunciado: 'Como foi a semana?', tipo: 'texto_longo', opcoes: null, valor: null },
  { id: 'r2', anamnese_id: PRE_CONSULTA, pergunta_id: 'p2', ordem: 2, secao_titulo: 'Antes da consulta', enunciado: 'Peso de hoje', tipo: 'numero', opcoes: null, valor: null },
  { id: 'r3', anamnese_id: PRE_CONSULTA, pergunta_id: 'p5', ordem: 3, secao_titulo: 'Antes da consulta', enunciado: 'Treinou esta semana?', tipo: 'sim_nao', opcoes: null, valor: null },
  { id: 'r4', anamnese_id: PRE_CONSULTA, pergunta_id: 'p6', ordem: 4, secao_titulo: 'Antes da consulta', enunciado: 'Qualidade do sono, de 0 a 10', tipo: 'escala_0_10', opcoes: null, valor: null },
  { id: 'r5', anamnese_id: PRE_CONSULTA, pergunta_id: 'p7', ordem: 5, secao_titulo: 'Antes da consulta', enunciado: 'Como está o intestino?', tipo: 'multipla_escolha', opcoes: ['Normal', 'Preso', 'Solto'], valor: null },
];

const anamneses = [
  {
    id: PRE_CONSULTA,
    tipo: 'pre_consulta',
    status: 'rascunho',
    data_registro: '2026-09-13',
    enviada_em: '2026-09-13T12:00:00Z',
    respondida_em: null,
    origem: 'local',
  },
  {
    id: 'ffffffff-ffff-4fff-8fff-000000000001',
    tipo: 'anamnese',
    status: 'finalizada',
    data_registro: '2026-03-01',
    respondida_em: null,
    origem: 'local',
  },
];

const semMedidas = {
  circ_pescoco: null, circ_braco: null, circ_coxa: null, circ_panturrilha: null,
  dobra_peitoral: null, dobra_axilar_media: null, dobra_triceps: null, dobra_biceps: null,
  dobra_subescapular: null, dobra_abdominal: null, dobra_supra_iliaca: null,
  dobra_coxa: null, dobra_panturrilha_medial: null,
};

const avaliacoes = [
  {
    id: 'av3', data_avaliacao: '2026-08-20', versao: 1, substituida_por_id: null,
    peso: 68, imc: 24.98, imc_classificacao: 'Eutrofia', percentual_gordura: 26.8,
    massa_gorda: 18.22, massa_livre_gordura: 49.78, gasto_energetico_total: 1900,
    circ_cintura: 80, circ_abdomen: 83, circ_quadril: 99, ...semMedidas,
    // A mais recente ainda não foi liberada: é nela que o roteiro toca.
    status: 'finalizada', origem: 'local', liberada_em: null,
  },
  {
    id: 'av2', data_avaliacao: '2026-05-10', versao: 1, substituida_por_id: null,
    peso: 70.5, imc: 25.9, imc_classificacao: 'Sobrepeso', percentual_gordura: 29.4,
    massa_gorda: 20.73, massa_livre_gordura: 49.77, gasto_energetico_total: 1930,
    circ_cintura: 84, circ_abdomen: 87, circ_quadril: 101, ...semMedidas,
    status: 'finalizada', origem: 'local', liberada_em: '2026-05-10T14:00:00Z',
  },
  {
    id: 'av1', data_avaliacao: '2026-03-01', versao: 1, substituida_por_id: null,
    peso: 74, imc: 27.18, imc_classificacao: 'Sobrepeso', percentual_gordura: 32.1,
    massa_gorda: 23.75, massa_livre_gordura: 50.25, gasto_energetico_total: 1980,
    circ_cintura: 89, circ_abdomen: 92, circ_quadril: 104, ...semMedidas,
    status: 'finalizada', origem: 'local', liberada_em: '2026-03-01T14:00:00Z',
  },
];

// --- Empacota o app para web.
if (process.env.PACOTE === undefined) {
  console.log('Empacotando o app para web (demora um pouco na primeira vez)…');
  execFileSync(
    'npx',
    ['expo', 'export', '--platform', 'web', '--clear', '--output-dir', PACOTE],
    {
      cwd: join(AQUI, '..'),
      stdio: ['ignore', 'ignore', 'inherit'],
      env: {
        ...process.env,
        EXPO_PUBLIC_SUPABASE_URL: SUPABASE,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'chave-anonima-de-demonstracao',
      },
    },
  );
}

// --- Serve o pacote. É uma página só (web.output = "single"), então tudo que
// não for arquivo cai no index.html e o expo-router resolve a rota.
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

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

// --- Navegador, no tamanho de um celular.
mkdirSync(SAIDA, { recursive: true });
const navegador = await abrirChromium();
const pagina = await navegador.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const problemas = [];
pagina.on('console', (m) => {
  if (m.type() === 'error') problemas.push(m.text());
});
pagina.on('pageerror', (e) => problemas.push(e.message));

let quemEntrou = null;
const gravacoes = [];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function sessaoDe(email) {
  const perfil = perfis[email];
  const agora = Math.floor(Date.now() / 1000);
  const usuario = {
    id: perfil.id, aud: 'authenticated', role: 'authenticated', email,
    email_confirmed_at: '2026-09-13T00:00:00Z', created_at: '2026-09-13T00:00:00Z',
    updated_at: '2026-09-13T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {},
  };
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
    sub: perfil.id, role: 'authenticated', aud: 'authenticated', exp: agora + 3600, email,
  })}.assinatura-de-demonstracao`;
  return {
    access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: agora + 3600,
    refresh_token: 'refresh-demo', user: usuario,
  };
}

await pagina.route(`${SUPABASE}/**`, (rota) => {
  const req = rota.request();
  const url = new URL(req.url());
  const json = (dados, status = 200) =>
    rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(dados) });

  if (url.pathname.startsWith('/auth/v1/')) {
    if (url.pathname.endsWith('/logout')) {
      quemEntrou = null;
      return rota.fulfill({ status: 204, body: '' });
    }
    if (url.pathname.endsWith('/token')) {
      const email = req.postDataJSON()?.email;
      if (perfis[email] === undefined) {
        return json({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400);
      }
      quemEntrou = email;
      return json(sessaoDe(email));
    }
    if (url.pathname.endsWith('/user')) return json(sessaoDe(quemEntrou).user);
    return json({});
  }

  const tabela = url.pathname.replace('/rest/v1/', '');
  const objeto = (req.headers()['accept'] ?? '').includes('pgrst.object');

  if (tabela.startsWith('rpc/')) {
    gravacoes.push({ metodo: 'RPC', tabela, corpo: req.postDataJSON() });
    return json(null);
  }

  // Guarda o que o app tentou escrever, para o roteiro conferir no fim. Só
  // depois da autenticação: o login também é um POST.
  if (req.method() === 'PATCH' || req.method() === 'POST') {
    gravacoes.push({ metodo: req.method(), tabela, corpo: req.postDataJSON() });
    return json(objeto ? { id: 'nova-pre-consulta' } : []);
  }

  let dados = [];
  if (tabela === 'perfis') {
    dados = [perfis[quemEntrou]];
  } else if (tabela === 'pacientes') {
    const porId = url.searchParams.get('id');
    if (porId !== null) {
      dados = pacientes.filter((p) => p.id === porId.replace(/^eq\./, ''));
    } else {
      // A RLS é do banco; aqui só imita o `ilike` da busca, que é o que a tela faz.
      const termo = (url.searchParams.get('nome') ?? '').replace(/^ilike\.%|%$/g, '').toLowerCase();
      dados = pacientes.filter((p) => p.nome.toLowerCase().includes(termo));
    }
  } else if (tabela === 'avaliacoes') {
    dados = avaliacoes;
  } else if (tabela === 'anamneses') {
    // Honra os `eq` da consulta: sem isso a lista de pendências do paciente
    // receberia também a anamnese finalizada, e o roteiro veria duas.
    dados = anamneses.filter((a) =>
      ['id', 'tipo', 'status'].every((coluna) => {
        const filtro = url.searchParams.get(coluna);
        return filtro === null || a[coluna] === filtro.replace(/^eq\./, '');
      }),
    );
  } else if (tabela === 'respostas_anamnese') {
    dados = respostasDaPreConsulta;
  } else if (tabela === 'membros') {
    dados = quemEntrou === 'nutri@demo.test' ? [membro] : [];
  } else if (tabela === 'modelos_formulario') {
    dados = [modeloPreConsulta];
  } else if (tabela === 'secoes_modelo') {
    dados = secoesDoModelo;
  } else if (tabela === 'perguntas_modelo') {
    dados = perguntasDoModelo;
  }

  return json(objeto ? (dados[0] ?? null) : dados);
});

async function print(nome) {
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: join(SAIDA, `${nome}.png`) });
  console.log(`  ${nome}.png`);
}

// O react-native-web não liga <label> ao campo nem gera placeholder, então
// aqui os campos são escolhidos pela posição e pelo tipo, não pelo rótulo.
async function entrar(email) {
  await pagina.locator('input:not([type="password"])').first().fill(email);
  await pagina.locator('input[type="password"]').fill('demonstracao123');
  await pagina.getByText('Entrar', { exact: true }).last().click();
  await pagina.waitForTimeout(1500);
}

console.log(`\nApp em ${BASE}\n`);

// 1. Login
await pagina.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
await print('01-entrar');

// 2. Nutricionista: lista de pacientes e busca
await entrar('nutri@demo.test');
console.log('  rota após entrar como nutricionista:', new URL(pagina.url()).pathname);
await print('02-pacientes');
await pagina.locator('input').first().fill('rafa');
await print('03-pacientes-busca');
await pagina.locator('input').first().fill('');
await pagina.waitForTimeout(600);

// 3. Ficha e linha do tempo, abertas pela lista (RF-55, RF-13)
await pagina.getByText('Marina Costa', { exact: true }).click();
await pagina.waitForTimeout(1300);
console.log('  rota da ficha:', new URL(pagina.url()).pathname);
await print('04-ficha-paciente');

// 3b. RN-03: liberar a avaliação mais recente para o paciente
await pagina.getByText('Liberar para o paciente', { exact: true }).first().click();
await pagina.waitForTimeout(400);
await print('05-confirmar-liberacao');
await pagina.getByText('Liberar', { exact: true }).click();
await pagina.waitForTimeout(900);

const liberou = gravacoes.find((g) => g.tabela === 'avaliacoes' && g.metodo === 'PATCH');
console.log(
  '  liberou avaliação:',
  liberou === undefined ? 'NÃO' : `sim, liberada_em=${liberou.corpo.liberada_em !== null}`,
);

// 3c. RF-57: enviar a pré-consulta, com as perguntas filtradas por RF-22
await pagina.getByText('Enviar pré-consulta', { exact: true }).click();
await pagina.waitForTimeout(400);
await print('06-confirmar-pre-consulta');
await pagina.getByText('Enviar', { exact: true }).click();
await pagina.waitForTimeout(1200);

const criou = gravacoes.find((g) => g.tabela === 'anamneses' && g.metodo === 'POST');
const respostasGravadas = gravacoes.find((g) => g.tabela === 'respostas_anamnese');
console.log('  criou pré-consulta:', criou === undefined ? 'NÃO' : `sim, tipo=${criou.corpo.tipo}, enviada=${criou.corpo.enviada_em !== null}`);
console.log(
  '  perguntas copiadas:',
  respostasGravadas === undefined
    ? 'NENHUMA'
    : respostasGravadas.corpo.map((r) => r.enunciado).join(' | '),
);

await pagina.goBack();
await pagina.waitForTimeout(1000);
console.log('  voltou para:', new URL(pagina.url()).pathname);

await pagina.getByText('Sair', { exact: true }).last().click();
await pagina.waitForTimeout(1200);

// 4. Paciente: evolução
await entrar('paciente@demo.test');
console.log('  rota após entrar como paciente:', new URL(pagina.url()).pathname);
await print('07-evolucao');
await pagina.getByText('Gordura corporal', { exact: true }).click();
await print('08-evolucao-gordura');

// 5. RF-61: o paciente responde a pré-consulta
await pagina.getByText('Pré-consulta para responder', { exact: true }).click();
await pagina.waitForTimeout(1300);
console.log('  rota da pré-consulta:', new URL(pagina.url()).pathname);

const antesDeResponder = gravacoes.length;
await pagina.locator('textarea').first().fill('Semana corrida, mas consegui treinar.');
await pagina.locator('input').first().fill('67,8');
await pagina.locator('input').first().blur();
await pagina.waitForTimeout(400);
await pagina.getByText('Sim', { exact: true }).click();
await pagina.getByText('7', { exact: true }).click();
await pagina.getByText('Preso', { exact: true }).click();
await pagina.waitForTimeout(600);
await print('09-pre-consulta');

const gravadas = gravacoes
  .slice(antesDeResponder)
  .filter((g) => g.tabela === 'respostas_anamnese');
console.log('  respostas gravadas:', gravadas.map((g) => JSON.stringify(g.corpo.valor)).join(', '));

await pagina.getByText('Enviar respostas', { exact: true }).click();
await pagina.waitForTimeout(400);
await print('10-confirmar-envio');
await pagina.getByText('Enviar', { exact: true }).click();
await pagina.waitForTimeout(1200);

const finalizou = gravacoes.find((g) => g.tabela === 'rpc/finalizar_pre_consulta');
console.log('  finalizou pela função do banco:', finalizou === undefined ? 'NÃO' : 'sim');

console.log(
  '\nErros no console:',
  problemas.length === 0 ? 'nenhum' : `\n  ${problemas.join('\n  ')}`,
);

await navegador.close();
servidor.close();
process.exit(problemas.length === 0 ? 0 : 1);
