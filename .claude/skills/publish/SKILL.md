---
name: publish
description: Publish seiro and create-seiro packages to npm following the ordered release runbook. Use when the user wants to publish or release a new version.
---

# /publish

Publish seiro and create-seiro packages to npm. Both packages MUST have the same version number.

## Pre-flight Checks

Before starting, verify ALL of the following. Do NOT proceed if any check fails.

1. **Tests pass** (from repo root):
   ```bash
   bun run build         # build seiro from src (tests resolve seiro via dist)
   bun run test          # runs seiro and create-seiro tests
   bun run test:example  # runs example tests (requires postgres via docker)
   ```
   If tests fail, STOP. Do not publish.

2. **No uncommitted changes**: `git status` shows clean working tree

3. **On main branch**: `git branch --show-current` returns `main`

4. **CHANGELOG.md is up to date**: `packages/seiro/CHANGELOG.md` has an entry for the new version with all changes documented

## Process

Execute these steps IN ORDER. Do not skip steps. Wait for npm to confirm each publish before proceeding.

### Step 1: Determine next version

```bash
npm view seiro version
npm view create-seiro version
```

Both should match. Bump to next patch version (e.g., 0.1.5 → 0.1.6).

### Step 2: Update CHANGELOG.md

```bash
# Edit packages/seiro/CHANGELOG.md
# - Change "[X.Y.Z] - Unreleased" to "[X.Y.Z] - YYYY-MM-DD" (today's date)
# - Add new "[X.Y.Z+1] - Unreleased" section at top for future changes
```

### Step 3: Publish seiro

```bash
# Edit packages/seiro/package.json - set new version
# Then:
git add packages/seiro/package.json packages/seiro/CHANGELOG.md packages/seiro/dist
git commit -m "Bump seiro@X.Y.Z"
git tag seiro@X.Y.Z
git push --atomic origin main seiro@X.Y.Z
```

Push `main` and the one tag together with `--atomic`. Never use `--tags`: it pushes every local tag, and a rejected `main` push still leaves the tag on the remote.

### Step 4: WAIT for seiro to publish

```bash
# Poll until version appears (may take 30+ seconds)
npm view seiro version
```

Do NOT proceed until the new version is confirmed on npm. If the "Publish to npm" workflow fails (check `gh run list --workflow publish.yml`), STOP and report. To retry after fixing the cause, delete the tag on both sides first:

```bash
git tag -d seiro@X.Y.Z
git push --delete origin seiro@X.Y.Z
```

### Step 5: Update template dependency

```bash
# Edit template/package.json - set "seiro": "^X.Y.Z"
```

### Step 6: Sync template

```bash
rsync -a --delete --exclude node_modules --exclude .DS_Store --exclude .env \
  template/ packages/create-seiro/template/
```

Do not use `cp -r`: on macOS it dereferences the workspace symlinks in `template/node_modules` and copies ~80 MB of real directories into the bundled template.

### Step 7: Publish create-seiro

```bash
# Edit packages/create-seiro/package.json - set same version as seiro
# Then:
git add template/package.json packages/create-seiro
git commit -m "Bump create-seiro@X.Y.Z with seiro@^X.Y.Z dependency"
git tag create-seiro@X.Y.Z
git push --atomic origin main create-seiro@X.Y.Z
```

Stage only these paths. `git add -A` would sweep in any stray untracked file repo-wide.

### Step 8: WAIT for create-seiro to publish

```bash
npm view create-seiro version
```

### Step 9: Verify the published package

```bash
rm -rf /tmp/test-publish
BUN_INSTALL_CACHE_DIR=$(mktemp -d) bunx create-seiro@X.Y.Z /tmp/test-publish \
  && grep -F '"seiro": "^X.Y.Z"' /tmp/test-publish/package.json \
  && (cd /tmp/test-publish && bun run check) \
  && echo "PUBLISH OK"
```

The isolated cache dir guarantees a fresh fetch without wiping the global bun cache. The exact-match grep fails if the bundled template still pins the old seiro version. If "PUBLISH OK" is not printed, the release is broken: STOP and report.

## Critical Rules

1. NEVER publish create-seiro before seiro
2. NEVER proceed without confirming npm has the new version
3. ALWAYS use the same version number for both packages
4. ALWAYS sync template before publishing create-seiro
5. ALWAYS update the seiro dependency in template to match the new version
6. ALWAYS update CHANGELOG.md with the release date before publishing
7. NEVER use `git push --tags` or `git add -A`; push one named tag atomically and stage named paths
