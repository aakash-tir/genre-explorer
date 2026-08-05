# Runbook — CI and branch protection

## The gate

`.github/workflows/ci.yml` defines one job, **`verify`**, which runs on every pull request
and on pushes to `main`. It does, in order:

1. `npm ci`
2. `npm run lint`
3. `npm run format:check`
4. `npm run typecheck`
5. `npm test` ← the gate
6. `npm run build`

`npm run verify` runs the identical sequence locally. Run it before opening a PR.

## Branch protection on `main`

Two layers, because they cover different holes.

**Local** — `.claude/hooks/protect-main.sh`, wired as a PreToolUse hook in
`.claude/settings.json`. It denies `git commit`, `git merge` and `git push` when they
target `main` from inside a Claude Code session. This covers the accident-in-the-moment
case, and works even if the repo has no server-side protection.

**Server-side** — a GitHub branch protection rule on `main` requiring:

- a pull request before merging
- the **`verify`** status check to pass
- the branch to be up to date with `main` before merging (`strict`)
- conversations resolved
- enforcement for admins too

### Applying it

```bash
gh api -X PUT repos/{owner}/genre-explorer/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["verify"] },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false
  },
  "required_conversation_resolution": true,
  "restrictions": null
}
JSON
```

`required_approving_review_count` is **0** on purpose — this is a solo project, and
requiring an approval you cannot give yourself would make `main` unreachable. The PR
requirement and the green-CI requirement are what actually matter here.

### Verifying it took

Never assume the API call worked. Check:

```bash
gh api repos/{owner}/genre-explorer/branches/main/protection \
  --jq '{checks: .required_status_checks.contexts,
         strict: .required_status_checks.strict,
         pr_required: (.required_pull_request_reviews != null),
         admins: .enforce_admins.enabled,
         conversations: .required_conversation_resolution.enabled}'
```

### ⚠️ Current state: server-side protection is NOT active

Attempted on **2026-08-04**. Both APIs refused:

```
PUT  repos/aakash-tir/genre-explorer/branches/main/protection
POST repos/aakash-tir/genre-explorer/rulesets
→ 403 "Upgrade to GitHub Pro or make this repository public to enable this feature."
```

Verified afterwards rather than assumed:

```
gh api repos/aakash-tir/genre-explorer/branches/main --jq '.protected'
→ false
```

Branch protection and rulesets on **private** repositories require a paid GitHub plan
(Pro, Team or Enterprise). This repo is private on a free account, so:

- **`.claude/hooks/protect-main.sh` is the only guard.** It blocks `git commit`,
  `git merge` and `git push` against `main` from inside Claude Code sessions.
- **A plain `git push origin main` from a normal terminal will succeed.** There is
  nothing server-side stopping it.
- **CI still runs** on every PR and push to `main` — it just cannot _block_ a merge.
  A red run is visible, not enforced.

Three ways out, in rough order of cost:

1. **Make the repo public.** Rulesets and branch protection are free on public repos, and
   the gate becomes real immediately. Nothing in this project is secret — there are no API
   keys anywhere, by design.
2. **Upgrade to GitHub Pro** (~$4/month) and re-run the command above.
3. **Accept the local hook** and treat the PR workflow as a discipline rather than a gate.

Re-run the `gh api -X PUT` command above after doing 1 or 2, then verify with the check
below. Do not assume it took.

## Day-to-day workflow

```bash
git switch -c feat/whatever
# ... work ...
npm run verify
git push -u origin feat/whatever
gh pr create --fill
# CI runs; merge when green
gh pr merge --squash --delete-branch
git switch main && git pull
```

Then the post-merge artifacts, per `.claude/CLAUDE.md`: refresh `graphify-out/`, and
update the architecture diagram if the merge changed the architecture.

## The dataset refresh workflow

`.github/workflows/refresh-data.yml` rebuilds `public/data/` and opens a PR. Its `cron`
schedule is **commented out** until the pipeline exists (milestone 2) — a stub that fails
every Sunday teaches everyone to ignore a red workflow. Uncomment it in the PR that lands
the pipeline. Until then it can be run by hand with `workflow_dispatch`.
