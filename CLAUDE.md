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

Run the `/publish` skill (`.claude/skills/publish/SKILL.md`). It is the single runbook: it publishes seiro first, waits for npm, bumps the template's seiro dependency, syncs the template into create-seiro, publishes create-seiro at the same version, and verifies the result. Do not publish by hand from memory.

### Keeping in sync

The `/template` directory is the source of truth. When making changes:

1. Edit files in `/template`
2. Test locally
3. Before publishing create-seiro, sync it with `rsync -a --delete --exclude node_modules template/ packages/create-seiro/template/` (the `/publish` skill does this; never `cp -r`, which dereferences the node_modules symlinks)

The `/example` directory is separate - it includes shipments domain as a reference implementation.

## Adding Features

Use Claude skill in `template/.claude/skills/`:
- `cqrs-document` - Document-first CQRS design through conversation
