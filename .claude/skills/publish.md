# /publish

Publish seiro and create-seiro packages to npm. Both packages MUST have the same version number.

## Pre-flight Checks

Before starting, verify:
1. All tests pass: `bun run test` and `bun run test:example`
2. No uncommitted changes: `git status`
3. On main branch: `git branch --show-current`

## Process

Execute these steps IN ORDER. Do not skip steps. Wait for npm to confirm each publish before proceeding.

### Step 1: Determine next version

```bash
npm view seiro version
npm view create-seiro version
```

Both should match. Bump to next patch version (e.g., 0.1.5 → 0.1.6).

### Step 2: Publish seiro

```bash
# Edit packages/seiro/package.json - set new version
# Then:
git add packages/seiro/package.json
git commit -m "Bump seiro@X.Y.Z"
git tag seiro@X.Y.Z
git push origin main --tags
```

### Step 3: WAIT for seiro to publish

```bash
# Poll until version appears (may take 30+ seconds)
npm view seiro version
```

Do NOT proceed until the new version is confirmed on npm.

### Step 4: Update template dependency

```bash
# Edit template/package.json - set "seiro": "^X.Y.Z"
```

### Step 5: Sync template

```bash
rm -rf packages/create-seiro/template
cp -r template packages/create-seiro/template
```

### Step 6: Publish create-seiro

```bash
# Edit packages/create-seiro/package.json - set same version as seiro
# Then:
git add -A
git commit -m "Bump create-seiro@X.Y.Z with seiro@^X.Y.Z dependency"
git tag create-seiro@X.Y.Z
git push origin main --tags
```

### Step 7: WAIT for create-seiro to publish

```bash
npm view create-seiro version
```

### Step 8: Clear cache and verify

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
