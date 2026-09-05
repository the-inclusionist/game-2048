// SPDX-License-Identifier: AGPL-3.0-or-later
// pt-BR — A BASE, e o arquivo que DEFINE o conjunto de chaves.
//
// ========================= AS TRÊS LÍNGUAS SÃO PISO, NÃO META =========================
// O pilar 3 do ADR-0010 pede pt-BR, inglês e espanhol como MÍNIMO. Aqui o espanhol é neutro
// latino-americano (`computadora`, `ustedes`, sem `vosotros`) e o inglês é americano — decisões de LÉXICO,
// tomadas dentro do dicionário. A etiqueta BCP-47 continua sendo `en`/`es` sem região, de propósito: a
// engine deixa o navegador escolher a variante local, e fixar `en-US` imporia sotaque americano a quem
// estivesse na Índia ou na Nigéria.
//
// ========================= A FRONTEIRA, APLICADA A ESTE JOGO =========================
// ⚠️ MATEMÁTICA NÃO É DISCIPLINA DE IDIOMA. Não há aqui nenhum conteúdo que atravesse sem traduzir: `2 + 2`
// independe de língua, então o enunciado inteiro traduz — inclusive "dobra", "junte" e "peça". O que NÃO
// entra em chave nenhuma é o ALGARISMO: `8` é `8` em português, inglês e espanhol, e mandá-lo pelo `t()`
// criaria 2048 chaves para traduzir um dígito. Ver `declaration.ts`, campo 3.
//
// ========================= COMO ISTO CHEGA À ENGINE =========================
// Por `registerDict()` (engine, `core/i18n`), no boot e antes de qualquer texto. Antes de 2026-09-05 não
// havia porta: os locales da engine entram por um glob resolvido no build DELA, e um jogo instalado como
// pacote não tinha como registrar as próprias chaves. O xadrez pagou esse preço escrevendo um segundo
// sistema de i18n inteiro; este jogo usa o da engine.

export const pt = {
  /* ---- identidade ---- */
  'game.title': '2048 · Potência de 2',
  'game.tagline': 'Junte peças iguais e dobre até 2048.',

  /* ---- o que a engine pergunta pela declaração (campos 3 e 5) ---- */
  'cell.empty': 'vazio',
  'hud.nome.dobras': 'dobras',

  /* ---- HUD ---- */
  'hud.score': 'Pontos',
  'hud.best': 'Maior peça',
  // ⚠️ Sem "recorde". O ADR-0037 diz que não existe save e que o Inclusionista não guarda nada sobre uma
  // criança; o placar vive a rodada e morre com ela. A ausência está aqui, escrita, para não ser lida como
  // esquecimento por quem comparar com os forks.
  'hud.objective': 'Chegue à peça 2048',

  /* ---- a grade acessível (o DOM que fica sobre o canvas) ---- */
  'a11y.board': 'Tabuleiro de {cols} por {rows}',
  'a11y.cell': 'Linha {row}, coluna {col}: {what}',
  'a11y.cellMergeable': 'Linha {row}, coluna {col}: {what}, pode juntar',
  'a11y.instructions': 'Use as setas para empurrar o tabuleiro. Tabulação move o cursor de leitura.',

  /* ---- o que se anuncia depois de uma jogada ---- */
  'move.none': 'Nada se move para {dir}.',
  'move.merged': 'Juntou: {pairs}.',
  'move.pair': '{a} e {a} viraram {b}',
  'move.spawned': 'Apareceu {value} na linha {row}, coluna {col}.',
  'move.doubles': '{have} de {need} dobras.',

  /* ---- direções, faladas ---- */
  'dir.left': 'a esquerda',
  'dir.right': 'a direita',
  'dir.up': 'cima',
  'dir.down': 'baixo',

  /* ---- fim de rodada ---- */
  // ⚠️ Sem "continuar jogando" depois do 2048 e sem caça à pontuação: é o laço de compulsão que o ADR-0006
  // nomeia, e o ADR-0049 diz que a única celebração é o crescimento. A rodada tem um fim, e ele é dizível.
  'end.win': 'Você chegou a 2048. São onze dobras, do começo até aqui.',
  'end.stuck': 'Não há mais jogadas. A maior peça foi {value}, que são {doubles} dobras.',
  'end.again': 'Jogar outra vez',
} as const;

/** Toda chave deste jogo. Os outros idiomas são tipados por ela, então esquecer uma é erro de compilação. */
export type Chave = keyof typeof pt;

/** A forma de um dicionário: exatamente as mesmas chaves, nem uma a mais nem uma a menos. */
export type Dicionario = Record<Chave, string>;

export default pt satisfies Dicionario;
