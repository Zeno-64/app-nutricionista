// Gera o expo-env.d.ts se ele ainda não existir.
//
// O Expo cria esse arquivo sozinho na primeira vez que o `expo start` roda, e
// ele fica no .gitignore por ser gerado. Sem ele o `tsc` não conhece os tipos
// de import de CSS e o typecheck quebra em clone novo, antes de alguém abrir o
// app. O conteúdo é o mesmo que o CLI escreve.
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const destino = join(dirname(dirname(fileURLToPath(import.meta.url))), 'expo-env.d.ts');

if (!existsSync(destino)) {
  await writeFile(
    destino,
    '/// <reference types="expo/types" />\n\n' +
      '// NOTE: This file should not be edited and should be in your git ignore\n',
  );
  console.log('expo-env.d.ts gerado.');
}
