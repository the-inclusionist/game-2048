# Enxertar esta história na do remoto

**O problema.** Este repositório local e `github.com/the-inclusionist/game-2048` são **duas histórias sem
ancestral comum**. Um `git push` é recusado.

**Como aconteceu, e é erro meu.** Quando o ADR-0067 §5 disparou, o repositório **já existia no GitHub** com o
scaffold — dois commits, `README.md` dizendo que estava vazio e o `LICENSE`. Eu devia ter clonado esse
repositório. Em vez disso rodei `git init` numa pasta nova e escrevi um README e um LICENSE meus, e todo o
jogo nasceu numa linhagem paralela.

O `remote` sempre esteve configurado certo (`game-2048`). O que estava errado era a minha história não
descender da dele.

## O estado

| | |
|---|---|
| Remoto `origin/main` | 2 commits · `README.md`, `LICENSE` |
| Local `main` | 12 commits · o jogo inteiro |
| Ancestral comum | **nenhum** |
| Rede de segurança | branch **`backup-antes-do-enxerto`**, apontando para o `main` de agora |

## O conserto

Reescrever histórico foi bloqueado para mim, e é mudança de estado — das que o CLAUDE.md diz que você roda.

⚠️ **Nada se perde de nenhum dos lados.** Os meus 12 commits nunca foram empurrados, então reescrevê-los não
afeta ninguém; e os 2 commits do remoto passam a ser a RAIZ, em vez de serem descartados.

```bash
cd C:\Users\candi\Claude\SP-the-inclusionist-2048 && git rebase --onto origin/main --root main
```

### O conflito: dois arquivos, uma vez só

Ele acontece **no primeiro commit replicado** (`302fa4b — chore: the repository is born`), que é o único meu
que cria `LICENSE` e `README.md`. Resolvido ali, os outros 11 passam limpos.

```bash
git checkout origin/main -- LICENSE
git checkout 302fa4b -- README.md
git add LICENSE README.md && git rebase --continue
```

**Por que assim:**

- **`LICENSE` — fica o do remoto.** O texto AGPL é o mesmo; a diferença são as 661 linhas de quebra
  (o meu ficou CRLF, o do repositório é LF). O canônico é o do repositório.
- **`README.md` — fica o meu.** O do remoto diz *"ESTE REPOSITÓRIO ESTÁ VAZIO. O JOGO AINDA NÃO FOI
  CONSTRUÍDO"*, e o próprio ADR-0067 §3 manda essa advertência sair **no commit que a desmentir** — que é
  exatamente este. Os meus commits seguintes já reescrevem o README conforme o jogo cresce.
  ⚠️ **E há uma decisão sua embutida nisso:** o README do remoto está em **português**, o meu em inglês. Se a
  prosa em pt-BR era intencional, me diga e eu a trago de volta para o README atual em vez de descartá-la.

### Conferir antes de empurrar

```bash
git log --oneline --graph | tail -16 && npm ci && npm run validate
```

Esperado: 14 commits numa linha só, começando pelos dois do scaffold; **138 asserções**, typecheck limpo,
build passando.

### Se der errado

```bash
git rebase --abort && git checkout main
```

E, se o `main` já tiver sido reescrito e você quiser voltar:

```bash
git reset --hard backup-antes-do-enxerto
```

Apague a branch de segurança quando estiver satisfeito: `git branch -D backup-antes-do-enxerto`.
