/**
 * Gera os ícones do app a partir de uma marca desenhada aqui em código.
 *
 * A marca é provisória: uma folha, na cor primária do app. Serve para o app
 * instalado parar de se apresentar com o logotipo do Expo, que é o que vinha
 * do template. Quando o Kevin decidir a identidade visual, troque os PNGs (ou
 * as medidas daqui) e rode de novo:
 *
 *     node apps/mobile/scripts/gerar-icones.mjs
 *
 * Desenhar em código em vez de versionar um binário opaco tem uma razão: dá
 * para reler o que a marca é, gerar em qualquer tamanho e ajustar sem editor
 * de imagem — que não existe no ambiente em nuvem onde parte deste projeto foi
 * escrita.
 *
 * Sem dependências: o PNG é escrito na mão (é só um cabeçalho e as linhas
 * comprimidas com zlib, que vem no Node).
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const IMAGENS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');

/** Cores.primaria, de src/constantes/tema.ts. */
const VERDE = [4, 120, 87, 255];
const BRANCO = [255, 255, 255, 255];
const TRANSPARENTE = [0, 0, 0, 0];

// --- PNG -------------------------------------------------------------------

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pedaco(tipo, dados) {
  const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]);
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const verificacao = Buffer.alloc(4);
  verificacao.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, verificacao]);
}

