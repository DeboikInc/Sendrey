# Subtree Update Workflow

Reference for pulling changes from the standalone repos into this monorepo. Edit `<REPO_NAME>`, `<REMOTE_NAME>`, `<PREFIX_PATH>`, `<BRANCH>` per repo each time.

## Repo → Path Mapping

| Monorepo path            | Source repo        | Notes                          |
|---------------------------|---------------------|---------------------------------|
| `services/api`            | `sendrey-server`    | single prefix                   |
| `apps/web`                | `sendrey-frontend`  | dual prefix — see special section below |
| `apps/mobile`              | `sendrey-frontend`  | dual prefix — see special section below |
| `apps/admin-dashboard`     | `<REPO_NAME>`       | single prefix                   |
| `apps/landing-page`        | `<REPO_NAME>`       | single prefix                   |

## One-time: add a remote (only if it doesn't already exist)

```powershell
git remote -v
```
If the repo isn't listed:
```powershell
git remote add <REMOTE_NAME> git@github.com:DeboikInc/<REPO_NAME>.git
```
---

## Standard update procedure (single-prefix repos)

Use this for `services/api`, `apps/admin-dashboard`, `apps/landing-page`, and any future single-source app.

**1. Confirm working tree is clean:**
```powershell
git status
```
Commit or stash anything pending first — `git merge` and `git subtree` operations refuse to run on a dirty tree.

**2. Fetch:**
```powershell
git fetch <REMOTE_NAME> <BRANCH>
```

**3. Merge into the prefix:**
```powershell
git merge -X subtree=<PREFIX_PATH> --allow-unrelated-histories --no-edit <REMOTE_NAME>/<BRANCH>
```
`--allow-unrelated-histories` is required every time on this setup — keep it in by default.

**4. Check the result:**
```powershell
git status
```
- If you get "Already up to date" for a **single-prefix** repo, something's wrong — re-check you fetched the right branch. (This message is *expected* and *harmless* only for the dual-prefix case below.)
- If there's a conflict, resolve it manually, then:
```powershell
git add <file>
git commit
```

**5. Check for duplicate-case files** (Windows/git case-insensitivity bug — bit us with `README.md` vs `readme.md`):
```powershell
git ls-files <PREFIX_PATH> | findstr /i readme
```
Run this for any filename you're unsure about (`package.json`, config files, etc.). If two case-variant entries show up for what should be one file:
```powershell
git rm --cached <PREFIX_PATH>/<STALE_CASE_VERSION>
git add <PREFIX_PATH>/<CORRECT_CASE_VERSION>
git commit -m "remove duplicate-case file"
```

---

## Dual-prefix repo: sendrey-frontend → apps/web AND apps/mobile

Both prefixes pull from the **same repo and branch**. Once you merge that branch into the first prefix, git marks the commit as already merged into the repo's history — so merging it again for the second prefix silently does **nothing**, even though that folder's content is still stale. `git merge` cannot be used for the second prefix.

**1. Update the first prefix normally:**
```powershell
git fetch sendrey-frontend main
git merge -X subtree=apps/web --allow-unrelated-histories --no-edit sendrey-frontend/main
git status
```

**2. Force a full re-sync for the second prefix (read-tree, not merge):**
```powershell
git rm -r --cached apps/mobile
Remove-Item -Recurse -Force apps/mobile
git read-tree --prefix=apps/mobile -u sendrey-frontend/main
git status
git commit -m "Sync apps/mobile with sendrey-frontend/main"
```
⚠️ This wipes and fully replaces `apps/mobile` from `sendrey-frontend`'s current tree. Any manual edits made directly inside `apps/mobile` (not from the source repo) will be lost.

**3. Confirm they match:**
```powershell
git diff --no-index --stat apps/web apps/mobile
```
Empty output = identical, which is expected since they're duplicate copies of the same repo.

**TODO (later, not urgent):** split `sendrey-frontend` properly — either separate branches per app, or separate subfolders — so `apps/web` and `apps/mobile` stop being full-repo duplicates of each other.

---

## After any update

```powershell
pnpm install
```
Then build/test the affected app(s) before pushing.

```powershell
git push
```

---

## PowerShell gotchas

- Don't chain commands with `&&` unless PS7 is confirmed — run one line at a time.
- `Select-String -i` is ambiguous in PowerShell (matches multiple param names) — use `findstr /i` instead.
- No `mkdir -p` — use `New-Item -ItemType Directory -Force -Path <path>` if you need nested folder creation.
- No bash heredocs.

---

## Known error → fix reference

| Error | Fix |
|---|---|
| `Repository not found` on fetch | Check `git remote -v` — likely a typo'd org/repo name |
| `working tree has modifications. Cannot add.` | `git status`, commit or resolve pending changes first |
| `fatal: refusing to merge unrelated histories` | Add `--allow-unrelated-histories` to the merge command |
| `error: unknown option 'allow-unrelated-histories'` from `git subtree pull` | Don't use the `git subtree` wrapper — use `git merge -X subtree=<prefix> --allow-unrelated-histories --no-edit <remote>/<branch>` directly |
| Merge says "Already up to date" but content is clearly stale | You're hitting the dual-prefix issue — use `git read-tree`, not `git merge`, for the second prefix |
| A tracked file keeps showing "modified" right after committing | Check for duplicate-case filenames with `git ls-files <path> \| findstr /i <name>` |