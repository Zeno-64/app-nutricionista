// Acha o Playwright esteja ele instalado no projeto ou globalmente.
//
// Os dois roteiros de conferência de tela (painel e app) precisam do Chromium,
// mas o Playwright não é dependência do projeto: instalar 300 MB de navegador
// em toda máquina que só quer rodar `npm install` não se paga. Quem for
// conferir as telas instala, no projeto ou global, e este módulo acha.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export async function abrirChromium(opcoes = {}) {
  const modulo = await carregar();
  // O Playwright é CommonJS: importado por URL, vem embrulhado em `default`.
  const playwright = modulo.chromium !== undefined ? modulo : modulo.default;
  return playwright.chromium.launch(opcoes);
}

async function carregar() {
  try {
    return await import('playwright');
  } catch (falha) {
    if (falha.code !== 'ERR_MODULE_NOT_FOUND') throw falha;
  }

  const global = raizGlobal();
  if (global !== null) {
    try {
      const require = createRequire(pathToFileURL(`${global}/`));
      return await import(pathToFileURL(require.resolve('playwright')).href);
    } catch (falha) {
      if (falha.code !== 'MODULE_NOT_FOUND' && falha.code !== 'ERR_MODULE_NOT_FOUND') throw falha;
    }
  }

  throw new Error(
    'Playwright não encontrado. Instale com:\n' +
      '  npm install --no-save playwright && npx playwright install chromium',
  );
}

function raizGlobal() {
  try {
    return execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}