/** Codifica RGBA (8 bits por canal, sem filtro) no formato PNG. */
function codificarPng(lado, rgba) {
  const bytesPorLinha = lado * 4;
  const linhas = Buffer.alloc(lado * (bytesPorLinha + 1));
  for (let y = 0; y < lado; y += 1) {
    const destino = y * (bytesPorLinha + 1);
    linhas[destino] = 0; // filtro "none"
    Buffer.from(rgba.buffer, rgba.byteOffset + y * bytesPorLinha, bytesPorLinha).copy(
      linhas,
      destino + 1,
    );
  }

  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(lado, 0);
  cabecalho.writeUInt32BE(lado, 4);
  cabecalho[8] = 8; // bits por canal
  cabecalho[9] = 6; // cor com canal alfa

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', cabecalho),
    pedaco('IDAT', deflateSync(linhas, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

// --- A marca ---------------------------------------------------------------

// Tudo em coordenadas de 0 a 1, com a origem no canto superior esquerdo, para
// a marca poder ser desenhada em qualquer tamanho.
const BASE = { x: 0.33, y: 0.67 }; // onde a folha encontra o talo
const PONTA = { x: 0.75, y: 0.25 };
const MEIA_LARGURA = 0.145; // da folha, no ponto mais largo
const PE_DO_TALO = { x: 0.25, y: 0.79 };
const GROSSURA_DO_TALO = 0.021;
const GROSSURA_DA_NERVURA = 0.012;

/**
 * A folha é a interseção de dois círculos de mesmo raio, deslocados para os
 * lados do eixo — a lente que dá a silhueta de folha. O raio sai da meia-altura
 * e da meia-largura desejadas.
 */
const folha = (() => {
  const meioX = (BASE.x + PONTA.x) / 2;
  const meioY = (BASE.y + PONTA.y) / 2;
  const meiaAltura = Math.hypot(PONTA.x - BASE.x, PONTA.y - BASE.y) / 2;
  const raio = (meiaAltura * meiaAltura + MEIA_LARGURA * MEIA_LARGURA) / (2 * MEIA_LARGURA);

  // Perpendicular ao eixo da folha, normalizada.
  const perpX = -(PONTA.y - BASE.y) / (2 * meiaAltura);
  const perpY = (PONTA.x - BASE.x) / (2 * meiaAltura);
  const afastamento = raio - MEIA_LARGURA;

  return {
    raio,
    centros: [
      { x: meioX + perpX * afastamento, y: meioY + perpY * afastamento },
      { x: meioX - perpX * afastamento, y: meioY - perpY * afastamento },
    ],
  };
})();

function distanciaAteSegmento(x, y, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
}

/** Um ponto entre a base e a ponta, para a nervura não encostar nas bordas. */
function noEixo(fracao) {
  return {
    x: BASE.x + (PONTA.x - BASE.x) * fracao,
    y: BASE.y + (PONTA.y - BASE.y) * fracao,
  };
}

const NERVURA = [noEixo(0.06), noEixo(0.94)];

/** Verdadeiro onde a marca é desenhada. A nervura é vazada, não pintada. */
function naMarca(x, y) {
  const dentroDaFolha = folha.centros.every(
    (centro) => Math.hypot(x - centro.x, y - centro.y) <= folha.raio,
  );
  const naNervura = distanciaAteSegmento(x, y, NERVURA[0], NERVURA[1]) <= GROSSURA_DA_NERVURA;
  const noTalo = distanciaAteSegmento(x, y, BASE, PE_DO_TALO) <= GROSSURA_DO_TALO;
  return (dentroDaFolha && !naNervura) || noTalo;
}

// --- Desenho ---------------------------------------------------------------

/** Quantas amostras por lado de pixel. 4×4 já deixa a borda lisa. */
const AMOSTRAS = 4;

/**
 * O retângulo que a marca ocupa de fato, medido varrendo o desenho. Sem isto,
 * `ocupacao` diria respeito ao quadrado de coordenadas, e não à folha — que
 * não o preenche. Medido uma vez e reaproveitado.
 */
const LIMITES = (() => {
  const PASSOS = 400;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i <= PASSOS; i += 1) {
    for (let j = 0; j <= PASSOS; j += 1) {
      const x = i / PASSOS;
      const y = j / PASSOS;
      if (!naMarca(x, y)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, tamanho: Math.max(maxX - minX, maxY - minY) };
})();

/**
 * Desenha a marca em `cor` sobre `fundo`, centralizada, ocupando a fração
 * `ocupacao` do lado da imagem. O ícone adaptativo do Android recorta as
 * bordas, então lá ela precisa ocupar menos para não perder a ponta.
 */
function desenhar({ lado, fundo, cor, ocupacao }) {
  const rgba = new Uint8Array(lado * lado * 4);
  const passo = 1 / (AMOSTRAS + 1);

  // Da posição no arquivo para a posição no desenho: desfaz o enquadramento.
  const centroX = (LIMITES.minX + LIMITES.maxX) / 2;
  const centroY = (LIMITES.minY + LIMITES.maxY) / 2;
  const fator = LIMITES.tamanho / ocupacao;
  const daImagem = (posicao) => (posicao / lado - 0.5) * fator;

  for (let py = 0; py < lado; py += 1) {
    for (let px = 0; px < lado; px += 1) {
      let dentro = 0;
      for (let sy = 1; sy <= AMOSTRAS; sy += 1) {
        for (let sx = 1; sx <= AMOSTRAS; sx += 1) {
          const x = centroX + daImagem(px + sx * passo);
          const y = centroY + daImagem(py + sy * passo);
          if (naMarca(x, y)) dentro += 1;
        }
      }

      const cobertura = dentro / (AMOSTRAS * AMOSTRAS);
      const destino = (py * lado + px) * 4;
      for (let canal = 0; canal < 4; canal += 1) {
        rgba[destino + canal] = Math.round(
          fundo[canal] + (cor[canal] - fundo[canal]) * cobertura,
        );
      }
    }
  }

  return codificarPng(lado, rgba);
}

// --- O que cada arquivo precisa ser ----------------------------------------

const ARQUIVOS = [
  // Ícone principal. As lojas e os sistemas aplicam o próprio arredondamento,
  // então aqui o verde vai até a borda.
  { nome: 'icon.png', lado: 1024, fundo: VERDE, cor: BRANCO, ocupacao: 0.62 },

  // Ícone adaptativo do Android: fundo e frente em camadas separadas, que o
  // sistema recorta junto. Só os dois terços centrais sobrevivem a todos os
  // formatos de recorte, daí a marca bem menor na camada da frente.
  { nome: 'android-icon-background.png', lado: 1024, fundo: VERDE, cor: VERDE, ocupacao: 1 },
  { nome: 'android-icon-foreground.png', lado: 1024, fundo: TRANSPARENTE, cor: BRANCO, ocupacao: 0.42 },
  { nome: 'android-icon-monochrome.png', lado: 1024, fundo: TRANSPARENTE, cor: BRANCO, ocupacao: 0.42 },

  // Splash: a marca sozinha, que o Expo centraliza sobre o fundo do app.json.
  { nome: 'splash-icon.png', lado: 512, fundo: TRANSPARENTE, cor: BRANCO, ocupacao: 0.92 },

  // Aba do navegador.
  { nome: 'favicon.png', lado: 96, fundo: VERDE, cor: BRANCO, ocupacao: 0.66 },
];

for (const { nome, ...medidas } of ARQUIVOS) {
  const caminho = join(IMAGENS, nome);
  writeFileSync(caminho, desenhar(medidas));
  console.log(`gerado ${nome} (${medidas.lado}×${medidas.lado})`);
}
