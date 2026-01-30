# Seiro Monorepo

CQRS over WebSocket with Bun and Preact Signals.

## Structure

```
seiro/
├── packages/
│   ├── seiro/           # Core library (npm: "seiro")
│   └── create-seiro/    # CLI scaffolder (npm: "create-seiro")
│       └── template/    # Bundled template (copy of /template)
├── template/            # Starter template with auth
└── example/             # Full reference app (auth + shipments)
```

## Commands

```bash
bun install              # Install all workspace dependencies
bun run build            # Build seiro core library

# In template/ or example/
bun run dev              # Start dev server
bun run check            # Type check
bun test                 # Run tests
```

## Publishing

Packages are published via GitHub Actions using trusted publishing (OIDC). No npm token needed.

### To publish seiro:

1. Update version in `packages/seiro/package.json`
2. Commit the change
3. Create and push tag:
   ```bash
   git tag seiro@0.1.2
   git push origin main --tags
   ```

### To publish create-seiro:

**Important:** Before publishing create-seiro, you must:

1. Sync `/template` to `/packages/create-seiro/template`:
   ```bash
   rm -rf packages/create-seiro/template
   cp -r template packages/create-seiro/template
   ```

2. Update the seiro dependency version in the bundled template:
   ```bash
   # In packages/create-seiro/template/package.json
   # Update "seiro": "^x.x.x" to match the latest published version
   ```

3. Update version in `packages/create-seiro/package.json`

4. Commit and tag:
   ```bash
   git tag create-seiro@0.1.2
   git push origin main --tags
   ```

5. Clear local bun cache (so `bunx create-seiro` fetches the new version):
   ```bash
   rm -rf ~/.bun/install/cache/create-seiro*
   ```

### Keeping in sync

The `/template` directory is the source of truth. When making changes:

1. Edit files in `/template`
2. Test locally
3. Before publishing create-seiro, copy template to `packages/create-seiro/template`

The `/example` directory is separate - it includes shipments domain as a reference implementation.

## Adding Features

Use Claude skill in `template/.claude/skills/`:
- `cqrs-document` - Document-first CQRS design through conversation
