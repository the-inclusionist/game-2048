// SPDX-License-Identifier: AGPL-3.0-or-later
// pt-BR — THE BASE, and the file that DEFINES the key set.
//
// ========================= THREE LANGUAGES ARE A FLOOR, NOT A TARGET =========================
// Pillar 3 of ADR-0010 asks for pt-BR, English and Spanish as a MINIMUM. Here the Spanish is neutral Latin
// American (`computadora`, `ustedes`, no `vosotros`) and the English is American — LEXICAL decisions, taken
// inside the dictionary. The BCP-47 tag stays a bare `en`/`es` on purpose: the engine lets the browser pick
// the local variant, and pinning `en-US` would impose an American accent on someone in India or Nigeria.
//
// ========================= THE BOUNDARY, APPLIED TO THIS GAME =========================
// ⚠️ MATHEMATICS IS NOT A LANGUAGE SUBJECT. There is no content here that passes through untranslated: `2 + 2`
// is language-independent, so the whole prompt translates — including "doubling", "merge" and "tile". What
// enters no key at all is the DIGIT: `8` is `8` in Portuguese, English and Spanish, and sending it through
// `t()` would create 2048 keys to translate one numeral. See `declaration.ts`, field 3.
//
// ========================= HOW THIS REACHES THE ENGINE =========================
// Through `registerDict()` (engine, `core/i18n`), at boot and before any text. Before 2026-09-05 there was no
// door: the engine's locales arrive through a glob resolved in ITS build, and a game installed as a package
// had no way to register its own keys. The chess paid that price by writing a second i18n system whole; this
// game uses the engine's.
//
// ⚠️ THE VALUES BELOW STAY IN PORTUGUESE, and that is not an exception to the English-prose rule — it is the
// rule working. This is i18n CONTENT, not prose about the code.

export const pt = {
  /* ---- identity ---- */
  'game.title': '2048 · Potência de 2',
  'game.tagline': 'Junte peças iguais e dobre até 2048.',

  /* ---- what the engine asks through the declaration (fields 3 and 5) ---- */
  'cell.empty': 'vazio',
  'hud.nome.dobras': 'dobras',

  /* ---- HUD ---- */
  'hud.score': 'Pontos',
  'hud.best': 'Maior peça',
  // ⚠️ No "best score". ADR-0037 says there is no save and the Inclusionist keeps nothing about a child; the
  // score lives for the round and dies with it. The absence is written down here so that anyone comparing
  // against the forks does not read it as an oversight.
  'hud.objective': 'Chegue à peça 2048',

  /* ---- the accessible grid (the DOM that sits over the canvas) ---- */
  'a11y.board': 'Tabuleiro de {cols} por {rows}',
  'a11y.cell': 'Linha {row}, coluna {col}: {what}',
  'a11y.cellMergeable': 'Linha {row}, coluna {col}: {what}, pode juntar',
  'a11y.instructions': 'Use as setas para empurrar o tabuleiro. Tabulação move o cursor de leitura.',

  /* ---- what is announced after a move ---- */
  'move.none': 'Nada se move para {dir}.',
  'move.merged': 'Juntou: {pairs}.',
  'move.pair': '{a} e {a} viraram {b}',
  'move.spawned': 'Apareceu {value} na linha {row}, coluna {col}.',
  'move.doubles': '{have} de {need} dobras.',

  /* ---- directions, spoken ---- */
  'dir.left': 'a esquerda',
  'dir.right': 'a direita',
  'dir.up': 'cima',
  'dir.down': 'baixo',

  /* ---- the action vocabulary the engine shows when it has to NAME a key ---- */
  // ⚠️ THESE EXIST BECAUSE `action1` MUST NEVER REACH A CHILD. The engine's `core/actions` numbers the four
  // diamond positions on purpose — "what a platformer calls jump, a quiz calls confirm" — and ADR-0074 calls
  // an abstract name in front of a person a defect in as many words. The position is the engine's; the word
  // is ours, and this is where it lives.
  //
  // They double as the touch pad's `aria-label`s (`data-i18n-aria` in `index.html`), which used to be the
  // same sentences hardcoded in Portuguese in the markup — one string in two places, and the copy in the
  // markup could not be translated at all.
  'act.up': 'Empurrar para cima',
  'act.down': 'Empurrar para baixo',
  'act.left': 'Empurrar para a esquerda',
  'act.right': 'Empurrar para a direita',
  'act.sonar': 'Onde há fusão',
  'act.sonar.hint': 'Diz onde há uma fusão possível, para que lado e a que distância.',
  'act.ler': 'Ler o tabuleiro',
  'act.ler.hint': 'Troca o que as setas fazem: empurrar as peças ou passear pelas casas para ouvir cada uma.',
  'a11y.reading.on': 'Leitura ligada: as setas passeiam pelas casas.',
  'a11y.reading.off': 'Leitura desligada: as setas voltam a empurrar as peças.',

  /* ---- this game's own toolbar, outside the 320×180 world ---- */
  // ⚠️ THEY WERE HARDCODED PORTUGUESE until 2026-09-11 — three buttons a child reading English or Spanish
  // met in a language she may not read, sitting next to a touch pad whose labels were fixed the same way in
  // part one. `#toggle-hc`'s text is also read back by `srSay`, so translating it translates the announcement.
  'tools.typography': 'Tipografia',
  'tools.contrast': 'Alto contraste',
  'tools.keys': 'Teclas',

  /* ---- end of round ---- */
  // ⚠️ No "keep playing" past 2048 and no score chasing: that is the compulsion loop ADR-0006 names, and
  // ADR-0049 says the only celebration is growth. The round has an end, and the end is sayable.
  'end.win': 'Você chegou a 2048. São onze dobras, do começo até aqui.',
  'end.stuck': 'Não há mais jogadas. A maior peça foi {value}, que são {doubles} dobras.',
  'end.again': 'Jogar outra vez',
} as const;

/** Every key of this game. The other languages are typed from it, so forgetting one is a compile error. */
export type Chave = keyof typeof pt;

/** The shape of a dictionary: exactly the same keys, not one more and not one fewer. */
export type Dicionario = Record<Chave, string>;

export default pt satisfies Dicionario;
