// SPDX-License-Identifier: AGPL-3.0-or-later
// THE ACCESSIBILITY BAR FOLDS AWAY WHEN NOBODY IS REACHING FOR IT — and comes back when somebody is.
//
// The Dev, 2026-10-03: «O painel de acessibilidade rápida deve desaparecer se recolhendo pra cima após 5
// segundos de inatividade, exceto se o jogo estiver pausado. Ele deve aparecer novamente quando o mouse se
// dirige em sua direção ou se há um toque na tela no lugar onde ele deveria estar.»
//
// ========================= WHY THIS FILE IS HERE AND NOT IN THE ENGINE =========================
// 📌 IT BELONGS IN THE ENGINE, and that is written down rather than acted on. The engine mounts the bar, owns
// its markup and its wiring, and every game in the catalogue has the same top band covered by the same twelve
// icons — so one copy there would serve all of them and twelve copies here is the `initPauseIcons` mistake
// ADR-0148 was written to end. Writing to `the-inclusionist-engine` needs the Dev's authorisation, which this
// change does not have, so it lives here AS ONE FILE with no reach into the game: moving it is a copy.
//
// ⚠️ AND IT IS NOT A CASE OF PREFERRING OURS TO THE ENGINE'S. Measured on 2026-10-03 against 11.0.0: nothing
// in `ui/pause-icons`, `ui/top-band` or `app/css/style.css` hides or re-shows the bar on a timer. There is no
// engine behaviour here to adapt to — which is a different thing from the three controls E1 deleted, where
// there was one and nobody had re-measured.
//
// ========================= THE READING OF «INACTIVITY», SAID OUT LOUD =========================
// 🔴 IT IS INACTIVITY *WITH THE BAR*, not inactivity of the child. The two sentences settle it between them:
// the bar comes back ONLY by being approached, so if the countdown were reset by playing, a child using the
// keyboard would never see it fold and the feature would do nothing during a match — which is the one time
// the top band is worth giving back to the game. So the clock starts at boot and is restarted by pointing at
// the bar, focusing inside it, pressing it, or a resize; never by a move on the board.
//
// ========================= WHAT «PAUSED» MEANS HERE, AND WHY IT IS A GUESS WITH A REASON =========================
// ⚠️ THE ENGINE HAS NO «AM I PAUSED?» DOOR. `isNavigable` is the GAME's answer TO the engine (this one answers
// `true` always, having no phases), `setPhase` is a write, and `engine.pause` offers `show`/`hide` and no
// read. What CAN be observed is the engine's own menus being on screen — the pause card, the quick pause, the
// accessibility screen, any overlay — and that is a wider rule than the Dev asked for, deliberately:
// retracting the bar while the panel one of its icons just opened is still up would be absurd on its own.
//
// ========================= THE CONSTRAINT THE LAYOUT ALREADY PAID FOR =========================
// 🔴 A RETRACT IS A `transform`, so the bar's rectangle leaves the top of the region — and the engine's
// `reserveTopBand` measures `bar.bottom - region.top`. A measurement taken while the bar is folded publishes
// a band of almost nothing (📏 −155 px, measured with the bar outside the region in E4's mutation). Three
// things keep that from moving anything a child is reading:
//   · the canvas reserves the constant `TOP_BAND` and never reads the variable at all;
//   · the HUD's `top` is a `max()` against that same constant, so a shrinking band cannot raise it;
//   · and this module SHOWS THE BAR ON RESIZE, which is when `applyResolution` re-measures — so in practice
//     the engine never measures a folded bar.

/** What the mounter needs. Everything is injected, so the whole thing is measurable in a document a test owns. */
export interface RecolhimentoOpts {
  /** The engine's bar — `#title-icons`. */
  readonly barra: HTMLElement;
  /** `#game-region`, which is what the reveal zone is measured against. */
  readonly regiao: HTMLElement;
  readonly doc: Document;
  readonly win: Window;
  /** How long the bar stays out with nobody reaching for it. The Dev said five seconds. */
  readonly msParado?: number;
  /**
   * How far BELOW the bar's own band still counts as «the mouse heading for it», in CSS pixels.
   *
   * 📌 It exists because a cursor that has arrived is already too late: the child aims at an icon from below,
   * and a zone that started at the bar's own edge would reveal it only once the pointer was on top of where
   * it used to be. Half the bar's height is the margin, which is about the distance a pointer covers in one
   * unhurried movement.
   */
  readonly margem?: number;
  /**
   * Is one of the engine's menus on screen? Injected rather than queried, so a test can drive the «paused»
   * case without building a pause card.
   */
  readonly menuAberto?: () => boolean;
}

export interface Recolhimento {
  /** Puts the bar back and restarts the countdown — what every reveal path calls. */
  readonly mostrar: () => void;
  /** Folds it now, unless a menu is open. Exposed for the gate; the timer is the real caller. */
  readonly recolher: () => void;
  /** Is it folded right now? */
  readonly recolhida: () => boolean;
  /** Every listener and the timer, released. */
  readonly teardown: () => void;
}

/** The attribute the stylesheet reads. An attribute and not a class: it is a STATE, and it reads as one. */
export const ATRIBUTO = 'data-recolhida';

