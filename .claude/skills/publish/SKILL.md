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
   bun run test          # runs create-seiro tests
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
git add packages/seiro/package.json packages/seiro/CHANGELOG.md
git commit -m "Bump seiro@X.Y.Z"
git tag seiro@X.Y.Z
git push origin main --tags
```

### Step 4: WAIT for seiro to publish

```bash
# Poll until version appears (may take 30+ seconds)
npm view seiro version
```

Do NOT proceed until the new version is confirmed on npm.

### Step 5: Update template dependency

```bash
# Edit template/package.json - set "seiro": "^X.Y.Z"
```

### Step 6: Sync template

```bash
rm -rf packages/create-seiro/template
cp -r template packages/create-seiro/template
```

### Step 7: Publish create-seiro

```bash
# Edit packages/create-seiro/package.json - set same version as seiro
# Then:
git add -A
git commit -m "Bump create-seiro@X.Y.Z with seiro@^X.Y.Z dependency"
git tag create-seiro@X.Y.Z
git push origin main --tags
```

### Step 8: WAIT for create-seiro to publish

```bash
npm view create-seiro version
```

### Step 9: Clear cache and verify

```bash
bun pm cache rm

# Test the published package
rm -rf /tmp/test-publish
bunx create-seiro@X.Y.Z /tmp/test-publish
grep '"seiro"' /tmp/test-publish/package.json
# Should show: "seiro": "^X.Y.Z"
```

## Critical Rules

1. NEVER publish create-seiro before seiro
2. NEVER proceed without confirming npm has the new version
3. ALWAYS use the same version number for both packages
4. ALWAYS sync template before publishing create-seiro
5. ALWAYS update the seiro dependency in template to match the new version
6. ALWAYS update CHANGELOG.md with the release date before publishing
