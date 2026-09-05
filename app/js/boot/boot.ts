// SPDX-License-Identifier: AGPL-3.0-or-later
// A ENTRADA DO NAVEGADOR — e ela existe separada do `main.ts` por um motivo mecânico, não organizacional.
//
// `main.ts` é importado pelos testes do project `node`, que não têm bundler para uma folha de estilo: um
// `import '...css'` lá dentro quebraria a suíte de lógica inteira. Então a CSS e os painéis emprestados
// entram AQUI, na única metade que só existe no navegador.
import '@the-inclusionist/engine/style.css';

import { srSay } from '@the-inclusionist/engine/core/a11y-sr.js';
import { t } from '@the-inclusionist/engine/core/i18n.js';
import * as store from '@the-inclusionist/engine/platform/storage.js';
import { VIZ_DOM_ONLY, VIZ_FILTER, simulatesDisability } from '@the-inclusionist/engine/render/viz-modes.js';
import { initSettingsTypo } from '@the-inclusionist/engine/ui/settings-typo.js';
import { padPxPerMm } from '@the-inclusionist/engine/input/touch.js';

import { bootar } from './main.ts';

const $ = <T extends Element = Element>(sel: string): T | null => document.querySelector<T>(sel);

const motor = bootar();
if (motor) {
  // TIPOGRAFIA — emprestada inteira. O quiz mediu que este painel serve fora do gênero sem uma linha de
  // mudança, e é a evidência mais forte de que a pilha de menus é da engine e não do jogo de plataforma.
  const typo = initSettingsTypo({ $, srSay, store, root: document.documentElement });
  $('#open-typo')?.addEventListener('click', () => {
    const ov = $<HTMLElement>('#typo');
    if (!ov) return;
    typo.render();
    ov.hidden = false;
    motor.overlays.frontOverlay(ov);
    ov.querySelector<HTMLElement>('button[data-font]:not([disabled])')?.focus();
  });
  const fechar = () => { const ov = $<HTMLElement>('#typo'); if (ov) ov.hidden = true; };
  $('#typo-close')?.addEventListener('click', fechar);
  motor.overlays.register('typo', { close: fechar, inEscapeChain: true });

  // ALTO CONTRASTE POR PAPEL. É deste jogo, e não da engine — o achado 8 do quiz: os modos `hcnew` dela
  // repintam texturas de tile da plataforma, e este jogo não tem os tiles dela. O que viaja é a IDEIA
  // (pintar pelo campo 2 do contrato), e ela mora em `render/palette`.
  const hc = $<HTMLButtonElement>('#toggle-hc');
  hc?.addEventListener('click', () => {
    const ligado = document.documentElement.dataset.hc === '1';
    document.documentElement.dataset.hc = ligado ? '0' : '1';
    hc.setAttribute('aria-pressed', String(!ligado));
    motor.cenas.draw();
    srSay(hc.textContent ?? '');
  });

  // DALTONISMO: o seletor é deste jogo; os seis filtros já foram montados pelo `createGame`. `VIZ_DOM_ONLY`
  // é a resposta DECLARADA da engine para "o que funciona sem canvas" — antes cada consumidor a recalculava
  // misturando duas perguntas diferentes.
  const seletor = $<HTMLSelectElement>('#viz');
  const alvo = $<HTMLElement>('#game-region');
  if (seletor && alvo && motor.cvdFilters > 0) {
    const opcoes = VIZ_DOM_ONLY.filter((m) => !simulatesDisability(m.key));
    // ⚠️ POR `new Option`, e não por `innerHTML` com um template. O texto aqui é NOSSO — vem de `VIZ_DOM_ONLY`
    // e do dicionário —, então não há injeção a temer hoje; mas o dia em que uma dessas fontes passar a
    // aceitar texto de fora, o defeito nasce pronto e invisível. Construir o nó custa o mesmo e fecha a
    // classe inteira. (O `consumer-quiz` da engine ainda usa o template: é o mesmo conserto, do lado dela.)
    seletor.replaceChildren(...opcoes.map((m) => new Option(t(m.nome), m.key)));
    seletor.addEventListener('change', () => {
      alvo.style.filter = VIZ_FILTER[seletor.value] || '';
      srSay(seletor.options[seletor.selectedIndex]?.text ?? '');
    });
  }

  // TOQUE: a metade PURA de `input/touch`. `padPxPerMm` ancora o milímetro real no aparelho (WCAG 2.5.5), e
  // os quatro botões passam a ter 11 mm MEDIDOS em vez de um palpite em pixels. O `initTouch` inteiro fica
  // de fora de propósito: o pad dele é uma cruz de plataforma com doze ids fixos que este jogo não quer.
  const pxmm = padPxPerMm(matchMedia('(pointer: coarse)').matches, window.innerWidth, window.innerHeight);
  document.documentElement.style.setProperty('--alvo-toque', (11 * pxmm).toFixed(1) + 'px');
}