/**
 * The engine's menus, as a selector. Taken from `ui/simulation-over-the-world`'s own `ENGINE_MENUS` and cut
 * down to the ones that mean «the child is not playing»: `#title-icons` itself and `.touch` are not menus,
 * and `.rodape-da-tela` is always there.
 */
export const MENUS_DA_ENGINE = '.screen-pause, .pausa-rapida, .screen-a11y, .overlay, [data-incl-menu]';

/** Is any of them actually on screen? `hidden` is how the engine delivers a card that has not been opened. */
export function algumMenuAberto(doc: Document, win: Window): boolean {
  for (const el of doc.querySelectorAll<HTMLElement>(MENUS_DA_ENGINE)) {
    if (el.hidden) continue;
    const cs = win.getComputedStyle(el);
    if (cs.display !== 'none' && cs.visibility !== 'hidden') return true;
  }
  return false;
}

export function montarRecolhimentoDaBarra(o: RecolhimentoOpts): Recolhimento {
  const { barra, regiao, doc, win } = o;
  const msParado = o.msParado ?? 5000;
  const menuAberto = o.menuAberto ?? (() => algumMenuAberto(doc, win));

  let relogio: number | null = null;
  let morto = false;

  const recolhida = () => barra.getAttribute(ATRIBUTO) === '1';

  const cancelar = () => {
    if (relogio !== null) win.clearTimeout(relogio);
    relogio = null;
  };

  const recolher = () => {
    // ⚠️ THE MENU IS CHECKED HERE AND NOT WHEN THE CLOCK IS SET, because a card can open during the five
    //    seconds. Asking at the moment of folding is the only question that is about NOW.
    if (morto || menuAberto()) return;
    barra.setAttribute(ATRIBUTO, '1');
  };

  const mostrar = () => {
    if (morto) return;
    barra.removeAttribute(ATRIBUTO);
    cancelar();
    relogio = win.setTimeout(recolher, msParado);
  };

  /**
   * The band a pointer has to be in for the bar to count as approached: the top of the region down to the
   * bar's own bottom plus the margin, across the whole width.
   *
   * 📏 ACROSS THE WHOLE WIDTH AND NOT THE BAR'S OWN COLUMN, which matters once it is folded: the bar is
   * 242 logical pixels of a 320-wide region, so a child reaching up the left edge — where the HUD is, and
   * where a left-handed hand comes from — would pass beside the zone and nothing would happen.
   */
  const naZonaDeRevelacao = (clientY: number): boolean => {
    const r = regiao.getBoundingClientRect();
    const b = barra.getBoundingClientRect();
    // Folded, the bar's own box is above the region; the band it WOULD occupy is what the child aims at, and
    // its height is the one thing the fold does not change.
    const fundo = r.top + b.height + (o.margem ?? b.height / 2);
    return clientY >= r.top && clientY <= fundo;
  };

  // ⚠️ THE ZONE DECIDES WHETHER THE BAR IS FOLDED OR NOT, and an earlier draft of this handler let ANY
  //    pointer move inside the region restart the clock while the bar was out. That reads reasonable and it
  //    undoes the feature: a mouse resting anywhere on the board would hold the bar over the top band for the
  //    whole match, which is the state this module exists to end. One rule, both directions — the bar is out
  //    while somebody is reaching for it, and folds five seconds after they stop.
  const aoApontar = (e: Event) => {
    if (naZonaDeRevelacao((e as PointerEvent).clientY)) mostrar();
  };
  // 🔴 FOCUS REVEALS IT, AND THAT IS NOT OPTIONAL. The icons stay in the tab order while folded — removing
  //    them would take the whole bar away from a child who plays by keyboard, which is the opposite of what
  //    this bar is for — so without this a Tab would move the focus ring to something nobody can see (WCAG
  //    2.4.11). It behaves the way a skip link does: reachable, invisible, and visible the moment it matters.
  const aoFocar = () => mostrar();
  // A resize is when `applyResolution` re-measures the band; showing first means it never measures a folded bar.
  const aoRedimensionar = () => mostrar();

  regiao.addEventListener('pointermove', aoApontar);
  regiao.addEventListener('pointerdown', aoApontar);
  barra.addEventListener('focusin', aoFocar);
  barra.addEventListener('pointerenter', aoFocar);
  win.addEventListener('resize', aoRedimensionar);

  mostrar();   // the child arrives with the bar out, and the five seconds start here

  return {
    mostrar,
    recolher,
    recolhida,
    teardown: () => {
      // ⚠️ `morto` IS A SECOND LINE AND THE GATE SAYS SO. Removing it leaves every assertion green, because
      //    `cancelar()` already stops the only thing that could fire — it is an INERT mutation, not a hole in
      //    the suite. What it guards is the caller that still holds `mostrar` or `recolher` after tearing
      //    down, which no gate can reach without inventing that caller. Written here so nobody reads the
      //    surviving mutation as missing coverage. 📏 Taking `cancelar()` out instead reds the gate below.
      morto = true;
      cancelar();
      regiao.removeEventListener('pointermove', aoApontar);
      regiao.removeEventListener('pointerdown', aoApontar);
      barra.removeEventListener('focusin', aoFocar);
      barra.removeEventListener('pointerenter', aoFocar);
      win.removeEventListener('resize', aoRedimensionar);
      barra.removeAttribute(ATRIBUTO);
    },
  };
}
