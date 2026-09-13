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
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-000000000002',
    nome: 'Rafael Lima',
    objetivo: 'Ganho de massa muscular',
    arquivado_em: null,
    usuario_id: null,
    origem: 'nutrio',
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
  },
  {
    id: 'av2', data_avaliacao: '2026-05-10', versao: 1, substituida_por_id: null,
    peso: 70.5, imc: 25.9, imc_classificacao: 'Sobrepeso', percentual_gordura: 29.4,
    massa_gorda: 20.73, massa_livre_gordura: 49.77, gasto_energetico_total: 1930,
    circ_cintura: 84, circ_abdomen: 87, circ_quadril: 101, ...semMedidas,
  },
  {
    id: 'av1', data_avaliacao: '2026-03-01', versao: 1, substituida_por_id: null,
    peso: 74, imc: 27.18, imc_classificacao: 'Sobrepeso', percentual_gordura: 32.1,
    massa_gorda: 23.75, massa_livre_gordura: 50.25, gasto_energetico_total: 1980,
    circ_cintura: 89, circ_abdomen: 92, circ_quadril: 104, ...semMedidas,
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

  let dados = [];
  if (tabela === 'perfis') {
    dados = [perfis[quemEntrou]];
  } else if (tabela === 'pacientes') {
    // A RLS é do banco; aqui só imita o `ilike` da busca, que é o que a tela faz.
    const termo = (url.searchParams.get('nome') ?? '').replace(/^ilike\.%|%$/g, '').toLowerCase();
    dados = pacientes.filter((p) => p.nome.toLowerCase().includes(termo));
  } else if (tabela === 'avaliacoes') {
    dados = quemEntrou === 'paciente@demo.test' ? avaliacoes : [];
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
await pagina.getByText('Sair', { exact: true }).last().click();
await pagina.waitForTimeout(1200);

// 3. Paciente: evolução
await entrar('paciente@demo.test');
console.log('  rota após entrar como paciente:', new URL(pagina.url()).pathname);
await print('04-evolucao');
await pagina.getByText('Gordura corporal', { exact: true }).click();
await print('05-evolucao-gordura');

console.log(
  '\nErros no console:',
  problemas.length === 0 ? 'nenhum' : `\n  ${problemas.join('\n  ')}`,
);

await navegador.close();
servidor.close();
process.exit(problemas.length === 0 ? 0 : 1);
