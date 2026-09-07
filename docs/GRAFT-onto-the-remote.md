# Grafting this history onto the remote's

**The problem.** This local repository and `github.com/the-inclusionist/game-2048` are **two histories with
no common ancestor**. A `git push` is refused.

**How it happened, and it is my mistake.** When ADR-0067 §5 fired, the repository **already existed on
GitHub** with its scaffold — two commits, a `README.md` saying it was empty, and the `LICENSE`. I should have
cloned that repository. Instead I ran `git init` in a new folder and wrote a README and a LICENSE of my own,
and the whole game was born on a parallel line.

The `remote` was always configured correctly (`game-2048`). What was wrong was that my history did not
descend from its.

## The state

| | |
|---|---|
| Remote `origin/main` | 2 commits · `README.md`, `LICENSE` |
| Local `main` | 14 commits · the whole game |
| Common ancestor | **none** |
| Safety net | branch **`backup-before-the-graft`**, pointing at `main` as it was before any rewrite |

## The repair

Rewriting history was blocked for me, and it is a state change — one of those CLAUDE.md says the Dev runs.

⚠️ **Nothing is lost on either side.** My commits were never pushed, so rewriting them affects nobody; and
the remote's 2 commits become the ROOT rather than being discarded.

```bash
cd /c/Users/candi/Claude/SP-the-inclusionist-2048 && git rebase --onto origin/main --root main
```

### The conflict: two files, once only

It happens **on the first replayed commit** (`302fa4b — chore: the repository is born`), the only one of mine
that creates `LICENSE` and `README.md`. Resolved there, the other thirteen replay cleanly.

```bash
git checkout origin/main -- LICENSE && git checkout 302fa4b -- README.md && git add LICENSE README.md && git rebase --continue
```

**Why that way:**

- **`LICENSE` — the remote's wins.** The AGPL text is identical; the difference is 661 lines of line ending
  (mine came out CRLF, the repository's is LF). The repository's is canonical.
- **`README.md` — mine wins.** The remote's says *"THIS REPOSITORY IS EMPTY. THE GAME HAS NOT BEEN BUILT
  YET"*, and ADR-0067 §3 itself orders that warning removed **in the commit that makes it false** — which is
  exactly this one. My later commits already rewrite the README as the game grows. (The remote's README is in
  Portuguese and mine is in English; that is no longer a choice to make, since the Dev settled on
  2026-09-07 that the prose is English so contributors can be worldwide.)

### Check before pushing

```bash
git log --oneline --graph | tail -18
```

```bash
npm ci && npm run validate
```

Expected: 16 commits on a single line, starting with the two scaffold commits; **138 assertions**, typecheck
clean, build passing.

### If it goes wrong

```bash
git rebase --abort && git checkout main
```

And if `main` has already been rewritten and you want it back:

```bash
git reset --hard backup-before-the-graft
```

Delete the safety branch once you are satisfied:

```bash
git branch -D backup-before-the-graft
```
