// SPDX-License-Identifier: AGPL-3.0-or-later
// A ENTREGA DOS DICIONÁRIOS À ENGINE — três linhas de código e uma decisão inteira atrás delas.
//
// Antes de 2026-09-05 este arquivo não podia existir. Os locales da engine entravam por
// `import.meta.glob('../i18n/*.ts')`, um glob resolvido no build DELA e contra a pasta DELA, e `DICTS` era
// privado do módulo: um jogo instalado como pacote não tinha porta nenhuma para as próprias chaves. O
// `hartwig-zdog-chess` pagou o preço da forma mais cara possível — escreveu um SEGUNDO sistema de i18n
// inteiro, 383 linhas, e importa o `t` da engine à parte só para as strings dela.
//
// `registerDict()` é a porta. Este jogo usa o i18n da engine e mais nada.
import { registerDict } from '@the-inclusionist/engine/core/i18n.js';
import en from './en.ts';
import es from './es.ts';
import pt from './pt.ts';

export type { Chave, Dicionario } from './pt.ts';

/**
 * Registra os três idiomas. Chamar ANTES de qualquer texto ir para a tela.
 *
 * Os três de uma vez, e não sob demanda: são 24 chaves cada, o custo é irrisório, e registrar
 * preguiçosamente exigiria um gancho na troca de idioma que a engine não oferece — inventar um seria
 * resolver, com máquina, um problema que não existe neste tamanho.
 */
export function registrarIdiomas(): void {
  registerDict('pt', pt);
  registerDict('en', en);
  registerDict('es', es);
}
