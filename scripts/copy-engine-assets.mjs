// SPDX-License-Identifier: AGPL-3.0-or-later
//
// AS FONTES DA ENGINE, COPIADAS PARA O `public/` DESTE JOGO.
//
// ⚠️ POR QUE ISTO EXISTE, e por que é uma cópia e não um import: `vendor/fonts.css` endereça as 36 faces por
// URL RELATIVA (`url('fonts/atkinson-400.woff2')`). Uma folha de estilo resolve URL relativa contra a própria
// posição, então o arquivo e a pasta `fonts/` viajam JUNTOS ou nenhum dos dois funciona. Importá-la pelo
// bundler faria o Vite reescrever as URLs para dentro de `assets/` com hash — o que funciona, e destrói a
// razão de o `_headers` e o service worker tratarem fonte como imutável.
//
// A engine exporta `./assets/*`, então o caminho de origem é declarado e não adivinhado (`package.json`,
// campo `exports`). Se um dia ela mudar de lugar, isto quebra ALTO no build em vez de servir 404 em silêncio.
import { cp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
// Resolve pelo `exports` do pacote, e não por `node_modules/...` à mão: o caminho é o que a engine PROMETE.
const fontsCss = require.resolve('@the-inclusionist/engine/assets/vendor/fonts.css');
const origem = dirname(fontsCss);
const destino = join(import.meta.dirname, '..', 'app', 'public', 'vendor');

await rm(destino, { recursive: true, force: true });
await mkdir(destino, { recursive: true });
await cp(origem, destino, { recursive: true });
console.log(`fontes da engine copiadas: ${origem} -> ${destino}`);
